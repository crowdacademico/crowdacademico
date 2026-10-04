import type { StatusContestacao, StatusDenuncia } from '../type/denuncia.type';
import type { TipoMotivoDenuncia } from '../../constant/type/enums-do-banco.gerado';

// Os nomes do RF-111: pendente (recebida), em análise, resolvida (procedente, medida tomada) e improcedente.
export const ROTULO_STATUS_DENUNCIA: Record<StatusDenuncia, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  resolvida: 'Resolvida',
  improcedente: 'Improcedente',
};

// Pendente pede ação (aviso); em análise está andando (info); resolvida achou problema (erro); improcedente encerra
// sem nada a fazer (neutro).
export const CLASSE_BADGE_STATUS_DENUNCIA: Record<StatusDenuncia, string> = {
  pendente: 'badge-aviso',
  em_analise: 'badge-info',
  resolvida: 'badge-erro',
  improcedente: 'badge-neutro',
};

export const ORDEM_STATUS_DENUNCIA: readonly StatusDenuncia[] = ['pendente', 'em_analise', 'resolvida', 'improcedente'];

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
