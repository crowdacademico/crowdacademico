import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  FASES_ATUALIZACAO,
  TIPOS_ATUALIZACAO,
} from '../../../commons/database/db.types';
import type {
  FaseAtualizacao,
  TipoAtualizacao,
} from '../../../commons/database/db.types';

// pol_atualizacao_insert (04) exige: id_campanha pertencer a quem está
// autenticado E status_pesquisador='ativo'; trg_atualizacao_campanha_status
// (05, [05-K-2]) só libera campanha com status 'ativo'/'sucesso'/
// 'nao_atingido'. Nada disso duplicado aqui.
export class AtualizacaoCampanhaRequestCreate {
  @IsInt()
  idCampanha: number;

  @IsString()
  @MaxLength(150)
  titulo: string;

  @IsString()
  @MaxLength(20000)
  conteudo: string;

  @IsOptional()
  @IsIn(FASES_ATUALIZACAO)
  fase?: FaseAtualizacao;

  @IsOptional()
  @IsIn(TIPOS_ATUALIZACAO)
  tipo?: TipoAtualizacao;
}
