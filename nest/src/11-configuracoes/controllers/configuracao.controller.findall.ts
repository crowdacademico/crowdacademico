import { Controller, Get, Query } from '@nestjs/common';
import { PaginacaoQueryDto } from '../../commons/database/dto/paginacao.query.dto';
import { ConfiguracaoServiceFindAll } from '../service/configuracao.service.findall';

@Controller('configuracoes')
export class ConfiguracaoControllerFindAll {
  constructor(private readonly service: ConfiguracaoServiceFindAll) {}

  @Get()
  listar(@Query() paginacao: PaginacaoQueryDto) {
    return this.service.executar(paginacao);
  }
}
