/**
 * Network monitoring service
 * Tracks latency, jitter, packet loss, and connection quality in real-time
 */

import type {
  LatencyMetrics,
  JitterMetrics,
  PacketLossMetrics,
  ConnectionQuality,
} from '@types/index'
import { NETWORK_MONITOR_CONFIG } from '@config/default'
import { getLogger } from '@services/Logger'
import { probeTargets } from '@native/probe'

const logger = getLogger('NetworkMonitor')

interface PingResult {
  latency: number
  timestamp: number
  success: boolean
}

class NetworkMonitor {
  private latencyMetrics: LatencyMetrics | null = null
  private jitterMetrics: JitterMetrics | null = null
  private packetLossMetrics: PacketLossMetrics | null = null
  private connectionQuality: ConnectionQuality | null = null
  private latencyHistory: number[] = []
  private packetLossHistory: PingResult[] = []
  private isMonitoring = false
  private monitorInterval: NodeJS.Timer | null = null
  private observers: Set<(quality: ConnectionQuality) => void> = new Set()

  async start(): Promise<void> {
    if (this.isMonitoring) return

    this.isMonitoring = true
    logger.info('Starting network monitor')

    // Initial ping
    await this.updateMetrics()

    // Set up periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.updateMetrics().catch((err) => {
        logger.error('Error updating metrics', err)
      })
    }, NETWORK_MONITOR_CONFIG.pingInterval)
  }

  stop(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    logger.info('Stopping network monitor')

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
  }

  private async updateMetrics(): Promise<void> {
    try {
      // Perform pings to configured targets
      const results = await this.performPings()

      if (results.length === 0) {
        logger.warn('No ping results received')
        return
      }

      // Update latency metrics
      this.updateLatencyMetrics(results)

      // Update jitter metrics
      this.updateJitterMetrics()

      // Update packet loss metrics
      this.updatePacketLossMetrics(results)

      // Calculate overall connection quality
      this.calculateConnectionQuality()

      // Notify observers
      if (this.connectionQuality) {
        this.observers.forEach((observer) => observer(this.connectionQuality!))
      }
    } catch (error) {
      logger.error('Failed to update metrics', error)
    }
  }

  private async performPings(): Promise<PingResult[]> {
    const targets = NETWORK_MONITOR_CONFIG.pingTargets
    const results: PingResult[] = []

    let probeResults: Awaited<ReturnType<typeof probeTargets>>
    try {
      probeResults = await probeTargets(targets)
    } catch (error) {
      logger.error('Failed to probe network targets', error)
      probeResults = targets.map((target) => ({
        target,
        latencyMs: 0,
        success: false,
        method: 'tcp' as const,
      }))
    }

    for (const probe of probeResults) {
      const result: PingResult = {
        latency: probe.latencyMs,
        timestamp: Date.now(),
        success: probe.success,
      }
      results.push(result)

      if (!probe.success) {
        logger.warn(`Probe to ${probe.target} failed`)
        continue
      }

      this.latencyHistory.push(probe.latencyMs)
      if (this.latencyHistory.length > NETWORK_MONITOR_CONFIG.maxHistorySize) {
        this.latencyHistory.shift()
      }
    }

    this.packetLossHistory.push(...results)
    if (this.packetLossHistory.length > NETWORK_MONITOR_CONFIG.maxHistorySize) {
      this.packetLossHistory = this.packetLossHistory.slice(
        -NETWORK_MONITOR_CONFIG.maxHistorySize
      )
    }

    return results
  }

  private updateLatencyMetrics(results: PingResult[]): void {
    const successfulResults = results.filter((r) => r.success).map((r) => r.latency)

    if (successfulResults.length === 0) return

    const min = Math.min(...successfulResults)
    const max = Math.max(...successfulResults)
    const average = successfulResults.reduce((a, b) => a + b, 0) / successfulResults.length

    // Calculate standard deviation
    const squaredDiffs = successfulResults.map((x) => Math.pow(x - average, 2))
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length
    const stddev = Math.sqrt(avgSquaredDiff)

    this.latencyMetrics = {
      ping: successfulResults[successfulResults.length - 1] || average,
      min,
      max,
      average,
      stddev,
      sample_count: successfulResults.length,
      timestamp: Date.now(),
    }
  }

  private updateJitterMetrics(): void {
    if (this.latencyHistory.length < 2) {
      this.jitterMetrics = {
        value: 0,
        trend: 'stable',
        threshold_exceeded: false,
      }
      return
    }

    // Calculate jitter as variance in consecutive latency samples
    const recentSamples = this.latencyHistory.slice(-NETWORK_MONITOR_CONFIG.jitterSampleSize)
    const differences: number[] = []

    for (let i = 1; i < recentSamples.length; i++) {
      differences.push(Math.abs(recentSamples[i] - recentSamples[i - 1]))
    }

    const avgDifference = differences.reduce((a, b) => a + b, 0) / differences.length
    const threshold = NETWORK_MONITOR_CONFIG.jitterThreshold

    // Determine trend
    const oldDifference = this.jitterMetrics?.value || avgDifference
    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable'
    if (avgDifference > oldDifference * 1.1) {
      trend = 'increasing'
    } else if (avgDifference < oldDifference * 0.9) {
      trend = 'decreasing'
    }

    this.jitterMetrics = {
      value: avgDifference,
      trend,
      threshold_exceeded: avgDifference > threshold,
    }
  }

  private updatePacketLossMetrics(results: PingResult[]): void {
    const totalPackets = results.length
    const lostPackets = results.filter((r) => !r.success).length
    const percentage = (lostPackets / totalPackets) * 100

    // Calculate consecutive losses
    let consecutiveLosses = 0
    let maxConsecutive = 0
    for (const result of results) {
      if (!result.success) {
        consecutiveLosses++
        maxConsecutive = Math.max(maxConsecutive, consecutiveLosses)
      } else {
        consecutiveLosses = 0
      }
    }

    this.packetLossMetrics = {
      percentage,
      packets_sent: totalPackets,
      packets_lost: lostPackets,
      consecutive_losses: maxConsecutive,
    }
  }

  private calculateConnectionQuality(): void {
    if (!this.latencyMetrics || !this.jitterMetrics || !this.packetLossMetrics) {
      return
    }

    // Calculate quality score (0-100)
    // Based on latency, jitter, and packet loss
    let score = 100

    // Deduct for latency (higher is worse)
    const latencyPenalty = Math.min(this.latencyMetrics.average / 2, 50)
    score -= latencyPenalty

    // Deduct for jitter
    const jitterPenalty = Math.min(this.jitterMetrics.value, 20)
    score -= jitterPenalty

    // Deduct for packet loss (each 1% loss = 2 points)
    const packetLossPenalty = Math.min(this.packetLossMetrics.percentage * 2, 30)
    score -= packetLossPenalty

    score = Math.max(0, Math.min(100, score))

    // Determine status based on score
    let status: ConnectionQuality['status']
    if (score >= 80) status = 'excellent'
    else if (score >= 60) status = 'good'
    else if (score >= 40) status = 'fair'
    else if (score >= 20) status = 'poor'
    else status = 'critical'

    this.connectionQuality = {
      score,
      status,
      latency: this.latencyMetrics,
      jitter: this.jitterMetrics,
      packet_loss: this.packetLossMetrics,
      last_update: Date.now(),
    }
  }

  getConnectionQuality(): ConnectionQuality | null {
    return this.connectionQuality
  }

  getLatencyMetrics(): LatencyMetrics | null {
    return this.latencyMetrics
  }

  getJitterMetrics(): JitterMetrics | null {
    return this.jitterMetrics
  }

  getPacketLossMetrics(): PacketLossMetrics | null {
    return this.packetLossMetrics
  }

  getLatencyHistory(count: number = 60): number[] {
    return this.latencyHistory.slice(-count)
  }

  onConnectionQualityChanged(observer: (quality: ConnectionQuality) => void): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  isRunning(): boolean {
    return this.isMonitoring
  }
}

export default NetworkMonitor
