import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('começa em system e aplica o tema claro', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.mode).toBe('system')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('alterna para dark e persiste', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setMode('dark'))
    expect(result.current.mode).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
