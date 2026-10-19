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
-- número fixo no código): editar o peso no Painel Admin recalcula o score de todo mundo. O peso da dimensão (raiz)
-- é o máximo dela; o subitem vale a sua PARTE da dimensão (peso do subitem / soma dos subitens ativos,
-- fn_fator_subitem), então mudar o peso da dimensão não exige mexer nos subitens.
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
-- Regra:      Dimensão 1 - Perfil Acadêmico Declarado. Soma as partes dos subitens de 'perfil_academico'
--             (fn_fator_subitem) e multiplica pelo peso da dimensão: link Lattes, link ORCID, outro link acadêmico (qualquer tipo_link que não seja
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
    v_id_pai    INT;
    v_peso_raiz DECIMAL;
    v_fracao    DECIMAL := 0;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz
    FROM score_config WHERE nome = 'perfil_academico' AND id_pai IS NULL AND ativo = TRUE;

    IF v_id_pai IS NULL THEN RETURN 0; END IF;

    IF EXISTS (SELECT 1 FROM link_academico la JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
               WHERE la.id_usuario = p_id_usuario AND tl.codigo = 'LATTES') THEN
        v_fracao := v_fracao + public.fn_fator_subitem(v_id_pai, 'lattes');
    END IF;

    IF EXISTS (SELECT 1 FROM link_academico la JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
               WHERE la.id_usuario = p_id_usuario AND tl.codigo = 'ORCID') THEN
        v_fracao := v_fracao + public.fn_fator_subitem(v_id_pai, 'orcid');
    END IF;

    IF EXISTS (SELECT 1 FROM link_academico la JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
               WHERE la.id_usuario = p_id_usuario AND tl.codigo NOT IN ('LATTES', 'ORCID')) THEN
        v_fracao := v_fracao + public.fn_fator_subitem(v_id_pai, 'linkedin');
    END IF;

    IF EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = p_id_usuario
               AND vinculo_institucional IS NOT NULL AND btrim(vinculo_institucional) <> '') THEN
        v_fracao := v_fracao + public.fn_fator_subitem(v_id_pai, 'instituicao');
    END IF;

    IF EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = p_id_usuario
               AND titulo_academico IS NOT NULL) THEN
        v_fracao := v_fracao + public.fn_fator_subitem(v_id_pai, 'titulo');
    END IF;

    RETURN ROUND(LEAST(GREATEST(v_fracao, 0), 1) * v_peso_raiz)::INTEGER;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     calcular_score_historico
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 2 - Histórico na Plataforma. conclusao = sucesso / (sucesso + não concluídas) * fator_conclusao;
--             aprovacao = aprovadas pela moderação / (aprovadas + rejeitadas definitivas) * fator_aprovacao; o total é a
--             soma vezes o peso da dimensão. Sem penalidade fixa: não concluir já baixa a taxa de conclusão.
CREATE OR REPLACE FUNCTION public.calcular_score_historico(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_pai          INT;
    v_peso_raiz       DECIMAL;
    v_aprovadas       INT := 0;
    v_rej_definitivas INT := 0;
    v_sucesso         INT := 0;
    v_nao_concluidas  INT := 0;
    v_fracao          DECIMAL := 0;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz
    FROM score_config WHERE nome = 'historico_plataforma' AND id_pai IS NULL AND ativo = TRUE;

    IF v_id_pai IS NULL THEN RETURN 0; END IF;

    -- Não concluída: venceu sem a meta, ou foi encerrada antes do prazo com a aprovação do administrador (havia
    -- contribuição). O encerramento direto (sem contribuição, pedido aprovado sem id_admin) não entra; o
    -- encerramento por moderação também não, porque já pesa na reputação (denúncia procedente contra a campanha).
    SELECT count(*) FILTER (WHERE c.aprovado_em IS NOT NULL),
           count(*) FILTER (WHERE c.status = 'sucesso'),
           count(*) FILTER (WHERE c.status = 'nao_atingido'
                               OR (c.status = 'encerrado' AND EXISTS (
                                       SELECT 1 FROM solicitacao_encerramento se
                                       WHERE se.id_campanha = c.id_campanha AND se.status = 'aprovado'
                                         AND se.id_admin IS NOT NULL)))
    INTO v_aprovadas, v_sucesso, v_nao_concluidas
    FROM campanha c WHERE c.id_usuario = p_id_usuario;

    SELECT count(DISTINCT h.id_campanha) INTO v_rej_definitivas
    FROM historico_rejeicao h
    WHERE h.id_usuario_dono = p_id_usuario
      AND NOT EXISTS (SELECT 1 FROM campanha c WHERE c.id_campanha = h.id_campanha);

    IF v_sucesso + v_nao_concluidas > 0 THEN
        v_fracao := v_fracao + public.fn_fator_subitem(v_id_pai, 'campanhas_concluidas')
                             * v_sucesso::DECIMAL / (v_sucesso + v_nao_concluidas);
    END IF;

    IF v_aprovadas + v_rej_definitivas > 0 THEN
        v_fracao := v_fracao + public.fn_fator_subitem(v_id_pai, 'taxa_aprovacao')
                             * v_aprovadas::DECIMAL / (v_aprovadas + v_rej_definitivas);
    END IF;

    RETURN ROUND(LEAST(GREATEST(v_fracao, 0), 1) * v_peso_raiz)::INTEGER;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     calcular_score_atualizacao
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 3 - Atualização da Campanha. regularidade = SUM(realizadas)/SUM(esperadas) * fator_regularidade;
--             tempestividade = (% de campanhas em que realizadas >= esperadas) * fator_tempestividade; o total é a soma
--             vezes o peso da dimensão. Considera campanhas
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
    v_id_pai     INT;
    v_peso_raiz  DECIMAL;
    v_frequencia DECIMAL := public.config_numero('score_frequencia_esperada_mensal', 1);
    v_esperadas  DECIMAL;
    v_realizadas DECIMAL;
    v_qtd        INT;
    v_em_dia     INT;
    v_fracao     DECIMAL := 0;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz
    FROM score_config WHERE nome = 'atualizacao_campanha' AND id_pai IS NULL AND ativo = TRUE;

    IF v_id_pai IS NULL THEN RETURN 0; END IF;

    SELECT SUM(esperadas), SUM(realizadas), count(*), count(*) FILTER (WHERE realizadas >= esperadas)
    INTO v_esperadas, v_realizadas, v_qtd, v_em_dia
    FROM (
        SELECT GREATEST(1, EXTRACT(EPOCH FROM (COALESCE(c.data_fim, NOW()) - c.data_inicio)) / 2629800.0) * v_frequencia AS esperadas,
               (SELECT count(*) FROM atualizacao_campanha a WHERE a.id_campanha = c.id_campanha AND a.ativo = TRUE) AS realizadas
        FROM campanha c
        WHERE c.id_usuario = p_id_usuario
          AND c.status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
          AND c.data_inicio IS NOT NULL
    ) t;

    IF v_esperadas > 0 THEN
        v_fracao := v_fracao + public.fn_fator_subitem(v_id_pai, 'regularidade_atualizacoes') * LEAST(v_realizadas / v_esperadas, 1);
    END IF;

    IF v_qtd > 0 THEN
        v_fracao := v_fracao + public.fn_fator_subitem(v_id_pai, 'tempestividade_atualizacoes') * v_em_dia::DECIMAL / v_qtd;
    END IF;

    RETURN ROUND(LEAST(GREATEST(v_fracao, 0), 1) * v_peso_raiz)::INTEGER;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     calcular_score_reputacao
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 4 - Reputação da Comunidade. Dois subitens: denúncias procedentes contra o PERFIL e CAMPANHAS
--             do pesquisador com pelo menos uma denúncia procedente (várias pessoas denunciando a mesma campanha contam
--             uma vez: pune a falta, não o número de quem viu). Cada um perde a sua parte de forma linear até zerar em
--             score_denuncias_para_zerar. Só 'resolvida' (procedente) conta: 'pendente' e
--             'improcedente' não.
CREATE OR REPLACE FUNCTION public.calcular_score_reputacao(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_pai     INT;
    v_peso_raiz  DECIMAL;
    v_para_zerar DECIMAL := GREATEST(public.config_numero('score_denuncias_para_zerar', 3), 1);
    v_perfil     INT;
    v_campanhas  INT;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz
    FROM score_config WHERE nome = 'reputacao_comunidade' AND id_pai IS NULL AND ativo = TRUE;

    IF v_id_pai IS NULL THEN RETURN 0; END IF;

    SELECT count(*) INTO v_perfil
    FROM denuncia d WHERE d.id_pesquisador_alvo = p_id_usuario AND d.status = 'resolvida';

    SELECT count(DISTINCT d.id_campanha_alvo) INTO v_campanhas
    FROM denuncia d JOIN campanha c ON c.id_campanha = d.id_campanha_alvo
    WHERE c.id_usuario = p_id_usuario AND d.status = 'resolvida';

    RETURN ROUND(v_peso_raiz * (
          public.fn_fator_subitem(v_id_pai, 'denuncias_perfil')   * GREATEST(0, 1 - v_perfil / v_para_zerar)
        + public.fn_fator_subitem(v_id_pai, 'denuncias_campanha') * GREATEST(0, 1 - v_campanhas / v_para_zerar)
    ))::INTEGER;
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
-- Regra:      denuncia afeta reputação - recalcula o pesquisador denunciado ou o dono da campanha denunciada,
--             só quando a denúncia entra em 'resolvida' ou sai dela (denúncia pendente não muda score nenhum).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_recalcular_por_denuncia()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_pesquisador INT;
    v_campanha    INT;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status IS DISTINCT FROM 'resolvida' THEN RETURN NULL; END IF;
    IF TG_OP = 'DELETE' AND OLD.status IS DISTINCT FROM 'resolvida' THEN RETURN NULL; END IF;
    IF TG_OP = 'UPDATE' AND (OLD.status = 'resolvida') = (NEW.status = 'resolvida') THEN RETURN NULL; END IF;

    IF TG_OP = 'DELETE' THEN
        v_pesquisador := OLD.id_pesquisador_alvo;
        v_campanha := OLD.id_campanha_alvo;
    ELSE
        v_pesquisador := NEW.id_pesquisador_alvo;
        v_campanha := NEW.id_campanha_alvo;
    END IF;

    IF v_pesquisador IS NULL THEN
        SELECT id_usuario INTO v_pesquisador FROM campanha WHERE id_campanha = v_campanha;
    END IF;
    IF v_pesquisador IS NOT NULL THEN
        PERFORM public.recalcular_score_pesquisador(v_pesquisador);
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
-- Regra:     Dispara o recálculo de score de quem foi denunciado (perfil ou dono da campanha); a função
--            ignora o que não mexe em 'resolvida'.
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
-- Regra:      Nenhum peso negativo (90030); toda dimensão ativa com subitens precisa de pelo menos um subitem ativo com
--             peso maior que zero (90031), senão ela nunca pontua; e os pesos raiz ativos (id_pai IS NULL) precisam somar 100: score_rotulo (faixas 0-100) assume que o
--             score MÁXIMO possível é 100 (com soma 200, ninguém cairia na faixa "Referência" e um score de 150 não teria
--             rótulo: recalcular_score_pesquisador devolveria NULL). CONSTRAINT TRIGGER (não trigger comum) porque só
--             assim dá para ser DEFERRABLE: editar os 4 pesos em 4 UPDATEs separados não reprova o 1º sozinho. FOR EACH
--             ROW é exigência do Postgres para CONSTRAINT TRIGGER; a função ignora NEW/OLD e sempre olha a soma agregada
--             da tabela inteira, então confere o estado FINAL, no COMMIT (ou SET CONSTRAINTS ALL IMMEDIATE).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_soma_pesos_score_config()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_soma     DECIMAL;
    v_dimensao TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM score_config WHERE peso < 0) THEN
        RAISE EXCEPTION 'Peso não pode ser negativo.'
            USING ERRCODE = '90030';
    END IF;

    SELECT SUM(peso) INTO v_soma FROM score_config WHERE id_pai IS NULL AND ativo = TRUE;
    IF v_soma IS DISTINCT FROM 100 THEN
        RAISE EXCEPTION 'Os pesos das dimensões ativas precisam somar 100 (hoje somam %).', COALESCE(v_soma, 0)
            USING ERRCODE = '90017';
    END IF;

    SELECT r.descricao INTO v_dimensao
    FROM score_config r
    WHERE r.id_pai IS NULL AND r.ativo = TRUE
      AND EXISTS (SELECT 1 FROM score_config s WHERE s.id_pai = r.id_score_config)
      AND NOT EXISTS (SELECT 1 FROM score_config s WHERE s.id_pai = r.id_score_config AND s.ativo = TRUE AND s.peso > 0)
    LIMIT 1;
    IF v_dimensao IS NOT NULL THEN
        RAISE EXCEPTION 'A dimensão "%" precisa de pelo menos um item ativo com peso maior que zero.', v_dimensao
            USING ERRCODE = '90031';
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
-- ----------------------------------------------------------------------------
-- Trigger:   trg_score_rotulo_recalcula_todos
-- Tabela:    score_rotulo
-- Momento:   AFTER INSERT OR UPDATE OR DELETE, uma vez por comando
-- Função:    trg_recalcular_por_score_config()
-- Bloco:     [05-I-4]
-- Regra:     Mudar uma faixa muda o rótulo de quem está nela: recalcula todos, como a edição de peso.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_score_rotulo_recalcula_todos ON score_rotulo;
CREATE TRIGGER trg_score_rotulo_recalcula_todos
    AFTER INSERT OR UPDATE OR DELETE ON score_rotulo
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trg_recalcular_por_score_config();

DROP TRIGGER IF EXISTS trg_score_rotulo_cobertura ON score_rotulo;
CREATE CONSTRAINT TRIGGER trg_score_rotulo_cobertura
    AFTER INSERT OR UPDATE OR DELETE ON score_rotulo
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_cobertura_score_rotulo();

-- fn_fator_subitem: a parte de um subitem na sua dimensão (peso dele / soma dos subitens ativos); 0 quando desativado.
CREATE OR REPLACE FUNCTION public.fn_fator_subitem(p_id_pai INT, p_nome TEXT)
RETURNS DECIMAL LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(
        (SELECT peso FROM score_config WHERE id_pai = p_id_pai AND nome = p_nome AND ativo = TRUE)
        / NULLIF((SELECT SUM(peso) FROM score_config WHERE id_pai = p_id_pai AND ativo = TRUE), 0),
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
        ['arquivo_tamanho_minimo_bytes',  'arquivo_tamanho_maximo_documento_bytes'],
        ['espera_atencao_dias',           'espera_critica_dias'],
        ['repasse_backoff_base_minutos',  'repasse_backoff_max_minutos'],
        ['estorno_backoff_base_minutos',  'estorno_backoff_max_minutos'],
        ['valor_minimo_contribuicao_cartao', 'valor_maximo_contribuicao_cartao']
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
--             Link acadêmico novo só para quem tem perfil de pesquisador (92026): na conta comum não serve para nada.
--             O endereço precisa ser de um dos domínios do tipo (90024; subdomínio vale: www.lattes.cnpq.br) e
--             seguir o padrão `regex` do tipo (90025), RF-022. Tipo com a lista de domínios vazia não confere
--             domínio; tipo sem regex não confere formato.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_valida_escopo_tipolink()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_coluna    TEXT;
    v_permitido BOOLEAN;
    v_nome      TEXT;
    v_regex     TEXT;
    v_dominios  VARCHAR(255)[];
    v_host      TEXT;
BEGIN
    -- IF aninhado: NEW.id_usuario só existe em link_academico.
    IF TG_TABLE_NAME = 'link_academico' AND TG_OP = 'INSERT' THEN
        IF NOT EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = NEW.id_usuario) THEN
            RAISE EXCEPTION 'Só pesquisador tem links acadêmicos. Faça o upgrade para pesquisador primeiro.'
                USING ERRCODE = '92026';
        END IF;
    END IF;

    v_coluna := CASE TG_TABLE_NAME
        WHEN 'link_academico'   THEN 'permite_perfil'
        WHEN 'link_atualizacao' THEN 'permite_atualizacao'
        WHEN 'link_recompensa'  THEN 'permite_recompensa'
    END;

    EXECUTE format('SELECT %I FROM tipo_link WHERE id_tipolink = $1', v_coluna)
        INTO v_permitido USING NEW.id_tipolink;

    IF NOT COALESCE(v_permitido, FALSE) THEN
        RAISE EXCEPTION 'Este tipo de link não pode ser usado %.', CASE TG_TABLE_NAME
            WHEN 'link_academico'   THEN 'no perfil do pesquisador'
            WHEN 'link_atualizacao' THEN 'em atualização de campanha'
            ELSE 'em recompensa'
        END
            USING ERRCODE = '90002';
    END IF;

    SELECT nome, regex, dominio INTO v_nome, v_regex, v_dominios
    FROM tipo_link WHERE id_tipolink = NEW.id_tipolink;

    IF cardinality(v_dominios) > 0 THEN
        v_host := lower(substring(NEW.url FROM '^[A-Za-z][A-Za-z0-9+.-]*://([^/:?#@]+)'));
        IF v_host IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(v_dominios) d
            WHERE v_host = lower(d) OR v_host LIKE '%.' || lower(d)
        ) THEN
            RAISE EXCEPTION 'O link do tipo % precisa ser do endereço %.', v_nome, array_to_string(v_dominios, ' ou ')
                USING ERRCODE = '90024';
        END IF;
    END IF;

    IF v_regex IS NOT NULL AND btrim(v_regex) <> '' AND NEW.url !~ v_regex THEN
        RAISE EXCEPTION 'O link não está no formato esperado para o tipo %. Confira o endereço completo do perfil.', v_nome
            USING ERRCODE = '90025';
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
-- Regra:     Só aceita id_tipolink com permite_perfil = TRUE, de conta pesquisadora, no domínio e no formato do tipo.
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

DROP TRIGGER IF EXISTS trg_denuncia_valida_limite_justificativa ON denuncia;
CREATE TRIGGER trg_denuncia_valida_limite_justificativa
    BEFORE INSERT OR UPDATE ON denuncia
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('justificativa_moderacao', 'limite_caracteres_justificativa_denuncia', '1000');

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

-- comentario.conteudo: o tipo da coluna (VARCHAR(500)) é o teto técnico; o limite de negócio vem de configuracoes.
DROP TRIGGER IF EXISTS trg_comentario_valida_limite_texto ON comentario;
CREATE TRIGGER trg_comentario_valida_limite_texto
    BEFORE INSERT OR UPDATE ON comentario
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('conteudo', 'limite_caracteres_comentario', '500');

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

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_denuncia_alvo
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Regra:      O alvo da denúncia tem de fazer sentido: campanha só se estiver ativa (RF-106; "Em breve" é ativa),
--             perfil só se for de pesquisador (RF-029), e ninguém denuncia a própria campanha nem o próprio perfil
--             (conflito de interesse, como no comentário e no julgamento). SECURITY DEFINER: lê campanha e perfil
--             sem depender do que a RLS mostra a quem denuncia.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_denuncia_alvo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status status_campanha;
    v_dono   INT;
BEGIN
    IF NEW.id_campanha_alvo IS NOT NULL THEN
        SELECT status, id_usuario INTO v_status, v_dono FROM campanha WHERE id_campanha = NEW.id_campanha_alvo;
        IF v_dono = NEW.id_usuario THEN
            RAISE EXCEPTION 'Não é possível denunciar a própria campanha.' USING ERRCODE = '92029';
        END IF;
        IF v_status IS DISTINCT FROM 'ativo' THEN
            RAISE EXCEPTION 'Só é possível denunciar uma campanha ativa.' USING ERRCODE = '91035';
        END IF;
    END IF;

    IF NEW.id_pesquisador_alvo IS NOT NULL THEN
        IF NEW.id_pesquisador_alvo = NEW.id_usuario THEN
            RAISE EXCEPTION 'Não é possível denunciar o próprio perfil.' USING ERRCODE = '92029';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = NEW.id_pesquisador_alvo) THEN
            RAISE EXCEPTION 'O perfil denunciado não é de um pesquisador.' USING ERRCODE = '90026';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_denuncia_valida_alvo
