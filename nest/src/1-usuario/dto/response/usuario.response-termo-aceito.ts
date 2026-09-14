import type { TipoTermo } from '../../../commons/database/db.types';

// Espelha usuario_termo JOIN termos_de_uso (14-09-2026, pedido do Lucas:
// "onde fica registrado" o aceite do Termo de Uso - Consultar Usuário).
// Sem `ipAceite` de propósito, mesma decisão de UsuarioResponseLoginHistorico
// (IP nunca exposto pela API) - o Lucas só pediu "termo aceito e data/hora".
export class UsuarioResponseTermoAceito {
  tipo: TipoTermo;
  versao: string;
  aceitoEm: Date;
}
