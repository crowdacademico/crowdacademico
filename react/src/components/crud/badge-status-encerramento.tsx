import {
  CLASSE_BADGE_STATUS_ENCERRAMENTO,
  ROTULO_STATUS_ENCERRAMENTO,
} from '../../services/20-solicitacao-encerramento/constants/status-encerramento.constants';
import type { StatusEncerramento } from '../../services/20-solicitacao-encerramento/type/solicitacao-encerramento.type';

// Selo da situação de um pedido de encerramento antecipado, igual em toda tela.
export function BadgeStatusEncerramento({ status }: { status: StatusEncerramento }) {
  return <span className={'badge ' + CLASSE_BADGE_STATUS_ENCERRAMENTO[status]}>{ROTULO_STATUS_ENCERRAMENTO[status]}</span>;
}
