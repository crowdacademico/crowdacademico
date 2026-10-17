import type { StatusRepasse } from '../../constant/type/enums-do-banco.gerado';

// Os VALORES vêm do banco (ENUM status_repasse, via enums-do-banco.gerado.ts). Ciclo: pendente (na fila) ->
// processando (o worker pegou; transferência pedida) -> concluído | erro.
export const ROTULO_STATUS_REPASSE: Record<StatusRepasse, string> = {
  pendente: 'Pendente',
  processando: 'Processando',
  concluido: 'Concluído',
  erro: 'Erro',
};

const CLASSE_BADGE_STATUS_REPASSE: Record<StatusRepasse, string> = {
  pendente: 'badge-aviso',
  processando: 'badge-info',
  concluido: 'badge-sucesso',
  erro: 'badge-erro',
};

// Repasse `pendente` cujo dono ainda não tem chave Pix verificada não é "na fila normal": o worker não o pega até a
// pessoa cadastrar a chave. Ganha rótulo próprio, para ninguém achar que está só demorando.
export const ROTULO_AGUARDANDO_CONTA = 'Aguardando chave Pix';

export function rotuloSituacaoRepasse(status: StatusRepasse, aguardandoConta: boolean): string {
  return status === 'pendente' && aguardandoConta ? ROTULO_AGUARDANDO_CONTA : ROTULO_STATUS_REPASSE[status];
}

export function classeBadgeSituacaoRepasse(status: StatusRepasse): string {
  return CLASSE_BADGE_STATUS_REPASSE[status];
}
