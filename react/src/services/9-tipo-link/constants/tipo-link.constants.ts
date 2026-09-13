// Espelham os limites físicos das colunas `codigo VARCHAR(20)` e
// `nome VARCHAR(100)` de `tipo_link` (01_extensoes_enums_tabelas.sql) -
// não é regra de negócio ajustável (por isso não mora em `configuracoes`),
// é o tamanho real das colunas no banco. Compartilhados entre Criar e
// Alterar (13-09-2026, achado do Claude Web: antes cada um tinha os
// números hardcoded, sem nenhum apontar pra onde vêm) - `codigo` só é
// editável na criação (a chave é estável depois, ver alterar-tipo-link.tsx).
export const LIMITE_CODIGO_TIPO_LINK = 20;
export const LIMITE_NOME_TIPO_LINK = 100;
