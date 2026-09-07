import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  PapelPermissaoResponse,
  PapelRequestUpdate,
  PapelResponse,
  PermissaoResponse,
  UsuarioPapelResponse,
} from '../type/papel-permissao.type';

// Espelha 2-papel-permissao (nest): papel/permissao continuam só leitura
// (catálogo gerenciado via seed/migração direta, de propósito - criar
// papel/permissão nova é decisão maior, fora de escopo aqui).
// papel_permissao ganhou atribuir/remover (03-08-2026) - a matriz Papel ×
// Permissão virou editável pra admin, mesmo padrão de usuarioPapelApi.
export const papelApi = {
  listar: (authFetch: AuthFetch): Promise<PapelResponse[]> =>
    authFetch('/papel').then(tratarResposta<PapelResponse[]>),
  // Só `nome` é aceito (03-08-2026) - o `codigo` estável que o RBAC lê
  // nunca é exposto nem editável por aqui, de propósito.
  atualizar: (
    authFetch: AuthFetch,
    idPapel: number | string,
    dados: PapelRequestUpdate,
  ): Promise<PapelResponse> =>
    authFetch(`/papel/${idPapel}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<PapelResponse>),
};

export const permissaoApi = {
  listar: (authFetch: AuthFetch): Promise<PermissaoResponse[]> =>
    authFetch('/permissao').then(tratarResposta<PermissaoResponse[]>),
};

export const papelPermissaoApi = {
  listar: (authFetch: AuthFetch): Promise<PapelPermissaoResponse[]> =>
    authFetch('/papel-permissao').then(tratarResposta<PapelPermissaoResponse[]>),
  // CORRIGIDO (07-09-2026, achado auditando os `undefined as T` de
  // tratarResposta<T> não-void): o controller Nest (POST /papel-permissao)
  // devolve o corpo cru de PapelPermissaoServiceCreate.executar(), que é
  // `Promise<void>` de verdade (só faz o INSERT, sem SELECT de volta) -
  // sem `@HttpCode`, então o Nest manda 201 com corpo vazio. O tipo daqui
  // dizia `Promise<PapelPermissaoResponse>`, mas sempre resolvia
  // `undefined` (via `tratarResposta`). Sem efeito prático até agora - os
  // 2 pontos de chamada (matriz-papel-permissao.tsx) só fazem `await`,
  // nunca leem o valor - mas o tipo estava mentindo. Corrigido pra bater
  // com o corpo real, não com o que a resposta HTTP realmente devolve.
  atribuir: (
    authFetch: AuthFetch,
    idPapel: number | string,
    idPermissao: number | string,
  ): Promise<void> =>
    authFetch('/papel-permissao', {
      method: 'POST',
      body: JSON.stringify({ idPapel, idPermissao }),
    }).then(tratarResposta<void>),
  remover: (authFetch: AuthFetch, idPapel: number | string, idPermissao: number | string): Promise<void> =>
    authFetch(`/papel-permissao/${idPapel}/${idPermissao}`, {
      method: 'DELETE',
    }).then(tratarResposta<void>),
};

export const usuarioPapelApi = {
  // Sem filtro - todos os vínculos usuário↔papel de uma vez (RLS decide
  // sozinha quem vê o quê). Usado pela coluna "papel" na listagem de
  // Usuários, pra não disparar uma requisição por linha da tabela.
  listarTudo: (authFetch: AuthFetch): Promise<UsuarioPapelResponse[]> =>
    authFetch('/usuario-papel').then(tratarResposta<UsuarioPapelResponse[]>),
  listarPorUsuario: (authFetch: AuthFetch, idUsuario: number | string): Promise<UsuarioPapelResponse[]> =>
    authFetch(`/usuario-papel/${idUsuario}`).then(tratarResposta<UsuarioPapelResponse[]>),
  // CORRIGIDO (07-09-2026) - mesmo achado de papelPermissaoApi.atribuir,
  // acima: UsuarioPapelServiceCreate.executar() também é `Promise<void>`
  // de verdade (só INSERT, sem SELECT de volta), controller sem
  // `@HttpCode`, 201 com corpo vazio. Único ponto de chamada
  // (alterar-usuario.tsx) só faz `await`, nunca lê o valor.
  atribuir: (
    authFetch: AuthFetch,
    idUsuario: number | string,
    idPapel: number | string,
  ): Promise<void> =>
    authFetch('/usuario-papel', {
      method: 'POST',
      body: JSON.stringify({ idUsuario, idPapel }),
    }).then(tratarResposta<void>),
  remover: (authFetch: AuthFetch, idUsuario: number | string, idPapel: number | string): Promise<void> =>
    authFetch(`/usuario-papel/${idUsuario}/${idPapel}`, {
      method: 'DELETE',
    }).then(tratarResposta<void>),
  // Suspender/revogar UM papel por um tempo (09-08-2026, Bloco G) - em vez
  // de remover o vínculo: preserva quando foi atribuído, volta sozinho no
  // prazo. `ate` é ISO string.
  suspender: (
    authFetch: AuthFetch,
    idUsuario: number | string,
    idPapel: number | string,
    ate: string,
  ): Promise<void> =>
    authFetch(`/usuario-papel/${idUsuario}/${idPapel}/suspender`, {
      method: 'POST',
      body: JSON.stringify({ ate }),
    }).then(tratarResposta<void>),
  revogarSuspensao: (authFetch: AuthFetch, idUsuario: number | string, idPapel: number | string): Promise<void> =>
    authFetch(`/usuario-papel/${idUsuario}/${idPapel}/revogar-suspensao`, {
      method: 'POST',
    }).then(tratarResposta<void>),
};
