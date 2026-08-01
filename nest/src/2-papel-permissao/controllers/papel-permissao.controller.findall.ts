import { Controller, Get } from '@nestjs/common';
import { PapelPermissaoServiceFindAll } from '../service/papel-permissao.service.findall';

@Controller('papel-permissao')
export class PapelPermissaoControllerFindAll {
  constructor(private readonly service: PapelPermissaoServiceFindAll) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
