import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Publico } from '../../commons/auth/publico.decorator';
import {
  RecompensaRequestCreate,
  RecompensaRequestUpdate,
} from '../dto/request/recompensa.request-create';
import { RecompensaServiceCreate } from '../service/recompensa.service.create';
import { RecompensaServiceFindAll } from '../service/recompensa.service.findall';
import { RecompensaServiceRemove } from '../service/recompensa.service.remove';
import { RecompensaServiceUpdate } from '../service/recompensa.service.update';

// Recompensa = o Mural dos apoiadores (22-11-2026). Ver DOCUMENTACAO_BACKEND.md, seção 21.
@Controller('recompensa')
export class RecompensaController {
  constructor(
    private readonly mural: RecompensaServiceFindAll,
    private readonly criacao: RecompensaServiceCreate,
    private readonly alteracao: RecompensaServiceUpdate,
    private readonly remocao: RecompensaServiceRemove,
  ) {}

  @Get('mural/:idCampanha')
  @Publico()
  buscarMural(@Param('idCampanha', ParseIntPipe) idCampanha: number) {
    return this.mural.executar(idCampanha);
  }

  @Post()
  criar(@Body() dto: RecompensaRequestCreate) {
    return this.criacao.executar(dto);
  }

  @Patch(':idRecompensa')
  alterar(
    @Param('idRecompensa', ParseIntPipe) idRecompensa: number,
    @Body() dto: RecompensaRequestUpdate,
  ) {
    return this.alteracao.executar(idRecompensa, dto);
  }

  @Delete(':idRecompensa')
  @HttpCode(204)
  async excluir(
    @Param('idRecompensa', ParseIntPipe) idRecompensa: number,
  ): Promise<void> {
    await this.remocao.executar(idRecompensa);
  }
}
