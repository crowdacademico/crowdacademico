// Valores do ENUM tipo_configuracao, vindos do banco (enums-do-banco.gerado.ts).
import type { TipoConfiguracao } from '../../constant/type/enums-do-banco.gerado';
export type { TipoConfiguracao };

// Espelha nest/src/11-configuracoes/dto/response/configuracoes.response.ts.
export interface ConfiguracoesResponse {
  idConfig: number;
  idUsuario: number | null;
  chave: string;
  valor: string | null;
  tipo: TipoConfiguracao;
  descricao: string | null;
  ativo: boolean;
  publica: boolean;
}

// Espelha configuracoes.request-update.ts.
export interface ConfiguracoesRequestUpdate {
  valor?: string;
  descricao?: string;
  ativo?: boolean;
  publica?: boolean;
}
