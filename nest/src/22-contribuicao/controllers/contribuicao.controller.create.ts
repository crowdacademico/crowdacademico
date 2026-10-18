import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { Publico } from '../../commons/auth/publico.decorator';
import { SemTransacaoGlobal } from '../../commons/database/sem-transacao-global.decorator';
import { ContribuicaoRequestCreate } from '../dto/request/contribuicao.request-create';
import { ContribuicaoResponseCreate } from '../dto/response/contribuicao.response-create';
import { ContribuicaoServiceCreate } from '../service/contribuicao.service.create';

@Controller('contribuicao')
export class ContribuicaoControllerCreate {
  constructor(private readonly service: ContribuicaoServiceCreate) {}

  // @Publico(): contribuir NÃO exige conta (RF-073). O AuthGuardJwt continua resolvendo `request.user` quando vem
  // Bearer válido, então quem está logado contribui com o próprio id (e pode marcar `anonima`).
  //
  // @SemTransacaoGlobal(): a rota espera o gateway de pagamento no meio; ver o service e
  // DOCUMENTACAO_BACKEND.md §2.2-B. Consequência: não há `getDb()` aqui, o service usa PG_POOL e monta a própria
  // sessão (executarTransacaoCurta).
  //
  // @Throttle: cada chamada pode criar uma cobrança no gateway, e rota pública sem limite é combustível para
  // abuso (criar milhares de cobranças/contribuições pendentes). Declara o PRÓPRIO limite (regra do projeto, ver
  // app.module.ts), por IP, mais folgado fora de produção para testar à vontade.
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 10 : 60,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Post()
  @Publico()
  @SemTransacaoGlobal()
  criar(
    @Body() dto: ContribuicaoRequestCreate,
    @Req() request: Request,
  ): Promise<ContribuicaoResponseCreate> {
    return this.service.executar(
      dto,
      request.user,
      request.ip ?? request.socket.remoteAddress,
    );
  }
}
