import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

// id_usuario NUNCA vem daqui - sempre de request.user.idUsuario (mesmo
// padrão de todo endpoint "meu" já existente). rotulo é opcional (RF-014/
// RF-016/RF-018 - sem rótulo, o front cai pro nome do tipo_link).
export class LinkAcademicoRequestCreate {
  @IsInt()
  idTipoLink: number;

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
