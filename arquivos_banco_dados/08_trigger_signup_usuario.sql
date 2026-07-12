-- ============================================================
--  CrowdAcadêmico — 08: (OBSOLETO) Trigger de signup via Supabase Auth
--  Depende de: 01_extensoes_enums_tabelas.sql
-- ============================================================
--
--  ALTERADO: este arquivo continha um trigger em auth.users
--  (on_auth_user_created / handle_new_user) que criava a linha em
--  public.usuario automaticamente quando o Supabase Auth cadastrava
--  um usuário novo.
--
--  Com a saída do Supabase Auth do fluxo, nunca mais existe um
--  INSERT em auth.users — esse trigger não tem mais como disparar
--  e por isso foi removido daqui.
--
--  O que faz as vezes dele agora: o endpoint de signup do NestJS,
--  dentro de uma única transação, deve:
--    1) gerar o hash da senha (bcrypt/argon2) e inserir em usuario
--       (nome, email, senha_hash);
--    2) atribuir o papel padrão (função auxiliar abaixo);
--    3) criar o registro em verificacao_email e disparar o e-mail
--       de confirmação (módulo de auth do NestJS — ver
--       PLANO_AUTENTICACAO_PROPRIA.md para o desenho do fluxo).
--
--  A única parte deste arquivo original que ainda vale a pena manter
--  como está — "atribuir o papel padrão 'usuario' a quem acabou de
--  se cadastrar" — foi reaproveitada abaixo como função chamável pelo
--  NestJS logo após o INSERT em usuario, em vez de ficar presa a um
--  trigger de tabela que não existe mais.
-- ============================================================

CREATE OR REPLACE FUNCTION public.atribuir_papel_padrao(p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_papel_usuario INT;
BEGIN
    SELECT id_papel INTO v_id_papel_usuario FROM papel WHERE nome = 'usuario';

    IF v_id_papel_usuario IS NOT NULL THEN
        INSERT INTO usuario_papel (id_usuario, id_papel)
        VALUES (p_id_usuario, v_id_papel_usuario)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

-- CORRIGIDO: faltava GRANT EXECUTE. O NestJS chama esta função logo
-- após o INSERT em usuario, no fluxo de signup — sem o GRANT, a
-- chamada tomaria "permission denied" (erro 42501), o mesmo problema
-- que as funções de score já tiveram e que motivou o GRANT EXECUTE
-- explícito delas em 05_grants.sql.
GRANT EXECUTE ON FUNCTION public.atribuir_papel_padrao(INT) TO app_nestjs;