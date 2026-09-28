import { Controller, Get } from '@nestjs/common';
import { PermissaoServiceFindAll } from '../service/permissao.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('permissao')
export class PermissaoControllerFindAll {
  constructor(private readonly service: PermissaoServiceFindAll) {}

  @Get()
  @Publico()
  listar() {
    return this.service.executar();
  }
}
