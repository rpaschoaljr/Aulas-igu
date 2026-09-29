import type { HistoryEntry } from '../api/radio'
import styles from './HistoryList.module.css'

interface HistoryListProps {
  history: HistoryEntry[]
  onPrev?: () => void
  onNext?: () => void
  canPrev?: boolean
  canNext?: boolean
  loading?: boolean
}

export function HistoryList({
  history,
  onPrev,
  onNext,
  canPrev = false,
  canNext = false,
  loading = false,
}: HistoryListProps) {
  return (
    <>
      {history.length === 0 ? (
        <p className={styles.empty}>Nenhuma música tocada ainda</p>
      ) : (
        <ul className={styles.list}>
          {history.map((entry) => (
            <li key={entry.id} className={styles.item}>
              <span className={styles.title}>{entry.song.title}</span>
              <span className={styles.playedAt}>
                {new Date(entry.played_at).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
      {onPrev && onNext && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            type="button"
            onClick={onPrev}
            disabled={!canPrev || loading}
          >
            Anterior
          </button>
          <button
            className={styles.pageButton}
            type="button"
            onClick={onNext}
            disabled={!canNext || loading}
          >
            Próxima
          </button>
        </div>
      )}
    </>
  )
}
