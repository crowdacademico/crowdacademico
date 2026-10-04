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
-- GRUPO AP (03-10-2026) - encerramento antecipado de campanha (pedir, cancelar,
-- decidir, encerrar direto sem contribuição) e os pedidos de demonstração
-- Idempotente (pode colar de novo).
-- ⚠️ PARE O NEST antes de colar: tem ALTER TABLE (a regra dos pedidos fica
-- desligada só durante o acerto dos pedidos de demonstração).
-- Encontra campanhas pelo título, não pelo número.
-- ============================================================================
SET TIME ZONE 'America/Sao_Paulo';

-- 1. Pedidos de demonstração coerentes: todos feitos com a campanha ainda ativa. Saem os que vinham depois do fim
-- natural (campanhas 1, 3 e 5) e o da campanha em rascunho; ficam um aprovado (7), um rejeitado (4), um cancelado
-- (2) e um pendente na campanha de teste, para decidir.
ALTER TABLE solicitacao_encerramento DISABLE TRIGGER trg_valida_transicao_solicitacao;

DELETE FROM solicitacao_encerramento
WHERE id_campanha NOT IN ((SELECT id_campanha FROM campanha WHERE titulo = 'Prótese de Baixo Custo com Impressão 3D para Amputados do SUS'), (SELECT id_campanha FROM campanha WHERE titulo = 'Estudo Epidemiológico do Impacto da Dengue na Baixada Fluminense 2024'), (SELECT id_campanha FROM campanha WHERE titulo = 'Eficácia de Probióticos na Redução de Infecções Hospitalares em UTI Neonatal'), (SELECT id_campanha FROM campanha WHERE titulo = 'Campanha de Teste: Comentários e Endosso'))
  AND justificativa_pesquisador IN (
    'Artigo publicado e resultados divulgados à comunidade. Encerrando ciclo da campanha.',
    'Análises laboratoriais concluídas e relatório final entregue. Solicito encerramento.',
    'Relatório de pesquisa entregue à UFSC e comunidades. Encerrando formalmente a campanha.',
    'Desejo encerrar a campanha antes da aprovação por motivos pessoais de agenda.'
  );

UPDATE solicitacao_encerramento SET
    justificativa_pesquisador = 'Os objetivos do ensaio clínico foram atingidos antes do prazo e os resultados já foram submetidos para publicação. Solicito o encerramento antecipado.',
    solicitado_em = '2024-07-20 09:00:00', avaliado_em = '2024-07-21 11:00:00'
WHERE id_campanha = (SELECT id_campanha FROM campanha WHERE titulo = 'Eficácia de Probióticos na Redução de Infecções Hospitalares em UTI Neonatal') AND status = 'aprovado'
  AND justificativa_pesquisador = 'Todos os objetivos do ensaio clínico foram atingidos e resultados publicados. Solicito encerramento formal.';

UPDATE solicitacao_encerramento SET
    justificativa_pesquisador = 'A coleta de dados ficou inviável com o fim do surto. Solicito encerrar antes do prazo.',
    justificativa_admin = 'O surto ainda está em andamento na região; a coleta continua viável até o fim do prazo.',
    status = 'rejeitado', solicitado_em = '2024-04-05 10:00:00', avaliado_em = '2024-04-06 09:00:00'
WHERE id_campanha = (SELECT id_campanha FROM campanha WHERE titulo = 'Estudo Epidemiológico do Impacto da Dengue na Baixada Fluminense 2024') AND status = 'aprovado';

UPDATE solicitacao_encerramento SET
    justificativa_pesquisador = 'Pensei em encerrar antes do prazo para começar a fabricação, mas vou esperar a campanha terminar.',
    id_admin = NULL, status = 'cancelado', solicitado_em = '2024-03-25 15:00:00', avaliado_em = NULL
WHERE id_campanha = (SELECT id_campanha FROM campanha WHERE titulo = 'Prótese de Baixo Custo com Impressão 3D para Amputados do SUS') AND status = 'aprovado';

ALTER TABLE solicitacao_encerramento ENABLE TRIGGER trg_valida_transicao_solicitacao;

-- 2. Um pendente por vez em cada campanha.
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitacao_encerramento_pendente ON solicitacao_encerramento(id_campanha) WHERE status = 'pendente';

