import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { sql } from 'kysely';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { UsuarioServiceFindOne } from '../../1-usuario/service/usuario.service.findone';
import { ConfiguracaoValorService } from '../../commons/configuracao/configuracao-valor.service';
import { DatabaseService } from '../../commons/database/database.service';
import {
  CHAVE_CONFIG_REFRESH_TOKEN_DIAS_VALIDADE,
  CHAVE_CONFIG_SESSAO_PAINEL_HORAS_VALIDADE,
  PAPEIS_SEM_PAINEL,
  SESSAO_PAINEL_HORAS_VALIDADE_PADRAO,
  CUSTO_BCRYPT_REFRESH_TOKEN,
  CAMPOS_LOGIN_RECUSADO,
  MENSAGEM_LOGIN_RECUSADO,
  REFRESH_TOKEN_DIAS_VALIDADE_PADRAO,
  REFRESH_TOKEN_SEPARADOR,
} from '../constants/auth.constants';
import { AuthRequestLogin } from '../dto/request/auth.request-login';
import { AuthResponseLogin } from '../dto/response/auth.response-login';
import { AuthResponseExclusaoAgendada } from '../dto/response/auth.response-exclusao-agendada';
import { formatarDataHoraBr } from '../util/auth.util.format-date-time';

// Linha devolvida por conta_exclusao_agendada (03, [03-O]).
export interface ContaExclusaoAgendada {
  id_usuario: number;
  senha_hash: string | null;
  bloqueado_ate: Date | null;
  exclusao_definitiva_em: Date;
}

// A mesma resposta para e-mail sem conta e senha errada (ver MENSAGEM_LOGIN_RECUSADO).
const loginRecusado = () =>
  new UnauthorizedException({
    statusCode: 401,
    error: 'Unauthorized',
    message: MENSAGEM_LOGIN_RECUSADO,
    campos: CAMPOS_LOGIN_RECUSADO,
  });

@Injectable()
export class AuthServiceLogin {
  constructor(
    private readonly database: DatabaseService,
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
    private readonly usuarioServiceFindOne: UsuarioServiceFindOne,
    private readonly configuracaoValor: ConfiguracaoValorService,
  ) {}

