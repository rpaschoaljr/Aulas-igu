// Mock do WebSocket usado nos testes (jsdom não tem WebSocket nativo).
export class MockWebSocket {
  static instances: MockWebSocket[] = []
  static readonly OPEN = 1

  url: string
  sent: string[] = []
  readyState = 1
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
    this.onclose?.()
  }

  static reset() {
    MockWebSocket.instances = []
  }
}
