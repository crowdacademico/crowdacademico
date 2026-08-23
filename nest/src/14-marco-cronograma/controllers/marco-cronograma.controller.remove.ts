import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { MarcoCronogramaServiceRemove } from '../service/marco-cronograma.service.remove';

@Controller('marco-cronograma')
export class MarcoCronogramaControllerRemove {
  constructor(private readonly service: MarcoCronogramaServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  async remover(@Param('id', ParseIntPipe) id: number) {
    await this.service.executar(id);
  }
}
