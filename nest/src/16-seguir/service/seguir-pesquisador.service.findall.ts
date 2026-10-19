import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { SEGUIR_PESQUISADOR_COLUNAS_SELECT } from '../constants/seguir-pesquisador.constants';
import { SeguirPesquisadorConverter } from '../dto/converter/seguir-pesquisador.converter';
import { SeguirPesquisadorResponse } from '../dto/response/seguir-pesquisador.response';

// Os pesquisadores que a própria conta segue. pol_seg_pesq_select (04) só mostra as linhas da sessão, igual a
// seguir_campanha: não existe "ver quem outra pessoa segue".
@Injectable()
export class SeguirPesquisadorServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<SeguirPesquisadorResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('seguir_pesquisador')
      .leftJoin(
        'usuario',
        'usuario.id_usuario',
        'seguir_pesquisador.id_pesquisador',
      )
      .select([
        ...SEGUIR_PESQUISADOR_COLUNAS_SELECT,
        'usuario.nome as nome_pesquisador',
      ])
      .where('seguir_pesquisador.id_usuario', '=', idUsuario)
      .orderBy('seguir_pesquisador.seguido_em', 'desc')
      .execute();

    return linhas.map((linha) =>
      SeguirPesquisadorConverter.paraResponseDto(linha),
    );
  }
}
