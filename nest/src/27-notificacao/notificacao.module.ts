import { Module } from '@nestjs/common';
import { NotificacaoControllerFindAll } from './controllers/notificacao.controller.findall';
import { NotificacaoControllerResend } from './controllers/notificacao.controller.resend';
import { NotificacaoServiceCancel } from './service/notificacao.service.cancel';
import { NotificacaoServiceEnqueue } from './service/notificacao.service.enqueue';
import { NotificacaoServiceFindAll } from './service/notificacao.service.findall';
import { NotificacaoServiceResend } from './service/notificacao.service.resend';
import { NotificacaoServiceSummary } from './service/notificacao.service.summary';

// O registro dos e-mails (RF-121): a lista do painel e o tratamento manual. Quem ENVIA é 4-mail; quem enfileira são
// os gatilhos do banco e, para o que só o Nest sabe, NotificacaoServiceEnqueue (exportado).
@Module({
  controllers: [NotificacaoControllerFindAll, NotificacaoControllerResend],
  providers: [
    NotificacaoServiceFindAll,
    NotificacaoServiceSummary,
    NotificacaoServiceResend,
    NotificacaoServiceCancel,
    NotificacaoServiceEnqueue,
  ],
  exports: [NotificacaoServiceEnqueue],
})
export class NotificacaoModule {}
