import {
  classeBadgeStatusPesquisador,
  ROTULO_STATUS_PESQUISADOR,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { StatusPesquisador } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';

// Selo do status do pesquisador (Ativo ou Suspenso), igual em toda tela: Consultar Usuário, Minha Conta e, depois, a
// página pública do perfil.
export function BadgeStatusPesquisador({ status }: { status: StatusPesquisador }) {
  return <span className={'badge ' + classeBadgeStatusPesquisador(status)}>{ROTULO_STATUS_PESQUISADOR[status]}</span>;
}
