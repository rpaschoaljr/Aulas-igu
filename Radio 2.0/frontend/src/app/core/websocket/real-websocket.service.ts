import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { RadioStateService } from '../radio/radio-state.service';
import { NowPlayingTrack, Track } from '../radio/radio.models';

export interface WebSocketMessage {
  type: string;
  room_id?: string;
  payload: any;
  timestamp?: number;
}

export interface ChatMessage {
  id?: string;
  userId?: string;
  userNickname: string;
  userAvatar: string;
  text: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealWebSocketService {
  private readonly radioState = inject(RadioStateService);
  
  private socket: WebSocket | null = null;
  private currentRoomSlug = 'geral';
  private currentToken = '';
  private reconnectTimeout: any = null;
  private shouldReconnect = true;

  readonly isConnected = signal<boolean>(false);
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly queueUpdated$ = new Subject<any>();
  readonly historyUpdated$ = new Subject<any>();
  readonly trackChanged$ = new Subject<NowPlayingTrack>();

  connect(roomSlug: string, token: string = ''): void {
    this.currentRoomSlug = roomSlug;
    this.currentToken = token;
    this.shouldReconnect = true;

    this.disconnect();

    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // ex: localhost:4200 (através do proxy Nginx)
    const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${protocol}//${host}/ws?room=${encodeURIComponent(roomSlug)}${tokenQuery}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected.set(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[WS] Erro ao processar mensagem JSON:', e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected.set(false);
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        this.isConnected.set(false);
      };
    } catch (e) {
      console.error('[WS] Erro ao iniciar conexão:', e);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected.set(false);
  }

  setChatMessages(messages: ChatMessage[]): void {
    this.chatMessages.set(messages);
  }

  send(type: string, payload: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type,
        room_id: this.currentRoomSlug,
        payload,
        timestamp: Date.now()
      }));
    }
  }

  sendChatMessage(nickname: string, avatarUrl: string, text: string): void {
    this.send('chat_message', {
      userNickname: nickname,
      userAvatar: avatarUrl,
      text,
      timestamp: Date.now()
    });
  }

  sendTrackEnded(youtubeId: string): void {
    this.send('track_ended', {
      youtube_id: youtubeId,
      youtubeId: youtubeId
    });
  }

  handleMessage(msg: WebSocketMessage): void {
    switch (msg.type) {
      case 'listeners_count':
        if (msg.payload && typeof msg.payload.count === 'number') {
          this.radioState.setListenersCount(msg.payload.count);
        }
        break;

      case 'track_changed':
        if (msg.payload) {
          const state = msg.payload;
          const track = state.current_track;
          if (track) {
            const nowPlaying: NowPlayingTrack = {
              queueId: track.id || track.youtube_id,
              youtubeId: track.youtube_id,
              title: track.title,
              channel: track.channel_title || 'Artista',
              coverUrl: track.thumbnail_url || '/assets/mock/queen.jpg',
              durationSeconds: track.duration_seconds || state.duration_seconds,
              startedAtUnixMilli: state.started_at_unix_milli || Date.now(),
              startedAt: state.started_at_unix_milli || Date.now(),
              currentOffsetSeconds: state.elapsed_seconds || 0,
              addedBy: 'DJ Bot'
            };
            this.radioState.setNowPlaying(nowPlaying);
            this.trackChanged$.next(nowPlaying);
          }
        }
        break;

      case 'track_duration_updated':
        if (msg.payload && typeof msg.payload.durationSeconds === 'number') {
          const newDur = msg.payload.durationSeconds;
          const current = this.radioState.nowPlaying();
          if (current && (!msg.payload.youtubeId || current.youtubeId === msg.payload.youtubeId)) {
            this.radioState.nowPlaying.update(curr => curr ? { ...curr, durationSeconds: newDur } : null);
          }
        }
        break;

      case 'vote_updated':
        if (msg.payload) {
          const state = msg.payload;
          this.radioState.skipVotes.set({
            current: state.skip_votes_count || 0,
            required: state.skip_votes_required || 1,
            votedUserIds: []
          });
        }
        break;

      case 'queue_updated':
        if (msg.payload) {
          const item = msg.payload;
          if (item.action || !item.track) {
            // Ações de fila (avanço, lote, remoção, troca): notifica assinantes para sincronização
            this.queueUpdated$.next(msg.payload);
          } else {
            const currentQueue = this.radioState.queueSlice();
            const newTrack: Track = {
              queueId: item.id || item.track?.youtube_id,
              youtubeId: item.track?.youtube_id,
              title: item.track?.title,
              channel: item.track?.channel_title || 'Artista',
              coverUrl: item.track?.thumbnail_url || '/assets/mock/queen.jpg',
              durationSeconds: item.track?.duration_seconds || 180,
              addedBy: item.requested_by?.nickname || 'Ouvinte',
              addedByUserId: item.requested_by?.id
            };
            this.radioState.setQueue([...currentQueue, newTrack]);
            this.queueUpdated$.next(msg.payload);
          }
        }
        break;

      case 'history_updated':
        if (msg.payload) {
          this.historyUpdated$.next(msg.payload);
        }
        break;

      case 'chat_message':
        if (msg.payload) {
          const chatMsg: ChatMessage = {
            id: 'msg_' + Date.now(),
            userNickname: msg.payload.userNickname || 'Ouvinte',
            userAvatar: msg.payload.userAvatar || '/assets/avatars/retro-1.png',
            text: msg.payload.text || '',
            timestamp: msg.payload.timestamp || Date.now()
          };
          this.chatMessages.update(msgs => [...msgs, chatMsg]);
        }
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.shouldReconnect) {
        this.connect(this.currentRoomSlug, this.currentToken);
      }
    }, 3000);
  }
}
