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

// ADICIONADA (03-08-2026) — espelha 01_extensoes_enums_tabelas.sql [01-J].
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

export interface DB {
  usuario: UsuarioTable;
  papel: PapelTable;
  permissao: PermissaoTable;
  papel_permissao: PapelPermissaoTable;
  usuario_papel: UsuarioPapelTable;
  sessao: SessaoTable;
  configuracoes: ConfiguracoesTable;
  log_auditoria: LogAuditoriaTable;
}
