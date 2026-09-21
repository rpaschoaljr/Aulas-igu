import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  localStorage.clear()
})

describe('App', () => {
  it('redireciona para o login em / sem token', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('Apelido ou e-mail')).toBeInTheDocument()
  })

  it('renderiza a rádio em / com token', async () => {
    localStorage.setItem('token', 'jwt')
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('heading', { name: 'Fila' }),
    ).toBeInTheDocument()
  })

  it('renderiza o login em /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('Apelido ou e-mail')).toBeInTheDocument()
  })
})
