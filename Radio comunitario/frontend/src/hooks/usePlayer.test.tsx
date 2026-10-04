import { act, renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayer } from './usePlayer'

// Fake mínimo da YouTube IFrame Player API: simula a criação do player e os
// métodos usados pelo hook, sem depender do script real do YouTube.
class FakePlayer {
  static instances: FakePlayer[] = []

  opts: YouTubePlayerOptions
  muted = false
  played = false
  currentTime = 0
  duration = 0
  cued: { videoId: string; startSeconds?: number } | null = null
  seekedTo: { seconds: number; allowSeekAhead: boolean } | null = null
  destroyed = false

  constructor(_element: HTMLElement, opts: YouTubePlayerOptions) {
    this.opts = opts
    FakePlayer.instances.push(this)
  }

  emitReady() {
    this.opts.events?.onReady?.({ target: this as unknown as YouTubePlayer })
  }

  emitPlaying() {
    this.opts.events?.onStateChange?.({ data: 1 })
  }

  emitEnded() {
    this.opts.events?.onStateChange?.({ data: 0 })
  }

  mute() {
    this.muted = true
  }

  unMute() {
    this.muted = false
  }

  isMuted() {
    return this.muted
  }

  setVolume(_volume: number) {}

  playVideo() {
    this.played = true
  }

  pauseVideo() {}

  loadVideoById(videoId: string, startSeconds?: number) {
    this.cued = { videoId, startSeconds }
    this.played = true
  }

  cueVideoById(videoId: string, startSeconds?: number) {
    this.cued = { videoId, startSeconds }
  }

  getCurrentTime() {
    return this.currentTime
  }

  getDuration() {
    return this.duration
  }

  seekTo(seconds: number, allowSeekAhead: boolean) {
    this.seekedTo = { seconds, allowSeekAhead }
  }

  destroy() {
    this.destroyed = true
  }
}

beforeEach(() => {
  FakePlayer.instances = []
  ;(window as unknown as { YT?: unknown }).YT = { Player: FakePlayer }
})

afterEach(() => {
  delete (window as unknown as { YT?: unknown }).YT
  vi.useRealTimers()
})

describe('usePlayer', () => {
  it('inicia mudo e aplica mute no player', async () => {
    // Ref estável (como o useRef do componente real) para não remontar o player.
    const ref: RefObject<HTMLDivElement | null> = {
      current: document.createElement('div'),
    }
    const { result } = renderHook(() => usePlayer('abc', null, ref))
    await act(async () => {})
    const player = FakePlayer.instances[0]
    act(() => player.emitReady())

    expect(result.current.muted).toBe(true)
    expect(player.muted).toBe(true)
    expect(player.played).toBe(true)
  })

  it('desmuta ao alternar (toggleMute)', async () => {
    const ref: RefObject<HTMLDivElement | null> = {
      current: document.createElement('div'),
    }
    const { result } = renderHook(() => usePlayer('abc', null, ref))
    await act(async () => {})
    const player = FakePlayer.instances[0]
    act(() => player.emitReady())

    act(() => result.current.toggleMute())

    expect(result.current.muted).toBe(false)
    expect(player.muted).toBe(false)
  })

  it('entra na música no offset esperado', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T00:00:00Z'))
    const startedAt = '2026-09-20T23:59:50Z' // 10s atrás
    const ref: RefObject<HTMLDivElement | null> = {
      current: document.createElement('div'),
    }

    const { result } = renderHook(() => usePlayer('abc', startedAt, ref))
    await act(async () => {})
    const player = FakePlayer.instances[0]
    act(() => player.emitReady())

    expect(result.current.muted).toBe(true)
    expect(player.cued).toEqual({ videoId: 'abc', startSeconds: 10 })
  })

  it('recua quando o player está adiantado', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T00:00:00Z'))
    const startedAt = '2026-09-20T23:59:50Z'
    const ref: RefObject<HTMLDivElement | null> = {
      current: document.createElement('div'),
    }

    renderHook(() => usePlayer('abc', startedAt, ref))
    await act(async () => {})
    const player = FakePlayer.instances[0]
    act(() => player.emitReady())

    player.currentTime = 100 // muito adiantado
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    expect(player.seekedTo).not.toBeNull()
    expect(player.seekedTo?.allowSeekAhead).toBe(false)
  })

  it('não recua quando o player acompanha o relógio', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T00:00:00Z'))
    const startedAt = '2026-09-20T23:59:50Z'
    const ref: RefObject<HTMLDivElement | null> = {
      current: document.createElement('div'),
    }

    renderHook(() => usePlayer('abc', startedAt, ref))
    await act(async () => {})
    const player = FakePlayer.instances[0]
    act(() => player.emitReady())

    player.currentTime = 40 // sincronizado no instante do disparo
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    expect(player.seekedTo).toBeNull()
  })

  it('não pula para frente quando o player está atrás', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T00:00:00Z'))
    const startedAt = '2026-09-20T23:59:50Z'
    const ref: RefObject<HTMLDivElement | null> = {
      current: document.createElement('div'),
    }

    renderHook(() => usePlayer('abc', startedAt, ref))
    await act(async () => {})
    const player = FakePlayer.instances[0]
    act(() => player.emitReady())

    player.currentTime = 0 // atrás do esperado
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    expect(player.seekedTo).toBeNull() // nunca pula para frente
  })

  it('reporta duração real e offset ao começar a tocar', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T00:00:00Z'))
    const ref: RefObject<HTMLDivElement | null> = {
      current: document.createElement('div'),
    }
    const onReport = vi.fn()

    renderHook(() => usePlayer('abc', null, ref, 'song-1', onReport))
    await act(async () => {})
    const player = FakePlayer.instances[0]
    act(() => player.emitReady())

    player.duration = 187
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    act(() => player.emitPlaying())

    expect(onReport).toHaveBeenCalledTimes(1)
    expect(onReport).toHaveBeenCalledWith({
      type: 'playback_report',
      song_id: 'song-1',
      duration: 187,
      load_offset: 2.5,
    })
  })

  it('reporta apenas uma vez por música', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T00:00:00Z'))
    const ref: RefObject<HTMLDivElement | null> = {
      current: document.createElement('div'),
    }
    const onReport = vi.fn()

    renderHook(() => usePlayer('abc', null, ref, 'song-1', onReport))
    await act(async () => {})
    const player = FakePlayer.instances[0]
    act(() => player.emitReady())

    player.duration = 187
    act(() => player.emitPlaying())
    act(() => player.emitPlaying())

    expect(onReport).toHaveBeenCalledTimes(1)
  })

  it('envia playback_ended ao acabar a música', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-21T00:00:00Z'))
    const ref: RefObject<HTMLDivElement | null> = {
      current: document.createElement('div'),
    }
    const onReport = vi.fn()

    renderHook(() => usePlayer('abc', null, ref, 'song-1', onReport))
    await act(async () => {})
    const player = FakePlayer.instances[0]
    act(() => player.emitReady())

    act(() => player.emitEnded())

    expect(onReport).toHaveBeenCalledWith({
      type: 'playback_ended',
      song_id: 'song-1',
    })
  })
})
