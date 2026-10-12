import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './features/header/header.component';
import { ActiveStationComponent } from './features/active-station/active-station.component';
import { VinylDiscPlayerComponent } from './features/vinyl-disc-player/vinyl-disc-player.component';
import { PlaybackHistoryComponent } from './features/playback-history/playback-history.component';
import { QueueComponent } from './features/queue/queue.component';
import { MobileNavComponent, MobileTab } from './features/mobile-nav/mobile-nav.component';
import { SearchModalComponent } from './features/search-modal/search-modal.component';
import { LoginModalComponent } from './features/login-modal/login-modal.component';
import { RadioApiService } from './core/api/radio-api.service';
import { RealWebSocketService } from './core/websocket/real-websocket.service';
import { RadioStateService } from './core/radio/radio-state.service';
import { AuthService } from './core/auth/auth.service';
import { User } from './core/auth/user.model';
import { RadioRoom, Track, NowPlayingTrack } from './core/radio/radio.models';
import { YouTubePlayerService } from './core/player/youtube-player.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ActiveStationComponent,
    VinylDiscPlayerComponent,
    PlaybackHistoryComponent,
    QueueComponent,
    MobileNavComponent,
    SearchModalComponent,
    LoginModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly radioApi = inject(RadioApiService);
  private readonly realWs = inject(RealWebSocketService);
  private readonly radioState = inject(RadioStateService);
  readonly authService = inject(AuthService);
  private readonly youtubePlayer = inject(YouTubePlayerService);

  readonly isSearchModalOpen = signal(false);
  readonly isLoginModalOpen = signal(false);
  readonly currentMobileTab = signal<MobileTab>('salas');

  private readonly defaultRoomSlug = 'radio-six-nine';
  private readonly defaultRoomName = 'Radio Six-Nine';

  private lastSyncedTrackId: string | null = null;
  private queueDebounceTimer: any = null;
  private historyDebounceTimer: any = null;
  private isQueueInFlight = false;
  private isQuotaInFlight = false;
  private isHistoryInFlight = false;

  constructor() {
    // Sintonização da Sala Única Oficial da Rádio 2.0 (apenas se autenticado)
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      const user = this.authService.currentUser();
      const slug = this.defaultRoomSlug;

      if (!isAuth || !user) {
        this.realWs.disconnect();
        this.youtubePlayer.destroyPlayer();
        this.lastSyncedTrackId = null;
        return;
      }

      this.realWs.connect(slug, user.token || '');
      this.loadRoomData(slug);
      this.initPlayerAndSession();
    });

    // Quando a faixa atual mudar, sincroniza com o YouTube Player, e atualiza fila, histórico e cota
    effect(() => {
      if (!this.authService.isAuthenticated()) return;
      const track = this.radioState.nowPlaying();
      if (track) {
        this.youtubePlayer.syncTrack(track);
        // Só dispara carga se a música realmente mudou para evitar tempestade de requisições
        if (track.youtubeId !== this.lastSyncedTrackId) {
          this.lastSyncedTrackId = track.youtubeId;
          this.loadQueue(this.defaultRoomSlug);
          this.loadHistory(this.defaultRoomSlug);
          this.loadUserQuota(this.defaultRoomSlug);
        }
      }
    });
  }

  ngOnInit(): void {
    this.initRoomsCatalog();

    if (this.authService.isAuthenticated()) {
      this.initPlayerAndSession();
    }

    // Coalesce eventos rápidos de fila com debounce de 150ms
    this.realWs.queueUpdated$.subscribe(() => {
      if (this.queueDebounceTimer) {
        clearTimeout(this.queueDebounceTimer);
      }
      this.queueDebounceTimer = setTimeout(() => {
        if (this.authService.isAuthenticated()) {
          this.loadUserQuota(this.defaultRoomSlug);
        }
        this.loadQueue(this.defaultRoomSlug);
      }, 150);
    });

    // Coalesce eventos rápidos de histórico com debounce de 150ms
    this.realWs.historyUpdated$.subscribe(() => {
      if (this.historyDebounceTimer) {
        clearTimeout(this.historyDebounceTimer);
      }
      this.historyDebounceTimer = setTimeout(() => {
        this.loadHistory(this.defaultRoomSlug);
      }, 150);
    });
  }

  initPlayerAndSession(): void {
    this.youtubePlayer.init('youtube-player-host');
    this.loadUserQuota(this.defaultRoomSlug);
  }

  onAuthSuccess(user: User): void {
    console.log('[APP] Usuário autenticado com sucesso:', user.nickname);
    this.initPlayerAndSession();
  }

  private initRoomsCatalog(): void {
    // Configura a sala oficial única
    this.radioState.activeRoom.set(this.defaultRoomName);

    // Carrega dados das salas do backend para manter coerência dos metadados
    this.radioApi.getRooms().subscribe({
      next: (apiRooms) => {
        if (apiRooms && apiRooms.length > 0) {
          const mappedRooms: RadioRoom[] = apiRooms.map(r => ({
            id: r.slug,
            name: r.name,
            listenersCount: 1,
            isLive: r.is_live,
            coverUrl: r.cover_url
          }));
          this.radioState.rooms.set(mappedRooms);
        }
      },
      error: (err) => {
        console.warn('[RADIO] Falha ao carregar salas da API, mantendo padrões:', err);
      }
    });
  }

  private loadRoomData(slug: string): void {
    // 2. Carrega status da rádio (Now Playing e contadores)
    this.radioApi.getRoomStatus(slug).subscribe({
      next: (status) => {
        if (status && status.state && status.state.current_track) {
          const t = status.state.current_track;
          const nowPlaying: NowPlayingTrack = {
            queueId: t.youtube_id,
            youtubeId: t.youtube_id,
            title: t.title,
            channel: t.channel_title || 'Artista',
            coverUrl: t.thumbnail_url || '/assets/mock/queen.jpg',
            durationSeconds: t.duration_seconds || status.state.duration_seconds,
            startedAtUnixMilli: status.state.started_at_unix_milli || Date.now(),
            startedAt: status.state.started_at_unix_milli || Date.now(),
            currentOffsetSeconds: status.state.elapsed_seconds || 0,
            addedBy: 'DJ Bot'
          };
          this.radioState.setNowPlaying(nowPlaying);
          this.radioState.setListenersCount(status.listeners || 1);
        }
      },
      error: (err) => {
        console.warn('[RADIO] Erro ao carregar status da sala:', err);
      }
    });

    // 3. Carrega fila pendente da sala
    this.loadQueue(slug);

    // 3b. Carrega cota oficial do usuário
    this.loadUserQuota(slug);

    // 4. Carrega histórico de mensagens do Chat ativo da sala
    this.radioApi.getChatMessages(slug).subscribe({
      next: (apiMessages) => {
        if (apiMessages) {
          const chatMsgs = apiMessages.map(m => ({
            id: m.id,
            userId: m.user_id,
            userNickname: m.user_nickname,
            userAvatar: m.user_avatar,
            text: m.message_text,
            timestamp: new Date(m.created_at).getTime()
          }));
          this.realWs.setChatMessages(chatMsgs);
        }
      },
      error: (err) => {
        console.warn('[RADIO] Erro ao carregar chat da sala:', err);
      }
    });

    // 5. Carrega histórico de músicas tocadas e puladas da sala
    this.loadHistory(slug);
  }

  loadQueue(slug: string): void {
    if (this.isQueueInFlight) return;
    this.isQueueInFlight = true;
    this.radioApi.getQueue(slug).subscribe({
      next: (queueItems) => {
        this.isQueueInFlight = false;
        if (queueItems) {
          const tracks: Track[] = queueItems.map(item => ({
            queueId: item.id || item.track.youtube_id,
            youtubeId: item.track.youtube_id,
            title: item.track.title,
            channel: item.track.channel_title || 'Artista',
            coverUrl: item.track.thumbnail_url || '/assets/mock/queen.jpg',
            durationSeconds: item.track.duration_seconds || 180,
            addedBy: item.requested_by?.nickname || 'DJ Six-Nine',
            addedByUserId: item.requested_by?.id,
            requestedAt: new Date(item.created_at)
          }));
          this.radioState.setQueue(tracks);
        }
      },
      error: (err) => {
        this.isQueueInFlight = false;
        console.warn('[RADIO] Erro ao carregar fila:', err);
      }
    });
  }

  loadUserQuota(slug: string): void {
    if (this.isQuotaInFlight) return;
    this.isQuotaInFlight = true;
    const token = this.authService.currentUser()?.token;
    this.radioApi.getUserQuota(slug, token).subscribe({
      next: (quota) => {
        this.isQuotaInFlight = false;
        if (quota) {
          this.radioState.setUserQuota(quota);
        }
      },
      error: (err) => {
        this.isQuotaInFlight = false;
        console.warn('[RADIO] Erro ao carregar cota do usuário:', err);
      }
    });
  }

  private loadHistory(slug: string): void {
    if (this.isHistoryInFlight) return;
    this.isHistoryInFlight = true;
    this.radioApi.getHistory(slug, 20).subscribe({
      next: (historyItems) => {
        this.isHistoryInFlight = false;
        if (historyItems) {
          this.radioState.setPlaybackHistory(historyItems);
        }
      },
      error: (err) => {
        this.isHistoryInFlight = false;
        console.warn('[RADIO] Erro ao carregar histórico de reprodução:', err);
      }
    });
  }

  readonly swapTargetTrack = signal<Track | null>(null);

  openSearchModal(): void {
    console.log('[APP] Abrindo modal de busca de pedidos...');
    this.swapTargetTrack.set(null);
    this.isSearchModalOpen.set(true);
  }

  closeSearchModal(): void {
    console.log('[APP] Fechando modal de busca...');
    this.isSearchModalOpen.set(false);
    this.swapTargetTrack.set(null);
    // Se estava na aba mobile 'buscar', restaura para 'salas' (ao vivo) para não deixar a tela vazia
    if (this.currentMobileTab() === 'buscar') {
      console.log('[APP MOBILE] Restaurando aba ativa para "salas" após fechar modal de busca');
      this.currentMobileTab.set('salas');
    }
  }

  onRemoveTrack(track: Track): void {
    console.log('[APP] Solicitando remoção da música:', track.title, track.queueId);
    const token = this.authService.currentUser()?.token;
    this.radioApi.removeFromQueue(this.defaultRoomSlug, track.queueId, token).subscribe({
      next: (res) => {
        console.log('[APP] Música removida com sucesso da fila:', res);
        this.loadQueue(this.defaultRoomSlug);
        this.loadUserQuota(this.defaultRoomSlug);
      },
      error: (err) => {
        console.error('[APP ERROR] Falha ao remover música:', err);
      }
    });
  }

  onSwapTrack(track: Track): void {
    console.log('[APP] Solicitando troca da música:', track.title, track.queueId);
    this.swapTargetTrack.set(track);
    this.isSearchModalOpen.set(true);
  }

  onTrackSwapped(updatedTrack: Track): void {
    console.log('[APP] Música substituída com sucesso:', updatedTrack);
    this.swapTargetTrack.set(null);
    this.loadQueue(this.defaultRoomSlug);
    this.loadUserQuota(this.defaultRoomSlug);
  }

  openLoginModal(): void {
    console.log('[APP] Abrindo modal de login...');
    this.isLoginModalOpen.set(true);
  }

  closeLoginModal(): void {
    console.log('[APP] Fechando modal de login...');
    this.isLoginModalOpen.set(false);
    // Recarrega cota após login
    this.loadUserQuota(this.defaultRoomSlug);
  }

  onMobileTabChange(tab: MobileTab): void {
    this.currentMobileTab.set(tab);
    if (tab === 'buscar') {
      this.openSearchModal();
    }
  }
}
