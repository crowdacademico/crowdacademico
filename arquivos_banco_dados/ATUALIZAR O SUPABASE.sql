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
