import { http, HttpResponse } from 'msw'
import type { HistoryEntry, QueueEntry, SongResult } from '../api/radio'

// Dados fake usados apenas nos testes (fake backend). Quando o backend real
// existir, estes handlers saem de cena e o app passa a falar com /api/* de verdade.
const NOW_PLAYING: SongResult = {
  // ID embedável de placeholder — troque por um vídeo real quando o backend existir.
  youtube_id: 'jNQXAC9IVRw',
  title: 'Música de exemplo',
  duration: 19,
  thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/default.jpg',
}

const SEARCH_RESULTS: SongResult[] = [
  NOW_PLAYING,
  {
    youtube_id: 'example002',
    title: 'Outra música',
    duration: 210,
    thumbnail: 'https://i.ytimg.com/vi/example002/default.jpg',
  },
]

let queue: QueueEntry[] = [
  { id: 'q1', position: 1, added_by: null, song: NOW_PLAYING },
]

const history: HistoryEntry[] = [
  {
    id: 'h1',
    played_at: '2026-09-20T10:00:00Z',
    added_by: null,
    song: {
      youtube_id: 'example003',
      title: 'Música antiga',
      duration: 200,
      thumbnail: 'https://i.ytimg.com/vi/example003/default.jpg',
    },
  },
]

let nextId = 1

export const handlers = [
  http.get('*/api/songs/search', ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const results = SEARCH_RESULTS.filter((song) =>
      song.title.toLowerCase().includes(q),
    )
    return HttpResponse.json({ results })
  }),

  http.get('*/api/queue', () => HttpResponse.json(queue)),

  http.post('*/api/queue', async ({ request }) => {
    const body = (await request.json()) as { youtube_id: string }
    const song = SEARCH_RESULTS.find((s) => s.youtube_id === body.youtube_id)
    if (!song) {
      return HttpResponse.json({ detail: 'música não encontrada' }, { status: 404 })
    }
    const entry: QueueEntry = {
      id: `q-new-${nextId++}`,
      position: queue.length + 1,
      added_by: null,
      song,
    }
    queue = [...queue, entry]
    return HttpResponse.json(
      { id: entry.id, position: entry.position },
      { status: 201 },
    )
  }),

  http.post('*/api/queue/:id/vote', () => HttpResponse.json({ status: 'ok' })),

  http.get('*/api/history', () => HttpResponse.json(history)),

  http.get('*/api/state', () =>
    HttpResponse.json({
      current_song_id: queue[0]?.id ?? null,
      started_at: new Date().toISOString(),
      duration: queue[0]?.song.duration ?? 0,
    }),
  ),

  http.post('*/api/auth/logout', () => HttpResponse.json({ status: 'ok' })),
]
