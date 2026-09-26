// Espelham os limites físicos das colunas `codigo VARCHAR(20)` e `nome VARCHAR(100)` de `tipo_link`
// (01_extensoes_enums_tabelas.sql): não é regra de negócio ajustável (por isso não mora em `configuracoes`), é
// o tamanho real das colunas no banco. Compartilhados entre Criar e Alterar; `codigo` só é editável na criação
// (a chave é estável depois, ver alterar-tipo-link.tsx).
export const LIMITE_CODIGO_TIPO_LINK = 20;
export const LIMITE_NOME_TIPO_LINK = 100;
