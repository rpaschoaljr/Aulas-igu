import { TestBed } from '@angular/core/testing';
import { PlayerSyncService } from './player-sync.service';
import { RadioStateService } from '../radio/radio-state.service';
import { NowPlayingTrack } from '../radio/radio.models';

describe('PlayerSyncService (TDD - Anti-Drift e Sincronia Contínua Anti-Looping)', () => {
  let service: PlayerSyncService;
  let radioState: RadioStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    radioState = TestBed.inject(RadioStateService);
    service = TestBed.inject(PlayerSyncService);
  });

  it('deve calcular o desvio (drift) entre o relógio local e o servidor usando milissegundos', () => {
    const nowMilli = Date.now();
    const mockTrack: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'abc',
      title: 'Musica Teste',
      channel: 'Canal',
      durationSeconds: 200,
      startedAtUnixMilli: nowMilli - 30000, // Começou há 30 segundos
      currentOffsetSeconds: 30,
      addedBy: 'DJ'
    };

    radioState.setNowPlaying(mockTrack);

    // Se o player local está em 25s e o servidor está em 30s, o desvio é de 5s
    const drift = service.calculateDrift(25);
    expect(drift).toBe(5);

    // Deve indicar que necessita de resync forçado no modo imediato (drift > 3.5s)
    expect(service.shouldResync(25, true)).toBe(true);

    // Se o player está em 29s, desvio é de 1s -> dentro da margem aceitável (< 3.5s)
    expect(service.shouldResync(29, true)).toBe(false);
  });

  it('deve bloquear resync durante o período de cooldown pós-seek para evitar looping infinito', () => {
    const nowMilli = Date.now();
    const mockTrack: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'abc',
      title: 'Musica Teste',
      channel: 'Canal',
      durationSeconds: 200,
      startedAtUnixMilli: nowMilli - 30000,
      currentOffsetSeconds: 30,
      addedBy: 'DJ'
    };
    radioState.setNowPlaying(mockTrack);

    // Registra que um seek acabou de acontecer
    service.recordSeek();
    expect(service.isInCooldown()).toBe(true);

    // Mesmo com desvio de 10s, o modo periódico DEVE bloquear o seek para permitir bufferização
    expect(service.shouldResync(20, false)).toBe(false);
  });

  it('deve bloquear resync enquanto o player do YouTube estiver em estado de buffering', () => {
    const nowMilli = Date.now();
    const mockTrack: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'abc',
      title: 'Musica Teste',
      channel: 'Canal',
      durationSeconds: 200,
      startedAtUnixMilli: nowMilli - 30000,
      currentOffsetSeconds: 30,
      addedBy: 'DJ'
    };
    radioState.setNowPlaying(mockTrack);

    service.setBuffering(true);
    expect(service.isBuffering()).toBe(true);

    // Em buffering, o seek deve ser estritamente bloqueado
    expect(service.shouldResync(20, false)).toBe(false);
  });

  it('deve exigir 3 confirmações consecutivas no modo periódico para evitar falso-positivo instantâneo', () => {
    const nowMilli = Date.now();
    const mockTrack: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'abc',
      title: 'Musica Teste',
      channel: 'Canal',
      durationSeconds: 200,
      startedAtUnixMilli: nowMilli - 30000,
      currentOffsetSeconds: 30,
      addedBy: 'DJ'
    };
    radioState.setNowPlaying(mockTrack);

    // 1º tick com drift: não deve resyncar ainda
    expect(service.shouldResync(20, false)).toBe(false);

    // 2º tick com drift: não deve resyncar ainda
    expect(service.shouldResync(20, false)).toBe(false);

    // 3º tick consecutivo com drift persistente: autoriza resync
    expect(service.shouldResync(20, false)).toBe(true);
  });

  it('não deve permitir pausar a rádio, mantendo o status sempre em reprodução contínua', () => {
    expect(service.canPause()).toBe(false);
  });
});
