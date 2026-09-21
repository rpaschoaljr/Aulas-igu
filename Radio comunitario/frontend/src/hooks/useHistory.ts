import { useCallback, useEffect, useState } from 'react'
import { getHistory, type HistoryEntry } from '../api/radio'

const POLL_INTERVAL_MS = 5000

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await getHistory()
      setHistory(data)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'erro ao carregar o histórico',
      )
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getHistory()
        if (!cancelled) {
          setHistory(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'erro ao carregar o histórico',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()

    const id = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [refresh])

  return { history, loading, error, refresh }
}
