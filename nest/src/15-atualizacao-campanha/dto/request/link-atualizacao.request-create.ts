import { IsInt, IsOptional, IsUrl, Min, MaxLength } from 'class-validator';

export class LinkAtualizacaoRequestCreate {
  @IsInt()
  idAtualizacao: number;

  @IsInt()
  idTipoLink: number;

  @IsUrl({}, { message: 'URL inválida.' })
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
