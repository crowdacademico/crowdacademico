import { Controller, Get, Query } from '@nestjs/common';
import { AreaConhecimentoRequestList } from '../dto/request/area-conhecimento.request-list';
import { AreaConhecimentoServiceFindAll } from '../service/area-conhecimento.service.findall';

// Sem RequireAuthGuard, de propósito: catálogo público de leitura
// (pol_area_select é USING(true), ver 04_rls_policies.sql [04-C-2]) —
// mesmo padrão de ConfiguracaoControllerFindAll/PapelControllerFindAll.
@Controller('area-conhecimento')
export class AreaConhecimentoControllerFindAll {
  constructor(private readonly service: AreaConhecimentoServiceFindAll) {}

  @Get()
  listar(@Query() filtro: AreaConhecimentoRequestList) {
    return this.service.executar(filtro);
  }
}
