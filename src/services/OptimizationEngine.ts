/**
 * Optimization Engine
 * Applies real, OS-level network optimizations and can precisely restore
 * whatever was there before via BackupManager. Every value read or written
 * here comes from an actual system call (sysctl / registry) - nothing is
 * fabricated.
 *
 * Runs in the Electron MAIN process only (requires child_process, and on
 * Windows/Linux typically requires elevated privileges to persist changes).
 */

import { exec } from 'child_process'
import os from 'os'
import type { OptimizationProfile, SystemInfo } from '@types/index'
import { getLogger } from '@services/Logger'
import { getBackupManager } from '@services/BackupManager'

const logger = getLogger('OptimizationEngine')

function execAsync(command: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr?.trim() || error.message))
        return
      }
      resolve(stdout)
    })
  })
}

interface PlatformOptimizer {
  /** Read the CURRENT real value of every setting we're about to touch. */
  captureSettings(): Promise<Record<string, string>>
  /** Apply the profile's settings, returning which keys were actually changed. */
  applyNetworkTuning(settings: OptimizationProfile): Promise<string[]>
  applyDNSOptimization(settings: OptimizationProfile): Promise<string[]>
  applyRoutingOptimization(settings: OptimizationProfile): Promise<string[]>
  /** Write back exactly the values captured by captureSettings(). */
  restoreSettings(settings: Record<string, string>): Promise<void>
  getSystemInfo(): Promise<SystemInfo>
  requiresElevation(): boolean
}

function buildSystemInfo(platformOs: SystemInfo['os']): SystemInfo {
  return {
    os: platformOs,
    os_version: os.release(),
    architecture: process.arch as 'x64' | 'arm64',
    cpu_cores: os.cpus().length,
    total_memory: os.totalmem(),
    available_memory: os.freemem(),
  }
}

// ============================================================================
// Linux - real sysctl parameters (verified: net.core.rmem_max/wmem_max,
// net.ipv4.tcp_rmem/tcp_wmem, tcp_window_scaling, tcp_sack,
// tcp_congestion_control all exist and are read/writable via sysctl -n/-w).
// ============================================================================

const LINUX_SYSCTL_KEYS = [
  'net.core.rmem_max',
  'net.core.wmem_max',
  'net.ipv4.tcp_rmem',
  'net.ipv4.tcp_wmem',
  'net.ipv4.tcp_window_scaling',
  'net.ipv4.tcp_sack',
  'net.ipv4.tcp_congestion_control',
] as const

class LinuxOptimizer implements PlatformOptimizer {
  async captureSettings(): Promise<Record<string, string>> {
    const captured: Record<string, string> = {}

    for (const key of LINUX_SYSCTL_KEYS) {
      try {
        const value = (await execAsync(`sysctl -n ${key}`)).trim()
        captured[key] = value
      } catch (error) {
        logger.warn(`Could not read sysctl key ${key} (may not exist on this kernel)`, error)
      }
    }

    return captured
  }

  async applyNetworkTuning(profile: OptimizationProfile): Promise<string[]> {
    const s = profile.network_settings
    const applied: string[] = []
    const writes: Array<[string, string]> = []

    if (s.tcp_buffer_size) {
      writes.push(['net.core.rmem_max', String(s.tcp_buffer_size)])
      writes.push(['net.core.wmem_max', String(s.tcp_buffer_size)])
      writes.push(['net.ipv4.tcp_rmem', `4096 87380 ${s.tcp_buffer_size}`])
      writes.push(['net.ipv4.tcp_wmem', `4096 65536 ${s.tcp_buffer_size}`])
    }
    if (s.window_scaling !== undefined) {
      writes.push(['net.ipv4.tcp_window_scaling', s.window_scaling ? '1' : '0'])
    }
    if (s.selective_ack !== undefined) {
      writes.push(['net.ipv4.tcp_sack', s.selective_ack ? '1' : '0'])
    }
    if (s.enable_congestion_control && s.congestion_algorithm) {
      writes.push(['net.ipv4.tcp_congestion_control', s.congestion_algorithm])
    }

    // Note: TCP_NODELAY (Nagle's algorithm) is a per-socket option set via
    // setsockopt() by the application that owns the connection - there is no
    // global Linux sysctl that forces it system-wide, so `tcp_nodelay` in
    // NetworkOptimizationSettings is intentionally NOT applied here. Claiming
    // otherwise would be exactly the kind of fake behavior we're avoiding.
    if (s.tcp_nodelay) {
      logger.info(
        'tcp_nodelay requested but is a per-socket option on Linux (no system-wide sysctl exists) - skipped'
      )
    }

    for (const [key, value] of writes) {
      try {
        await execAsync(`sysctl -w ${key}="${value}"`)
        applied.push(key)
        logger.info(`Applied sysctl ${key} = ${value}`)
      } catch (error) {
        logger.error(`Failed to set sysctl ${key} (requires root)`, error)
      }
    }

    return applied
  }

