import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';
import { TIPOS_MOTIVO_DENUNCIA } from '../../../commons/database/db.types';
import type { TipoMotivoDenuncia } from '../../../commons/database/db.types';

// Mesmo cuidado de TipoLinkRequestList (9-tipo-link)/
// AreaConhecimentoRequestList (8-area-conhecimento): `@Type(() =>
// Boolean)` sozinho converteria "false" (string não-vazia) em `true`,
// então o `@Transform` abaixo faz a conversão certa antes do
// class-validator rodar (precisa de `transform: true` no ValidationPipe
// global, já ligado em main.ts).
function paraBooleano({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class MotivoDenunciaRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @Transform(paraBooleano)
  @IsBoolean()
  ativo?: boolean;

  // Filtra direto pela coluna `tipo` — pensado pro caso de uso concreto de
  // 19-denuncia montar o combo de motivos já restrito ao tipo do alvo
  // escolhido (mesma regra que trg_valida_tipo_motivo_denuncia garante na
  // gravação, 05_regras_negocio.sql [05-K-1] — aqui é só pra filtrar a
  // listagem, não pra gravar nada).
  @IsOptional()
  @IsIn(TIPOS_MOTIVO_DENUNCIA)
  tipo?: TipoMotivoDenuncia;
}
