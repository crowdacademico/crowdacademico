// Registros REAIS que já nascem com uma "demo" inteira montada em 07_seed_dados.sql: pesquisadores 12-22 (campanha,
// score e links pré-calculados) e as campanhas 1-10 (orçamento, cronograma, comentário e transação já seedados).
// Não são protegidos: a faceta "Origem" do T1 e do T2 abre marcada em "teste" e os esconde, para não serem
// alterados por engano.
export const ORIGEM_TESTE = 'teste';

export function origemUsuario(idUsuario: number): string {
  return idUsuario >= 12 && idUsuario <= 22 ? 'demonstração' : ORIGEM_TESTE;
}

export function origemCampanha(idCampanha: number): string {
  return idCampanha <= 10 ? 'demonstração' : ORIGEM_TESTE;
}
