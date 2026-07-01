/**
 * DNS Optimization Service
 * Handles DNS caching, server selection, and query optimization
 */

import dns from 'dns'
import type { DNSOptimizationSettings } from '@types/index'
import { DEFAULT_DNS_OPTIMIZATION } from '@config/default'
import { getLogger } from '@services/Logger'

const logger = getLogger('DNSOptimizer')

interface CacheEntry {
  hostname: string
  ip: string | string[]
  timestamp: number
  ttl: number
}

interface DNSQueryResult {
  hostname: string
  ip: string
  server: string
  latency: number
  success: boolean
}

class DNSOptimizer {
  private settings: DNSOptimizationSettings
  private cache: Map<string, CacheEntry> = new Map()
  private queryStats: Map<string, number> = new Map() // hostname -> successful queries
  private failedServers: Set<string> = new Set()
  private cleanupInterval: NodeJS.Timer | null = null

  constructor(settings: DNSOptimizationSettings = DEFAULT_DNS_OPTIMIZATION) {
    this.settings = settings
    this.initializeCache()
    this.startCacheCleanup()
  }

  private initializeCache(): void {
    logger.info('Initializing DNS cache', {
      size: this.settings.cache_size,
      ttl: this.settings.cache_ttl,
    })
  }

  private startCacheCleanup(): void {
    // Run cache cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries()
    }, 300000)
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now()
    let removed = 0

    for (const [hostname, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(hostname)
        removed++
      }
    }

    if (removed > 0) {
      logger.info(`Cleaned up ${removed} expired DNS cache entries`)
    }
  }

  async resolveDNS(hostname: string): Promise<string | null> {
    // Check cache first
    const cached = this.getCached(hostname)
    if (cached) {
      logger.debug(`DNS cache hit for ${hostname}`)
      return Array.isArray(cached) ? cached[0] : cached
    }

    logger.debug(`DNS cache miss for ${hostname}, querying servers`)

    // Query DNS servers
    const result = await this.queryDNSServers(hostname)

    if (result) {
      this.cache.set(hostname, {
        hostname,
        ip: result.ip,
        timestamp: Date.now(),
        ttl: this.settings.cache_ttl,
      })

      const stats = this.queryStats.get(hostname) || 0
      this.queryStats.set(hostname, stats + 1)

      logger.debug(`DNS resolved ${hostname} to ${result.ip}`, {
        server: result.server,
        latency: result.latency,
      })

      return result.ip
    }

    logger.warn(`Failed to resolve ${hostname}`)
    return null
  }

  private getCached(hostname: string): string | string[] | null {
    if (!this.settings.enable_caching) {
      return null
    }

    const entry = this.cache.get(hostname)
    if (!entry) return null

    // Check TTL
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(hostname)
      return null
    }

    return entry.ip
  }

  private async queryDNSServers(hostname: string): Promise<DNSQueryResult | null> {
    // Hostname is already a literal IP address - nothing to resolve
    if (dns.isIP(hostname)) {
      return { hostname, ip: hostname, server: 'literal', latency: 0, success: true }
    }

    const servers = this.settings.preferred_dns_servers.filter(
      (server) => !this.failedServers.has(server)
    )

    if (servers.length === 0) {
      logger.error(`All DNS servers are marked as failed for ${hostname}`)
      return null
    }

    for (const server of servers) {
      try {
        const start = process.hrtime.bigint()
        const ip = await this.resolveViaServer(hostname, server)
        const end = process.hrtime.bigint()
        const latency = Number(end - start) / 1e6

        if (ip) {
          return {
            hostname,
            ip,
            server,
            latency,
            success: true,
          }
        }
      } catch (error) {
        logger.warn(`DNS query failed for ${hostname} on server ${server}`, error)
        this.markServerFailed(server)
      }
    }

    return null
  }

  /**
   * Query a specific DNS server directly using Node's Resolver, so the
   * configured preferred_dns_servers are actually the servers contacted
   * rather than whatever the OS default resolver happens to use.
   */
  private resolveViaServer(hostname: string, server: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const resolver = new dns.Resolver({ timeout: 3000 } as dns.ResolverOptions)
      resolver.setServers([server])

      resolver.resolve4(hostname, (err, addresses) => {
        if (err) {
          reject(err)
          return
        }
        resolve(addresses && addresses.length > 0 ? addresses[0] : null)
      })
    })
  }

  private markServerFailed(server: string): void {
    this.failedServers.add(server)
    logger.warn(`DNS server marked as failed: ${server}`)

    // Re-enable after 5 minutes
    setTimeout(() => {
      this.failedServers.delete(server)
      logger.info(`DNS server re-enabled: ${server}`)
    }, 300000)
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.settings.cache_size,
      queryStats: Object.fromEntries(this.queryStats),
      failedServers: Array.from(this.failedServers),
    }
  }

  clearCache(): void {
    const size = this.cache.size
    this.cache.clear()
    logger.info(`Cleared DNS cache (${size} entries)`)
  }

  updateSettings(settings: Partial<DNSOptimizationSettings>): void {
    this.settings = { ...this.settings, ...settings }
    logger.info('DNS optimizer settings updated', this.settings)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.cache.clear()
    this.queryStats.clear()
    this.failedServers.clear()
    logger.info('DNS optimizer destroyed')
  }
}

export default DNSOptimizer
