import { Link } from 'react-router-dom'
import { RegisterForm } from '../components/RegisterForm'
import { ThemeToggle } from '../components/ThemeToggle'
import styles from './page.module.css'

export function Register() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Rádio Comunitária</h1>
        <ThemeToggle />
      </header>
      <RegisterForm />
      <p>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </main>
  )
}
