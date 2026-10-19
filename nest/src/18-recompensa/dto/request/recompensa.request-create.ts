import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  TIPOS_RECOMPENSA,
  type TipoRecompensa,
} from '../../../commons/database/db.types';

// O "link especial": só o dono da campanha e quem ganhou a recompensa enxergam (pol_link_recompensa_select, 04).
export class RecompensaRequestLink {
  @IsInt()
  idTipoLink: number;

  @IsUrl({}, { message: 'URL inválida.' })
  @MaxLength(500)
  url: string;
}

export class RecompensaRequestCreate {
  @IsInt()
  idCampanha: number;

  @IsString()
  @IsNotEmpty({ message: 'Informe o título da recompensa.' })
  @MaxLength(150)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  descricao?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'O valor mínimo precisa ser maior que zero.' })
  valorMinimo: number;

  @IsIn(TIPOS_RECOMPENSA, {
    message:
      'Tipo de recompensa: reconhecimento, acesso antecipado ou digital.',
  })
  tipo: TipoRecompensa;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecompensaRequestLink)
  link?: RecompensaRequestLink;
}
