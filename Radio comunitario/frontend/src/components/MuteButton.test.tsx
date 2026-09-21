import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MuteButton } from './MuteButton'

describe('MuteButton', () => {
  it('mostra "Mudo" quando não está mudo', () => {
    render(<MuteButton muted={false} onToggle={() => {}} />)
    expect(screen.getByRole('button', { name: 'Mudo' })).toBeInTheDocument()
  })

  it('mostra "Ativar som" quando está mudo', () => {
    render(<MuteButton muted onToggle={() => {}} />)
    expect(
      screen.getByRole('button', { name: 'Ativar som' }),
    ).toBeInTheDocument()
  })

  it('chama onToggle ao clicar', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<MuteButton muted={false} onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: 'Mudo' }))

    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
