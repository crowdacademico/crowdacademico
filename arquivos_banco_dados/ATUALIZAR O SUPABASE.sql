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
-- GRUPO Z (29-09-2026) - decisões 1A e 2A e o passo 4 da super auditoria. IDEMPOTENTE (pode colar de novo).
-- (O Grupo Y já foi colado em 29-09-2026 e saiu deste arquivo.)
-- ⚠️ PARE O NEST ANTES DE COLAR: tem ALTER TABLE (as FKs de aceite do Termo), que trava com o Nest rodando.
--
-- O que muda:
--   1. Suspender ou excluir uma conta encerra as sessões abertas dela (antes a conta suspensa continuava usando o
--      sistema pela renovação automática, por até 30 dias).
--   2. RF-091: versão do Termo já aceita não pode ser excluída nem ter o texto alterado; os aceites não são mais
--      apagados em cascata junto com a versão.
--   3. RF-022: link novo ou editado precisa ser do domínio do tipo (Lattes em lattes.cnpq.br...) e seguir o
--      formato do tipo. Links que já existem não são tocados.
--   4. RF-015: função que diz se a conta tem aceite pendente da versão vigente do Termo de Uso.
--      ATENÇÃO: nenhuma conta do Supabase aceitou a versão vigente (v4), então TODAS vão ver a tela de aceite uma
--      vez, no próximo acesso depois do Nest novo. É o que o RF-015 pede.
-- ============================================================================

-- 1. Sessões encerradas ao suspender e ao excluir

