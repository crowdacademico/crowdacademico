import { Generated } from 'kysely';

// Tipos do Kysely, escritos à mão espelhando arquivos_banco_dados/01_extensoes_
// enums_tabelas.sql — só as tabelas que os módulos 1/2/3/11 já tocam, não o
// banco inteiro (mesma lógica incremental da numeração de módulos: cresce
// junto, não tudo de uma vez).
//
// NORMALMENTE isso seria gerado por `npm run db:codegen` (kysely-codegen,
// já instalado em devDependencies e configurado em package.json), que
// introspecciona o Postgres de verdade e nunca erra nome de coluna/tipo.
// Não rodei o codegen porque este ambiente (sandbox do Claude Code) não tem
// acesso a um Postgres rodando — só ao código. Assim que rodar localmente
// com o banco de pé, rode `npm run db:codegen` (gera
// src/commons/database/db.types.generated.ts, TODAS as 41 tabelas) e
// confira contra este arquivo; se divergir nas 7 tabelas que aparecem nos
// dois, o gerado manda — este aqui foi escrito de cabeça, o gerado lê o
// catálogo real.
export interface UsuarioTable {
  id_usuario: Generated<number>;
  nome: string;
  email: string;
  senha_hash: string;
  id_imagem_perfil: number | null;
  criado_em: Generated<Date>;
  deletado: Generated<boolean>;
  deletado_em: Date | null;
  deletado_por: number | null;
  email_verificado: Generated<boolean>;
  tentativas_login_falhas: Generated<number>;
  bloqueado_ate: Date | null;
  ultimo_login_em: Date | null;
  ultimo_login_ip: string | null;
  // ADICIONADAS (09-08-2026) — espelham 01_extensoes_enums_tabelas.sql
  // [01-D]. Suspensão de MODERAÇÃO (manual, com motivo) — diferente de
  // `bloqueado_ate` acima (automático, por senha errada).
  suspenso_ate: Date | null;
  motivo_suspensao: string | null;
  suspenso_por: number | null;
}

export interface PapelTable {
  id_papel: Generated<number>;
  nome: string;
  // ADICIONADA (03-08-2026) — espelha 01_extensoes_enums_tabelas.sql [01-B].
  // Estável, nunca editável pela API (diferente de `nome`) — ver comentário
  // completo lá sobre por que existe.
  codigo: string;
}

export interface PermissaoTable {
  id_permissao: Generated<number>;
  nome: string;
}

export interface PapelPermissaoTable {
  id_papel: number;
  id_permissao: number;
}

export interface UsuarioPapelTable {
  id_usuario: number;
  id_papel: number;
  // ADICIONADA (09-08-2026) — espelha 01_extensoes_enums_tabelas.sql
  // [01-B]. NULL = papel valendo normalmente.
  suspenso_ate: Date | null;
}

export interface SessaoTable {
  id_sessao: Generated<number>;
  id_usuario: number;
  refresh_token_hash: string;
  criado_em: Generated<Date>;
  expira_em: Date;
  revogado_em: Date | null;
  ip: string | null;
  user_agent: string | null;
  // 'login' (senha digitada) ou 'refresh' (renovação silenciosa do token de
  // acesso, a cada ~15min de uso) — 07-08-2026, ver auth.service.login.ts.
  origem: Generated<'login' | 'refresh'>;
}

// CREATE TYPE tipo_configuracao AS ENUM ('decimal','inteiro','texto','booleano') — 01
// Array em runtime (não só o tipo) pra ConfiguracaoRequestCreate validar
// com @IsIn(TIPOS_CONFIGURACAO) sem duplicar a lista de novo — um hardcoded
// só, o tipo é derivado dele, não o contrário.
export const TIPOS_CONFIGURACAO = [
  'decimal',
  'inteiro',
  'texto',
  'booleano',
] as const;
export type TipoConfiguracao = (typeof TIPOS_CONFIGURACAO)[number];

export interface ConfiguracoesTable {
  id_config: Generated<number>;
  id_usuario: number | null;
  chave: string;
  valor: string | null;
  tipo: TipoConfiguracao;
  descricao: string | null;
  ativo: Generated<boolean>;
}

