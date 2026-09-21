import type { QueueEntry } from '../api/radio'
import { formatDuration } from '../utils/format'
import styles from './QueueList.module.css'

interface QueueListProps {
  queue: QueueEntry[]
}

export function QueueList({ queue }: QueueListProps) {
  if (queue.length === 0) {
    return <p className={styles.empty}>Fila vazia</p>
  }
  return (
    <ul className={styles.list}>
      {queue.map((item) => (
        <li key={item.id} className={styles.item}>
          <span className={styles.position}>{item.position}</span>
          <span className={styles.title}>{item.song.title}</span>
          <span className={styles.duration}>
            {formatDuration(item.song.duration)}
          </span>
        </li>
      ))}
    </ul>
  )
}
