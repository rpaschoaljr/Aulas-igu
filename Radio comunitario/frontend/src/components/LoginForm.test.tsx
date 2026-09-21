import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'
import * as authApi from '../api/auth'

vi.mock('../api/auth', () => ({
  loginUser: vi.fn(),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('faz login e salva o token', async () => {
    vi.mocked(authApi.loginUser).mockResolvedValue({
      access_token: 'jwt',
      token_type: 'bearer',
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Apelido ou e-mail'), 'teste')
    await user.type(screen.getByLabelText('Senha'), 'Senha1@forte')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(authApi.loginUser).toHaveBeenCalledWith({
      login: 'teste',
      password: 'Senha1@forte',
    })
    expect(localStorage.getItem('token')).toBe('jwt')
  })

  it('mostra erro quando o login falha', async () => {
    vi.mocked(authApi.loginUser).mockRejectedValue(
      new Error('credenciais inválidas'),
    )
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Apelido ou e-mail'), 'teste')
    await user.type(screen.getByLabelText('Senha'), 'senha')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('credenciais inválidas')).toBeInTheDocument()
  })
})
