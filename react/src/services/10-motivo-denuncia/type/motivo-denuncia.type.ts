// Espelha nest/src/commons/database/db.types.ts (TIPOS_MOTIVO_DENUNCIA).
export type TipoMotivoDenuncia = 'campanha' | 'perfil';

// Espelha nest/src/10-motivo-denuncia/dto/response/motivo-denuncia.response.ts.
export interface MotivoDenunciaResponse {
  idMotivo: number;
  descricao: string;
  tipo: TipoMotivoDenuncia;
  ativo: boolean;
}
