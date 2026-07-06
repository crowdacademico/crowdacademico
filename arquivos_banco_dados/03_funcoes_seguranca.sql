-- ============================================================
--  CrowdAcadêmico — 03: FUNÇÕES HELPER DE SEGURANÇA (RLS)
--  Depende de: 01_extensoes_enums_tabelas.sql (tabela usuario, usuario_papel, papel)
--  Usado por: 04_rls_policies.sql
--  Próximo arquivo: 04_rls_policies.sql
-- ============================================================

-- ============================================================
-- FUNÇÕES HELPER PARA RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.id_usuario_atual()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id_usuario FROM public.usuario WHERE id_supabase = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.eh_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM usuario_papel up
        JOIN papel p ON p.id_papel = up.id_papel
        WHERE up.id_usuario = public.id_usuario_atual()
          AND p.nome = 'admin'
    );
$$;
