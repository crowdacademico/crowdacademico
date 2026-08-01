import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthServiceLogin } from './auth.service.login';
import { DatabaseService } from '../../commons/database/database.service';
import { RefreshTokenRequestDto } from '../dto/request/refresh-token.request.dto';
import { RefreshResponseDto } from '../dto/response/refresh.response.dto';
import { parseRefreshToken } from './refresh-token.util';

@Injectable()
export class AuthServiceRefresh {
  constructor(
    private readonly database: DatabaseService,
    private readonly authServiceLogin: AuthServiceLogin,
  ) {}

  async executar(
    dto: RefreshTokenRequestDto,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<RefreshResponseDto> {
    const parseado = parseRefreshToken(dto.refreshToken);
    if (!parseado) {
      throw new UnauthorizedException('Refresh token mal formado.');
    }

    const db = this.database.getDb();
    // sessao tem policy USING(true) — qualquer requisição enxerga qualquer
    // linha; a segurança de verdade é o bcrypt.compare abaixo, não a RLS.
    const sessao = await db
      .selectFrom('sessao')
      .select([
        'id_sessao',
        'id_usuario',
        'refresh_token_hash',
        'expira_em',
        'revogado_em',
      ])
      .where('id_sessao', '=', parseado.idSessao)
      .executeTakeFirst();

    if (
      !sessao ||
      sessao.revogado_em !== null ||
      sessao.expira_em < new Date()
    ) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const segredoValido = await bcrypt.compare(
      parseado.segredo,
      sessao.refresh_token_hash,
    );
    if (!segredoValido) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    // Rotação: revoga a sessão usada e emite um par novo — impede reuso do
    // mesmo refresh token depois de consumido (se alguém roubar um token já
    // usado, ele já não vale mais nada).
    await db
      .updateTable('sessao')
      .set({ revogado_em: new Date() })
      .where('id_sessao', '=', sessao.id_sessao)
      .execute();

    return this.authServiceLogin.emitirTokens(sessao.id_usuario, ip, userAgent);
  }
}
