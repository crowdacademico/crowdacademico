import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { TipoLinkRequestCreate } from '../dto/request/tipo-link.request-create';
import { TipoLinkServiceCreate } from '../service/tipo-link.service.create';

@Controller('tipo-link')
export class TipoLinkControllerCreate {
  constructor(private readonly service: TipoLinkServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: TipoLinkRequestCreate) {
    return this.service.executar(dto);
  }
}
