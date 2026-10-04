import { useCallback, useEffect, useRef, useState } from 'react'
import { connectRadioSocket, type RadioSocket } from '../api/ws'
import {
  addToQueue,
  vote as voteApi,
  type PlaybackState,
  type QueueEntry,
} from '../api/radio'

// Fonte única do estado em tempo real: o backend envia `state` e
// `queue_updated` pelo WebSocket; o front só reflete (sem polling).
export function useRadioRealtime() {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<RadioSocket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = connectRadioSocket(token, (event) => {
      if (event.type === 'state') {
        console.warn('[RADIO] state', {
          song_id: event.song_id,
          started_at: event.started_at,
          duration: event.duration,
          clientIso: new Date().toISOString(),
          clientMs: Date.now(),
        })
        setConnected(true)
        setPlaybackState({
          current_song_id: event.song_id,
          started_at: event.started_at,
          duration: event.duration,
        })
      } else if (event.type === 'queue_updated') {
        setConnected(true)
        setQueue(event.queue)
        setError(null)
      } else if (event.type === 'skip_triggered') {
        // O avanço dispara `state` + `queue_updated` em seguida.
      } else if (event.type === 'error') {
        setError(event.detail)
      }
    })

    socketRef.current = socket

    return () => {
      socketRef.current = null
      socket.close()
    }
  }, [])

  const sendMessage = useCallback((message: object) => {
    socketRef.current?.send(message)
  }, [])

  const add = useCallback(async (youtubeId: string) => {
    try {
      await addToQueue(youtubeId)
      // O backend transmite o `queue_updated` logo depois.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro ao adicionar')
    }
  }, [])

  const vote = useCallback(async (queueItemId: string) => {
    try {
      await voteApi(queueItemId)
      // O backend transmite `skip_triggered`/`state` quando o skip acontece.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro ao votar')
    }
  }, [])

  return {
    queue,
    playbackState,
    loading: !connected,
    error,
    add,
    vote,
    sendMessage,
  }
}
