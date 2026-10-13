import type { DenunciaResponse, StatusContestacao, StatusDenuncia } from '../type/denuncia.type';
import type { TipoMotivoDenuncia } from '../../constant/type/enums-do-banco.gerado';

// Situação mostrada da denúncia: a gravada (pendente, resolvida ou improcedente) ou "Em contestação", que não é
// gravada: é a denúncia já julgada com a contestação do pesquisador esperando análise. Enquanto isso, a decisão
// continua valendo (a procedente segue contando na pontuação); a contestação aceita a torna improcedente.
export type SituacaoDenuncia = StatusDenuncia | 'em_contestacao';

export function situacaoDenuncia(denuncia: Pick<DenunciaResponse, 'status' | 'contestacaoStatus'>): SituacaoDenuncia {
  return denuncia.contestacaoStatus === 'pendente' ? 'em_contestacao' : denuncia.status;
}

export const ROTULO_STATUS_DENUNCIA: Record<SituacaoDenuncia, string> = {
  pendente: 'Pendente',
  em_contestacao: 'Em contestação',
  resolvida: 'Resolvida',
  improcedente: 'Improcedente',
};

// Pendente pede ação (aviso); em contestação também espera a moderação, mas é outra fila (info); resolvida achou
// problema (erro); improcedente encerra sem nada a fazer (neutro).
export const CLASSE_BADGE_STATUS_DENUNCIA: Record<SituacaoDenuncia, string> = {
  pendente: 'badge-aviso',
  em_contestacao: 'badge-info',
  resolvida: 'badge-erro',
  improcedente: 'badge-neutro',
};

// O que a moderação escolhe ao julgar.
export const ORDEM_STATUS_DENUNCIA: readonly StatusDenuncia[] = ['pendente', 'resolvida', 'improcedente'];

// Ordem do filtro da lista, com "Em contestação" logo depois de Pendente (as duas esperam a moderação).
export const ORDEM_SITUACAO_DENUNCIA: readonly SituacaoDenuncia[] = ['pendente', 'em_contestacao', 'resolvida', 'improcedente'];

// Decidir (resolvida ou improcedente) pede justificativa (denuncia.request-update.ts).
export const STATUS_DENUNCIA_DECIDIDA: ReadonlySet<StatusDenuncia> = new Set<StatusDenuncia>(['resolvida', 'improcedente']);

// Contestação do score (RF-033): esperando a moderação, aceita (a denúncia virou improcedente) ou recusada.
export const ROTULO_STATUS_CONTESTACAO: Record<StatusContestacao, string> = {
  pendente: 'Esperando análise',
  aceita: 'Aceita',
  recusada: 'Recusada',
};

export const CLASSE_BADGE_STATUS_CONTESTACAO: Record<StatusContestacao, string> = {
  pendente: 'badge-aviso',
  aceita: 'badge-sucesso',
  recusada: 'badge-neutro',
};

export const ROTULO_TIPO_DENUNCIA: Record<TipoMotivoDenuncia, string> = {
  campanha: 'Campanha',
  perfil: 'Perfil',
};
