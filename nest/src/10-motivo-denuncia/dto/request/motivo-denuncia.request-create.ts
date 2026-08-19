import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TIPOS_MOTIVO_DENUNCIA } from '../../../commons/database/db.types';
import type { TipoMotivoDenuncia } from '../../../commons/database/db.types';

export class CriarMotivoDenunciaRequestDto {
  // Chave estável, nunca editável depois (ver comentário no response DTO)
  // — convenção PREFIXO-NNN, igual todo `codigo` já seedado (CAMP-001..008,
  // PERF-001..004, ver 07_seed_dados.sql [07-C-3]). Regex mais permissiva
  // que a de tipo_link.codigo (que não usa hífen): aceita maiúsculas,
  // números, underscore E hífen, pra caber o padrão real já em uso.
  // UK_MOTIVO_DENUNCIA_CODIGO (01) garante unicidade no banco; aqui só a
  // forma é validada.
  @IsString()
  @MaxLength(20) // bate com motivo_denuncia.codigo VARCHAR(20), 01_extensoes_enums_tabelas.sql
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'codigo só pode ter letras maiúsculas, números, underscore e hífen (ex.: "CAMP-001").',
  })
  codigo: string;

  // VARCHAR(255) no banco, NULLABLE, sem default — diferente de
  // `tipo_link.nome`, aqui é opcional porque `codigo` já identifica o
  // motivo de forma legível o bastante (CAMP-001 etc.); `descricao` é o
  // texto exibido pro usuário final na hora de escolher o motivo na tela
  // de denúncia.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string | null;

  // tipo_motivo_denuncia NOT NULL, sem default — obrigatório no corpo.
  // Decide se este motivo aparece nas opções de denúncia de campanha ou de
  // perfil; trg_valida_tipo_motivo_denuncia (05_regras_negocio.sql
  // [05-K-1]) barra na gravação de `denuncia` qualquer id_motivo cujo
  // `tipo` não bate com o alvo escolhido (id_campanha_alvo x
  // id_pesquisador_alvo).
  @IsIn(TIPOS_MOTIVO_DENUNCIA)
  tipo: TipoMotivoDenuncia;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
