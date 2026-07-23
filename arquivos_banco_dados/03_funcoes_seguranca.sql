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

-- REMOVIDO: eh_admin() checava p.nome = 'admin' — um nome de papel
-- hardcoded em código, o mesmo problema estrutural que o RBAC (papel/
-- permissão/N:N) foi criado para resolver ("RBAC de enfeite": a
-- modelagem existe, mas o enforcement ignorava ela). Toda policy que
-- usava eh_admin() foi migrada para tem_permissao(...) (ver
-- 04_rls_policies.sql), e trg_permissao_auto_admin
-- (06b_regras_negocio.sql) garante que 'admin' recebe automaticamente
-- toda permissão nova, então não há perda de acesso na troca.
-- O DROP abaixo é só para manter o script idempotente em bancos onde
-- a função antiga já existia de uma versão anterior.
DROP FUNCTION IF EXISTS public.eh_admin();

-- ADICIONADO: checagem de permissão granular, para RBAC de verdade (não
-- só admin/não-admin). Nunca referencia nome de papel — só permissão.
-- Papel é puramente um "pacote de permissões" guardado em papel_permissao;
-- trocar, renomear ou dividir papéis no futuro não exige tocar nesta
-- função nem em nenhuma policy que a utilize.
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
