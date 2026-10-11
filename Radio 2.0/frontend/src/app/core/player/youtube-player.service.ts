import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { RadioStateService } from '../radio/radio-state.service';
import { PlayerSyncService } from './player-sync.service';
import { RealWebSocketService } from '../websocket/real-websocket.service';
import { YTPlayerState, YTPlayerInstance } from './youtube.types';
import { NowPlayingTrack } from '../radio/radio.models';

@Injectable({
  providedIn: 'root'
})
export class YouTubePlayerService implements OnDestroy {
  private readonly radioState = inject(RadioStateService);
  private readonly playerSync = inject(PlayerSyncService);
  private readonly realWs = inject(RealWebSocketService);

  private player: YTPlayerInstance | null = null;
  private currentPlayingVideoId: string | null = null;
  private tickerInterval: any = null;
  private heartbeatCounter = 0;

  // Signals Reativos
  readonly isApiLoaded = signal<boolean>(false);
  readonly isPlayerReady = signal<boolean>(false);
  readonly isPlaying = signal<boolean>(false);
  readonly isSoundBlocked = signal<boolean>(false);
  readonly hasPlaybackError = signal<boolean>(false);

  destroyPlayer(): void {
    this.stopTicker();
    if (this.player) {
      try {
        this.player.destroy();
      } catch (_) {}
      this.player = null;
    }
    this.currentPlayingVideoId = null;
    this.isPlayerReady.set(false);
    this.isPlaying.set(false);
    this.hasPlaybackError.set(false);
    this.isSoundBlocked.set(false);
  }

  init(containerId: string): Promise<void> {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      this.destroyPlayer();

      const setupPlayerInstance = () => {
        if (!window.YT || !window.YT.Player) {
          resolve();
          return;
        }

        // Aguarda até o elemento estar fisicamente presente no DOM (tolerância de até 3s)
        const waitForContainer = (attemptsLeft: number) => {
          const el = document.getElementById(containerId);
          if (!el) {
            if (attemptsLeft > 0) {
              setTimeout(() => waitForContainer(attemptsLeft - 1), 40);
              return;
            }
            console.warn(`[YT-PLAYER] Elemento #${containerId} não encontrado no DOM após aguardar.`);
            resolve();
            return;
          }

          // Limpa nós residuais caso o container tenha sobras de iframe anterior
          try {
            el.innerHTML = '';
          } catch (_) {}

          try {
            const yt = window.YT;
            if (!yt || !yt.Player) {
              console.warn('[YT-PLAYER] window.YT ou window.YT.Player não está disponível no momento da montagem.');
              resolve();
              return;
            }

            this.player = new yt.Player(containerId, {
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                enablejsapi: 1,
                fs: 0,
                iv_load_policy: 3,
                loop: 0,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
                origin: typeof window !== 'undefined' ? window.location.origin : undefined
              },
              events: {
                onReady: (event) => {
                  const targetInstance = (event && event.target) || this.player;
                  if (targetInstance) {
                    this.player = targetInstance;
                  }
                  this.isPlayerReady.set(true);

                  const currentVol = this.radioState.volume();
                  this.setVolume(currentVol);

                  // Execução segura anti-crash: protege chamadas caso a API ainda não tenha exposto unMute/mute
                  try {
                    if (this.radioState.isMuted() || currentVol === 0) {
                      if (typeof this.player?.mute === 'function') {
                        this.player.mute();
                      }
                    } else {
                      if (typeof this.player?.unMute === 'function') {
                        this.player.unMute();
                      }
                    }
                  } catch (e) {
                    console.warn('[YT-PLAYER] Aviso ao aplicar mute/unMute no onReady:', e);
                  }

                  // Reseta ID em cache para forçar a carga real do vídeo no novo iframe
                  this.currentPlayingVideoId = null;

                  // Sincroniza faixa inicial se já existir no estado
                  const current = this.radioState.nowPlaying();
                  if (current) {
                    this.syncTrack(current);
                  }

                  try {
                    if (typeof this.player?.playVideo === 'function') {
                      this.player.playVideo();
                    }
                  } catch (_) {}

                  this.startTicker();
                  resolve();
                },
                onStateChange: (event) => {
                  this.handleStateChange(event);
                },
                onError: (error: any) => {
                  const code = typeof error === 'number' ? error : (error?.data || 150);
                  this.handlePlayerError(code);
                }
              }
            });
          } catch (err) {
            console.error('[YT-PLAYER] Erro ao instanciar YT.Player:', err);
            resolve();
          }
        };

        waitForContainer(75);
      };

      if (window.YT && window.YT.Player) {
        this.isApiLoaded.set(true);
        setupPlayerInstance();
        return;
      }

