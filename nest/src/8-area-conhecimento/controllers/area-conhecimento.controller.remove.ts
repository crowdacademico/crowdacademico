import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AreaConhecimentoServiceRemove } from '../service/area-conhecimento.service.remove';

@Controller('area-conhecimento')
export class AreaConhecimentoControllerRemove {
  constructor(private readonly service: AreaConhecimentoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
