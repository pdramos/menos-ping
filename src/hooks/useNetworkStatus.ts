/**
 * Hook for monitoring network status
 */

import { useState, useEffect } from 'react'
import type { ConnectionQuality } from '@types/index'
import { getApplication } from '@main/Application'

export function useNetworkStatus() {
  const [quality, setQuality] = useState<ConnectionQuality | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    const app = getApplication()
    const monitor = app.getNetworkMonitor()

    // Set initial value
    const currentQuality = monitor.getConnectionQuality()
    if (currentQuality) {
      setQuality(currentQuality)
    }
    setIsMonitoring(monitor.isRunning())

    // Subscribe to updates
    const unsubscribe = monitor.onConnectionQualityChanged((newQuality) => {
      setQuality(newQuality)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return {
    quality,
    isMonitoring,
    latency: quality?.latency.average ?? 0,
    jitter: quality?.jitter.value ?? 0,
    packetLoss: quality?.packet_loss.percentage ?? 0,
  }
}

export default useNetworkStatus
