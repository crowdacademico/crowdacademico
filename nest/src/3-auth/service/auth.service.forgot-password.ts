import { Injectable } from '@nestjs/common';
import { ConfiguracaoValorService } from '../../commons/configuracao/configuracao-valor.service';
import { DatabaseService } from '../../commons/database/database.service';
import { TIPO_NOTIFICACAO } from '../../27-notificacao/constants/notificacao.constants';
import { NotificacaoServiceEnqueue } from '../../27-notificacao/service/notificacao.service.enqueue';
import {
  CHAVE_CONFIG_RECUPERACAO_SENHA_MINUTOS_VALIDADE,
  RECUPERACAO_SENHA_MINUTOS_VALIDADE_PADRAO,
} from '../constants/auth.constants';
import { gerarTokenVerificacaoEmail } from '../util/auth.util.email-verification-token';

// "Esqueci minha senha" (RF-006), primeiro passo: grava um token de recuperação para o dono do e-mail. A resposta
// é a mesma exista ou não a conta (não revela quem tem cadastro). O link vai por e-mail (fila de notificacao,
// enviada por 4-mail); fora de produção ele também volta na resposta (`tokenRecuperacaoSenhaDev`), igual ao
// token de verificar e-mail do cadastro.
@Injectable()
export class AuthServiceForgotPassword {
  constructor(
    private readonly database: DatabaseService,
    private readonly configuracaoValor: ConfiguracaoValorService,
    private readonly notificacao: NotificacaoServiceEnqueue,
  ) {}

  async executar(
    email: string,
  ): Promise<{ tokenRecuperacaoSenhaDev: string | null }> {
    const db = this.database.getDb();
    // pol_usuario_select (04) já esconde conta excluída: cai no mesmo caminho de e-mail que não existe.
    const usuario = await db
      .selectFrom('usuario')
      .select('id_usuario')
      .where('email', '=', email)
      .executeTakeFirst();
    if (!usuario) {
      return { tokenRecuperacaoSenhaDev: null };
    }

    // Um link ativo por pessoa (ux_recuperacao_senha_ativo_por_usuario): pedir de novo apaga o anterior não usado.
    await db
      .deleteFrom('recuperacao_senha')
      .where('id_usuario', '=', usuario.id_usuario)
      .where('usado_em', 'is', null)
      .execute();

    const { token, hash } = gerarTokenVerificacaoEmail();
    const minutos = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_RECUPERACAO_SENHA_MINUTOS_VALIDADE,
      RECUPERACAO_SENHA_MINUTOS_VALIDADE_PADRAO,
    );
    await db
      .insertInto('recuperacao_senha')
      .values({
        id_usuario: usuario.id_usuario,
        token_hash: hash,
        expira_em: new Date(Date.now() + minutos * 60 * 1000),
      })
      .execute();
    await this.notificacao.executar(
      usuario.id_usuario,
      TIPO_NOTIFICACAO.recuperacaoSenha,
      { minutos },
      token,
    );

    return {
      tokenRecuperacaoSenhaDev:
        process.env.NODE_ENV === 'production' ? null : token,
    };
  }
}
