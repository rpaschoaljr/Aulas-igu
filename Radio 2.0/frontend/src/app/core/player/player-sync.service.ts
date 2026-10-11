import { Injectable, inject, signal } from '@angular/core';
import { RadioStateService } from '../radio/radio-state.service';

@Injectable({
  providedIn: 'root'
})
export class PlayerSyncService {
  private readonly radioState = inject(RadioStateService);
  private readonly maxDriftThresholdSeconds = 3.5; // Desvio máximo tolerado antes de forçar seekTo (com histerese)
  private readonly cooldownDurationMs = 7000; // 7 segundos de carência pós-seek para carregar áudio sem looping

  private lastSeekTimestamp = 0;
  private consecutiveDriftCount = 0;
  private isBufferingState = false;

  // Offset de tempo atual em segundos sincronizado
  readonly currentPlaybackSeconds = signal<number>(0);

  calculateDrift(localPlayerCurrentTimeSeconds: number): number {
    const serverTime = this.getServerCurrentTimeSeconds();
    return Math.abs(serverTime - localPlayerCurrentTimeSeconds);
  }

  setBuffering(buffering: boolean): void {
    this.isBufferingState = buffering;
    if (buffering) {
      this.consecutiveDriftCount = 0;
    }
  }

  isBuffering(): boolean {
    return this.isBufferingState;
  }

  recordSeek(): void {
    this.lastSeekTimestamp = Date.now();
    this.consecutiveDriftCount = 0;
  }

  isInCooldown(): boolean {
    return (Date.now() - this.lastSeekTimestamp) < this.cooldownDurationMs;
  }

  /**
   * Decide se deve forçar resync via seekTo.
   * @param localPlayerCurrentTimeSeconds tempo atual do player local
   * @param isImmediate se for true (ex: syncTrack inicial/troca de faixa), avalia sem esperar ticks consecutivos
   */
  shouldResync(localPlayerCurrentTimeSeconds: number, isImmediate: boolean = true): boolean {
    // Se o player está em buffering ou em cooldown de recarga de áudio, bloqueia seek para evitar loop infinito
    if (!isImmediate && (this.isBufferingState || this.isInCooldown())) {
      return false;
    }

    const drift = this.calculateDrift(localPlayerCurrentTimeSeconds);
    if (drift <= this.maxDriftThresholdSeconds) {
      this.consecutiveDriftCount = 0;
      return false;
    }

    // No modo imediato (chamadas diretas ou testes), retorna imediatamente
    if (isImmediate) {
      return true;
    }

    // No modo periódico do ticker (a cada 1s):
    // Exige 3 confirmações consecutivas de desvio persistente para evitar falso-positivo durante transição de frames
    this.consecutiveDriftCount++;
    if (this.consecutiveDriftCount >= 3) {
      return true;
    }

    return false;
  }

  getServerCurrentTimeSeconds(): number {
    const track = this.radioState.nowPlaying();
    if (!track) return 0;
    
    // Normaliza timestamp de início para milissegundos
    const startMilli = track.startedAtUnixMilli || 
      (track.startedAt ? (track.startedAt < 10000000000 ? track.startedAt * 1000 : track.startedAt) : Date.now());

    const elapsedOnServer = Math.max(0, Math.floor((Date.now() - startMilli) / 1000));
    return Math.min(track.durationSeconds, elapsedOnServer);
  }

  // Regra Inegociável da Rádio: Não existe pause!
  canPause(): boolean {
    return false;
  }
}
