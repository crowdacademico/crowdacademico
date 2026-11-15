import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  RecompensaGanha,
  RecompensaRequestCreate,
  RecompensaRequestUpdate,
  RecompensaResponse,
  RecompensaGanhador,
} from '../type/recompensa.type';

const corpo = (metodo: string, dados: object) => ({ method: metodo, body: JSON.stringify(dados) });

// Espelha nest/src/18-recompensa (rotas /recompensa). Criar, alterar e excluir: só o dono da campanha (RLS). Excluir só a
// que ninguém ganhou ainda (a concedida se desativa: ativo = false), porque quem ganhou precisa continuar vendo.
export const recompensaApi = {
  listar: (authFetch: AuthFetch, idCampanha: number): Promise<RecompensaResponse[]> =>
    authFetch(`/recompensa?idCampanha=${idCampanha}`).then(tratarResposta<RecompensaResponse[]>),
  minhas: (authFetch: AuthFetch): Promise<RecompensaGanha[]> =>
    authFetch('/recompensa/minhas').then(tratarResposta<RecompensaGanha[]>),
  // Quem ganhou (só o dono da campanha e o admin).
  ganhadores: (authFetch: AuthFetch, idRecompensa: number): Promise<RecompensaGanhador[]> =>
    authFetch(`/recompensa/${idRecompensa}/ganhadores`).then(tratarResposta<RecompensaGanhador[]>),
  criar: (authFetch: AuthFetch, dados: RecompensaRequestCreate): Promise<RecompensaResponse> =>
    authFetch('/recompensa', corpo('POST', dados)).then(tratarResposta<RecompensaResponse>),
  alterar: (authFetch: AuthFetch, idRecompensa: number, dados: RecompensaRequestUpdate): Promise<RecompensaResponse> =>
    authFetch(`/recompensa/${idRecompensa}`, corpo('PATCH', dados)).then(tratarResposta<RecompensaResponse>),
  excluir: (authFetch: AuthFetch, idRecompensa: number): Promise<void> =>
    authFetch(`/recompensa/${idRecompensa}`, { method: 'DELETE' }).then(tratarResposta<void>),
  removerLink: (authFetch: AuthFetch, idLinkRecompensa: number): Promise<void> =>
    authFetch(`/recompensa/link/${idLinkRecompensa}`, { method: 'DELETE' }).then(tratarResposta<void>),
};
