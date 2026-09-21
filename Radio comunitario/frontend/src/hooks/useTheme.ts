import { useEffect, useSyncExternalStore, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode)
  const systemIsDark = useSyncExternalStore(subscribe, systemPrefersDark)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const resolved: 'light' | 'dark' =
    mode === 'system' ? (systemIsDark ? 'dark' : 'light') : mode

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])

  return { mode, resolved, setMode }
}
