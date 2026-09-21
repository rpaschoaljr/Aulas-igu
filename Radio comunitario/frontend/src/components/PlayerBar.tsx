import { useRef } from 'react'
import type { QueueEntry } from '../api/radio'
import { usePlayer } from '../hooks/usePlayer'
import { formatDuration } from '../utils/format'
import { MuteButton } from './MuteButton'
import styles from './PlayerBar.module.css'

interface PlayerBarProps {
  current: QueueEntry | null
  startedAt: string | null
  onSkip: () => void
}

export function PlayerBar({ current, startedAt, onSkip }: PlayerBarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoId = current?.song.youtube_id ?? null
  const { muted, toggleMute } = usePlayer(videoId, startedAt, containerRef)

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
      <div ref={containerRef} className={styles.player} />
    </section>
  )
}
