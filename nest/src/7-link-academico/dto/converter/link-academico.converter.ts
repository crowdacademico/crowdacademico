import { LinkAcademicoEntity } from '../../entity/link-academico.entity';
import { LinkAcademicoResponse } from '../response/link-academico.response';

export class LinkAcademicoConverter {
  static paraResponseDto(entity: LinkAcademicoEntity): LinkAcademicoResponse {
    return {
      idLinkAcademico: entity.id_link_academico,
      idUsuario: entity.id_usuario,
      idTipoLink: entity.id_tipolink,
      url: entity.url,
      rotulo: entity.rotulo,
      ordem: entity.ordem,
    };
  }
}
