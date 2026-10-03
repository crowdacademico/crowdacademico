import { formatarMoeda } from '../../constant/util/formatacao.util';
import type { OrcamentoCampanhaResponse } from '../../13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../14-marco-cronograma/type/marco-cronograma.type';

// Critérios para uma campanha aguardando aprovação estar pronta: itens de orçamento no mínimo, soma igual à meta
// e marcos de cronograma no mínimo (o banco exige os mesmos na aprovação, fn_valida_completude_campanha). Usado
// pelo Aprovar da fila e da Bancada da Campanha (usePronta, em use-decisao-aprovacao.ts).
export interface CriteriosEnvio {
  orcamento: OrcamentoCampanhaResponse[];
  cronograma: MarcoCronogramaResponse[];
  metaFinanceira: number;
  // Mínimos vindos de configuracoes (useRegrasCampanha).
  minimoItensOrcamento: number;
  minimoMarcosCronograma: number;
}

export function avaliarCriteriosEnvio({ orcamento, cronograma, metaFinanceira, minimoItensOrcamento, minimoMarcosCronograma }: CriteriosEnvio) {
  const soma = orcamento.reduce((total, item) => total + Number(item.valor), 0);
  const itensOk = orcamento.length >= minimoItensOrcamento;
  const metaBatendo = soma === Number(metaFinanceira);
  const orcamentoOk = itensOk && metaBatendo;
  const cronogramaOk = cronograma.length >= minimoMarcosCronograma;
  const motivo = !orcamentoOk
    ? `Orçamento incompleto (${orcamento.length}/${minimoItensOrcamento} itens, soma ${formatarMoeda(soma)} de ${formatarMoeda(metaFinanceira)}).`
    : !cronogramaOk
      ? `Cronograma incompleto (${cronograma.length}/${minimoMarcosCronograma} marcos).`
      : '';
  return { soma, itensOk, metaBatendo, cronogramaOk, pronta: orcamentoOk && cronogramaOk, motivo };
}
