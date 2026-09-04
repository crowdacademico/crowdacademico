import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';

// Espelha nest/src/8-area-conhecimento - GET (listar/buscar) é PÚBLICO no
// backend (pol_area_select é USING(true), 04_rls_policies.sql [04-C-2]);
// POST/PATCH/DELETE exigem a permissão 'area_conhecimento_gerenciar',
// garantida pela RLS (o Nest não tem guard de permissão nenhum - só
// RequireAuthGuard pra exigir login; quem não tiver a permissão recebe
// 403 do próprio Postgres, traduzido por postgres-exception.filter.ts).
// remover() (18-08-2026) pode voltar 409 se a área ainda estiver em uso
// por campanha/área filha - ver area-conhecimento.service.remove.ts.
function paraQueryString(filtro) {
  if (!filtro) {
    return '';
  }
  const params = new URLSearchParams();
  if (filtro.raiz !== undefined) params.set('raiz', String(filtro.raiz));
  if (filtro.idPai !== undefined) params.set('idPai', String(filtro.idPai));
  if (filtro.ativo !== undefined) params.set('ativo', String(filtro.ativo));
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export const areaConhecimentoApi = {
  // GET /area-conhecimento devolve { dados, total, pagina, tamanho } -
  // `.dados` desembrulhado aqui, mesmo padrão de usuarioApi.listar/
  // configuracaoApi.listar, pra GenericTable e o combo de Criar
  // continuarem recebendo um array puro. `filtro` opcional: { raiz,
  // idPai, ativo } - mesmos nomes de ListarAreaConhecimentoQueryDto no
  // backend (ex.: `{ raiz: true }` lista só as grandes áreas).
  listar: (authFetch, filtro) =>
    authFetch(`/area-conhecimento${paraQueryString(filtro)}`)
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  // Sem authFetch de propósito, mesmo padrão de configuracaoApi.
  // buscarPublicas: pol_area_select já libera pra qualquer um, logado ou
  // não. Ainda sem nenhuma tela pública chamando isto (o formulário de
  // campanha, que vai precisar do combo Grande Área/Área, é de outro
  // módulo) - já deixado pronto pra quando existir, em vez de duplicar
  // este arquivo inteiro depois só pra adicionar uma função.
  listarPublico: (filtro) =>
    fetch(`${API_BASE_URL}/area-conhecimento${paraQueryString(filtro)}`)
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  buscar: (authFetch, id) => authFetch(`/area-conhecimento/${id}`).then(tratarResposta),
  criar: (authFetch, dados) =>
    authFetch('/area-conhecimento', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  // Só nome/ativo são aceitos (ver AtualizarAreaConhecimentoRequestDto no
  // backend) - codigoCnpq e idPai são imutáveis depois de criada a linha.
  atualizar: (authFetch, id, dados) =>
    authFetch(`/area-conhecimento/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  remover: (authFetch, id) =>
    authFetch(`/area-conhecimento/${id}`, { method: 'DELETE' }).then(tratarResposta),
};
