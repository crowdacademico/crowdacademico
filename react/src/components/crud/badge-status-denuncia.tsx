import {
  CLASSE_BADGE_STATUS_DENUNCIA,
  ROTULO_STATUS_DENUNCIA,
} from '../../services/19-denuncia/constants/status-denuncia.constants';
import type { StatusDenuncia } from '../../services/19-denuncia/type/denuncia.type';

// Selo da situação de uma denúncia, igual em toda tela (lista da moderação, Consultar da campanha).
export function BadgeStatusDenuncia({ status }: { status: StatusDenuncia }) {
  return <span className={'badge ' + CLASSE_BADGE_STATUS_DENUNCIA[status]}>{ROTULO_STATUS_DENUNCIA[status]}</span>;
}
