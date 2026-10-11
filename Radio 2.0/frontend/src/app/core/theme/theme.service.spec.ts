import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService (TDD)', () => {
  let service: ThemeService;
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
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

    if (document.documentElement) {
      document.documentElement.removeAttribute('data-theme');
    }
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('deve inicializar com o tema dark por padrão se não houver preferência salva', () => {
    expect(service.currentTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('deve alternar de dark para light', () => {
    service.setTheme('light');
    expect(service.currentTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('radio_theme')).toBe('light');
  });

  it('deve alternar usando toggleTheme()', () => {
    service.setTheme('dark');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
