import { Controller, Get, Query } from '@nestjs/common';
import { MotivoDenunciaRequestList } from '../dto/request/motivo-denuncia.request-list';
import { MotivoDenunciaServiceFindAll } from '../service/motivo-denuncia.service.findall';

// Sem RequireAuthGuard, de propósito: catálogo público de leitura
// (pol_motivo_select é USING(true), ver 04_rls_policies.sql [04-C-3]) —
// mesmo padrão de TipoLinkControllerFindAll/AreaConhecimentoControllerFindAll
// (quem abre o formulário de denúncia precisa ver as opções sem estar
// logado ainda).
@Controller('motivo-denuncia')
export class MotivoDenunciaControllerFindAll {
  constructor(private readonly service: MotivoDenunciaServiceFindAll) {}

  @Get()
  listar(@Query() filtro: MotivoDenunciaRequestList) {
    return this.service.executar(filtro);
  }
}
