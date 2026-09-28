import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TermoUsoServiceRemove } from '../service/termo-uso.service.remove';

@Controller('termos-uso')
export class TermoUsoControllerRemove {
  constructor(private readonly service: TermoUsoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @Query('forcar', new ParseBoolPipe({ optional: true })) forcar?: boolean,
  ) {
    return this.service.executar(id, forcar ?? false);
  }
}
