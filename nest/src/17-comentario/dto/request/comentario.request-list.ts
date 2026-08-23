import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';

export class ComentarioRequestList extends PaginacaoQueryDto {
  @Type(() => Number)
  @IsInt()
  idCampanha: number;
}
