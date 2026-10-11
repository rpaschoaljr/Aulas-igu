import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App Component (TDD)', () => {
  beforeEach(async () => {
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
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('deve criar a aplicação com sucesso', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('quando deslogado, deve exibir apenas o modal de login gate e não renderizar o layout da rádio', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.authService.logout();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(app.authService.isAuthenticated()).toBe(false);
    expect(compiled.querySelector('.app-layout')).toBeNull();
    expect(compiled.querySelector('app-login-modal')).toBeTruthy();
  });

  it('quando autenticado, deve renderizar o layout da rádio e ocultar o modal gate', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.authService.loginWithGoogle('jwt_123', 'test@radio.com', 'Tester Google', 'https://avatar.png');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(app.authService.isAuthenticated()).toBe(true);
    expect(compiled.querySelector('.app-layout')).toBeTruthy();
    expect(compiled.querySelector('app-login-modal')).toBeNull();
  });

  it('deve gerenciar a abertura e fechamento do modal de busca', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.authService.loginWithGoogle('jwt_123', 'test@radio.com', 'Tester Google', 'https://avatar.png');
    fixture.detectChanges();

    expect(app.isSearchModalOpen()).toBe(false);
    app.openSearchModal();
    expect(app.isSearchModalOpen()).toBe(true);
    app.closeSearchModal();
    expect(app.isSearchModalOpen()).toBe(false);
  });

  it('deve alternar as abas no modo mobile', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.authService.loginWithGoogle('jwt_123', 'test@radio.com', 'Tester Google', 'https://avatar.png');
    fixture.detectChanges();

    expect(app.currentMobileTab()).toBe('salas');
    app.onMobileTabChange('historico');
    expect(app.currentMobileTab()).toBe('historico');
    app.onMobileTabChange('fila');
    expect(app.currentMobileTab()).toBe('fila');
    app.onMobileTabChange('buscar');
    expect(app.currentMobileTab()).toBe('buscar');
  });
});
