import { BadRequestException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { hashTokenVerificacaoEmail } from '../util/auth.util.email-verification-token';

@Injectable()
export class AuthServiceVerifyEmail {
  constructor(private readonly database: DatabaseService) {}

  async executar(token: string): Promise<void> {
    const hash = hashTokenVerificacaoEmail(token);
    // confirmar_email_por_token (03_funcoes_seguranca.sql, [03-O]) - o
    // token/hash É a autorização, não precisa de sessão. Roda antes de
    // existir login em muitos casos (link clicado direto do e-mail, numa
    // aba sem sessão nenhuma).
    const resultado = await sql<{
      confirmar_email_por_token: boolean;
    }>`SELECT public.confirmar_email_por_token(${hash})`.execute(
      this.database.getDb(),
    );

    const confirmou = resultado.rows[0]?.confirmar_email_por_token === true;
    // 400, não 401: a pessoa não está "sem login", o link é que não serve (401 faria a tela tentar renovar sessão).
    if (!confirmou) {
      throw new BadRequestException(
        'Link de verificação inválido, expirado ou já usado.',
      );
    }
  }
}
