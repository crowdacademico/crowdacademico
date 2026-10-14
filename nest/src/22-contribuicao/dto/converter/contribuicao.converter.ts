import { ResultadoCobranca } from '../../../29-pagamento/dto/resultado-cobranca.dto';
import { ContribuicaoResponseCreate } from '../response/contribuicao.response-create';

// Linha de `contribuicao` como o `pg` devolve (DECIMAL chega como string).
export interface LinhaContribuicao {
  id_contribuicao: number;
  id_campanha: number;
  valor: string;
  meio_pagamento: string;
  status: string;
  token_sessao: string;
  criado_em: Date;
}

export class ContribuicaoConverter {
  static paraResponseCreate(
    linha: LinhaContribuicao,
    cobranca: ResultadoCobranca,
  ): ContribuicaoResponseCreate {
    return {
      idContribuicao: linha.id_contribuicao,
      tokenSessao: linha.token_sessao,
      idCampanha: linha.id_campanha,
      valor: Number(linha.valor),
      meioPagamento: linha.meio_pagamento,
      status: linha.status,
      criadoEm: linha.criado_em,
      pix: cobranca.pix
        ? {
            copiaECola: cobranca.pix.copiaECola,
            qrCodeBase64: cobranca.pix.qrCodeBase64,
            expiraEm: cobranca.pix.expiraEm,
          }
        : undefined,
    };
  }
}
