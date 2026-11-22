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
-- GRUPO DO (22-11-2026) - RF-053: a atualização vira texto livre com anexos (sem fase nem formato). IDEMPOTENTE.
-- Colar LOGO DEPOIS de subir o Nest novo. Na ordem contrária, o Nest antigo lê fase e tipo e as páginas de atualização
-- quebram; nesta ordem, só criar atualização falha nos minutos entre um e outro (o banco ainda exige as colunas).
--
-- O que muda: saem as colunas fase e tipo de atualizacao_campanha e os tipos fase_atualizacao e tipo_atualizacao.
-- A fase gravada nas atualizações que já existem se perde (nada usava). A trava de edição deixa de olhar as duas.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_atualizacao_trava_edicao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id_atualizacao INT;
    v_ocultada       BOOLEAN;
    v_status         status_campanha;
BEGIN
    IF TG_TABLE_NAME = 'atualizacao_campanha' THEN
        IF NEW.titulo IS NOT DISTINCT FROM OLD.titulo AND NEW.conteudo IS NOT DISTINCT FROM OLD.conteudo THEN
            RETURN NEW;
        END IF;
        v_id_atualizacao := OLD.id_atualizacao;
    ELSIF TG_OP = 'DELETE' THEN
        v_id_atualizacao := OLD.id_atualizacao;
    ELSE
        v_id_atualizacao := NEW.id_atualizacao;
    END IF;

    SELECT a.ocultada_moderacao, c.status INTO v_ocultada, v_status
    FROM atualizacao_campanha a
    JOIN campanha c ON c.id_campanha = a.id_campanha
    WHERE a.id_atualizacao = v_id_atualizacao;

    IF FOUND THEN
        IF v_ocultada THEN
            RAISE EXCEPTION 'Esta atualização foi excluída pela moderação e não pode mais ser alterada.'
                USING ERRCODE = '91064';
        END IF;
        IF v_status NOT IN ('ativo', 'sucesso', 'nao_atingido') THEN
            RAISE EXCEPTION 'A campanha está encerrada ou fora do ar: as atualizações dela não podem mais ser alteradas.'
                USING ERRCODE = '91064';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

ALTER TABLE atualizacao_campanha DROP COLUMN IF EXISTS fase;
ALTER TABLE atualizacao_campanha DROP COLUMN IF EXISTS tipo;
DROP TYPE IF EXISTS fase_atualizacao;
DROP TYPE IF EXISTS tipo_atualizacao;
