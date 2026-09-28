import { Body, Controller, Post } from '@nestjs/common';
import { MotivoDenunciaRequestCreate } from '../dto/request/motivo-denuncia.request-create';
import { MotivoDenunciaServiceCreate } from '../service/motivo-denuncia.service.create';

@Controller('motivo-denuncia')
export class MotivoDenunciaControllerCreate {
  constructor(private readonly service: MotivoDenunciaServiceCreate) {}

  @Post()
  criar(@Body() dto: MotivoDenunciaRequestCreate) {
    return this.service.executar(dto);
  }
}
