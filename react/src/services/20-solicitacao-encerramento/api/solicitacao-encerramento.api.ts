import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type { FiltroSolicitacaoEncerramento, SolicitacaoEncerramentoResponse } from '../type/solicitacao-encerramento.type';

// Espelha nest/src/20-solicitacao-encerramento. Quem vê, pede, cancela e decide é decidido pelo banco: o dono pede e
// cancela; o administrador (solicitacao_encerramento_decidir) vê todos e decide.
const corpo = (dados: object) => ({ method: 'POST', body: JSON.stringify(dados) });

export const solicitacaoEncerramentoApi = {
  listar: (authFetch: AuthFetch, filtro: FiltroSolicitacaoEncerramento = {}): Promise<SolicitacaoEncerramentoResponse[]> => {
    const parametros = new URLSearchParams({ tamanho: '500' });
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor !== undefined) parametros.set(chave, String(valor));
    }
    return authFetch(`/solicitacao-encerramento?${parametros.toString()}`)
      .then(tratarResposta<ResultadoPaginado<SolicitacaoEncerramentoResponse>>)
      .then((resultado) => resultado.dados);
  },
  pedir: (authFetch: AuthFetch, idCampanha: number, justificativa: string): Promise<SolicitacaoEncerramentoResponse> =>
    authFetch('/solicitacao-encerramento', corpo({ idCampanha, justificativa })).then(tratarResposta<SolicitacaoEncerramentoResponse>),
  encerrarDireto: (authFetch: AuthFetch, idCampanha: number, justificativa: string): Promise<SolicitacaoEncerramentoResponse> =>
    authFetch('/solicitacao-encerramento/encerrar-direto', corpo({ idCampanha, justificativa })).then(tratarResposta<SolicitacaoEncerramentoResponse>),
  cancelar: (authFetch: AuthFetch, id: number): Promise<SolicitacaoEncerramentoResponse> =>
    authFetch(`/solicitacao-encerramento/${id}/cancelar`, corpo({})).then(tratarResposta<SolicitacaoEncerramentoResponse>),
  decidir: (authFetch: AuthFetch, id: number, aprovar: boolean, justificativa?: string): Promise<SolicitacaoEncerramentoResponse> =>
    authFetch(`/solicitacao-encerramento/${id}/decidir`, corpo({ aprovar, justificativa })).then(tratarResposta<SolicitacaoEncerramentoResponse>),
};
