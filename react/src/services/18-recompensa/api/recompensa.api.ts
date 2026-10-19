import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  RecompensaGanha,
  RecompensaLink,
  RecompensaRequestCreate,
  RecompensaRequestUpdate,
  RecompensaResponse,
} from '../type/recompensa.type';

const corpo = (metodo: string, dados: object) => ({ method: metodo, body: JSON.stringify(dados) });

// Espelha nest/src/18-recompensa (rotas /recompensa). Criar e alterar: só o dono da campanha (RLS). Não existe excluir:
// desativar (ativo = false), porque uma recompensa já escolhida precisa continuar existindo.
export const recompensaApi = {
  listar: (authFetch: AuthFetch, idCampanha: number): Promise<RecompensaResponse[]> =>
    authFetch(`/recompensa?idCampanha=${idCampanha}`).then(tratarResposta<RecompensaResponse[]>),
  minhas: (authFetch: AuthFetch): Promise<RecompensaGanha[]> =>
    authFetch('/recompensa/minhas').then(tratarResposta<RecompensaGanha[]>),
  criar: (authFetch: AuthFetch, dados: RecompensaRequestCreate): Promise<RecompensaResponse> =>
    authFetch('/recompensa', corpo('POST', dados)).then(tratarResposta<RecompensaResponse>),
  alterar: (authFetch: AuthFetch, idRecompensa: number, dados: RecompensaRequestUpdate): Promise<RecompensaResponse> =>
    authFetch(`/recompensa/${idRecompensa}`, corpo('PATCH', dados)).then(tratarResposta<RecompensaResponse>),
  incluirLink: (authFetch: AuthFetch, idRecompensa: number, idTipoLink: number, url: string): Promise<RecompensaLink> =>
    authFetch(`/recompensa/${idRecompensa}/link`, corpo('POST', { idTipoLink, url })).then(tratarResposta<RecompensaLink>),
  removerLink: (authFetch: AuthFetch, idLinkRecompensa: number): Promise<void> =>
    authFetch(`/recompensa/link/${idLinkRecompensa}`, { method: 'DELETE' }).then(tratarResposta<void>),
};
