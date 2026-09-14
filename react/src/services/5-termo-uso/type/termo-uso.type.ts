// Espelha nest/src/commons/database/db.types.ts (TIPOS_TERMO/TipoTermo) -
// 13-09-2026, pedido do Lucas: o sistema sempre tem Termos de Uso vigentes
// por momento de aceite (cadastro geral, contribuição a campanha, upgrade
// de perfil de pesquisador - este último adicionado na mesma data, rodada
// seguinte), cada um com sua própria versão/histórico independente.
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

// Espelha nest/src/5-termo-uso/dto/request/termo-uso.request-alterar.ts - só
// `conteudo` (13-09-2026, Alterar só é permitido enquanto ninguém aceitou a
// versão ainda, ver TermoUsoServiceAlterar). Sem `tipo` nem `versao` de
// propósito - ambos são imutáveis depois de criada a linha (achado do
// Lucas: 2 caixas de texto mostrando a mesma versão - o listbox de seleção
// e um campo "Versão" editável - não fazia sentido; identidade se escolhe
// pelo listbox, só o conteúdo se edita).
export interface TermoUsoRequestAlterar {
  conteudo?: string;
}
