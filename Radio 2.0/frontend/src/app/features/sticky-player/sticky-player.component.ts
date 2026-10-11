import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { RadioApiService } from '../../core/api/radio-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { YouTubePlayerService } from '../../core/player/youtube-player.service';

@Component({
  selector: 'app-sticky-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sticky-player.component.html',
  styleUrl: './sticky-player.component.css'
})
export class StickyFooterPlayerComponent {
  readonly radioState = inject(RadioStateService);
  readonly youtubePlayer = inject(YouTubePlayerService);
  private readonly radioApi = inject(RadioApiService);
  private readonly authService = inject(AuthService);

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
    if (!user) {
      alert('Faça login como visitante ou Google para votar para pular a música!');
      return;
    }

    if (this.radioState.hasVotedToSkip()) return;

    const activeRoomName = this.radioState.activeRoom();
    const rooms = this.radioState.rooms();
    const matched = rooms.find(r => r.name === activeRoomName);
    const roomSlug = matched ? matched.id : 'pop-hits';

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
}
