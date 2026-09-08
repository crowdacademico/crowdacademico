import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PerfilPesquisadorRequestCreate } from '../dto/request/perfil-pesquisador.request-create';
import { PerfilPesquisadorServiceCreateParaOutro } from '../service/perfil-pesquisador.service.create-para-outro';

// Rota COM :id, de propósito - diferente do self-service (POST
// /perfil-pesquisador, sem :id, sempre a própria conta). Esta é a ação de
// suporte/admin (gateada por 'perfil_pesquisador_criar_para_outro' dentro
// da função do banco, não aqui - ver service).
@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerCreateParaOutro {
  constructor(
    private readonly service: PerfilPesquisadorServiceCreateParaOutro,
  ) {}

  @Post(':id')
  @UseGuards(RequireAuthGuard)
  criarParaOutro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PerfilPesquisadorRequestCreate,
    @Req() request: Request,
  ) {
    return this.service.executar(id, dto, request.user!.idUsuario);
  }
}
