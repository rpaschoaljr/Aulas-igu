import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { handlers } from './handlers'
import { MockWebSocket } from './websocketMock'

export const server = setupServer(...handlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  // O MSW v2 intercepta WebSocket por padrão; reaplica o mock usado nos testes
  // (precisa vir depois do listen(), senão o MSW sobrescreve o stub).
  vi.stubGlobal('WebSocket', MockWebSocket)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

afterEach(() => {
  cleanup()
  MockWebSocket.reset()
})

if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
