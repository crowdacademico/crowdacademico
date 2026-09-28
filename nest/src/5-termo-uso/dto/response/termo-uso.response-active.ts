import type { TipoTermo } from '../../../commons/database/db.types';

export class TermoUsoResponseActive {
  idTermo: number;
  tipo: TipoTermo;
  versao: string;
  conteudo: string;
}
