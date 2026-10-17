// Erro único que QUALQUER adapter de gateway lança. O resto do sistema (workers de estorno/repasse, webhook)
// decide o que fazer olhando `codigo` e `recuperavel`, nunca o texto da mensagem nem o formato de erro de um
// provedor específico - é isso que mantém o nome "Asaas" (ou qualquer outro) dentro do adapter.
//
// `recuperavel` responde "vale tentar de novo mais tarde?": rede caindo e saldo insuficiente sim (o saldo pode ser
// reposto); recusa definitiva e cobrança inexistente não.
export type CodigoErroGateway =
  | 'REDE'
  | 'SALDO_INSUFICIENTE'
  | 'RECUSADO'
  | 'NAO_ENCONTRADO'
  // Nenhum provedor de pagamento configurado neste ambiente (ver GatewayNaoConfiguradoAdapter).
  | 'NAO_CONFIGURADO';

export class GatewayPagamentoErro extends Error {
  constructor(
    readonly codigo: CodigoErroGateway,
    mensagem: string,
    readonly recuperavel: boolean,
    // Só informativo (log/suporte): o status HTTP que o provedor real devolveu, quando faz sentido. Ex.: o Asaas
    // responde 400 para saldo insuficiente em estorno, e o Fake reproduz o mesmo número.
    readonly httpStatusEquivalente?: number,
  ) {
    super(mensagem);
    this.name = 'GatewayPagamentoErro';
  }
}
