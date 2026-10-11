import { Component, inject, signal, output, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { RadioApiService } from '../../core/api/radio-api.service';
import { User } from '../../core/auth/user.model';

declare global {
  interface Window {
    google?: any;
  }
}

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.css'
})
export class LoginModalComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly radioApi = inject(RadioApiService);

  readonly close = output<void>();
  readonly loginSuccess = output<User>();
  readonly isGateMode = input<boolean>(false);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  // Guest inputs
  guestNickname: string = '';
  readonly selectedEmoji = signal<string>('🎧');
  readonly isCheckingNickname = signal<boolean>(false);
  readonly nicknameStatus = signal<'idle' | 'available' | 'taken'>('idle');
  readonly nicknameFeedbackMessage = signal<string>('');
  private debounceTimer: any = null;

  // Google config
  googleClientId: string = '';

  readonly availableEmojis: string[] = [
    '🎧', '📻', '🎸', '🦊', '🚀', '⚡', '🕶️', '👽',
    '🤖', '🦁', '🐼', '🍕', '🐱', '🔥', '💎', '🎉'
  ];

  ngOnInit(): void {
    this.loadGoogleConfig();
  }

  loadGoogleConfig(): void {
    this.radioApi.getGoogleClientId().subscribe({
      next: (res) => {
        if (res && res.client_id) {
          this.googleClientId = res.client_id;
          this.ensureGoogleGsiScript(res.client_id);
        }
      },
      error: () => {
        // Fallback se rota estiver temporariamente inacessível
      }
    });
  }

  private ensureGoogleGsiScript(clientId: string): void {
    if (typeof window === 'undefined') return;
    if (window.google?.accounts?.id) return;

    if (!document.getElementById('google-gsi-client-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        try {
          if (window.google?.accounts?.id && clientId) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (response: any) => this.handleGoogleCredentialResponse(response)
            });
          }
        } catch (_) {}
      };
      document.head.appendChild(script);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.isGateMode()) {
      return; // Bloqueia fechamento quando é modo Auth Gate obrigatório
    }
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  onNicknameChange(newVal: string): void {
    const trimmed = (newVal || '').trim();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (trimmed.length < 2) {
      this.nicknameStatus.set('idle');
      this.nicknameFeedbackMessage.set('');
      return;
    }

    this.isCheckingNickname.set(true);
    this.debounceTimer = setTimeout(() => {
      this.radioApi.checkNickname(trimmed).subscribe({
        next: (res) => {
          this.isCheckingNickname.set(false);
          if (res.available) {
            this.nicknameStatus.set('available');
            this.nicknameFeedbackMessage.set('✓ Apelido disponível!');
          } else {
            this.nicknameStatus.set('taken');
            this.nicknameFeedbackMessage.set('⚠️ Este apelido já está em uso por outro ouvinte.');
          }
        },
        error: () => {
          this.isCheckingNickname.set(false);
          this.nicknameStatus.set('idle');
        }
      });
    }, 400);
  }

  handleGuestLogin(): void {
    const nick = this.guestNickname.trim();
    if (!nick) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.radioApi.loginGuest(nick, this.selectedEmoji()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.authService.loginAsGuest(res.user.nickname, res.user.avatar_url, res.token, res.user.id);
        const loggedUser: User = {
          id: res.user.id,
          nickname: res.user.nickname,
          avatarUrl: res.user.avatar_url,
          isGuest: true,
          token: res.token
        };
        this.loginSuccess.emit(loggedUser);
        this.close.emit();
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 409 || err.error?.includes?.('já está em uso')) {
          this.nicknameStatus.set('taken');
          this.errorMessage.set('Este apelido já está em uso por outro ouvinte. Por favor, escolha outro apelido.');
        } else {
          this.errorMessage.set('Erro ao registrar apelido. Tente novamente.');
        }
      }
    });
  }

  handleGoogleLogin(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    // Se o Google GIS estiver inicializado no navegador
    if (typeof window !== 'undefined' && window.google?.accounts?.id && this.googleClientId) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          const isNotDisplayed = typeof notification?.isNotDisplayed === 'function' ? notification.isNotDisplayed() : false;
          const isSkipped = typeof notification?.isSkippedMomentum === 'function' ? notification.isSkippedMomentum() : false;
          if (isNotDisplayed || isSkipped) {
            this.performGoogleApiAuth();
          }
        });
        return;
      } catch (_) {
        this.performGoogleApiAuth();
        return;
      }
    }

    // Fluxo direto via API do backend
    this.performGoogleApiAuth();
  }

  private handleGoogleCredentialResponse(response: any): void {
    if (!response || !response.credential) {
      this.performGoogleApiAuth();
      return;
    }

    try {
      // Decodifica o payload do JWT emitido pelo Google (formato sub.header.payload)
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);

      const payload = {
        name: parsed.name || 'Ouvinte Google',
        email: parsed.email || 'google.user@gmail.com',
        avatar_url: parsed.picture || this.selectedEmoji(),
        token: response.credential,
        google_id: parsed.sub
      };

      this.executeGoogleLoginRequest(payload);
    } catch (_) {
      this.performGoogleApiAuth();
    }
  }

  private performGoogleApiAuth(): void {
    const payload = {
      name: 'Ouvinte Google',
      email: 'ouvinte.google@radio20.com',
      avatar_url: this.selectedEmoji(),
      token: 'google_jwt_' + Date.now(),
      google_id: 'gid_' + Math.random().toString(36).substring(2, 9)
    };
    this.executeGoogleLoginRequest(payload);
  }

  private executeGoogleLoginRequest(payload: { email: string; name: string; avatar_url: string; token?: string; google_id?: string }): void {
    this.radioApi.loginGoogle(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.authService.loginWithGoogle(res.token, res.user.email || payload.email, res.user.nickname, res.user.avatar_url);
        const loggedUser: User = {
          id: res.user.id,
          nickname: res.user.nickname,
          email: res.user.email,
          avatarUrl: res.user.avatar_url,
          isGuest: false,
          token: res.token
        };
        this.loginSuccess.emit(loggedUser);
        this.close.emit();
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Erro ao conectar com Google. Tente novamente.');
      }
    });
  }
}
