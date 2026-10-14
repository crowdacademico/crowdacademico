// Meios aceitos por POST /contribuicao hoje. O enum do banco tem mais (cartao_debito, boleto), mas a porta de
// cobrança (CobrancaGatewayPort) só sabe PIX e cartão de crédito. Cartão de crédito aqui cria a cobrança, mas os
// DADOS do cartão (token) ainda não trafegam: entram junto do adapter real (PR-10 e seguintes do plano).
export const MEIOS_PAGAMENTO_ACEITOS = ['pix', 'cartao_credito'] as const;
export type MeioPagamentoAceito = (typeof MEIOS_PAGAMENTO_ACEITOS)[number];

// Maior valor que cabe em contribuicao.valor (DECIMAL(10,2)).
export const VALOR_MAXIMO_CONTRIBUICAO = 99_999_999.99;

// Validade padrão do PIX em horas, usada só se configuracoes.pix_validade_horas vier ausente/inválida (mesmo padrão
// de config_numero('pix_validade_horas', 24) no banco).
export const VALIDADE_PIX_PADRAO_HORAS = 24;

// Quando o PIX deixa de poder ser pago NO GATEWAY. Tem que coincidir com o momento em que o BANCO considera a
// contribuição vencida (expirar_contribuicoes_pendentes: criado_em + pix_validade_horas), senão o gateway aceita um
// pagamento que o banco já expirou, e o dinheiro entra sem poder ser contabilizado (cai em revisão manual).
// Campanha COM prazo nunca passa de data_fim ("nunca sobra PIX pendente depois do prazo"); sem prazo (flexível sem
// data_fim) vale só a validade.
export function calcularExpiracaoPix(
  dataFim: Date | null,
  validadeHoras: number,
  agora: Date = new Date(),
): Date {
  const horas =
    Number.isFinite(validadeHoras) && validadeHoras > 0
      ? validadeHoras
      : VALIDADE_PIX_PADRAO_HORAS;
  const porValidade = new Date(agora.getTime() + horas * 60 * 60 * 1000);
  return dataFim && dataFim.getTime() < porValidade.getTime()
    ? dataFim
    : porValidade;
}

export const MENSAGEM_CAMPANHA_NAO_ENCONTRADA = 'Campanha não encontrada.';
export const MENSAGEM_CARTAO_EM_ALL_OR_NOTHING =
  'Campanhas all-or-nothing aceitam apenas contribuições via PIX.';
export const MENSAGEM_CONTRIBUICAO_INDISPONIVEL =
  'Esta contribuição não está mais disponível para pagamento.';
export const MENSAGEM_PAGAMENTO_INDISPONIVEL =
  'O pagamento está temporariamente indisponível. Tente novamente mais tarde.';
export const MENSAGEM_COBRANCA_FALHOU =
  'Não foi possível gerar a cobrança agora. Tente novamente em instantes.';
export const MENSAGEM_COBRANCA_RECUSADA =
  'O provedor de pagamento recusou a cobrança.';
