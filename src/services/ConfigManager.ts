/**
 * Configuration management service
 * Handles loading, saving, and validating application configuration
 */

import fs from 'fs'
import path from 'path'
import type { OptimizationProfile, GameProfile } from '@types/index'
import { DEFAULT_OPTIMIZATION_PROFILE, DEFAULT_OPTIMIZATION_PROFILES } from '@config/default'
import { getLogger } from '@services/Logger'

const logger = getLogger('ConfigManager')

interface AppConfig {
  version: string
  activeProfileId: string
  profiles: OptimizationProfile[]
  gameProfiles: GameProfile[]
  ui: {
    theme: 'light' | 'dark'
    alwaysOnTop: boolean
    minimizeToTray: boolean
    autoStart: boolean
  }
  telemetry: {
    enabled: boolean
    crashReporting: boolean
    performanceData: boolean
  }
}

class ConfigManager {
  private config: AppConfig
  private configPath: string
  private isDirty = false
  private saveInterval: NodeJS.Timer | null = null

  constructor(configPath: string = '~/.menospingapp/config.json') {
    this.configPath = this.expandPath(configPath)
    this.config = this.getDefaultConfig()
    this.loadConfig()

    // Auto-save every 30 seconds if changed
    this.saveInterval = setInterval(() => {
      if (this.isDirty) {
        this.saveConfig().catch((err) => {
          logger.error('Auto-save config failed', err)
        })
      }
    }, 30000)
  }

  private expandPath(path: string): string {
    if (path.startsWith('~/')) {
      const homeDir = process.env.HOME || process.env.USERPROFILE || ''
      return path.replace('~', homeDir)
    }
    return path
  }

  private getDefaultConfig(): AppConfig {
    return {
      version: '0.1.0',
      activeProfileId: DEFAULT_OPTIMIZATION_PROFILE.id,
      profiles: [...DEFAULT_OPTIMIZATION_PROFILES],
      gameProfiles: [],
      ui: {
        theme: 'dark',
        alwaysOnTop: false,
        minimizeToTray: true,
        autoStart: false,
      },
      telemetry: {
        enabled: false, // Opt-in only
        crashReporting: false,
        performanceData: false,
      },
    }
  }

  private loadConfig(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        logger.info(`No existing config at ${this.configPath}, using defaults`)
        this.config = this.getDefaultConfig()
        return
      }

      const raw = fs.readFileSync(this.configPath, 'utf-8')
      const loaded = JSON.parse(raw) as Partial<AppConfig>

      // Merge over defaults so newly-added fields in a future version don't
      // crash on an older config file that predates them.
      this.config = {
        ...this.getDefaultConfig(),
        ...loaded,
        ui: { ...this.getDefaultConfig().ui, ...loaded.ui },
        telemetry: { ...this.getDefaultConfig().telemetry, ...loaded.telemetry },
      }

      // Bring in any built-in profiles introduced since this config was last
      // saved (e.g. a new app version), without touching profiles the user
      // already has (including their own edits to existing built-ins).
      for (const profile of DEFAULT_OPTIMIZATION_PROFILES) {
        if (!this.config.profiles.some((p) => p.id === profile.id)) {
          this.config.profiles.push(profile)
          this.isDirty = true
        }
      }

