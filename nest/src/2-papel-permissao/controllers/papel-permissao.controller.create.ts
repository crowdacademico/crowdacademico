import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PapelPermissaoRequestCreate } from '../dto/request/papel-permissao.request-create';
import { PapelPermissaoServiceCreate } from '../service/papel-permissao.service.create';

@Controller('papel-permissao')
export class PapelPermissaoControllerCreate {
  constructor(private readonly service: PapelPermissaoServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  atribuir(@Body() dto: PapelPermissaoRequestCreate) {
    return this.service.executar(dto);
  }
}
