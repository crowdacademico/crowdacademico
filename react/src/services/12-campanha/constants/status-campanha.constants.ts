import type { ModeloCampanha, StatusCampanha } from '../../constant/type/enums-do-banco.gerado';
import { listaCompleta } from '../../constant/util/lista-completa.util';
import type { CampanhaResponse } from '../type/campanha.type';

// Os VALORES vêm do banco (ENUM status_campanha, via enums-do-banco.gerado.ts); aqui ficam só a ordem de exibição,
// o rótulo legível e a classe de badge, compartilhados entre a listagem e a consulta (services/12-campanha/*).
export type { StatusCampanha };

// Ordem do ciclo de vida, não alfabética: o filtro facetado de GenericTable (`ordem`) mostra as opções numa
// sequência que faz sentido de fluxo. `listaCompleta` faz o compilador acusar se um status do banco faltar aqui.
export const ORDEM_STATUS_CAMPANHA = listaCompleta<StatusCampanha>()([
  'rascunho',
  'aguardando_aprovacao',
  'ativo',
  'sucesso',
  'nao_atingido',
  'rejeitado',
  'encerrado',
  'encerrado_moderacao',
] as const);

export const ROTULO_STATUS_CAMPANHA: Record<StatusCampanha, string> = {
  rascunho: 'Rascunho',
  aguardando_aprovacao: 'Aguardando aprovação',
  ativo: 'Ativo',
  sucesso: 'Sucesso',
  nao_atingido: 'Não atingido',
  rejeitado: 'Rejeitado',
  encerrado: 'Encerrado',
  encerrado_moderacao: 'Encerrado (moderação)',
};

// `aguardando_aprovacao` usa 'badge-aviso': o estado que EXIGE ação do administrador não pode ter a mesma cor
// cinza de `nao_atingido`/`encerrado`, que são estados mortos. A fila de aprovação tem sinal visual próprio, e
// o cinza fica para o `rascunho`, que é o estado que de fato ainda não é nada.
const CLASSE_BADGE_STATUS_CAMPANHA: Record<StatusCampanha, string> = {
  rascunho: 'badge-neutro',
  aguardando_aprovacao: 'badge-aviso',
  ativo: 'badge-sucesso',
  sucesso: 'badge-sucesso',
  nao_atingido: 'badge-neutro',
  rejeitado: 'badge-erro',
  encerrado: 'badge-neutro',
  encerrado_moderacao: 'badge-erro',
};

// Rótulo do modelo de financiamento: o valor do banco ("all-or-nothing") é nome técnico, em inglês.
export const ROTULO_MODELO_CAMPANHA: Record<ModeloCampanha, string> = {
  'all-or-nothing': 'Tudo ou nada',
  flexivel: 'Flexível',
};

// "Em breve" (RF-059) não é status do banco: é a campanha aprovada ('ativo') cujo início ainda não chegou. Ela já
// é pública e já recebe comentários; a contagem regressiva fica para a página pública.
export const ROTULO_EM_BREVE = 'Em breve';

export function emBreve(campanha: Pick<CampanhaResponse, 'status' | 'dataInicio'>): boolean {
  return campanha.status === 'ativo' && campanha.dataInicio !== null && Date.parse(campanha.dataInicio) > Date.now();
}

export function rotuloStatusCampanha(campanha: Pick<CampanhaResponse, 'status' | 'dataInicio'>): string {
  return emBreve(campanha) ? ROTULO_EM_BREVE : ROTULO_STATUS_CAMPANHA[campanha.status];
}

export function classeBadgeCampanha(campanha: Pick<CampanhaResponse, 'status' | 'dataInicio'>): string {
  return emBreve(campanha) ? 'badge-info' : CLASSE_BADGE_STATUS_CAMPANHA[campanha.status];
}

// Ordem dos rótulos no filtro das listas, com "Em breve" logo antes de "Ativo".
export const ORDEM_ROTULOS_STATUS_CAMPANHA = ORDEM_STATUS_CAMPANHA.flatMap((status) =>
  status === 'ativo' ? [ROTULO_EM_BREVE, ROTULO_STATUS_CAMPANHA[status]] : [ROTULO_STATUS_CAMPANHA[status]],
);

// Onde o banco aceita comentário novo (fn_valida_comentario_campanha_ativa, 91020; RF-092): campanha publicada,
// menos rejeitada e encerrada por moderação. "Em breve" é 'ativo' e entra.
export const STATUS_ACEITA_COMENTARIO: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>(['ativo', 'sucesso', 'nao_atingido', 'encerrado']);

// Onde o banco aceita atualização nova (validar_atualizacao_campanha, 91019; RF-051).
export const STATUS_ACEITA_ATUALIZACAO: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>(['ativo', 'sucesso', 'nao_atingido']);

// Onde o banco aceita seguir (fn_valida_seguir_campanha_publicada, 91034): o que pol_campanha_select mostra a todos.
export const STATUS_ACEITA_SEGUIR: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>(['ativo', 'sucesso', 'nao_atingido', 'encerrado']);

// Campanha que já foi ao ar (aprovada em algum momento): tem comentários e atualizações para mostrar.
export const STATUS_PUBLICADA: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>(['ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao']);