-- Tabela:    denuncia
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_denuncia_alvo()
-- Bloco:     [05-K-1]
-- Regra:     Só na criação: a campanha pode ser encerrada depois, e a denúncia continua valendo para o julgamento.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_denuncia_valida_alvo ON denuncia;
CREATE TRIGGER trg_denuncia_valida_alvo
    BEFORE INSERT ON denuncia
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_denuncia_alvo();

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
--            valor_liquido = 0 (permitido, RF-038) seguido de UPDATE para o valor cheio (feito por função SECURITY DEFINER)
--            furaria a regra.
DROP TRIGGER IF EXISTS trg_valida_repasse ON repasse;
CREATE TRIGGER trg_valida_repasse
BEFORE INSERT OR UPDATE ON repasse
FOR EACH ROW
EXECUTE FUNCTION fn_valida_repasse_all_or_nothing();

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
        RAISE EXCEPTION 'A campanha já atingiu o limite de % % de orçamento.', v_max, CASE WHEN v_max = 1 THEN 'item' ELSE 'itens' END
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
        RAISE EXCEPTION 'A campanha já atingiu o limite de % % de cronograma.', v_max, CASE WHEN v_max = 1 THEN 'marco' ELSE 'marcos' END
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
--               9. Conta do dono excluída (RF-016), AUTOVERIFICÁVEL: só aguardando_aprovacao -> rejeitado e só com o dono
--                  já marcado como excluído; o único caminho é excluir_conta_usuario() (03, [03-O]).
--              10. Encerramento antecipado pelo próprio dono (RF-064), AUTOVERIFICÁVEL: ativo -> encerrado só se quem muda é
--                  o dono, a campanha não tem contribuição confirmada e já existe o pedido aprovado sem admin, que só
--                  encerrar_campanha_sem_contribuicao() (03) consegue gravar.
-- Conta excluída, sem passar pela RLS de usuario (que esconde a linha excluída de quem consulta).
CREATE OR REPLACE FUNCTION public.fn_usuario_excluido(p_id_usuario INT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM usuario WHERE id_usuario = p_id_usuario AND deletado IS TRUE);
$$;

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

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado'
       AND public.fn_usuario_excluido(NEW.id_usuario)
    THEN
        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND OLD.status = 'ativo' AND NEW.status = 'encerrado'
       AND NEW.id_usuario = public.id_usuario_atual()
       AND EXISTS (SELECT 1 FROM solicitacao_encerramento se WHERE se.id_campanha = OLD.id_campanha AND se.status = 'aprovado' AND se.id_admin IS NULL)
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
        RAISE EXCEPTION 'A campanha precisa de pelo menos % % de orçamento, mas tem %.',
            v_min_orcamento, CASE WHEN v_min_orcamento = 1 THEN 'item' ELSE 'itens' END, v_qtd_orcamento
            USING ERRCODE = '90009';
    END IF;

    IF v_qtd_marcos < v_min_marcos THEN
        RAISE EXCEPTION 'A campanha precisa de pelo menos % % de cronograma, mas tem %.',
            v_min_marcos, CASE WHEN v_min_marcos = 1 THEN 'marco' ELSE 'marcos' END, v_qtd_marcos
            USING ERRCODE = '90010';
    END IF;

    IF v_soma_orcamento <> NEW.meta_financeira THEN
        RAISE EXCEPTION 'A soma dos itens de orçamento (%) precisa ser exatamente igual à meta financeira (%).', 'R$ ' || replace(to_char(v_soma_orcamento, 'FM999999990.00'), '.', ','), 'R$ ' || replace(to_char(NEW.meta_financeira, 'FM999999990.00'), '.', ',')
            USING ERRCODE = '90011';
    END IF;

    -- Prazo vencido bloqueia envio e aprovação, só por data_fim. Ver DOCUMENTACAO_BD.md [05-K-2-B].
    IF NEW.data_fim IS NULL OR NEW.data_fim <= NOW() THEN
        RAISE EXCEPTION 'O prazo da campanha já venceu. Atualize as datas antes de enviar.'
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
-- Função:     fn_carimba_envio_aprovacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Grava em campanha.enviado_aprovacao_em o momento em que a campanha entrou na fila de aprovação (envio de
--             rascunho ou reenvio de rejeitada), para a fila mostrar "esperando há X dias" (tempo de atendimento). Cada
--             reenvio carimba de novo: conta a espera da versão atual, não a da primeira. Ao sair da fila (aprovada ou
--             rejeitada) o valor fica, e aprovado_em - enviado_aprovacao_em é quanto a avaliação levou. No INSERT o
--             valor enviado é ignorado: ninguém escolhe a própria data para furar a fila.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_carimba_envio_aprovacao()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.enviado_aprovacao_em := CASE WHEN NEW.status = 'aguardando_aprovacao' THEN NOW() END;
    ELSIF NEW.status = 'aguardando_aprovacao' THEN
        NEW.enviado_aprovacao_em := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_carimba_envio_aprovacao / trg_campanha_carimba_envio_aprovacao_update
-- Tabela:    campanha
-- Momento:   BEFORE INSERT / BEFORE UPDATE (só quando status muda)
-- Função:    fn_carimba_envio_aprovacao()
-- Bloco:     [05-K-2]
-- Regra:     Grava a data de entrada na fila de aprovação automaticamente.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_carimba_envio_aprovacao ON campanha;
CREATE TRIGGER trg_campanha_carimba_envio_aprovacao
BEFORE INSERT ON campanha
FOR EACH ROW
EXECUTE FUNCTION fn_carimba_envio_aprovacao();

DROP TRIGGER IF EXISTS trg_campanha_carimba_envio_aprovacao_update ON campanha;
CREATE TRIGGER trg_campanha_carimba_envio_aprovacao_update
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION fn_carimba_envio_aprovacao();

