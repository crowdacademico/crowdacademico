import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TermoUsoRequestAlterar {
  // bate com termos_de_uso.versao VARCHAR(20), 01_extensoes_enums_tabelas.sql
  @IsOptional()
  @IsString()
  @MaxLength(20)
  versao?: string;

  @IsOptional()
  @IsString()
  conteudo?: string;
}
