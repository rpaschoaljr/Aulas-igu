import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { QueueComponent } from './queue.component';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { RadioApiService } from '../../core/api/radio-api.service';
import { AuthService } from '../../core/auth/auth.service';

describe('QueueComponent (TDD - Cota 0/5 & Faixas do DJ & Scroll Infinito)', () => {
  let component: QueueComponent;
  let fixture: ComponentFixture<QueueComponent>;
  let radioState: RadioStateService;
  let authService: AuthService;
  let httpTesting: HttpTestingController;

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

    await TestBed.configureTestingModule({
      imports: [QueueComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RadioStateService,
        RadioApiService,
        AuthService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QueueComponent);
    component = fixture.componentInstance;
    radioState = TestBed.inject(RadioStateService);
    authService = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);

    // Configura usuário logado com Google por padrão para testes de cota
    authService.loginWithGoogle('token-test-123', 'usuario@gmail.com', 'Ouvinte Google', '🎧');
    fixture.detectChanges();
  });

  it('deve ser instanciado com sucesso', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o indicador de cota pessoal com o novo limite de 5 músicas (0/5) quando logado com Google', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const quotaBar = compiled.querySelector('.quota-bar');
    expect(quotaBar?.textContent).toContain('0/5');
  });

  it('deve exibir o banner de login e aviso quando o usuário for visitante simples (guest)', () => {
    authService.loginAsGuest('VisitanteSimples', '🎧');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.guest-login-banner')).toBeTruthy();
    expect(compiled.querySelector('.btn-login-to-request')).toBeTruthy();
    expect(compiled.querySelector('.guest-warning-text')?.textContent).toContain('Somente pessoas conectadas com Google podem pedir músicas');
    expect(compiled.querySelector('.btn-add-track')).toBeNull();
  });

  it('deve emitir requestOpenLogin ao clicar no botão de login da fila sendo visitante', () => {
    authService.loginAsGuest('VisitanteSimples', '🎧');
    fixture.detectChanges();

    let emitted = false;
    component.requestOpenLogin.subscribe(() => {
      emitted = true;
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const btn = compiled.querySelector('.btn-login-to-request') as HTMLButtonElement;
    btn.click();

    expect(emitted).toBe(true);
  });

  it('deve renderizar faixas do DJ com a badge estilizada de DJ e faixas de ouvintes com a badge de ouvinte', () => {
    radioState.setQueue([
      {
        queueId: 'q-dj-1',
        youtubeId: 'yt-dj-1',
        title: 'Música Selecionada pelo DJ',
        channel: 'Artista Teste',
        durationSeconds: 180,
        addedBy: 'DJ Six-Nine'
      },
      {
        queueId: 'q-user-1',
        youtubeId: 'yt-user-1',
        title: 'Pedido do Ouvinte',
        channel: 'Artista Ouvinte',
        durationSeconds: 210,
        addedBy: 'DJ_Coruja',
        addedByUserId: 'usr_1'
      }
    ]);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const djBadge = compiled.querySelector('.badge-dj');
    expect(djBadge).toBeTruthy();
    expect(djBadge?.textContent).toContain('DJ Six-Nine');

    const listenerBadge = compiled.querySelector('.badge-listener');
    expect(listenerBadge).toBeTruthy();
    expect(listenerBadge?.textContent).toContain('DJ_Coruja');
  });

  it('deve emitir o evento requestAddTrack ao clicar em Pedir Música', () => {
    let emitted = false;
    component.requestAddTrack.subscribe(() => {
      emitted = true;
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const btn = compiled.querySelector('.btn-add-track') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();

    expect(emitted).toBe(true);
  });

  it('deve esconder o botão Pedir Música quando a cota estiver esgotada e reexibir quando liberada', () => {
    // 1. Simula cota esgotada informada pelo backend
    radioState.setUserQuota({
      room_slug: 'radio-six-nine',
      user_id: 'usr-1',
      active_tracks: 5,
      max_quota: 5,
      can_request: false,
      authenticated: true
    });
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.btn-add-track')).toBeNull();
    expect(compiled.querySelector('.quota-full')?.textContent).toContain('Limite de 5 atingido');

    // 2. Simula liberação de vaga no backend (música terminou de tocar ou foi pulada)
    radioState.setUserQuota({
      room_slug: 'radio-six-nine',
      user_id: 'usr-1',
      active_tracks: 4,
      max_quota: 5,
      can_request: true,
      authenticated: true
    });
    fixture.detectChanges();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.btn-add-track')).not.toBeNull();
  });

  it('não deve exibir Limite de 5 atingido quando o usuário tiver menos de 5 pedidos (ex: 0/5)', () => {
    authService.loginWithGoogle('token-1', 'email@test.com', 'User', '🎧');
    radioState.setUserQuota({
      room_slug: 'radio-six-nine',
      user_id: 'u-1',
      active_tracks: 0,
      max_quota: 5,
      can_request: true,
      authenticated: true
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.quota-full')).toBeNull();
    expect(compiled.querySelector('.btn-add-track')).not.toBeNull();
  });

  it('não deve renderizar o botão de curtir (.btn-like)', () => {
    radioState.setQueue([
      {
        queueId: 'q-1',
        youtubeId: 'yt-1',
        title: 'Música Teste',
        channel: 'Canal',
        durationSeconds: 180,
        addedBy: 'DJ Six-Nine'
      }
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.btn-like')).toBeNull();
  });

  it('deve renderizar botões de trocar (.btn-swap) e remover (.btn-remove) apenas para faixas do usuário logado', () => {
    authService.loginAsGuest('Eu', '', 'real_token', 'meu_user_id');

    radioState.setQueue([
      {
        queueId: 'q-minha',
        youtubeId: 'yt-minha',
        title: 'Minha Música',
        channel: 'Meu Canal',
        durationSeconds: 200,
        addedBy: 'Eu',
        addedByUserId: 'meu_user_id'
      },
      {
        queueId: 'q-outro',
        youtubeId: 'yt-outro',
        title: 'Música de Outro',
        channel: 'Outro Canal',
        durationSeconds: 220,
        addedBy: 'Outro',
        addedByUserId: 'outro_user_id'
      }
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.queue-item');
    expect(items.length).toBe(2);

    // Primeiro item é do usuário logado: deve ter .btn-swap e .btn-remove
    expect(items[0].querySelector('.btn-swap')).not.toBeNull();
    expect(items[0].querySelector('.btn-remove')).not.toBeNull();

    // Segundo item é de outro usuário: não deve ter .btn-swap nem .btn-remove
    expect(items[1].querySelector('.btn-swap')).toBeNull();
    expect(items[1].querySelector('.btn-remove')).toBeNull();
  });

  it('deve emitir requestRemoveTrack e requestSwapTrack ao clicar nos respectivos botões', () => {
    authService.loginAsGuest('Eu', '', 'real_token', 'meu_user_id');

    const minhaFaixa = {
      queueId: 'q-minha',
      youtubeId: 'yt-minha',
      title: 'Minha Música',
      channel: 'Meu Canal',
      durationSeconds: 200,
      addedBy: 'Eu',
      addedByUserId: 'meu_user_id'
    };

    radioState.setQueue([minhaFaixa]);
    fixture.detectChanges();

    let removedTrack: any = null;
    let swappedTrack: any = null;
    component.requestRemoveTrack.subscribe(t => removedTrack = t);
    component.requestSwapTrack.subscribe(t => swappedTrack = t);

    const compiled = fixture.nativeElement as HTMLElement;
    const btnRemove = compiled.querySelector('.btn-remove') as HTMLButtonElement;
    const btnSwap = compiled.querySelector('.btn-swap') as HTMLButtonElement;

    expect(btnRemove).toBeTruthy();
    expect(btnSwap).toBeTruthy();

    btnRemove.click();
    expect(removedTrack).toEqual(minhaFaixa);

    btnSwap.click();
    expect(swappedTrack).toEqual(minhaFaixa);
  });

  it('deve disparar loadMore ao rolar a lista da fila até o fundo e carregar mais 20 faixas', () => {
    // Popula a fila inicial com 20 faixas
    const initial20 = Array.from({ length: 20 }, (_, i) => ({
      queueId: `q-${i + 1}`,
      youtubeId: `yt-${i + 1}`,
      title: `Faixa ${i + 1}`,
      channel: 'Canal Teste',
      durationSeconds: 180,
      addedBy: 'Ouvinte'
    }));
    radioState.setQueue(initial20);
    fixture.detectChanges();

    // Simula evento de scroll atingindo o fundo
    const fakeScrollEvent = {
      target: {
        scrollTop: 800,
        clientHeight: 400,
        scrollHeight: 1220 // 800 + 400 = 1200 >= 1220 - 35
      }
    } as unknown as Event;

    component.onScroll(fakeScrollEvent);
    expect(component.isLoadingMore()).toBe(true);

    // Responde à requisição HTTP disparada com a página 2 (offset 20)
    const req = httpTesting.expectOne((r) => r.url.includes('/api/radio/queue') && r.params.get('offset') === '20');
    expect(req.request.method).toBe('GET');

    const nextBatch = Array.from({ length: 20 }, (_, i) => ({
      id: `q-${i + 21}`,
      room_id: 'radio-six-nine',
      position: i + 21,
      status: 'pending',
      created_at: new Date().toISOString(),
      track: {
        youtube_id: `yt-${i + 21}`,
        title: `Faixa ${i + 21}`,
        channel_title: 'Canal Teste',
        duration_seconds: 180,
        thumbnail_url: ''
      }
    }));

    req.flush(nextBatch);

    expect(component.isLoadingMore()).toBe(false);
    expect(radioState.queueSlice().length).toBe(40);
    expect(component.hasMore()).toBe(true);
  });

  it('deve marcar hasMore como false quando a API retornar menos de 20 faixas no loadMore', () => {
    radioState.setQueue([]);
    fixture.detectChanges();

    component.loadMore();
    expect(component.isLoadingMore()).toBe(true);

    const req = httpTesting.expectOne((r) => r.url.includes('/api/radio/queue'));
    req.flush([
      {
        id: 'q-last',
        room_id: 'radio-six-nine',
        position: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
        track: {
          youtube_id: 'yt-last',
          title: 'Última Faixa',
          channel_title: 'Canal',
          duration_seconds: 180,
          thumbnail_url: ''
        }
      }
    ]); // Retorna apenas 1 faixa (< 20)

    expect(component.isLoadingMore()).toBe(false);
    expect(component.hasMore()).toBe(false);
  });

  it('deve destacar a faixa tocando com a classe is-playing e exibir a tag Tocando no lugar do número', () => {
    // Simula música atual tocando na rádio
    radioState.nowPlaying.set({
      queueId: 'q-now',
      youtubeId: 'yt-now',
      title: 'Musica no Ar Agora',
      channel: 'Artista Top',
      durationSeconds: 200,
      coverUrl: '',
      addedBy: 'DJ Six-Nine',
      currentOffsetSeconds: 15,
      startedAt: Date.now() / 1000
    });

    // Fila com 2 músicas: a primeira é a que está tocando
    radioState.setQueue([
      {
        queueId: 'q-now',
        youtubeId: 'yt-now',
        title: 'Musica no Ar Agora',
        channel: 'Artista Top',
        durationSeconds: 200,
        coverUrl: '',
        addedBy: 'DJ Six-Nine'
      },
      {
        queueId: 'q-next',
        youtubeId: 'yt-next',
        title: 'Próxima da Fila',
        channel: 'Outro Artista',
        durationSeconds: 180,
        coverUrl: '',
        addedBy: 'Ouvinte'
      }
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.queue-item');
    expect(items.length).toBe(2);

    // O primeiro item deve ter a classe .is-playing e exibir 'Tocando'
    expect(items[0].classList.contains('is-playing')).toBe(true);
    const playingTag = items[0].querySelector('.track-playing-status');
    expect(playingTag).toBeTruthy();
    expect(playingTag?.textContent?.trim()).toBe('Tocando');
    expect(items[0].querySelector('.track-number')).toBeNull();

    // O segundo item exibe o número normal da fila (2)
    expect(items[1].classList.contains('is-playing')).toBe(false);
    expect(items[1].querySelector('.track-playing-status')).toBeNull();
    const trackNumber = items[1].querySelector('.track-number');
    expect(trackNumber?.textContent?.trim()).toBe('2');
  });
});

