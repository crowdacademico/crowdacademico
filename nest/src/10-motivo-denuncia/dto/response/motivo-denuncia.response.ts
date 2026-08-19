import { TipoMotivoDenuncia } from '../../../commons/database/db.types';

export class MotivoDenunciaResponse {
  idMotivo: number;
  // Único identificador legível do motivo desde 18-08-2026 (`codigo`
  // saiu do catálogo — ver criar-motivo-denuncia.request.dto.ts) — por
  // isso NOT NULL, diferente de antes.
  descricao: string;
  // 'campanha' ou 'perfil' — trg_valida_tipo_motivo_denuncia
  // (05_regras_negocio.sql [05-K-1]) barra em `denuncia` qualquer
  // id_motivo cujo `tipo` não bate com o alvo escolhido.
  tipo: TipoMotivoDenuncia;
  ativo: boolean;
}