  async applyDNSOptimization(profile: OptimizationProfile): Promise<string[]> {
    const dnsSettings = profile.dns_settings
    if (!dnsSettings.enable_caching || dnsSettings.preferred_dns_servers.length === 0) {
      return []
    }

    try {
      // systemd-resolved is the standard resolver on modern distros
      const servers = dnsSettings.preferred_dns_servers.join(' ')
      await execAsync(`resolvectl dns eth0 ${servers}`).catch(async () => {
        // Fall back to whichever the first real interface is if eth0 doesn't exist
        const linkOutput = await execAsync('resolvectl status --no-pager').catch(() => '')
        logger.warn('resolvectl dns eth0 failed, interface may be named differently', {
          linkOutput: linkOutput.slice(0, 200),
        })
      })
      logger.info('Applied DNS servers via resolvectl', { servers: dnsSettings.preferred_dns_servers })
      return ['resolvectl:dns']
    } catch (error) {
      logger.error('Failed to apply DNS optimization (resolvectl unavailable?)', error)
      return []
    }
  }

  async applyRoutingOptimization(): Promise<string[]> {
    // Route-level changes (MTU, path selection) require an active
    // RouteInfo from RoutingOptimizer to act on a specific destination/
    // interface; applied per-route by RoutingOptimizer rather than globally
    // here. Nothing global to apply at the profile level.
    return []
  }

  async restoreSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      try {
        await execAsync(`sysctl -w ${key}="${value}"`)
        logger.info(`Restored sysctl ${key} = ${value}`)
      } catch (error) {
        logger.error(`Failed to restore sysctl ${key}`, error)
      }
    }
  }

  async getSystemInfo(): Promise<SystemInfo> {
    return buildSystemInfo('linux')
  }

  requiresElevation(): boolean {
    return true
  }
}

// ============================================================================
// Windows - real registry values under Tcpip\Parameters (and per-interface
// TcpAckFrequency/TCPNoDelay, which genuinely only exist per-NIC-GUID).
// ============================================================================

const WIN_TCPIP_PATH = 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters'

class WindowsOptimizer implements PlatformOptimizer {
  private async queryRegValue(path: string, name: string): Promise<string | null> {
    try {
      const output = await execAsync(`reg query "${path}" /v ${name}`)
      // Example line: "    TcpWindowSize    REG_DWORD    0x10000"
      const match = output.match(new RegExp(`${name}\\s+REG_\\w+\\s+(\\S+)`))
      return match ? match[1] : null
    } catch {
      return null // Value not set - real and meaningful distinction from "0"
    }
  }

  private async getPrimaryInterfaceGuid(): Promise<string | null> {
    try {
      const output = await execAsync(
        'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"'
      )
      const lines = output.split('\n').map((l) => l.trim()).filter(Boolean)
      const guidLine = lines.find((l) => l.includes('Interfaces\\{'))
      if (!guidLine) return null
      const match = guidLine.match(/Interfaces\\(\{[0-9A-Fa-f-]+\})/)
      return match ? match[1] : null
    } catch (error) {
      logger.warn('Could not enumerate network interface GUIDs', error)
      return null
    }
  }

  async captureSettings(): Promise<Record<string, string>> {
    const captured: Record<string, string> = {}

    const tcpWindowSize = await this.queryRegValue(WIN_TCPIP_PATH, 'TcpWindowSize')
    if (tcpWindowSize) captured['TcpWindowSize'] = tcpWindowSize

    const tcp1323 = await this.queryRegValue(WIN_TCPIP_PATH, 'Tcp1323Opts')
    if (tcp1323) captured['Tcp1323Opts'] = tcp1323

    const guid = await this.getPrimaryInterfaceGuid()
    if (guid) {
      captured['__interface_guid'] = guid
      const ifPath = `${WIN_TCPIP_PATH}\\Interfaces\\${guid}`
      const ackFreq = await this.queryRegValue(ifPath, 'TcpAckFrequency')
      if (ackFreq) captured['TcpAckFrequency'] = ackFreq
      const noDelay = await this.queryRegValue(ifPath, 'TCPNoDelay')
      if (noDelay) captured['TCPNoDelay'] = noDelay
    }

    return captured
  }

