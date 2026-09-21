import { Link } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'
import { ThemeToggle } from '../components/ThemeToggle'
import styles from './page.module.css'

export function Login() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Rádio Comunitária</h1>
        <ThemeToggle />
      </header>
      <LoginForm />
      <p>
        Não tem conta? <Link to="/register">Cadastre-se</Link>
      </p>
    </main>
  )
}
