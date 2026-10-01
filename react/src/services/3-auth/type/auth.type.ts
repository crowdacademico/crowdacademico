import type { UsuarioResponse } from '../../1-usuario/type/usuario.type';

// Assinatura de `authFetch` (services/3-auth/hook/use-auth.js) - o hook em
// si ainda não foi migrado (fase 4), mas todo `X.api.ts` (fase 3) recebe
// essa função por parâmetro e precisa saber o formato agora. Devolve a
// Response crua do fetch - cada chamador encadeia
// `.then(tratarResposta)` por conta própria.
export type AuthFetch = (caminho: string, opcoes?: RequestInit) => Promise<Response>;

// Espelha nest/src/3-auth/dto/response/*.ts.

// Espelha auth.response-login.ts (AuthResponseLogin).
export interface AuthResponseLogin {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioResponse;
  papeis: string[];
  aceitePendente: boolean;
}

// Espelha auth.response-register.ts (AuthResponseRegister extends
// AuthResponseLogin).
export interface AuthResponseRegister extends AuthResponseLogin {
  tokenVerificacaoEmailDev: string | null;
}

// auth.controller.verify-email.ts devolve um objeto solto, sem DTO
// formal do lado do Nest (`{ verificado: true }`) - espelhado aqui mesmo
// assim.
export interface AuthResponseVerifyEmail {
  verificado: boolean;
}

// "Esqueci minha senha" (auth.controller.forgot-password.ts): o link só volta fora de produção, enquanto o
// módulo de e-mail não existe. Mesma resposta exista ou não a conta.
export interface AuthResponseForgotPassword {
  tokenRecuperacaoSenhaDev: string | null;
}

// Espelha sessao.response.ts (SessaoResponse).
export interface SessaoResponse {
  idSessao: number;
  criadoEm: string;
  expiraEm: string;
  ip: string | null;
  userAgent: string | null;
  origem: string;
  atual: boolean;
}

// auth.controller.findall-sessions.ts, encerrarTodasMenosAtual() devolve um objeto
// solto (`{ encerradas: quantidade }`), sem DTO formal.
export interface SessaoResponseEndAll {
  encerradas: number;
}
