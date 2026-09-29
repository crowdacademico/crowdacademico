import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { SuspensaoRequestDto } from '../../commons/moderacao/dto/suspensao.request.dto';
import { UsuarioPapelServiceSuspend } from '../service/usuario-papel.service.suspend';

@Controller('usuario-papel')
export class UsuarioPapelControllerSuspend {
  constructor(private readonly service: UsuarioPapelServiceSuspend) {}

  @Post(':idUsuario/:idPapel/suspender')
  @HttpCode(204)
  suspender(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idPapel', ParseIntPipe) idPapel: number,
    @Body() dto: SuspensaoRequestDto,
  ) {
    return this.service.suspender(idUsuario, idPapel, dto.ate, dto.motivo);
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