CREATE OR REPLACE FUNCTION public.suspender_usuario(p_id_usuario INT, p_ate TIMESTAMPTZ, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('usuario_suspender') THEN
        RAISE EXCEPTION 'Sem permissão para suspender usuário.' USING ERRCODE = '92020';
    END IF;
    IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
        RAISE EXCEPTION 'Motivo da suspensão é obrigatório.' USING ERRCODE = '90020';
    END IF;
    IF p_ate IS NULL OR p_ate <= NOW() THEN
        RAISE EXCEPTION 'A data final da suspensão precisa estar no futuro.' USING ERRCODE = '90023';
    END IF;
    IF p_id_usuario = public.id_usuario_atual() THEN
        RAISE EXCEPTION 'Você não pode suspender a sua própria conta.' USING ERRCODE = '92027';
    END IF;
    IF public.fn_eh_ultimo_admin_ativo(p_id_usuario) THEN
        RAISE EXCEPTION 'Não é possível suspender o último administrador ativo do sistema.' USING ERRCODE = '91030';
    END IF;

    UPDATE usuario
    SET suspenso_ate = p_ate,
        motivo_suspensao = p_motivo,
        suspenso_por = public.id_usuario_atual()
    WHERE id_usuario = p_id_usuario;

    -- Quem já estava logado sai na hora: sem isto, a renovação automática mantinha a conta suspensa usando o
    -- sistema enquanto a aba ficasse aberta (o token de acesso, de 15 min, é o único resto aceito).
    UPDATE sessao SET revogado_em = NOW()
    WHERE id_usuario = p_id_usuario AND revogado_em IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.excluir_conta_usuario(p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_imagem_perfil INT;
BEGIN
    IF NOT (p_id_usuario = public.id_usuario_atual() OR public.tem_permissao('usuario_excluir')) THEN
        RAISE EXCEPTION 'Sem permissão para excluir a conta de outro usuário.' USING ERRCODE = '92013';
    END IF;
    IF public.fn_eh_ultimo_admin_ativo(p_id_usuario) THEN
        RAISE EXCEPTION 'Não é possível excluir a conta do último administrador ativo do sistema.' USING ERRCODE = '91030';
    END IF;
    IF EXISTS (SELECT 1 FROM campanha WHERE id_usuario = p_id_usuario AND status = 'ativo') THEN
        RAISE EXCEPTION 'Não é possível excluir a conta enquanto houver campanha ativa. A exclusão fica liberada quando a campanha terminar.'
            USING ERRCODE = '91031';
    END IF;

    SELECT id_imagem_perfil INTO v_id_imagem_perfil
    FROM usuario WHERE id_usuario = p_id_usuario;

    UPDATE usuario
    SET deletado = TRUE, deletado_em = NOW(), deletado_por = public.id_usuario_atual()
    WHERE id_usuario = p_id_usuario;

    -- Conta excluída não renova mais nenhuma sessão (mesmo motivo de suspender_usuario).
    UPDATE sessao SET revogado_em = NOW()
    WHERE id_usuario = p_id_usuario AND revogado_em IS NULL;

    DELETE FROM campanha c
    WHERE c.id_usuario = p_id_usuario
      AND (c.status = 'rascunho'
           OR (c.status = 'aguardando_aprovacao'
               AND NOT EXISTS (SELECT 1 FROM historico_rejeicao h WHERE h.id_campanha = c.id_campanha)));

    -- A volta a 'rejeitado' pede linha em historico_rejeicao na mesma transação (trg_campanha_exige_historico_rejeicao,
    -- 05); id_admin NULL porque ninguém da moderação rejeitou.
    WITH devolvidas AS (
        UPDATE campanha SET status = 'rejeitado'
        WHERE id_usuario = p_id_usuario AND status = 'aguardando_aprovacao'
        RETURNING id_campanha, id_usuario, titulo
    )
    INSERT INTO historico_rejeicao (id_campanha, id_usuario_dono, titulo_campanha, id_admin, justificativa)
    SELECT id_campanha, id_usuario, titulo, NULL,
           'Reenvio cancelado: o pesquisador excluiu a própria conta.'
    FROM devolvidas;

    -- Desativa a foto de
    -- perfil vinculada na mesma transação - sem isto, a linha em `arquivo`
    -- ficava ativo=true pra sempre, mesmo com a conta dona já excluída.
    -- SECURITY DEFINER bypassa pol_arquivo_update DE PROPÓSITO aqui: quem
    -- executou a exclusão da conta já foi autorizado acima (dono OU
    -- 'usuario_excluir') - não faz sentido também exigir 'arquivo_gerenciar'
    -- ou posse sobre o arquivo em si só pra essa consequência automática.
    -- Os BYTES de verdade no bucket NÃO são apagados aqui - Postgres não
    -- fala com o provedor de armazenamento (B2/R2/Supabase Storage). Isso é
    -- feito depois, do lado da aplicação (ver
    -- nest/src/1-usuario/service/usuario.service.remove.ts), que lê
    -- `arquivo.chave` (ainda intacta, só `ativo` mudou) e chama
    -- armazenamento.excluirObjeto().
    IF v_id_imagem_perfil IS NOT NULL THEN
        UPDATE arquivo
        SET ativo = FALSE, desativado_em = NOW()
        WHERE id_arquivo = v_id_imagem_perfil;
    END IF;
END;
$$;

-- 2. RF-091: aceite não some mais junto com a versão; a versão aceita fica protegida
ALTER TABLE usuario_termo DROP CONSTRAINT IF EXISTS "FK_USUARIO_TERMO_TERMO";
ALTER TABLE usuario_termo ADD CONSTRAINT "FK_USUARIO_TERMO_TERMO" FOREIGN KEY (id_termo) REFERENCES termos_de_uso(id_termo);
ALTER TABLE aceite_termo_contribuicao DROP CONSTRAINT IF EXISTS "FK_ACEITE_TERMO_CONTRIBUICAO_TERMO";
ALTER TABLE aceite_termo_contribuicao ADD CONSTRAINT "FK_ACEITE_TERMO_CONTRIBUICAO_TERMO" FOREIGN KEY (id_termo) REFERENCES termos_de_uso(id_termo);

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

-- 3. RF-022: domínio e formato do link

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
        RAISE EXCEPTION 'Este tipo de link não é permitido para %', TG_TABLE_NAME
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

-- 4. RF-015: aceite pendente

CREATE OR REPLACE FUNCTION public.fn_termo_uso_pendente(p_id_usuario INT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT t.id_termo
    FROM termos_de_uso t
    WHERE t.tipo = 'cadastro' AND t.ativo
      AND NOT EXISTS (
          SELECT 1 FROM usuario_termo ut
          WHERE ut.id_usuario = p_id_usuario AND ut.id_termo = t.id_termo
      );
$$;

REVOKE EXECUTE ON FUNCTION public.fn_termo_uso_pendente(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_termo_uso_pendente(INT) TO app_nestjs;
