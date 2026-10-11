import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorLoggerService } from './error-logger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(ErrorLoggerService);

  handleError(error: any): void {
    const message = error?.message || error?.toString() || 'Erro não identificado';
    const stack = error?.stack || '';

    console.error('[GLOBAL ERROR HANDLER]', message, error);

    this.logger.logError({
      error_type: 'UNHANDLED_EXCEPTION',
      message: `[Front-End Crash/Exception] ${message}`,
      stack_trace: stack,
      payload: { raw: String(error) }
    }).subscribe();
  }
}
