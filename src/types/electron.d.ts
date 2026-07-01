/**
 * Type definitions for Electron API exposed to renderer process
 */

declare global {
  interface Window {
    app: {
      getVersion: () => Promise<string>
      getStatus: () => Promise<{
        isRunning: boolean
        networkMonitoring: boolean
        gameDetection: boolean
        detectedGames: number
        connectionQuality: any
      }>
      onUpdate: (callback: (data: any) => void) => void
    }
    logger: {
      log: (...args: any[]) => void
      warn: (...args: any[]) => void
      error: (...args: any[]) => void
    }
  }
}

export {}
