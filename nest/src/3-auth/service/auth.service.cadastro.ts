import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { UsuarioServiceCreate } from '../../1-usuario/service/usuario.service.create';
import { TermoUsoServiceAtivo } from '../../5-termo-uso/service/termo-uso.service.ativo';
import { DatabaseService } from '../../commons/database/database.service';
import { VERIFICACAO_EMAIL_HORAS_VALIDADE } from '../constants/auth.constants';
import { AuthRequestRegister } from '../dto/request/auth.request-register';
import { AuthResponseRegister } from '../dto/response/auth.response-register';
import { AuthServiceLogin } from './auth.service.login';
import { gerarTokenVerificacaoEmail } from './verificacao-email-token.util';

// Cadastro público (09-08-2026, Bloco D do prompt do Claude Web) — reaproveita
// UsuarioServiceCreate (a MESMA criação que POST /usuario admin já usa: hash
// de senha + INSERT + atribuir_papel_padrao()) e soma o que só faz sentido
// aqui: gravar o aceite do termo ATIVO (nunca um id vindo do cliente), gerar
// o token de verificação de e-mail, e já devolver tokens de sessão —
// diferente de "admin cria um usuário pra outra pessoa" (criar-usuario.jsx),
// aqui é a própria pessoa se cadastrando, então termina logada.
@Injectable()
export class AuthServiceCadastro {
  constructor(
    private readonly database: DatabaseService,
    private readonly usuarioServiceCreate: UsuarioServiceCreate,
    private readonly termoUsoServiceAtivo: TermoUsoServiceAtivo,
    private readonly authServiceLogin: AuthServiceLogin,
  ) {}

  async executar(
    dto: AuthRequestRegister,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthResponseRegister> {
    const usuario = await this.usuarioServiceCreate.executar({
      nome: dto.nome,
      email: dto.email,
      senha: dto.senha,
    });

    const db = this.database.getDb();

    // Resolvido pelo SERVIDOR, nunca aceito do corpo da requisição — ver
    // comentário de registrar_aceite_termo() (03_funcoes_seguranca.sql,
    // [03-D-1]) sobre por que isso importa.
    const termoAtivo = await this.termoUsoServiceAtivo.executar();
    await sql`SELECT public.registrar_aceite_termo(${usuario.idUsuario}, ${termoAtivo.idTermo}, ${ip ?? null})`.execute(
      db,
    );

    // Token de verificação de e-mail (09-08-2026) — gerado e gravado desde
    // já, mesmo sem 4-mail existir pra enviar de verdade. tokenVerificacao
    // EmailDev só viaja no corpo da resposta fora de produção (ver
    // controller) — em produção, a linha em verificacao_email existe do
    // mesmo jeito, só que ninguém recebe o token ainda (nada de fingir que
    // um e-mail foi mandado).
    const { token, hash } = gerarTokenVerificacaoEmail();
    const expiraEm = new Date(
      Date.now() + VERIFICACAO_EMAIL_HORAS_VALIDADE * 60 * 60 * 1000,
    );
    await db
      .insertInto('verificacao_email')
      .values({
        id_usuario: usuario.idUsuario,
        token_hash: hash,
        expira_em: expiraEm,
      })
      .execute();

    const { accessToken, refreshToken } =
      await this.authServiceLogin.emitirTokens(
        usuario.idUsuario,
        ip,
        userAgent,
        'login',
      );
    const papeis = await this.authServiceLogin.listarPapeis(usuario.idUsuario);

    return {
      accessToken,
      refreshToken,
      usuario,
      papeis,
      tokenVerificacaoEmailDev:
        process.env.NODE_ENV === 'production' ? null : token,
    };
  }
}
