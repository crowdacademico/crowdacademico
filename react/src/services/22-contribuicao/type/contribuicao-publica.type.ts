import type { MeioPagamento, StatusContribuicao } from '../../constant/type/enums-do-banco.gerado';

// Apoio na área pública (modal Apoiar e /apoio-confirmado) (POST /contribuicao e GET /contribuicao/:id com X-Token-Sessao).
// Espelha os DTOs de resposta do Nest em nest/src/22-contribuicao/dto/response/.

export interface ContribuicaoPixPublica {
  copiaECola: string;
  qrCodeBase64?: string;
  expiraEm: string;
  // QR de TESTE do sandbox (o Asaas não gerou o da cobrança): o pagamento de teste é o "Confirmar pagamento" do painel do Asaas.
  simulado?: boolean;
}

export interface ContribuicaoBoletoPublica {
  link: string;
  linhaDigitavel: string;
  venceEm: string;
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
  // Pix e cartão: a página de pagamento do Asaas (no cartão, para onde o modal Apoiar manda quem apoia; no Pix, alternativa ao QR do modal).
  linkPagamento?: string;
  pix?: ContribuicaoPixPublica;
  boleto?: ContribuicaoBoletoPublica;
}

export interface StatusContribuicaoPublica {
  idContribuicao: number;
  idCampanha: number;
  valor: number;
  meioPagamento: MeioPagamento;
  status: StatusContribuicao;
  criadoEm: string;
  // A versão do Termo de Uso aceita ao apoiar, e quando (null = sem registro).
  termoAceito: { versao: string; aceitoEm: string } | null;
}

// O débito existe no enum do banco, mas o Nest não aceita (MEIOS_PAGAMENTO_ACEITOS).
export type MeioApoioPublico = 'pix' | 'cartao_credito' | 'boleto';

export interface ContribuicaoPublicaRequest {
  idCampanha: number;
  valor: number;
  meioPagamento: MeioApoioPublico;
  // RF-086: a caixa "Li e aceito os Termos de Uso". A API recusa sem ela (16-11-2026).
  aceiteTermos: true;
  // RF-041: obrigatório (true) em campanha flexível; o Nest recusa sem ele e grava a data da ciência.
  cienteModeloFlexivel?: boolean;
}
