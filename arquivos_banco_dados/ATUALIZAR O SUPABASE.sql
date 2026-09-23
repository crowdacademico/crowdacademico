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
