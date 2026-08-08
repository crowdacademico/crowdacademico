-- ============================================================================
-- Este arquivo é TEMPORÁRIO — depois a gente deleta.
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
-- inteiro de novo sem medo) — se algum dia entrar um bloco que não seja,
-- vai vir com um aviso bem visível.
-- ============================================================================


-- ============================================================================
-- 03-08-2026 — papel.nome editável pelo painel (nova coluna "Ações" na tela
-- de Papéis)
-- Seguro rodar de novo quantas vezes quiser.
-- ============================================================================

-- 04_rls_policies.sql [04-B] — nova policy: permite UPDATE em papel só pra
-- quem tem a permissão 'papel_gerenciar'
DROP POLICY IF EXISTS pol_papel_update ON papel;
CREATE POLICY pol_papel_update ON papel FOR UPDATE TO app_nestjs USING (public.tem_permissao('papel_gerenciar'));

-- 06_grants.sql [06-B] — sem este GRANT, a policy acima nunca chega a ser
-- avaliada (Postgres barra o UPDATE antes, por falta de privilégio de coluna)
GRANT UPDATE (nome) ON papel TO app_nestjs;


-- ============================================================================
-- 07-08-2026 — coluna "papel" da listagem de Usuários visível pra todo mundo
-- (TEMPORÁRIO, de propósito, só pra facilitar teste manual enquanto o
-- sistema está em construção — ver aviso amarelo na própria tela)
-- Seguro rodar de novo quantas vezes quiser.
-- ============================================================================

-- 04_rls_policies.sql [04-D-3] — era só dono OU quem tem papel_gerenciar
-- (só admin via painel). Virou USING(true): qualquer chamada vê o papel de
-- qualquer usuário — logada ou não (o guard de login em cima do endpoint
-- também caiu, ver commits do backend do dia). Reverter pra
-- "USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('papel_gerenciar'))"
-- quando o RBAC de verdade entrar em vigor (tela vai deixar de mostrar tudo
-- pra todo mundo, e esta lista volta a exigir permissão pra ver).
DROP POLICY IF EXISTS pol_usuariopapel_select ON usuario_papel;
CREATE POLICY pol_usuariopapel_select ON usuario_papel FOR SELECT TO app_nestjs USING (true);


-- ============================================================================
-- 07-08-2026 — TIMESTAMP -> TIMESTAMPTZ em todas as 48 colunas de data/hora
-- que ainda eram "sem fuso" (achado: banco em UTC + servidor em outro fuso
-- fazia datas lidas de volta pelo backend virarem 3h erradas — token de
-- recuperação de senha podia nascer "já expirado", bloqueio de login de 15
-- min virar 3h15, etc. A única coluna já certa era log_auditoria.ocorrido_em).
--
-- Seguro rodar de novo quantas vezes quiser: ALTER COLUMN TYPE pra um tipo
-- que a coluna já tem não dá erro, só não faz nada na 2ª vez em diante.
--
-- IMPORTANTE (diferente dos blocos acima): isto reescreve todas as tabelas
-- afetadas por dentro — em produção, com tabela grande, isso trava a tabela
-- por um instante; com o volume de dados de teste de hoje, é instantâneo.
-- Sem USING explícito de propósito: sem ele, o Postgres reaproveita a
-- conversão padrão timestamp->timestamptz, que usa o fuso da PRÓPRIA sessão
-- (UTC no Supabase, conferido antes de escrever isto) — ou seja, os números
-- que já estão gravados não mudam, só passam a valer oficialmente como UTC.
-- ============================================================================

ALTER TABLE arquivo
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN desativado_em TYPE TIMESTAMPTZ;

ALTER TABLE usuario
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN deletado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN bloqueado_ate TYPE TIMESTAMPTZ,
    ALTER COLUMN ultimo_login_em TYPE TIMESTAMPTZ;

ALTER TABLE perfil_pesquisador
    ALTER COLUMN ativado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN score_atualizado_em TYPE TIMESTAMPTZ;

ALTER TABLE seguir_pesquisador
    ALTER COLUMN seguido_em TYPE TIMESTAMPTZ;

ALTER TABLE termos_de_uso
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE usuario_termo
    ALTER COLUMN aceito_em TYPE TIMESTAMPTZ;

ALTER TABLE notificacao
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN enviado_em TYPE TIMESTAMPTZ;

ALTER TABLE verificacao_email
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN expira_em TYPE TIMESTAMPTZ,
    ALTER COLUMN confirmado_em TYPE TIMESTAMPTZ;

