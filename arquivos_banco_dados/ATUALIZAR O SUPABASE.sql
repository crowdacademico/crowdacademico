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
-- GRUPO Y (29-09-2026) - correções da super auditoria. IDEMPOTENTE (pode colar de novo).
-- ⚠️ PARE O NEST ANTES DE COLAR: tem ALTER TABLE (usuario_papel, comentario), que trava com o Nest rodando.
--
-- O que muda:
--   1. E-mail sempre em minúsculas (conta duplicada com maiúsculas; login com maiúsculas falhava).
--      Se já existir e-mail repetido ignorando maiúsculas, este grupo PARA na primeira linha, sem mudar nada, e
--      mostra quais são: resolva esses casos antes (fale com o Claude Code).
--   2. O último admin ativo não pode tirar o próprio papel, ser suspenso nem ter a conta excluída; ninguém suspende
--      a própria conta.
--   3. Suspensão (conta, papel e pesquisador) só com data no futuro; a de papel passa a exigir motivo (RF-118).
--   4. Excluir a própria conta: recusa com campanha ativa; rascunho e aguardando nunca avaliada somem; aguardando
--      por reenvio volta a rejeitada.
--   5. Comentário: não aceita texto só com espaços; não aceita comentário em rascunho nem aguardando aprovação.
--   6. Link acadêmico novo só para quem é pesquisador.
-- ============================================================================

-- 1. E-mail em minúsculas
DO $$
DECLARE
    v_repetidos TEXT;
BEGIN
    SELECT string_agg(e, ', ') INTO v_repetidos
    FROM (SELECT lower(btrim(email)) AS e FROM usuario GROUP BY 1 HAVING count(*) > 1) r;
    IF v_repetidos IS NOT NULL THEN
        RAISE EXCEPTION 'Grupo Y parado: estes e-mails existem em mais de uma conta (maiúsculas diferentes): %', v_repetidos;
    END IF;
END;
$$;
UPDATE usuario SET email = lower(btrim(email)) WHERE email <> lower(btrim(email));

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

-- 3. Colunas de motivo e de quem suspendeu no papel (RF-118). Suspensões de papel que já existem ganham um motivo
--    genérico, para a regra "data e motivo juntos" valer também para elas.
ALTER TABLE usuario_papel ADD COLUMN IF NOT EXISTS motivo_suspensao TEXT;
ALTER TABLE usuario_papel ADD COLUMN IF NOT EXISTS suspenso_por INT;
UPDATE usuario_papel SET motivo_suspensao = 'Suspensão registrada antes de o motivo ser obrigatório.'
WHERE suspenso_ate IS NOT NULL AND motivo_suspensao IS NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_USUARIO_PAPEL_SUSPENSO_POR') THEN
        ALTER TABLE usuario_papel ADD CONSTRAINT "FK_USUARIO_PAPEL_SUSPENSO_POR"
            FOREIGN KEY (suspenso_por) REFERENCES usuario(id_usuario);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_USUARIO_PAPEL_SUSPENSAO') THEN
        ALTER TABLE usuario_papel ADD CONSTRAINT "CK_USUARIO_PAPEL_SUSPENSAO"
            CHECK ((suspenso_ate IS NULL) = (motivo_suspensao IS NULL));
    END IF;
END;
$$;

-- 5. Comentário só com espaços. NOT VALID: vale para todo comentário novo ou editado; os antigos não são conferidos.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_COMENTARIO_CONTEUDO_NAO_VAZIO') THEN
        ALTER TABLE comentario ADD CONSTRAINT "CK_COMENTARIO_CONTEUDO_NAO_VAZIO" CHECK (btrim(conteudo) <> '') NOT VALID;
    END IF;
END;
$$;

