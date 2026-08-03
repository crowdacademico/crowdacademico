import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ConfiguracaoServiceRemove } from '../service/configuracao.service.remove';

@Controller('configuracoes')
export class ConfiguracaoControllerRemove {
  constructor(private readonly service: ConfiguracaoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
