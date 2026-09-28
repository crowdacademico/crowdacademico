import { LinkAtualizacaoEntity } from '../../../commons/database/db.types';
import { LinkAtualizacaoResponse } from '../response/link-atualizacao.response';

export class LinkAtualizacaoConverter {
  static paraResponseDto(
    entity: LinkAtualizacaoEntity,
  ): LinkAtualizacaoResponse {
    return {
      idLinkAtualizacao: entity.id_link_atualizacao,
      idAtualizacao: entity.id_atualizacao,
      idTipoLink: entity.id_tipolink,
      url: entity.url,
      ordem: entity.ordem,
    };
  }
}
