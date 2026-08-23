import { IsInt, IsOptional, IsUrl, Min, MaxLength } from 'class-validator';

export class LinkAtualizacaoRequestUpdate {
  @IsUrl({}, { message: 'URL inválida.' })
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
