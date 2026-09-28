import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { PerfilPesquisadorRequestCorrigirCpf } from '../dto/request/perfil-pesquisador.request-fix-cpf';
import { PerfilPesquisadorServiceCorrigirCpf } from '../service/perfil-pesquisador.service.fix-cpf';

@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerCorrigirCpf {
  constructor(private readonly service: PerfilPesquisadorServiceCorrigirCpf) {}

  @Patch(':id/cpf')
  @HttpCode(204)
  corrigirCpf(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PerfilPesquisadorRequestCorrigirCpf,
  ) {
    return this.service.executar(id, dto);
  }
}
