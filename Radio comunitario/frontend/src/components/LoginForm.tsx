import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth'
import styles from './LoginForm.module.css'

export function LoginForm() {
  const navigate = useNavigate()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { access_token } = await loginUser({ login, password })
      localStorage.setItem('token', access_token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Apelido ou e-mail
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
        />
      </label>
      <label className={styles.field}>
        Senha
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
