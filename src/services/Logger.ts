/**
 * Structured logging service
 */

import type { LogEntry } from '@types/index'
import { LOGGING_CONFIG } from '@config/default'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// This module is shared by both the Electron main process (real Node, where
// file logging is possible) and the sandboxed renderer bundle (a browser
// context with no 'fs'/'path', pulled in transitively via NotificationManager).
// Node built-ins are only ever required lazily, and only when actually
// running in the main process, so importing this file in the renderer never
// touches them.
const isMainProcess = typeof window === 'undefined'

function expandLogsDir(): string {
  const dir = LOGGING_CONFIG.logsDir
  if (dir.startsWith('~/')) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    return dir.replace('~', homeDir)
  }
  return dir
}

/** Fire-and-forget append, rotating the file once it exceeds the configured size. */
function appendToLogFile(line: string): void {
  if (!isMainProcess) return

  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const logFilePath = path.join(expandLogsDir(), 'menospingapp.log')

  fs.promises
    .mkdir(path.dirname(logFilePath), { recursive: true })
    .then(async () => {
      try {
        const stat = await fs.promises.stat(logFilePath)
        if (stat.size > LOGGING_CONFIG.maxFileSize) {
          await fs.promises.rename(logFilePath, `${logFilePath}.1`)
        }
      } catch {
        // File doesn't exist yet - nothing to rotate.
      }
      await fs.promises.appendFile(logFilePath, line)
    })
    .catch(() => {
      // Logging must never crash the app it's instrumenting.
    })
}

interface LoggerOptions {
  module: string
  enableConsole?: boolean
  enableFile?: boolean
}

class Logger {
  private module: string
  private enableConsole: boolean
  private enableFile: boolean
  private logBuffer: LogEntry[] = []
  private readonly maxBufferSize = 10000

  constructor(options: LoggerOptions) {
    this.module = options.module
    this.enableConsole = options.enableConsole ?? LOGGING_CONFIG.enableConsoleOutput
    this.enableFile = options.enableFile ?? LOGGING_CONFIG.enableFileOutput
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module: this.module,
      message,
      data,
    }

    // Buffer the log entry
    this.logBuffer.push(entry)
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift()
    }

    // Log to console if enabled
    if (this.enableConsole) {
      this.logToConsole(entry)
    }

    if (this.enableFile) {
      appendToLogFile(`${JSON.stringify(entry)}\n`)
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString()
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`
    const message = entry.data ? `${entry.message} ${JSON.stringify(entry.data)}` : entry.message

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, message)
        break
      case 'info':
        console.info(prefix, message)
        break
      case 'warn':
        console.warn(prefix, message)
        break
      case 'error':
        console.error(prefix, message)
        break
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data)
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data)
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data)
  }

  getLogs(level?: LogLevel): LogEntry[] {
    return level ? this.logBuffer.filter((l) => l.level === level) : [...this.logBuffer]
  }

  clearLogs(): void {
    this.logBuffer = []
  }
}

// Create a global logger factory
const loggerInstances = new Map<string, Logger>()

export function createLogger(module: string): Logger {
  if (!loggerInstances.has(module)) {
    loggerInstances.set(module, new Logger({ module }))
  }
  return loggerInstances.get(module)!
}

export function getLogger(module: string): Logger {
  return createLogger(module)
}

/** Merge every module's in-memory buffer into one timestamp-sorted list. */
export function getAllLogs(count = 500): LogEntry[] {
  const all: LogEntry[] = []
  for (const logger of loggerInstances.values()) {
    all.push(...logger.getLogs())
  }
  all.sort((a, b) => a.timestamp - b.timestamp)
  return count ? all.slice(-count) : all
}

export function getLogsDirectory(): string {
  return expandLogsDir()
}

export default Logger
