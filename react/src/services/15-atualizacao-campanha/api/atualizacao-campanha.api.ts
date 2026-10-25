import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import { paraQueryString } from '../../constant/api/query-string.util';
import { TAMANHO_PAGINA_MAXIMO_API } from '../../constant/type/paginacao.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type {
  AnexoAtualizacaoResponse,
  AtualizacaoCampanhaRequestCreate,
  AtualizacaoCampanhaResponse,
} from '../type/atualizacao-campanha.type';

// Espelha nest/src/15-atualizacao-campanha. Quem publica é o dono da campanha (pol_atualizacao_insert, 04), só em
// campanha ativa, com sucesso ou não atingida (validar_atualizacao_campanha, 91019; RF-051). Ocultar é `ativo`
// falso: a atualização fica guardada (RF-052).
export const atualizacaoCampanhaApi = {
  // Todos os anexos (arquivos e links) das atualizações, o mais novo primeiro. Exige `atualizacao_moderar` (403 sem ela).
  listarAnexos: (authFetch: AuthFetch): Promise<AnexoAtualizacaoResponse[]> =>
    authFetch(`/anexo-atualizacao${paraQueryString({ limite: TAMANHO_PAGINA_MAXIMO_API })}`).then(
      tratarResposta<AnexoAtualizacaoResponse[]>,
    ),
  listar: (authFetch: AuthFetch, idCampanha: number): Promise<AtualizacaoCampanhaResponse[]> =>
    authFetch(`/atualizacao-campanha?idCampanha=${idCampanha}&tamanho=500`)
      .then(tratarResposta<ResultadoPaginado<AtualizacaoCampanhaResponse>>)
      .then((resultado) => resultado.dados),
  publicar: (authFetch: AuthFetch, dados: AtualizacaoCampanhaRequestCreate): Promise<AtualizacaoCampanhaResponse> =>
    authFetch('/atualizacao-campanha', { method: 'POST', body: JSON.stringify(dados) }).then(
      tratarResposta<AtualizacaoCampanhaResponse>,
    ),
  alternarAtivo: (authFetch: AuthFetch, id: number, ativo: boolean): Promise<AtualizacaoCampanhaResponse> =>
    authFetch(`/atualizacao-campanha/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo }) }).then(
      tratarResposta<AtualizacaoCampanhaResponse>,
    ),
};
