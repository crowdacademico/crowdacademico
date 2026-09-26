// Espelha nest/src/13-orcamento-campanha/dto/response/orcamento-campanha.response.ts, o DTO real completo
// (inclui descricao/ordem/criadoEm, que a bancada não usa hoje, mas existem no backend), para qualquer tela
// nova poder importar o tipo completo em vez de redeclarar um subconjunto.
export interface OrcamentoCampanhaResponse {
  idOrcamento: number;
  idCampanha: number;
  categoria: string;
  descricao: string | null;
  valor: number;
  ordem: number;
  criadoEm: string;
}

export interface OrcamentoCampanhaRequestCreate {
  idCampanha: number;
  categoria: string;
  descricao?: string;
  valor: number;
  ordem?: number;
}

// Sem idCampanha - mover um item de orçamento pra outra campanha não faz
// sentido de produto (mesmo raciocínio do backend).
export interface OrcamentoCampanhaRequestUpdate {
  categoria: string;
  descricao?: string;
  valor: number;
  ordem?: number;
}
