import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AtualizacaoCampanhaServiceRemove } from '../service/atualizacao-campanha.service.remove';

@Controller('atualizacao-campanha')
export class AtualizacaoCampanhaControllerRemove {
  constructor(private readonly service: AtualizacaoCampanhaServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id', ParseIntPipe) id: number) {
    await this.service.executar(id);
  }
}
