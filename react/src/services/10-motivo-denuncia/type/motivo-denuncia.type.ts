// Valores do ENUM tipo_motivo_denuncia, vindos do banco (enums-do-banco.gerado.ts).
import type { TipoMotivoDenuncia } from '../../constant/type/enums-do-banco.gerado';
export type { TipoMotivoDenuncia };

// Espelha nest/src/10-motivo-denuncia/dto/response/motivo-denuncia.response.ts.
export interface MotivoDenunciaResponse {
  idMotivo: number;
  descricao: string;
  tipo: TipoMotivoDenuncia;
  ativo: boolean;
}

// Espelha motivo-denuncia.request-create.ts.
export interface MotivoDenunciaRequestCreate {
  descricao: string;
  tipo: TipoMotivoDenuncia;
  ativo?: boolean;
}

// Espelha motivo-denuncia.request-update.ts.
export interface MotivoDenunciaRequestUpdate {
  descricao?: string;
  tipo?: TipoMotivoDenuncia;
  ativo?: boolean;
}
