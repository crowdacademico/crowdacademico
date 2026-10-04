import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LiberadoComTermoPendente } from '../../commons/auth/liberado-com-termo-pendente.decorator';
import { TermoUsoServiceFindPending } from '../service/termo-uso.service.find-pending';

@Controller('termos-uso')
export class TermoUsoControllerFindPending {
  constructor(private readonly service: TermoUsoServiceFindPending) {}

  @Get('pendente')
  @LiberadoComTermoPendente()
  pendente(@Req() request: Request) {
    return this.service.executar(request.user!.idUsuario);
  }
}
