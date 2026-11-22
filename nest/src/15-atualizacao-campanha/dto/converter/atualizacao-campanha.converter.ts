import { AtualizacaoCampanhaEntity } from '../../../commons/database/db.types';
import { AnexoAtualizacaoResponse } from '../response/anexo-atualizacao.response';
import { AtualizacaoCampanhaResponse } from '../response/atualizacao-campanha.response';

export class AtualizacaoCampanhaConverter {
  static paraResponseDto(
    entity: AtualizacaoCampanhaEntity,
    anexos: AnexoAtualizacaoResponse[] = [],
  ): AtualizacaoCampanhaResponse {
    return {
      idAtualizacao: entity.id_atualizacao,
      idCampanha: entity.id_campanha,
      titulo: entity.titulo,
      conteudo: entity.conteudo,
      publicadoEm: entity.publicado_em,
      ativo: entity.ativo,
      ocultadaModeracao: entity.ocultada_moderacao,
      motivoModeracao: entity.motivo_moderacao,
      anexos,
    };
  }
}
