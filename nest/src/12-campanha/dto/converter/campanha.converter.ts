import { CampanhaEntity } from '../../entity/campanha.entity';
import { CampanhaResponse } from '../response/campanha.response';

export class CampanhaConverter {
  static paraResponseDto(entity: CampanhaEntity): CampanhaResponse {
    return {
      idCampanha: entity.id_campanha,
      idUsuario: entity.id_usuario,
      idAdmin: entity.id_admin,
      idAreaConhecimento: entity.id_area_conhecimento,
      titulo: entity.titulo,
      modelo: entity.modelo,
      // DECIMAL vem como string do driver (mesmo cuidado de
      // ScoreConfigTable.peso) - Number() converte pra resposta JSON, sem
      // risco de precisão nesta faixa de valores (crowdfunding acadêmico,
      // não trilhões).
      metaFinanceira: Number(entity.meta_financeira),
      valorBrutoArrecadado: Number(entity.valor_bruto_arrecadado),
      taxaPlataforma:
        entity.taxa_plataforma === null ? null : Number(entity.taxa_plataforma),
      descricao: entity.descricao,
      dataInicio: entity.data_inicio,
      dataFim: entity.data_fim,
      status: entity.status,
      aprovadoEm: entity.aprovado_em,
      encerradoEm: entity.encerrado_em,
      videoApresentacaoUrl: entity.video_apresentacao_url,
      criadoEm: entity.criado_em,
    };
  }
}
