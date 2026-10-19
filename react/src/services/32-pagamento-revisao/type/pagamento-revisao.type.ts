import type { MeioPagamento, StatusRepasse } from '../../constant/type/enums-do-banco.gerado';

// Espelha nest/src/32-pagamento-revisao/dto/response/pagamento-revisao.response.ts. As datas chegam como texto ISO.
// Os três painéis são as FILAS do que o sistema deliberadamente não resolve sozinho: nenhum deles move dinheiro, só
// destrava o que está parado e deixa o rastro (quem fez, o quê) na auditoria financeira.

// Espelha SITUACOES_REVISAO (dto/request/pagamento-revisao.request-list.ts).
export type SituacaoRevisao = 'processado' | 'vale_tentar_de_novo' | 'em_revisao_manual' | 'revisao_resolvida';

export interface RevisaoPagamentoResponse {
  idEvento: number;
  provedor: string;
  // Nome do evento COMO O PROVEDOR mandou (ex.: PAYMENT_RECEIVED), não o tipo normalizado do sistema.
  tipoEvento: string;
  recebidoEm: string;
  situacao: SituacaoRevisao;
  motivo: string | null;
  revisaoManualEm: string | null;
  // De onde veio o dinheiro/efeito (quando o aviso deixou auditoria).
  idContribuicao: number | null;
  idRepasse: number | null;
  // Valor do evento (da auditoria) e para onde o dinheiro andou segundo o provedor: 'entrada' (pagamento recebido),
  // 'saida' (estorno, devolução, transferência concluída) ou null (nada se moveu).
  valor: number | null;
  sentido: 'entrada' | 'saida' | null;
  // Arrecadado ATUAL da campanha da contribuição ou do repasse.
  arrecadado: number | null;
}

export interface ReembolsoManualResponse {
  idContribuicao: number;
  idCampanha: number;
  // null = contribuição feita sem conta.
  idUsuario: number | null;
  valorBruto: number;
  // O valor da contribuição: a tarifa do provedor, paga por cima, não volta (mesma conta da devolução automática).
  valorADevolver: number;
  meioPagamento: MeioPagamento;
  tentativas: number;
  ultimoMotivo: string | null;
  // Quem contribuiu tem chave Pix de recebimento verificada para onde devolver (a chave em si não sai da API).
  contribuinteTemContaVerificada: boolean;
}

export interface RepasseAtencaoResponse {
  idRepasse: number;
  idCampanha: number;
  titulo: string;
  status: StatusRepasse;
  valorLiquido: number;
  tentativas: number;
  idTransferenciaApi: string | null;
  ultimoMotivo: string | null;
  // true = o dono da campanha ainda não cadastrou/verificou a chave Pix: o repasse espera na fila, sem erro.
  aguardandoConta: boolean;
}

export interface FiltroRevisaoPagamento {
  situacao?: SituacaoRevisao;
}
