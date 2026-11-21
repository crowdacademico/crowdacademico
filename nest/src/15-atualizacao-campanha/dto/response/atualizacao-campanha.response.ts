import type {
  FaseAtualizacao,
  TipoAtualizacao,
} from '../../../commons/database/db.types';
import { AnexoAtualizacaoResponse } from './anexo-atualizacao.response';

export class AtualizacaoCampanhaResponse {
  idAtualizacao: number;
  idCampanha: number;
  titulo: string;
  conteudo: string;
  publicadoEm: Date;
  fase: FaseAtualizacao;
  tipo: TipoAtualizacao;
  ativo: boolean;
  // Oculta pela moderação (o dono não mostra de novo). false com ativo false: o próprio dono ocultou.
  ocultadaModeracao: boolean;
  // Por que a moderação excluiu (fn_atualizacao_ocultacao, 05); null quando não foi a moderação ou é anterior a 21-11-2026.
  motivoModeracao: string | null;
  anexos: AnexoAtualizacaoResponse[];
}

// Na lista da moderação, com o título da campanha (null = a campanha não está visível para quem pediu).
export class AtualizacaoModeracaoResponse extends AtualizacaoCampanhaResponse {
  tituloCampanha: string | null;
}
