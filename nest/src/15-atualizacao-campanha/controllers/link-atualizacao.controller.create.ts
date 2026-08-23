import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LinkAtualizacaoRequestCreate } from '../dto/request/link-atualizacao.request-create';
import { LinkAtualizacaoServiceCreate } from '../service/link-atualizacao.service.create';

@Controller('link-atualizacao')
export class LinkAtualizacaoControllerCreate {
  constructor(private readonly service: LinkAtualizacaoServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: LinkAtualizacaoRequestCreate) {
    return this.service.executar(dto);
  }
}
