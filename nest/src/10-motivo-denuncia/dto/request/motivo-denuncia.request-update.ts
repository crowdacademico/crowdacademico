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

export class MotivoDenunciaRequestUpdate {
  // NOT NULL no banco (`descricao` é o único identificador legível do motivo). Omitido = não muda; presente =
  // precisa ser uma string não vazia, `null` não é aceito aqui (diferente do padrão de `regex` em
  // TipoLinkRequestUpdate).
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  descricao?: string;

  // Editável (diferente de `codigo`): não existe trigger no banco que
  // trave a troca de `tipo` depois de criado (só
  // trg_valida_tipo_motivo_denuncia, que valida no INSERT/UPDATE de
  // `denuncia`, não de `motivo_denuncia`) - mudar o `tipo` de um motivo já
  // usado por denúncias antigas não invalida essas linhas retroativamente,
  // só passa a valer pras denúncias novas a partir daqui.
  @IsOptional()
  @IsIn(TIPOS_MOTIVO_DENUNCIA)
  tipo?: TipoMotivoDenuncia;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
