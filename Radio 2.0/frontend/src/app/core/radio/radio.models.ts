export interface Track {
  queueId: string;
  youtubeId: string;
  title: string;
  channel: string;
  durationSeconds: number;
  coverUrl?: string;
  addedBy: string;
  addedByUserId?: string;
  isDjTrack?: boolean;
}

export interface NowPlayingTrack extends Track {
  startedAtUnixMilli?: number;
  startedAt?: number;
  currentOffsetSeconds: number;
}

export interface SkipVoteStatus {
  current: number;
  required: number;
  votedUserIds: string[];
}

export interface RadioRoom {
  id: string;
  name: string;
  listenersCount: number;
  isLive: boolean;
  coverUrl: string;
}
