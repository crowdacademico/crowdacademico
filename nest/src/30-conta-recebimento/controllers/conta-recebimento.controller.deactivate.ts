import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { ContaRecebimentoServiceDeactivate } from '../service/conta-recebimento.service.deactivate';

@Controller('conta-recebimento')
export class ContaRecebimentoControllerDeactivate {
  constructor(private readonly service: ContaRecebimentoServiceDeactivate) {}

  // DELETE só no verbo: a conta fica no banco, inativa (ver o service).
  @Delete(':idContaRecebimento')
  @HttpCode(204)
  async desativar(
    @Param('idContaRecebimento', ParseIntPipe) idContaRecebimento: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<void> {
    await this.service.executar(idContaRecebimento, usuario.idUsuario);
  }
}
