import { Injectable, UnauthorizedException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { hashTokenVerificacaoEmail } from './verificacao-email-token.util';

@Injectable()
export class AuthServiceVerificarEmail {
  constructor(private readonly database: DatabaseService) {}

  async executar(token: string): Promise<void> {
    const hash = hashTokenVerificacaoEmail(token);
    // confirmar_email_por_token (03_funcoes_seguranca.sql, [03-O]) — o
    // token/hash É a autorização, não precisa de sessão. Roda antes de
    // existir login em muitos casos (link clicado direto do e-mail, numa
    // aba sem sessão nenhuma).
    const resultado = await sql<{
      confirmar_email_por_token: boolean;
    }>`SELECT public.confirmar_email_por_token(${hash})`.execute(
      this.database.getDb(),
    );

    const confirmou = resultado.rows[0]?.confirmar_email_por_token === true;
    if (!confirmou) {
      throw new UnauthorizedException(
        'Link de verificação inválido, expirado ou já usado.',
      );
    }
  }
}
