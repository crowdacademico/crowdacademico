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
-- GRUPO BD (13-10-2026) - Perfil Acadêmico: "outro link" vale mais. IDEMPOTENTE (pode colar de novo).
-- Só muda valores: pode colar com o Nest ligado.
--
-- O que muda: na tela Pontuação, o item "LinkedIn ou site acadêmico" passa a se chamar "Link (ResearchGate, LinkedIn, GitHub...)"
-- (vale qualquer link que não seja Lattes nem ORCID) e vale 6; instituição e título passam a valer 4 cada (antes
-- 4, 5 e 5; o total da dimensão continua 30). As notas de todos os pesquisadores se recalculam sozinhas.
-- Se o admin já tinha mudado esses pesos pela tela, este grupo volta para os valores novos.
-- ============================================================================

UPDATE score_config SET descricao = 'Link (ResearchGate, LinkedIn, GitHub...)', peso = 6
WHERE nome = 'linkedin' AND (descricao IS DISTINCT FROM 'Link (ResearchGate, LinkedIn, GitHub...)' OR peso <> 6);
UPDATE score_config SET peso = 4 WHERE nome IN ('instituicao', 'titulo') AND peso <> 4;
