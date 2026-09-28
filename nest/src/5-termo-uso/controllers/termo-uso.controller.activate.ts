import { Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { TermoUsoServiceAtivar } from '../service/termo-uso.service.activate';

@Controller('termos-uso')
export class TermoUsoControllerAtivar {
  constructor(private readonly service: TermoUsoServiceAtivar) {}

  @Patch(':id/ativar')
  ativar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
