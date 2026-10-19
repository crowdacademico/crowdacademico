import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  RecompensaRequestCreate,
  RecompensaRequestLink,
} from '../dto/request/recompensa.request-create';
import { RecompensaServiceCreate } from '../service/recompensa.service.create';
import { RecompensaServiceLink } from '../service/recompensa.service.link';

// Só o dono da campanha (RLS de recompensa e de link_recompensa, 04).
@Controller('recompensa')
export class RecompensaControllerCreate {
  constructor(
    private readonly service: RecompensaServiceCreate,
    private readonly link: RecompensaServiceLink,
  ) {}

  @Post()
  criar(@Body() dto: RecompensaRequestCreate) {
    return this.service.executar(dto);
  }

  @Post(':idRecompensa/link')
  incluirLink(
    @Param('idRecompensa', ParseIntPipe) idRecompensa: number,
    @Body() dto: RecompensaRequestLink,
  ) {
    return this.link.incluir(idRecompensa, dto);
  }
}
