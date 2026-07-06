-- ============================================================
--  CrowdAcadêmico — 06: MOTOR DE CÁLCULO DE SCORE E TRIGGERS
--  Depende de: 01_extensoes_enums_tabelas.sql, 05_grants.sql
--  (as funções aqui não dependem de dados, só de tabelas/colunas;
--   mas o GRANT EXECUTE que libera a RPC pro app já foi feito no
--   arquivo 05, por isso ele deve rodar antes)
--  Próximo arquivo: 07_seed_dados.sql
--
--  NOTA DE REORGANIZAÇÃO: a constraint UNIQUE defensiva e o seed
--  das constantes de "configuracoes" que originalmente estavam no
--  meio deste bloco (em artificios.sql) foram movidos para
--  01_extensoes_enums_tabelas.sql e 07_seed_dados.sql, respectivamente,
--  para manter este arquivo só com lógica (funções e triggers).
-- ============================================================

-- ============================================================
--  CrowdAcadêmico — MOTOR DE CÁLCULO DO SCORE (real, no banco)
--  Implementa as fórmulas de Score_Serasa_Pesquisador.docx
--
--  POR QUE ISSO ESTAVA DANDO NaN / valores falsos:
--  perfil_pesquisador.score_atual e score_pesquisador.pontos_obtidos
--  eram só valores fixos digitados no seed — nada no app realmente
--  calculava o score a partir de campanha/denuncia/link_academico/perfil.
--  5 dos 7 pesquisadores nem tinham linha em score_pesquisador.
--  No app, screens/07-DetalhesPontuacao.tsx lia dimensions.perfil /
--  .historico / .entrega / .engajamento (campos que não existem no
--  tipo DimensoesScore real — que só tem perfil_academico,
--  historico_plataforma, atualizacao_campanha, reputacao_comunidade),
--  então toda conta vinha undefined * peso = NaN.
--
--  ESTRATÉGIA:
--  Calcular tudo dentro do banco (não no app), e manter o resultado
--  em cache em perfil_pesquisador.score_atual / score_pesquisador,
--  atualizado automaticamente por TRIGGER sempre que campanha,
--  denuncia, atualizacao_campanha, link_academico, perfil_pesquisador
--  ou score_config mudarem — assim funciona pra QUALQUER registro novo,
--  sem precisar lembrar de chamar nada no app.
--
--  Todos os pesos vêm de score_config.peso (não há nenhum número
--  "mágico" fixo no código) — editar o peso no Painel Admin já
--  recalcula o score de todo mundo automaticamente.
-- ============================================================



-- ============================================================
-- (constraint defensiva e seed de constantes de configuracoes
--  movidos para 01_extensoes_enums_tabelas.sql e 07_seed_dados.sql)
-- ============================================================


-- Helper: lê uma constante numérica de configuracoes com fallback seguro
-- (nunca retorna NULL/erro mesmo se a chave não existir ainda — evita NaN)
CREATE OR REPLACE FUNCTION public.config_numero(p_chave TEXT, p_padrao DECIMAL)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT valor::DECIMAL FROM configuracoes WHERE chave = p_chave AND ativo = TRUE LIMIT 1),
        p_padrao
    );
$$;


-- ============================================================
-- 3. DIMENSÃO 1 — Perfil Acadêmico Declarado
--    +lattes +orcid +linkedin/site +instituição +título
--    Pesos vêm de score_config (subitens do pai 'perfil_academico').
-- ============================================================
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

    SELECT COALESCE(peso,0) INTO v_peso_lattes FROM score_config WHERE id_pai = v_id_pai AND nome = 'lattes'      AND ativo = TRUE;
    SELECT COALESCE(peso,0) INTO v_peso_orcid  FROM score_config WHERE id_pai = v_id_pai AND nome = 'orcid'       AND ativo = TRUE;
    SELECT COALESCE(peso,0) INTO v_peso_site   FROM score_config WHERE id_pai = v_id_pai AND nome = 'linkedin'    AND ativo = TRUE;
    SELECT COALESCE(peso,0) INTO v_peso_inst   FROM score_config WHERE id_pai = v_id_pai AND nome = 'instituicao' AND ativo = TRUE;
    SELECT COALESCE(peso,0) INTO v_peso_titulo FROM score_config WHERE id_pai = v_id_pai AND nome = 'titulo'      AND ativo = TRUE;

    IF EXISTS (SELECT 1 FROM link_academico la JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
               WHERE la.id_usuario = p_id_usuario AND tl.nome ILIKE '%lattes%') THEN
        v_total := v_total + v_peso_lattes;
    END IF;

    IF EXISTS (SELECT 1 FROM link_academico la JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
               WHERE la.id_usuario = p_id_usuario AND tl.nome ILIKE '%orcid%') THEN
        v_total := v_total + v_peso_orcid;
    END IF;

    IF EXISTS (SELECT 1 FROM link_academico la JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
               WHERE la.id_usuario = p_id_usuario AND 
                     (tl.nome ILIKE '%linkedin%' OR tl.nome ILIKE '%researchgate%' OR 
                      tl.nome ILIKE '%academia%' OR tl.nome ILIKE '%scholar%' OR tl.nome ILIKE '%site%')) THEN
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


