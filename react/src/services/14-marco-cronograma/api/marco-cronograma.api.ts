import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  MarcoCronogramaRequestCreate,
  MarcoCronogramaRequestUpdate,
  MarcoCronogramaResponse,
} from '../type/marco-cronograma.type';

// Espelha nest/src/14-marco-cronograma. Mesmo formato de orcamento-campanha.api.ts (ver lá): array puro, sem
// envelope de paginação.
export const marcoCronogramaApi = {
  listar: (authFetch: AuthFetch, idCampanha: number): Promise<MarcoCronogramaResponse[]> =>
    authFetch(`/marco-cronograma?idCampanha=${idCampanha}`).then(
      tratarResposta<MarcoCronogramaResponse[]>,
    ),
  criar: (
    authFetch: AuthFetch,
    dados: MarcoCronogramaRequestCreate,
  ): Promise<MarcoCronogramaResponse> =>
    authFetch('/marco-cronograma', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<MarcoCronogramaResponse>),
  atualizar: (
    authFetch: AuthFetch,
    id: number | string,
    dados: MarcoCronogramaRequestUpdate,
  ): Promise<MarcoCronogramaResponse> =>
    authFetch(`/marco-cronograma/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<MarcoCronogramaResponse>),
  remover: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/marco-cronograma/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
};
