import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { SEGUIR_CAMPANHA_COLUNAS_SELECT } from '../constants/seguir-campanha.constants';
import { SeguirCampanhaConverter } from '../dto/converter/seguir-campanha.converter';
import { SeguirCampanhaResponse } from '../dto/response/seguir-campanha.response';

// pol_seg_campanha_select (04) é `id_usuario = id_usuario_atual()` - cada
// sessão só vê a própria lista, nunca a de outra pessoa. Por isso não
// existe parâmetro idUsuario aqui (diferente de link-academico/comentario,
// que são públicos) - idUsuario vem sempre de request.user.
@Injectable()
export class SeguirCampanhaServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<SeguirCampanhaResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('seguir_campanha')
      .select(SEGUIR_CAMPANHA_COLUNAS_SELECT)
      .where('id_usuario', '=', idUsuario)
      .orderBy('seguido_em', 'desc')
      .execute();

    return linhas.map((linha) =>
      SeguirCampanhaConverter.paraResponseDto(linha),
    );
  }
}
