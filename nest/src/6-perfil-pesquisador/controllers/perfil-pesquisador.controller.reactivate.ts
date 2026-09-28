import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { PerfilPesquisadorServiceReactivate } from '../service/perfil-pesquisador.service.reactivate';

@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerReactivate {
  constructor(private readonly service: PerfilPesquisadorServiceReactivate) {}

  @Post(':id/reativar')
  @HttpCode(204)
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
