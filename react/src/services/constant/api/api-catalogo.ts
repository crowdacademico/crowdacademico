import { API_BASE_URL } from '../constants/api.constants';
import { tratarResposta } from './http.util';
import { paraQueryString } from './query-string.util';
import { desembrulharPaginado } from '../type/paginacao.type';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../type/paginacao.type';

// As 6 chamadas de um catálogo simples do Nest (GET lista, GET lista pública, GET por id, POST, PATCH, DELETE),
// iguais para todo catálogo: só mudam o caminho e os tipos. `listar`/`listarPublico` desembrulham a página
// ({ dados, total, ... }) para a GenericTable receber um array puro; `rotuloPlural` entra no aviso de quando o
// backend corta a lista (desembrulharPaginado). `listarPublico` usa fetch cru, sem login: só para catálogo cuja
// leitura a RLS libera para qualquer um.
export function criarApiCatalogo<Resposta, Criar, Atualizar, Filtro extends object>(caminho: string, rotuloPlural: string) {
  return {
    listar: (authFetch: AuthFetch, filtro?: Filtro): Promise<Resposta[]> =>
      authFetch(`${caminho}${paraQueryString(filtro)}`)
        .then(tratarResposta<ResultadoPaginado<Resposta>>)
        .then(desembrulharPaginado(rotuloPlural)),
    listarPublico: (filtro?: Filtro): Promise<Resposta[]> =>
      fetch(`${API_BASE_URL}${caminho}${paraQueryString(filtro)}`)
        .then(tratarResposta<ResultadoPaginado<Resposta>>)
        .then(desembrulharPaginado(rotuloPlural)),
    buscar: (authFetch: AuthFetch, id: number | string): Promise<Resposta> =>
      authFetch(`${caminho}/${id}`).then(tratarResposta<Resposta>),
    criar: (authFetch: AuthFetch, dados: Criar): Promise<Resposta> =>
      authFetch(caminho, { method: 'POST', body: JSON.stringify(dados) }).then(tratarResposta<Resposta>),
    atualizar: (authFetch: AuthFetch, id: number | string, dados: Atualizar): Promise<Resposta> =>
      authFetch(`${caminho}/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }).then(tratarResposta<Resposta>),
    remover: (authFetch: AuthFetch, id: number | string): Promise<void> =>
      authFetch(`${caminho}/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
  };
}
