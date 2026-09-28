import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ConfiguracaoServiceFindOne } from '../service/configuracao.service.findone';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('configuracoes')
export class ConfiguracaoControllerFindOne {
  constructor(private readonly service: ConfiguracaoServiceFindOne) {}

  @Get(':id')
  @Publico()
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
