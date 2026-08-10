// Rótulo mostrado quando alguém só tem o papel padrão (ERA "-", 09-08-2026,
// pedido do Lucas: "fica melhor assim") — usado tanto na coluna "papel" de
// ListarUsuarios quanto (indiretamente, via ORDEM_PODER_PAPEL abaixo) no
// filtro por papel da tabela Permissões.
export const PAPEL_SEM_EXTRA = 'usuário';

// Ordem de poder dos papéis, do menor pro maior (09-08-2026, pedido do
// Lucas: filtro por papel deveria ir de "usuário" até "admin", não
// alfabético). Mesma ordem já usada em DevLoginRapido/CONTAS_DEV, só
// invertida (lá é do maior pro menor). id_papel 7=usuario ... 1=admin
// (07_seed_dados.sql [07-B-1]). Extraído aqui (não mais local de
// listar-usuarios.jsx) porque listar-papeis.jsx passou a precisar da
// mesma ordem pro filtro por papel da tabela Permissões — um só lugar de
// verdade evita as duas telas divergirem se a ordem de poder mudar.
export const ORDEM_PODER_PAPEL = [
  PAPEL_SEM_EXTRA,
  'pesquisador',
  'curador',
  'suporte',
  'revisor',
  'moderador',
  'admin',
];
