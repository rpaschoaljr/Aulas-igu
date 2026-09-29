import { useRef } from 'react'
import type { PlaybackMessage } from '../api/ws'
import type { QueueEntry } from '../api/radio'
import { usePlayer } from '../hooks/usePlayer'
import { formatDuration } from '../utils/format'
import { MuteButton } from './MuteButton'
import styles from './PlayerBar.module.css'

interface PlayerBarProps {
  current: QueueEntry | null
  startedAt: string | null
  songId?: string | null
  onReport?: ((message: PlaybackMessage) => void) | null
  onSkip: () => void
}

export function PlayerBar({
  current,
  startedAt,
  songId = null,
  onReport = null,
  onSkip,
}: PlayerBarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoId = current?.song.youtube_id ?? null
  const { muted, error, toggleMute } = usePlayer(
    videoId,
    startedAt,
    containerRef,
    songId,
    onReport,
  )

  return (
    <section className={styles.bar}>
      {current ? (
        <>
          <img className={styles.thumb} src={current.song.thumbnail} alt="" />
          <div className={styles.info}>
            <span className={styles.title}>{current.song.title}</span>
            <span className={styles.duration}>
              {formatDuration(current.song.duration)}
            </span>
          </div>
          <div className={styles.controls}>
            <button className={styles.skip} type="button" onClick={onSkip}>
              Pular
            </button>
            <MuteButton muted={muted} onToggle={toggleMute} />
          </div>
        </>
      ) : (
        <p className={styles.empty}>Nada tocando no momento</p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          Não foi possível reproduzir esta música. Tente pular ou buscar outra.
        </p>
      )}
      <div className={styles.playerWrap}>
        <div ref={containerRef} className={styles.player} />
        {/* Camada transparente que captura os cliques e impede interação direta
            com o iframe do YouTube (controles já vêm ocultos, mas é garantia). */}
        <div className={styles.overlay} aria-hidden="true" />
        {muted && current && (
          <button
            className={styles.unmuteBanner}
            type="button"
            onClick={toggleMute}
          >
            Clique para ativar o som
          </button>
        )}
      </div>
    </section>
  )
}
