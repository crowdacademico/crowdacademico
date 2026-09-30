import { ComentarioEntity } from '../../../commons/database/db.types';
import { ComentarioResponse } from '../response/comentario.response';

// nome_pesquisador só existe na listagem (LEFT JOIN em comentario.service.findall.ts).
type ComentarioComNome = ComentarioEntity & {
  nome_pesquisador?: string | null;
};

export class ComentarioConverter {
  static paraResponseDto(entity: ComentarioComNome): ComentarioResponse {
    return {
      idComentario: entity.id_comentario,
      idCampanha: entity.id_campanha,
      idPesquisador: entity.id_pesquisador,
      conteudo: entity.conteudo,
      endossado: entity.endossado,
      criadoEm: entity.criado_em,
      ordemEndosso: entity.ordem_endosso,
      ativo: entity.ativo,
      nomePesquisador: entity.nome_pesquisador ?? null,
    };
  }
}
