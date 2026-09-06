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

  // ADICIONADO (05-09-2026, item 5 de PENDENCIAS) - ver comentário completo
  // em configuracao.request-create.ts.
  @IsOptional()
  @IsBoolean()
  publica?: boolean;
}
