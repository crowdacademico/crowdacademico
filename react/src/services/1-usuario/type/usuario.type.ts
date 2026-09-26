import type { TipoTermo } from '../../5-termo-uso/type/termo-uso.type';

// Espelha nest/src/1-usuario/dto/response/*.ts, um a um, com o mesmo nome de arquivo, para a divergência ficar
// visível se um lado mudar e o outro não (fraqueza conhecida deste desenho, ver DOCUMENTACAO_FRONTEND.md: nada
// AVISA se os dois lados desalinharem, é espelho manual, sem import cruzado entre os repositórios).
//
// Datas: o Nest declara `Date`, mas o que atravessa a rede em JSON é sempre uma STRING ISO 8601 (o `Date` do
// Nest só existe no lado de lá), por isso todo campo de data aqui é `string`, não `Date`, refletindo o formato
// real da resposta HTTP.

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

// Espelha usuario.response-termo-aceito.ts (Consultar Usuário: onde fica registrado o aceite do Termo de Uso).
export interface UsuarioResponseTermoAceito {
  tipo: TipoTermo;
  versao: string;
  aceitoEm: string;
}

// Espelha usuario.response-suspend.ts.
export interface UsuarioResponseSuspend {
  suspensoAte: string | null;
  motivoSuspensao: string | null;
  suspensoPor: number | null;
}

// Espelha nest/src/1-usuario/dto/request/*.ts.

// Espelha usuario.request-create.ts.
export interface UsuarioRequestCreate {
  nome: string;
  email: string;
  senha: string;
  idImagemPerfil?: number;
}

// Espelha usuario.request-update.ts.
export interface UsuarioRequestUpdate {
  nome?: string;
  idImagemPerfil?: number | null;
  novaSenha?: string;
  senhaAtual?: string;
}
