import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ArquivoRequestConfirmarUpload } from '../dto/request/arquivo.request-confirmar-upload';
import { ArquivoServiceConfirmarUpload } from '../service/arquivo.service.confirmar-upload';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('arquivo/upload')
export class ArquivoControllerConfirmarUpload {
  constructor(private readonly service: ArquivoServiceConfirmarUpload) {}

  @Post('confirmar')
  @UseGuards(RequireAuthGuard)
  confirmar(
    @Body() dto: ArquivoRequestConfirmarUpload,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
