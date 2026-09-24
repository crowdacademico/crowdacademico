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












-- ############################################################################
-- 23-09-2026 - 2 CONSERTOS PEQUENOS: marcos vs. PATCH de data_inicio, e
-- sobreposição de faixas de score_rotulo (idempotente)
--
-- UM BLOCO SÓ, pode colar tudo de uma vez: nenhum valor de enum novo aqui.
-- ############################################################################

-- ----------------------------------------------------------------------------
-- ITEM 1 - PATCH comum de data_inicio não revalidava os marcos
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_data_inicio_contra_marcos
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADA (23-09-2026) - a trigger acima só vigia a porta do
--             marco (INSERT/UPDATE em marco_cronograma), nunca disparava por
--             escrita em campanha. Um PATCH comum mudando data_inicio pra
--             frente deixava, sem erro nenhum, marcos anteriores ao novo
--             início - exatamente o estado que fn_valida_data_marco_cronograma
--             proíbe do outro lado. deslizar_datas_campanha() (05, [05-K-2])
--             não sofre disso, porque ela move os marcos manualmente antes de
--             mover a campanha; este buraco era só no PATCH direto. Mesmo
--             ERRCODE 90008 da trigger irmã: é a mesma regra de negócio, só
--             vista pelo lado da campanha.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_data_inicio_contra_marcos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.data_inicio IS DISTINCT FROM OLD.data_inicio
       AND EXISTS (
           SELECT 1 FROM marco_cronograma
           WHERE id_campanha = NEW.id_campanha AND data_prevista < NEW.data_inicio
       )
    THEN
        RAISE EXCEPTION 'Existem marcos do cronograma com data anterior à nova data de início.'
            USING ERRCODE = '90008';
    END IF;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_data_inicio_contra_marcos
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE (só quando data_inicio muda)
-- Função:    fn_valida_data_inicio_contra_marcos()
-- Bloco:     [05-K-2]
-- Regra:     Impede reagendar data_inicio pra depois da data de algum marco já
--            cadastrado. WHEN evita rodar a consulta em todo UPDATE de campanha.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_valida_data_inicio_contra_marcos ON campanha;
CREATE TRIGGER trg_campanha_valida_data_inicio_contra_marcos
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (NEW.data_inicio IS DISTINCT FROM OLD.data_inicio)
EXECUTE FUNCTION public.fn_valida_data_inicio_contra_marcos();


-- ----------------------------------------------------------------------------
-- ITEM 2 - score_rotulo sem proteção contra faixas ativas se sobreporem
--
-- recalcular_score_pesquisador (05) faz SELECT ... LIMIT 1 sem ORDER BY sobre
-- score_rotulo - com 2 faixas ativas sobrepostas, o mesmo score podia cair
-- num rótulo diferente em execuções diferentes. int4range/GiST tem suporte
-- nativo pro operador &&, não precisa da extensão btree_gist.
--
-- DEFERRABLE INITIALLY DEFERRED: a checagem só roda no COMMIT da transação,
-- não a cada UPDATE - editar 2 faixas adjacentes na mesma transação (ex.:
-- encolher uma e alargar a vizinha) passa por um estado intermediário
-- sobreposto sem ser recusado no meio do caminho. Testado com PGlite: as 4
-- faixas do seed (sem sobreposição) continuam inserindo normalmente.
-- ----------------------------------------------------------------------------
ALTER TABLE score_rotulo DROP CONSTRAINT IF EXISTS "EX_SCORE_ROTULO_SEM_SOBREPOSICAO";
ALTER TABLE score_rotulo ADD CONSTRAINT "EX_SCORE_ROTULO_SEM_SOBREPOSICAO"
    EXCLUDE USING gist (int4range(score_minimo, score_maximo, '[]') WITH &&)
    WHERE (ativo = TRUE)
    DEFERRABLE INITIALLY DEFERRED;


-- ############################################################################
-- 23-09-2026 - MAIS 2 CONSERTOS: soma dos pesos de score_config precisa ser
-- 100, e faixas ativas de score_rotulo precisam cobrir 0-100 sem buraco
-- (idempotente)
-- ############################################################################

