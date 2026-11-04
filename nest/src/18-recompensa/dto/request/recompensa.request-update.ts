import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RecompensaRequestLink } from './recompensa.request-create';
import {
  TIPOS_RECOMPENSA,
  type TipoRecompensa,
} from '../../../commons/database/db.types';

export class RecompensaRequestUpdate {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Informe o título da recompensa.' })
  @MaxLength(150)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  descricao?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'O valor mínimo precisa ser maior que zero.' })
  valorMinimo?: number;

  @IsOptional()
  @IsIn(TIPOS_RECOMPENSA)
  tipo?: TipoRecompensa;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // Troca o link especial: tira o que havia e grava este, na mesma transação (acesso antecipado e entrega digital
  // nunca ficam sem link, fn_valida_link_recompensa, 05).
  @IsOptional()
  @ValidateNested()
  @Type(() => RecompensaRequestLink)
  link?: RecompensaRequestLink;
}
