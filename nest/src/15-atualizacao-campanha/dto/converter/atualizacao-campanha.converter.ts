import { AtualizacaoCampanhaEntity } from '../../entity/atualizacao-campanha.entity';
import { AtualizacaoCampanhaResponse } from '../response/atualizacao-campanha.response';

export class AtualizacaoCampanhaConverter {
  static paraResponseDto(
    entity: AtualizacaoCampanhaEntity,
  ): AtualizacaoCampanhaResponse {
    return {
      idAtualizacao: entity.id_atualizacao,
      idCampanha: entity.id_campanha,
      titulo: entity.titulo,
      conteudo: entity.conteudo,
      publicadoEm: entity.publicado_em,
      fase: entity.fase,
      tipo: entity.tipo,
      ativo: entity.ativo,
    };
  }
}
