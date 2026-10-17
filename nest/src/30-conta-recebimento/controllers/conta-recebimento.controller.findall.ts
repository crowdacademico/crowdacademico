import { Controller, Get } from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { RepasseResponse } from '../dto/response/repasse.response';
import { ContaRecebimentoServiceFindAll } from '../service/conta-recebimento.service.findall';

@Controller('conta-recebimento')
export class ContaRecebimentoControllerFindAll {
  constructor(private readonly service: ContaRecebimentoServiceFindAll) {}

  @Get('repasses')
  listarRepasses(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<RepasseResponse[]> {
    return this.service.executar(usuario.idUsuario);
  }
}
