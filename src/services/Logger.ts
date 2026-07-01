/**
 * Structured logging service
 */

import type { LogEntry } from '@types/index'
import { LOGGING_CONFIG } from '@config/default'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

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

    // TODO: Log to file if enabled
    // if (this.enableFile) {
    //   this.logToFile(entry)
    // }
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

export default Logger
