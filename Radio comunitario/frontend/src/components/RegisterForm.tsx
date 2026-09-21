import { useState, type FormEvent } from 'react'
import { registerUser } from '../api/auth'
import styles from './RegisterForm.module.css'

export function RegisterForm() {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await registerUser({ nickname, email, password })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <p className={styles.success}>
        Cadastro realizado! Enviamos um link de verificação para o seu e-mail.
      </p>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Apelido
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
      </label>
      <label className={styles.field}>
        E-mail
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </button>
    </form>
  )
}
