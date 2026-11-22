import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  MuralResponse,
  RecompensaRequestCreate,
  RecompensaRequestUpdate,
  RecompensaResponse,
} from '../type/recompensa.type';

const corpo = (metodo: string, dados: object) => ({ method: metodo, body: JSON.stringify(dados) });

// Espelha nest/src/18-recompensa/controllers/recompensa.controller.ts.
export const recompensaApi = {
  // Público: a recompensa da campanha (ou null) e quem está no Mural dos apoiadores.
  mural: (authFetch: AuthFetch, idCampanha: number): Promise<MuralResponse> =>
    authFetch(`/recompensa/mural/${idCampanha}`).then(tratarResposta<MuralResponse>),
  criar: (authFetch: AuthFetch, dados: RecompensaRequestCreate): Promise<RecompensaResponse> =>
    authFetch('/recompensa', corpo('POST', dados)).then(tratarResposta<RecompensaResponse>),
  alterar: (authFetch: AuthFetch, idRecompensa: number, dados: RecompensaRequestUpdate): Promise<RecompensaResponse> =>
    authFetch(`/recompensa/${idRecompensa}`, corpo('PATCH', dados)).then(tratarResposta<RecompensaResponse>),
  excluir: (authFetch: AuthFetch, idRecompensa: number): Promise<void> =>
    authFetch(`/recompensa/${idRecompensa}`, { method: 'DELETE' }).then(tratarResposta<void>),
};
