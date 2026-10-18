// Pedido do provedor para AUTORIZAR uma saída de dinheiro antes de executá-la ("validação de saque por webhook").
// Normalizado pelo adapter: o resto do sistema não vê o formato do provedor. Conhecidas: a transferência do repasse e a
// devolução de Pix de uma contribuição; qualquer outro tipo de saída (pagar conta, recarga, etc.) chega como 'outro' e é
// sempre recusado.
export interface AutorizacaoSaqueDto {
  tipo: 'transferencia' | 'estorno' | 'outro';
  // Só no estorno: a cobrança que está sendo devolvida.
  idCobranca?: string;
  idTransferencia?: string;
  // Referência que enviamos ao pedir a transferência (= repasse.chave_idempotencia). O provedor a devolve no pedido.
  referenciaExterna?: string;
  valor?: number;
  // Chave Pix de destino como o provedor vai executar (formato do provedor; quem compara normaliza).
  chavePixDestino?: string;
}
