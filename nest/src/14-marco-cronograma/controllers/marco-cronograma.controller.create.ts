import { Body, Controller, Post } from '@nestjs/common';
import { MarcoCronogramaRequestCreate } from '../dto/request/marco-cronograma.request-create';
import { MarcoCronogramaServiceCreate } from '../service/marco-cronograma.service.create';

@Controller('marco-cronograma')
export class MarcoCronogramaControllerCreate {
  constructor(private readonly service: MarcoCronogramaServiceCreate) {}

  @Post()
  criar(@Body() dto: MarcoCronogramaRequestCreate) {
    return this.service.executar(dto);
  }
}