-- 3. Pedido só de campanha ativa e com justificativa.
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
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solicitacao_valida_criacao ON solicitacao_encerramento;
CREATE TRIGGER trg_solicitacao_valida_criacao
BEFORE INSERT ON solicitacao_encerramento
FOR EACH ROW
EXECUTE FUNCTION public.fn_valida_solicitacao_encerramento();

-- 4. Pedido decidido ou cancelado não muda mais; aprovar e rejeitar só pela decisão do administrador.
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

-- 5. O dono encerra sozinho, sem contribuição confirmada (novo item 10 da regra de transição da campanha).
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
       AND NOT EXISTS (SELECT 1 FROM contribuicao ct WHERE ct.id_campanha = OLD.id_campanha AND ct.status IN ('confirmado', 'repassado'))
       AND EXISTS (SELECT 1 FROM solicitacao_encerramento se WHERE se.id_campanha = OLD.id_campanha AND se.status = 'aprovado' AND se.id_admin IS NULL)
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status de campanha não autorizada (% -> %).', OLD.status, NEW.status
        USING ERRCODE = '92001';
END;
$$;

CREATE OR REPLACE FUNCTION public.encerrar_campanha_sem_contribuicao(p_id_campanha INT, p_justificativa TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dono   INT;
    v_status status_campanha;
    v_id     INT;
BEGIN
    SELECT id_usuario, status INTO v_dono, v_status FROM campanha WHERE id_campanha = p_id_campanha;
    IF v_dono IS DISTINCT FROM public.id_usuario_atual() THEN
        RAISE EXCEPTION 'Só o dono da campanha pode encerrá-la.' USING ERRCODE = '92031';
    END IF;
    IF p_justificativa IS NULL OR btrim(p_justificativa) = '' THEN
        RAISE EXCEPTION 'Escreva por que a campanha está sendo encerrada.' USING ERRCODE = '90028';
    END IF;
    IF v_status IS DISTINCT FROM 'ativo' THEN
        RAISE EXCEPTION 'Só uma campanha ativa pode ser encerrada antecipadamente.' USING ERRCODE = '91038';
    END IF;
    IF EXISTS (SELECT 1 FROM contribuicao WHERE id_campanha = p_id_campanha AND status IN ('confirmado', 'repassado')) THEN
        RAISE EXCEPTION 'Esta campanha já tem contribuição confirmada: envie um pedido de encerramento ao administrador.'
            USING ERRCODE = '91040';
    END IF;
    IF EXISTS (
        SELECT 1 FROM contribuicao
        WHERE id_campanha = p_id_campanha AND status = 'pendente' AND meio_pagamento = 'pix'
          AND criado_em > NOW() - (public.config_numero('pix_validade_horas', 24) * INTERVAL '1 hour')
    ) THEN
        RAISE EXCEPTION 'Há um pagamento Pix em andamento nesta campanha. Espere ele ser confirmado ou vencer, ou envie um pedido ao administrador.'
            USING ERRCODE = '91043';
    END IF;

    -- Um pedido ainda pendente perde o sentido: a campanha vai ser encerrada agora.
    UPDATE solicitacao_encerramento SET status = 'cancelado' WHERE id_campanha = p_id_campanha AND status = 'pendente';

    INSERT INTO solicitacao_encerramento (id_campanha, justificativa_pesquisador, status, avaliado_em)
    VALUES (p_id_campanha, btrim(p_justificativa), 'aprovado', NOW())
    RETURNING id_solicitacao_encerramento INTO v_id;

    UPDATE campanha SET status = 'encerrado' WHERE id_campanha = p_id_campanha;
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decidir_solicitacao_encerramento(p_id_solicitacao INT, p_aprovar BOOLEAN, p_justificativa TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_campanha INT;
    v_status      status_encerramento;
BEGIN
    IF NOT public.tem_permissao('solicitacao_encerramento_decidir') THEN
        RAISE EXCEPTION 'Sem permissão para decidir pedidos de encerramento.' USING ERRCODE = '92032';
    END IF;
    SELECT id_campanha, status INTO v_id_campanha, v_status FROM solicitacao_encerramento WHERE id_solicitacao_encerramento = p_id_solicitacao;
    IF v_status IS DISTINCT FROM 'pendente' THEN
        RAISE EXCEPTION 'Só um pedido pendente pode ser decidido.' USING ERRCODE = '91041';
    END IF;
    IF NOT p_aprovar AND (p_justificativa IS NULL OR btrim(p_justificativa) = '') THEN
        RAISE EXCEPTION 'Escreva por que o pedido foi rejeitado.' USING ERRCODE = '90029';
    END IF;
    IF p_aprovar AND NOT EXISTS (SELECT 1 FROM campanha WHERE id_campanha = v_id_campanha AND status = 'ativo') THEN
        RAISE EXCEPTION 'A campanha já não está ativa: o pedido não pode ser aprovado.' USING ERRCODE = '91042';
    END IF;

    UPDATE solicitacao_encerramento
    SET status = CASE WHEN p_aprovar THEN 'aprovado' ELSE 'rejeitado' END::status_encerramento,
        id_admin = public.id_usuario_atual(),
        justificativa_admin = NULLIF(btrim(COALESCE(p_justificativa, '')), ''),
        avaliado_em = NOW()
    WHERE id_solicitacao_encerramento = p_id_solicitacao;

    IF p_aprovar THEN
        UPDATE campanha SET status = 'encerrado' WHERE id_campanha = v_id_campanha;
    END IF;
    RETURN v_id_campanha;
END;
$$;

-- 6. A tarefa de rascunhos antigos também pula o rascunho que tem denúncia (bloqueio RESTRICT, 23001).
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

-- 7. O app só cria o pedido (campanha e justificativa) e só muda o status (para cancelar).
REVOKE INSERT, UPDATE ON solicitacao_encerramento FROM app_nestjs;
GRANT INSERT (id_campanha, justificativa_pesquisador) ON solicitacao_encerramento TO app_nestjs;
GRANT UPDATE (status) ON solicitacao_encerramento TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.encerrar_campanha_sem_contribuicao(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.encerrar_campanha_sem_contribuicao(INT, TEXT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.decidir_solicitacao_encerramento(INT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decidir_solicitacao_encerramento(INT, BOOLEAN, TEXT) TO app_nestjs;

-- 8. Um pedido pendente na campanha de teste (ativa), para o administrador decidir.
INSERT INTO solicitacao_encerramento (id_campanha, justificativa_pesquisador)
SELECT (SELECT id_campanha FROM campanha WHERE titulo = 'Campanha de Teste: Comentários e Endosso'), 'A equipe foi reduzida e não conseguiremos cumprir o cronograma. Solicito encerrar antes do prazo.'
WHERE EXISTS (SELECT 1 FROM campanha WHERE titulo = 'Campanha de Teste: Comentários e Endosso' AND status = 'ativo')
  AND NOT EXISTS (SELECT 1 FROM solicitacao_encerramento WHERE id_campanha = (SELECT id_campanha FROM campanha WHERE titulo = 'Campanha de Teste: Comentários e Endosso'));

RESET TIME ZONE;

SELECT c.titulo, s.status, s.solicitado_em::date, s.avaliado_em::date
FROM solicitacao_encerramento s JOIN campanha c USING (id_campanha)
ORDER BY s.solicitado_em;

-- ============================================================================
-- GRUPO AQ (03-10-2026) - motor do score fechado, tela do score e termo de
-- pesquisador v3
-- PARE O NEST ANTES DE COLAR: o passo 7 desliga por um instante duas regras
-- (prazo da campanha e alvo da denúncia) para criar a campanha de
-- demonstração do Vinícius. Depois, ligue o Nest de novo.
-- Idempotente (pode colar de novo). Encontra tudo pelo nome, título ou e-mail.
-- ============================================================================
SET TIME ZONE 'America/Sao_Paulo';

-- 1. Cada subitem vale a sua parte da dimensão (peso dele / soma dos subitens ativos).
-- fn_fator_subitem: a parte de um subitem na sua dimensão (peso dele / soma dos subitens ativos); 0 quando desativado.
CREATE OR REPLACE FUNCTION public.fn_fator_subitem(p_id_pai INT, p_nome TEXT)
RETURNS DECIMAL LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(
        (SELECT peso FROM score_config WHERE id_pai = p_id_pai AND nome = p_nome AND ativo = TRUE)
        / NULLIF((SELECT SUM(peso) FROM score_config WHERE id_pai = p_id_pai AND ativo = TRUE), 0),
        0);
$$;

-- 2. As quatro dimensões: histórico sem penalidade fixa de abandono; reputação em duas partes (perfil e campanhas).
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

    SELECT count(*) INTO v_campanhas
    FROM denuncia d JOIN campanha c ON c.id_campanha = d.id_campanha_alvo
    WHERE c.id_usuario = p_id_usuario AND d.status = 'resolvida';

    RETURN ROUND(v_peso_raiz * (
          public.fn_fator_subitem(v_id_pai, 'denuncias_perfil')   * GREATEST(0, 1 - v_perfil / v_para_zerar)
        + public.fn_fator_subitem(v_id_pai, 'denuncias_campanha') * GREATEST(0, 1 - v_campanhas / v_para_zerar)
    ))::INTEGER;
END;
$$;

-- 3. Denúncia contra campanha também recalcula o dono; denúncia pendente não recalcula ninguém.
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

-- 4. Travas da tela do score: peso negativo (90030), dimensão sem subitem ativo (90031), soma 100 (90017).
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

-- 5. Mudar uma faixa recalcula o rótulo de todo mundo.
DROP TRIGGER IF EXISTS trg_score_rotulo_recalcula_todos ON score_rotulo;
CREATE TRIGGER trg_score_rotulo_recalcula_todos
    AFTER INSERT OR UPDATE OR DELETE ON score_rotulo
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trg_recalcular_por_score_config();

-- 6. Dados do motor: os dois subitens novos da reputação, a chave de "zerar em N" e saem as chaves antigas.
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'denuncias_perfil', 'Sem denúncias procedentes contra o perfil', 10, id_score_config
FROM score_config WHERE nome = 'reputacao_comunidade' AND id_pai IS NULL
  AND NOT EXISTS (SELECT 1 FROM score_config WHERE nome = 'denuncias_perfil');
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'denuncias_campanha', 'Sem denúncias procedentes contra as campanhas', 15, id_score_config
FROM score_config WHERE nome = 'reputacao_comunidade' AND id_pai IS NULL
  AND NOT EXISTS (SELECT 1 FROM score_config WHERE nome = 'denuncias_campanha');
DELETE FROM score_config WHERE nome IN ('volume_denuncias', 'gravidade_denuncias');

INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica)
VALUES (NULL, 'score_denuncias_para_zerar', '3', 'inteiro', 'Nº de denúncias procedentes que zeram uma parte da reputação (contra o perfil ou contra as campanhas)', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;
DELETE FROM configuracoes WHERE id_usuario IS NULL AND chave IN ('score_penalidade_abandono', 'score_penalidade_sem_justificativa');

DROP FUNCTION IF EXISTS public.fn_peso_score(INT, TEXT);

-- Permissões: a tela edita só peso e ativo dos itens e o texto e os limites das faixas.
REVOKE EXECUTE ON FUNCTION public.fn_fator_subitem(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_fator_subitem(INT, TEXT) TO app_nestjs;
REVOKE UPDATE ON score_config, score_rotulo FROM app_nestjs;
GRANT UPDATE (peso, ativo) ON score_config TO app_nestjs;
GRANT UPDATE (rotulo, descricao, score_minimo, score_maximo) ON score_rotulo TO app_nestjs;

-- Termo de pesquisador v3: a seção 4 explica o cálculo. Versão nova, a v2 fica no histórico.
UPDATE termos_de_uso SET ativo = FALSE
WHERE tipo = 'upgrade_pesquisador' AND ativo = TRUE AND versao <> 'v3-2026-10-03';
INSERT INTO termos_de_uso (tipo, versao, conteudo, ativo, criado_em) VALUES
('upgrade_pesquisador', 'v3-2026-10-03', 'TERMOS DE UPGRADE DE PERFIL DE PESQUISADOR - CROWDACADÊMICO

1. OBJETO
Este termo é exibido no momento em que um usuário comum solicita o upgrade de sua conta para perfil de pesquisador, complementando os Termos de Uso gerais aceitos no cadastro.

2. RESPONSABILIDADE PELAS INFORMAÇÕES DECLARADAS
Ao solicitar o upgrade, o usuário declara que o CPF, o vínculo institucional (quando aplicável) e o título acadêmico informados são verdadeiros. Informações falsas podem levar à suspensão do perfil de pesquisador e das campanhas vinculadas a ele.

3. RESPONSABILIDADES DO PERFIL DE PESQUISADOR
O perfil de pesquisador autoriza submeter e gerenciar campanhas de financiamento coletivo. O pesquisador é responsável pela veracidade das informações de cada campanha, pela execução do projeto descrito e pela prestação de contas aos apoiadores, conforme as regras de moderação da plataforma.

4. PONTUAÇÃO E REPUTAÇÃO
4.1. O perfil de pesquisador recebe uma pontuação (score) de 0 a 100, calculada automaticamente pela plataforma e exibida publicamente junto com uma faixa de reputação.
4.2. A pontuação considera quatro dimensões: (a) o perfil acadêmico declarado (links acadêmicos, vínculo institucional e título); (b) o histórico na plataforma (campanhas concluídas com sucesso e campanhas aprovadas pela moderação); (c) a regularidade das atualizações publicadas nas campanhas; e (d) a reputação na comunidade, que diminui com denúncias julgadas procedentes pela moderação, tanto contra o perfil quanto contra as campanhas do pesquisador.
4.3. Denúncias pendentes, em análise ou julgadas improcedentes não afetam a pontuação. A campanha encerrada pelo próprio pesquisador antes do prazo, sem nenhuma contribuição confirmada, não entra no histórico.
4.4. Os pesos de cada dimensão e as faixas de reputação são definidos pela administração da plataforma e podem ser ajustados. A pontuação é recalculada sempre que os dados do pesquisador ou esses pesos mudam.
4.5. A pontuação não impede a criação de campanhas: uma pontuação baixa apenas sinaliza à moderação que a campanha merece uma revisão mais cuidadosa.
4.6. O pesquisador pode pedir a revisão de uma pontuação que considere incorreta pelo canal de suporte da plataforma, conforme o artigo 20 da Lei 13.709/2018 (LGPD).

5. DADOS PESSOAIS (LGPD)
O CPF é armazenado de forma cifrada e nunca exibido publicamente em sua forma completa, conforme a Lei 13.709/2018 (LGPD). O vínculo institucional e o título acadêmico são exibidos publicamente no perfil, por serem informações de natureza profissional/acadêmica relevantes para os apoiadores.

6. ALTERAÇÕES DESTE TERMO
Este termo pode ser atualizado periodicamente; a versão vigente no momento da solicitação do upgrade é a que se aplica.', TRUE, '2026-10-03 00:00:00')
ON CONFLICT (tipo, versao) DO NOTHING;

-- 7. Demonstração: a campanha do Vinícius, encerrada por moderação depois de 3 denúncias procedentes. É o que o
-- mantém na faixa "Atenção" no modelo novo.
ALTER TABLE campanha DISABLE TRIGGER trg_campanha_valida_prazo_negocio;
INSERT INTO campanha (id_usuario, id_admin, id_area_conhecimento, titulo, modelo, meta_financeira, taxa_plataforma, descricao, data_inicio, data_fim, status, aprovado_em, criado_em, encerrado_em)
SELECT (SELECT id_usuario FROM usuario WHERE email = 'vinicius.ferraz@ufc.br'), (SELECT id_usuario FROM usuario WHERE email = 'admin@crowdacademico.com.br'),
       (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '7.08.00.00'),
       'Avaliação de Programa de Reforço Escolar em Escolas Públicas de Fortaleza', 'flexivel', 18000.00, 5.00,
       'Avaliação do impacto de um programa de reforço escolar em matemática nas escolas municipais de Fortaleza.',
       '2024-07-01 00:00:00', '2024-08-15 23:59:59', 'encerrado_moderacao', '2024-06-28 10:00:00', '2024-06-20 09:00:00', '2024-07-20 15:00:00'
WHERE EXISTS (SELECT 1 FROM usuario WHERE email = 'vinicius.ferraz@ufc.br')
  AND NOT EXISTS (SELECT 1 FROM campanha WHERE titulo = 'Avaliação de Programa de Reforço Escolar em Escolas Públicas de Fortaleza');
ALTER TABLE campanha ENABLE TRIGGER trg_campanha_valida_prazo_negocio;

ALTER TABLE denuncia DISABLE TRIGGER trg_denuncia_valida_alvo;
INSERT INTO denuncia (id_usuario, id_campanha_alvo, id_motivo, relato, status, justificativa_moderacao, criado_em)
SELECT u.id_usuario, (SELECT id_campanha FROM campanha WHERE titulo = 'Avaliação de Programa de Reforço Escolar em Escolas Públicas de Fortaleza'), md.id_motivo, NULL, 'resolvida', v.justificativa, v.criado_em::timestamptz
FROM (VALUES
    ('carlos.melo@unicamp.br', 'Campanha com informações falsas ou enganosas', 'As escolas citadas não confirmaram nenhuma parceria.', '2024-07-10 09:00:00'),
    ('juliana.ferreira@ufsc.br', 'Campanha sem viabilidade metodológica', 'Não há autorização da secretaria de educação para a coleta.', '2024-07-12 10:00:00'),
    ('bruno.tavares@ufrgs.br', 'Campanha com informações falsas ou enganosas', 'Fraude confirmada; campanha encerrada por moderação.', '2024-07-20 14:00:00')
) AS v(email, motivo, justificativa, criado_em)
JOIN usuario u ON u.email = v.email
JOIN motivo_denuncia md ON md.descricao = v.motivo
WHERE (SELECT id_campanha FROM campanha WHERE titulo = 'Avaliação de Programa de Reforço Escolar em Escolas Públicas de Fortaleza') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM denuncia d WHERE d.id_usuario = u.id_usuario AND d.id_campanha_alvo = (SELECT id_campanha FROM campanha WHERE titulo = 'Avaliação de Programa de Reforço Escolar em Escolas Públicas de Fortaleza'));
ALTER TABLE denuncia ENABLE TRIGGER trg_denuncia_valida_alvo;

SELECT public.recalcular_todos_os_scores();

RESET TIME ZONE;

-- Conferência: Bruno 100 (Referência), Renata 60 (Confiável), Eduardo 47 (Em Construção), Vinícius 20 (Atenção).
SELECT u.nome, pp.score_atual, r.rotulo
FROM perfil_pesquisador pp
JOIN usuario u USING (id_usuario)
LEFT JOIN score_rotulo r ON pp.score_atual BETWEEN r.score_minimo AND r.score_maximo AND r.ativo
WHERE u.email IN ('bruno.tavares@ufrgs.br', 'renata.vasconcelos@ufpr.br', 'eduardo.barbosa@ufba.br', 'vinicius.ferraz@ufc.br')
ORDER BY pp.score_atual DESC;

-- ============================================================================
-- GRUPO AR (03-10-2026) - re-aceite do termo de pesquisador (RF-015)
-- Quem é pesquisador e não aceitou a versão vigente do termo de pesquisador
-- (a v3) cai na tela de aceite no próximo login, depois do termo da conta.
-- Não precisa parar o Nest. Idempotente (pode colar de novo).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_termo_uso_pendente(p_id_usuario INT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT t.id_termo
    FROM termos_de_uso t
    WHERE t.ativo
      AND (t.tipo = 'cadastro'
           OR EXISTS (SELECT 1 FROM perfil_pesquisador pp WHERE pp.id_usuario = p_id_usuario))
      AND NOT EXISTS (
          SELECT 1 FROM usuario_termo ut
          WHERE ut.id_usuario = p_id_usuario AND ut.id_termo = t.id_termo
      )
    ORDER BY t.tipo = 'cadastro' DESC
    LIMIT 1;
$$;

-- ============================================================================
-- GRUPO AS (03-10-2026) - contestação do score (RF-033) na própria denúncia
-- PARE O NEST ANTES DE COLAR: o grupo acrescenta colunas na tabela de denúncia.
-- Depois, ligue o Nest de novo.
-- Idempotente (pode colar de novo). Encontra as contas pelo e-mail.
-- ============================================================================
SET TIME ZONE 'America/Sao_Paulo';

-- 1. A situação da contestação e as 4 colunas na denúncia (1 para 1: no máximo uma contestação por denúncia).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_contestacao') THEN
        CREATE TYPE status_contestacao AS ENUM ('pendente', 'aceita', 'recusada');
    END IF;
END $$;

ALTER TABLE denuncia ADD COLUMN IF NOT EXISTS contestacao TEXT;
ALTER TABLE denuncia ADD COLUMN IF NOT EXISTS contestacao_status status_contestacao;
ALTER TABLE denuncia ADD COLUMN IF NOT EXISTS contestada_em TIMESTAMPTZ;
ALTER TABLE denuncia ADD COLUMN IF NOT EXISTS justificativa_contestacao TEXT;

ALTER TABLE denuncia DROP CONSTRAINT IF EXISTS "CK_DENUNCIA_CONTESTACAO_COERENTE";
ALTER TABLE denuncia ADD CONSTRAINT "CK_DENUNCIA_CONTESTACAO_COERENTE" CHECK (
        (contestacao IS NULL AND contestacao_status IS NULL AND contestada_em IS NULL AND justificativa_contestacao IS NULL)
        OR (contestacao IS NOT NULL AND contestacao_status IS NOT NULL AND contestada_em IS NOT NULL
            AND (contestacao_status = 'pendente') = (justificativa_contestacao IS NULL))
    );
ALTER TABLE denuncia DROP CONSTRAINT IF EXISTS "CK_DENUNCIA_CONTESTACAO_TAMANHO";
ALTER TABLE denuncia ADD CONSTRAINT "CK_DENUNCIA_CONTESTACAO_TAMANHO" CHECK (contestacao IS NULL OR char_length(contestacao) <= 5000);
ALTER TABLE denuncia DROP CONSTRAINT IF EXISTS "CK_DENUNCIA_JUST_CONTESTACAO_TAMANHO";
ALTER TABLE denuncia ADD CONSTRAINT "CK_DENUNCIA_JUST_CONTESTACAO_TAMANHO" CHECK (justificativa_contestacao IS NULL OR char_length(justificativa_contestacao) <= 5000);

-- 2. Contestar, decidir e a lista do pesquisador (sem quem denunciou).
CREATE OR REPLACE FUNCTION public.contestar_denuncia(p_id_denuncia INT, p_texto TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_penalizado  INT;
    v_status      status_denuncia;
    v_contestacao status_contestacao;
BEGIN
    SELECT COALESCE(d.id_pesquisador_alvo, c.id_usuario), d.status, d.contestacao_status
    INTO v_penalizado, v_status, v_contestacao
    FROM denuncia d LEFT JOIN campanha c ON c.id_campanha = d.id_campanha_alvo
    WHERE d.id_denuncia = p_id_denuncia;
    IF v_penalizado IS DISTINCT FROM public.id_usuario_atual() THEN
        RAISE EXCEPTION 'Só o pesquisador penalizado por esta denúncia pode contestá-la.' USING ERRCODE = '92034';
    END IF;
    IF p_texto IS NULL OR btrim(p_texto) = '' THEN
        RAISE EXCEPTION 'Escreva por que a penalidade é injusta.' USING ERRCODE = '90032';
    END IF;
    IF v_contestacao IS NOT NULL THEN
        RAISE EXCEPTION 'Esta denúncia já foi contestada.' USING ERRCODE = '91045';
    END IF;
    IF v_status IS DISTINCT FROM 'resolvida' THEN
        RAISE EXCEPTION 'Só uma denúncia julgada procedente pode ser contestada.' USING ERRCODE = '91044';
    END IF;
    IF EXISTS (
        SELECT 1 FROM denuncia d LEFT JOIN campanha c ON c.id_campanha = d.id_campanha_alvo
        WHERE COALESCE(d.id_pesquisador_alvo, c.id_usuario) = v_penalizado AND d.contestacao_status = 'pendente'
    ) THEN
        RAISE EXCEPTION 'Você já tem uma contestação esperando análise.' USING ERRCODE = '91046';
    END IF;

    UPDATE denuncia
    SET contestacao = btrim(p_texto), contestacao_status = 'pendente', contestada_em = NOW()
    WHERE id_denuncia = p_id_denuncia;
END;
$$;

CREATE OR REPLACE FUNCTION public.decidir_contestacao(p_id_denuncia INT, p_aceitar BOOLEAN, p_justificativa TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_denunciante INT;
    v_contestacao status_contestacao;
BEGIN
    IF NOT public.tem_permissao('denuncia_responder') THEN
        RAISE EXCEPTION 'Sem permissão para decidir contestações.' USING ERRCODE = '92035';
    END IF;
    SELECT id_usuario, contestacao_status INTO v_denunciante, v_contestacao FROM denuncia WHERE id_denuncia = p_id_denuncia;
    IF v_contestacao IS DISTINCT FROM 'pendente' THEN
        RAISE EXCEPTION 'Só uma contestação esperando análise pode ser decidida.' USING ERRCODE = '91047';
    END IF;
    IF v_denunciante = public.id_usuario_atual() THEN
        RAISE EXCEPTION 'Quem registrou a denúncia não pode julgar a própria denúncia.' USING ERRCODE = '92006';
    END IF;
    IF p_justificativa IS NULL OR btrim(p_justificativa) = '' THEN
        RAISE EXCEPTION 'Escreva a justificativa da decisão.' USING ERRCODE = '90033';
    END IF;

    UPDATE denuncia
    SET contestacao_status = CASE WHEN p_aceitar THEN 'aceita' ELSE 'recusada' END::status_contestacao,
        justificativa_contestacao = btrim(p_justificativa),
        status = CASE WHEN p_aceitar THEN 'improcedente'::status_denuncia ELSE status END
    WHERE id_denuncia = p_id_denuncia;
END;
$$;

CREATE OR REPLACE FUNCTION public.denuncias_contra_mim()
RETURNS TABLE (
    id_denuncia INT, id_campanha_alvo INT, titulo_campanha VARCHAR, motivo VARCHAR, status status_denuncia,
    justificativa_moderacao TEXT, criado_em TIMESTAMPTZ, contestacao TEXT, contestacao_status status_contestacao,
    contestada_em TIMESTAMPTZ, justificativa_contestacao TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT d.id_denuncia, d.id_campanha_alvo, c.titulo, m.descricao, d.status, d.justificativa_moderacao, d.criado_em,
           d.contestacao, d.contestacao_status, d.contestada_em, d.justificativa_contestacao
    FROM denuncia d
    JOIN motivo_denuncia m ON m.id_motivo = d.id_motivo
    LEFT JOIN campanha c ON c.id_campanha = d.id_campanha_alvo
    WHERE COALESCE(d.id_pesquisador_alvo, c.id_usuario) = public.id_usuario_atual()
      AND (d.status = 'resolvida' OR d.contestacao_status IS NOT NULL)
    ORDER BY d.criado_em DESC;
$$;

-- 3. Com uma contestação esperando, a denúncia só muda pela decisão dela; a decisão entra no log de auditoria.
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

DROP TRIGGER IF EXISTS trg_log_auditoria_denuncia_contestacao ON denuncia;
CREATE TRIGGER trg_log_auditoria_denuncia_contestacao
AFTER UPDATE ON denuncia
FOR EACH ROW
WHEN (OLD.contestacao_status IS DISTINCT FROM NEW.contestacao_status)
EXECUTE FUNCTION public.fn_log_auditoria('id_denuncia');

-- 4. Permissões: quem denuncia grava só autor, alvo, motivo e relato; a contestação só pelas funções.
REVOKE INSERT ON denuncia FROM app_nestjs;
GRANT INSERT (id_usuario, id_campanha_alvo, id_pesquisador_alvo, id_motivo, relato) ON denuncia TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.contestar_denuncia(INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contestar_denuncia(INT, TEXT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.decidir_contestacao(INT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decidir_contestacao(INT, BOOLEAN, TEXT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.denuncias_contra_mim() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.denuncias_contra_mim() TO app_nestjs;

-- 5. Demonstração: o Eduardo contesta a denúncia dele e espera a análise; o Vinícius contestou uma e foi recusado.
UPDATE denuncia SET
    contestacao = 'O título de mestre foi emitido pela UFBA em 2022; anexei o diploma ao perfil. Peço a revisão.',
    contestacao_status = 'pendente', contestada_em = NOW() - INTERVAL '1 day'
WHERE id_pesquisador_alvo = (SELECT id_usuario FROM usuario WHERE email = 'eduardo.barbosa@ufba.br') AND status = 'resolvida' AND contestacao IS NULL;
UPDATE denuncia SET
    contestacao = 'O vínculo com a universidade existe; trabalho como pesquisador voluntário.',
    contestacao_status = 'recusada', contestada_em = '2024-06-05 10:00:00',
    justificativa_contestacao = 'A universidade confirmou por escrito que não há vínculo de nenhum tipo.'
WHERE id_pesquisador_alvo = (SELECT id_usuario FROM usuario WHERE email = 'vinicius.ferraz@ufc.br') AND id_usuario = (SELECT id_usuario FROM usuario WHERE email = 'ana.santos@usp.br')
  AND status = 'resolvida' AND contestacao IS NULL;

RESET TIME ZONE;
