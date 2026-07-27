-- ============================================================================
--  CROWDACADÊMICO — SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     03_funcoes_seguranca.sql
--  Módulo:      Funções Helper de Segurança (RLS)
--  Depende de:  01_extensoes_enums_tabelas.sql
--  Usado por:   04_rls_policies.sql
--  Próximo:     04_rls_policies.sql
-- ----------------------------------------------------------------------------
--  Descrição:
--  Funções puras que fazem a ponte de contexto de segurança entre o
--  NestJS e o mecanismo de RLS do PostgreSQL: identificação do usuário
--  atual na sessão, checagem granular de permissão via RBAC, e checagem
--  de visibilidade de conta (usuário "deletado" via soft delete).
-- ============================================================
-- [03-J] CONTEXTO DE SESSÃO E IDENTIFICAÇÃO DE USUÁRIO
-- ============================================================
-- Função:     id_usuario_atual
-- Assinatura: () -> INT
-- Bloco:      [03-J]
-- Regra:      Lê o id do usuário autenticado a partir da variável de sessão
--             app.id_usuario_atual, definida pelo NestJS via SET LOCAL logo
--             no início da transação, após validar o JWT. O segundo
--             argumento true de current_setting() evita erro fatal quando a
--             variável não foi definida (sessão anônima), retornando NULL.
-- ----------------------------------------------------------------------------
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
-- Função:     tem_permissao
-- Assinatura: (p_permissao TEXT) -> BOOLEAN
-- Bloco:      [03-B]
-- Regra:      Autorização por capacidade — valida se o usuário atual possui,
--             via algum papel em usuario_papel, a permissão nomeada em
--             papel_permissao (ex.: 'campanha_aprovar'), nunca por nome de
--             papel. Se id_usuario_atual() for NULL (anônimo), o subselect
--             não encontra nenhuma linha e a função retorna FALSE de forma
--             determinística, sem tratamento especial de NULL necessário.
-- ----------------------------------------------------------------------------
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

-- ============================================================
-- [03-D] VISIBILIDADE DE CONTA (SOFT DELETE)
-- ============================================================
-- Função:     usuario_visivel
-- Assinatura: (p_id INT) -> BOOLEAN
-- Bloco:      [03-D]
-- Regra:      CORRIGIDO — pol_usuario_select (04) já escondia usuario.deletado = TRUE,
--             mas pol_perfil_select e pol_link_select eram USING (TRUE) sem olhar
--             pra esse flag: perfil acadêmico e links de uma conta "excluída"
--             continuavam públicos. Centralizar a checagem numa função (mesmo
--             padrão de tem_permissao) evita que a próxima policy pública nasça
--             com o mesmo furo. Se o usuário não existir (não deveria acontecer,
--             FK garante), o padrão é considerar invisível.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usuario_visivel(p_id INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NOT COALESCE((SELECT deletado FROM usuario WHERE id_usuario = p_id), TRUE);
$$;