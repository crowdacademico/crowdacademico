import type { TipoChavePix } from '../../../commons/database/db.types';
import { decifrarChavePix } from '../../../commons/seguranca/chave-pix-cifra.util';
import { mascararChavePix } from '../../util/chave-pix.util';
import { ContaRecebimentoResponse } from '../response/conta-recebimento.response';

// Colunas da chave Pix em perfil_pesquisador.
export interface LinhaChavePix {
  tipo_chave_pix: TipoChavePix | null;
  chave_pix_criptografada: string | null;
  chave_pix_verificada_em: Date | null;
}

export class ContaRecebimentoConverter {
  // null = o pesquisador ainda não cadastrou chave.
  static paraResponseDto(
    linha: LinhaChavePix,
  ): ContaRecebimentoResponse | null {
    if (!linha.tipo_chave_pix || !linha.chave_pix_criptografada) return null;
    return {
      tipoChave: linha.tipo_chave_pix,
      chaveMascarada: mascararChavePix(
        linha.tipo_chave_pix,
        decifrarChavePix(linha.chave_pix_criptografada),
      ),
      titularidadeVerificada: linha.chave_pix_verificada_em !== null,
      titularidadeVerificadaEm: linha.chave_pix_verificada_em,
    };
  }
}
