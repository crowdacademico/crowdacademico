import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { PaginacaoQueryDto } from './paginacao.query.dto';

// Listagem paginada de algo que pertence a uma campanha (?idCampanha=12&pagina=1): usada por GET
// /atualizacao-campanha e GET /comentario. `idCampanha` é obrigatório: essas listas nunca saem "de todas as
// campanhas".
export class PorCampanhaQueryDto extends PaginacaoQueryDto {
  @Type(() => Number)
  @IsInt()
  idCampanha: number;
}
