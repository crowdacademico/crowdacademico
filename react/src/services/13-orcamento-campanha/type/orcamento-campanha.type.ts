// Espelha nest/src/13-orcamento-campanha/dto/response/orcamento-campanha.response.ts.
// Extraído (23-09-2026) de dentro de bancada-campanha.tsx, onde vivia como
// `interface ItemOrcamento` local, com o shape inferido do próprio uso -
// nenhuma outra tela ainda consumia. Agora espelha o DTO real (inclui
// descricao/ordem/criadoEm, que a bancada não usa hoje, mas que existem
// no backend), pra qualquer tela nova poder importar o tipo completo em
// vez de redeclarar um subconjunto.
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
