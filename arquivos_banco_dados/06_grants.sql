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
-- Role criada no 01; este arquivo só concede permissões.
-- ============================================================

-- ============================================================
-- GRANTS E PROTEÇÃO DE COLUNAS
-- ============================================================
GRANT USAGE ON SCHEMA public TO app_nestjs;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_nestjs;

-- COMENTÁRIO DE ALTERAÇÃO:
-- O acesso público à tabela usuario e à tabela perfil_pesquisador foi
-- reduzido no nível de GRANT para evitar que o role app_nestjs tenha acesso
-- indiscriminado a dados sensíveis antes da avaliação das policies RLS.
REVOKE SELECT ON public.usuario FROM app_nestjs;
REVOKE SELECT ON public.perfil_pesquisador FROM app_nestjs;
-- ALTERADO: coluna id_supabase removida da tabela usuario (autenticação própria).
-- CORRIGIDO: faltavam as colunas usadas pelo próprio fluxo de login/auth
-- (senha_hash, tentativas_login_falhas, bloqueado_ate, ultimo_login_em,
-- ultimo_login_ip). Sem elas aqui, o GRANT de coluna barra o SELECT antes
-- mesmo de a RLS ser avaliada, e o NestJS não consegue nem checar a senha
-- no login nem aplicar a proteção de brute-force.
GRANT SELECT (
    id_usuario, nome, email, id_imagem_perfil, criado_em, deletado,
    senha_hash, tentativas_login_falhas, bloqueado_ate,
    ultimo_login_em, ultimo_login_ip
) ON public.usuario TO app_nestjs;

GRANT INSERT, UPDATE, DELETE ON
    usuario, perfil_pesquisador, campanha, contribuicao, comentario, denuncia,
    seguir_campanha, seguir_pesquisador, link_academico, configuracoes,
    score_config, score_rotulo, historico_rejeicao, atualizacao_campanha,
    arquivo, arquivo_atualizacao, solicitacao_encerramento, usuario_papel,
    termos_de_uso, usuario_termo, aceite_termo_contribuicao, recompensa, arquivo_recompensa,
    contribuicao_recompensa, link_atualizacao, link_recompensa, repasse,
    auditoria_financeira
TO app_nestjs;

-- COMENTÁRIO DE ALTERAÇÃO:
-- Foram concedidos apenas os GRANTs mínimos necessários para que as
-- políticas RLS possam funcionar corretamente para gestão de catálogos e
-- leitura controlada de perfil_pesquisador. Isso preserva o princípio de
-- privilégio mínimo e evita permissões amplas desnecessárias.
GRANT INSERT, UPDATE ON area_conhecimento, motivo_denuncia TO app_nestjs;

GRANT SELECT (
    id_usuario, vinculo_institucional, titulo_academico, status_pesquisador,
    ativado_em, suspenso, score_atual, score_atualizado_em
) ON public.perfil_pesquisador TO app_nestjs;

-- CORRIGIDO: "notificacao" tinha ganhado pol_notificacao_insert/update em
-- 04_rls_policies.sql (o backend passou a gravar notificação através do
-- próprio app_nestjs, não mais via um role que ignorasse RLS), mas o GRANT
-- de tabela correspondente não tinha sido adicionado aqui — sem os dois
-- níveis juntos (RLS + GRANT), toda tentativa de INSERT/UPDATE falhava com
-- "permission denied for table notificacao" mesmo com a policy liberando.
GRANT INSERT, UPDATE ON notificacao TO app_nestjs;

-- CORRIGIDO: verificacao_email, recuperacao_senha e sessao agora têm
-- policy real em 04 (TO app_nestjs USING true) — precisam do GRANT
-- correspondente, senão RLS libera mas falta permissão de tabela e
-- vice-versa (os dois níveis são exigidos juntos pelo Postgres).
GRANT SELECT, INSERT, UPDATE ON verificacao_email, recuperacao_senha, sessao TO app_nestjs;

-- CORRIGIDO: tipo_link ganhou pol_tipolink_insert/pol_tipolink_update em 04
-- (permissão tipolink_gerenciar), mas faltava o GRANT de tabela correspondente.
-- Sem isso, mesmo curador/admin com a permissão certa recebia "permission
-- denied for table tipo_link" antes de a RLS ser avaliada — o cadastro de um
-- novo tipo de link (ex.: "TikTok") continuava impossível na prática, que
-- era exatamente o problema descrito no RBAC-pontos-discutidos.md (seção 6.3).
-- Sem DELETE de propósito: tipo_link já tem coluna "ativo" para desativação
-- (soft delete via UPDATE), não precisa apagar linha.
GRANT INSERT, UPDATE ON tipo_link TO app_nestjs;

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
