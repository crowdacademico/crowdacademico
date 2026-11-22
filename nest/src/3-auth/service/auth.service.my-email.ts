import { ConflictException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AuthServiceEmailVerification } from './auth.service.email-verification';

// Bloqueio parcial do e-mail não confirmado (22-11-2026): o que a própria pessoa faz com o próprio e-mail enquanto não
// confirma. Reenviar o link (o aviso do topo da página) e corrigir o endereço (Minha Conta). O reenvio do painel,
// para outra conta, continua em AuthServiceResendVerification, com permissão.
@Injectable()
export class AuthServiceMyEmail {
  constructor(
    private readonly database: DatabaseService,
    private readonly verificacaoEmail: AuthServiceEmailVerification,
  ) {}

  async reenviar(idUsuario: number): Promise<void> {
    const db = this.database.getDb();
    const usuario = await db
      .selectFrom('usuario')
      .select('email_verificado')
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();
    if (usuario?.email_verificado) {
      throw new ConflictException('Este e-mail já foi confirmado.');
    }
    await db
      .deleteFrom('verificacao_email')
      .where('id_usuario', '=', idUsuario)
      .where('confirmado_em', 'is', null)
      .execute();
    await this.verificacaoEmail.emitir(idUsuario);
  }

  // A função do banco confere que o e-mail ainda não foi confirmado e apaga os links antigos; o link novo vai para o
  // endereço novo.
  async alterar(idUsuario: number, email: string): Promise<void> {
    await sql`SELECT public.alterar_email_nao_confirmado(${email})`.execute(
      this.database.getDb(),
    );
    await this.verificacaoEmail.emitir(idUsuario);
  }
}
