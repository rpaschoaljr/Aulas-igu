import { useState, type FormEvent } from 'react'
import { searchSongs, type SongResult } from '../api/radio'
import { formatDuration } from '../utils/format'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  onAdd: (youtubeId: string) => void
}

export function SearchBar({ onAdd }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SongResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      const data = await searchSongs(q)
      setResults(data.results)
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro na busca')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={styles.section}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar música..."
          aria-label="Buscar música"
        />
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
      {searched && !loading && results.length === 0 && (
        <p className={styles.empty}>Nenhuma música encontrada</p>
      )}
      {results.length > 0 && (
        <ul className={styles.results}>
          {results.map((song) => (
            <li key={song.youtube_id} className={styles.result}>
              <img className={styles.thumb} src={song.thumbnail} alt="" />
              <div className={styles.info}>
                <span className={styles.title}>{song.title}</span>
                <span className={styles.duration}>
                  {formatDuration(song.duration)}
                </span>
              </div>
              <button
                className={styles.add}
                type="button"
                onClick={() => onAdd(song.youtube_id)}
              >
                Adicionar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
