import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { MotivoDenunciaServiceFindOne } from '../service/motivo-denuncia.service.findone';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('motivo-denuncia')
export class MotivoDenunciaControllerFindOne {
  constructor(private readonly service: MotivoDenunciaServiceFindOne) {}

  @Get(':id')
  @Publico()
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
