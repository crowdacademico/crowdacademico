-- ============================================================================
-- Este arquivo é TEMPORÁRIO - depois a gente deleta.
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
-- inteiro de novo sem medo) - se algum dia entrar um bloco que não seja,
-- vai vir com um aviso bem visível.
-- ============================================================================


-- ============================================================================
-- GRUPO V (28-09-2026)
-- ⚠️ PARE O NEST antes de colar: DROP/CREATE POLICY com o Nest rodando pode travar (deadlock).
-- historico_rejeicao: só quem tem campanha_rejeitar grava rejeição, e só em nome próprio. Pode colar mais de uma
-- vez.
-- ============================================================================
-- [04-E-6] historico_rejeicao: só quem pode rejeitar grava, e só em nome próprio (id_admin). Com WITH CHECK (true),
-- qualquer conta logada gravava rejeição falsa na campanha dos outros e consumia os reenvios dela. A cascata de
-- suspender_pesquisador() (03) grava por função SECURITY DEFINER e não passa por esta policy.
DROP POLICY IF EXISTS pol_historicorej_insert ON historico_rejeicao;
CREATE POLICY pol_historicorej_insert ON historico_rejeicao FOR INSERT TO app_nestjs WITH CHECK (
    (SELECT public.tem_permissao('campanha_rejeitar'))
    AND id_admin = (SELECT public.id_usuario_atual())
);

