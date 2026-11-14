import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ContribuicaoServiceWithdraw } from '../service/contribuicao.service.withdraw';

@Controller('contribuicao')
export class ContribuicaoControllerWithdraw {
  constructor(private readonly service: ContribuicaoServiceWithdraw) {}

  // Desistir do apoio (CDC, art. 49). Exige login (padrão): só quem apoiou com conta tem onde desistir.
  @Post(':idContribuicao/desistir')
  @HttpCode(204)
  desistir(
    @Param('idContribuicao', ParseIntPipe) idContribuicao: number,
  ): Promise<void> {
    return this.service.executar(idContribuicao);
  }
}
