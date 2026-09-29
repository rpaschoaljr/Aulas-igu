import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { HistoryEntry } from '../api/radio'
import { HistoryList } from './HistoryList'

const history: HistoryEntry[] = [
  {
    id: 'h1',
    played_at: '2026-09-20T10:00:00Z',
    added_by: null,
    song: {
      youtube_id: 'a',
      title: 'Antiga',
      duration: 120,
      thumbnail: '',
    },
  },
]

describe('HistoryList', () => {
  it('mostra as músicas tocadas', () => {
    render(<HistoryList history={history} />)
    expect(screen.getByText('Antiga')).toBeInTheDocument()
  })

  it('mostra mensagem quando não há histórico', () => {
    render(<HistoryList history={[]} />)
    expect(
      screen.getByText('Nenhuma música tocada ainda'),
    ).toBeInTheDocument()
  })

  it('desabilita "Anterior" na primeira página', () => {
    render(
      <HistoryList
        history={history}
        onPrev={() => {}}
        onNext={() => {}}
        canPrev={false}
        canNext={true}
      />,
    )

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled()
  })

  it('chama onPrev e onNext ao clicar', async () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(
      <HistoryList
        history={history}
        onPrev={onPrev}
        onNext={onNext}
        canPrev={true}
        canNext={true}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    await user.click(screen.getByRole('button', { name: 'Anterior' }))

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrev).toHaveBeenCalledTimes(1)
  })
})
