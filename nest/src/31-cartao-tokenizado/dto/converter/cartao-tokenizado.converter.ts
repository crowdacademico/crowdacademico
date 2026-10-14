import type { CartaoTokenizadoUsuarioEntity } from '../../../commons/database/db.types';
import { CartaoTokenizadoResponse } from '../response/cartao-tokenizado.response';

export class CartaoTokenizadoConverter {
  static paraResponseDto(
    entity: Pick<
      CartaoTokenizadoUsuarioEntity,
      'id_cartao' | 'bandeira' | 'ultimos_digitos' | 'ativo' | 'criado_em'
    >,
  ): CartaoTokenizadoResponse {
    return {
      idCartao: entity.id_cartao,
      bandeira: entity.bandeira,
      ultimosDigitos: entity.ultimos_digitos,
      ativo: entity.ativo,
      criadoEm: entity.criado_em,
    };
  }
}
