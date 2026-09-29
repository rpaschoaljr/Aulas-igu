import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { QueueEntry } from '../api/radio'
import { usePlayer } from '../hooks/usePlayer'
import { PlayerBar } from './PlayerBar'

vi.mock('../hooks/usePlayer', () => ({
  usePlayer: vi.fn(() => ({ muted: false, error: false, toggleMute: vi.fn() })),
}))

const current: QueueEntry = {
  id: 'q1',
  position: 1,
  added_by: null,
  song: {
    youtube_id: 'abc123',
    title: 'Música tocando',
    duration: 125,
    thumbnail: 'https://img.example.com/t.jpg',
  },
}

describe('PlayerBar', () => {
  it('mostra a música atual e a duração', () => {
    render(<PlayerBar current={current} startedAt={null} onSkip={() => {}} />)
    expect(screen.getByText('Música tocando')).toBeInTheDocument()
    expect(screen.getByText('2:05')).toBeInTheDocument()
  })

  it('mostra placeholder quando não há música atual', () => {
    render(<PlayerBar current={null} startedAt={null} onSkip={() => {}} />)
    expect(
      screen.getByText('Nada tocando no momento'),
    ).toBeInTheDocument()
  })

  it('chama onSkip ao clicar em Pular', async () => {
    const onSkip = vi.fn()
    const user = userEvent.setup()
    render(<PlayerBar current={current} startedAt={null} onSkip={onSkip} />)

    await user.click(screen.getByRole('button', { name: 'Pular' }))

    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('mostra aviso quando a reprodução falha', () => {
    vi.mocked(usePlayer).mockReturnValueOnce({
      muted: false,
      error: true,
      toggleMute: vi.fn(),
    })

    render(<PlayerBar current={current} startedAt={null} onSkip={() => {}} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível reproduzir esta música',
    )
  })

  it('não mostra o banner de som quando não está mudo', () => {
    render(<PlayerBar current={current} startedAt={null} onSkip={() => {}} />)

    expect(
      screen.queryByRole('button', { name: 'Clique para ativar o som' }),
    ).not.toBeInTheDocument()
  })

  it('mostra o banner de som quando está mudo', () => {
    vi.mocked(usePlayer).mockReturnValueOnce({
      muted: true,
      error: false,
      toggleMute: vi.fn(),
    })

    render(<PlayerBar current={current} startedAt={null} onSkip={() => {}} />)

    expect(
      screen.getByRole('button', { name: 'Clique para ativar o som' }),
    ).toBeInTheDocument()
  })

  it('chama toggleMute ao clicar no banner de som', async () => {
    const toggleMute = vi.fn()
    vi.mocked(usePlayer).mockReturnValueOnce({
      muted: true,
      error: false,
      toggleMute,
    })
    const user = userEvent.setup()

    render(<PlayerBar current={current} startedAt={null} onSkip={() => {}} />)
    await user.click(
      screen.getByRole('button', { name: 'Clique para ativar o som' }),
    )

    expect(toggleMute).toHaveBeenCalledTimes(1)
  })
})
