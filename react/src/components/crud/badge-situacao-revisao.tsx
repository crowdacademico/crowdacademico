import {
  CLASSE_BADGE_SITUACAO_REVISAO,
  ROTULO_SITUACAO_REVISAO,
} from '../../services/32-pagamento-revisao/constants/pagamento-revisao.constants';
import type { SituacaoRevisao } from '../../services/32-pagamento-revisao/type/pagamento-revisao.type';

// Selo da situação de um evento de pagamento, igual em toda tela.
export function BadgeSituacaoRevisao({ situacao }: { situacao: SituacaoRevisao }) {
  return <span className={'badge ' + CLASSE_BADGE_SITUACAO_REVISAO[situacao]}>{ROTULO_SITUACAO_REVISAO[situacao]}</span>;
}
