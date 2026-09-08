import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PerfilPesquisadorRequestCorrigirCpf } from '../dto/request/perfil-pesquisador.request-corrigir-cpf';
import { PerfilPesquisadorServiceCorrigirCpf } from '../service/perfil-pesquisador.service.corrigir-cpf';

@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerCorrigirCpf {
  constructor(private readonly service: PerfilPesquisadorServiceCorrigirCpf) {}

  @Patch(':id/cpf')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  corrigirCpf(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PerfilPesquisadorRequestCorrigirCpf,
  ) {
    return this.service.executar(id, dto);
  }
}
