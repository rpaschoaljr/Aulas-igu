import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface FrontendErrorPayload {
  source?: string;
  error_type: string;
  message: string;
  stack_trace?: string;
  room_id?: string;
  endpoint?: string;
  payload?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorLoggerService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/errors/log';

  /**
   * Envia registro de erro do frontend para persistência no banco de dados
   */
  logError(payload: FrontendErrorPayload): Observable<any> {
    console.error(`[AUDIT-LOG ${payload.error_type}]`, payload.message, payload);

    const body: FrontendErrorPayload = {
      source: 'frontend',
      error_type: payload.error_type || 'FRONTEND_RUNTIME_ERROR',
      message: payload.message || 'Erro não especificado no frontend',
      stack_trace: payload.stack_trace || (new Error().stack || ''),
      room_id: payload.room_id || 'pop-hits',
      endpoint: payload.endpoint || window.location.pathname,
      payload: payload.payload || null
    };

    return this.http.post(this.endpoint, body).pipe(
      catchError(err => {
        console.warn('[AUDIT-LOG] Falha ao enviar log de erro ao backend:', err);
        return of(null);
      })
    );
  }

  /**
   * Registra mensagem informativa ou de diagnóstico no console e opcionalmente no servidor
   */
  logInfo(context: string, message: string, details?: any): void {
    console.log(`[${context}]`, message, details || '');
  }
}
