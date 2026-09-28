import { IsDateString, IsString, MinLength } from 'class-validator';

// Corpo de "suspender até X, com motivo": o mesmo para a suspensão da CONTA (POST /usuario/:id/suspender, bloqueia o
// login) e a do PODER de pesquisador (POST /perfil-pesquisador/:id/suspender, o login continua; ver
// suspender_pesquisador(), 03 [03-P]). A suspensão de um PAPEL (usuario-papel) não pede motivo e tem DTO próprio.
export class SuspensaoRequestDto {
  // ISO 8601 - o React monta a partir do seletor de dias (configuracoes
  // 'suspensao_usuario_opcoes_dias') ou de um campo livre de data.
  @IsDateString()
  ate: string;

  @IsString()
  @MinLength(3, { message: 'Motivo precisa ter pelo menos 3 caracteres.' })
  motivo: string;
}
