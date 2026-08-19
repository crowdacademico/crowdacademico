import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';

// Query string sempre chega como string — mesmo cuidado de PaginacaoQueryDto
// (`@Type(() => Number)`) pra números; pra booleano, `@Type(() => Boolean)`
// sozinho converteria "false" (string não-vazia) em `true`, então o
// `@Transform` abaixo faz a conversão certa antes do class-validator rodar
// (precisa de `transform: true` no ValidationPipe global, já ligado em
// main.ts).
function paraBooleano({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

// Filtros pensados pro caso de uso concreto de formulário em cascata
// (grande área -> área, ver fn_valida_area_conhecimento_nivel2 em
// 05_regras_negocio.sql [05-K-1]): `raiz=true` lista só as grandes áreas
// (id_pai IS NULL); `idPai=<id de uma grande área>` lista as áreas filhas
// dela. Os dois ao mesmo tempo não fazem sentido juntos — `raiz=true`
// sobrepõe `idPai` no service, porque uma grande área raiz nunca tem
// idPai.
export class AreaConhecimentoRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idPai?: number;

  @IsOptional()
  @Transform(paraBooleano)
  @IsBoolean()
  raiz?: boolean;

  @IsOptional()
  @Transform(paraBooleano)
  @IsBoolean()
  ativo?: boolean;
}
