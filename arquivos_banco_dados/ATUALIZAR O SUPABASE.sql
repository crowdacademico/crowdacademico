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
