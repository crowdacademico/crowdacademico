import { ArquivoAtualizacaoEntity } from '../../entity/arquivo-atualizacao.entity';
import { ArquivoAtualizacaoResponse } from '../response/arquivo-atualizacao.response';

export class ArquivoAtualizacaoConverter {
  static paraResponseDto(
    entity: ArquivoAtualizacaoEntity,
  ): ArquivoAtualizacaoResponse {
    return {
      idArqAtu: entity.id_arq_atu,
      idArquivo: entity.id_arquivo,
      idAtualizacao: entity.id_atualizacao,
    };
  }
}
