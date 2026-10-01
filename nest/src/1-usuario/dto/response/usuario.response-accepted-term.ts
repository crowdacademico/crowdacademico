import type { TipoTermo } from '../../../commons/database/db.types';

// Espelha usuario_termo JOIN termos_de_uso (Consultar Usuário: "termo aceito e data/hora"). Sem `ipAceite`, de
// propósito, mesma decisão de UsuarioResponseLoginHistory (IP nunca exposto pela API).
export class UsuarioResponseAcceptedTerm {
  idTermo: number;
  tipo: TipoTermo;
  versao: string;
  aceitoEm: Date;
}
