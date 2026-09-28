import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TermoUsoServiceExcluir } from '../service/termo-uso.service.remove';

@Controller('termos-uso')
export class TermoUsoControllerExcluir {
  constructor(private readonly service: TermoUsoServiceExcluir) {}

  @Delete(':id')
  @HttpCode(204)
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @Query('forcar', new ParseBoolPipe({ optional: true })) forcar?: boolean,
  ) {
    return this.service.executar(id, forcar ?? false);
  }
}
