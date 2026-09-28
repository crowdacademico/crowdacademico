import { Controller, Get, Query } from '@nestjs/common';
import { PorCampanhaQueryDto } from '../../commons/database/dto/por-campanha.query.dto';
import { ComentarioServiceFindAll } from '../service/comentario.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

// Sem @UseGuards - pol_comentario_select (04) decide sozinha.
@Controller('comentario')
export class ComentarioControllerFindAll {
  constructor(private readonly service: ComentarioServiceFindAll) {}

  @Get()
  @Publico()
  listar(@Query() filtro: PorCampanhaQueryDto) {
    return this.service.executar(filtro);
  }
}
