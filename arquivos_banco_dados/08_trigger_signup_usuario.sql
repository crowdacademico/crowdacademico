-- ============================================================================
--  CROWDACADÊMICO - SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     08_trigger_signup_usuario.sql
--  Módulo:      Atribuição de Papel Padrão no Signup
--  Depende de:  01_extensoes_enums_tabelas.sql
--  Usado por:   endpoint de signup do NestJS (chamado logo após o INSERT em usuario)
--  Próximo:     (nenhum - último arquivo da sequência; execução opcional/manual,
--               responsabilidade do backend, não parte do bootstrap 01→07)
-- ----------------------------------------------------------------------------
--  Descrição:
--  Substitui o antigo trigger de signup via Supabase Auth (ver histórico em
--  DOCUMENTACAO_BD.md). Com autenticação própria, nunca mais existe um INSERT
--  em auth.users para disparar um trigger - o NestJS chama esta função
--  manualmente, dentro da mesma transação do signup, logo após inserir a
--  linha em usuario.
--
--  [08-D-1] atribuir_papel_padrao() - atribui o papel 'usuario' ao cadastro novo
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     atribuir_papel_padrao
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [08-D-1]
-- Regra:      Atribui o papel 'usuario' (padrão de todo cadastro novo) ao usuário recém-criado. Chamada pelo NestJS logo
--             após o INSERT em usuario, dentro da mesma transação de signup. SECURITY DEFINER: precisa gravar em
--             usuario_papel antes de o usuário ter qualquer permissão (pol_usuariopapel_insert, 04, exige 'papel_atribuir',
--             que ninguém tem no primeiro segundo de vida da conta). O papel é reconhecido por `codigo`
--             (01_extensoes_enums_tabelas.sql [01-B]), não por `nome`: roda em TODO cadastro real, e renomear o papel
--             'usuario' pelo painel faria todo cadastro novo nascer sem papel, em silêncio.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atribuir_papel_padrao(p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_papel_usuario INT;
BEGIN
    SELECT id_papel INTO v_id_papel_usuario FROM papel WHERE codigo = 'usuario';

    IF v_id_papel_usuario IS NOT NULL THEN
        INSERT INTO usuario_papel (id_usuario, id_papel)
        VALUES (p_id_usuario, v_id_papel_usuario)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

-- A função é chamada pelo NestJS logo após o INSERT em usuario, no fluxo de signup, então precisa de GRANT
-- EXECUTE explícito (sem ele, "permission denied", 42501, como as funções de score). Escreve em usuario_papel:
-- mesma categoria das 5 de [03-O], que saem do EXECUTE-para-PUBLIC padrão do Postgres; REVOKE explícito antes
-- do GRANT, por consistência (não é hoje explorável, só app_nestjs conecta ao banco).
REVOKE EXECUTE ON FUNCTION public.atribuir_papel_padrao(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atribuir_papel_padrao(INT) TO app_nestjs;
