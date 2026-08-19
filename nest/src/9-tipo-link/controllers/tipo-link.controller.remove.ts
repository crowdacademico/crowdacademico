import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { TipoLinkServiceRemove } from '../service/tipo-link.service.remove';

@Controller('tipo-link')
export class TipoLinkControllerRemove {
  constructor(private readonly service: TipoLinkServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
