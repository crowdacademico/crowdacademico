import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { UsuarioServiceCreate } from '../../1-usuario/service/usuario.service.create';
import { TermoUsoServiceFindActive } from '../../5-termo-uso/service/termo-uso.service.find-active';
import { DatabaseService } from '../../commons/database/database.service';
import { AuthRequestRegister } from '../dto/request/auth.request-register';
import { AuthResponseRegister } from '../dto/response/auth.response-register';
import { AuthServiceEmailVerification } from './auth.service.email-verification';
import { AuthServiceLogin } from './auth.service.login';

// Cadastro público: reaproveita UsuarioServiceCreate (a MESMA criação que POST /usuario admin usa: hash de
// senha + INSERT + atribuir_papel_padrao()) e soma o que só faz sentido aqui: gravar o aceite do termo ATIVO
// (nunca um id vindo do cliente), gerar o token de verificação de e-mail, e já devolver tokens de sessão.
// Diferente de "admin cria um usuário para outra pessoa": aqui é a própria pessoa se cadastrando, então termina
// logada.
@Injectable()
export class AuthServiceRegister {
  constructor(
    private readonly database: DatabaseService,
    private readonly usuarioServiceCreate: UsuarioServiceCreate,
    private readonly termoUsoServiceAtivo: TermoUsoServiceFindActive,
    private readonly authServiceLogin: AuthServiceLogin,
    private readonly verificacaoEmail: AuthServiceEmailVerification,
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

    // Resolvido pelo SERVIDOR, nunca aceito do corpo da requisição (ver comentário de registrar_aceite_termo(),
    // 03_funcoes_seguranca.sql, [03-D-1], sobre por que isso importa). `'cadastro'` explícito: o cadastro
    // aceita o termo da conta, nunca o de "upgrade_pesquisador".
    const termoAtivo = await this.termoUsoServiceAtivo.executar('cadastro');
    await sql`SELECT public.registrar_aceite_termo(${usuario.idUsuario}, ${termoAtivo.idTermo}, ${ip ?? null})`.execute(
      db,
    );

    // Link de confirmar a conta (AuthServiceEmailVerification). tokenVerificacaoEmailDev continua na resposta fora
    // de produção (ver controller), para testar sem abrir a caixa de entrada.
    const token = await this.verificacaoEmail.emitir(usuario.idUsuario);

    const { accessToken, refreshToken, aceitePendente } =
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
      aceitePendente,
      tokenVerificacaoEmailDev:
        process.env.NODE_ENV === 'production' ? null : token,
    };
  }
}