-- ----------------------------------------------------------------------------
-- ITEM 3 - nada impedia os 4 pesos raiz de score_config somarem != 100
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_soma_pesos_score_config
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Regra:      ADICIONADA (23-09-2026) - nada impedia os 4 pesos raiz de
--             score_config (id_pai IS NULL) somarem outra coisa que não 100.
--             Score_rotulo (faixas 0-100, seed) assume que o score MÁXIMO
--             possível é 100 - se a soma dos pesos fosse, por exemplo, 200,
--             ninguém nunca cairia na faixa "Referência" (75-100) de verdade,
--             e um score de 150 não teria rótulo nenhum (recalcular_score_
--             pesquisador, [05-I-2], devolveria NULL). CONSTRAINT TRIGGER
--             (não trigger comum) porque só assim dá pra ser DEFERRABLE -
--             sem isso, editar os 4 pesos em 4 UPDATEs separados (um por
--             linha, sem transação escrita à mão) reprovaria o 1º UPDATE
--             sozinho, mesmo que o conjunto final estivesse certo. FOR EACH
--             ROW é exigência do Postgres pra CONSTRAINT TRIGGER (não aceita
--             FOR EACH STATEMENT) - a função ignora NEW/OLD de propósito e
--             sempre olha a soma agregada da tabela inteira, então dispara
--             1x por linha afetada mas sempre confere o estado FINAL, já
--             no COMMIT (ou SET CONSTRAINTS ALL IMMEDIATE). Testado com
--             PGlite: 2 UPDATEs na mesma transação, inválidos no meio mas
--             certos no fim, o COMMIT passa; terminar errado, o COMMIT falha.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_soma_pesos_score_config()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_soma DECIMAL;
BEGIN
    SELECT SUM(peso) INTO v_soma FROM score_config WHERE id_pai IS NULL AND ativo = TRUE;
    IF v_soma IS DISTINCT FROM 100 THEN
        RAISE EXCEPTION 'A soma dos pesos raiz de score_config precisa ser exatamente 100 (está %).', v_soma
            USING ERRCODE = '90017';
    END IF;
    RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_score_config_soma_pesos
-- Tabela:    score_config
-- Momento:   AFTER INSERT OR UPDATE OF peso, DEFERRABLE INITIALLY DEFERRED
-- Função:    fn_valida_soma_pesos_score_config()
-- Bloco:     [05-I-4]
-- Regra:     Bloqueia terminar uma transação com os pesos raiz somando
--            diferente de 100. Ver comentário completo na função acima.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_score_config_soma_pesos ON score_config;
CREATE CONSTRAINT TRIGGER trg_score_config_soma_pesos
    AFTER INSERT OR UPDATE OF peso ON score_config
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    WHEN (NEW.id_pai IS NULL)
    EXECUTE FUNCTION public.fn_valida_soma_pesos_score_config();


-- ----------------------------------------------------------------------------
-- ITEM 4 - EX_SCORE_ROTULO_SEM_SOBREPOSICAO não impede buraco entre faixas
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_cobertura_score_rotulo
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Regra:      ADICIONADA (23-09-2026) - EX_SCORE_ROTULO_SEM_SOBREPOSICAO (01,
--             [01-I]) só impede 2 faixas ativas se SOBREPOREM; não impede um
--             BURACO entre elas (ex.: uma faixa terminando em 49 e a próxima
--             começando em 51 deixaria o score 50 sem rótulo nenhum, mesmo
--             bug de fundo do achado de sobreposição). Exige cobertura EXATA
--             de 0 a 100 - "exata" só faz sentido porque
--             fn_valida_soma_pesos_score_config (acima) já garante que o
--             score máximo possível é 100. Mesmo mecanismo de CONSTRAINT
--             TRIGGER DEFERRABLE da função acima, pelo mesmo motivo (editar
--             faixa por faixa não pode reprovar um estado intermediário).
--             LEAD() OVER (ORDER BY score_minimo) compara cada faixa com a
--             PRÓXIMA (por score_minimo) - se a próxima não começa exatamente
--             1 depois do fim desta, tem buraco (ou sobreposição, já
--             impossível pela outra constraint).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_cobertura_score_rotulo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_min INT;
    v_max INT;
    v_tem_buraco BOOLEAN;
BEGIN
    SELECT MIN(score_minimo), MAX(score_maximo) INTO v_min, v_max
    FROM score_rotulo WHERE ativo = TRUE;

    IF v_min IS DISTINCT FROM 0 OR v_max IS DISTINCT FROM 100 THEN
        RAISE EXCEPTION 'As faixas ativas de score_rotulo precisam cobrir de 0 a 100 (hoje vão de % a %).', v_min, v_max
            USING ERRCODE = '90018';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM (
            SELECT score_maximo, LEAD(score_minimo) OVER (ORDER BY score_minimo) AS proximo_minimo
            FROM score_rotulo WHERE ativo = TRUE
        ) t
        WHERE t.proximo_minimo IS NOT NULL AND t.proximo_minimo <> t.score_maximo + 1
    ) INTO v_tem_buraco;

    IF v_tem_buraco THEN
        RAISE EXCEPTION 'Existe um buraco (ou sobreposição) entre 2 faixas ativas de score_rotulo.'
            USING ERRCODE = '90018';
    END IF;

    RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_score_rotulo_cobertura
-- Tabela:    score_rotulo
-- Momento:   AFTER INSERT OR UPDATE OR DELETE, DEFERRABLE INITIALLY DEFERRED
-- Função:    fn_valida_cobertura_score_rotulo()
-- Bloco:     [05-I-4]
-- Regra:     Bloqueia terminar uma transação com buraco entre faixas ativas,
--            ou sem cobrir 0-100. Ver comentário completo na função acima.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_score_rotulo_cobertura ON score_rotulo;
CREATE CONSTRAINT TRIGGER trg_score_rotulo_cobertura
    AFTER INSERT OR UPDATE OR DELETE ON score_rotulo
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_cobertura_score_rotulo();
