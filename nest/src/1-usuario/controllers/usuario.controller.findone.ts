import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioServiceFindOne } from '../service/usuario.service.findone';

// RequireAuthGuard (24-09-2026): mesmo motivo de usuario.controller.findall.ts.
@Controller('usuario')
@UseGuards(RequireAuthGuard)
export class UsuarioControllerFindOne {
  constructor(private readonly service: UsuarioServiceFindOne) {}

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
