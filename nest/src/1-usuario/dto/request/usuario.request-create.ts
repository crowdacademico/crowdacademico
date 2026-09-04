import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UsuarioRequestCreate {
  @IsString()
  @MinLength(2, { message: 'Nome precisa ter pelo menos 2 caracteres.' })
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  // senha em texto puro só nesta borda de entrada - o service faz o hash
  // (bcrypt) antes de qualquer INSERT. Nunca chega perto de vira senha_hash
  // sem passar por bcrypt.hash(). 8 é um piso de formato/segurança, não uma
  // regra de negócio configurável (diferente de valor_minimo_contribuicao
  // etc., que vivem em `configuracoes`) - por isso é uma constante aqui,
  // não uma consulta ao banco.
  @IsString()
  @MinLength(8, { message: 'Senha precisa ter pelo menos 8 caracteres.' })
  senha: string;

  // ADICIONADO (módulo 25-arquivo): opcional, pra permitir escolher a foto
  // de perfil já na tela de criação (upload acontece ANTES, via
  // POST /arquivo/upload/iniciar+confirmar - este campo só recebe o
  // id_arquivo já confirmado). Sem validação de "arquivo existe/é do tipo
  // certo" aqui: quem confirma isso é o próprio módulo de arquivo; um id
  // inexistente aqui só resultaria num FK_USUARIO_IMAGEM inválido,
  // rejeitado pelo Postgres.
  @IsOptional()
  @IsInt()
  idImagemPerfil?: number;
}
