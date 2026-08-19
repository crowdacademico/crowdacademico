import { IsEmail, IsString, MinLength } from 'class-validator';

export class UsuarioRequestCreate {
  @IsString()
  @MinLength(2, { message: 'Nome precisa ter pelo menos 2 caracteres.' })
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  // senha em texto puro só nesta borda de entrada — o service faz o hash
  // (bcrypt) antes de qualquer INSERT. Nunca chega perto de vira senha_hash
  // sem passar por bcrypt.hash(). 8 é um piso de formato/segurança, não uma
  // regra de negócio configurável (diferente de valor_minimo_contribuicao
  // etc., que vivem em `configuracoes`) — por isso é uma constante aqui,
  // não uma consulta ao banco.
  @IsString()
  @MinLength(8, { message: 'Senha precisa ter pelo menos 8 caracteres.' })
  senha: string;
}
