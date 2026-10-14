import { Body, Controller, Post } from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { CartaoTokenizadoRequestCreate } from '../dto/request/cartao-tokenizado.request-create';
import { CartaoTokenizadoResponse } from '../dto/response/cartao-tokenizado.response';
import { CartaoTokenizadoServiceCreate } from '../service/cartao-tokenizado.service.create';

@Controller('cartao-tokenizado')
export class CartaoTokenizadoControllerCreate {
  constructor(private readonly service: CartaoTokenizadoServiceCreate) {}

  @Post()
  criar(
    @Body() dto: CartaoTokenizadoRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<CartaoTokenizadoResponse> {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
