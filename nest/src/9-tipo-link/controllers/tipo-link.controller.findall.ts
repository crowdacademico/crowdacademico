import { Controller, Get, Query } from '@nestjs/common';
import { TipoLinkRequestList } from '../dto/request/tipo-link.request-list';
import { TipoLinkServiceFindAll } from '../service/tipo-link.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

// @Publico(), de propósito: catálogo público de leitura
// (pol_tipolink_select é USING(true), ver 04_rls_policies.sql [04-C-2]) -
// mesmo padrão de ConfiguracaoControllerFindAll/AreaConhecimentoControllerFindAll.
@Controller('tipo-link')
export class TipoLinkControllerFindAll {
  constructor(private readonly service: TipoLinkServiceFindAll) {}

  @Get()
  @Publico()
  listar(@Query() filtro: TipoLinkRequestList) {
    return this.service.executar(filtro);
  }
}
