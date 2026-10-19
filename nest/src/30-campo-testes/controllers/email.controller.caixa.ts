import {
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
} from '@nestjs/common';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import {
  FakeEmailAdapter,
  type EmailCapturado,
} from '../../4-mail/adapters/fake/fake-email.adapter';
import {
  ENVIO_EMAIL,
  type EnvioEmailPort,
} from '../../4-mail/ports/envio-email.port';

const MENSAGEM_SEM_PERMISSAO =
  'Só quem cuida dos e-mails do sistema vê a caixa de teste.';
const MENSAGEM_SO_FAKE =
  'A caixa de entrada só existe com o provedor de teste (EMAIL_PROVIDER=fake ou vazio).';

// Caixa de entrada do provedor de e-mail de teste: o que o sistema "enviou" sem mandar nada para fora. Exige
// notificacao_processar, como a aba Notificações. Some ao reiniciar o Nest (a caixa mora na memória).
@Controller('campo-testes/email')
export class EmailControllerCaixa {
  constructor(
    @Inject(ENVIO_EMAIL) private readonly envio: EnvioEmailPort,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  @Get()
  async listar(): Promise<EmailCapturado[]> {
    await this.autorizacao.exigirPermissao(
      'notificacao_processar',
      MENSAGEM_SEM_PERMISSAO,
    );
    return this.fake().listar();
  }

  @Delete()
  @HttpCode(204)
  async limpar(): Promise<void> {
    await this.autorizacao.exigirPermissao(
      'notificacao_processar',
      MENSAGEM_SEM_PERMISSAO,
    );
    this.fake().limpar();
  }

  private fake(): FakeEmailAdapter {
    if (!(this.envio instanceof FakeEmailAdapter)) {
      throw new ConflictException(MENSAGEM_SO_FAKE);
    }
    return this.envio;
  }
}
