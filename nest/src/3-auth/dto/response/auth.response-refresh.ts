import { UsuarioResponse } from '../../../1-usuario/dto/response/usuario.response';

export class AuthResponseRefresh {
  accessToken: string;
  refreshToken: string;
  // Sem estes campos, a renovação SILENCIOSA de sessão ao abrir o app (use-auth, useEffect de montagem) nunca
  // preencheria `usuario`: dar F5 na página deixaria o cabeçalho sem nome/avatar até logar de novo manualmente.
  // Mesmo raciocínio de `papeis` em AuthResponseLogin.
  usuario: UsuarioResponse;
  papeis: string[];
}
