import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { OrcamentoCampanhaServiceRemove } from '../service/orcamento-campanha.service.remove';

@Controller('orcamento-campanha')
export class OrcamentoCampanhaControllerRemove {
  constructor(private readonly service: OrcamentoCampanhaServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id', ParseIntPipe) id: number) {
    await this.service.executar(id);
  }
}
