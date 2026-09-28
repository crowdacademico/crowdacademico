import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { MotivoDenunciaServiceRemove } from '../service/motivo-denuncia.service.remove';

@Controller('motivo-denuncia')
export class MotivoDenunciaControllerRemove {
  constructor(private readonly service: MotivoDenunciaServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
