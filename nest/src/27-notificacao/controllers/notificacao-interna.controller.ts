import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { NotificacaoInternaService } from '../service/notificacao-interna.service';

@Controller('notificacoes-internas')
export class NotificacaoInternaController {
  constructor(private readonly service: NotificacaoInternaService) {}

  @Get()
  listar(
    @Query('limite') limite?: string,
    @Query('somenteNaoLidas') somenteNaoLidas?: string,
  ) {
    return this.service.listar(Number(limite ?? 20), somenteNaoLidas === 'true');
  }

  @Get('resumo')
  resumo() {
    return this.service.resumo();
  }

  @Patch(':id/lida')
  marcarComoLida(@Param('id', ParseIntPipe) id: number) {
    return this.service.marcarComoLida(id);
  }

  @Patch('ler-todas')
  marcarTodasComoLidas() {
    return this.service.marcarTodasComoLidas();
  }
}
