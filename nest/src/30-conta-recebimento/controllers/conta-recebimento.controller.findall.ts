import { Controller, Get } from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { ContaRecebimentoResponse } from '../dto/response/conta-recebimento.response';
import { ContaRecebimentoServiceFindAll } from '../service/conta-recebimento.service.findall';

@Controller('conta-recebimento')
export class ContaRecebimentoControllerFindAll {
  constructor(private readonly service: ContaRecebimentoServiceFindAll) {}

  @Get()
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<ContaRecebimentoResponse[]> {
    return this.service.executar(usuario.idUsuario);
  }
}