ALTER TABLE recuperacao_senha
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN expira_em TYPE TIMESTAMPTZ,
    ALTER COLUMN usado_em TYPE TIMESTAMPTZ;

ALTER TABLE sessao
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN expira_em TYPE TIMESTAMPTZ,
    ALTER COLUMN revogado_em TYPE TIMESTAMPTZ;

-- campanha tem 3 triggers cuja cláusula WHEN lê data_inicio/data_fim/
-- aprovado_em diretamente (não a função por trás, a cláusula WHEN em si) —
-- Postgres registra isso como dependência e barra o ALTER COLUMN enquanto
-- elas existirem. Conferido direto no catálogo do banco (pg_depend), não só
-- lendo o 05_regras_negocio.sql, pra não passar nenhuma reto. Solta as 3,
-- faz o ALTER, recria as 3 exatamente iguais ao arquivo 05.
DROP TRIGGER IF EXISTS trg_campanha_valida_prazo_negocio_update ON campanha;
DROP TRIGGER IF EXISTS trg_campanha_carimba_taxa ON campanha;
DROP TRIGGER IF EXISTS trg_campanha_recalcula_score_update ON campanha;

ALTER TABLE campanha
    ALTER COLUMN data_inicio TYPE TIMESTAMPTZ,
    ALTER COLUMN data_fim TYPE TIMESTAMPTZ,
    ALTER COLUMN aprovado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN encerrado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

-- Recriando idênticas a 05_regras_negocio.sql [05-K-2] / [05-I-4]
CREATE TRIGGER trg_campanha_valida_prazo_negocio_update
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (NEW.data_inicio IS DISTINCT FROM OLD.data_inicio OR NEW.data_fim IS DISTINCT FROM OLD.data_fim)
EXECUTE FUNCTION fn_valida_prazo_campanha_negocio();

CREATE TRIGGER trg_campanha_carimba_taxa
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em)
EXECUTE FUNCTION fn_carimba_taxa_plataforma_aprovacao();

CREATE TRIGGER trg_campanha_recalcula_score_update
    AFTER UPDATE ON campanha
    FOR EACH ROW
    WHEN (   OLD.status      IS DISTINCT FROM NEW.status
          OR OLD.data_fim    IS DISTINCT FROM NEW.data_fim
          OR OLD.aprovado_em IS DISTINCT FROM NEW.aprovado_em
          OR OLD.id_usuario  IS DISTINCT FROM NEW.id_usuario)
    EXECUTE FUNCTION public.trg_recalcular_por_campanha();

ALTER TABLE seguir_campanha
    ALTER COLUMN seguido_em TYPE TIMESTAMPTZ;

ALTER TABLE atualizacao_campanha
    ALTER COLUMN publicado_em TYPE TIMESTAMPTZ;

ALTER TABLE orcamento_campanha
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE marco_cronograma
    ALTER COLUMN data_prevista TYPE TIMESTAMPTZ,
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE repasse
    ALTER COLUMN repassado_em TYPE TIMESTAMPTZ;

ALTER TABLE solicitacao_encerramento
    ALTER COLUMN solicitado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN avaliado_em TYPE TIMESTAMPTZ;

ALTER TABLE historico_rejeicao
    ALTER COLUMN rejeitado_em TYPE TIMESTAMPTZ;

ALTER TABLE comentario
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE denuncia
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE recompensa
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE contribuicao
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE auditoria_financeira
    ALTER COLUMN timestamp TYPE TIMESTAMPTZ;

ALTER TABLE contribuicao_recompensa
    ALTER COLUMN adquirida_em TYPE TIMESTAMPTZ;

ALTER TABLE aceite_termo_contribuicao
    ALTER COLUMN aceito_em TYPE TIMESTAMPTZ;

ALTER TABLE score_config
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN atualizado_em TYPE TIMESTAMPTZ;

ALTER TABLE score_rotulo
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN atualizado_em TYPE TIMESTAMPTZ;

ALTER TABLE score_pesquisador
    ALTER COLUMN calculado_em TYPE TIMESTAMPTZ;


