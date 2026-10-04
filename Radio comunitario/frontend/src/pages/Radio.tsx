import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../api/auth'
import type { PlaybackMessage } from '../api/ws'
import { HistoryList } from '../components/HistoryList'
import { PlayerBar } from '../components/PlayerBar'
import { QueueList } from '../components/QueueList'
import { SearchBar } from '../components/SearchBar'
import { ThemeToggle } from '../components/ThemeToggle'
import { useHistory } from '../hooks/useHistory'
import { useRadioRealtime } from '../hooks/useRadioRealtime'
import styles from './radio.module.css'

export function Radio() {
  const navigate = useNavigate()
  const { queue, playbackState, loading, error, add, vote, sendMessage } =
    useRadioRealtime()
  const { history, page, hasMore, loading: historyLoading, next, prev } =
    useHistory()
  const current = queue[0] ?? null
  const [historyOpen, setHistoryOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Reporta a duração real, o atraso e os eventos de início/fim ao backend.
  const handleReport = useCallback(
    (message: PlaybackMessage) => {
      sendMessage(message)
    },
    [sendMessage],
  )

  async function handleLogout() {
    console.warn('[BTN] sair')
    try {
      await logoutUser()
    } catch {
      // Ignora falha no logout — o importante é limpar o token local.
    } finally {
      localStorage.removeItem('token')
      navigate('/login')
    }
  }

  function handleSkip() {
    console.warn('[BTN] pular', { queueItemId: current?.id })
    if (current) {
      void vote(current.id)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Rádio Comunitária</h1>
        <div className={styles.actions}>
          <ThemeToggle />
          <button
            className={styles.logout}
            type="button"
            onClick={() => void handleLogout()}
          >
            Sair
          </button>
        </div>
      </header>

      <div className={styles.playerCol}>
        <PlayerBar
          current={current}
          startedAt={playbackState?.started_at ?? null}
          songId={playbackState?.current_song_id ?? null}
          onReport={handleReport}
          onSkip={handleSkip}
        />
      </div>

      {/* Botões só aparecem em tela estreita (desktop mostra tudo em colunas). */}
      <div className={styles.mobileActions}>
        <button
          className={styles.mobileButton}
          type="button"
          aria-expanded={historyOpen}
          aria-controls="history-panel"
          onClick={() => setHistoryOpen((open) => !open)}
        >
          Histórico
        </button>
        <button
          className={styles.mobileButton}
          type="button"
          aria-expanded={searchOpen}
          aria-controls="search-panel"
          onClick={() => setSearchOpen((open) => !open)}
        >
          Buscar
        </button>
      </div>

      <aside
        id="history-panel"
        className={`${styles.sidebar} ${styles.historyCol} ${
          historyOpen ? styles.open : ''
        }`}
      >
        <h2 className={styles.subtitle}>Histórico</h2>
        <HistoryList
          history={history}
          canPrev={page > 0}
          canNext={hasMore}
          onPrev={prev}
          onNext={next}
          loading={historyLoading}
        />
      </aside>

      <aside
        id="search-panel"
        className={`${styles.sidebar} ${styles.searchCol} ${
          searchOpen ? styles.open : ''
        }`}
      >
        <h2 className={styles.subtitle}>Buscar</h2>
        <SearchBar onAdd={(id) => void add(id)} />
      </aside>

      <section className={styles.queue}>
        <h2 className={styles.subtitle}>Fila</h2>
        {loading && <p className={styles.status}>Carregando...</p>}
        {error && <p className={styles.error}>{error}</p>}
        <QueueList queue={queue} />
      </section>
    </main>
  )
}
