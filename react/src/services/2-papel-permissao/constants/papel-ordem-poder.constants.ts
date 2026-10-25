// Rótulo mostrado quando alguém só tem o papel padrão (coluna e filtro "Papel" de Usuários e da T1).
export const PAPEL_SEM_EXTRA = 'usuário';

// O papel que toda conta ganha no cadastro (atribuir_papel_padrao, 08). Reconhecido pelo código, que é fixo: o nome
// pode ser renomeado pelo painel.
export const CODIGO_PAPEL_PADRAO = 'usuario';

interface PapelComOrdem {
  ordemExibicao: number;
}

// Ordem de poder dos papéis, do maior cargo para o menor: papel.ordem_exibicao (01 [01-B]), a mesma em toda tela.
// Nunca o nome (renomeável) nem o id_papel (ordem em que o papel foi criado).
export function compararPorPoder(a: PapelComOrdem, b: PapelComOrdem): number {
  return a.ordemExibicao - b.ordemExibicao;
}

// Opções do filtro "Papel" na ordem de poder, com o rótulo de quem só tem o papel padrão por último.
export function ordemDoFiltroPapel(papeis: readonly (PapelComOrdem & { nome: string })[]): string[] {
  const nomes = [...papeis].sort(compararPorPoder).map((papel) => papel.nome);
  return [...new Set([...nomes, PAPEL_SEM_EXTRA])];
}
