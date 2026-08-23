import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';
import { STATUS_CAMPANHA } from '../../../commons/database/db.types';
import type { StatusCampanha } from '../../../commons/database/db.types';

// idUsuario (opcional) filtra "minhas campanhas" quando presente — sem
// ele, lista o catálogo público (pol_campanha_select, 04, já restringe
// sozinha aos status visíveis + dono + relatorio_visualizar; o filtro
// abaixo é só conveniência de navegação, não é o que decide visibilidade).
export class CampanhaRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @IsIn(STATUS_CAMPANHA)
  status?: StatusCampanha;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idAreaConhecimento?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idUsuario?: number;
}
