import { classeBadgeStatusContribuicao, ROTULO_STATUS_CONTRIBUICAO } from '../../services/22-contribuicao/constants/status-contribuicao.constants';
import type { StatusContribuicao } from '../../services/constant/type/enums-do-banco.gerado';

// Selo da situação de uma contribuição, igual em toda tela.
export function BadgeStatusContribuicao({ status }: { status: StatusContribuicao }) {
  return <span className={'badge ' + classeBadgeStatusContribuicao(status)}>{ROTULO_STATUS_CONTRIBUICAO[status]}</span>;
}
