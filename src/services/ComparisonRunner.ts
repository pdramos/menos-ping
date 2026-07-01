/**
 * Runs a real before/after measurement around applying an optimization
 * profile: samples the live ConnectionQuality for a window before touching
 * anything, applies the profile for real, then samples again afterwards.
 * Every number shown to the user comes from actual pings and actual
 * registry/sysctl reads - nothing here is simulated or guessed.
 */

import type {
  ComparisonSnapshot,
  ConnectionQuality,
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

  async run(profile: OptimizationProfile, measureSeconds = 8): Promise<OptimizationComparison> {
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

      // Brief grace period so freshly-changed settings show up in the next
      // real ping round before we start the "after" sampling window.
      await sleep(2000)

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
    const samples: ConnectionQuality[] = []
    const start = Date.now()

    while (Date.now() - start < seconds * 1000) {
      const quality = this.networkMonitor.getConnectionQuality()
      if (quality) samples.push(quality)
      await sleep(1000)
    }

    if (samples.length === 0) {
      return {
        avgLatencyMs: 0,
        minLatencyMs: 0,
        maxLatencyMs: 0,
        avgJitterMs: 0,
        packetLossPercent: 0,
        score: 0,
        sampleCount: 0,
      }
    }

    return {
      avgLatencyMs: average(samples.map((s) => s.latency.average)),
      minLatencyMs: Math.min(...samples.map((s) => s.latency.min)),
      maxLatencyMs: Math.max(...samples.map((s) => s.latency.max)),
      avgJitterMs: average(samples.map((s) => s.jitter.value)),
      packetLossPercent: average(samples.map((s) => s.packet_loss.percentage)),
      score: average(samples.map((s) => s.score)),
      sampleCount: samples.length,
    }
  }
}

export default ComparisonRunner
