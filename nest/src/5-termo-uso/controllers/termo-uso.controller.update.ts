import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { TermoUsoRequestUpdate } from '../dto/request/termo-uso.request-update';
import { TermoUsoServiceUpdate } from '../service/termo-uso.service.update';

@Controller('termos-uso')
export class TermoUsoControllerUpdate {
  constructor(private readonly service: TermoUsoServiceUpdate) {}

  @Patch(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TermoUsoRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
