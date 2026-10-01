import { IsString, MinLength } from 'class-validator';

// Mesma regra de senha do cadastro (AuthRequestRegister).
export class AuthRequestResetPassword {
  @IsString()
  @MinLength(1, { message: 'Token é obrigatório.' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Senha precisa ter pelo menos 8 caracteres.' })
  senha: string;
}
