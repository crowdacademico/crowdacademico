import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { LiberadoComTermoPendente } from '../../commons/auth/liberado-com-termo-pendente.decorator';
import { TermoUsoServiceAccept } from '../service/termo-uso.service.accept';

@Controller('termos-uso')
export class TermoUsoControllerAccept {
  constructor(private readonly service: TermoUsoServiceAccept) {}

  @Post(':id/aceitar')
  @LiberadoComTermoPendente()
  @HttpCode(204)
  aceitar(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.service.executar(
      id,
      request.user!.idUsuario,
      request.ip ?? request.socket.remoteAddress,
    );
  }
}
