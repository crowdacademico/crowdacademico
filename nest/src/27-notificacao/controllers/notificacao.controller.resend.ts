import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { NotificacaoServiceCancel } from '../service/notificacao.service.cancel';
import { NotificacaoServiceResend } from '../service/notificacao.service.resend';

// Tratamento manual do RF-121. A permissão (notificacao_processar) e a situação são checadas no banco.
@Controller('notificacao')
export class NotificacaoControllerResend {
  constructor(
    private readonly reenvio: NotificacaoServiceResend,
    private readonly cancelamento: NotificacaoServiceCancel,
  ) {}

  @Post(':idNotificacao/reenviar')
  @HttpCode(204)
  async reenviar(
    @Param('idNotificacao', ParseIntPipe) idNotificacao: number,
  ): Promise<void> {
    await this.reenvio.executar(idNotificacao);
  }

  @Post(':idNotificacao/cancelar')
  @HttpCode(204)
  async cancelar(
    @Param('idNotificacao', ParseIntPipe) idNotificacao: number,
  ): Promise<void> {
    await this.cancelamento.executar(idNotificacao);
  }
}
