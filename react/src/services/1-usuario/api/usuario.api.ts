import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import { desembrulharPaginado } from '../../constant/type/paginacao.type';
import type {
  UsuarioRequestCreate,
  UsuarioRequestUpdate,
  UsuarioResponse,
  UsuarioResponseLoginHistorico,
  UsuarioResponseSuspend,
  UsuarioResponseTermoAceito,
} from '../type/usuario.type';

// authFetch vem de use-auth.js (services/3-auth/hook) - injetado, não
// importado direto, pra este arquivo não precisar saber nada de token.
export const usuarioApi = {
  // GET /usuario devolve { dados, total, pagina, tamanho }: `.dados` desembrulhado aqui, uma vez só, para
  // GenericTable e todo o resto do app continuarem recebendo um array puro, sem precisar saber que pagina/total
  // existem.
  listar: (authFetch: AuthFetch): Promise<UsuarioResponse[]> =>
    authFetch('/usuario')
      .then(tratarResposta<ResultadoPaginado<UsuarioResponse>>)
      .then(desembrulharPaginado('usuários')),
  buscar: (authFetch: AuthFetch, id: number | string): Promise<UsuarioResponse> =>
    authFetch(`/usuario/${id}`).then(tratarResposta<UsuarioResponse>),
  criar: (authFetch: AuthFetch, dados: UsuarioRequestCreate): Promise<UsuarioResponse> =>
    authFetch('/usuario', { method: 'POST', body: JSON.stringify(dados) }).then(
      tratarResposta<UsuarioResponse>,
    ),
  atualizar: (
    authFetch: AuthFetch,
    id: number | string,
    dados: UsuarioRequestUpdate,
  ): Promise<UsuarioResponse> =>
    authFetch(`/usuario/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<UsuarioResponse>),
  remover: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/usuario/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
  // Zera tentativas de login falhas + bloqueado_ate (liberar_bloqueio_login, 03_funcoes_seguranca.sql [03-O]):
  // o único jeito de desbloquear, pelo painel, uma conta bloqueada por excesso de tentativas de login.
  desbloquear: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/usuario/${id}/desbloquear`, { method: 'POST' }).then(tratarResposta<void>),
  // Histórico de login: cada linha de `sessao` já É um login, mais recente primeiro.
  listarLogins: (authFetch: AuthFetch, id: number | string): Promise<UsuarioResponseLoginHistorico[]> =>
    authFetch(`/usuario/${id}/logins`).then(tratarResposta<UsuarioResponseLoginHistorico[]>),
  // Termos de Uso aceitos ("onde fica registrado" o aceite): join de usuario_termo com termos_de_uso, mais
  // recente primeiro. Cobre cadastro e upgrade de perfil de pesquisador; aceite por contribuição a campanha
  // fica de fora (aceite_termo_contribuicao é por CONTRIBUIÇÃO, não por usuário direto, e o módulo de
  // contribuição ainda não existe).
  listarTermosAceitos: (
    authFetch: AuthFetch,
    id: number | string,
  ): Promise<UsuarioResponseTermoAceito[]> =>
    authFetch(`/usuario/${id}/termos-aceitos`).then(tratarResposta<UsuarioResponseTermoAceito[]>),
  // Suspensão de MODERAÇÃO: diferente de `desbloquear` acima (aquele é bloqueio automático por senha errada).
  // `ate` é ISO string. "Reduzir a pena" é chamar `suspender` de novo com uma data mais próxima, não existe
  // endpoint separado para isso.
  buscarSuspensao: (authFetch: AuthFetch, id: number | string): Promise<UsuarioResponseSuspend> =>
    authFetch(`/usuario/${id}/suspensao`).then(tratarResposta<UsuarioResponseSuspend>),
  suspender: (
    authFetch: AuthFetch,
    id: number | string,
    ate: string,
    motivo: string,
  ): Promise<void> =>
    authFetch(`/usuario/${id}/suspender`, {
      method: 'POST',
      body: JSON.stringify({ ate, motivo }),
    }).then(tratarResposta<void>),
  revogarSuspensao: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/usuario/${id}/revogar-suspensao`, { method: 'POST' }).then(tratarResposta<void>),
};
