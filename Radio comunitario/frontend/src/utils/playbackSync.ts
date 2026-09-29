// Lógica pura de sincronização do player com o "relógio" do backend.
// Mantida separada do hook para ser testável sem depender do YouTube.

// Diferença (em segundos) a partir da qual o player é corrigido com seekTo.
export const DRIFT_THRESHOLD_SECONDS = 2

// Intervalo entre as verificações de drift do player.
export const RESYNC_INTERVAL_MS = 30000

// Segundos decorridos da faixa atual, segundo o relógio do cliente.
// `startedAt` é o instante (ISO 8601) em que a música começou no backend.
export function expectedOffsetSeconds(
  startedAt: string | null,
  now: number,
): number {
  if (!startedAt) return 0
  const startedMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedMs)) return 0
  return Math.max(0, (now - startedMs) / 1000)
}

// Decide se o player precisa ser recolocado no ponto certo.
export function shouldResync(
  expected: number,
  actual: number,
  threshold: number = DRIFT_THRESHOLD_SECONDS,
): boolean {
  return Math.abs(expected - actual) > threshold
}
