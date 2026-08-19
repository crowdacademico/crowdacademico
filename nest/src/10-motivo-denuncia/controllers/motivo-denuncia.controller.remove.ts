import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { MotivoDenunciaServiceRemove } from '../service/motivo-denuncia.service.remove';

@Controller('motivo-denuncia')
export class MotivoDenunciaControllerRemove {
  constructor(private readonly service: MotivoDenunciaServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