      logger.info(`Config loaded from ${this.configPath}`)
    } catch (error) {
      logger.warn('Failed to load config, using defaults', error)
      this.config = this.getDefaultConfig()
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await fs.promises.mkdir(path.dirname(this.configPath), { recursive: true })
      await fs.promises.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
      this.isDirty = false
      logger.info(`Config saved to ${this.configPath}`)
    } catch (error) {
      logger.error('Failed to save config', error)
      throw error
    }
  }

  getActiveProfile(): OptimizationProfile {
    const profile = this.config.profiles.find((p) => p.id === this.config.activeProfileId)
    return profile || DEFAULT_OPTIMIZATION_PROFILE
  }

  setActiveProfile(profileId: string): void {
    if (this.config.profiles.some((p) => p.id === profileId)) {
      this.config.activeProfileId = profileId
      this.isDirty = true
      logger.info(`Active profile changed to: ${profileId}`)
    } else {
      logger.warn(`Profile not found: ${profileId}`)
    }
  }

  getProfile(profileId: string): OptimizationProfile | undefined {
    return this.config.profiles.find((p) => p.id === profileId)
  }

  /** Add or replace a profile (e.g. an ad-hoc one built from custom toggles), then activate it. */
  upsertProfile(profile: OptimizationProfile): void {
    const index = this.config.profiles.findIndex((p) => p.id === profile.id)
    if (index !== -1) {
      this.config.profiles[index] = profile
    } else {
      this.config.profiles.push(profile)
    }
    this.config.activeProfileId = profile.id
    this.isDirty = true
    logger.info(`Profile upserted and activated: ${profile.id}`)
  }

  getAllProfiles(): OptimizationProfile[] {
    return [...this.config.profiles]
  }

  addProfile(profile: OptimizationProfile): void {
    if (this.config.profiles.some((p) => p.id === profile.id)) {
      logger.warn(`Profile already exists: ${profile.id}`)
      return
    }

    this.config.profiles.push(profile)
    this.isDirty = true
    logger.info(`Profile added: ${profile.id}`)
  }

  updateProfile(profile: OptimizationProfile): void {
    const index = this.config.profiles.findIndex((p) => p.id === profile.id)
    if (index !== -1) {
      this.config.profiles[index] = profile
      this.isDirty = true
      logger.info(`Profile updated: ${profile.id}`)
    } else {
      logger.warn(`Profile not found: ${profile.id}`)
    }
  }

  deleteProfile(profileId: string): void {
    if (profileId === 'default') {
      logger.warn('Cannot delete default profile')
      return
    }

    const index = this.config.profiles.findIndex((p) => p.id === profileId)
    if (index !== -1) {
      this.config.profiles.splice(index, 1)
      this.isDirty = true

      // Switch to default if active profile was deleted
      if (this.config.activeProfileId === profileId) {
        this.config.activeProfileId = 'default'
      }

      logger.info(`Profile deleted: ${profileId}`)
    }
  }

  getGameProfile(gameId: string): GameProfile | undefined {
    return this.config.gameProfiles.find((p) => p.id === gameId)
  }

  getAllGameProfiles(): GameProfile[] {
    return [...this.config.gameProfiles]
  }

  addGameProfile(profile: GameProfile): void {
    if (this.config.gameProfiles.some((p) => p.id === profile.id)) {
      logger.warn(`Game profile already exists: ${profile.id}`)
      return
    }

    this.config.gameProfiles.push(profile)
    this.isDirty = true
    logger.info(`Game profile added: ${profile.id}`)
  }

  updateGameProfile(profile: GameProfile): void {
    const index = this.config.gameProfiles.findIndex((p) => p.id === profile.id)
    if (index !== -1) {
      this.config.gameProfiles[index] = profile
      this.isDirty = true
      logger.info(`Game profile updated: ${profile.id}`)
    }
  }

  getUISettings() {
    return this.config.ui
  }

  setUISettings(settings: Partial<AppConfig['ui']>): void {
    this.config.ui = { ...this.config.ui, ...settings }
    this.isDirty = true
  }

  getTelemetrySettings() {
    return this.config.telemetry
  }

  setTelemetrySettings(settings: Partial<AppConfig['telemetry']>): void {
    this.config.telemetry = { ...this.config.telemetry, ...settings }
    this.isDirty = true
  }

  getConfig(): AppConfig {
    return { ...this.config }
  }

  destroy(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
    }

    if (this.isDirty) {
      this.saveConfig().catch((err) => {
        logger.error('Failed to save config on destroy', err)
      })
    }
  }
}

export default ConfigManager
