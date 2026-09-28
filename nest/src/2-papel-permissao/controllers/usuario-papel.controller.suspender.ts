import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UsuarioPapelRequestSuspend } from '../dto/request/usuario-papel.request-suspend';
import { UsuarioPapelServiceSuspender } from '../service/usuario-papel.service.suspender';

@Controller('usuario-papel')
export class UsuarioPapelControllerSuspender {
  constructor(private readonly service: UsuarioPapelServiceSuspender) {}

  @Post(':idUsuario/:idPapel/suspender')
  @HttpCode(204)
  suspender(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idPapel', ParseIntPipe) idPapel: number,
    @Body() dto: UsuarioPapelRequestSuspend,
  ) {
    return this.service.suspender(idUsuario, idPapel, dto.ate);
  }

  @Post(':idUsuario/:idPapel/revogar-suspensao')
  @HttpCode(204)
  revogar(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idPapel', ParseIntPipe) idPapel: number,
  ) {
    return this.service.revogar(idUsuario, idPapel);
  }
}
