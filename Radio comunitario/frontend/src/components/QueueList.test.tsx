import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { QueueEntry } from '../api/radio'
import { QueueList } from './QueueList'

const queue: QueueEntry[] = [
  {
    id: 'q1',
    position: 1,
    added_by: null,
    song: {
      youtube_id: 'a',
      title: 'Primeira',
      duration: 60,
      thumbnail: '',
    },
  },
  {
    id: 'q2',
    position: 2,
    added_by: null,
    song: {
      youtube_id: 'b',
      title: 'Segunda',
      duration: 180,
      thumbnail: '',
    },
  },
]

describe('QueueList', () => {
  it('mostra os itens da fila com duração', () => {
    render(<QueueList queue={queue} />)
    expect(screen.getByText('Primeira')).toBeInTheDocument()
    expect(screen.getByText('Segunda')).toBeInTheDocument()
    expect(screen.getByText('1:00')).toBeInTheDocument()
    expect(screen.getByText('3:00')).toBeInTheDocument()
  })

  it('mostra mensagem quando a fila está vazia', () => {
    render(<QueueList queue={[]} />)
    expect(screen.getByText('Fila vazia')).toBeInTheDocument()
  })
})
