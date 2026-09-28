import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { TermoUsoRequestAlterar } from '../dto/request/termo-uso.request-update';
import { TermoUsoServiceAlterar } from '../service/termo-uso.service.update';

@Controller('termos-uso')
export class TermoUsoControllerAlterar {
  constructor(private readonly service: TermoUsoServiceAlterar) {}

  @Patch(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TermoUsoRequestAlterar,
  ) {
    return this.service.executar(id, dto);
  }
}
