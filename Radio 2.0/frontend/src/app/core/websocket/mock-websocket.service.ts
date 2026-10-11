import { Injectable, inject } from '@angular/core';
import { RadioStateService } from '../radio/radio-state.service';
import { NowPlayingTrack, Track } from '../radio/radio.models';

export interface ChatMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MockWebSocketService {
  private readonly radioState = inject(RadioStateService);
  private timerInterval: any = null;

  readonly searchChips = [
    'buscar músicas',
    'pop hits',
    'mtoiclits',
    'venturita'
  ];

  readonly chatMessages: ChatMessage[] = [
    {
      id: 'c1',
      senderName: 'Tonrou seu quesico',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      text: 'Tonrou seu quesico ho como desonlto eumente?',
      timestamp: '21:30',
      isMe: false
    },
    {
      id: 'c2',
      senderName: 'Você',
      senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      text: 'Que tal a interação?',
      timestamp: '21:31',
      isMe: true
    },
    {
      id: 'c3',
      senderName: 'Vienabivo',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      text: 'Viortativio de móoiao no mosda amáomado como o questa mioite forunno?',
      timestamp: '21:32',
      isMe: false
    },
    {
      id: 'c4',
      senderName: 'Vecb',
      senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      text: 'Voch do unto auwuterativo cuento nonha hiundo 🙃',
      timestamp: '21:33',
      isMe: false
    }
  ];

  initMockSession(): void {
    const initialTrack: NowPlayingTrack = {
      queueId: 'q-live-0',
      youtubeId: 'jfKfPfyJRdk',
      title: 'RÁDIO FM AO VIVO',
      channel: 'Foto do locutor',
      durationSeconds: 240,
      startedAtUnixMilli: Date.now() - 45000,
      startedAt: Math.floor(Date.now() / 1000) - 45,
      currentOffsetSeconds: 45,
      addedBy: 'DJ Paschoal',
      coverUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
    };

    const initialQueue: Track[] = [
      {
        queueId: 'q-1',
        youtubeId: 'track-1',
        title: 'Come de Violenta',
        channel: 'Asito Manto',
        durationSeconds: 215,
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=80',
        addedBy: 'Ouvinte 1'
      },
      {
        queueId: 'q-2',
        youtubeId: 'track-2',
        title: 'Devo Bolom',
        channel: 'Aatta Mante',
        durationSeconds: 198,
        coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&auto=format&fit=crop&q=80',
        addedBy: 'Ouvinte 2'
      },
      {
        queueId: 'q-3',
        youtubeId: 'track-3',
        title: 'Caming Music',
        channel: 'Alarcldie',
        durationSeconds: 180,
        coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&auto=format&fit=crop&q=80',
        addedBy: 'Ouvinte 3'
      },
      {
        queueId: 'q-4',
        youtubeId: 'track-4',
        title: 'The Rurgin Ratkos',
        channel: 'Nario',
        durationSeconds: 230,
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80',
        addedBy: 'Ouvinte 4'
      },
      {
        queueId: 'q-5',
        youtubeId: 'track-5',
        title: 'Eronopona',
        channel: 'Mescio',
        durationSeconds: 175,
        coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=120&auto=format&fit=crop&q=80',
        addedBy: 'Ouvinte 5'
      },
      {
        queueId: 'q-6',
        youtubeId: 'track-6',
        title: 'The Wrded of a Nonica',
        channel: 'Boloo Sugan',
        durationSeconds: 205,
        coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=120&auto=format&fit=crop&q=80',
        addedBy: 'Ouvinte 6'
      },
      {
        queueId: 'q-7',
        youtubeId: 'track-7',
        title: 'Bornenno a Mocieti',
        channel: 'Auurie Halborri',
        durationSeconds: 240,
        coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=120&auto=format&fit=crop&q=80',
        addedBy: 'Ouvinte 7'
      },
      {
        queueId: 'q-8',
        youtubeId: 'track-8',
        title: 'Tamino Vinita',
        channel: 'Hesnta',
        durationSeconds: 190,
        coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=120&auto=format&fit=crop&q=80',
        addedBy: 'Ouvinte 8'
      },
      {
        queueId: 'q-9',
        youtubeId: 'track-9',
        title: 'Festa & Iláesiao',
        channel: 'Pilkspia',
        durationSeconds: 210,
        coverUrl: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=120&auto=format&fit=crop&q=80',
        addedBy: 'Ouvinte 9'
      }
    ];

    this.radioState.setNowPlaying(initialTrack);
    this.radioState.setQueue(initialQueue, 9);
    this.radioState.setListenersCount(25);

    this.startClock();
  }

  private startClock(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const current = this.radioState.nowPlaying();
      if (!current) return;

      const newOffset = current.currentOffsetSeconds + 1;
      if (newOffset >= current.durationSeconds) {
        this.advanceTrack();
      } else {
        this.radioState.nowPlaying.set({
          ...current,
          currentOffsetSeconds: newOffset
        });
      }
    }, 1000);
  }

  private advanceTrack(): void {
    const queue = this.radioState.queueSlice();
    if (queue.length > 0) {
      const next = queue[0];
      const remainingQueue = queue.slice(1);

      const nextNowPlaying: NowPlayingTrack = {
        ...next,
        startedAtUnixMilli: Date.now(),
        startedAt: Math.floor(Date.now() / 1000),
        currentOffsetSeconds: 0
      };

      this.radioState.setNowPlaying(nextNowPlaying);
      this.radioState.setQueue(remainingQueue, remainingQueue.length);
      this.radioState.skipVotes.set({
        current: 0,
        required: Math.floor(this.radioState.listenersCount() / 2) + 1,
        votedUserIds: []
      });
    }
  }

  addTrack(title: string, channel: string, durationSeconds: number, coverUrl?: string): boolean {
    if (!this.radioState.canAddTrack()) return false;

    const newTrack: Track = {
      queueId: 'q-' + Date.now(),
      youtubeId: 'custom-' + Date.now(),
      title,
      channel,
      durationSeconds,
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=80',
      addedBy: 'Você',
      addedByUserId: 'my-user'
    };

    const currentQueue = this.radioState.queueSlice();
    this.radioState.setQueue([...currentQueue, newTrack], currentQueue.length + 1);
    return true;
  }
}
