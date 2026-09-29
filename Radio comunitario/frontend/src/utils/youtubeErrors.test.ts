import { describe, expect, it } from 'vitest'
import { isFatalPlaybackError } from './youtubeErrors'

describe('isFatalPlaybackError', () => {
  it('considera fatais os códigos de vídeo indisponível/não incorporável', () => {
    expect(isFatalPlaybackError(100)).toBe(true)
    expect(isFatalPlaybackError(101)).toBe(true)
    expect(isFatalPlaybackError(150)).toBe(true)
  })

  it('ignora erros transitórios do player', () => {
    expect(isFatalPlaybackError(2)).toBe(false)
    expect(isFatalPlaybackError(5)).toBe(false)
  })
})
