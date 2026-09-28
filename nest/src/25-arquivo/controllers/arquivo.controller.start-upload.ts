import { Body, Controller, Post } from '@nestjs/common';
import { ArquivoRequestStartUpload } from '../dto/request/arquivo.request-start-upload';
import { ArquivoServiceStartUpload } from '../service/arquivo.service.start-upload';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('arquivo/upload')
export class ArquivoControllerStartUpload {
  constructor(private readonly service: ArquivoServiceStartUpload) {}

  @Post('iniciar')
  iniciar(
    @Body() dto: ArquivoRequestStartUpload,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