// ADICIONADA (03-08-2026) — espelha 01_extensoes_enums_tabelas.sql [01-L].
// `id_log` é `Generated<string>`, não `<number>`: é BIGSERIAL (bigint), e o
// driver `pg` devolve bigint como STRING por padrão (evita perda de
// precisão em valores acima de 2^53) — convertido pra `number` só na hora
// de montar o LogAuditoriaResponse (log-auditoria.converter.ts), mesmo cuidado já
// tomado com `COUNT(*)` em paginacao.util.ts.
export interface LogAuditoriaTable {
  id_log: Generated<string>;
  tabela: string;
  identidade_registro: string;
  operacao: string;
  id_usuario_responsavel: number | null;
  campos_alterados: string[] | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  ocorrido_em: Generated<Date>;
}

// ADICIONADAS (09-08-2026) — espelham 01_extensoes_enums_tabelas.sql, tabelas
// termos_de_uso/usuario_termo, tocadas pela 1ª vez pelo módulo 5-termo-uso
// (Bloco D do prompt do Claude Web sobre cadastro público).
export interface TermosDeUsoTable {
  id_termo: Generated<number>;
  versao: string;
  conteudo: string;
  ativo: Generated<boolean>;
  criado_em: Generated<Date>;
}

export interface UsuarioTermoTable {
  id_usuario_termo: Generated<number>;
  id_usuario: number;
  id_termo: number;
  aceito_em: Generated<Date>;
  ip_aceite: string | null;
}

// ADICIONADA — espelha 01_extensoes_enums_tabelas.sql (tabela
// area_conhecimento), tocada pela 1ª vez pelo módulo 8-area-conhecimento.
// `id_pai` auto-referenciado implementa a hierarquia de 2 níveis (grande
// área -> área) explicada no comentário da própria tabela no SQL; NULL =
// grande área raiz, preenchido = área de nível 2. Mesmo padrão já usado em
// score_config (não modelada aqui ainda, nenhum módulo a toca).
export interface AreaConhecimentoTable {
  id_area_conhecimento: Generated<number>;
  codigo_cnpq: string;
  nome: string;
  id_pai: number | null;
  ativo: Generated<boolean>;
}

// ADICIONADA — espelha 01_extensoes_enums_tabelas.sql (tabela tipo_link),
// tocada pela 1ª vez pelo módulo 9-tipo-link. `codigo` é a chave estável
// lida por calcular_score_perfil_academico() (05_regras_negocio.sql
// [05-I-2]); os 3 `permite_*` são os escopos de uso, com
// CK_TIPO_LINK_ALGUM_ESCOPO garantindo pelo menos um TRUE.
// ATUALIZADO (14-08-2026): `dominio` virou array nativo do Postgres
// (VARCHAR(255)[] — node-postgres/Kysely já devolve isto como `string[]`
// puro, sem parsing manual nenhum). `regex`/`dominio` continuam NULLABLE
// de propósito (decisão revista no dia seguinte: array vazio é truthy em
// JS/TS, então "sem restrição" fica mais seguro como ausência de valor —
// ver comentário completo em 01_extensoes_enums_tabelas.sql [01-B]).
export interface TipoLinkTable {
  id_tipolink: Generated<number>;
  codigo: string;
  nome: string;
  ativo: Generated<boolean>;
  regex: string | null;
  dominio: Generated<string[]>;
  permite_perfil: Generated<boolean>;
  permite_atualizacao: Generated<boolean>;
  permite_recompensa: Generated<boolean>;
}

// CREATE TYPE tipo_motivo_denuncia AS ENUM ('campanha', 'perfil') — 01. Mesmo
// raciocínio de TIPOS_CONFIGURACAO acima: array em runtime pra
// MotivoDenunciaRequestCreate/MotivoDenunciaRequestUpdate validarem
// com @IsIn(TIPOS_MOTIVO_DENUNCIA) sem duplicar a lista, o tipo é derivado
// dele.
export const TIPOS_MOTIVO_DENUNCIA = ['campanha', 'perfil'] as const;
export type TipoMotivoDenuncia = (typeof TIPOS_MOTIVO_DENUNCIA)[number];

