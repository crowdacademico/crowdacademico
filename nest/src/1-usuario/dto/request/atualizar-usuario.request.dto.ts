import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class AtualizarUsuarioRequestDto {
  // Só estes 3 campos existem no GRANT UPDATE de `usuario` (06_grants.sql,
  // [06-D-2]) — email_verificado, tentativas_login_falhas, bloqueado_ate,
  // deletado etc. só mudam via função do banco (03_funcoes_seguranca.sql,
  // [03-F]), nunca por UPDATE direto. Não adianta adicionar mais campos aqui
  // sem criar a função correspondente primeiro.
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome precisa ter pelo menos 2 caracteres.' })
  nome?: string;

  @IsOptional()
  @IsInt()
  idImagemPerfil?: number;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Senha precisa ter pelo menos 8 caracteres.' })
  novaSenha?: string;

  // Opcional (09-08-2026, Bloco E — "Alterar senha (exigindo a atual)" em
  // Minha Conta): quando presente, o service exige bcrypt.compare contra
  // a senha atual antes de aceitar `novaSenha`. Ausente = comportamento de
  // sempre (reset administrativo, quem tem `usuario_suspender` não precisa
  // saber a senha antiga de outra pessoa) — mesmo endpoint, dois usos.
  @IsOptional()
  @IsString()
  senhaAtual?: string;
}
