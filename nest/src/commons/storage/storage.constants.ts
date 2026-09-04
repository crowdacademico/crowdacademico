// Token de injeção - todo consumidor (25-arquivo, e futuramente qualquer
// outro módulo) usa @Inject(ARMAZENAMENTO_SERVICE) contra a INTERFACE
// ArmazenamentoService, nunca a classe concreta. Mesmo padrão de PG_POOL
// em commons/database/database.constants.ts.
export const ARMAZENAMENTO_SERVICE = 'ARMAZENAMENTO_SERVICE';

// Pastas dentro do bucket - só existem por convenção de nome de chave
// (S3-compatível não tem pastas de verdade), mas são o que permite a regra
// de ciclo de vida do bucket (configurada no painel do B2/R2, não em
// código) apagar sozinha qualquer coisa velha em PASTA_PENDENTE, sem job
// nenhum rodando no lado do Nest. Ver doc de arquitetura, seção "Arquivos
// órfãos: resolver sem escrever código".
export const PASTA_PENDENTE = 'pendente/';
export const PASTA_PUBLICO = 'publico/';

// URL pré-assinada de upload vale por isto - curto o bastante pra não
// sobrar muito tempo de janela de abuso, longo o bastante pra cobrir uma
// conexão lenta de verdade subindo uma imagem de alguns MB.
export const SEGUNDOS_EXPIRACAO_UPLOAD = 300;