// ADICIONADA — espelha 01_extensoes_enums_tabelas.sql (tabela
// motivo_denuncia), tocada pela 1ª vez pelo módulo 10-motivo-denuncia.
// `codigo` é a chave estável (UK_MOTIVO_DENUNCIA_CODIGO) — mesmo padrão de
// `tipo_link.codigo` (ver comentário em [01-B] sobre os 3 pontos do banco
// que passaram a distinguir `codigo`/`nome`); `tipo` decide se o motivo
// serve pra denúncia de campanha ou de perfil — trg_valida_tipo_motivo_
// denuncia (05_regras_negocio.sql [05-K-1]) barra em denuncia.id_motivo
// qualquer motivo cujo `tipo` não bate com o alvo escolhido (id_campanha_
// alvo x id_pesquisador_alvo).
export interface MotivoDenunciaTable {
  id_motivo: Generated<number>;
  // NOT NULL desde 18-08-2026 — `codigo` saiu do catálogo (não era lido
  // por nenhuma trigger/função, diferente de `papel.codigo`/
  // `tipo_link.codigo`) e `descricao` virou o único identificador
  // legível do motivo.
  descricao: string;
  tipo: TipoMotivoDenuncia;
  ativo: Generated<boolean>;
}

// ADICIONADA (22-08-2026) — espelha 01_extensoes_enums_tabelas.sql
// (tabela perfil_pesquisador), tocada pela 1ª vez pelo módulo
// 6-perfil-pesquisador. cpf_criptografado/cpf_hash são STRING aqui (Kysely
// não sabe que um é cifra e o outro é HMAC — isso é responsabilidade de
// commons/seguranca/cpf-cifra.util.ts, nunca do tipo da coluna). Ver
// DOCUMENTACAO_BD.md pro raciocínio completo por trás dos dois.
export const TIPOS_VINCULO = ['institucional', 'independente'] as const;
export type TipoVinculo = (typeof TIPOS_VINCULO)[number];

export const TITULOS_ACADEMICOS = [
  'graduado',
  'especialista',
  'mestre',
  'doutor',
] as const;
export type TituloAcademico = (typeof TITULOS_ACADEMICOS)[number];

export const STATUS_PESQUISADOR = ['ativo', 'suspenso'] as const;
export type StatusPesquisador = (typeof STATUS_PESQUISADOR)[number];

export interface PerfilPesquisadorTable {
  id_usuario: number;
  cpf_criptografado: string;
  cpf_hash: string;
  tipo_vinculo: Generated<TipoVinculo>;
  vinculo_institucional: string | null;
  titulo_academico: TituloAcademico;
  status_pesquisador: Generated<StatusPesquisador>;
  ativado_em: Date | null;
  // Nunca escritos por INSERT/UPDATE direto do service — cache mantido só
  // por trg_perfil_recalcula_score/trg_perfil_update_recalcula_score (05).
  // Selecionados normalmente (fazem parte da resposta pública de perfil),
  // só não fazem parte de nenhum `.values()` de escrita.
  score_atual: Generated<number>;
  score_atualizado_em: Date | null;
}

// ADICIONADA (22-08-2026) — espelha 01_extensoes_enums_tabelas.sql (tabela
// link_academico), tocada pela 1ª vez pelo módulo 7-link-academico.
export interface LinkAcademicoTable {
  id_link_academico: Generated<number>;
  id_usuario: number;
  id_tipolink: number;
  ordem: number | null;
  url: string;
  rotulo: string | null;
}

// ADICIONADAS (22-08-2026) — espelham 01_extensoes_enums_tabelas.sql (bloco
// [01-I] SCORE), lidas (nunca escritas diretamente) pelo módulo
// 6-perfil-pesquisador na consulta de score/dimensões — quem ESCREVE são as
// funções de 05_regras_negocio.sql (recalcular_score_pesquisador() e as 4
// funções de dimensão), nunca o Nest.
export interface ScoreConfigTable {
  id_score_config: Generated<number>;
  nome: string;
  descricao: string | null;
  peso: string; // DECIMAL(5,2) — node-postgres devolve DECIMAL como string, mesmo cuidado de LogAuditoriaTable.id_log com BIGSERIAL
  id_pai: number | null;
  ativo: Generated<boolean>;
  criado_em: Generated<Date>;
  atualizado_em: Generated<Date>;
}

export interface ScoreRotuloTable {
  id_rotulo: Generated<number>;
  rotulo: string;
  descricao: string | null;
  score_minimo: number;
  score_maximo: number;
  ativo: Generated<boolean>;
  criado_em: Generated<Date>;
  atualizado_em: Generated<Date>;
}

