import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

// Tratamento manual do RF-121: um e-mail que não deve mais sair. Mesmas regras de reenviar (cancelar_notificacao, 05).
@Injectable()
export class NotificacaoServiceCancel {
  constructor(private readonly database: DatabaseService) {}

  async executar(idNotificacao: number): Promise<void> {
    await sql`SELECT public.cancelar_notificacao(${idNotificacao}::int)`.execute(
      this.database.getDb(),
    );
  }
}
