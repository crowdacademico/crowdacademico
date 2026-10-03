import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { DenunciaRequestCloseCampaign } from '../dto/request/denuncia.request-close-campaign';
import { DenunciaServiceCloseCampaign } from '../service/denuncia.service.close-campaign';

@Controller('denuncia')
export class DenunciaControllerCloseCampaign {
  constructor(private readonly service: DenunciaServiceCloseCampaign) {}

  @Post(':id/encerrar-campanha')
  encerrarCampanha(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DenunciaRequestCloseCampaign,
  ) {
    return this.service.executar(id, dto);
  }
}
