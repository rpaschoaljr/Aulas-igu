// Tipagem mínima da YouTube IFrame Player API (carregada via script, sem pacote npm).
interface YouTubePlayer {
  loadVideoById(videoId: string): void
  cueVideoById(videoId: string, startSeconds?: number): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  playVideo(): void
  pauseVideo(): void
  destroy(): void
}

interface YouTubePlayerOptions {
  videoId?: string
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void
    onStateChange?: (event: { data: number }) => void
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
