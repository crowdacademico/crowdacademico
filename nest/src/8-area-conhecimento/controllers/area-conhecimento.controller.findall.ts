import { Controller, Get, Query } from '@nestjs/common';
import { AreaConhecimentoRequestList } from '../dto/request/area-conhecimento.request-list';
import { AreaConhecimentoServiceFindAll } from '../service/area-conhecimento.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

// @Publico(), de propósito: catálogo público de leitura
// (pol_area_select é USING(true), ver 04_rls_policies.sql [04-C-2]) -
// mesmo padrão de ConfiguracoesControllerFindAll/PapelControllerFindAll.
@Controller('area-conhecimento')
export class AreaConhecimentoControllerFindAll {
  constructor(private readonly service: AreaConhecimentoServiceFindAll) {}

  @Get()
  @Publico()
  listar(@Query() filtro: AreaConhecimentoRequestList) {
    return this.service.executar(filtro);
  }
}
