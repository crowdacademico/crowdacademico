import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { sql } from 'kysely';
import { UsuarioServiceFindOne } from '../../1-usuario/service/usuario.service.findone';
import { DatabaseService } from '../../commons/database/database.service';
import {
  CUSTO_BCRYPT_REFRESH_TOKEN,
  REFRESH_TOKEN_DIAS_VALIDADE,
  REFRESH_TOKEN_SEPARADOR,
} from '../constants/auth.constants';
import { LoginRequestDto } from '../dto/request/login.request.dto';
import { LoginResponseDto } from '../dto/response/login.response.dto';

@Injectable()
export class AuthServiceLogin {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly usuarioServiceFindOne: UsuarioServiceFindOne,
  ) {}

  async executar(
    dto: LoginRequestDto,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<LoginResponseDto> {
    const db = this.database.getDb();

    // Só esta query, no módulo inteiro, lê senha_hash — de propósito, nunca
    // via USUARIO_COLUNAS_SELECT (que exclui a coluna pra qualquer outro
    // service). pol_usuario_select (04) já esconde deletado=TRUE mesmo pra
    // anônimo, então conta excluída cai no mesmo "Credenciais inválidas"
    // de e-mail errado — não vaza se a conta existe ou não.
    const usuario = await db
      .selectFrom('usuario')
      .select(['id_usuario', 'senha_hash', 'bloqueado_ate'])
      .where('email', '=', dto.email)
      .executeTakeFirst();

    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (usuario.bloqueado_ate && usuario.bloqueado_ate > new Date()) {
      throw new UnauthorizedException(
        `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente após ${usuario.bloqueado_ate.toISOString()}.`,
      );
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senha_hash);
    if (!senhaValida) {
      // SECURITY DEFINER (03_funcoes_seguranca.sql) — roda antes de existir
      // sessão (id_usuario_atual() é NULL neste momento), por isso não passa
      // pela RLS normal de UPDATE em usuario. p_id_usuario vem do e-mail já
      // consultado acima, nunca de um parâmetro cru do cliente.
      await sql`SELECT public.registrar_falha_login(${usuario.id_usuario})`.execute(
        db,
      );
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await sql`SELECT public.registrar_login_sucesso(${usuario.id_usuario}, ${ip ?? null})`.execute(
      db,
    );

    const { accessToken, refreshToken } = await this.emitirTokens(
      usuario.id_usuario,
      ip,
      userAgent,
      'login',
    );

    const usuarioResponse = await this.usuarioServiceFindOne.executar(
      usuario.id_usuario,
    );

    return { accessToken, refreshToken, usuario: usuarioResponse };
  }

  // Reaproveitado por AuthServiceRefresh (rotação de refresh token) — mesma
  // lógica de emitir o par access+refresh, só muda de onde é chamado.
  //
  // `origem` (07-08-2026, achado do Lucas: "não fiz tantos logs de login
  // assim"): toda RENOVAÇÃO silenciosa (a cada ~15min de uso, token de
  // acesso vencendo) também passa por aqui e também cria uma linha em
  // `sessao` — sempre criou, desde o início. A tela de "logins anteriores"
  // (consultar-usuario.jsx) lia `sessao` inteira, sem diferenciar renovação
  // de login de verdade, então mostrava dezenas de "logins" que eram só o
  // token se renovando sozinho em segundo plano. `origem` marca qual é
  // qual; usuario.service.listar-logins.ts agora só mostra 'login'.
  async emitirTokens(
    idUsuario: number,
    ip: string | undefined,
    userAgent: string | undefined,
    origem: 'login' | 'refresh',
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const db = this.database.getDb();
    const segredo = randomBytes(32).toString('hex');
    const segredoHash = await bcrypt.hash(segredo, CUSTO_BCRYPT_REFRESH_TOKEN);
    const expiraEm = new Date(
      Date.now() + REFRESH_TOKEN_DIAS_VALIDADE * 24 * 60 * 60 * 1000,
    );

    // sessao (pol_sessao_all, USING(true)/WITH CHECK(true)) — gerenciada
    // inteiramente pelo backend, não por RLS por dono; a "autorização" de
    // verdade é o bcrypt.compare do segredo, feito em quem consome o token.
    const sessao = await db
      .insertInto('sessao')
      .values({
        id_usuario: idUsuario,
        refresh_token_hash: segredoHash,
        expira_em: expiraEm,
        ip: ip ?? null,
        user_agent: userAgent ?? null,
        origem,
      })
      .returning('id_sessao')
      .executeTakeFirstOrThrow();

    const accessToken = this.jwtService.sign({ sub: idUsuario });
    const refreshToken = `${sessao.id_sessao}${REFRESH_TOKEN_SEPARADOR}${segredo}`;

    return { accessToken, refreshToken };
  }
}
