/**
 * Real running-process enumeration, cross-platform.
 *
 * - Linux/macOS: shells out to `ps -eo pid,%cpu,%mem,args` and (on Linux)
 *   resolves the exact executable via /proc/{pid}/exe when readable.
 * - Windows: uses PowerShell's Get-CimInstance Win32_Process, which exposes
 *   ExecutablePath, WorkingSetSize and CPU time counters directly - no
 *   guessing, no placeholder data.
 *
 * CPU usage on Windows is derived from real deltas of cumulative CPU time
 * between polls (the same technique Task Manager itself is built on), not
 * a fabricated number.
 */

import { exec } from 'child_process'
import fs from 'fs'
import { getLogger } from '@services/Logger'

const logger = getLogger('ProcessProbe')

export interface RunningProcessInfo {
  pid: number
  name: string
  execPath: string
  cpuPercent: number
  memoryBytes: number
}

function execAsync(command: string, timeoutMs: number, maxBuffer = 1024 * 1024 * 10): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs, maxBuffer }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
        return
      }
      resolve(stdout)
    })
  })
}

function basename(p: string): string {
  const normalized = p.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || p
}

// --- Linux / macOS -----------------------------------------------------

const PS_LINE_RE = /^\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.*)$/

async function scanUnixProcesses(): Promise<RunningProcessInfo[]> {
  const output = await execAsync('ps -eo pid,%cpu,%mem,args', 5000)
  const lines = output.trim().split('\n').slice(1) // drop header
  const results: RunningProcessInfo[] = []

  for (const line of lines) {
    const match = line.match(PS_LINE_RE)
    if (!match) continue

    const pid = parseInt(match[1], 10)
    const cpuPercent = parseFloat(match[2])
    const memPercent = parseFloat(match[3])
    const args = match[4].trim()
    const firstToken = args.split(/\s+/)[0] || ''

    let execPath = firstToken
    // Prefer the real resolved binary path when we have permission to read it
    try {
      execPath = fs.readlinkSync(`/proc/${pid}/exe`)
    } catch {
      // Not Linux, or no permission (different user / kernel thread) - keep firstToken
    }

    results.push({
      pid,
      name: basename(execPath),
      execPath,
      cpuPercent,
      // memPercent is % of total system RAM; convert to bytes using system total.
      memoryBytes: 0, // filled in by caller using os.totalmem() * memPercent / 100
    })
    ;(results[results.length - 1] as any).memPercent = memPercent
  }

  return results
}

// --- Windows -------------------------------------------------------------

interface Win32ProcessRaw {
  ProcessId: number
  Name: string
  ExecutablePath: string | null
  WorkingSetSize: string | number
  UserModeTime: string | number
  KernelModeTime: string | number
}

// pid -> { totalCpuTime100ns, sampledAtMs }
const windowsCpuSamples = new Map<number, { cpuTime: number; sampledAt: number }>()

async function scanWindowsProcesses(): Promise<RunningProcessInfo[]> {
  const psCommand =
    'powershell -NoProfile -Command "Get-CimInstance Win32_Process | ' +
    'Select-Object ProcessId,Name,ExecutablePath,WorkingSetSize,UserModeTime,KernelModeTime | ConvertTo-Json -Compress"'

  const output = await execAsync(psCommand, 8000)
  const parsed = JSON.parse(output)
  const list: Win32ProcessRaw[] = Array.isArray(parsed) ? parsed : [parsed]

  const now = Date.now()
  const cpuCount = require('os').cpus().length

  const results: RunningProcessInfo[] = list.map((proc) => {
    const pid = proc.ProcessId
    const cpuTime100ns = Number(proc.UserModeTime || 0) + Number(proc.KernelModeTime || 0)

    let cpuPercent = 0
    const previous = windowsCpuSamples.get(pid)
    if (previous) {
      const cpuDelta100ns = cpuTime100ns - previous.cpuTime
      const wallDeltaMs = now - previous.sampledAt
      if (wallDeltaMs > 0) {
        const cpuDeltaMs = cpuDelta100ns / 10000 // 100ns units -> ms
        cpuPercent = Math.min(100, (cpuDeltaMs / wallDeltaMs / cpuCount) * 100)
      }
    }
    windowsCpuSamples.set(pid, { cpuTime: cpuTime100ns, sampledAt: now })

    return {
      pid,
      name: proc.Name,
      execPath: proc.ExecutablePath || proc.Name,
      cpuPercent,
      memoryBytes: Number(proc.WorkingSetSize || 0),
    }
  })

  return results
}

/**
 * Enumerate all currently running processes on the host with real CPU/RAM
 * figures. Returns an empty array (with a logged error) if the underlying
 * OS command is unavailable rather than fabricating data.
 */
export async function listRunningProcesses(): Promise<RunningProcessInfo[]> {
  try {
    if (process.platform === 'win32') {
      return await scanWindowsProcesses()
    }

    const results = await scanUnixProcesses()
    const os = await import('os')
    const totalMem = os.totalmem()

    return results.map((r) => ({
      ...r,
      memoryBytes: Math.round((((r as any).memPercent || 0) / 100) * totalMem),
    }))
  } catch (error) {
    logger.error('Failed to enumerate running processes', error)
    return []
  }
}
