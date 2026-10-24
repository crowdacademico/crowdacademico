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
-- GRUPO BO (24-10-2026) - Encerramento antecipado, visitante só com Pix e e-mail do repasse. IDEMPOTENTE (pode colar de novo).
-- PARE O NEST antes de colar: o grupo cria um gatilho na tabela repasse, e isso pede uma trava que pode esperar para
-- sempre (ou dar deadlock) com o Nest e as tarefas automáticas usando a tabela.
--
-- O que muda:
--   1. "Cancelar o projeto" (encerrar_campanha_sem_contribuicao): o pesquisador só encerra sozinho sem contribuição
--      pendente (de qualquer meio) nem confirmada (91043). Antes, só barrava Pix pendente ainda válido.
--   2. Pedido de encerramento ao administrador (fn_valida_solicitacao_encerramento): vale em qualquer modelo. O
--      tudo-ou-nada sem a meta deixa de ser recusado (o 91051 sai) e, aprovado, devolve tudo.
--   3. Quem contribui sem conta só usa Pix, em qualquer modelo (validar_contribuicao_all_or_nothing, 90007).
--   4. E-mail "repasse_previsto" ao dono da campanha a cada repasse criado (função e gatilho novos).
-- Os dados que já estão no banco não mudam. No banco de demonstração, a campanha 15 continua como "projeto cancelado
-- pela pesquisadora" até o banco ser recriado com o 07 novo (lá ela passa a ser um pedido aprovado pelo administrador).
-- ============================================================================

-- encerrar_campanha_sem_contribuicao: "cancelar o projeto". O dono encerra direto uma campanha ativa, sem passar pelo
-- administrador, só quando não há dinheiro em jogo: nenhuma contribuição pendente (de qualquer meio) nem confirmada
-- (91043). Pix vencido, pagamento com erro ou contribuição já devolvida não contam. Com qualquer contribuição em jogo,
-- o caminho é o pedido ao administrador. Registra o encerramento como um pedido já aprovado e sem admin (id_admin
-- vazio = encerrado pelo próprio pesquisador), com a justificativa dele. SECURITY DEFINER: o app_nestjs só insere a
-- justificativa (GRANT por coluna, 06); fn_valida_transicao_campanha (05) só deixa o dono encerrar com esse pedido.
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
    IF EXISTS (
        SELECT 1 FROM contribuicao
        WHERE id_campanha = p_id_campanha AND status IN ('pendente', 'confirmado')
    ) THEN
        RAISE EXCEPTION 'Esta campanha já tem contribuição paga ou a caminho. Para encerrar, envie o pedido ao administrador.'
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

-- ----------------------------------------------------------------------------
-- Função:     fn_valida_solicitacao_encerramento
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Pedido de encerramento só de campanha ativa (91038) e sempre com justificativa (90028). Vale para qualquer
--             modelo: aprovado, o dinheiro vai para onde destino_dinheiro_campanha() manda (flexível ou tudo-ou-nada com
--             a meta batida, repasse; tudo-ou-nada sem a meta, devolução). Um pendente por vez é o índice
--             uq_solicitacao_encerramento_pendente (02). SECURITY DEFINER: lê a campanha sem depender do que a RLS mostra.
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
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     validar_contribuicao_all_or_nothing
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Campanhas all-or-nothing aceitam apenas contribuições via PIX
--             (nenhum outro meio de pagamento é permitido nesse modelo). Quem contribui
--             sem conta (id_usuario vazio) também só usa PIX, em qualquer modelo: cartão e
--             boleto ficam para quem tem conta, pela facilidade de devolver e acompanhar.
--             As duas recusas usam 90007.
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

    IF NEW.id_usuario IS NULL AND NEW.meio_pagamento <> 'pix' THEN
        RAISE EXCEPTION 'Sem conta, a contribuição só pode ser feita com Pix. Entre na sua conta para usar cartão ou boleto.'
            USING ERRCODE = '90007';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     fn_notifica_repasse_previsto (trigger)
-- Bloco:      [05-Q]
-- Regra:      Repasse criado (RF-026): o dono da campanha recebe o aviso com o valor líquido, a data prevista (a criação
--             do repasse mais repasse_carencia_dias, a mesma conta da fila do repasse) e o lembrete de conferir a chave
--             Pix. tem_chave_verificada diz se ele já tem chave com titularidade conferida: sem ela, o repasse espera.
--             Vale para o repasse do encerramento e para o da parte do cartão liberada depois.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notifica_repasse_previsto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dono   INT;
    v_titulo VARCHAR;
BEGIN
    SELECT c.id_usuario, c.titulo INTO v_dono, v_titulo FROM campanha c WHERE c.id_campanha = NEW.id_campanha;
    PERFORM public.enfileirar_notificacao(v_dono, 'repasse_previsto',
        jsonb_build_object('id_campanha', NEW.id_campanha, 'titulo', v_titulo, 'valor', NEW.valor_liquido,
                           'data_prevista', NEW.criado_em + public.config_numero('repasse_carencia_dias', 15) * INTERVAL '1 day',
                           'tem_chave_verificada', EXISTS (
                               SELECT 1 FROM perfil_pesquisador pp
                               WHERE pp.id_usuario = v_dono AND pp.chave_pix_verificada_em IS NOT NULL)));
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifica_repasse_previsto ON repasse;
CREATE TRIGGER trg_notifica_repasse_previsto
AFTER INSERT ON repasse
FOR EACH ROW EXECUTE FUNCTION public.fn_notifica_repasse_previsto();
