import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { sql } from 'kysely';
import { UsuarioServiceFindOne } from '../../1-usuario/service/usuario.service.findone';
import { ConfiguracaoValorService } from '../../commons/configuracao/configuracao-valor.service';
import { DatabaseService } from '../../commons/database/database.service';
import {
  CHAVE_CONFIG_REFRESH_TOKEN_DIAS_VALIDADE,
  CUSTO_BCRYPT_REFRESH_TOKEN,
  REFRESH_TOKEN_DIAS_VALIDADE_PADRAO,
  REFRESH_TOKEN_SEPARADOR,
} from '../constants/auth.constants';
import { AuthRequestLogin } from '../dto/request/auth.request-login';
import { AuthResponseLogin } from '../dto/response/auth.response-login';

// toISOString() cru ("...T00:28:27.382Z") não significa nada pra quem não
// programa (pedido do Lucas, 09-08-2026: "eu não sei o que significa T ou
// Z") - as duas mensagens de bloqueio/suspensão abaixo são as únicas do
// projeto que embutem uma data DENTRO de uma frase de erro (todo resto do
// app formata no React com toLocaleString('pt-BR'), mas aqui a data já
// precisa estar pronta dentro do texto do throw). timeZone explícito (não
// o padrão do processo Node) porque o servidor pode rodar em UTC mesmo o
// público sendo brasileiro.
function formatarDataHoraBr(data: Date): string {
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
  const horaFormatada = data.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dataFormatada} - ${horaFormatada}`;
}

@Injectable()
export class AuthServiceLogin {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly usuarioServiceFindOne: UsuarioServiceFindOne,
    private readonly configuracaoValor: ConfiguracaoValorService,
  ) {}

  async executar(
    dto: AuthRequestLogin,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthResponseLogin> {
    const db = this.database.getDb();

    // Só esta query, no módulo inteiro, lê senha_hash - de propósito, nunca
    // via USUARIO_COLUNAS_SELECT (que exclui a coluna pra qualquer outro
    // service). pol_usuario_select (04) já esconde deletado=TRUE mesmo pra
    // anônimo, então conta excluída cai no mesmo "Credenciais inválidas"
    // de e-mail errado - não vaza se a conta existe ou não.
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
        `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente após ${formatarDataHoraBr(usuario.bloqueado_ate)}.`,
      );
    }

    // Suspensão de MODERAÇÃO (09-08-2026, Bloco G) - conceito diferente de
    // bloqueado_ate acima (ver comentário completo em usuario.suspenso_ate,
    // 01_extensoes_enums_tabelas.sql [01-D]). 403, não 401: a pessoa não
    // errou credencial nenhuma, a CONTA é que está impedida - precisa saber
    // por quê, diferente do "Credenciais inválidas" deliberadamente vago.
    //
    // ⚠️ Consulta separada (não junto do SELECT acima) e protegida por
    // SAVEPOINT de propósito - mesmo bug já corrigido uma vez neste mesmo
    // arquivo (ver comentário grande em listarPapeis, embaixo): as colunas
    // suspenso_ate/motivo_suspensao só existem de verdade depois de alguém
    // colar ATUALIZAR O SUPABASE.sql no SQL Editor (Bloco G, PENDENCIAS e
    // correcoes.md item 22). Até lá, um SELECT direto nelas quebraria
    // LOGIN INTEIRO com 500 - confirmado ao vivo (09-08-2026) tentando
    // logar antes da migração ter rodado. Falha graciosamente: sem as
    // colunas, ninguém está suspenso (mesma coisa que sempre foi).
    const suspensao = await this.buscarSuspensao(usuario.id_usuario);
    if (suspensao.suspensoAte && suspensao.suspensoAte > new Date()) {
      throw new ForbiddenException(
        `Conta suspensa até ${formatarDataHoraBr(suspensao.suspensoAte)}\n\nMotivo: ${suspensao.motivoSuspensao}`,
      );
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senha_hash);
    if (!senhaValida) {
      // SECURITY DEFINER (03_funcoes_seguranca.sql) - roda antes de existir
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
    const papeis = await this.listarPapeis(usuario.id_usuario);

    return { accessToken, refreshToken, usuario: usuarioResponse, papeis };
  }

  // Ver comentário de chamada em executar() acima - SAVEPOINT protege o
  // resto da transação (tokens, sessao) de um erro "coluna não existe"
  // enquanto a migração do Bloco G não rodou no banco de produção.
  async buscarSuspensao(
    idUsuario: number,
  ): Promise<{ suspensoAte: Date | null; motivoSuspensao: string | null }> {
    const db = this.database.getDb();
    await sql`SAVEPOINT sp_buscar_suspensao`.execute(db);
    try {
      const linha = await sql<{
        suspenso_ate: Date | null;
        motivo_suspensao: string | null;
      }>`SELECT suspenso_ate, motivo_suspensao FROM usuario WHERE id_usuario = ${idUsuario}`.execute(
        db,
      );
      return {
        suspensoAte: linha.rows[0]?.suspenso_ate ?? null,
        motivoSuspensao: linha.rows[0]?.motivo_suspensao ?? null,
      };
    } catch {
      await sql`ROLLBACK TO SAVEPOINT sp_buscar_suspensao`.execute(db);
      return { suspensoAte: null, motivoSuspensao: null };
    }
  }

  // Reaproveitado por AuthServiceRefresh - mesmo raciocínio de emitirTokens
  // logo abaixo: um lugar só pra essa consulta, chamada tanto no login
  // quanto na renovação silenciosa.
  //
  // ⚠️ BUG REAL achado e corrigido no mesmo dia (09-08-2026): a 1ª versão
  // disto era um try/catch simples devolvendo [] se listar_papeis_usuario()
  // não existisse (ver PENDENCIAS e correcoes.md, item 22 - a função só
  // existe de verdade depois de alguém colar ATUALIZAR O SUPABASE.sql no
  // SQL Editor). Isso pareceu funcionar (login voltava 200 com papeis: [])
  // mas SILENCIOSAMENTE FAZIA O LOGIN INTEIRO NÃO PERSISTIR NADA: um erro
  // de Postgres deixa a TRANSAÇÃO inteira "abortada" até um ROLLBACK de
  // verdade - pegar a exceção em JavaScript não desfaz isso. O
  // client.query('COMMIT') do GlobalDbInterceptor, chamado depois, virava
  // silenciosamente um ROLLBACK (Postgres troca COMMIT por ROLLBACK sozinho
  // numa transação abortada) - sessao/ultimo_login_em, tudo que a mesma
  // requisição tinha gravado antes, sumia, mesmo a resposta HTTP voltando
  // 200 com dado que parecia certo (lido DENTRO da transação, antes dela
  // abortar). Só descobri rodando um GET /auth/sessoes logo depois de um
  // login e vendo a lista vazia, e confirmei instrumentando o interceptor.
  // Fix de verdade: SAVEPOINT ao redor SÓ desta chamada arriscada - se
  // listar_papeis_usuario() falhar, ROLLBACK TO SAVEPOINT desfaz só ela,
  // sem abortar a transação inteira (KyselySingleConnectionDialect não tem
  // db.transaction() com savepoint, por isso é SQL cru aqui, não o Kysely
  // .transaction()).
  async listarPapeis(idUsuario: number): Promise<string[]> {
    const db = this.database.getDb();
    await sql`SAVEPOINT sp_listar_papeis`.execute(db);
    try {
      const resultado = await sql<{
        listar_papeis_usuario: string;
      }>`SELECT * FROM listar_papeis_usuario(${idUsuario})`.execute(db);
      return resultado.rows.map((linha) => linha.listar_papeis_usuario);
    } catch {
      await sql`ROLLBACK TO SAVEPOINT sp_listar_papeis`.execute(db);
      return [];
    }
  }

  // Reaproveitado por AuthServiceRefresh (rotação de refresh token) - mesma
  // lógica de emitir o par access+refresh, só muda de onde é chamado.
  //
  // `origem` (07-08-2026, achado do Lucas: "não fiz tantos logs de login
  // assim"): toda RENOVAÇÃO silenciosa (a cada ~15min de uso, token de
  // acesso vencendo) também passa por aqui e também cria uma linha em
  // `sessao` - sempre criou, desde o início. A tela de "logins anteriores"
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
    // Configurável pelo Painel Admin desde 04-09-2026 - cai no padrão
    // hardcoded (30 dias) se a chave não existir/estiver inativa (ver
    // ConfiguracaoValorService).
    const refreshTokenDiasValidade = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_REFRESH_TOKEN_DIAS_VALIDADE,
      REFRESH_TOKEN_DIAS_VALIDADE_PADRAO,
    );
    const expiraEm = new Date(
      Date.now() + refreshTokenDiasValidade * 24 * 60 * 60 * 1000,
    );

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

    // `sid` (09-08-2026, Bloco E - Sessões Ativas em Minha Conta): sem isso
    // não tinha como saber qual sessao.id_sessao corresponde à aba atual,
    // pra marcar "sessão atual" na lista e excluí-la de "encerrar todas as
    // outras" (ver usuario-autenticado.interface.ts). Continua consistente
    // depois de uma renovação silenciosa: refresh chama esta MESMA função,
    // que cria uma sessao NOVA e devolve um accessToken novo com o `sid`
    // atualizado - o cliente sempre troca o token inteiro (salvarSessao),
    // nunca fica com um `sid` velho apontando pra uma sessao já revogada.
    const accessToken = this.jwtService.sign({
      sub: idUsuario,
      sid: sessao.id_sessao,
    });
    const refreshToken = `${sessao.id_sessao}${REFRESH_TOKEN_SEPARADOR}${segredo}`;

    return { accessToken, refreshToken };
  }
}
