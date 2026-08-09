import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { SuspenderPapelUsuarioRequestDto } from '../dto/request/suspender-papel-usuario.request.dto';
import { UsuarioPapelServiceSuspender } from '../service/usuario-papel.service.suspender';

@Controller('usuario-papel')
export class UsuarioPapelControllerSuspender {
  constructor(private readonly service: UsuarioPapelServiceSuspender) {}

  @Post(':idUsuario/:idPapel/suspender')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  suspender(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idPapel', ParseIntPipe) idPapel: number,
    @Body() dto: SuspenderPapelUsuarioRequestDto,
  ) {
    return this.service.suspender(idUsuario, idPapel, dto.ate);
  }

  @Post(':idUsuario/:idPapel/revogar-suspensao')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  revogar(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idPapel', ParseIntPipe) idPapel: number,
  ) {
    return this.service.revogar(idUsuario, idPapel);
  }
}
