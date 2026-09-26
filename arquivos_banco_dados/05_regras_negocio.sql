-- ============================================================================
--  CROWDACADÊMICO - SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     05_regras_negocio.sql
--  Módulo:      Motor de Score & Regras de Negócio (Triggers e Funções)
--  Depende de:  01_extensoes_enums_tabelas.sql, 03_funcoes_seguranca.sql
--               (fn_bloqueia_reversao_moderacao_comentario chama public.tem_permissao();
--               praticamente todo o arquivo chama public.config_numero(), que
--               mora em 03 ([03-C])
--  Próximo:     06_grants.sql
-- ----------------------------------------------------------------------------
--  Descrição:
--  Concentra toda a inteligência operacional e regras de consistência do banco:
--  1. Motor de cálculo, orquestração e automação do Score do Pesquisador (INT).
--  2. Validações de integridade, escopo polimórfico e regras financeiras.
--  3. Regras de moderação de comunidade, engajamento e automação RBAC.
--
--  Inventário Mapeado:
--  - 43 Funções (Helpers, Cálculo, Orquestração e Triggers)
--  - 46 Triggers (Todas idempotentes com DROP TRIGGER IF EXISTS)
-- ----------------------------------------------------------------------------
--  SUMÁRIO DOS BLOCOS DE CÓDIGO
--  (letras seguem o índice global de DOCUMENTACAO_BD.md - I = SCORE,
--  K = Regras de Negócio Transversais; ver cabeçalho desse arquivo)
-- ----------------------------------------------------------------------------
--  [I]  SCORE - motor de cálculo e automação de pontuação
--       [05-I-1] Helpers e Utilitários
--       [05-I-2] Cálculo das Dimensões
--       [05-I-3] Orquestração e Cálculo Geral
--       [05-I-4] Triggers e Funções de Automação
--  [K]  REGRAS DE NEGÓCIO TRANSVERSAIS - validações que atravessam mais de
--       um domínio de dado ao mesmo tempo
--       [05-K-1] Integridade e Escopo
--       [05-K-2] Campanhas e Financeiro
--       [05-K-3] Comunidade, Engajamento e RBAC
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Motor de score: todo o cálculo mora no banco (não no app); o resultado fica em cache em
-- perfil_pesquisador.score_atual/score_pesquisador, atualizado por TRIGGER sempre que campanha, denuncia,
-- atualizacao_campanha, link_academico, perfil_pesquisador ou score_config mudam, então vale para QUALQUER
-- registro novo, sem o app precisar lembrar de chamar nada. Todos os pesos vêm de score_config.peso (nenhum
-- número fixo no código): editar o peso no Painel Admin recalcula o score de todo mundo.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- ATENÇÃO: como trg_campanha_valida_transicao ([05-K-2]) e pol_campanha_update (04) exigem dono ou permissão
-- real, QUALQUER UPDATE em campanha rodado sem app.id_usuario_atual definido na sessão (inclusive um
-- superusuário corrigindo dado no SQL Editor) não afeta nenhuma linha (a RLS filtra tudo antes da trigger) e
-- devolve "UPDATE 0" SEM ERRO. É o comportamento correto (aprovação/rejeição precisa ser atribuível a
-- alguém), mas o modo de falhar é silencioso. Antes de qualquer UPDATE manual em campanha, rode:
--     SET app.id_usuario_atual = '<id de um usuário com a permissão certa>';
-- O mesmo vale para o worker de notificação (sessão com notificacao_processar). O encerramento automático de
-- campanha vencida já tem função pronta, encerrar_campanhas_vencidas() ([05-K-2]), SECURITY DEFINER, sem
-- precisar de SET LOCAL manual. Ver .Tutorial-rodar-projeto.md.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- ERRCODE CUSTOMIZADO: as `RAISE EXCEPTION` deste arquivo carregam `USING ERRCODE = '<código>'` (sem isso, todas
-- cairiam no SQLSTATE genérico P0001 e o Nest não diferenciaria "sem permissão" de "dado inválido" de
-- "estado conflitante"). Faixas: 90xxx validação de dado/negócio (HTTP 400), 91xxx conflito de estado/regra
-- (409), 92xxx autorização negada por regra de negócio (403), 93xxx limite de taxa (429). Cada código é único;
-- lista completa em DOCUMENTACAO_ERRCODE.md. O mapeamento para HttpException é do Nest
-- (nest/src/commons/database/postgres-exception.filter.ts); este arquivo só declara o SQLSTATE.
-- ----------------------------------------------------------------------------

-- ============================================================================
--  [05-I-1] SCORE - HELPERS E UTILITÁRIOS
--  Descrição: Funções de suporte geral para leitura de configurações do sistema
--             e fallbacks operacionais.
-- config_numero() mora em 03_funcoes_seguranca.sql ([03-C]); este bloco tem fn_precisa_revisao_score.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     fn_precisa_revisao_score
-- Assinatura: (p_id_usuario INT) -> BOOLEAN
-- Bloco:      [05-I-1]
-- Regra:      O score NUNCA bloqueia a criação de campanha (nem Catarse nem Experiment fazem isso; o filtro de confiança
--             real é a aprovação manual do Admin, via status='aguardando_aprovacao'). 'configuracoes.score_minimo_campanha'
--             é só um SINAL para o painel do Admin destacar, na fila de aprovação, campanhas de pesquisadores com score
--             abaixo do mínimo, para receberem revisão mais cuidadosa; nunca uma trava automática. SECURITY DEFINER:
--             expõe só um booleano, não o valor do score.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_precisa_revisao_score(p_id_usuario INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT score_atual FROM perfil_pesquisador WHERE id_usuario = p_id_usuario),
        0
    ) < public.config_numero('score_minimo_campanha', 25);
$$;

-- ============================================================================
--  [05-I-2] SCORE - CÁLCULO DAS DIMENSÕES
--  Descrição: Funções puras de cálculo de pontuação por dimensão.
--             Recebem o ID do usuário (p_id_usuario INT) e retornam NUMERIC.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     calcular_score_perfil_academico
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 1 - Perfil Acadêmico Declarado. Soma os pesos (vindos de score_config, subitens do pai
--             'perfil_academico') de: link Lattes, link ORCID, outro link acadêmico (qualquer tipo_link que não seja
--             Lattes/ORCID), vínculo institucional preenchido e título acadêmico informado no perfil_pesquisador. O link é
--             reconhecido por tipo_link.codigo (chave estável), não pelo nome de exibição: tipos novos no catálogo (ex.:
--             GitHub) pontuam sem editar esta função.
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

-- ----------------------------------------------------------------------------
-- Função:     calcular_score_historico
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 2 - Histórico na Plataforma. conclusao = (campanhas concluídas com sucesso / total encerradas) *
--             peso_conclusao; aprovacao = (aprovadas pela moderação / total submetidas) * peso_aprovacao; desconta
--             penalidade_abandono por campanha abandonada e penalidade_sem_justificativa por campanha não atingida sem
--             justificativa na solicitação de encerramento.
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

-- ----------------------------------------------------------------------------
-- Função:     calcular_score_atualizacao
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 3 - Atualização da Campanha. regularidade = SUM(realizadas)/SUM(esperadas) * peso_regularidade;
--             tempestividade = (% de campanhas em que realizadas >= esperadas) * peso_tempestividade. Considera campanhas
--             que já começaram (ativo/sucesso/nao_atingido/encerrado). atualizacoesEsperadas = duracaoEmMeses *
--             frequencia_esperada_mensal (configurável via score_frequencia_esperada_mensal).
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

-- ----------------------------------------------------------------------------
-- Função:     calcular_score_reputacao
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 4 - Reputação da Comunidade. reputacaoScore = peso_raiz - totalDenuncias*custo -
--             totalProcedentes*custo_procedente. Só denúncias com status 'resolvida' (= procedente, confirmada pela
--             moderação) penalizam: 'pendente', 'em_analise' e 'improcedente' (descartada após análise, RF-077) não contam.
--             Os custos vêm de score_config (volume_denuncias/gravidade_denuncias), a única fonte de verdade.
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

-- ============================================================================
--  [05-I-3] SCORE - ORQUESTRAÇÃO E CÁLCULO GERAL
--  Descrição: Funções consolidadoras (SECURITY DEFINER) para salvar resultados
--             nas tabelas score_pesquisador e perfil_pesquisador.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     recalcular_score_pesquisador
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-3]
-- Regra:      Recalcula as 4 dimensões de um pesquisador, grava em score_pesquisador (UPSERT) e atualiza o cache em
--             perfil_pesquisador.score_atual. SECURITY DEFINER: precisa poder escrever no perfil de QUALQUER pesquisador
--             (ex.: quando um admin resolve uma denúncia contra outra pessoa), não só no de quem disparou a ação.
-- ----------------------------------------------------------------------------
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

    -- ORDER BY score_minimo: sem ele o LIMIT 1 escolheria uma linha QUALQUER quando duas faixas de score_rotulo
    -- se sobrepõem, e o mesmo pesquisador com o mesmo score podia aparecer com rótulos diferentes em execuções
    -- diferentes. Com ele, o resultado é sempre o mesmo (a faixa de menor mínimo). Não impede a sobreposição, só
    -- torna o resultado estável.
    SELECT id_rotulo INTO v_id_rotulo
    FROM score_rotulo
    WHERE v_total >= score_minimo AND v_total <= score_maximo AND ativo = TRUE
    ORDER BY score_minimo
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

-- ----------------------------------------------------------------------------
-- Função:     recalcular_todos_os_scores
-- Assinatura: () -> INT
-- Bloco:      [05-I-3]
-- Regra:      Recalcula TODOS os pesquisadores de uma vez (botão "Recalcular"
--             no Painel Admin, ou pra rodar uma vez depois de mudar
--             pesos/constantes em massa). Retorna a quantidade recalculada.
-- ----------------------------------------------------------------------------
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

-- ============================================================================
--  [05-I-4] SCORE - TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
--  Descrição: Funções de apoio (trg_recalcular_por_*) e triggers atreladas
--             a tabelas de impacto para recalcular o score em tempo real.
--             Isso é o que torna o sistema "flexível pra novos registros":
--             ninguém no app precisa lembrar de chamar
--             recalcular_score_pesquisador depois de inserir uma campanha,
--             denúncia, atualização, link ou editar o perfil.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     trg_recalcular_por_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Uso:        Invocada por trg_campanha_recalcula_score
-- Regra:      campanha afeta histórico e atualização - recalcula o score do
--             id_usuario dono da campanha (NEW, ou OLD em caso de DELETE).
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_recalcula_score / trg_campanha_recalcula_score_update
-- Tabela:    campanha
-- Momento:   AFTER INSERT OR DELETE (a 1ª) / AFTER UPDATE com WHEN (a 2ª)
-- Função:    trg_recalcular_por_campanha()
-- Bloco:     [05-I-4]
-- Regra:     Dispara o recálculo de score do pesquisador dono da campanha. São duas triggers porque o Postgres não aceita
--            TG_OP dentro de WHEN: a 1ª (INSERT/DELETE) recalcula sempre; a 2ª (UPDATE) só quando muda uma coluna que
--            entra em alguma das 4 dimensões. Sem esse filtro, cada doação (contribuicao ->
--            trg_sincroniza_arrecadado_campanha -> UPDATE campanha.valor_bruto_arrecadado) dispararia um recálculo
--            completo, serializando o FOR UPDATE da linha da campanha. Rascunho não entra em nenhuma das 4 dimensões:
--            criar ou apagar rascunho não recalcula nada.
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

DROP TRIGGER IF EXISTS trg_campanha_recalcula_score_update ON campanha;
CREATE TRIGGER trg_campanha_recalcula_score_update
    AFTER UPDATE ON campanha
    FOR EACH ROW
    WHEN (   OLD.status      IS DISTINCT FROM NEW.status
          OR OLD.data_fim    IS DISTINCT FROM NEW.data_fim
          OR OLD.aprovado_em IS DISTINCT FROM NEW.aprovado_em
          OR OLD.id_usuario  IS DISTINCT FROM NEW.id_usuario)
    EXECUTE FUNCTION public.trg_recalcular_por_campanha();

-- ----------------------------------------------------------------------------
-- Função:     trg_recalcular_por_denuncia
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Uso:        Invocada por trg_denuncia_recalcula_score
-- Regra:      denuncia afeta reputação - recalcula o score de
--             id_pesquisador_alvo (quem foi denunciado), quando preenchido.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Trigger:   trg_denuncia_recalcula_score
-- Tabela:    denuncia
-- Momento:   AFTER INSERT OR UPDATE OR DELETE
-- Função:    trg_recalcular_por_denuncia()
-- Bloco:     [05-I-4]
-- Regra:     Dispara o recálculo de score do pesquisador denunciado a cada
--            inserção, alteração ou remoção de denúncia.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_denuncia_recalcula_score ON denuncia;
CREATE TRIGGER trg_denuncia_recalcula_score
    AFTER INSERT OR UPDATE OR DELETE ON denuncia
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_denuncia();

-- ----------------------------------------------------------------------------
-- Função:     trg_recalcular_por_atualizacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Uso:        Invocada por trg_atualizacao_recalcula_score
-- Regra:      atualizacao_campanha afeta a dimensão Atualização - busca o
--             dono da campanha (via id_campanha) e recalcula o score dele.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_atualizacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_id_usuario INT;
BEGIN
    -- O score só usa ativo e id_campanha; editar título ou texto não muda nada.
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

-- ----------------------------------------------------------------------------
-- Trigger:   trg_atualizacao_recalcula_score
-- Tabela:    atualizacao_campanha
-- Momento:   AFTER INSERT OR UPDATE OR DELETE
-- Função:    trg_recalcular_por_atualizacao()
-- Bloco:     [05-I-4]
-- Regra:     Dispara o recálculo de score do dono da campanha a cada
--            inserção, alteração ou remoção de atualização.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_atualizacao_recalcula_score ON atualizacao_campanha;
CREATE TRIGGER trg_atualizacao_recalcula_score
    AFTER INSERT OR UPDATE OR DELETE ON atualizacao_campanha
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_atualizacao();

-- ----------------------------------------------------------------------------
-- Função:     trg_recalcular_por_link
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Uso:        Invocada por trg_link_recalcula_score
-- Regra:      link_academico afeta a dimensão Perfil Acadêmico - recalcula o
--             score do dono do link.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_link()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- O score só usa o TIPO do link e o dono; trocar a URL não muda nada.
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

-- ----------------------------------------------------------------------------
-- Trigger:   trg_link_recalcula_score
-- Tabela:    link_academico
-- Momento:   AFTER INSERT OR UPDATE OR DELETE
-- Função:    trg_recalcular_por_link()
-- Bloco:     [05-I-4]
-- Regra:     Dispara o recálculo de score do dono do link acadêmico a cada
--            inserção, alteração ou remoção.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_link_recalcula_score ON link_academico;
CREATE TRIGGER trg_link_recalcula_score
    AFTER INSERT OR UPDATE OR DELETE ON link_academico
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_link();

