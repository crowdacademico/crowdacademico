// Espelha nest/src/commons/database/db.types.ts (TIPOS_TERMO/TipoTermo): o sistema sempre tem Termos de Uso
// vigentes por momento de aceite (cadastro geral, contribuição a campanha, upgrade de perfil de pesquisador),
// cada um com sua própria versão/histórico independente.
export type TipoTermo = 'cadastro' | 'contribuicao' | 'upgrade_pesquisador';

// Espelha nest/src/5-termo-uso/dto/response/termo-uso.response-ativo.ts.
export interface TermoUsoResponseAtivo {
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

// Espelha nest/src/5-termo-uso/dto/request/termo-uso.request-criar.ts.
export interface TermoUsoRequestCriar {
  tipo: TipoTermo;
  versao: string;
  conteudo: string;
}

// Espelha nest/src/5-termo-uso/dto/request/termo-uso.request-alterar.ts: só `conteudo` (Alterar só é permitido
// enquanto ninguém aceitou a versão ainda, ver TermoUsoServiceAlterar). Sem `tipo` nem `versao` de propósito:
// ambos são imutáveis depois de criada a linha (identidade se escolhe pelo listbox de seleção, só o conteúdo se
// edita).
export interface TermoUsoRequestAlterar {
  conteudo?: string;
}
