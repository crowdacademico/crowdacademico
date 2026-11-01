import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

// Marca avisos do sino como lidos, só os da própria conta (pol_notificacao_update, 04, e o GRANT só de lida_em, 06).
// Marcar de novo um aviso já lido não muda a data da primeira leitura.
@Injectable()
export class NotificacaoInternaServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async marcarLida(idNotificacao: number): Promise<void> {
    await sql`
      UPDATE notificacao SET lida_em = NOW()
      WHERE id_notificacao = ${idNotificacao} AND canal = 'interna'
        AND id_usuario = public.id_usuario_atual() AND lida_em IS NULL
    `.execute(this.database.getDb());
  }

  async marcarTodas(): Promise<void> {
    await sql`
      UPDATE notificacao SET lida_em = NOW()
      WHERE canal = 'interna' AND id_usuario = public.id_usuario_atual() AND lida_em IS NULL
    `.execute(this.database.getDb());
  }
}
