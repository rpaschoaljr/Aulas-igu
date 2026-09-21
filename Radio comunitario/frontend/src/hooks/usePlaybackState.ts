import { useEffect, useState } from 'react'
import { getState, type PlaybackState } from '../api/radio'

const POLL_INTERVAL_MS = 2500

export function usePlaybackState(): PlaybackState | null {
  const [state, setState] = useState<PlaybackState | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getState()
        if (!cancelled) setState(data)
      } catch {
        // Falha silenciosa — o estado é opcional (o player toca do zero sem ele).
      }
    }
    void load()

    const id = setInterval(() => {
      void load()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return state
}
