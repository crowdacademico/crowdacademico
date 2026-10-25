import { Injectable } from '@nestjs/common';
import { ConfiguracaoValorService } from '../../commons/configuracao/configuracao-valor.service';
import { DatabaseService } from '../../commons/database/database.service';
import { TIPO_NOTIFICACAO } from '../../27-notificacao/constants/notificacao.constants';
import { NotificacaoServiceEnqueue } from '../../27-notificacao/service/notificacao.service.enqueue';
import {
  CHAVE_CONFIG_VERIFICACAO_EMAIL_HORAS_VALIDADE,
  VERIFICACAO_EMAIL_HORAS_VALIDADE_PADRAO,
} from '../constants/auth.constants';
import { gerarTokenVerificacaoEmail } from '../util/auth.util.email-verification-token';

// Link de confirmar a conta: o banco guarda só o hash; o token vai no link do e-mail (fila de notificacao, enviada
// por 4-mail). Usado pelo cadastro e pelo reenvio do Suporte. Devolve o token para o cadastro mostrar fora de
// produção.
@Injectable()
export class AuthServiceEmailVerification {
  constructor(
    private readonly database: DatabaseService,
    private readonly configuracaoValor: ConfiguracaoValorService,
    private readonly notificacao: NotificacaoServiceEnqueue,
  ) {}

  async emitir(idUsuario: number): Promise<string> {
    const { token, hash } = gerarTokenVerificacaoEmail();
    // Configurável pelo Painel Admin: cai no padrão (24h) se a chave não existir/estiver inativa (ver
    // ConfiguracaoValorService).
    const horasValidade = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_VERIFICACAO_EMAIL_HORAS_VALIDADE,
      VERIFICACAO_EMAIL_HORAS_VALIDADE_PADRAO,
    );
    await this.database
      .getDb()
      .insertInto('verificacao_email')
      .values({
        id_usuario: idUsuario,
        token_hash: hash,
        expira_em: new Date(Date.now() + horasValidade * 60 * 60 * 1000),
      })
      .execute();
    await this.notificacao.executar(
      idUsuario,
      TIPO_NOTIFICACAO.verificacaoEmail,
      {},
      token,
    );
    return token;
  }
}
