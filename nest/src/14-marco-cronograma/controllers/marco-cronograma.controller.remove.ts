import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { MarcoCronogramaServiceRemove } from '../service/marco-cronograma.service.remove';

@Controller('marco-cronograma')
export class MarcoCronogramaControllerRemove {
  constructor(private readonly service: MarcoCronogramaServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id', ParseIntPipe) id: number) {
    await this.service.executar(id);
  }
}
