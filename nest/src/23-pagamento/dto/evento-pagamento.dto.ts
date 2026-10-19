// Evento de webhook já NORMALIZADO: é o que o WebhookVerifierPort devolve e o EventoPagamentoService grava em
// evento_pagamento (01, [01-H]). O corpo original do provedor vai inteiro em `payload`, intacto, para auditoria.
export type TipoEventoPagamento =
  | 'cobranca_confirmada'
  | 'cobranca_expirada'
  | 'cobranca_estornada'
  | 'repasse_concluido'
  | 'repasse_falhou'
  // Contestação de cartão (chargeback): sempre para revisão manual, nunca muda a contribuição sozinha.
  | 'cobranca_contestada'
  // Qualquer evento que o sistema ainda não trata: é gravado (a caixa guarda tudo) e ignorado no processamento.
  | 'desconhecido';

export interface EventoPagamentoDto {
  provedor: string;
  // Id do evento NO PROVEDOR. Com `provedor`, forma a UNIQUE de evento_pagamento que barra webhook duplicado.
  idEventoExterno: string;
  tipoEvento: TipoEventoPagamento;
  // Nome do evento como o provedor mandou (vai para evento_pagamento.tipo_evento: útil para suporte).
  tipoEventoOriginal: string;
  // Preenchidos conforme o tipo: cobranca_* traz idCobranca; repasse_* traz idTransferencia.
  idCobranca?: string;
  idTransferencia?: string;
  payload: unknown;
}
