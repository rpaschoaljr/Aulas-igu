import { TestBed } from '@angular/core/testing';
import { RealWebSocketService } from './real-websocket.service';
import { RadioStateService } from '../radio/radio-state.service';

describe('RealWebSocketService (TDD)', () => {
  let service: RealWebSocketService;
  let radioState: RadioStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RealWebSocketService, RadioStateService]
    });

    service = TestBed.inject(RealWebSocketService);
    radioState = TestBed.inject(RadioStateService);
  });

  afterEach(() => {
    service.disconnect();
  });

  it('deve processar mensagem de listeners_count e atualizar o RadioStateService', () => {
    service.handleMessage({
      type: 'listeners_count',
      room_id: 'pop-hits',
      payload: { count: 42 },
      timestamp: Date.now()
    });

    expect(radioState.listenersCount()).toBe(42);
  });

  it('deve processar mensagem de track_changed e atualizar a faixa tocando', () => {
    service.handleMessage({
      type: 'track_changed',
      room_id: 'pop-hits',
      payload: {
        room_id: 'pop-hits',
        current_track: {
          youtube_id: 'abc_123',
          title: 'Don\'t Stop Me Now',
          channel_title: 'Queen',
          duration_seconds: 210,
          thumbnail_url: '/thumb.jpg'
        },
        started_at_unix_milli: Date.now() - 30000,
        server_timestamp: Date.now(),
        elapsed_seconds: 30,
        duration_seconds: 210,
        skip_votes_count: 0,
        skip_votes_required: 5
      },
      timestamp: Date.now()
    });

    const current = radioState.nowPlaying();
    expect(current).not.toBeNull();
    expect(current?.youtubeId).toBe('abc_123');
    expect(current?.title).toBe('Don\'t Stop Me Now');
    expect(current?.currentOffsetSeconds).toBe(30);
  });

  it('deve processar mensagem de track_duration_updated e atualizar a duração no RadioStateService', () => {
    radioState.setNowPlaying({
      queueId: 'q1',
      youtubeId: 'queen_one',
      title: 'Bohemian Rhapsody',
      channel: 'Queen',
      durationSeconds: 210,
      startedAtUnixMilli: Date.now(),
      currentOffsetSeconds: 10,
      addedBy: 'DJ'
    });

    service.handleMessage({
      type: 'track_duration_updated',
      room_id: 'pop-hits',
      payload: {
        roomId: 'pop-hits',
        youtubeId: 'queen_one',
        durationSeconds: 355
      },
      timestamp: Date.now()
    });

    expect(radioState.nowPlaying()?.durationSeconds).toBe(355);
  });

  it('deve disparar queueUpdated$ quando receber mensagem queue_updated com ação advance', () => {
    let triggered = false;
    service.queueUpdated$.subscribe((payload) => {
      triggered = true;
      expect(payload.action).toBe('advance');
    });

    service.handleMessage({
      type: 'queue_updated',
      room_id: 'geral',
      payload: {
        action: 'advance',
        trackId: 'track_123'
      },
      timestamp: Date.now()
    });

    expect(triggered).toBe(true);
  });

  it('deve disparar historyUpdated$ quando receber mensagem history_updated', () => {
    let triggered = false;
    service.historyUpdated$.subscribe((payload) => {
      triggered = true;
      expect(payload.action).toBe('advance');
    });

    service.handleMessage({
      type: 'history_updated',
      room_id: 'geral',
      payload: {
        action: 'advance',
        trackId: 'track_played'
      },
      timestamp: Date.now()
    });

    expect(triggered).toBe(true);
  });
});

