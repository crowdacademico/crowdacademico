import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  LinkAcademicoRequestCreate,
  LinkAcademicoRequestUpdate,
  LinkAcademicoResponse,
} from '../type/link-academico.type';

// Espelha nest/src/7-link-academico. Quem pode criar, alterar ou remover o link de outra pessoa é decidido pelo
// banco (RLS e a permissão de criar para outro); aqui só as chamadas.
export const linkAcademicoApi = {
  caminhoListarDoUsuario: (idUsuario: number) => `/link-academico?idUsuario=${idUsuario}`,
  listarDoUsuario: (authFetch: AuthFetch, idUsuario: number): Promise<LinkAcademicoResponse[]> =>
    authFetch(linkAcademicoApi.caminhoListarDoUsuario(idUsuario)).then(tratarResposta<LinkAcademicoResponse[]>),
  // POST /link-academico/:idUsuario: cria o link em nome de outra pessoa (o admin editando um usuário).
  criarParaOutro: (authFetch: AuthFetch, idUsuario: number, dados: LinkAcademicoRequestCreate): Promise<LinkAcademicoResponse> =>
    authFetch(`/link-academico/${idUsuario}`, { method: 'POST', body: JSON.stringify(dados) }).then(
      tratarResposta<LinkAcademicoResponse>,
    ),
  alterar: (authFetch: AuthFetch, id: number, dados: LinkAcademicoRequestUpdate): Promise<void> =>
    authFetch(`/link-academico/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }).then(tratarResposta<void>),
  remover: (authFetch: AuthFetch, id: number): Promise<void> =>
    authFetch(`/link-academico/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
};
