import { tratarResposta } from '../../constant/api/http.util';
import { paraQueryString } from '../../constant/api/query-string.util';
import { TAMANHO_PAGINA_MAXIMO_API } from '../../constant/type/paginacao.type';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  FiltroRevisaoPagamento,
  ReembolsoManualResponse,
  RepasseAtencaoResponse,
  RevisaoPagamentoResponse,
} from '../type/pagamento-revisao.type';

// Espelha nest/src/25-pagamento-revisao (rotas /pagamento-admin/*). Quem pode ver e agir é decidido DENTRO das funções
// do banco, não por papel: listar exige `evento_pagamento_visualizar` e toda ação exige `pagamento_revisao_resolver`
// (sem a permissão, 403). Nenhuma ação move dinheiro: devolver à mão ou refazer uma transferência é trabalho de uma
// pessoa, no provedor; aqui só se registra o que foi decidido e se destrava o que estava parado.
const BASE = '/pagamento-admin';

const corpo = (dados: object) => ({ method: 'POST', body: JSON.stringify(dados) });

// Estas listagens devolvem uma lista simples (sem envelope) e cortam em `limite` (máximo 500; o padrão do Nest é 100).
// As telas pedem o máximo e paginam no navegador, como o resto do painel. Se vier o máximo, pode haver mais: avisa
// no console em vez de mostrar uma fila que parece completa sem ser (mesma ideia de `desembrulharPaginado`).
function avisarSeTruncada<T>(rotulo: string) {
  return (linhas: T[]): T[] => {
    if (linhas.length >= TAMANHO_PAGINA_MAXIMO_API) {
      console.warn(`Fila de ${rotulo} no limite de ${TAMANHO_PAGINA_MAXIMO_API} linhas: pode haver mais itens do que os exibidos.`);
    }
    return linhas;
  };
}

export const pagamentoRevisaoApi = {
  // Webhooks que não terminaram com sucesso. Sem o payload (a API não o devolve de propósito).
  listarRevisoes: (authFetch: AuthFetch, filtro: FiltroRevisaoPagamento = {}): Promise<RevisaoPagamentoResponse[]> =>
    authFetch(`${BASE}/revisoes${paraQueryString({ limite: TAMANHO_PAGINA_MAXIMO_API, ...filtro })}`)
      .then(tratarResposta<RevisaoPagamentoResponse[]>)
      .then(avisarSeTruncada('eventos em revisão')),
  // Só evento em revisão manual (409 nos outros casos). Não muda contribuição nem repasse.
  resolverRevisao: (authFetch: AuthFetch, idEvento: number, observacao: string): Promise<void> =>
    authFetch(`${BASE}/revisoes/${idEvento}/resolver`, corpo({ observacao })).then(tratarResposta<void>),

  // Contribuições em `reembolso_manual`: o estorno automático desistiu e uma pessoa devolve por fora do sistema.
  listarReembolsosManuais: (authFetch: AuthFetch): Promise<ReembolsoManualResponse[]> =>
    authFetch(`${BASE}/reembolsos-manuais${paraQueryString({ limite: TAMANHO_PAGINA_MAXIMO_API })}`)
      .then(tratarResposta<ReembolsoManualResponse[]>)
      .then(avisarSeTruncada('reembolsos manuais')),
  // reembolso_manual -> devolvido, com o valor que de fato foi devolvido (em reais; o banco confere o status e o valor).
  concluirReembolsoManual: (authFetch: AuthFetch, idContribuicao: number, valor: number, observacao: string): Promise<void> =>
    authFetch(`${BASE}/reembolsos-manuais/${idContribuicao}/concluir`, corpo({ valor, observacao })).then(tratarResposta<void>),

  // Repasses em erro, ou esperando o dono da campanha cadastrar a chave Pix.
  listarRepassesAtencao: (authFetch: AuthFetch): Promise<RepasseAtencaoResponse[]> =>
    authFetch(`${BASE}/repasses/atencao${paraQueryString({ limite: TAMANHO_PAGINA_MAXIMO_API })}`)
      .then(tratarResposta<RepasseAtencaoResponse[]>)
      .then(avisarSeTruncada('repasses que pedem atenção')),
  // erro -> pendente, depois de a causa ter sido corrigida (só repasse em erro; 409 nos outros casos).
  reenfileirarRepasse: (authFetch: AuthFetch, idRepasse: number, observacao: string): Promise<void> =>
    authFetch(`${BASE}/repasses/${idRepasse}/reenfileirar`, corpo({ observacao })).then(tratarResposta<void>),
};