-- ============================================================================
-- 07-08-2026 — log de auditoria não registra mais login bem-sucedido comum
-- (ultimo_login_em/ultimo_login_ip mudando sozinhos) — pedido do Lucas: "a
-- tabela de log tá lotando disso". Esse dado não sumiu, só saiu do log:
-- ultimo_login_em agora aparece em Consultar Usuário (GET /usuario/:id).
-- Seguro rodar de novo quantas vezes quiser (CREATE OR REPLACE FUNCTION).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_log_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_antigos_completo JSONB;
    v_novos_completo   JSONB;
    v_antigos          JSONB;
    v_novos            JSONB;
    v_campos           TEXT[];
    v_coluna           TEXT;
    v_partes           TEXT[] := ARRAY[]::TEXT[];
    v_identidade       TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(NEW) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_novos := to_jsonb(NEW) - 'senha_hash' - 'cpf_criptografado';
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_novos)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_novos);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(NEW) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_antigos_completo := to_jsonb(OLD);
        v_novos_completo   := to_jsonb(NEW);

        SELECT array_agg(chave) INTO v_campos
        FROM jsonb_object_keys(v_novos_completo) AS chave
        WHERE v_antigos_completo -> chave IS DISTINCT FROM v_novos_completo -> chave;

        IF v_campos IS NULL THEN
            RETURN NEW;
        END IF;

        IF TG_TABLE_NAME = 'perfil_pesquisador' AND v_campos <@ ARRAY['score_atual', 'score_atualizado_em'] THEN
            RETURN NEW;
        END IF;

        -- NOVO (07-08-2026): mesmo padrão do filtro de score acima, agora
        -- pra login bem-sucedido comum. tentativas_login_falhas/bloqueado_ate
        -- ficam DE FORA desta lista de propósito — se um login limpa um
        -- bloqueio anterior, ou um admin desbloqueia manualmente, isso
        -- continua no log.
        IF TG_TABLE_NAME = 'usuario' AND v_campos <@ ARRAY['ultimo_login_em', 'ultimo_login_ip'] THEN
            RETURN NEW;
        END IF;

        v_antigos := v_antigos_completo - 'senha_hash' - 'cpf_criptografado';
        v_novos   := v_novos_completo - 'senha_hash' - 'cpf_criptografado';

        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, campos_alterados, dados_anteriores, dados_novos)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_campos, v_antigos, v_novos);
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(OLD) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_antigos := to_jsonb(OLD) - 'senha_hash' - 'cpf_criptografado';
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_anteriores)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_antigos);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


-- ============================================================================
-- 07-08-2026 — tabela `papel` passa a ter log de auditoria (quem, quando,
-- nome antigo e novo) — pedido do Lucas: renomear papel precisa ficar
-- registrado, igual o resto do sistema. Mesmo mecanismo genérico de
-- sempre (fn_log_auditoria), só a trigger nova.
-- Seguro rodar de novo quantas vezes quiser (DROP TRIGGER IF EXISTS antes).
-- ============================================================================

DROP TRIGGER IF EXISTS trg_log_auditoria_papel ON papel;
CREATE TRIGGER trg_log_auditoria_papel
AFTER INSERT OR UPDATE OR DELETE ON papel
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_papel');


-- ============================================================================
-- 07-08-2026 — coluna `sessao.origem` ('login' ou 'refresh') — achado do
-- Lucas: a tela de "logins anteriores" (Consultar Usuário) estava contando
-- toda renovação silenciosa de token (a cada ~15min de uso normal) como se
-- fosse um login novo, porque as duas coisas viravam linha em `sessao` sem
-- distinção nenhuma. Linhas ANTIGAS (de antes desta coluna existir) ficam
-- como 'refresh' por padrão — de propósito, pra sumirem da tela de login
-- em vez de aparecerem como login sem ter sido.
-- Seguro rodar de novo quantas vezes quiser.
-- ============================================================================

ALTER TABLE sessao ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT 'refresh';
ALTER TABLE sessao DROP CONSTRAINT IF EXISTS "CK_SESSAO_ORIGEM";
ALTER TABLE sessao ADD CONSTRAINT "CK_SESSAO_ORIGEM" CHECK (origem IN ('login', 'refresh'));


-- ============================================================================
-- NÃO ENTRA NESTE ARQUIVO (registrado aqui só pra não se perder)
-- ============================================================================

-- 07_seed_dados.sql (03-08-2026): a ordem das linhas de INSERT INTO papel foi
-- trocada, pra ficar do maior poder pro menor (admin primeiro, usuario por
-- último) — só pra IDs saírem bonitinhos num banco NOVO. Não é um trecho pra
-- colar aqui: o INSERT já tem "ON CONFLICT (nome) DO NOTHING", então rodar
-- de novo num banco que já tem os 7 papéis não muda NADA (os papéis já
-- existem com os IDs antigos). Se um dia você quiser essa ordem no banco
-- ATUAL, precisaria apagar e recriar as linhas de papel com cuidado — não é
-- "colar e rodar", por isso não está aqui.