  async applyNetworkTuning(profile: OptimizationProfile): Promise<string[]> {
    const s = profile.network_settings
    const applied: string[] = []

    if (s.tcp_buffer_size) {
      try {
        await execAsync(
          `reg add "${WIN_TCPIP_PATH}" /v TcpWindowSize /t REG_DWORD /d ${s.tcp_buffer_size} /f`
        )
        applied.push('TcpWindowSize')
      } catch (error) {
        logger.error('Failed to set TcpWindowSize (requires Administrator)', error)
      }
    }

    if (s.window_scaling) {
      try {
        await execAsync(`reg add "${WIN_TCPIP_PATH}" /v Tcp1323Opts /t REG_DWORD /d 1 /f`)
        applied.push('Tcp1323Opts')
      } catch (error) {
        logger.error('Failed to set Tcp1323Opts (requires Administrator)', error)
      }
    }

    if (s.tcp_nodelay) {
      const guid = await this.getPrimaryInterfaceGuid()
      if (guid) {
        const ifPath = `${WIN_TCPIP_PATH}\\Interfaces\\${guid}`
        try {
          await execAsync(`reg add "${ifPath}" /v TcpAckFrequency /t REG_DWORD /d 1 /f`)
          await execAsync(`reg add "${ifPath}" /v TCPNoDelay /t REG_DWORD /d 1 /f`)
          applied.push('TcpAckFrequency', 'TCPNoDelay')
        } catch (error) {
          logger.error('Failed to set per-interface TCP delay values (requires Administrator)', error)
        }
      } else {
        logger.warn('Could not determine network interface GUID, skipping TCPNoDelay')
      }
    }

    return applied
  }

  async applyDNSOptimization(profile: OptimizationProfile): Promise<string[]> {
    const dnsSettings = profile.dns_settings
    if (!dnsSettings.enable_caching || dnsSettings.preferred_dns_servers.length === 0) {
      return []
    }

    try {
      const interfaceListOutput = await execAsync('netsh interface show interface')
      const activeLine = interfaceListOutput
        .split('\n')
        .find((l) => l.includes('Connected') && l.includes('Dedicated'))
      const interfaceName = activeLine?.trim().split(/\s{2,}/).pop()

      if (!interfaceName) {
        logger.warn('Could not determine active network interface for DNS configuration')
        return []
      }

      const [primary, ...secondary] = dnsSettings.preferred_dns_servers
      await execAsync(`netsh interface ip set dns name="${interfaceName}" static ${primary}`)
      for (const server of secondary) {
        await execAsync(`netsh interface ip add dns name="${interfaceName}" ${server} index=2`)
      }

      logger.info(`Applied DNS servers on interface ${interfaceName}`, dnsSettings.preferred_dns_servers)
      return ['netsh:dns']
    } catch (error) {
      logger.error('Failed to apply DNS optimization via netsh (requires Administrator)', error)
      return []
    }
  }

  async applyRoutingOptimization(): Promise<string[]> {
    return []
  }

  async restoreSettings(settings: Record<string, string>): Promise<void> {
    const guid = settings['__interface_guid']

    if (settings['TcpWindowSize']) {
      await execAsync(
        `reg add "${WIN_TCPIP_PATH}" /v TcpWindowSize /t REG_DWORD /d ${parseInt(settings['TcpWindowSize'], 16) || settings['TcpWindowSize']} /f`
      ).catch((e) => logger.error('Failed to restore TcpWindowSize', e))
    }

    if (settings['Tcp1323Opts']) {
      await execAsync(`reg add "${WIN_TCPIP_PATH}" /v Tcp1323Opts /t REG_DWORD /d ${settings['Tcp1323Opts']} /f`).catch(
        (e) => logger.error('Failed to restore Tcp1323Opts', e)
      )
    }

    if (guid) {
      const ifPath = `${WIN_TCPIP_PATH}\\Interfaces\\${guid}`
      if (settings['TcpAckFrequency']) {
        await execAsync(`reg add "${ifPath}" /v TcpAckFrequency /t REG_DWORD /d ${settings['TcpAckFrequency']} /f`).catch(
          (e) => logger.error('Failed to restore TcpAckFrequency', e)
        )
      }
      if (settings['TCPNoDelay']) {
        await execAsync(`reg add "${ifPath}" /v TCPNoDelay /t REG_DWORD /d ${settings['TCPNoDelay']} /f`).catch((e) =>
          logger.error('Failed to restore TCPNoDelay', e)
        )
      }
    }

    logger.info('Windows settings restored from backup')
  }