      // Injeta a tag do script do YouTube de forma assincrona
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        this.isApiLoaded.set(true);
        setupPlayerInstance();
      };

      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }
    });
  }

  syncTrack(track: NowPlayingTrack | null): void {
    if (!track || !this.player || !this.isPlayerReady()) {
      return;
    }

    const startMilli = track.startedAtUnixMilli || 
      (track.startedAt ? (track.startedAt < 10000000000 ? track.startedAt * 1000 : track.startedAt) : Date.now());
    const serverElapsed = Math.max(0, Math.floor((Date.now() - startMilli) / 1000));

    // Se o tempo decorrido no servidor já alcançou os 2 segundos finais da música,
    // não carrega o vídeo no limiar do fim para evitar erro 2 do YouTube IFrame.
    // O backend emitirá track_changed quando a próxima música iniciar naturalmente.
    if (track.durationSeconds > 0 && serverElapsed >= (track.durationSeconds - 2)) {
      return;
    }

    const targetOffset = Math.max(0, Math.min(track.durationSeconds > 3 ? track.durationSeconds - 3 : track.durationSeconds, serverElapsed));

    // Se é uma nova faixa ou o vídeo mudou
    if (this.currentPlayingVideoId !== track.youtubeId) {
      this.currentPlayingVideoId = track.youtubeId;
      this.hasPlaybackError.set(false); // Reseta o estado de erro para a nova faixa
      this.playerSync.recordSeek(); // Inicia carência pós-seek para a nova faixa carregar
      try {
        if (typeof this.player.loadVideoById === 'function') {
          this.player.loadVideoById({
            videoId: track.youtubeId,
            startSeconds: targetOffset
          });
        }
        if (typeof this.player.playVideo === 'function') {
          this.player.playVideo();
        }
      } catch (e) {
        console.warn('[YT-PLAYER] Falha ao carregar novo video:', e);
      }
      return;
    }

    // Se é o mesmo vídeo, checa o desvio (drift) no modo imediato apenas se estiver tocando
    if (this.isPlaying() && !this.playerSync.isBuffering()) {
      try {
        const localCurrentTime = this.player.getCurrentTime() || 0;
        if (this.playerSync.shouldResync(localCurrentTime, true)) {
          this.player.seekTo(targetOffset, true);
          this.player.playVideo();
          this.playerSync.recordSeek();
        }
      } catch (e) {
        console.warn('[YT-PLAYER] Falha ao ajustar seekTo:', e);
      }
    }
  }

  handlePlayerError(errorCode: number): void {
    console.warn('[YT-PLAYER] Erro de reprodução local detectado no YouTube (código):', errorCode);
    this.hasPlaybackError.set(true);

    // Erros críticos que impedem tocar (150: embedding bloqueado pelo proprietário, 101, 100, 2)
    // Devem ser reportados ao backend para acionar auto-skip imediato e quarentena permanente da faixa
    if (errorCode === 150 || errorCode === 101 || errorCode === 100 || errorCode === 2) {
      const vidId = this.currentPlayingVideoId;
      if (vidId) {
        console.warn(`[YT-PLAYER] Reportando erro crítico ${errorCode} da faixa ${vidId} ao backend para auto-skip de emergência.`);
        this.realWs.send('track_playback_error', {
          youtube_id: vidId,
          error_code: errorCode
        });
      }
    }
  }

  handleStateChange(event: { data: YTPlayerState; target: YTPlayerInstance }): void {
    if (event.data === YTPlayerState.PLAYING) {
      this.isPlaying.set(true);
      this.isSoundBlocked.set(false);
      this.hasPlaybackError.set(false);
      this.playerSync.setBuffering(false);

      try {
        const realDuration = Math.round(event.target.getDuration ? event.target.getDuration() : 0);
        const current = this.radioState.nowPlaying();
        if (realDuration > 0 && current && current.youtubeId) {
          if (Math.abs(realDuration - current.durationSeconds) > 2) {
            console.log(`[YT-PLAYER] Sincronizando duração real: ${realDuration}s (antes: ${current.durationSeconds}s)`);
            this.realWs.send('track_duration_sync', {
              youtube_id: current.youtubeId,
              duration_seconds: realDuration
            });
            this.radioState.nowPlaying.update(curr => curr ? { ...curr, durationSeconds: realDuration } : null);
          }
        }
      } catch (e) {
        console.warn('[YT-PLAYER] Falha ao verificar duração real do vídeo:', e);
      }
    } else if (event.data === YTPlayerState.PAUSED) {
      // REGRA INEGOCIAVEL DE RADIO:
      // Não é permitido pausar a rádio! Força a retomada ao vivo imediata sem seek redundante.
      try {
        event.target.playVideo();
      } catch (e) {
        console.warn('[YT-PLAYER] Bloqueio de reproducao detectado:', e);
        this.isSoundBlocked.set(true);
      }
    } else if (event.data === YTPlayerState.BUFFERING) {
      this.isPlaying.set(false);
      this.playerSync.setBuffering(true);
    } else if (event.data === YTPlayerState.ENDED) {
      this.isPlaying.set(false);
      this.playerSync.setBuffering(false);
      console.log('[YT-PLAYER] Faixa finalizada no player local. Aguardando transição soberana do backend.');
    }
  }

  unlockAudio(): void {
    if (!this.player) return;
    try {
      const vol = this.radioState.volume() > 0 ? this.radioState.volume() : 50;
      this.radioState.setVolume(vol);
      if (typeof this.player.setVolume === 'function') {
        this.player.setVolume(vol);
      }
      if (typeof this.player.unMute === 'function') {
        this.player.unMute();
      }
      if (typeof this.player.playVideo === 'function') {
        this.player.playVideo();
      }
      this.isSoundBlocked.set(false);
      this.radioState.isMuted.set(false);
    } catch (e) {
      console.warn('[YT-PLAYER] Falha ao desbloquear audio:', e);
    }
  }

  setVolume(volume: number): void {
    if (!this.player) return;
    try {
      const clamped = Math.max(0, Math.min(100, volume));
      if (typeof this.player.setVolume === 'function') {
        this.player.setVolume(clamped);
      }
      if (clamped === 0) {
        if (typeof this.player.mute === 'function') {
          this.player.mute();
        }
      } else {
        if (typeof this.player.unMute === 'function') {
          this.player.unMute();
        }
      }
    } catch (e) {
      console.warn('[YT-PLAYER] Falha ao definir volume:', e);
    }
  }

  setMuted(muted: boolean): void {
    if (!this.player) return;
    try {
      if (muted) {
        if (typeof this.player.mute === 'function') {
          this.player.mute();
        }
        if (typeof this.player.setVolume === 'function') {
          this.player.setVolume(0);
        }
      } else {
        const vol = this.radioState.volume();
        if (vol === 0) {
          if (typeof this.player.mute === 'function') {
            this.player.mute();
          }
          if (typeof this.player.setVolume === 'function') {
            this.player.setVolume(0);
          }
        } else {
          if (typeof this.player.setVolume === 'function') {
            this.player.setVolume(vol);
          }
          if (typeof this.player.unMute === 'function') {
            this.player.unMute();
          }
        }
      }
    } catch (e) {
      console.warn('[YT-PLAYER] Falha ao alternar mute:', e);
    }
  }

  startTicker(): void {
    if (this.tickerInterval) return;

    this.tickerInterval = setInterval(() => {
      const track = this.radioState.nowPlaying();
      if (!track) return;

      const startMilli = track.startedAtUnixMilli || 
        (track.startedAt ? (track.startedAt < 10000000000 ? track.startedAt * 1000 : track.startedAt) : Date.now());
      const serverElapsed = Math.max(0, Math.floor((Date.now() - startMilli) / 1000));
      const boundedElapsed = Math.min(track.durationSeconds, serverElapsed);

      // Atualiza apenas o signal visual sem redefinir o objeto nowPlaying
      this.radioState.setPlaybackSeconds(boundedElapsed);

      let localTime = 0;
      let drift = 0;

      // Checa drift com o player do YouTube usando o PlayerSyncService com proteção anti-looping
      if (this.player && this.isPlayerReady() && this.isPlaying() && !this.playerSync.isBuffering()) {
        try {
          localTime = this.player.getCurrentTime() || 0;
          drift = Math.abs(boundedElapsed - localTime);
          if (localTime > 0 && this.playerSync.shouldResync(localTime, false)) {
            console.log(`[YT-PLAYER] Sincronizando drift persistente: local=${localTime}s vs server=${boundedElapsed}s`);
            this.player.seekTo(boundedElapsed, true);
            this.playerSync.recordSeek();
          }
        } catch (_) {}
      }

      // Telemetria do ouvinte a cada 10 segundos para o backend
      this.heartbeatCounter++;
      if (this.heartbeatCounter >= 10) {
        this.heartbeatCounter = 0;
        this.sendPlaybackHeartbeat(localTime || boundedElapsed, drift);
      }
    }, 1000);
  }

  private sendPlaybackHeartbeat(currentTimeSeconds: number, driftSeconds: number): void {
    try {
      this.realWs.send('playback_heartbeat', {
        currentTimeSeconds: Math.round(currentTimeSeconds * 10) / 10,
        driftSeconds: Math.round(driftSeconds * 10) / 10,
        isMuted: this.radioState.isMuted(),
        isPlaying: this.isPlaying()
      });
    } catch (_) {}
  }

  stopTicker(): void {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyPlayer();
  }
}
