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
-- GRUPO DO (22-11-2026) - Áreas da grande área 9 (Multidisciplinar) iguais à tabela da Capes. IDEMPOTENTE.
-- Não precisa parar o Nest.
--
-- O que muda: as 5 áreas filhas de "Multidisciplinar" (IDs 86 a 90) estavam com os códigos trocados, e uma delas,
-- "Biodiversidade", não existe na Tabela de Áreas do Conhecimento da Capes (atualizada em 2022, a fonte citada no
-- TCC). Cada ID passa a ter o código e o nome que o seed corrigido dá a ele, para o banco em uso ficar idêntico a uma
-- instalação nova:
--   86 = 9.01.00.00 Interdisciplinar
--   87 = 9.02.00.00 Ensino
--   88 = 9.03.00.00 Materiais
--   89 = 9.04.00.00 Biotecnologia
--   90 = 9.05.00.00 Ciências Ambientais
--
-- Travas (o bloco inteiro é uma transação só: ou troca tudo, ou nada):
--   - Já corrigido: não faz nada (pode colar de novo).
--   - Alguma campanha aponta para os IDs 86 a 90: não altera nada e avisa (a troca mudaria a área da campanha).
--   - Os IDs 86 a 90 não são as 5 filhas de "Multidisciplinar": não altera nada e avisa.
-- A troca passa por códigos e nomes temporários, porque o código e o nome (dentro da grande área) são únicos.
-- ============================================================================
DO $$
DECLARE
    v_pai    INT;
    v_em_uso INT;
BEGIN
    IF (SELECT count(*) FROM area_conhecimento a
        JOIN (VALUES (86, '9.01.00.00', 'Interdisciplinar'), (87, '9.02.00.00', 'Ensino'), (88, '9.03.00.00', 'Materiais'),
                     (89, '9.04.00.00', 'Biotecnologia'), (90, '9.05.00.00', 'Ciências Ambientais')) AS v(id, codigo, nome)
          ON v.id = a.id_area_conhecimento AND v.codigo = a.codigo_cnpq AND v.nome = a.nome) = 5 THEN
        RAISE NOTICE 'GRUPO DO: as áreas 86 a 90 já estão iguais à tabela da Capes. Nada foi alterado.';
        RETURN;
    END IF;

    SELECT id_area_conhecimento INTO v_pai FROM area_conhecimento WHERE codigo_cnpq = '9.00.00.00';
    IF (SELECT count(*) FROM area_conhecimento
        WHERE id_area_conhecimento BETWEEN 86 AND 90 AND id_pai = v_pai AND codigo_cnpq LIKE '9.0_.00.00') <> 5 THEN
        RAISE EXCEPTION 'GRUPO DO: os IDs 86 a 90 não são as 5 áreas filhas de "Multidisciplinar" neste banco. Nada foi alterado.';
    END IF;

    SELECT count(*) INTO v_em_uso FROM campanha WHERE id_area_conhecimento BETWEEN 86 AND 90;
    IF v_em_uso > 0 THEN
        RAISE EXCEPTION 'GRUPO DO: % campanha(s) apontam para as áreas 86 a 90. Nada foi alterado: avise o Claude antes de seguir.', v_em_uso;
    END IF;

    UPDATE area_conhecimento
    SET codigo_cnpq = 'tmp-' || id_area_conhecimento, nome = 'tmp-' || id_area_conhecimento
    WHERE id_area_conhecimento BETWEEN 86 AND 90;

    UPDATE area_conhecimento a
    SET codigo_cnpq = v.codigo, nome = v.nome
    FROM (VALUES (86, '9.01.00.00', 'Interdisciplinar'), (87, '9.02.00.00', 'Ensino'), (88, '9.03.00.00', 'Materiais'),
                 (89, '9.04.00.00', 'Biotecnologia'), (90, '9.05.00.00', 'Ciências Ambientais')) AS v(id, codigo, nome)
    WHERE a.id_area_conhecimento = v.id;

    RAISE NOTICE 'GRUPO DO: áreas 86 a 90 corrigidas conforme a tabela da Capes.';
END;
$$;
