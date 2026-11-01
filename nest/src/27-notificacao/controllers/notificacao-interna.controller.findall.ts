import { Controller, Get } from '@nestjs/common';
import { NotificacaoInternaServiceFindAll } from '../service/notificacao-interna.service.findall';

// Sino do painel: qualquer conta logada, só os próprios avisos.
@Controller('notificacao-interna')
export class NotificacaoInternaControllerFindAll {
  constructor(private readonly service: NotificacaoInternaServiceFindAll) {}

  @Get()
  listar() {
    return this.service.executar();
  }

  @Get('nao-lidas')
  contarNaoLidas() {
    return this.service.naoLidas();
  }
}
