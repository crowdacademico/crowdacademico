import { UsuarioResponse } from '../../../1-usuario/dto/response/usuario.response';

export class AuthResponseRefresh {
  accessToken: string;
  refreshToken: string;
  // ADICIONADOS (09-08-2026, Bloco B/C do prompt do Claude Web): sem isso,
  // a renovação SILENCIOSA de sessão ao abrir o app (use-auth.js, useEffect
  // de montagem) nunca preenchia `usuario` — só login "de verdade" fazia
  // isso antes, então dar F5 na página deixava o cabeçalho sem nome/avatar
  // até o usuário logar de novo manualmente. Mesmo raciocínio de `papeis`
  // em AuthResponseLogin.
  usuario: UsuarioResponse;
  papeis: string[];
}
