import { Controller, Get, Query } from '@nestjs/common';
import { NotificacaoRequestList } from '../dto/request/notificacao.request-list';
import { NotificacaoServiceFindAll } from '../service/notificacao.service.findall';
import { NotificacaoServiceSummary } from '../service/notificacao.service.summary';

// Aba Notificações do Dashboard. Exige notificacao_processar.
@Controller('notificacao')
export class NotificacaoControllerFindAll {
  constructor(
    private readonly service: NotificacaoServiceFindAll,
    private readonly resumo: NotificacaoServiceSummary,
  ) {}

  @Get()
  listar(@Query() query: NotificacaoRequestList) {
    return this.service.executar(query);
  }

  @Get('resumo')
  contar() {
    return this.resumo.executar();
  }
}
