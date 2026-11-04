import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  FASES_ATUALIZACAO,
  TIPOS_ATUALIZACAO,
} from '../../../commons/database/db.types';
import type {
  FaseAtualizacao,
  TipoAtualizacao,
} from '../../../commons/database/db.types';

export class AtualizacaoCampanhaRequestLink {
  @IsInt()
  idTipoLink: number;

  @IsUrl({}, { message: 'URL inválida.' })
  @MaxLength(500)
  url: string;
}

// pol_atualizacao_insert (04) exige: id_campanha pertencer a quem está
// autenticado E status_pesquisador='ativo'; trg_atualizacao_campanha_status
// (05, [05-K-2]) só libera campanha com status 'ativo'/'sucesso'/
// 'nao_atingido'. Nada disso duplicado aqui. Os anexos (RF-053) entram na mesma transação: os arquivos já
// enviados pelo módulo 26-arquivo (fn_valida_posse_anexo confere que são de quem publica) e os links.
export class AtualizacaoCampanhaRequestCreate {
  @IsInt()
  idCampanha: number;

  @IsString()
  @MaxLength(150)
  titulo: string;

  @IsString()
  @MaxLength(20000)
  conteudo: string;

  // RF-053: fase e formato obrigatórios (NOT NULL no banco).
  @IsIn(FASES_ATUALIZACAO)
  fase: FaseAtualizacao;

  @IsIn(TIPOS_ATUALIZACAO)
  tipo: TipoAtualizacao;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  idsArquivos?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AtualizacaoCampanhaRequestLink)
  links?: AtualizacaoCampanhaRequestLink[];
}
