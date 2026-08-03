-- ============================================================================
--  CROWDACADÊMICO — SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     05_regras_negocio.sql
--  Módulo:      Motor de Score & Regras de Negócio (Triggers e Funções)
--  Depende de:  01_extensoes_enums_tabelas.sql, 03_funcoes_seguranca.sql
--               (fn_bloqueia_reversao_moderacao_comentario chama public.tem_permissao();
--               praticamente todo o arquivo chama public.config_numero(), que
--               mora em 03 desde 28-07-2026 — ver [03-C])
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
--  (letras seguem o índice global de DOCUMENTACAO_BD.md — I = SCORE,
--  K = Regras de Negócio Transversais; ver cabeçalho desse arquivo)
-- ----------------------------------------------------------------------------
--  [I]  SCORE — motor de cálculo e automação de pontuação
--       [05-I-1] Helpers e Utilitários
--       [05-I-2] Cálculo das Dimensões
--       [05-I-3] Orquestração e Cálculo Geral
--       [05-I-4] Triggers e Funções de Automação
--  [K]  REGRAS DE NEGÓCIO TRANSVERSAIS — validações que atravessam mais de
--       um domínio de dado ao mesmo tempo
--       [05-K-1] Integridade e Escopo
--       [05-K-2] Campanhas e Financeiro
--       [05-K-3] Comunidade, Engajamento e RBAC
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Contexto histórico do motor de score (por que ele existe):
-- perfil_pesquisador.score_atual e score_pesquisador.pontos_obtidos eram só
-- valores fixos digitados no seed — nada no app realmente calculava o score
-- a partir de campanha/denuncia/link_academico/perfil. 5 dos 7 pesquisadores
-- nem tinham linha em score_pesquisador. No app, a tela de detalhes de
-- pontuação lia campos que não existem no tipo real de dimensões de score
-- (que só tem perfil_academico, historico_plataforma, atualizacao_campanha,
-- reputacao_comunidade), então toda conta vinha undefined * peso = NaN.
--
-- Estratégia: calcular tudo dentro do banco (não no app), manter o resultado
-- em cache em perfil_pesquisador.score_atual / score_pesquisador, atualizado
-- automaticamente por TRIGGER sempre que campanha, denuncia,
-- atualizacao_campanha, link_academico, perfil_pesquisador ou score_config
-- mudarem — assim funciona pra QUALQUER registro novo, sem precisar lembrar
-- de chamar nada no app. Todos os pesos vêm de score_config.peso (não há
-- número "mágico" fixo no código) — editar o peso no Painel Admin já
-- recalcula o score de todo mundo automaticamente.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- ATENÇÃO (28-07-2026, Claude Web — 6ª auditoria, "manutenção e trabalhos de
-- fundo precisam de identidade"): depois de trg_campanha_valida_transicao
-- ([05-K-2]) e de pol_campanha_update (04) exigirem dono ou permissão real,
-- QUALQUER UPDATE em campanha rodado sem app.id_usuario_atual definido na
-- sessão — inclusive por um superusuário corrigindo dado manualmente no SQL
-- Editor — não afeta nenhuma linha (RLS filtra tudo antes da trigger sequer
-- avaliar) e devolve "UPDATE 0" SEM ERRO NENHUM. É o comportamento correto
-- (aprovação/rejeição de campanha precisa ser atribuível a alguém), mas o modo
-- de falhar é silencioso. Antes de qualquer UPDATE manual em campanha, rode:
--     SET app.id_usuario_atual = '<id de um usuário com a permissão certa>';
-- Mesmo tema pro worker de notificação (precisa de sessão com
-- notificacao_processar) e pro encerramento automático de campanha vencida —
-- este último já tem função pronta pra isso, encerrar_campanhas_vencidas()
-- ([05-K-2]), SECURITY DEFINER, chamada por agendamento sem precisar de
-- SET LOCAL manual. Documentado também em tutorial-rodar-projeto.md, item 8.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- ERRCODE CUSTOMIZADO (02-08-2026, Claude Web — pendência apontada pela
-- Alexia): as 42 `RAISE EXCEPTION` deste arquivo passaram a carregar
-- `USING ERRCODE = '<código>'`. Antes disso, todas caíam no SQLSTATE genérico
-- `P0001` (qualquer `RAISE EXCEPTION` sem ERRCODE explícito), e o Nest não
-- tinha como diferenciar "sem permissão" de "dado inválido" de "estado
-- conflitante" — usuario.service.remove.ts, por exemplo, tratava QUALQUER
-- erro de excluir_conta_usuario() como 403, mesmo que a causa real fosse uma
-- trigger de validação de dado (não de permissão) disparada por tabela
-- relacionada.
--
-- Faixas usadas (nenhuma colide com os SQLSTATE nativos do Postgres já
-- tratados em nest/src/commons/database/postgres-exception.filter.ts:
-- 23505, 23503, 23502, 23514, 42501, P0001):
--   90001-90999  VALIDAÇÃO DE DADO/NEGÓCIO      -> HTTP 400 Bad Request
--                (formato, limite de tamanho, mínimo, campo obrigatório
--                fora do CHECK técnico, etc — nada de permissão envolvida)
--   91001-91999  CONFLITO DE ESTADO/REGRA        -> HTTP 409 Conflict
--                (campanha "congelada" após aprovação, transição de status
--                inválida, limite de recursos atingido, estoque insuficiente,
--                ação incompatível com o status atual do registro)
--   92001-92999  AUTORIZAÇÃO NEGADA (regra de negócio, não RLS) -> HTTP 403
--                (checagem feita via tem_permissao() dentro da trigger, ou
--                restrição por identidade/conflito de interesse — dono, autor,
--                denunciante agindo sobre o próprio registro)
--   93001-93999  LIMITE DE TAXA (rate limit)     -> HTTP 429 Too Many Requests
--
-- Cada código é único neste arquivo (ver DOCUMENTACAO_ERRCODE.md, gerado
-- junto desta mudança, para a lista completa código -> origem -> mensagem).
-- Mapeamento em HttpException fica por conta do Nest (ver
-- postgres-exception.filter.ts) — este arquivo só declara o SQLSTATE, não
-- decide o status HTTP.
-- ----------------------------------------------------------------------------


-- ============================================================================
--  [05-I-1] SCORE — HELPERS E UTILITÁRIOS
--  Descrição: Funções de suporte geral para leitura de configurações do sistema
--             e fallbacks operacionais.
-- MOVIDO (28-07-2026, Claude Web — "três pontas menores"): config_numero()
-- morava aqui, mas 03_funcoes_seguranca.sql (que roda ANTES deste arquivo) já
-- tinha uma função nova (registrar_falha_login, [03-F]) chamando config_numero —
-- funcionava só porque, no bootstrap completo, nada CHAMA a função antes da
-- hora; rodar 01→03 isolado e invocar registrar_falha_login já dava
-- "function public.config_numero(unknown, integer) does not exist". config_numero
-- é helper de leitura de configuração, encaixa melhor em 03 (que também virou o
-- lugar das funções de autenticação) do que aqui — movida pra
-- 03_funcoes_seguranca.sql, [03-C]. Este bloco continua com fn_precisa_revisao_score.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     fn_precisa_revisao_score
-- Assinatura: (p_id_usuario INT) -> BOOLEAN
-- Bloco:      [05-I-1]
-- Regra:      Resolve o item 3 da Lista de Pendências (28-07-2026) — o score
--             NUNCA bloqueia a criação de campanha (nem Catarse nem Experiment
--             fazem isso; o filtro de confiança real é a aprovação manual do
--             Admin, via status='aguardando_aprovacao'). 'configuracoes.
--             score_minimo_campanha' vira só um SINAL pro painel do Admin
--             destacar, na fila de aprovação, campanhas de pesquisadores com
--             score abaixo do mínimo pra receberem uma revisão mais cuidadosa
--             — nunca uma trava automática e definitiva. SECURITY DEFINER
--             porque expõe só um booleano, sem vazar o valor real do score
--             (pol_score_select restringe score_atual ao próprio dono).
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
--  [05-I-2] SCORE — CÁLCULO DAS DIMENSÕES
--  Descrição: Funções puras de cálculo de pontuação por dimensão.
--             Recebem o ID do usuário (p_id_usuario INT) e retornam NUMERIC.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     calcular_score_perfil_academico
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 1 — Perfil Acadêmico Declarado. Soma os pesos (vindos
--             de score_config, subitens do pai 'perfil_academico') de: link
--             Lattes, link ORCID, outro link acadêmico (qualquer tipo_link que
--             não seja Lattes/ORCID), vínculo institucional preenchido e
--             título acadêmico informado no perfil_pesquisador.
-- CORRIGIDO (28-07-2026, item 13(d) da Lista C — "GitHub não pontua"): o
-- reconhecimento de link era por ILIKE no NOME de exibição do tipo_link
-- ('%linkedin%', '%researchgate%', '%academia%', '%scholar%', '%site%') —
-- hardcoded, frágil (rename de exibição quebra silenciosamente) e nunca incluía
-- GitHub, mesmo o tipo já existindo no catálogo. Passou a comparar por
-- tipo_link.codigo (chave estável, ver [01-C]) em vez do nome, e "outro link
-- acadêmico" virou "qualquer tipo_link cadastrado que não seja Lattes/ORCID" —
-- reconhece GitHub automaticamente, e qualquer tipo novo que entrar no catálogo
-- no futuro (sem precisar editar esta função de novo).
-- ----------------------------------------------------------------------------
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
-- Regra:      Dimensão 2 — Histórico na Plataforma. conclusao = (campanhas
--             concluídas com sucesso / total encerradas) * peso_conclusao;
--             aprovacao = (aprovadas pela moderação / total submetidas) *
--             peso_aprovacao; desconta penalidade_abandono por campanha
--             abandonada e penalidade_sem_justificativa por campanha não
--             atingida sem justificativa na solicitação de encerramento.
-- ----------------------------------------------------------------------------
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
    -- CORRIGIDO (28-07-2026, item 13(b) da Lista C — erro aritmético, não decisão de
    -- negócio): 'rejeitado' saiu do denominador da taxa de conclusão. Contar a mesma
    -- rejeição duas vezes (uma vez derrubando a taxa de aprovação, outra vez entrando
    -- no denominador da taxa de conclusão sem nunca poder entrar no numerador) penaliza
    -- o mesmo fato duas vezes.
    -- CORRIGIDO (28-07-2026, item 13(c) da Lista C — decisão da Alexia, "pode ser"):
    -- 'encerrado' (encerramento antecipado com justificativa, RF-040/RF-042) contava
    -- como sucesso pleno no numerador. Virou neutro: sai também do denominador, não
    -- só do numerador — uma campanha interrompida pelo próprio pesquisador não é
    -- premiada nem punida, só não conta pra taxa de conclusão.
    SELECT count(*) INTO v_total_encerradas FROM campanha WHERE id_usuario = p_id_usuario
        AND status IN ('sucesso','nao_atingido');
    SELECT count(*) INTO v_concluidas_sucesso FROM campanha WHERE id_usuario = p_id_usuario
        AND status = 'sucesso';

    -- Mapeamento pros dados reais (documentado por não haver status
    -- "abandonada" explícito no enum status_campanha):
    --   abandonada        = status='nao_atingido' e NUNCA pediu encerramento
    --   sem justificativa = status='nao_atingido', pediu encerramento, mas sem justificativa
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
-- Regra:      Dimensão 3 — Atualização da Campanha. regularidade =
--             SUM(realizadas)/SUM(esperadas) * peso_regularidade;
--             tempestividade = (% de campanhas em que realizadas >=
--             esperadas) * peso_tempestividade. Considera campanhas que já
--             começaram (ativo/sucesso/nao_atingido/encerrado).
--             atualizacoesEsperadas = duracaoEmMeses * frequencia_esperada_mensal
--             (configurável via score_frequencia_esperada_mensal).
-- ----------------------------------------------------------------------------
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

        -- CORRIGIDO: atualizacao_campanha ganhou soft delete (coluna "ativo",
        -- ver 01_extensoes_enums_tabelas.sql) para atualizações ocultadas por
        -- moderação. Essa contagem não filtrava por "ativo", então uma
        -- atualização removida por moderação continuava inflando o score de
        -- regularidade do pesquisador.
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
-- Regra:      Dimensão 4 — Reputação da Comunidade. reputacaoScore =
--             peso_raiz - totalDenuncias*custo - totalProcedentes*custo_procedente.
-- CORRIGIDO (28-07-2026, item 13(a) da Lista C — conformidade com RF-077, não
-- decisão de negócio): antes, v_total_denuncias contava QUALQUER denúncia
-- contra o pesquisador (inclusive 'pendente', 'em_analise' e 'improcedente'),
-- penalizando mesmo uma acusação ainda sob análise ou já descartada. O RF-077
-- define 'improcedente' como "denúncia descartada após análise" — contar isso
-- como se fosse culpa contradiz o próprio requisito. Agora só denúncias com
-- status 'resolvida' (= procedente, confirmada pela moderação) penalizam,
-- tanto no custo base quanto no custo extra de procedência. Testado: não muda
-- a faixa de nenhum dos 4 pesquisadores desenhados pro teste determinístico
-- (Eduardo, cujas 2 denúncias são 'pendente', sai de 23 pra 25 na dimensão —
-- 46→48 no total, continua "Em Construção"; Vinícius, cujas 4 denúncias já
-- eram todas 'resolvida', não muda — 19, continua "Atenção").
-- CORRIGIDO junto (item 13, quinto ponto — consolidação de constantes): os
-- pesos volume_denuncias/gravidade_denuncias já existiam em score_config
-- (a tabela que o Painel Admin edita, com trigger de recálculo automático),
-- mas nenhuma função os lia — o cálculo usava score_custo_denuncia/
-- score_custo_denuncia_procedente, duas chaves soltas em configuracoes, sem
-- nenhuma ligação com o score_config. Isso fazia o painel mostrar 2 alavancas
-- (volume_denuncias, gravidade_denuncias) que não moviam nada. Migrado: os
-- valores (1 e 3) agora vivem em score_config (nome='volume_denuncias'/
-- 'gravidade_denuncias', ver [07-I-1]), e as 2 chaves em configuracoes saíram
-- do seed (ver [07-I-2]) — score_config passa a ser a única fonte de verdade.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_score_reputacao(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_peso_raiz         DECIMAL;
    v_id_pai            INT;
    v_total_denuncias   INT := 0;
    v_total_procedentes INT := 0;
    v_custo             DECIMAL;
    v_custo_procedente  DECIMAL;
    v_total             DECIMAL;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz FROM score_config WHERE nome = 'reputacao_comunidade' AND ativo = TRUE;
    IF v_peso_raiz IS NULL THEN RETURN 0; END IF;

    SELECT COALESCE(peso, 1) INTO v_custo            FROM score_config WHERE id_pai = v_id_pai AND nome = 'volume_denuncias'    AND ativo = TRUE;
    SELECT COALESCE(peso, 3) INTO v_custo_procedente  FROM score_config WHERE id_pai = v_id_pai AND nome = 'gravidade_denuncias' AND ativo = TRUE;

    -- só denúncias 'resolvida' (= procedente) penalizam — 'pendente',
    -- 'em_analise' e 'improcedente' não contam (RF-077).
    SELECT count(*) INTO v_total_denuncias   FROM denuncia WHERE id_pesquisador_alvo = p_id_usuario AND status = 'resolvida';
    SELECT count(*) INTO v_total_procedentes FROM denuncia WHERE id_pesquisador_alvo = p_id_usuario AND status = 'resolvida';

    v_total := v_peso_raiz - (v_total_denuncias * v_custo) - (v_total_procedentes * v_custo_procedente);

    RETURN ROUND(LEAST(GREATEST(v_total, 0), v_peso_raiz))::INTEGER;
END;
$$;


-- ============================================================================
--  [05-I-3] SCORE — ORQUESTRAÇÃO E CÁLCULO GERAL
--  Descrição: Funções consolidadoras (SECURITY DEFINER) para salvar resultados
--             nas tabelas score_pesquisador e perfil_pesquisador.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     recalcular_score_pesquisador
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-3]
-- Regra:      Recalcula as 4 dimensões de um pesquisador, grava em
--             score_pesquisador (UPSERT) e atualiza o cache em
--             perfil_pesquisador.score_atual. SECURITY DEFINER: precisa poder
--             escrever no perfil de QUALQUER pesquisador (ex: quando um admin
--             resolve uma denúncia contra outra pessoa), não só no perfil de
--             quem disparou a ação.
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
--  [05-I-4] SCORE — TRIGGERS E FUNÇÕES DE AUTOMAÇÃO
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
-- Regra:      campanha afeta histórico e atualização — recalcula o score do
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
-- Regra:     Dispara o recálculo de score do pesquisador dono da campanha.
-- CORRIGIDO (28-07-2026, Claude Web — "Problema 2", item #10 da 1ª análise dele,
-- nunca corrigido até agora): a trigger original era AFTER INSERT OR UPDATE OR
-- DELETE sem nenhuma cláusula WHEN — todo UPDATE em campanha recalculava as 4
-- dimensões inteiras, mesmo quando nenhuma delas usa a coluna que mudou. A cadeia
-- contribuicao -> trg_sincroniza_arrecadado_campanha -> UPDATE campanha
-- (valor_bruto_arrecadado) -> esta trigger disparava um recálculo completo POR
-- DOAÇÃO — medido: 5 doações confirmadas = 20 gravações em score_pesquisador (4
-- por doação), todas produzindo o mesmo número, porque valor_bruto_arrecadado não
-- entra em nenhuma das 4 dimensões. Numa campanha com 500 doações, seriam 500
-- recálculos completos serializando o FOR UPDATE da linha da campanha — risco
-- direto pro RNF-006 (confirmação de pagamento refletida em até 30s). Postgres
-- não aceita TG_OP dentro de WHEN, então não dá pra resolver numa trigger só:
-- precisa de duas, mesmo padrão já usado em trg_perfil_update_recalcula_score.
-- Medido depois da correção: 0 gravações de score por doação (era 4); recálculo
-- ao aprovar/encerrar/rejeitar campanha continua disparando normalmente.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_recalcula_score ON campanha;
CREATE TRIGGER trg_campanha_recalcula_score
    AFTER INSERT OR DELETE ON campanha
    FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_por_campanha();

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
-- Regra:      denuncia afeta reputação — recalcula o score de
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
-- Regra:      atualizacao_campanha afeta a dimensão Atualização — busca o
--             dono da campanha (via id_campanha) e recalcula o score dele.
-- ----------------------------------------------------------------------------
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
-- Regra:      link_academico afeta a dimensão Perfil Acadêmico — recalcula o
--             score do dono do link.
-- ----------------------------------------------------------------------------
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
-- Regra:      Recalcula o score do próprio perfil_pesquisador que mudou. No
--             UPDATE, só dispara se vinculo_institucional/titulo_academico
--             mudaram de verdade (condição WHEN na trigger, evita loop
--             infinito com o próprio recalculo que atualiza score_atual).
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
-- Momento:   AFTER UPDATE OF peso (somente quando o peso muda de valor)
-- Função:    trg_recalcular_por_score_config()
-- Bloco:     [05-I-4]
-- Regra:     Recalcula o score de todos os pesquisadores quando um peso é
--            editado no Painel Admin.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_score_config_recalcula_todos ON score_config;
CREATE TRIGGER trg_score_config_recalcula_todos
    AFTER UPDATE OF peso ON score_config
    FOR EACH ROW
    WHEN (OLD.peso IS DISTINCT FROM NEW.peso)
    EXECUTE FUNCTION public.trg_recalcular_por_score_config();


-- ============================================================================
--  [05-K-1] REGRAS TRANSVERSAIS — INTEGRIDADE E ESCOPO
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
-- Regra:      tipo_link é compartilhado por 3 tabelas (link_academico,
--             link_atualizacao, link_recompensa). Impede que alguém associe,
--             por exemplo, "Orcid" (permite_perfil=TRUE apenas) a uma
--             recompensa ou atualização — a FK sozinha não bloquearia isso,
--             só a existência do id_tipolink, não o contexto de uso.
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
-- Regra:      RESOLVE o item 19(a) da lista de pendências (28-07-2026) — os
--             RF-014/RF-016/RF-018 e a Etapa 2 falam em até 5 links por
--             pesquisador; a tabela nunca teve trava nenhuma. Limite lido de
--             configuracoes.limite_links_academicos_perfil (mesmo padrão dos
--             outros limites desta lista — campanhas simultâneas, endossos,
--             denúncias/24h), não hardcoded.
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
--            mesmo pesquisador. Só em INSERT — trocar a URL/rótulo de um link
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
-- Regra:      RESOLVE o "Problema 2" apontado pelo Claude Web (28-07-2026) —
--             vários campos de texto livre preenchidos por usuário (denuncia.
--             relato, campanha.descricao, atualizacao_campanha.conteudo,
--             solicitacao_encerramento.justificativa_pesquisador/admin,
--             recompensa.descricao) não tinham NENHUM limite de tamanho — a
--             Alexia já tinha avisado disso no WhatsApp sobre o relato, antes
--             mesmo da coluna existir. Uma função genérica em vez de 6 quase
--             idênticas: TG_ARGV[0] é o nome da coluna a checar (lida via
--             to_jsonb(NEW), já que plpgsql não permite acesso dinâmico a
--             campo de um RECORD por nome), TG_ARGV[1] é a chave em
--             configuracoes, TG_ARGV[2] é o valor padrão caso a chave não
--             exista. O limite técnico largo (bem maior, fixo) já mora na
--             CHECK de cada coluna (01) — esta trigger é só o limite de
--             negócio, menor e configurável pelo Painel Admin.
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
    v_limite := public.config_numero(v_chave, v_padrao)::INT;
    v_valor  := to_jsonb(NEW) ->> v_coluna;

    IF v_valor IS NOT NULL AND char_length(v_valor) > v_limite THEN
        RAISE EXCEPTION 'Campo % excede o limite de % caracteres (configuracoes.%)', v_coluna, v_limite, v_chave
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

-- ADICIONADO (31-07-2026, Alexia): orcamento_campanha.descricao e marco_cronograma.descricao
-- entram na mesma função genérica acima, em vez de criar duas funções quase idênticas.
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
-- Regra:      ADICIONADO (27-07-2026) — area_conhecimento ganhou hierarquia de
--             2 níveis (grande área -> área, id_pai em 01) pra dar granularidade
--             de busca de verdade — "Ciências da Saúde" cobrindo de odontologia
--             a saúde coletiva era amplo demais pra filtro funcionar. Decisão
--             tomada junto (27-07-2026): campanha é obrigada a escolher uma área
--             de nível 2 (folha), nunca a grande área raiz — senão a granularidade
--             nova fica decorativa, ninguém é obrigado a usar. Não dá pra fazer
--             isso com CHECK simples (precisa consultar outra tabela), por isso
--             é trigger, não constraint.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_area_conhecimento_nivel2()
RETURNS TRIGGER AS $$
DECLARE
    v_id_pai INT;
BEGIN
    -- campanha.id_area_conhecimento é nullable (01) — NULL continua permitido,
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
-- Regra:      CORRIGIDO — a constraint CK_DENUNCIA_ALVO_XOR (01) já garante que
--             exatamente um alvo está preenchido; esta trigger garante que o
--             motivo escolhido é do tipo certo pro alvo escolhido (denunciar uma
--             campanha com um motivo cadastrado como 'perfil', ou vice-versa,
--             não fazia sentido e nada impedia).
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
--  [05-K-2] REGRAS TRANSVERSAIS — CAMPANHAS E FINANCEIRO
--  Descrição: Proteções de fluxo financeiro, congelamento de regras pós-aprovação
--             e sincronização de saldos de campanha.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_repasse_all_or_nothing
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Bloqueia repasse indevido em campanha all-or-nothing que não
--             atingiu a meta financeira. Só bloqueia se houver tentativa real
--             de liberar dinheiro (valor_liquido > 0); registro de "nada
--             repassado" (RF-038, valor_liquido = 0) continua permitido.
-- CORRIGIDO: a versão anterior comparava só NEW.valor_liquido > 0, então depois que
-- a A3 passou a validar também em UPDATE, um repasse já feito ficava impossível de
-- corrigir (status, data) se a campanha tivesse sido revertida (contribuições
-- devolvidas derrubando valor_bruto_arrecadado abaixo da meta). Agora só bloqueia
-- quando o valor liberado está de fato AUMENTANDO em relação ao que já era antes —
-- reduzir, zerar ou só mudar status/data nunca deveria travar. TG_OP = 'UPDATE'
-- guarda o acesso a OLD porque, num INSERT, o registro OLD não existe (referenciar
-- OLD.coluna nesse caso lança "record OLD is not assigned yet").
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
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_repasse_all_or_nothing()
-- Bloco:     [05-K-2]
-- Regra:     Impede repasse com valor em campanha all-or-nothing sem meta
--            atingida.
-- ----------------------------------------------------------------------------
-- CORRIGIDO: era BEFORE INSERT só — um INSERT com valor_liquido = 0 (permitido, RF-038)
-- seguido de UPDATE pro valor cheio furava a regra all-or-nothing sem revalidar nada,
-- já que pol_repasse_update é USING(true) de propósito (item 9 da PENDENCIAS).
DROP TRIGGER IF EXISTS trg_valida_repasse ON repasse;
CREATE TRIGGER trg_valida_repasse
BEFORE INSERT OR UPDATE ON repasse
FOR EACH ROW
EXECUTE FUNCTION fn_valida_repasse_all_or_nothing();

-- ----------------------------------------------------------------------------
-- Função:     atualizar_status_repasse
-- Assinatura: (p_id_repasse INT, p_status VARCHAR, p_repassado_em TIMESTAMP DEFAULT NULL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      CRÍTICO 2 (extensão) — 5ª auditoria do Claude Web: "estender o
--             mesmo tratamento a repasse, que também é dinheiro saindo".
--             `pol_repasse_update` (04) é `USING (true)` de propósito (item 9
--             da PENDENCIAS) — o `GRANT UPDATE` de tabela inteira que isso
--             exigia saiu (`06`); dali em diante o único jeito de mudar
--             `status`/`repassado_em` é por aqui. `SECURITY DEFINER`, mas
--             `trg_valida_repasse` continua rodando normalmente por baixo (RLS
--             é bypassada, trigger não) — a regra all-or-nothing continua
--             protegida mesmo passando por esta função.
-- SEM AUTORIZAÇÃO DE PROPÓSITO — pré-autenticação: chamada pelo webhook do
-- gateway de pagamento/repasse, sem sessão de usuário (mesma categoria de
-- registrar_falha_login/registrar_login_sucesso, [03-F]). De confiança do
-- backend: o endpoint que chama esta função precisa validar a assinatura do
-- webhook antes, nunca aceitar a chamada de uma rota pública qualquer.
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
-- Regra:     CORRIGIDO — a versão anterior (BEFORE INSERT OR UPDATE sem WHEN)
--            revalidava meio_pagamento em TODO UPDATE, mesmo quando só o status
--            mudava (exatamente o que o webhook de confirmação de pagamento faz).
--            Isso congelava para sempre qualquer contribuição não-PIX que já
--            existisse numa campanha all-or-nothing (ex.: dado histórico do seed,
--            carregado com a trigger desligada). A cláusula WHEN restringe a
--            revalidação para quando o que de fato importa muda, sem abrir mão
--            de impedir trocar o meio de pagamento por baixo dos panos depois.
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
-- Regra:      Impede a alteração de meta financeira, modelo de financiamento,
--             taxa, título ou descrição após a campanha ser aprovada (status
--             'ativo' em diante, incluindo encerramento por moderação) —
--             proteção contra fraude/alteração retroativa. data_fim/
--             data_inicio têm regra própria: só congelam quando a campanha
--             já começou de fato (data_inicio no passado) — ver comentário
--             mais abaixo, no corpo da função (feature "Em breve").
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_congela_regras_campanha()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao') THEN
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

        -- CORRIGIDO (B2): título, descrição e prazo não eram protegidos — trocar a
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

        -- ADICIONADO (28-07-2026) — feature "Em breve": data_fim/data_inicio só
        -- congelam quando a campanha JÁ COMEÇOU de fato (data_inicio no passado),
        -- não no momento da aprovação. Enquanto a campanha está "Em breve"
        -- (aprovada, pública, mas com data_inicio no futuro — ver
        -- fn_valida_contribuicao_campanha_ativa), o pesquisador pode reagendar o
        -- início livremente (precisa de mais tempo de divulgação, por exemplo).
        -- meta/modelo/taxa/título/descrição continuam congelados desde a aprovação
        -- — só as datas ganharam esse período de carência.
        IF OLD.data_inicio IS NOT NULL AND OLD.data_inicio <= NOW() THEN
            IF NEW.data_fim IS DISTINCT FROM OLD.data_fim THEN
                RAISE EXCEPTION 'Operação bloqueada: o prazo da campanha não pode ser alterado depois que ela começa de verdade.'
                    USING ERRCODE = '91009';
            END IF;

            -- CORRIGIDO (regressão do B2): data_inicio tinha ficado de fora — dava pra
            -- recuar a data de início e mudar a duração da campanha pelo outro lado,
            -- sem nenhum bloqueio, mesmo com data_fim já congelado.
            IF NEW.data_inicio IS DISTINCT FROM OLD.data_inicio THEN
                RAISE EXCEPTION 'Operação bloqueada: a data de início da campanha não pode ser alterada depois que ela começa de verdade.'
                    USING ERRCODE = '91010';
            END IF;
        END IF;
    END IF;

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
-- Regra:      ADICIONADO (31-07-2026, Alexia) — orçamento estruturado da campanha
--             (01, [01-E]). Congela na MESMA condição de fn_congela_regras_
--             campanha (status já aprovado em diante) — diferente do
--             cronograma abaixo, que só trava quando a campanha começa de
--             fato. Faz sentido serem diferentes: a soma do orçamento precisa
--             bater EXATAMENTE com meta_financeira (fn_valida_completude_
--             campanha_aprovacao, mais abaixo), e meta_financeira já está
--             congelada desde a aprovação — deixar o orçamento editável até o
--             início de fato permitiria trocar os itens sem nunca quebrar
--             essa igualdade, o que ainda assim seria alteração retroativa de
--             informação já aprovada/exibida publicamente. Cobre INSERT/
--             UPDATE/DELETE porque adicionar ou remover um item depois de
--             aprovado é tão problemático quanto editar o valor de um
--             existente.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER. Sem
-- isso, o SELECT status FROM campanha abaixo fica sujeito à RLS de quem está
-- executando — pol_campanha_select (04) não inclui 'campanha_editar' entre
-- suas condições, só status/dono/'relatorio_visualizar'. Pro dono da campanha
-- (o caso de longe mais comum) isso nunca foi problema, porque o próprio
-- id_usuario=self já satisfaz a policy. Mas alguém com só 'campanha_editar'
-- (sem 'relatorio_visualizar') mexendo no orçamento de campanha de outra
-- pessoa ainda não aprovada enxergaria v_status = NULL (RLS filtra a linha) e
-- o `IF v_status IN (...)` nunca dispararia — a trava de congelamento ficaria
-- silenciosamente inerte. Mesmo raciocínio de fn_valida_completude_campanha_
-- aprovacao (abaixo, no mesmo bloco), onde este padrão foi detalhado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_congela_orcamento_campanha()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id_campanha INT := COALESCE(NEW.id_campanha, OLD.id_campanha);
    v_status      status_campanha;
BEGIN
    SELECT status INTO v_status FROM campanha WHERE id_campanha = v_id_campanha;

    IF v_status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao') THEN
        RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o orçamento após a aprovação da campanha.'
            USING ERRCODE = '91011';
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
-- Regra:      ADICIONADO (01-08-2026, correção do que a Alexia mandou em
--             31-07-2026): ela tinha misturado o número que devia ser TETO
--             (10) com o de PISO (que devia ser bem menor, 3) dentro da MESMA
--             chave `orcamento_min_itens`. Separado em duas chaves:
--             `orcamento_min_itens` (3, checado na aprovação, ver
--             fn_valida_completude_campanha_aprovacao) e `orcamento_max_itens`
--             (10, checado aqui). Checar o máximo no INSERT — não só na
--             aprovação — dá feedback imediato pro pesquisador no item 11,
--             em vez de deixar ele descobrir só quando a campanha for
--             recusada na moderação.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER. O
-- COUNT(*) abaixo é sobre a própria orcamento_campanha, sujeito à sua RLS de
-- SELECT (pol_orcamento_campanha_select, 04) — que passou pra quem tem
-- permissão de INSERT (dono ou 'campanha_editar') mas não necessariamente
-- pra SELECT (só status/dono/'relatorio_visualizar'). Pro dono, nunca foi
-- problema; pra quem só tem 'campanha_editar', o COUNT ficaria sempre 0,
-- deixando o teto inerte em vez de bloquear — mesmo raciocínio de
-- fn_congela_orcamento_campanha (acima).
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
-- Regra:      ADICIONADO (31-07-2026, Alexia) — cronograma estruturado da campanha
--             (01, [01-E]). Diferente do orçamento (acima), o cronograma NÃO
--             trava na aprovação — trava só quando a campanha já começou de
--             fato (campanha.data_inicio <= NOW()), mesma janela de carência
--             já usada pra campanha.data_inicio/data_fim em fn_congela_
--             regras_campanha ("Em breve"): entre aprovar e o início real, o
--             pesquisador pode legitimamente precisar reorganizar datas do
--             plano. Cobre INSERT/UPDATE/DELETE pelo mesmo motivo do
--             orçamento.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER, mesmo
-- raciocínio de fn_congela_orcamento_campanha (acima) — o SELECT data_inicio
-- FROM campanha abaixo ficaria sujeito à RLS de quem executa, silenciosamente
-- inerte pra quem tem só 'campanha_editar' sem 'relatorio_visualizar'.
-- CORRIGIDO (01-08-2026, achado pelo Claude Web em auditoria): a checagem só
-- olhava data_inicio <= NOW(), sem olhar o status da campanha — diferente de
-- fn_congela_regras_campanha e fn_congela_orcamento_campanha, que só travam
-- com a campanha JÁ aprovada (status IN ('ativo', ...)). Isso travava o
-- cadastro dos marcos obrigatórios ainda em 'aguardando_aprovacao': um
-- pesquisador que cria a campanha com data_inicio = agora (sem usar "Em
-- breve") tem o cronograma congelado assim que o relógio passa de
-- data_inicio, mesmo a campanha nunca tendo sido aprovada — e sem os 3
-- marcos mínimos, fn_valida_completude_campanha_aprovacao nunca deixa
-- aprovar (trava circular). Corrigido acrescentando a mesma condição de
-- status usada nas outras duas funções irmãs: só congela se a campanha JÁ
-- estiver aprovada em diante E data_inicio já tiver passado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_congela_marco_cronograma()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id_campanha INT := COALESCE(NEW.id_campanha, OLD.id_campanha);
    v_status      status_campanha;
    v_data_inicio TIMESTAMP;
BEGIN
    SELECT status, data_inicio INTO v_status, v_data_inicio FROM campanha WHERE id_campanha = v_id_campanha;

    IF v_status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao')
       AND v_data_inicio IS NOT NULL AND v_data_inicio <= NOW() THEN
        RAISE EXCEPTION 'Operação bloqueada: o cronograma não pode ser alterado depois que a campanha começa de verdade.'
            USING ERRCODE = '91013';
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
-- Regra:      ADICIONADO (31-07-2026, Alexia) — a data prevista de um marco pode
--             ultrapassar campanha.data_fim sem problema (um marco de
--             divulgação de resultado, por exemplo, é comum acontecer depois
--             do prazo de arrecadação), mas não pode ser anterior a
--             campanha.data_inicio — não faz sentido planejar algo "antes da
--             campanha começar". Sai cedo se data_inicio ainda não foi
--             definida (mesmo padrão de fn_valida_prazo_campanha_negocio):
--             sem data_inicio não há o que comparar.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER, mesmo
-- raciocínio de fn_congela_orcamento_campanha (acima).
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
-- Função:     fn_valida_limite_max_marco_cronograma
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (01-08-2026) — mesmo raciocínio de
--             fn_valida_limite_max_orcamento_campanha (acima): checa
--             configuracoes.cronograma_max_marcos (20) no INSERT, feedback
--             imediato em vez de só na aprovação.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER, mesmo
-- raciocínio de fn_valida_limite_max_orcamento_campanha (acima).
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
-- Regra:      CRÍTICO 1 — 5ª auditoria do Claude Web, achado simulando a
--             jornada de um usuário mal-intencionado (não por leitura de
--             código): `pol_campanha_update` (04) libera UPDATE pro próprio
--             dono (`id_usuario = id_usuario_atual()`), e `fn_congela_regras_
--             campanha` só passa a proteger a linha a partir do momento em que
--             `OLD.status` já está em `('ativo','sucesso','nao_atingido',
--             'encerrado','encerrado_moderacao')` — `'aguardando_aprovacao'`
--             não está nessa lista. Reproduzido: um pesquisador comum, dono da
--             própria campanha em `aguardando_aprovacao`, executava
--             `UPDATE campanha SET status='ativo', aprovado_em=NOW(),
--             id_admin=<ele mesmo>` e funcionava — a campanha saía do ar como
--             se um Administrador tivesse aprovado, e `trg_campanha_carimba_
--             taxa` ainda carimbava `taxa_plataforma=5.00` sozinha, deixando a
--             campanha fraudulenta indistinguível de uma aprovada de verdade.
--             Nenhuma das triggers existentes protegia especificamente QUEM
--             pode mudar `status`/`aprovado_em`/`id_admin` — só o valor final
--             dos outros campos, depois que a campanha já estava aprovada.
-- Regras de transição permitidas, nesta ordem (a primeira que bater libera):
--   1. Nenhum dos 3 campos sensíveis mudou (edição normal de outro campo,
--      já coberta por fn_congela_regras_campanha) — sai cedo.
--   2. Quem tem 'campanha_aprovar', 'campanha_rejeitar' ou
--      'solicitacao_encerramento_decidir' pode fazer qualquer transição — é o
--      Administrador/curador de verdade.
--   3. Encerramento por prazo vencido — AUTOVERIFICÁVEL, sem precisar de
--      permissão nem de um "usuário de sistema": só passa se o prazo já
--      venceu (`data_fim <= NOW()`) E o novo status bate matematicamente com
--      `valor_bruto_arrecadado` vs `meta_financeira` (sucesso só se atingiu a
--      meta, nao_atingido só se não atingiu) — impossível mentir o resultado,
--      porque a condição confere o próprio dado contra si mesma.
--   4. Dono reenviando campanha rejeitada pra nova avaliação (RF-070):
--      só a transição rejeitado -> aguardando_aprovacao, sem tocar
--      aprovado_em/id_admin.
--   5. Cascata de suspensão do pesquisador (RF-084, 30-07-2026) —
--      AUTOVERIFICÁVEL, mesmo espírito do item 3: só passa se o dono da
--      campanha (NEW.id_usuario) está HOJE com status_pesquisador =
--      'suspenso' em perfil_pesquisador, E a transição é exatamente uma das
--      duas que a suspensão prevê (ativo -> encerrado_moderacao ou
--      aguardando_aprovacao -> rejeitado). Não depende de permissão de quem
--      está executando — só do fato, que ninguém consegue forjar por fora de
--      suspender_pesquisador() (03_funcoes_seguranca.sql, [03-G]), o único
--      caminho que escreve status_pesquisador='suspenso'.
--   Qualquer outra tentativa de mudar status/aprovado_em/id_admin: bloqueada.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_transicao_campanha()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status      IS NOT DISTINCT FROM OLD.status
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin THEN
        RETURN NEW;
    END IF;

    IF public.tem_permissao('campanha_aprovar')
       OR public.tem_permissao('campanha_rejeitar')
       OR public.tem_permissao('solicitacao_encerramento_decidir') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'ativo'
       AND OLD.data_fim IS NOT NULL AND OLD.data_fim <= NOW()
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND (
            (NEW.status = 'sucesso'      AND NEW.valor_bruto_arrecadado >= NEW.meta_financeira)
         OR (NEW.status = 'nao_atingido' AND NEW.valor_bruto_arrecadado <  NEW.meta_financeira)
       )
    THEN
        RETURN NEW;
    END IF;

    IF NEW.id_usuario = public.id_usuario_atual()
       AND OLD.status = 'rejeitado' AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
    THEN
        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND (
            (OLD.status = 'ativo'               AND NEW.status = 'encerrado_moderacao')
         OR (OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado')
       )
       AND EXISTS (
           SELECT 1 FROM perfil_pesquisador pp
           WHERE pp.id_usuario = NEW.id_usuario AND pp.status_pesquisador = 'suspenso'
       )
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status de campanha não autorizada.'
        USING ERRCODE = '92001';
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_transicao
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE
-- Função:    fn_valida_transicao_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia auto-aprovação/auto-rejeição/forjar id_admin. Libera
--            aprovação/rejeição real (Admin), encerramento automático por
--            prazo (autoverificável) e reenvio de campanha rejeitada pelo
--            próprio dono (RF-070).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_valida_transicao ON campanha;
CREATE TRIGGER trg_campanha_valida_transicao
BEFORE UPDATE ON campanha
FOR EACH ROW
EXECUTE FUNCTION fn_valida_transicao_campanha();

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_completude_campanha_aprovacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (31-07-2026, Alexia) — orçamento e cronograma estruturados
--             (01, [01-E]) são obrigatórios, e a moderação da campanha (Admin
--             aprovando, ou seja, a transição para 'ativo') é o momento
--             combinado pra checar isso, junto com o resto — não existe
--             moderação separada pros itens. Três condições, todas
--             configuráveis via `configuracoes` (mesmo padrão de meta_minima_
--             campanha/limite_*, acima nesta seção):
--               1. Pelo menos configuracoes.orcamento_min_itens itens de orçamento;
--               2. Pelo menos configuracoes.cronograma_min_marcos marcos de cronograma;
--               3. SUM(orcamento_campanha.valor) = campanha.meta_financeira, EXATO
--                  (não "no máximo", não "aproximado" — bate certinho).
--             O TETO de itens/marcos (10/20) é responsabilidade de
--             fn_valida_limite_max_orcamento_campanha/fn_valida_limite_max_
--             marco_cronograma (acima), checado já no INSERT — aqui só o PISO,
--             que só dá pra confirmar no momento da aprovação (antes disso o
--             pesquisador ainda pode estar adicionando itens). Roda em toda
--             transição PARA 'ativo' vinda de qualquer outro status
--             (normalmente aguardando_aprovacao -> ativo, via campanha_
--             aprovar) — se OLD.status já era 'ativo', não passou por aqui de
--             novo (WHEN abaixo). fn_valida_transicao_campanha (acima) já
--             garantiu QUEM pode fazer essa transição; esta função garante
--             que a campanha está de fato completa antes de ir ao ar.
-- CORRIGIDO (01-08-2026): os defaults de fallback do config_numero() abaixo
-- eram 10/20 (a Alexia tinha confundido min com max) — corrigidos pra 3/3,
-- coerente com as chaves *_min_itens/*_min_marcos agora seedadas com 3 (ver
-- 07_seed_dados.sql). O comportamento de verdade sempre vem da chave em
-- configuracoes; o fallback só entra em ação se a linha sumir do banco.
-- CORRIGIDO (01-08-2026, achado em revisão, antes do commit): faltava
-- SECURITY DEFINER. Sem isso, os SELECT COUNT(*)/SUM() abaixo, contra
-- orcamento_campanha/marco_cronograma, ficam sujeitos à RLS de QUEM está
-- aprovando — e pol_orcamento_campanha_select/pol_marco_cronograma_select (04)
-- só liberam leitura por status/dono/'relatorio_visualizar', nenhum dos quais
-- vale ainda quando a campanha está 'aguardando_aprovacao'. Hoje só 'admin'
-- tem 'campanha_aprovar', e 'admin' também tem 'relatorio_visualizar' —
-- mascarou o bug por acidente. Se um dia outro papel ganhar 'campanha_aprovar'/
-- 'campanha_rejeitar'/'solicitacao_encerramento_decidir' sem também ter
-- 'relatorio_visualizar' (é literalmente a decisão em aberto do item 57), a
-- contagem enxergaria sempre 0 linhas e bloquearia toda aprovação, mesmo com
-- orçamento/cronograma completos — falha silenciosa, sem erro nenhum. Mesmo
-- raciocínio já usado em contar_seguidores_pesquisador()/encerrar_campanhas_
-- vencidas() (03/05): agregado precisa enxergar o total real, não só o que a
-- sessão de quem chama consegue ver linha a linha.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_completude_campanha_aprovacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_min_orcamento  INT;
    v_min_marcos     INT;
    v_qtd_orcamento  INT;
    v_qtd_marcos     INT;
    v_soma_orcamento DECIMAL(10,2);
BEGIN
    v_min_orcamento := public.config_numero('orcamento_min_itens', 3)::INT;
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
        RAISE EXCEPTION 'A campanha precisa de pelo menos % itens de orçamento para ser aprovada (tem %).', v_min_orcamento, v_qtd_orcamento
            USING ERRCODE = '90009';
    END IF;

    IF v_qtd_marcos < v_min_marcos THEN
        RAISE EXCEPTION 'A campanha precisa de pelo menos % marcos de cronograma para ser aprovada (tem %).', v_min_marcos, v_qtd_marcos
            USING ERRCODE = '90010';
    END IF;

    IF v_soma_orcamento <> NEW.meta_financeira THEN
        RAISE EXCEPTION 'A soma dos itens de orçamento (%) precisa ser exatamente igual à meta financeira (%) para a campanha ser aprovada.', v_soma_orcamento, NEW.meta_financeira
            USING ERRCODE = '90011';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_completude_aprovacao
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE (só quando status entra em 'ativo')
-- Função:    fn_valida_completude_campanha_aprovacao()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia aprovação de campanha sem orçamento/cronograma completos
--            e com a soma do orçamento batendo exatamente com a meta.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_campanha_valida_completude_aprovacao ON campanha;
CREATE TRIGGER trg_campanha_valida_completude_aprovacao
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (NEW.status = 'ativo' AND OLD.status IS DISTINCT FROM 'ativo')
EXECUTE FUNCTION public.fn_valida_completude_campanha_aprovacao();

-- ----------------------------------------------------------------------------
-- Função:     fn_preenche_encerramento_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (28-07-2026) — bug real encontrado pelo Claude da
--             Alexia: a coluna encerrado_em (`[01-E]`, criada em 27-07-2026
--             pro RF-042/RF-058) nunca era preenchida por nada — nem trigger,
--             nem UPDATE algum no `.sql`. Nascia e ficava NULL pra sempre,
--             mesmo em campanha já encerrada. Esta trigger fecha o buraco:
--             quando o status entra em 'encerrado' ou 'encerrado_moderacao'
--             (vindo de qualquer outro status), grava NOW() automaticamente,
--             sem depender do backend lembrar de fazer isso em toda rota que
--             muda status. Só grava se ainda não tiver um valor (não
--             sobrescreve um encerrado_em já registrado).
-- CORRIGIDO (28-07-2026, Claude Web — 6ª auditoria, ao implementar
-- encerrar_campanhas_vencidas() logo abaixo): o comentário original da coluna
-- (`[01-E]`) já dizia "registra a data real de encerramento (natural,
-- antecipado ou por moderação)" — mas esta trigger só cobria "antecipado"
-- (`encerrado`) e "por moderação" (`encerrado_moderacao`); faltava o
-- encerramento "natural" de verdade, `'sucesso'`/`'nao_atingido'` (campanha que
-- chega no fim do prazo por conta própria). Ninguém tinha percebido porque,
-- até agora, nada no `.sql` fazia essa transição via `UPDATE` (o seed grava o
-- status final direto no `INSERT`) — só apareceu ao dar ao encerramento
-- automático um caminho de verdade.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_preenche_encerramento_campanha()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao')
       AND OLD.status NOT IN ('sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao')
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
-- Regra:      ÚNICO ACHADO — 6ª auditoria do Claude Web, achado simulando o
--             cron do RF-037 rodando de verdade: um job de fundo roda como
--             app_nestjs SEM sessão de usuário (`id_usuario_atual()` é `NULL`).
--             `pol_campanha_update` (04) exige ser dono OU ter
--             `campanha_editar`/`campanha_aprovar`/`campanha_rejeitar` — um job
--             não é nenhum dos dois, então a RLS não deixa NENHUMA linha
--             visível pra ele. Reproduzido: `UPDATE campanha SET status=
--             'sucesso' WHERE <vencida, meta batida>` devolvia `UPDATE 0` — SEM
--             erro nenhum. Falha silenciosa, a pior categoria: um cron
--             reportaria "ok" todo dia sem encerrar nenhuma campanha vencida,
--             que ficaria `'ativo'` pra sempre — página pública anunciando
--             campanha aberta com contador regressivo negativo, enquanto
--             `fn_valida_contribuicao_campanha_ativa` já rejeitaria doações
--             novas com "o prazo já foi encerrado". O doador veria uma
--             campanha aberta recusando o próprio dinheiro. Importante: a
--             causa NÃO é `trg_campanha_valida_transicao` (`[05-K-2]`, acima)
--             — o ramo autoverificável dela está certo (testado rodando como
--             superusuário: passa nos dois casos legítimos, bloqueia a
--             mentira) — é a RLS que barra antes da trigger sequer avaliar.
-- Solução, mesmo padrão de atualizar_status_contribuicao/atualizar_status_
-- repasse: `SECURITY DEFINER` bypassa a RLS (não a trigger — `trg_campanha_
-- valida_transicao` continua rodando por baixo e validando cada transição pelo
-- mesmo ramo autoverificável de sempre; não afrouxa nem a trigger nem a
-- policy). Chamada por agendamento (@Cron no NestJS), sem sessão de usuário —
-- mesma categoria pré-autorização de registrar_falha_login/registrar_login_
-- sucesso ([03-F]) e do webhook de atualizar_status_contribuicao. Retorna a
-- quantidade de campanhas encerradas, pro job poder logar de verdade (em vez
-- de silêncio) quantas mudaram.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.encerrar_campanhas_vencidas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_encerradas INT;
BEGIN
    UPDATE campanha
    SET status = CASE
        WHEN valor_bruto_arrecadado >= meta_financeira THEN 'sucesso'
        ELSE 'nao_atingido'
    END
    WHERE status = 'ativo'
      AND data_fim IS NOT NULL
      AND data_fim <= NOW();

    GET DIAGNOSTICS v_encerradas = ROW_COUNT;

    RETURN v_encerradas;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     fn_carimba_taxa_plataforma_aprovacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (28-07-2026, item 20 da Lista C — o que o RF-036 pede
--             literalmente, não decisão de negócio sobre "se"). taxa_plataforma
--             existia mas nada nunca a preenchia — o requisito que protege o
--             pesquisador de ter a taxa alterada depois da aprovação não estava
--             implementado (só existia a trigger de congelamento, protegendo um
--             valor que nunca chegava a ser gravado). No momento em que
--             aprovado_em deixa de ser NULL, copia configuracoes.
--             taxa_plataforma_padrao pra campanha.taxa_plataforma — só se ainda
--             não tiver um valor explícito (não sobrescreve uma taxa customizada
--             que porventura já tenha sido definida). Daí em diante, a trigger de
--             congelamento (acima) já protege esse valor contra alteração.
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
-- Regra:      ADICIONADO (28-07-2026, item 16 da Lista C): a regra de negócio
--             real de duração de campanha sai da constraint (que virou só um
--             limite técnico largo, ver CK_CAMPANHA_PRAZO em 01) e passa a ler
--             configuracoes.prazo_minimo_campanha_dias/
--             prazo_maximo_campanha_dias — mudar a política de prazo vira um
--             UPDATE numa linha, não uma migração de estrutura.
-- ATUALIZADO (28-07-2026, mesma data): decisão tomada por você e pela Alexia,
-- direto — prazo agora é 15 a 60 dias (não mais 15-90). O RF-045 (janela de
-- estorno do PIX do Banco Central) fica satisfeito com folga.
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
-- Regra:      MÉDIO 3 — 5ª auditoria do Claude Web: campanha com
--             `meta_financeira = 0.00` era aceita (reproduzido, existia uma no
--             banco de teste) — sem `CHECK` e sem chave de configuração. Numa
--             campanha `all-or-nothing`, meta zero é sucesso instantâneo (a
--             primeira contribuição confirmada já bate a meta). Mesmo padrão
--             do prazo (item 16): o limite técnico (`meta_financeira > 0`) já
--             mora na `CHECK` (01); esta trigger aplica o mínimo de negócio de
--             verdade, maior e configurável, via
--             `configuracoes.meta_minima_campanha` — mudar o valor mínimo
--             aceito vira um `UPDATE` numa linha, não uma migração de
--             constraint.
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
-- Regra:      CORRIGIDO — pol_solicitacao_update (04) passou a liberar UPDATE
--             também pro dono da campanha (não só quem decide), pra destravar o
--             valor 'cancelado' do ENUM status_encerramento. Esta trigger garante
--             que o dono só consegue fazer exatamente uma coisa: cancelar a
--             própria solicitação enquanto ainda está 'pendente' — nenhuma outra
--             coluna, nem outra transição de status. Quem tem
--             solicitacao_encerramento_decidir continua sem nenhuma restrição.
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
-- Regra:      Bloqueia contribuição em campanha que não está com status
--             'ativo' no momento, cujo prazo (data_fim) já expirou, ou que
--             ainda está "Em breve" (data_inicio no futuro).
-- ADICIONADO (28-07-2026) — feature "Em breve"/rascunho agendado: o pesquisador
-- pode aprovar a campanha e escolher lançar na hora ou agendar um início futuro
-- (mesma ideia do Catarse, contador regressivo no front). A campanha já fica
-- pública assim que aprovada (pol_campanha_select, 04, libera por status —
-- ver [04-E]), mas não pode receber nenhuma doação antes de data_inicio
-- chegar. Não precisa de status novo nem de job/cron pra "virar ativa" —
-- data_inicio no passado já é o suficiente, comparado em tempo real aqui.
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
        RAISE EXCEPTION 'Contribuição bloqueada: a campanha ainda não começou (Em breve — início em %).', v_data_inicio
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
-- Regra:      30-07-2026 (RF-056, sugestão do Claude Web). R$5,00 estava
--             hardcoded direto na CHECK CK_CONTRIBUICAO_VALOR_MINIMO (01) —
--             não é piso do gateway de pagamento (PIX em si não impõe
--             mínimo), é política de negócio da plataforma. Mesmo padrão do
--             prazo/meta financeira (item 16): o limite técnico
--             (`valor > 0`) já mora na CHECK; esta trigger aplica o mínimo de
--             negócio de verdade, configurável, via
--             configuracoes.valor_minimo_contribuicao.
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
-- Regra:     Aplica o mínimo de negócio do valor de contribuição
--            (configuracoes), separado do limite técnico (constraint em 01).
--            Só BEFORE INSERT — valor de contribuição não é alterado depois
--            de criada (status/id_transacao_api mudam via
--            atualizar_status_contribuicao, 03, nunca o valor em si).
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
CREATE OR REPLACE FUNCTION fn_sincroniza_arrecadado_campanha()
RETURNS TRIGGER AS $$
DECLARE
    v_id_campanha INT;
    v_total       DECIMAL(10,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_id_campanha := OLD.id_campanha;
    ELSE
        v_id_campanha := NEW.id_campanha;
    END IF;

    -- CORRIGIDO: trava a linha da campanha ANTES de recalcular o SUM.
    -- Sem isso, duas contribuições confirmadas ao mesmo tempo (dois
    -- triggers concorrentes) podem cada uma fazer o SELECT SUM sem
    -- enxergar a linha commitada pela outra ainda, e o UPDATE que
    -- "vence a corrida" por último sobrescreve o total — uma
    -- contribuição confirmada some do valor arrecadado (lost update).
    -- O FOR UPDATE serializa: a segunda transação espera a primeira
    -- commitar antes de fazer o próprio SELECT SUM, então já enxerga
    -- a contribuição da primeira somada.
    PERFORM 1 FROM campanha WHERE id_campanha = v_id_campanha FOR UPDATE;

    -- só entram na soma contribuições efetivamente
    -- confirmadas ou já repassadas ao projeto.
    SELECT COALESCE(SUM(valor), 0)
    INTO v_total
    FROM contribuicao
    WHERE id_campanha = v_id_campanha
      AND status IN ('confirmado', 'repassado');

    UPDATE campanha
    SET valor_bruto_arrecadado = COALESCE(v_total, 0)
    WHERE id_campanha = v_id_campanha;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

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
-- Regra:      CRÍTICO 2 — 5ª auditoria do Claude Web, achado simulando a
--             jornada de um usuário mal-intencionado: `pol_contribuicao_update`
--             (04) era `USING (true)` com `GRANT UPDATE` de tabela inteira —
--             qualquer usuário confirmava a própria contribuição (ou a de
--             qualquer um) direto por `UPDATE`. Reproduzido: fraudador doa
--             R$ 9.000 pra própria campanha (`status='pendente'`), executa
--             `UPDATE contribuicao SET status='confirmado'`, e
--             `trg_sincroniza_arrecadado_campanha` (acima) soma o valor de
--             verdade em `campanha.valor_bruto_arrecadado` — a página pública
--             passa a exibir R$ 9.000 arrecadados sem nenhum pagamento real
--             ter acontecido. Corrigido no mesmo padrão de `[03-F]`: a
--             coluna `status` (e `id_transacao_api`) sai do `GRANT UPDATE`
--             (`06`) e só muda por aqui — `SECURITY DEFINER`, mas
--             `trg_sincroniza_arrecadado_campanha` e as triggers de validação
--             all-or-nothing continuam rodando por baixo normalmente (RLS é
--             bypassada, trigger não).
-- SEM AUTORIZAÇÃO DE PROPÓSITO — pré-autenticação: chamada pelo webhook do
-- gateway de pagamento, sem sessão de usuário (mesma categoria de
-- registrar_falha_login/registrar_login_sucesso, [03-F]). De confiança do
-- backend: o endpoint que chama esta função precisa validar a assinatura do
-- webhook do gateway antes, nunca expor isso como rota pública genérica.
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
-- Regra:      Um pesquisador não pode ter mais campanhas simultâneas (nos
--             status 'aguardando_aprovacao' ou 'ativo') do que
--             configuracoes.limite_campanhas_simultaneas (RF-029).
-- CORRIGIDO (28-07-2026, item 16 da Lista C): limite de 2 estava hardcoded
-- no corpo da função — mudar exigia editar e reaplicar o arquivo inteiro.
-- Passou a ler configuracoes (mesmo valor de hoje, 2, como DEFAULT de
-- segurança caso a chave não exista).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_limite_campanhas_pesquisador()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
    v_limite integer;
BEGIN
    IF NEW.status IN ('aguardando_aprovacao', 'ativo') THEN
        v_limite := public.config_numero('limite_campanhas_simultaneas', 2);

        SELECT COUNT(*) INTO v_count
        FROM campanha
        WHERE id_usuario = NEW.id_usuario
          AND status IN ('aguardando_aprovacao', 'ativo')
          AND id_campanha <> COALESCE(NEW.id_campanha, -1);

        IF v_count >= v_limite THEN
            RAISE EXCEPTION 'Pesquisador já possui o limite máximo de % campanhas ativas ou aguardando aprovação', v_limite
                USING ERRCODE = '91018';
        END IF;
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
--  [05-K-3] REGRAS TRANSVERSAIS — COMUNIDADE, ENGAJAMENTO E RBAC
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
-- Regra:      Uma campanha não pode ter mais endossos ativos simultâneos
--             (ordem_endosso preenchida) do que
--             configuracoes.limite_endossos_campanha (RF-063).
-- CORRIGIDO (28-07-2026, item 16 da Lista C): limite de 4 estava hardcoded
-- no corpo da função. Passou a ler configuracoes (mesmo valor de hoje, 4,
-- como DEFAULT de segurança caso a chave não exista).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_comentario_endosso()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
    v_limite integer;
BEGIN
    IF NEW.ordem_endosso IS NOT NULL THEN
        v_limite := public.config_numero('limite_endossos_campanha', 4);

        -- CORRIGIDO: comentario ganhou soft delete (coluna "ativo") para
        -- remoção por moderação. Sem o filtro abaixo, um comentário
        -- endossado que foi removido por moderação continuava ocupando
        -- para sempre uma das vagas de endosso da campanha.
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
-- Regra:      Pesquisador não pode comentar em sua própria campanha (RF-066).
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
-- Função:     fn_bloqueia_reversao_moderacao_comentario
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Só quem tem a permissão 'comentario_moderar' pode reverter
--             (ativo FALSE -> TRUE) um comentário que a moderação ocultou.
--             O autor continua podendo editar o próprio texto e ocultar
--             (ativo TRUE -> FALSE) o próprio comentário normalmente — só a
--             reversão da moderação é bloqueada. (Ver DOCUMENTACAO_BD.md
--             [04-E-3]/[05-K-3]).
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
-- Regra:     Fecha a brecha em que pol_comentario_update (04) libera UPDATE
--            pro autor sem restringir coluna — sem esta trigger, o autor
--            conseguia desfazer sozinho uma moderação (voltar ativo pra
--            TRUE) com um UPDATE direto, sem passar por moderador/admin.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comentario_bloqueia_reversao_moderacao ON comentario;
CREATE TRIGGER trg_comentario_bloqueia_reversao_moderacao
BEFORE UPDATE ON comentario
FOR EACH ROW
EXECUTE FUNCTION fn_bloqueia_reversao_moderacao_comentario();


-- ----------------------------------------------------------------------------
-- Função:     validar_denuncia_frequencia
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Um usuário não pode registrar mais denúncias (campanha + perfil
--             somadas) em 24 horas do que
--             configuracoes.limite_denuncias_24h (RF-076).
-- CORRIGIDO (28-07-2026, item 16 da Lista C): limite de 5 estava hardcoded
-- no corpo da função. Passou a ler configuracoes (mesmo valor de hoje, 5,
-- como DEFAULT de segurança caso a chave não exista).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_denuncia_frequencia()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
    v_limite integer;
BEGIN
    v_limite := public.config_numero('limite_denuncias_24h', 5);

    SELECT COUNT(*) INTO v_count
    FROM denuncia
    WHERE id_usuario = NEW.id_usuario
      AND criado_em >= NOW() - INTERVAL '24 hours';

    IF v_count >= v_limite THEN
        RAISE EXCEPTION 'Usuário já atingiu o limite de % denúncias nas últimas 24 horas', v_limite
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
-- Regra:     Bloqueia a 6ª denúncia de um mesmo usuário dentro de 24 horas.
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
-- Regra:      MENOR 5 — 5ª auditoria do Claude Web, reproduzido: um moderador
--             (Diego, id 10) criou uma denúncia contra um pesquisador e depois
--             marcou a própria denúncia como 'resolvida' — o que custa 4
--             pontos de score ao alvo (calcular_score_reputacao, [05-I-2]).
--             `pol_denuncia_update` (04) já checa a permissão
--             `denuncia_responder`, mas não checa se quem julga é o mesmo que
--             denunciou — mesmo tipo de conflito de interesse que
--             `validar_comentario_autor()` já bloqueia pra auto-endosso
--             (`[05-K-3]`, acima). Bloqueia qualquer transição de `status`
--             feita pelo próprio denunciante, não só pra 'resolvida' — também
--             não faz sentido o denunciante marcar a própria denúncia como
--             'improcedente'.
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
-- Regra:      Rede de segurança para a remoção de eh_admin() das RLS
--             policies (ver RBAC-pontos-discutidos.md e 04_rls_policies.sql).
--             Toda policy passou a checar tem_permissao('x') em vez de
--             eh_admin(). Sem esta trigger, toda permissão nova criada
--             exigiria lembrar de também inserir a linha correspondente em
--             papel_permissao para 'admin' manualmente — e um esquecimento
--             faria o admin perder acesso a algo que antes tinha de graça
--             via eh_admin(). Com a trigger, toda permissão nova já nasce
--             atribuída ao papel 'admin' automaticamente, tornando
--             tem_permissao(...) um substituto 100% seguro do bypass antigo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_admin_recebe_toda_permissao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO papel_permissao (id_papel, id_permissao)
    SELECT p.id_papel, NEW.id_permissao
    FROM papel p WHERE p.nome = 'admin'
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
-- Regra:      MÉDIO 4 — 5ª auditoria do Claude Web, achado na jornada "usuário
--             com mestrado vira pesquisador": quando o app cria o
--             `perfil_pesquisador` (upgrade de conta), o usuário fica só com o
--             papel `'usuario'` — o papel `'pesquisador'` nunca é atribuído
--             por ninguém. O seed atribui `'pesquisador'` aos 11 pesquisadores
--             semeados (dado histórico), mas o fluxo real do app não replica
--             isso. Hoje não quebra nada (o papel `'pesquisador'` nasce com 0
--             permissões, e as policies checam a existência do
--             `perfil_pesquisador`, não o papel) — mas cria duas realidades
--             diferentes no banco, e vira bug silencioso no dia em que alguém
--             conceder a primeira permissão ao papel `'pesquisador'`, que é a
--             coisa mais natural do mundo de acontecer num RBAC dinâmico.
--             Mantém o invariante "tem perfil <=> tem o papel" — mesmo
--             espírito de `atribuir_papel_padrao()` (08) e de
--             `trg_admin_recebe_toda_permissao()` (acima): `SECURITY DEFINER`
--             porque o usuário que está virando pesquisador ainda não tem
--             `'papel_atribuir'` (mesmo problema de "ovo e galinha").
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
    SELECT id_papel INTO v_id_papel_pesquisador FROM papel WHERE nome = 'pesquisador';

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