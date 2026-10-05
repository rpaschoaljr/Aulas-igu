import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { PlaybackMessage } from '../api/ws'
import { isFatalPlaybackError } from '../utils/youtubeErrors'
import {
  expectedOffsetSeconds,
  shouldSeekBack,
  RESYNC_INTERVAL_MS,
} from '../utils/playbackSync'

const SCRIPT_ID = 'youtube-iframe-api'

// YT.PlayerState.PLAYING — a música começou a tocar de fato (fim do buffering).
const PLAYER_STATE_PLAYING = 1
// YT.PlayerState.PAUSED — o player foi pausado (atalho, fone bluetooth, etc.).
const PLAYER_STATE_PAUSED = 2
// YT.PlayerState.ENDED — a música chegou ao fim de verdade.
const PLAYER_STATE_ENDED = 0

const STATE_NAMES: Record<number, string> = {
  [-1]: 'UNSTARTED (-1)',
  0: 'ENDED (0)',
  1: 'PLAYING (1)',
  2: 'PAUSED (2)',
  3: 'BUFFERING (3)',
  5: 'CUED (5)',
}

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
  const lastCuedVideoRef = useRef<string | null>(null)
  const cuePerfRef = useRef<number>(0)
  const cueOffsetRef = useRef<number>(0)
  const retriedVideoRef = useRef<string | null>(null)
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
        // enablejsapi: 1 e origin garantem handshake via postMessage sem mismatch.
        videoId: videoIdRef.current || undefined,
        playerVars: {
          controls: 0,
          rel: 0,
          playsinline: 1,
          disablekb: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return
            playerRef.current = event.target
            console.warn('[PLAYER] onReady', new Date().toISOString())
            // Inicia mudo para contornar a política de autoplay; o usuário
            // ativa o som pelo banner/MuteButton (gesto que desbloqueia o áudio).
            event.target.mute()
            setReady(true)
          },
          onStateChange: (event) => {
            if (cancelled) return
            const stateName = STATE_NAMES[event.data] ?? String(event.data)
            const currentTime = playerRef.current?.getCurrentTime() ?? 0
            console.log(
              `[PLAYER] 🔄 onStateChange: ${stateName} (tempo atual: ${currentTime.toFixed(1)}s)`,
            )

            if (event.data === PLAYER_STATE_PLAYING) {
              const player = playerRef.current
              const actual = player?.getCurrentTime() ?? 0
              const expected =
                cuePerfRef.current > 0
                  ? cueOffsetRef.current +
                    (performance.now() - cuePerfRef.current) / 1000
                  : expectedOffsetSeconds(startedAtRef.current, Date.now())

              console.log('[PLAYER] ▶️ PLAYING', {
                actual: Number(actual.toFixed(2)),
                expected: Number(expected.toFixed(2)),
                diff: Number((expected - actual).toFixed(2)),
              })

              // Se o player retomou de uma pausa e está atrás do tempo da rádio, avança para o tempo real:
              if (expected - actual > 1.5 && player) {
                console.log(
                  `[PLAYER] ⏩ Retomando após pausa: sincronizando de ${actual.toFixed(1)}s para ${expected.toFixed(1)}s`,
                )
                player.seekTo(expected, true)
              }

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
              console.warn(
                '[PLAYER] PLAYING (primeira confirmação)',
                {
                  song,
                  duration,
                  loadOffset,
                  clientIso: new Date().toISOString(),
                  clientMs: Date.now(),
                },
              )
              if (report && song) {
                reportedVideoIdRef.current = vid
                report({
                  type: 'playback_report',
                  song_id: song,
                  duration,
                  load_offset: loadOffset,
                })
              }
            } else if (event.data === PLAYER_STATE_PAUSED) {
              // Rádio ao vivo: se o player for pausado externamente (teclado,
              // fone Bluetooth, extensões), reposiciona no segundo correto e
              // despausa imediatamente para manter a sincronia da transmissão.
              const vid = videoIdRef.current
              if (!vid) return
              const player = playerRef.current
              const actual = player?.getCurrentTime() ?? 0
              const expected =
                cuePerfRef.current > 0
                  ? cueOffsetRef.current +
                    (performance.now() - cuePerfRef.current) / 1000
                  : expectedOffsetSeconds(startedAtRef.current, Date.now())

              console.log('⏸️ [PLAYER] PAUSED detectado — ressincronizando para tempo real:', {
                vid,
                actual: Number(actual.toFixed(2)),
                expected: Number(expected.toFixed(2)),
                diff: Number((expected - actual).toFixed(2)),
              })
              player?.seekTo(expected, true)
              player?.playVideo()
            } else if (event.data === PLAYER_STATE_ENDED) {
              // Acabou de verdade: avisa o backend para avançar (uma vez).
              if (endedVideoIdRef.current === videoIdRef.current) return
              const vid = videoIdRef.current
              if (!vid) return
              const report = onReportRef.current
              const song = songIdRef.current
              console.warn(
                '[PLAYER] ENDED',
                { song, clientIso: new Date().toISOString(), clientMs: Date.now() },
              )
              if (report && song) {
                endedVideoIdRef.current = vid
                report({ type: 'playback_ended', song_id: song })
              }
            }
          },
          onError: (event) => {
            if (cancelled) return
            console.warn('[PLAYER] onError', event.data)
            // Só avisa em erro fatal (vídeo removido/não incorporável).
            // Erros transitórios (2, 5) disparam enquanto a música toca.
            if (isFatalPlaybackError(event.data)) {
              setErroredVideoId(videoIdRef.current)
            } else if (
              reportedVideoIdRef.current === null &&
              retriedVideoRef.current !== videoIdRef.current
            ) {
              // Erro transitório ANTES de começar a tocar: tenta de novo do
              // começo (uma vez por vídeo), para o player não ficar parado.
              const vid = videoIdRef.current
              if (vid) {
                retriedVideoRef.current = vid
                if (typeof playerRef.current?.loadVideoById === 'function') {
                  playerRef.current.loadVideoById(vid, 0)
                } else {
                  playerRef.current?.cueVideoById(vid, 0)
                }
                playerRef.current?.playVideo()
              }
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
      // Transição (música nova): começa do zero, sem pular o começo.
      // Mount/late join: entra no meio usando o relógio do backend.
      const isTransition = lastCuedVideoRef.current !== null
      // Arredonda para inteiro: a IFrame API do YouTube rejeita offset
      // com vírgula (erro 2) no cue.
      const offset = Math.floor(
        isTransition ? 0 : expectedOffsetSeconds(startedAtRef.current, Date.now()),
      )
      lastCuedVideoRef.current = videoId
      cueOffsetRef.current = offset
      cuePerfRef.current = performance.now()
      cueStartAtRef.current = Date.now()
      reportedVideoIdRef.current = null
      endedVideoIdRef.current = null
      retriedVideoRef.current = null
      console.warn(
        '[PLAYER] cue',
        {
          videoId,
          offset,
          startedAt: startedAtRef.current,
          clientIso: new Date().toISOString(),
          clientMs: Date.now(),
        },
      )
      if (typeof playerRef.current?.loadVideoById === 'function') {
        playerRef.current.loadVideoById(videoId, offset)
      } else {
        playerRef.current?.cueVideoById(videoId, offset)
      }
      playerRef.current?.playVideo()
    }
  }, [videoId, ready])

  useEffect(() => {
    if (!ready || !videoId) return

    // Correção de drift com relógio relativo (performance.now é monotônico, sem
    // skew). Só recua quando o player está adiantado; nunca pula para frente.
    const id = window.setInterval(() => {
      const player = playerRef.current
      if (!player) return
      const expected =
        cueOffsetRef.current + (performance.now() - cuePerfRef.current) / 1000
      let actual: number
      try {
        actual = player.getCurrentTime()
      } catch {
        return
      }
      if (shouldSeekBack(expected, actual)) {
        console.warn('[PLAYER] drift', { expected, actual })
        player.seekTo(expected, false)
      }
    }, RESYNC_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [videoId, ready])

  const toggleMute = useCallback(() => {
    const player = playerRef.current
    console.warn('[BTN] toggleMute', {
      muted,
      hasPlayer: !!player,
      clientIso: new Date().toISOString(),
    })
    if (!player) return
    // Usa o estado do React como fonte da verdade (não `isMuted()`), e reforça
    // com setVolume(100) — mais confiável que unMute() em alguns navegadores.
    if (muted) {
      player.unMute()
      player.setVolume(100)
      player.playVideo()
      setMuted(false)
    } else {
      player.mute()
      setMuted(true)
    }
  }, [muted])

  // O erro é derivado: só conta se a música que falhou ainda é a atual. Assim,
  // trocar de música limpa o aviso sem precisar de setState dentro de effect.
  const error = erroredVideoId !== null && erroredVideoId === videoId

  return { muted, error, toggleMute }
}
