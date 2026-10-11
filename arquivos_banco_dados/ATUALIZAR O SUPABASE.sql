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
-- GRUPO AU (10-10-2026) - só o admin muda a Pontuação. IDEMPOTENTE (pode colar de novo).
-- Só apaga uma linha de papel_permissao: pode colar com o Nest ligado.
--
-- O que muda: o revisor deixa de ter score_editar (mudar pesos e faixas da Pontuação). Ele continua vendo a
-- pontuação de todos (score_visualizar). Mudar os números passa a ser só do admin, como dizem os requisitos.
-- ============================================================================

DELETE FROM papel_permissao pp
USING papel p, permissao perm
WHERE pp.id_papel = p.id_papel
  AND pp.id_permissao = perm.id_permissao
  AND p.nome = 'revisor'
  AND perm.nome = 'score_editar';

-- ============================================================================
-- GRUPO AV (10-10-2026) - função de cada papel de gestão e trava da contestação. IDEMPOTENTE (pode colar de novo).
-- ⚠️ Tem ALTER TABLE: PARE o Nest antes de colar (com ele ligado dá deadlock).
--
-- O que muda:
--   1. Curador passa a aprovar e rejeitar campanhas (com a leitura que mostra a fila) e deixa de publicar o Termo
--      de Uso, que fica só com o admin.
--   2. Revisor passa a ver tudo do funcionamento (relatórios, auditoria financeira e log), sem dados pessoais e sem
--      alterar nada.
--   3. A denúncia guarda quem a julgou (id_julgador), e quem julgou não decide a contestação contra a própria
--      decisão (92036).
-- ============================================================================

-- 1 e 2. Permissões
INSERT INTO papel_permissao (id_papel, id_permissao)
SELECT p.id_papel, perm.id_permissao
FROM papel p
JOIN permissao perm ON TRUE
WHERE (p.nome, perm.nome) IN (
    ('curador', 'campanha_aprovar'),
    ('curador', 'campanha_rejeitar'),
    ('curador', 'relatorio_visualizar'),
    ('revisor', 'relatorio_visualizar'),
    ('revisor', 'auditoria_financeira_visualizar'),
    ('revisor', 'log_visualizar')
)
ON CONFLICT DO NOTHING;

DELETE FROM papel_permissao pp
USING papel p, permissao perm
WHERE pp.id_papel = p.id_papel
  AND pp.id_permissao = perm.id_permissao
  AND p.nome = 'curador'
  AND perm.nome = 'termos_uso_gerenciar';

-- 3. Quem julgou a denúncia
ALTER TABLE denuncia ADD COLUMN IF NOT EXISTS id_julgador INT;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_DENUNCIA_JULGADOR') THEN
        ALTER TABLE denuncia
            ADD CONSTRAINT "FK_DENUNCIA_JULGADOR" FOREIGN KEY (id_julgador) REFERENCES usuario(id_usuario) ON DELETE SET NULL;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_denuncia_registra_julgador()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.contestacao_status IS DISTINCT FROM OLD.contestacao_status THEN
        RETURN NEW;
    END IF;
    IF NEW.status IN ('resolvida', 'improcedente') THEN
        NEW.id_julgador := public.id_usuario_atual();
    ELSE
        NEW.id_julgador := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_denuncia_registra_julgador ON denuncia;
CREATE TRIGGER trg_denuncia_registra_julgador
BEFORE UPDATE ON denuncia
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION fn_denuncia_registra_julgador();

CREATE OR REPLACE FUNCTION public.decidir_contestacao(p_id_denuncia INT, p_aceitar BOOLEAN, p_justificativa TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_denunciante INT;
    v_julgador INT;
    v_contestacao status_contestacao;
BEGIN
    IF NOT public.tem_permissao('denuncia_responder') THEN
        RAISE EXCEPTION 'Sem permissão para decidir contestações.' USING ERRCODE = '92035';
    END IF;
    SELECT id_usuario, id_julgador, contestacao_status INTO v_denunciante, v_julgador, v_contestacao
    FROM denuncia WHERE id_denuncia = p_id_denuncia;
    IF v_contestacao IS DISTINCT FROM 'pendente' THEN
        RAISE EXCEPTION 'Só uma contestação esperando análise pode ser decidida.' USING ERRCODE = '91047';
    END IF;
    IF v_denunciante = public.id_usuario_atual() THEN
        RAISE EXCEPTION 'Quem registrou a denúncia não pode julgar a própria denúncia.' USING ERRCODE = '92006';
    END IF;
    IF v_julgador = public.id_usuario_atual() THEN
        RAISE EXCEPTION 'Quem julgou a denúncia não pode decidir a contestação contra a própria decisão.' USING ERRCODE = '92036';
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

-- ============================================================================
-- GRUPO AW (10-10-2026) - sai o "comentar em nome de outro". IDEMPOTENTE (pode colar de novo).
-- Só apaga uma função e uma permissão: pode colar com o Nest ligado.
--
-- O que muda: na Bancada da Campanha, o comentário passa a ser sempre de quem está logado (só pesquisador ativo
-- comenta, como manda o requisito). A ferramenta de teste que comentava em nome de outro pesquisador sai inteira.
-- Apagar a permissão tira também o vínculo dela com o admin (papel_permissao apaga em cascata).
-- ============================================================================

DROP FUNCTION IF EXISTS public.comentar_campanha_para_outro(INT, INT, TEXT);
DELETE FROM permissao WHERE nome = 'comentario_criar_para_outro';
