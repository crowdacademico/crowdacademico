import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { MotivoDenunciaServiceFindOne } from '../service/motivo-denuncia.service.findone';

@Controller('motivo-denuncia')
export class MotivoDenunciaControllerFindOne {
  constructor(private readonly service: MotivoDenunciaServiceFindOne) {}

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
