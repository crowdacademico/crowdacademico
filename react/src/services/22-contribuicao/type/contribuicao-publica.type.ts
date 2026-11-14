import type { MeioPagamento, StatusContribuicao } from '../../constant/type/enums-do-banco.gerado';

// Checkout e confirmação do apoio na área pública (POST /contribuicao e GET /contribuicao/:id com X-Token-Sessao).
// Espelha os DTOs de resposta do Nest em nest/src/22-contribuicao/dto/response/.

export interface ContribuicaoPixPublica {
  copiaECola: string;
  qrCodeBase64?: string;
  expiraEm: string;
}

export interface ContribuicaoCriadaPublica {
  idContribuicao: number;
  tokenSessao: string;
  idCampanha: number;
  valor: number;
  taxaPagamento: number;
  valorCobrado: number;
  meioPagamento: MeioPagamento;
  status: StatusContribuicao;
  criadoEm: string;
  pix?: ContribuicaoPixPublica;
}

export interface StatusContribuicaoPublica {
  idContribuicao: number;
  idCampanha: number;
  valor: number;
  meioPagamento: MeioPagamento;
  status: StatusContribuicao;
  criadoEm: string;
}

export interface ContribuicaoPublicaRequest {
  idCampanha: number;
  valor: number;
  meioPagamento: 'pix';
  // RF-041: obrigatório (true) em campanha flexível; o Nest recusa sem ele e grava a data da ciência.
  cienteModeloFlexivel?: boolean;
}
