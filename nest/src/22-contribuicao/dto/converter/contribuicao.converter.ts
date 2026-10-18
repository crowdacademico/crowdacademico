import { ResultadoCobranca } from '../../../29-pagamento/dto/resultado-cobranca.dto';
import { ContribuicaoResponseCreate } from '../response/contribuicao.response-create';

// Linha de `contribuicao` como o `pg` devolve (DECIMAL chega como string).
export interface LinhaContribuicao {
  id_contribuicao: number;
  id_campanha: number;
  valor: string;
  taxa_pagamento: string;
  meio_pagamento: string;
  status: string;
  token_sessao: string;
  criado_em: Date;
}

// O que a cobrança pede a quem apoia: o valor da contribuição mais a tarifa de pagamento (paga por cima).
export function valorCobrado(
  linha: Pick<LinhaContribuicao, 'valor' | 'taxa_pagamento'>,
): number {
  return (
    Math.round((Number(linha.valor) + Number(linha.taxa_pagamento)) * 100) / 100
  );
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
      taxaPagamento: Number(linha.taxa_pagamento),
      valorCobrado: valorCobrado(linha),
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
      cartao: cobranca.linkPagamento
        ? { linkPagamento: cobranca.linkPagamento }
        : undefined,
      boleto: cobranca.boleto ? { ...cobranca.boleto } : undefined,
    };
  }
}
