import { useCallback, useEffect, useState } from 'react'
import {
  addToQueue,
  getQueue,
  vote as voteApi,
  type QueueEntry,
} from '../api/radio'

const POLL_INTERVAL_MS = 2500

export function useQueue() {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await getQueue()
      setQueue(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro ao carregar a fila')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getQueue()
        if (!cancelled) {
          setQueue(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'erro ao carregar a fila')
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

  const add = useCallback(
    async (youtubeId: string) => {
      try {
        await addToQueue(youtubeId)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'erro ao adicionar')
      }
    },
    [refresh],
  )

  const vote = useCallback(
    async (queueItemId: string) => {
      try {
        await voteApi(queueItemId)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'erro ao votar')
      }
    },
    [refresh],
  )

  return { queue, loading, error, add, vote }
}
