import { ComentarioEntity } from '../../entity/comentario.entity';
import { ComentarioResponse } from '../response/comentario.response';

export class ComentarioConverter {
  static paraResponseDto(entity: ComentarioEntity): ComentarioResponse {
    return {
      idComentario: entity.id_comentario,
      idCampanha: entity.id_campanha,
      idPesquisador: entity.id_pesquisador,
      conteudo: entity.conteudo,
      endossado: entity.endossado,
      criadoEm: entity.criado_em,
      ordemEndosso: entity.ordem_endosso,
      ativo: entity.ativo,
    };
  }
}
