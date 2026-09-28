import { IsDateString, IsString, MinLength } from 'class-validator';

// Espelha usuario.request-suspend.ts - mesma validação, mesmo formato de
// data (ISO 8601, montado pelo React a partir do seletor de dias ou de um
// campo livre). Diferente de UsuarioRequestSuspend: esta suspensão é só do
// PODER de pesquisador, não bloqueia login (ver comentário completo em
// suspender_pesquisador(), 03_funcoes_seguranca.sql [03-P]).
export class PerfilPesquisadorRequestSuspender {
  @IsDateString()
  ate: string;

  @IsString()
  @MinLength(3, { message: 'Motivo precisa ter pelo menos 3 caracteres.' })
  motivo: string;
}