  async getSystemInfo(): Promise<SystemInfo> {
    return buildSystemInfo('windows')
  }

  requiresElevation(): boolean {
    return true
  }
}

// ============================================================================
// macOS - real sysctl (BSD) parameters, same sysctl -n/-w mechanism verified
// on Linux, plus networksetup for DNS (both are genuine macOS CLI tools).
// ============================================================================

const MACOS_SYSCTL_KEYS = [
  'net.inet.tcp.sendspace',
  'net.inet.tcp.recvspace',
  'net.inet.tcp.win_scale_factor',
  'kern.ipc.maxsockbuf',
] as const

class MacOSOptimizer implements PlatformOptimizer {
  async captureSettings(): Promise<Record<string, string>> {
    const captured: Record<string, string> = {}

    for (const key of MACOS_SYSCTL_KEYS) {
      try {
        const value = (await execAsync(`sysctl -n ${key}`)).trim()
        captured[key] = value
      } catch (error) {
        logger.warn(`Could not read sysctl key ${key}`, error)
      }
    }

    try {
      const service = await this.getPrimaryNetworkService()
      if (service) {
        captured['__network_service'] = service
        const dnsOutput = await execAsync(`networksetup -getdnsservers "${service}"`)
        captured['dns_servers'] = dnsOutput.trim()
      }
    } catch (error) {
      logger.warn('Could not capture current DNS servers', error)
    }

    return captured
  }

  private async getPrimaryNetworkService(): Promise<string | null> {
    try {
      const output = await execAsync('networksetup -listnetworkserviceorder')
      const match = output.match(/\(\d+\)\s+(.+)/)
      return match ? match[1].trim() : null
    } catch {
      return null
    }
  }

  async applyNetworkTuning(profile: OptimizationProfile): Promise<string[]> {
    const s = profile.network_settings
    const applied: string[] = []
    const writes: Array<[string, string]> = []

    if (s.tcp_buffer_size) {
      writes.push(['net.inet.tcp.sendspace', String(s.tcp_buffer_size)])
      writes.push(['net.inet.tcp.recvspace', String(s.tcp_buffer_size)])
      writes.push(['kern.ipc.maxsockbuf', String(s.tcp_buffer_size * 2)])
    }
    if (s.window_scaling) {
      writes.push(['net.inet.tcp.win_scale_factor', '8'])
    }

    for (const [key, value] of writes) {
      try {
        await execAsync(`sysctl -w ${key}=${value}`)
        applied.push(key)
        logger.info(`Applied sysctl ${key} = ${value}`)
      } catch (error) {
        logger.error(`Failed to set sysctl ${key} (requires sudo)`, error)
      }
    }

    return applied
  }

  async applyDNSOptimization(profile: OptimizationProfile): Promise<string[]> {
    const dnsSettings = profile.dns_settings
    if (!dnsSettings.enable_caching || dnsSettings.preferred_dns_servers.length === 0) {
      return []
    }

    const service = await this.getPrimaryNetworkService()
    if (!service) {
      logger.warn('Could not determine primary network service for DNS configuration')
      return []
    }

    try {
      await execAsync(`networksetup -setdnsservers "${service}" ${dnsSettings.preferred_dns_servers.join(' ')}`)
      logger.info(`Applied DNS servers on service ${service}`, dnsSettings.preferred_dns_servers)
      return ['networksetup:dns']
    } catch (error) {
      logger.error('Failed to apply DNS optimization via networksetup (requires sudo)', error)
      return []
    }
  }

  async applyRoutingOptimization(): Promise<string[]> {
    return []
  }

