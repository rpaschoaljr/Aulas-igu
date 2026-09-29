import { apiFetch } from './client'

export interface SongResult {
  youtube_id: string
  title: string
  duration: number
  thumbnail: string
}

export interface QueueEntry {
  id: string
  position: number
  added_by: string | null
  song: SongResult
}

export interface HistoryEntry {
  id: string
  played_at: string
  added_by: string | null
  song: SongResult
}

export interface PlaybackState {
  current_song_id: string | null
  started_at: string | null
  duration: number
}

export function searchSongs(q: string): Promise<{ results: SongResult[] }> {
  return apiFetch<{ results: SongResult[] }>(
    `/api/songs/search?q=${encodeURIComponent(q)}`,
  )
}

export function getQueue(): Promise<QueueEntry[]> {
  return apiFetch<QueueEntry[]>('/api/queue')
}

export function addToQueue(
  youtubeId: string,
): Promise<{ id: string; position: number }> {
  return apiFetch<{ id: string; position: number }>('/api/queue', {
    method: 'POST',
    body: JSON.stringify({ youtube_id: youtubeId }),
  })
}

export function vote(queueItemId: string): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/queue/${queueItemId}/vote`, {
    method: 'POST',
  })
}

export function getHistory(limit = 10, offset = 0): Promise<HistoryEntry[]> {
  return apiFetch<HistoryEntry[]>(`/api/history?limit=${limit}&offset=${offset}`)
}

export function getState(): Promise<PlaybackState> {
  return apiFetch<PlaybackState>('/api/state')
}
