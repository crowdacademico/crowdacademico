import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CampanhaServiceRemove } from '../service/campanha.service.remove';

@Controller('campanha')
export class CampanhaControllerRemove {
  constructor(private readonly service: CampanhaServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
