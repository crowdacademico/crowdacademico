import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';

// Espelha nest/src/9-tipo-link - GET (listar/buscar) é PÚBLICO no backend
// (pol_tipolink_select é USING(true), 04_rls_policies.sql [04-C-2]);
// POST/PATCH/DELETE exigem a permissão 'tipolink_gerenciar', garantida
// pela RLS (o Nest não tem guard de permissão nenhum - só
// RequireAuthGuard pra exigir login). remover() (18-08-2026) pode voltar
// 409 se o tipo ainda estiver em uso em algum link - ver
// tipo-link.service.remove.ts.
function paraQueryString(filtro) {
  if (!filtro) {
    return '';
  }
  const params = new URLSearchParams();
  if (filtro.ativo !== undefined) params.set('ativo', String(filtro.ativo));
  if (filtro.escopo !== undefined) params.set('escopo', filtro.escopo);
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export const tipoLinkApi = {
  // GET /tipo-link devolve { dados, total, pagina, tamanho } - `.dados`
  // desembrulhado aqui, mesmo padrão de areaConhecimentoApi.listar/
  // configuracaoApi.listar, pra GenericTable continuar recebendo um
  // array puro. `filtro` opcional: { ativo, escopo } - `escopo` é
  // 'perfil' | 'atualizacao' | 'recompensa', mesmos valores de
  // ListarTipoLinkQueryDto no backend (filtra pelo campo permite_*
  // correspondente).
  listar: (authFetch, filtro) =>
    authFetch(`/tipo-link${paraQueryString(filtro)}`)
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  // Sem authFetch de propósito, mesmo padrão de areaConhecimentoApi.
  // listarPublico/configuracaoApi.buscarPublicas: pol_tipolink_select já
  // libera pra qualquer um, logado ou não. Ainda sem nenhuma tela
  // pública chamando isto (o formulário de link acadêmico, que vai
  // precisar do combo de tipos com `escopo=perfil`, é de outro módulo) -
  // já deixado pronto pra quando existir.
  listarPublico: (filtro) =>
    fetch(`${API_BASE_URL}/tipo-link${paraQueryString(filtro)}`)
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  buscar: (authFetch, id) => authFetch(`/tipo-link/${id}`).then(tratarResposta),
  criar: (authFetch, dados) =>
    authFetch('/tipo-link', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  // Só nome/ativo/regex/dominio/permitePerfil/permiteAtualizacao/
  // permiteRecompensa são aceitos (ver AtualizarTipoLinkRequestDto no
  // backend) - codigo é imutável depois de criado.
  atualizar: (authFetch, id, dados) =>
    authFetch(`/tipo-link/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  remover: (authFetch, id) =>
    authFetch(`/tipo-link/${id}`, { method: 'DELETE' }).then(tratarResposta),
};
