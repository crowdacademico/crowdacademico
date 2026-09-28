import { Body, Controller, Post } from '@nestjs/common';
import { TipoLinkRequestCreate } from '../dto/request/tipo-link.request-create';
import { TipoLinkServiceCreate } from '../service/tipo-link.service.create';

@Controller('tipo-link')
export class TipoLinkControllerCreate {
  constructor(private readonly service: TipoLinkServiceCreate) {}

  @Post()
  criar(@Body() dto: TipoLinkRequestCreate) {
    return this.service.executar(dto);
  }
}
