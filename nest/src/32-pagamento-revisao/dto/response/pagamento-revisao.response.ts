import { type SituacaoRevisao } from '../request/pagamento-revisao.request-list';

export class RevisaoPagamentoResponse {
  idEvento: number;
  provedor: string;
  tipoEvento: string;
  recebidoEm: Date;
  situacao: SituacaoRevisao;
  motivo: string | null;
  revisaoManualEm: Date | null;
  // De onde veio o dinheiro/efeito (preenchido quando o aviso deixou auditoria).
  idContribuicao: number | null;
  idRepasse: number | null;
  // Valor do evento (da auditoria) e para onde o dinheiro andou segundo o provedor: 'entrada' (pagamento recebido),
  // 'saida' (estorno, devolução, transferência concluída) ou null (nada se moveu).
  valor: number | null;
  sentido: 'entrada' | 'saida' | null;
  // Arrecadado ATUAL da campanha da contribuição ou do repasse.
  arrecadado: number | null;
}

export class ReembolsoManualResponse {
  idContribuicao: number;
  idCampanha: number;
  // null = contribuição feita sem conta.
  idUsuario: number | null;
  valorBruto: number;
  // O valor da contribuição: a tarifa do provedor, paga por cima, não volta (mesma conta da devolução automática).
  valorADevolver: number;
  meioPagamento: string;
  tentativas: number;
  ultimoMotivo: string | null;
  // Quem contribuiu tem chave Pix de recebimento verificada para onde devolver (a chave em si não sai daqui).
  contribuinteTemContaVerificada: boolean;
}

export class RepasseAtencaoResponse {
  idRepasse: number;
  idCampanha: number;
  titulo: string;
  status: string;
  valorLiquido: number;
  tentativas: number;
  idTransferenciaApi: string | null;
  ultimoMotivo: string | null;
  // true = o dono da campanha ainda não cadastrou/verificou a chave Pix: o repasse espera na fila, sem erro.
  aguardandoConta: boolean;
}
