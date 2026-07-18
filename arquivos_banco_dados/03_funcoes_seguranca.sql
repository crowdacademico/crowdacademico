-- ============================================================
--  CrowdAcadêmico — 03: FUNÇÕES HELPER DE SEGURANÇA (RLS)
--  Depende de: 01_extensoes_enums_tabelas.sql (tabela usuario, usuario_papel, papel)
--  Usado por: 04_rls_policies.sql
--  Próximo arquivo: 04_rls_policies.sql
-- ============================================================

-- ============================================================
-- FUNÇÕES HELPER PARA RLS
-- ============================================================
-- ALTERADO: não usa mais auth.uid() (Supabase Auth). O NestJS, após
-- validar o JWT próprio, executa `SET LOCAL app.id_usuario_atual = '<id>'`
-- no início da transação, e esta função lê esse valor da sessão.
-- `current_setting(..., true)` com o 2º argumento true não lança erro
-- caso a variável não tenha sido definida (retorna NULL).
CREATE OR REPLACE FUNCTION public.id_usuario_atual()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT current_setting('app.id_usuario_atual', true)::INT;
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
          AND p.nome IN ('admin', 'administrador_1', 'administrador_2', 'administrador_3')
    );
$$;

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
