import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ConfiguracaoRequestUpdate {
  @IsOptional()
  @IsString()
  valor?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
