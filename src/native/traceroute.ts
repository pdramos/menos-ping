/**
 * Real traceroute (Linux/macOS) / tracert (Windows) execution and parsing.
 * If the underlying binary isn't installed, this reports that fact rather
 * than fabricating hop data.
 */

import { exec } from 'child_process'
import { getLogger } from '@services/Logger'

const logger = getLogger('Traceroute')

export interface TraceHop {
  hop: number
  address: string | null // null = timeout / no reply
  hostname?: string
  samplesMs: (number | null)[] // null entry = that probe timed out
}

export interface TracerouteResult {
  target: string
  hops: TraceHop[]
  completed: boolean
  error?: string
}

function execAsync(command: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      // traceroute/tracert can exit non-zero even on partial success; still
      // return whatever text was produced so we can parse real hops from it.
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

const UNIX_HOP_LINE = /^\s*(\d+)\s+(.*)$/
const UNIX_HOST_IP = /^(\S+)\s+\(([^)]+)\)/
const MS_TOKEN = /([\d.]+)\s*ms/g

function parseUnixOutput(output: string, target: string): TracerouteResult {
  const lines = output.split('\n').filter((l) => l.trim().length > 0)
  const hops: TraceHop[] = []

  for (const line of lines) {
    const match = line.match(UNIX_HOP_LINE)
    if (!match) continue // header line, e.g. "traceroute to 8.8.8.8 ..."

    const hopNum = parseInt(match[1], 10)
    const rest = match[2].trim()

    if (/^\*/.test(rest) && !UNIX_HOST_IP.test(rest)) {
      hops.push({ hop: hopNum, address: null, samplesMs: [null, null, null] })
      continue
    }

    const hostMatch = rest.match(UNIX_HOST_IP)
    let address: string | null = null
    let hostname: string | undefined

    if (hostMatch) {
      const [, name, ip] = hostMatch
      address = ip
      hostname = name === ip ? undefined : name
    }

    const samples: (number | null)[] = []
    const msMatches = [...rest.matchAll(MS_TOKEN)]
    for (const m of msMatches) {
      samples.push(parseFloat(m[1]))
    }
    // Pad missing samples (timeouts mixed with replies show as "*" tokens)
    const starCount = (rest.match(/\*/g) || []).length
    for (let i = 0; i < starCount; i++) samples.push(null)

    hops.push({ hop: hopNum, address, hostname, samplesMs: samples.length ? samples : [null] })
  }

  return { target, hops, completed: hops.length > 0 }
}

const WIN_HOP_LINE = /^\s*(\d+)\s+(.*)$/
const WIN_MS_TOKEN = /(\d+)\s*ms/g

function parseWindowsOutput(output: string, target: string): TracerouteResult {
  const lines = output.split('\n').filter((l) => l.trim().length > 0)
  const hops: TraceHop[] = []

  for (const line of lines) {
    const match = line.match(WIN_HOP_LINE)
    if (!match) continue

    const hopNum = parseInt(match[1], 10)
    const rest = match[2].trim()

    if (/Request timed out/i.test(rest)) {
      hops.push({ hop: hopNum, address: null, samplesMs: [null, null, null] })
      continue
    }

    const samples: (number | null)[] = [...rest.matchAll(WIN_MS_TOKEN)].map((m) => parseFloat(m[1]))
    const starCount = (rest.match(/\*/g) || []).length
    for (let i = 0; i < starCount; i++) samples.push(null)

    // Last whitespace-separated token on the line is the address/hostname
    const tokens = rest.split(/\s+/)
    const last = tokens[tokens.length - 1]
    const address = /^[\d.]+$|^[0-9a-fA-F:]+$/.test(last) ? last : null
    const hostname = address ? undefined : last

    hops.push({ hop: hopNum, address, hostname, samplesMs: samples.length ? samples : [null] })
  }

  return { target, hops, completed: hops.length > 0 }
}

export async function runTraceroute(target: string): Promise<TracerouteResult> {
  const isWindows = process.platform === 'win32'
  const command = isWindows
    ? `tracert -h 20 -w 2000 ${target}`
    : `traceroute -m 20 -w 2 -q 3 ${target}`

  try {
    const output = await execAsync(command, 30000)
    return isWindows ? parseWindowsOutput(output, target) : parseUnixOutput(output, target)
  } catch (error: any) {
    logger.warn(`Traceroute failed for ${target} - binary may not be installed`, error)
    return {
      target,
      hops: [],
      completed: false,
      error: error.message?.includes('not found') || error.code === 'ENOENT'
        ? 'traceroute/tracert is not installed on this system'
        : error.message,
    }
  }
}
