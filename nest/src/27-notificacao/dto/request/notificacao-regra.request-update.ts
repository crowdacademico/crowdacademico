import { IsBoolean, IsOptional } from 'class-validator';

export class NotificacaoRegraRequestUpdate {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
