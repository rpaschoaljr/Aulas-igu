import { useCallback, useEffect, useRef, useState } from 'react'
import { getHistory, type HistoryEntry } from '../api/radio'

const POLL_INTERVAL_MS = 5000
const PAGE_SIZE = 10

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageRef = useRef(0)

  useEffect(() => {
    pageRef.current = page
  }, [page])

  const load = useCallback(async (targetPage: number) => {
    try {
      const data = await getHistory(PAGE_SIZE, targetPage * PAGE_SIZE)
      setHistory(data)
      setPage(targetPage)
      setHasMore(data.length === PAGE_SIZE)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'erro ao carregar o histórico',
      )
    }
  }, [])

  const next = useCallback(() => {
    void load(page + 1)
  }, [page, load])

  const prev = useCallback(() => {
    void load(Math.max(0, page - 1))
  }, [page, load])

  useEffect(() => {
    let cancelled = false
    async function loadFirstPage() {
      try {
        const data = await getHistory(PAGE_SIZE, 0)
        if (!cancelled) {
          setHistory(data)
          setHasMore(data.length === PAGE_SIZE)
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
    void loadFirstPage()

    // Atualiza a página atual (para pegar novas músicas tocadas).
    const id = setInterval(() => {
      void load(pageRef.current)
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [load])

  return { history, page, hasMore, loading, error, next, prev }
}
