import { Controller, Get, Query } from '@nestjs/common';
import { PaginacaoQueryDto } from '../../commons/database/dto/paginacao.query.dto';
import { ConfiguracoesServiceFindAll } from '../service/configuracoes.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('configuracoes')
export class ConfiguracoesControllerFindAll {
  constructor(private readonly service: ConfiguracoesServiceFindAll) {}

  @Get()
  @Publico()
  listar(@Query() paginacao: PaginacaoQueryDto) {
    return this.service.executar(paginacao);
  }
}
