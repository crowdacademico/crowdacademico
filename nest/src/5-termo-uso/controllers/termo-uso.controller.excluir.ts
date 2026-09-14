import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { TermoUsoServiceExcluir } from '../service/termo-uso.service.excluir';

@Controller('termos-uso')
export class TermoUsoControllerExcluir {
  constructor(private readonly service: TermoUsoServiceExcluir) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @Query('forcar', new ParseBoolPipe({ optional: true })) forcar?: boolean,
  ) {
    return this.service.executar(id, forcar ?? false);
  }
}
