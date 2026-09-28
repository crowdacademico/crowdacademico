import { Controller, Get } from '@nestjs/common';
import { PapelPermissaoServiceFindAll } from '../service/papel-permissao.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('papel-permissao')
export class PapelPermissaoControllerFindAll {
  constructor(private readonly service: PapelPermissaoServiceFindAll) {}

  @Get()
  @Publico()
  listar() {
    return this.service.executar();
  }
}
