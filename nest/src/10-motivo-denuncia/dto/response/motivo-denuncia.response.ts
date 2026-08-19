import { TipoMotivoDenuncia } from '../../../commons/database/db.types';

export class MotivoDenunciaResponseDto {
  idMotivo: number;
  // Chave estável (UK_MOTIVO_DENUNCIA_CODIGO), mesmo papel de
  // `tipo_link.codigo` — nunca editável depois de criado, só exibido (ver
  // AtualizarMotivoDenunciaRequestDto).
  codigo: string;
  descricao: string | null;
  // 'campanha' ou 'perfil' — trg_valida_tipo_motivo_denuncia
  // (05_regras_negocio.sql [05-K-1]) barra em `denuncia` qualquer
  // id_motivo cujo `tipo` não bate com o alvo escolhido.
  tipo: TipoMotivoDenuncia;
  ativo: boolean;
}
