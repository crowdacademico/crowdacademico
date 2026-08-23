import { OrcamentoCampanhaEntity } from '../../entity/orcamento-campanha.entity';
import { OrcamentoCampanhaResponse } from '../response/orcamento-campanha.response';

export class OrcamentoCampanhaConverter {
  static paraResponseDto(
    entity: OrcamentoCampanhaEntity,
  ): OrcamentoCampanhaResponse {
    return {
      idOrcamento: entity.id_orcamento,
      idCampanha: entity.id_campanha,
      categoria: entity.categoria,
      descricao: entity.descricao,
      valor: Number(entity.valor),
      ordem: entity.ordem,
      criadoEm: entity.criado_em,
    };
  }
}
