import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { PlaybackMessage } from '../api/ws'
import { isFatalPlaybackError } from '../utils/youtubeErrors'
import {
  expectedOffsetSeconds,
  shouldResync,
  RESYNC_INTERVAL_MS,
} from '../utils/playbackSync'

const SCRIPT_ID = 'youtube-iframe-api'

// YT.PlayerState.PLAYING — a música começou a tocar de fato (fim do buffering).
const PLAYER_STATE_PLAYING = 1
// YT.PlayerState.ENDED — a música chegou ao fim de verdade.
const PLAYER_STATE_ENDED = 0

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
  songId: string | null = null,
  onReport: ((message: PlaybackMessage) => void) | null = null,
) {
  const playerRef = useRef<YouTubePlayer | null>(null)
  const videoIdRef = useRef<string | null>(videoId)
  const songIdRef = useRef<string | null>(songId)
  const onReportRef = useRef<((message: PlaybackMessage) => void) | null>(onReport)
  const startedAtRef = useRef<string | null>(startedAt)
  const cueStartAtRef = useRef<number | null>(null)
  const reportedVideoIdRef = useRef<string | null>(null)
  const endedVideoIdRef = useRef<string | null>(null)
  // Começa mudo: o autoplay com som é bloqueado pelo navegador até o usuário
  // interagir (banner "Clique para ativar o som"). O mute é aplicado no onReady.
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)
  const [erroredVideoId, setErroredVideoId] = useState<string | null>(null)

  // Acompanha o vídeo atual para o callback onError (que fecha sobre a montagem)
  // saber qual música falhou.
  useEffect(() => {
    videoIdRef.current = videoId
  }, [videoId])

  useEffect(() => {
    startedAtRef.current = startedAt
  }, [startedAt])

  // Refs que alimentam o callback onStateChange (criado uma única vez).
  useEffect(() => {
    songIdRef.current = songId
  }, [songId])

  useEffect(() => {
    onReportRef.current = onReport
  }, [onReport])

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
        // Sem controles nativos (play/pause/barra): quem manda no relógio é o
        // backend; o front só reflete o estado (cue no offset certo).
        // disablekb: 1 impede atalhos de teclado (espaço/setas) no player.
        playerVars: { controls: 0, rel: 0, playsinline: 1, disablekb: 1 },
        events: {
          onReady: (event) => {
            if (cancelled) return
            playerRef.current = event.target
            // Inicia mudo para contornar a política de autoplay; o usuário
            // ativa o som pelo banner/MuteButton (gesto que desbloqueia o áudio).
            event.target.mute()
            setReady(true)
          },
          onStateChange: (event) => {
            if (cancelled) return
            if (event.data === PLAYER_STATE_PLAYING) {
              // Começou de verdade: mede a duração real e o atraso de
              // carregamento e reporta ao backend (uma vez por música).
              if (reportedVideoIdRef.current !== null) return
              const vid = videoIdRef.current
              if (!vid) return
              const duration = playerRef.current?.getDuration() ?? 0
              if (duration <= 0) return
              const cueStart = cueStartAtRef.current
              const loadOffset =
                cueStart != null ? (Date.now() - cueStart) / 1000 : 0
              const report = onReportRef.current
              const song = songIdRef.current
              if (report && song) {
                reportedVideoIdRef.current = vid
                report({
                  type: 'playback_report',
                  song_id: song,
                  duration,
                  load_offset: loadOffset,
                })
              }
            } else if (event.data === PLAYER_STATE_ENDED) {
              // Acabou de verdade: avisa o backend para avançar (uma vez).
              if (endedVideoIdRef.current === videoIdRef.current) return
              const vid = videoIdRef.current
              if (!vid) return
              const report = onReportRef.current
              const song = songIdRef.current
              if (report && song) {
                endedVideoIdRef.current = vid
                report({ type: 'playback_ended', song_id: song })
              }
            }
          },
          onError: (event) => {
            if (cancelled) return
            // Só avisa em erro fatal (vídeo removido/não incorporável).
            // Erros transitórios (2, 5) disparam enquanto a música toca.
            if (isFatalPlaybackError(event.data)) {
              setErroredVideoId(videoIdRef.current)
            }
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
      // Usa startedAtRef para não re-cue quando o backend só refina o started_at.
      const offset = expectedOffsetSeconds(startedAtRef.current, Date.now())
      cueStartAtRef.current = Date.now()
      reportedVideoIdRef.current = null
      endedVideoIdRef.current = null
      playerRef.current?.cueVideoById(videoId, offset)
      playerRef.current?.playVideo()
    }
  }, [videoId, ready])

  useEffect(() => {
    if (!ready || !videoId || !startedAt) return

    // Correção de drift: a cada intervalo, compara o tempo real do player com o
    // esperado pelo relógio do backend. Se divergir (buffering/latência), faz
    // seekTo para recolocar todos os ouvintes no mesmo segundo.
    const id = window.setInterval(() => {
      const player = playerRef.current
      if (!player) return
      const expected = expectedOffsetSeconds(startedAt, Date.now())
      let actual: number
      try {
        actual = player.getCurrentTime()
      } catch {
        return
      }
      if (shouldResync(expected, actual)) {
        player.seekTo(expected, true)
      }
    }, RESYNC_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [videoId, startedAt, ready])

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

  // O erro é derivado: só conta se a música que falhou ainda é a atual. Assim,
  // trocar de música limpa o aviso sem precisar de setState dentro de effect.
  const error = erroredVideoId !== null && erroredVideoId === videoId

  return { muted, error, toggleMute }
}
