/**
 * Backup Manager
 * Captures and restores real system network settings before/after optimizations
 * are applied. Runs in the Electron main process (uses fs/os directly).
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { getLogger } from '@services/Logger'

const logger = getLogger('BackupManager')

export interface BackupEntry {
  id: string
  timestamp: number
  label: string
  platform: NodeJS.Platform
  profileId?: string
  settings: Record<string, string>
}

export interface BackupMeta {
  id: string
  timestamp: number
  label: string
  platform: NodeJS.Platform
  profileId?: string
  settingCount: number
}

function expandHome(p: string): string {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1))
  }
  return p
}

class BackupManager {
  private backupDir: string
  private indexPath: string

  constructor(baseDir: string = '~/.menospingapp/backups') {
    this.backupDir = expandHome(baseDir)
    this.indexPath = path.join(this.backupDir, 'index.json')
    this.ensureDirSync()
  }

  private ensureDirSync(): void {
    try {
      fs.mkdirSync(this.backupDir, { recursive: true })
    } catch (error) {
      logger.error('Failed to create backup directory', error)
    }
  }

  private async readIndex(): Promise<BackupMeta[]> {
    try {
      const raw = await fs.promises.readFile(this.indexPath, 'utf-8')
      return JSON.parse(raw) as BackupMeta[]
    } catch {
      return []
    }
  }

  private async writeIndex(entries: BackupMeta[]): Promise<void> {
    await fs.promises.writeFile(this.indexPath, JSON.stringify(entries, null, 2), 'utf-8')
  }

  /**
   * Capture and persist a snapshot of current system settings.
   * `settings` should be the real values read from the OS (registry values,
   * sysctl output, etc.) BEFORE any optimization is applied.
   */
  async createBackup(
    settings: Record<string, string>,
    options?: { label?: string; profileId?: string }
  ): Promise<BackupEntry> {
    const id = `backup-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    const entry: BackupEntry = {
      id,
      timestamp: Date.now(),
      label: options?.label || `Backup ${new Date().toISOString()}`,
      platform: process.platform,
      profileId: options?.profileId,
      settings,
    }

    const filePath = path.join(this.backupDir, `${id}.json`)
    await fs.promises.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8')

    const index = await this.readIndex()
    index.push({
      id: entry.id,
      timestamp: entry.timestamp,
      label: entry.label,
      platform: entry.platform,
      profileId: entry.profileId,
      settingCount: Object.keys(settings).length,
    })
    await this.writeIndex(index)

    logger.info(`Backup created: ${id}`, { settingCount: Object.keys(settings).length })
    return entry
  }

  async listBackups(): Promise<BackupMeta[]> {
    const index = await this.readIndex()
    return index.slice().sort((a, b) => b.timestamp - a.timestamp)
  }

  async getBackup(id: string): Promise<BackupEntry | null> {
    try {
      const filePath = path.join(this.backupDir, `${id}.json`)
      const raw = await fs.promises.readFile(filePath, 'utf-8')
      return JSON.parse(raw) as BackupEntry
    } catch (error) {
      logger.warn(`Backup not found: ${id}`, error)
      return null
    }
  }

  async getLatestBackup(): Promise<BackupEntry | null> {
    const backups = await this.listBackups()
    if (backups.length === 0) return null
    return this.getBackup(backups[0].id)
  }

  async deleteBackup(id: string): Promise<void> {
    try {
      const filePath = path.join(this.backupDir, `${id}.json`)
      await fs.promises.unlink(filePath)
    } catch (error) {
      logger.warn(`Failed to delete backup file for ${id}`, error)
    }

    const index = await this.readIndex()
    const filtered = index.filter((b) => b.id !== id)
    await this.writeIndex(filtered)

    logger.info(`Backup deleted: ${id}`)
  }

  async pruneOldBackups(keepCount: number = 20): Promise<number> {
    const backups = await this.listBackups()
    if (backups.length <= keepCount) return 0

    const toRemove = backups.slice(keepCount)
    for (const backup of toRemove) {
      await this.deleteBackup(backup.id)
    }

    logger.info(`Pruned ${toRemove.length} old backups`)
    return toRemove.length
  }
}

let backupManagerInstance: BackupManager | null = null

export function getBackupManager(): BackupManager {
  if (!backupManagerInstance) {
    backupManagerInstance = new BackupManager()
  }
  return backupManagerInstance
}

export default BackupManager
