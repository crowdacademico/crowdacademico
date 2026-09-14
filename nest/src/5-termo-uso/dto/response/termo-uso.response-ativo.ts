import type { TipoTermo } from '../../../commons/database/db.types';

export class TermoUsoResponseAtivo {
  idTermo: number;
  tipo: TipoTermo;
  versao: string;
  conteudo: string;
}
