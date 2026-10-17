// Um repasse de campanha do próprio pesquisador, como ele vê em Minha Conta > Acadêmico.
export class RepasseResponse {
  idRepasse: number;
  idCampanha: number;
  tituloCampanha: string;
  // O arrecadado que entrou no repasse e o que vai para o pesquisador (menos a taxa da plataforma).
  valorBruto: number;
  valorLiquido: number;
  taxaPlataforma: number | null;
  status: string;
  // Quando a transferência caiu (null enquanto não concluiu).
  repassadoEm: Date | null;
}
