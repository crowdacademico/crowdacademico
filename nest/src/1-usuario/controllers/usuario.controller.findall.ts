import { Controller, Get, Query } from '@nestjs/common';
import { PaginacaoQueryDto } from '../../commons/database/dto/paginacao.query.dto';
import { UsuarioServiceFindAll } from '../service/usuario.service.findall';

@Controller('usuario')
export class UsuarioControllerFindAll {
  constructor(private readonly service: UsuarioServiceFindAll) {}

  @Get()
  listar(@Query() paginacao: PaginacaoQueryDto) {
    return this.service.executar(paginacao);
  }
}
