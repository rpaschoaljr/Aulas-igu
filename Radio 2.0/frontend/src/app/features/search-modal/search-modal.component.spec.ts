import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchModalComponent, SearchResult } from './search-modal.component';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { RadioApiService } from '../../core/api/radio-api.service';
import { YouTubeCacheService } from '../../core/cache/youtube-cache.service';
import { AuthService } from '../../core/auth/auth.service';
import { of } from 'rxjs';

describe('SearchModalComponent (TDD - Carrinho de Pedidos & Cooldown)', () => {
  let component: SearchModalComponent;
  let fixture: ComponentFixture<SearchModalComponent>;
  let radioState: RadioStateService;
  let radioApi: any;

  beforeEach(async () => {
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
    Object.defineProperty(window, 'sessionStorage', { value: mockStorage, writable: true });

    const apiSpy = {
      searchYouTube: () => of([]),
      getUserFavorites: () => of([
        {
          track: {
            id: 'fav-1',
            youtube_id: 'fav-1',
            title: 'Iron Maiden - The Trooper',
            channel_title: 'Iron Maiden',
            duration_seconds: 245,
            thumbnail_url: '/trooper.jpg'
          },
          request_count: 5,
          last_requested_at: new Date().toISOString(),
          is_user_favorite: true
        }
      ]),
      addToQueueBatch: () => of({
        success_count: 2,
        failed_count: 0,
        enqueued_items: [{ id: 'q1' }, { id: 'q2' }],
        rejected: []
      })
    };

    await TestBed.configureTestingModule({
      imports: [SearchModalComponent],
      providers: [
        RadioStateService,
        YouTubeCacheService,
        AuthService,
        { provide: RadioApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchModalComponent);
    component = fixture.componentInstance;
    radioState = TestBed.inject(RadioStateService);
    radioApi = TestBed.inject(RadioApiService);
    fixture.detectChanges();
  });

  it('deve inicializar com o carrinho vazio e limite de 5 músicas', () => {
    expect(component).toBeTruthy();
    expect(component.cartItems().length).toBe(0);
    expect(component.validCount()).toBe(0);
    expect(component.restrictedCount()).toBe(0);
  });

  it('deve permitir adicionar músicas ao carrinho mantendo o modal aberto', () => {
    const track1: SearchResult = {
      youtubeId: 'yt-1',
      title: 'Musica 1',
      channel: 'Canal 1',
      durationSeconds: 180,
      coverUrl: '/cover1.jpg'
    };
    const track2: SearchResult = {
      youtubeId: 'yt-2',
      title: 'Musica 2',
      channel: 'Canal 2',
      durationSeconds: 210,
      coverUrl: '/cover2.jpg'
    };

    component.addToCart(track1);
    component.addToCart(track2);

    expect(component.cartItems().length).toBe(2);
    expect(component.validCount()).toBe(2);
    expect(component.isTrackInCart('yt-1')).toBe(true);
    expect(component.isTrackInCart('yt-2')).toBe(true);
  });

  it('deve respeitar o limite máximo estrito de 5 músicas no carrinho', () => {
    for (let i = 1; i <= 5; i++) {
      component.addToCart({
        youtubeId: `yt-${i}`,
        title: `Musica ${i}`,
        channel: 'Canal',
        durationSeconds: 150,
        coverUrl: ''
      });
    }

    expect(component.cartItems().length).toBe(5);

    // Tentativa de adicionar a 6ª música deve ser bloqueada
    component.addToCart({
      youtubeId: 'yt-6',
      title: 'Musica 6',
      channel: 'Canal',
      durationSeconds: 150,
      coverUrl: ''
    });

    expect(component.cartItems().length).toBe(5);
    expect(component.errorMessage()?.toLowerCase()).toContain('limite');
  });

  it('deve bloquear adição ao carrinho se o usuário já atingiu a cota de 5 pedidos ativos na fila', () => {
    // Simula que o usuário já tem 5 músicas ativas na fila
    const currentUserId = 'user_123';
    (component as any).authService.currentUser.set({
      id: currentUserId,
      nickname: 'Ouvinte',
      token: 'tok'
    });
    radioState.setQueue([
      { queueId: '1', youtubeId: 'a', title: 'T1', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte', addedByUserId: currentUserId },
      { queueId: '2', youtubeId: 'b', title: 'T2', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte', addedByUserId: currentUserId },
      { queueId: '3', youtubeId: 'c', title: 'T3', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte', addedByUserId: currentUserId },
      { queueId: '4', youtubeId: 'd', title: 'T4', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte', addedByUserId: currentUserId },
      { queueId: '5', youtubeId: 'e', title: 'T5', channel: 'C', durationSeconds: 120, addedBy: 'Ouvinte', addedByUserId: currentUserId },
    ]);

    expect(radioState.myTrackCount()).toBe(5);
    expect(component.remainingUserQuota()).toBe(0);

    component.addToCart({
      youtubeId: 'extra',
      title: 'Musica Extra',
      channel: 'Canal',
      durationSeconds: 180,
      coverUrl: ''
    });

    expect(component.cartItems().length).toBe(0);
    expect(component.errorMessage()).toContain('Você já atingiu o limite de 5 músicas ativas na fila');
  });

  it('deve permitir adicionar música tocada recentemente, mas marcar com aviso explícito de fila', () => {
    // Configura as últimas faixas tocadas no histórico (cooldown das últimas 5 faixas)
    radioState.setPlaybackHistory([
      {
        id: 'h1',
        room_id: 'radio-six-nine',
        youtube_id: 'cooldown-yt',
        title: 'Musica Recente',
        channel: 'Canal',
        duration_seconds: 200,
        cover_url: '',
        was_skipped: false,
        played_at: '2026-10-08T13:00:00Z'
      }
    ]);

    const recentTrack: SearchResult = {
      youtubeId: 'cooldown-yt',
      title: 'Musica Recente',
      channel: 'Canal',
      durationSeconds: 200,
      coverUrl: ''
    };

    // Usuário consegue adicionar à lista de pedidos
    component.addToCart(recentTrack);

    expect(component.cartItems().length).toBe(1);
    const itemInCart = component.cartItems()[0];
    expect(itemInCart.isRestricted).toBe(true);
    expect(itemInCart.restrictionReason).toBe('RECENTLY_PLAYED');
    expect(itemInCart.restrictionLabel).toContain('Tocou recentemente');
    expect(component.validCount()).toBe(0);
    expect(component.restrictedCount()).toBe(1);
  });

  it('deve permitir remover itens individuais do carrinho', () => {
    component.addToCart({
      youtubeId: 'yt-rem',
      title: 'Para Remover',
      channel: 'Canal',
      durationSeconds: 180,
      coverUrl: ''
    });

    expect(component.cartItems().length).toBe(1);
    component.removeFromCart('yt-rem');
    expect(component.cartItems().length).toBe(0);
  });

  it('deve enviar lote de músicas válidas para a rádio via addToQueueBatch', () => {
    const trackValid: SearchResult = {
      youtubeId: 'yt-ok-1',
      title: 'Musica Ok',
      channel: 'Canal',
      durationSeconds: 180,
      coverUrl: ''
    };

    component.addToCart(trackValid);
    expect(component.validCount()).toBe(1);

    component.sendBatch();

    expect(component.isSending()).toBe(false);
    expect(component.cartItems().length).toBe(0);
    expect(component.successMessage()).toContain('enviada');
  });

  it('deve carregar as músicas favoritas do usuário e exibi-las no modal sem termos de busca', () => {
    // ngOnInit foi disparado no setup do teste
    expect(component.favoriteTracks().length).toBe(1);
    expect(component.isShowingFavorites()).toBe(true);
    expect(component.hasPersonalFavorites()).toBe(true);
    expect(component.results().length).toBe(1);
    expect(component.results()[0].title).toBe('Iron Maiden - The Trooper');
    expect(component.results()[0].requestCount).toBe(5);
  });

  it('deve alternar para resultados de busca ao pesquisar e restaurar favoritos ao limpar o campo', () => {
    // Digita busca
    component.searchQuery = 'Metallica';
    component.handleSearch();

    expect(component.isShowingFavorites()).toBe(false);

    // Limpa o campo
    component.searchQuery = '';
    component.onSearchInput();

    expect(component.isShowingFavorites()).toBe(true);
    expect(component.results().length).toBe(1);
    expect(component.results()[0].title).toBe('Iron Maiden - The Trooper');
  });
});
