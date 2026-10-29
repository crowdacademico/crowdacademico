import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { cifrarSegredoEmail } from '../../commons/seguranca/segredo-email-cifra.util';
import {
  CHAVE_SEGREDO_NOTIFICACAO,
  type TipoNotificacao,
} from '../constants/notificacao.constants';

// Para eventos que só o Nest conhece (token de verificação e recuperação). A função SQL decide, pelas regras ativas,
// se o evento gera e-mail, notificação interna ou ambos. Roda na transação da requisição: se a ação for desfeita, as
// entradas dos canais também são desfeitas.
@Injectable()
export class NotificacaoServiceEnqueue {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idUsuario: number,
    tipo: TipoNotificacao,
    dados: Record<string, unknown> = {},
    segredo?: string,
  ): Promise<number | null> {
    const completo = segredo
      ? { ...dados, [CHAVE_SEGREDO_NOTIFICACAO]: cifrarSegredoEmail(segredo) }
      : dados;
    const resultado = await sql<{ id: number | null }>`
      SELECT public.enfileirar_notificacao(${idUsuario}::int, ${tipo}::varchar, ${JSON.stringify(completo)}::jsonb) AS id
    `.execute(this.database.getDb());
    return resultado.rows[0]?.id ?? null;
  }
}
