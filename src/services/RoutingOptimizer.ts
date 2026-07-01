/**
 * Routing Optimizer Service
 * Runs real traceroutes and flags genuine route-quality issues (excessive
 * hop count, packet loss, high-latency hops). It does NOT fabricate
 * "expected improvement" percentages for a hypothetical alternate route -
 * that would require actually rerouting traffic, which this version does
 * not do. ASN/ISP identification uses Team Cymru's public IP-to-ASN DNS
 * lookup service (a real, widely-used, no-auth-required service).
 */

import dns from 'dns'
import type { RoutingOptimizationSettings, RouteInfo } from '@types/index'
import { DEFAULT_ROUTING_OPTIMIZATION, EXTERNAL_SERVICES } from '@config/default'
import { getLogger } from '@services/Logger'
import { runTraceroute } from '@native/traceroute'

const logger = getLogger('RoutingOptimizer')

export interface PeeringInfo {
  asn: string
  prefix: string
  country: string
  registry: string
}

export interface RouteIssue {
  destination: string
  issue: 'excessive_hops' | 'packet_loss' | 'high_latency_hop'
  detail: string
  measuredValue: number
}

const resolver = dns.promises

class RoutingOptimizer {
  private settings: RoutingOptimizationSettings
  private routeCache: Map<string, RouteInfo> = new Map()
  private peeringCache: Map<string, PeeringInfo> = new Map()
  private issues: RouteIssue[] = []
  private monitorInterval: NodeJS.Timer | null = null

  constructor(settings: RoutingOptimizationSettings = DEFAULT_ROUTING_OPTIMIZATION) {
    this.settings = settings
  }

  async startRouteMonitoring(): Promise<void> {
    if (!this.settings.enable_auto_optimization) {
      logger.info('Route monitoring disabled per settings')
      return
    }

    logger.info('Starting route monitoring')

    this.monitorInterval = setInterval(() => {
      this.analyzeRoutes().catch((err) => {
        logger.error('Error analyzing routes', err)
      })
    }, 300000) // Every 5 minutes

    await this.analyzeRoutes()
  }

  async stopRouteMonitoring(): Promise<void> {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    logger.info('Route monitoring stopped')
  }

  private async analyzeRoutes(): Promise<void> {
    try {
      const testHosts = EXTERNAL_SERVICES.latencyTestHosts.slice(0, 3)

      for (const host of testHosts) {
        const route = await this.traceRoute(host)
        if (route) {
          this.routeCache.set(host, route)
          this.detectIssues(route)

          if (this.settings.analyze_isp_peering) {
            await this.analyzePeering(route)
          }
        }
      }

      logger.info('Route analysis complete', {
        routesAnalyzed: this.routeCache.size,
        issuesFound: this.issues.length,
      })
    } catch (error) {
      logger.error('Failed to analyze routes', error)
    }
  }

  /** Runs a real traceroute/tracert and converts it into a RouteInfo snapshot. */
  private async traceRoute(destination: string): Promise<RouteInfo | null> {
    const result = await runTraceroute(destination)

    if (result.error || result.hops.length === 0) {
      logger.warn(`Traceroute unavailable for ${destination}`, { error: result.error })
      return null
    }

    const hops = result.hops.map((hop) => {
      const validSamples = hop.samplesMs.filter((s): s is number => s !== null)
      const avgLatency = validSamples.length
        ? validSamples.reduce((a, b) => a + b, 0) / validSamples.length
        : 0
      const packetLoss = ((hop.samplesMs.length - validSamples.length) / hop.samplesMs.length) * 100

      return {
        hop_number: hop.hop,
        ip_address: hop.address || '*',
        hostname: hop.hostname,
        latency: avgLatency,
        packet_loss: packetLoss,
      }
    })

    const respondingHops = hops.filter((h) => h.ip_address !== '*')
    const totalLatency = respondingHops.length
      ? respondingHops[respondingHops.length - 1].latency
      : 0
    const avgPacketLoss = hops.reduce((sum, h) => sum + h.packet_loss, 0) / hops.length

    return {
      destination,
      hops,
      total_latency: totalLatency,
      stability: 100 - avgPacketLoss,
      timestamp: Date.now(),
    }
  }

  /** Flags real, measured route-quality problems - no fabricated projections. */
  private detectIssues(route: RouteInfo): void {
    if (route.hops.length > 18) {
      this.issues.push({
        destination: route.destination,
        issue: 'excessive_hops',
        detail: `Route to ${route.destination} takes ${route.hops.length} hops`,
        measuredValue: route.hops.length,
      })
    }

    if (route.stability < 90) {
      this.issues.push({
        destination: route.destination,
        issue: 'packet_loss',
        detail: `Measured ${(100 - route.stability).toFixed(1)}% average packet loss across hops`,
        measuredValue: 100 - route.stability,
      })
    }

    for (const hop of route.hops) {
      if (hop.latency > 100) {
        this.issues.push({
          destination: route.destination,
          issue: 'high_latency_hop',
          detail: `Hop ${hop.hop_number} (${hop.ip_address}) measured ${hop.latency.toFixed(1)}ms`,
          measuredValue: hop.latency,
        })
      }
    }
  }

  /** Real IP-to-ASN lookup via Team Cymru's public DNS-based service. */
  private async analyzePeering(route: RouteInfo): Promise<void> {
    const midHops = route.hops.filter((h) => h.ip_address !== '*').slice(2, 6)

    for (const hop of midHops) {
      if (this.peeringCache.has(hop.ip_address)) continue

      try {
        const reversed = hop.ip_address.split('.').reverse().join('.')
        const txtRecords = await resolver.resolveTxt(`${reversed}.origin.asn.cymru.com`)
        const raw = txtRecords[0]?.[0]
        if (!raw) continue

        // Format: "ASN | prefix | country | registry | date"
        const [asn, prefix, country, registry] = raw.split('|').map((s) => s.trim())
        const peering: PeeringInfo = { asn: `AS${asn}`, prefix, country, registry }

        this.peeringCache.set(hop.ip_address, peering)
        logger.debug(`Peering info for ${hop.ip_address}`, peering)
      } catch (error) {
        // Private/reserved IPs (RFC1918) won't resolve - expected, not an error worth surfacing loudly
        logger.debug(`No ASN data for ${hop.ip_address} (likely private address space)`, error)
      }
    }
  }

  getIssues(): RouteIssue[] {
    return [...this.issues]
  }

  getRouteInfo(destination: string): RouteInfo | undefined {
    return this.routeCache.get(destination)
  }

  getPeeringInfo(ipAddress: string): PeeringInfo | undefined {
    return this.peeringCache.get(ipAddress)
  }

  updateSettings(settings: Partial<RoutingOptimizationSettings>): void {
    this.settings = { ...this.settings, ...settings }
    logger.info('Routing optimizer settings updated')
  }

  destroy(): void {
    this.stopRouteMonitoring()
    this.routeCache.clear()
    this.peeringCache.clear()
    this.issues = []
    logger.info('Routing optimizer destroyed')
  }
}

export default RoutingOptimizer
