import { Controller, Get } from '@nestjs/common';
import { PermissaoServiceFindAll } from '../service/permissao.service.findall';

@Controller('permissao')
export class PermissaoControllerFindAll {
  constructor(private readonly service: PermissaoServiceFindAll) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
