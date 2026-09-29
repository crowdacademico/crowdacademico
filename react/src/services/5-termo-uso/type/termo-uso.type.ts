// Valores do ENUM tipo_termo, vindos do banco (enums-do-banco.gerado.ts): o termo da conta ('cadastro', que cobre
// também as contribuições) e o de pesquisador, cada um com sua própria versão/histórico independente.
import type { TipoTermo } from '../../constant/type/enums-do-banco.gerado';
export type { TipoTermo };

// Espelha nest/src/5-termo-uso/dto/response/termo-uso.response-active.ts.
export interface TermoUsoResponseActive {
  idTermo: number;
  tipo: TipoTermo;
  versao: string;
  conteudo: string;
}

// Espelha nest/src/5-termo-uso/dto/response/termo-uso.response.ts - formato
// completo (histórico incluso), pra tela de administração.
export interface TermoUsoResponse {
  idTermo: number;
  tipo: TipoTermo;
  versao: string;
  conteudo: string;
  ativo: boolean;
  criadoEm: string;
}

// Espelha nest/src/5-termo-uso/dto/request/termo-uso.request-create.ts.
export interface TermoUsoRequestCreate {
  tipo: TipoTermo;
  versao: string;
  conteudo: string;
}

// Espelha nest/src/5-termo-uso/dto/request/termo-uso.request-update.ts: só `conteudo` (Alterar só é permitido
// enquanto ninguém aceitou a versão ainda, ver TermoUsoServiceUpdate). Sem `tipo` nem `versao` de propósito:
// ambos são imutáveis depois de criada a linha (identidade se escolhe pelo listbox de seleção, só o conteúdo se
// edita).
export interface TermoUsoRequestUpdate {
  conteudo?: string;
}
