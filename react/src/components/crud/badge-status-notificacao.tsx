import {
  CLASSE_BADGE_LEITURA_SINO,
  CLASSE_BADGE_STATUS_NOTIFICACAO,
  ROTULO_LEITURA_SINO,
  ROTULO_STATUS_NOTIFICACAO,
} from '../../services/27-notificacao/constants/notificacao.constants';
import type { CanalNotificacao } from '../../services/27-notificacao/type/modelo-mensagem.type';
import type { StatusNotificacao } from '../../services/constant/type/enums-do-banco.gerado';

interface BadgeStatusNotificacaoProps {
  status: StatusNotificacao;
  canal?: CanalNotificacao;
  lidaEm?: string | null;
}

// Selo da situação de um aviso, igual em toda tela: o e-mail mostra o envio; o sino, se foi lido.
export function BadgeStatusNotificacao({ status, canal = 'email', lidaEm = null }: BadgeStatusNotificacaoProps) {
  if (canal === 'interna') {
    const leitura = lidaEm ? 'lida' : 'naoLida';
    return <span className={'badge ' + CLASSE_BADGE_LEITURA_SINO[leitura]}>{ROTULO_LEITURA_SINO[leitura]}</span>;
  }
  return <span className={'badge ' + CLASSE_BADGE_STATUS_NOTIFICACAO[status]}>{ROTULO_STATUS_NOTIFICACAO[status]}</span>;
}
