import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UsuarioRequestSuspend } from '../dto/request/usuario.request-suspend';
import { UsuarioServiceSuspender } from '../service/usuario.service.suspender';

@Controller('usuario')
export class UsuarioControllerSuspender {
  constructor(private readonly service: UsuarioServiceSuspender) {}

  @Get(':id/suspensao')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarSuspensao(id);
  }

  @Post(':id/suspender')
  @HttpCode(204)
  suspender(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UsuarioRequestSuspend,
  ) {
    return this.service.suspender(id, dto.ate, dto.motivo);
  }

  @Post(':id/revogar-suspensao')
  @HttpCode(204)
  revogar(@Param('id', ParseIntPipe) id: number) {
    return this.service.revogar(id);
  }
}
