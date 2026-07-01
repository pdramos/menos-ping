/**
 * Hook for the list of currently detected game processes, sourced from the
 * main process via IPC (GameDetector runs there, not in the renderer).
 */

import { useState, useEffect } from 'react'
import type { DetectedGame } from '@types/index'

export function useDetectedGames() {
  const [games, setGames] = useState<DetectedGame[]>([])

  useEffect(() => {
    let cancelled = false

    const refresh = () => {
      window.app.games.getDetected().then((detected) => {
        if (!cancelled) setGames(detected)
      })
    }

    refresh()

    const unsubscribe = window.app.games.onGameEvent(() => {
      refresh()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return games
}

export default useDetectedGames
