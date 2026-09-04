import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  FASES_ATUALIZACAO,
  TIPOS_ATUALIZACAO,
} from '../../../commons/database/db.types';
import type {
  FaseAtualizacao,
  TipoAtualizacao,
} from '../../../commons/database/db.types';

// `ativo` incluso de propósito (autor oculta a própria atualização,
// moderador com atualizacao_moderar oculta/reverte qualquer uma) -
// fn_bloqueia_reversao_moderacao_comentario não existe pra esta tabela,
// mas pol_atualizacao_update (04) já limita quem chega até aqui (dono OU
// atualizacao_moderar); não há trigger extra de reversão nesta tabela
// (diferente de comentario), então o dono também pode reverter a própria
// ocultação - decisão consciente, não uma lacuna esquecida.
export class AtualizacaoCampanhaRequestUpdate {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  conteudo?: string;

  @IsOptional()
  @IsIn(FASES_ATUALIZACAO)
  fase?: FaseAtualizacao;

  @IsOptional()
  @IsIn(TIPOS_ATUALIZACAO)
  tipo?: TipoAtualizacao;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