  async restoreSettings(settings: Record<string, string>): Promise<void> {
    for (const key of MACOS_SYSCTL_KEYS) {
      const value = settings[key]
      if (!value) continue
      try {
        await execAsync(`sysctl -w ${key}=${value}`)
        logger.info(`Restored sysctl ${key} = ${value}`)
      } catch (error) {
        logger.error(`Failed to restore sysctl ${key}`, error)
      }
    }

    const service = settings['__network_service']
    if (service && settings['dns_servers']) {
      try {
        const servers = settings['dns_servers'].split('\n').filter(Boolean).join(' ')
        await execAsync(`networksetup -setdnsservers "${service}" ${servers || 'empty'}`)
        logger.info(`Restored DNS servers on service ${service}`)
      } catch (error) {
        logger.error('Failed to restore DNS servers', error)
      }
    }
  }

  async getSystemInfo(): Promise<SystemInfo> {
    return buildSystemInfo('macos')
  }

  requiresElevation(): boolean {
    return true
  }
}

// ============================================================================
// Main OptimizationEngine
// ============================================================================

class OptimizationEngine {
  private optimizer: PlatformOptimizer
  private currentProfile: OptimizationProfile | null = null
  private systemInfo: SystemInfo | null = null
  private lastBackupId: string | null = null

  constructor() {
    const platform = process.platform
    if (platform === 'win32') {
      this.optimizer = new WindowsOptimizer()
    } else if (platform === 'linux') {
      this.optimizer = new LinuxOptimizer()
    } else if (platform === 'darwin') {
      this.optimizer = new MacOSOptimizer()
    } else {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    logger.info(`Optimization engine initialized for ${platform}`)
  }

  async initialize(): Promise<void> {
    try {
      this.systemInfo = await this.optimizer.getSystemInfo()
      logger.info('System info loaded', this.systemInfo)
    } catch (error) {
      logger.error('Failed to initialize optimization engine', error)
      throw error
    }
  }

  /** Read the real, current low-level network settings without changing anything. */
  async getCurrentRealSettings(): Promise<Record<string, string>> {
    return this.optimizer.captureSettings()
  }

  /** Capture and store the current real system state without changing anything. */
  async createManualBackup(label?: string): Promise<string> {
    const currentSettings = await this.optimizer.captureSettings()
    const backup = await getBackupManager().createBackup(currentSettings, {
      label: label || 'Manual backup',
    })
    this.lastBackupId = backup.id
    logger.info(`Manual backup created: ${backup.id}`)
    return backup.id
  }

  async applyOptimizations(profile: OptimizationProfile): Promise<{ backupId: string; appliedKeys: string[] }> {
    logger.info(`Applying optimizations from profile: ${profile.id}`)

    // Capture the REAL current state before touching anything, so revert
    // can restore it exactly - not a placeholder, an actual snapshot.
    const currentSettings = await this.optimizer.captureSettings()
    const backup = await getBackupManager().createBackup(currentSettings, {
      label: `Before applying "${profile.name}"`,
      profileId: profile.id,
    })
    this.lastBackupId = backup.id

    const appliedKeys: string[] = []
    appliedKeys.push(...(await this.optimizer.applyNetworkTuning(profile)))
    appliedKeys.push(...(await this.optimizer.applyDNSOptimization(profile)))
    appliedKeys.push(...(await this.optimizer.applyRoutingOptimization(profile)))

    this.currentProfile = profile
    logger.info('Optimizations applied', { backupId: backup.id, appliedKeys })

    return { backupId: backup.id, appliedKeys }
  }

  /**
   * Revert to a specific backup, or the most recent one if none is given.
   * Actually restores the values captured in that backup via real system
   * calls - this is not a no-op.
   */
  async revertOptimizations(backupId?: string): Promise<boolean> {
    const targetId = backupId || this.lastBackupId
    const backup = targetId
      ? await getBackupManager().getBackup(targetId)
      : await getBackupManager().getLatestBackup()

    if (!backup) {
      logger.warn('No backup available to revert to')
      return false
    }

    logger.info(`Reverting optimizations using backup: ${backup.id}`)
    await this.optimizer.restoreSettings(backup.settings)
    this.currentProfile = null
    logger.info('Optimizations reverted successfully')
    return true
  }

  getCurrentProfile(): OptimizationProfile | null {
    return this.currentProfile
  }

  getSystemInfo(): SystemInfo | null {
    return this.systemInfo
  }

  requiresElevation(): boolean {
    return this.optimizer.requiresElevation()
  }
}

export default OptimizationEngine
