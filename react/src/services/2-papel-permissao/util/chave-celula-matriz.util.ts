// Chave de uma célula da matriz Papel × Permissão ("idPapel-idPermissao"): identifica a combinação no conjunto
// de concessões e a célula em andamento (components/crud/tabelas/6-tabela-papel-permissao.tsx).
export const chaveCelula = (idPapel: number, idPermissao: number) => `${idPapel}-${idPermissao}`;
