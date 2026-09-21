const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const REQUEST_TIMEOUT_MS = 10000

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function extractDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    const detail = body.detail
    if (typeof detail === 'string') {
      return detail
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : ''))
        .filter(Boolean)
        .join(', ')
    }
    return JSON.stringify(body)
  } catch {
    return response.statusText
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers = new Headers(options.headers)
  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    // Sessão expirada/revogada (só quando havia token — não confunde com falha de login).
    if (response.status === 401 && token) {
      localStorage.removeItem('token')
      window.location.assign('/login')
      throw new ApiError(401, 'sessão expirada')
    }

    if (!response.ok) {
      throw new ApiError(response.status, await extractDetail(response))
    }

    if (response.status === 204) {
      return undefined as T
    }
    return (await response.json()) as T
  } catch (err) {
    if (err instanceof ApiError) {
      throw err
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'tempo de resposta excedido')
    }
    throw new ApiError(0, 'falha de conexão')
  } finally {
    clearTimeout(timeout)
  }
}
