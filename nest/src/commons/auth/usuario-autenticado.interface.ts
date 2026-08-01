// Vive em commons/ (não em 3-auth/) de propósito: tanto o JwtAuthGuard
// (3-auth) quanto o GlobalDbInterceptor (commons/database) precisam do mesmo
// formato de `request.user` — colocar aqui evita commons/database importar
// de dentro de 3-auth (dependência de módulo de "infra" apontando pra
// "feature" ficaria estranho).
export interface UsuarioAutenticado {
  idUsuario: number;
}

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace Express {
    interface Request {
      user?: UsuarioAutenticado;
    }
  }
}
