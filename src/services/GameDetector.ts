/**
 * Game detection service
 * Monitors for running games and applies game-specific optimizations
 */

import type { DetectedGame, GameProfile } from '@types/index'
import { GAME_DETECTION_CONFIG } from '@config/default'
import { getLogger } from '@services/Logger'
import { listRunningProcesses } from '@native/processes'

const logger = getLogger('GameDetector')

class GameDetector {
  private detectedGames: Map<number, DetectedGame> = new Map()
  private isMonitoring = false
  private monitorInterval: NodeJS.Timer | null = null
  private observers: Set<
    (type: 'game_detected' | 'game_closed', game: DetectedGame) => void
  > = new Set()
  private gameProfiles: Map<string, GameProfile> = new Map()

  constructor() {
    this.loadGameProfiles()
  }

  private loadGameProfiles(): void {
    // Load game profiles from configuration
    for (const gameConfig of GAME_DETECTION_CONFIG.supportedGames) {
      const profile: GameProfile = {
        id: gameConfig.name.toLowerCase().replace(/\s+/g, '-'),
        name: gameConfig.name,
        executable_path: '', // Will be set when detected
        process_name: gameConfig.executables[0],
        enabled: true,
        optimizations: {
          enable_network_priority: true,
          enable_buffer_optimization: true,
          enable_dns_optimization: true,
          enable_route_optimization: true,
        },
        protocol_hints: gameConfig.protocol_hints,
        priority: 10,
      }

      for (const executable of gameConfig.executables) {
        this.gameProfiles.set(executable.toLowerCase(), profile)
      }
    }

    logger.info(`Loaded ${this.gameProfiles.size} game profiles`)
  }

  async start(): Promise<void> {
    if (this.isMonitoring) return

    this.isMonitoring = true
    logger.info('Starting game detector')

    // Initial scan
    await this.scanProcesses()

    // Set up periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.scanProcesses().catch((err) => {
        logger.error('Error scanning processes', err)
      })
    }, GAME_DETECTION_CONFIG.monitorInterval)
  }

  stop(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    logger.info('Stopping game detector')

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }

    // Close all detected games
    this.detectedGames.forEach((game) => {
      this.observers.forEach((observer) => observer('game_closed', game))
    })
    this.detectedGames.clear()
  }

  private async scanProcesses(): Promise<void> {
    try {
      const processes = await listRunningProcesses()

      // Check for new games. Match on basename (case-insensitive) so full
      // paths and Wine/Proton invocations ("wine64 CS2.exe") both resolve.
      for (const process of processes) {
        const executableName = process.name.toLowerCase()
        const profile = this.gameProfiles.get(executableName)

        if (profile && !this.detectedGames.has(process.pid)) {
          const game: DetectedGame = {
            profile: {
              ...profile,
              executable_path: process.execPath,
            },
            pid: process.pid,
            memory_usage: process.memoryBytes,
            cpu_usage: process.cpuPercent,
            // "start_time" reflects when Menos Ping first observed this PID,
            // not the OS-level process creation time (not reliably available
            // cross-platform from ps/tasklist without extra elevated calls).
            start_time: Date.now(),
            network_activity: {
              sent_bytes: 0,
              received_bytes: 0,
            },
          }

          this.detectedGames.set(process.pid, game)
          logger.info(`Game detected: ${profile.name} (PID: ${process.pid})`)

          this.observers.forEach((observer) => observer('game_detected', game))
        } else if (profile && this.detectedGames.has(process.pid)) {
          // Update live metrics for an already-detected game
          const existing = this.detectedGames.get(process.pid)!
          existing.memory_usage = process.memoryBytes
          existing.cpu_usage = process.cpuPercent
        }
      }

      // Check for closed games
      const runningPids = new Set(processes.map((p) => p.pid))
      for (const [pid, game] of this.detectedGames) {
        if (!runningPids.has(pid)) {
          this.detectedGames.delete(pid)
          logger.info(`Game closed: ${game.profile.name} (PID: ${pid})`)

          this.observers.forEach((observer) => observer('game_closed', game))
        }
      }
    } catch (error) {
      logger.error('Failed to scan processes', error)
    }
  }

  getDetectedGames(): DetectedGame[] {
    return Array.from(this.detectedGames.values())
  }

  getGameByPid(pid: number): DetectedGame | undefined {
    return this.detectedGames.get(pid)
  }

  getGameProfile(gameId: string): GameProfile | undefined {
    // Search through profiles
    for (const profile of this.gameProfiles.values()) {
      if (profile.id === gameId) {
        return profile
      }
    }
    return undefined
  }

  onGameEvent(
    observer: (type: 'game_detected' | 'game_closed', game: DetectedGame) => void
  ): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  isRunning(): boolean {
    return this.isMonitoring
  }

  updateGameMetrics(pid: number, networkActivity: { sent_bytes: number; received_bytes: number }): void {
    const game = this.detectedGames.get(pid)
    if (game) {
      game.network_activity = networkActivity
    }
  }
}

export default GameDetector
