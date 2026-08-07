
-- Este arquivo sql é temporario, depois a gente deleta

-- ============================================================================
-- UPDATE MANUAL — rodar no SQL Editor do Supabase
-- Idempotente — pode rodar de novo sem problema.
--
-- NÃO inclui a reordenação do seed (07_seed_dados.sql): essa só faz efeito
-- quando o banco é criado do zero, não altera papéis que já existem. Se você
-- quiser os papéis do banco ATUAL numerados em ordem de poder, teria que
-- apagar e recriar as linhas de `papel` (arriscado, envolve usuario_papel e
-- papel_permissao) — não é isso que este script faz, e não recomendo fazer
-- isso num banco que já tem dados de verdade.
-- ============================================================================

-- 04_rls_policies.sql [04-B] — nova policy: permite UPDATE em papel só pra
-- quem tem a permissão 'papel_gerenciar'
DROP POLICY IF EXISTS pol_papel_update ON papel;
CREATE POLICY pol_papel_update ON papel FOR UPDATE TO app_nestjs USING (public.tem_permissao('papel_gerenciar'));

-- 06_grants.sql [06-B] — sem este GRANT, a policy acima nunca chega a ser
-- avaliada (Postgres barra o UPDATE antes, por falta de privilégio de coluna)
GRANT UPDATE (nome) ON papel TO app_nestjs;

-- 04_rls_policies.sql [04-D-3] — TEMPORÁRIO (pedido do Lucas, 07-08-2026):
-- qualquer sessão logada passa a ver o papel de QUALQUER usuário (coluna
-- "papel" da listagem de Usuários), não só admin — agiliza teste manual
-- enquanto o sistema está em construção. Reverter pra
-- "USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('papel_gerenciar'))"
-- quando o RBAC de verdade entrar em vigor (ver mesmo comentário em
-- 04_rls_policies.sql).
DROP POLICY IF EXISTS pol_usuariopapel_select ON usuario_papel;
CREATE POLICY pol_usuariopapel_select ON usuario_papel FOR SELECT TO app_nestjs USING (true);
