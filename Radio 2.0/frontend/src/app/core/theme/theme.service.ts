import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'radio_theme';
  readonly currentTheme = signal<ThemeMode>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    this.safeSetItem(this.storageKey, theme);
  }

  toggleTheme(): void {
    const nextTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  private getInitialTheme(): ThemeMode {
    const saved = this.safeGetItem(this.storageKey) as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return 'dark'; // Padrão Dark conforme protótipo Figma
  }

  private applyTheme(theme: ThemeMode): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  private safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignora erro se storage indisponível
    }
    return null;
  }

  private safeSetItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignora erro se storage indisponível
    }
  }
}
