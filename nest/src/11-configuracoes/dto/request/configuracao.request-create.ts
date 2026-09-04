import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { TIPOS_CONFIGURACAO } from '../../../commons/database/db.types';
import type { TipoConfiguracao } from '../../../commons/database/db.types';

export class ConfiguracaoRequestCreate {
  @IsString()
  chave: string;

  @IsOptional()
  @IsString()
  valor?: string;

  @IsIn(TIPOS_CONFIGURACAO, {
    message: `tipo precisa ser um de: ${TIPOS_CONFIGURACAO.join(', ')}`,
  })
  tipo: TipoConfiguracao;

  @IsOptional()
  @IsString()
  descricao?: string;

  // true = linha global do sistema (id_usuario NULL, exige a permissão
  // 'configuracao_gerenciar'); false/ausente = preferência pessoal do
  // próprio usuário logado (id_usuario = ele mesmo). Nunca aceita um
  // id_usuario vindo do cliente - o service decide isso sozinho a partir de
  // quem está logado, senão dava pra criar config "pessoal" em nome de outro.
  @IsOptional()
  @IsBoolean()
  global?: boolean;
}
