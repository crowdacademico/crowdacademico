import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PerfilPesquisadorRequestCreateForOther } from '../dto/request/perfil-pesquisador.request-create-for-other';
import { PerfilPesquisadorServiceCreateForOther } from '../service/perfil-pesquisador.service.create-for-other';

// Rota COM :id, de propósito - diferente do self-service (POST
// /perfil-pesquisador, sem :id, sempre a própria conta). Esta é a ação de
// suporte/admin (gateada por 'perfil_pesquisador_criar_para_outro' dentro
// da função do banco, não aqui - ver service).
@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerCreateForOther {
  constructor(
    private readonly service: PerfilPesquisadorServiceCreateForOther,
  ) {}

  @Post(':id')
  criarParaOutro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PerfilPesquisadorRequestCreateForOther,
    @Req() request: Request,
  ) {
    return this.service.executar(
      id,
      dto,
      request.user!.idUsuario,
      request.ip ?? request.socket.remoteAddress,
    );
  }
}
