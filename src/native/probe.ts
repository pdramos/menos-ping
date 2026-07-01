/**
 * Real network probing primitives.
 *
 * Two measurement strategies are used:
 *  1. ICMP via the OS `ping` binary (real round-trip time, matches what
 *     users expect "ping" to mean). Requires the `ping` executable to be
 *     present on PATH - true on virtually every desktop OS out of the box.
 *  2. TCP-connect timing (time to complete a TCP handshake to a known-open
 *     port, typically 443). Works everywhere without external binaries or
 *     elevated privileges, and is used automatically when `ping` is
 *     unavailable or fails.
 *
 * No random numbers, no fabricated data - every value returned here comes
 * from an actual network operation performed at call time.
 */

import { exec } from 'child_process'
import net from 'net'
import { getLogger } from '@services/Logger'

const logger = getLogger('NetworkProbe')

export interface ProbeResult {
  target: string
  latencyMs: number
  success: boolean
  method: 'icmp' | 'tcp'
}

let icmpAvailability: boolean | null = null

function execAsync(command: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
        return
      }
      resolve(stdout)
    })
  })
}

/**
 * Parse latency (ms) out of `ping` command output across platforms.
 *  Windows: "Reply from 8.8.8.8: bytes=32 time=23ms TTL=118" or "time<1ms"
 *  Linux/macOS: "64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=23.4 ms"
 */
function parsePingLatency(output: string): number | null {
  const msMatch = output.match(/time[=<]([\d.]+)\s*ms/i)
  if (msMatch) {
    return parseFloat(msMatch[1])
  }
  return null
}

function buildPingCommand(target: string): string {
  if (process.platform === 'win32') {
    return `ping -n 1 -w 2000 ${target}`
  }
  // Linux / macOS
  return `ping -c 1 -W 2 ${target}`
}

async function icmpPing(target: string): Promise<ProbeResult | null> {
  try {
    const output = await execAsync(buildPingCommand(target), 3000)
    const latency = parsePingLatency(output)

    if (latency === null) {
      // Command succeeded but no reply parsed (e.g. 100% loss reported without error exit code)
      return { target, latencyMs: 0, success: false, method: 'icmp' }
    }

    return { target, latencyMs: latency, success: true, method: 'icmp' }
  } catch (error) {
    return null
  }
}

/**
 * Measure latency via TCP handshake timing. Falls back across common ports
 * so hosts that only serve 443 or only serve 53 (DNS resolvers) both work.
 */
async function tcpConnectPing(target: string, ports: number[] = [443, 80, 53]): Promise<ProbeResult> {
  for (const port of ports) {
    const result = await new Promise<ProbeResult>((resolve) => {
      const start = process.hrtime.bigint()
      const socket = new net.Socket()
      let settled = false

      const finish = (success: boolean) => {
        if (settled) return
        settled = true
        const end = process.hrtime.bigint()
        const latencyMs = Number(end - start) / 1e6
        socket.destroy()
        resolve({ target, latencyMs: success ? latencyMs : 0, success, method: 'tcp' })
      }

      socket.setTimeout(2000)
      socket.once('connect', () => finish(true))
      socket.once('timeout', () => finish(false))
      socket.once('error', () => finish(false))

      socket.connect(port, target)
    })

    if (result.success) {
      return result
    }
  }

  return { target, latencyMs: 0, success: false, method: 'tcp' }
}

/**
 * Probe a single target, preferring real ICMP ping and transparently
 * falling back to TCP-connect timing if ICMP is unavailable.
 */
export async function probeTarget(target: string): Promise<ProbeResult> {
  if (icmpAvailability !== false) {
    const icmpResult = await icmpPing(target)
    if (icmpResult !== null) {
      icmpAvailability = true
      return icmpResult
    }
    // First failure: don't immediately give up on ICMP forever, but avoid
    // retrying a missing binary on every single tick if it clearly errors
    // due to ENOENT-style failures repeatedly.
    if (icmpAvailability === null) {
      icmpAvailability = false
      logger.info(`ICMP ping unavailable, falling back to TCP-connect timing for ${target}`)
    }
  }

  return tcpConnectPing(target)
}

export async function probeTargets(targets: string[]): Promise<ProbeResult[]> {
  return Promise.all(targets.map((target) => probeTarget(target)))
}

/** Reset cached ICMP availability, e.g. after retries or config changes. */
export function resetProbeState(): void {
  icmpAvailability = null
}
