import type { MeioPagamento, StatusContribuicao, StatusRepasse } from '../../constant/type/enums-do-banco.gerado';

// Espelha nest/src/25-pagamento-revisao/dto/response/pagamento-revisao.response.ts. As datas chegam como texto ISO.
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
  // Baixa dada por uma pessoa: quando e quem (null quando ninguém deu baixa; nome null se a conta foi excluída).
  resolvidoEm: string | null;
  idResolvidoPor: number | null;
  nomeResolvidoPor: string | null;
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

// Espelha ContribuicaoAdminResponse (nest/src/25-pagamento-revisao/dto/response). idApoiador null = contribuição sem
// conta; idRepasse null = ainda não entrou em repasse.
export interface ContribuicaoAdminResponse {
  idContribuicao: number;
  idCampanha: number;
  tituloCampanha: string;
  idApoiador: number | null;
  nomeApoiador: string | null;
  anonima: boolean;
  valor: number;
  meioPagamento: MeioPagamento;
  status: StatusContribuicao;
  criadoEm: string;
  idRepasse: number | null;
  statusRepasse: StatusRepasse | null;
}

// Espelha RepasseAdminResponse (nest/src/25-pagamento-revisao/dto/response). aguardandoConta: como em
// RepasseAtencaoResponse (só muda o rótulo de um repasse pendente).
export interface RepasseAdminResponse {
  idRepasse: number;
  idCampanha: number;
  tituloCampanha: string;
  valorBruto: number;
  valorLiquido: number;
  metaAtingida: boolean;
  status: StatusRepasse;
  aguardandoConta: boolean;
  criadoEm: string;
  repassadoEm: string | null;
}

// Espelha AuditoriaFinanceiraResponse (nest/src/25-pagamento-revisao/dto/response). Uma linha é de UMA contribuição OU
// de UM repasse; idResponsavel null = o próprio sistema (tarefa automática ou aviso do provedor).
export interface AuditoriaFinanceiraResponse {
  idAuditoria: number;
  idContribuicao: number | null;
  idRepasse: number | null;
  idEventoPagamento: number | null;
  valor: number;
  meioPagamento: string | null;
  statusAnterior: string | null;
  statusNovo: string;
  evento: string | null;
  idResponsavel: number | null;
  nomeResponsavel: string | null;
  ocorridoEm: string;
}

export interface FiltroRevisaoPagamento {
  situacao?: SituacaoRevisao;
}
