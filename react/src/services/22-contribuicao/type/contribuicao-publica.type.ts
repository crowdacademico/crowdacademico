import type { MeioPagamento, StatusContribuicao } from '../../constant/type/enums-do-banco.gerado';

// Apoio na área pública (modal Apoiar e /apoio-confirmado) (POST /contribuicao e GET /contribuicao/:id com X-Token-Sessao).
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
  // Pix e cartão: a página de pagamento do Asaas, para onde o modal Apoiar manda quem apoia.
  linkPagamento?: string;
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

// Boleto existe no Nest, mas nasce desligado e não é oferecido na área pública.
export type MeioApoioPublico = 'pix' | 'cartao_credito';

export interface ContribuicaoPublicaRequest {
  idCampanha: number;
  valor: number;
  meioPagamento: MeioApoioPublico;
  // RF-041: obrigatório (true) em campanha flexível; o Nest recusa sem ele e grava a data da ciência.
  cienteModeloFlexivel?: boolean;
}
