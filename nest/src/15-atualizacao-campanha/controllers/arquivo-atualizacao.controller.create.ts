import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ArquivoAtualizacaoRequestCreate } from '../dto/request/arquivo-atualizacao.request-create';
import { ArquivoAtualizacaoServiceCreate } from '../service/arquivo-atualizacao.service.create';

@Controller('arquivo-atualizacao')
export class ArquivoAtualizacaoControllerCreate {
  constructor(private readonly service: ArquivoAtualizacaoServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: ArquivoAtualizacaoRequestCreate) {
    return this.service.executar(dto);
  }
}
