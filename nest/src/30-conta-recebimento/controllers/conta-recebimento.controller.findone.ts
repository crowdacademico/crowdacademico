import { Controller, Get } from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { ContaRecebimentoResponse } from '../dto/response/conta-recebimento.response';
import { ContaRecebimentoServiceFindOne } from '../service/conta-recebimento.service.findone';

@Controller('conta-recebimento')
export class ContaRecebimentoControllerFindOne {
  constructor(private readonly service: ContaRecebimentoServiceFindOne) {}

  @Get()
  buscar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<ContaRecebimentoResponse | null> {
    return this.service.executar(usuario.idUsuario);
  }
}
