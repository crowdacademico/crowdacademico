import { UsuarioResponseDto } from '../../../1-usuario/dto/response/usuario.response.dto';

export class LoginResponseDto {
  accessToken: string;
  // "<id_sessao>.<segredo>" — ver constants/auth.constants.ts
  refreshToken: string;
  usuario: UsuarioResponseDto;
  // Nomes dos papéis do usuário (09-08-2026, Bloco B/C do prompt do Claude
  // Web) — o frontend usa isso só pra decidir SE mostra "Painel Admin" no
  // dropdown do cabeçalho, nunca pra checar permissão de verdade (isso
  // continua sendo decidido pelo backend/RLS a cada requisição).
  papeis: string[];
}
