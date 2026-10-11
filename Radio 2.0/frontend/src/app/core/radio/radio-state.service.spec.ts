import { TestBed } from '@angular/core/testing';
import { RadioStateService } from './radio-state.service';
import { AuthService } from '../auth/auth.service';
import { Track } from './radio.models';

describe('RadioStateService (TDD)', () => {
  let service: RadioStateService;
  let authService: AuthService;

  beforeEach(() => {
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true
    });

    TestBed.configureTestingModule({});
    authService = TestBed.inject(AuthService);
    service = TestBed.inject(RadioStateService);

    authService.loginAsGuest('Ouvinte Teste');
  });

  it('deve calcular corretamente a cota de faixas do usuário (máximo 5)', () => {
    const currentUserId = authService.currentUser()!.id;

    const track1: Track = { queueId: '1', youtubeId: 'a', title: 'T1', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte Teste', addedByUserId: currentUserId };
    const track2: Track = { queueId: '2', youtubeId: 'b', title: 'T2', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte Teste', addedByUserId: currentUserId };
    const track3: Track = { queueId: '3', youtubeId: 'c', title: 'T3', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte Teste', addedByUserId: currentUserId };
    const track4: Track = { queueId: '4', youtubeId: 'd', title: 'T4', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte Teste', addedByUserId: currentUserId };
    const track5: Track = { queueId: '5', youtubeId: 'e', title: 'T5', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte Teste', addedByUserId: currentUserId };
    const trackOther: Track = { queueId: '6', youtubeId: 'f', title: 'T6', channel: 'C', durationSeconds: 120, addedBy: 'Outro Ouvinte', addedByUserId: 'outro' };

    service.setQueue([track1, track2, trackOther]);
    expect(service.myTrackCount()).toBe(2);
    expect(service.canAddTrack()).toBe(true);

    service.setQueue([track1, track2, track3, track4, trackOther]);
    expect(service.myTrackCount()).toBe(4);
    expect(service.canAddTrack()).toBe(true);

    service.setQueue([track1, track2, track3, track4, track5, trackOther]);
    expect(service.myTrackCount()).toBe(5);
    expect(service.canAddTrack()).toBe(false);
  });

  it('não deve permitir voto duplicado do mesmo usuário', () => {
    const currentUserId = authService.currentUser()!.id;
    service.setListenersCount(4); // 4 ouvintes, 50% = 3 votos para pular

    expect(service.hasVotedToSkip()).toBe(false);
    expect(service.skipVotes().current).toBe(0);

    const firstVoteSuccess = service.voteToSkip();
    expect(firstVoteSuccess).toBe(true);
    expect(service.hasVotedToSkip()).toBe(true);
    expect(service.skipVotes().current).toBe(1);

    // Segundo voto do mesmo usuário deve ser rejeitado
    const secondVoteSuccess = service.voteToSkip();
    expect(secondVoteSuccess).toBe(false);
    expect(service.skipVotes().current).toBe(1);
  });

  it('deve zerar o volume quando mutado e restaurar o volume anterior quando desmutado', () => {
    expect(service.isMuted()).toBe(false);
    expect(service.volume()).toBe(80);

    // Muta: volume deve ir para 0
    service.toggleMute();
    expect(service.isMuted()).toBe(true);
    expect(service.volume()).toBe(0);

    // Desmuta: restaura volume anterior (80)
    service.toggleMute();
    expect(service.isMuted()).toBe(false);
    expect(service.volume()).toBe(80);
  });

  it('ao alterar o volume para valor > 0, deve desmutar automaticamente', () => {
    service.toggleMute();
    expect(service.isMuted()).toBe(true);
    expect(service.volume()).toBe(0);

    service.setVolume(65);
    expect(service.isMuted()).toBe(false);
    expect(service.volume()).toBe(65);
  });

  it('ao alterar o volume para 0, deve marcar como mutado', () => {
    service.setVolume(0);
    expect(service.isMuted()).toBe(true);
    expect(service.volume()).toBe(0);

    // Se desmutar com volume 0, restaura para valor audível padrão
    service.toggleMute();
    expect(service.isMuted()).toBe(false);
    expect(service.volume()).toBeGreaterThan(0);
  });

  it('deve armazenar e atualizar a lista de histórico de reprodução', () => {
    expect(service.playbackHistory().length).toBe(0);
    service.setPlaybackHistory([
      {
        id: 'h1',
        room_id: 'pop-hits',
        youtube_id: 'y1',
        title: 'Song 1',
        channel: 'Artist 1',
        duration_seconds: 200,
        cover_url: '',
        was_skipped: false,
        played_at: '2026-10-07T23:00:00Z'
      }
    ]);
    expect(service.playbackHistory().length).toBe(1);
    expect(service.playbackHistory()[0].title).toBe('Song 1');
    expect(service.playbackHistory()[0].was_skipped).toBe(false);
  });
});