-- ----------------------------------------------------------------------------
-- Função:     trg_recalcular_por_perfil
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Uso:        Invocada por trg_perfil_recalcula_score e
--             trg_perfil_update_recalcula_score
-- Regra:      Recalcula o score do próprio perfil_pesquisador que mudou. No UPDATE, só dispara se
--             vinculo_institucional/titulo_academico mudaram de verdade (condição WHEN na trigger, evita loop infinito com
--             o próprio recálculo que atualiza score_atual).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_perfil()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.recalcular_score_pesquisador(NEW.id_usuario);
    RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_perfil_recalcula_score
-- Tabela:    perfil_pesquisador
-- Momento:   AFTER INSERT
-- Função:    trg_recalcular_por_perfil()
-- Bloco:     [05-I-4]
-- Regra:     Calcula o score inicial assim que um perfil de pesquisador é
--            criado.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_perfil_recalcula_score ON perfil_pesquisador;
CREATE TRIGGER trg_perfil_recalcula_score
    AFTER INSERT ON perfil_pesquisador
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_perfil();

-- ----------------------------------------------------------------------------
-- Trigger:   trg_perfil_update_recalcula_score
-- Tabela:    perfil_pesquisador
-- Momento:   AFTER UPDATE (somente quando vinculo_institucional ou
--            titulo_academico mudam de valor)
-- Função:    trg_recalcular_por_perfil()
-- Bloco:     [05-I-4]
-- Regra:     Recalcula o score quando os dados acadêmicos declarados mudam.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_perfil_update_recalcula_score ON perfil_pesquisador;
CREATE TRIGGER trg_perfil_update_recalcula_score
    AFTER UPDATE ON perfil_pesquisador
    FOR EACH ROW
    WHEN (
        OLD.vinculo_institucional IS DISTINCT FROM NEW.vinculo_institucional
        OR OLD.titulo_academico   IS DISTINCT FROM NEW.titulo_academico
    )
    EXECUTE FUNCTION public.trg_recalcular_por_perfil();

-- ----------------------------------------------------------------------------
-- Função:     trg_recalcular_por_score_config
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Uso:        Invocada por trg_score_config_recalcula_todos
-- Regra:      Quando um peso de score_config muda, recalcula TODOS os
--             pesquisadores (o peso novo afeta todo mundo, não só um).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_score_config()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.recalcular_todos_os_scores();
    RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_score_config_recalcula_todos
