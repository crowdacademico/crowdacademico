import { Equals, IsEmail, IsString, MinLength } from 'class-validator';
import {
  MENSAGEM_NOME_CURTO,
  NOME_MINIMO_CARACTERES,
} from '../../../commons/validacao/minimos.constants';
import { EmailNormalizado } from '../../../commons/validacao/transformacoes.decorator';
import {
  MENSAGEM_SENHA_CURTA,
  SENHA_MINIMO_CARACTERES,
} from '../../../commons/seguranca/senha.constants';

// Mesmas regras de UsuarioRequestCreate (1-usuario) - o cadastro público
// cria a mesma linha em `usuario`, só que auto-serviço, com um passo a
// mais (aceite de termo) e terminando já logado.
export class AuthRequestRegister {
  @IsString()
  @MinLength(NOME_MINIMO_CARACTERES, { message: MENSAGEM_NOME_CURTO })
  nome: string;

  @EmailNormalizado()
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  @IsString()
  @MinLength(SENHA_MINIMO_CARACTERES, { message: MENSAGEM_SENHA_CURTA })
  senha: string;

  // @Equals(true), não @IsBoolean() - precisa ser EXATAMENTE true; `false`
  // ou ausente rejeita com uma mensagem clara em vez de deixar passar um
  // cadastro sem aceite de verdade (RF-011). O texto do termo em si nunca
  // chega no corpo desta requisição - o backend sempre resolve a versão
  // ATIVA sozinho (GET /termos-uso/ativo é só pra exibir na tela).
  @Equals(true, {
    message: 'É preciso aceitar o Termo de Uso pra criar a conta.',
  })
  aceiteTermos: boolean;
}
