import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type { MotivoDenunciaResponse, TipoMotivoDenuncia } from '../type/motivo-denuncia.type';

// Espelha nest/src/10-motivo-denuncia - GET (listar/buscar) é PÚBLICO no
// backend (pol_motivo_select é USING(true), 04_rls_policies.sql [04-C-3]);
// POST/PATCH/DELETE exigem a permissão 'motivo_denuncia_gerenciar',
// garantida pela RLS (o Nest não tem guard de permissão nenhum - só
// RequireAuthGuard pra exigir login; quem não tiver a permissão recebe
// 403 do próprio Postgres, traduzido por postgres-exception.filter.ts).
// remover() (18-08-2026) pode voltar 409 se o motivo já tiver sido usado
// em alguma denúncia - ver motivo-denuncia.service.remove.ts.
interface FiltroMotivoDenuncia {
  ativo?: boolean;
  tipo?: TipoMotivoDenuncia;
}

function paraQueryString(filtro?: FiltroMotivoDenuncia): string {
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
  // GET /motivo-denuncia devolve { dados, total, pagina, tamanho } -
  // `.dados` desembrulhado aqui, mesmo padrão de tipoLinkApi.listar/
  // areaConhecimentoApi.listar, pra GenericTable continuar recebendo um
  // array puro. `filtro` opcional: { ativo, tipo } - `tipo` é
  // 'campanha' | 'perfil', mesmos valores de ListarMotivoDenunciaQueryDto
  // no backend.
  listar: (authFetch: AuthFetch, filtro?: FiltroMotivoDenuncia): Promise<MotivoDenunciaResponse[]> =>
    authFetch(`/motivo-denuncia${paraQueryString(filtro)}`)
      .then(tratarResposta<ResultadoPaginado<MotivoDenunciaResponse>>)
      .then((resposta) => resposta.dados),
  // Sem authFetch de propósito, mesmo padrão de tipoLinkApi.listarPublico/
  // areaConhecimentoApi.listarPublico: pol_motivo_select já libera pra
  // qualquer um, logado ou não. Ainda sem nenhuma tela pública chamando
  // isto (o formulário de denúncia, que vai precisar do combo de motivos
  // filtrado por `tipo`, é do módulo 19-denuncia, ainda não construído) -
  // já deixado pronto pra quando existir.
  listarPublico: (filtro?: FiltroMotivoDenuncia): Promise<MotivoDenunciaResponse[]> =>
    fetch(`${API_BASE_URL}/motivo-denuncia${paraQueryString(filtro)}`)
      .then(tratarResposta<ResultadoPaginado<MotivoDenunciaResponse>>)
      .then((resposta) => resposta.dados),
  buscar: (authFetch: AuthFetch, id: number | string): Promise<MotivoDenunciaResponse> =>
    authFetch(`/motivo-denuncia/${id}`).then(tratarResposta<MotivoDenunciaResponse>),
  criar: (authFetch: AuthFetch, dados: unknown): Promise<MotivoDenunciaResponse> =>
    authFetch('/motivo-denuncia', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<MotivoDenunciaResponse>),
  // descricao/tipo/ativo são aceitos (ver AtualizarMotivoDenunciaRequestDto
  // no backend).
  atualizar: (authFetch: AuthFetch, id: number | string, dados: unknown): Promise<MotivoDenunciaResponse> =>
    authFetch(`/motivo-denuncia/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<MotivoDenunciaResponse>),
  remover: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/motivo-denuncia/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
};
