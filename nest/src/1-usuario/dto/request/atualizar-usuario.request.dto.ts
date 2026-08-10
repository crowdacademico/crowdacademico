import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

// Mesmos 3 valores que ControleTema (React) usa.
const TEMAS_VALIDOS = ['claro', 'escuro', 'sistema'] as const;
// Mesma faixa que ControleFonte (React) usa (ESCALA_MINIMA/ESCALA_MAXIMA).
const ESCALA_FONTE_MINIMA = 0.875;
const ESCALA_FONTE_MAXIMA = 1.25;

export class AtualizarUsuarioRequestDto {
  // Só estes campos existem no GRANT UPDATE de `usuario` (06_grants.sql,
  // [06-D-2]) — email_verificado, tentativas_login_falhas, bloqueado_ate,
  // deletado etc. só mudam via função do banco (03_funcoes_seguranca.sql,
  // [03-O]), nunca por UPDATE direto. Não adianta adicionar mais campos aqui
  // sem criar a função correspondente primeiro.
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome precisa ter pelo menos 2 caracteres.' })
  nome?: string;

  @IsOptional()
  @IsInt()
  idImagemPerfil?: number;

  // Preferência POR CONTA (10-08-2026) — antes só vivia no localStorage do
  // navegador (preferência de aparelho, não de conta); ver comentário
  // completo em usuario.tema_preferido (01_extensoes_enums_tabelas.sql
  // [01-D]).
  @IsOptional()
  @IsIn(TEMAS_VALIDOS, { message: `temaPreferido precisa ser um de: ${TEMAS_VALIDOS.join(', ')}` })
  temaPreferido?: string;

  @IsOptional()
  @IsNumber()
  @Min(ESCALA_FONTE_MINIMA)
  @Max(ESCALA_FONTE_MAXIMA)
  escalaFontePreferida?: number;

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
