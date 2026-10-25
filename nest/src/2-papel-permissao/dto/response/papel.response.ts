export class PapelResponse {
  idPapel: number;
  nome: string;
  // Identificador fixo (o nome é renomeável), lido pelas regras de RBAC.
  codigo: string;
  descricao: string | null;
  // Posição nas listas (1 = maior cargo). Só exibição: quem decide o que o papel pode é a matriz Papel x Permissão.
  ordemExibicao: number;
}
