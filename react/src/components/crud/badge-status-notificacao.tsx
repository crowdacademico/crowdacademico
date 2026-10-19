import {
  CLASSE_BADGE_STATUS_NOTIFICACAO,
  ROTULO_STATUS_NOTIFICACAO,
} from '../../services/27-notificacao/constants/notificacao.constants';
import type { StatusNotificacao } from '../../services/constant/type/enums-do-banco.gerado';

// Selo da situação de um e-mail do sistema, igual em toda tela.
export function BadgeStatusNotificacao({ status }: { status: StatusNotificacao }) {
  return <span className={'badge ' + CLASSE_BADGE_STATUS_NOTIFICACAO[status]}>{ROTULO_STATUS_NOTIFICACAO[status]}</span>;
}
