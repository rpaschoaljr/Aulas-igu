import { useTheme, type ThemeMode } from '../hooks/useTheme'
import styles from './ThemeToggle.module.css'

const LABELS: Record<ThemeMode, string> = {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
}

const NEXT: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

export function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => {
        console.warn('[BTN] tema', { de: mode, para: NEXT[mode] })
        setMode(NEXT[mode])
      }}
    >
      Tema: {LABELS[mode]}
    </button>
  )
}
