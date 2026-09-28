import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { PerfilPesquisadorRequestCorrigirCpf } from '../dto/request/perfil-pesquisador.request-corrigir-cpf';
import { PerfilPesquisadorServiceCorrigirCpf } from '../service/perfil-pesquisador.service.corrigir-cpf';

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
