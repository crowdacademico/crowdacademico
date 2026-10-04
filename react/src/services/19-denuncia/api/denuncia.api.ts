import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type {
  DenunciaContraMimResponse,
  DenunciaRequestCreate,
  DenunciaResponse,
  FiltroDenuncia,
  StatusDenuncia,
} from '../type/denuncia.type';

// Espelha nest/src/19-denuncia. Quem vê e quem julga é decidido pelo banco (pol_denuncia_*, 04): a moderação
// (denuncia_responder) vê todas e julga; as outras contas só veem as próprias. Encerrar a campanha por moderação
// sai de uma denúncia de campanha (encerrar_campanha_por_denuncia, 03).
export const denunciaApi = {
  listar: (authFetch: AuthFetch, filtro: FiltroDenuncia = {}): Promise<DenunciaResponse[]> => {
    const parametros = new URLSearchParams({ tamanho: '500' });
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor !== undefined) parametros.set(chave, String(valor));
    }
    return authFetch(`/denuncia?${parametros.toString()}`)
      .then(tratarResposta<ResultadoPaginado<DenunciaResponse>>)
      .then((resultado) => resultado.dados);
  },
  // Uma página da lista (Consultar da campanha, onde pode haver muitas).
  listarPagina: (authFetch: AuthFetch, filtro: FiltroDenuncia, pagina: number, tamanho: number): Promise<ResultadoPaginado<DenunciaResponse>> => {
    const parametros = new URLSearchParams({ pagina: String(pagina), tamanho: String(tamanho) });
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor !== undefined) parametros.set(chave, String(valor));
    }
    return authFetch(`/denuncia?${parametros.toString()}`).then(tratarResposta<ResultadoPaginado<DenunciaResponse>>);
  },
  criar: (authFetch: AuthFetch, dados: DenunciaRequestCreate): Promise<DenunciaResponse> =>
    authFetch('/denuncia', { method: 'POST', body: JSON.stringify(dados) }).then(tratarResposta<DenunciaResponse>),
  julgar: (authFetch: AuthFetch, id: number, status: StatusDenuncia, justificativa?: string): Promise<DenunciaResponse> =>
    authFetch(`/denuncia/${id}`, { method: 'PATCH', body: JSON.stringify({ status, justificativa }) }).then(
      tratarResposta<DenunciaResponse>,
    ),
  encerrarCampanha: (authFetch: AuthFetch, id: number, justificativa: string): Promise<DenunciaResponse> =>
    authFetch(`/denuncia/${id}/encerrar-campanha`, { method: 'POST', body: JSON.stringify({ justificativa }) }).then(
      tratarResposta<DenunciaResponse>,
    ),
  // Contestação do score (RF-033): o pesquisador vê as procedentes contra ele e contesta; a moderação decide.
  contraMim: (authFetch: AuthFetch): Promise<DenunciaContraMimResponse[]> =>
    authFetch('/denuncia/contra-mim').then(tratarResposta<DenunciaContraMimResponse[]>),
  contestar: (authFetch: AuthFetch, id: number, texto: string): Promise<void> =>
    authFetch(`/denuncia/${id}/contestar`, { method: 'POST', body: JSON.stringify({ texto }) }).then(tratarResposta<void>),
  decidirContestacao: (authFetch: AuthFetch, id: number, aceitar: boolean, justificativa: string): Promise<DenunciaResponse> =>
    authFetch(`/denuncia/${id}/decidir-contestacao`, { method: 'POST', body: JSON.stringify({ aceitar, justificativa }) }).then(
      tratarResposta<DenunciaResponse>,
    ),
};
