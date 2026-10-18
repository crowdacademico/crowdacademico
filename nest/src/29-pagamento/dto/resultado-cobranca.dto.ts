// Resultado de domínio de uma cobrança. NÃO é o JSON do gateway: cada adapter traduz o formato do provedor para
// este, e o resto do sistema nunca vê o original.
//
// Valores em REAIS, como `number` com 2 casas (mesma unidade de contribuicao.valor). O Kysely devolve DECIMAL como
// string: quem lê do banco converte na fronteira (Number(...)), nunca soma string com número.

export type MeioPagamentoGateway = 'pix' | 'cartao_credito' | 'boleto';

// 'estornada' só quando TODO o valor foi devolvido. Estorno parcial mantém 'confirmada' e preenche
// `valorEstornado` (é o que o tudo-ou-nada faz ao devolver o valor sem a tarifa de pagamento: a cobrança original continua paga).
export type StatusCobrancaGateway =
  'pendente' | 'confirmada' | 'expirada' | 'estornada';

export interface DadosPix {
  // Texto do "PIX copia e cola".
  copiaECola: string;
  // Imagem do QR code em base64 (sem o prefixo data:). Opcional: dá para montar o QR a partir do copia-e-cola.
  qrCodeBase64?: string;
  expiraEm: Date;
}

export interface DadosBoleto {
  // Página do provedor com o boleto para imprimir ou baixar.
  link: string;
  // A "linha digitável" (os números do boleto), para pagar pelo aplicativo do banco.
  linhaDigitavel: string;
  venceEm: Date;
}

export interface ResultadoCobranca {
  idCobranca: string;
  status: StatusCobrancaGateway;
  meioPagamento: MeioPagamentoGateway;
  valor: number;
  valorEstornado: number;
  // Só em cobrança PIX.
  pix?: DadosPix;
  // Só quando a cobrança foi criada com split.
  idSplit?: string;
  // Só em cobrança de cartão: a página segura do provedor onde quem apoia digita o cartão e paga.
  linkPagamento?: string;
  // Só em cobrança por boleto.
  boleto?: DadosBoleto;
  // O provedor já liberou o dinheiro para uso (Pix: ao pagar; cartão: cerca de 30 dias depois). Sem a informação, falso.
  dinheiroLiberado?: boolean;
}

export interface ResultadoEstorno {
  idCobranca: string;
  // O que ESTE estorno devolveu (nunca o valor cheio da cobrança quando foi parcial).
  valorEstornado: number;
  // Acumulado de todos os estornos da cobrança.
  valorTotalEstornado: number;
  status: StatusCobrancaGateway;
  // O dinheiro já voltou para quem pagou. Falso = o provedor aceitou o pedido mas ainda não concluiu (por exemplo,
  // esperando a autorização da devolução): a contribuição continua 'a_devolver' até concluir.
  concluido: boolean;
}
