import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { TermoUsoRequestAlterar } from '../dto/request/termo-uso.request-alterar';
import { TermoUsoServiceAlterar } from '../service/termo-uso.service.alterar';

@Controller('termos-uso')
export class TermoUsoControllerAlterar {
  constructor(private readonly service: TermoUsoServiceAlterar) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TermoUsoRequestAlterar,
  ) {
    return this.service.executar(id, dto);
  }
}
