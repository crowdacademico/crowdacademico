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
// Array em runtime (não só o tipo) pra CriarConfiguracaoRequestDto validar
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
// de montar o ResponseDto (log-auditoria.converter.ts), mesmo cuidado já
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
}