-- ============================================================
-- 4. DIMENSÃO 2 — Histórico na Plataforma
--    conclusao = (concluidasComSucesso / totalEncerradas) * peso_conclusao
--    aprovacao = (aprovadasPelaModeracao / totalSubmetidas) * peso_aprovacao
--    - penalidade_abandono * abandonadas - penalidade_sem_justificativa * naoAtingidasSemJustificativa
--
--    Mapeamento pros dados reais (documentado por não haver status
--    "abandonada" explícito no enum status_campanha):
--      totalEncerradas        = status IN ('sucesso','nao_atingido','rejeitado','encerrado')
--      concluidasComSucesso   = status IN ('sucesso','encerrado')
--      totalSubmetidas        = TODAS as campanhas já criadas
--      aprovadasPelaModeracao = aprovado_em IS NOT NULL
--      abandonada              = status='nao_atingido' e NUNCA pediu encerramento
--      sem justificativa       = status='nao_atingido', pediu encerramento, mas sem justificativa
-- ============================================================
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

    SELECT COALESCE(peso,0) INTO v_peso_conclusao FROM score_config WHERE id_pai = v_id_pai AND nome = 'campanhas_concluidas' AND ativo = TRUE;
    SELECT COALESCE(peso,0) INTO v_peso_aprovacao FROM score_config WHERE id_pai = v_id_pai AND nome = 'taxa_aprovacao'       AND ativo = TRUE;

    v_penalidade_abandono := public.config_numero('score_penalidade_abandono', 3);
    v_penalidade_sem_just := public.config_numero('score_penalidade_sem_justificativa', 2);

    SELECT count(*) INTO v_total_submetidas FROM campanha WHERE id_usuario = p_id_usuario;
    SELECT count(*) INTO v_aprovadas FROM campanha WHERE id_usuario = p_id_usuario AND aprovado_em IS NOT NULL;
    SELECT count(*) INTO v_total_encerradas FROM campanha WHERE id_usuario = p_id_usuario 
        AND status IN ('sucesso','nao_atingido','rejeitado','encerrado');
    SELECT count(*) INTO v_concluidas_sucesso FROM campanha WHERE id_usuario = p_id_usuario 
        AND status IN ('sucesso','encerrado');

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


-- ============================================================
-- 5. DIMENSÃO 3 — Atualização da Campanha
--    regularidade = SUM(realizadas)/SUM(esperadas) * peso_regularidade
--    tempestividade = (% de campanhas em que realizadas >= esperadas) * peso_tempestividade
--    Considera campanhas que já começaram (ativo/sucesso/nao_atingido/encerrado).
--    atualizacoesEsperadas = duracaoEmMeses * frequencia_esperada_mensal (configurável)
-- ============================================================
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

    SELECT COALESCE(peso,0) INTO v_peso_regularidade   FROM score_config WHERE id_pai = v_id_pai AND nome = 'regularidade_atualizacoes'   AND ativo = TRUE;
    SELECT COALESCE(peso,0) INTO v_peso_tempestividade FROM score_config WHERE id_pai = v_id_pai AND nome = 'tempestividade_atualizacoes' AND ativo = TRUE;

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
        WHERE id_campanha = rec.id_campanha;

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


