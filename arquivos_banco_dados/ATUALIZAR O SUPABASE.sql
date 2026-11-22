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
-- GRUPO DK (21-11-2026) - Correção do GRUPO DJ: a moderação devolve ao ar um comentário bloqueado. IDEMPOTENTE.
-- Não precisa parar o Nest.
--
-- O que muda: em fn_comentario_bloqueio, as duas regras estavam na ordem errada. Quando a moderação devolvia ao ar
-- um comentário bloqueado, a regra "bloqueado fica fora do ar" vinha antes e desfazia a volta, sem erro nenhum.
-- Agora voltar ao ar tira o bloqueio primeiro.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_comentario_bloqueio()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.bloqueado := FALSE;
        IF EXISTS (
            SELECT 1 FROM comentario
            WHERE id_campanha = NEW.id_campanha AND id_pesquisador = NEW.id_pesquisador AND bloqueado
        ) THEN
            RAISE EXCEPTION 'O dono desta campanha bloqueou novos comentários seus nela.'
                USING ERRCODE = '91065';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.bloqueado IS DISTINCT FROM OLD.bloqueado
       AND NOT public.tem_permissao('comentario_moderar')
       AND NOT EXISTS (
           SELECT 1 FROM campanha WHERE id_campanha = NEW.id_campanha AND id_usuario = public.id_usuario_atual()
       ) THEN
        RAISE EXCEPTION 'Só o dono da campanha ou a moderação bloqueia ou desbloqueia o autor de um comentário.'
            USING ERRCODE = '92046';
    END IF;

    -- Nesta ordem: voltar ao ar (só a moderação chega aqui) tira o bloqueio primeiro; ao contrário, o "bloqueado sempre
    -- fica fora do ar" desfazia a volta sem erro nenhum (achado no teste 29, 21-11-2026).
    IF NEW.ativo AND NOT OLD.ativo THEN
        NEW.bloqueado := FALSE;
    END IF;
    IF NEW.bloqueado THEN
        NEW.ativo := FALSE;
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================================
-- GRUPO DL (21-11-2026) - Prazo de guarda das sessões (6 meses). IDEMPOTENTE.
-- Cole ANTES de subir o Nest novo (o job diário passa a chamar a função nova).
--
-- O que muda:
--   1. Parâmetro sessao_retencao_dias (180). 0 = guardar para sempre.
--   2. limpar_sessoes_antigas(): o job diário das 3h apaga as sessões (login e renovação) que terminaram há mais de
--      6 meses. Antes a tabela crescia para sempre. Sessão válida nunca sai.
--   3. A exportação de dados (Minha Conta) mostra os logins que sobram, com o prazo explicado.
-- ============================================================================
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'sessao_retencao_dias',  '180', 'inteiro', 'Dias que as sessões já encerradas (login e renovação) são guardadas antes de serem apagadas por job diário (0 = guardar para sempre). 180 = os 6 meses de registro de acesso do Marco Civil da Internet (art. 15)', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Função:     limpar_sessoes_antigas
-- Assinatura: () -> INT
-- Bloco:      [05-L]
-- Regra:      Prazo de guarda das sessões (21-11-2026): apaga as sessões (login e renovação) que terminaram há mais de
--             sessao_retencao_dias (180, 6 meses; 0 ou negativo = guardar para sempre). "Terminou" é a revogação (Sair,
--             troca de senha) ou, sem ela, a expiração. Sessão ainda válida nunca sai. Por quê: a tabela crescia para
--             sempre (uma linha a cada login e a cada renovação do token), e o Marco Civil da Internet (art. 15) pede
--             guardar os registros de acesso (IP, data e hora) por 6 meses. Deixa uma linha de rastro em log_auditoria
--             quando apaga algo. SECURITY DEFINER, chamada pelo @Cron diário das 3h, sem sessão de usuário.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.limpar_sessoes_antigas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dias     INT;
    v_corte    TIMESTAMPTZ;
    v_apagadas INT;
BEGIN
    v_dias := public.config_numero('sessao_retencao_dias', 180)::INT;
    IF v_dias <= 0 THEN
        RETURN 0;
    END IF;

    v_corte := NOW() - (v_dias * INTERVAL '1 day');

    DELETE FROM sessao
    WHERE LEAST(expira_em, COALESCE(revogado_em, expira_em)) < v_corte;
    GET DIAGNOSTICS v_apagadas = ROW_COUNT;

    IF v_apagadas > 0 THEN
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_anteriores)
        VALUES ('sessao', 'anteriores a ' || to_char(v_corte, 'YYYY-MM-DD'), 'DELETE', NULL,
                jsonb_build_object('quantidade', v_apagadas, 'dias_retencao', v_dias, 'corte', v_corte));
    END IF;

    RETURN v_apagadas;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.limpar_sessoes_antigas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.limpar_sessoes_antigas() TO app_nestjs;
