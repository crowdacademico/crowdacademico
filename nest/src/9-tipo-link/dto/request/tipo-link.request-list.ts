import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';

// Mesmo cuidado de ListarAreaConhecimentoQueryDto (8-area-conhecimento):
// `@Type(() => Boolean)` sozinho converteria "false" (string não-vazia)
// em `true`, então o `@Transform` abaixo faz a conversão certa antes do
// class-validator rodar (precisa de `transform: true` no ValidationPipe
// global, já ligado em main.ts).
function paraBooleano({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

const ESCOPOS_VALIDOS = ['perfil', 'atualizacao', 'recompensa'] as const;
export type EscopoTipoLink = (typeof ESCOPOS_VALIDOS)[number];

export class ListarTipoLinkQueryDto extends PaginacaoQueryDto {
  @IsOptional()
  @Transform(paraBooleano)
  @IsBoolean()
  ativo?: boolean;

  // Filtra pelo campo permite_* correspondente — pensado pro caso de uso
  // concreto de um módulo consumidor (7-link-academico) montar seu combo
  // só com os tipos permitidos pro PRÓPRIO contexto (mesma regra que
  // trg_valida_escopo_tipolink garante na gravação, 05_regras_negocio.sql
  // [05-K-1] — aqui é só pra filtrar a listagem com a mesma regra, não
  // pra gravar nada).
  @IsOptional()
  @IsIn(ESCOPOS_VALIDOS)
  escopo?: EscopoTipoLink;
}
