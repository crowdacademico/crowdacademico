import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

// Tratamento manual do RF-121. Permissão e situação são do banco (reenviar_notificacao, 05 [05-Q]): 92039 vira 403,
// 91054 vira 409 e 90039 vira 400 pelo PostgresExceptionFilter.
@Injectable()
export class NotificacaoServiceResend {
  constructor(private readonly database: DatabaseService) {}

  async executar(idNotificacao: number): Promise<void> {
    await sql`SELECT public.reenviar_notificacao(${idNotificacao}::int)`.execute(
      this.database.getDb(),
    );
  }
}
