import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TIPOS_MOTIVO_DENUNCIA } from '../../../commons/database/db.types';
import type { TipoMotivoDenuncia } from '../../../commons/database/db.types';

// Sem `codigo`, de propósito — mesma razão de `tipo_link`/`area_
// conhecimento.codigoCnpq`: é a chave estável (UK_MOTIVO_DENUNCIA_CODIGO)
// que identifica o motivo no catálogo (CAMP-001, PERF-004 etc.); editável
// pela API só arriscaria confundir quem já gravou denúncias com este
// id_motivo, sem ganho nenhum (o rótulo visível pro usuário é
// `descricao`, não `codigo`). `descricao`, `tipo` e `ativo` podem mudar
// sem esse risco.
export class AtualizarMotivoDenunciaRequestDto {
  // NULLABLE no banco — omitido = não muda; `null` explícito = limpa;
  // string = novo texto. Mesmo tratamento de `regex` em
  // AtualizarTipoLinkRequestDto (9-tipo-link): `@IsOptional()` do
  // class-validator já trata `null`/`undefined` como "pula os outros
  // validadores".
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string | null;

  // Editável (diferente de `codigo`): não existe trigger no banco que
  // trave a troca de `tipo` depois de criado (só
  // trg_valida_tipo_motivo_denuncia, que valida no INSERT/UPDATE de
  // `denuncia`, não de `motivo_denuncia`) — mudar o `tipo` de um motivo já
  // usado por denúncias antigas não invalida essas linhas retroativamente,
  // só passa a valer pras denúncias novas a partir daqui.
  @IsOptional()
  @IsIn(TIPOS_MOTIVO_DENUNCIA)
  tipo?: TipoMotivoDenuncia;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
