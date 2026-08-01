import { TipoConfiguracao } from '../../../commons/database/db.types';

export class CriarConfiguracaoRequestDto {
  chave: string;
  valor?: string;
  tipo: TipoConfiguracao;
  descricao?: string;
  // true = linha global do sistema (id_usuario NULL, exige a permissão
  // 'configuracao_gerenciar'); false/ausente = preferência pessoal do
  // próprio usuário logado (id_usuario = ele mesmo). Nunca aceita um
  // id_usuario vindo do cliente — o service decide isso sozinho a partir de
  // quem está logado, senão dava pra criar config "pessoal" em nome de outro.
  global?: boolean;
}
