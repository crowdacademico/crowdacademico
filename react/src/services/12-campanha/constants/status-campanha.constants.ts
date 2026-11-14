import type { ModeloCampanha, StatusCampanha } from '../../constant/type/enums-do-banco.gerado';
import { listaCompleta } from '../../constant/util/lista-completa.util';
import type { CampanhaResponse } from '../type/campanha.type';

// Os VALORES vêm do banco (ENUM status_campanha, via enums-do-banco.gerado.ts); aqui ficam só a ordem de exibição,
// o rótulo legível e a classe de badge, compartilhados entre a listagem e a consulta (services/12-campanha/*).
export type { StatusCampanha };

// Ordem do ciclo de vida, não alfabética: o filtro facetado de GenericTable (`ordem`) mostra as opções numa
// sequência que faz sentido de fluxo. `listaCompleta` faz o compilador acusar se um status do banco faltar aqui.
const ORDEM_STATUS_CAMPANHA = listaCompleta<StatusCampanha>()([
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
  sucesso: 'badge-concluido',
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

export const EXPLICACAO_PUBLICA_MODELO_CAMPANHA: Record<ModeloCampanha, string> = {
  'all-or-nothing':
    'O pesquisador recebe o valor arrecadado somente se a meta for atingida até o fim do prazo. Se a meta não for alcançada, as contribuições são devolvidas.',
  flexivel:
    'O pesquisador pode receber o valor arrecadado mesmo que a meta não seja atingida. O cartão de crédito está disponível apenas neste modelo.',
};

// A dica (ⓘ) do campo Modelo, igual no Criar e no Alterar.
export const EXPLICACAO_MODELO_CAMPANHA =
  'Tudo ou nada: o pesquisador só recebe se a meta for batida até o fim do prazo; senão, todo o dinheiro volta para quem apoiou. ' +
  'Flexível: o pesquisador recebe o que for arrecadado, mesmo sem bater a meta. Cartão de crédito só no flexível. ' +
  'Dá para trocar enquanto a campanha é rascunho ou foi rejeitada.';

// Onde o pesquisador ainda troca o modelo: antes de enviar e depois de uma rejeição. Aguardando aprovação não, para
// não mudar o que o curador está avaliando; depois da aprovação o banco congela (91005).
export const STATUS_MODELO_EDITAVEL: ReadonlySet<string> = new Set(['rascunho', 'rejeitado']);

// "Em breve" (RF-061) não é status do banco: é a campanha aprovada ('ativo') cujo início ainda não chegou. Ela já
// é pública e já recebe comentários; a contagem regressiva fica para a página pública.
const ROTULO_EM_BREVE = 'Em breve';

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

// Onde o banco aceita comentário novo (fn_valida_comentario_campanha_ativa, 91020; RF-096): campanha publicada,
// menos rejeitada e encerrada por moderação. "Em breve" é 'ativo' e entra.
export const STATUS_ACEITA_COMENTARIO: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>(['ativo', 'sucesso', 'nao_atingido', 'encerrado']);

// Onde o banco aceita atualização nova (validar_atualizacao_campanha, 91019; RF-052).
export const STATUS_ACEITA_ATUALIZACAO: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>(['ativo', 'sucesso', 'nao_atingido']);

// Onde o banco aceita seguir (fn_valida_seguir_campanha_publicada, 91034): o que pol_campanha_select mostra a todos.
export const STATUS_ACEITA_SEGUIR: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>(['ativo', 'sucesso', 'nao_atingido', 'encerrado']);

// Onde o banco aceita denúncia de campanha (fn_valida_denuncia_alvo, 91035; RF-110): só campanha ativa.
export const STATUS_ACEITA_DENUNCIA: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>(['ativo']);

// Estados liberados para visitantes em pol_campanha_select (04_rls_policies.sql).
export const STATUS_VISIVEL_PUBLICAMENTE: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>([
  'ativo',
  'sucesso',
  'nao_atingido',
  'encerrado',
]);

// Campanha que já foi ao ar (aprovada em algum momento): tem comentários e atualizações para mostrar.
export const STATUS_PUBLICADA: ReadonlySet<StatusCampanha> = new Set<StatusCampanha>(['ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao']);
