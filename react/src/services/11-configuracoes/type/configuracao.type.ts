// Espelha nest/src/commons/database/db.types.ts (TIPOS_CONFIGURACAO).
export type TipoConfiguracao = 'decimal' | 'inteiro' | 'texto' | 'booleano';

// Espelha nest/src/11-configuracoes/dto/response/configuracao.response.ts.
export interface ConfiguracaoResponse {
  idConfig: number;
  idUsuario: number | null;
  chave: string;
  valor: string | null;
  tipo: TipoConfiguracao;
  descricao: string | null;
  ativo: boolean;
  publica: boolean;
}
