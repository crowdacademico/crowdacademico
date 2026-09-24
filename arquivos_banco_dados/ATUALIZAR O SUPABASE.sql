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


-- ############################################################################
-- 24-09-2026 - GRUPO A DA REVISÃO EXTERNA: 8 consertos de baixo risco (idempotente)
-- Sem valor de enum novo. Pode colar tudo de uma vez.
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 1.1 Limite de texto só vale quando o texto muda (antes: todo UPDATE, e baixar o limite travava doação e o job de encerrar). ERRCODE 90003, mensagem sem o nome da chave.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_valida_limite_texto_livre()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_coluna TEXT    := TG_ARGV[0];
    v_chave  TEXT    := TG_ARGV[1];
    v_padrao DECIMAL := TG_ARGV[2]::DECIMAL;
    v_limite INT;
    v_valor  TEXT;
BEGIN
    v_valor := to_jsonb(NEW) ->> v_coluna;

    IF TG_OP = 'UPDATE' AND v_valor IS NOT DISTINCT FROM (to_jsonb(OLD) ->> v_coluna) THEN
        RETURN NEW;
    END IF;

    v_limite := public.config_numero(v_chave, v_padrao)::INT;

    IF v_valor IS NOT NULL AND char_length(v_valor) > v_limite THEN
        RAISE EXCEPTION 'Campo % excede o limite de % caracteres.', v_coluna, v_limite
            USING ERRCODE = '90003';
    END IF;

    RETURN NEW;
END;
$$;
-- ----------------------------------------------------------------------------
-- 1.2 Limite de campanhas simultâneas só vale na ENTRADA no conjunto, com lock por pesquisador (antes: todo UPDATE de campanha ativa).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validar_limite_campanhas_pesquisador()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count  integer;
    v_limite integer;
BEGIN
    IF NEW.status NOT IN ('aguardando_aprovacao', 'ativo') THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.status IN ('aguardando_aprovacao', 'ativo')
       AND NEW.id_usuario IS NOT DISTINCT FROM OLD.id_usuario THEN
        RETURN NEW;
    END IF;

    PERFORM pg_advisory_xact_lock(91018, NEW.id_usuario);

    v_limite := public.config_numero('limite_campanhas_simultaneas', 2);

    SELECT COUNT(*) INTO v_count
    FROM campanha
    WHERE id_usuario = NEW.id_usuario
      AND status IN ('aguardando_aprovacao', 'ativo')
      AND id_campanha <> COALESCE(NEW.id_campanha, -1);

    IF v_count >= v_limite THEN
        RAISE EXCEPTION 'Você já possui % campanhas em andamento (ativas ou aguardando aprovação). Aguarde uma delas terminar antes de enviar esta para aprovação.', v_limite
            USING ERRCODE = '91018';
    END IF;

    RETURN NEW;
END;
$$;
-- ----------------------------------------------------------------------------
-- 1.4 A soma do arrecadado roda com privilégio próprio (antes: o UPDATE em campanha era filtrado pela RLS para o doador e o total ficava errado em silêncio).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_sincroniza_arrecadado_campanha()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id_campanha INT := COALESCE(NEW.id_campanha, OLD.id_campanha);
    v_total       DECIMAL(10,2);
BEGIN
    PERFORM 1 FROM campanha WHERE id_campanha = v_id_campanha FOR UPDATE;

    SELECT COALESCE(SUM(valor), 0) INTO v_total
    FROM contribuicao
    WHERE id_campanha = v_id_campanha
      AND status IN ('confirmado', 'repassado');

    UPDATE campanha
    SET valor_bruto_arrecadado = v_total
    WHERE id_campanha = v_id_campanha
      AND valor_bruto_arrecadado IS DISTINCT FROM v_total;

    RETURN COALESCE(NEW, OLD);
END;
$$;
-- ----------------------------------------------------------------------------
-- 1.6 Peso de subitem desativado vale 0, não NULL (antes: desativar um subitem zerava a dimensão inteira).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_peso_score(p_id_pai INT, p_nome TEXT)
RETURNS DECIMAL LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(
        (SELECT peso FROM score_config WHERE id_pai = p_id_pai AND nome = p_nome AND ativo = TRUE),
        0);
