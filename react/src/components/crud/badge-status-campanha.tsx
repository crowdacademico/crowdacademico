import { classeBadgeCampanha, rotuloStatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

// Selo do status de uma campanha, igual em toda tela (listas, Consultar, Alterar, fila, bancadas). Mostra "Em
// breve" quando a campanha aprovada ainda não começou.
export function BadgeStatusCampanha({ campanha }: { campanha: Pick<CampanhaResponse, 'status' | 'dataInicio'> }) {
  return <span className={'badge ' + classeBadgeCampanha(campanha)}>{rotuloStatusCampanha(campanha)}</span>;
}
