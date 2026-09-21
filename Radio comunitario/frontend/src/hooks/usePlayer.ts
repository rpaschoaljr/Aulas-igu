import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

const SCRIPT_ID = 'youtube-iframe-api'

function loadYouTubeApi(): Promise<YouTubeNamespace> {
  return new Promise((resolve) => {
    const existing = window.YT
    if (existing) {
      resolve(existing)
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT as YouTubeNamespace)
    }
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
  })
}

export function usePlayer(
  videoId: string | null,
  startedAt: string | null,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const playerRef = useRef<YouTubePlayer | null>(null)
  const [muted, setMuted] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    // Div imperativa: o React não a conhece, então o YT.Player pode substituí-la
    // pelo iframe sem quebrar a reconciliação do React. O tamanho garante que o
    // iframe fique dentro do container (100% × 16:9).
    const host = document.createElement('div')
    host.style.width = '100%'
    host.style.aspectRatio = '16 / 9'
    container.appendChild(host)

    void loadYouTubeApi().then((YT) => {
      if (cancelled) return
      playerRef.current = new YT.Player(host, {
        events: {
          onReady: (event) => {
            if (cancelled) return
            playerRef.current = event.target
            setReady(true)
          },
        },
      })
    })
    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      host.remove()
    }
  }, [containerRef])

  useEffect(() => {
    if (ready && videoId) {
      // Sincroniza com o "relógio" do backend: entra na música no ponto certo.
      const offset = startedAt
        ? Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 1000)
        : 0
      playerRef.current?.cueVideoById(videoId, offset)
      playerRef.current?.playVideo()
    }
  }, [videoId, ready, startedAt])

  const toggleMute = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    if (player.isMuted()) {
      player.unMute()
      setMuted(false)
    } else {
      player.mute()
      setMuted(true)
    }
  }, [])

  return { muted, toggleMute }
}
