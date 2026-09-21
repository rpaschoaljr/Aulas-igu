import type { HistoryEntry } from '../api/radio'
import styles from './HistoryList.module.css'

interface HistoryListProps {
  history: HistoryEntry[]
}

export function HistoryList({ history }: HistoryListProps) {
  if (history.length === 0) {
    return <p className={styles.empty}>Nenhuma música tocada ainda</p>
  }
  return (
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
  )
}
