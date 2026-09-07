// Espelha nest/src/commons/database/db.types.ts (TIPOS_MOTIVO_DENUNCIA).
export type TipoMotivoDenuncia = 'campanha' | 'perfil';

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
