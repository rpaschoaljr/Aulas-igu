import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RegisterForm } from './RegisterForm'
import * as authApi from '../api/auth'

vi.mock('../api/auth', () => ({
  registerUser: vi.fn(),
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cadastra e mostra a mensagem de verificação', async () => {
    vi.mocked(authApi.registerUser).mockResolvedValue({
      id: '1',
      nickname: 'teste',
      email: 'a@b.com',
      verified: false,
    })
    const user = userEvent.setup()
    render(<RegisterForm />)

    await user.type(screen.getByLabelText('Apelido'), 'teste')
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com')
    await user.type(screen.getByLabelText('Senha'), 'Senha1@forte')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(authApi.registerUser).toHaveBeenCalledWith({
      nickname: 'teste',
      email: 'a@b.com',
      password: 'Senha1@forte',
    })
    expect(await screen.findByText(/verificação/i)).toBeInTheDocument()
  })

  it('mostra erro quando o cadastro falha', async () => {
    vi.mocked(authApi.registerUser).mockRejectedValue(
      new Error('apelido ou e-mail já cadastrado'),
    )
    const user = userEvent.setup()
    render(<RegisterForm />)

    await user.type(screen.getByLabelText('Apelido'), 'teste')
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com')
    await user.type(screen.getByLabelText('Senha'), 'Senha1@forte')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(
      await screen.findByText('apelido ou e-mail já cadastrado'),
    ).toBeInTheDocument()
  })
})
