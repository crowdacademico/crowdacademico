import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../commons/database/database.service';
import { AuthRequestRefreshToken } from '../dto/request/auth.request-refresh-token';
import { parseRefreshToken } from './refresh-token.util';

@Injectable()
export class AuthServiceLogout {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: AuthRequestRefreshToken): Promise<void> {
    const parseado = parseRefreshToken(dto.refreshToken);
    if (!parseado) {
      throw new UnauthorizedException('Refresh token mal formado.');
    }

    const db = this.database.getDb();
    const sessao = await db
      .selectFrom('sessao')
      .select(['id_sessao', 'refresh_token_hash'])
      .where('id_sessao', '=', parseado.idSessao)
      .executeTakeFirst();

    if (!sessao) {
      // Já não existe - do ponto de vista de logout, o objetivo (sessão não
      // vale mais nada) já está satisfeito. Não é erro pro cliente.
      return;
    }

    // Confirma o segredo antes de revogar - sem isso, adivinhar um id_sessao
    // (é sequencial, fácil de adivinhar) derrubaria a sessão de outra pessoa.
    const segredoValido = await bcrypt.compare(
      parseado.segredo,
      sessao.refresh_token_hash,
    );
    if (!segredoValido) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    await db
      .updateTable('sessao')
      .set({ revogado_em: new Date() })
      .where('id_sessao', '=', sessao.id_sessao)
      .execute();
  }
}
