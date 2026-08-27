import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaServiceRemove } from '../service/campanha.service.remove';

@Controller('campanha')
export class CampanhaControllerRemove {
  constructor(private readonly service: CampanhaServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
