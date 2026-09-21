import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../api/auth'
import styles from './page.module.css'

type Status = 'loading' | 'success' | 'error'

export function Verify() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function run() {
      try {
        await verifyEmail(token)
        setStatus('success')
        setMessage('E-mail verificado! Agora você pode entrar.')
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'erro ao verificar')
      }
    }
    void run()
  }, [token])

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Rádio Comunitária</h1>
      <p>{status === 'loading' ? 'Verificando...' : message}</p>
      {status !== 'loading' && <Link to="/login">Ir para o login</Link>}
    </main>
  )
}
