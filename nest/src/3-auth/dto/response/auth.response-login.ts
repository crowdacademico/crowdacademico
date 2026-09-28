import { UsuarioResponse } from '../../../1-usuario/dto/response/usuario.response';

// Também é a resposta da renovação de sessão (POST /auth/refresh), com os mesmos campos: sem `usuario`/`papeis` ali,
// a renovação silenciosa ao abrir o app (use-auth, ao montar) nunca preencheria o cabeçalho, e dar F5 deixaria a
// tela sem nome/avatar até logar de novo.
export class AuthResponseLogin {
  accessToken: string;
  // "<id_sessao>.<segredo>" - ver constants/auth.constants.ts
  refreshToken: string;
  usuario: UsuarioResponse;
  // Nomes dos papéis do usuário: o frontend usa isso só para decidir SE mostra "Painel Admin" no dropdown do
  // cabeçalho, nunca para checar permissão de verdade (isso continua sendo decidido pelo backend/RLS a cada
  // requisição).
  papeis: string[];
}
