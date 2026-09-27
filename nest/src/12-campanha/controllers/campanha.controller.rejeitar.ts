import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaRequestRejeitar } from '../dto/request/campanha.request-rejeitar';
import { CampanhaServiceRejeitar } from '../service/campanha.service.rejeitar';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('campanha')
export class CampanhaControllerRejeitar {
  constructor(private readonly service: CampanhaServiceRejeitar) {}

  @Post(':id/rejeitar')
  @UseGuards(RequireAuthGuard)
  rejeitar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaRequestRejeitar,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(id, usuario.idUsuario, dto);
  }
}