$$;
REVOKE EXECUTE ON FUNCTION public.fn_peso_score(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_peso_score(INT, TEXT) TO app_nestjs;
CREATE OR REPLACE FUNCTION public.calcular_score_perfil_academico(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_pai      INT;
    v_peso_raiz   DECIMAL;
    v_peso_lattes DECIMAL := 0;
    v_peso_orcid  DECIMAL := 0;
    v_peso_site   DECIMAL := 0;
    v_peso_inst   DECIMAL := 0;
    v_peso_titulo DECIMAL := 0;
    v_total       DECIMAL := 0;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz
    FROM score_config WHERE nome = 'perfil_academico' AND ativo = TRUE;

    IF v_id_pai IS NULL THEN RETURN 0; END IF;

    v_peso_lattes := public.fn_peso_score(v_id_pai, 'lattes');
    v_peso_orcid := public.fn_peso_score(v_id_pai, 'orcid');
    v_peso_site := public.fn_peso_score(v_id_pai, 'linkedin');
    v_peso_inst := public.fn_peso_score(v_id_pai, 'instituicao');
    v_peso_titulo := public.fn_peso_score(v_id_pai, 'titulo');

    IF EXISTS (SELECT 1 FROM link_academico la JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
               WHERE la.id_usuario = p_id_usuario AND tl.codigo = 'LATTES') THEN
        v_total := v_total + v_peso_lattes;
    END IF;

    IF EXISTS (SELECT 1 FROM link_academico la JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
               WHERE la.id_usuario = p_id_usuario AND tl.codigo = 'ORCID') THEN
        v_total := v_total + v_peso_orcid;
    END IF;

    IF EXISTS (SELECT 1 FROM link_academico la JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
               WHERE la.id_usuario = p_id_usuario AND tl.codigo NOT IN ('LATTES', 'ORCID')) THEN
        v_total := v_total + v_peso_site;
    END IF;

    IF EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = p_id_usuario
               AND vinculo_institucional IS NOT NULL AND btrim(vinculo_institucional) <> '') THEN
        v_total := v_total + v_peso_inst;
    END IF;

    IF EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = p_id_usuario
               AND titulo_academico IS NOT NULL) THEN
        v_total := v_total + v_peso_titulo;
    END IF;

    RETURN ROUND(LEAST(GREATEST(v_total, 0), v_peso_raiz))::INTEGER;
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_score_historico(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_pai                INT;
    v_peso_raiz             DECIMAL;
    v_peso_conclusao        DECIMAL := 0;
    v_peso_aprovacao        DECIMAL := 0;
    v_total_encerradas      INT := 0;
    v_concluidas_sucesso    INT := 0;
    v_total_submetidas      INT := 0;
    v_aprovadas             INT := 0;
    v_rejeitadas_definitivas INT := 0;
    v_abandonadas           INT := 0;
    v_sem_justificativa     INT := 0;
    v_conclusao             DECIMAL := 0;
    v_aprovacao             DECIMAL := 0;
    v_penalidade_abandono   DECIMAL;
    v_penalidade_sem_just   DECIMAL;
    v_total                 DECIMAL := 0;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz
    FROM score_config WHERE nome = 'historico_plataforma' AND ativo = TRUE;

    IF v_id_pai IS NULL THEN RETURN 0; END IF;

    v_peso_conclusao := public.fn_peso_score(v_id_pai, 'campanhas_concluidas');
    v_peso_aprovacao := public.fn_peso_score(v_id_pai, 'taxa_aprovacao');

    v_penalidade_abandono := public.config_numero('score_penalidade_abandono', 3);
    v_penalidade_sem_just := public.config_numero('score_penalidade_sem_justificativa', 2);

    SELECT count(*) INTO v_aprovadas FROM campanha WHERE id_usuario = p_id_usuario AND aprovado_em IS NOT NULL;
    SELECT count(DISTINCT h.id_campanha) INTO v_rejeitadas_definitivas
    FROM historico_rejeicao h
    WHERE h.id_usuario_dono = p_id_usuario
      AND NOT EXISTS (SELECT 1 FROM campanha c WHERE c.id_campanha = h.id_campanha);
    v_total_submetidas := v_aprovadas + v_rejeitadas_definitivas;
    SELECT count(*) INTO v_total_encerradas FROM campanha WHERE id_usuario = p_id_usuario
        AND status IN ('sucesso','nao_atingido');
    SELECT count(*) INTO v_concluidas_sucesso FROM campanha WHERE id_usuario = p_id_usuario
        AND status = 'sucesso';

    SELECT count(*) INTO v_abandonadas FROM campanha c
    WHERE c.id_usuario = p_id_usuario AND c.status = 'nao_atingido'
      AND NOT EXISTS (SELECT 1 FROM solicitacao_encerramento se WHERE se.id_campanha = c.id_campanha);

    SELECT count(*) INTO v_sem_justificativa FROM campanha c
    WHERE c.id_usuario = p_id_usuario AND c.status = 'nao_atingido'
      AND EXISTS (SELECT 1 FROM solicitacao_encerramento se WHERE se.id_campanha = c.id_campanha
                  AND (se.justificativa_pesquisador IS NULL OR btrim(se.justificativa_pesquisador) = ''));

    IF v_total_encerradas > 0 THEN
        v_conclusao := (v_concluidas_sucesso::DECIMAL / v_total_encerradas) * v_peso_conclusao;
    END IF;

    IF v_total_submetidas > 0 THEN
        v_aprovacao := (v_aprovadas::DECIMAL / v_total_submetidas) * v_peso_aprovacao;
    END IF;

    v_total := v_conclusao + v_aprovacao
               - (v_abandonadas * v_penalidade_abandono)
               - (v_sem_justificativa * v_penalidade_sem_just);

    RETURN ROUND(LEAST(GREATEST(v_total, 0), v_peso_raiz))::INTEGER;
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_score_atualizacao(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_pai             INT;
    v_peso_raiz          DECIMAL;
    v_peso_regularidade  DECIMAL := 0;
    v_peso_tempestividade DECIMAL := 0;
    v_frequencia_mensal  DECIMAL;
    v_soma_esperadas     DECIMAL := 0;
    v_soma_realizadas    DECIMAL := 0;
    v_qtd_campanhas      INT := 0;
    v_qtd_em_dia         INT := 0;
    v_regularidade       DECIMAL := 0;
    v_tempestividade     DECIMAL := 0;
    rec                  RECORD;
    v_duracao_meses      DECIMAL;
    v_esperadas_campanha DECIMAL;
    v_realizadas_campanha INT;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz
    FROM score_config WHERE nome = 'atualizacao_campanha' AND ativo = TRUE;

    IF v_id_pai IS NULL THEN RETURN 0; END IF;

    v_peso_regularidade := public.fn_peso_score(v_id_pai, 'regularidade_atualizacoes');
    v_peso_tempestividade := public.fn_peso_score(v_id_pai, 'tempestividade_atualizacoes');

    v_frequencia_mensal := public.config_numero('score_frequencia_esperada_mensal', 1);

    FOR rec IN
        SELECT id_campanha, data_inicio, data_fim
        FROM campanha
        WHERE id_usuario = p_id_usuario
          AND status IN ('ativo','sucesso','nao_atingido','encerrado')
          AND data_inicio IS NOT NULL
    LOOP
        v_duracao_meses := GREATEST(1, EXTRACT(EPOCH FROM (COALESCE(rec.data_fim, NOW()) - rec.data_inicio)) / 2629800.0);
        v_esperadas_campanha := v_duracao_meses * v_frequencia_mensal;

        SELECT count(*) INTO v_realizadas_campanha FROM atualizacao_campanha
        WHERE id_campanha = rec.id_campanha AND ativo = TRUE;

        v_qtd_campanhas := v_qtd_campanhas + 1;
        v_soma_esperadas := v_soma_esperadas + v_esperadas_campanha;
        v_soma_realizadas := v_soma_realizadas + v_realizadas_campanha;

        IF v_realizadas_campanha >= v_esperadas_campanha THEN
            v_qtd_em_dia := v_qtd_em_dia + 1;
        END IF;
    END LOOP;

    IF v_soma_esperadas > 0 THEN
        v_regularidade := LEAST(v_soma_realizadas / v_soma_esperadas, 1) * v_peso_regularidade;
    END IF;

    IF v_qtd_campanhas > 0 THEN
        v_tempestividade := (v_qtd_em_dia::DECIMAL / v_qtd_campanhas) * v_peso_tempestividade;
    END IF;

    RETURN ROUND(LEAST(GREATEST(v_regularidade + v_tempestividade, 0), v_peso_raiz))::INTEGER;
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_score_reputacao(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_peso_raiz   DECIMAL;
    v_id_pai      INT;
    v_procedentes INT;
    v_custo       DECIMAL;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz FROM score_config WHERE nome = 'reputacao_comunidade' AND ativo = TRUE;
    IF v_peso_raiz IS NULL THEN RETURN 0; END IF;

    v_custo := public.fn_peso_score(v_id_pai, 'volume_denuncias')
             + public.fn_peso_score(v_id_pai, 'gravidade_denuncias');

    SELECT count(*) INTO v_procedentes FROM denuncia WHERE id_pesquisador_alvo = p_id_usuario AND status = 'resolvida';

    RETURN ROUND(LEAST(GREATEST(v_peso_raiz - v_procedentes * v_custo, 0), v_peso_raiz))::INTEGER;
END;
$$;
-- ----------------------------------------------------------------------------
-- 1.7 Soma dos pesos raiz = 100 também ao desativar ou apagar linha; recálculo geral também em INSERT, DELETE e mudança de ativo.
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_score_config_soma_pesos ON score_config;
CREATE CONSTRAINT TRIGGER trg_score_config_soma_pesos
    AFTER INSERT OR UPDATE OR DELETE ON score_config
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_soma_pesos_score_config();

DROP TRIGGER IF EXISTS trg_score_config_recalcula_todos ON score_config;
CREATE TRIGGER trg_score_config_recalcula_todos
    AFTER INSERT OR UPDATE OR DELETE ON score_config
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trg_recalcular_por_score_config();
-- ----------------------------------------------------------------------------
-- 1.9 O job de expirar rejeitadas não morre por uma linha com contribuição, repasse ou solicitação.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.expirar_campanhas_rejeitadas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expiradas INT;
BEGIN
    DELETE FROM campanha c
    WHERE c.status = 'rejeitado'
      AND (SELECT MAX(h.rejeitado_em) FROM historico_rejeicao h WHERE h.id_campanha = c.id_campanha)
          <= NOW() - (public.config_numero('campanha_rejeitada_prazo_dias', 30)::INT * INTERVAL '1 day')
      AND NOT EXISTS (SELECT 1 FROM denuncia d                 WHERE d.id_campanha_alvo = c.id_campanha)
      AND NOT EXISTS (SELECT 1 FROM contribuicao ct            WHERE ct.id_campanha     = c.id_campanha)
      AND NOT EXISTS (SELECT 1 FROM repasse r                  WHERE r.id_campanha      = c.id_campanha)
      AND NOT EXISTS (SELECT 1 FROM solicitacao_encerramento s WHERE s.id_campanha      = c.id_campanha);

    GET DIAGNOSTICS v_expiradas = ROW_COUNT;
    RETURN v_expiradas;
END;
$$;
-- ----------------------------------------------------------------------------
-- 1.11 Pesos e faixas do score entram no log de auditoria.
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_log_auditoria_score_config ON score_config;
CREATE TRIGGER trg_log_auditoria_score_config
AFTER INSERT OR UPDATE OR DELETE ON score_config
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_score_config');

DROP TRIGGER IF EXISTS trg_log_auditoria_score_rotulo ON score_rotulo;
CREATE TRIGGER trg_log_auditoria_score_rotulo
AFTER INSERT OR UPDATE OR DELETE ON score_rotulo
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_rotulo');
-- ----------------------------------------------------------------------------
-- B1 contar_metricas_dashboard acha o papel pelo CODIGO (renomear o papel pelo painel não pode zerar a métrica).
-- ----------------------------------------------------------------------------

-- DROP porque o Grupo G (mais abaixo) troca o tipo de retorno da função; sem isto reaplicar o arquivo inteiro falha (42P13).
DROP FUNCTION IF EXISTS public.contar_metricas_dashboard();
CREATE OR REPLACE FUNCTION public.contar_metricas_dashboard()
RETURNS TABLE (
    total_usuarios                 INT,
    total_pesquisadores            INT,
    total_papeis                   INT,
    total_permissoes                INT,
    total_configuracoes            INT,
    total_campanhas                INT,
    sessoes_ativas                  INT,
    campanhas_ativas                INT,
    campanhas_sucesso               INT,
    campanhas_nao_atingida          INT,
    campanhas_aguardando_aprovacao  INT,
    valor_total_arrecadado          DECIMAL(14,2),
    denuncias_pendentes             INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        (SELECT count(*)::INT FROM usuario WHERE deletado = FALSE),
        (SELECT count(DISTINCT up.id_usuario)::INT
           FROM usuario_papel up
           JOIN papel p ON p.id_papel = up.id_papel
          WHERE p.codigo = 'pesquisador'),
        (SELECT count(*)::INT FROM papel),
        (SELECT count(*)::INT FROM permissao),
        (SELECT count(*)::INT FROM configuracoes),
        (SELECT count(*)::INT FROM campanha),
        (SELECT count(*)::INT FROM sessao WHERE revogado_em IS NULL AND expira_em > now()),
        (SELECT count(*)::INT FROM campanha WHERE status = 'ativo'),
        (SELECT count(*)::INT FROM campanha WHERE status = 'sucesso'),
        (SELECT count(*)::INT FROM campanha WHERE status = 'nao_atingido'),
        (SELECT count(*)::INT FROM campanha WHERE status = 'aguardando_aprovacao'),
        (SELECT COALESCE(SUM(valor_bruto_arrecadado), 0)::DECIMAL(14,2) FROM campanha),
        (SELECT count(*)::INT FROM denuncia WHERE status = 'pendente');
$$;

-- ############################################################################
-- 24-09-2026 - GRUPO B DA REVISÃO EXTERNA: 4 consertos que exigem atenção (idempotente)
-- Cole DEPOIS do Grupo A. Sem valor de enum novo.
-- ############################################################################

-- CONFERÊNCIA ANTES DE COLAR O ITEM 1.8 (deve voltar zero linhas):
-- SELECT chave, tipo, valor FROM configuracoes
-- WHERE valor IS NOT NULL AND tipo <> 'texto' AND NOT (
--        (tipo = 'inteiro'  AND valor ~ '^[0-9]+$')
--     OR (tipo = 'decimal'  AND valor ~ '^[0-9]+(\.[0-9]+)?$')
--     OR (tipo = 'booleano' AND valor IN ('true', 'false')));

-- ----------------------------------------------------------------------------
-- 1.3 Máquina de estados também para quem tem permissão: cada permissão abre só a sua aresta. Inclui a aresta do admin (campanha_editar) que envia ou reenvia campanha alheia pelo Campo de Testes.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_valida_transicao_campanha()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status      IS NOT DISTINCT FROM OLD.status
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'aguardando_aprovacao' AND NEW.status = 'ativo'
       AND NEW.aprovado_em IS NOT NULL
       AND public.tem_permissao('campanha_aprovar') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND public.tem_permissao('campanha_rejeitar') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'ativo' AND NEW.status = 'encerrado'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND public.tem_permissao('solicitacao_encerramento_decidir') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'ativo'
       AND OLD.data_fim IS NOT NULL AND OLD.data_fim <= NOW()
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
       AND (
            (NEW.status = 'sucesso'      AND NEW.valor_bruto_arrecadado >= NEW.meta_financeira)
         OR (NEW.status = 'nao_atingido' AND NEW.valor_bruto_arrecadado <  NEW.meta_financeira)
       )
    THEN
        RETURN NEW;
    END IF;

    IF OLD.status IN ('rascunho', 'rejeitado') AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
       AND public.tem_permissao('campanha_editar') THEN
        RETURN NEW;
    END IF;

    IF NEW.id_usuario = public.id_usuario_atual()
       AND OLD.status IN ('rejeitado', 'rascunho') AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
    THEN
        IF NOT EXISTS (
            SELECT 1 FROM perfil_pesquisador pp
            WHERE pp.id_usuario = public.id_usuario_atual() AND pp.status_pesquisador = 'ativo'
        ) THEN
            RAISE EXCEPTION 'Pesquisador suspenso não pode enviar campanha para aprovação.'
                USING ERRCODE = '92009';
        END IF;

        IF OLD.status = 'rejeitado' THEN
            IF public.fn_campanha_reenvios_esgotados(OLD.id_campanha) THEN
                RAISE EXCEPTION 'Esta campanha já usou todos os reenvios permitidos e agora é somente leitura.'
                    USING ERRCODE = '91025';
            END IF;

            IF (SELECT MAX(h.rejeitado_em) FROM historico_rejeicao h WHERE h.id_campanha = OLD.id_campanha)
               <= NOW() - (public.config_numero('campanha_rejeitada_prazo_dias', 30)::INT * INTERVAL '1 day')
            THEN
                RAISE EXCEPTION 'O prazo para reenviar esta campanha rejeitada já venceu.'
                    USING ERRCODE = '91026';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND (
            (OLD.status = 'ativo'                AND NEW.status = 'encerrado_moderacao')
         OR (OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado')
       )
       AND EXISTS (
           SELECT 1 FROM perfil_pesquisador pp
           WHERE pp.id_usuario = NEW.id_usuario AND pp.status_pesquisador = 'suspenso'
       )
    THEN
        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND OLD.status = 'ativo' AND NEW.status = 'encerrado_moderacao'
       AND public.tem_permissao('campanha_encerrar_moderacao')
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status de campanha não autorizada (% -> %).', OLD.status, NEW.status
        USING ERRCODE = '92001';
END;
$$;
-- ----------------------------------------------------------------------------
-- 1.5 Campo calculado não se escreve à mão: UPDATE por coluna em campanha (valor_bruto_arrecadado, taxa_plataforma, encerrado_em, modelo e id_usuario ficam de fora).
-- ----------------------------------------------------------------------------

REVOKE UPDATE ON campanha FROM app_nestjs;
GRANT UPDATE (
    titulo, descricao, id_area_conhecimento, meta_financeira,
    data_inicio, data_fim, video_apresentacao_url,
    status, aprovado_em, id_admin
) ON campanha TO app_nestjs;
-- ----------------------------------------------------------------------------
-- 1.8 O valor de uma configuração precisa bater com o tipo (antes: "5,00" derrubava toda aprovação com 22P02). Se o VALIDATE falhar, corrija a linha apontada e cole de novo; a consulta de conferência está no comentário do bloco.
-- ----------------------------------------------------------------------------

ALTER TABLE configuracoes DROP CONSTRAINT IF EXISTS "CK_CONFIGURACOES_VALOR_TIPO";
ALTER TABLE configuracoes ADD CONSTRAINT "CK_CONFIGURACOES_VALOR_TIPO" CHECK (
       valor IS NULL
    OR tipo = 'texto'
    OR (tipo = 'inteiro'  AND valor ~ '^[0-9]+$')
    OR (tipo = 'decimal'  AND valor ~ '^[0-9]+(\.[0-9]+)?$')
    OR (tipo = 'booleano' AND valor IN ('true', 'false'))
) NOT VALID;
ALTER TABLE configuracoes VALIDATE CONSTRAINT "CK_CONFIGURACOES_VALOR_TIPO";
-- ----------------------------------------------------------------------------
-- 1.10 Toda rejeição grava histórico, venha de onde vier (a checagem roda no COMMIT).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_exige_historico_rejeicao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.status = 'rejeitado' AND NOT EXISTS (
        SELECT 1 FROM historico_rejeicao
        WHERE id_campanha = NEW.id_campanha AND rejeitado_em = NOW()
    ) THEN
        RAISE EXCEPTION 'Rejeição sem registro em historico_rejeicao na mesma transação.'
            USING ERRCODE = '91028';
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_campanha_exige_historico_rejeicao ON campanha;
CREATE CONSTRAINT TRIGGER trg_campanha_exige_historico_rejeicao
    AFTER UPDATE ON campanha
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    WHEN (NEW.status = 'rejeitado' AND OLD.status IS DISTINCT FROM 'rejeitado')
    EXECUTE FUNCTION public.fn_exige_historico_rejeicao();


-- ############################################################################
-- 24-09-2026 - GRUPO C: mínimo não pode passar do máximo nas configurações (idempotente)
-- Sem valor de enum novo. Não altera nenhum dado: só barra a próxima escrita que deixe
-- um par mínimo/máximo invertido (prazo, orçamento, cronograma, tamanho de arquivo).
-- ############################################################################

-- CONFERÊNCIA (opcional, deve voltar zero linhas): pares que já estão invertidos hoje.
-- SELECT a.chave AS minimo, a.valor, b.chave AS maximo, b.valor
-- FROM configuracoes a JOIN configuracoes b ON (a.chave, b.chave) IN (
--   ('prazo_minimo_campanha_dias','prazo_maximo_campanha_dias'),
--   ('orcamento_min_itens','orcamento_max_itens'),
--   ('cronograma_min_marcos','cronograma_max_marcos'))
-- WHERE a.id_usuario IS NULL AND b.id_usuario IS NULL AND a.valor::DECIMAL > b.valor::DECIMAL;

CREATE OR REPLACE FUNCTION public.fn_valida_pares_min_max_configuracoes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_pares TEXT[][] := ARRAY[
        ['prazo_minimo_campanha_dias',    'prazo_maximo_campanha_dias'],
        ['orcamento_min_itens',           'orcamento_max_itens'],
        ['cronograma_min_marcos',         'cronograma_max_marcos'],
        ['arquivo_tamanho_minimo_bytes',  'arquivo_tamanho_maximo_imagem_bytes'],
        ['arquivo_tamanho_minimo_bytes',  'arquivo_tamanho_maximo_documento_bytes']
    ];
    v_chave  TEXT;
    v_par    TEXT[];
    v_minimo DECIMAL;
    v_maximo DECIMAL;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_chave := OLD.chave;
    ELSE
        v_chave := NEW.chave;
    END IF;

    FOREACH v_par SLICE 1 IN ARRAY v_pares LOOP
        IF v_chave = v_par[1] OR v_chave = v_par[2] THEN
            SELECT valor::DECIMAL INTO v_minimo FROM configuracoes
            WHERE chave = v_par[1] AND id_usuario IS NULL AND ativo = TRUE AND tipo IN ('inteiro', 'decimal');
            SELECT valor::DECIMAL INTO v_maximo FROM configuracoes
            WHERE chave = v_par[2] AND id_usuario IS NULL AND ativo = TRUE AND tipo IN ('inteiro', 'decimal');

            IF v_minimo IS NOT NULL AND v_maximo IS NOT NULL AND v_minimo > v_maximo THEN
                RAISE EXCEPTION 'O valor mínimo (%) de "%" não pode ser maior que o máximo (%) de "%". Antes de subir o mínimo, suba o máximo (ou baixe o máximo só depois de baixar o mínimo).',
                    v_minimo, v_par[1], v_maximo, v_par[2]
                    USING ERRCODE = '90019',
                          DETAIL = json_build_object('chaveMinimo', v_par[1], 'valorMinimo', v_minimo,
                                                     'chaveMaximo', v_par[2], 'valorMaximo', v_maximo)::text;
            END IF;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_configuracoes_pares_min_max ON configuracoes;
CREATE CONSTRAINT TRIGGER trg_configuracoes_pares_min_max
    AFTER INSERT OR UPDATE OR DELETE ON configuracoes
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_pares_min_max_configuracoes();


-- ############################################################################
-- 24-09-2026 - GRUPO D: regra de reenvio numa função só e listas de status com nome (idempotente)
-- Sem valor de enum novo, não altera dado. Só CREATE OR REPLACE de funções: as triggers existentes
-- continuam apontando para os mesmos nomes. Cole DEPOIS dos Grupos A, B e C.
-- ############################################################################

CREATE OR REPLACE FUNCTION public.fn_status_pos_aprovacao(p_status status_campanha)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT p_status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao');
$$;

CREATE OR REPLACE FUNCTION public.fn_status_terminal(p_status status_campanha)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT p_status IN ('sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao');
$$;

CREATE OR REPLACE FUNCTION public.fn_campanha_situacao_reenvio(p_id_campanha INT)
RETURNS TABLE (rejeicoes INT, reenvios_restantes INT, somente_leitura BOOLEAN, prazo_reenvio_ate TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT h.n,
           GREATEST(0, c.m - GREATEST(h.n - 1, 0)),
           h.n > c.m,
           h.ultima + (public.config_numero('campanha_rejeitada_prazo_dias', 30)::INT * INTERVAL '1 day')
    FROM (SELECT count(*)::INT AS n, max(rejeitado_em) AS ultima
          FROM historico_rejeicao WHERE id_campanha = p_id_campanha) h,
         (SELECT public.config_numero('campanha_rejeitada_max_reenvios', 3)::INT AS m) c;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_campanha_situacao_reenvio(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_campanha_situacao_reenvio(INT) TO app_nestjs;

CREATE OR REPLACE FUNCTION public.fn_campanha_reenvios_esgotados(p_id_campanha INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT somente_leitura FROM public.fn_campanha_situacao_reenvio(p_id_campanha);
$$;

CREATE OR REPLACE FUNCTION fn_congela_regras_campanha()
RETURNS TRIGGER AS $$
BEGIN
    IF public.fn_status_pos_aprovacao(OLD.status) THEN
        -- CORRIGIDO: taxa_plataforma é nullable; "<>" contra NULL nunca dá TRUE, deixando
        -- a taxa mudar sem bloqueio numa campanha aprovada com taxa ainda não preenchida.
        -- IS DISTINCT FROM trata NULL corretamente nos três casos.
        IF NEW.meta_financeira IS DISTINCT FROM OLD.meta_financeira THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar a meta financeira após a aprovação da campanha.'
                USING ERRCODE = '91004';
        END IF;

        IF NEW.modelo IS DISTINCT FROM OLD.modelo THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o modelo de financiamento após a aprovação da campanha.'
                USING ERRCODE = '91005';
        END IF;

        IF NEW.taxa_plataforma IS DISTINCT FROM OLD.taxa_plataforma THEN
            RAISE EXCEPTION 'Operação bloqueada: a taxa da plataforma não pode ser alterada após o congelamento.'
                USING ERRCODE = '91006';
        END IF;

        -- CORRIGIDO (B2): título, descrição e prazo não eram protegidos - trocar a
        -- descrição de um projeto já financiado é o vetor de fraude mais óbvio que
        -- existe numa plataforma de doação. Mesma trigger, mesmos campos protegidos.
        IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o título após a aprovação da campanha.'
                USING ERRCODE = '91007';
        END IF;

        IF NEW.descricao IS DISTINCT FROM OLD.descricao THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar a descrição após a aprovação da campanha.'
                USING ERRCODE = '91008';
        END IF;

        -- CORRIGIDO (20-09-2026, achado numa revisão do Lucas): regressão por
        -- omissão. Estes 2 campos nasceram DEPOIS desta trigger (video_
        -- apresentacao_url em 28-07-2026) e nunca foram incluídos, apesar de
        -- CampanhaRequestUpdate aceitar os dois e pol_campanha_update liberar o
        -- dono. O vídeo é o MESMO vetor de fraude que a descrição (comentário
        -- logo acima), com mais impacto - trocar o vídeo de apresentação de um
        -- projeto já financiado é apresentar outro projeto para quem já doou.
        IF NEW.video_apresentacao_url IS DISTINCT FROM OLD.video_apresentacao_url THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o vídeo de apresentação após a aprovação da campanha.'
                USING ERRCODE = '91023';
        END IF;

        IF NEW.id_area_conhecimento IS DISTINCT FROM OLD.id_area_conhecimento THEN
            RAISE EXCEPTION 'Operação bloqueada: a área do conhecimento não pode ser alterada após a aprovação da campanha.'
                USING ERRCODE = '91024';
        END IF;

        -- ADICIONADO (28-07-2026) - feature "Em breve": data_fim/data_inicio só
        -- congelam quando a campanha JÁ COMEÇOU de fato (data_inicio no passado),
        -- não no momento da aprovação. Enquanto a campanha está "Em breve"
        -- (aprovada, pública, mas com data_inicio no futuro - ver
        -- fn_valida_contribuicao_campanha_ativa), o pesquisador pode reagendar o
        -- início livremente (precisa de mais tempo de divulgação, por exemplo).
        -- meta/modelo/taxa/título/descrição continuam congelados desde a aprovação
        -- - só as datas ganharam esse período de carência.
        IF OLD.data_inicio IS NOT NULL AND OLD.data_inicio <= NOW() THEN
            IF NEW.data_fim IS DISTINCT FROM OLD.data_fim THEN
                RAISE EXCEPTION 'Operação bloqueada: o prazo da campanha não pode ser alterado depois que ela começa de verdade.'
                    USING ERRCODE = '91009';
            END IF;

            -- CORRIGIDO (regressão do B2): data_inicio tinha ficado de fora - dava pra
            -- recuar a data de início e mudar a duração da campanha pelo outro lado,
            -- sem nenhum bloqueio, mesmo com data_fim já congelado.
            IF NEW.data_inicio IS DISTINCT FROM OLD.data_inicio THEN
                RAISE EXCEPTION 'Operação bloqueada: a data de início da campanha não pode ser alterada depois que ela começa de verdade.'
                    USING ERRCODE = '91010';
            END IF;
        END IF;
    END IF;

    -- ADICIONADO (21-09-2026, ver REQUISITOS_V7): campanha REJEITADA que já usou
    -- todos os reenvios fica só para leitura, pra qualquer perfil, inclusive o
    -- Administrador. Bloqueia mudança de qualquer campo de CONTEÚDO; status,
    -- aprovado_em e id_admin ficam de fora porque quem decide essas mudanças é
    -- fn_valida_transicao_campanha (e o reenvio esgotado já é barrado lá, com
    -- ERRCODE 91025).
    IF OLD.status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(OLD.id_campanha) THEN
        IF NEW.titulo                    IS DISTINCT FROM OLD.titulo
           OR NEW.descricao              IS DISTINCT FROM OLD.descricao
           OR NEW.meta_financeira        IS DISTINCT FROM OLD.meta_financeira
           OR NEW.modelo                 IS DISTINCT FROM OLD.modelo
           OR NEW.data_inicio            IS DISTINCT FROM OLD.data_inicio
           OR NEW.data_fim               IS DISTINCT FROM OLD.data_fim
           OR NEW.id_area_conhecimento   IS DISTINCT FROM OLD.id_area_conhecimento
           OR NEW.video_apresentacao_url IS DISTINCT FROM OLD.video_apresentacao_url
        THEN
            RAISE EXCEPTION 'Esta campanha rejeitada já usou todos os reenvios permitidos e agora é somente leitura.'
                USING ERRCODE = '91027';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_congela_orcamento_campanha()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id_campanha INT := COALESCE(NEW.id_campanha, OLD.id_campanha);
    v_status      status_campanha;
BEGIN
    SELECT status INTO v_status FROM campanha WHERE id_campanha = v_id_campanha;

    IF public.fn_status_pos_aprovacao(v_status) THEN
        RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o orçamento após a aprovação da campanha.'
            USING ERRCODE = '91011';
    END IF;

    -- ADICIONADO (21-09-2026): rejeitada sem reenvios é só leitura, ver
    -- fn_campanha_reenvios_esgotados. Na exclusão da própria campanha (cascata,
    -- expirar_campanhas_rejeitadas) v_status vem NULL, porque a linha-pai já
    -- sumiu, e o bloqueio não se aplica - é o que deixa a expiração apagar.
    IF v_status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(v_id_campanha) THEN
        RAISE EXCEPTION 'Esta campanha rejeitada já usou todos os reenvios permitidos e agora é somente leitura.'
            USING ERRCODE = '91027';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_congela_marco_cronograma()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id_campanha INT := COALESCE(NEW.id_campanha, OLD.id_campanha);
    v_status      status_campanha;
    v_data_inicio TIMESTAMP;
BEGIN
    SELECT status, data_inicio INTO v_status, v_data_inicio FROM campanha WHERE id_campanha = v_id_campanha;

    IF public.fn_status_pos_aprovacao(v_status)
       AND v_data_inicio IS NOT NULL AND v_data_inicio <= NOW() THEN
        RAISE EXCEPTION 'Operação bloqueada: o cronograma não pode ser alterado depois que a campanha começa de verdade.'
            USING ERRCODE = '91013';
    END IF;

    -- ADICIONADO (21-09-2026): mesmo bloqueio de fn_congela_orcamento_campanha
    -- (ver comentário lá, inclusive sobre v_status NULL na cascata de exclusão).
    IF v_status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(v_id_campanha) THEN
        RAISE EXCEPTION 'Esta campanha rejeitada já usou todos os reenvios permitidos e agora é somente leitura.'
            USING ERRCODE = '91027';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_preenche_encerramento_campanha()
RETURNS TRIGGER AS $$
BEGIN
    IF public.fn_status_terminal(NEW.status)
       AND NOT public.fn_status_terminal(OLD.status)
       AND NEW.encerrado_em IS NULL THEN
        NEW.encerrado_em := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_valida_transicao_campanha()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status      IS NOT DISTINCT FROM OLD.status
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'aguardando_aprovacao' AND NEW.status = 'ativo'
       AND NEW.aprovado_em IS NOT NULL
       AND public.tem_permissao('campanha_aprovar') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND public.tem_permissao('campanha_rejeitar') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'ativo' AND NEW.status = 'encerrado'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND public.tem_permissao('solicitacao_encerramento_decidir') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'ativo'
       AND OLD.data_fim IS NOT NULL AND OLD.data_fim <= NOW()
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
       AND (
            (NEW.status = 'sucesso'      AND NEW.valor_bruto_arrecadado >= NEW.meta_financeira)
         OR (NEW.status = 'nao_atingido' AND NEW.valor_bruto_arrecadado <  NEW.meta_financeira)
       )
    THEN
        RETURN NEW;
    END IF;

    IF OLD.status IN ('rascunho', 'rejeitado') AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
       AND public.tem_permissao('campanha_editar') THEN
        RETURN NEW;
    END IF;

    IF NEW.id_usuario = public.id_usuario_atual()
       AND OLD.status IN ('rejeitado', 'rascunho') AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
    THEN
        IF NOT EXISTS (
            SELECT 1 FROM perfil_pesquisador pp
            WHERE pp.id_usuario = public.id_usuario_atual() AND pp.status_pesquisador = 'ativo'
        ) THEN
            RAISE EXCEPTION 'Pesquisador suspenso não pode enviar campanha para aprovação.'
                USING ERRCODE = '92009';
        END IF;

        IF OLD.status = 'rejeitado' THEN
            IF public.fn_campanha_reenvios_esgotados(OLD.id_campanha) THEN
                RAISE EXCEPTION 'Esta campanha já usou todos os reenvios permitidos e agora é somente leitura.'
                    USING ERRCODE = '91025';
            END IF;

            IF (SELECT s.prazo_reenvio_ate FROM public.fn_campanha_situacao_reenvio(OLD.id_campanha) s) <= NOW()
            THEN
                RAISE EXCEPTION 'O prazo para reenviar esta campanha rejeitada já venceu.'
                    USING ERRCODE = '91026';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND (
            (OLD.status = 'ativo'                AND NEW.status = 'encerrado_moderacao')
         OR (OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado')
       )
       AND EXISTS (
           SELECT 1 FROM perfil_pesquisador pp
           WHERE pp.id_usuario = NEW.id_usuario AND pp.status_pesquisador = 'suspenso'
       )
    THEN
        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND OLD.status = 'ativo' AND NEW.status = 'encerrado_moderacao'
       AND public.tem_permissao('campanha_encerrar_moderacao')
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status de campanha não autorizada (% -> %).', OLD.status, NEW.status
        USING ERRCODE = '92001';
END;
$$;

CREATE OR REPLACE FUNCTION public.expirar_campanhas_rejeitadas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expiradas INT;
BEGIN
    DELETE FROM campanha c
    WHERE c.status = 'rejeitado'
      AND (SELECT s.prazo_reenvio_ate FROM public.fn_campanha_situacao_reenvio(c.id_campanha) s) <= NOW()
      AND NOT EXISTS (SELECT 1 FROM denuncia d                 WHERE d.id_campanha_alvo = c.id_campanha)
      AND NOT EXISTS (SELECT 1 FROM contribuicao ct            WHERE ct.id_campanha     = c.id_campanha)
      AND NOT EXISTS (SELECT 1 FROM repasse r                  WHERE r.id_campanha      = c.id_campanha)
      AND NOT EXISTS (SELECT 1 FROM solicitacao_encerramento s WHERE s.id_campanha      = c.id_campanha);

    GET DIAGNOSTICS v_expiradas = ROW_COUNT;
    RETURN v_expiradas;
END;
$$;


-- ############################################################################
-- 24-09-2026 - GRUPO E: reenvio esgotado barra também quem tem campanha_editar (idempotente)
-- Achado ao vivo: um admin conseguia reenviar campanha rejeitada já somente leitura (91025).
-- Só CREATE OR REPLACE de uma função; a trigger existente continua apontando para ela. Cole DEPOIS do Grupo D.
-- ############################################################################

CREATE OR REPLACE FUNCTION public.fn_valida_transicao_campanha()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status      IS NOT DISTINCT FROM OLD.status
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'aguardando_aprovacao' AND NEW.status = 'ativo'
       AND NEW.aprovado_em IS NOT NULL
       AND public.tem_permissao('campanha_aprovar') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND public.tem_permissao('campanha_rejeitar') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'ativo' AND NEW.status = 'encerrado'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND public.tem_permissao('solicitacao_encerramento_decidir') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'ativo'
       AND OLD.data_fim IS NOT NULL AND OLD.data_fim <= NOW()
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
       AND (
            (NEW.status = 'sucesso'      AND NEW.valor_bruto_arrecadado >= NEW.meta_financeira)
         OR (NEW.status = 'nao_atingido' AND NEW.valor_bruto_arrecadado <  NEW.meta_financeira)
       )
    THEN
        RETURN NEW;
    END IF;

    -- Reenvio esgotado vale para QUALQUER perfil, inclusive quem tem campanha_editar (24-09-2026).
    IF OLD.status = 'rejeitado' AND NEW.status = 'aguardando_aprovacao'
       AND public.fn_campanha_reenvios_esgotados(OLD.id_campanha) THEN
        RAISE EXCEPTION 'Esta campanha já usou todos os reenvios permitidos e agora é somente leitura.'
            USING ERRCODE = '91025';
    END IF;

    IF OLD.status IN ('rascunho', 'rejeitado') AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
       AND public.tem_permissao('campanha_editar') THEN
        RETURN NEW;
    END IF;

    IF NEW.id_usuario = public.id_usuario_atual()
       AND OLD.status IN ('rejeitado', 'rascunho') AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
    THEN
        IF NOT EXISTS (
            SELECT 1 FROM perfil_pesquisador pp
            WHERE pp.id_usuario = public.id_usuario_atual() AND pp.status_pesquisador = 'ativo'
        ) THEN
            RAISE EXCEPTION 'Pesquisador suspenso não pode enviar campanha para aprovação.'
                USING ERRCODE = '92009';
        END IF;

        IF OLD.status = 'rejeitado' THEN
            IF (SELECT s.prazo_reenvio_ate FROM public.fn_campanha_situacao_reenvio(OLD.id_campanha) s) <= NOW()
            THEN
                RAISE EXCEPTION 'O prazo para reenviar esta campanha rejeitada já venceu.'
                    USING ERRCODE = '91026';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND (
            (OLD.status = 'ativo'                AND NEW.status = 'encerrado_moderacao')
         OR (OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado')
       )
       AND EXISTS (
           SELECT 1 FROM perfil_pesquisador pp
           WHERE pp.id_usuario = NEW.id_usuario AND pp.status_pesquisador = 'suspenso'
       )
    THEN
        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND OLD.status = 'ativo' AND NEW.status = 'encerrado_moderacao'
       AND public.tem_permissao('campanha_encerrar_moderacao')
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status de campanha não autorizada (% -> %).', OLD.status, NEW.status
        USING ERRCODE = '92001';
END;
$$;


-- ############################################################################
-- 24-09-2026 - GRUPO F: retenção do log de auditoria (idempotente)
-- Chave nova log_auditoria_retencao_dias (365), função limpar_log_auditoria() chamada por @Cron
-- diário no Nest, e o índice de data do log vira BRIN. Não altera nenhum registro existente;
-- o primeiro apagamento acontece quando o Nest novo subir e o job rodar. Cole DEPOIS do Grupo E.
-- ############################################################################

INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'log_auditoria_retencao_dias', '365', 'inteiro', 'Dias que o log de auditoria é guardado antes de ser apagado por job diário (0 = guardar para sempre)', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

CREATE OR REPLACE FUNCTION public.limpar_log_auditoria()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dias      INT;
    v_corte     TIMESTAMPTZ;
    v_apagadas  INT;
BEGIN
    v_dias := public.config_numero('log_auditoria_retencao_dias', 365)::INT;
    IF v_dias <= 0 THEN
        RETURN 0;
    END IF;

    v_corte := NOW() - (v_dias * INTERVAL '1 day');

    DELETE FROM log_auditoria WHERE ocorrido_em < v_corte;
    GET DIAGNOSTICS v_apagadas = ROW_COUNT;

    IF v_apagadas > 0 THEN
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_anteriores)
        VALUES ('log_auditoria', 'anteriores a ' || to_char(v_corte, 'YYYY-MM-DD'), 'DELETE', NULL,
                jsonb_build_object('quantidade', v_apagadas, 'dias_retencao', v_dias, 'corte', v_corte));
    END IF;

    RETURN v_apagadas;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.limpar_log_auditoria() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.limpar_log_auditoria() TO app_nestjs;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_log_auditoria_ocorrido'
                   AND indexdef ILIKE '%USING brin%') THEN
        DROP INDEX IF EXISTS public.idx_log_auditoria_ocorrido;
        CREATE INDEX idx_log_auditoria_ocorrido ON public.log_auditoria USING brin (ocorrido_em);
    END IF;
END;
$$;


-- ############################################################################
-- 24-09-2026 - GRUPO G: índices, chave global sem apagar/desativar, dashboard com score baixo,
-- recálculo de score mais estreito e seed coerente (idempotente). Cole DEPOIS do Grupo F.
-- Único bloco que muda dado: reativa chave global que estivesse desativada (a nova CHECK exige)
-- e ajusta a meta das campanhas 2 e 5 do seed. Só se estiverem exatamente como o seed as deixou.
-- ############################################################################

-- 1) Índices
DROP INDEX IF EXISTS public.idx_campanha_status;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_campanha_usuario'
                   AND indexdef LIKE '%(id_usuario, status)%') THEN
        DROP INDEX IF EXISTS public.idx_campanha_usuario;
        CREATE INDEX idx_campanha_usuario ON public.campanha(id_usuario, status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_comentario_pesquisador'
                   AND indexdef LIKE '%(id_pesquisador, criado_em)%') THEN
        DROP INDEX IF EXISTS public.idx_comentario_pesquisador;
        CREATE INDEX idx_comentario_pesquisador ON public.comentario(id_pesquisador, criado_em);
    END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS idx_historico_rejeicao_dono ON public.historico_rejeicao(id_usuario_dono);

-- 2) Chave global: não se apaga nem se desativa
UPDATE configuracoes SET ativo = TRUE WHERE id_usuario IS NULL AND ativo = FALSE;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_CONFIGURACOES_GLOBAL_ATIVA') THEN
        ALTER TABLE configuracoes ADD CONSTRAINT "CK_CONFIGURACOES_GLOBAL_ATIVA" CHECK (id_usuario IS NOT NULL OR ativo = TRUE);
    END IF;
END;
$$;
DROP POLICY IF EXISTS pol_config_delete ON configuracoes;
CREATE POLICY pol_config_delete ON configuracoes FOR DELETE TO app_nestjs USING (
    id_usuario = public.id_usuario_atual()
);

-- 3) Dashboard: nova coluna campanhas_para_revisao_score (muda o tipo de retorno, por isso o DROP)
DROP FUNCTION IF EXISTS public.contar_metricas_dashboard();
CREATE OR REPLACE FUNCTION public.contar_metricas_dashboard()
RETURNS TABLE (
    total_usuarios                 INT,
    total_pesquisadores            INT,
    total_papeis                   INT,
    total_permissoes                INT,
    total_configuracoes            INT,
    total_campanhas                INT,
    sessoes_ativas                  INT,
    campanhas_ativas                INT,
    campanhas_sucesso               INT,
    campanhas_nao_atingida          INT,
    campanhas_aguardando_aprovacao  INT,
    valor_total_arrecadado          DECIMAL(14,2),
    denuncias_pendentes             INT,
    campanhas_para_revisao_score    INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY SELECT
        (SELECT count(*)::INT FROM usuario WHERE deletado = FALSE),
        (SELECT count(DISTINCT up.id_usuario)::INT
           FROM usuario_papel up
           JOIN papel p ON p.id_papel = up.id_papel
          WHERE p.codigo = 'pesquisador'),
        (SELECT count(*)::INT FROM papel),
        (SELECT count(*)::INT FROM permissao),
        (SELECT count(*)::INT FROM configuracoes),
        (SELECT count(*)::INT FROM campanha),
        (SELECT count(*)::INT FROM sessao WHERE revogado_em IS NULL AND expira_em > now()),
        (SELECT count(*)::INT FROM campanha WHERE status = 'ativo'),
        (SELECT count(*)::INT FROM campanha WHERE status = 'sucesso'),
        (SELECT count(*)::INT FROM campanha WHERE status = 'nao_atingido'),
        (SELECT count(*)::INT FROM campanha WHERE status = 'aguardando_aprovacao'),
        (SELECT COALESCE(SUM(valor_bruto_arrecadado), 0)::DECIMAL(14,2) FROM campanha),
        (SELECT count(*)::INT FROM denuncia WHERE status = 'pendente'),
        (SELECT count(*)::INT FROM campanha c
          WHERE c.status = 'aguardando_aprovacao' AND public.fn_precisa_revisao_score(c.id_usuario));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.contar_metricas_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contar_metricas_dashboard() TO app_nestjs;

-- 4) Recálculo de score só quando o que o score usa muda
DROP TRIGGER IF EXISTS trg_campanha_recalcula_score ON campanha;
CREATE TRIGGER trg_campanha_recalcula_score
    AFTER INSERT ON campanha
    FOR EACH ROW WHEN (NEW.status <> 'rascunho')
    EXECUTE FUNCTION public.trg_recalcular_por_campanha();

DROP TRIGGER IF EXISTS trg_campanha_recalcula_score_delete ON campanha;
CREATE TRIGGER trg_campanha_recalcula_score_delete
    AFTER DELETE ON campanha
    FOR EACH ROW WHEN (OLD.status <> 'rascunho')
    EXECUTE FUNCTION public.trg_recalcular_por_campanha();

CREATE OR REPLACE FUNCTION public.trg_recalcular_por_atualizacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_id_usuario INT;
BEGIN
    -- 24-09-2026: o score só usa ativo e id_campanha; editar título ou texto não muda nada.
    IF TG_OP = 'UPDATE' AND NEW.ativo IS NOT DISTINCT FROM OLD.ativo
       AND NEW.id_campanha IS NOT DISTINCT FROM OLD.id_campanha THEN
        RETURN NULL;
    END IF;
    SELECT id_usuario INTO v_id_usuario FROM campanha
    WHERE id_campanha = COALESCE(NEW.id_campanha, OLD.id_campanha);
    IF v_id_usuario IS NOT NULL THEN
        PERFORM public.recalcular_score_pesquisador(v_id_usuario);
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalcular_por_link()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- 24-09-2026: o score só usa o TIPO do link e o dono; trocar a URL não muda nada.
    IF TG_OP = 'UPDATE' AND NEW.id_tipolink IS NOT DISTINCT FROM OLD.id_tipolink
       AND NEW.id_usuario IS NOT DISTINCT FROM OLD.id_usuario THEN
        RETURN NULL;
    END IF;
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalcular_score_pesquisador(OLD.id_usuario);
    ELSE
        PERFORM public.recalcular_score_pesquisador(NEW.id_usuario);
    END IF;
    RETURN NULL;
END;
$$;

-- 5) Seed: campanhas 2 e 5 (flexíveis) estavam "sucesso" abaixo da meta; a meta desce para o arrecadado
DO $$
BEGIN
    SET LOCAL session_replication_role = replica;
    UPDATE campanha SET meta_financeira = 28000.00
     WHERE id_campanha = 2 AND status = 'sucesso' AND meta_financeira = 35000.00 AND valor_bruto_arrecadado = 28500.00;
    UPDATE campanha SET meta_financeira = 22000.00
     WHERE id_campanha = 5 AND status = 'sucesso' AND meta_financeira = 30000.00 AND valor_bruto_arrecadado = 22000.00;
    SET LOCAL session_replication_role = origin;
END;
$$;

-- 6) Job de expirar rascunho: um rascunho com filho que impede o DELETE não derruba mais o lote
CREATE OR REPLACE FUNCTION public.expirar_campanhas_rascunho()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ttl_horas INT;
    v_expiradas INT;
    v_id        INT;
BEGIN
    -- Filtra por status, sem recalcular completude (a cópia da regra já divergiu
    -- uma vez). Ver DOCUMENTACAO_BD.md [05-K-2-B].
    v_ttl_horas := public.config_numero('campanha_rascunho_ttl_horas', 336);

    -- Linha a linha (24-09-2026): um rascunho que ainda tenha filho que impede o DELETE (ex.: solicitação de
    -- encerramento, que só um dado de teste cria) derrubava o lote inteiro toda hora. Só violação de chave
    -- estrangeira é engolida; qualquer outro erro continua aparecendo.
    v_expiradas := 0;
    FOR v_id IN
        SELECT c.id_campanha FROM campanha c
        WHERE c.status = 'rascunho'
          AND c.criado_em <= NOW() - (v_ttl_horas * INTERVAL '1 hour')
    LOOP
        BEGIN
            DELETE FROM campanha WHERE id_campanha = v_id AND status = 'rascunho';
            v_expiradas := v_expiradas + 1;
        EXCEPTION WHEN foreign_key_violation THEN
            NULL;
        END;
    END LOOP;

    RETURN v_expiradas;
END;
$$;


-- ############################################################################
-- 24-09-2026 - GRUPO H: policies com a permissão e o usuário calculados UMA vez por comando (idempotente)
-- tem_permissao(...) e id_usuario_atual() dentro de (SELECT ...) viram InitPlan: o Postgres avalia uma vez por
-- comando, e não uma vez por linha. Mesma regra, mesmos resultados (conferido: 420 comparações de quem vê o quê
-- e 186 de escrita, 0 diferenças). Recria as 121 policies de 04. Cole DEPOIS do Grupo G.
-- ############################################################################

DROP POLICY IF EXISTS pol_papel_select ON papel;
CREATE POLICY pol_papel_select ON papel FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_papel_update ON papel;
CREATE POLICY pol_papel_update ON papel FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('papel_gerenciar')));
DROP POLICY IF EXISTS pol_permissao_select ON permissao;
CREATE POLICY pol_permissao_select ON permissao FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_papelperm_select ON papel_permissao;
CREATE POLICY pol_papelperm_select ON papel_permissao FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_papelperm_insert ON papel_permissao;
CREATE POLICY pol_papelperm_insert ON papel_permissao FOR INSERT TO app_nestjs WITH CHECK (
    (SELECT public.tem_permissao('papel_gerenciar'))
);
DROP POLICY IF EXISTS pol_papelperm_delete ON papel_permissao;
CREATE POLICY pol_papelperm_delete ON papel_permissao FOR DELETE TO app_nestjs USING (
    (SELECT public.tem_permissao('papel_gerenciar'))
);
DROP POLICY IF EXISTS pol_config_select ON configuracoes;
CREATE POLICY pol_config_select ON configuracoes FOR SELECT TO app_nestjs USING (
    (id_usuario IS NULL AND (publica = TRUE OR (SELECT public.tem_permissao('configuracao_gerenciar'))))
    OR id_usuario = (SELECT public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_config_insert ON configuracoes;
CREATE POLICY pol_config_insert ON configuracoes FOR INSERT TO app_nestjs WITH CHECK (
    (id_usuario IS NULL AND (SELECT public.tem_permissao('configuracao_gerenciar')))
    OR id_usuario = (SELECT public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_config_update ON configuracoes;
CREATE POLICY pol_config_update ON configuracoes FOR UPDATE TO app_nestjs USING (
    (id_usuario IS NULL AND (SELECT public.tem_permissao('configuracao_gerenciar')))
    OR id_usuario = (SELECT public.id_usuario_atual())
) WITH CHECK (
    (id_usuario IS NULL AND (SELECT public.tem_permissao('configuracao_gerenciar')))
    OR id_usuario = (SELECT public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_config_delete ON configuracoes;
CREATE POLICY pol_config_delete ON configuracoes FOR DELETE TO app_nestjs USING (
    id_usuario = (SELECT public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_area_select ON area_conhecimento;
CREATE POLICY pol_area_select ON area_conhecimento FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_area_insert ON area_conhecimento;
CREATE POLICY pol_area_insert ON area_conhecimento FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('area_conhecimento_gerenciar')));
DROP POLICY IF EXISTS pol_area_update ON area_conhecimento;
CREATE POLICY pol_area_update ON area_conhecimento FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('area_conhecimento_gerenciar'))) WITH CHECK ((SELECT public.tem_permissao('area_conhecimento_gerenciar')));
DROP POLICY IF EXISTS pol_area_delete ON area_conhecimento;
CREATE POLICY pol_area_delete ON area_conhecimento FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('area_conhecimento_gerenciar')));
DROP POLICY IF EXISTS pol_tipolink_select ON tipo_link;
CREATE POLICY pol_tipolink_select ON tipo_link FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_tipolink_insert ON tipo_link;
CREATE POLICY pol_tipolink_insert ON tipo_link FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('tipolink_gerenciar')));
DROP POLICY IF EXISTS pol_tipolink_update ON tipo_link;
CREATE POLICY pol_tipolink_update ON tipo_link FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('tipolink_gerenciar'))) WITH CHECK ((SELECT public.tem_permissao('tipolink_gerenciar')));
DROP POLICY IF EXISTS pol_tipolink_delete ON tipo_link;
CREATE POLICY pol_tipolink_delete ON tipo_link FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('tipolink_gerenciar')));
DROP POLICY IF EXISTS pol_motivo_select ON motivo_denuncia;
CREATE POLICY pol_motivo_select ON motivo_denuncia FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_motivo_insert ON motivo_denuncia;
CREATE POLICY pol_motivo_insert ON motivo_denuncia FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('motivo_denuncia_gerenciar')));
DROP POLICY IF EXISTS pol_motivo_update ON motivo_denuncia;
CREATE POLICY pol_motivo_update ON motivo_denuncia FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('motivo_denuncia_gerenciar'))) WITH CHECK ((SELECT public.tem_permissao('motivo_denuncia_gerenciar')));
DROP POLICY IF EXISTS pol_motivo_delete ON motivo_denuncia;
CREATE POLICY pol_motivo_delete ON motivo_denuncia FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('motivo_denuncia_gerenciar')));
DROP POLICY IF EXISTS pol_arquivo_select ON arquivo;
CREATE POLICY pol_arquivo_select ON arquivo FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_arquivo_insert ON arquivo;
CREATE POLICY pol_arquivo_insert ON arquivo FOR INSERT TO app_nestjs WITH CHECK (TRUE);
DROP POLICY IF EXISTS pol_arquivo_update ON arquivo;
CREATE POLICY pol_arquivo_update ON arquivo FOR UPDATE TO app_nestjs USING (
    (SELECT public.tem_permissao('arquivo_gerenciar'))
    OR EXISTS (
        SELECT 1 FROM usuario u
        WHERE u.id_usuario = (SELECT public.id_usuario_atual())
          AND u.id_imagem_perfil = arquivo.id_arquivo
    )
    OR EXISTS (
        SELECT 1 FROM arquivo_atualizacao aa
        JOIN atualizacao_campanha ac ON ac.id_atualizacao = aa.id_atualizacao
        JOIN campanha c ON c.id_campanha = ac.id_campanha
        WHERE aa.id_arquivo = arquivo.id_arquivo
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
    OR EXISTS (
        SELECT 1 FROM arquivo_recompensa ar
        JOIN recompensa r ON r.id_recompensa = ar.id_recompensa
        JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE ar.id_arquivo = arquivo.id_arquivo
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);
DROP POLICY IF EXISTS pol_verificacao_email_all ON verificacao_email;
CREATE POLICY pol_verificacao_email_all ON verificacao_email
    FOR ALL TO app_nestjs USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pol_recuperacao_senha_all ON recuperacao_senha;
CREATE POLICY pol_recuperacao_senha_all ON recuperacao_senha
    FOR ALL TO app_nestjs USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pol_sessao_all ON sessao;
CREATE POLICY pol_sessao_all ON sessao
    FOR ALL TO app_nestjs USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pol_usuario_select ON usuario;
CREATE POLICY pol_usuario_select ON usuario FOR SELECT TO app_nestjs USING (deletado = FALSE OR (SELECT public.tem_permissao('usuario_visualizar_sensivel')));
DROP POLICY IF EXISTS pol_usuario_insert ON usuario;
CREATE POLICY pol_usuario_insert ON usuario FOR INSERT TO app_nestjs WITH CHECK (true);
DROP POLICY IF EXISTS pol_usuario_update ON usuario;
CREATE POLICY pol_usuario_update ON usuario FOR UPDATE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('usuario_suspender')));
DROP POLICY IF EXISTS pol_perfil_select ON perfil_pesquisador;
CREATE POLICY pol_perfil_select ON perfil_pesquisador FOR SELECT USING (public.usuario_visivel(id_usuario));
DROP POLICY IF EXISTS pol_perfil_insert ON perfil_pesquisador;
CREATE POLICY pol_perfil_insert ON perfil_pesquisador FOR INSERT TO app_nestjs WITH CHECK (
    id_usuario = (SELECT public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_perfil_update ON perfil_pesquisador;
CREATE POLICY pol_perfil_update ON perfil_pesquisador FOR UPDATE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_usuariopapel_select ON usuario_papel;
CREATE POLICY pol_usuariopapel_select ON usuario_papel FOR SELECT TO app_nestjs USING (true);
DROP POLICY IF EXISTS pol_usuariopapel_insert ON usuario_papel;
CREATE POLICY pol_usuariopapel_insert ON usuario_papel FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('papel_atribuir')));
DROP POLICY IF EXISTS pol_usuariopapel_delete ON usuario_papel;
CREATE POLICY pol_usuariopapel_delete ON usuario_papel FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('papel_gerenciar')));
DROP POLICY IF EXISTS pol_termos_select ON termos_de_uso;
CREATE POLICY pol_termos_select ON termos_de_uso FOR SELECT TO app_nestjs USING (true);
DROP POLICY IF EXISTS pol_termos_insert ON termos_de_uso;
CREATE POLICY pol_termos_insert ON termos_de_uso FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('termos_uso_gerenciar')));
DROP POLICY IF EXISTS pol_termos_update ON termos_de_uso;
CREATE POLICY pol_termos_update ON termos_de_uso FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('termos_uso_gerenciar')));
DROP POLICY IF EXISTS pol_termos_delete ON termos_de_uso;
CREATE POLICY pol_termos_delete ON termos_de_uso FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('termos_uso_gerenciar')));
DROP POLICY IF EXISTS pol_usuario_termo_select ON usuario_termo;
CREATE POLICY pol_usuario_termo_select ON usuario_termo FOR SELECT TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('usuario_visualizar_sensivel')));
DROP POLICY IF EXISTS pol_usuario_termo_insert ON usuario_termo;
CREATE POLICY pol_usuario_termo_insert ON usuario_termo FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_notificacao_select ON notificacao;
CREATE POLICY pol_notificacao_select ON notificacao FOR SELECT TO app_nestjs USING (
    id_usuario = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('usuario_visualizar_sensivel'))
    OR (SELECT public.tem_permissao('notificacao_processar'))
);
DROP POLICY IF EXISTS pol_notificacao_insert ON notificacao;
CREATE POLICY pol_notificacao_insert ON notificacao FOR INSERT TO app_nestjs WITH CHECK (true);
DROP POLICY IF EXISTS pol_notificacao_update ON notificacao;
CREATE POLICY pol_notificacao_update ON notificacao FOR UPDATE TO app_nestjs USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pol_seg_pesq_select ON seguir_pesquisador;
CREATE POLICY pol_seg_pesq_select ON seguir_pesquisador FOR SELECT TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_seg_pesq_insert ON seguir_pesquisador;
CREATE POLICY pol_seg_pesq_insert ON seguir_pesquisador FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_seg_pesq_delete ON seguir_pesquisador;
CREATE POLICY pol_seg_pesq_delete ON seguir_pesquisador FOR DELETE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_campanha_select ON campanha;
CREATE POLICY pol_campanha_select ON campanha FOR SELECT USING (
    status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
    OR id_usuario = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('relatorio_visualizar'))
);
DROP POLICY IF EXISTS pol_campanha_insert ON campanha;
CREATE POLICY pol_campanha_insert ON campanha FOR INSERT TO app_nestjs WITH CHECK (
    id_usuario = (SELECT public.id_usuario_atual())
    AND EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = (SELECT public.id_usuario_atual()) AND status_pesquisador = 'ativo')
);
DROP POLICY IF EXISTS pol_campanha_update ON campanha;
CREATE POLICY pol_campanha_update ON campanha FOR UPDATE TO app_nestjs USING (
    id_usuario = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('campanha_editar'))
    OR (SELECT public.tem_permissao('campanha_aprovar'))
    OR (SELECT public.tem_permissao('campanha_rejeitar'))
);
DROP POLICY IF EXISTS pol_campanha_delete ON campanha;
CREATE POLICY pol_campanha_delete ON campanha FOR DELETE TO app_nestjs USING (
    status = 'rascunho'
    AND (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
);
DROP POLICY IF EXISTS pol_atualizacao_select ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_select ON atualizacao_campanha FOR SELECT USING (
    ativo = TRUE
    OR EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar'))))
);
DROP POLICY IF EXISTS pol_atualizacao_insert ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_insert ON atualizacao_campanha FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    AND EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = (SELECT public.id_usuario_atual()) AND status_pesquisador = 'ativo')
);
DROP POLICY IF EXISTS pol_atualizacao_update ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_update ON atualizacao_campanha FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('atualizacao_moderar'))
);
DROP POLICY IF EXISTS pol_orcamento_campanha_select ON orcamento_campanha;
CREATE POLICY pol_orcamento_campanha_select ON orcamento_campanha FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = orcamento_campanha.id_campanha
          AND (
              status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
              OR id_usuario = (SELECT public.id_usuario_atual())
              OR (SELECT public.tem_permissao('relatorio_visualizar'))
          )
    )
);
DROP POLICY IF EXISTS pol_orcamento_campanha_insert ON orcamento_campanha;
CREATE POLICY pol_orcamento_campanha_insert ON orcamento_campanha FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = orcamento_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_orcamento_campanha_update ON orcamento_campanha;
CREATE POLICY pol_orcamento_campanha_update ON orcamento_campanha FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = orcamento_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_orcamento_campanha_delete ON orcamento_campanha;
CREATE POLICY pol_orcamento_campanha_delete ON orcamento_campanha FOR DELETE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = orcamento_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_marco_cronograma_select ON marco_cronograma;
CREATE POLICY pol_marco_cronograma_select ON marco_cronograma FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = marco_cronograma.id_campanha
          AND (
              status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
              OR id_usuario = (SELECT public.id_usuario_atual())
              OR (SELECT public.tem_permissao('relatorio_visualizar'))
          )
    )
);
DROP POLICY IF EXISTS pol_marco_cronograma_insert ON marco_cronograma;
CREATE POLICY pol_marco_cronograma_insert ON marco_cronograma FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = marco_cronograma.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_marco_cronograma_update ON marco_cronograma;
CREATE POLICY pol_marco_cronograma_update ON marco_cronograma FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = marco_cronograma.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_marco_cronograma_delete ON marco_cronograma;
CREATE POLICY pol_marco_cronograma_delete ON marco_cronograma FOR DELETE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = marco_cronograma.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_comentario_select ON comentario;
CREATE POLICY pol_comentario_select ON comentario FOR SELECT USING (
    (ativo = TRUE AND endossado = TRUE)
    OR id_pesquisador = (SELECT public.id_usuario_atual())
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('comentario_moderar')))
    )
);
DROP POLICY IF EXISTS pol_comentario_insert ON comentario;
CREATE POLICY pol_comentario_insert ON comentario FOR INSERT TO app_nestjs WITH CHECK (
    id_pesquisador = (SELECT public.id_usuario_atual())
    AND EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = (SELECT public.id_usuario_atual()) AND status_pesquisador = 'ativo')
);
DROP POLICY IF EXISTS pol_comentario_update ON comentario;
CREATE POLICY pol_comentario_update ON comentario FOR UPDATE TO app_nestjs USING (
    id_pesquisador = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('comentario_moderar'))
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND id_usuario = (SELECT public.id_usuario_atual())
    )
) WITH CHECK (
    id_pesquisador = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('comentario_moderar'))
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND id_usuario = (SELECT public.id_usuario_atual())
    )
);
DROP POLICY IF EXISTS pol_denuncia_select ON denuncia;
CREATE POLICY pol_denuncia_select ON denuncia FOR SELECT TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('denuncia_responder')));
DROP POLICY IF EXISTS pol_denuncia_insert ON denuncia;
CREATE POLICY pol_denuncia_insert ON denuncia FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_denuncia_update ON denuncia;
CREATE POLICY pol_denuncia_update ON denuncia FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('denuncia_responder')));
DROP POLICY IF EXISTS pol_recompensa_select ON recompensa;
CREATE POLICY pol_recompensa_select ON recompensa FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_recompensa_insert ON recompensa;
CREATE POLICY pol_recompensa_insert ON recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = recompensa.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
);
DROP POLICY IF EXISTS pol_recompensa_update ON recompensa;
CREATE POLICY pol_recompensa_update ON recompensa FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = recompensa.id_campanha AND (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar'))))
);
DROP POLICY IF EXISTS pol_seg_campanha_select ON seguir_campanha;
CREATE POLICY pol_seg_campanha_select ON seguir_campanha FOR SELECT TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_seg_campanha_insert ON seguir_campanha;
CREATE POLICY pol_seg_campanha_insert ON seguir_campanha FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_seg_campanha_delete ON seguir_campanha;
CREATE POLICY pol_seg_campanha_delete ON seguir_campanha FOR DELETE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_solicitacao_select ON solicitacao_encerramento;
CREATE POLICY pol_solicitacao_select ON solicitacao_encerramento FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('solicitacao_encerramento_decidir')) OR EXISTS (
        SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = (SELECT public.id_usuario_atual())
    )
);
DROP POLICY IF EXISTS pol_solicitacao_insert ON solicitacao_encerramento;
CREATE POLICY pol_solicitacao_insert ON solicitacao_encerramento FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
);
DROP POLICY IF EXISTS pol_solicitacao_update ON solicitacao_encerramento;
CREATE POLICY pol_solicitacao_update ON solicitacao_encerramento FOR UPDATE TO app_nestjs USING (
    (SELECT public.tem_permissao('solicitacao_encerramento_decidir'))
    OR EXISTS (SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
);
DROP POLICY IF EXISTS pol_historicorej_select ON historico_rejeicao;
CREATE POLICY pol_historicorej_select ON historico_rejeicao FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('campanha_rejeitar'))
    OR id_usuario_dono = (SELECT public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_historicorej_insert ON historico_rejeicao;
CREATE POLICY pol_historicorej_insert ON historico_rejeicao FOR INSERT TO app_nestjs WITH CHECK (true);
DROP POLICY IF EXISTS pol_historicorej_update ON historico_rejeicao;

-- [04-E-7] repasse: por que existem policies de escrita (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_repasse_insert ON repasse;
CREATE POLICY pol_repasse_insert ON repasse FOR INSERT TO app_nestjs WITH CHECK (true);
DROP POLICY IF EXISTS pol_repasse_update ON repasse;
CREATE POLICY pol_repasse_update ON repasse FOR UPDATE TO app_nestjs USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pol_repasse_select ON repasse;
CREATE POLICY pol_repasse_select ON repasse FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('repasse_aprovar')) OR EXISTS (
        SELECT 1 FROM campanha WHERE id_campanha = repasse.id_campanha AND id_usuario = (SELECT public.id_usuario_atual())
    )
);
DROP POLICY IF EXISTS pol_link_select ON link_academico;
CREATE POLICY pol_link_select ON link_academico FOR SELECT USING (public.usuario_visivel(id_usuario));
DROP POLICY IF EXISTS pol_link_insert ON link_academico;
CREATE POLICY pol_link_insert ON link_academico FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('link_academico_gerenciar')));
DROP POLICY IF EXISTS pol_link_update ON link_academico;
CREATE POLICY pol_link_update ON link_academico FOR UPDATE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('link_academico_gerenciar'))) WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('link_academico_gerenciar')));
DROP POLICY IF EXISTS pol_link_delete ON link_academico;
CREATE POLICY pol_link_delete ON link_academico FOR DELETE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('link_academico_gerenciar')));
DROP POLICY IF EXISTS pol_link_atualizacao_select ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_select ON link_atualizacao FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_link_atualizacao_insert ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_insert ON link_atualizacao FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);
DROP POLICY IF EXISTS pol_link_atualizacao_update ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_update ON link_atualizacao FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);
DROP POLICY IF EXISTS pol_link_atualizacao_delete ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_delete ON link_atualizacao FOR DELETE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);
DROP POLICY IF EXISTS pol_link_recompensa_select ON link_recompensa;
CREATE POLICY pol_link_recompensa_select ON link_recompensa FOR SELECT TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
    OR EXISTS (
        SELECT 1 FROM contribuicao_recompensa cr JOIN contribuicao co ON co.id_contribuicao = cr.id_contribuicao
        WHERE cr.id_recompensa = link_recompensa.id_recompensa
          AND co.id_usuario = (SELECT public.id_usuario_atual())
    )
);
DROP POLICY IF EXISTS pol_link_recompensa_insert ON link_recompensa;
CREATE POLICY pol_link_recompensa_insert ON link_recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);
DROP POLICY IF EXISTS pol_link_recompensa_update ON link_recompensa;
CREATE POLICY pol_link_recompensa_update ON link_recompensa FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);
DROP POLICY IF EXISTS pol_link_recompensa_delete ON link_recompensa;
CREATE POLICY pol_link_recompensa_delete ON link_recompensa FOR DELETE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);
DROP POLICY IF EXISTS pol_arqatu_select ON arquivo_atualizacao;
CREATE POLICY pol_arqatu_select ON arquivo_atualizacao FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_arqatu_insert ON arquivo_atualizacao;
CREATE POLICY pol_arqatu_insert ON arquivo_atualizacao FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha ac
        JOIN campanha c ON c.id_campanha = ac.id_campanha
        WHERE ac.id_atualizacao = arquivo_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);
