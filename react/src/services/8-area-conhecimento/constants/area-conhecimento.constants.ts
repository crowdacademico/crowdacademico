// Espelha o limite físico da coluna `nome VARCHAR(100)` de `area_conhecimento`
// (01_extensoes_enums_tabelas.sql): não é regra de negócio ajustável (por isso não mora em `configuracoes`), é
// o tamanho real da coluna no banco. Compartilhado entre Criar e Alterar: se a coluna crescer um dia, corrige
// aqui e os dois formulários acompanham juntos.
export const LIMITE_NOME_AREA_CONHECIMENTO = 100;
