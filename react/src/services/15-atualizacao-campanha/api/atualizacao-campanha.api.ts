import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import { paraQueryString } from '../../constant/api/query-string.util';
import { TAMANHO_PAGINA_MAXIMO_API } from '../../constant/type/paginacao.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type {
  AtualizacaoCampanhaRequestCreate,
  AtualizacaoCampanhaRequestUpdate,
  AtualizacaoCampanhaResponse,
  AtualizacaoModeracaoResponse,
} from '../type/atualizacao-campanha.type';

// Espelha nest/src/15-atualizacao-campanha. Quem publica é o dono da campanha (pol_atualizacao_insert, 04), só em
// campanha ativa, com sucesso ou não atingida (validar_atualizacao_campanha, 91019; RF-052). Ocultar é `ativo`
// falso: a atualização fica guardada (RF-052). O que a moderação ocultou o dono não mostra de novo (92040).
export const atualizacaoCampanhaApi = {
  // As atualizações de todas as campanhas, com os anexos, a mais nova primeiro. Quem tem `atualizacao_moderar` vê todas; os
  // outros, as visíveis e as próprias ocultas (RLS).
  listarModeracao: (authFetch: AuthFetch): Promise<AtualizacaoModeracaoResponse[]> =>
    authFetch(`/atualizacao-campanha/moderacao${paraQueryString({ limite: TAMANHO_PAGINA_MAXIMO_API })}`).then(
      tratarResposta<AtualizacaoModeracaoResponse[]>,
    ),
  listar: (authFetch: AuthFetch, idCampanha: number): Promise<AtualizacaoCampanhaResponse[]> =>
    authFetch(`/atualizacao-campanha?idCampanha=${idCampanha}&tamanho=500`)
      .then(tratarResposta<ResultadoPaginado<AtualizacaoCampanhaResponse>>)
      .then((resultado) => resultado.dados),
  publicar: (authFetch: AuthFetch, dados: AtualizacaoCampanhaRequestCreate): Promise<AtualizacaoCampanhaResponse> =>
    authFetch('/atualizacao-campanha', { method: 'POST', body: JSON.stringify(dados) }).then(
      tratarResposta<AtualizacaoCampanhaResponse>,
    ),
  // Excluir de vez: só a moderação (os anexos vão junto). Excluir mantendo o registro é `alterar` com ativo false.
  excluir: (authFetch: AuthFetch, id: number): Promise<void> =>
    authFetch(`/atualizacao-campanha/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
  alterar: (authFetch: AuthFetch, id: number, dados: AtualizacaoCampanhaRequestUpdate): Promise<AtualizacaoCampanhaResponse> =>
    authFetch(`/atualizacao-campanha/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }).then(
      tratarResposta<AtualizacaoCampanhaResponse>,
    ),
};
