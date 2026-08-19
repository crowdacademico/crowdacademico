import { Selectable } from 'kysely';
import { TipoLinkTable } from '../../../commons/database/db.types';
import { TipoLinkResponse } from '../response/tipo-link.response';

export class TipoLinkConverter {
  static paraResponseDto(linha: Selectable<TipoLinkTable>): TipoLinkResponse {
    return {
      idTipolink: linha.id_tipolink,
      codigo: linha.codigo,
      nome: linha.nome,
      ativo: linha.ativo,
      regex: linha.regex,
      dominio: linha.dominio,
      permitePerfil: linha.permite_perfil,
      permiteAtualizacao: linha.permite_atualizacao,
      permiteRecompensa: linha.permite_recompensa,
    };
  }
}
