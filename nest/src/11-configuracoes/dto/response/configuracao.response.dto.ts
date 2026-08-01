import { TipoConfiguracao } from '../../../commons/database/db.types';

export class ConfiguracaoResponseDto {
  idConfig: number;
  idUsuario: number | null;
  chave: string;
  valor: string | null;
  tipo: TipoConfiguracao;
  descricao: string | null;
  ativo: boolean;
}
