import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CriarMotivoDenunciaRequestDto } from '../dto/request/criar-motivo-denuncia.request.dto';
import { MotivoDenunciaServiceCreate } from '../service/motivo-denuncia.service.create';

@Controller('motivo-denuncia')
export class MotivoDenunciaControllerCreate {
  constructor(private readonly service: MotivoDenunciaServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: CriarMotivoDenunciaRequestDto) {
    return this.service.executar(dto);
  }
}
