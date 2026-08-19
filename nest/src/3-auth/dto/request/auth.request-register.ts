import { Equals, IsEmail, IsString, MinLength } from 'class-validator';

// Mesmas regras de UsuarioRequestCreate (1-usuario) — o cadastro público
// cria a mesma linha em `usuario`, só que auto-serviço, com um passo a
// mais (aceite de termo) e terminando já logado.
export class AuthRequestRegister {
  @IsString()
  @MinLength(2, { message: 'Nome precisa ter pelo menos 2 caracteres.' })
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Senha precisa ter pelo menos 8 caracteres.' })
  senha: string;

  // @Equals(true), não @IsBoolean() — precisa ser EXATAMENTE true; `false`
  // ou ausente rejeita com uma mensagem clara em vez de deixar passar um
  // cadastro sem aceite de verdade (RF-011). O texto do termo em si nunca
  // chega no corpo desta requisição — o backend sempre resolve a versão
  // ATIVA sozinho (GET /termos-uso/ativo é só pra exibir na tela).
  @Equals(true, {
    message: 'É preciso aceitar os Termos de Uso pra criar a conta.',
  })
  aceiteTermos: boolean;
}
