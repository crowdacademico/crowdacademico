import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { OrcamentoCampanhaServiceRemove } from '../service/orcamento-campanha.service.remove';

@Controller('orcamento-campanha')
export class OrcamentoCampanhaControllerRemove {
  constructor(private readonly service: OrcamentoCampanhaServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  async remover(@Param('id', ParseIntPipe) id: number) {
    await this.service.executar(id);
  }
}
