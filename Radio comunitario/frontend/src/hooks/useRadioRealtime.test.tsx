import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QueueEntry } from '../api/radio'
import { MockWebSocket } from '../test/websocketMock'
import { useRadioRealtime } from './useRadioRealtime'

const ENTRY: QueueEntry = {
  id: 'q1',
  position: 1,
  added_by: null,
  song: {
    youtube_id: 'abc123',
    title: 'Música A',
    duration: 120,
    thumbnail: '',
  },
}

afterEach(() => {
  localStorage.clear()
})

function lastSocket(): MockWebSocket {
  const ws = MockWebSocket.instances.at(-1)
  if (!ws) throw new Error('nenhum WebSocket foi criado')
  return ws
}

describe('useRadioRealtime', () => {
  it('atualiza a fila ao receber queue_updated', () => {
    localStorage.setItem('token', 'jwt')
    const { result } = renderHook(() => useRadioRealtime())

    expect(result.current.loading).toBe(true)

    act(() => {
      lastSocket().onmessage?.({
        data: JSON.stringify({ type: 'queue_updated', queue: [ENTRY] }),
      })
    })

    expect(result.current.queue).toEqual([ENTRY])
    expect(result.current.loading).toBe(false)
  })

  it('atualiza o estado de reprodução ao receber state', () => {
    localStorage.setItem('token', 'jwt')
    const { result } = renderHook(() => useRadioRealtime())

    act(() => {
      lastSocket().onmessage?.({
        data: JSON.stringify({
          type: 'state',
          song_id: 's1',
          started_at: '2026-09-21T00:00:00Z',
          duration: 120,
        }),
      })
    })

    expect(result.current.playbackState).toEqual({
      current_song_id: 's1',
      started_at: '2026-09-21T00:00:00Z',
      duration: 120,
    })
  })

  it('mantém conexão e envia ping periodicamente', () => {
    vi.useFakeTimers()
    localStorage.setItem('token', 'jwt')
    renderHook(() => useRadioRealtime())

    const ws = lastSocket()
    act(() => {
      ws.onopen?.()
    })

    act(() => {
      vi.advanceTimersByTime(15000)
    })

    expect(ws.sent).toContain(JSON.stringify({ type: 'ping' }))
    vi.useRealTimers()
  })

  it('envia mensagem pelo sendMessage (playback_report)', () => {
    localStorage.setItem('token', 'jwt')
    const { result } = renderHook(() => useRadioRealtime())

    act(() => {
      result.current.sendMessage({
        type: 'playback_report',
        song_id: 's1',
        duration: 187,
        load_offset: 2.5,
      })
    })

    expect(lastSocket().sent).toContain(
      JSON.stringify({
        type: 'playback_report',
        song_id: 's1',
        duration: 187,
        load_offset: 2.5,
      }),
    )
  })
})
