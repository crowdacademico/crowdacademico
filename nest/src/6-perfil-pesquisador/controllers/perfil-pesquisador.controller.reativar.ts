import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PerfilPesquisadorServiceReativar } from '../service/perfil-pesquisador.service.reativar';

@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerReativar {
  constructor(private readonly service: PerfilPesquisadorServiceReativar) {}

  @Post(':id/reativar')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
