import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TipoLinkServiceFindOne } from '../service/tipo-link.service.findone';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('tipo-link')
export class TipoLinkControllerFindOne {
  constructor(private readonly service: TipoLinkServiceFindOne) {}

  @Get(':id')
  @Publico()
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
