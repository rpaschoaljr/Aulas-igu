import { TestBed } from '@angular/core/testing';
import { YouTubePlayerService } from './youtube-player.service';
import { RadioStateService } from '../radio/radio-state.service';
import { PlayerSyncService } from './player-sync.service';
import { RealWebSocketService } from '../websocket/real-websocket.service';
import { YTPlayerState } from './youtube.types';
import { NowPlayingTrack } from '../radio/radio.models';

describe('YouTubePlayerService (TDD - Rádio Contínua & Sincronização Anti-Drift)', () => {
  let service: YouTubePlayerService;
  let radioState: RadioStateService;
  let mockPlayer: any;
  let mockRealWs: any;

  beforeEach(() => {
    mockPlayer = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      stopVideo: vi.fn(),
      seekTo: vi.fn(),
      mute: vi.fn(),
      unMute: vi.fn(),
      isMuted: vi.fn().mockReturnValue(false),
      setVolume: vi.fn(),
      getVolume: vi.fn().mockReturnValue(80),
      getPlayerState: vi.fn().mockReturnValue(YTPlayerState.PLAYING),
      getCurrentTime: vi.fn().mockReturnValue(30),
      getDuration: vi.fn().mockReturnValue(200),
      loadVideoById: vi.fn(),
      destroy: vi.fn()
    };

    mockRealWs = {
      send: vi.fn(),
      sendTrackEnded: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        YouTubePlayerService,
        RadioStateService,
        PlayerSyncService,
        { provide: RealWebSocketService, useValue: mockRealWs }
      ]
    });

    radioState = TestBed.inject(RadioStateService);
    service = TestBed.inject(YouTubePlayerService);

    // Mockando player ativo no serviço
    (service as any).player = mockPlayer;
    service.isPlayerReady.set(true);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('deve sincronizar e carregar a faixa do YouTube com o offset correto em milissegundos', () => {
    const nowMilli = Date.now();
    const track: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'abc123xyz',
      title: 'Música Teste',
      channel: 'Artista Teste',
      durationSeconds: 180,
      startedAtUnixMilli: nowMilli - 20000, // Começou há 20s
      currentOffsetSeconds: 20,
      addedBy: 'DJ'
    };

    service.syncTrack(track);

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith({
      videoId: 'abc123xyz',
      startSeconds: 20
    });
    expect(mockPlayer.playVideo).toHaveBeenCalled();
  });

  it('não deve recarregar o vídeo se o mesmo youtubeId já estiver tocando, mas deve ajustar o seek se houver drift', () => {
    const nowMilli = Date.now();
    const track: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'abc123xyz',
      title: 'Música Teste',
      channel: 'Artista Teste',
      durationSeconds: 180,
      startedAtUnixMilli: nowMilli - 40000,
      currentOffsetSeconds: 40,
      addedBy: 'DJ'
    };

    // Primeira sincronização
    service.syncTrack(track);
    expect(mockPlayer.loadVideoById).toHaveBeenCalledTimes(1);

    // Marca como tocando para permitir ajuste de drift
    service.isPlaying.set(true);

    // Segunda sincronização com mesmo ID mas relógio local em 30s (drift de 10s > 3.5s)
    mockPlayer.getCurrentTime.mockReturnValue(30);
    service.syncTrack(track);

    // Não deve chamar loadVideoById novamente, mas deve chamar seekTo
    expect(mockPlayer.loadVideoById).toHaveBeenCalledTimes(1);
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(40, true);
  });

  it('REGRA DE OURO DA RÁDIO: deve impedir pausa e forçar a retomada imediata ao vivo', () => {
    const nowMilli = Date.now();
    const track: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'abc123xyz',
      title: 'Música Teste',
      channel: 'Artista Teste',
      durationSeconds: 180,
      startedAtUnixMilli: nowMilli - 15000,
      currentOffsetSeconds: 15,
      addedBy: 'DJ'
    };
    radioState.setNowPlaying(track);

    // Simula evento do YouTube de que o usuário ou navegador pausou
    service.handleStateChange({
      data: YTPlayerState.PAUSED,
      target: mockPlayer
    });

    // Deve forçar playVideo imediatamente
    expect(mockPlayer.playVideo).toHaveBeenCalled();
  });

  it('deve sincronizar o volume e mute com o player do YouTube', () => {
    radioState.setVolume(80);

    service.setVolume(50);
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(50);
    expect(mockPlayer.unMute).toHaveBeenCalled();

    // Volume 0 deve mutar no YouTube Player
    service.setVolume(0);
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(0);
    expect(mockPlayer.mute).toHaveBeenCalled();

    // setMuted(true) deve forçar mute e volume 0
    service.setMuted(true);
    expect(mockPlayer.mute).toHaveBeenCalled();
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(0);

    // setMuted(false) com volume > 0 deve restaurar áudio
    radioState.setVolume(70);
    service.setMuted(false);
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(70);
    expect(mockPlayer.unMute).toHaveBeenCalled();

    // setMuted(false) com volume 0 não pode vazar áudio
    radioState.setVolume(0);
    service.setMuted(false);
    expect(mockPlayer.mute).toHaveBeenCalled();
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(0);
  });

  it('deve marcar hasPlaybackError localmente ao detectar erro do player sem derrubar a rádio coletiva', () => {
    const track: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'blocked_150',
      title: 'Música Bloqueada',
      channel: 'Artista',
      durationSeconds: 180,
      startedAtUnixMilli: Date.now(),
      currentOffsetSeconds: 0,
      addedBy: 'DJ'
    };
    radioState.setNowPlaying(track);

    // Simula erro 150 do YouTube
    service.handlePlayerError(150);

    expect(service.hasPlaybackError()).toBe(true);
    // Erros locais não devem emitir skip destrutivo coletivo para o backend
    expect(mockRealWs.send).not.toHaveBeenCalledWith('track_playback_error', expect.anything());
  });

  it('deve sincronizar a duração real ao iniciar reprodução se houver divergência com o cadastrado', () => {
    const track: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'bohemian_rhapsody',
      title: 'Queen - Bohemian Rhapsody',
      channel: 'Queen',
      durationSeconds: 210, // Cadastrado com padrão de 210s (3:30)
      startedAtUnixMilli: Date.now(),
      currentOffsetSeconds: 0,
      addedBy: 'DJ'
    };
    radioState.setNowPlaying(track);

    mockPlayer.getDuration.mockReturnValue(355);

    service.handleStateChange({
      data: YTPlayerState.PLAYING,
      target: mockPlayer
    });

    expect(mockRealWs.send).toHaveBeenCalledWith('track_duration_sync', {
      youtube_id: 'bohemian_rhapsody',
      duration_seconds: 355
    });
    expect(radioState.nowPlaying()?.durationSeconds).toBe(355);
  });

  it('quando o YouTube disparar evento ENDED localmente, deve pausar o estado local e aguardar o backend', () => {
    const track: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'ended_song_123',
      title: 'Música Que Terminou',
      channel: 'Artista',
      durationSeconds: 200,
      startedAtUnixMilli: Date.now() - 200000,
      currentOffsetSeconds: 200,
      addedBy: 'DJ'
    };
    radioState.setNowPlaying(track);

    service.handleStateChange({
      data: YTPlayerState.ENDED,
      target: mockPlayer
    });

    expect(service.isPlaying()).toBe(false);
  });

  it('deve destruir o player e resetar o estado em destroyPlayer', () => {
    (service as any).currentPlayingVideoId = 'xyz123';
    service.isPlaying.set(true);

    service.destroyPlayer();

    expect(mockPlayer.destroy).toHaveBeenCalled();
    expect((service as any).currentPlayingVideoId).toBeNull();
    expect(service.isPlayerReady()).toBe(false);
    expect(service.isPlaying()).toBe(false);
  });

  it('não deve chamar loadVideoById se o servidor indicar que faltam menos de 2s para a música acabar', () => {
    const nowMilli = Date.now();
    const track: NowPlayingTrack = {
      queueId: 'q1',
      youtubeId: 'almost_done',
      title: 'Quase Acabando',
      channel: 'Artista',
      durationSeconds: 100,
      startedAtUnixMilli: nowMilli - 99000, // 99s decorridos de 100s
      currentOffsetSeconds: 99,
      addedBy: 'DJ'
    };

    service.syncTrack(track);

    // Não deve carregar o vídeo colado no fim para não disparar erro 2 do YouTube
    expect(mockPlayer.loadVideoById).not.toHaveBeenCalled();
  });

  it('deve aguardar o elemento DOM e reinicializar o player no re-login sincronizando a faixa com áudio ativo', async () => {
    // 1. Simula elemento recém-montado pelo Angular no DOM
    const testDiv = document.createElement('div');
    testDiv.id = 'youtube-player-host-relogin';
    document.body.appendChild(testDiv);

    // 2. Mock do window.YT com construtor que invoca onReady imediatamente
    let capturedOnReady: any = null;
    const newMockPlayer = {
      ...mockPlayer,
      loadVideoById: vi.fn(),
      playVideo: vi.fn(),
      setVolume: vi.fn(),
      unMute: vi.fn(),
      mute: vi.fn()
    };

    (window as any).YT = {
      Player: vi.fn(function (this: any, containerId: string, options: any) {
        capturedOnReady = options.events?.onReady;
        if (capturedOnReady) {
          capturedOnReady({ target: newMockPlayer });
        }
        return newMockPlayer;
      })
    };

    radioState.setVolume(75);
    radioState.setNowPlaying({
      queueId: 'q-relogin',
      youtubeId: 'relogin-track-yt',
      title: 'Música do Re-login',
      channel: 'Artista',
      durationSeconds: 200,
      startedAtUnixMilli: Date.now() - 30000,
      currentOffsetSeconds: 30,
      addedBy: 'DJ'
    });

    // 3. Executa init e aguarda resolução do onReady
    await service.init('youtube-player-host-relogin');

    // 5. Verifica que o player está pronto, configurado com volume, áudio desmutado e faixa carregada
    expect(service.isPlayerReady()).toBe(true);
    expect(newMockPlayer.setVolume).toHaveBeenCalledWith(75);
    expect(newMockPlayer.unMute).toHaveBeenCalled();
    expect(newMockPlayer.loadVideoById).toHaveBeenCalledWith(expect.objectContaining({
      videoId: 'relogin-track-yt'
    }));

    // Limpa elemento de teste
    testDiv.remove();
  });
});

