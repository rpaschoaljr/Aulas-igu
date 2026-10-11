import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { RadioApiService } from '../../core/api/radio-api.service';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { YouTubePlayerService } from '../../core/player/youtube-player.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  readonly radioState = inject(RadioStateService);
  readonly youtubePlayer = inject(YouTubePlayerService);
  private readonly radioApi = inject(RadioApiService);

  readonly requestOpenLogin = output<void>();

  progressPercentage(): number {
    return this.radioState.progressPercentage();
  }

  toggleMuteOrUnlock(): void {
    if (this.youtubePlayer.isSoundBlocked()) {
      this.youtubePlayer.unlockAudio();
    } else {
      this.radioState.toggleMute();
      this.youtubePlayer.setMuted(this.radioState.isMuted());
    }
  }

  handleSkipVote(): void {
    const user = this.authService.currentUser();
    if (!user || user.isGuest) {
      alert('Somente pessoas conectadas com Google podem votar para pular músicas. Visitantes possuem acesso para ouvir e conversar no chat.');
      this.requestOpenLogin.emit();
      return;
    }

    if (this.radioState.hasVotedToSkip()) return;

    const activeRoomName = this.radioState.activeRoom();
    const rooms = this.radioState.rooms();
    const matched = rooms.find(r => r.name === activeRoomName);
    const roomSlug = matched ? matched.id : 'radio-six-nine';

    this.radioState.voteToSkip();
    this.radioApi.voteSkip(roomSlug, user.token || '').subscribe({
      error: (err) => console.warn('[RADIO] Erro ao enviar voto de skip:', err)
    });
  }

  onVolumeChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.radioState.setVolume(val);
    this.youtubePlayer.setVolume(val);
  }

  handleLogin(): void {
    this.requestOpenLogin.emit();
  }
}
