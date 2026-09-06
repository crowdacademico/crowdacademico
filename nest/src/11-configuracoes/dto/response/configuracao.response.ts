import { TipoConfiguracao } from '../../../commons/database/db.types';

export class ConfiguracaoResponse {
  idConfig: number;
  idUsuario: number | null;
  chave: string;
  valor: string | null;
  tipo: TipoConfiguracao;
  descricao: string | null;
  ativo: boolean;
  // ADICIONADO (05-09-2026, item 5 de PENDENCIAS) - controla se a linha
  // (quando global) aparece pra quem não tem `configuracao_gerenciar`.
  publica: boolean;
}
