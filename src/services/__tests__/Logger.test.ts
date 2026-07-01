import { describe, it, expect, beforeEach } from 'vitest'
import Logger from '@services/Logger'

describe('Logger', () => {
  let logger: Logger

  beforeEach(() => {
    logger = new Logger({ module: 'TestModule' })
  })

  it('should create a logger instance', () => {
    expect(logger).toBeDefined()
  })

  it('should log debug messages', () => {
    logger.debug('Debug message', { test: true })
    const logs = logger.getLogs('debug')
    expect(logs).toHaveLength(1)
    expect(logs[0].message).toBe('Debug message')
  })

  it('should log info messages', () => {
    logger.info('Info message')
    const logs = logger.getLogs('info')
    expect(logs).toHaveLength(1)
    expect(logs[0].level).toBe('info')
  })

  it('should log warning messages', () => {
    logger.warn('Warning message')
    const logs = logger.getLogs('warn')
    expect(logs).toHaveLength(1)
  })

  it('should log error messages', () => {
    logger.error('Error message', new Error('test error'))
    const logs = logger.getLogs('error')
    expect(logs).toHaveLength(1)
    expect(logs[0].level).toBe('error')
  })

  it('should retrieve all logs', () => {
    logger.debug('Debug')
    logger.info('Info')
    logger.warn('Warning')
    logger.error('Error')

    const allLogs = logger.getLogs()
    expect(allLogs).toHaveLength(4)
  })

  it('should clear logs', () => {
    logger.info('Message')
    expect(logger.getLogs()).toHaveLength(1)

    logger.clearLogs()
    expect(logger.getLogs()).toHaveLength(0)
  })

  it('should include timestamp in logs', () => {
    const beforeTime = Date.now()
    logger.info('Message')
    const afterTime = Date.now()

    const logs = logger.getLogs()
    expect(logs[0].timestamp).toBeGreaterThanOrEqual(beforeTime)
    expect(logs[0].timestamp).toBeLessThanOrEqual(afterTime)
  })
})
