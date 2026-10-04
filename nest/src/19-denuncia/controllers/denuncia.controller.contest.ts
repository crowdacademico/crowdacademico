import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { DenunciaContestacaoRequestCreate } from '../dto/request/denuncia-contestacao.request-create';
import { DenunciaServiceContest } from '../service/denuncia.service.contest';

@Controller('denuncia')
export class DenunciaControllerContest {
  constructor(private readonly service: DenunciaServiceContest) {}

  @Post(':id/contestar')
  @HttpCode(204)
  contestar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DenunciaContestacaoRequestCreate,
  ) {
    return this.service.executar(id, dto);
  }
}
