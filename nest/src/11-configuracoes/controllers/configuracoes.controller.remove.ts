import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ConfiguracoesServiceRemove } from '../service/configuracoes.service.remove';

@Controller('configuracoes')
export class ConfiguracoesControllerRemove {
  constructor(private readonly service: ConfiguracoesServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
