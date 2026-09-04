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
  // VARCHAR(255) no banco. Obrigatório (18-08-2026, pedido do
  // Lucas/Alexia: "remover código em motivo denúncia") - `codigo`
  // (chave estável tipo CAMP-001, mesmo padrão de `papel`/`tipo_link`)
  // saiu do catálogo inteiro porque, diferente daqueles dois, nenhuma
  // trigger/função de 05_regras_negocio.sql o lia; ele nunca foi mais do
  // que texto informativo. Sem ele, `descricao` é o ÚNICO identificador
  // legível do motivo - por isso deixou de ser opcional.
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
