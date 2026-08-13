import { Controller, Get, Query } from '@nestjs/common';
import { ListarAreaConhecimentoQueryDto } from '../dto/request/listar-area-conhecimento.query.dto';
import { AreaConhecimentoServiceFindAll } from '../service/area-conhecimento.service.findall';

// Sem RequireAuthGuard, de propósito: catálogo público de leitura
// (pol_area_select é USING(true), ver 04_rls_policies.sql [04-C-2]) —
// mesmo padrão de ConfiguracaoControllerFindAll/PapelControllerFindAll.
@Controller('area-conhecimento')
export class AreaConhecimentoControllerFindAll {
  constructor(private readonly service: AreaConhecimentoServiceFindAll) {}

  @Get()
  listar(@Query() filtro: ListarAreaConhecimentoQueryDto) {
    return this.service.executar(filtro);
  }
}
