import { Controller, Get, Query } from '@nestjs/common';
import { DenunciaRequestList } from '../dto/request/denuncia.request-list';
import { DenunciaServiceFindAll } from '../service/denuncia.service.findall';

// pol_denuncia_select (04) decide o que cada um vê.
@Controller('denuncia')
export class DenunciaControllerFindAll {
  constructor(private readonly service: DenunciaServiceFindAll) {}

  @Get()
  listar(@Query() filtro: DenunciaRequestList) {
    return this.service.executar(filtro);
  }
}
