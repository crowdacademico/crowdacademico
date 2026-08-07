-- ============================================================================
-- Este arquivo é TEMPORÁRIO — depois a gente deleta.
--
-- Serve pra registrar, em ordem de DATA, cada mudança de banco que precisa
-- ser colada manualmente no SQL Editor do Supabase (fora do fluxo normal dos
-- arquivos numerados 01-08, que descrevem o banco inteiro do zero). Toda vez
-- que um arquivo 01-08 for alterado por uma mudança pequena, o trecho novo
-- entra aqui embaixo, numa seção nova com a data do dia.
--
-- REGRA DESTE ARQUIVO: do lado de cada data, está escrito se aquele bloco é
-- seguro colar e rodar MAIS DE UMA VEZ (idempotente) ou se é de rodar
-- UMA VEZ SÓ. Por padrão, tudo aqui é idempotente (pode colar o arquivo
-- inteiro de novo sem medo) — se algum dia entrar um bloco que não seja,
-- vai vir com um aviso bem visível.
-- ============================================================================


-- ============================================================================
-- 03-08-2026 — papel.nome editável pelo painel (nova coluna "Ações" na tela
-- de Papéis)
-- Seguro rodar de novo quantas vezes quiser.
-- ============================================================================

-- 04_rls_policies.sql [04-B] — nova policy: permite UPDATE em papel só pra
-- quem tem a permissão 'papel_gerenciar'
DROP POLICY IF EXISTS pol_papel_update ON papel;
CREATE POLICY pol_papel_update ON papel FOR UPDATE TO app_nestjs USING (public.tem_permissao('papel_gerenciar'));

-- 06_grants.sql [06-B] — sem este GRANT, a policy acima nunca chega a ser
-- avaliada (Postgres barra o UPDATE antes, por falta de privilégio de coluna)
GRANT UPDATE (nome) ON papel TO app_nestjs;


-- ============================================================================
-- 07-08-2026 — coluna "papel" da listagem de Usuários visível pra todo mundo
-- (TEMPORÁRIO, de propósito, só pra facilitar teste manual enquanto o
-- sistema está em construção — ver aviso amarelo na própria tela)
-- Seguro rodar de novo quantas vezes quiser.
-- ============================================================================

-- 04_rls_policies.sql [04-D-3] — era só dono OU quem tem papel_gerenciar
-- (só admin via painel). Virou USING(true): qualquer sessão logada vê o
-- papel de qualquer usuário. Reverter pra
-- "USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('papel_gerenciar'))"
-- quando o RBAC de verdade entrar em vigor (tela vai deixar de mostrar tudo
-- pra todo mundo).
DROP POLICY IF EXISTS pol_usuariopapel_select ON usuario_papel;
CREATE POLICY pol_usuariopapel_select ON usuario_papel FOR SELECT TO app_nestjs USING (true);


-- ============================================================================
-- NÃO ENTRA NESTE ARQUIVO (registrado aqui só pra não se perder)
-- ============================================================================

-- 07_seed_dados.sql (03-08-2026): a ordem das linhas de INSERT INTO papel foi
-- trocada, pra ficar do maior poder pro menor (admin primeiro, usuario por
-- último) — só pra IDs saírem bonitinhos num banco NOVO. Não é um trecho pra
-- colar aqui: o INSERT já tem "ON CONFLICT (nome) DO NOTHING", então rodar
-- de novo num banco que já tem os 7 papéis não muda NADA (os papéis já
-- existem com os IDs antigos). Se um dia você quiser essa ordem no banco
-- ATUAL, precisaria apagar e recriar as linhas de papel com cuidado — não é
-- "colar e rodar", por isso não está aqui.
