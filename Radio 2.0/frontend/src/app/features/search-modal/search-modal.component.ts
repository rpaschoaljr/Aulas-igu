import { Component, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { YouTubeCacheService } from '../../core/cache/youtube-cache.service';
import { RadioApiService } from '../../core/api/radio-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorLoggerService } from '../../core/error/error-logger.service';
import { RealWebSocketService } from '../../core/websocket/real-websocket.service';
import { Track } from '../../core/radio/radio.models';

export interface SearchResult {
  youtubeId: string;
  title: string;
  channel: string;
  durationSeconds: number;
  coverUrl: string;
  requestCount?: number;
  isUserFavorite?: boolean;
}

export interface CartItem {
  track: SearchResult;
  isRestricted: boolean;
  restrictionReason?: 'RECENTLY_PLAYED' | 'ALREADY_IN_QUEUE' | 'NOW_PLAYING';
  restrictionLabel?: string;
}

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-modal.component.html',
  styleUrl: './search-modal.component.css'
})
export class SearchModalComponent implements OnInit {
  readonly radioState = inject(RadioStateService);
  readonly cacheService = inject(YouTubeCacheService);
  private readonly radioApi = inject(RadioApiService);
  private readonly authService = inject(AuthService);
  private readonly errorLogger = inject(ErrorLoggerService);
  private readonly realWs = inject(RealWebSocketService, { optional: true });

  readonly swapTarget = input<Track | null>(null);
  readonly trackSwapped = output<Track>();

  searchQuery = '';
  readonly close = output<void>();

  readonly isLoading = signal(false);
  readonly isSending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Controle de abas para telas menores (Mobile)
  readonly activeTab = signal<'search' | 'cart'>('search');

  // Carrinho de Pedidos (máximo 5 músicas)
  readonly cartItems = signal<CartItem[]>([]);

  readonly validCount = computed(() => {
    return this.cartItems().filter(i => !i.isRestricted).length;
  });

  readonly restrictedCount = computed(() => {
    return this.cartItems().filter(i => i.isRestricted).length;
  });

  readonly remainingUserQuota = computed(() => {
    return Math.max(0, 5 - this.radioState.myTrackCount());
  });

