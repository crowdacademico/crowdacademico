import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { TipoLinkServiceRemove } from '../service/tipo-link.service.remove';

@Controller('tipo-link')
export class TipoLinkControllerRemove {
  constructor(private readonly service: TipoLinkServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
