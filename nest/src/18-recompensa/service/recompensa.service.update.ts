import { Injectable, NotFoundException } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { RECOMPENSA_COLUNAS_SELECT } from '../constants/recompensa.constants';
import { RecompensaRequestUpdate } from '../dto/request/recompensa.request-update';
import { RecompensaResponse } from '../dto/response/recompensa.response';
import { RecompensaServiceFindAll } from './recompensa.service.findall';

// Alterar ou desativar (ativo = false; não existe excluir: uma recompensa já escolhida numa contribuição precisa
// continuar existindo, FK_CONTRIBUICAO_RECOMPENSA_RECOMPENSA). Dono da campanha ou quem tem campanha_editar
// (pol_recompensa_update, 04).
@Injectable()
export class RecompensaServiceUpdate {
  constructor(
    private readonly database: DatabaseService,
    private readonly findAll: RecompensaServiceFindAll,
  ) {}

  async executar(
    idRecompensa: number,
    dto: RecompensaRequestUpdate,
  ): Promise<RecompensaResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('recompensa')
      .set({
        ...(dto.titulo !== undefined && { titulo: dto.titulo.trim() }),
        ...(dto.descricao !== undefined && {
          descricao: dto.descricao?.trim() || null,
        }),
        ...(dto.valorMinimo !== undefined && {
          valor_minimo: dto.valorMinimo.toFixed(2),
        }),
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.ativo !== undefined && { ativo: dto.ativo }),
      })
      .where('id_recompensa', '=', idRecompensa)
      .returning(RECOMPENSA_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      return await distinguir404ou403(
        this.database.getDb(),
        'recompensa',
        { id_recompensa: idRecompensa },
        'Recompensa não encontrada.',
        'Só o dono da campanha altera as recompensas dela.',
      );
    }
    const lista = await this.findAll.executar(linha.id_campanha);
    const atualizada = lista.find((r) => r.idRecompensa === idRecompensa);
    if (!atualizada) throw new NotFoundException('Recompensa não encontrada.');
    return atualizada;
  }
}
