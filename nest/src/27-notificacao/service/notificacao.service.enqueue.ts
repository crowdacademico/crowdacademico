import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { cifrarSegredoEmail } from '../../commons/seguranca/segredo-email-cifra.util';
import {
  CHAVE_SEGREDO_NOTIFICACAO,
  type TipoNotificacao,
} from '../constants/notificacao.constants';

// Para o que só o Nest sabe (o token do link de verificar a conta e de recuperar a senha). O resto dos e-mails nasce
// nos gatilhos do banco ([05-Q]). Roda na transação da requisição: se a ação for desfeita, o e-mail some junto.
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