  readonly favoriteTracks = signal<SearchResult[]>([]);
  readonly isShowingFavorites = signal<boolean>(true);
  readonly hasPersonalFavorites = signal<boolean>(false);
  readonly results = signal<SearchResult[]>([]);

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    const token = this.authService.currentUser()?.token;
    this.radioApi.getUserFavorites('radio-six-nine', 6, token).subscribe({
      next: (favs) => {
        if (favs && favs.length > 0) {
          const formatted: SearchResult[] = favs.map(f => ({
            youtubeId: f.track.youtube_id,
            title: f.track.title,
            channel: f.track.channel_title || 'Artista',
            durationSeconds: f.track.duration_seconds || 180,
            coverUrl: f.track.thumbnail_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80',
            requestCount: f.request_count,
            isUserFavorite: f.is_user_favorite
          }));
          this.favoriteTracks.set(formatted);
          const hasUser = favs.some(f => f.is_user_favorite);
          this.hasPersonalFavorites.set(hasUser);
          if (!this.searchQuery.trim()) {
            this.results.set(formatted);
            this.isShowingFavorites.set(true);
          }
        }
      },
      error: (err) => {
        console.warn('[SEARCH MODAL] Falha ao carregar favoritas:', err);
      }
    });
  }

  onSearchInput(): void {
    if (!this.searchQuery.trim()) {
      this.isShowingFavorites.set(true);
      this.results.set(this.favoriteTracks());
    }
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  isTrackInCart(youtubeId: string): boolean {
    return this.cartItems().some(i => i.track.youtubeId === youtubeId);
  }

  /**
   * Avalia se uma música possui restrição de repetição recente ou fila:
   * 1. Tocando agora no ar
   * 2. Já na fila ativa
   * 3. Tocada nas últimas 5 músicas do histórico
   */
  checkRestriction(track: SearchResult): { isRestricted: boolean; label?: string; reason?: 'RECENTLY_PLAYED' | 'ALREADY_IN_QUEUE' | 'NOW_PLAYING' } {
    const normTitle = track.title.trim().toLowerCase();

    // 1. Tocando agora no ar
    const current = this.radioState.nowPlaying();
    if (current && (current.youtubeId === track.youtubeId || (current.title && current.title.trim().toLowerCase() === normTitle))) {
      return {
        isRestricted: true,
        reason: 'NOW_PLAYING',
        label: 'Tocando agora no ar'
      };
    }

    // 2. Fila ativa
    const queue = this.radioState.queueSlice();
    const inQueue = queue.some(q => q.youtubeId === track.youtubeId || (q.title && q.title.trim().toLowerCase() === normTitle));
    if (inQueue) {
      return {
        isRestricted: true,
        reason: 'ALREADY_IN_QUEUE',
        label: 'Já está na fila ativa'
      };
    }

    // 3. Trava de Música Tocada Recentemente (cooldown das últimas 5 faixas)
    const history = this.radioState.playbackHistory();
    const last5 = history.slice(0, 5);
    const recent = last5.some(h => h.youtube_id === track.youtubeId || (h.title && h.title.trim().toLowerCase() === normTitle));
    if (recent) {
      return {
        isRestricted: true,
        reason: 'RECENTLY_PLAYED',
        label: 'Tocou recentemente (aguarda 5 faixas)'
      };
    }

    return { isRestricted: false };
  }

  handleSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) {
      this.isShowingFavorites.set(true);
      this.results.set(this.favoriteTracks());
      return;
    }

    this.isShowingFavorites.set(false);
    this.errorMessage.set(null);

    // 1. Verifica cache local do navegador
    const cached = this.cacheService.get<SearchResult[]>(q);
    if (cached && cached.length > 0) {
      this.results.set(cached);
      return;
    }

    // 2. Busca no Backend
    this.isLoading.set(true);
    this.radioApi.searchYouTube(q).subscribe({
      next: (apiTracks) => {
        this.isLoading.set(false);
        if (apiTracks && apiTracks.length > 0) {
          const formatted: SearchResult[] = apiTracks.map(t => ({
            youtubeId: t.youtube_id,
            title: t.title,
            channel: t.channel_title,
            durationSeconds: t.duration_seconds || 180,
            coverUrl: t.thumbnail_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80'
          }));
          this.cacheService.set(q, formatted);
          this.results.set(formatted);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Adiciona a música ao carrinho (máximo 5 músicas).
   * Mantém o modal aberto e permite continuar adicionando.
   * Se a música violar a regra de histórico recente ou fila, ela É ADICIONADA,
   * porém com o aviso explícito de restrição de fila.
   */
  addToCart(track: SearchResult): void {
    console.log('[CART] Adicionando música ao carrinho:', { id: track.youtubeId, title: track.title, duration: track.durationSeconds });
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (track.durationSeconds > 600) {
      this.errorMessage.set('Músicas com mais de 10 minutos não são permitidas na rádio!');
      return;
    }
    if (track.durationSeconds < 30) {
      this.errorMessage.set('Músicas com menos de 30 segundos não são permitidas na rádio!');
      return;
    }

    if (this.remainingUserQuota() <= 0) {
      this.errorMessage.set('Você já atingiu o limite de 5 músicas ativas na fila da rádio!');
      return;
    }

    if (this.cartItems().length >= this.remainingUserQuota() || this.cartItems().length >= 5) {
      this.errorMessage.set(`Você pode adicionar no máximo ${this.remainingUserQuota()} música(s) neste pedido (limite de 5 no total).`);
      return;
    }

    if (this.isTrackInCart(track.youtubeId)) {
      this.errorMessage.set('Esta música já está no seu carrinho de pedidos!');
      return;
    }

    const restriction = this.checkRestriction(track);
    const newItem: CartItem = {
      track,
      isRestricted: restriction.isRestricted,
      restrictionReason: restriction.reason,
      restrictionLabel: restriction.label
    };

    this.cartItems.update(items => [...items, newItem]);
    console.log('[CART] Carrinho atualizado. Total de itens:', this.cartItems().length);
  }

  removeFromCart(youtubeId: string): void {
    console.log('[CART] Removendo música do carrinho:', youtubeId);
    this.cartItems.update(items => items.filter(i => i.track.youtubeId !== youtubeId));
  }

  clearCart(): void {
    console.log('[CART] Limpando todas as músicas do carrinho');
    this.cartItems.set([]);
  }

  handleClose(): void {
    console.log('[CART] handleClose acionado. Itens pendentes:', this.cartItems().length);
    try {
      this.close.emit();
    } catch (err) {
      console.error('[CART ERROR] Falha ao fechar modal de pedidos:', err);
      this.errorLogger.logError({
        error_type: 'CART_CLOSE_ERROR',
        message: 'Falha capturada ao fechar modal de pedidos',
        payload: { error: String(err) }
      }).subscribe();
    }
  }

  handleSwapTrack(track: SearchResult): void {
    const target = this.swapTarget();
    if (!target) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (track.durationSeconds > 600) {
      this.errorMessage.set('Músicas com mais de 10 minutos não são permitidas na rádio!');
      return;
    }
    if (track.durationSeconds < 30) {
      this.errorMessage.set('Músicas com menos de 30 segundos não são permitidas na rádio!');
      return;
    }

    const restriction = this.checkRestriction(track);
    if (restriction.isRestricted && restriction.reason === 'RECENTLY_PLAYED') {
      this.errorMessage.set('Esta música tocou recentemente na rádio. Escolha outra faixa.');
      return;
    }

    console.log('[CART SWAP] Trocando faixa na fila:', {
      queueId: target.queueId,
      oldTitle: target.title,
      newTitle: track.title,
      newYoutubeId: track.youtubeId
    });

    this.isSending.set(true);
    const roomSlug = 'radio-six-nine';
    const token = this.authService.currentUser()?.token;

    const apiTrack = {
      youtube_id: track.youtubeId,
      title: track.title,
      channel_title: track.channel,
      duration_seconds: track.durationSeconds,
      thumbnail_url: track.coverUrl
    };

    this.radioApi.swapQueueTrack(roomSlug, target.queueId, apiTrack, token).subscribe({
      next: (response) => {
        this.isSending.set(false);
        console.log('[CART SWAP SUCCESS] Faixa substituída com sucesso:', response);
        this.successMessage.set(`Música substituída com sucesso por "${track.title}"!`);

        const updatedTrack: Track = {
          queueId: target.queueId,
          youtubeId: track.youtubeId,
          title: track.title,
          channel: track.channel,
          durationSeconds: track.durationSeconds,
          coverUrl: track.coverUrl,
          addedBy: target.addedBy,
          addedByUserId: target.addedByUserId
        };
        this.trackSwapped.emit(updatedTrack);

        setTimeout(() => {
          this.handleClose();
        }, 800);
      },
      error: (err) => {
        this.isSending.set(false);
        console.error('[CART SWAP ERROR] Falha ao trocar música:', err);
        const msg = typeof err.error === 'string' && err.error.trim() ? err.error.trim() : 'Falha ao trocar música na fila.';
        this.errorMessage.set(msg);
        this.errorLogger.logError({
          error_type: 'QUEUE_SWAP_ERROR',
          message: msg,
          payload: { queueId: target.queueId, status: err.status, error: err.error }
        }).subscribe();
      }
    });
  }

  /**
   * Envia as faixas válidas do carrinho para a rádio em lote.
   */
  sendBatch(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const items = this.cartItems();
    if (items.length === 0) {
      this.errorMessage.set('Adicione pelo menos uma música ao carrinho para enviar.');
      return;
    }

    const validItems = items.filter(i => !i.isRestricted);
    const restrictedItems = items.filter(i => i.isRestricted);

    if (validItems.length === 0) {
      this.errorMessage.set('Todas as músicas na sua lista possuem aviso de fila e não podem ser adicionadas agora.');
      return;
    }

    this.isSending.set(true);

    const activeRoomName = this.radioState.activeRoom();
    const rooms = this.radioState.rooms();
    const matched = rooms.find(r => r.name === activeRoomName);
    const roomSlug = matched ? matched.id : 'radio-six-nine';
    const token = this.authService.currentUser()?.token;

    const tracksToSend = validItems.map(i => ({
      youtube_id: i.track.youtubeId,
      title: i.track.title,
      channel_title: i.track.channel,
      duration_seconds: i.track.durationSeconds,
      thumbnail_url: i.track.coverUrl
    }));

    console.log('[CART BATCH] Enviando pedidos para o backend:', { roomSlug, count: tracksToSend.length, tokenPresent: !!token });

    this.radioApi.addToQueueBatch(roomSlug, tracksToSend, token).subscribe({
      next: (res) => {
        this.isSending.set(false);
        this.cartItems.set([]);
        console.log('[CART BATCH SUCCESS] Pedidos aceitos pelo backend:', res);
        if (res.user_quota) {
          this.radioState.setUserQuota(res.user_quota);
        }
        if (this.realWs) {
          this.realWs.queueUpdated$.next({ action: 'batch_add', items: res.enqueued_items });
        }
        if (restrictedItems.length > 0) {
          this.successMessage.set(`${res.success_count} música(s) enviada(s)! As faixas com aviso de fila foram desconsideradas.`);
        } else {
          this.successMessage.set(`${res.success_count} música(s) enviada(s) para a rádio com sucesso!`);
        }
        setTimeout(() => {
          this.handleClose();
        }, 1200);
      },
      error: (err) => {
        this.isSending.set(false);
        console.error('[CART BATCH ERROR] Erro na requisição em lote:', err);
        let errorMsg = 'Erro ao enviar músicas para a rádio.';
        if (err.status === 409) {
          errorMsg = typeof err.error === 'string' && err.error.trim() ? err.error.trim() : 'Conflito: Limite de pedidos na fila atingido ou música em cooldown.';
        } else if (err.status === 400) {
          errorMsg = typeof err.error === 'string' ? err.error : 'Erro ao enviar pedido em lote.';
        }
        this.errorMessage.set(errorMsg);

        this.errorLogger.logError({
          error_type: 'CART_BATCH_ERROR',
          message: errorMsg,
          payload: { status: err.status, error: err.error }
        }).subscribe();
      }
    });
  }
}
