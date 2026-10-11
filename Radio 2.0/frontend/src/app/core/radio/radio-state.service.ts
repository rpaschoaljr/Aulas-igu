import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Track, NowPlayingTrack, SkipVoteStatus, RadioRoom } from './radio.models';
import { ApiHistoryItem, ApiUserQuota } from '../api/radio-api.service';

@Injectable({
  providedIn: 'root'
})
export class RadioStateService {
  private readonly authService = inject(AuthService);

  // Estados Reativos Principais (Signals)
  readonly nowPlaying = signal<NowPlayingTrack | null>(null);
  readonly currentPlaybackSeconds = signal<number>(0);
  readonly queueSlice = signal<Track[]>([]);
  readonly playbackHistory = signal<ApiHistoryItem[]>([]);
  readonly totalTracksInQueue = signal<number>(0);
  readonly listenersCount = signal<number>(1);
  readonly skipVotes = signal<SkipVoteStatus>({ current: 0, required: 1, votedUserIds: [] });

  // Cota oficial do usuário gerenciada e informada pelo backend
  readonly userQuota = signal<ApiUserQuota>({
    room_slug: 'radio-six-nine',
    user_id: '',
    active_tracks: 0,
    max_quota: 5,
    can_request: true,
    authenticated: false
  });

  // Preferências Locais de Áudio
  readonly isMuted = signal<boolean>(false);
  readonly volume = signal<number>(80);
  private lastNonZeroVolume = 80;

  // Salas disponíveis
  readonly activeRoom = signal<string>('Radio Six-Nine');
  readonly rooms = signal<RadioRoom[]>([
    { id: 'radio-six-nine', name: 'Radio Six-Nine', listenersCount: 25, isLive: true, coverUrl: '/assets/rooms/pop.jpg' },
    { id: 'rock-classico', name: 'Rock Clássico', listenersCount: 23, isLive: true, coverUrl: '/assets/rooms/rock.jpg' },
    { id: 'festa-balada', name: 'Festa & Balada', listenersCount: 12, isLive: true, coverUrl: '/assets/rooms/festa.jpg' }
  ]);

  // Regras de Negócio Computadas (Computed Signals)
  readonly progressPercentage = computed(() => {
    const track = this.nowPlaying();
    if (!track || track.durationSeconds === 0) return 0;
    return Math.min(100, Math.round((this.currentPlaybackSeconds() / track.durationSeconds) * 100));
  });

  readonly myTrackCount = computed(() => {
    const quota = this.userQuota();
    if (quota.active_tracks > 0) {
      return quota.active_tracks;
    }
    const user = this.authService.currentUser();
    if (!user) return quota.active_tracks;
    const localCount = this.queueSlice().filter(track => track.addedByUserId === user.id).length;
    return Math.max(localCount, quota.active_tracks);
  });

  readonly canAddTrack = computed(() => {
    return this.userQuota().can_request && this.myTrackCount() < 5;
  });

  readonly hasVotedToSkip = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return false;
    return this.skipVotes().votedUserIds.includes(user.id);
  });

  readonly skipPercentage = computed(() => {
    const votes = this.skipVotes();
    if (votes.required === 0) return 0;
    return Math.min(100, Math.round((votes.current / votes.required) * 100));
  });

  // Métodos de Modificação de Estado
  setNowPlaying(track: NowPlayingTrack | null): void {
    this.nowPlaying.set(track);
    if (track) {
      this.currentPlaybackSeconds.set(track.currentOffsetSeconds || 0);
    } else {
      this.currentPlaybackSeconds.set(0);
    }
  }

  setPlaybackSeconds(seconds: number): void {
    this.currentPlaybackSeconds.set(seconds);
  }

  setQueue(queue: Track[], totalCount?: number): void {
    this.queueSlice.set(queue);
    this.totalTracksInQueue.set(totalCount ?? queue.length);
  }

  appendQueue(newTracks: Track[]): void {
    const current = this.queueSlice();
    const existingIds = new Set(current.map(t => t.queueId));
    const toAdd = newTracks.filter(t => !existingIds.has(t.queueId));
    if (toAdd.length > 0) {
      const updated = [...current, ...toAdd];
      this.queueSlice.set(updated);
      this.totalTracksInQueue.set(Math.max(this.totalTracksInQueue(), updated.length));
    }
  }

  setPlaybackHistory(items: ApiHistoryItem[]): void {
    this.playbackHistory.set(items);
  }

  appendPlaybackHistory(newItems: ApiHistoryItem[]): void {
    const current = this.playbackHistory();
    const existingIds = new Set(current.map(i => i.id));
    const toAdd = newItems.filter(i => !existingIds.has(i.id));
    if (toAdd.length > 0) {
      this.playbackHistory.set([...current, ...toAdd]);
    }
  }

  setListenersCount(count: number): void {
    const cleanCount = Math.max(1, count);
    this.listenersCount.set(cleanCount);
    // Limiar: estritamente maior que 50%
    const required = Math.floor(cleanCount / 2) + 1;
    this.skipVotes.update(v => ({ ...v, required }));
  }

  voteToSkip(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (this.hasVotedToSkip()) return false; // Voto duplicado rejeitado

    this.skipVotes.update(currentVotes => ({
      current: currentVotes.current + 1,
      required: currentVotes.required,
      votedUserIds: [...currentVotes.votedUserIds, user.id]
    }));

    return true;
  }

  toggleMute(): void {
    if (this.isMuted()) {
      const restoreVol = this.lastNonZeroVolume > 0 ? this.lastNonZeroVolume : 50;
      this.volume.set(restoreVol);
      this.isMuted.set(false);
    } else {
      if (this.volume() > 0) {
        this.lastNonZeroVolume = this.volume();
      }
      this.volume.set(0);
      this.isMuted.set(true);
    }
  }

  setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(100, vol));
    this.volume.set(clamped);
    if (clamped > 0) {
      this.lastNonZeroVolume = clamped;
      this.isMuted.set(false);
    } else {
      this.isMuted.set(true);
    }
  }

  setUserQuota(quota: ApiUserQuota): void {
    this.userQuota.set(quota);
  }
}
