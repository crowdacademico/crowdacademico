import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';
import { STATUS_ENCERRAMENTO } from '../../../commons/database/db.types';
import type { StatusEncerramento } from '../../../commons/database/db.types';

export class SolicitacaoEncerramentoRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @IsIn(STATUS_ENCERRAMENTO)
  status?: StatusEncerramento;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idCampanha?: number;
}
