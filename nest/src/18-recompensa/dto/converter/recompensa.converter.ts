import type {
  LinkRecompensaEntity,
  RecompensaEntity,
} from '../../../commons/database/db.types';
import {
  RecompensaLinkResponse,
  RecompensaResponse,
} from '../response/recompensa.response';

export class RecompensaConverter {
  static paraLink(entity: LinkRecompensaEntity): RecompensaLinkResponse {
    return {
      idLinkRecompensa: entity.id_link_recompensa,
      idTipoLink: entity.id_tipolink,
      url: entity.url,
    };
  }

  static paraResponseDto(
    entity: Omit<RecompensaEntity, 'quantidade_disponivel'>,
    escolhidas: number,
    links: LinkRecompensaEntity[],
  ): RecompensaResponse {
    return {
      idRecompensa: entity.id_recompensa,
      idCampanha: entity.id_campanha,
      titulo: entity.titulo,
      descricao: entity.descricao,
      valorMinimo: Number(entity.valor_minimo),
      tipo: entity.tipo,
      ativo: entity.ativo,
      criadoEm: entity.criado_em,
      escolhidas,
      links: links.map((link) => RecompensaConverter.paraLink(link)),
    };
  }
}
