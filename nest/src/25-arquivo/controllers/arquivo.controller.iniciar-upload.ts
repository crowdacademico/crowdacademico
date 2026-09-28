import { Body, Controller, Post } from '@nestjs/common';
import { ArquivoRequestIniciarUpload } from '../dto/request/arquivo.request-iniciar-upload';
import { ArquivoServiceIniciarUpload } from '../service/arquivo.service.iniciar-upload';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('arquivo/upload')
export class ArquivoControllerIniciarUpload {
  constructor(private readonly service: ArquivoServiceIniciarUpload) {}

  @Post('iniciar')
  iniciar(
    @Body() dto: ArquivoRequestIniciarUpload,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
