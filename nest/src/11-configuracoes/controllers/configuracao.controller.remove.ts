import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ConfiguracaoServiceRemove } from '../service/configuracao.service.remove';

@Controller('configuracoes')
export class ConfiguracaoControllerRemove {
  constructor(private readonly service: ConfiguracaoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
