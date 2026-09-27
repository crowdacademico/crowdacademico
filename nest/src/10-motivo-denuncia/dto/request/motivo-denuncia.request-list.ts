import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PaginacaoQueryDto } from '../../../commons/database/dto/paginacao.query.dto';
import { TIPOS_MOTIVO_DENUNCIA } from '../../../commons/database/db.types';
import { BooleanoDaQuery } from '../../../commons/validacao/transformacoes.decorator';
import type { TipoMotivoDenuncia } from '../../../commons/database/db.types';

export class MotivoDenunciaRequestList extends PaginacaoQueryDto {
  @IsOptional()
  @BooleanoDaQuery()
  @IsBoolean()
  ativo?: boolean;

  // Filtra direto pela coluna `tipo` - pensado pro caso de uso concreto de
  // 19-denuncia montar o combo de motivos já restrito ao tipo do alvo
  // escolhido (mesma regra que trg_valida_tipo_motivo_denuncia garante na
  // gravação, 05_regras_negocio.sql [05-K-1] - aqui é só pra filtrar a
  // listagem, não pra gravar nada).
  @IsOptional()
  @IsIn(TIPOS_MOTIVO_DENUNCIA)
  tipo?: TipoMotivoDenuncia;
}
