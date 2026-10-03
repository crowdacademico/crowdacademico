import type { FaseAtualizacao, TipoAtualizacao } from '../../constant/type/enums-do-banco.gerado';

// Espelha AtualizacaoCampanhaResponse (nest/src/15-atualizacao-campanha/dto/response).
export interface AtualizacaoCampanhaResponse {
  idAtualizacao: number;
  idCampanha: number;
  titulo: string;
  conteudo: string;
  publicadoEm: string;
  fase: FaseAtualizacao;
  tipo: TipoAtualizacao;
  ativo: boolean;
}

export interface AtualizacaoCampanhaRequestCreate {
  idCampanha: number;
  titulo: string;
  conteudo: string;
  fase: FaseAtualizacao;
  tipo: TipoAtualizacao;
}