export interface ScorePesquisadorTable {
  id_score_pesq: Generated<number>;
  id_usuario: number;
  id_score_config: number;
  id_rotulo: number | null;
  pontos_obtidos: number;
  score_total: number | null;
  calculado_em: Generated<Date>;
  motivo: string | null;
}

// ADICIONADAS (22-08-2026) — espelham 01_extensoes_enums_tabelas.sql
// [01-E] CAMPANHA, tocadas pela 1ª vez pelos módulos 12-campanha,
// 13-orcamento-campanha, 14-marco-cronograma, 15-atualizacao-campanha,
// 16-seguir-campanha, 17-comentario, 18-recompensa. Campos DECIMAL (meta_
// financeira, valor_bruto_arrecadado, taxa_plataforma, valor, valor_minimo)
// são `string` aqui, nunca `number` — mesmo cuidado já registrado em
// ScoreConfigTable.peso (node-postgres devolve DECIMAL como string pra não
// perder precisão); convertidos pra number só no converter de cada módulo.
export const MODELOS_CAMPANHA = ['all-or-nothing', 'flexivel'] as const;
export type ModeloCampanha = (typeof MODELOS_CAMPANHA)[number];

export const STATUS_CAMPANHA = [
  'aguardando_aprovacao',
  'ativo',
  'sucesso',
  'nao_atingido',
  'rejeitado',
  'encerrado',
  'encerrado_moderacao',
] as const;
export type StatusCampanha = (typeof STATUS_CAMPANHA)[number];

export const FASES_ATUALIZACAO = [
  'andamento',
  'resultado_preliminar',
  'resultado_final',
] as const;
export type FaseAtualizacao = (typeof FASES_ATUALIZACAO)[number];

export const TIPOS_ATUALIZACAO = [
  'texto',
  'imagem',
  'pdf',
  'linkexterno',
] as const;
export type TipoAtualizacao = (typeof TIPOS_ATUALIZACAO)[number];

export const TIPOS_RECOMPENSA = [
  'digital',
  'reconhecimento',
  'acesso_antecipado',
] as const;
export type TipoRecompensa = (typeof TIPOS_RECOMPENSA)[number];

export interface CampanhaTable {
  id_campanha: Generated<number>;
  id_usuario: number;
  id_admin: number | null;
  id_area_conhecimento: number;
  titulo: string;
  modelo: Generated<ModeloCampanha>;
  meta_financeira: string;
  valor_bruto_arrecadado: Generated<string>;
  taxa_plataforma: string | null;
  descricao: string | null;
  data_inicio: Date | null;
  data_fim: Date | null;
  status: Generated<StatusCampanha>;
  aprovado_em: Date | null;
  encerrado_em: Date | null;
  video_apresentacao_url: string | null;
  criado_em: Generated<Date>;
}

// Só o INSERT é usado por enquanto (CampanhaServiceRejeitar, 12-campanha)
// — não tem módulo/pasta própria ainda (21-historico-rejeicao segue vazia,
// ver ordem de prioridade combinada), mas o texto de justificativa da
// rejeição só existe aqui, então o endpoint de rejeitar campanha precisa
// gravar aqui mesmo sem o resto do CRUD (findall/findone) existir ainda.
export interface HistoricoRejeicaoTable {
  id_rejeicao: Generated<number>;
  id_campanha: number;
  id_admin: number | null;
  justificativa: string | null;
  rejeitado_em: Generated<Date>;
}

export interface SeguirCampanhaTable {
  id_seg_campanha: Generated<number>;
  id_usuario: number;
  id_campanha: number;
  seguido_em: Generated<Date>;
}

export interface AtualizacaoCampanhaTable {
  id_atualizacao: Generated<number>;
  id_campanha: number;
  titulo: string;
  conteudo: string;
  publicado_em: Generated<Date>;
  fase: FaseAtualizacao | null;
  tipo: TipoAtualizacao | null;
  ativo: Generated<boolean>;
}

export interface OrcamentoCampanhaTable {
  id_orcamento: Generated<number>;
  id_campanha: number;
  categoria: string;
  descricao: string | null;
  valor: string;
  ordem: Generated<number>;
  criado_em: Generated<Date>;
}

export interface MarcoCronogramaTable {
  id_marco: Generated<number>;
  id_campanha: number;
  titulo: string;
  descricao: string | null;
  data_prevista: Date;
  ordem: Generated<number>;
  criado_em: Generated<Date>;
}

