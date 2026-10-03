import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import { desembrulharPaginado } from '../../constant/type/paginacao.type';
import type {
  ConfiguracoesRequestUpdate,
  ConfiguracoesResponse,
} from '../type/configuracoes.type';

export const configuracoesApi = {
  // GET /configuracoes devolve { dados, total, pagina, tamanho } (mesmo motivo de usuarioApi.listar, ver
  // comentário lá): `.dados` desembrulhado aqui para as duas funções abaixo continuarem devolvendo um array
  // puro.
  listar: (authFetch: AuthFetch): Promise<ConfiguracoesResponse[]> =>
    authFetch('/configuracoes')
      .then(tratarResposta<ResultadoPaginado<ConfiguracoesResponse>>)
      .then(desembrulharPaginado('configurações')),
  // Sem authFetch de propósito: pol_config_select (04_rls_policies.sql) já
  // libera as configurações globais (id_usuario IS NULL) pra qualquer um,
  // logado ou não - é o que sustenta useConfiguracoes() em página pública
  // (campanha, home), que roda fora de <ConfiguracoesProvider> autenticado.
  buscarPublicas: (): Promise<ConfiguracoesResponse[]> =>
    fetch(`${API_BASE_URL}/configuracoes`)
      .then(tratarResposta<ResultadoPaginado<ConfiguracoesResponse>>)
      .then(desembrulharPaginado('configurações')),
  atualizar: (
    authFetch: AuthFetch,
    id: number | string,
    dados: ConfiguracoesRequestUpdate,
  ): Promise<ConfiguracoesResponse> =>
    authFetch(`/configuracoes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<ConfiguracoesResponse>),
};
