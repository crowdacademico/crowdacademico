import {
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { Publico } from '../../commons/auth/publico.decorator';
import { SemTransacaoGlobal } from '../../commons/database/sem-transacao-global.decorator';
import { ContribuicaoResponseFind } from '../dto/response/contribuicao.response-find';
import { ContribuicaoServiceFind } from '../service/contribuicao.service.find';

@Controller('contribuicao')
export class ContribuicaoControllerFind {
  constructor(private readonly service: ContribuicaoServiceFind) {}

  // @Publico(): quem contribuiu sem conta acompanha pelo X-Token-Sessao; com login (Bearer), pelo próprio usuário.
  // @Throttle: o front consulta isto em polling até a confirmação, então o limite é folgado, mas existe (por IP).
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 120 : 600,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Get(':idContribuicao')
  @Publico()
  @SemTransacaoGlobal()
  buscar(
    @Param('idContribuicao', ParseIntPipe) idContribuicao: number,
    @Headers('x-token-sessao') tokenSessao: string | undefined,
    @Req() request: Request,
  ): Promise<ContribuicaoResponseFind> {
    return this.service.executar(idContribuicao, request.user, tokenSessao);
  }
}
