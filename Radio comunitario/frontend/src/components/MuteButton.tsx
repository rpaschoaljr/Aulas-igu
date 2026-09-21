import styles from './MuteButton.module.css'

interface MuteButtonProps {
  muted: boolean
  onToggle: () => void
}

export function MuteButton({ muted, onToggle }: MuteButtonProps) {
  return (
    <button className={styles.button} type="button" onClick={onToggle}>
      {muted ? 'Ativar som' : 'Mudo'}
    </button>
  )
}
