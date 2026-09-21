import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
