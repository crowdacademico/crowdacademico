import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  OrcamentoCampanhaRequestCreate,
  OrcamentoCampanhaRequestUpdate,
  OrcamentoCampanhaResponse,
} from '../type/orcamento-campanha.type';

// Espelha nest/src/13-orcamento-campanha. GET /orcamento-campanha?idCampanha= devolve um array puro (sem
// envelope {dados,total,...}, ver orcamento-campanha.service.findall.ts), diferente da maioria dos outros
// módulos. Usado por bancada-campanha.tsx.
export const orcamentoCampanhaApi = {
  listar: (authFetch: AuthFetch, idCampanha: number): Promise<OrcamentoCampanhaResponse[]> =>
    authFetch(`/orcamento-campanha?idCampanha=${idCampanha}`).then(
      tratarResposta<OrcamentoCampanhaResponse[]>,
    ),
  criar: (
    authFetch: AuthFetch,
    dados: OrcamentoCampanhaRequestCreate,
  ): Promise<OrcamentoCampanhaResponse> =>
    authFetch('/orcamento-campanha', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<OrcamentoCampanhaResponse>),
  atualizar: (
    authFetch: AuthFetch,
    id: number | string,
    dados: OrcamentoCampanhaRequestUpdate,
  ): Promise<OrcamentoCampanhaResponse> =>
    authFetch(`/orcamento-campanha/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<OrcamentoCampanhaResponse>),
  remover: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/orcamento-campanha/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
};
