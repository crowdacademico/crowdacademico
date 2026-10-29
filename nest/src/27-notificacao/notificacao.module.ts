import { Module } from '@nestjs/common';
import { NotificacaoControllerFindAll } from './controllers/notificacao.controller.findall';
import { NotificacaoInternaController } from './controllers/notificacao-interna.controller';
import { NotificacaoConfiguracaoController } from './controllers/notificacao-configuracao.controller';
import { NotificacaoControllerResend } from './controllers/notificacao.controller.resend';
import { NotificacaoInternaService } from './service/notificacao-interna.service';
import { NotificacaoConfiguracaoService } from './service/notificacao-configuracao.service';
import { NotificacaoServiceCancel } from './service/notificacao.service.cancel';
import { NotificacaoServiceEnqueue } from './service/notificacao.service.enqueue';
import { NotificacaoServiceFindAll } from './service/notificacao.service.findall';
import { NotificacaoServiceResend } from './service/notificacao.service.resend';
import { NotificacaoServiceSummary } from './service/notificacao.service.summary';

// E-mails e notificações internas. O banco decide, por regra_notificacao, quais canais cada evento gera e já grava a fila
// de e-mail (processada pelo módulo 4-mail) e o sino (lido por NotificacaoInternaService) na mesma transação do evento;
// o texto vem de modelo_mensagem, que o admin muda pela configuração criando novas versões. Não há worker do sino.
@Module({
  controllers: [
    NotificacaoControllerFindAll,
    NotificacaoControllerResend,
    NotificacaoInternaController,
    NotificacaoConfiguracaoController,
  ],
  providers: [
    NotificacaoServiceFindAll,
    NotificacaoInternaService,
    NotificacaoConfiguracaoService,
    NotificacaoServiceSummary,
    NotificacaoServiceResend,
    NotificacaoServiceCancel,
    NotificacaoServiceEnqueue,
  ],
  exports: [NotificacaoServiceEnqueue],
})
export class NotificacaoModule {}
