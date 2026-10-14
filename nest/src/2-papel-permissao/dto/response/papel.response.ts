export class PapelResponse {
  idPapel: number;
  nome: string;
  // Identificador fixo (o nome é renomeável), lido pelas regras de RBAC.
  codigo: string;
  descricao: string | null;
}
