// Rótulo mostrado quando alguém só tem o papel padrão: usado tanto na coluna "papel" de ListarUsuarios quanto
// (indiretamente, via ORDEM_PODER_PAPEL abaixo) no filtro por papel da tabela Permissões.
export const PAPEL_SEM_EXTRA = 'usuário';

// Ordem de poder dos papéis, do menor para o maior (o filtro por papel vai de "usuário" até "admin", não
// alfabético). Mesma ordem de DevLoginRapido/CONTAS_DEV, só invertida (lá é do maior para o menor). id_papel
// 7=usuario ... 1=admin (07_seed_dados.sql [07-B-1]). Um só lugar de verdade (usado por listar-usuarios.tsx e
// listar-papeis.tsx) evita as duas telas divergirem se a ordem de poder mudar.
export const ORDEM_PODER_PAPEL = [
  PAPEL_SEM_EXTRA,
  'pesquisador',
  'curador',
  'suporte',
  'revisor',
  'moderador',
  'admin',
];
