import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { MotivoDenunciaRequestCreate } from '../dto/request/motivo-denuncia.request-create';
import { MotivoDenunciaServiceCreate } from '../service/motivo-denuncia.service.create';

@Controller('motivo-denuncia')
export class MotivoDenunciaControllerCreate {
  constructor(private readonly service: MotivoDenunciaServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: MotivoDenunciaRequestCreate) {
    return this.service.executar(dto);
  }
}
