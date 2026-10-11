import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService (TDD)', () => {
  let service: AuthService;
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('deve permitir login como convidado com apelido sanitizado', () => {
    service.loginAsGuest('  DJ Paschoal  ', '/assets/avatars/retro-1.png');

    const currentUser = service.currentUser();
    expect(currentUser).not.toBeNull();
    expect(currentUser?.nickname).toBe('DJ Paschoal');
    expect(currentUser?.isGuest).toBe(true);
    expect(currentUser?.avatarUrl).toBe('/assets/avatars/retro-1.png');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('deve persistir a sessão efêmera de convidado no sessionStorage', () => {
    service.loginAsGuest('Ouvinte 10', '/assets/avatars/retro-2.png');
    expect(window.sessionStorage.getItem('radio_user_session')).toBeTruthy();
  });

  it('deve realizar logout limpando o estado e sessionStorage', () => {
    service.loginAsGuest('Ouvinte Teste', '/assets/avatars/retro-1.png');
    expect(service.isAuthenticated()).toBe(true);

    service.logout();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(window.sessionStorage.getItem('radio_user_session')).toBeNull();
  });
});
