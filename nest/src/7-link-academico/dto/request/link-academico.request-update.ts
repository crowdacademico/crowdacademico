import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

// Sem idTipoLink de propósito — trocar o TIPO de um link já existente (de
// Lattes pra ORCID, por exemplo) não faz sentido de produto; quem quer isso
// exclui e cria de novo. Update é só pra corrigir url/rótulo/ordem.
export class LinkAcademicoRequestUpdate {
  @IsUrl({}, { message: 'URL inválida.' })
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  rotulo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
