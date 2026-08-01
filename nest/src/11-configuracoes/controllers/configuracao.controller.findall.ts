import { Controller, Get } from '@nestjs/common';
import { ConfiguracaoServiceFindAll } from '../service/configuracao.service.findall';

@Controller('configuracoes')
export class ConfiguracaoControllerFindAll {
  constructor(private readonly service: ConfiguracaoServiceFindAll) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
