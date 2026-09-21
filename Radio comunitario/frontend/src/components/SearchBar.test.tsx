import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  it('busca e mostra resultados', async () => {
    const user = userEvent.setup()
    render(<SearchBar onAdd={() => {}} />)

    await user.type(screen.getByLabelText('Buscar música'), 'exemplo')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('Música de exemplo')).toBeInTheDocument()
  })

  it('mostra mensagem quando não há resultados', async () => {
    const user = userEvent.setup()
    render(<SearchBar onAdd={() => {}} />)

    await user.type(screen.getByLabelText('Buscar música'), 'zzz')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(
      await screen.findByText('Nenhuma música encontrada'),
    ).toBeInTheDocument()
  })

  it('chama onAdd com o youtube_id ao adicionar', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<SearchBar onAdd={onAdd} />)

    await user.type(screen.getByLabelText('Buscar música'), 'exemplo')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar' }))

    expect(onAdd).toHaveBeenCalledWith('jNQXAC9IVRw')
  })
})
