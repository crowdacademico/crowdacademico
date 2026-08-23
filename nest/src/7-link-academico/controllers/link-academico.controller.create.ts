import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { LinkAcademicoRequestCreate } from '../dto/request/link-academico.request-create';
import { LinkAcademicoServiceCreate } from '../service/link-academico.service.create';

@Controller('link-academico')
export class LinkAcademicoControllerCreate {
  constructor(private readonly service: LinkAcademicoServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: LinkAcademicoRequestCreate, @Req() request: Request) {
    return this.service.executar(dto, request.user!.idUsuario);
  }
}
