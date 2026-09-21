import { apiFetch } from './client'

export interface RegisterPayload {
  nickname: string
  email: string
  password: string
}

export interface LoginPayload {
  login: string
  password: string
}

export interface UserResponse {
  id: string
  nickname: string
  email: string
  verified: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export function registerUser(payload: RegisterPayload): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function loginUser(payload: LoginPayload): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function verifyEmail(token: string): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(
    `/api/auth/verify?token=${encodeURIComponent(token)}`,
  )
}

export function logoutUser(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/api/auth/logout', { method: 'POST' })
}
