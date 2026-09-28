import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ConfiguracoesRequestUpdate {
  @IsOptional()
  @IsString()
  valor?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // Ver comentário completo em configuracoes.request-create.ts.
  @IsOptional()
  @IsBoolean()
  publica?: boolean;
}
