import { tratarResposta } from '../../constant/api/http.util';

// Espelha nest/src/12-campanha. GET é público no backend (pol_campanha_
// select mostra status público/dono/relatorio_visualizar - ver
// 04_rls_policies.sql [04-E]); aqui sempre passamos authFetch mesmo assim
// porque quem usa este arquivo é sempre o painel admin (logado), e o
// admin com relatorio_visualizar enxerga todos os status, não só os
// públicos. Sem criar() de propósito: campanha não tem POST genérico no
// backend - criação vive no Campo de Testes hoje (views/campo-testes/
// bancada-campanha.jsx). `remover()` (25-08-2026) só funciona em campanha
// 'aguardando_aprovacao' (pol_campanha_delete, 04) - depois de aprovada,
// só dá pra rejeitar/encerrar, nunca apagar de vez.
function paraQueryString(filtro) {
  if (!filtro) {
    return '';
  }
  const params = new URLSearchParams();
  if (filtro.status !== undefined) params.set('status', filtro.status);
  if (filtro.idAreaConhecimento !== undefined) params.set('idAreaConhecimento', String(filtro.idAreaConhecimento));
  if (filtro.idUsuario !== undefined) params.set('idUsuario', String(filtro.idUsuario));
  if (filtro.tamanho !== undefined) params.set('tamanho', String(filtro.tamanho));
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export const campanhaApi = {
  // GET /campanha devolve { dados, total, pagina, tamanho } - `.dados`
  // desembrulhado aqui, mesmo padrão de usuarioApi.listar. `tamanho: 500`
  // por padrão (mesmo teto de segurança de paginacao.util.ts no backend)
  // pra GenericTable continuar paginando no navegador, como já faz em
  // toda outra tela.
  listar: (authFetch, filtro) =>
    authFetch(`/campanha${paraQueryString({ tamanho: 500, ...filtro })}`)
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  buscar: (authFetch, id) => authFetch(`/campanha/${id}`).then(tratarResposta),
  remover: (authFetch, id) => authFetch(`/campanha/${id}`, { method: 'DELETE' }).then(tratarResposta),
};
