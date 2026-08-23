import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { MODELOS_CAMPANHA } from '../../../commons/database/db.types';
import type { ModeloCampanha } from '../../../commons/database/db.types';

// id_usuario NUNCA vem daqui (sempre request.user.idUsuario, mesmo padrão
// de link-academico/perfil-pesquisador). status/aprovado_em/id_admin/
// taxa_plataforma/valor_bruto_arrecadado também não — são geridos por
// trigger (05_regras_negocio.sql, [05-K-2]) ou por endpoints de ação
// dedicados (aprovar/rejeitar), nunca pelo create genérico. dataInicio/
// dataFim opcionais (a trigger de prazo de negócio só valida quando os
// dois vierem preenchidos — pode nascer sem data e ganhar depois via
// update, antes de ir pra aprovação).
export class CampanhaRequestCreate {
  @IsString()
  @MaxLength(255)
  titulo: string;

  @IsInt()
  idAreaConhecimento: number;

  @IsOptional()
  @IsIn(MODELOS_CAMPANHA)
  modelo?: ModeloCampanha;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  metaFinanceira: number;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  descricao?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL inválida.' })
  @MaxLength(500)
  videoApresentacaoUrl?: string;
}
