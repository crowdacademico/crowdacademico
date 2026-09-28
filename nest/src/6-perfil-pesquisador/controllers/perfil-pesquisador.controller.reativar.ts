import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { PerfilPesquisadorServiceReativar } from '../service/perfil-pesquisador.service.reativar';

@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerReativar {
  constructor(private readonly service: PerfilPesquisadorServiceReativar) {}

  @Post(':id/reativar')
  @HttpCode(204)
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
