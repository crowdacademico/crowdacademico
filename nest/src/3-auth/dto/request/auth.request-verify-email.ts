import { IsString, MinLength } from 'class-validator';

export class AuthRequestVerifyEmail {
  @IsString()
  @MinLength(1, { message: 'Token é obrigatório.' })
  token: string;
}
