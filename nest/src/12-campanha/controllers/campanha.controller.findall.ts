import { Controller, Get, Query } from '@nestjs/common';
import { CampanhaRequestList } from '../dto/request/campanha.request-list';
import { CampanhaServiceFindAll } from '../service/campanha.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

// Sem @UseGuards - é o catálogo público de "explorar campanhas".
// pol_campanha_select (04) já decide sozinha o que aparece por sessão.
@Controller('campanha')
export class CampanhaControllerFindAll {
  constructor(private readonly service: CampanhaServiceFindAll) {}

  @Get()
  @Publico()
  listar(@Query() filtro: CampanhaRequestList) {
    return this.service.executar(filtro);
  }
}