-- ============================================================
-- 6. DIMENSÃO 4 — Reputação da Comunidade
--    reputacaoScore = peso_raiz - totalDenuncias*custo - totalProcedentes*custo_procedente
-- ============================================================
CREATE OR REPLACE FUNCTION public.calcular_score_reputacao(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_peso_raiz         DECIMAL;
    v_total_denuncias   INT := 0;
    v_total_procedentes INT := 0;
    v_custo             DECIMAL;
    v_custo_procedente  DECIMAL;
    v_total             DECIMAL;
BEGIN
    SELECT peso INTO v_peso_raiz FROM score_config WHERE nome = 'reputacao_comunidade' AND ativo = TRUE;
    IF v_peso_raiz IS NULL THEN RETURN 0; END IF;

    v_custo            := public.config_numero('score_custo_denuncia', 1);
    v_custo_procedente := public.config_numero('score_custo_denuncia_procedente', 3);

    SELECT count(*) INTO v_total_denuncias   FROM denuncia WHERE id_pesquisador_alvo = p_id_usuario;
    SELECT count(*) INTO v_total_procedentes FROM denuncia WHERE id_pesquisador_alvo = p_id_usuario AND status = 'resolvida';

    v_total := v_peso_raiz - (v_total_denuncias * v_custo) - (v_total_procedentes * v_custo_procedente);

    RETURN ROUND(LEAST(GREATEST(v_total, 0), v_peso_raiz))::INTEGER;
END;
$$;


-- ============================================================
-- 7. ORQUESTRADOR — recalcula as 4 dimensões de um pesquisador,
--    grava em score_pesquisador (UPSERT) e atualiza o cache em
--    perfil_pesquisador.score_atual. SECURITY DEFINER: precisa
--    poder escrever no perfil de QUALQUER pesquisador (ex: quando
--    um admin resolve uma denúncia contra outra pessoa), não só
--    no perfil de quem disparou a ação.
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalcular_score_pesquisador(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_perfil      INTEGER;
    v_historico   INTEGER;
    v_atualizacao INTEGER;
    v_reputacao   INTEGER;
    v_total       INTEGER;
    v_id_rotulo   INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = p_id_usuario) THEN
        RETURN NULL;
    END IF;

    v_perfil      := public.calcular_score_perfil_academico(p_id_usuario);
    v_historico   := public.calcular_score_historico(p_id_usuario);
    v_atualizacao := public.calcular_score_atualizacao(p_id_usuario);
    v_reputacao   := public.calcular_score_reputacao(p_id_usuario);
    
    v_total := v_perfil + v_historico + v_atualizacao + v_reputacao;

    SELECT id_rotulo INTO v_id_rotulo
    FROM score_rotulo
    WHERE v_total >= score_minimo AND v_total <= score_maximo AND ativo = TRUE
    LIMIT 1;

    INSERT INTO score_pesquisador (id_usuario, id_score_config, id_rotulo, pontos_obtidos, score_total, calculado_em, motivo)
    SELECT p_id_usuario, sc.id_score_config, v_id_rotulo, v.pontos, v_total, NOW(), 'recalculo_automatico'
    FROM score_config sc
    JOIN (VALUES
        ('perfil_academico',     v_perfil),
        ('historico_plataforma', v_historico),
        ('atualizacao_campanha', v_atualizacao),
        ('reputacao_comunidade', v_reputacao)
    ) AS v(nome, pontos) ON v.nome = sc.nome
    WHERE sc.id_pai IS NULL AND sc.ativo = TRUE
    ON CONFLICT (id_usuario, id_score_config)
    DO UPDATE SET
        pontos_obtidos = EXCLUDED.pontos_obtidos,
        id_rotulo      = EXCLUDED.id_rotulo,
        score_total    = EXCLUDED.score_total,
        calculado_em   = EXCLUDED.calculado_em,
        motivo         = EXCLUDED.motivo;

    UPDATE perfil_pesquisador
    SET score_atual = v_total,
        score_atualizado_em = NOW()
    WHERE id_usuario = p_id_usuario;

    RETURN v_total;
END;
$$;

-- Recalcula TODOS os pesquisadores de uma vez (botão "Recalcular" no admin,
-- ou pra rodar uma vez depois de mudar pesos/constantes em massa)
CREATE OR REPLACE FUNCTION public.recalcular_todos_os_scores()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id INT;
    v_count INT := 0;
BEGIN
    FOR v_id IN SELECT id_usuario FROM perfil_pesquisador LOOP
        PERFORM public.recalcular_score_pesquisador(v_id);
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

-- ============================================================
-- 8. TRIGGERS — recalcula automaticamente quando os dados que
--    alimentam o score mudam. Isso é o que torna o sistema
--    "flexível pra novos registros": ninguém no app precisa lembrar
--    de chamar recalcular_score_pesquisador depois de inserir uma
--    campanha, denúncia, atualização, link ou editar o perfil.
-- ============================================================

-- campanha → afeta histórico e atualização (id_usuario é o dono)
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_campanha()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalcular_score_pesquisador(OLD.id_usuario);
    ELSE
        PERFORM public.recalcular_score_pesquisador(NEW.id_usuario);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_campanha_recalcula_score ON campanha;
CREATE TRIGGER trg_campanha_recalcula_score
    AFTER INSERT OR UPDATE OR DELETE ON campanha
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_campanha();

-- denuncia → afeta reputação (id_pesquisador_alvo é quem foi denunciado)
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_denuncia()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.id_pesquisador_alvo IS NOT NULL THEN
            PERFORM public.recalcular_score_pesquisador(OLD.id_pesquisador_alvo);
        END IF;
    ELSE
        IF NEW.id_pesquisador_alvo IS NOT NULL THEN
            PERFORM public.recalcular_score_pesquisador(NEW.id_pesquisador_alvo);
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_denuncia_recalcula_score ON denuncia;
CREATE TRIGGER trg_denuncia_recalcula_score
    AFTER INSERT OR UPDATE OR DELETE ON denuncia
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_denuncia();

-- atualizacao_campanha → afeta a dimensão Atualização (busca o dono via campanha)
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_atualizacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_id_usuario INT;
BEGIN
    SELECT id_usuario INTO v_id_usuario FROM campanha
    WHERE id_campanha = COALESCE(NEW.id_campanha, OLD.id_campanha);
    IF v_id_usuario IS NOT NULL THEN
        PERFORM public.recalcular_score_pesquisador(v_id_usuario);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizacao_recalcula_score ON atualizacao_campanha;
CREATE TRIGGER trg_atualizacao_recalcula_score
    AFTER INSERT OR UPDATE OR DELETE ON atualizacao_campanha
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_atualizacao();

-- link_academico → afeta a dimensão Perfil Acadêmico
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_link()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalcular_score_pesquisador(OLD.id_usuario);
    ELSE
        PERFORM public.recalcular_score_pesquisador(NEW.id_usuario);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_recalcula_score ON link_academico;
CREATE TRIGGER trg_link_recalcula_score
    AFTER INSERT OR UPDATE OR DELETE ON link_academico
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_link();

-- perfil_pesquisador → só recalcula se vinculo_institucional/titulo_academico
-- mudaram (e NÃO quando o próprio recalculo atualiza score_atual — a
-- condição WHEN evita loop infinito).
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_perfil()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.recalcular_score_pesquisador(NEW.id_usuario);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfil_recalcula_score ON perfil_pesquisador;
CREATE TRIGGER trg_perfil_recalcula_score
    AFTER INSERT ON perfil_pesquisador
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_perfil();

DROP TRIGGER IF EXISTS trg_perfil_update_recalcula_score ON perfil_pesquisador;
CREATE TRIGGER trg_perfil_update_recalcula_score
    AFTER UPDATE ON perfil_pesquisador
    FOR EACH ROW
    WHEN (
        OLD.vinculo_institucional IS DISTINCT FROM NEW.vinculo_institucional
        OR OLD.titulo_academico   IS DISTINCT FROM NEW.titulo_academico
    )
    EXECUTE FUNCTION public.trg_recalcular_por_perfil();

-- score_config (pesos mudaram) → recalcula todo mundo
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_score_config()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.recalcular_todos_os_scores();
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_score_config_recalcula_todos ON score_config;
CREATE TRIGGER trg_score_config_recalcula_todos
    AFTER UPDATE OF peso ON score_config
    FOR EACH ROW
    WHEN (OLD.peso IS DISTINCT FROM NEW.peso)
    EXECUTE FUNCTION public.trg_recalcular_por_score_config();


-- ============================================================
-- 10. TRIGGERS DE INTEGRIDADE (acrescentadas em 2026-07)
--     Não fazem parte do motor de score, mas ficam aqui por serem
--     a mesma categoria de "regra de negócio que o CHECK simples
--     não consegue expressar" (CHECK não enxerga outras tabelas).
-- ============================================================

-- contribuicao_recompensa: garante que (1) a recompensa escolhida
-- pertence à MESMA campanha da contribuição (ninguém resgata
-- recompensa de campanha diferente da que doou) e (2) respeita o
-- estoque de quantidade_disponivel da recompensa.
CREATE OR REPLACE FUNCTION public.trg_valida_contribuicao_recompensa()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_campanha_contrib INT;
    v_campanha_recomp  INT;
    v_disponivel       INT;
    v_ja_reservado      INT;
BEGIN
    SELECT id_campanha INTO v_campanha_contrib FROM contribuicao WHERE id_contribuicao = NEW.id_contribuicao;
    SELECT id_campanha, quantidade_disponivel INTO v_campanha_recomp, v_disponivel
        FROM recompensa WHERE id_recompensa = NEW.id_recompensa;

    IF v_campanha_contrib IS DISTINCT FROM v_campanha_recomp THEN
        RAISE EXCEPTION 'A recompensa % não pertence à campanha da contribuição %', NEW.id_recompensa, NEW.id_contribuicao;
    END IF;

    IF v_disponivel IS NOT NULL THEN
        SELECT COALESCE(SUM(quantidade), 0) INTO v_ja_reservado
            FROM contribuicao_recompensa
            WHERE id_recompensa = NEW.id_recompensa
              AND id_contrib_recompensa <> COALESCE(NEW.id_contrib_recompensa, -1); -- ignora a própria linha em caso de UPDATE

        IF v_ja_reservado + NEW.quantidade > v_disponivel THEN
            RAISE EXCEPTION 'Estoque insuficiente para a recompensa % (disponível: %, já reservado: %, solicitado: %)',
                NEW.id_recompensa, v_disponivel, v_ja_reservado, NEW.quantidade;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrib_recompensa_valida ON contribuicao_recompensa;
CREATE TRIGGER trg_contrib_recompensa_valida
    BEFORE INSERT OR UPDATE ON contribuicao_recompensa
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_valida_contribuicao_recompensa();


-- tipo_link agora é compartilhado por 3 tabelas (link_academico,
-- link_atualizacao, link_recompensa). Esta trigger única impede que
-- alguém associe, por exemplo, "Orcid" (permite_perfil=TRUE apenas)
-- a uma recompensa ou atualização — a FK sozinha não bloquearia isso,
-- só a existência do id_tipolink, não o contexto de uso.
CREATE OR REPLACE FUNCTION public.trg_valida_escopo_tipolink()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_coluna    TEXT;
    v_permitido BOOLEAN;
BEGIN
    v_coluna := CASE TG_TABLE_NAME
        WHEN 'link_academico'   THEN 'permite_perfil'
        WHEN 'link_atualizacao' THEN 'permite_atualizacao'
        WHEN 'link_recompensa'  THEN 'permite_recompensa'
    END;

    EXECUTE format('SELECT %I FROM tipo_link WHERE id_tipolink = $1', v_coluna)
        INTO v_permitido USING NEW.id_tipolink;

    IF NOT COALESCE(v_permitido, FALSE) THEN
        RAISE EXCEPTION 'Este tipo de link não é permitido para %', TG_TABLE_NAME;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_academico_valida_tipo ON link_academico;
CREATE TRIGGER trg_link_academico_valida_tipo
    BEFORE INSERT OR UPDATE ON link_academico
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_valida_escopo_tipolink();

DROP TRIGGER IF EXISTS trg_link_atualizacao_valida_tipo ON link_atualizacao;
CREATE TRIGGER trg_link_atualizacao_valida_tipo
    BEFORE INSERT OR UPDATE ON link_atualizacao
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_valida_escopo_tipolink();

DROP TRIGGER IF EXISTS trg_link_recompensa_valida_tipo ON link_recompensa;
CREATE TRIGGER trg_link_recompensa_valida_tipo
    BEFORE INSERT OR UPDATE ON link_recompensa
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_valida_escopo_tipolink();