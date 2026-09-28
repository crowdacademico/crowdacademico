import { Body, Controller, Post } from '@nestjs/common';
import { PapelPermissaoRequestCreate } from '../dto/request/papel-permissao.request-create';
import { PapelPermissaoServiceCreate } from '../service/papel-permissao.service.create';

@Controller('papel-permissao')
export class PapelPermissaoControllerCreate {
  constructor(private readonly service: PapelPermissaoServiceCreate) {}

  @Post()
  atribuir(@Body() dto: PapelPermissaoRequestCreate) {
    return this.service.executar(dto);
  }
}
