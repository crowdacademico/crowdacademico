import { UsuarioResponse } from '../../../1-usuario/dto/response/usuario.response';

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
