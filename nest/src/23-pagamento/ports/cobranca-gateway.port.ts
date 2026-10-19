import {
  MeioPagamentoGateway,
  ResultadoCobranca,
  ResultadoEstorno,
} from '../dto/resultado-cobranca.dto';

// Token de injeção - todo consumidor usa @Inject(COBRANCA_GATEWAY) contra a INTERFACE, nunca a classe do adapter.
// Mesmo padrão de PG_POOL e ARMAZENAMENTO_SERVICE.
export const COBRANCA_GATEWAY = 'COBRANCA_GATEWAY';

export interface DestinatarioSplit {
  // Identificador da carteira/conta de destino NO PROVEDOR.
  idCarteira: string;
  percentual?: number;
  valorFixo?: number;
}

export interface CriarCobrancaParams {
  // Mesma chave => mesma cobrança, sem duplicar. Quem chama manda contribuicao.token_sessao (decisão do PR-01,
  // [01-H] em DOCUMENTACAO_BD.md).
  chaveIdempotencia: string;
  // Total cobrado de quem apoia: a contribuição + a tarifa estimada.
  valor: number;
  // Parte de `valor` que é a tarifa estimada do provedor (taxa_pagamento da contribuição). O adapter que souber a tarifa
  // real na criação corrige o valor da cobrança para que o líquido cubra a contribuição; `ResultadoCobranca.valor` traz o
  // valor final cobrado.
  tarifaEstimada?: number;
  meioPagamento: MeioPagamentoGateway;
  // Alinhado a campanha.data_fim: nunca sobra PIX pendente depois do prazo.
  expiraEm: Date;
  descricao?: string;
  split?: { destinatarios: DestinatarioSplit[] };
}

// Contrato de cobrança/estorno. Tudo que o sistema sabe de "receber dinheiro" passa por aqui; o adapter do
// provedor (Fake hoje, Asaas no PR-10) é o único lugar que conhece o provedor. Erros sempre como
// GatewayPagamentoErro (erro-gateway-pagamento.ts, nesta pasta).
export interface CobrancaGatewayPort {
  // Nome curto do provedor ('fake', 'asaas'): vai para contribuicao.provedor e evento_pagamento.provedor.
  readonly provedor: string;

  criarCobranca(params: CriarCobrancaParams): Promise<ResultadoCobranca>;

  // Estado ATUAL no provedor. O webhook usa isto para nunca confiar só no payload recebido (PR-05).
  consultarCobranca(idCobranca: string): Promise<ResultadoCobranca>;

  // `valor` omitido = estorno do que ainda resta (integral). `valor` informado = estorno parcial, devolve
  // EXATAMENTE esse valor: é como o tudo-ou-nada devolve a contribuição sem a tarifa de pagamento (paga por cima).
  // `chaveIdempotencia` opcional: repetir a chamada (retry do worker) não pode estornar duas vezes.
  estornar(
    idCobranca: string,
    valor?: number,
    opcoes?: { chaveIdempotencia?: string },
  ): Promise<ResultadoEstorno>;

  // Cancela uma cobrança AINDA ABERTA no provedor (contribuição que expirou ou falhou aqui): impede que alguém pague
  // depois o que o sistema já não contabiliza. Cobrança inexistente => NAO_ENCONTRADO; já paga (ou que o provedor não
  // deixa mais cancelar) => RECUSADO: quem chama trata os dois como "nada mais a cancelar".
  cancelarCobranca(idCobranca: string): Promise<void>;
}
