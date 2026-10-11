import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LoginModalComponent } from './login-modal.component';
import { AuthService } from '../../core/auth/auth.service';
import { RadioApiService } from '../../core/api/radio-api.service';

describe('LoginModalComponent (TDD - Tela Única de Login sem Abas)', () => {
  let component: LoginModalComponent;
  let fixture: ComponentFixture<LoginModalComponent>;
  let authService: AuthService;
  let radioApi: RadioApiService;
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
      imports: [LoginModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        RadioApiService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginModalComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    radioApi = TestBed.inject(RadioApiService);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // Responde à requisição inicial de client-id do Google se pendente
    const reqs = httpTesting.match((r) => r.url.includes('/auth/google/client-id'));
    if (reqs.length > 0) {
      reqs[0].flush({ client_id: 'test-google-client-id' });
    }
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('deve instanciar o componente em tela única sem nenhum seletor de abas (.tab-switcher)', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.tab-switcher')).toBeNull();
    expect(compiled.querySelector('.modal-body-unified')).toBeTruthy();
  });

  it('deve renderizar simultaneamente na mesma tela a seção de apelido/emojis e o botão do Google', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#guest-nickname')).toBeTruthy();
    expect(compiled.querySelector('.emoji-grid')).toBeTruthy();
    expect(compiled.querySelector('.btn-guest-submit')).toBeTruthy();
    expect(compiled.querySelector('.auth-divider')).toBeTruthy();
    expect(compiled.querySelector('.btn-google-login')).toBeTruthy();
  });

  it('deve permitir selecionar emojis da grade', () => {
    expect(component.selectedEmoji()).toBe('🎧');

    component.selectedEmoji.set('🎸');
    fixture.detectChanges();

    expect(component.selectedEmoji()).toBe('🎸');
    const preview = fixture.nativeElement.querySelector('.selected-emoji-preview');
    expect(preview?.textContent).toContain('🎸');
  });

  it('deve verificar disponibilidade do apelido com debounce ao digitar', () => {
    vi.useFakeTimers();

    component.onNicknameChange('CyberDJ');
    vi.advanceTimersByTime(450);

    const req = httpTesting.expectOne((r) => r.url.includes('/auth/check-nickname') && r.params.get('nickname') === 'CyberDJ');
    expect(req.request.method).toBe('GET');
    req.flush({ available: true, message: 'Apelido disponível!' });

    expect(component.nicknameStatus()).toBe('available');
    expect(component.nicknameFeedbackMessage()).toContain('Apelido disponível');
    vi.useRealTimers();
  });

  it('deve marcar status como taken se o apelido já estiver em uso', () => {
    vi.useFakeTimers();

    component.onNicknameChange('ApelidoOcupado');
    vi.advanceTimersByTime(450);

    const req = httpTesting.expectOne((r) => r.url.includes('/auth/check-nickname'));
    req.flush({ available: false, message: 'Este apelido já está em uso por outro ouvinte.' });

    expect(component.nicknameStatus()).toBe('taken');
    expect(component.nicknameFeedbackMessage()).toContain('já está em uso');
    vi.useRealTimers();
  });

  it('deve emitir o evento close ao clicar no botão fechar quando não em gate mode', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    const btnClose = fixture.nativeElement.querySelector('.btn-close') as HTMLButtonElement;
    btnClose.click();

    expect(closed).toBe(true);
  });

  it('não deve renderizar botão fechar e não deve fechar no clique do backdrop quando em isGateMode', () => {
    fixture.componentRef.setInput('isGateMode', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.btn-close')).toBeNull();
    expect(compiled.querySelector('.modal-title')?.textContent).toContain('Entrar na Rádio 2.0');

    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    const backdrop = compiled.querySelector('.modal-backdrop') as HTMLElement;
    backdrop.click();

    expect(closed).toBe(false);
  });
});
