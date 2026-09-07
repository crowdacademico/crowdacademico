import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type {
  ConfiguracaoRequestCreate,
  ConfiguracaoRequestUpdate,
  ConfiguracaoResponse,
} from '../type/configuracao.type';

export const configuracaoApi = {
  // GET /configuracoes devolve { dados, total, pagina, tamanho } desde
  // 03-08-2026 (mesmo motivo de usuarioApi.listar, ver comentário lá) -
  // `.dados` desembrulhado aqui pras duas funções abaixo continuarem
  // devolvendo um array puro pra quem chama.
  listar: (authFetch: AuthFetch): Promise<ConfiguracaoResponse[]> =>
    authFetch('/configuracoes')
      .then(tratarResposta<ResultadoPaginado<ConfiguracaoResponse>>)
      .then((resposta) => resposta.dados),
  // Sem authFetch de propósito: pol_config_select (04_rls_policies.sql) já
  // libera as configurações globais (id_usuario IS NULL) pra qualquer um,
  // logado ou não - é o que sustenta useConfiguracoes() em página pública
  // (campanha, home), que roda fora de <ConfiguracoesProvider> autenticado.
  buscarPublicas: (): Promise<ConfiguracaoResponse[]> =>
    fetch(`${API_BASE_URL}/configuracoes`)
      .then(tratarResposta<ResultadoPaginado<ConfiguracaoResponse>>)
      .then((resposta) => resposta.dados),
  buscar: (authFetch: AuthFetch, id: number | string): Promise<ConfiguracaoResponse> =>
    authFetch(`/configuracoes/${id}`).then(tratarResposta<ConfiguracaoResponse>),
  criar: (authFetch: AuthFetch, dados: ConfiguracaoRequestCreate): Promise<ConfiguracaoResponse> =>
    authFetch('/configuracoes', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<ConfiguracaoResponse>),
  atualizar: (
    authFetch: AuthFetch,
    id: number | string,
    dados: ConfiguracaoRequestUpdate,
  ): Promise<ConfiguracaoResponse> =>
    authFetch(`/configuracoes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<ConfiguracaoResponse>),
  remover: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/configuracoes/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
};
