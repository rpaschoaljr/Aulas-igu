import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiRoom {
  id: string;
  slug: string;
  name: string;
  normalized_name: string;
  description: string;
  cover_url: string;
  is_live: boolean;
  created_at: string;
}

export interface ApiTrack {
  id?: string;
  youtube_id: string;
  title: string;
  normalized_title?: string;
  channel_title: string;
  duration_seconds: number;
  thumbnail_url?: string;
  source?: string;
}

export interface ApiQueueItem {
  id: string;
  room_id: string;
  position: number;
  status: string;
  requested_by?: {
    id: string;
    nickname: string;
    avatar_url?: string;
  };
  track: ApiTrack;
  created_at: string;
}

export interface ApiChatMessage {
  id: string;
  room_id: string;
  user_id?: string;
  user_nickname: string;
  normalized_user_nickname: string;
  user_avatar: string;
  message_text: string;
  created_at: string;
}

export interface ApiHistoryItem {
  id: string;
  room_id: string;
  youtube_id: string;
  title: string;
  channel: string;
  duration_seconds: number;
  cover_url: string;
  user_nickname?: string;
  was_skipped: boolean;
  played_at: string;
}

export interface ApiRoomStatus {
  room: ApiRoom;
  state: {
    room_id: string;
    current_track: ApiTrack;
    started_at_unix_milli: number;
    server_timestamp: number;
    elapsed_seconds: number;
    duration_seconds: number;
    skip_votes_count: number;
    skip_votes_required: number;
  } | null;
  listeners: number;
  server_now: number;
}

export interface ApiAuthResponse {
  user: {
    id: string;
    nickname: string;
    avatar_url: string;
    role: string;
    is_guest: boolean;
    email?: string;
  };
  token: string;
}

export interface BatchRejectedItem {
  youtube_id: string;
  title: string;
  reason: string;
}

export interface ApiUserQuota {
  room_slug: string;
  user_id: string;
  active_tracks: number;
  max_quota: number;
  can_request: boolean;
  authenticated: boolean;
}

export interface BatchQueueResponse {
  success_count: number;
  failed_count: number;
  enqueued_items: ApiQueueItem[];
  rejected: BatchRejectedItem[];
  user_quota?: ApiUserQuota;
}

export interface ApiUserFavoriteTrack {
  track: ApiTrack;
  request_count: number;
  last_requested_at: string;
  is_user_favorite: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RadioApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getRooms(): Observable<ApiRoom[]> {
    return this.http.get<ApiRoom[]>(`${this.baseUrl}/radio/rooms`);
  }

  getRoomStatus(roomSlug: string): Observable<ApiRoomStatus> {
    const params = new HttpParams().set('room', roomSlug);
    return this.http.get<ApiRoomStatus>(`${this.baseUrl}/radio/status`, { params });
  }

  getQueue(roomSlug: string, limit = 20, offset = 0): Observable<ApiQueueItem[]> {
    let params = new HttpParams().set('room', roomSlug).set('limit', limit.toString());
    if (offset > 0) {
      params = params.set('offset', offset.toString());
    }
    return this.http.get<ApiQueueItem[]>(`${this.baseUrl}/radio/queue`, { params });
  }

  getChatMessages(roomSlug: string): Observable<ApiChatMessage[]> {
    const params = new HttpParams().set('room', roomSlug);
    return this.http.get<ApiChatMessage[]>(`${this.baseUrl}/radio/chat`, { params });
  }

  getHistory(roomSlug: string, limit = 20, offset = 0): Observable<ApiHistoryItem[]> {
    let params = new HttpParams().set('room', roomSlug).set('limit', limit.toString());
    if (offset > 0) {
      params = params.set('offset', offset.toString());
    }
    return this.http.get<ApiHistoryItem[]>(`${this.baseUrl}/radio/history`, { params });
  }

  getUserFavorites(roomSlug: string, limit = 6, token?: string): Observable<ApiUserFavoriteTrack[]> {
    let params = new HttpParams().set('room', roomSlug).set('limit', limit.toString());
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get<ApiUserFavoriteTrack[]>(`${this.baseUrl}/radio/user-favorites`, { params, headers });
  }

  addToQueue(roomSlug: string, track: ApiTrack, token?: string): Observable<ApiQueueItem> {
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<ApiQueueItem>(
      `${this.baseUrl}/radio/queue`,
      { room_slug: roomSlug, track },
      { headers }
    );
  }

  addToQueueBatch(roomSlug: string, tracks: ApiTrack[], token?: string): Observable<BatchQueueResponse> {
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<BatchQueueResponse>(
      `${this.baseUrl}/radio/queue/batch`,
      { room_slug: roomSlug, tracks },
      { headers }
    );
  }

  getUserQuota(roomSlug: string, token?: string): Observable<ApiUserQuota> {
    const params = new HttpParams().set('room', roomSlug);
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get<ApiUserQuota>(`${this.baseUrl}/radio/user-quota`, { params, headers });
  }

  voteSkip(roomSlug: string, token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<any>(
      `${this.baseUrl}/radio/vote-skip`,
      { room_slug: roomSlug },
      { headers }
    );
  }

  searchYouTube(query: string): Observable<ApiTrack[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<ApiTrack[]>(`${this.baseUrl}/youtube/search`, { params });
  }

  loginGuest(nickname: string, avatarUrl: string): Observable<ApiAuthResponse> {
    return this.http.post<ApiAuthResponse>(
      `${this.baseUrl}/auth/guest`,
      { nickname, avatar_url: avatarUrl }
    );
  }

  checkNickname(nickname: string): Observable<{ available: boolean; message: string }> {
    const params = new HttpParams().set('nickname', nickname);
    return this.http.get<{ available: boolean; message: string }>(`${this.baseUrl}/auth/check-nickname`, { params });
  }

  getGoogleClientId(): Observable<{ client_id: string }> {
    return this.http.get<{ client_id: string }>(`${this.baseUrl}/auth/google/client-id`);
  }

  loginGoogle(payload: { email: string; name: string; avatar_url: string; token?: string; google_id?: string }): Observable<ApiAuthResponse> {
    return this.http.post<ApiAuthResponse>(`${this.baseUrl}/auth/google`, payload);
  }

  removeFromQueue(roomSlug: string, queueId: string, token?: string): Observable<any> {
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<any>(
      `${this.baseUrl}/radio/queue/remove`,
      { room_slug: roomSlug, queue_id: queueId },
      { headers }
    );
  }

  swapQueueTrack(roomSlug: string, queueId: string, track: ApiTrack, token?: string): Observable<any> {
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<any>(
      `${this.baseUrl}/radio/queue/swap`,
      { room_slug: roomSlug, queue_id: queueId, track },
      { headers }
    );
  }

  logError(errorData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/errors/log`, errorData);
  }
}
