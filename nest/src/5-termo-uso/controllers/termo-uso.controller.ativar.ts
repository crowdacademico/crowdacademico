import {
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { TermoUsoServiceAtivar } from '../service/termo-uso.service.ativar';

@Controller('termos-uso')
export class TermoUsoControllerAtivar {
  constructor(private readonly service: TermoUsoServiceAtivar) {}

  @Patch(':id/ativar')
  @UseGuards(RequireAuthGuard)
  ativar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
