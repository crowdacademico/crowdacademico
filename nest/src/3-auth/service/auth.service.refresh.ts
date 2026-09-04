import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthServiceLogin } from './auth.service.login';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioServiceFindOne } from '../../1-usuario/service/usuario.service.findone';
import { AuthRequestRefreshToken } from '../dto/request/auth.request-refresh-token';
import { AuthResponseRefresh } from '../dto/response/auth.response-refresh';
import { parseRefreshToken } from './refresh-token.util';

@Injectable()
export class AuthServiceRefresh {
  constructor(
    private readonly database: DatabaseService,
    private readonly authServiceLogin: AuthServiceLogin,
    private readonly usuarioServiceFindOne: UsuarioServiceFindOne,
  ) {}

  async executar(
    dto: AuthRequestRefreshToken,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthResponseRefresh> {
    const parseado = parseRefreshToken(dto.refreshToken);
    if (!parseado) {
      throw new UnauthorizedException('Refresh token mal formado.');
    }

    const db = this.database.getDb();
    // sessao tem policy USING(true) - qualquer requisição enxerga qualquer
    // linha; a segurança de verdade é o bcrypt.compare abaixo, não a RLS.
    //
    // .forUpdate() (07-08-2026, achado do Lucas: linhas duplicadas em
    // `sessao`, criado_em idêntico até o milissegundo, nenhuma revogada) -
    // sem isso, duas renovações concorrentes com o MESMO refresh token
    // (aconteceu bastante: várias abas, ou uma tela que dispara N buscas de
    // uma vez com o token já vencido) liam revogado_em = NULL AO MESMO
    // TEMPO, as duas passavam pelo teste abaixo, e as duas criavam sessão
    // nova a partir do MESMO token - exatamente o par de linhas idênticas
    // que apareceu no histórico. Cada requisição já roda dentro da própria
    // transação (GlobalDbInterceptor) - FOR UPDATE trava esta linha até a
    // 1ª transação terminar; a 2ª só lê DEPOIS, já vendo revogado_em
    // preenchido, e cai certinho no "Refresh token inválido ou expirado."
    // logo abaixo, em vez de duplicar.
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
      .forUpdate()
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

    // Rotação: revoga a sessão usada e emite um par novo - impede reuso do
    // mesmo refresh token depois de consumido (se alguém roubar um token já
    // usado, ele já não vale mais nada).
    await db
      .updateTable('sessao')
      .set({ revogado_em: new Date() })
      .where('id_sessao', '=', sessao.id_sessao)
      .execute();

    const { accessToken, refreshToken } =
      await this.authServiceLogin.emitirTokens(
        sessao.id_usuario,
        ip,
        userAgent,
        'refresh',
      );
    const usuario = await this.usuarioServiceFindOne.executar(
      sessao.id_usuario,
    );
    const papeis = await this.authServiceLogin.listarPapeis(sessao.id_usuario);

    return { accessToken, refreshToken, usuario, papeis };
  }
}
