import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioRequestSuspend } from '../dto/request/usuario.request-suspend';
import { UsuarioServiceSuspender } from '../service/usuario.service.suspender';

@Controller('usuario')
export class UsuarioControllerSuspender {
  constructor(private readonly service: UsuarioServiceSuspender) {}

  @Get(':id/suspensao')
  @UseGuards(RequireAuthGuard)
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarSuspensao(id);
  }

  @Post(':id/suspender')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  suspender(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UsuarioRequestSuspend,
  ) {
    return this.service.suspender(id, dto.ate, dto.motivo);
  }

  @Post(':id/revogar-suspensao')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  revogar(@Param('id', ParseIntPipe) id: number) {
    return this.service.revogar(id);
  }
}
