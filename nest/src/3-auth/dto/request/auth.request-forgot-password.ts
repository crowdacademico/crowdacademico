import { IsEmail } from 'class-validator';
import { EmailNormalizado } from '../../../commons/validacao/transformacoes.decorator';

export class AuthRequestForgotPassword {
  @EmailNormalizado()
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;
}
