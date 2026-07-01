import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import DNSOptimizer from '@services/DNSOptimizer'

describe('DNSOptimizer', () => {
  let optimizer: DNSOptimizer

  beforeEach(() => {
    optimizer = new DNSOptimizer()
  })

  afterEach(() => {
    optimizer.destroy()
  })

  it('should create a DNSOptimizer instance', () => {
    expect(optimizer).toBeDefined()
  })

  it('should resolve DNS with caching', async () => {
    const result1 = await optimizer.resolveDNS('google.com')
    expect(result1).toBeDefined()

    // Second query should hit cache
    const result2 = await optimizer.resolveDNS('google.com')
    expect(result2).toBe(result1)
  })

  it('should handle multiple DNS queries', async () => {
    const results = await Promise.all([
      optimizer.resolveDNS('google.com'),
      optimizer.resolveDNS('cloudflare.com'),
      optimizer.resolveDNS('github.com'),
    ])

    expect(results).toHaveLength(3)
    expect(results.every((r) => r !== null)).toBe(true)
  })

  it('should provide cache statistics', async () => {
    await optimizer.resolveDNS('google.com')
    await optimizer.resolveDNS('cloudflare.com')

    const stats = optimizer.getStats()
    expect(stats.cacheSize).toBe(2)
    expect(stats.queryStats).toBeDefined()
  })

  it('should clear cache', async () => {
    await optimizer.resolveDNS('google.com')
    optimizer.clearCache()

    const stats = optimizer.getStats()
    expect(stats.cacheSize).toBe(0)
  })

  it('should update settings', () => {
    optimizer.updateSettings({
      enable_caching: false,
    })

    const stats = optimizer.getStats()
    expect(stats).toBeDefined()
  })
})
