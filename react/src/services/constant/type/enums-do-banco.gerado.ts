// ARQUIVO GERADO AUTOMATICAMENTE. Não edite à mão: rode `npm run gerar:enums` dentro de react/.
// Origem: nest/src/commons/database/db.types.generated.ts, gerado a partir do banco (ver react/scripts/gerar-enums-do-banco.mjs).
// Cada lista é um ENUM do banco, em ordem alfabética; a ordem de exibição e os rótulos ficam nos arquivos de
// constantes de cada módulo.

export const FASE_ATUALIZACAO = ['andamento', 'resultado_final', 'resultado_preliminar'] as const;
export type FaseAtualizacao = (typeof FASE_ATUALIZACAO)[number];

export const MEIO_PAGAMENTO = ['boleto', 'cartao_credito', 'cartao_debito', 'pix'] as const;
export type MeioPagamento = (typeof MEIO_PAGAMENTO)[number];

export const MODELO_CAMPANHA = ['all-or-nothing', 'flexivel'] as const;
export type ModeloCampanha = (typeof MODELO_CAMPANHA)[number];

export const STATUS_CAMPANHA = ['aguardando_aprovacao', 'ativo', 'encerrado', 'encerrado_moderacao', 'nao_atingido', 'rascunho', 'rejeitado', 'sucesso'] as const;
export type StatusCampanha = (typeof STATUS_CAMPANHA)[number];

export const STATUS_CONTESTACAO = ['aceita', 'pendente', 'recusada'] as const;
export type StatusContestacao = (typeof STATUS_CONTESTACAO)[number];

export const STATUS_CONTRIBUICAO = ['a_devolver', 'confirmado', 'devolvido', 'erro', 'expirado', 'pendente', 'reembolsado', 'reembolso_manual', 'repassado'] as const;
export type StatusContribuicao = (typeof STATUS_CONTRIBUICAO)[number];

export const STATUS_DENUNCIA = ['em_analise', 'improcedente', 'pendente', 'resolvida'] as const;
export type StatusDenuncia = (typeof STATUS_DENUNCIA)[number];

export const STATUS_ENCERRAMENTO = ['aprovado', 'cancelado', 'pendente', 'rejeitado'] as const;
export type StatusEncerramento = (typeof STATUS_ENCERRAMENTO)[number];

export const STATUS_NOTIFICACAO = ['cancelado', 'enviado', 'falhou', 'pendente'] as const;
export type StatusNotificacao = (typeof STATUS_NOTIFICACAO)[number];

export const STATUS_PESQUISADOR = ['ativo', 'suspenso'] as const;
export type StatusPesquisador = (typeof STATUS_PESQUISADOR)[number];

export const TIPO_ATUALIZACAO = ['imagem', 'linkexterno', 'pdf', 'texto'] as const;
export type TipoAtualizacao = (typeof TIPO_ATUALIZACAO)[number];

export const TIPO_CONFIGURACAO = ['booleano', 'decimal', 'inteiro', 'texto'] as const;
export type TipoConfiguracao = (typeof TIPO_CONFIGURACAO)[number];

export const TIPO_MOTIVO_DENUNCIA = ['campanha', 'perfil'] as const;
export type TipoMotivoDenuncia = (typeof TIPO_MOTIVO_DENUNCIA)[number];

export const TIPO_RECOMPENSA = ['acesso_antecipado', 'digital', 'reconhecimento'] as const;
export type TipoRecompensa = (typeof TIPO_RECOMPENSA)[number];

export const TIPO_TERMO = ['cadastro', 'upgrade_pesquisador'] as const;
export type TipoTermo = (typeof TIPO_TERMO)[number];

export const TIPO_VINCULO = ['independente', 'institucional'] as const;
export type TipoVinculo = (typeof TIPO_VINCULO)[number];

export const TITULO_ACADEMICO = ['doutor', 'especialista', 'graduado', 'mestre'] as const;
export type TituloAcademico = (typeof TITULO_ACADEMICO)[number];
