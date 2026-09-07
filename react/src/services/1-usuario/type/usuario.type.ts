// Espelha nest/src/1-usuario/dto/response/*.ts, um a um, mesmo nome de
// arquivo pra divergência ficar visível se um lado mudar e o outro não
// (fase 2 da migração TS - ver DOCUMENTACAO_FRONTEND.md/ACHADOS_PARA_DISCUTIR.md
// sobre a fraqueza conhecida deste desenho: nada AVISA se os dois lados
// desalinharem, é espelho manual, sem import cruzado entre os repositórios).
//
// Datas: o Nest declara `Date`, mas o que atravessa a rede em JSON é
// sempre uma STRING ISO 8601 - o `Date` do Nest só existe no lado de lá,
// nunca chega assim no navegador. Por isso todo campo de data aqui é
// `string`, não `Date`, refletindo o formato real da resposta HTTP.

// Espelha usuario.response.ts (UsuarioResponse).
export interface UsuarioResponse {
  idUsuario: number;
  nome: string;
  email: string;
  idImagemPerfil: number | null;
  criadoEm: string;
  emailVerificado: boolean;
  ultimoLoginEm: string | null;
  // Opcional de propósito - só GET /usuario/:id e PATCH resolvem isto de
  // verdade; a listagem (GET /usuario) nunca preenche.
  avatarUrl?: string | null;
}

// Espelha usuario.response-login-historico.ts.
export interface UsuarioResponseLoginHistorico {
  logadoEm: string;
}

// Espelha usuario.response-suspend.ts.
export interface UsuarioResponseSuspend {
  suspensoAte: string | null;
  motivoSuspensao: string | null;
  suspensoPor: number | null;
}
