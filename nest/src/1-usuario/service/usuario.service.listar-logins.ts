import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { UsuarioResponseLoginHistorico } from '../dto/response/usuario.response-login-historico';

@Injectable()
export class UsuarioServiceListarLogins {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  // Mais recente primeiro: o front decide o que fazer com o 1º item (Consultar Usuário mostra ele separado,
  // vindo de usuario.ultimo_login_em; esta lista existe para o "resto" do histórico).
  //
  // origem = 'login': sem este filtro, toda renovação silenciosa do token de acesso (a cada ~15min de uso
  // normal) também apareceria aqui como se fosse um login novo. Ver comentário completo em
  // auth.service.login.ts.
  async executar(idUsuario: number): Promise<UsuarioResponseLoginHistorico[]> {
    // `sessao` é lida por qualquer sessão (o refresh precisa achar o token antes de existir usuário atual), então
    // a RLS não protege o histórico de login: só o próprio usuário ou quem tem usuario_visualizar_sensivel.
    await this.autorizacao.exigirProprioOuPermissao(
      idUsuario,
      'usuario_visualizar_sensivel',
      'Você só pode ver o seu próprio histórico de login.',
    );
    const linhas = await this.database
      .getDb()
      .selectFrom('sessao')
      .select(['criado_em'])
      .where('id_usuario', '=', idUsuario)
      .where('origem', '=', 'login')
      .orderBy('criado_em', 'desc')
      .execute();

    return linhas.map((linha) => ({ logadoEm: linha.criado_em }));
  }
}
