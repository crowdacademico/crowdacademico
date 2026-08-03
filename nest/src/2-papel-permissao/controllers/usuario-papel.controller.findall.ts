import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioPapelServiceFindAll } from '../service/usuario-papel.service.findall';

@Controller('usuario-papel')
export class UsuarioPapelControllerFindAll {
  constructor(private readonly service: UsuarioPapelServiceFindAll) {}

  @Get(':idUsuario')
  @UseGuards(RequireAuthGuard)
  listar(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.executar(idUsuario);
  }
}
