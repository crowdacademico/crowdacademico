import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ConfiguracoesServiceFindOne } from '../service/configuracoes.service.findone';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('configuracoes')
export class ConfiguracoesControllerFindOne {
  constructor(private readonly service: ConfiguracoesServiceFindOne) {}

  @Get(':id')
  @Publico()
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
