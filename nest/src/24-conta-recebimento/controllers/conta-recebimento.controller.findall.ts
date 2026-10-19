import { Controller, Get } from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { CartaoALiberarResponse } from '../dto/response/cartao-a-liberar.response';
import { RepasseResponse } from '../dto/response/repasse.response';
import { ContaRecebimentoServiceFindAll } from '../service/conta-recebimento.service.findall';
import { ContaRecebimentoServiceFindAllPendingCard } from '../service/conta-recebimento.service.findall-pending-card';

@Controller('conta-recebimento')
export class ContaRecebimentoControllerFindAll {
  constructor(
    private readonly service: ContaRecebimentoServiceFindAll,
    private readonly cartao: ContaRecebimentoServiceFindAllPendingCard,
  ) {}

  @Get('repasses')
  listarRepasses(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<RepasseResponse[]> {
    return this.service.executar(usuario.idUsuario);
  }

  // Dinheiro de cartão ainda não liberado pelo provedor (fora do repasse até lá).
  @Get('cartao-a-liberar')
  listarCartaoALiberar(): Promise<CartaoALiberarResponse[]> {
    return this.cartao.executar();
  }
}
