import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { MarcoCronogramaRequestCreate } from '../dto/request/marco-cronograma.request-create';
import { MarcoCronogramaServiceCreate } from '../service/marco-cronograma.service.create';

@Controller('marco-cronograma')
export class MarcoCronogramaControllerCreate {
  constructor(private readonly service: MarcoCronogramaServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: MarcoCronogramaRequestCreate) {
    return this.service.executar(dto);
  }
}
