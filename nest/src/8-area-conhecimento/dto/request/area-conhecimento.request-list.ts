import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';
import { BooleanoDaQuery } from '../../../commons/validacao/transformacoes.decorator';

// Filtros pensados pro caso de uso concreto de formulário em cascata
// (grande área -> área, ver fn_valida_area_conhecimento_nivel2 em
// 05_regras_negocio.sql [05-K-1]): `raiz=true` lista só as grandes áreas
// (id_pai IS NULL); `idPai=<id de uma grande área>` lista as áreas filhas
// dela. Os dois ao mesmo tempo não fazem sentido juntos - `raiz=true`
// sobrepõe `idPai` no service, porque uma grande área raiz nunca tem
// idPai.
export class AreaConhecimentoRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idPai?: number;

  @IsOptional()
  @BooleanoDaQuery()
  @IsBoolean()
  raiz?: boolean;

  @IsOptional()
  @BooleanoDaQuery()
  @IsBoolean()
  ativo?: boolean;
}
