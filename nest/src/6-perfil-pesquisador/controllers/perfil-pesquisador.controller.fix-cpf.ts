import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { PerfilPesquisadorRequestFixCpf } from '../dto/request/perfil-pesquisador.request-fix-cpf';
import { PerfilPesquisadorServiceFixCpf } from '../service/perfil-pesquisador.service.fix-cpf';

@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerFixCpf {
  constructor(private readonly service: PerfilPesquisadorServiceFixCpf) {}

  @Patch(':id/cpf')
  @HttpCode(204)
  corrigirCpf(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PerfilPesquisadorRequestFixCpf,
  ) {
    return this.service.executar(id, dto);
  }
}
