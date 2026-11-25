import {
  Controller,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { Publico } from '../../commons/auth/publico.decorator';
import { SemTransacaoGlobal } from '../../commons/database/sem-transacao-global.decorator';
import { ContribuicaoServiceSimulatePayment } from '../service/contribuicao.service.simulate-payment';

@Controller('contribuicao')
export class ContribuicaoControllerSimulatePayment {
  constructor(private readonly service: ContribuicaoServiceSimulatePayment) {}

  // SÓ SANDBOX: o botão "Simular pagamento" da tela do Pix. @Publico() + X-Token-Sessao pelo mesmo motivo de
  // GET /contribuicao/:id (quem apoiou sem conta). @SemTransacaoGlobal(): chama o Asaas no meio (ver o service).
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @Post(':idContribuicao/simular-pagamento')
  @HttpCode(204)
  @Publico()
  @SemTransacaoGlobal()
  simular(
    @Param('idContribuicao', ParseIntPipe) idContribuicao: number,
    @Headers('x-token-sessao') tokenSessao: string | undefined,
    @Req() request: Request,
  ): Promise<void> {
    return this.service.executar(idContribuicao, request.user, tokenSessao);
  }
}
