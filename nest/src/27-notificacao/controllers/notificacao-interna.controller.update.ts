import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { NotificacaoInternaServiceUpdate } from '../service/notificacao-interna.service.update';

@Controller('notificacao-interna')
export class NotificacaoInternaControllerUpdate {
  constructor(private readonly service: NotificacaoInternaServiceUpdate) {}

  @Patch('lidas')
  @HttpCode(204)
  marcarTodas() {
    return this.service.marcarTodas();
  }

  @Patch(':id/lida')
  @HttpCode(204)
  marcarLida(@Param('id', ParseIntPipe) id: number) {
    return this.service.marcarLida(id);
  }
}
