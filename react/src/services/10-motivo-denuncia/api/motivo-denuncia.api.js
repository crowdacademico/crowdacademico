import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';

// Espelha nest/src/10-motivo-denuncia — GET (listar/buscar) é PÚBLICO no
// backend (pol_motivo_select é USING(true), 04_rls_policies.sql [04-C-3]);
// POST/PATCH exigem a permissão 'motivo_denuncia_gerenciar', garantida
// pela RLS (o Nest não tem guard de permissão nenhum — só
// RequireAuthGuard pra exigir login; quem não tiver a permissão recebe
// 403 do próprio Postgres, traduzido por postgres-exception.filter.ts).
// Sem remover(): não existe DELETE pra motivo_denuncia (só INSERT/UPDATE
// concedidos em 06_grants.sql [06-C-1]) — desativar é PATCH com
// { ativo: false }, não uma chamada própria (mesmo padrão de
// tipoLinkApi/areaConhecimentoApi).
function paraQueryString(filtro) {
  if (!filtro) {
    return '';
  }
  const params = new URLSearchParams();
  if (filtro.ativo !== undefined) params.set('ativo', String(filtro.ativo));
  if (filtro.tipo !== undefined) params.set('tipo', filtro.tipo);
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export const motivoDenunciaApi = {
  // GET /motivo-denuncia devolve { dados, total, pagina, tamanho } —
  // `.dados` desembrulhado aqui, mesmo padrão de tipoLinkApi.listar/
  // areaConhecimentoApi.listar, pra GenericTable continuar recebendo um
  // array puro. `filtro` opcional: { ativo, tipo } — `tipo` é
  // 'campanha' | 'perfil', mesmos valores de ListarMotivoDenunciaQueryDto
  // no backend.
  listar: (authFetch, filtro) =>
    authFetch(`/motivo-denuncia${paraQueryString(filtro)}`)
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  // Sem authFetch de propósito, mesmo padrão de tipoLinkApi.listarPublico/
  // areaConhecimentoApi.listarPublico: pol_motivo_select já libera pra
  // qualquer um, logado ou não. Ainda sem nenhuma tela pública chamando
  // isto (o formulário de denúncia, que vai precisar do combo de motivos
  // filtrado por `tipo`, é do módulo 19-denuncia, ainda não construído) —
  // já deixado pronto pra quando existir.
  listarPublico: (filtro) =>
    fetch(`${API_BASE_URL}/motivo-denuncia${paraQueryString(filtro)}`)
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  buscar: (authFetch, id) =>
    authFetch(`/motivo-denuncia/${id}`).then(tratarResposta),
  criar: (authFetch, dados) =>
    authFetch('/motivo-denuncia', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  // Só descricao/tipo/ativo são aceitos (ver
  // AtualizarMotivoDenunciaRequestDto no backend) — codigo é imutável
  // depois de criado.
  atualizar: (authFetch, id, dados) =>
    authFetch(`/motivo-denuncia/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
};
