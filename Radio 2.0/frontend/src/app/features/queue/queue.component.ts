import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { RadioApiService } from '../../core/api/radio-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Track } from '../../core/radio/radio.models';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queue.component.html',
  styleUrl: './queue.component.css'
})
export class QueueComponent {
  readonly radioState = inject(RadioStateService);
  readonly authService = inject(AuthService);
  private readonly radioApi = inject(RadioApiService);

  readonly isCollapsed = signal<boolean>(false);
  readonly isLoadingMore = signal<boolean>(false);
  readonly hasMore = signal<boolean>(true);

  readonly requestAddTrack = output<void>();
  readonly requestOpenLogin = output<void>();
  readonly requestRemoveTrack = output<Track>();
  readonly requestSwapTrack = output<Track>();

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el) return;

    const reachedBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 35;
    if (reachedBottom && !this.isLoadingMore() && this.hasMore()) {
      this.loadMore();
    }
  }

  loadMore(): void {
    if (this.isLoadingMore() || !this.hasMore()) return;

    this.isLoadingMore.set(true);
    const currentQueue = this.radioState.queueSlice();
    const offset = currentQueue.length;

    this.radioApi.getQueue('radio-six-nine', 20, offset).subscribe({
      next: (newItems) => {
        this.isLoadingMore.set(false);
        if (!newItems || newItems.length === 0) {
          this.hasMore.set(false);
          return;
        }

        const newTracks: Track[] = newItems.map(item => ({
          queueId: item.id || item.track.youtube_id,
          youtubeId: item.track.youtube_id,
          title: item.track.title,
          channel: item.track.channel_title || 'Artista',
          coverUrl: item.track.thumbnail_url || '/assets/mock/queen.jpg',
          durationSeconds: item.track.duration_seconds || 180,
          addedBy: item.requested_by?.nickname || 'DJ Six-Nine',
          addedByUserId: item.requested_by?.id,
          requestedAt: new Date(item.created_at)
        }));

        this.radioState.appendQueue(newTracks);
        if (newItems.length < 20) {
          this.hasMore.set(false);
        }
      },
      error: (err) => {
        console.warn('[QUEUE] Erro ao carregar mais faixas da fila:', err);
        this.isLoadingMore.set(false);
      }
    });
  }

  isMyTrack(track: Track): boolean {
    const currentId = this.authService.currentUser()?.id;
    return !!currentId && track.addedByUserId === currentId;
  }

  isCurrentPlaying(track: Track, index: number): boolean {
    const current = this.radioState.nowPlaying();
    if (current && (track.youtubeId === current.youtubeId || (!!track.queueId && track.queueId === current.queueId))) {
      return true;
    }
    return index === 0 && (!current || track.youtubeId === current.youtubeId);
  }
}
