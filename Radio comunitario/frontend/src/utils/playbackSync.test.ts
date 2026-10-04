import { describe, expect, it } from 'vitest'
import {
  expectedOffsetSeconds,
  shouldResync,
  shouldSeekBack,
} from './playbackSync'

describe('expectedOffsetSeconds', () => {
  it('retorna 0 sem startedAt', () => {
    expect(expectedOffsetSeconds(null, 1_000_000_000)).toBe(0)
  })

  it('calcula os segundos decorridos desde o início da faixa', () => {
    // 10 segundos depois do início.
    const startedAt = '2026-09-21T00:00:00Z'
    const now = new Date('2026-09-21T00:00:10Z').getTime()
    expect(expectedOffsetSeconds(startedAt, now)).toBe(10)
  })

  it('nunca devolve valor negativo (cliente adiantado)', () => {
    const startedAt = '2026-09-21T00:00:10Z'
    const now = new Date('2026-09-21T00:00:00Z').getTime()
    expect(expectedOffsetSeconds(startedAt, now)).toBe(0)
  })

  it('retorna 0 para data inválida', () => {
    expect(expectedOffsetSeconds('não-é-uma-data', 0)).toBe(0)
  })
})

describe('shouldResync', () => {
  it('não resincroniza quando a diferença é pequena', () => {
    expect(shouldResync(40, 40.5)).toBe(false)
    expect(shouldResync(40, 42)).toBe(false)
  })

  it('resincroniza quando a diferença supera o limiar', () => {
    expect(shouldResync(40, 42.1)).toBe(true)
    expect(shouldResync(40, 30)).toBe(true)
  })

  it('aceita um limiar customizado', () => {
    expect(shouldResync(40, 45, 5)).toBe(false)
    expect(shouldResync(40, 45.1, 5)).toBe(true)
  })
})

describe('shouldSeekBack', () => {
  it('recua quando o player está adiantado', () => {
    expect(shouldSeekBack(40, 43)).toBe(true)
  })

  it('não recua quando a diferença é pequena', () => {
    expect(shouldSeekBack(40, 40.5)).toBe(false)
    expect(shouldSeekBack(40, 42)).toBe(false)
  })

  it('nunca recua quando o player está atrás (não pula para frente)', () => {
    expect(shouldSeekBack(40, 30)).toBe(false)
    expect(shouldSeekBack(40, 0)).toBe(false)
  })

  it('aceita um limiar customizado', () => {
    expect(shouldSeekBack(40, 45, 5)).toBe(false)
    expect(shouldSeekBack(40, 45.1, 5)).toBe(true)
  })
})
