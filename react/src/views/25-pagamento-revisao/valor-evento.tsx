import { textoValorEvento, type ValorDoEvento } from '../../services/25-pagamento-revisao/util/valor-evento.util';

// O valor do evento com o sinal (valor-evento.util.ts): verde quando entrou; cor normal quando saiu (sair dinheiro é o
// sistema funcionando, não um erro).
const CLASSE_SENTIDO = { entrada: 'texto-sucesso enfase', saida: 'enfase' } as const;

export function ValorEvento({ evento }: { evento: ValorDoEvento }) {
  return evento.sentido ? <span className={CLASSE_SENTIDO[evento.sentido]}>{textoValorEvento(evento)}</span> : <>{textoValorEvento(evento)}</>;
}
