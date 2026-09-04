import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';

export const configuracaoApi = {
  // GET /configuracoes devolve { dados, total, pagina, tamanho } desde
  // 03-08-2026 (mesmo motivo de usuarioApi.listar, ver comentário lá) -
  // `.dados` desembrulhado aqui pras duas funções abaixo continuarem
  // devolvendo um array puro pra quem chama.
  listar: (authFetch) =>
    authFetch('/configuracoes')
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  // Sem authFetch de propósito: pol_config_select (04_rls_policies.sql) já
  // libera as configurações globais (id_usuario IS NULL) pra qualquer um,
  // logado ou não - é o que sustenta useConfiguracoes() em página pública
  // (campanha, home), que roda fora de <ConfiguracoesProvider> autenticado.
  buscarPublicas: () =>
    fetch(`${API_BASE_URL}/configuracoes`)
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  buscar: (authFetch, id) => authFetch(`/configuracoes/${id}`).then(tratarResposta),
  criar: (authFetch, dados) =>
    authFetch('/configuracoes', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  atualizar: (authFetch, id, dados) =>
    authFetch(`/configuracoes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  remover: (authFetch, id) =>
    authFetch(`/configuracoes/${id}`, { method: 'DELETE' }).then(tratarResposta),
};
