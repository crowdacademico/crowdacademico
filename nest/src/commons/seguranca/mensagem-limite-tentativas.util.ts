import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';

// Mensagem do 429 (limite de tentativas) em português e com o tempo de espera, no lugar do padrão em inglês do
// @nestjs/throttler ("ThrottlerException: Too Many Requests"). Vale para toda rota com @Throttle (login,
// cadastro, exportação de dados): o ThrottlerModule é global. `timeToBlockExpire` vem em segundos (o mesmo
// número do cabeçalho Retry-After).
export function mensagemLimiteTentativas(
  _contexto: ExecutionContext,
  detalhe: ThrottlerLimitDetail,
): string {
  const segundos = Math.max(1, Math.ceil(detalhe.timeToBlockExpire));
  const minutos = Math.ceil(segundos / 60);
  const horas = Math.ceil(minutos / 60);
  const espera =
    segundos < 60
      ? `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`
      : minutos < 60
        ? `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`
        : `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return `Muitas tentativas em sequência. Tente de novo em ${espera}.`;
}
