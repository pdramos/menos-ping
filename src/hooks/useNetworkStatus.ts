/**
 * Hook for monitoring network status.
 * Talks to the main process exclusively via the window.app IPC bridge -
 * NetworkMonitor itself runs in the main process and is never imported here.
 */

import { useState, useEffect } from 'react'
import type { ConnectionQuality } from '@types/index'

export function useNetworkStatus() {
  const [quality, setQuality] = useState<ConnectionQuality | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    let cancelled = false

    window.app.network.getQuality().then((current) => {
      if (!cancelled && current) setQuality(current)
    })

    window.app.getStatus().then((status) => {
      if (!cancelled) setIsMonitoring(status.networkMonitoring)
    })

    const unsubscribe = window.app.network.onQualityChanged((newQuality) => {
      setQuality(newQuality)
      setIsMonitoring(true)
    })

    return () => {
      cancelled = true
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
