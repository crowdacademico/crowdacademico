import { Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { TermoUsoServiceActivate } from '../service/termo-uso.service.activate';

@Controller('termos-uso')
export class TermoUsoControllerActivate {
  constructor(private readonly service: TermoUsoServiceActivate) {}

  @Patch(':id/ativar')
  ativar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
