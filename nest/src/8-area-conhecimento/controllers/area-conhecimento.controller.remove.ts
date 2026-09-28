import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AreaConhecimentoServiceRemove } from '../service/area-conhecimento.service.remove';

@Controller('area-conhecimento')
export class AreaConhecimentoControllerRemove {
  constructor(private readonly service: AreaConhecimentoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
