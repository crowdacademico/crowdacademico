import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { formatarDataHoraBr } from '../util/auth.util.format-date-time';
import { AuthServiceLogin } from './auth.service.login';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioServiceFindOne } from '../../1-usuario/service/usuario.service.findone';
import { AuthRequestRefreshToken } from '../dto/request/auth.request-refresh-token';
import { parseRefreshToken } from '../util/auth.util.refresh-token';
import { AuthResponseLogin } from '../dto/response/auth.response-login';

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
  ): Promise<AuthResponseLogin> {
    const parseado = parseRefreshToken(dto.refreshToken);
    if (!parseado) {
      throw new UnauthorizedException('Refresh token mal formado.');
    }

    const db = this.database.getDb();
    // sessao tem policy USING(true): qualquer requisição enxerga qualquer linha; a segurança de verdade é o
    // bcrypt.compare abaixo, não a RLS.
    //
    // .forUpdate(): sem isso, duas renovações concorrentes com o MESMO refresh token (acontece bastante: várias
    // abas, ou uma tela que dispara N buscas de uma vez com o token já vencido) leriam revogado_em = NULL AO
    // MESMO TEMPO, as duas passariam pelo teste abaixo, e as duas criariam sessão nova a partir do MESMO token
    // (linhas idênticas no histórico). Cada requisição já roda dentro da própria transação
    // (GlobalDbInterceptor): FOR UPDATE trava esta linha até a 1ª transação terminar; a 2ª só lê DEPOIS, já
    // vendo revogado_em preenchido, e cai certinho no "Refresh token inválido ou expirado." logo abaixo, em vez
    // de duplicar.
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

    // A conta precisa continuar podendo entrar: excluída ou suspensa não renova (a suspensão e a exclusão já
    // encerram as sessões no banco; isto cobre qualquer sessão que tenha escapado). Sobra só o token de acesso
    // de até 15 minutos que já estava na mão, caso-limite aceito (é o padrão de mercado para JWT).
    const conta = await db
      .selectFrom('usuario')
      .select('id_usuario')
      .where('id_usuario', '=', sessao.id_usuario)
      .where('deletado', '=', false)
      .executeTakeFirst();
    if (!conta) {
      throw new UnauthorizedException(
        'Sessão encerrada: esta conta não existe mais.',
      );
    }
    const suspensao = await this.authServiceLogin.buscarSuspensao(
      sessao.id_usuario,
    );
    if (suspensao.suspensoAte && suspensao.suspensoAte > new Date()) {
      throw new ForbiddenException(
        `Conta suspensa até ${formatarDataHoraBr(suspensao.suspensoAte)}\n\nMotivo: ${suspensao.motivoSuspensao}`,
      );
    }

    // Rotação: revoga a sessão usada e emite um par novo - impede reuso do
    // mesmo refresh token depois de consumido (se alguém roubar um token já
    // usado, ele já não vale mais nada).
    await db
      .updateTable('sessao')
      .set({ revogado_em: new Date() })
      .where('id_sessao', '=', sessao.id_sessao)
      .execute();

    const { accessToken, refreshToken, aceitePendente } =
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

    return { accessToken, refreshToken, usuario, papeis, aceitePendente };
  }
}
