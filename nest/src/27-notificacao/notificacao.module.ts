import { Module } from '@nestjs/common';
import { ModeloMensagemControllerFindAll } from './controllers/modelo-mensagem.controller.findall';
import { ModeloMensagemControllerUpdate } from './controllers/modelo-mensagem.controller.update';
import { NotificacaoInternaControllerFindAll } from './controllers/notificacao-interna.controller.findall';
import { NotificacaoInternaControllerUpdate } from './controllers/notificacao-interna.controller.update';
import { NotificacaoControllerFindAll } from './controllers/notificacao.controller.findall';
import { NotificacaoControllerResend } from './controllers/notificacao.controller.resend';
import { ModeloMensagemServiceFindAll } from './service/modelo-mensagem.service.findall';
import { ModeloMensagemServiceUpdate } from './service/modelo-mensagem.service.update';
import { NotificacaoInternaServiceFindAll } from './service/notificacao-interna.service.findall';
import { NotificacaoInternaServiceUpdate } from './service/notificacao-interna.service.update';
import { NotificacaoServiceCancel } from './service/notificacao.service.cancel';
import { NotificacaoServiceEnqueue } from './service/notificacao.service.enqueue';
import { NotificacaoServiceFindAll } from './service/notificacao.service.findall';
import { NotificacaoServiceResend } from './service/notificacao.service.resend';
import { NotificacaoServiceSummary } from './service/notificacao.service.summary';

// Os avisos do sistema: o registro dos e-mails (RF-121) com o tratamento manual, o sino do painel e o texto de cada
// aviso (modelo_mensagem). Quem ENVIA o e-mail é 4-mail; quem enfileira são os gatilhos do banco e, para o que só o
// Nest sabe, NotificacaoServiceEnqueue (exportado).
@Module({
  controllers: [
    NotificacaoControllerFindAll,
    NotificacaoControllerResend,
    NotificacaoInternaControllerFindAll,
    NotificacaoInternaControllerUpdate,
    ModeloMensagemControllerFindAll,
    ModeloMensagemControllerUpdate,
  ],
  providers: [
    NotificacaoServiceFindAll,
    NotificacaoServiceSummary,
    NotificacaoServiceResend,
    NotificacaoServiceCancel,
    NotificacaoServiceEnqueue,
    NotificacaoInternaServiceFindAll,
    NotificacaoInternaServiceUpdate,
    ModeloMensagemServiceFindAll,
    ModeloMensagemServiceUpdate,
  ],
  exports: [NotificacaoServiceEnqueue],
})
export class NotificacaoModule {}
