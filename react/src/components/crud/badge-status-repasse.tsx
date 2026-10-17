import { classeBadgeSituacaoRepasse, rotuloSituacaoRepasse } from '../../services/23-repasse/constants/status-repasse.constants';
import type { StatusRepasse } from '../../services/constant/type/enums-do-banco.gerado';

// Selo da situação de um repasse, igual em toda tela. `aguardandoConta`: o repasse está `pendente` mas o dono da
// campanha ainda não tem chave Pix verificada, então ele espera por uma pessoa, não pelo worker (rótulo próprio).
export function BadgeStatusRepasse({ status, aguardandoConta = false }: { status: StatusRepasse; aguardandoConta?: boolean }) {
  return <span className={'badge ' + classeBadgeSituacaoRepasse(status)}>{rotuloSituacaoRepasse(status, aguardandoConta)}</span>;
}
