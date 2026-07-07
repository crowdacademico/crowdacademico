-- ============================================================
--  CrowdAcadêmico — 09: TRIGGER on_auth_user_created
--  Resolve a pendência apontada na análise: o comentário do seed
--  citava esse trigger, mas ele não existia em nenhum arquivo.
--
--  O que faz: quando alguém se cadastra via Supabase Auth (uma
--  linha nova aparece em auth.users), cria automaticamente a linha
--  correspondente em public.usuario e atribui o papel padrão
--  'usuario'. Sem isso, o cadastro fica "pela metade": a pessoa
--  autentica, mas o app não encontra o perfil dela em usuario.
--
--  Depende de: 01_extensoes_enums_tabelas.sql (tabelas usuario,
--  papel, usuario_papel). A consulta ao papel 'usuario' só precisa
--  existir em tempo de EXECUÇÃO (quando alguém se cadastra de
--  verdade), não em tempo de criação — por isso este arquivo pode
--  rodar a qualquer momento após o 01, mas na prática faz sentido
--  rodar por último, depois do seed (07), já com 'usuario' cadastrado
--  em papel.
--
--  IMPORTANTE: só funciona se for executado por uma role com
--  permissão de criar trigger no schema auth (no SQL Editor do
--  Supabase, a role padrão já tem essa permissão).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public   -- roda com privilégio do dono da função; search_path fixo evita sequestro de schema
AS $$
DECLARE
    v_id_usuario       INT;
    v_id_papel_usuario INT;
BEGIN
    -- Alguns fluxos de auth (ex.: login só por telefone) podem não
    -- ter e-mail. Como usuario.email é NOT NULL, não dá pra criar o
    -- perfil automaticamente nesse caso — melhor deixar pro app tratar
    -- explicitamente do que falhar o cadastro inteiro com uma exceção aqui.
    IF NEW.email IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO usuario (nome, email, id_supabase)
    VALUES (
        COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)), -- usa o nome informado no cadastro; se não vier, usa a parte antes do @ como provisório
        NEW.email,
        NEW.id
    )
    ON CONFLICT (id_supabase) DO NOTHING   -- idempotente: se o trigger disparar 2x (retry do Supabase), não duplica nem quebra
    RETURNING id_usuario INTO v_id_usuario;

    -- ON CONFLICT DO NOTHING não retorna linha quando já existia;
    -- neste caso, busca o id_usuario que já foi criado antes.
    IF v_id_usuario IS NULL THEN
        SELECT id_usuario INTO v_id_usuario FROM usuario WHERE id_supabase = NEW.id;
    END IF;

    -- Papel padrão de quem se cadastra sozinho pelo app.
    -- Papéis mais específicos (pesquisador, admin etc.) continuam
    -- sendo atribuídos depois, manualmente ou por outro fluxo —
    -- este trigger só garante o mínimo pra pessoa não ficar sem papel.
    SELECT id_papel INTO v_id_papel_usuario FROM papel WHERE nome = 'usuario';

    IF v_id_usuario IS NOT NULL AND v_id_papel_usuario IS NOT NULL THEN
        INSERT INTO usuario_papel (id_usuario, id_papel)
        VALUES (v_id_usuario, v_id_papel_usuario)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
