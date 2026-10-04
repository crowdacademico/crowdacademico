import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { DenunciaContestacaoRequestDecide } from '../dto/request/denuncia-contestacao.request-decide';
import { DenunciaServiceDecideContest } from '../service/denuncia.service.decide-contest';

@Controller('denuncia')
export class DenunciaControllerDecideContest {
  constructor(private readonly service: DenunciaServiceDecideContest) {}

  @Post(':id/decidir-contestacao')
  decidir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DenunciaContestacaoRequestDecide,
  ) {
    return this.service.executar(id, dto);
  }
}
