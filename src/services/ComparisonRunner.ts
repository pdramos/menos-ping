/**
 * Runs a real before/after measurement around applying an optimization
 * profile: samples the live ConnectionQuality for a window before touching
 * anything, applies the profile for real, then samples again afterwards.
 * Every number shown to the user comes from actual pings and actual
 * registry/sysctl reads - nothing here is simulated or guessed.
 */

import type {
  ComparisonSnapshot,
  OptimizationComparison,
  OptimizationProfile,
  SettingDiff,
} from '@types/index'
import NetworkMonitor from '@services/NetworkMonitor'
import OptimizationEngine from '@services/OptimizationEngine'
import { getLogger } from '@services/Logger'

const logger = getLogger('ComparisonRunner')

// Internal bookkeeping keys used by OptimizationEngine to restore settings -
// not a real user-facing setting, so they're excluded from the diff shown.
const INTERNAL_KEYS = new Set(['__interface_guid', '__network_service'])

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

class ComparisonRunner {
  private current: OptimizationComparison | null = null
  private statusListeners: Set<(comparison: OptimizationComparison) => void> = new Set()

  constructor(
    private networkMonitor: NetworkMonitor,
    private optimizationEngine: OptimizationEngine
  ) {}

  getCurrent(): OptimizationComparison | null {
    return this.current
  }

  onStatusChanged(listener: (comparison: OptimizationComparison) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  private emit(): void {
    if (this.current) {
      this.statusListeners.forEach((listener) => listener(this.current!))
    }
  }

  async run(profile: OptimizationProfile, measureSeconds = 12): Promise<OptimizationComparison> {
    const comparison: OptimizationComparison = {
      id: `cmp-${Date.now()}`,
      profileName: profile.name,
      startedAt: Date.now(),
      completedAt: null,
      status: 'measuring_before',
      before: null,
      after: null,
      settingsDiff: [],
      backupId: null,
    }
    this.current = comparison
    this.emit()

    try {
      logger.info(`Starting comparison for profile: ${profile.id}`)

      comparison.before = await this.sampleQuality(measureSeconds)
      const beforeSettings = await this.optimizationEngine.getCurrentRealSettings()

      comparison.status = 'applying'
      this.emit()
      const applyResult = await this.optimizationEngine.applyOptimizations(profile)
      comparison.backupId = applyResult.backupId

      // Grace period so freshly-changed settings take effect before the
      // "after" window starts. (Note: some Windows TCP registry values only
      // fully apply to NEW connections or after a reboot - see the honest
      // note shown in the UI.)
      await sleep(4000)

      comparison.status = 'measuring_after'
      this.emit()
      comparison.after = await this.sampleQuality(measureSeconds)
      const afterSettings = await this.optimizationEngine.getCurrentRealSettings()

      comparison.settingsDiff = this.diffSettings(beforeSettings, afterSettings)
      comparison.status = 'done'
      comparison.completedAt = Date.now()
      logger.info(`Comparison completed for profile: ${profile.id}`)
    } catch (error) {
      comparison.status = 'failed'
      comparison.error = String(error)
      comparison.completedAt = Date.now()
      logger.error('Comparison failed', error)
    }

    this.emit()
    return comparison
  }

  private diffSettings(
    before: Record<string, string>,
    after: Record<string, string>
  ): SettingDiff[] {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    return Array.from(keys)
      .filter((key) => !INTERNAL_KEYS.has(key))
      .map((key) => ({
        key,
        before: before[key] ?? null,
        after: after[key] ?? null,
        changed: before[key] !== after[key],
      }))
  }

  private async sampleQuality(seconds: number): Promise<ComparisonSnapshot> {
    // Collect one fresh reading per real ping round. We key off last_update
    // so we never count the same round twice if our poll drifts against the
    // monitor's 1s interval.
    const latencies: number[] = []
    const losses: number[] = []
    const scores: number[] = []
    let lastSeen = 0
    const start = Date.now()

    while (Date.now() - start < seconds * 1000) {
      const q = this.networkMonitor.getConnectionQuality()
      if (q && q.last_update !== lastSeen) {
        lastSeen = q.last_update
        latencies.push(q.latency.average)
        losses.push(q.packet_loss.percentage)
        scores.push(q.score)
      }
      await sleep(500)
    }

    if (latencies.length === 0) {
      return {
        avgLatencyMs: 0,
        medianLatencyMs: 0,
        minLatencyMs: 0,
        maxLatencyMs: 0,
        avgJitterMs: 0,
        packetLossPercent: 0,
        score: 0,
        sampleCount: 0,
      }
    }

    // Windowed jitter: mean absolute difference between CONSECUTIVE samples,
    // computed only over this measurement window - not the monitor's long
    // sliding history, which would carry over noise from before the test.
    let jitterSum = 0
    for (let i = 1; i < latencies.length; i++) {
      jitterSum += Math.abs(latencies[i] - latencies[i - 1])
    }
    const windowedJitter = latencies.length > 1 ? jitterSum / (latencies.length - 1) : 0

    return {
      avgLatencyMs: average(latencies),
      medianLatencyMs: median(latencies),
      minLatencyMs: Math.min(...latencies),
      maxLatencyMs: Math.max(...latencies),
      avgJitterMs: windowedJitter,
      packetLossPercent: average(losses),
      score: average(scores),
      sampleCount: latencies.length,
    }
  }
}

export default ComparisonRunner