-- 2 e 3. Funções de suspensão e exclusão (a de papel ganhou o parâmetro de motivo: a assinatura antiga sai).
DROP FUNCTION IF EXISTS public.suspender_papel_usuario(INT, INT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.fn_eh_ultimo_admin_ativo(p_id_usuario INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH admins AS (
        SELECT up.id_usuario
        FROM usuario_papel up
        JOIN papel p ON p.id_papel = up.id_papel AND p.codigo = 'admin'
        JOIN usuario u ON u.id_usuario = up.id_usuario
        WHERE (up.suspenso_ate IS NULL OR up.suspenso_ate <= NOW())
          AND u.deletado IS NOT TRUE
          AND (u.suspenso_ate IS NULL OR u.suspenso_ate <= NOW())
    )
    SELECT EXISTS (SELECT 1 FROM admins WHERE id_usuario = p_id_usuario)
       AND NOT EXISTS (SELECT 1 FROM admins WHERE id_usuario <> p_id_usuario);
$$;

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
END;
$$;

CREATE OR REPLACE FUNCTION public.suspender_papel_usuario(p_id_usuario INT, p_id_papel INT, p_ate TIMESTAMPTZ, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('papel_gerenciar') THEN
        RAISE EXCEPTION 'Sem permissão para suspender papel de usuário.' USING ERRCODE = '92022';
    END IF;
    IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
        RAISE EXCEPTION 'Motivo da suspensão é obrigatório.' USING ERRCODE = '90020';
    END IF;
    IF p_ate IS NULL OR p_ate <= NOW() THEN
        RAISE EXCEPTION 'A data final da suspensão precisa estar no futuro.' USING ERRCODE = '90023';
    END IF;
    IF EXISTS (SELECT 1 FROM papel WHERE id_papel = p_id_papel AND codigo = 'admin')
       AND public.fn_eh_ultimo_admin_ativo(p_id_usuario) THEN
        RAISE EXCEPTION 'Não é possível suspender o papel do último administrador ativo do sistema.' USING ERRCODE = '91030';
    END IF;

    UPDATE usuario_papel
    SET suspenso_ate = p_ate,
        motivo_suspensao = p_motivo,
        suspenso_por = public.id_usuario_atual()
    WHERE id_usuario = p_id_usuario AND id_papel = p_id_papel;
END;
$$;

CREATE OR REPLACE FUNCTION public.revogar_suspensao_papel_usuario(p_id_usuario INT, p_id_papel INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('papel_gerenciar') THEN
        RAISE EXCEPTION 'Sem permissão para revogar suspensão de papel de usuário.' USING ERRCODE = '92023';
    END IF;

    UPDATE usuario_papel
    SET suspenso_ate = NULL,
        motivo_suspensao = NULL,
        suspenso_por = NULL
    WHERE id_usuario = p_id_usuario AND id_papel = p_id_papel;
END;
$$;

CREATE OR REPLACE FUNCTION public.suspender_pesquisador(
    p_id_usuario INT,
    p_ate TIMESTAMPTZ,
    p_motivo TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_linhas INT;
BEGIN
    IF NOT public.tem_permissao('usuario_suspender') THEN
        RAISE EXCEPTION 'Sem permissão para suspender pesquisador.' USING ERRCODE = '92014';
    END IF;
    IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
        RAISE EXCEPTION 'Motivo da suspensão é obrigatório.' USING ERRCODE = '90020';
    END IF;
    IF p_ate IS NULL OR p_ate <= NOW() THEN
        RAISE EXCEPTION 'A data final da suspensão precisa estar no futuro.' USING ERRCODE = '90023';
    END IF;

    UPDATE perfil_pesquisador
    SET status_pesquisador = 'suspenso',
        suspenso_ate = p_ate,
        motivo_suspensao = p_motivo,
        suspenso_por = public.id_usuario_atual()
    WHERE id_usuario = p_id_usuario AND status_pesquisador <> 'suspenso';

    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    IF v_linhas = 0 THEN
        RETURN FALSE;
    END IF;

    UPDATE campanha SET status = 'encerrado_moderacao'
    WHERE id_usuario = p_id_usuario AND status = 'ativo';

    -- CTE + INSERT numa instrução só: as linhas devolvidas pelo UPDATE
    -- alimentam o histórico sem precisar de laço nem de segunda leitura.
    WITH rejeitadas AS (
        UPDATE campanha SET status = 'rejeitado'
        WHERE id_usuario = p_id_usuario AND status = 'aguardando_aprovacao'
        RETURNING id_campanha, id_usuario, titulo
    )
    INSERT INTO historico_rejeicao (id_campanha, id_usuario_dono, titulo_campanha, id_admin, justificativa)
    SELECT id_campanha, id_usuario, titulo, public.id_usuario_atual(),
           'Rejeitada automaticamente por suspensão do pesquisador.'
    FROM rejeitadas;

    RETURN TRUE;
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

-- 4. Transição de campanha: volta de "aguardando" para "rejeitado" quando o dono excluiu a conta.

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

    RAISE EXCEPTION 'Transição de status de campanha não autorizada (% -> %).', OLD.status, NEW.status
        USING ERRCODE = '92001';
END;
$$;

-- 5 e 6. Comentário em campanha não publicada; link acadêmico só de pesquisador.

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

CREATE OR REPLACE FUNCTION public.trg_valida_escopo_tipolink()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_coluna    TEXT;
    v_permitido BOOLEAN;
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

    RETURN NEW;
END;
$$;

-- Permissões das funções novas ou com assinatura nova (as mesmas linhas de 06_grants.sql).
REVOKE EXECUTE ON FUNCTION public.suspender_papel_usuario(INT, INT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suspender_papel_usuario(INT, INT, TIMESTAMPTZ, TEXT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.fn_eh_ultimo_admin_ativo(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_eh_ultimo_admin_ativo(INT) TO app_nestjs;
REVOKE EXECUTE ON FUNCTION public.fn_usuario_excluido(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_usuario_excluido(INT) TO app_nestjs;

