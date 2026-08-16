import { Selectable } from 'kysely';
import { TipoLinkTable } from '../../../commons/database/db.types';
import { TipoLinkResponseDto } from '../response/tipo-link.response.dto';

export class TipoLinkConverter {
  static paraResponseDto(
    linha: Selectable<TipoLinkTable>,
  ): TipoLinkResponseDto {
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
