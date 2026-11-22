import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

// Recompensa = o Mural dos apoiadores da campanha (22-11-2026, RF-103 a RF-105): uma por campanha (UK_RECOMPENSA_CAMPANHA),
// com o valor mínimo para entrar e uma mensagem de agradecimento opcional. Quem pode criar e alterar é a RLS
// (pol_recompensa_*, 04): o dono da campanha.
export class RecompensaRequestCreate {
  @IsInt()
  idCampanha: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'O valor mínimo precisa ser maior que zero.' })
  valorMinimo: number;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  descricao?: string | null;
}

// Com alguém no mural, o valor mínimo não muda e a recompensa não é desativada (fn_recompensa_trava, 05, 91067); a
// mensagem continua editável.
export class RecompensaRequestUpdate {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'O valor mínimo precisa ser maior que zero.' })
  valorMinimo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  descricao?: string | null;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
