import { IsIn, IsOptional } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';
import {
  STATUS_PESQUISADOR,
  TIPOS_VINCULO,
} from '../../../commons/database/db.types';
import type {
  StatusPesquisador,
  TipoVinculo,
} from '../../../commons/database/db.types';

export class PerfilPesquisadorRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @IsIn(STATUS_PESQUISADOR)
  statusPesquisador?: StatusPesquisador;

  @IsOptional()
  @IsIn(TIPOS_VINCULO)
  tipoVinculo?: TipoVinculo;
}
