import { TipoConfiguracao } from '../../../commons/database/db.types';

export class ConfiguracaoResponse {
  idConfig: number;
  idUsuario: number | null;
  chave: string;
  valor: string | null;
  tipo: TipoConfiguracao;
  descricao: string | null;
  ativo: boolean;
  // Controla se a linha (quando global) aparece para quem não tem `configuracao_gerenciar`.
  publica: boolean;
}
