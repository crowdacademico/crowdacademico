// Vive em commons/ (não em 3-auth/) de propósito: tanto o JwtAuthGuard
// (3-auth) quanto o GlobalDbInterceptor (commons/database) precisam do mesmo
// formato de `request.user` — colocar aqui evita commons/database importar
// de dentro de 3-auth (dependência de módulo de "infra" apontando pra
// "feature" ficaria estranho).
export interface UsuarioAutenticado {
  idUsuario: number;
  // ADICIONADO (09-08-2026, Bloco E do prompt do Claude Web: "Sessões
  // ativas" em Minha Conta) — vem do claim `sid` do JWT (ver
  // auth.service.login.ts, emitirTokens). Sem isso não dava pra saber QUAL
  // sessao.id_sessao corresponde à aba/dispositivo atual (o access token
  // nunca é comparado contra `sessao`, só o refresh token é) — impossível
  // marcar "sessão atual" na lista ou excluí-la de "encerrar todas as
  // outras" sem carregar esse dado no próprio token.
  idSessao: number;
}

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace Express {
    interface Request {
      user?: UsuarioAutenticado;
    }
  }
}
