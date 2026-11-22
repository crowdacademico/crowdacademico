import { IsEmail, MaxLength } from 'class-validator';
import { EmailNormalizado } from '../../../commons/validacao/transformacoes.decorator';

// Troca do e-mail ainda não confirmado (22-11-2026), em Minha Conta.
export class AuthRequestMyEmail {
  @EmailNormalizado()
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(255, { message: 'E-mail muito longo.' })
  email: string;
}
