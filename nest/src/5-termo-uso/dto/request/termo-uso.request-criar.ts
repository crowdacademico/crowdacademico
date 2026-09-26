import { IsIn, IsString, MaxLength } from 'class-validator';
import { TIPOS_TERMO } from '../../../commons/database/db.types';
import type { TipoTermo } from '../../../commons/database/db.types';

export class TermoUsoRequestCriar {
  // tipo_termo NOT NULL: obrigatório, sem default no corpo. Decide em qual trilha de aceite esta versão entra
  // (cadastro, contribuição a campanha ou upgrade de pesquisador), cada uma com seu próprio "ativo"
  // (uq_termos_uso_ativo, 02_indices.sql, é por tipo).
  @IsIn(TIPOS_TERMO)
  tipo: TipoTermo;

  // bate com termos_de_uso.versao VARCHAR(20), 01_extensoes_enums_tabelas.sql
  @IsString()
  @MaxLength(20)
  versao: string;

  @IsString()
  conteudo: string;
}
