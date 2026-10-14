import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { SemTransacaoGlobal } from '../../commons/database/sem-transacao-global.decorator';
import { ContaRecebimentoRequestCreate } from '../dto/request/conta-recebimento.request-create';
import { ContaRecebimentoResponse } from '../dto/response/conta-recebimento.response';
import { ContaRecebimentoServiceCreate } from '../service/conta-recebimento.service.create';

@Controller('conta-recebimento')
export class ContaRecebimentoControllerCreate {
  constructor(private readonly service: ContaRecebimentoServiceCreate) {}

  // @SemTransacaoGlobal(): a rota consulta o diretório Pix no provedor (espera externa); ver o service.
  // @Throttle: cada chamada é uma consulta ao provedor, e a rota é um alvo óbvio para quem quer testar chaves alheias.
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 60,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Post()
  @SemTransacaoGlobal()
  criar(
    @Body() dto: ContaRecebimentoRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<ContaRecebimentoResponse> {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
