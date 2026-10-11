import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioStateService } from '../../core/radio/radio-state.service';
import { RadioApiService, ApiHistoryItem } from '../../core/api/radio-api.service';

@Component({
  selector: 'app-playback-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './playback-history.component.html',
  styleUrl: './playback-history.component.css'
})
export class PlaybackHistoryComponent {
  readonly radioState = inject(RadioStateService);
  private readonly radioApi = inject(RadioApiService);

  readonly isLoadingMore = signal<boolean>(false);
  readonly hasMore = signal<boolean>(true);

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el) return;

    const reachedBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (reachedBottom && !this.isLoadingMore() && this.hasMore()) {
      this.loadMore();
    }
  }

  loadMore(): void {
    if (this.isLoadingMore() || !this.hasMore()) return;

    this.isLoadingMore.set(true);
    const currentItems = this.radioState.playbackHistory();
    const offset = currentItems.length;

    this.radioApi.getHistory('radio-six-nine', 20, offset).subscribe({
      next: (newItems) => {
        this.isLoadingMore.set(false);
        if (!newItems || newItems.length === 0) {
          this.hasMore.set(false);
          return;
        }

        const existingIds = new Set(currentItems.map(i => i.id));
        const filteredNew = newItems.filter(i => !existingIds.has(i.id));

        if (filteredNew.length === 0) {
          this.hasMore.set(false);
          return;
        }

        this.radioState.appendPlaybackHistory(filteredNew);
        if (newItems.length < 20) {
          this.hasMore.set(false);
        }
      },
      error: (err) => {
        console.warn('[HISTORY] Erro ao carregar mais faixas:', err);
        this.isLoadingMore.set(false);
      }
    });
  }

  formatPlayedAt(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 1) return 'agora há pouco';
      if (diffMinutes < 60) return `há ${diffMinutes} min`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `há ${diffHours}h`;

      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}
