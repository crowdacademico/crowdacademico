import { listaCompleta } from '../../constant/util/lista-completa.util';
import type { SituacaoRevisao } from '../type/pagamento-revisao.type';

// Observação obrigatória de toda ação do painel (dto/request/pagamento-revisao.request-observacao.ts: de 3 a 1.000
// caracteres). ⚠️ Espelho manual do Nest: se o DTO mudar, muda aqui junto. O texto é o rastro de uma decisão tomada
// FORA do sistema (devolver no painel do provedor, corrigir uma chave Pix) e fica na auditoria financeira, com quem fez.
export const OBSERVACAO_REVISAO_MINIMO = 3;
export const OBSERVACAO_REVISAO_LIMITE = 1000;

// O que pede atenção primeiro (é a ordem do filtro).
export const ORDEM_SITUACAO_REVISAO = listaCompleta<SituacaoRevisao>()(
  ['em_revisao_manual', 'vale_tentar_de_novo', 'revisao_resolvida', 'processado'] as const,
);

// Sem vírgula no rótulo: o filtro da tabela guarda os valores marcados no endereço, separados por vírgula.
export const ROTULO_SITUACAO_REVISAO: Record<SituacaoRevisao, string> = {
  em_revisao_manual: 'Em revisão manual',
  vale_tentar_de_novo: 'Tentar de novo',
  revisao_resolvida: 'Revisão resolvida',
  processado: 'Processado',
};

// As que ainda pedem algo: vêm primeiro na lista e são as únicas com Dar baixa.
export const SITUACOES_PENDENTES: readonly SituacaoRevisao[] = ['em_revisao_manual', 'vale_tentar_de_novo'];

// Em revisão manual pede decisão de uma pessoa (aviso); o que só falhou por motivo transitório costuma se resolver
// quando o provedor reenvia o evento (neutro); processado é o caminho normal (sucesso); a revisão resolvida já teve
// a baixa de uma pessoa (concluído).
export const CLASSE_BADGE_SITUACAO_REVISAO: Record<SituacaoRevisao, string> = {
  em_revisao_manual: 'badge-aviso',
  vale_tentar_de_novo: 'badge-neutro',
  revisao_resolvida: 'badge-concluido',
  processado: 'badge-sucesso',
};

// O nome do evento vai para a tela como o provedor manda, sem tradução. A decisão e o dicionário que existia:
// DOCUMENTACAO_FRONTEND.md, seção 13, "Pagamentos", "Nome do evento: como o provedor manda".
