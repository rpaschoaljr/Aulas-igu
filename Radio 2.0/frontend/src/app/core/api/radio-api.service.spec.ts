import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RadioApiService } from './radio-api.service';

describe('RadioApiService (TDD)', () => {
  let service: RadioApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RadioApiService
      ]
    });

    service = TestBed.inject(RadioApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve buscar as salas de rádio ativas via GET /api/radio/rooms', () => {
    const mockRooms = [
      { id: 'pop-hits', name: 'Pop Hits 24h', slug: 'pop-hits-24h', cover_url: '/img.jpg', is_live: true }
    ];

    service.getRooms().subscribe(rooms => {
      expect(rooms.length).toBe(1);
      expect(rooms[0].name).toBe('Pop Hits 24h');
    });

    const req = httpMock.expectOne('/api/radio/rooms');
    expect(req.request.method).toBe('GET');
    req.flush(mockRooms);
  });

  it('deve buscar o status da sala via GET /api/radio/status', () => {
    service.getRoomStatus('rock-classico').subscribe(status => {
      expect(status.listeners).toBe(5);
    });

    const req = httpMock.expectOne(r => r.url === '/api/radio/status' && r.params.get('room') === 'rock-classico');
    expect(req.request.method).toBe('GET');
    req.flush({ listeners: 5, state: null });
  });

  it('deve realizar login de visitante via POST /api/auth/guest', () => {
    service.loginGuest('DJ Teste', '/avatar.png').subscribe(res => {
      expect(res.token).toBe('jwt_token_123');
      expect(res.user.nickname).toBe('DJ Teste');
    });

    const req = httpMock.expectOne('/api/auth/guest');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nickname: 'DJ Teste', avatar_url: '/avatar.png' });
    req.flush({ token: 'jwt_token_123', user: { nickname: 'DJ Teste' } });
  });

  it('deve adicionar música na fila via POST /api/radio/queue', () => {
    const track = {
      youtube_id: 'vid_1',
      title: 'Bohemian Rhapsody',
      channel_title: 'Queen',
      duration_seconds: 354
    };

    service.addToQueue('rock-classico', track).subscribe(res => {
      expect(res.id).toBe('q_123');
    });

    const req = httpMock.expectOne('/api/radio/queue');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.room_slug).toBe('rock-classico');
    req.flush({ id: 'q_123' });
  });

  it('deve buscar músicas no YouTube via GET /api/youtube/search', () => {
    service.searchYouTube('Queen').subscribe(tracks => {
      expect(tracks.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url === '/api/youtube/search' && r.params.get('q') === 'Queen');
    expect(req.request.method).toBe('GET');
    req.flush([{ youtube_id: 'vid_1', title: 'Queen' }]);
  });

  it('deve buscar mensagens de chat via GET /api/radio/chat', () => {
    service.getChatMessages('pop-hits-24h').subscribe(messages => {
      expect(messages.length).toBe(1);
      expect(messages[0].user_nickname).toBe('DJ Paschoal');
    });

    const req = httpMock.expectOne(r => r.url === '/api/radio/chat' && r.params.get('room') === 'pop-hits-24h');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: '1', room_id: 'pop-hits', user_nickname: 'DJ Paschoal', message_text: 'Olá' }]);
  });

  it('deve buscar histórico de músicas tocadas e puladas via GET /api/radio/history', () => {
    service.getHistory('pop-hits-24h', 10).subscribe(history => {
      expect(history.length).toBe(2);
      expect(history[0].was_skipped).toBe(false);
      expect(history[1].was_skipped).toBe(true);
    });

    const req = httpMock.expectOne(r => r.url === '/api/radio/history' && r.params.get('room') === 'pop-hits-24h' && r.params.get('limit') === '10');
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 'h1', room_id: 'pop-hits', title: 'Song 1', was_skipped: false, played_at: '2026-10-07T23:00:00Z' },
      { id: 'h2', room_id: 'pop-hits', title: 'Song 2', was_skipped: true, played_at: '2026-10-07T22:50:00Z' }
    ]);
  });

  it('deve buscar histórico com offset via GET /api/radio/history?room=...&limit=20&offset=20', () => {
    service.getHistory('radio-six-nine', 20, 20).subscribe(history => {
      expect(history.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url === '/api/radio/history' && r.params.get('room') === 'radio-six-nine' && r.params.get('limit') === '20' && r.params.get('offset') === '20');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'h21', room_id: 'pop-hits', title: 'Song 21', was_skipped: false, played_at: '2026-10-07T21:00:00Z' }]);
  });


  it('deve adicionar carrinho de músicas em lote via POST /api/radio/queue/batch', () => {
    const tracks = [
      { youtube_id: 'v1', title: 'Song 1', channel_title: 'Artist 1', duration_seconds: 180 },
      { youtube_id: 'v2', title: 'Song 2', channel_title: 'Artist 2', duration_seconds: 200 }
    ];

    service.addToQueueBatch('radio-six-nine', tracks).subscribe(res => {
      expect(res.success_count).toBe(2);
      expect(res.enqueued_items.length).toBe(2);
    });

    const req = httpMock.expectOne('/api/radio/queue/batch');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.room_slug).toBe('radio-six-nine');
    expect(req.request.body.tracks.length).toBe(2);
    req.flush({
      success_count: 2,
      failed_count: 0,
      enqueued_items: [{ id: 'q1' }, { id: 'q2' }],
      rejected: []
    });
  });

  it('deve consultar cota oficial do usuário via GET /api/radio/user-quota', () => {
    service.getUserQuota('radio-six-nine', 'token-123').subscribe(quota => {
      expect(quota.active_tracks).toBe(3);
      expect(quota.max_quota).toBe(5);
      expect(quota.can_request).toBe(true);
      expect(quota.authenticated).toBe(true);
    });

    const req = httpMock.expectOne(r => r.url === '/api/radio/user-quota' && r.params.get('room') === 'radio-six-nine');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush({
      room_slug: 'radio-six-nine',
      user_id: 'user-abc',
      active_tracks: 3,
      max_quota: 5,
      can_request: true,
      authenticated: true
    });
  });

  it('deve remover música da fila via POST /api/radio/queue/remove', () => {
    service.removeFromQueue('radio-six-nine', 'item-uuid-1', 'token-123').subscribe(res => {
      expect(res.status).toBe('removed');
    });

    const req = httpMock.expectOne('/api/radio/queue/remove');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ room_slug: 'radio-six-nine', queue_id: 'item-uuid-1' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush({ status: 'removed', queue_id: 'item-uuid-1' });
  });

  it('deve trocar música da fila via POST /api/radio/queue/swap', () => {
    const newTrack = {
      youtube_id: 'new-yt-id',
      title: 'New Song',
      channel_title: 'New Artist',
      duration_seconds: 210
    };

    service.swapQueueTrack('radio-six-nine', 'item-uuid-1', newTrack, 'token-123').subscribe(res => {
      expect(res.status).toBe('swapped');
    });

    const req = httpMock.expectOne('/api/radio/queue/swap');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      room_slug: 'radio-six-nine',
      queue_id: 'item-uuid-1',
      track: newTrack
    });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush({ status: 'swapped', item: { id: 'item-uuid-1' } });
  });

  it('deve registrar erro via POST /api/errors/log', () => {
    const errorPayload = {
      source: 'frontend',
      error_type: 'UI_ERROR',
      message: 'Falha no modal'
    };

    service.logError(errorPayload).subscribe(res => {
      expect(res.status).toBe('logged');
    });

    const req = httpMock.expectOne('/api/errors/log');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(errorPayload);
    req.flush({ status: 'logged', id: 'log-uuid' });
  });

  it('deve obter o Google Client ID público via GET /api/auth/google/client-id', () => {
    service.getGoogleClientId().subscribe(res => {
      expect(res.client_id).toBe('google-client-test-id');
    });

    const req = httpMock.expectOne('/api/auth/google/client-id');
    expect(req.request.method).toBe('GET');
    req.flush({ client_id: 'google-client-test-id' });
  });
});
