// Declarações de tipo para o YouTube IFrame Player API

export enum YTPlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}

export interface YTPlayerOptions {
  width?: string | number;
  height?: string | number;
  videoId?: string;
  playerVars?: {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    enablejsapi?: 0 | 1;
    fs?: 0 | 1;
    iv_load_policy?: 1 | 3;
    loop?: 0 | 1;
    modestbranding?: 0 | 1;
    origin?: string;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
    start?: number;
    [key: string]: any;
  };
  events?: {
    onReady?: (event: { target: YTPlayerInstance }) => void;
    onStateChange?: (event: { data: YTPlayerState; target: YTPlayerInstance }) => void;
    onError?: (event: { data: number; target: YTPlayerInstance }) => void;
  };
}

export interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  getPlayerState(): YTPlayerState;
  getCurrentTime(): number;
  getDuration(): number;
  loadVideoById(options: { videoId: string; startSeconds?: number } | string, startSeconds?: number): void;
  cueVideoById(options: { videoId: string; startSeconds?: number } | string, startSeconds?: number): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string | HTMLElement, options: YTPlayerOptions) => YTPlayerInstance;
      PlayerState: typeof YTPlayerState;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
