import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { RecompensaRequestUpdate } from '../dto/request/recompensa.request-update';
import { RecompensaServiceLink } from '../service/recompensa.service.link';
import { RecompensaServiceUpdate } from '../service/recompensa.service.update';
import { RecompensaServiceRemove } from '../service/recompensa.service.remove';

// Alterar, desativar (ativo = false pelo PATCH) e tirar o link especial. Só o dono da campanha ou campanha_editar.
@Controller('recompensa')
export class RecompensaControllerUpdate {
  constructor(
    private readonly service: RecompensaServiceUpdate,
    private readonly link: RecompensaServiceLink,
    private readonly remocao: RecompensaServiceRemove,
  ) {}

  @Patch(':idRecompensa')
  alterar(
    @Param('idRecompensa', ParseIntPipe) idRecompensa: number,
    @Body() dto: RecompensaRequestUpdate,
  ) {
    return this.service.executar(idRecompensa, dto);
  }

  // Excluir: só a que ninguém ganhou (a concedida se desativa pelo PATCH).
  @Delete(':idRecompensa')
  @HttpCode(204)
  async excluir(
    @Param('idRecompensa', ParseIntPipe) idRecompensa: number,
  ): Promise<void> {
    await this.remocao.executar(idRecompensa);
  }

  @Delete('link/:idLinkRecompensa')
  @HttpCode(204)
  async removerLink(
    @Param('idLinkRecompensa', ParseIntPipe) idLinkRecompensa: number,
  ): Promise<void> {
    await this.link.remover(idLinkRecompensa);
  }
}
