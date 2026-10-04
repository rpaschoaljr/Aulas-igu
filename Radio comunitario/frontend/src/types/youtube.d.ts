// Tipagem mínima da YouTube IFrame Player API (carregada via script, sem pacote npm).
interface YouTubePlayer {
  loadVideoById(videoId: string, startSeconds?: number): void
  cueVideoById(videoId: string, startSeconds?: number): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  setVolume(volume: number): void
  playVideo(): void
  pauseVideo(): void
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  destroy(): void
}

interface YouTubePlayerOptions {
  videoId?: string
  playerVars?: {
    controls?: number
    rel?: number
    playsinline?: number
    disablekb?: number
    enablejsapi?: number
    origin?: string
  }
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void
    onStateChange?: (event: { data: number }) => void
    onError?: (event: { data: number }) => void
  }
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLElement | string,
    options: YouTubePlayerOptions,
  ) => YouTubePlayer
}

interface Window {
  YT?: YouTubeNamespace
  onYouTubeIframeAPIReady?: () => void
}