DROP POLICY IF EXISTS pol_arqatu_update ON arquivo_atualizacao;
CREATE POLICY pol_arqatu_update ON arquivo_atualizacao FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha ac
        JOIN campanha c ON c.id_campanha = ac.id_campanha
        WHERE ac.id_atualizacao = arquivo_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);
DROP POLICY IF EXISTS pol_arqrecompensa_select ON arquivo_recompensa;
CREATE POLICY pol_arqrecompensa_select ON arquivo_recompensa FOR SELECT TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
    OR EXISTS (
        SELECT 1 FROM contribuicao_recompensa cr JOIN contribuicao co ON co.id_contribuicao = cr.id_contribuicao
        WHERE cr.id_recompensa = arquivo_recompensa.id_recompensa
          AND co.id_usuario = (SELECT public.id_usuario_atual())
    )
);
DROP POLICY IF EXISTS pol_arqrecompensa_insert ON arquivo_recompensa;
CREATE POLICY pol_arqrecompensa_insert ON arquivo_recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);
DROP POLICY IF EXISTS pol_arqrecompensa_update ON arquivo_recompensa;
CREATE POLICY pol_arqrecompensa_update ON arquivo_recompensa FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);
DROP POLICY IF EXISTS pol_contribuicao_select ON contribuicao;
CREATE POLICY pol_contribuicao_select ON contribuicao FOR SELECT TO app_nestjs USING (
    id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('contribuicao_visualizar_sensivel'))
);
DROP POLICY IF EXISTS pol_contribuicao_anon_select ON contribuicao;
CREATE POLICY pol_contribuicao_anon_select ON contribuicao FOR SELECT TO app_nestjs USING (
    id_usuario IS NULL
    AND token_sessao::text = current_setting('app.token_sessao_atual', true)
);
DROP POLICY IF EXISTS pol_contribuicao_insert ON contribuicao;
CREATE POLICY pol_contribuicao_insert ON contribuicao FOR INSERT TO app_nestjs WITH CHECK (
    id_usuario IS NULL OR id_usuario = (SELECT public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_contribuicao_update ON contribuicao;
CREATE POLICY pol_contribuicao_update ON contribuicao FOR UPDATE TO app_nestjs USING (
    true
);
DROP POLICY IF EXISTS pol_auditoria_select ON auditoria_financeira;
CREATE POLICY pol_auditoria_select ON auditoria_financeira FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('auditoria_financeira_visualizar')) OR EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = auditoria_financeira.id_contribuicao
          AND c.id_usuario = (SELECT public.id_usuario_atual())
    )
);
DROP POLICY IF EXISTS pol_auditoria_insert ON auditoria_financeira;
CREATE POLICY pol_auditoria_insert ON auditoria_financeira FOR INSERT TO app_nestjs WITH CHECK (true);
DROP POLICY IF EXISTS pol_auditoria_update ON auditoria_financeira;
CREATE POLICY pol_auditoria_update ON auditoria_financeira FOR UPDATE TO app_nestjs USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pol_contrib_recompensa_select ON contribuicao_recompensa;
CREATE POLICY pol_contrib_recompensa_select ON contribuicao_recompensa FOR SELECT TO app_nestjs USING (
    EXISTS (SELECT 1 FROM contribuicao WHERE id_contribuicao = contribuicao_recompensa.id_contribuicao AND id_usuario = (SELECT public.id_usuario_atual()))
    OR EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = contribuicao_recompensa.id_recompensa AND c.id_usuario = (SELECT public.id_usuario_atual())
    )
    OR (SELECT public.tem_permissao('contribuicao_visualizar_sensivel'))
);
DROP POLICY IF EXISTS pol_contrib_recompensa_insert ON contribuicao_recompensa;
CREATE POLICY pol_contrib_recompensa_insert ON contribuicao_recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM contribuicao WHERE id_contribuicao = contribuicao_recompensa.id_contribuicao AND id_usuario = (SELECT public.id_usuario_atual()))
);
DROP POLICY IF EXISTS pol_aceite_termo_contribuicao_select ON aceite_termo_contribuicao;
CREATE POLICY pol_aceite_termo_contribuicao_select ON aceite_termo_contribuicao FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('contribuicao_visualizar_sensivel')) OR EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = aceite_termo_contribuicao.id_contribuicao
          AND (
              c.id_usuario = (SELECT public.id_usuario_atual())
              OR (
                  c.id_usuario IS NULL
                  AND c.token_sessao::text = current_setting('app.token_sessao_atual', true)
              )
          )
    )
);
DROP POLICY IF EXISTS pol_aceite_termo_contribuicao_insert ON aceite_termo_contribuicao;
CREATE POLICY pol_aceite_termo_contribuicao_insert ON aceite_termo_contribuicao FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = aceite_termo_contribuicao.id_contribuicao
          AND (c.id_usuario IS NULL OR c.id_usuario = (SELECT public.id_usuario_atual()))
    )
);
DROP POLICY IF EXISTS pol_score_select ON score_pesquisador;
CREATE POLICY pol_score_select ON score_pesquisador FOR SELECT TO app_nestjs USING (
    public.usuario_visivel(id_usuario)
);
DROP POLICY IF EXISTS pol_score_config_select ON public.score_config;
CREATE POLICY pol_score_config_select ON public.score_config FOR SELECT TO app_nestjs USING (true);
DROP POLICY IF EXISTS pol_score_config_insert ON public.score_config;
CREATE POLICY pol_score_config_insert ON public.score_config FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('score_editar')));
DROP POLICY IF EXISTS pol_score_config_update ON public.score_config;
CREATE POLICY pol_score_config_update ON public.score_config FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('score_editar')));
DROP POLICY IF EXISTS pol_score_rotulo_select ON public.score_rotulo;
CREATE POLICY pol_score_rotulo_select ON public.score_rotulo FOR SELECT TO app_nestjs USING (true);
DROP POLICY IF EXISTS pol_score_rotulo_insert ON public.score_rotulo;
CREATE POLICY pol_score_rotulo_insert ON public.score_rotulo FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('score_editar')));
DROP POLICY IF EXISTS pol_score_rotulo_update ON public.score_rotulo;
CREATE POLICY pol_score_rotulo_update ON public.score_rotulo FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('score_editar')));
DROP POLICY IF EXISTS pol_log_auditoria_select ON public.log_auditoria;
CREATE POLICY pol_log_auditoria_select ON public.log_auditoria FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('log_visualizar')) OR id_usuario_responsavel = (SELECT public.id_usuario_atual())
);
