import { Component, inject, computed, signal, HostListener, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { YouTubePlayerService } from '../../core/player/youtube-player.service';

@Component({
  selector: 'app-vinyl-disc-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vinyl-disc-player.component.html',
  styleUrl: './vinyl-disc-player.component.css'
})
export class VinylDiscPlayerComponent {
  readonly radioState = inject(RadioStateService);
  readonly youtubePlayer = inject(YouTubePlayerService);

  readonly isVideoVisible = signal<boolean>(false);
  readonly videoWidthPercent = signal<number>(65);
  readonly isDragging = signal<boolean>(false);

  private dragStartX = 0;
  private startPercent = 65;

  readonly progressPercentage = computed(() => {
    return this.radioState.progressPercentage();
  });

  formattedCurrentTime = computed(() => {
    return this.formatTime(this.radioState.currentPlaybackSeconds());
  });

  formattedDuration = computed(() => {
    const track = this.radioState.nowPlaying();
    return this.formatTime(track?.durationSeconds || 0);
  });

  toggleVideoVisibility(): void {
    this.isVideoVisible.update(v => !v);
  }

  setVideoSize(percent: number): void {
    this.videoWidthPercent.set(Math.min(100, Math.max(30, percent)));
  }

  onSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setVideoSize(Number(input.value));
  }

  startDragResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
    this.dragStartX = event.clientX;
    this.startPercent = this.videoWidthPercent();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging()) return;

    // Calcula variação com base na largura da janela/container
    const deltaX = event.clientX - this.dragStartX;
    const windowWidth = window.innerWidth || 1000;
    const deltaPercent = (deltaX / (windowWidth * 0.5)) * 100;
    const nextPercent = Math.min(100, Math.max(30, Math.round(this.startPercent + deltaPercent)));
    this.videoWidthPercent.set(nextPercent);
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (this.isDragging()) {
      this.isDragging.set(false);
    }
  }

  unlockAudio(): void {
    this.youtubePlayer.unlockAudio();
  }

  toggleMute(): void {
    if (this.youtubePlayer.isSoundBlocked()) {
      this.unlockAudio();
      return;
    }
    this.radioState.toggleMute();
    this.youtubePlayer.setMuted(this.radioState.isMuted());
  }

  onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = Number(input.value);
    this.radioState.setVolume(val);
    this.youtubePlayer.setVolume(val);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
