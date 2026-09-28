import { Body, Controller, Post } from '@nestjs/common';
import { LinkAtualizacaoRequestCreate } from '../dto/request/link-atualizacao.request-create';
import { LinkAtualizacaoServiceCreate } from '../service/link-atualizacao.service.create';

@Controller('link-atualizacao')
export class LinkAtualizacaoControllerCreate {
  constructor(private readonly service: LinkAtualizacaoServiceCreate) {}

  @Post()
  criar(@Body() dto: LinkAtualizacaoRequestCreate) {
    return this.service.executar(dto);
  }
}