-- ----------------------------------------------------------------------------
-- Função:     resumo_contribuicoes_campanha
-- Assinatura: (p_id_campanha INT) -> TABLE (pagas INT, total INT)
-- Bloco:      [05-K-2]
-- Regra:      Quantas contribuições a campanha tem, para o Consultar da campanha: `pagas` são as que entram no
--             arrecadado (confirmado e repassado, a mesma regra de fn_sincroniza_arrecadado_campanha) e `total` conta
--             todas, inclusive as que nunca viraram dinheiro (vencidas, com erro, devolvidas). Só números: ninguém vê
--             quem contribuiu. Lê o dono da campanha ou quem tem contribuicao_visualizar_sensivel; outra pessoa recebe
--             92038.
-- ----------------------------------------------------------------------------
-- DROP necessário: CREATE OR REPLACE não pode mudar as colunas de retorno (RETURNS TABLE) de uma função existente.
DROP FUNCTION IF EXISTS public.resumo_contribuicoes_campanha(INT);
CREATE OR REPLACE FUNCTION public.resumo_contribuicoes_campanha(p_id_campanha INT)
RETURNS TABLE (pagas INT, total INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('contribuicao_visualizar_sensivel')
       AND NOT EXISTS (SELECT 1 FROM campanha ca
                       WHERE ca.id_campanha = p_id_campanha AND ca.id_usuario = public.id_usuario_atual()) THEN
        RAISE EXCEPTION 'Sem permissão para ver as contribuições desta campanha.' USING ERRCODE = '92038';
    END IF;

    RETURN QUERY
    SELECT (count(*) FILTER (WHERE c.status IN ('confirmado', 'repassado')))::INT, count(*)::INT
    FROM contribuicao c
    WHERE c.id_campanha = p_id_campanha;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     liquido_repasse
-- Assinatura: (p_bruto DECIMAL, p_liquido_percentual DECIMAL) -> DECIMAL
-- Bloco:      [05-K-2]
-- Regra:      O valor que o pesquisador recebe num repasse. A taxa da plataforma é a percentual (p_liquido_percentual já
--             vem com ela descontada, contribuição por contribuição), mas nunca menos que taxa_minima_repasse: a tarifa
--             que o provedor cobra para fazer a transferência Pix é paga pela plataforma, que nunca fica no prejuízo.
--             Nunca negativo. Usada em todo lugar que calcula valor_liquido de repasse.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.liquido_repasse(p_bruto DECIMAL, p_liquido_percentual DECIMAL)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT GREATEST(LEAST(p_liquido_percentual, p_bruto - public.config_numero('taxa_minima_repasse', 2.00)), 0)::DECIMAL(10,2);
$$;

-- ----------------------------------------------------------------------------
-- Função:     criar_repasse_campanha
-- Assinatura: (p_id_campanha INT, p_meta_atingida BOOLEAN) -> INT
-- Bloco:      [05-K-2]
-- Regra:      Cria UM repasse com as contribuições 'confirmado' da campanha que ainda não estão em repasse nenhum
--             (valor_bruto = soma; taxa_relativa = a da campanha, ou a padrão; valor_liquido = liquido_repasse() sobre a
--             soma dos líquidos por contribuição) e liga cada uma a ele (contribuicao.id_repasse). Sem contribuição
--             confirmada, não cria nada e devolve NULL. Quem transfere é o worker de repasse. Usada no fechamento pelo
--             prazo e no encerramento antes do prazo aprovado pelo admin.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_repasse_campanha(p_id_campanha INT, p_meta_atingida BOOLEAN)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_taxa       DECIMAL(5,2);
    v_bruto      DECIMAL(10,2);
    v_liquido    DECIMAL(10,2);
    v_id_repasse INT;
BEGIN
    SELECT COALESCE(taxa_plataforma, public.config_numero('taxa_plataforma_padrao', 5.00)) INTO v_taxa
    FROM campanha WHERE id_campanha = p_id_campanha;

    -- O líquido é a SOMA dos líquidos por contribuição, não o arredondamento do total: assim repasse.valor_liquido
    -- sempre fecha com as contribuições do repasse.
    SELECT COALESCE(SUM(valor), 0), COALESCE(SUM(ROUND(valor * (1 - v_taxa / 100), 2)), 0)
    INTO v_bruto, v_liquido
    FROM contribuicao
    WHERE id_campanha = p_id_campanha AND status = 'confirmado' AND id_repasse IS NULL
      AND (meio_pagamento = 'pix' OR dinheiro_liberado_em IS NOT NULL);

    IF v_bruto <= 0 THEN
        RETURN NULL;
    END IF;
    v_liquido := public.liquido_repasse(v_bruto, v_liquido);

    INSERT INTO repasse (id_campanha, valor_bruto, valor_liquido, meta_atingida, taxa_relativa, status)
    VALUES (p_id_campanha, v_bruto, v_liquido, p_meta_atingida, v_taxa, 'pendente')
    RETURNING repasse.id_repasse INTO v_id_repasse;

    UPDATE contribuicao SET id_repasse = v_id_repasse
    WHERE id_campanha = p_id_campanha AND status = 'confirmado' AND id_repasse IS NULL
      AND (meio_pagamento = 'pix' OR dinheiro_liberado_em IS NOT NULL);
    RETURN v_id_repasse;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     criar_repasses_liberados
-- Assinatura: () -> INT
-- Bloco:      [05-K-2]
-- Regra:      Repasse da parte do cartão: o dinheiro do cartão só é liberado pelo provedor cerca de 30 dias depois do
--             pagamento, então no fechamento ele fica fora do repasse. Quando é liberado (dinheiro_liberado_em), esta
--             função cria um repasse adicional com ele, para toda campanha cujo destino do dinheiro é 'repasse'. Chamada
--             pelo worker de repasse antes de cada ciclo. Devolve quantos repasses criou. SECURITY DEFINER, sem
--             autorização (job de fundo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_repasses_liberados()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id     INT;
    v_criados INT := 0;
BEGIN
    FOR v_id IN
        SELECT DISTINCT c.id_campanha
        FROM contribuicao c
        WHERE c.status = 'confirmado' AND c.id_repasse IS NULL
          AND c.meio_pagamento <> 'pix' AND c.dinheiro_liberado_em IS NOT NULL
        ORDER BY c.id_campanha
    LOOP
        BEGIN
            PERFORM 1 FROM campanha WHERE id_campanha = v_id FOR UPDATE;
            -- Dois IFs, nunca "destino = 'repasse' AND criar_repasse_campanha(...)": campanha ainda ativa tem destino
            -- NULL, e NULL AND x obriga o Postgres a avaliar x, o que criaria o repasse antes do fim da campanha.
            IF public.destino_dinheiro_campanha(v_id) = 'repasse' THEN
                IF public.criar_repasse_campanha(
                       v_id, (SELECT valor_bruto_arrecadado >= meta_financeira FROM campanha WHERE id_campanha = v_id)
                   ) IS NOT NULL THEN
                    v_criados := v_criados + 1;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'criar_repasses_liberados: campanha % ignorada neste ciclo (% / %)', v_id, SQLSTATE, SQLERRM;
        END;
    END LOOP;
    RETURN v_criados;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     cartao_a_liberar
-- Assinatura: () -> TABLE (id_campanha INT, titulo_campanha VARCHAR, valor DECIMAL, previsto_para TIMESTAMPTZ)
-- Bloco:      [05-K-2]
-- Regra:      Para o pesquisador logado: o dinheiro de cartão já pago nas campanhas dele que o provedor ainda não liberou
--             (fora de repasse até lá), por campanha, com a data prevista (a confirmação mais recente + o prazo do
--             parâmetro cartao_dias_liberacao). SECURITY DEFINER: o pesquisador não lê as contribuições de outras pessoas
--             (pol_contribuicao_select); aqui sai só a soma das campanhas dele.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cartao_a_liberar()
RETURNS TABLE (id_campanha INT, titulo_campanha VARCHAR, valor DECIMAL, previsto_para TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT ca.id_campanha, ca.titulo, SUM(c.valor),
           MAX(COALESCE(conf.confirmado_em, c.criado_em))
               + (public.config_numero('cartao_dias_liberacao', 30) * INTERVAL '1 day')
    FROM contribuicao c
    JOIN campanha ca ON ca.id_campanha = c.id_campanha
    LEFT JOIN LATERAL (
        SELECT MIN(a.timestamp) AS confirmado_em FROM auditoria_financeira a
        WHERE a.id_contribuicao = c.id_contribuicao AND a.status_novo = 'confirmado'
    ) conf ON TRUE
    WHERE ca.id_usuario = public.id_usuario_atual()
      AND c.status = 'confirmado' AND c.meio_pagamento <> 'pix'
      AND c.dinheiro_liberado_em IS NULL AND c.id_repasse IS NULL
    GROUP BY ca.id_campanha, ca.titulo
    ORDER BY ca.id_campanha;
$$;

-- ----------------------------------------------------------------------------
-- Função:     devolver_contribuicoes_campanha
-- Assinatura: (p_id_campanha INT) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      Manda cada contribuição 'confirmado' da campanha para 'a_devolver' (via atualizar_status_contribuicao,
--             auditado). Quem devolve, o valor inteiro, é o worker de estorno. Usada no tudo-ou-nada que fechou sem a
--             meta, no projeto cancelado pelo pesquisador e no encerramento por moderação.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.devolver_contribuicoes_campanha(p_id_campanha INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id INT;
BEGIN
    FOR v_id IN
        SELECT id_contribuicao FROM contribuicao
        WHERE id_campanha = p_id_campanha AND status = 'confirmado'
        ORDER BY id_contribuicao
    LOOP
        PERFORM public.atualizar_status_contribuicao(v_id, 'a_devolver');
    END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     destino_dinheiro_campanha
-- Assinatura: (p_id_campanha INT) -> TEXT ('repasse' | 'devolucao' | NULL)
-- Bloco:      [05-K-2]
-- Regra:      Para onde vai o dinheiro de uma campanha que já não está 'ativo'. Um lugar só para a regra, usada pelo
--             encerramento antes do prazo (trg_campanha_encerrada_destino_dinheiro) e pelo pagamento que chega depois do
--             fim (aplicar_evento_pagamento):
--               sucesso                          -> repasse
--               nao_atingido                     -> repasse no flexível; devolução no tudo-ou-nada
--               encerrado_moderacao              -> devolução (campanha derrubada pela moderação)
--               encerrado com pedido aprovado pelo admin ("encerrar antes do prazo") -> repasse, se a campanha é
--                                                   flexível ou bateu a meta; senão devolução
--               encerrado pelo próprio pesquisador, sem admin ("cancelar o projeto") -> devolução
--               qualquer outro status            -> NULL (revisão manual)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.destino_dinheiro_campanha(p_id_campanha INT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN c.status = 'sucesso' THEN 'repasse'
        WHEN c.status = 'nao_atingido' THEN CASE WHEN c.modelo = 'flexivel' THEN 'repasse' ELSE 'devolucao' END
        WHEN c.status = 'encerrado_moderacao' THEN 'devolucao'
        WHEN c.status = 'encerrado' THEN
            CASE WHEN (c.modelo = 'flexivel' OR c.valor_bruto_arrecadado >= c.meta_financeira)
                      AND EXISTS (SELECT 1 FROM solicitacao_encerramento se
                                  WHERE se.id_campanha = c.id_campanha AND se.status = 'aprovado'
                                    AND se.id_admin IS NOT NULL)
                 THEN 'repasse' ELSE 'devolucao' END
    END
    FROM campanha c
    WHERE c.id_campanha = p_id_campanha;
$$;

-- ----------------------------------------------------------------------------
-- Função:     fn_campanha_encerrada_destino_dinheiro
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Campanha que sai de 'ativo' antes do prazo (projeto cancelado pelo pesquisador, encerramento antes do
--             prazo aprovado pelo admin, ou moderação) leva o dinheiro já pago junto, sem ninguém decidir na mão:
--             repassa ou devolve conforme destino_dinheiro_campanha(). Roda dentro da mesma transação do encerramento.
--             Pix ainda pendente segue o mesmo destino quando for pago (aplicar_evento_pagamento).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_campanha_encerrada_destino_dinheiro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.destino_dinheiro_campanha(NEW.id_campanha) = 'repasse' THEN
        PERFORM public.criar_repasse_campanha(NEW.id_campanha, NEW.valor_bruto_arrecadado >= NEW.meta_financeira);
    ELSE
        PERFORM public.devolver_contribuicoes_campanha(NEW.id_campanha);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_campanha_encerrada_destino_dinheiro ON campanha;
CREATE TRIGGER trg_campanha_encerrada_destino_dinheiro
AFTER UPDATE OF status ON campanha
FOR EACH ROW
WHEN (OLD.status = 'ativo' AND NEW.status IN ('encerrado', 'encerrado_moderacao'))
EXECUTE FUNCTION public.fn_campanha_encerrada_destino_dinheiro();

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
--             Espera os pagamentos pendentes: campanha vencida que ainda tem Pix pendente dentro da validade
--             (configuracoes.pix_validade_horas) não é encerrada neste ciclo. Ela já não recebe apoio novo (91017),
--             e o resultado (sucesso ou não atingida) só sai quando cada pendente foi pago ou venceu, no máximo
--             pix_validade_horas depois do fim. Sem isso, um Pix pago no último minuto, com o aviso chegando depois
--             do encerramento, faria uma campanha que bateu a meta ser dada como não atingida. Mesmo princípio do
--             "Aguardando" do Catarse. Ver DOCUMENTACAO_BD.md [05-K-2-E].
--             Além de trocar o status, o encerramento AGORA aciona o dinheiro (PR-06 do plano de pagamentos), tudo na
--             mesma transação por campanha (uma que falhe volta inteira ao estado anterior e é tentada no próximo ciclo):
--               - 'sucesso' (qualquer modelo) e 'nao_atingido' em campanha FLEXÍVEL: cria UMA linha em repasse
--                 (valor_bruto = soma das contribuições 'confirmado'; taxa_relativa = campanha.taxa_plataforma, ou a taxa
--                 padrão se ainda NULL; valor_liquido = soma dos líquidos por contribuição; meta_atingida conforme o
--                 resultado; status 'pendente'), e cada contribuição 'confirmado' passa a apontar para ele (contribuicao.id_repasse).
--                 O flexível fica com o que arrecadou mesmo sem a meta (RF-038/RF-063), por isso nunca devolve.
--                 Sem contribuição confirmada (bruto 0) não há o que repassar e nenhuma linha é criada.
--                 Quem faz a transferência é o worker de repasse (PR-08), não esta função.
--               - 'nao_atingido' em campanha ALL-OR-NOTHING: move cada contribuição 'confirmado' para 'a_devolver'. NÃO
--                 calcula valor nenhum: quem apoiou recebe de volta o valor inteiro da contribuição (a tarifa de pagamento,
--                 paga por cima, fica com o provedor), pelo worker de estorno (PR-07).
--               - contribuição 'pendente' NÃO é tocada aqui: se o pagamento ainda chegar (aviso atrasado do gateway),
--                 aplicar_evento_pagamento() o confirma e aplica a regra do fechamento (repasse adicional; devolução só em
--                 all-or-nothing que não bateu a meta). O Pix pendente vence sozinho em expirar_contribuicoes_pendentes.
--             Toda mudança de contribuição passa por atualizar_status_contribuicao() (valida a transição e audita).
--             A campanha é travada ANTES das contribuições (mesma ordem de aplicar_evento_pagamento), e o resultado
--             (sucesso x nao_atingido) é lido já com o lock: uma confirmação de webhook em andamento termina antes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.encerrar_campanhas_vencidas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_encerradas INT := 0;
    v_id         INT;
    v_novo       status_campanha;
    v_modelo     modelo_campanha;
BEGIN
    -- Linha a linha: uma campanha que uma trigger recuse não impede as outras de encerrar. A falha vira
    -- WARNING nos logs do Postgres e a campanha é tentada de novo no ciclo seguinte. Ver DOCUMENTACAO_BD.md [05-K-2-E].
    FOR v_id IN
        SELECT c.id_campanha FROM campanha c
        WHERE c.status = 'ativo' AND c.data_fim IS NOT NULL AND c.data_fim <= NOW()
          AND NOT EXISTS (
              SELECT 1 FROM contribuicao ct
              WHERE ct.id_campanha = c.id_campanha
                AND ct.status = 'pendente'
                AND ct.meio_pagamento = 'pix'
                AND ct.criado_em > NOW() - (public.config_numero('pix_validade_horas', 24) * INTERVAL '1 hour')
          )
        ORDER BY c.id_campanha
    LOOP
        BEGIN
            PERFORM 1 FROM campanha WHERE id_campanha = v_id FOR UPDATE;

            UPDATE campanha
            SET status = (CASE
                WHEN valor_bruto_arrecadado >= meta_financeira THEN 'sucesso'
                ELSE 'nao_atingido'
            END)::status_campanha
            WHERE id_campanha = v_id AND status = 'ativo'
            RETURNING status, modelo INTO v_novo, v_modelo;

            IF NOT FOUND THEN
                CONTINUE; -- outra execução já a encerrou entre a lista e o lock
            END IF;
            v_encerradas := v_encerradas + 1;

            IF v_novo = 'sucesso' OR v_modelo = 'flexivel' THEN
                PERFORM public.criar_repasse_campanha(v_id, v_novo = 'sucesso');
            ELSE
                -- nao_atingido em all-or-nothing: o dinheiro volta inteiro para quem apoiou (worker de estorno).
                PERFORM public.devolver_contribuicoes_campanha(v_id);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'encerrar_campanhas_vencidas: campanha % ignorada neste ciclo (% / %)', v_id, SQLSTATE, SQLERRM;
        END;
    END LOOP;

    RETURN v_encerradas;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     expirar_contribuicoes_pendentes
-- Assinatura: () -> INT
-- Bloco:      [05-K-2]
-- Regra:      O Pix pendente que passou da validade (configuracoes.pix_validade_horas, padrão 24, o mesmo prazo
--             que o gateway recebe ao gerar o código) vira 'expirado'. Sem isto, um Pix gerado e nunca pago
--             ficaria 'pendente' para sempre. SECURITY DEFINER, chamada por @Cron, sem sessão de usuário (o
--             app_nestjs não tem UPDATE em contribuicao). Retorna quantas expiraram.
--             Cada expiração passa por atualizar_status_contribuicao() (valida a transição e grava auditoria_financeira),
--             como toda mudança de status de contribuição; antes era um UPDATE em massa que não deixava rastro. Uma
--             contribuição que o webhook confirmou entre a lista e a expiração é barrada pela máquina de estados
--             (91050), fica como está e não derruba as demais (WARNING, não é contada).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expirar_contribuicoes_pendentes()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expiradas INT := 0;
    v_id        INT;
BEGIN
    FOR v_id IN
        SELECT id_contribuicao FROM contribuicao
        WHERE status = 'pendente'
          AND meio_pagamento = 'pix'
          AND criado_em <= NOW() - (public.config_numero('pix_validade_horas', 24) * INTERVAL '1 hour')
        ORDER BY id_contribuicao
    LOOP
        BEGIN
            PERFORM public.atualizar_status_contribuicao(v_id, 'expirado');
            v_expiradas := v_expiradas + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'expirar_contribuicoes_pendentes: contribuição % ignorada neste ciclo (% / %)', v_id, SQLSTATE, SQLERRM;
        END;
    END LOOP;
    RETURN v_expiradas;
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

    -- Linha a linha: um rascunho que ainda tenha filho que impede o DELETE (ex.: denúncia, que só um dado de
    -- teste cria num rascunho) derrubava o lote inteiro toda hora. Só a violação de chave estrangeira é engolida,
    -- nos dois tipos (NO ACTION dá 23503; RESTRICT, como FK_DENUNCIA_CAMPANHA_ALVO, dá 23001); qualquer outro
    -- erro continua aparecendo.
    v_expiradas := 0;
    FOR v_id IN
        SELECT c.id_campanha FROM campanha c
        WHERE c.status = 'rascunho'
          AND c.criado_em <= NOW() - (v_ttl_horas * INTERVAL '1 hour')
    LOOP
        BEGIN
            DELETE FROM campanha WHERE id_campanha = v_id AND status = 'rascunho';
            v_expiradas := v_expiradas + 1;
        EXCEPTION WHEN foreign_key_violation OR restrict_violation THEN
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
    -- FLOOR: a campanha vai do começo do dia de início ao fim do dia de fim (23:59:59); sem arredondar para baixo,
    -- 60 dias de calendário contariam 60,99 e passariam do máximo.
    v_duracao_dias := FLOOR(EXTRACT(EPOCH FROM (NEW.data_fim - NEW.data_inicio)) / 86400);

    IF v_duracao_dias < v_prazo_minimo OR v_duracao_dias > v_prazo_maximo THEN
        RAISE EXCEPTION 'A duração da campanha precisa estar entre % e % dias.', v_prazo_minimo, v_prazo_maximo
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
        RAISE EXCEPTION 'A meta financeira precisa ser de pelo menos %.', 'R$ ' || replace(to_char(v_meta_minima, 'FM999999990.00'), '.', ',')
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
-- Função:     fn_valida_solicitacao_encerramento
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Pedido de encerramento só de campanha ativa (91038) e sempre com justificativa (90028), RF-064. Pedido ao
--             admin (pendente) só de campanha flexível ou com a meta batida (91051). Um pendente
--             por vez é o índice uq_solicitacao_encerramento_pendente (02). SECURITY DEFINER: lê a campanha sem depender
--             do que a RLS mostra.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_solicitacao_encerramento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.justificativa_pesquisador IS NULL OR btrim(NEW.justificativa_pesquisador) = '' THEN
        RAISE EXCEPTION 'Escreva por que a campanha está sendo encerrada.' USING ERRCODE = '90028';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM campanha WHERE id_campanha = NEW.id_campanha AND status = 'ativo') THEN
        RAISE EXCEPTION 'Só uma campanha ativa pode ser encerrada antecipadamente.' USING ERRCODE = '91038';
    END IF;
    -- Pedido ao admin é para encerrar antes do prazo E receber o dinheiro: só cabe se o dinheiro já é do pesquisador
    -- (flexível, ou tudo-ou-nada com a meta batida). O cancelamento do projeto (devolve tudo) não passa por aqui: o
    -- pesquisador faz direto (encerrar_campanha_sem_contribuicao, 03), que grava o pedido já aprovado e sem admin.
    IF NEW.status = 'pendente' AND EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = NEW.id_campanha AND modelo = 'all-or-nothing' AND valor_bruto_arrecadado < meta_financeira
    ) THEN
        RAISE EXCEPTION 'Esta campanha ainda não bateu a meta. Para encerrar agora, cancele o projeto: todo o dinheiro volta para quem apoiou.'
            USING ERRCODE = '91051';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solicitacao_valida_criacao ON solicitacao_encerramento;
CREATE TRIGGER trg_solicitacao_valida_criacao
BEFORE INSERT ON solicitacao_encerramento
FOR EACH ROW
EXECUTE FUNCTION public.fn_valida_solicitacao_encerramento();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_transicao_solicitacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      pol_solicitacao_update (04) libera UPDATE também ao dono da campanha (não só a quem decide), para destravar o
--             valor 'cancelado' do ENUM status_encerramento. Esta trigger garante que o dono só consegue cancelar a própria
--             solicitação enquanto ainda está 'pendente': nenhuma outra coluna, nenhuma outra transição. Para todos, um
--             pedido já decidido ou cancelado não muda mais de situação (91041); quem decide usa
--             decidir_solicitacao_encerramento() (03), que também encerra a campanha.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_transicao_solicitacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status AND OLD.status <> 'pendente' THEN
        RAISE EXCEPTION 'Só um pedido pendente pode mudar de situação.' USING ERRCODE = '91041';
    END IF;

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

    -- Aprovar ou rejeitar só por decidir_solicitacao_encerramento() (03), que grava quem decidiu e quando e, ao aprovar,
    -- encerra a campanha: uma mudança direta de status deixaria o pedido aprovado com a campanha ainda ativa.
    IF NEW.status IN ('aprovado', 'rejeitado') AND NEW.status IS DISTINCT FROM OLD.status AND NEW.avaliado_em IS NULL THEN
        RAISE EXCEPTION 'Aprovar ou rejeitar um pedido de encerramento é pela decisão do administrador.' USING ERRCODE = '92033';
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
--             configurável, via configuracoes.valor_minimo_contribuicao. No cartão, também: desligado pelo admin
--             (cartao_habilitado, 91052) e faixa própria (valor_minimo/maximo_contribuicao_cartao, 90037/90038). O boleto
--             nasce desligado (boleto_habilitado, 91053). Cartão e boleto só em campanha flexível: validar_contribuicao_all_or_nothing.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_contribuicao_valor_minimo()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_minimo DECIMAL;
BEGIN
    v_valor_minimo := public.config_numero('valor_minimo_contribuicao', 5.00);

    IF NEW.valor < v_valor_minimo THEN
        RAISE EXCEPTION 'O valor da contribuição precisa ser de pelo menos %.', 'R$ ' || replace(to_char(v_valor_minimo, 'FM999999990.00'), '.', ',')
            USING ERRCODE = '90014';
    END IF;

    -- Cartão: pode ser desligado pelo admin; e tem faixa própria (a parte fixa da tarifa pesa num apoio pequeno, e o
    -- teto limita o prejuízo de uma contestação de compra).
    IF NEW.meio_pagamento = 'cartao_credito' THEN
        IF NOT public.config_booleano('cartao_habilitado', TRUE) THEN
            RAISE EXCEPTION 'Pagamento com cartão está desligado no momento. Use o Pix.' USING ERRCODE = '91052';
        END IF;
        IF NEW.valor < public.config_numero('valor_minimo_contribuicao_cartao', 20.00) THEN
            RAISE EXCEPTION 'No cartão, a contribuição precisa ser de pelo menos %.',
                'R$ ' || replace(to_char(public.config_numero('valor_minimo_contribuicao_cartao', 20.00), 'FM999999990.00'), '.', ',')
                USING ERRCODE = '90037';
        END IF;
        IF NEW.valor > public.config_numero('valor_maximo_contribuicao_cartao', 500.00) THEN
            RAISE EXCEPTION 'No cartão, a contribuição pode ser de no máximo %. Para um valor maior, use o Pix.',
                'R$ ' || replace(to_char(public.config_numero('valor_maximo_contribuicao_cartao', 500.00), 'FM999999990.00'), '.', ',')
                USING ERRCODE = '90038';
        END IF;
    END IF;

    IF NEW.meio_pagamento = 'boleto' AND NOT public.config_booleano('boleto_habilitado', FALSE) THEN
        RAISE EXCEPTION 'Pagamento com boleto está desligado no momento. Use o Pix.' USING ERRCODE = '91053';
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
-- Função:     fn_contribuicao_define_taxa_pagamento
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      A tarifa do provedor de pagamento é paga por quem apoia, POR CIMA do valor: contribui 100, a cobrança é de
--             100 + tarifa. Grava em taxa_pagamento a tarifa vigente no momento do apoio (configuracoes.taxa_pagamento_pix);
--             o que vier no INSERT é ignorado. A tarifa não entra no arrecadado, no repasse nem na devolução (o tudo-ou-nada
--             devolve só `valor`), então a plataforma nunca paga a tarifa do provedor. Cartão: estimada pelos parâmetros
--             taxa_cartao_percentual e taxa_cartao_fixa. Boleto: fixa, configuracoes.taxa_pagamento_boleto. Meio sem fluxo fica 0.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_contribuicao_define_taxa_pagamento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Cartão: a tarifa é percentual + fixa sobre o valor COBRADO, então o cobrado sai de (valor + fixa) / (1 - %),
    -- arredondado para cima: o líquido nunca fica abaixo do valor da contribuição.
    NEW.taxa_pagamento := CASE NEW.meio_pagamento
        WHEN 'pix' THEN public.config_numero('taxa_pagamento_pix', 1.99)
        WHEN 'boleto' THEN public.config_numero('taxa_pagamento_boleto', 1.99)
        WHEN 'cartao_credito' THEN
            CEIL((NEW.valor + public.config_numero('taxa_cartao_fixa', 0.49))
                 / (1 - public.config_numero('taxa_cartao_percentual', 1.99) / 100) * 100) / 100 - NEW.valor
        ELSE 0 END;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contribuicao_define_taxa_pagamento ON contribuicao;
CREATE TRIGGER trg_contribuicao_define_taxa_pagamento
BEFORE INSERT ON contribuicao
FOR EACH ROW
EXECUTE FUNCTION public.fn_contribuicao_define_taxa_pagamento();

-- ----------------------------------------------------------------------------
-- Função:     ajustar_tarifa_pagamento
-- Assinatura: (p_id_contribuicao INT, p_tarifa DECIMAL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      O provedor informou, ao criar a cobrança, a tarifa REAL (promoção, isenção ou tarifa nova) e ela é
--             diferente da estimada: grava a real na contribuição (ainda 'pendente'). No Pix e no boleto a tarifa é fixa,
--             então ela também vira o padrão (taxa_pagamento_pix, taxa_pagamento_boleto), para as próximas já nascerem certas; a mudança do
--             parâmetro fica no log de auditoria. No cartão (percentual + fixa) uma cobrança só não diz as duas partes:
--             corrige a contribuição e deixa os parâmetros do cartão com o admin. Chamada pelo Nest no POST /contribuicao,
--             com o número que o provedor devolveu; tarifa negativa ou maior que a própria contribuição é recusada (90036).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ajustar_tarifa_pix(INT, DECIMAL);
CREATE OR REPLACE FUNCTION public.ajustar_tarifa_pagamento(p_id_contribuicao INT, p_tarifa DECIMAL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_valor DECIMAL(10,2);
    v_meio  meio_pagamento;
BEGIN
    SELECT valor, meio_pagamento INTO v_valor, v_meio FROM contribuicao
    WHERE id_contribuicao = p_id_contribuicao AND status = 'pendente';
    IF NOT FOUND THEN
        RETURN;
    END IF;
    IF p_tarifa IS NULL OR p_tarifa < 0 OR p_tarifa >= v_valor THEN
        RAISE EXCEPTION 'Tarifa do provedor fora do esperado: %.', p_tarifa USING ERRCODE = '90036';
    END IF;

    UPDATE contribuicao SET taxa_pagamento = p_tarifa WHERE id_contribuicao = p_id_contribuicao;
    IF v_meio IN ('pix', 'boleto') THEN
        UPDATE configuracoes SET valor = to_char(p_tarifa, 'FM999999990.00')
        WHERE chave = CASE v_meio WHEN 'pix' THEN 'taxa_pagamento_pix' ELSE 'taxa_pagamento_boleto' END
          AND id_usuario IS NULL AND valor::DECIMAL IS DISTINCT FROM p_tarifa;
    END IF;
END;
$$;

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
-- Função:     fn_valida_transicao_status_contribuicao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Máquina de estados de contribuicao.status. Só passam as 10 transições abaixo; qualquer outra levanta 91050.
--             pendente         -> confirmado | erro | expirado
--             confirmado       -> repassado | a_devolver | reembolsado | reembolso_manual
--             a_devolver       -> devolvido | reembolso_manual
--             reembolso_manual -> devolvido   (só por concluir_reembolso_manual: uma pessoa devolveu por fora do sistema)
--             'devolvido' é só da devolução do tudo-ou-nada (automática em lote, ou manual depois que o automático desistiu);
--             qualquer outro estorno é 'reembolsado'.
--             repassado, devolvido, reembolsado, erro e expirado são estados finais; reembolso_manual só sai para devolvido.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_transicao_status_contribuicao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (OLD.status::text, NEW.status::text) IN (
        ('pendente',   'confirmado'),
        ('pendente',   'erro'),
        ('pendente',   'expirado'),
        ('confirmado', 'repassado'),
        ('confirmado', 'a_devolver'),
        ('confirmado', 'reembolsado'),
        ('confirmado', 'reembolso_manual'),
        ('a_devolver', 'devolvido'),
        ('a_devolver', 'reembolso_manual'),
        ('reembolso_manual', 'devolvido')
    ) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status de contribuição não permitida: % -> %.', OLD.status, NEW.status
        USING ERRCODE = '91050',
              DETAIL  = json_build_object('de', OLD.status, 'para', NEW.status)::text;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_transicao_status_contribuicao
-- Tabela:    contribuicao
-- Momento:   BEFORE UPDATE, só quando o status muda
-- Função:    fn_valida_transicao_status_contribuicao()
-- Bloco:     [05-K-2]
-- Regra:     Aplica a máquina de estados. Nome novo de propósito: trg_valida_status_contribuicao (acima) já existe e
--            valida campanha ativa no INSERT.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_valida_transicao_status_contribuicao ON contribuicao;
CREATE TRIGGER trg_valida_transicao_status_contribuicao
BEFORE UPDATE ON contribuicao
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION public.fn_valida_transicao_status_contribuicao();

-- ----------------------------------------------------------------------------
-- Função:     registrar_evento_pagamento
-- Assinatura: (p_provedor VARCHAR, p_id_evento_externo VARCHAR, p_tipo_evento VARCHAR, p_payload JSONB)
--             -> TABLE (id_evento INT, duplicado BOOLEAN, processado BOOLEAN, em_revisao BOOLEAN)
-- Bloco:      [05-K-2]
-- Regra:      Grava o webhook em evento_pagamento antes de qualquer processamento. Evento repetido (mesmo provedor e
--             mesmo id externo) não grava de novo e volta duplicado = TRUE com o id do registro original.
--             `processado` = o evento JÁ foi tratado COM SUCESSO (processado_em preenchido): reentrega de algo resolvido
--             é duplicata de verdade (200 e nada a fazer).
--             `em_revisao` = o sistema deliberadamente NÃO aplicou o evento e ele espera decisão humana
--             (revisao_manual_em preenchido, processado_em NULL): reentregar não muda nada, também é 200 sem reprocessar.
--             Evento recebido que falhou antes (nem processado nem em revisão) NÃO é duplicata para efeito de ignorar:
--             a reentrega do gateway é a nova tentativa. "Evento já recebido" sozinho nunca é motivo para ignorar.
--             SECURITY DEFINER e SEM AUTORIZAÇÃO DE PROPÓSITO (pré-autenticação, mesma categoria de
--             atualizar_status_contribuicao): o endpoint do webhook precisa validar a assinatura do gateway ANTES de chamar.
-- ----------------------------------------------------------------------------
-- DROP necessário: CREATE OR REPLACE não pode mudar as colunas de retorno (RETURNS TABLE) de uma função existente.
DROP FUNCTION IF EXISTS public.registrar_evento_pagamento(VARCHAR, VARCHAR, VARCHAR, JSONB);
CREATE OR REPLACE FUNCTION public.registrar_evento_pagamento(
    p_provedor VARCHAR, p_id_evento_externo VARCHAR, p_tipo_evento VARCHAR, p_payload JSONB
)
RETURNS TABLE (id_evento INT, duplicado BOOLEAN, processado BOOLEAN, em_revisao BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id         INT;
    v_processado BOOLEAN;
    v_em_revisao BOOLEAN;
BEGIN
    INSERT INTO evento_pagamento (provedor, id_evento_externo, tipo_evento, payload)
    VALUES (p_provedor, p_id_evento_externo, p_tipo_evento, p_payload)
    ON CONFLICT ON CONSTRAINT "UK_EVENTO_PAGAMENTO_PROVEDOR_EVENTO_EXTERNO" DO NOTHING
    RETURNING id_evento_pagamento INTO v_id;

    IF v_id IS NOT NULL THEN
        RETURN QUERY SELECT v_id, FALSE, FALSE, FALSE;
        RETURN;
    END IF;

    SELECT e.id_evento_pagamento,
           (e.processado_em IS NOT NULL),
           (e.revisao_manual_em IS NOT NULL AND e.processado_em IS NULL)
    INTO v_id, v_processado, v_em_revisao
    FROM evento_pagamento e
    WHERE e.provedor = p_provedor AND e.id_evento_externo = p_id_evento_externo;

    RETURN QUERY SELECT v_id, TRUE, v_processado, v_em_revisao;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     aplicar_evento_pagamento
-- Assinatura: (p_id_evento INT, p_provedor VARCHAR, p_id_cobranca VARCHAR, p_novo_status status_contribuicao,
--              p_valor_evento DECIMAL DEFAULT NULL) -> VARCHAR (o resultado, em texto)
-- Bloco:      [05-K-2]
-- Regra:      Aplica UM evento de webhook já gravado, de forma ATÔMICA: acha a contribuição pela cobrança do gateway
--             (provedor + id_transacao_api), aplica a transição via atualizar_status_contribuicao() e marca o evento
--             como processado, tudo na mesma transação. Existe porque o webhook roda SEM usuário: a RLS esconde
--             `contribuicao` dele, então a busca tem que acontecer aqui dentro (SECURITY DEFINER).
--             p_novo_status é decidido pelo Nest a partir do estado REAL consultado no gateway, nunca do payload.
--             p_novo_status NULL = evento que não pede ação (repasse, desconhecido): só marca como processado.
--             Estados do evento (ver evento_pagamento em 01): processado_em = SUCESSO; revisao_manual_em = o sistema NÃO
--             aplicou de propósito e alguém precisa decidir; erro_processamento sozinho = falhou, vale tentar de novo.
--             Resultados (nenhum levanta exceção, de propósito: o webhook responde 200 e o resultado fica registrado):
--               'aplicado'                    transição feita; evento processado.
--               'sem_mudanca'                 a contribuição já estava no status pedido (ex.: 2º evento de confirmação);
--                                             evento processado.
--               'sem_acao'                    p_novo_status NULL; evento processado.
--               'ja_processado'               o evento já tinha sido tratado com sucesso: não faz nada (idempotência).
--               'ja_em_revisao'               o evento já está em revisão manual: não faz nada (não duplica a auditoria).
--               'contribuicao_nao_encontrada' nenhuma contribuição com essa cobrança (ex.: o webhook chegou entre a
--                                             criação da cobrança e o vínculo, POST /contribuicao passo 3). Evento
--                                             FICA NÃO PROCESSADO com o motivo em erro_processamento: dá para tentar
--                                             de novo (reentrega do gateway ou reconciliação).
--               'revisao_manual'              o evento NÃO foi aplicado e a contribuição NÃO mudou de status. Motivos:
--                                             (a) a máquina de estados barrou (91050), ex.: pagamento confirmado para uma
--                                             contribuição já 'expirado'; (b) confirmação para campanha encerrada de um jeito
--                                             que não é sucesso nem nao_atingido (ex.: encerrada por moderação); (c) o repasse
--                                             adicional foi barrado por trg_valida_repasse (91003: all-or-nothing em 'sucesso'
--                                             cujo arrecadado caiu abaixo da meta por estornos). Em todos o dinheiro SE MOVEU
--                                             no gateway mas o sistema não o contabiliza sozinho: grava revisao_manual_em e o
--                                             motivo em erro_processamento (processado_em continua NULL), e UMA linha em
--                                             auditoria_financeira (status anterior = novo = o atual). Sem estorno automático.
--             CONFIRMAÇÃO DEPOIS DO FECHAMENTO DA CAMPANHA (contribuição ainda 'pendente' quando a campanha já encerrou; o aviso
--             do gateway chegou tarde): o dinheiro é de quem apoiou de boa-fé e o resultado da campanha já está dado, então
--             não é caso de revisão, e sim de aplicar a regra do fechamento a essa contribuição:
--               - campanha 'sucesso' (qualquer modelo) ou FLEXÍVEL 'nao_atingido': confirma e cria um REPASSE ADICIONAL só
--                 com o valor dela, apontado em contribuicao.id_repasse (a campanha fica com o que arrecadou; o repasse do fechamento
--                 já saiu ou está na fila).
--               - campanha ALL-OR-NOTHING 'nao_atingido': confirma e já manda para 'a_devolver' (é o único caso em que o
--                 dinheiro volta; o worker de estorno devolve o valor inteiro). Duas linhas de auditoria: confirmado e a_devolver.
--             Tudo na mesma transação: se o repasse for barrado, a confirmação também volta e o evento vai para revisão.
--             Contribuição já 'expirado' que recebe pagamento continua em revisão manual (a máquina de estados não a deixa
--             voltar), e por isso o PIX é gerado já vencendo junto com a contribuição (ver POST /contribuicao).
--             ECO DO PRÓPRIO ESTORNO: com a tarifa de pagamento em 0, a devolução do tudo-ou-nada estorna a cobrança inteira e
--             volta como webhook 'reembolsado'. Se a contribuição já está 'devolvido', é o mesmo dinheiro ('sem_mudanca');
--             se ainda está 'a_devolver' (o worker estornou mas não chegou a gravar), o evento a conclui como 'devolvido'.
--               'evento_inexistente'          p_id_evento não existe.
--             A guarda de campanha mora AQUI e não em atualizar_status_contribuicao() de propósito: este é o único caminho
--             automático até 'confirmado'; atualizar_status_contribuicao() continua sendo a ferramenta de uma decisão
--             humana futura (resolver uma revisão manual) que precise confirmar mesmo assim.
--             Só a confirmação depende do estado da campanha: estorno e expiração continuam valendo depois do fechamento.
--             Ordem de locks: evento -> campanha -> contribuição, a MESMA de encerrar_campanhas_vencidas (campanha ->
--             contribuição), para webhook e cron não ficarem em deadlock. Travar a campanha também fecha a corrida
--             "o cron fecha a campanha no instante em que o webhook confirma".
--             SEM AUTORIZAÇÃO DE PROPÓSITO (mesma categoria de registrar_evento_pagamento): a barreira é a verificação
--             de autenticidade do webhook, feita pelo Nest ANTES de qualquer chamada.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.aplicar_evento_pagamento(INT, VARCHAR, VARCHAR, status_contribuicao, DECIMAL);
CREATE OR REPLACE FUNCTION public.aplicar_evento_pagamento(
    p_id_evento INT, p_provedor VARCHAR, p_id_cobranca VARCHAR,
    p_novo_status status_contribuicao, p_valor_evento DECIMAL DEFAULT NULL,
    p_dinheiro_liberado BOOLEAN DEFAULT FALSE
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_processado_em   TIMESTAMPTZ;
    v_revisao_em      TIMESTAMPTZ;
    v_id_contribuicao INT;
    v_id_campanha     INT;
    v_status_campanha status_campanha;
    v_modelo          modelo_campanha;
    v_taxa            DECIMAL(5,2);
    v_status          status_contribuicao;
    v_valor           DECIMAL(10,2);
    v_meio            meio_pagamento;
    v_destino         TEXT;
    v_motivo          TEXT;
    v_liquido         DECIMAL(10,2);
    v_id_repasse      INT;
BEGIN
    SELECT e.processado_em, e.revisao_manual_em INTO v_processado_em, v_revisao_em
    FROM evento_pagamento e
    WHERE e.id_evento_pagamento = p_id_evento
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN 'evento_inexistente';
    END IF;
    IF v_processado_em IS NOT NULL THEN
        RETURN 'ja_processado';
    END IF;
    IF v_revisao_em IS NOT NULL THEN
        RETURN 'ja_em_revisao';
    END IF;

    IF p_novo_status IS NULL THEN
        UPDATE evento_pagamento SET processado_em = NOW(), erro_processamento = NULL
        WHERE id_evento_pagamento = p_id_evento;
        RETURN 'sem_acao';
    END IF;

    -- Só para descobrir a campanha, SEM travar a contribuição ainda (a ordem de locks é campanha -> contribuição).
    SELECT c.id_contribuicao, c.id_campanha INTO v_id_contribuicao, v_id_campanha
    FROM contribuicao c
    WHERE c.provedor = p_provedor AND c.id_transacao_api = p_id_cobranca;

    IF NOT FOUND THEN
        UPDATE evento_pagamento
        SET erro_processamento = 'Contribuição não encontrada para a cobrança ' || COALESCE(p_id_cobranca, '(sem id)') || '.'
        WHERE id_evento_pagamento = p_id_evento;
        RETURN 'contribuicao_nao_encontrada';
    END IF;

    SELECT ca.status, ca.modelo, COALESCE(ca.taxa_plataforma, public.config_numero('taxa_plataforma_padrao', 5.00))
    INTO v_status_campanha, v_modelo, v_taxa
    FROM campanha ca
    WHERE ca.id_campanha = v_id_campanha
    FOR UPDATE;

    -- Relê a contribuição já com o lock: o status pode ter mudado entre a busca e o lock.
    SELECT c.status, c.valor, c.meio_pagamento INTO v_status, v_valor, v_meio
    FROM contribuicao c
    WHERE c.id_contribuicao = v_id_contribuicao
    FOR UPDATE;

    -- Estorno total de uma contribuição que o sistema manda devolver é a própria devolução (ver cabeçalho), inclusive
    -- a que foi para reembolso manual e o provedor concluiu depois (boleto: quem apoiou preencheu os dados bancários).
    IF p_novo_status = 'reembolsado' AND v_status IN ('a_devolver', 'reembolso_manual') THEN
        p_novo_status := 'devolvido';
    END IF;

    -- Mesmo status que o pedido, ou eco do estorno total que o próprio worker fez (devolvido -> 'reembolsado').
    IF v_status = p_novo_status OR (p_novo_status = 'reembolsado' AND v_status = 'devolvido') THEN
        IF p_dinheiro_liberado AND v_status = 'confirmado' THEN
            UPDATE contribuicao SET dinheiro_liberado_em = COALESCE(dinheiro_liberado_em, NOW())
            WHERE id_contribuicao = v_id_contribuicao AND meio_pagamento <> 'pix';
        END IF;
        UPDATE evento_pagamento SET processado_em = NOW(), erro_processamento = NULL
        WHERE id_evento_pagamento = p_id_evento;
        RETURN 'sem_mudanca';
    END IF;

    -- Confirmação de contribuição pendente depois de a campanha fechar: aplica a regra do fechamento (ver cabeçalho).
    IF p_novo_status = 'confirmado' AND v_status = 'pendente' AND v_status_campanha <> 'ativo' THEN
        v_destino := public.destino_dinheiro_campanha(v_id_campanha);
        IF v_destino IS NULL THEN
            v_motivo := 'Pagamento confirmado para uma campanha encerrada (' || v_status_campanha::text
                        || ') que não segue a regra de repasse/devolução: precisa de revisão manual.';
        END IF;
    END IF;

    IF v_motivo IS NULL THEN
        BEGIN
            PERFORM public.atualizar_status_contribuicao(v_id_contribuicao, p_novo_status, NULL, p_id_evento, p_valor_evento);

            IF p_dinheiro_liberado AND p_novo_status = 'confirmado' THEN
                UPDATE contribuicao SET dinheiro_liberado_em = COALESCE(dinheiro_liberado_em, NOW())
                WHERE id_contribuicao = v_id_contribuicao AND meio_pagamento <> 'pix';
            END IF;

            -- Cartão com dinheiro ainda não liberado não entra em repasse agora: criar_repasses_liberados cuida dele.
            IF v_destino = 'repasse' AND (v_meio = 'pix' OR p_dinheiro_liberado) THEN
                v_liquido := public.liquido_repasse(v_valor, ROUND(v_valor * (1 - v_taxa / 100), 2));
                INSERT INTO repasse (id_campanha, valor_bruto, valor_liquido, meta_atingida, taxa_relativa, status)
                VALUES (v_id_campanha, v_valor, v_liquido, (SELECT ca.valor_bruto_arrecadado >= ca.meta_financeira FROM campanha ca WHERE ca.id_campanha = v_id_campanha), v_taxa, 'pendente')
                RETURNING repasse.id_repasse INTO v_id_repasse;
                UPDATE contribuicao SET id_repasse = v_id_repasse WHERE id_contribuicao = v_id_contribuicao;
            ELSIF v_destino = 'devolucao' THEN
                PERFORM public.atualizar_status_contribuicao(v_id_contribuicao, 'a_devolver', NULL, p_id_evento);
            END IF;
        EXCEPTION
            WHEN SQLSTATE '91050' THEN
                v_motivo := CASE
                    WHEN p_novo_status = 'confirmado' AND v_status = 'expirado' THEN
                        'Pagamento confirmado para uma contribuição que já estava expirada: o valor não entra na arrecadação e precisa de revisão manual.'
                    ELSE
                        'Transição de status não permitida: ' || v_status::text || ' -> ' || p_novo_status::text
                        || '. Precisa de revisão manual.'
                END;
            WHEN SQLSTATE '91003' THEN
                v_motivo := 'Repasse adicional bloqueado (all-or-nothing abaixo da meta): o pagamento chegou depois do fechamento e precisa de revisão manual.';
        END;
    END IF;

    IF v_motivo IS NULL THEN
        UPDATE evento_pagamento SET processado_em = NOW(), erro_processamento = NULL
        WHERE id_evento_pagamento = p_id_evento;
        RETURN 'aplicado';
    END IF;

    UPDATE evento_pagamento
    SET revisao_manual_em = NOW(), erro_processamento = v_motivo
    WHERE id_evento_pagamento = p_id_evento;

    INSERT INTO auditoria_financeira (
        id_contribuicao, id_evento_pagamento, id_usuario_responsavel, valor, meio_pagamento,
        status_novo, status_anterior, evento
    )
    VALUES (
        v_id_contribuicao, p_id_evento, public.id_usuario_atual(), v_valor, v_meio,
        v_status::text, v_status::text,
        CASE WHEN p_novo_status = 'confirmado' THEN 'pagamento_recebido_em_revisao_manual'
             ELSE 'evento_em_revisao_manual: ' || p_novo_status::text END
    );
    RETURN 'revisao_manual';
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     registrar_falha_evento_pagamento
-- Assinatura: (p_id_evento INT, p_erro TEXT) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      Registra POR QUE um evento não pôde ser tratado agora (ex.: o gateway estava fora do ar na reconsulta),
--             em erro_processamento, SEM marcar como processado: o evento continua na fila (idx_evento_pagamento_pendente)
--             para a próxima tentativa. Só mexe em evento ainda não processado e que NÃO esteja em revisão manual (o
--             motivo da revisão não pode ser sobrescrito por uma falha técnica posterior). Texto cortado em 2000 caracteres.
--             SEM AUTORIZAÇÃO DE PROPÓSITO (mesma categoria de aplicar_evento_pagamento).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_falha_evento_pagamento(p_id_evento INT, p_erro TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE evento_pagamento
    SET erro_processamento = LEFT(p_erro, 2000)
    WHERE id_evento_pagamento = p_id_evento AND processado_em IS NULL AND revisao_manual_em IS NULL;
$$;

-- ----------------------------------------------------------------------------
-- Função:     eventos_para_reprocessar
-- Assinatura: (p_provedor VARCHAR, p_limite INT DEFAULT 50) -> TABLE (id_evento_pagamento INT, tipo_evento VARCHAR,
--             payload JSONB, vencido BOOLEAN)
-- Bloco:      [05-K-2]
-- Regra:      Os avisos do provedor que ficaram para "tentar de novo" (nem processados nem em revisão manual), para a
--             conferência periódica reprocessar sozinha. O provedor não reentrega um aviso que já recebeu resposta 200;
--             sem isto, o aviso que chegou antes da contribuição ser gravada (ou que não é do sistema) ficaria parado
--             para sempre. Só entra o aviso com mais de webhook_reprocessar_espera_minutos (não disputa com o webhook
--             que acabou de chegar). vencido = passou de webhook_reprocessar_horas sem encontrar a que pertence: o
--             chamador o manda para revisão manual (mandar_evento_para_revisao) em vez de tentar de novo.
--             SECURITY DEFINER, SEM AUTORIZAÇÃO DE PROPÓSITO (job de fundo, mesma categoria de listar_eventos_nao_processados).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eventos_para_reprocessar(p_provedor VARCHAR, p_limite INT DEFAULT 50)
RETURNS TABLE (id_evento_pagamento INT, tipo_evento VARCHAR, payload JSONB, vencido BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT e.id_evento_pagamento, e.tipo_evento, e.payload,
           e.recebido_em <= NOW() - public.config_numero('webhook_reprocessar_horas', 24) * INTERVAL '1 hour'
    FROM evento_pagamento e
    WHERE e.provedor = p_provedor
      AND e.processado_em IS NULL
      AND e.revisao_manual_em IS NULL
      AND e.recebido_em <= NOW() - public.config_numero('webhook_reprocessar_espera_minutos', 5) * INTERVAL '1 minute'
    ORDER BY e.recebido_em, e.id_evento_pagamento
    LIMIT p_limite;
$$;

-- ----------------------------------------------------------------------------
-- Função:     mandar_evento_para_revisao
-- Assinatura: (p_id_evento INT, p_motivo TEXT) -> BOOLEAN
-- Bloco:      [05-K-2]
-- Regra:      Tira da fila de "tentar de novo" um aviso que, depois de webhook_reprocessar_horas, continua sem
--             pertencer a nada do sistema, e o põe em revisão manual com o motivo (ex.: dinheiro entrou sem
--             contribuição; transferência que o sistema não pediu). Uma pessoa resolve no painel
--             (resolver_revisao_pagamento, com observação). Só mexe em aviso ainda não processado e fora de revisão.
--             Devolve se mudou. SEM AUTORIZAÇÃO DE PROPÓSITO (job de fundo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mandar_evento_para_revisao(p_id_evento INT, p_motivo TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH alterado AS (
        UPDATE evento_pagamento
        SET revisao_manual_em = NOW(), erro_processamento = LEFT(p_motivo, 2000)
        WHERE id_evento_pagamento = p_id_evento AND processado_em IS NULL AND revisao_manual_em IS NULL
        RETURNING 1
    )
    SELECT EXISTS (SELECT 1 FROM alterado);
$$;

-- ----------------------------------------------------------------------------
-- Função:     registrar_contestacao_pagamento
-- Assinatura: (p_id_evento INT, p_provedor VARCHAR, p_id_cobranca VARCHAR, p_motivo TEXT) -> VARCHAR (o resultado)
-- Bloco:      [05-K-2]
-- Regra:      Aviso de contestação de cartão (chargeback: quem pagou contestou a compra no banco, e o provedor tira ou
--             segura o dinheiro na conta da plataforma). Nunca muda a contribuição sozinho: acha a contribuição da cobrança,
--             põe o aviso em revisão manual com o motivo e grava UMA linha em auditoria_financeira (status anterior = novo =
--             o atual, evento 'chargeback_em_revisao_manual: <aviso do provedor>', valor da contribuição), para a tela
--             Eventos de Pagamento mostrar a contribuição e o valor. Uma pessoa decide o que fazer (ex.: cobrar o pesquisador,
--             se o dinheiro já foi repassado). Resultados: 'revisao_manual'; 'contribuicao_nao_encontrada' (o aviso fica para
--             tentar de novo, com o motivo); 'ja_processado'; 'ja_em_revisao'; 'evento_inexistente'.
--             SEM AUTORIZAÇÃO DE PROPÓSITO (mesma categoria de aplicar_evento_pagamento): a barreira é a verificação do
--             webhook, feita pelo Nest antes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_contestacao_pagamento(
    p_id_evento INT, p_provedor VARCHAR, p_id_cobranca VARCHAR, p_motivo TEXT
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_processado_em TIMESTAMPTZ;
    v_revisao_em    TIMESTAMPTZ;
    v_tipo          VARCHAR;
    v_contribuicao  RECORD;
BEGIN
    SELECT e.processado_em, e.revisao_manual_em, e.tipo_evento INTO v_processado_em, v_revisao_em, v_tipo
    FROM evento_pagamento e
    WHERE e.id_evento_pagamento = p_id_evento
    FOR UPDATE;

    IF NOT FOUND THEN RETURN 'evento_inexistente'; END IF;
    IF v_processado_em IS NOT NULL THEN RETURN 'ja_processado'; END IF;
    IF v_revisao_em IS NOT NULL THEN RETURN 'ja_em_revisao'; END IF;

    SELECT c.id_contribuicao, c.status, c.valor, c.meio_pagamento INTO v_contribuicao
    FROM contribuicao c
    WHERE c.provedor = p_provedor AND c.id_transacao_api = p_id_cobranca;

    IF NOT FOUND THEN
        UPDATE evento_pagamento
        SET erro_processamento = 'Contribuição não encontrada para a cobrança ' || COALESCE(p_id_cobranca, '(sem id)') || '.'
        WHERE id_evento_pagamento = p_id_evento;
        RETURN 'contribuicao_nao_encontrada';
    END IF;

    UPDATE evento_pagamento
    SET revisao_manual_em = NOW(), erro_processamento = LEFT(p_motivo, 2000)
    WHERE id_evento_pagamento = p_id_evento;

    INSERT INTO auditoria_financeira (
        id_contribuicao, id_evento_pagamento, id_usuario_responsavel, valor, meio_pagamento,
        status_novo, status_anterior, evento
    )
    VALUES (
        v_contribuicao.id_contribuicao, p_id_evento, public.id_usuario_atual(), v_contribuicao.valor,
        v_contribuicao.meio_pagamento, v_contribuicao.status::text, v_contribuicao.status::text,
        LEFT('chargeback_em_revisao_manual: ' || v_tipo, 200)
    );
    RETURN 'revisao_manual';
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     atualizar_status_contribuicao
-- Assinatura: (p_id INT, p_status status_contribuicao, p_id_transacao VARCHAR DEFAULT NULL,
--              p_id_evento_pagamento INT DEFAULT NULL, p_valor_evento DECIMAL DEFAULT NULL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      pol_contribuicao_update (04) era USING (true) com GRANT UPDATE de tabela inteira: qualquer usuário confirmava a
--             própria contribuição (ou a de qualquer um) por UPDATE direto, e trg_sincroniza_arrecadado_campanha somava o
--             valor em campanha.valor_bruto_arrecadado, exibindo arrecadação sem pagamento real. Como em [03-O], a coluna
--             `status` (e `id_transacao_api`) saiu do GRANT UPDATE (06) e só muda por aqui: SECURITY DEFINER, mas
--             trg_sincroniza_arrecadado_campanha e as triggers de validação all-or-nothing continuam rodando por baixo (RLS
--             é bypassada, trigger não). SEM AUTORIZAÇÃO DE PROPÓSITO (pré-autenticação): chamada pelo webhook do gateway de
--             pagamento, sem sessão de usuário (mesma categoria de registrar_falha_login, [03-O]); o endpoint precisa
--             validar a assinatura do webhook antes, nunca expor isso como rota pública genérica.
--             Além do UPDATE, grava uma linha em auditoria_financeira a cada chamada (status anterior/novo, valor, webhook de
--             origem, usuário da sessão, se houver). p_valor_evento só é usado no estorno (valor líquido devolvido);
--             sem ele, o valor auditado é contribuicao.valor. A transição em si é validada por
--             trg_valida_transicao_status_contribuicao (91050).
-- ----------------------------------------------------------------------------
-- DROP necessário: CREATE OR REPLACE com parâmetro novo criaria uma SOBRECARGA, e a chamada de 3 argumentos ficaria ambígua.
DROP FUNCTION IF EXISTS public.atualizar_status_contribuicao(INT, status_contribuicao, VARCHAR);
CREATE OR REPLACE FUNCTION public.atualizar_status_contribuicao(
    p_id INT, p_status status_contribuicao, p_id_transacao VARCHAR DEFAULT NULL,
    p_id_evento_pagamento INT DEFAULT NULL, p_valor_evento DECIMAL DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status_anterior status_contribuicao;
    v_valor           DECIMAL(10,2);
    v_meio            meio_pagamento;
BEGIN
    SELECT status, valor, meio_pagamento INTO v_status_anterior, v_valor, v_meio
    FROM contribuicao
    WHERE id_contribuicao = p_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    UPDATE contribuicao
    SET status = p_status,
        id_transacao_api = COALESCE(p_id_transacao, id_transacao_api)
    WHERE id_contribuicao = p_id;

    INSERT INTO auditoria_financeira (
        id_contribuicao, id_evento_pagamento, id_usuario_responsavel, valor, meio_pagamento,
        status_novo, status_anterior, evento
    )
    VALUES (
        p_id, p_id_evento_pagamento, public.id_usuario_atual(), COALESCE(p_valor_evento, v_valor), v_meio,
        p_status::text, v_status_anterior::text,
        -- Mesmo status com id de cobrança = é o POST /contribuicao vinculando a cobrança do gateway (passo 3), não uma
        -- transição: o texto diz o que de fato aconteceu em vez de "pendente -> pendente".
        CASE WHEN v_status_anterior = p_status AND p_id_transacao IS NOT NULL
             THEN 'cobranca_vinculada: ' || p_id_transacao
             ELSE 'status_contribuicao: ' || v_status_anterior::text || ' -> ' || p_status::text END
    );
END;
$$;


-- ----------------------------------------------------------------------------
-- Função:     fn_valida_transicao_status_repasse
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Máquina de estados do repasse (PR-09), no mesmo espírito da de contribuição:
--               pendente    -> processando | erro
--               processando -> pendente | concluido | erro
--               erro        -> pendente
--             pendente = na fila; processando = o worker pegou e pediu a transferência (ou espera o aviso do provedor);
--             processando -> pendente é a nova tentativa depois de uma falha recuperável (rede); erro -> pendente é uma
--             pessoa recolocando na fila depois de corrigir a causa. concluido é estado final (dinheiro saiu).
--             Transição fora disso levanta 91039 (mesma família de 91050).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_transicao_status_repasse()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (OLD.status::text, NEW.status::text) IN (
        ('pendente',    'processando'),
        ('pendente',    'erro'),
        ('processando', 'pendente'),
        ('processando', 'concluido'),
        ('processando', 'erro'),
        ('erro',        'pendente')
    ) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status de repasse não permitida: % -> %.', OLD.status, NEW.status
        USING ERRCODE = '91039',
              DETAIL  = json_build_object('de', OLD.status, 'para', NEW.status)::text;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_transicao_status_repasse
-- Tabela:    repasse
-- Momento:   BEFORE UPDATE, só quando o status muda
-- Função:    fn_valida_transicao_status_repasse()
-- Bloco:     [05-K-2]
-- Regra:     Aplica a máquina de estados do repasse. Convive com trg_valida_repasse (regra all-or-nothing).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_valida_transicao_status_repasse ON repasse;
CREATE TRIGGER trg_valida_transicao_status_repasse
BEFORE UPDATE ON repasse
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION public.fn_valida_transicao_status_repasse();

-- ----------------------------------------------------------------------------
-- Função:     atualizar_status_repasse
-- Assinatura: (p_id_repasse INT, p_status status_repasse, p_repassado_em TIMESTAMPTZ DEFAULT NULL,
--              p_motivo TEXT DEFAULT NULL, p_id_evento_pagamento INT DEFAULT NULL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      pol_repasse_update (04) é USING (true) de propósito, mas o GRANT UPDATE de tabela inteira que isso exigia saiu
--             (06): o único jeito de mudar `status`/`repassado_em` é por aqui. Concentra toda mudança de status do repasse e
--             a AUDITA (PR-09, equivalente ao que atualizar_status_contribuicao faz): uma linha em auditoria_financeira com
--             id_repasse, status anterior/novo, valor = valor_liquido, id do webhook que causou (se houve) e o motivo.
--             Chamada com o MESMO status e sem p_repassado_em não faz nada (sem linha de auditoria). Repasse inexistente:
--             não faz nada (como antes). SECURITY DEFINER, mas trg_valida_repasse e
--             trg_valida_transicao_status_repasse continuam rodando por baixo (RLS é bypassada, trigger não). SEM
--             AUTORIZAÇÃO DE PROPÓSITO (pré-autenticação): chamada pelo worker e pelo webhook, sem sessão de usuário.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.atualizar_status_repasse(INT, VARCHAR, TIMESTAMP);
CREATE OR REPLACE FUNCTION public.atualizar_status_repasse(
    p_id_repasse INT, p_status status_repasse, p_repassado_em TIMESTAMPTZ DEFAULT NULL,
    p_motivo TEXT DEFAULT NULL, p_id_evento_pagamento INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status status_repasse;
    v_valor  DECIMAL(10,2);
BEGIN
    SELECT r.status, r.valor_liquido INTO v_status, v_valor
    FROM repasse r
    WHERE r.id_repasse = p_id_repasse
    FOR UPDATE;

    IF NOT FOUND OR (v_status = p_status AND p_repassado_em IS NULL) THEN
        RETURN;
    END IF;

    UPDATE repasse
    SET status = p_status,
        repassado_em = COALESCE(p_repassado_em, repassado_em)
    WHERE id_repasse = p_id_repasse;

    INSERT INTO auditoria_financeira (
        id_repasse, id_evento_pagamento, id_usuario_responsavel, valor, status_novo, status_anterior, evento
    )
    VALUES (
        p_id_repasse, p_id_evento_pagamento, public.id_usuario_atual(), v_valor, p_status::text, v_status::text,
        LEFT('status_repasse: ' || v_status::text || ' -> ' || p_status::text
             || COALESCE(': ' || p_motivo, ''), 200)
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     reservar_proximo_repasse
-- Assinatura: (p_provedor VARCHAR) -> TABLE (id_repasse INT, chave_idempotencia UUID, id_transferencia_api TEXT,
--             valor_liquido DECIMAL, tipo_chave tipo_chave_pix, chave_criptografada TEXT, descricao TEXT)
-- Bloco:      [05-K-2]
-- Regra:      Fila do worker de repasse (PR-08). Pega o PRÓXIMO repasse que pode ser trabalhado e o RESERVA, na própria
--             chamada (a transação é a da chamada: não há lock preso durante a transferência, ao contrário do estorno):
--               - 'pendente' sem espera agendada para o futuro: valida de novo o que ainda vale (as contribuições do
--                 repasse que continuam 'confirmado': se algum estorno aconteceu desde o fechamento, o valor é reduzido
--                 aqui, nunca transfere dinheiro que já voltou; se não sobrou nada, vira 'erro') e muda para
--                 'processando';
--               - 'processando' cujo prazo (lease) venceu: um worker que morreu no meio, ou uma transferência que o
--                 provedor ainda não concluiu. Volta sem trocar de status; o worker, se já houver
--                 id_transferencia_api, só CONSULTA o provedor (nunca pede outra transferência).
--             Reservar = gravar o provedor, e o lease em proxima_tentativa_em (configuracoes.repasse_lease_minutos, padrão
--             10): enquanto não vence, ninguém mais pega o mesmo repasse. FOR UPDATE SKIP LOCKED garante que duas
--             instâncias simultâneas não reservem o mesmo.
--             Só entram repasses cujo dono da campanha tem chave Pix com titularidade VERIFICADA
--             (perfil_pesquisador.chave_pix_verificada_em); sem ela o repasse espera na fila, sem gastar tentativa. Só o provedor informado
--             (ou repasse ainda sem provedor).
--             Carência: um repasse 'pendente' só sai depois de configuracoes.repasse_carencia_dias (padrão 15) contados de
--             repasse.criado_em. É a janela em que o dinheiro ainda pode voltar (estorno, contestação de cartão, MED do Pix):
--             se voltar antes do repasse, sai do valor dele (as contribuições são reconferidas aqui); depois, quem ressarce
--             é o pesquisador. Mesmo princípio do prazo de 15 dias do Catarse (Termos de Uso, item 7.4).
--             SECURITY DEFINER, SEM AUTORIZAÇÃO DE PROPÓSITO (job de fundo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reservar_proximo_repasse(p_provedor VARCHAR)
RETURNS TABLE (
    id_repasse INT, chave_idempotencia UUID, id_transferencia_api TEXT, valor_liquido DECIMAL,
    tipo_chave tipo_chave_pix, chave_criptografada TEXT, descricao TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v       RECORD;
    v_bruto DECIMAL(10,2);
    v_liq   DECIMAL(10,2);
BEGIN
    LOOP
        SELECT r.id_repasse AS id, r.status AS st, r.id_transferencia_api AS id_trf, r.chave_idempotencia AS chave,
               r.valor_bruto AS bruto, r.valor_liquido AS liquido, r.taxa_relativa AS taxa, ca.titulo,
               pp.tipo_chave_pix AS tipo, pp.chave_pix_criptografada AS chave_cifrada
        INTO v
        FROM repasse r
        JOIN campanha ca ON ca.id_campanha = r.id_campanha
        JOIN perfil_pesquisador pp ON pp.id_usuario = ca.id_usuario AND pp.chave_pix_verificada_em IS NOT NULL
        WHERE ((r.status = 'pendente'    AND (r.proxima_tentativa_em IS NULL OR r.proxima_tentativa_em <= NOW())
                AND r.criado_em <= NOW() - public.config_numero('repasse_carencia_dias', 15) * INTERVAL '1 day')
            OR (r.status = 'processando' AND r.proxima_tentativa_em <= NOW()))
          AND (r.provedor IS NULL OR r.provedor = p_provedor)
        ORDER BY r.proxima_tentativa_em NULLS FIRST, r.id_repasse
        LIMIT 1
        FOR UPDATE OF r SKIP LOCKED;

        EXIT WHEN NOT FOUND;
        v_liq := v.liquido;

        IF v.st = 'pendente' THEN
            IF EXISTS (SELECT 1 FROM contribuicao c WHERE c.id_repasse = v.id) THEN
                SELECT COALESCE(SUM(c.valor), 0),
                       COALESCE(SUM(ROUND(c.valor * (1 - COALESCE(v.taxa, 0) / 100), 2)), 0)
                INTO v_bruto, v_liq
                FROM contribuicao c
                WHERE c.id_repasse = v.id AND c.status = 'confirmado';
                v_liq := public.liquido_repasse(v_bruto, v_liq);

                IF v_liq <= 0 THEN
                    PERFORM public.falhar_repasse(v.id, 'Nenhuma contribuição do repasse continua confirmada (estornadas?).', FALSE);
                    CONTINUE;
                END IF;
                IF v_liq <> v.liquido THEN
                    UPDATE repasse SET valor_bruto = v_bruto, valor_liquido = v_liq WHERE repasse.id_repasse = v.id;
                END IF;
            END IF;
            PERFORM public.atualizar_status_repasse(v.id, 'processando', NULL, 'transferência iniciada');
        END IF;

        UPDATE repasse
        SET provedor = COALESCE(provedor, p_provedor),
            proxima_tentativa_em = NOW() + (public.config_numero('repasse_lease_minutos', 10) * INTERVAL '1 minute')
        WHERE repasse.id_repasse = v.id;

        RETURN QUERY SELECT v.id, v.chave, v.id_trf, v_liq, v.tipo, v.chave_cifrada,
                            ('Repasse CrowdAcadêmico: ' || LEFT(v.titulo, 80))::TEXT;
        RETURN;
    END LOOP;
    RETURN;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     registrar_transferencia_repasse
-- Assinatura: (p_id_repasse INT, p_id_transferencia TEXT) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      O provedor aceitou a transferência mas ainda não a concluiu ('processando'): guarda o id dela em
--             id_transferencia_api (é por ele que o webhook de repasse e o próximo ciclo do worker a acham) e renova o
--             lease. Só age em repasse 'processando'. SECURITY DEFINER, sem autorização (job de fundo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_transferencia_repasse(p_id_repasse INT, p_id_transferencia TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE repasse
    SET id_transferencia_api = COALESCE(id_transferencia_api, p_id_transferencia),
        proxima_tentativa_em = NOW() + (public.config_numero('repasse_lease_minutos', 10) * INTERVAL '1 minute')
    WHERE id_repasse = p_id_repasse AND status = 'processando';
$$;

-- ----------------------------------------------------------------------------
-- Função:     concluir_repasse
-- Assinatura: (p_id_repasse INT, p_id_transferencia TEXT DEFAULT NULL, p_id_evento INT DEFAULT NULL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      A transferência foi concluída: processando -> concluido (repassado_em = agora) e cada contribuição do repasse
--             ainda 'confirmado' vira 'repassado' (via atualizar_status_contribuicao, auditado). Tudo na mesma transação.
--             Idempotente: chamada de novo (o worker e o webhook podem chegar juntos) não repete nada. Se o repasse já está
--             'erro', a transição é barrada (91039) e quem chamou decide (o webhook manda para revisão manual).
--             SECURITY DEFINER, sem autorização (job de fundo/webhook).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.concluir_repasse(
    p_id_repasse INT, p_id_transferencia TEXT DEFAULT NULL, p_id_evento INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_contribuicao INT;
BEGIN
    IF p_id_transferencia IS NOT NULL THEN
        UPDATE repasse SET id_transferencia_api = COALESCE(id_transferencia_api, p_id_transferencia)
        WHERE id_repasse = p_id_repasse;
    END IF;

    PERFORM public.atualizar_status_repasse(p_id_repasse, 'concluido', NOW(), NULL, p_id_evento);
    UPDATE repasse SET proxima_tentativa_em = NULL WHERE id_repasse = p_id_repasse;

    FOR v_id_contribuicao IN
        SELECT c.id_contribuicao
        FROM contribuicao c
        WHERE c.id_repasse = p_id_repasse AND c.status = 'confirmado'
        ORDER BY c.id_contribuicao
    LOOP
        PERFORM public.atualizar_status_contribuicao(v_id_contribuicao, 'repassado', NULL, p_id_evento);
    END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     falhar_repasse
-- Assinatura: (p_id_repasse INT, p_erro TEXT, p_recuperavel BOOLEAN, p_id_evento INT DEFAULT NULL) -> VARCHAR
-- Bloco:      [05-K-2]
-- Regra:      A transferência não deu certo. Conta a tentativa e decide (o motivo vai para a auditoria do repasse):
--               'pendente'  falha recuperável (rede) com tentativas sobrando: volta para a fila com espera crescente
--                           (repasse_backoff_base_minutos * 2^(tentativa-1), até repasse_backoff_max_minutos);
--               'erro'      falha NÃO recuperável (provedor recusou, chave inválida, transferência falhou), OU tentativas
--                           esgotadas (repasse_max_tentativas, padrão 8): alguém precisa olhar e recolocar na fila;
--               'ignorado'  o repasse não está em pendente/processando.
--             Padrões em configuracoes via config_numero: 8 tentativas, base 15 min, teto 24 h. A chave de idempotência
--             NÃO muda numa nova tentativa recuperável (nada foi criado no provedor). SECURITY DEFINER, sem autorização.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.falhar_repasse(
    p_id_repasse INT, p_erro TEXT, p_recuperavel BOOLEAN, p_id_evento INT DEFAULT NULL
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status     status_repasse;
    v_tentativas INT;
    v_espera     DOUBLE PRECISION;
BEGIN
    SELECT r.status, r.tentativas_transferencia + 1 INTO v_status, v_tentativas
    FROM repasse r
    WHERE r.id_repasse = p_id_repasse
    FOR UPDATE;

    IF NOT FOUND OR v_status NOT IN ('pendente', 'processando') THEN
        RETURN 'ignorado';
    END IF;

    IF NOT p_recuperavel OR v_tentativas >= public.config_numero('repasse_max_tentativas', 8) THEN
        UPDATE repasse SET tentativas_transferencia = v_tentativas, proxima_tentativa_em = NULL
        WHERE id_repasse = p_id_repasse;
        PERFORM public.atualizar_status_repasse(
            p_id_repasse, 'erro', NULL, 'tentativa ' || v_tentativas || ': ' || COALESCE(p_erro, '(sem detalhe)'), p_id_evento);
        RETURN 'erro';
    END IF;

    v_espera := LEAST(
        public.config_numero('repasse_backoff_base_minutos', 15) * POWER(2, v_tentativas - 1),
        public.config_numero('repasse_backoff_max_minutos', 1440)
    );
    UPDATE repasse
    SET tentativas_transferencia = v_tentativas,
        proxima_tentativa_em = NOW() + (v_espera * INTERVAL '1 minute')
    WHERE id_repasse = p_id_repasse;
    PERFORM public.atualizar_status_repasse(
        p_id_repasse, 'pendente', NULL, 'tentativa ' || v_tentativas || ': ' || COALESCE(p_erro, '(sem detalhe)'), p_id_evento);
    RETURN 'pendente';
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     aplicar_evento_repasse
-- Assinatura: (p_id_evento INT, p_provedor VARCHAR, p_id_transferencia TEXT, p_novo_status status_repasse,
--              p_motivo TEXT DEFAULT NULL) -> VARCHAR (o resultado, em texto)
-- Bloco:      [05-K-2]
-- Regra:      Gêmea de aplicar_evento_pagamento para o webhook de REPASSE (transferência concluída/falhou). Acha o repasse
--             por (provedor, id_transferencia_api), e aplica: 'concluido' => concluir_repasse (marca as contribuições como
--             'repassado'); 'erro' => falhar_repasse não recuperável. p_novo_status NULL = evento que não pede ação.
--             Decidido pelo Nest a partir do estado REAL consultado no provedor, nunca do payload.
--             Resultados (nenhum levanta exceção): 'aplicado', 'sem_mudanca' (já estava nesse status), 'sem_acao',
--             'ja_processado', 'ja_em_revisao', 'evento_inexistente', e
--               'repasse_nao_encontrado'  nenhum repasse com essa transferência (o aviso pode ter chegado antes de
--                                         registrar_transferencia_repasse): evento FICA NÃO PROCESSADO com o motivo, para
--                                         a reentrega;
--               'revisao_manual'          o aviso contradiz o que o sistema sabe (ex.: o provedor conclui uma transferência
--                                         que o repasse já marcou como 'erro', ou diz que falhou uma já 'concluido'):
--                                         dinheiro e registro divergem e alguém precisa decidir. Grava revisao_manual_em
--                                         e o motivo, uma linha de auditoria (id_repasse) e NÃO muda o repasse.
--             Mesmos estados de evento_pagamento de aplicar_evento_pagamento. SECURITY DEFINER, sem autorização de
--             propósito: a barreira é a verificação do webhook, feita pelo Nest antes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_evento_repasse(
    p_id_evento INT, p_provedor VARCHAR, p_id_transferencia TEXT, p_novo_status status_repasse, p_motivo TEXT DEFAULT NULL
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_processado_em TIMESTAMPTZ;
    v_revisao_em    TIMESTAMPTZ;
    v_id_repasse    INT;
    v_status        status_repasse;
    v_valor         DECIMAL(10,2);
    v_motivo        TEXT;
BEGIN
    SELECT e.processado_em, e.revisao_manual_em INTO v_processado_em, v_revisao_em
    FROM evento_pagamento e
    WHERE e.id_evento_pagamento = p_id_evento
    FOR UPDATE;

    IF NOT FOUND THEN RETURN 'evento_inexistente'; END IF;
    IF v_processado_em IS NOT NULL THEN RETURN 'ja_processado'; END IF;
    IF v_revisao_em IS NOT NULL THEN RETURN 'ja_em_revisao'; END IF;

    IF p_novo_status IS NULL THEN
        UPDATE evento_pagamento SET processado_em = NOW(), erro_processamento = NULL
        WHERE id_evento_pagamento = p_id_evento;
        RETURN 'sem_acao';
    END IF;

    SELECT r.id_repasse, r.status, r.valor_liquido INTO v_id_repasse, v_status, v_valor
    FROM repasse r
    WHERE r.provedor = p_provedor AND r.id_transferencia_api = p_id_transferencia
    FOR UPDATE;

    IF NOT FOUND THEN
        UPDATE evento_pagamento
        SET erro_processamento = 'Repasse não encontrado para a transferência ' || COALESCE(p_id_transferencia, '(sem id)') || '.'
        WHERE id_evento_pagamento = p_id_evento;
        RETURN 'repasse_nao_encontrado';
    END IF;

    IF v_status = p_novo_status THEN
        UPDATE evento_pagamento SET processado_em = NOW(), erro_processamento = NULL
        WHERE id_evento_pagamento = p_id_evento;
        RETURN 'sem_mudanca';
    END IF;

    BEGIN
        IF p_novo_status = 'concluido' THEN
            PERFORM public.concluir_repasse(v_id_repasse, p_id_transferencia, p_id_evento);
        ELSIF v_status = 'concluido' THEN
            RAISE EXCEPTION 'repasse já concluído' USING ERRCODE = '91039';
        ELSE
            PERFORM public.falhar_repasse(v_id_repasse, COALESCE(p_motivo, 'transferência falhou no provedor'), FALSE, p_id_evento);
        END IF;
    EXCEPTION WHEN SQLSTATE '91039' THEN
        v_motivo := 'O provedor informa transferência ' || p_novo_status::text || ' mas o repasse está ' || v_status::text
                    || ': dinheiro e registro divergem, precisa de revisão manual.';
    END;

    IF v_motivo IS NULL THEN
        UPDATE evento_pagamento SET processado_em = NOW(), erro_processamento = NULL
        WHERE id_evento_pagamento = p_id_evento;
        RETURN 'aplicado';
    END IF;

    UPDATE evento_pagamento
    SET revisao_manual_em = NOW(), erro_processamento = v_motivo
    WHERE id_evento_pagamento = p_id_evento;

    INSERT INTO auditoria_financeira (
        id_repasse, id_evento_pagamento, id_usuario_responsavel, valor, status_novo, status_anterior, evento
    )
    VALUES (
        v_id_repasse, p_id_evento, public.id_usuario_atual(), v_valor, v_status::text, v_status::text,
        'repasse_evento_em_revisao_manual: ' || p_novo_status::text
    );
    RETURN 'revisao_manual';
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     proximo_estorno_pendente
-- Assinatura: (p_provedor VARCHAR) -> TABLE (id_contribuicao INT, id_cobranca VARCHAR, valor_bruto DECIMAL,
--             valor_liquido DECIMAL, tentativas INT, prazo_vencido BOOLEAN)
-- Bloco:      [05-K-2]
-- Regra:      Fila do worker de estorno (PR-07). Devolve a PRÓXIMA contribuição 'a_devolver' do provedor informado que já
--             pode ser tentada (sem tentativa agendada para o futuro) e a TRAVA com FOR UPDATE SKIP LOCKED: duas instâncias
--             do worker nunca pegam a mesma. O lock vale até o fim da transação de quem chamou, então o worker precisa
--             chamar dentro de BEGIN ... COMMIT e só dar o COMMIT depois de concluir_estorno() ou registrar_falha_estorno();
--             se o processo morrer no meio, o banco solta o lock sozinho e a contribuição volta para a fila (e a chave de
--             idempotência do gateway impede estornar duas vezes na nova tentativa).
--             Um estorno por contribuição, nunca em lote (diferente do repasse). Só o caminho a_devolver -> devolvido é
--             tratado aqui, ou seja, só o lote automático do tudo-ou-nada; estorno individual ('reembolsado': contestação,
--             fraude, moderação) é outra decisão de negócio e não passa por este worker.
--             valor_liquido é o valor INTEIRO da contribuição: quem apoiou recebe de volta tudo o que contribuiu. valor_bruto
--             é o que foi cobrado (valor + taxa_pagamento); a diferença é a tarifa do provedor, paga por quem apoiou e que o
--             provedor não devolve, então a plataforma não perde nada. Com tarifa 0 o estorno é total.
--             prazo_vencido = o prazo do gateway para estornar um Pix (configuracoes.estorno_prazo_pix_dias, padrão 90) já
--             passou, contado a partir da confirmação (primeira linha 'confirmado' em auditoria_financeira; se não houver,
--             a criação). Nesse caso estornar é inútil: o worker vai direto para reembolso_manual, sem chamar o gateway.
--             SECURITY DEFINER e SEM AUTORIZAÇÃO DE PROPÓSITO: roda em job de fundo, sem sessão de usuário; o
--             app_nestjs não lê contribuicao (RLS).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proximo_estorno_pendente(p_provedor VARCHAR)
RETURNS TABLE (
    id_contribuicao INT, id_cobranca VARCHAR, valor_bruto DECIMAL, valor_liquido DECIMAL,
    tentativas INT, prazo_vencido BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id_contribuicao,
           c.id_transacao_api,
           c.valor + c.taxa_pagamento,
           c.valor,
           c.tentativas_estorno::INT,
           (COALESCE(conf.confirmado_em, c.criado_em)
               + (public.config_numero('estorno_prazo_pix_dias', 90) * INTERVAL '1 day') <= NOW())
    FROM contribuicao c
    LEFT JOIN LATERAL (
        SELECT MIN(a.timestamp) AS confirmado_em
        FROM auditoria_financeira a
        WHERE a.id_contribuicao = c.id_contribuicao AND a.status_novo = 'confirmado'
    ) conf ON TRUE
    WHERE c.status = 'a_devolver'
      AND c.provedor = p_provedor
      AND (c.proxima_tentativa_estorno_em IS NULL OR c.proxima_tentativa_estorno_em <= NOW())
    ORDER BY c.proxima_tentativa_estorno_em NULLS FIRST, c.id_contribuicao
    LIMIT 1
    FOR UPDATE OF c SKIP LOCKED;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     concluir_estorno
-- Assinatura: (p_id INT, p_valor_estornado DECIMAL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      O gateway devolveu o dinheiro: a_devolver -> devolvido, com o valor que o gateway DISSE ter estornado em
--             auditoria_financeira.valor (o valor da contribuição, sem a tarifa) via p_valor_evento de atualizar_status_contribuicao().
--             Zera a próxima tentativa. Chamada na MESMA transação em que proximo_estorno_pendente() travou a linha.
--             A transição é validada por trg_valida_transicao_status_contribuicao (91050 se a contribuição já saiu de
--             a_devolver). SECURITY DEFINER, sem autorização (job de fundo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.concluir_estorno(p_id INT, p_valor_estornado DECIMAL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.atualizar_status_contribuicao(p_id, 'devolvido', NULL, NULL, p_valor_estornado);
    UPDATE contribuicao SET proxima_tentativa_estorno_em = NULL WHERE id_contribuicao = p_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     registrar_falha_estorno
-- Assinatura: (p_id INT, p_erro TEXT, p_recuperavel BOOLEAN, p_valor_liquido DECIMAL DEFAULT NULL,
--              p_aguardando BOOLEAN DEFAULT FALSE) -> VARCHAR
-- Bloco:      [05-K-2]
-- Regra:      O estorno desta contribuição não terminou agora. Conta a tentativa, grava UMA linha em auditoria_financeira
--             (status a_devolver -> a_devolver, valor = o que seria devolvido) com o evento
--               'estorno_falhou (tentativa N): <erro>'        o provedor recusou ou deu erro;
--               'estorno_aguardando_provedor (tentativa N)'   p_aguardando: o provedor aceitou o pedido e ainda não
--                                                              devolveu (nada falhou; o próximo ciclo confere de novo).
--             A espera também conta como tentativa: uma devolução que nunca termina acaba em reembolso manual. Decide:
--               'reagendado'       falha recuperável (rede, saldo insuficiente: o saldo pode ser reposto) e ainda há
--                                  tentativas: marca proxima_tentativa_estorno_em com espera crescente
--                                  (estorno_backoff_base_minutos * 2^(tentativa-1), até estorno_backoff_max_minutos).
--               'reembolso_manual' falha NÃO recuperável, OU tentativas esgotadas (estorno_max_tentativas), OU prazo do Pix
--                                  vencido (estorno_prazo_pix_dias): a_devolver -> reembolso_manual, com o valor
--                                  inteiro da contribuição. Quem vai devolver é uma pessoa, fora do sistema.
--               'ignorado'         a contribuição já não está 'a_devolver'.
--             O texto do erro só vai para auditoria_financeira (leitura restrita por permissão), nunca para uma coluna de
--             contribuicao: o contribuinte e o pesquisador leem contribuicao e não devem ver detalhe interno do gateway.
--             Padrões (configuracoes, via config_numero): 8 tentativas, base de 15 min, teto de 24 h (somam cerca de 31 h
--             de espera antes de desistir, tempo de repor saldo), 90 dias de prazo.
--             SECURITY DEFINER, sem autorização (job de fundo).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.registrar_falha_estorno(INT, TEXT, BOOLEAN, DECIMAL);
CREATE OR REPLACE FUNCTION public.registrar_falha_estorno(
    p_id INT, p_erro TEXT, p_recuperavel BOOLEAN, p_valor_liquido DECIMAL DEFAULT NULL, p_aguardando BOOLEAN DEFAULT FALSE
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status        status_contribuicao;
    v_valor         DECIMAL(10,2);
    v_meio          meio_pagamento;
    v_tentativas    INT;
    v_criado_em     TIMESTAMPTZ;
    v_confirmado_em TIMESTAMPTZ;
    v_desistir      BOOLEAN;
    v_espera        DOUBLE PRECISION;
BEGIN
    SELECT c.status, c.valor, c.meio_pagamento, c.tentativas_estorno + 1, c.criado_em
    INTO v_status, v_valor, v_meio, v_tentativas, v_criado_em
    FROM contribuicao c
    WHERE c.id_contribuicao = p_id
    FOR UPDATE;

    IF NOT FOUND OR v_status <> 'a_devolver' THEN
        RETURN 'ignorado';
    END IF;

    SELECT MIN(a.timestamp) INTO v_confirmado_em
    FROM auditoria_financeira a
    WHERE a.id_contribuicao = p_id AND a.status_novo = 'confirmado';

    v_desistir := NOT p_recuperavel
        OR v_tentativas >= public.config_numero('estorno_max_tentativas', 8)
        OR COALESCE(v_confirmado_em, v_criado_em) + (public.config_numero('estorno_prazo_pix_dias', 90) * INTERVAL '1 day') <= NOW();

    INSERT INTO auditoria_financeira (
        id_contribuicao, id_usuario_responsavel, valor, meio_pagamento, status_novo, status_anterior, evento
    )
    VALUES (
        p_id, public.id_usuario_atual(), COALESCE(p_valor_liquido, v_valor), v_meio, 'a_devolver', 'a_devolver',
        CASE WHEN p_aguardando
             THEN 'estorno_aguardando_provedor (tentativa ' || v_tentativas || ')'
             ELSE LEFT('estorno_falhou (tentativa ' || v_tentativas || '): ' || COALESCE(p_erro, '(sem detalhe)'), 200)
        END
    );

    IF v_desistir THEN
        UPDATE contribuicao
        SET tentativas_estorno = v_tentativas, proxima_tentativa_estorno_em = NULL
        WHERE id_contribuicao = p_id;
        PERFORM public.atualizar_status_contribuicao(p_id, 'reembolso_manual', NULL, NULL, p_valor_liquido);
        RETURN 'reembolso_manual';
    END IF;

    v_espera := LEAST(
        public.config_numero('estorno_backoff_base_minutos', 15) * POWER(2, v_tentativas - 1),
        public.config_numero('estorno_backoff_max_minutos', 1440)
    );
    UPDATE contribuicao
    SET tentativas_estorno = v_tentativas,
        proxima_tentativa_estorno_em = NOW() + (v_espera * INTERVAL '1 minute')
    WHERE id_contribuicao = p_id;
    RETURN 'reagendado';
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     reservar_contribuicoes_para_reconciliar
-- Assinatura: (p_provedor VARCHAR, p_limite INT DEFAULT 50) -> TABLE (id INT, id_cobranca VARCHAR)
-- Bloco:      [05-K-2]
-- Regra:      Fila do job de reconciliação (PR-11). Devolve (e RESERVA) até p_limite contribuições 'pendente' do provedor
--             que já têm cobrança no gateway, passaram de reconciliacao_limite_minutos desde a criação (padrão 30: dá
--             tempo do webhook normal chegar) e não foram reconsultadas nos últimos reconciliacao_intervalo_minutos
--             (padrão 60). Reservar = gravar reconciliada_em = agora, na própria chamada: sem isso, cada ciclo do job
--             reconsultaria no gateway TODA contribuição pendente (um Pix abandonado seria perguntado dezenas de vezes
--             até expirar) e duas instâncias consultariam a mesma. FOR UPDATE SKIP LOCKED na seleção.
--             Mitiga o "servidor dorme": se o webhook foi perdido ou o app estava fora, o job descobre o pagamento.
--             Quem decide o que o estado real significa é o Nest (mesmo mapeamento do webhook), e quem aplica é
--             aplicar_evento_pagamento() (com um evento sintético de reconciliação). SECURITY DEFINER, SEM AUTORIZAÇÃO
--             DE PROPÓSITO (job de fundo; o app_nestjs não lê contribuicao).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reservar_contribuicoes_para_reconciliar(p_provedor VARCHAR, p_limite INT DEFAULT 50)
RETURNS TABLE (id INT, id_cobranca VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH alvo AS (
        SELECT c.id_contribuicao
        FROM contribuicao c
        WHERE (c.status = 'pendente'
               OR (c.status = 'confirmado' AND c.meio_pagamento <> 'pix' AND c.dinheiro_liberado_em IS NULL))
          AND c.provedor = p_provedor
          AND c.id_transacao_api IS NOT NULL
          AND c.criado_em <= NOW() - (public.config_numero('reconciliacao_limite_minutos', 30) * INTERVAL '1 minute')
          AND (c.reconciliada_em IS NULL
               OR c.reconciliada_em <= NOW() - (public.config_numero('reconciliacao_intervalo_minutos', 60) * INTERVAL '1 minute'))
        ORDER BY COALESCE(c.reconciliada_em, c.criado_em), c.id_contribuicao
        LIMIT p_limite
        FOR UPDATE OF c SKIP LOCKED
    ),
    reservadas AS (
        UPDATE contribuicao ct
        SET reconciliada_em = NOW()
        FROM alvo
        WHERE ct.id_contribuicao = alvo.id_contribuicao
        RETURNING ct.id_contribuicao, ct.id_transacao_api
    )
    SELECT r.id_contribuicao, r.id_transacao_api FROM reservadas r;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     encerrar_contribuicoes_orfas
-- Assinatura: () -> TABLE (id INT)
-- Bloco:      [05-K-2]
-- Regra:      Contribuição 'pendente' SEM cobrança (id_transacao_api NULL) há mais de reconciliacao_orfa_minutos (padrão 60)
--             é uma órfã: o POST /contribuicao criou a linha mas não chegou a vincular a cobrança (ex.: o gateway criou a
--             cobrança e o passo de vínculo falhou). Ninguém recebeu o QR, então ninguém pode pagá-la: vira 'erro' (via
--             atualizar_status_contribuicao, auditado) em vez de ficar 'pendente' até a expiração. Devolve os ids para o job
--             logar: pode existir uma cobrança solta no gateway, que vence sozinha pelo expiraEm e que o suporte pode
--             procurar pela chave de idempotência. Uma que falhe não impede as outras (WARNING).
--             SECURITY DEFINER, sem autorização (job de fundo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.encerrar_contribuicoes_orfas()
RETURNS TABLE (id INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id INT;
BEGIN
    FOR v_id IN
        SELECT c.id_contribuicao FROM contribuicao c
        WHERE c.status = 'pendente'
          AND c.id_transacao_api IS NULL
          AND c.criado_em <= NOW() - (public.config_numero('reconciliacao_orfa_minutos', 60) * INTERVAL '1 minute')
        ORDER BY c.id_contribuicao
    LOOP
        BEGIN
            PERFORM public.atualizar_status_contribuicao(v_id, 'erro');
            id := v_id;
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'encerrar_contribuicoes_orfas: contribuição % ignorada neste ciclo (% / %)', v_id, SQLSTATE, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     listar_eventos_nao_processados
-- Assinatura: (p_limite INT DEFAULT 100) -> TABLE (id_evento_pagamento INT, provedor VARCHAR, id_evento_externo VARCHAR,
--             tipo_evento VARCHAR, recebido_em TIMESTAMPTZ, erro_processamento TEXT, revisao_manual_em TIMESTAMPTZ,
--             situacao TEXT)
-- Bloco:      [05-K-2]
-- Regra:      Leitura da caixa de entrada de webhooks que NÃO terminou com sucesso (processado_em IS NULL), do mais antigo
--             para o mais novo, SEM o payload (pode ter dado do pagador). `situacao` separa o que precisa de gente do
--             que é só tentar de novo:
--               'em_revisao_manual'     o sistema deliberadamente não aplicou (revisao_manual_em preenchido);
--               'vale_tentar_de_novo'   falhou por motivo transitório ou ainda não foi tentado (reentrega do gateway ou
--                                       reprocessamento futuro resolve). O gateway guarda os eventos por 14 dias.
--             Existe porque evento_pagamento tem RLS por permissão (evento_pagamento_visualizar) e um job de fundo não tem
--             sessão: o job lê por aqui. Quem expuser isto numa rota para pessoas deve checar a permissão antes.
--             SECURITY DEFINER, SEM AUTORIZAÇÃO DE PROPÓSITO (job de fundo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_eventos_nao_processados(p_limite INT DEFAULT 100)
RETURNS TABLE (
    id_evento_pagamento INT, provedor VARCHAR, id_evento_externo VARCHAR, tipo_evento VARCHAR,
    recebido_em TIMESTAMPTZ, erro_processamento TEXT, revisao_manual_em TIMESTAMPTZ, situacao TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT e.id_evento_pagamento, e.provedor, e.id_evento_externo, e.tipo_evento, e.recebido_em,
           e.erro_processamento, e.revisao_manual_em,
           CASE WHEN e.revisao_manual_em IS NOT NULL THEN 'em_revisao_manual' ELSE 'vale_tentar_de_novo' END
    FROM evento_pagamento e
    WHERE e.processado_em IS NULL
    ORDER BY e.recebido_em, e.id_evento_pagamento
    LIMIT p_limite;
$$;

-- ----------------------------------------------------------------------------
-- Função:     reservar_cobrancas_para_cancelar
-- Assinatura: (p_provedor VARCHAR, p_limite INT DEFAULT 50) -> TABLE (id INT, id_cobranca VARCHAR)
-- Bloco:      [05-K-2]
-- Regra:      Cobrança que continua aberta no provedor depois de a contribuição ter morrido aqui (expirado ou erro) é dinheiro
--             que ainda pode entrar e que o sistema não contabiliza: o Pix do Asaas, por exemplo, só tem vencimento por DATA e
--             segue pagável por meses depois dele. Devolve (e RESERVA) até p_limite contribuições nessa situação para o job
--             pedir ao provedor o cancelamento da cobrança (CobrancaGatewayPort.cancelarCobranca). Reservar = reconciliada_em
--             = agora (mesma coluna da reconciliação: "última vez que mexi no provedor por causa desta contribuição"), e só
--             volta à fila depois de cancelamento_cobranca_intervalo_minutos (padrão 15). Sai da fila de vez quando o job chama
--             marcar_cobranca_cancelada(). FOR UPDATE SKIP LOCKED. SECURITY DEFINER, SEM AUTORIZAÇÃO DE PROPÓSITO (job de fundo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reservar_cobrancas_para_cancelar(p_provedor VARCHAR, p_limite INT DEFAULT 50)
RETURNS TABLE (id INT, id_cobranca VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH alvo AS (
        SELECT c.id_contribuicao
        FROM contribuicao c
        WHERE c.status IN ('expirado', 'erro')
          AND c.provedor = p_provedor
          AND c.id_transacao_api IS NOT NULL
          AND c.cobranca_cancelada_em IS NULL
          AND (c.reconciliada_em IS NULL
               OR c.reconciliada_em <= NOW() - (public.config_numero('cancelamento_cobranca_intervalo_minutos', 15) * INTERVAL '1 minute'))
        ORDER BY COALESCE(c.reconciliada_em, c.criado_em), c.id_contribuicao
        LIMIT p_limite
        FOR UPDATE OF c SKIP LOCKED
    ),
    reservadas AS (
        UPDATE contribuicao ct
        SET reconciliada_em = NOW()
        FROM alvo
        WHERE ct.id_contribuicao = alvo.id_contribuicao
        RETURNING ct.id_contribuicao, ct.id_transacao_api
    )
    SELECT r.id_contribuicao, r.id_transacao_api FROM reservadas r;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     marcar_cobranca_cancelada
-- Assinatura: (p_id INT) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      O provedor cancelou a cobrança desta contribuição, ou ela já não existe/não pode mais ser cancelada (paga: o
--             webhook cuida do que vier): tira da fila de reservar_cobrancas_para_cancelar. SECURITY DEFINER, sem autorização.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marcar_cobranca_cancelada(p_id INT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE contribuicao SET cobranca_cancelada_em = NOW()
    WHERE id_contribuicao = p_id AND cobranca_cancelada_em IS NULL;
$$;

-- ----------------------------------------------------------------------------
-- Função:     dados_autorizacao_repasse
-- Assinatura: (p_provedor VARCHAR, p_id_transferencia TEXT, p_referencia_externa TEXT)
--             -> TABLE (id_repasse INT, valor_liquido DECIMAL, tipo_chave tipo_chave_pix, chave_criptografada TEXT)
-- Bloco:      [05-K-2]
-- Regra:      Base da AUTORIZAÇÃO DE SAQUE que o provedor pede por webhook antes de executar cada transferência: devolve os
--             dados do repasse que a transferência dita corresponde, ou nenhuma linha se não corresponde a nenhum. Só serve
--             repasse 'processando' do provedor, achado pelo id da transferência (já guardado) OU, enquanto o id ainda não
--             foi guardado (o aviso do provedor chega segundos depois do pedido, antes do worker gravar a resposta), pela
--             referência externa = repasse.chave_idempotencia. Repasse que já tem OUTRO id de transferência não casa:
--             é o que barra uma transferência duplicada do mesmo repasse. Traz o valor e a chave de destino (a chave Pix
--             verificada do dono da campanha, a mesma que reservar_proximo_repasse usa) para o Nest conferir contra o que o
--             provedor vai executar. SECURITY DEFINER, SEM AUTORIZAÇÃO DE PROPÓSITO: a barreira é o token do webhook.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dados_autorizacao_repasse(
    p_provedor VARCHAR, p_id_transferencia TEXT, p_referencia_externa TEXT
)
RETURNS TABLE (id_repasse INT, valor_liquido DECIMAL, tipo_chave tipo_chave_pix, chave_criptografada TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT r.id_repasse, r.valor_liquido, pp.tipo_chave_pix, pp.chave_pix_criptografada
    FROM repasse r
    JOIN campanha ca ON ca.id_campanha = r.id_campanha
    JOIN perfil_pesquisador pp ON pp.id_usuario = ca.id_usuario AND pp.chave_pix_verificada_em IS NOT NULL
    WHERE r.status = 'processando'
      AND r.provedor = p_provedor
      AND ((p_id_transferencia IS NOT NULL AND r.id_transferencia_api = p_id_transferencia)
           OR (r.id_transferencia_api IS NULL AND p_referencia_externa IS NOT NULL
               AND r.chave_idempotencia::TEXT = p_referencia_externa))
    LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- Função:     dados_autorizacao_estorno
-- Assinatura: (p_provedor VARCHAR, p_id_cobranca TEXT) -> TABLE (id_contribuicao INT, valor DECIMAL)
-- Bloco:      [05-K-2]
-- Regra:      Base da AUTORIZAÇÃO de uma devolução de Pix que o provedor pede por webhook antes de executá-la: devolve a
--             contribuição 'a_devolver' daquela cobrança e o valor que o sistema mandou devolver (o valor inteiro, sem a
--             tarifa), ou nenhuma linha. O Nest só aprova se o valor pedido for esse. Devolução de cobrança que o sistema
--             não mandou devolver (por exemplo, pedida com uma chave de API vazada) não casa e é recusada.
--             SECURITY DEFINER, SEM AUTORIZAÇÃO DE PROPÓSITO: a barreira é o token do webhook.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dados_autorizacao_estorno(p_provedor VARCHAR, p_id_cobranca TEXT)
RETURNS TABLE (id_contribuicao INT, valor DECIMAL)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT c.id_contribuicao, c.valor
    FROM contribuicao c
    WHERE c.provedor = p_provedor AND c.id_transacao_api = p_id_cobranca AND c.status = 'a_devolver'
    LIMIT 1;
$$;

-- ============================================================================
-- PAINEL DE REVISÃO MANUAL DE PAGAMENTOS (funções para gente, não para jobs)
-- ----------------------------------------------------------------------------
-- Tudo que o sistema deliberadamente NÃO resolve sozinho cai numa destas filas, e cada fila tem uma listagem e uma ação:
--   evento de webhook em revisão manual   -> listar_revisoes_pagamento  / resolver_revisao_pagamento
--                                            (a listagem traz todos os eventos; a fila é a situação em revisão manual)
--   contribuição em 'reembolso_manual'    -> listar_reembolsos_manuais  / concluir_reembolso_manual
--   repasse em 'erro' (ou sem conta)      -> listar_repasses_atencao    / reenfileirar_repasse
-- DIFERENTE das funções dos jobs (que são "sem autorização de propósito" porque rodam sem sessão), estas SÃO chamadas por
-- uma pessoa logada e por isso conferem a permissão DENTRO da função (SECURITY DEFINER bypassa a RLS, então a checagem
-- tem que estar aqui): leitura exige 'evento_pagamento_visualizar'; toda ação exige 'pagamento_revisao_resolver'. Sem a
-- permissão: 92037. Toda ação exige uma observação escrita (90034) e deixa linha em auditoria_financeira com quem fez.
-- Nenhuma delas MOVE DINHEIRO: devolver à mão ou refazer uma transferência continua sendo feito por uma pessoa, no
-- provedor; aqui se registra o que foi decidido e destrava o que estava parado.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     listar_revisoes_pagamento
-- Assinatura: (p_situacao TEXT DEFAULT NULL, p_limite INT DEFAULT 500) -> TABLE (id_evento_pagamento INT,
--             provedor VARCHAR, tipo_evento VARCHAR, recebido_em TIMESTAMPTZ, situacao TEXT, motivo TEXT,
--             revisao_manual_em TIMESTAMPTZ, id_contribuicao INT, id_repasse INT, valor DECIMAL, sentido TEXT,
--             arrecadado DECIMAL)
-- Bloco:      [05-K-2]
-- Regra:      Todos os avisos do provedor (a caixa de entrada inteira), do mais novo para o mais antigo, para a tela Eventos
--             de Pagamento. `situacao`:
--               'processado'           o sistema aplicou o aviso (processado_em, sem revisão);
--               'vale_tentar_de_novo'  falhou por motivo transitório ou ainda não foi tentado (nem processado nem em revisão);
--               'em_revisao_manual'    o sistema não aplicou de propósito e alguém precisa decidir;
--               'revisao_resolvida'    passou por revisão manual e uma pessoa já deu baixa (resolver_revisao_pagamento).
--             p_situacao filtra uma delas; NULL traz todas. `id_contribuicao`/`id_repasse` e `valor` vêm da primeira linha
--             de auditoria que o aviso gravou (NULL num aviso que não mexeu em nada). `sentido` diz para onde o dinheiro
--             andou segundo o provedor: 'entrada' (pagamento recebido), 'saida' (estorno, devolução ou transferência
--             concluída) ou NULL (nada se moveu: vencimento, falha, aviso ignorado). `arrecadado` é o valor ATUAL da
--             campanha da contribuição ou do repasse. Sem o payload. Exige 'evento_pagamento_visualizar' (92037).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.listar_revisoes_pagamento(TEXT, INT);
CREATE OR REPLACE FUNCTION public.listar_revisoes_pagamento(p_situacao TEXT DEFAULT NULL, p_limite INT DEFAULT 500)
RETURNS TABLE (
    id_evento_pagamento INT, provedor VARCHAR, tipo_evento VARCHAR, recebido_em TIMESTAMPTZ, situacao TEXT,
    motivo TEXT, revisao_manual_em TIMESTAMPTZ, id_contribuicao INT, id_repasse INT, valor DECIMAL, sentido TEXT,
    arrecadado DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('evento_pagamento_visualizar') THEN
        RAISE EXCEPTION 'Sem permissão para ver os eventos de pagamento.' USING ERRCODE = '92037';
    END IF;
    IF p_situacao IS NOT NULL AND p_situacao NOT IN ('processado', 'vale_tentar_de_novo', 'em_revisao_manual', 'revisao_resolvida') THEN
        RAISE EXCEPTION 'Situação inválida: use processado, vale_tentar_de_novo, em_revisao_manual ou revisao_resolvida.'
            USING ERRCODE = '90035';
    END IF;

    RETURN QUERY
    SELECT v.id_evento_pagamento, v.provedor, v.tipo_evento, v.recebido_em, v.situacao, v.erro_processamento,
           v.revisao_manual_em, v.id_contribuicao, v.id_repasse, v.valor, v.sentido, v.arrecadado
    FROM (
        SELECT e.id_evento_pagamento, e.provedor, e.tipo_evento, e.recebido_em, e.erro_processamento, e.revisao_manual_em,
               CASE
                   WHEN e.processado_em IS NOT NULL AND e.revisao_manual_em IS NOT NULL THEN 'revisao_resolvida'
                   WHEN e.processado_em IS NOT NULL THEN 'processado'
                   WHEN e.revisao_manual_em IS NOT NULL THEN 'em_revisao_manual'
                   ELSE 'vale_tentar_de_novo'
               END AS situacao,
               alvo.id_contribuicao, alvo.id_repasse, alvo.valor,
               -- A primeira linha de auditoria do aviso diz o que ele fez: a transição que aplicou, ou a revisão que
               -- registrou sem aplicar (status anterior = novo, com o evento nomeando o que o provedor informou).
               CASE
                   WHEN alvo.evento = 'pagamento_recebido_em_revisao_manual'
                        OR (alvo.id_contribuicao IS NOT NULL AND alvo.status_anterior = 'pendente' AND alvo.status_novo = 'confirmado')
                       THEN 'entrada'
                   WHEN alvo.evento IN ('evento_em_revisao_manual: reembolsado', 'evento_em_revisao_manual: devolvido',
                                        'repasse_evento_em_revisao_manual: concluido',
                                        -- Contestação aberta: o provedor tira o dinheiro da conta da plataforma.
                                        'chargeback_em_revisao_manual: PAYMENT_CHARGEBACK_REQUESTED')
                        OR (alvo.id_contribuicao IS NOT NULL AND alvo.status_anterior <> alvo.status_novo
                            AND alvo.status_novo IN ('reembolsado', 'devolvido'))
                        OR (alvo.id_repasse IS NOT NULL AND alvo.status_anterior <> alvo.status_novo AND alvo.status_novo = 'concluido')
                       THEN 'saida'
               END AS sentido,
               ca.valor_bruto_arrecadado AS arrecadado
        FROM evento_pagamento e
        LEFT JOIN LATERAL (
            SELECT a.id_contribuicao, a.id_repasse, a.valor, a.evento, a.status_anterior, a.status_novo
            FROM auditoria_financeira a
            WHERE a.id_evento_pagamento = e.id_evento_pagamento
            ORDER BY a.id_auditoria
            LIMIT 1
        ) alvo ON TRUE
        LEFT JOIN contribuicao c ON c.id_contribuicao = alvo.id_contribuicao
        LEFT JOIN repasse r ON r.id_repasse = alvo.id_repasse
        LEFT JOIN campanha ca ON ca.id_campanha = COALESCE(c.id_campanha, r.id_campanha)
    ) v
    WHERE p_situacao IS NULL OR v.situacao = p_situacao
    -- Do mais novo para o mais antigo: com o limite, o que fica de fora é o histórico mais velho, nunca o aviso de agora.
    ORDER BY v.recebido_em DESC, v.id_evento_pagamento DESC
    LIMIT p_limite;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     resolver_revisao_pagamento
-- Assinatura: (p_id_evento INT, p_observacao TEXT) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      Dá baixa num evento que estava em REVISÃO MANUAL depois de uma pessoa ter decidido e agido fora do sistema
--             (ex.: devolveu no painel do provedor um pagamento que chegou para uma contribuição já expirada). Marca o evento
--             como processado (processado_em = agora; revisao_manual_em fica, é o histórico de que passou por revisão), junta
--             a observação ao motivo e grava uma linha de auditoria 'revisao_manual_resolvida: <observação>' no mesmo alvo
--             (contribuição ou repasse) com quem resolveu. NÃO muda contribuição nem repasse nem move dinheiro: o estado
--             que a revisão deixou intacto continua como está. Só evento em revisão manual (91049); observação obrigatória
--             (90034); exige 'pagamento_revisao_resolver' (92037).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolver_revisao_pagamento(p_id_evento INT, p_observacao TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_processado_em TIMESTAMPTZ;
    v_revisao_em    TIMESTAMPTZ;
    v_motivo        TEXT;
    v_obs           TEXT := NULLIF(BTRIM(p_observacao), '');
    v_alvo          RECORD;
BEGIN
    IF NOT public.tem_permissao('pagamento_revisao_resolver') THEN
        RAISE EXCEPTION 'Sem permissão para resolver revisões de pagamento.' USING ERRCODE = '92037';
    END IF;
    IF v_obs IS NULL THEN
        RAISE EXCEPTION 'Escreva o que foi feito para resolver esta revisão.' USING ERRCODE = '90034';
    END IF;

    SELECT e.processado_em, e.revisao_manual_em, e.erro_processamento INTO v_processado_em, v_revisao_em, v_motivo
    FROM evento_pagamento e
    WHERE e.id_evento_pagamento = p_id_evento
    FOR UPDATE;

    IF NOT FOUND OR v_revisao_em IS NULL OR v_processado_em IS NOT NULL THEN
        RAISE EXCEPTION 'Só um evento em revisão manual pode ser resolvido.' USING ERRCODE = '91049';
    END IF;

    UPDATE evento_pagamento
    SET processado_em = NOW(),
        erro_processamento = LEFT(COALESCE(v_motivo, '') || ' | RESOLVIDO: ' || v_obs, 2000)
    WHERE id_evento_pagamento = p_id_evento;

    SELECT a.id_contribuicao, a.id_repasse, a.valor, a.meio_pagamento, a.status_novo INTO v_alvo
    FROM auditoria_financeira a
    WHERE a.id_evento_pagamento = p_id_evento
    ORDER BY a.id_auditoria
    LIMIT 1;

    IF FOUND THEN
        INSERT INTO auditoria_financeira (
            id_contribuicao, id_repasse, id_evento_pagamento, id_usuario_responsavel, valor, meio_pagamento,
            status_novo, status_anterior, evento
        )
        VALUES (
            v_alvo.id_contribuicao, v_alvo.id_repasse, p_id_evento, public.id_usuario_atual(), v_alvo.valor,
            v_alvo.meio_pagamento, v_alvo.status_novo, v_alvo.status_novo,
            LEFT('revisao_manual_resolvida: ' || v_obs, 200)
        );
    END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     listar_reembolsos_manuais
-- Assinatura: (p_limite INT DEFAULT 100) -> TABLE (id_contribuicao INT, id_campanha INT, id_usuario INT,
--             valor_bruto DECIMAL, valor_a_devolver DECIMAL, meio_pagamento meio_pagamento, tentativas INT,
--             ultimo_motivo TEXT, contribuinte_tem_conta_verificada BOOLEAN)
-- Bloco:      [05-K-2]
-- Regra:      Contribuições em 'reembolso_manual': o estorno automático desistiu (falha definitiva, tentativas esgotadas ou
--             prazo do Pix vencido) e uma pessoa precisa devolver o dinheiro por fora. valor_a_devolver é o valor inteiro
--             da contribuição (mesma regra do estorno automático; a tarifa de pagamento não volta). `ultimo_motivo` é o texto da última
--             linha de auditoria (inclui 'estorno_falhou (tentativa N): ...'). `contribuinte_tem_conta_verificada` diz se quem
--             contribuiu (id_usuario; NULL = contribuição sem conta) tem uma chave Pix verificada (só pesquisador cadastra
--             chave) para onde devolver; a chave em si NÃO sai daqui. Exige 'evento_pagamento_visualizar' (92037).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_reembolsos_manuais(p_limite INT DEFAULT 100)
RETURNS TABLE (
    id_contribuicao INT, id_campanha INT, id_usuario INT, valor_bruto DECIMAL, valor_a_devolver DECIMAL,
    meio_pagamento meio_pagamento, tentativas INT, ultimo_motivo TEXT, contribuinte_tem_conta_verificada BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('evento_pagamento_visualizar') THEN
        RAISE EXCEPTION 'Sem permissão para ver os reembolsos manuais.' USING ERRCODE = '92037';
    END IF;

    RETURN QUERY
    SELECT c.id_contribuicao, c.id_campanha, c.id_usuario, c.valor + c.taxa_pagamento, c.valor,
           c.meio_pagamento, c.tentativas_estorno::INT, ult.evento::TEXT,
           EXISTS (
               SELECT 1 FROM perfil_pesquisador pp
               WHERE pp.id_usuario = c.id_usuario AND pp.chave_pix_verificada_em IS NOT NULL
           )
    FROM contribuicao c
    LEFT JOIN LATERAL (
        SELECT a.evento FROM auditoria_financeira a
        WHERE a.id_contribuicao = c.id_contribuicao
        ORDER BY (a.evento LIKE 'estorno_%') DESC, a.id_auditoria DESC
        LIMIT 1
    ) ult ON TRUE
    WHERE c.status = 'reembolso_manual'
    ORDER BY c.id_contribuicao
    LIMIT p_limite;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     concluir_reembolso_manual
-- Assinatura: (p_id_contribuicao INT, p_valor DECIMAL, p_observacao TEXT) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      Uma pessoa devolveu, por fora do sistema, o dinheiro de uma contribuição em 'reembolso_manual': registra que
--             isso foi feito. reembolso_manual -> devolvido, com p_valor (o que de fato foi devolvido, de 0,01 até o valor da
--             contribuição) em auditoria_financeira.valor, e uma linha extra 'reembolso_manual_concluido: <observação>' com
--             quem registrou. Só contribuição em 'reembolso_manual' (91049); observação obrigatória (90034); valor
--             inválido (90035); exige 'pagamento_revisao_resolver' (92037). Não move dinheiro. A transição
--             reembolso_manual -> devolvido existe na máquina de estados só para isto.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.concluir_reembolso_manual(p_id_contribuicao INT, p_valor DECIMAL, p_observacao TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status status_contribuicao;
    v_valor  DECIMAL(10,2);
    v_meio   meio_pagamento;
    v_obs    TEXT := NULLIF(BTRIM(p_observacao), '');
BEGIN
    IF NOT public.tem_permissao('pagamento_revisao_resolver') THEN
        RAISE EXCEPTION 'Sem permissão para concluir reembolsos manuais.' USING ERRCODE = '92037';
    END IF;
    IF v_obs IS NULL THEN
        RAISE EXCEPTION 'Escreva como o reembolso foi feito (data, meio, comprovante).' USING ERRCODE = '90034';
    END IF;

    SELECT c.status, c.valor, c.meio_pagamento INTO v_status, v_valor, v_meio
    FROM contribuicao c
    WHERE c.id_contribuicao = p_id_contribuicao
    FOR UPDATE;

    IF NOT FOUND OR v_status <> 'reembolso_manual' THEN
        RAISE EXCEPTION 'Só uma contribuição em reembolso manual pode ser concluída.' USING ERRCODE = '91049';
    END IF;
    IF p_valor IS NULL OR p_valor <= 0 OR p_valor > v_valor THEN
        RAISE EXCEPTION 'O valor devolvido deve ser maior que zero e não passar do valor da contribuição.' USING ERRCODE = '90035';
    END IF;

    PERFORM public.atualizar_status_contribuicao(p_id_contribuicao, 'devolvido', NULL, NULL, p_valor);

    INSERT INTO auditoria_financeira (
        id_contribuicao, id_usuario_responsavel, valor, meio_pagamento, status_novo, status_anterior, evento
    )
    VALUES (
        p_id_contribuicao, public.id_usuario_atual(), p_valor, v_meio, 'devolvido', 'devolvido',
        LEFT('reembolso_manual_concluido: ' || v_obs, 200)
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     listar_repasses_atencao
-- Assinatura: (p_limite INT DEFAULT 100) -> TABLE (id_repasse INT, id_campanha INT, titulo VARCHAR, status status_repasse,
--             valor_liquido DECIMAL, tentativas INT, id_transferencia_api TEXT, ultimo_motivo TEXT,
--             aguardando_conta BOOLEAN)
-- Bloco:      [05-K-2]
-- Regra:      Repasses que pedem olhar humano: os em 'erro' (a transferência falhou de forma definitiva ou as tentativas
--             acabaram) e os 'pendente' cujo dono da campanha ainda NÃO tem chave Pix verificada
--             (aguardando_conta = TRUE: o worker não os pega até a pessoa cadastrar a chave Pix). `ultimo_motivo` é o texto da
--             última linha de auditoria do repasse. Exige 'evento_pagamento_visualizar' (92037).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_repasses_atencao(p_limite INT DEFAULT 100)
RETURNS TABLE (
    id_repasse INT, id_campanha INT, titulo VARCHAR, status status_repasse, valor_liquido DECIMAL, tentativas INT,
    id_transferencia_api TEXT, ultimo_motivo TEXT, aguardando_conta BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('evento_pagamento_visualizar') THEN
        RAISE EXCEPTION 'Sem permissão para ver os repasses.' USING ERRCODE = '92037';
    END IF;

    RETURN QUERY
    SELECT r.id_repasse, r.id_campanha, ca.titulo, r.status, r.valor_liquido, r.tentativas_transferencia::INT,
           r.id_transferencia_api, ult.evento::TEXT,
           NOT EXISTS (
               SELECT 1 FROM perfil_pesquisador pp
               WHERE pp.id_usuario = ca.id_usuario AND pp.chave_pix_verificada_em IS NOT NULL
           )
    FROM repasse r
    JOIN campanha ca ON ca.id_campanha = r.id_campanha
    LEFT JOIN LATERAL (
        SELECT a.evento FROM auditoria_financeira a
        WHERE a.id_repasse = r.id_repasse
        ORDER BY a.id_auditoria DESC
        LIMIT 1
    ) ult ON TRUE
    WHERE r.status = 'erro'
       OR (r.status = 'pendente' AND NOT EXISTS (
               SELECT 1 FROM perfil_pesquisador pp
               WHERE pp.id_usuario = ca.id_usuario AND pp.chave_pix_verificada_em IS NOT NULL))
    ORDER BY r.id_repasse
    LIMIT p_limite;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     reenfileirar_repasse
-- Assinatura: (p_id_repasse INT, p_observacao TEXT) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      Uma pessoa corrigiu a causa de um repasse em 'erro' (chave Pix errada, saldo reposto, etc.) e o recoloca na
--             fila: erro -> pendente (auditado, com a observação e quem fez), zera tentativas e espera. A CHAVE DE
--             IDEMPOTÊNCIA só é trocada quando o provedor chegou a criar uma transferência e a reportou como falha
--             (id_transferencia_api preenchido): um novo pedido com a mesma chave devolveria a transferência que falhou. Sem id
--             de transferência (erro por rede/tentativas), a chave NÃO muda: pode ter existido uma transferência que o
--             sistema não viu, e é a chave antiga que a busca por referência usa para não pagar duas vezes. Só repasse
--             em 'erro' (91049); observação obrigatória (90034); exige 'pagamento_revisao_resolver' (92037).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reenfileirar_repasse(p_id_repasse INT, p_observacao TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status status_repasse;
    v_id_trf TEXT;
    v_obs    TEXT := NULLIF(BTRIM(p_observacao), '');
BEGIN
    IF NOT public.tem_permissao('pagamento_revisao_resolver') THEN
        RAISE EXCEPTION 'Sem permissão para reenfileirar repasses.' USING ERRCODE = '92037';
    END IF;
    IF v_obs IS NULL THEN
        RAISE EXCEPTION 'Escreva o que foi corrigido antes de reenfileirar o repasse.' USING ERRCODE = '90034';
    END IF;

    SELECT r.status, r.id_transferencia_api INTO v_status, v_id_trf
    FROM repasse r
    WHERE r.id_repasse = p_id_repasse
    FOR UPDATE;

    IF NOT FOUND OR v_status <> 'erro' THEN
        RAISE EXCEPTION 'Só um repasse em erro pode ser reenfileirado.' USING ERRCODE = '91049';
    END IF;

    UPDATE repasse
    SET tentativas_transferencia = 0,
        proxima_tentativa_em = NULL,
        chave_idempotencia = CASE WHEN v_id_trf IS NOT NULL THEN gen_random_uuid() ELSE chave_idempotencia END,
        id_transferencia_api = NULL
    WHERE id_repasse = p_id_repasse;

    PERFORM public.atualizar_status_repasse(p_id_repasse, 'pendente', NULL, 'reenfileirado: ' || v_obs);
END;
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
--             'encerrado_moderacao') e em campanha que ainda não foi publicada
--             ('rascunho' ou 'aguardando_aprovacao'), que só o dono enxerga.
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
    IF v_status IN ('rascunho', 'aguardando_aprovacao') THEN
        RAISE EXCEPTION 'Operação bloqueada: esta campanha ainda não foi publicada, então não recebe comentários.'
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
-- Função:     fn_valida_seguir_campanha_publicada
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Só se segue campanha publicada (ativa, inclusive "Em breve", sucesso, não atingida ou encerrada), o
--             mesmo conjunto que pol_campanha_select (04) mostra a qualquer pessoa. Rascunho, aguardando aprovação,
--             rejeitada e encerrada por moderação não são públicas. Vale só na hora de seguir: quem já segue
--             continua seguindo se a campanha mudar de status depois.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_seguir_campanha_publicada()
RETURNS TRIGGER AS $$
DECLARE
    v_status status_campanha;
BEGIN
    SELECT status INTO v_status
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF v_status NOT IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado') THEN
        RAISE EXCEPTION 'Só é possível seguir uma campanha publicada.'
            USING ERRCODE = '91034';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_seguir_campanha_valida_publicada
-- Tabela:    seguir_campanha
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_seguir_campanha_publicada()
-- Bloco:     [05-K-3]
-- Regra:     Impede seguir campanha que não é pública.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_seguir_campanha_valida_publicada ON seguir_campanha;
CREATE TRIGGER trg_seguir_campanha_valida_publicada
BEFORE INSERT ON seguir_campanha
FOR EACH ROW
EXECUTE FUNCTION fn_valida_seguir_campanha_publicada();

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
-- Função:     fn_denuncia_registra_julgador
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Grava em id_julgador quem julgou a denúncia (procedente ou improcedente) e em julgado_em quando, pelo
--             caminho que for (tela de julgar ou encerrar_campanha_por_denuncia); voltar para pendente apaga os dois. A decisão da
--             contestação (decidir_contestacao, 03) também muda o status, mas não troca quem julgou: é o que impede
--             quem julgou de decidir a contestação contra a própria decisão (92036).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_denuncia_registra_julgador()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.contestacao_status IS DISTINCT FROM OLD.contestacao_status THEN
        RETURN NEW;
    END IF;
    IF NEW.status IN ('resolvida', 'improcedente') THEN
        NEW.id_julgador := public.id_usuario_atual();
        NEW.julgado_em := NOW();
    ELSE
        NEW.id_julgador := NULL;
        NEW.julgado_em := NULL;
    END IF;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_denuncia_registra_julgador
-- Tabela:    denuncia
-- Momento:   BEFORE UPDATE (só quando status muda)
-- Função:    fn_denuncia_registra_julgador()
-- Bloco:     [05-K-3]
-- Regra:     Guarda quem julgou a denúncia.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_denuncia_registra_julgador ON denuncia;
CREATE TRIGGER trg_denuncia_registra_julgador
BEFORE UPDATE ON denuncia
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION fn_denuncia_registra_julgador();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_contestacao_pendente
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Com uma contestação esperando análise, a situação da denúncia só muda pela decisão da contestação
--             (decidir_contestacao, 03), que fecha as duas juntas; senão a contestação ficaria aberta sobre uma
--             denúncia já mudada.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_contestacao_pendente()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.contestacao_status = 'pendente' AND NEW.contestacao_status = 'pendente'
       AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Esta denúncia tem uma contestação esperando análise: decida a contestação primeiro.'
            USING ERRCODE = '91048';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_denuncia_valida_contestacao_pendente ON denuncia;
CREATE TRIGGER trg_denuncia_valida_contestacao_pendente
BEFORE UPDATE OF status ON denuncia
FOR EACH ROW
EXECUTE FUNCTION public.fn_valida_contestacao_pendente();

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
-- Função:     fn_protege_ultimo_admin
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Tirar o papel admin do último admin ativo deixaria o sistema sem ninguém para administrar, e pela tela não
--             haveria como desfazer (91030). Mesma regra de fn_eh_ultimo_admin_ativo (03, [03-N]) usada na suspensão e
--             na exclusão de conta.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_protege_ultimo_admin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM papel WHERE id_papel = OLD.id_papel AND codigo = 'admin')
       AND public.fn_eh_ultimo_admin_ativo(OLD.id_usuario) THEN
        RAISE EXCEPTION 'Não é possível tirar o papel do último administrador ativo do sistema.'
            USING ERRCODE = '91030';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuario_papel_protege_ultimo_admin ON usuario_papel;
CREATE TRIGGER trg_usuario_papel_protege_ultimo_admin
BEFORE DELETE ON usuario_papel
FOR EACH ROW EXECUTE FUNCTION public.fn_protege_ultimo_admin();

-- ----------------------------------------------------------------------------
-- Função:     fn_usuario_normaliza_email
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      E-mail gravado sempre sem espaço nas pontas e em minúsculas: "Ana@USP.br" e "ana@usp.br" são a mesma
--             conta, e UK_USUARIO_EMAIL (01) só enxerga isso se o texto gravado for o mesmo. O Nest já manda
--             normalizado; esta trigger garante para qualquer outro caminho de escrita.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_usuario_normaliza_email()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.email := lower(btrim(NEW.email));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuario_normaliza_email ON usuario;
CREATE TRIGGER trg_usuario_normaliza_email
BEFORE INSERT OR UPDATE OF email ON usuario
FOR EACH ROW EXECUTE FUNCTION public.fn_usuario_normaliza_email();

-- ----------------------------------------------------------------------------
-- Função:     fn_protege_termo_aceito
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      RF-091: a versão do Termo que alguém já aceitou (no cadastro, no upgrade ou numa contribuição) não pode
--             ser excluída (91032) nem ter texto, tipo ou versão alterados (91033), só substituída por uma versão
--             nova. É a prova do que cada pessoa aceitou. Versão nunca aceita pode ser excluída e corrigida à
--             vontade. SECURITY DEFINER: enxerga todos os aceites, independente da RLS de quem pede.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_protege_termo_aceito()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM usuario_termo WHERE id_termo = OLD.id_termo)
       OR EXISTS (SELECT 1 FROM aceite_termo_contribuicao WHERE id_termo = OLD.id_termo) THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Esta versão já foi aceita por pelo menos uma pessoa e não pode ser excluída (é a prova do aceite). Publique uma versão nova para substituí-la.'
                USING ERRCODE = '91032';
        END IF;
        RAISE EXCEPTION 'Esta versão já foi aceita por pelo menos uma pessoa e não pode mais ser alterada. Publique uma versão nova.'
            USING ERRCODE = '91033';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_termos_de_uso_protege_aceito ON termos_de_uso;
CREATE TRIGGER trg_termos_de_uso_protege_aceito
BEFORE DELETE OR UPDATE OF conteudo, tipo, versao ON termos_de_uso
FOR EACH ROW EXECUTE FUNCTION public.fn_protege_termo_aceito();

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
        -- (usuario.service.unlock.ts), isso vale ficar no log; só o "logou normalmente" é ruído. O dado não sumiu,
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
-- Função:     limpar_ip_aceite_contribuicao
-- Assinatura: () -> INT
-- Bloco:      [05-L]
-- Regra:      Apaga (deixa vazio) o IP do aceite de contribuição mais velho que
--             configuracoes.ip_aceite_contribuicao_retencao_dias (1825, 5 anos; 0 = guardar para sempre), o prazo
--             que o Termo de Uso promete (item 5.4). O resto do aceite (termo, data) continua: só o IP sai.
--             SECURITY DEFINER (app_nestjs não tem UPDATE na tabela), chamada pelo job diário do Nest. Retorna
--             quantos IPs foram apagados.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.limpar_ip_aceite_contribuicao()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dias     INT;
    v_apagados INT;
BEGIN
    v_dias := public.config_numero('ip_aceite_contribuicao_retencao_dias', 1825)::INT;
    IF v_dias <= 0 THEN
        RETURN 0;
    END IF;

    UPDATE aceite_termo_contribuicao
    SET ip_aceite = NULL
    WHERE ip_aceite IS NOT NULL
      AND aceito_em < NOW() - (v_dias * INTERVAL '1 day');
    GET DIAGNOSTICS v_apagados = ROW_COUNT;
    RETURN v_apagados;
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

DROP TRIGGER IF EXISTS trg_log_auditoria_denuncia_contestacao ON denuncia;
CREATE TRIGGER trg_log_auditoria_denuncia_contestacao
AFTER UPDATE ON denuncia
FOR EACH ROW
WHEN (OLD.contestacao_status IS DISTINCT FROM NEW.contestacao_status)
EXECUTE FUNCTION public.fn_log_auditoria('id_denuncia');

DROP TRIGGER IF EXISTS trg_log_auditoria_score_config ON score_config;
CREATE TRIGGER trg_log_auditoria_score_config
AFTER INSERT OR UPDATE OR DELETE ON score_config
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_score_config');

DROP TRIGGER IF EXISTS trg_log_auditoria_score_rotulo ON score_rotulo;
CREATE TRIGGER trg_log_auditoria_score_rotulo
AFTER INSERT OR UPDATE OR DELETE ON score_rotulo
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_rotulo');

-- ============================================================
-- [05-G] ARQUIVO: posse da foto de perfil e dos anexos, e limpeza de órfãos
-- ============================================================
-- Um arquivo enviado só "fica" se algum registro dono o adotar (foto de perfil, anexo de atualização ou de
-- recompensa). O upload é confirmado antes do dono existir (a tela mostra a foto na hora, antes de salvar), então
-- o banco garante as duas pontas: quem adota tem de ter enviado o arquivo, e quem ninguém adotou some depois de um
-- prazo. E cada arquivo mora num lugar só (uma foto, ou um anexo de uma atualização, ou de uma recompensa).

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_posse_imagem_perfil
-- Uso:        Invocada por trg_valida_posse_imagem_perfil
-- Bloco:      [05-G]
-- Regra:      Só vale com alguém logado (id_usuario_atual()); o seed e a manutenção direta no banco não têm sessão, e o
--             cadastro público não aceita foto. A foto nova precisa: existir e estar ativa (90022), ter sido enviada
--             por quem está logado (92025; o admin que troca a foto de outra pessoa envia o arquivo ele mesmo) e não
--             estar em uso em outro lugar (91029). Sem isso, qualquer conta apontava a própria foto para o arquivo de
--             outra pessoa e, pela posse que pol_arquivo_update (04) dá à foto de perfil, conseguia apagá-lo.
--             SECURITY DEFINER para enxergar vínculos que a RLS esconde de quem está logado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_posse_imagem_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_atual   INT := public.id_usuario_atual();
    v_arquivo arquivo%ROWTYPE;
BEGIN
    IF NEW.id_imagem_perfil IS NULL
       OR (TG_OP = 'UPDATE' AND NEW.id_imagem_perfil IS NOT DISTINCT FROM OLD.id_imagem_perfil)
       OR v_atual IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_arquivo FROM arquivo WHERE id_arquivo = NEW.id_imagem_perfil;
    IF NOT FOUND OR v_arquivo.ativo IS NOT TRUE THEN
        RAISE EXCEPTION 'A foto escolhida não existe mais ou foi removida. Envie a imagem de novo.' USING ERRCODE = '90022';
    END IF;
    IF v_arquivo.id_usuario_upload IS DISTINCT FROM v_atual THEN
        RAISE EXCEPTION 'Só é possível usar como foto um arquivo que você mesmo enviou.' USING ERRCODE = '92025';
    END IF;
    IF EXISTS (SELECT 1 FROM usuario WHERE id_imagem_perfil = NEW.id_imagem_perfil AND id_usuario <> NEW.id_usuario)
       OR EXISTS (SELECT 1 FROM arquivo_atualizacao WHERE id_arquivo = NEW.id_imagem_perfil)
       OR EXISTS (SELECT 1 FROM arquivo_recompensa WHERE id_arquivo = NEW.id_imagem_perfil) THEN
        RAISE EXCEPTION 'Este arquivo já está em uso em outro lugar.' USING ERRCODE = '91029';
    END IF;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_posse_imagem_perfil
-- Tabela:    usuario
-- Momento:   BEFORE INSERT OR UPDATE OF id_imagem_perfil
-- Função:    fn_valida_posse_imagem_perfil()
-- Bloco:     [05-G]
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_valida_posse_imagem_perfil ON usuario;
CREATE TRIGGER trg_valida_posse_imagem_perfil
BEFORE INSERT OR UPDATE OF id_imagem_perfil ON usuario
FOR EACH ROW EXECUTE FUNCTION public.fn_valida_posse_imagem_perfil();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_posse_anexo
-- Uso:        Invocada por trg_valida_posse_anexo_atualizacao e trg_valida_posse_anexo_recompensa
-- Bloco:      [05-G]
-- Regra:      Mesma regra da foto de perfil (fn_valida_posse_imagem_perfil, acima), para anexo de atualização e de
--             recompensa: o arquivo precisa existir e estar ativo (90022), ter sido enviado por quem está logado
--             (92025) e não estar em uso em nenhum outro lugar (91029): nem como foto de alguém, nem como anexo de
--             outra atualização ou recompensa. Um arquivo mora num lugar só; para usar o mesmo PDF em dois lugares,
--             envia-se de novo. Sem isso, quem é dono da atualização anexava o arquivo de outra pessoa e, pela
--             posse que o anexo dá em pol_arquivo_update (04), podia apagá-lo; e apagar o anexo de um lugar sumia
--             com o do outro. Só vale com alguém logado (o seed e a manutenção direta não têm sessão). No UPDATE só
--             confere quando id_arquivo muda. SECURITY DEFINER para enxergar vínculos que a RLS esconde.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_posse_anexo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_atual   INT := public.id_usuario_atual();
    v_arquivo arquivo%ROWTYPE;
    v_em_uso  BOOLEAN;
BEGIN
    IF v_atual IS NULL OR (TG_OP = 'UPDATE' AND NEW.id_arquivo IS NOT DISTINCT FROM OLD.id_arquivo) THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_arquivo FROM arquivo WHERE id_arquivo = NEW.id_arquivo;
    IF NOT FOUND OR v_arquivo.ativo IS NOT TRUE THEN
        RAISE EXCEPTION 'O arquivo escolhido não existe mais ou foi removido. Envie o arquivo de novo.' USING ERRCODE = '90022';
    END IF;
    IF v_arquivo.id_usuario_upload IS DISTINCT FROM v_atual THEN
        RAISE EXCEPTION 'Só é possível anexar um arquivo que você mesmo enviou.' USING ERRCODE = '92025';
    END IF;

    -- Em uso em outro lugar: a própria linha (num UPDATE) não conta.
    IF TG_TABLE_NAME = 'arquivo_atualizacao' THEN
        v_em_uso := EXISTS (SELECT 1 FROM arquivo_atualizacao WHERE id_arquivo = NEW.id_arquivo AND id_arq_atu IS DISTINCT FROM NEW.id_arq_atu)
                 OR EXISTS (SELECT 1 FROM arquivo_recompensa WHERE id_arquivo = NEW.id_arquivo);
    ELSE
        v_em_uso := EXISTS (SELECT 1 FROM arquivo_recompensa WHERE id_arquivo = NEW.id_arquivo AND id_arq_recompensa IS DISTINCT FROM NEW.id_arq_recompensa)
                 OR EXISTS (SELECT 1 FROM arquivo_atualizacao WHERE id_arquivo = NEW.id_arquivo);
    END IF;
    IF v_em_uso OR EXISTS (SELECT 1 FROM usuario WHERE id_imagem_perfil = NEW.id_arquivo) THEN
        RAISE EXCEPTION 'Este arquivo já está em uso em outro lugar.' USING ERRCODE = '91029';
    END IF;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_posse_anexo_atualizacao / trg_valida_posse_anexo_recompensa
-- Tabela:    arquivo_atualizacao / arquivo_recompensa
-- Momento:   BEFORE INSERT OR UPDATE OF id_arquivo
-- Função:    fn_valida_posse_anexo()
-- Bloco:     [05-G]
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_valida_posse_anexo_atualizacao ON arquivo_atualizacao;
CREATE TRIGGER trg_valida_posse_anexo_atualizacao
BEFORE INSERT OR UPDATE OF id_arquivo ON arquivo_atualizacao
FOR EACH ROW EXECUTE FUNCTION public.fn_valida_posse_anexo();

DROP TRIGGER IF EXISTS trg_valida_posse_anexo_recompensa ON arquivo_recompensa;
CREATE TRIGGER trg_valida_posse_anexo_recompensa
BEFORE INSERT OR UPDATE OF id_arquivo ON arquivo_recompensa
FOR EACH ROW EXECUTE FUNCTION public.fn_valida_posse_anexo();

-- ----------------------------------------------------------------------------
-- Função:     desativar_arquivos_orfaos
-- Assinatura: () -> TABLE(id_arquivo INT, chave TEXT)
-- Bloco:      [05-G]
-- Regra:      Desativa (ativo = FALSE, mesma exclusão lógica do resto do sistema) todo arquivo ativo enviado há mais de
--             configuracoes.arquivo_horas_para_vincular (24) que nenhum dono adotou: não é foto de perfil de ninguém
--             nem anexo de atualização ou de recompensa. 0 ou negativo = desligado. Devolve as chaves para o Nest
--             apagar os objetos do armazenamento, e deixa UMA linha de rastro em log_auditoria quando desativa algo.
--             Dono novo de arquivo (tabela nova que aponte para arquivo) tem de entrar nos NOT EXISTS abaixo e nas
--             duas regras de posse (fn_valida_posse_imagem_perfil e fn_valida_posse_anexo). SECURITY DEFINER,
--             chamada por @Cron diário, sem sessão de usuário.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desativar_arquivos_orfaos()
RETURNS TABLE (id_arquivo INT, chave TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_horas INT;
    v_corte TIMESTAMPTZ;
    v_total INT;
BEGIN
    v_horas := public.config_numero('arquivo_horas_para_vincular', 24)::INT;
    IF v_horas <= 0 THEN
        RETURN;
    END IF;
    v_corte := NOW() - (v_horas * INTERVAL '1 hour');

    RETURN QUERY
    UPDATE arquivo a
       SET ativo = FALSE, desativado_em = NOW()
     WHERE a.ativo = TRUE
       AND a.criado_em < v_corte
       AND NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id_imagem_perfil = a.id_arquivo)
       AND NOT EXISTS (SELECT 1 FROM arquivo_atualizacao aa WHERE aa.id_arquivo = a.id_arquivo)
       AND NOT EXISTS (SELECT 1 FROM arquivo_recompensa ar WHERE ar.id_arquivo = a.id_arquivo)
    RETURNING a.id_arquivo, a.chave::TEXT;

    GET DIAGNOSTICS v_total = ROW_COUNT;
    IF v_total > 0 THEN
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_novos)
        VALUES ('arquivo', 'órfãos anteriores a ' || to_char(v_corte, 'YYYY-MM-DD HH24:MI'), 'UPDATE', NULL,
                jsonb_build_object('quantidade', v_total, 'horas_para_vincular', v_horas, 'corte', v_corte));
    END IF;
END;
$$;
