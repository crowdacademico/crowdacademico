import { Controller, Get } from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { CartaoTokenizadoResponse } from '../dto/response/cartao-tokenizado.response';
import { CartaoTokenizadoServiceFindAll } from '../service/cartao-tokenizado.service.findall';

@Controller('cartao-tokenizado')
export class CartaoTokenizadoControllerFindAll {
  constructor(private readonly service: CartaoTokenizadoServiceFindAll) {}

  @Get()
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<CartaoTokenizadoResponse[]> {
    return this.service.executar(usuario.idUsuario);
  }
}
