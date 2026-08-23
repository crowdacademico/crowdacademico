import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LinkAtualizacaoServiceRemove } from '../service/link-atualizacao.service.remove';

@Controller('link-atualizacao')
export class LinkAtualizacaoControllerRemove {
  constructor(private readonly service: LinkAtualizacaoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  async remover(@Param('id', ParseIntPipe) id: number) {
    await this.service.executar(id);
  }
}
