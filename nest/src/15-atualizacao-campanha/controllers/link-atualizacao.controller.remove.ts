import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { LinkAtualizacaoServiceRemove } from '../service/link-atualizacao.service.remove';

@Controller('link-atualizacao')
export class LinkAtualizacaoControllerRemove {
  constructor(private readonly service: LinkAtualizacaoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id', ParseIntPipe) id: number) {
    await this.service.executar(id);
  }
}
