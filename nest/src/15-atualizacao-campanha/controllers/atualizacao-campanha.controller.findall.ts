import { Controller, Get, Query } from '@nestjs/common';
import { PorCampanhaQueryDto } from '../../commons/database/dto/por-campanha.query.dto';
import { AtualizacaoCampanhaServiceFindAll } from '../service/atualizacao-campanha.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

// Sem @UseGuards - pol_atualizacao_select (04) já esconde ativo=FALSE de
// quem não é dono/moderador sozinha.
@Controller('atualizacao-campanha')
export class AtualizacaoCampanhaControllerFindAll {
  constructor(private readonly service: AtualizacaoCampanhaServiceFindAll) {}

  @Get()
  @Publico()
  listar(@Query() filtro: PorCampanhaQueryDto) {
    return this.service.executar(filtro);
  }
}
