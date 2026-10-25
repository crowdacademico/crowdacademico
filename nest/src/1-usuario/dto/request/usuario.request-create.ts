import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { EmailNormalizado } from '../../../commons/validacao/transformacoes.decorator';
import {
  MENSAGEM_SENHA_CURTA,
  SENHA_MINIMO_CARACTERES,
} from '../../../commons/seguranca/senha.constants';

export class UsuarioRequestCreate {
  @IsString()
  @MinLength(2, { message: 'Nome precisa ter pelo menos 2 caracteres.' })
  nome: string;

  @EmailNormalizado()
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  // senha em texto puro só nesta borda de entrada - o service faz o hash
  // (bcrypt) antes de qualquer INSERT. Nunca chega perto de vira senha_hash
  // sem passar por bcrypt.hash(). 8 é um piso de formato/segurança, não uma
  // regra de negócio configurável (diferente de valor_minimo_contribuicao
  // etc., que vivem em `configuracoes`) - por isso é uma constante aqui,
  // não uma consulta ao banco.
  @IsString()
  @MinLength(SENHA_MINIMO_CARACTERES, { message: MENSAGEM_SENHA_CURTA })
  senha: string;

  // Opcional, para permitir escolher a foto de perfil já na tela de criação (o upload acontece ANTES, via POST
  // /arquivo/upload/iniciar+confirmar; este campo só recebe o id_arquivo já confirmado). Sem validação de
  // "arquivo existe/é do tipo certo" aqui: quem confirma isso é o módulo de arquivo; um id inexistente aqui só
  // resultaria num FK_USUARIO_IMAGEM inválido, rejeitado pelo Postgres.
  @IsOptional()
  @IsInt()
  idImagemPerfil?: number;
}
