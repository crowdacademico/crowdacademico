import { Body, Controller, Post } from '@nestjs/common';
import { ArquivoRequestConfirmUpload } from '../dto/request/arquivo.request-confirm-upload';
import { ArquivoServiceConfirmUpload } from '../service/arquivo.service.confirm-upload';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('arquivo/upload')
export class ArquivoControllerConfirmUpload {
  constructor(private readonly service: ArquivoServiceConfirmUpload) {}

  @Post('confirmar')
  confirmar(
    @Body() dto: ArquivoRequestConfirmUpload,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
