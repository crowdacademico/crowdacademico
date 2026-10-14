import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { CartaoTokenizadoServiceDeactivate } from '../service/cartao-tokenizado.service.deactivate';

@Controller('cartao-tokenizado')
export class CartaoTokenizadoControllerDeactivate {
  constructor(private readonly service: CartaoTokenizadoServiceDeactivate) {}

  @Delete(':idCartao')
  @HttpCode(204)
  async desativar(
    @Param('idCartao', ParseIntPipe) idCartao: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<void> {
    await this.service.executar(idCartao, usuario.idUsuario);
  }
}
