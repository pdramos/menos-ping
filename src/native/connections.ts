/**
 * Real active-connection enumeration, cross-platform. Used to discover which
 * remote hosts (game servers) a given process is actually talking to.
 *
 * - Windows: `netstat -ano` (Proto / Local / Foreign / State / PID)
 * - Linux:   `ss -tunp` (includes the owning process)
 * - macOS:   `lsof -nP -i` (per-process network files)
 *
 * Everything returned here is parsed from a real OS command - if the remote
 * address is a wildcard (typical for listening or connectionless UDP sockets)
 * the row is dropped rather than reported as a fake destination. UDP is
 * connectionless, so many UDP game sockets legitimately show no peer here;
 * that's a real OS limitation, not a bug, which is why the UI also offers a
 * manual "analyse this host" path.
 */

import { exec } from 'child_process'
import { getLogger } from '@services/Logger'

const logger = getLogger('ConnectionProbe')

export interface ActiveConnection {
  protocol: 'tcp' | 'udp'
  remoteAddress: string
  remotePort: number
  state: string
  pid: number
}

function execAsync(command: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 8 }, (error, stdout, stderr) => {
      if (stdout && stdout.trim().length > 0) {
        resolve(stdout)
        return
      }
      if (error) {
        reject(new Error(stderr || error.message))
        return
      }
      resolve(stdout)
    })
  })
}

/** Split "1.2.3.4:5678" or "[::1]:5678" into address + port. */
function splitAddrPort(raw: string): { address: string; port: number } | null {
  const trimmed = raw.trim()
  const lastColon = trimmed.lastIndexOf(':')
  if (lastColon <= 0) return null
  let address = trimmed.slice(0, lastColon)
  const port = parseInt(trimmed.slice(lastColon + 1), 10)
  if (Number.isNaN(port)) return null
  address = address.replace(/^\[|\]$/g, '')
  return { address, port }
}

/** True for wildcard/loopback/private/link-local addresses we should ignore. */
export function isPublicRemote(address: string): boolean {
  if (!address || address === '*' || address === '0.0.0.0' || address === '::') return false
  if (address === '127.0.0.1' || address.startsWith('127.') || address === '::1') return false
  if (address.startsWith('10.')) return false
  if (address.startsWith('192.168.')) return false
  if (address.startsWith('169.254.') || address.toLowerCase().startsWith('fe80:')) return false
  // 172.16.0.0 - 172.31.255.255
  const m = address.match(/^172\.(\d+)\./)
  if (m) {
    const second = parseInt(m[1], 10)
    if (second >= 16 && second <= 31) return false
  }
  // IPv6 unique-local
  if (address.toLowerCase().startsWith('fc') || address.toLowerCase().startsWith('fd')) return false
  return true
}

function parseWindows(output: string): ActiveConnection[] {
  const results: ActiveConnection[] = []
  for (const line of output.split('\n')) {
    const cols = line.trim().split(/\s+/)
    if (cols.length < 4) continue
    const proto = cols[0].toLowerCase()
    if (proto !== 'tcp' && proto !== 'udp') continue

    // TCP: Proto Local Foreign State PID   |   UDP: Proto Local Foreign PID
    const foreign = splitAddrPort(cols[2])
    if (!foreign) continue
    const state = proto === 'tcp' ? cols[3] : ''
    const pid = parseInt(cols[cols.length - 1], 10)
    if (Number.isNaN(pid)) continue

    results.push({
      protocol: proto,
      remoteAddress: foreign.address,
      remotePort: foreign.port,
      state,
      pid,
    })
  }
  return results
}

function parseLinux(output: string): ActiveConnection[] {
  const results: ActiveConnection[] = []
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || /^Netid/i.test(trimmed)) continue
    const cols = trimmed.split(/\s+/)
    if (cols.length < 6) continue
    const proto = cols[0].toLowerCase()
    if (proto !== 'tcp' && proto !== 'udp') continue

    const state = cols[1]
    const peer = splitAddrPort(cols[5])
    if (!peer) continue

    // pid is inside a users:(("proc",pid=1234,fd=5)) field, if present
    const pidMatch = trimmed.match(/pid=(\d+)/)
    const pid = pidMatch ? parseInt(pidMatch[1], 10) : -1

    results.push({ protocol: proto, remoteAddress: peer.address, remotePort: peer.port, state, pid })
  }
  return results
}

function parseMac(output: string): ActiveConnection[] {
  const results: ActiveConnection[] = []
  for (const line of output.split('\n')) {
    // lsof -nP -i format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
    // NAME looks like "TCP 192.168.0.10:52341->104.16.0.1:443 (ESTABLISHED)"
    const cols = line.trim().split(/\s+/)
    if (cols.length < 9) continue
    const pid = parseInt(cols[1], 10)
    if (Number.isNaN(pid)) continue
    const proto = cols[7]?.toLowerCase()
    if (proto !== 'tcp' && proto !== 'udp') continue

    const name = cols.slice(8).join(' ')
    const arrow = name.indexOf('->')
    if (arrow === -1) continue
    const remotePart = name.slice(arrow + 2).split(' ')[0]
    const peer = splitAddrPort(remotePart)
    if (!peer) continue
    const stateMatch = name.match(/\(([^)]+)\)/)

    results.push({
      protocol: proto,
      remoteAddress: peer.address,
      remotePort: peer.port,
      state: stateMatch ? stateMatch[1] : '',
      pid,
    })
  }
  return results
}

export async function listActiveConnections(): Promise<ActiveConnection[]> {
  try {
    if (process.platform === 'win32') {
      return parseWindows(await execAsync('netstat -ano'))
    }
    if (process.platform === 'darwin') {
      return parseMac(await execAsync('lsof -nP -i'))
    }
    return parseLinux(await execAsync('ss -tunp'))
  } catch (error) {
    logger.error('Failed to enumerate active connections', error)
    return []
  }
}
