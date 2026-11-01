import { formatarMoeda } from '../../constant/util/formatacao.util';
import type { RevisaoPagamentoResponse } from '../type/pagamento-revisao.type';

// O sinal diz para onde o dinheiro andou na conta da plataforma: "+" entrou, "-" saiu (estorno, devolução, repasse).
// Sem sinal quando nada se moveu. O mesmo na lista de Eventos de Pagamento e no Consultar do evento.
const SINAL_VALOR_EVENTO = { entrada: '+', saida: '-' } as const;

export type ValorDoEvento = Pick<RevisaoPagamentoResponse, 'valor' | 'sentido'>;

export const textoValorEvento = (evento: ValorDoEvento): string => {
  if (evento.valor === null) return '-';
  return (evento.sentido ? SINAL_VALOR_EVENTO[evento.sentido] + ' ' : '') + formatarMoeda(evento.valor);
};
