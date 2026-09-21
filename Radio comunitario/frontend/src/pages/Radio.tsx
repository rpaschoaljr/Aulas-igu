import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../api/auth'
import { HistoryList } from '../components/HistoryList'
import { PlayerBar } from '../components/PlayerBar'
import { QueueList } from '../components/QueueList'
import { SearchBar } from '../components/SearchBar'
import { ThemeToggle } from '../components/ThemeToggle'
import { useHistory } from '../hooks/useHistory'
import { usePlaybackState } from '../hooks/usePlaybackState'
import { useQueue } from '../hooks/useQueue'
import styles from './radio.module.css'

export function Radio() {
  const navigate = useNavigate()
  const { queue, loading, error, add, vote } = useQueue()
  const { history } = useHistory()
  const playbackState = usePlaybackState()
  const current = queue[0] ?? null

  async function handleLogout() {
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

      <PlayerBar
        current={current}
        startedAt={playbackState?.started_at ?? null}
        onSkip={handleSkip}
      />

      <SearchBar onAdd={(id) => void add(id)} />

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Fila</h2>
        {loading && <p className={styles.status}>Carregando...</p>}
        {error && <p className={styles.error}>{error}</p>}
        <QueueList queue={queue} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Histórico</h2>
        <HistoryList history={history} />
      </section>
    </main>
  )
}
