import type { QueueEntry } from './radio'

// Eventos recebidos do backend via WebSocket (contrato em API.md).
export type RadioEvent =
  | {
      type: 'state'
      song_id: string | null
      started_at: string | null
      duration: number
    }
  | { type: 'queue_updated'; queue: QueueEntry[] }
  | { type: 'skip_triggered'; song_id: string }
  | { type: 'error'; detail: string }

// Mensagens de reprodução enviadas pelo front ao backend (cliente → servidor).
export type PlaybackMessage =
  | {
      type: 'playback_report'
      song_id: string
      duration: number
      load_offset: number
    }
  | { type: 'playback_ended'; song_id: string }

type Listener = (event: RadioEvent) => void

const PING_INTERVAL_MS = 15000
const RECONNECT_DELAY_MS = 2000

function wsUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
  return base.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws'
}

export interface RadioSocket {
  send: (message: object) => void
  close: () => void
}

// Conecta ao /ws e entrega os eventos ao listener, com reconexão automática.
export function connectRadioSocket(
  token: string,
  onEvent: Listener,
): RadioSocket {
  let closed = false
  let ws: WebSocket | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function clearTimers() {
    if (pingTimer) clearInterval(pingTimer)
    if (reconnectTimer) clearTimeout(reconnectTimer)
    pingTimer = null
    reconnectTimer = null
  }

  function open() {
    if (closed) return
    const socket = new WebSocket(`${wsUrl()}?token=${encodeURIComponent(token)}`)
    ws = socket

    socket.onopen = () => {
      pingTimer = setInterval(() => {
        try {
          socket.send(JSON.stringify({ type: 'ping' }))
        } catch {
          // O onclose cuidará da reconexão.
        }
      }, PING_INTERVAL_MS)
    }

    socket.onmessage = (event) => {
      try {
        onEvent(JSON.parse(event.data) as RadioEvent)
      } catch {
        // Ignora frames que não são JSON.
      }
    }

    socket.onclose = () => {
      if (pingTimer) clearInterval(pingTimer)
      pingTimer = null
      if (!closed) {
        reconnectTimer = setTimeout(open, RECONNECT_DELAY_MS)
      }
    }
  }

  open()

  return {
    send: (message: object) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    },
    close: () => {
      closed = true
      clearTimers()
      ws?.close()
    },
  }
}
