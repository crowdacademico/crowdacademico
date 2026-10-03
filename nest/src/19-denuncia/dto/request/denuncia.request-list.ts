import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';
import {
  STATUS_DENUNCIA,
  TIPOS_MOTIVO_DENUNCIA,
} from '../../../commons/database/db.types';
import type {
  StatusDenuncia,
  TipoMotivoDenuncia,
} from '../../../commons/database/db.types';

// Filtros da lista da moderação (RF-113, RF-116) e da seção de denúncias no Consultar da campanha.
export class DenunciaRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @IsIn(TIPOS_MOTIVO_DENUNCIA)
  tipo?: TipoMotivoDenuncia;

  @IsOptional()
  @IsIn(STATUS_DENUNCIA)
  status?: StatusDenuncia;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idCampanha?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idPesquisador?: number;
}
