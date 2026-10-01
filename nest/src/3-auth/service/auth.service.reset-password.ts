import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { sql } from 'kysely';
import { CUSTO_BCRYPT_SENHA } from '../../1-usuario/constants/usuario.constants';
import { DatabaseService } from '../../commons/database/database.service';
import { hashTokenVerificacaoEmail } from '../util/auth.util.email-verification-token';

// "Esqueci minha senha", segundo passo: o link aberto troca a senha. redefinir_senha_por_token (03, [03-O]) faz
// tudo numa transação: usa o token (uma vez só), troca a senha, zera o bloqueio por senha errada e encerra as
// sessões abertas do dono. O token é a autorização, não precisa de sessão.
@Injectable()
export class AuthServiceResetPassword {
  constructor(private readonly database: DatabaseService) {}

  async executar(token: string, senha: string): Promise<void> {
    const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT_SENHA);
    const resultado = await sql<{
      redefinir_senha_por_token: boolean;
    }>`SELECT public.redefinir_senha_por_token(${hashTokenVerificacaoEmail(token)}, ${senhaHash})`.execute(
      this.database.getDb(),
    );
    // 400, não 401: mesmo motivo de AuthServiceVerifyEmail (o link é que não serve).
    if (resultado.rows[0]?.redefinir_senha_por_token !== true) {
      throw new BadRequestException(
        'Link de redefinição inválido, expirado ou já usado. Peça um novo.',
      );
    }
  }
}