-- Tabela:    score_config
-- Momento:   AFTER UPDATE OF peso, UMA vez por comando (FOR EACH STATEMENT)
-- Função:    trg_recalcular_por_score_config()
-- Bloco:     [05-I-4]
-- Regra:     Recalcula o score de todos os pesquisadores quando um peso é editado no Painel Admin. Dispara 1 vez por
--            comando (FOR EACH STATEMENT): editar os 4 pesos raiz dispara 1 recálculo, não 4 (perde o filtro "só se o
--            peso mudou"). Ver DOCUMENTACAO_BD.md [05-K-2-B].
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_score_config_recalcula_todos ON score_config;
CREATE TRIGGER trg_score_config_recalcula_todos
    AFTER INSERT OR UPDATE OR DELETE ON score_config
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trg_recalcular_por_score_config();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_soma_pesos_score_config
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Regra:      Os 4 pesos raiz de score_config (id_pai IS NULL) precisam somar 100: score_rotulo (faixas 0-100) assume que o
--             score MÁXIMO possível é 100 (com soma 200, ninguém cairia na faixa "Referência" e um score de 150 não teria
--             rótulo: recalcular_score_pesquisador devolveria NULL). CONSTRAINT TRIGGER (não trigger comum) porque só
--             assim dá para ser DEFERRABLE: editar os 4 pesos em 4 UPDATEs separados não reprova o 1º sozinho. FOR EACH
--             ROW é exigência do Postgres para CONSTRAINT TRIGGER; a função ignora NEW/OLD e sempre olha a soma agregada
--             da tabela inteira, então confere o estado FINAL, no COMMIT (ou SET CONSTRAINTS ALL IMMEDIATE).
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
    AFTER INSERT OR UPDATE OR DELETE ON score_config
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_soma_pesos_score_config();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_cobertura_score_rotulo
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Regra:      EX_SCORE_ROTULO_SEM_SOBREPOSICAO (01, [01-I]) só impede 2 faixas ativas de se SOBREPOREM; esta exige
--             cobertura EXATA de 0 a 100, sem BURACO (uma faixa terminando em 49 e a próxima começando em 51 deixaria o
--             score 50 sem rótulo). "Exata" só faz sentido porque fn_valida_soma_pesos_score_config (acima) garante que o
--             score máximo é 100. Mesmo mecanismo de CONSTRAINT TRIGGER DEFERRABLE da função acima (editar faixa por
--             faixa não pode reprovar um estado intermediário). LEAD() OVER (ORDER BY score_minimo) compara cada faixa
--             com a PRÓXIMA: se a próxima não começa exatamente 1 depois do fim desta, tem buraco.
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

-- fn_peso_score: peso de subitem de score, 0 quando desativado (DOCUMENTACAO_BD.md [05-K-2-C]).
CREATE OR REPLACE FUNCTION public.fn_peso_score(p_id_pai INT, p_nome TEXT)
RETURNS DECIMAL LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(
        (SELECT peso FROM score_config WHERE id_pai = p_id_pai AND nome = p_nome AND ativo = TRUE),
        0);
$$;

-- Toda rejeição de campanha exige linha em historico_rejeicao na mesma transação (DOCUMENTACAO_BD.md [05-K-2-C]).
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

-- Pares mínimo/máximo de configuracoes (ERRCODE 90019): mínimo maior que máximo trava todo envio de campanha. DOCUMENTACAO_BD.md [05-K-2-C].
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

-- ============================================================================
--  [05-K-1] REGRAS TRANSVERSAIS - INTEGRIDADE E ESCOPO
--  Descrição: Validações de consistência cruzada entre tabelas e verificação
--             de pertencimento em tabelas polimórficas (link_academico, etc).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     trg_valida_contribuicao_recompensa
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Uso:        Invocada por trg_contrib_recompensa_valida
-- Regra:      Garante que (1) a recompensa escolhida pertence à MESMA
--             campanha da contribuição (ninguém resgata recompensa de
--             campanha diferente da que doou) e (2) respeita o estoque de
--             quantidade_disponivel da recompensa.
-- ----------------------------------------------------------------------------
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
        RAISE EXCEPTION 'A recompensa % não pertence à campanha da contribuição %', NEW.id_recompensa, NEW.id_contribuicao
            USING ERRCODE = '90001';
    END IF;

    IF v_disponivel IS NOT NULL THEN
        SELECT COALESCE(SUM(quantidade), 0) INTO v_ja_reservado
            FROM contribuicao_recompensa
            WHERE id_recompensa = NEW.id_recompensa
              AND id_contrib_recompensa <> COALESCE(NEW.id_contrib_recompensa, -1); -- ignora a própria linha em caso de UPDATE

        IF v_ja_reservado + NEW.quantidade > v_disponivel THEN
            RAISE EXCEPTION 'Estoque insuficiente para a recompensa % (disponível: %, já reservado: %, solicitado: %)',
                NEW.id_recompensa, v_disponivel, v_ja_reservado, NEW.quantidade
                USING ERRCODE = '91001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_contrib_recompensa_valida
-- Tabela:    contribuicao_recompensa
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    trg_valida_contribuicao_recompensa()
-- Bloco:     [05-K-1]
-- Regra:     Bloqueia a gravação se a recompensa não pertencer à campanha da
--            contribuição, ou se o estoque disponível for insuficiente.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_contrib_recompensa_valida ON contribuicao_recompensa;
CREATE TRIGGER trg_contrib_recompensa_valida
    BEFORE INSERT OR UPDATE ON contribuicao_recompensa
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_valida_contribuicao_recompensa();

-- ----------------------------------------------------------------------------
-- Função:     trg_valida_escopo_tipolink
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Uso:        Invocada por trg_link_academico_valida_tipo,
--             trg_link_atualizacao_valida_tipo e trg_link_recompensa_valida_tipo
-- Regra:      tipo_link é compartilhado por 3 tabelas (link_academico, link_atualizacao, link_recompensa). Impede que
--             alguém associe, por exemplo, "Orcid" (permite_perfil=TRUE apenas) a uma recompensa ou atualização: a FK
--             sozinha só garante a existência do id_tipolink, não o contexto de uso.
-- ----------------------------------------------------------------------------
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
        RAISE EXCEPTION 'Este tipo de link não é permitido para %', TG_TABLE_NAME
            USING ERRCODE = '90002';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_link_academico_valida_tipo
-- Tabela:    link_academico
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    trg_valida_escopo_tipolink()
-- Bloco:     [05-K-1]
-- Regra:     Só aceita id_tipolink com permite_perfil = TRUE.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_link_academico_valida_tipo ON link_academico;
CREATE TRIGGER trg_link_academico_valida_tipo
    BEFORE INSERT OR UPDATE ON link_academico
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_valida_escopo_tipolink();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_limite_link_academico
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Regra:      RF-014/RF-016/RF-018 e a Etapa 2 falam em até 5 links por pesquisador. Limite lido de
--             configuracoes.limite_links_academicos_perfil (mesmo padrão dos outros limites: campanhas simultâneas,
--             endossos, denúncias/24h), não hardcoded.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_limite_link_academico()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_count  INT;
    v_limite INT;
BEGIN
    v_limite := public.config_numero('limite_links_academicos_perfil', 5);

    SELECT COUNT(*) INTO v_count
    FROM link_academico
    WHERE id_usuario = NEW.id_usuario
      AND id_link_academico <> COALESCE(NEW.id_link_academico, -1);

    IF v_count >= v_limite THEN
        RAISE EXCEPTION 'Limite de % links acadêmicos por perfil atingido', v_limite
            USING ERRCODE = '91002';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_link_academico_valida_limite
-- Tabela:    link_academico
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_limite_link_academico()
-- Bloco:     [05-K-1]
-- Regra:     Bloqueia o 6º link acadêmico (ou o valor configurado) de um
--            mesmo pesquisador. Só em INSERT - trocar a URL/rótulo de um link
--            já existente (UPDATE) nunca aumenta a contagem.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_link_academico_valida_limite ON link_academico;
CREATE TRIGGER trg_link_academico_valida_limite
    BEFORE INSERT ON link_academico
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_link_academico();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_limite_texto_livre
-- Assinatura: () -> TRIGGER (genérica, recebe 2 argumentos via TG_ARGV)
-- Bloco:      [05-K-1]
-- Regra:      Limita o tamanho de campos de texto livre preenchidos por usuário (denuncia.relato, campanha.descricao,
--             atualizacao_campanha.conteudo, solicitacao_encerramento.justificativa_pesquisador/admin,
--             recompensa.descricao, orçamento/cronograma). Uma função genérica em vez de várias quase idênticas:
--             TG_ARGV[0] é o nome da coluna a checar (lida via to_jsonb(NEW), já que plpgsql não permite acesso dinâmico a
--             campo de um RECORD por nome), TG_ARGV[1] é a chave em configuracoes, TG_ARGV[2] é o valor padrão caso a chave
--             não exista. O limite técnico largo (fixo) já mora na CHECK de cada coluna (01); esta trigger é só o limite
--             de negócio, menor e configurável pelo Painel Admin.
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
-- Triggers: trg_*_valida_limite_texto (6 instâncias da mesma função acima)
-- Momento:  BEFORE INSERT OR UPDATE
-- Bloco:    [05-K-1]
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_valida_limite_texto ON campanha;
CREATE TRIGGER trg_campanha_valida_limite_texto
    BEFORE INSERT OR UPDATE ON campanha
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('descricao', 'limite_caracteres_descricao_campanha', '5000');

DROP TRIGGER IF EXISTS trg_atualizacao_campanha_valida_limite_texto ON atualizacao_campanha;
CREATE TRIGGER trg_atualizacao_campanha_valida_limite_texto
    BEFORE INSERT OR UPDATE ON atualizacao_campanha
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('conteudo', 'limite_caracteres_conteudo_atualizacao', '5000');

DROP TRIGGER IF EXISTS trg_denuncia_valida_limite_texto ON denuncia;
CREATE TRIGGER trg_denuncia_valida_limite_texto
    BEFORE INSERT OR UPDATE ON denuncia
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('relato', 'limite_caracteres_relato_denuncia', '1000');

DROP TRIGGER IF EXISTS trg_solicitacao_valida_limite_texto_pesq ON solicitacao_encerramento;
CREATE TRIGGER trg_solicitacao_valida_limite_texto_pesq
    BEFORE INSERT OR UPDATE ON solicitacao_encerramento
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('justificativa_pesquisador', 'limite_caracteres_justificativa_encerramento', '2000');

DROP TRIGGER IF EXISTS trg_solicitacao_valida_limite_texto_admin ON solicitacao_encerramento;
CREATE TRIGGER trg_solicitacao_valida_limite_texto_admin
    BEFORE INSERT OR UPDATE ON solicitacao_encerramento
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('justificativa_admin', 'limite_caracteres_justificativa_encerramento', '2000');

DROP TRIGGER IF EXISTS trg_recompensa_valida_limite_texto ON recompensa;
CREATE TRIGGER trg_recompensa_valida_limite_texto
    BEFORE INSERT OR UPDATE ON recompensa
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('descricao', 'limite_caracteres_descricao_recompensa', '2000');

-- orcamento_campanha.descricao e marco_cronograma.descricao entram na mesma função genérica acima, em vez
-- de criar duas funções quase idênticas.
DROP TRIGGER IF EXISTS trg_orcamento_campanha_valida_limite_texto ON orcamento_campanha;
CREATE TRIGGER trg_orcamento_campanha_valida_limite_texto
    BEFORE INSERT OR UPDATE ON orcamento_campanha
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('descricao', 'limite_caracteres_descricao_orcamento', '2000');

DROP TRIGGER IF EXISTS trg_marco_cronograma_valida_limite_texto ON marco_cronograma;
CREATE TRIGGER trg_marco_cronograma_valida_limite_texto
    BEFORE INSERT OR UPDATE ON marco_cronograma
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('descricao', 'limite_caracteres_descricao_marco', '2000');

-- ----------------------------------------------------------------------------
-- Trigger:   trg_link_atualizacao_valida_tipo
-- Tabela:    link_atualizacao
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    trg_valida_escopo_tipolink()
-- Bloco:     [05-K-1]
-- Regra:     Só aceita id_tipolink com permite_atualizacao = TRUE.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_link_atualizacao_valida_tipo ON link_atualizacao;
CREATE TRIGGER trg_link_atualizacao_valida_tipo
    BEFORE INSERT OR UPDATE ON link_atualizacao
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_valida_escopo_tipolink();

-- ----------------------------------------------------------------------------
-- Trigger:   trg_link_recompensa_valida_tipo
-- Tabela:    link_recompensa
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    trg_valida_escopo_tipolink()
-- Bloco:     [05-K-1]
-- Regra:     Só aceita id_tipolink com permite_recompensa = TRUE.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_link_recompensa_valida_tipo ON link_recompensa;
CREATE TRIGGER trg_link_recompensa_valida_tipo
    BEFORE INSERT OR UPDATE ON link_recompensa
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_valida_escopo_tipolink();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_area_conhecimento_nivel2
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Regra:      area_conhecimento tem hierarquia de 2 níveis (grande área -> área, id_pai em 01) para dar granularidade de
--             busca de verdade ("Ciências da Saúde" cobrindo de odontologia a saúde coletiva era amplo demais para o filtro
--             funcionar). A campanha é obrigada a escolher uma área de nível 2 (folha), nunca a grande área raiz, senão a
--             granularidade ficaria decorativa. Não dá para fazer isso com CHECK simples (precisa consultar outra tabela),
--             por isso é trigger.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_area_conhecimento_nivel2()
RETURNS TRIGGER AS $$
DECLARE
    v_id_pai INT;
BEGIN
    -- campanha.id_area_conhecimento é nullable (01) - NULL continua permitido,
    -- esta trigger só entra em ação quando uma área É informada, garantindo que,
    -- quando informada, seja de nível 2 (nunca a grande área raiz).
    IF NEW.id_area_conhecimento IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT id_pai INTO v_id_pai FROM area_conhecimento WHERE id_area_conhecimento = NEW.id_area_conhecimento;

    IF v_id_pai IS NULL THEN
        RAISE EXCEPTION 'Escolha uma área de conhecimento específica (nível 2), não a grande área raiz.'
            USING ERRCODE = '90004';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_area_nivel2
-- Tabela:    campanha
-- Momento:   BEFORE INSERT OR UPDATE (só quando id_area_conhecimento muda)
-- Função:    fn_valida_area_conhecimento_nivel2()
-- Bloco:     [05-K-1]
-- Regra:     Bloqueia campanha vinculada a uma grande área raiz (id_pai NULL).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_valida_area_nivel2 ON campanha;
CREATE TRIGGER trg_campanha_valida_area_nivel2
    BEFORE INSERT ON campanha
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_area_conhecimento_nivel2();

DROP TRIGGER IF EXISTS trg_campanha_valida_area_nivel2_update ON campanha;
CREATE TRIGGER trg_campanha_valida_area_nivel2_update
    BEFORE UPDATE ON campanha
    FOR EACH ROW
    WHEN (NEW.id_area_conhecimento IS DISTINCT FROM OLD.id_area_conhecimento)
    EXECUTE FUNCTION public.fn_valida_area_conhecimento_nivel2();

-- ----------------------------------------------------------------------------
-- Função:     trg_valida_tipo_motivo_denuncia
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Uso:        Invocada por trg_denuncia_valida_tipo_motivo
-- Regra:      A constraint CK_DENUNCIA_ALVO_XOR (01) já garante que exatamente um alvo está preenchido; esta trigger
--             garante que o motivo escolhido é do tipo certo para o alvo (denunciar uma campanha com um motivo cadastrado
--             como 'perfil', ou vice-versa, não faz sentido).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_valida_tipo_motivo_denuncia()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_tipo tipo_motivo_denuncia;
BEGIN
    SELECT tipo INTO v_tipo FROM motivo_denuncia WHERE id_motivo = NEW.id_motivo;

    IF NEW.id_campanha_alvo IS NOT NULL AND v_tipo <> 'campanha' THEN
        RAISE EXCEPTION 'O motivo selecionado não é válido para denúncia de campanha.'
            USING ERRCODE = '90005';
    END IF;

    IF NEW.id_pesquisador_alvo IS NOT NULL AND v_tipo <> 'perfil' THEN
        RAISE EXCEPTION 'O motivo selecionado não é válido para denúncia de perfil.'
            USING ERRCODE = '90006';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_denuncia_valida_tipo_motivo
-- Tabela:    denuncia
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    trg_valida_tipo_motivo_denuncia()
-- Bloco:     [05-K-1]
-- Regra:     Bloqueia denúncia cujo motivo não bate com o tipo do alvo escolhido.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_denuncia_valida_tipo_motivo ON denuncia;
CREATE TRIGGER trg_denuncia_valida_tipo_motivo
    BEFORE INSERT OR UPDATE ON denuncia
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_valida_tipo_motivo_denuncia();

-- ============================================================================
--  [05-K-2] REGRAS TRANSVERSAIS - CAMPANHAS E FINANCEIRO
--  Descrição: Proteções de fluxo financeiro, congelamento de regras pós-aprovação
--             e sincronização de saldos de campanha.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_repasse_all_or_nothing
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Bloqueia repasse indevido em campanha all-or-nothing que não atingiu a meta financeira. Só bloqueia se houver
--             tentativa real de liberar dinheiro (valor_liquido > 0); registro de "nada repassado" (RF-038, valor_liquido
--             = 0) continua permitido. Como também valida em UPDATE, só bloqueia quando o valor liberado está AUMENTANDO
--             em relação ao que já era (reduzir, zerar ou só mudar status/data nunca trava: um repasse já feito precisa
--             poder ser corrigido mesmo se contribuições devolvidas derrubaram o arrecadado abaixo da meta). TG_OP =
--             'UPDATE' guarda o acesso a OLD, que não existe num INSERT ("record OLD is not assigned yet").
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_repasse_all_or_nothing()
RETURNS TRIGGER AS $$
DECLARE
    v_modelo     modelo_campanha;
    v_meta       DECIMAL;
    v_arrecadado DECIMAL;
    v_valor_liquido_anterior DECIMAL;
BEGIN
    SELECT modelo, meta_financeira, valor_bruto_arrecadado
    INTO v_modelo, v_meta, v_arrecadado
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF TG_OP = 'UPDATE' THEN
        v_valor_liquido_anterior := OLD.valor_liquido;
    ELSE
        v_valor_liquido_anterior := 0;
    END IF;

    IF v_modelo = 'all-or-nothing' AND v_arrecadado < v_meta
       AND NEW.valor_liquido > COALESCE(v_valor_liquido_anterior, 0) THEN
        RAISE EXCEPTION 'Repasse bloqueado: campanhas all-or-nothing só podem repassar valores se a meta financeira for atingida.'
            USING ERRCODE = '91003';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_repasse
-- Tabela:    repasse
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    fn_valida_repasse_all_or_nothing()
-- Bloco:     [05-K-2]
-- Regra:     Impede repasse com valor em campanha all-or-nothing sem meta atingida. Roda também em UPDATE: um INSERT com
--            valor_liquido = 0 (permitido, RF-038) seguido de UPDATE para o valor cheio furaria a regra, já que
--            pol_repasse_update é USING(true) de propósito.
DROP TRIGGER IF EXISTS trg_valida_repasse ON repasse;
CREATE TRIGGER trg_valida_repasse
BEFORE INSERT OR UPDATE ON repasse
FOR EACH ROW
EXECUTE FUNCTION fn_valida_repasse_all_or_nothing();

-- ----------------------------------------------------------------------------
-- Função:     atualizar_status_repasse
-- Assinatura: (p_id_repasse INT, p_status VARCHAR, p_repassado_em TIMESTAMP DEFAULT NULL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      pol_repasse_update (04) é USING (true) de propósito, mas o GRANT UPDATE de tabela inteira que isso exigia saiu
--             (06): o único jeito de mudar `status`/`repassado_em` é por aqui. SECURITY DEFINER, mas trg_valida_repasse
--             continua rodando por baixo (RLS é bypassada, trigger não): a regra all-or-nothing segue protegida. SEM
--             AUTORIZAÇÃO DE PROPÓSITO (pré-autenticação): chamada pelo webhook do gateway de pagamento/repasse, sem sessão
--             de usuário (mesma categoria de registrar_falha_login/registrar_login_sucesso, [03-O]). De confiança do
--             backend: o endpoint precisa validar a assinatura do webhook antes, nunca aceitar a chamada de uma rota
--             pública qualquer.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atualizar_status_repasse(
    p_id_repasse INT, p_status VARCHAR, p_repassado_em TIMESTAMP DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE repasse
    SET status = p_status,
        repassado_em = COALESCE(p_repassado_em, repassado_em)
    WHERE id_repasse = p_id_repasse;
$$;

-- ----------------------------------------------------------------------------
-- Função:     validar_contribuicao_all_or_nothing
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Campanhas all-or-nothing aceitam apenas contribuições via PIX
--             (nenhum outro meio de pagamento é permitido nesse modelo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_contribuicao_all_or_nothing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_modelo campanha.modelo%TYPE;
BEGIN
    SELECT modelo INTO v_modelo
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF FOUND AND v_modelo = 'all-or-nothing' AND NEW.meio_pagamento <> 'pix' THEN
        RAISE EXCEPTION 'Campanhas all-or-nothing aceitam apenas contribuições via PIX'
            USING ERRCODE = '90007';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_contribuicao_all_or_nothing_pix
-- Tabela:    contribuicao
-- Momento:   BEFORE INSERT
-- Função:    validar_contribuicao_all_or_nothing()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia contribuição com meio de pagamento diferente de PIX em
--            campanha all-or-nothing.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_contribuicao_all_or_nothing_pix ON contribuicao;
CREATE TRIGGER trg_contribuicao_all_or_nothing_pix
BEFORE INSERT ON contribuicao
FOR EACH ROW
EXECUTE FUNCTION validar_contribuicao_all_or_nothing();

-- ----------------------------------------------------------------------------
-- Trigger:   trg_contribuicao_all_or_nothing_pix_update
-- Tabela:    contribuicao
-- Momento:   BEFORE UPDATE (só quando meio_pagamento ou id_campanha mudam de valor)
-- Função:    validar_contribuicao_all_or_nothing()
-- Bloco:     [05-K-2]
-- Regra:     Revalida meio_pagamento só quando meio_pagamento ou id_campanha mudam de valor (cláusula WHEN): sem isso, todo
--            UPDATE (inclusive o do webhook de confirmação, que só muda o status) revalidaria e congelaria para sempre
--            qualquer contribuição não-PIX já existente numa campanha all-or-nothing (ex.: dado do seed, carregado com a
--            trigger desligada), sem abrir mão de impedir trocar o meio de pagamento depois.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_contribuicao_all_or_nothing_pix_update ON contribuicao;
CREATE TRIGGER trg_contribuicao_all_or_nothing_pix_update
BEFORE UPDATE ON contribuicao
FOR EACH ROW
WHEN (
    NEW.meio_pagamento IS DISTINCT FROM OLD.meio_pagamento
    OR NEW.id_campanha IS DISTINCT FROM OLD.id_campanha
)
EXECUTE FUNCTION validar_contribuicao_all_or_nothing();

-- ----------------------------------------------------------------------------
-- Função:     fn_congela_regras_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Impede a alteração de meta financeira, modelo de financiamento, taxa, título ou descrição após a campanha
--             ser aprovada (status 'ativo' em diante, incluindo encerramento por moderação): proteção contra
--             fraude/alteração retroativa. data_fim/data_inicio têm regra própria: só congelam quando a campanha já
--             começou de fato (data_inicio no passado); ver o comentário no corpo da função (feature "Em breve").
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_congela_regras_campanha()
RETURNS TRIGGER AS $$
DECLARE
    v_campo TEXT;
    v_erro  RECORD;
BEGIN
    -- A lista de campos travados e o código/mensagem de cada um moram em fn_campanha_campos_bloqueados e
    -- fn_campanha_erro_congelamento (a mesma lista alimenta GET /campanha/:id). A comparação usa to_jsonb, que
    -- trata NULL como o IS DISTINCT FROM de antes (taxa_plataforma e data_inicio são nullable).
    FOREACH v_campo IN ARRAY public.fn_campanha_campos_bloqueados(OLD) LOOP
        IF (to_jsonb(NEW) -> v_campo) IS DISTINCT FROM (to_jsonb(OLD) -> v_campo) THEN
            SELECT * INTO v_erro FROM public.fn_campanha_erro_congelamento(v_campo, OLD.status = 'rejeitado');
            RAISE EXCEPTION '%', v_erro.mensagem USING ERRCODE = v_erro.errcode;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_congela_regras_campanha
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE
-- Função:    fn_congela_regras_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia UPDATE que altere meta, modelo ou taxa depois que a
--            campanha já está aprovada/em andamento.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_congela_regras_campanha ON campanha;
CREATE TRIGGER trg_congela_regras_campanha
BEFORE UPDATE ON campanha
FOR EACH ROW
EXECUTE FUNCTION fn_congela_regras_campanha();

-- ----------------------------------------------------------------------------
-- Função:     fn_congela_orcamento_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Orçamento estruturado da campanha (01, [01-E]). Congela na MESMA condição de fn_congela_regras_campanha
--             (status já aprovado em diante), diferente do cronograma abaixo, que só trava quando a campanha começa de
--             fato: a soma do orçamento precisa bater EXATAMENTE com meta_financeira (fn_valida_completude_campanha) e
--             meta_financeira já está congelada desde a aprovação; deixar o orçamento editável até o início permitiria
--             trocar itens já aprovados/exibidos publicamente. Cobre INSERT/UPDATE/DELETE (adicionar ou remover item é
--             tão problemático quanto editar valor). SECURITY DEFINER: o SELECT status FROM campanha precisa enxergar a
--             linha mesmo para quem tem só 'campanha_editar' (pol_campanha_select não o inclui); sem isso v_status seria
--             NULL e a trava ficaria silenciosamente inerte.
-- ----------------------------------------------------------------------------
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

    -- Rejeitada sem reenvios é só leitura, ver fn_campanha_reenvios_esgotados. Na exclusão da própria campanha
    -- (cascata, expirar_campanhas_rejeitadas) v_status vem NULL, porque a linha-pai já sumiu, e o bloqueio não se
    -- aplica: é o que deixa a expiração apagar.
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

-- ----------------------------------------------------------------------------
-- Trigger:   trg_orcamento_campanha_congela
-- Tabela:    orcamento_campanha
-- Momento:   BEFORE INSERT OR UPDATE OR DELETE
-- Função:    fn_congela_orcamento_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia qualquer alteração no orçamento depois que a campanha
--            já está aprovada/em andamento.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_orcamento_campanha_congela ON orcamento_campanha;
CREATE TRIGGER trg_orcamento_campanha_congela
BEFORE INSERT OR UPDATE OR DELETE ON orcamento_campanha
FOR EACH ROW
EXECUTE FUNCTION public.fn_congela_orcamento_campanha();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_limite_max_orcamento_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Teto de itens de orçamento: configuracoes.orcamento_max_itens (10), checado já no INSERT (não só na
--             aprovação) para dar feedback imediato ao pesquisador em vez de só a recusa na moderação. O PISO
--             (orcamento_min_itens, 1: RF-039) é checado na aprovação, em fn_valida_completude_campanha. SECURITY DEFINER:
--             o COUNT(*) sobre orcamento_campanha fica sujeito à RLS de SELECT (pol_orcamento_campanha_select), que não vale
--             para quem tem só 'campanha_editar'; sem isso o COUNT seria sempre 0 e o teto ficaria inerte.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_limite_max_orcamento_campanha()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_max INT;
    v_qtd INT;
BEGIN
    v_max := public.config_numero('orcamento_max_itens', 10)::INT;

    SELECT COUNT(*) INTO v_qtd FROM orcamento_campanha WHERE id_campanha = NEW.id_campanha;

    IF v_qtd >= v_max THEN
        RAISE EXCEPTION 'A campanha já atingiu o limite de % itens de orçamento (configuracoes.orcamento_max_itens).', v_max
            USING ERRCODE = '91012';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_orcamento_campanha_valida_limite_max
-- Tabela:    orcamento_campanha
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_limite_max_orcamento_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Impede adicionar item de orçamento além do máximo configurado.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_orcamento_campanha_valida_limite_max ON orcamento_campanha;
CREATE TRIGGER trg_orcamento_campanha_valida_limite_max
BEFORE INSERT ON orcamento_campanha
FOR EACH ROW
EXECUTE FUNCTION public.fn_valida_limite_max_orcamento_campanha();

-- ----------------------------------------------------------------------------
-- Função:     fn_congela_marco_cronograma
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Cronograma estruturado da campanha (01, [01-E]). Diferente do orçamento (acima), NÃO trava na aprovação:
--             trava só quando a campanha JÁ está aprovada em diante E já começou de fato (data_inicio <= NOW()), mesma
--             janela usada para data_inicio/data_fim em fn_congela_regras_campanha ("Em breve"): entre aprovar e o início
--             real o pesquisador pode precisar reorganizar datas do plano. A condição de status evita uma trava circular:
--             sem ela, campanha em 'aguardando_aprovacao' com data_inicio já passada teria o cronograma congelado e, sem os
--             marcos mínimos, fn_valida_completude_campanha nunca deixaria aprovar. Cobre INSERT/UPDATE/DELETE. SECURITY
--             DEFINER pelo mesmo motivo do orçamento (o SELECT em campanha precisa enxergar a linha).
-- ----------------------------------------------------------------------------
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

    -- Mesmo bloqueio de fn_congela_orcamento_campanha (ver comentário lá, inclusive sobre v_status NULL na
    -- cascata de exclusão).
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

-- ----------------------------------------------------------------------------
-- Trigger:   trg_marco_cronograma_congela
-- Tabela:    marco_cronograma
-- Momento:   BEFORE INSERT OR UPDATE OR DELETE
-- Função:    fn_congela_marco_cronograma()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia qualquer alteração no cronograma depois que a campanha
--            já começou de fato.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_marco_cronograma_congela ON marco_cronograma;
CREATE TRIGGER trg_marco_cronograma_congela
BEFORE INSERT OR UPDATE OR DELETE ON marco_cronograma
FOR EACH ROW
EXECUTE FUNCTION public.fn_congela_marco_cronograma();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_data_marco_cronograma
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      A data prevista de um marco pode ultrapassar campanha.data_fim (um marco de divulgação de resultado, por
--             exemplo, costuma acontecer depois do prazo de arrecadação), mas não pode ser anterior a campanha.data_inicio:
--             não faz sentido planejar algo "antes da campanha começar". Sai cedo se data_inicio ainda não foi definida
--             (mesmo padrão de fn_valida_prazo_campanha_negocio). SECURITY DEFINER pelo mesmo motivo de
--             fn_congela_orcamento_campanha.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_data_marco_cronograma()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_data_inicio TIMESTAMP;
BEGIN
    SELECT data_inicio INTO v_data_inicio FROM campanha WHERE id_campanha = NEW.id_campanha;

    IF v_data_inicio IS NOT NULL AND NEW.data_prevista < v_data_inicio THEN
        RAISE EXCEPTION 'A data prevista de um marco do cronograma não pode ser anterior à data de início da campanha.'
            USING ERRCODE = '90008';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_marco_cronograma_valida_data
-- Tabela:    marco_cronograma
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    fn_valida_data_marco_cronograma()
-- Bloco:     [05-K-2]
-- Regra:     Impede marco com data_prevista anterior ao início da campanha.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_marco_cronograma_valida_data ON marco_cronograma;
CREATE TRIGGER trg_marco_cronograma_valida_data
BEFORE INSERT OR UPDATE ON marco_cronograma
FOR EACH ROW
EXECUTE FUNCTION public.fn_valida_data_marco_cronograma();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_data_inicio_contra_marcos
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      A trigger acima só vigia a porta do marco (INSERT/UPDATE em marco_cronograma); esta vigia a escrita em
--             campanha: um PATCH mudando data_inicio para frente deixaria marcos anteriores ao novo início, exatamente o
--             estado que fn_valida_data_marco_cronograma proíbe. deslizar_datas_campanha() ([05-K-2]) não precisa dela,
--             porque move os marcos antes de mover a campanha. Mesmo ERRCODE 90008 da trigger irmã: é a mesma regra de
--             negócio vista pelo lado da campanha.
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
-- Função:     fn_valida_limite_max_marco_cronograma
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Mesmo raciocínio de fn_valida_limite_max_orcamento_campanha (acima): checa configuracoes.cronograma_max_marcos
--             (20) no INSERT, com feedback imediato em vez de só na aprovação. SECURITY DEFINER pelo mesmo motivo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_limite_max_marco_cronograma()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_max INT;
    v_qtd INT;
BEGIN
    v_max := public.config_numero('cronograma_max_marcos', 20)::INT;

    SELECT COUNT(*) INTO v_qtd FROM marco_cronograma WHERE id_campanha = NEW.id_campanha;

    IF v_qtd >= v_max THEN
        RAISE EXCEPTION 'A campanha já atingiu o limite de % marcos de cronograma (configuracoes.cronograma_max_marcos).', v_max
            USING ERRCODE = '91014';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_marco_cronograma_valida_limite_max
-- Tabela:    marco_cronograma
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_limite_max_marco_cronograma()
-- Bloco:     [05-K-2]
-- Regra:     Impede adicionar marco de cronograma além do máximo configurado.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_marco_cronograma_valida_limite_max ON marco_cronograma;
CREATE TRIGGER trg_marco_cronograma_valida_limite_max
BEFORE INSERT ON marco_cronograma
FOR EACH ROW
EXECUTE FUNCTION public.fn_valida_limite_max_marco_cronograma();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_transicao_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Protege QUEM pode mudar `status`/`aprovado_em`/`id_admin` da campanha. pol_campanha_update (04) libera UPDATE ao
--             próprio dono, e fn_congela_regras_campanha só protege a linha depois de aprovada: sem esta trigger, um
--             pesquisador dono de campanha 'aguardando_aprovacao' fazia UPDATE status='ativo', aprovado_em=NOW(),
--             id_admin=<ele mesmo> e a campanha ia ao ar como se um Administrador tivesse aprovado. Transições liberadas (a
--             primeira condição que bater libera; qualquer outra levanta 92001):
--               1. Nenhum dos 3 campos sensíveis mudou: sai cedo.
--               2. aguardando_aprovacao -> ativo (com aprovado_em) por quem tem 'campanha_aprovar'.
--               3. aguardando_aprovacao -> rejeitado por quem tem 'campanha_rejeitar'.
--               4. ativo -> encerrado por quem tem 'solicitacao_encerramento_decidir'.
--               5. Encerramento por prazo vencido, AUTOVERIFICÁVEL (sem permissão nem usuário de sistema): só com
--                  data_fim <= NOW() e o novo status batendo com valor_bruto_arrecadado vs meta_financeira (sucesso só se
--                  atingiu a meta, nao_atingido só se não): impossível mentir o resultado.
--               6. Envio para aprovação (rascunho ou rejeitado -> aguardando_aprovacao) por quem tem 'campanha_editar', ou
--                  pelo próprio dono (RF-070) se for pesquisador ativo (92009) e, no reenvio de rejeitada, dentro do prazo
--                  (91026). Reenvio esgotado barra qualquer perfil (91025).
--               7. Cascata de suspensão do pesquisador (RF-084), AUTOVERIFICÁVEL: só se o dono está HOJE 'suspenso' em
--                  perfil_pesquisador e a transição é ativo -> encerrado_moderacao ou aguardando_aprovacao -> rejeitado; o
--                  único caminho que grava esse status é suspender_pesquisador() (03, [03-P]).
--               8. Encerramento por moderação de denúncia (RF-108): 'campanha_encerrar_moderacao' faz SÓ ativo ->
--                  encerrado_moderacao (escopo estreito de propósito: um moderador não vira aprovador por isso).
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

    -- Reenvio esgotado vale para QUALQUER perfil, inclusive quem tem campanha_editar.
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

-- fn_campanha_situacao_reenvio: a conta do ciclo de reenvio num lugar só; ver DOCUMENTACAO_BD.md [05-K-2-B].
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

-- ----------------------------------------------------------------------------
-- Função:     fn_campanha_reenvios_esgotados
-- Assinatura: (p_id_campanha INT) -> BOOLEAN
-- Bloco:      [05-K-2]
-- Regra:      TRUE quando a campanha rejeitada passou de 1 + campanha_rejeitada_max_reenvios
--             rejeições (padrão: a 4ª esgota). SECURITY DEFINER pra enxergar o histórico
--             independente da RLS de quem chama. Ver DOCUMENTACAO_BD.md [05-K-2-B].
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_campanha_reenvios_esgotados(p_id_campanha INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT somente_leitura FROM public.fn_campanha_situacao_reenvio(p_id_campanha);
$$;

-- Status "pós-aprovação" e "terminal" num lugar só; ver DOCUMENTACAO_BD.md [05-K-2-B].
CREATE OR REPLACE FUNCTION public.fn_status_pos_aprovacao(p_status status_campanha)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT p_status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao');
$$;

CREATE OR REPLACE FUNCTION public.fn_status_terminal(p_status status_campanha)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT p_status IN ('sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao');
$$;

-- Campos de campanha que o congelamento trava agora, na ordem em que a trigger confere. Fonte única para a
-- trigger fn_congela_regras_campanha e para GET /campanha/:id (camposBloqueados); ver DOCUMENTACAO_BD.md [05-K-2-D].
CREATE OR REPLACE FUNCTION public.fn_campanha_campos_bloqueados(p public.campanha)
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN p.status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(p.id_campanha) THEN
            ARRAY['titulo', 'descricao', 'meta_financeira', 'modelo', 'data_inicio', 'data_fim',
                  'id_area_conhecimento', 'video_apresentacao_url']
        WHEN public.fn_status_pos_aprovacao(p.status) THEN
            ARRAY['meta_financeira', 'modelo', 'taxa_plataforma', 'titulo', 'descricao',
                  'video_apresentacao_url', 'id_area_conhecimento']
            || CASE WHEN p.data_inicio IS NOT NULL AND p.data_inicio <= NOW()
                    THEN ARRAY['data_fim', 'data_inicio'] ELSE ARRAY[]::TEXT[] END
        ELSE ARRAY[]::TEXT[]
    END;
$$;

-- Código e mensagem de cada campo congelado (os mesmos de sempre, 91004 a 91010, 91023, 91024 e 91027 na rejeitada esgotada).
CREATE OR REPLACE FUNCTION public.fn_campanha_erro_congelamento(p_campo TEXT, p_rejeitada BOOLEAN)
RETURNS TABLE (errcode TEXT, mensagem TEXT)
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT '91027', 'Esta campanha rejeitada já usou todos os reenvios permitidos e agora é somente leitura.'
    WHERE p_rejeitada
    UNION ALL
    SELECT v.errcode, v.mensagem
    FROM (VALUES
        ('meta_financeira',       '91004', 'Fraude bloqueada: não é permitido alterar a meta financeira após a aprovação da campanha.'),
        ('modelo',                '91005', 'Fraude bloqueada: não é permitido alterar o modelo de financiamento após a aprovação da campanha.'),
        ('taxa_plataforma',       '91006', 'Operação bloqueada: a taxa da plataforma não pode ser alterada após o congelamento.'),
        ('titulo',                '91007', 'Fraude bloqueada: não é permitido alterar o título após a aprovação da campanha.'),
        ('descricao',             '91008', 'Fraude bloqueada: não é permitido alterar a descrição após a aprovação da campanha.'),
        ('video_apresentacao_url','91023', 'Fraude bloqueada: não é permitido alterar o vídeo de apresentação após a aprovação da campanha.'),
        ('id_area_conhecimento',  '91024', 'Operação bloqueada: a área do conhecimento não pode ser alterada após a aprovação da campanha.'),
        ('data_fim',              '91009', 'Operação bloqueada: o prazo da campanha não pode ser alterado depois que ela começa de verdade.'),
        ('data_inicio',           '91010', 'Operação bloqueada: a data de início da campanha não pode ser alterada depois que ela começa de verdade.')
    ) AS v(campo, errcode, mensagem)
    WHERE NOT p_rejeitada AND v.campo = p_campo;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_transicao
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE
-- Função:    fn_valida_transicao_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia auto-aprovação/auto-rejeição/forjar id_admin. Libera aprovação/rejeição real (Admin), encerramento
--            automático por prazo (autoverificável), envio e reenvio pelo dono e as demais transições de
--            fn_valida_transicao_campanha.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_valida_transicao ON campanha;
CREATE TRIGGER trg_campanha_valida_transicao
BEFORE UPDATE ON campanha
FOR EACH ROW
EXECUTE FUNCTION fn_valida_transicao_campanha();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_completude_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Orçamento e cronograma estruturados (01, [01-E]) são obrigatórios, e o envio/aprovação é o momento de checar
--             isso, junto com o resto (não existe moderação separada para os itens). Condições, configuráveis via
--             `configuracoes`:
--               1. Pelo menos configuracoes.orcamento_min_itens itens de orçamento;
--               2. Pelo menos configuracoes.cronograma_min_marcos marcos de cronograma;
--               3. SUM(orcamento_campanha.valor) = campanha.meta_financeira, EXATO (não "no máximo", não "aproximado").
--             Também bloqueia campanha com o prazo (data_fim) já vencido. O TETO de itens/marcos é de
--             fn_valida_limite_max_orcamento_campanha/fn_valida_limite_max_marco_cronograma, checado já no INSERT; aqui só o
--             PISO, que só dá para confirmar no envio/aprovação (antes disso o pesquisador ainda pode estar adicionando
--             itens). fn_valida_transicao_campanha já garantiu QUEM pode fazer a transição; esta função garante que a
--             campanha está completa. SECURITY DEFINER: os COUNT/SUM sobre orcamento_campanha/marco_cronograma ficam
--             sujeitos à RLS de quem aprova, e pol_orcamento_campanha_select/pol_marco_cronograma_select só liberam leitura
--             por status/dono/'relatorio_visualizar'; se outro papel ganhar 'campanha_aprovar' sem esse último, a contagem
--             daria 0 e bloquearia toda aprovação em silêncio. Os defaults de fallback do config_numero() (1 e 3) só valem
--             se a linha sumir do banco.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_completude_campanha()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_min_orcamento  INT;
    v_min_marcos     INT;
    v_qtd_orcamento  INT;
    v_qtd_marcos     INT;
    v_soma_orcamento DECIMAL(10,2);
BEGIN
    v_min_orcamento := public.config_numero('orcamento_min_itens', 1)::INT;
    v_min_marcos    := public.config_numero('cronograma_min_marcos', 3)::INT;

    SELECT COUNT(*), COALESCE(SUM(valor), 0)
      INTO v_qtd_orcamento, v_soma_orcamento
      FROM orcamento_campanha
      WHERE id_campanha = NEW.id_campanha;

    SELECT COUNT(*)
      INTO v_qtd_marcos
      FROM marco_cronograma
      WHERE id_campanha = NEW.id_campanha;

    IF v_qtd_orcamento < v_min_orcamento THEN
        RAISE EXCEPTION 'A campanha precisa de pelo menos % itens de orçamento (tem %).', v_min_orcamento, v_qtd_orcamento
            USING ERRCODE = '90009';
    END IF;

    IF v_qtd_marcos < v_min_marcos THEN
        RAISE EXCEPTION 'A campanha precisa de pelo menos % marcos de cronograma (tem %).', v_min_marcos, v_qtd_marcos
            USING ERRCODE = '90010';
    END IF;

    IF v_soma_orcamento <> NEW.meta_financeira THEN
        RAISE EXCEPTION 'A soma dos itens de orçamento (%) precisa ser exatamente igual à meta financeira (%).', v_soma_orcamento, NEW.meta_financeira
            USING ERRCODE = '90011';
    END IF;

    -- Prazo vencido bloqueia envio e aprovação, só por data_fim. Ver DOCUMENTACAO_BD.md [05-K-2-B].
    IF NEW.data_fim IS NULL OR NEW.data_fim <= NOW() THEN
        RAISE EXCEPTION 'O prazo da campanha já venceu (fim em %). Atualize as datas antes de enviar.', NEW.data_fim
            USING ERRCODE = '90015';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_completude
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE (aprovação, envio de rascunho e reenvio de rejeitada)
-- Função:    fn_valida_completude_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia aprovação/envio de campanha sem orçamento e cronograma completos, com a soma do orçamento batendo
--            exatamente com a meta, e com o prazo ainda não vencido. O WHEN cobre as 3 portas de entrada (aprovação, envio
--            de rascunho, reenvio de rejeitada), listadas por nome. Ver DOCUMENTACAO_BD.md [05-K-2-B].
DROP TRIGGER IF EXISTS trg_campanha_valida_completude ON campanha;
CREATE TRIGGER trg_campanha_valida_completude
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (
     (NEW.status = 'ativo'                AND OLD.status IS DISTINCT FROM 'ativo')
  OR (NEW.status = 'aguardando_aprovacao' AND OLD.status IN ('rascunho', 'rejeitado'))
)
EXECUTE FUNCTION public.fn_valida_completude_campanha();

-- ----------------------------------------------------------------------------
-- Função:     fn_preenche_encerramento_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Preenche campanha.encerrado_em ([01-E], RF-042/RF-058) quando o status passa a um status terminal
--             (fn_status_terminal: encerramento natural, antecipado ou por moderação) vindo de um que não é, sem depender do
--             backend lembrar disso em toda rota que muda status. Não sobrescreve um encerrado_em já registrado.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_preenche_encerramento
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE (só quando status muda)
-- Função:    fn_preenche_encerramento_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Grava a data real de encerramento automaticamente.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_preenche_encerramento ON campanha;
CREATE TRIGGER trg_campanha_preenche_encerramento
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION fn_preenche_encerramento_campanha();

-- ----------------------------------------------------------------------------
-- Função:     encerrar_campanhas_vencidas
-- Assinatura: () -> INT
-- Bloco:      [05-K-2]
-- Regra:      Encerra campanhas 'ativo' com prazo vencido (RF-037): sucesso se atingiu a meta, nao_atingido se não. Um job de
--             fundo roda como app_nestjs SEM sessão de usuário (id_usuario_atual() é NULL) e pol_campanha_update (04) exige
--             dono ou permissão, então a RLS não deixaria NENHUMA linha visível ao job: UPDATE 0 sem erro, e a campanha
--             ficaria 'ativo' para sempre (contador negativo na página pública, doações recusadas). A causa NÃO é
--             trg_campanha_valida_transicao (o ramo autoverificável está certo): é a RLS, que barra antes da trigger.
--             SECURITY DEFINER bypassa a RLS, não a trigger, que continua validando cada transição. Chamada por
--             agendamento (@Cron no NestJS), sem sessão de usuário: mesma categoria pré-autorização de
--             registrar_falha_login/registrar_login_sucesso ([03-O]). Retorna a quantidade de campanhas encerradas, para o
--             job logar. O CASE que escolhe o status precisa do cast ::status_campanha (senão resolve para text e dá 42804:
--             o Postgres não aplica cast de atribuição a um CASE de dois literais).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.encerrar_campanhas_vencidas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_encerradas INT := 0;
    v_linhas     INT;
    v_id         INT;
BEGIN
    -- Linha a linha: uma campanha que uma trigger recuse não impede as outras de encerrar. A falha vira
    -- WARNING nos logs do Postgres e a campanha é tentada de novo no ciclo seguinte. Ver DOCUMENTACAO_BD.md [05-K-2-E].
    FOR v_id IN
        SELECT c.id_campanha FROM campanha c
        WHERE c.status = 'ativo' AND c.data_fim IS NOT NULL AND c.data_fim <= NOW()
        ORDER BY c.id_campanha
    LOOP
        BEGIN
            UPDATE campanha
            SET status = (CASE
                WHEN valor_bruto_arrecadado >= meta_financeira THEN 'sucesso'
                ELSE 'nao_atingido'
            END)::status_campanha
            WHERE id_campanha = v_id AND status = 'ativo';
            GET DIAGNOSTICS v_linhas = ROW_COUNT;
            v_encerradas := v_encerradas + v_linhas;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'encerrar_campanhas_vencidas: campanha % ignorada neste ciclo (% / %)', v_id, SQLSTATE, SQLERRM;
        END;
    END LOOP;

    RETURN v_encerradas;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     expirar_campanhas_rascunho
-- Assinatura: () -> INT
-- Bloco:      [05-K-2]
-- Regra:      Apaga rascunho mais velho que campanha_rascunho_ttl_horas (336h), contado da
--             criação e não da última edição. SECURITY DEFINER, chamada por @Cron, sem
--             sessão de usuário. Só 'rascunho' é alcançado. Ver DOCUMENTACAO_BD.md [05-K-2-B].
-- ----------------------------------------------------------------------------
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

    -- Linha a linha: um rascunho que ainda tenha filho que impede o DELETE (ex.: solicitação de
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

-- ----------------------------------------------------------------------------
-- Função:     expirar_campanhas_rejeitadas
-- Assinatura: () -> INT
-- Bloco:      [05-K-2]
-- Regra:      Apaga rejeitada cuja ÚLTIMA rejeição passou de campanha_rejeitada_prazo_dias. Não apaga rejeitada sem
--             histórico nem com denúncia contra ela. O histórico de rejeições sobrevive. SECURITY DEFINER, chamada por
--             @Cron. Ver DOCUMENTACAO_BD.md [05-K-2-B].
CREATE OR REPLACE FUNCTION public.expirar_campanhas_rejeitadas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expiradas INT := 0;
    v_linhas    INT;
    v_id        INT;
BEGIN
    -- Linha a linha: ver encerrar_campanhas_vencidas e DOCUMENTACAO_BD.md [05-K-2-E].
    FOR v_id IN
        SELECT c.id_campanha FROM campanha c
        WHERE c.status = 'rejeitado'
          AND (SELECT s.prazo_reenvio_ate FROM public.fn_campanha_situacao_reenvio(c.id_campanha) s) <= NOW()
          AND NOT EXISTS (SELECT 1 FROM denuncia d                 WHERE d.id_campanha_alvo = c.id_campanha)
          AND NOT EXISTS (SELECT 1 FROM contribuicao ct            WHERE ct.id_campanha     = c.id_campanha)
          AND NOT EXISTS (SELECT 1 FROM repasse r                  WHERE r.id_campanha      = c.id_campanha)
          AND NOT EXISTS (SELECT 1 FROM solicitacao_encerramento s WHERE s.id_campanha      = c.id_campanha)
        ORDER BY c.id_campanha
    LOOP
        BEGIN
            DELETE FROM campanha WHERE id_campanha = v_id AND status = 'rejeitado';
            GET DIAGNOSTICS v_linhas = ROW_COUNT;
            v_expiradas := v_expiradas + v_linhas;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'expirar_campanhas_rejeitadas: campanha % ignorada neste ciclo (% / %)', v_id, SQLSTATE, SQLERRM;
        END;
    END LOOP;

    RETURN v_expiradas;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     deslizar_datas_campanha
-- Assinatura: (p_id_campanha INT, p_nova_data_inicio TIMESTAMPTZ) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      Move data_inicio, data_fim e os marcos pelo mesmo intervalo, mantendo a duração.
--             É função do banco porque a trigger do marco não dispara por escrita em campanha,
--             e a ordem das escritas depende do sinal do deslocamento. Só dono ou campanha_editar,
--             só em rascunho ou rejeitada. Ver DOCUMENTACAO_BD.md [05-K-2-B].
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deslizar_datas_campanha(
    p_id_campanha INT,
    p_nova_data_inicio TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data_inicio TIMESTAMPTZ;
    v_delta       INTERVAL;
BEGIN
    SELECT data_inicio INTO v_data_inicio
    FROM campanha
    WHERE id_campanha = p_id_campanha
      AND (id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
      AND status IN ('rascunho', 'rejeitado');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Só o dono (ou quem pode editar campanhas) reagenda uma campanha em rascunho ou rejeitada.'
            USING ERRCODE = '92010';
    END IF;

    IF v_data_inicio IS NULL OR p_nova_data_inicio IS NULL THEN
        RAISE EXCEPTION 'A campanha precisa ter data de início para as datas serem reagendadas.'
            USING ERRCODE = '90016';
    END IF;

    v_delta := p_nova_data_inicio - v_data_inicio;

    IF v_delta >= INTERVAL '0' THEN
        UPDATE marco_cronograma SET data_prevista = data_prevista + v_delta
        WHERE id_campanha = p_id_campanha;

        UPDATE campanha
        SET data_inicio = data_inicio + v_delta,
            data_fim    = data_fim + v_delta
        WHERE id_campanha = p_id_campanha;
    ELSE
        UPDATE campanha
        SET data_inicio = data_inicio + v_delta,
            data_fim    = data_fim + v_delta
        WHERE id_campanha = p_id_campanha;

        UPDATE marco_cronograma SET data_prevista = data_prevista + v_delta
        WHERE id_campanha = p_id_campanha;
    END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     reativar_pesquisadores_vencidos
-- Assinatura: () -> INT
-- Regra:      Reverte a suspensão do PODER de pesquisador quando o prazo passa: suspender_pesquisador() ([03-P]) grava
--             `suspenso_ate`, mas nada reverte sozinho, e sem isto a suspensão nunca expiraria. Mesmo espírito e formato de
--             encerrar_campanhas_vencidas(), chamada por agendamento (@Cron no NestJS). Não expira ao vivo em cada policy
--             que lê status_pesquisador, para não reabrir as 3 policies de 04 que já checam status_pesquisador = 'ativo'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reativar_pesquisadores_vencidos()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reativados INT := 0;
    v_linhas     INT;
    v_id         INT;
BEGIN
    -- Linha a linha: ver encerrar_campanhas_vencidas e DOCUMENTACAO_BD.md [05-K-2-E].
    FOR v_id IN
        SELECT p.id_usuario FROM perfil_pesquisador p
        WHERE p.status_pesquisador = 'suspenso' AND p.suspenso_ate IS NOT NULL AND p.suspenso_ate <= NOW()
        ORDER BY p.id_usuario
    LOOP
        BEGIN
            UPDATE perfil_pesquisador
            SET status_pesquisador = 'ativo',
                suspenso_ate = NULL,
                motivo_suspensao = NULL,
                suspenso_por = NULL
            WHERE id_usuario = v_id AND status_pesquisador = 'suspenso';
            GET DIAGNOSTICS v_linhas = ROW_COUNT;
            v_reativados := v_reativados + v_linhas;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'reativar_pesquisadores_vencidos: pesquisador % ignorado neste ciclo (% / %)', v_id, SQLSTATE, SQLERRM;
        END;
    END LOOP;

    RETURN v_reativados;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     fn_carimba_taxa_plataforma_aprovacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      RF-036: no momento em que aprovado_em deixa de ser NULL, copia configuracoes.taxa_plataforma_padrao para
--             campanha.taxa_plataforma, só se ainda não houver valor explícito (não sobrescreve uma taxa customizada). Daí
--             em diante a trigger de congelamento (acima) protege esse valor, e o pesquisador não tem a taxa alterada depois
--             da aprovação.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_carimba_taxa_plataforma_aprovacao()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.aprovado_em IS NOT NULL AND OLD.aprovado_em IS NULL AND NEW.taxa_plataforma IS NULL THEN
        NEW.taxa_plataforma := public.config_numero('taxa_plataforma_padrao', 5.00);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_carimba_taxa
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE (só quando aprovado_em muda)
-- Função:    fn_carimba_taxa_plataforma_aprovacao()
-- Bloco:     [05-K-2]
-- Regra:     Grava taxa_plataforma no momento exato da aprovação, se ainda
--            não tiver valor.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_carimba_taxa ON campanha;
CREATE TRIGGER trg_campanha_carimba_taxa
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em)
EXECUTE FUNCTION fn_carimba_taxa_plataforma_aprovacao();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_prazo_campanha_negocio
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      A regra de negócio de duração de campanha lê configuracoes.prazo_minimo_campanha_dias/
--             prazo_maximo_campanha_dias (a constraint CK_CAMPANHA_PRAZO, em 01, é só um limite técnico largo): mudar a
--             política de prazo é um UPDATE numa linha, não uma migração de estrutura. Seed: 15 a 60 dias (o RF-045, janela
--             de estorno do PIX, fica satisfeito com folga).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_prazo_campanha_negocio()
RETURNS TRIGGER AS $$
DECLARE
    v_prazo_minimo INT;
    v_prazo_maximo INT;
    v_duracao_dias DECIMAL;
BEGIN
    IF NEW.data_fim IS NULL OR NEW.data_inicio IS NULL THEN
        RETURN NEW;
    END IF;

    v_prazo_minimo := public.config_numero('prazo_minimo_campanha_dias', 15);
    v_prazo_maximo := public.config_numero('prazo_maximo_campanha_dias', 60);
    -- EXTRACT(EPOCH FROM intervalo) / 86400 dá o total de dias corridos, sem o
    -- risco de EXTRACT(DAY FROM ...) ler só o componente "dias" de um intervalo
    -- que também tenha meses (mesmo padrão já usado em calcular_score_atualizacao).
    v_duracao_dias := EXTRACT(EPOCH FROM (NEW.data_fim - NEW.data_inicio)) / 86400;

    IF v_duracao_dias < v_prazo_minimo OR v_duracao_dias > v_prazo_maximo THEN
        RAISE EXCEPTION 'A duração da campanha precisa estar entre % e % dias (configuracoes).', v_prazo_minimo, v_prazo_maximo
            USING ERRCODE = '90012';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_prazo_negocio
-- Tabela:    campanha
-- Momento:   BEFORE INSERT OR UPDATE (só quando data_inicio/data_fim mudam)
-- Função:    fn_valida_prazo_campanha_negocio()
-- Bloco:     [05-K-2]
-- Regra:     Aplica o limite de prazo de negócio (configuracoes), separado
--            do limite técnico (constraint em 01).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_valida_prazo_negocio ON campanha;
CREATE TRIGGER trg_campanha_valida_prazo_negocio
BEFORE INSERT ON campanha
FOR EACH ROW
EXECUTE FUNCTION fn_valida_prazo_campanha_negocio();

DROP TRIGGER IF EXISTS trg_campanha_valida_prazo_negocio_update ON campanha;
CREATE TRIGGER trg_campanha_valida_prazo_negocio_update
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (NEW.data_inicio IS DISTINCT FROM OLD.data_inicio OR NEW.data_fim IS DISTINCT FROM OLD.data_fim)
EXECUTE FUNCTION fn_valida_prazo_campanha_negocio();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_meta_campanha_negocio
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Meta financeira mínima de negócio: o limite técnico (`meta_financeira > 0`) mora na CHECK (01); esta trigger
--             aplica o mínimo de verdade, maior e configurável, via configuracoes.meta_minima_campanha (mudar o valor é um
--             UPDATE numa linha, não uma migração de constraint). Sem isso, meta 0.00 era aceita e, numa campanha
--             all-or-nothing, seria sucesso instantâneo (a primeira contribuição confirmada já bate a meta).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_meta_campanha_negocio()
RETURNS TRIGGER AS $$
DECLARE
    v_meta_minima DECIMAL;
BEGIN
    v_meta_minima := public.config_numero('meta_minima_campanha', 500.00);

    IF NEW.meta_financeira < v_meta_minima THEN
        RAISE EXCEPTION 'A meta financeira precisa ser de pelo menos % (configuracoes.meta_minima_campanha).', v_meta_minima
            USING ERRCODE = '90013';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_meta_negocio / trg_campanha_valida_meta_negocio_update
-- Tabela:    campanha
-- Momento:   BEFORE INSERT / BEFORE UPDATE (só quando meta_financeira muda)
-- Função:    fn_valida_meta_campanha_negocio()
-- Bloco:     [05-K-2]
-- Regra:     Aplica o mínimo de negócio da meta financeira (configuracoes),
--            separado do limite técnico (constraint em 01).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_valida_meta_negocio ON campanha;
CREATE TRIGGER trg_campanha_valida_meta_negocio
BEFORE INSERT ON campanha
FOR EACH ROW
EXECUTE FUNCTION fn_valida_meta_campanha_negocio();

DROP TRIGGER IF EXISTS trg_campanha_valida_meta_negocio_update ON campanha;
CREATE TRIGGER trg_campanha_valida_meta_negocio_update
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (NEW.meta_financeira IS DISTINCT FROM OLD.meta_financeira)
EXECUTE FUNCTION fn_valida_meta_campanha_negocio();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_transicao_solicitacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      pol_solicitacao_update (04) libera UPDATE também ao dono da campanha (não só a quem decide), para destravar o
--             valor 'cancelado' do ENUM status_encerramento. Esta trigger garante que o dono só consegue cancelar a própria
--             solicitação enquanto ainda está 'pendente': nenhuma outra coluna, nenhuma outra transição. Quem tem
--             solicitacao_encerramento_decidir continua sem restrição.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_transicao_solicitacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT public.tem_permissao('solicitacao_encerramento_decidir') THEN
        IF OLD.status <> 'pendente' OR NEW.status <> 'cancelado' THEN
            RAISE EXCEPTION 'O pesquisador só pode cancelar a própria solicitação enquanto ela estiver pendente.'
                USING ERRCODE = '92002';
        END IF;

        IF NEW.id_admin IS DISTINCT FROM OLD.id_admin
           OR NEW.justificativa_pesquisador IS DISTINCT FROM OLD.justificativa_pesquisador THEN
            RAISE EXCEPTION 'Só é permitido alterar o status para cancelado.'
                USING ERRCODE = '92003';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_transicao_solicitacao
-- Tabela:    solicitacao_encerramento
-- Momento:   BEFORE UPDATE
-- Função:    fn_valida_transicao_solicitacao()
-- Bloco:     [05-K-2]
-- Regra:     Restringe o dono da campanha à transição pendente -> cancelado.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_valida_transicao_solicitacao ON solicitacao_encerramento;
CREATE TRIGGER trg_valida_transicao_solicitacao
BEFORE UPDATE ON solicitacao_encerramento
FOR EACH ROW
EXECUTE FUNCTION fn_valida_transicao_solicitacao();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_contribuicao_campanha_ativa
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Bloqueia contribuição em campanha que não está com status 'ativo' no momento, cujo prazo (data_fim) já
--             expirou, ou que ainda está "Em breve" (data_inicio no futuro). Feature "Em breve": o pesquisador aprova e
--             escolhe lançar na hora ou agendar um início futuro (contador regressivo no front); a campanha já é pública
--             assim que aprovada (pol_campanha_select, 04, libera por status; ver [04-E]), mas só recebe doação depois de
--             data_inicio. Não precisa de status novo nem de cron para "virar ativa": data_inicio no passado basta,
--             comparado em tempo real aqui.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_contribuicao_campanha_ativa()
RETURNS TRIGGER AS $$
DECLARE
    v_status      status_campanha;
    v_data_inicio TIMESTAMP;
    v_data_fim    TIMESTAMP;
BEGIN
    SELECT status, data_inicio, data_fim INTO v_status, v_data_inicio, v_data_fim
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF v_status <> 'ativo' THEN
        RAISE EXCEPTION 'Contribuição bloqueada: a campanha não está ativa no momento (status atual: %)', v_status
            USING ERRCODE = '91015';
    END IF;

    IF v_data_inicio IS NOT NULL AND NOW() < v_data_inicio THEN
        RAISE EXCEPTION 'Contribuição bloqueada: a campanha ainda não começou (Em breve - início em %).', v_data_inicio
            USING ERRCODE = '91016';
    END IF;

    IF v_data_fim IS NOT NULL AND NOW() > v_data_fim THEN
        RAISE EXCEPTION 'Contribuição bloqueada: o prazo da campanha já foi encerrado.'
            USING ERRCODE = '91017';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_status_contribuicao
-- Tabela:    contribuicao
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_contribuicao_campanha_ativa()
-- Bloco:     [05-K-2]
-- Regra:     Impede nova contribuição em campanha inativa ou com prazo
--            expirado.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_valida_status_contribuicao ON contribuicao;
CREATE TRIGGER trg_valida_status_contribuicao
BEFORE INSERT ON contribuicao
FOR EACH ROW
EXECUTE FUNCTION fn_valida_contribuicao_campanha_ativa();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_contribuicao_valor_minimo
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      R$5,00 não é piso do gateway (o PIX não impõe mínimo), é política de negócio da plataforma (RF-056). O limite
--             técnico (`valor > 0`) mora na CHECK CK_CONTRIBUICAO_VALOR_MINIMO (01); esta trigger aplica o mínimo de negócio,
--             configurável, via configuracoes.valor_minimo_contribuicao.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_contribuicao_valor_minimo()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_minimo DECIMAL;
BEGIN
    v_valor_minimo := public.config_numero('valor_minimo_contribuicao', 5.00);

    IF NEW.valor < v_valor_minimo THEN
        RAISE EXCEPTION 'O valor da contribuição precisa ser de pelo menos % (configuracoes.valor_minimo_contribuicao).', v_valor_minimo
            USING ERRCODE = '90014';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_contribuicao_valida_valor_minimo
-- Tabela:    contribuicao
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_contribuicao_valor_minimo()
-- Bloco:     [05-K-2]
-- Regra:     Aplica o mínimo de negócio do valor de contribuição (configuracoes), separado do limite técnico (constraint
--            em 01). Só BEFORE INSERT: o valor de contribuição não é alterado depois de criada (status/id_transacao_api
--            mudam via atualizar_status_contribuicao, 05, nunca o valor em si).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_contribuicao_valida_valor_minimo ON contribuicao;
CREATE TRIGGER trg_contribuicao_valida_valor_minimo
BEFORE INSERT ON contribuicao
FOR EACH ROW
EXECUTE FUNCTION fn_valida_contribuicao_valor_minimo();

-- ----------------------------------------------------------------------------
-- Função:     fn_sincroniza_arrecadado_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Sincroniza campanha.valor_bruto_arrecadado somando as
--             contribuições com status 'confirmado' ou 'repassado' sempre
--             que uma contribuição é inserida, alterada ou removida.
-- ----------------------------------------------------------------------------
-- Ver DOCUMENTACAO_BD.md [05-K-2-C].
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
-- Trigger:   trg_sincroniza_arrecadado_campanha
-- Tabela:    contribuicao
-- Momento:   AFTER INSERT OR UPDATE OR DELETE
-- Função:    fn_sincroniza_arrecadado_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Mantém campanha.valor_bruto_arrecadado sempre sincronizado com
--            a soma real das contribuições confirmadas/repassadas.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sincroniza_arrecadado_campanha ON contribuicao;
CREATE TRIGGER trg_sincroniza_arrecadado_campanha
AFTER INSERT OR UPDATE OR DELETE ON contribuicao
FOR EACH ROW
EXECUTE FUNCTION fn_sincroniza_arrecadado_campanha();

-- ----------------------------------------------------------------------------
-- Função:     atualizar_status_contribuicao
-- Assinatura: (p_id INT, p_status status_contribuicao, p_id_transacao VARCHAR DEFAULT NULL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      pol_contribuicao_update (04) era USING (true) com GRANT UPDATE de tabela inteira: qualquer usuário confirmava a
--             própria contribuição (ou a de qualquer um) por UPDATE direto, e trg_sincroniza_arrecadado_campanha somava o
--             valor em campanha.valor_bruto_arrecadado, exibindo arrecadação sem pagamento real. Como em [03-O], a coluna
--             `status` (e `id_transacao_api`) saiu do GRANT UPDATE (06) e só muda por aqui: SECURITY DEFINER, mas
--             trg_sincroniza_arrecadado_campanha e as triggers de validação all-or-nothing continuam rodando por baixo (RLS
--             é bypassada, trigger não). SEM AUTORIZAÇÃO DE PROPÓSITO (pré-autenticação): chamada pelo webhook do gateway de
--             pagamento, sem sessão de usuário (mesma categoria de registrar_falha_login, [03-O]); o endpoint precisa
--             validar a assinatura do webhook antes, nunca expor isso como rota pública genérica.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atualizar_status_contribuicao(
    p_id INT, p_status status_contribuicao, p_id_transacao VARCHAR DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE contribuicao
    SET status = p_status,
        id_transacao_api = COALESCE(p_id_transacao, id_transacao_api)
    WHERE id_contribuicao = p_id;
$$;

-- ----------------------------------------------------------------------------
-- Função:     validar_limite_campanhas_pesquisador
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Um pesquisador não pode ter mais campanhas simultâneas (status 'aguardando_aprovacao' ou 'ativo') do que
--             configuracoes.limite_campanhas_simultaneas (padrão 2, ver REQUISITOS_V7, "limite de campanhas simultâneas").
--             'rascunho' NÃO conta: o limite é cobrado no ENVIO para aprovação (rascunho -> aguardando_aprovacao e reenvio de
--             rejeitada), não na criação. BEFORE INSERT OR UPDATE, então nenhum caminho fura o limite. O valor vem de
--             configuracoes (o 2 é só o DEFAULT de segurança caso a chave não exista).
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
-- Trigger:   trg_campanha_limite_simultaneo
-- Tabela:    campanha
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    validar_limite_campanhas_pesquisador()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia nova campanha além do limite de 2 simultâneas por
--            pesquisador.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_limite_simultaneo ON campanha;
CREATE TRIGGER trg_campanha_limite_simultaneo
BEFORE INSERT OR UPDATE ON campanha
FOR EACH ROW
EXECUTE FUNCTION validar_limite_campanhas_pesquisador();

-- ----------------------------------------------------------------------------
-- Função:     validar_atualizacao_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Atualizações de campanha só são permitidas para campanhas com
--             status 'ativo', 'sucesso' ou 'nao_atingido'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_atualizacao_campanha()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_status status_campanha;
BEGIN
    SELECT status INTO v_status
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF FOUND AND v_status NOT IN ('ativo', 'sucesso', 'nao_atingido') THEN
        RAISE EXCEPTION 'Atualizações de campanha só são permitidas para campanhas ativas, com sucesso ou não atingidas'
            USING ERRCODE = '91019';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_atualizacao_campanha_status
-- Tabela:    atualizacao_campanha
-- Momento:   BEFORE INSERT
-- Função:    validar_atualizacao_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia nova atualização em campanha fora dos status
--            permitidos.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_atualizacao_campanha_status ON atualizacao_campanha;
CREATE TRIGGER trg_atualizacao_campanha_status
BEFORE INSERT ON atualizacao_campanha
FOR EACH ROW
EXECUTE FUNCTION validar_atualizacao_campanha();

-- ============================================================================
--  [05-K-3] REGRAS TRANSVERSAIS - COMUNIDADE, ENGAJAMENTO E RBAC
--  Descrição: Regras de interação social (comentários, denúncias) e concessão
--             automática de permissões administrativas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_comentario_campanha_ativa
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Bloqueia novos comentários em campanhas que foram rejeitadas
--             ou banidas pela moderação (status 'rejeitado' ou
--             'encerrado_moderacao').
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_comentario_campanha_ativa()
RETURNS TRIGGER AS $$
DECLARE
    v_status status_campanha;
BEGIN
    SELECT status INTO v_status
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF v_status IN ('rejeitado', 'encerrado_moderacao') THEN
        RAISE EXCEPTION 'Operação bloqueada: não é possível comentar em campanhas rejeitadas ou sob moderação.'
            USING ERRCODE = '91020';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_comentario_status
-- Tabela:    comentario
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_comentario_campanha_ativa()
-- Bloco:     [05-K-3]
-- Regra:     Impede novo comentário em campanha rejeitada ou encerrada por
--            moderação.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_valida_comentario_status ON comentario;
CREATE TRIGGER trg_valida_comentario_status
BEFORE INSERT ON comentario
FOR EACH ROW
EXECUTE FUNCTION fn_valida_comentario_campanha_ativa();

-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_endosso
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Uma campanha não pode ter mais endossos ativos simultâneos (ordem_endosso preenchida) do que
--             configuracoes.limite_endossos_campanha (RF-063; o 4 é só o DEFAULT de segurança caso a chave não exista).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_comentario_endosso()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
    v_limite integer;
BEGIN
    IF NEW.endossado IS TRUE OR NEW.ordem_endosso IS NOT NULL THEN
        v_limite := public.config_numero('limite_endossos_campanha', 4);

        -- Comentário com soft delete (coluna "ativo"): sem o filtro abaixo, um comentário endossado removido por
        -- moderação continuaria ocupando para sempre uma das vagas de endosso da campanha.
        SELECT COUNT(*) INTO v_count
        FROM comentario
        WHERE id_campanha = NEW.id_campanha
          AND ordem_endosso IS NOT NULL
          AND ativo = TRUE
          AND id_comentario <> COALESCE(NEW.id_comentario, -1);

        IF v_count >= v_limite THEN
            RAISE EXCEPTION 'Campanha já atingiu o limite máximo de % endossos ativos', v_limite
                USING ERRCODE = '91021';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_comentario_limite_endosso
-- Tabela:    comentario
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    validar_comentario_endosso()
-- Bloco:     [05-K-3]
-- Regra:     Bloqueia o 5º endosso simultâneo numa mesma campanha.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comentario_limite_endosso ON comentario;
CREATE TRIGGER trg_comentario_limite_endosso
BEFORE INSERT OR UPDATE ON comentario
FOR EACH ROW
EXECUTE FUNCTION validar_comentario_endosso();

-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_autor
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Pesquisador não pode comentar em sua própria campanha (RF-092).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_comentario_autor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_usuario integer;
BEGIN
    SELECT id_usuario INTO v_id_usuario
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF FOUND AND v_id_usuario = NEW.id_pesquisador THEN
        RAISE EXCEPTION 'Pesquisador não pode comentar em sua própria campanha'
            USING ERRCODE = '92004';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_comentario_sem_autoria
-- Tabela:    comentario
-- Momento:   BEFORE INSERT
-- Função:    validar_comentario_autor()
-- Bloco:     [05-K-3]
-- Regra:     Impede que o dono da campanha comente na própria campanha.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comentario_sem_autoria ON comentario;
CREATE TRIGGER trg_comentario_sem_autoria
BEFORE INSERT ON comentario
FOR EACH ROW
EXECUTE FUNCTION validar_comentario_autor();

-- ----------------------------------------------------------------------------
-- Função:     fn_comentario_ignora_endosso_na_criacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      RF-089: só o pesquisador CRIADOR DA CAMPANHA marca um comentário como "Endossado", nunca o autor do próprio
--             comentário. pol_comentario_insert (04) só checa id_pesquisador = id_usuario_atual(), então nada impediria um
--             pesquisador de se autoendossar ao comentar na campanha de outro (RF-090). Zera endossado e ordem_endosso
--             incondicionalmente no INSERT, sem confiar em o Nest não mandar isso: defesa em profundidade, como o resto
--             deste arquivo faz com colunas sensíveis (ver GRANT UPDATE restrito de perfil_pesquisador, 06_grants.sql).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_comentario_ignora_endosso_na_criacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.endossado := FALSE;
    NEW.ordem_endosso := NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_comentario_ignora_endosso_criacao
-- Tabela:    comentario
-- Momento:   BEFORE INSERT
-- Função:    fn_comentario_ignora_endosso_na_criacao()
-- Bloco:     [05-K-3]
-- Regra:     Todo comentário nasce sem endosso, sem exceção - endossar é
--            sempre uma ação SEPARADA e POSTERIOR do dono da campanha
--            (via UPDATE, ver trg_comentario_endosso_autor abaixo).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comentario_ignora_endosso_criacao ON comentario;
CREATE TRIGGER trg_comentario_ignora_endosso_criacao
BEFORE INSERT ON comentario
FOR EACH ROW
EXECUTE FUNCTION fn_comentario_ignora_endosso_na_criacao();

-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_endosso_autor
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      pol_comentario_update (04) libera UPDATE ao autor do comentário, ao dono da campanha OU a quem tem
--             'comentario_moderar', mas nenhuma coluna era restrita por quem: o autor endossaria o PRÓPRIO comentário via
--             UPDATE (RF-089, a mesma falha do INSERT por outra porta). Só o dono da campanha ou quem tem
--             'comentario_moderar' pode mudar `endossado`. Também calcula ordem_endosso (MAX + 1 sob pg_advisory_xact_lock
--             por campanha) ao endossar, e a zera ao remover o endosso.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_comentario_endosso_autor()
RETURNS TRIGGER AS $$
DECLARE
    v_id_usuario_campanha INT;
BEGIN
    IF NEW.endossado IS DISTINCT FROM OLD.endossado THEN
        SELECT id_usuario INTO v_id_usuario_campanha
        FROM campanha
        WHERE id_campanha = OLD.id_campanha;

        IF NOT (
            v_id_usuario_campanha = public.id_usuario_atual()
            OR public.tem_permissao('comentario_moderar')
        ) THEN
            RAISE EXCEPTION 'Só o pesquisador criador da campanha (ou moderação) pode endossar/remover endosso de um comentário.'
                USING ERRCODE = '92008';
        END IF;

        -- Ordem de endosso: calculada aqui, sob lock por campanha, e não no Nest. Precisa rodar ANTES de
        -- trg_comentario_limite_endosso (ordem alfabética dos nomes).
        IF NEW.endossado THEN
            PERFORM pg_advisory_xact_lock(92008, OLD.id_campanha);
            SELECT COALESCE(MAX(ordem_endosso), 0) + 1 INTO NEW.ordem_endosso
            FROM comentario
            WHERE id_campanha = OLD.id_campanha AND ativo = TRUE AND id_comentario <> OLD.id_comentario;
        ELSE
            NEW.ordem_endosso := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_comentario_endosso_autor
-- Tabela:    comentario
-- Momento:   BEFORE UPDATE
-- Função:    validar_comentario_endosso_autor()
-- Bloco:     [05-K-3]
-- Regra:     Bloqueia quem não é o dono da campanha (nem moderação) de
--            mudar o campo `endossado`.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comentario_endosso_autor ON comentario;
CREATE TRIGGER trg_comentario_endosso_autor
BEFORE UPDATE ON comentario
FOR EACH ROW
EXECUTE FUNCTION validar_comentario_endosso_autor();

-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_edicao_conteudo
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      RF-091: "o pesquisador pode editar o comentário já enviado ENQUANTO ELE NÃO ESTIVER com status de endossado". Sem
--             esta trigger, dava para editar `conteudo` de um comentário já endossado (mudando o que está publicado sem o
--             dono saber) e, como pol_comentario_update não distingue coluna, o DONO/moderador também editariam o TEXTO de um
--             comentário que não escreveram: editar conteúdo é ação exclusiva do próprio autor. `ativo` (ocultar/reverter) não
--             é afetado, mora em fn_bloqueia_reversao_moderacao_comentario (abaixo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_comentario_edicao_conteudo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.conteudo IS DISTINCT FROM OLD.conteudo THEN
        IF OLD.id_pesquisador IS DISTINCT FROM public.id_usuario_atual() THEN
            RAISE EXCEPTION 'Só o autor do comentário pode editar o próprio texto.'
                USING ERRCODE = '92007';
        END IF;

        IF OLD.endossado = TRUE THEN
            RAISE EXCEPTION 'Não é possível editar um comentário enquanto ele estiver endossado - remova o endosso antes.'
                USING ERRCODE = '91022';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_comentario_edicao_conteudo
-- Tabela:    comentario
-- Momento:   BEFORE UPDATE
-- Função:    validar_comentario_edicao_conteudo()
-- Bloco:     [05-K-3]
-- Regra:     Só o próprio autor edita `conteudo`, e só enquanto não
--            estiver endossado (RF-091).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comentario_edicao_conteudo ON comentario;
CREATE TRIGGER trg_comentario_edicao_conteudo
BEFORE UPDATE ON comentario
FOR EACH ROW
EXECUTE FUNCTION validar_comentario_edicao_conteudo();

-- ----------------------------------------------------------------------------
-- Função:     fn_bloqueia_reversao_moderacao_comentario
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Só quem tem a permissão 'comentario_moderar' pode reverter (ativo FALSE -> TRUE) um comentário que a moderação
--             ocultou. O autor continua podendo editar o próprio texto e ocultar (ativo TRUE -> FALSE) o próprio comentário;
--             só a reversão da moderação é bloqueada. Ver DOCUMENTACAO_BD.md [04-E-3]/[05-K-3].
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_bloqueia_reversao_moderacao_comentario()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.ativo = FALSE AND NEW.ativo = TRUE AND NOT public.tem_permissao('comentario_moderar') THEN
        RAISE EXCEPTION 'Operação bloqueada: só a moderação pode reverter um comentário ocultado.'
            USING ERRCODE = '92005';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_comentario_bloqueia_reversao_moderacao
-- Tabela:    comentario
-- Momento:   BEFORE UPDATE
-- Função:    fn_bloqueia_reversao_moderacao_comentario()
-- Bloco:     [05-K-3]
-- Regra:     Fecha a brecha em que pol_comentario_update (04) libera UPDATE ao autor sem restringir coluna: sem esta
--            trigger, o autor desfazia sozinho uma moderação (voltar ativo para TRUE) com um UPDATE direto, sem passar por
--            moderador/admin.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comentario_bloqueia_reversao_moderacao ON comentario;
CREATE TRIGGER trg_comentario_bloqueia_reversao_moderacao
BEFORE UPDATE ON comentario
FOR EACH ROW
EXECUTE FUNCTION fn_bloqueia_reversao_moderacao_comentario();

-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_frequencia
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Limita a FREQUÊNCIA de comentários (anti-rajada/spam), no desenho de validar_denuncia_frequencia() (abaixo):
--             conta quantos comentários o mesmo pesquisador postou dentro da janela e bloqueia o (limite+1)-ésimo. Não
--             distingue campanha: soma comentários em QUALQUER campanha (não é limite de volume por campanha).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_comentario_frequencia()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count        integer;
    v_limite       integer;
    v_janela_horas integer;
BEGIN
    v_limite       := public.config_numero('limite_comentarios_por_hora', 5);
    v_janela_horas := public.config_numero('janela_comentarios_horas', 1);

    SELECT COUNT(*) INTO v_count
    FROM comentario
    WHERE id_pesquisador = NEW.id_pesquisador
      AND criado_em >= NOW() - (v_janela_horas || ' hours')::INTERVAL;

    IF v_count >= v_limite THEN
        RAISE EXCEPTION 'Usuário já atingiu o limite de % comentários nas últimas % horas', v_limite, v_janela_horas
            USING ERRCODE = '93002';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_comentario_limite_taxa
-- Tabela:    comentario
-- Momento:   BEFORE INSERT
-- Função:    validar_comentario_frequencia()
-- Bloco:     [05-K-3]
-- Regra:     Bloqueia o (limite+1)-ésimo comentário de um mesmo pesquisador
--            dentro da janela - 6º na última hora com os valores padrão de
--            hoje, mas os dois números são configuráveis (ver função acima).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comentario_limite_taxa ON comentario;
CREATE TRIGGER trg_comentario_limite_taxa
BEFORE INSERT ON comentario
FOR EACH ROW
EXECUTE FUNCTION validar_comentario_frequencia();

-- ----------------------------------------------------------------------------
-- Função:     validar_denuncia_frequencia
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Um usuário não pode registrar mais denúncias (campanha + perfil somadas) do que
--             configuracoes.limite_denuncias_24h dentro da janela configuracoes.janela_denuncias_horas (RF-076). Contagem e
--             janela vêm de configuracoes (5 e 24 são só os DEFAULT de segurança caso a chave não exista).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_denuncia_frequencia()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count        integer;
    v_limite       integer;
    v_janela_horas integer;
BEGIN
    v_limite       := public.config_numero('limite_denuncias_24h', 5);
    v_janela_horas := public.config_numero('janela_denuncias_horas', 24);

    SELECT COUNT(*) INTO v_count
    FROM denuncia
    WHERE id_usuario = NEW.id_usuario
      AND criado_em >= NOW() - (v_janela_horas || ' hours')::INTERVAL;

    IF v_count >= v_limite THEN
        RAISE EXCEPTION 'Usuário já atingiu o limite de % denúncias nas últimas % horas', v_limite, v_janela_horas
            USING ERRCODE = '93001';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_denuncia_limite_taxa
-- Tabela:    denuncia
-- Momento:   BEFORE INSERT
-- Função:    validar_denuncia_frequencia()
-- Bloco:     [05-K-3]
-- Regra:     Bloqueia a (limite+1)-ésima denúncia de um mesmo usuário
--            dentro da janela - 6ª em 24h com os valores padrão de hoje,
--            mas os dois números são configuráveis (ver função acima).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_denuncia_limite_taxa ON denuncia;
CREATE TRIGGER trg_denuncia_limite_taxa
BEFORE INSERT ON denuncia
FOR EACH ROW
EXECUTE FUNCTION validar_denuncia_frequencia();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_denuncia_sem_autojulgamento
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Conflito de interesse: um moderador que criou uma denúncia não pode julgá-la (marcá-la 'resolvida', o que custa
--             pontos de score ao alvo em calcular_score_reputacao, [05-I-2]). pol_denuncia_update (04) checa
--             'denuncia_responder', mas não se quem julga é quem denunciou; mesmo tipo de conflito que
--             validar_comentario_autor() bloqueia para auto-endosso. Bloqueia QUALQUER transição de `status` feita pelo
--             próprio denunciante (também não faz sentido marcar a própria denúncia como 'improcedente').
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_denuncia_sem_autojulgamento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.id_usuario = public.id_usuario_atual() THEN
        RAISE EXCEPTION 'Quem registrou a denúncia não pode julgar a própria denúncia.'
            USING ERRCODE = '92006';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_denuncia_sem_autojulgamento
-- Tabela:    denuncia
-- Momento:   BEFORE UPDATE (só quando status muda)
-- Função:    fn_valida_denuncia_sem_autojulgamento()
-- Bloco:     [05-K-3]
-- Regra:     Impede que o autor da denúncia julgue (mude o status) da própria denúncia.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_denuncia_sem_autojulgamento ON denuncia;
CREATE TRIGGER trg_denuncia_sem_autojulgamento
BEFORE UPDATE ON denuncia
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION fn_valida_denuncia_sem_autojulgamento();

-- ----------------------------------------------------------------------------
-- Função:     trg_admin_recebe_toda_permissao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Uso:        Invocada por trg_permissao_auto_admin
-- Regra:      Rede de segurança para a remoção de eh_admin() das RLS policies (ver RBAC-pontos-discutidos.md e
--             04_rls_policies.sql): toda policy checa tem_permissao('x'). Sem esta trigger, toda permissão nova exigiria
--             lembrar de inserir também a linha em papel_permissao para 'admin', e um esquecimento faria o admin perder
--             acesso a algo que antes tinha de graça. Com a trigger, toda permissão nova já nasce atribuída ao papel 'admin',
--             tornando tem_permissao(...) um substituto 100% seguro do bypass antigo. O admin é reconhecido por `codigo`
--             (01_extensoes_enums_tabelas.sql [01-B]), nunca por `nome` (o rótulo editável).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_admin_recebe_toda_permissao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO papel_permissao (id_papel, id_permissao)
    SELECT p.id_papel, NEW.id_permissao
    FROM papel p WHERE p.codigo = 'admin'
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_permissao_auto_admin
-- Tabela:    permissao
-- Momento:   AFTER INSERT
-- Função:    trg_admin_recebe_toda_permissao()
-- Bloco:     [05-K-3]
-- Regra:     Atribui automaticamente toda permissão nova ao papel 'admin'.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_permissao_auto_admin ON permissao;
CREATE TRIGGER trg_permissao_auto_admin
AFTER INSERT ON permissao
FOR EACH ROW EXECUTE FUNCTION public.trg_admin_recebe_toda_permissao();

-- ----------------------------------------------------------------------------
-- Função:     fn_atribuir_papel_pesquisador
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Mantém o invariante "tem perfil_pesquisador <=> tem o papel 'pesquisador'": quando o app cria o perfil (upgrade
--             de conta), o usuário fica só com o papel 'usuario' e o 'pesquisador' nunca seria atribuído por ninguém. Hoje não
--             quebra nada (o papel nasce com 0 permissões, e as policies checam a existência do perfil, não o papel), mas cria
--             duas realidades no banco e viraria bug silencioso no dia em que alguém conceder a primeira permissão ao papel
--             'pesquisador'. Mesmo espírito de atribuir_papel_padrao() (08) e de trg_admin_recebe_toda_permissao() (acima).
--             SECURITY DEFINER porque o usuário que está virando pesquisador ainda não tem 'papel_atribuir' (ovo e galinha).
--             O papel é reconhecido por `codigo`, não por `nome` (o rótulo editável).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_atribuir_papel_pesquisador()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_papel_pesquisador INT;
BEGIN
    SELECT id_papel INTO v_id_papel_pesquisador FROM papel WHERE codigo = 'pesquisador';

    IF v_id_papel_pesquisador IS NOT NULL THEN
        INSERT INTO usuario_papel (id_usuario, id_papel)
        VALUES (NEW.id_usuario, v_id_papel_pesquisador)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_perfil_atribui_papel_pesquisador
-- Tabela:    perfil_pesquisador
-- Momento:   AFTER INSERT
-- Função:    fn_atribuir_papel_pesquisador()
-- Bloco:     [05-K-3]
-- Regra:     Toda vez que um perfil de pesquisador é criado, o papel
--            'pesquisador' é atribuído automaticamente ao mesmo usuário.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_perfil_atribui_papel_pesquisador ON perfil_pesquisador;
CREATE TRIGGER trg_perfil_atribui_papel_pesquisador
AFTER INSERT ON perfil_pesquisador
FOR EACH ROW EXECUTE FUNCTION public.fn_atribuir_papel_pesquisador();

-- ============================================================
-- Função:     fn_log_auditoria
-- Assinatura: (VARIADIC coluna_pk TEXT[]) -> TRIGGER
-- Bloco:      [05-L]
-- Regra:      Grava em log_auditoria quem (id_usuario_atual()), o quê (tabela + identidade do registro) e quando
--             (ocorrido_em, default NOW()) para qualquer INSERT/UPDATE/DELETE nas tabelas com a trigger abaixo. Função
--             genérica: os argumentos de fn_log_auditoria('coluna_pk_1'[, 'coluna_pk_2']) são a(s) coluna(s) de PRIMARY KEY
--             da tabela (1 para PK simples, 2 para composta, como usuario_papel/papel_permissao). SECURITY DEFINER: ninguém,
--             nem app_nestjs, tem GRANT INSERT em log_auditoria (06); a trigger grava com o privilégio de quem a CRIOU.
--             REDAÇÃO DE COLUNA SENSÍVEL: 'senha_hash' (usuario), 'cpf_criptografado' e 'cpf_hash' (perfil_pesquisador) nunca
--             entram em dados_anteriores/dados_novos: são removidas do JSONB (operador `-`) DEPOIS de calcular
--             campos_alterados, então o NOME da coluna ainda aparece em campos_alterados (saber QUE a senha/CPF mudou é
--             auditoria válida; o valor, não). Se uma tabela nova entrar na lista de triggers e tiver outra coluna sensível
--             (ex.: token_hash), acrescente `- 'coluna'` nas duas linhas de v_antigos/v_novos. UPDATE que não muda nenhum
--             valor de verdade não gera linha (v_campos fica NULL e a função retorna cedo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_log_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_antigos_completo JSONB;
    v_novos_completo   JSONB;
    v_antigos          JSONB;
    v_novos            JSONB;
    v_campos           TEXT[];
    v_coluna           TEXT;
    v_partes           TEXT[] := ARRAY[]::TEXT[];
    v_identidade       TEXT;
BEGIN
    -- v_identidade é montada DENTRO de cada ramo (não antes, com um
    -- COALESCE(NEW, OLD) genérico) de propósito: NEW não existe em DELETE
    -- e OLD não existe em INSERT - cada ramo só referencia a variável que
    -- o Postgres garante estar preenchida naquele TG_OP.
    IF TG_OP = 'INSERT' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(NEW) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_novos := to_jsonb(NEW) - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash';
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_novos)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_novos);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(NEW) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_antigos_completo := to_jsonb(OLD);
        v_novos_completo   := to_jsonb(NEW);

        SELECT array_agg(chave) INTO v_campos
        FROM jsonb_object_keys(v_novos_completo) AS chave
        WHERE v_antigos_completo -> chave IS DISTINCT FROM v_novos_completo -> chave;

        IF v_campos IS NULL THEN
            RETURN NEW;
        END IF;

        -- score_atual/score_atualizado_em (perfil_pesquisador) mudam SOZINHOS toda vez que
        -- recalcular_score_pesquisador() roda (05, [05-I-4]; disparado por qualquer trigger que mexa em
        -- campanha/comentário/etc., não por ação direta sobre o PRÓPRIO perfil_pesquisador). Sem este filtro, isso
        -- viraria a maioria das linhas do log: ruído de motor automático afogando o que o log existe para mostrar
        -- (ação ADMINISTRATIVA de alguém). Se as ÚNICAS colunas que mudaram forem essas duas, não registra. Qualquer
        -- outra mudança em perfil_pesquisador (status_pesquisador, tipo_vinculo...) continua registrando, mesmo que
        -- score também tenha mudado junto.
        IF TG_TABLE_NAME = 'perfil_pesquisador' AND v_campos <@ ARRAY['score_atual', 'score_atualizado_em'] THEN
            RETURN NEW;
        END IF;

        -- registrar_login_sucesso() (03, [03-O]) roda em TODO login bem sucedido, sempre mudando
        -- ultimo_login_em/ultimo_login_ip: mesmo motivo do filtro de score_atual acima (motor automático, não ação
        -- administrativa). tentativas_login_falhas/bloqueado_ate (zerados pela mesma função) ficam FORA desta lista de
        -- propósito: se um login limpa um bloqueio anterior, ou um admin desbloqueia manualmente
        -- (usuario.service.desbloquear.ts), isso vale ficar no log; só o "logou normalmente" é ruído. O dado não sumiu,
        -- só saiu do log: ultimo_login_em está em UsuarioResponseDto/Consultar Usuário (ultimo_login_ip nunca é exposto
        -- pela API).
        IF TG_TABLE_NAME = 'usuario' AND v_campos <@ ARRAY['ultimo_login_em', 'ultimo_login_ip'] THEN
            RETURN NEW;
        END IF;

        v_antigos := v_antigos_completo - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash';
        v_novos   := v_novos_completo - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash';

        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, campos_alterados, dados_anteriores, dados_novos)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_campos, v_antigos, v_novos);
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(OLD) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_antigos := to_jsonb(OLD) - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash';
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_anteriores)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_antigos);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     limpar_log_auditoria
-- Assinatura: () -> INT
-- Bloco:      [05-L]
-- Regra:      Apaga log_auditoria mais velho que log_auditoria_retencao_dias (365). Valor 0 ou negativo = guardar para
--             sempre. Deixa UMA linha de rastro (DELETE em log_auditoria, com quantidade e corte) quando apaga algo.
--             SECURITY DEFINER, chamada por @Cron diário, sem sessão de usuário. Ver DOCUMENTACAO_BD.md [05-L].
-- ----------------------------------------------------------------------------
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

-- Tabelas com PK simples (1 argumento): lista escolhida com critério, não é "logar tudo": só o que o painel
-- admin já edita hoje via RBAC/usuário/config, mais os catálogos que o admin também edita (motivo_denuncia,
-- area_conhecimento, tipo_link, termos_de_uso, papel). contribuicao já tem a tabela auditoria_financeira
-- (01_extensoes_enums_tabelas.sql, bloco [01-H]); duplicar aqui seria redundante, de propósito NÃO está na
-- lista.
DROP TRIGGER IF EXISTS trg_log_auditoria_usuario ON usuario;
CREATE TRIGGER trg_log_auditoria_usuario
AFTER INSERT OR UPDATE OR DELETE ON usuario
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_usuario');

DROP TRIGGER IF EXISTS trg_log_auditoria_perfil_pesquisador ON perfil_pesquisador;
CREATE TRIGGER trg_log_auditoria_perfil_pesquisador
AFTER INSERT OR UPDATE OR DELETE ON perfil_pesquisador
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_usuario');

DROP TRIGGER IF EXISTS trg_log_auditoria_configuracoes ON configuracoes;
CREATE TRIGGER trg_log_auditoria_configuracoes
AFTER INSERT OR UPDATE OR DELETE ON configuracoes
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_config');

-- papel: renomear precisa registrar quem e quando, nome antigo e novo, e o mecanismo genérico já basta
-- (fn_log_auditoria grava campos_alterados/dados_anteriores/dados_novos sozinha, sem nada especial para 'nome').
-- INSERT/DELETE incluídos pelo mesmo motivo dos outros catálogos acima (a API não oferece essas ações hoje, mas
-- se alguém mexer direto no banco, fica registrado do mesmo jeito).
DROP TRIGGER IF EXISTS trg_log_auditoria_papel ON papel;
CREATE TRIGGER trg_log_auditoria_papel
AFTER INSERT OR UPDATE OR DELETE ON papel
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_papel');

DROP TRIGGER IF EXISTS trg_log_auditoria_motivo_denuncia ON motivo_denuncia;
CREATE TRIGGER trg_log_auditoria_motivo_denuncia
AFTER INSERT OR UPDATE OR DELETE ON motivo_denuncia
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_motivo');

DROP TRIGGER IF EXISTS trg_log_auditoria_area_conhecimento ON area_conhecimento;
CREATE TRIGGER trg_log_auditoria_area_conhecimento
AFTER INSERT OR UPDATE OR DELETE ON area_conhecimento
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_area_conhecimento');

DROP TRIGGER IF EXISTS trg_log_auditoria_tipo_link ON tipo_link;
CREATE TRIGGER trg_log_auditoria_tipo_link
AFTER INSERT OR UPDATE OR DELETE ON tipo_link
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_tipolink');

DROP TRIGGER IF EXISTS trg_log_auditoria_termos_de_uso ON termos_de_uso;
CREATE TRIGGER trg_log_auditoria_termos_de_uso
AFTER INSERT OR UPDATE OR DELETE ON termos_de_uso
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_termo');

-- Tabelas com PK COMPOSTA (2 argumentos): usuario_papel/papel_permissao são as duas tabelas que a matriz Papel
-- × Permissão e o widget "Papéis de um usuário" tornaram editáveis pelo painel.
DROP TRIGGER IF EXISTS trg_log_auditoria_usuario_papel ON usuario_papel;
CREATE TRIGGER trg_log_auditoria_usuario_papel
AFTER INSERT OR UPDATE OR DELETE ON usuario_papel
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_usuario', 'id_papel');

DROP TRIGGER IF EXISTS trg_log_auditoria_papel_permissao ON papel_permissao;
CREATE TRIGGER trg_log_auditoria_papel_permissao
AFTER INSERT OR UPDATE OR DELETE ON papel_permissao
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_papel', 'id_permissao');

-- campanha/denuncia: só a TRANSIÇÃO DE STATUS, não qualquer edição (registrar toda alteração de
-- título/descrição etc. seria ruído; o que importa para a auditoria é "quem aprovou/rejeitou/suspendeu o quê e
-- quando"). Por isso é AFTER UPDATE ... WHEN, sem INSERT nem DELETE (nenhuma das duas tabelas tem DELETE
-- liberado hoje, ver 06_grants.sql, e o INSERT em si não é uma "mudança de status").
DROP TRIGGER IF EXISTS trg_log_auditoria_campanha_status ON campanha;
CREATE TRIGGER trg_log_auditoria_campanha_status
AFTER UPDATE ON campanha
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_log_auditoria('id_campanha');

DROP TRIGGER IF EXISTS trg_log_auditoria_denuncia_status ON denuncia;
CREATE TRIGGER trg_log_auditoria_denuncia_status
AFTER UPDATE ON denuncia
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_log_auditoria('id_denuncia');

DROP TRIGGER IF EXISTS trg_log_auditoria_score_config ON score_config;
CREATE TRIGGER trg_log_auditoria_score_config
AFTER INSERT OR UPDATE OR DELETE ON score_config
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_score_config');

DROP TRIGGER IF EXISTS trg_log_auditoria_score_rotulo ON score_rotulo;
CREATE TRIGGER trg_log_auditoria_score_rotulo
AFTER INSERT OR UPDATE OR DELETE ON score_rotulo
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_rotulo');