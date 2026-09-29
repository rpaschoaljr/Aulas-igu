// Códigos de erro da YouTube IFrame Player API que significam que o vídeo
// realmente não pode ser reproduzido (removido, privado ou sem permissão de
// incorporação). Erros transitórios (ex.: 2, 5) são ignorados para evitar
// falso aviso enquanto a música está tocando.
const FATAL_ERROR_CODES = new Set([100, 101, 150])

export function isFatalPlaybackError(code: number): boolean {
  return FATAL_ERROR_CODES.has(code)
}
