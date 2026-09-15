import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { COMENTARIO_COLUNAS_SELECT } from '../constants/comentario.constants';
import { ComentarioConverter } from '../dto/converter/comentario.converter';
import { ComentarioRequestCreate } from '../dto/request/comentario.request-create';
import { ComentarioResponse } from '../dto/response/comentario.response';

// Todo comentário nasce sem endosso (RF-089: endossar é ação do DONO da
// campanha, separada e posterior - ver ComentarioServiceUpdate) - nem
// tenta mandar `endossado`/`ordem_endosso` aqui, o banco zera os dois
// incondicionalmente de qualquer forma (trg_comentario_ignora_endosso_
// criacao, 05_regras_negocio.sql).
@Injectable()
export class ComentarioServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: ComentarioRequestCreate,
    idPesquisador: number,
  ): Promise<ComentarioResponse> {
    const linha = await this.database
      .getDb()
      .insertInto('comentario')
      .values({
        id_campanha: dto.idCampanha,
        id_pesquisador: idPesquisador,
        conteudo: dto.conteudo,
        endossado: false,
        ordem_endosso: null,
      })
      .returning(COMENTARIO_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    return ComentarioConverter.paraResponseDto(linha);
  }
}
