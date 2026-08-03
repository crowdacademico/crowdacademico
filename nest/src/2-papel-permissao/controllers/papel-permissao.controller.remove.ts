import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { PapelPermissaoServiceRemove } from '../service/papel-permissao.service.remove';

@Controller('papel-permissao')
export class PapelPermissaoControllerRemove {
  constructor(private readonly service: PapelPermissaoServiceRemove) {}

  @Delete(':idPapel/:idPermissao')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  remover(
    @Param('idPapel', ParseIntPipe) idPapel: number,
    @Param('idPermissao', ParseIntPipe) idPermissao: number,
  ) {
    return this.service.executar(idPapel, idPermissao);
  }
}
