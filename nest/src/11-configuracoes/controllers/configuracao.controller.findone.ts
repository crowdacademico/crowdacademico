import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ConfiguracaoServiceFindOne } from '../service/configuracao.service.findone';

@Controller('configuracoes')
export class ConfiguracaoControllerFindOne {
  constructor(private readonly service: ConfiguracaoServiceFindOne) {}

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
