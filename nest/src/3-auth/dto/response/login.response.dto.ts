import { UsuarioResponseDto } from '../../../1-usuario/dto/response/usuario.response.dto';

export class LoginResponseDto {
  accessToken: string;
  // "<id_sessao>.<segredo>" — ver constants/auth.constants.ts
  refreshToken: string;
  usuario: UsuarioResponseDto;
}
