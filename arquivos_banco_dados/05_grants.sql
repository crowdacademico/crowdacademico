-- ============================================================
--  CrowdAcadêmico — 05: GRANTS (PERMISSÕES DE SCHEMA/TABELA/FUNÇÃO)
--  Depende de: 01_extensoes_enums_tabelas.sql, 04_rls_policies.sql
--  Próximo arquivo: 06_score_engine_triggers.sql
--
--  NOTA DE REORGANIZAÇÃO: este arquivo consolida GRANTs que antes
--  estavam espalhados em dois lugares diferentes:
--   - o bloco principal (schema/tabelas/colunas) vinha de artificios.sql
--   - o GRANT nas sequências vinha do fim do arquivo de seed (DML),
--     como um "fix" avulso — provavelmente porque o erro 42501 só
--     apareceu depois que alguém rodou o INSERT e esbarrou na falta
--     de USAGE na sequência. Ficando aqui junto dos outros GRANTs,
--     não corre mais o risco de ser esquecido em um outro seed.
--   - o GRANT EXECUTE nas funções de score vinha do fim de artificios.sql
-- ============================================================

-- ============================================================
-- ROLE DO BACKEND (NestJS)
-- ============================================================
-- CORRIGIDO: o projeto usava os roles "anon"/"authenticated" do
-- modelo Supabase/PostgREST (o cliente conectava direto no Postgres
-- e o Postgres decidia o role pela presença de JWT). Sem o Supabase
-- Auth/PostgREST no meio, quem conecta no banco é só o NestJS, com
-- uma única credencial de aplicação — a distinção anon/authenticated
-- deixou de fazer sentido como role de conexão. A partir de agora,
-- todo GRANT e toda policy usam um único role "app_nestjs"; a
-- diferença entre "visitante" e "usuário logado" é resolvida dentro
-- das próprias policies via id_usuario_atual() (que retorna NULL
-- quando o NestJS não fez o SET LOCAL, i.e. requisição sem sessão).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_nestjs') THEN
        CREATE ROLE app_nestjs LOGIN PASSWORD 'TROCAR_NO_AMBIENTE_REAL';
    END IF;
END
$$;
-- NOTA: a senha acima é só placeholder para o CREATE ROLE não falhar
-- em ambiente novo. Em produção/homologação, a senha real deve vir de
-- variável de ambiente/secret manager e ser trocada com ALTER ROLE,
-- nunca ficar em texto puro neste arquivo versionado.

-- ============================================================
-- GRANTS E PROTEÇÃO DE COLUNAS
-- ============================================================
GRANT USAGE ON SCHEMA public TO app_nestjs;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_nestjs;

REVOKE SELECT ON public.usuario FROM app_nestjs;
-- ALTERADO: coluna id_supabase removida da tabela usuario (autenticação própria).
GRANT SELECT (id_usuario, nome, email, id_imagem_perfil, criado_em, deletado)
    ON public.usuario TO app_nestjs;

GRANT INSERT, UPDATE, DELETE ON
    usuario, perfil_pesquisador, campanha, contribuicao, comentario, denuncia,
    seguir_campanha, seguir_pesquisador, link_academico, configuracoes,
    score_config, score_rotulo, historico_rejeicao, atualizacao_campanha,
    arquivo, arquivo_atualizacao, solicitacao_encerramento, usuario_papel,
    termos_de_uso, usuario_termo, aceite_termo_contribuicao, recompensa, arquivo_recompensa,
    contribuicao_recompensa, link_atualizacao, link_recompensa
TO app_nestjs;

-- NOTA: "notificacao" fica de fora desta lista de propósito. Ela só
-- tem política de SELECT (arquivo 04) — quem grava nela é o próprio
-- backend através de código de aplicação que roda fora do contexto
-- de request do usuário (job/worker), então liberar INSERT/UPDATE
-- aqui só adicionaria uma permissão morta do ponto de vista de RLS.

-- CORRIGIDO: verificacao_email, recuperacao_senha e sessao agora têm
-- policy real em 04 (TO app_nestjs USING true) — precisam do GRANT
-- correspondente, senão RLS libera mas falta permissão de tabela e
-- vice-versa (os dois níveis são exigidos juntos pelo Postgres).
GRANT SELECT, INSERT, UPDATE ON verificacao_email, recuperacao_senha, sessao TO app_nestjs;

-- ------------------------------------------------------------
-- GRANT nas sequências (movido do arquivo de seed / DML)
-- Sem isso, GRANT INSERT sozinho não é suficiente: o Postgres
-- não consegue gerar o próximo valor de uma coluna SERIAL/IDENTITY
-- sem USAGE na sequência por trás dela (erro 42501).
-- Afeta toda tabela com GRANT INSERT acima (campanha, contribuicao,
-- comentario, denuncia, seguir_campanha, seguir_pesquisador,
-- link_academico etc.) — resolvido de uma vez para todas.
-- ------------------------------------------------------------
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_nestjs;

-- ------------------------------------------------------------
-- GRANT EXECUTE nas funções do motor de score (movido do fim de
-- artificios.sql). O app chama recalcular_todos_os_scores() via RPC
-- (botão "Recalcular" no Painel Admin).
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.recalcular_todos_os_scores()     TO app_nestjs;

-- NOTA: o GRANT EXECUTE de atribuir_papel_padrao() fica junto da
-- própria função em 08_trigger_signup_usuario.sql, não aqui — esse
-- arquivo roda ANTES do 08 (ver ordem de dependência no cabeçalho),
-- e a função ainda não existiria neste ponto da execução.