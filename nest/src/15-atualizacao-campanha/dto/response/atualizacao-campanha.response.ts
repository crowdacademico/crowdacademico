import type {
  FaseAtualizacao,
  TipoAtualizacao,
} from '../../../commons/database/db.types';

export class AtualizacaoCampanhaResponse {
  idAtualizacao: number;
  idCampanha: number;
  titulo: string;
  conteudo: string;
  publicadoEm: Date;
  fase: FaseAtualizacao | null;
  tipo: TipoAtualizacao | null;
  ativo: boolean;
}
