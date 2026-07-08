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
-- GRANTS E PROTEÇÃO DE COLUNAS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

REVOKE SELECT ON public.usuario FROM anon, authenticated;
-- CORRIGIDO: coluna de cadastro corrigida para criado_em.
GRANT SELECT (id_usuario, nome, email, id_imagem_perfil, criado_em, deletado, id_supabase)
    ON public.usuario TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON
    usuario, perfil_pesquisador, campanha, contribuicao, comentario, denuncia,
    seguir_campanha, seguir_pesquisador, link_academico, configuracoes,
    score_config, score_rotulo, historico_rejeicao, atualizacao_campanha,
    solicitacao_encerramento, usuario_papel,
    termos_de_uso, usuario_termo, recompensa, arquivo_recompensa,
    contribuicao_recompensa, link_atualizacao, link_recompensa
TO authenticated;

-- NOTA: "notificacao" fica de fora desta lista de propósito. Ela só
-- tem política de SELECT (arquivo 04) — quem grava nela é o backend
-- via service_role (que ignora RLS/GRANT), então liberar INSERT/UPDATE
-- pra "authenticated" aqui não teria efeito de escrita real pelo client
-- (a RLS bloquearia mesmo assim) e só adicionaria uma permissão morta.

-- ------------------------------------------------------------
-- GRANT nas sequências (movido do arquivo de seed / DML)
-- Sem isso, GRANT INSERT sozinho não é suficiente: o Postgres
-- não consegue gerar o próximo valor de uma coluna SERIAL/IDENTITY
-- sem USAGE na sequência por trás dela (erro 42501).
-- Afeta toda tabela com GRANT INSERT acima (campanha, contribuicao,
-- comentario, denuncia, seguir_campanha, seguir_pesquisador,
-- link_academico etc.) — resolvido de uma vez para todas.
-- ------------------------------------------------------------
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ------------------------------------------------------------
-- GRANT EXECUTE nas funções do motor de score (movido do fim de
-- artificios.sql). O app chama recalcular_todos_os_scores() via RPC
-- (botão "Recalcular" no Painel Admin).
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_todos_os_scores()     TO authenticated;