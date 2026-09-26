import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TIPOS_MOTIVO_DENUNCIA } from '../../../commons/database/db.types';
import type { TipoMotivoDenuncia } from '../../../commons/database/db.types';

export class MotivoDenunciaRequestCreate {
  // VARCHAR(255) no banco. Obrigatório: sem `codigo` (a chave estável tipo CAMP-001 não existe no catálogo,
  // porque nenhuma trigger/função de 05_regras_negocio.sql a lia), `descricao` é o ÚNICO identificador legível
  // do motivo.
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  descricao: string;

  // tipo_motivo_denuncia NOT NULL, sem default - obrigatório no corpo.
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
