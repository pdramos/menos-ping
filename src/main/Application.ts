/**
 * Main application class
 * Orchestrates all services and manages application lifecycle
 */

import NetworkMonitor from '@services/NetworkMonitor'
import GameDetector from '@services/GameDetector'
import ConfigManager from '@services/ConfigManager'
import OptimizationEngine from '@services/OptimizationEngine'
import RoutingOptimizer from '@services/RoutingOptimizer'
import ComparisonRunner from '@services/ComparisonRunner'
import { getLogger } from '@services/Logger'

const logger = getLogger('Application')

class Application {
  private networkMonitor: NetworkMonitor
  private gameDetector: GameDetector
  private configManager: ConfigManager
  private optimizationEngine: OptimizationEngine
  private routingOptimizer: RoutingOptimizer
  private comparisonRunner: ComparisonRunner
  private isInitialized = false
  private isRunning = false

  constructor() {
    this.networkMonitor = new NetworkMonitor()
    this.gameDetector = new GameDetector()
    this.configManager = new ConfigManager()
    this.optimizationEngine = new OptimizationEngine()
    this.routingOptimizer = new RoutingOptimizer()
    this.comparisonRunner = new ComparisonRunner(this.networkMonitor, this.optimizationEngine)
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    logger.info('Initializing Menos Ping application')

    try {
      // Initialize optimization engine
      await this.optimizationEngine.initialize()

      // Set up event listeners
      this.setupEventListeners()

      this.isInitialized = true
      logger.info('Application initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize application', error)
      throw error
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (this.isRunning) return

    logger.info('Starting Menos Ping application')

    try {
      // Start monitoring services
      await this.networkMonitor.start()
      await this.gameDetector.start()
      this.routingOptimizer.startRouteMonitoring().catch((err) => {
        logger.error('Route monitoring failed to start', err)
      })

      // Apply active optimization profile
      const activeProfile = this.configManager.getActiveProfile()
      await this.optimizationEngine.applyOptimizations(activeProfile)

      this.isRunning = true
      logger.info('Application started successfully')
    } catch (error) {
      logger.error('Failed to start application', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    logger.info('Stopping Menos Ping application')

    try {
      // Stop monitoring services
      this.networkMonitor.stop()
      this.gameDetector.stop()
      await this.routingOptimizer.stopRouteMonitoring()

      // Revert optimizations
      await this.optimizationEngine.revertOptimizations()

      // Save configuration
      await this.configManager.saveConfig()

      this.isRunning = false
      logger.info('Application stopped successfully')
    } catch (error) {
      logger.error('Failed to stop application', error)
    }
  }

  private setupEventListeners(): void {
    // Monitor network quality changes
    this.networkMonitor.onConnectionQualityChanged((quality) => {
      logger.info('Connection quality changed', {
        score: quality.score,
        status: quality.status,
      })
    })

    // Monitor game detection
    this.gameDetector.onGameEvent((type, game) => {
      logger.info(`Game event: ${type}`, {
        gameId: game.profile.id,
        pid: game.pid,
      })

      if (type === 'game_detected' && game.profile.enabled) {
        // Apply game-specific optimizations
        this.applyGameOptimizations(game.profile.id)
      }
    })
  }

  private async applyGameOptimizations(gameId: string): Promise<void> {
    try {
      const gameProfile = this.configManager.getGameProfile(gameId)
      if (gameProfile?.enabled) {
        logger.info(`Applying optimizations for game: ${gameId}`)
        // Game-specific optimizations would be applied here
      }
    } catch (error) {
      logger.error(`Failed to apply game optimizations for ${gameId}`, error)
    }
  }

  // Public API for renderer process

  getNetworkMonitor(): NetworkMonitor {
    return this.networkMonitor
  }

  getGameDetector(): GameDetector {
    return this.gameDetector
  }

  getConfigManager(): ConfigManager {
    return this.configManager
  }

  getOptimizationEngine(): OptimizationEngine {
    return this.optimizationEngine
  }

  getRoutingOptimizer(): RoutingOptimizer {
    return this.routingOptimizer
  }

  getComparisonRunner(): ComparisonRunner {
    return this.comparisonRunner
  }

  isInitialized_(): boolean {
    return this.isInitialized
  }

  isRunning_(): boolean {
    return this.isRunning
  }

  async shutdown(): Promise<void> {
    await this.stop()
    this.configManager.destroy()
    this.routingOptimizer.destroy()
    logger.info('Application shutdown complete')
  }
}

let appInstance: Application | null = null

export function getApplication(): Application {
  if (!appInstance) {
    appInstance = new Application()
  }
  return appInstance
}

export default Application
