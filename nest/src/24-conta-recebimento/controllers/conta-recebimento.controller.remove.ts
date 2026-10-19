import { Controller, Delete, HttpCode } from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { ContaRecebimentoServiceRemove } from '../service/conta-recebimento.service.remove';

@Controller('conta-recebimento')
export class ContaRecebimentoControllerRemove {
  constructor(private readonly service: ContaRecebimentoServiceRemove) {}

  @Delete()
  @HttpCode(204)
  async remover(@UsuarioAtual() usuario: UsuarioAutenticado): Promise<void> {
    await this.service.executar(usuario.idUsuario);
  }
}
