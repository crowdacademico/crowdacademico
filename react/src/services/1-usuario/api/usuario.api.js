import { tratarResposta } from '../../constant/api/http.util';

// authFetch vem de use-auth.js (services/3-auth/hook) — injetado, não
// importado direto, pra este arquivo não precisar saber nada de token.
export const usuarioApi = {
  // GET /usuario devolve { dados, total, pagina, tamanho } desde 03-08-2026
  // (achado do Claude Web: findall sem limit/offset baixaria a tabela
  // inteira quando ela crescer) — `.dados` desembrulhado aqui, uma vez só,
  // pra GenericTable e todo o resto do app continuar recebendo um array
  // puro, sem precisar saber que pagina/total existem.
  listar: (authFetch) =>
    authFetch('/usuario')
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  buscar: (authFetch, id) => authFetch(`/usuario/${id}`).then(tratarResposta),
  criar: (authFetch, dados) =>
    authFetch('/usuario', { method: 'POST', body: JSON.stringify(dados) }).then(
      tratarResposta,
    ),
  atualizar: (authFetch, id, dados) =>
    authFetch(`/usuario/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  remover: (authFetch, id) =>
    authFetch(`/usuario/${id}`, { method: 'DELETE' }).then(tratarResposta),
};
