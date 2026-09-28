import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PapelPermissaoServiceRemove } from '../service/papel-permissao.service.remove';

@Controller('papel-permissao')
export class PapelPermissaoControllerRemove {
  constructor(private readonly service: PapelPermissaoServiceRemove) {}

  @Delete(':idPapel/:idPermissao')
  @HttpCode(204)
  remover(
    @Param('idPapel', ParseIntPipe) idPapel: number,
    @Param('idPermissao', ParseIntPipe) idPermissao: number,
  ) {
    return this.service.executar(idPapel, idPermissao);
  }
}
