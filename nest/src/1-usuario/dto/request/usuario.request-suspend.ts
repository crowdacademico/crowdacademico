import { IsDateString, IsString, MinLength } from 'class-validator';

export class UsuarioRequestSuspend {
  // ISO 8601 - o React monta a partir do seletor de dias (configuracoes
  // 'suspensao_usuario_opcoes_dias') ou de um campo livre de data.
  @IsDateString()
  ate: string;

  @IsString()
  @MinLength(3, { message: 'Motivo precisa ter pelo menos 3 caracteres.' })
  motivo: string;
}