export interface ComentarioTable {
  id_comentario: Generated<number>;
  id_campanha: number;
  id_pesquisador: number | null;
  conteudo: string;
  endossado: Generated<boolean>;
  criado_em: Generated<Date>;
  ordem_endosso: number | null;
  ativo: Generated<boolean>;
}

export interface RecompensaTable {
  id_recompensa: Generated<number>;
  id_campanha: number;
  titulo: string;
  descricao: string | null;
  valor_minimo: string;
  quantidade_disponivel: number | null;
  tipo: TipoRecompensa;
  ativo: Generated<boolean>;
  criado_em: Generated<Date>;
}

// Satélites de atualizacao_campanha/recompensa (01-F/01-G) — dobrados
// dentro dos módulos 15-atualizacao-campanha/18-recompensa (22-08-2026,
// decisão registrada em PROXIMOS_MODULOS.md: nenhuma das 4 tem pasta
// numerada própria, o roteiro não as lista como módulo individual).
export interface LinkAtualizacaoTable {
  id_link_atualizacao: Generated<number>;
  id_atualizacao: number;
  id_tipolink: number;
  ordem: number | null;
  url: string;
}

export interface LinkRecompensaTable {
  id_link_recompensa: Generated<number>;
  id_recompensa: number;
  id_tipolink: number;
  ordem: number | null;
  url: string;
}

// id_arquivo aqui referencia uma linha que, hoje, só o módulo 25-arquivo
// (Alexia, ainda não pronto) pode criar de verdade — os endpoints de
// vínculo abaixo já funcionam (INSERT/UPDATE da tabela de associação em
// si), só não há como testar de ponta a ponta até esse módulo existir.
export interface ArquivoAtualizacaoTable {
  id_arq_atu: Generated<number>;
  id_arquivo: number;
  id_atualizacao: number;
}

export interface ArquivoRecompensaTable {
  id_arq_recompensa: Generated<number>;
  id_recompensa: number;
  id_arquivo: number;
  ordem: number | null;
  principal: Generated<boolean>;
}

export interface VerificacaoEmailTable {
  id_verificacao: Generated<number>;
  id_usuario: number;
  // Apesar do nome da coluna, NÃO é bcrypt (que teria salt aleatório por
  // linha — impossível de achar por igualdade direta). É um hash
  // determinístico (SHA-256) do token em texto puro que só existe no link
  // enviado — confirmar_email_por_token() (03_funcoes_seguranca.sql,
  // [03-O]) faz `WHERE token_hash = p_token_hash`, igualdade simples, só
  // funciona com hash determinístico.
  token_hash: string;
  criado_em: Generated<Date>;
  expira_em: Date;
  confirmado_em: Date | null;
}

export interface DB {
  usuario: UsuarioTable;
  papel: PapelTable;
  permissao: PermissaoTable;
  papel_permissao: PapelPermissaoTable;
  usuario_papel: UsuarioPapelTable;
  sessao: SessaoTable;
  configuracoes: ConfiguracoesTable;
  log_auditoria: LogAuditoriaTable;
  termos_de_uso: TermosDeUsoTable;
  usuario_termo: UsuarioTermoTable;
  verificacao_email: VerificacaoEmailTable;
  area_conhecimento: AreaConhecimentoTable;
  tipo_link: TipoLinkTable;
  motivo_denuncia: MotivoDenunciaTable;
  perfil_pesquisador: PerfilPesquisadorTable;
  link_academico: LinkAcademicoTable;
  score_config: ScoreConfigTable;
  score_rotulo: ScoreRotuloTable;
  score_pesquisador: ScorePesquisadorTable;
  campanha: CampanhaTable;
  historico_rejeicao: HistoricoRejeicaoTable;
  seguir_campanha: SeguirCampanhaTable;
  atualizacao_campanha: AtualizacaoCampanhaTable;
  orcamento_campanha: OrcamentoCampanhaTable;
  marco_cronograma: MarcoCronogramaTable;
  comentario: ComentarioTable;
  recompensa: RecompensaTable;
  link_atualizacao: LinkAtualizacaoTable;
  link_recompensa: LinkRecompensaTable;
  arquivo_atualizacao: ArquivoAtualizacaoTable;
  arquivo_recompensa: ArquivoRecompensaTable;
}