  async executar(
    dto: AuthRequestLogin,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthResponseLogin | AuthResponseExclusaoAgendada> {
    const db = this.database.getDb();

    // Só esta query, no módulo inteiro, lê senha_hash - de propósito, nunca
    // via USUARIO_COLUNAS_SELECT (que exclui a coluna pra qualquer outro
    // service). pol_usuario_select (04) já esconde deletado=TRUE mesmo pra
    // anônimo, então conta excluída cai no mesmo MENSAGEM_LOGIN_RECUSADO
    // de e-mail errado - não vaza se a conta existe ou não.
    const usuario = await db
      .selectFrom('usuario')
      .select(['id_usuario', 'senha_hash', 'bloqueado_ate'])
      .where('email', '=', dto.email)
      .executeTakeFirst();

    if (!usuario) {
      return this.entrarNaContaComExclusaoAgendada(dto, ip, userAgent);
    }

    await this.barrarContaImpedida(usuario.id_usuario, usuario.bloqueado_ate);

    // Conta criada pelo Google que ainda não tem senha (18-11-2026): a mesma resposta vaga de senha errada, mas sem
    // contar falha. Não há senha a adivinhar, e contar falhas deixaria qualquer um bloquear a conta (o bloqueio
    // também barra o login pelo Google). A pessoa cria uma senha pela recuperação de senha.
    if (usuario.senha_hash === null) {
      throw loginRecusado();
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senha_hash);
    if (!senhaValida) {
      // Conexão PRÓPRIA do pool, fora da transação da requisição: o 401 logo abaixo faz o GlobalDbInterceptor
      // dar ROLLBACK, e a falha registrada dentro da transação sumiria junto (o bloqueio do RF-005 nunca
      // chegaria). SECURITY DEFINER (03_funcoes_seguranca.sql), roda sem sessão; p_id_usuario vem do e-mail já
      // consultado acima, nunca de um parâmetro cru do cliente.
      await this.pool.query('SELECT public.registrar_falha_login($1)', [
        usuario.id_usuario,
      ]);
      throw loginRecusado();
    }

    return this.abrirSessao(usuario.id_usuario, ip, userAgent);
  }

  // Prazo de carência da exclusão (22-11-2026). A conta que a própria pessoa excluiu some da busca acima (a RLS
  // esconde conta excluída); aqui ela é procurada por conta_exclusao_agendada (03, [03-O]). Mesmas regras do login
  // comum (bloqueio, suspensão, senha errada conta falha) e a mesma resposta vaga quando não há conta: só quem
  // acerta a senha fica sabendo da exclusão agendada.
  private async entrarNaContaComExclusaoAgendada(
    dto: AuthRequestLogin,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthResponseLogin | AuthResponseExclusaoAgendada> {
    const conta = await this.buscarExclusaoAgendada(dto.email, null);
    if (!conta || conta.senha_hash === null) {
      throw loginRecusado();
    }

    await this.barrarContaImpedida(conta.id_usuario, conta.bloqueado_ate);

    const senhaValida = await bcrypt.compare(dto.senha, conta.senha_hash);
    if (!senhaValida) {
      // Fora da transação da requisição, pelo mesmo motivo do login comum (o 401 dá ROLLBACK).
      await this.pool.query('SELECT public.registrar_falha_login($1)', [
        conta.id_usuario,
      ]);
      throw loginRecusado();
    }

    return this.responderExclusaoAgendada(conta, dto.reativar, ip, userAgent);
  }

  // Procura a conta com exclusão agendada pelo e-mail ou pelo identificador da conta Google (usado também pelo
  // login com Google). Só aparece a conta que a própria pessoa excluiu e que ainda está dentro do prazo.
  async buscarExclusaoAgendada(
    email: string,
    googleSub: string | null,
  ): Promise<ContaExclusaoAgendada | undefined> {
    const resultado = await sql<ContaExclusaoAgendada>`
      SELECT * FROM public.conta_exclusao_agendada(${email}, ${googleSub})
    `.execute(this.database.getDb());
    return resultado.rows[0];
  }

  // A identidade já foi conferida (senha ou Google). Sem `reativar`, devolve a data para o modal; com ele, desfaz a
  // exclusão e abre a sessão normalmente, na mesma transação.
  async responderExclusaoAgendada(
    conta: ContaExclusaoAgendada,
    reativar: boolean | undefined,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthResponseLogin | AuthResponseExclusaoAgendada> {
    if (!reativar) {
      return {
        exclusaoAgendada: true,
        exclusaoDefinitivaEm: conta.exclusao_definitiva_em.toISOString(),
      };
    }

    const resultado = await sql<{ reativada: boolean }>`
      SELECT public.reativar_conta_usuario(${conta.id_usuario}) AS reativada
    `.execute(this.database.getDb());
    // FALSE só se o prazo acabou entre o modal e o clique: a conta não existe mais para o login.
    if (!resultado.rows[0]?.reativada) {
      throw loginRecusado();
    }
    // De novo, agora com a conta visível: com ela excluída, a RLS escondia a suspensão de moderação, e excluir e
    // reativar não pode servir para escapar dela. Se barrar, o erro desfaz a reativação junto (mesma transação).
    await this.barrarContaImpedida(conta.id_usuario);
    return this.abrirSessao(conta.id_usuario, ip, userAgent);
  }

  // O que barra a entrada de uma conta que já foi identificada, pela senha ou pelo Google (18-11-2026): o bloqueio
  // automático por senha errada repetida e a suspensão de moderação. `bloqueadoAte` vem de quem já leu a linha (o
  // login por senha); sem ele, a função lê.
  async barrarContaImpedida(
    idUsuario: number,
    bloqueadoAte?: Date | null,
  ): Promise<void> {
    const bloqueio =
      bloqueadoAte !== undefined
        ? bloqueadoAte
        : ((
            await this.database
              .getDb()
              .selectFrom('usuario')
              .select('bloqueado_ate')
              .where('id_usuario', '=', idUsuario)
              .executeTakeFirst()
          )?.bloqueado_ate ?? null);
    if (bloqueio && bloqueio > new Date()) {
      throw new UnauthorizedException(
        `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente após ${formatarDataHoraBr(bloqueio)}.`,
      );
    }

    // Suspensão de MODERAÇÃO: conceito diferente de bloqueado_ate acima (ver comentário completo em
    // usuario.suspenso_ate, 01_extensoes_enums_tabelas.sql [01-D]). 403, não 401: a pessoa não errou credencial
    // nenhuma, a CONTA é que está impedida, e precisa saber por quê (diferente do MENSAGEM_LOGIN_RECUSADO
    // deliberadamente vago).
    const suspensao = await this.buscarSuspensao(idUsuario);
    if (suspensao.suspensoAte && suspensao.suspensoAte > new Date()) {
      throw new ForbiddenException(
        `Conta suspensa até ${formatarDataHoraBr(suspensao.suspensoAte)}

Motivo: ${suspensao.motivoSuspensao}`,
      );
    }
  }

  // A conta passou por tudo: registra o login e devolve a sessão. A mesma resposta para senha e Google.
  async abrirSessao(
    idUsuario: number,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthResponseLogin> {
    const db = this.database.getDb();
    await sql`SELECT public.registrar_login_sucesso(${idUsuario}, ${ip ?? null})`.execute(
      db,
    );

    const { accessToken, refreshToken, aceitePendente } =
      await this.emitirTokens(idUsuario, ip, userAgent, 'login');

    const usuarioResponse =
      await this.usuarioServiceFindOne.executar(idUsuario);
    const papeis = await this.listarPapeis(idUsuario);
    const permissoes = await this.listarPermissoes(idUsuario);

    return {
      accessToken,
      refreshToken,
      usuario: usuarioResponse,
      papeis,
      permissoes,
      aceitePendente,
    };
  }

  // Reaproveitado por AuthServiceRefresh: a suspensão barra o login e também a renovação silenciosa. Um erro
  // aqui sobe (500) e o login não passa: uma regra de segurança falha fechada, nunca "ninguém está suspenso".
  async buscarSuspensao(
    idUsuario: number,
  ): Promise<{ suspensoAte: Date | null; motivoSuspensao: string | null }> {
    const linha = await this.database
      .getDb()
      .selectFrom('usuario')
      .select(['suspenso_ate', 'motivo_suspensao'])
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();
    return {
      suspensoAte: linha?.suspenso_ate ?? null,
      motivoSuspensao: linha?.motivo_suspensao ?? null,
    };
  }

  // Reaproveitado por AuthServiceRefresh (mesmo raciocínio de emitirTokens logo abaixo): um lugar só para essa
  // consulta, chamada tanto no login quanto na renovação silenciosa.
  async listarPapeis(idUsuario: number): Promise<string[]> {
    const resultado = await sql<{
      listar_papeis_usuario: string;
    }>`SELECT * FROM listar_papeis_usuario(${idUsuario})`.execute(
      this.database.getDb(),
    );
    return resultado.rows.map((linha) => linha.listar_papeis_usuario);
  }

  // Irmã de listarPapeis (17-11-2026): as permissões que os papéis dão, para o painel esconder o que a conta não usa.
  async listarPermissoes(idUsuario: number): Promise<string[]> {
    const resultado = await sql<{
      listar_permissoes_usuario: string;
    }>`SELECT * FROM listar_permissoes_usuario(${idUsuario})`.execute(
      this.database.getDb(),
    );
    return resultado.rows.map((linha) => linha.listar_permissoes_usuario);
  }

  // RF-015: a conta ainda não aceitou a versão vigente do Termo de Uso. Um erro aqui sobe: a pessoa nunca pula o
  // aceite porque a consulta falhou.
  async termoPendente(idUsuario: number): Promise<boolean> {
    const resultado = await sql<{
      id_termo: number | null;
    }>`SELECT public.fn_termo_uso_pendente(${idUsuario}) AS id_termo`.execute(
      this.database.getDb(),
    );
    return resultado.rows[0]?.id_termo != null;
  }

  // Por quantas horas a sessão nova vale (18-11-2026). Conta comum: o prazo comum. Conta do painel (algum papel fora de
  // PAPEIS_SEM_PAINEL): no máximo sessao_painel_horas_validade, contadas de novo a cada renovação, ou seja, horas SEM
  // USO. Assim um computador esquecido com a conta ADMIN aberta não fica entrando por 30 dias. O papel é lido na hora,
  // então quem ganha ou perde um papel muda de prazo na próxima renovação.
  private async horasDeValidade(
    idUsuario: number,
    horasComuns: number,
  ): Promise<number> {
    const papeis = await this.listarPapeis(idUsuario);
    if (papeis.every((papel) => PAPEIS_SEM_PAINEL.includes(papel))) {
      return horasComuns;
    }
    const horasPainel = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_SESSAO_PAINEL_HORAS_VALIDADE,
      SESSAO_PAINEL_HORAS_VALIDADE_PADRAO,
    );
    return horasPainel > 0 ? Math.min(horasComuns, horasPainel) : horasComuns;
  }

  // Reaproveitado por AuthServiceRefresh (rotação de refresh token): mesma lógica de emitir o par
  // access+refresh, só muda de onde é chamado.
  //
  // `origem`: toda RENOVAÇÃO silenciosa (a cada ~15min de uso, token de acesso vencendo) também passa por aqui
  // e também cria uma linha em `sessao`. A tela de "logins anteriores" (Consultar Usuário) lia `sessao`
  // inteira, sem diferenciar renovação de login de verdade, então mostraria dezenas de "logins" que eram só o
  // token se renovando sozinho em segundo plano. `origem` marca qual é qual; usuario.service.findall-logins.ts
  // só mostra 'login'.
  async emitirTokens(
    idUsuario: number,
    ip: string | undefined,
    userAgent: string | undefined,
    origem: 'login' | 'refresh',
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    aceitePendente: boolean;
  }> {
    const db = this.database.getDb();
    const segredo = randomBytes(32).toString('hex');
    const segredoHash = await bcrypt.hash(segredo, CUSTO_BCRYPT_REFRESH_TOKEN);
    // Configurável pelo Painel Admin: cai no padrão hardcoded (30 dias) se a chave não existir/estiver inativa
    // (ver ConfiguracaoValorService).
    const refreshTokenDiasValidade = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_REFRESH_TOKEN_DIAS_VALIDADE,
      REFRESH_TOKEN_DIAS_VALIDADE_PADRAO,
    );
    const horasValidade = await this.horasDeValidade(
      idUsuario,
      refreshTokenDiasValidade * 24,
    );
    const expiraEm = new Date(Date.now() + horasValidade * 60 * 60 * 1000);

    // sessao (pol_sessao_all, USING(true)/WITH CHECK(true)) - gerenciada
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

    // `sid`: sem isso não haveria como saber qual sessao.id_sessao corresponde à aba atual, para marcar "sessão
    // atual" na lista de Sessões Ativas (Minha Conta) e excluí-la de "encerrar todas as outras" (ver
    // usuario-autenticado.interface.ts). Continua consistente depois de uma renovação silenciosa: refresh chama
    // esta MESMA função, que cria uma sessao NOVA e devolve um accessToken novo com o `sid` atualizado; o
    // cliente sempre troca o token inteiro (salvarSessao), nunca fica com um `sid` velho apontando para uma
    // sessao já revogada.
    // `tp`: termo pendente (RF-015), lido pelo AuthGuardJwt e barrado pelo AuthGuardRequireAuth.
    const aceitePendente = await this.termoPendente(idUsuario);
    const accessToken = this.jwtService.sign({
      sub: idUsuario,
      sid: sessao.id_sessao,
      tp: aceitePendente,
    });
    const refreshToken = `${sessao.id_sessao}${REFRESH_TOKEN_SEPARADOR}${segredo}`;

    return { accessToken, refreshToken, aceitePendente };
  }
}
