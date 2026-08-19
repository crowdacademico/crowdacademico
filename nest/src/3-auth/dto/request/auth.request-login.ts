import { IsEmail, IsString, MinLength } from 'class-validator';

export class AuthRequestLogin {
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  // Sem @MinLength aqui de propósito: login é conferência contra o hash
  // que já existe, não criação de senha nova — rejeitar por tamanho antes
  // de nem tentar comparar só vazaria informação (“sua senha é curta
  // demais” pra alguém que nem sabe se o e-mail existe) sem ganho real de
  // segurança. O piso de 8 caracteres já foi aplicado na hora de criar
  // (UsuarioRequestCreate) — aqui só confere que veio alguma coisa.
  @IsString()
  @MinLength(1, { message: 'Senha é obrigatória.' })
  senha: string;
}
