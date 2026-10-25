import { IsString, MinLength } from 'class-validator';
import {
  MENSAGEM_SENHA_CURTA,
  SENHA_MINIMO_CARACTERES,
} from '../../../commons/seguranca/senha.constants';

// Mesma regra de senha do cadastro (AuthRequestRegister).
export class AuthRequestResetPassword {
  @IsString()
  @MinLength(1, { message: 'Token é obrigatório.' })
  token: string;

  @IsString()
  @MinLength(SENHA_MINIMO_CARACTERES, { message: MENSAGEM_SENHA_CURTA })
  senha: string;
}
