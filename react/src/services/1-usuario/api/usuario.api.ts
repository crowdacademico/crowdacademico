import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type {
  UsuarioResponse,
  UsuarioResponseLoginHistorico,
  UsuarioResponseSuspend,
} from '../type/usuario.type';

// authFetch vem de use-auth.js (services/3-auth/hook) - injetado, não
// importado direto, pra este arquivo não precisar saber nada de token.
export const usuarioApi = {
  // GET /usuario devolve { dados, total, pagina, tamanho } desde 03-08-2026
  // (achado de uma IA: findall sem limit/offset baixaria a tabela
  // inteira quando ela crescer) - `.dados` desembrulhado aqui, uma vez só,
  // pra GenericTable e todo o resto do app continuar recebendo um array
  // puro, sem precisar saber que pagina/total existem.
  listar: (authFetch: AuthFetch): Promise<UsuarioResponse[]> =>
    authFetch('/usuario')
      .then(tratarResposta<ResultadoPaginado<UsuarioResponse>>)
      .then((resposta) => resposta.dados),
  buscar: (authFetch: AuthFetch, id: number | string): Promise<UsuarioResponse> =>
    authFetch(`/usuario/${id}`).then(tratarResposta<UsuarioResponse>),
  criar: (authFetch: AuthFetch, dados: unknown): Promise<UsuarioResponse> =>
    authFetch('/usuario', { method: 'POST', body: JSON.stringify(dados) }).then(
      tratarResposta<UsuarioResponse>,
    ),
  atualizar: (authFetch: AuthFetch, id: number | string, dados: unknown): Promise<UsuarioResponse> =>
    authFetch(`/usuario/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<UsuarioResponse>),
  remover: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/usuario/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
  // Zera tentativas de login falhas + bloqueado_ate (liberar_bloqueio_login,
  // 03_funcoes_seguranca.sql [03-O]) - existia no banco desde sempre, mas
  // nenhum endpoint chamava (achado 03-08-2026: conta bloqueada por
  // excesso de tentativas de login não tinha NENHUM jeito de desbloquear
  // pelo painel).
  desbloquear: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/usuario/${id}/desbloquear`, { method: 'POST' }).then(tratarResposta<void>),
  // Histórico de login (07-08-2026) - cada linha de `sessao` já É um login,
  // não precisou de tabela nova - mais recente primeiro.
  listarLogins: (authFetch: AuthFetch, id: number | string): Promise<UsuarioResponseLoginHistorico[]> =>
    authFetch(`/usuario/${id}/logins`).then(tratarResposta<UsuarioResponseLoginHistorico[]>),
  // Suspensão de MODERAÇÃO (09-08-2026, Bloco G) - diferente de
  // `desbloquear` acima (aquele é bloqueio automático por senha errada).
  // `ate` é ISO string. "Reduzir a pena" é chamar `suspender` de novo com
  // uma data mais próxima, não existe endpoint separado pra isso.
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
