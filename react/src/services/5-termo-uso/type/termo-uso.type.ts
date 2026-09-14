// Espelha nest/src/commons/database/db.types.ts (TIPOS_TERMO/TipoTermo) -
// 13-09-2026, pedido do Lucas: o sistema sempre tem 2 Termos de Uso vigentes
// ao mesmo tempo, um por momento de aceite (cadastro geral, contribuição a
// campanha), cada um com sua própria versão/histórico independente.
export type TipoTermo = 'cadastro' | 'contribuicao';

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

// Espelha nest/src/5-termo-uso/dto/request/termo-uso.request-alterar.ts -
// tudo opcional (13-09-2026, Alterar só é permitido enquanto ninguém
// aceitou a versão ainda, ver TermoUsoServiceAlterar). Sem `tipo` de
// propósito - é imutável depois de criada a linha, mesma regra de
// `chave`/`tipo` em Configuração.
export interface TermoUsoRequestAlterar {
  versao?: string;
  conteudo?: string;
}
