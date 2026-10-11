import { Injectable, signal, computed } from '@angular/core';
import { User } from './user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'radio_user_session';
  readonly currentUser = signal<User | null>(this.getSavedUser());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isGuest = computed(() => this.currentUser()?.isGuest ?? true);
  readonly canAddTracks = computed(() => {
    const u = this.currentUser();
    return !!u && !u.isGuest;
  });
  readonly canVoteSkip = computed(() => {
    const u = this.currentUser();
    return !!u && !u.isGuest;
  });

  isEmojiAvatar(avatar?: string | null): boolean {
    if (!avatar) return true;
    if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/assets/')) {
      return false;
    }
    return true;
  }

  loginAsGuest(nickname: string, avatarUrl: string = '🎧', realToken?: string, realId?: string): void {
    const cleanNickname = nickname.trim();
    if (!cleanNickname) return;

    const guestUser: User = {
      id: realId || ('guest_' + Math.random().toString(36).substring(2, 9)),
      nickname: cleanNickname,
      avatarUrl,
      isGuest: true,
      token: realToken || ('guest_token_' + Date.now())
    };

    this.currentUser.set(guestUser);
    this.saveUser(guestUser);
  }

  loginWithGoogle(token: string, email: string, name: string, avatarUrl: string): void {
    const googleUser: User = {
      id: 'g_' + Math.random().toString(36).substring(2, 9),
      nickname: name.trim(),
      email: email.trim().toLowerCase(),
      avatarUrl,
      isGuest: false,
      token
    };

    this.currentUser.set(googleUser);
    this.saveUser(googleUser);
  }

  logout(): void {
    this.currentUser.set(null);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(this.storageKey);
      }
    } catch {
      // noop
    }
  }

  private saveUser(user: User): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(this.storageKey, JSON.stringify(user));
      }
    } catch {
      // noop
    }
  }

  private getSavedUser(): User | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(this.storageKey);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // noop
    }
    return null;
  }
}
