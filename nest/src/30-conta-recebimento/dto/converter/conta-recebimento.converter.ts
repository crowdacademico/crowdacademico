import type { ContaRecebimentoUsuarioEntity } from '../../../commons/database/db.types';
import { decifrarChavePix } from '../../../commons/seguranca/chave-pix-cifra.util';
import { mascararChavePix } from '../../util/chave-pix.util';
import { ContaRecebimentoResponse } from '../response/conta-recebimento.response';

export class ContaRecebimentoConverter {
  static paraResponseDto(
    entity: ContaRecebimentoUsuarioEntity,
  ): ContaRecebimentoResponse {
    return {
      idContaRecebimento: entity.id_conta_recebimento,
      tipoChave: entity.tipo_chave,
      chaveMascarada: mascararChavePix(
        entity.tipo_chave,
        decifrarChavePix(entity.chave_criptografada),
      ),
      titularidadeVerificada: entity.titularidade_verificada_em !== null,
      titularidadeVerificadaEm: entity.titularidade_verificada_em,
      ativa: entity.ativa,
      criadaEm: entity.criada_em,
    };
  }
}
