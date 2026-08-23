import { Controller, Get, Query } from '@nestjs/common';
import { ComentarioRequestList } from '../dto/request/comentario.request-list';
import { ComentarioServiceFindAll } from '../service/comentario.service.findall';

// Sem @UseGuards — pol_comentario_select (04) decide sozinha.
@Controller('comentario')
export class ComentarioControllerFindAll {
  constructor(private readonly service: ComentarioServiceFindAll) {}

  @Get()
  listar(@Query() filtro: ComentarioRequestList) {
    return this.service.executar(filtro);
  }
}
