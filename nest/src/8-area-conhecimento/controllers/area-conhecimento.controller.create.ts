import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CriarAreaConhecimentoRequestDto } from '../dto/request/criar-area-conhecimento.request.dto';
import { AreaConhecimentoServiceCreate } from '../service/area-conhecimento.service.create';

@Controller('area-conhecimento')
export class AreaConhecimentoControllerCreate {
  constructor(private readonly service: AreaConhecimentoServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: CriarAreaConhecimentoRequestDto) {
    return this.service.executar(dto);
  }
}
