-- ============================================================
--  CrowdAcadêmico — 03: FUNÇÕES HELPER DE SEGURANÇA (RLS)
--  Depende de: 01_extensoes_enums_tabelas.sql
--  Usado por: 04_rls_policies.sql
--  Próximo arquivo: 04_rls_policies.sql
-- ============================================================
-- [03-A] CONTEXTO DE SESSÃO E IDENTIFICAÇÃO DE USUÁRIO
-- ============================================================

CREATE OR REPLACE FUNCTION public.id_usuario_atual()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT current_setting('app.id_usuario_atual', true)::INT;
$$;

-- ============================================================
-- [03-B] CONTROLE DE ACESSO GRANULAR (RBAC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.tem_permissao(p_permissao TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM usuario_papel up
        JOIN papel_permissao pp ON pp.id_papel = up.id_papel
        JOIN permissao pm ON pm.id_permissao = pp.id_permissao
        WHERE up.id_usuario = public.id_usuario_atual()
          AND pm.nome = p_permissao
    );
$$;