import { Controller, Get, Query } from '@nestjs/common';
import { AtualizacaoCampanhaRequestList } from '../dto/request/atualizacao-campanha.request-list';
import { AtualizacaoCampanhaServiceFindAll } from '../service/atualizacao-campanha.service.findall';

// Sem @UseGuards — pol_atualizacao_select (04) já esconde ativo=FALSE de
// quem não é dono/moderador sozinha.
@Controller('atualizacao-campanha')
export class AtualizacaoCampanhaControllerFindAll {
  constructor(private readonly service: AtualizacaoCampanhaServiceFindAll) {}

  @Get()
  listar(@Query() filtro: AtualizacaoCampanhaRequestList) {
    return this.service.executar(filtro);
  }
}
