import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CriarTipoLinkRequestDto } from '../dto/request/criar-tipo-link.request.dto';
import { TipoLinkServiceCreate } from '../service/tipo-link.service.create';

@Controller('tipo-link')
export class TipoLinkControllerCreate {
  constructor(private readonly service: TipoLinkServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: CriarTipoLinkRequestDto) {
    return this.service.executar(dto);
  }
}
