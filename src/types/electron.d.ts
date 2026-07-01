/**
 * Type definitions for the Electron API bridge exposed to the renderer
 * process via preload.ts / contextBridge.
 */

import type {
  ConnectionQuality,
  DetectedGame,
  OptimizationProfile,
} from '@types/index'
import type { BackupEntry, BackupMeta } from '@services/BackupManager'
import type { ProbeResult } from '@native/probe'
import type { TracerouteResult } from '@native/traceroute'
import type { DNSLookupResult } from '@native/dnsLookup'
import type { RouteIssue } from '@services/RoutingOptimizer'

interface AppStatus {
  isRunning: boolean
  networkMonitoring: boolean
  gameDetection: boolean
  detectedGames: number
  connectionQuality: ConnectionQuality | null
  requiresElevation: boolean
}

interface UISettings {
  theme: 'light' | 'dark'
  alwaysOnTop: boolean
  minimizeToTray: boolean
  autoStart: boolean
}

interface TelemetrySettings {
  enabled: boolean
  crashReporting: boolean
  performanceData: boolean
}

interface ApplyResult {
  backupId: string
  appliedKeys: string[]
}

declare global {
  interface Window {
    app: {
      getVersion: () => Promise<string>
      getStatus: () => Promise<AppStatus>

      network: {
        getQuality: () => Promise<ConnectionQuality | null>
        getLatencyHistory: (count?: number) => Promise<number[]>
        onQualityChanged: (callback: (quality: ConnectionQuality) => void) => () => void
      }

      games: {
        getDetected: () => Promise<DetectedGame[]>
        onGameEvent: (
          callback: (event: { type: 'game_detected' | 'game_closed'; game: DetectedGame }) => void
        ) => () => void
      }

      config: {
        getActiveProfile: () => Promise<OptimizationProfile>
        getAllProfiles: () => Promise<OptimizationProfile[]>
        setActiveProfile: (profileId: string) => Promise<ApplyResult>
        getUISettings: () => Promise<UISettings>
        setUISettings: (settings: Partial<UISettings>) => Promise<UISettings>
        getTelemetrySettings: () => Promise<TelemetrySettings>
        setTelemetrySettings: (settings: Partial<TelemetrySettings>) => Promise<TelemetrySettings>
      }

      optimization: {
        getCurrentProfile: () => Promise<OptimizationProfile | null>
        apply: (profileId: string) => Promise<ApplyResult>
        revert: (backupId?: string) => Promise<boolean>
      }

      backups: {
        list: () => Promise<BackupMeta[]>
        get: (id: string) => Promise<BackupEntry | null>
        create: (label?: string) => Promise<string>
        delete: (id: string) => Promise<boolean>
      }

      tools: {
        ping: (host: string) => Promise<ProbeResult>
        traceroute: (host: string) => Promise<TracerouteResult>
        dnsLookup: (domain: string) => Promise<DNSLookupResult>
      }

      routing: {
        getIssues: () => Promise<RouteIssue[]>
      }
    }
    logger: {
      log: (...args: any[]) => void
      warn: (...args: any[]) => void
      error: (...args: any[]) => void
    }
  }
}

export {}
