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
--  atual na sessão, checagem granular de permissão via RBAC, checagem
--  de visibilidade de conta (usuário "deletado" via soft delete), e
--  contagem agregada de seguidores sem expor identidade de quem segue.
--  Também concentra as operações de autenticação sobre `usuario` que não
--  têm mais GRANT UPDATE direto ([03-F]) — cada uma é SECURITY DEFINER,
--  ponto único e auditável, em vez de UPDATE aberto.
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
-- CORRIGIDO (bug crítico): `, true` só cobre "variável nunca definida" — não cobre
-- "definida como string vazia", e '' :: INT lança exceção. Como tem_permissao() chama
-- esta função e aparece em 89 das 105 policies, uma sessão anônima onde o NestJS
-- interpola algo como `${usuario?.id ?? ''}` derrubava QUALQUER consulta a tabela
-- protegida, inclusive a listagem pública de campanhas. NULLIF(..., '') trata os dois
-- casos (não definida e definida vazia) como a mesma coisa: usuário anônimo, NULL.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.id_usuario_atual()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NULLIF(current_setting('app.id_usuario_atual', true), '')::INT;
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

-- ============================================================
-- [03-E] CONTAGEM AGREGADA DE SEGUIDORES (item 18 da Lista C)
-- ============================================================
-- Função:     contar_seguidores_pesquisador / contar_seguidores_campanha
-- Assinatura: (p_id INT) -> INT
-- Bloco:      [03-E]
-- Regra:      ADICIONADO (28-07-2026) — pol_seg_pesq_select/pol_seg_campanha_select
--             (04) só liberam SELECT das próprias linhas de "quem eu sigo"; ninguém
--             consegue contar quantos seguidores um pesquisador/campanha tem, nem o
--             próprio dono. Não dá pra resolver isso com uma policy: RLS filtra
--             LINHA, então `SELECT count(*)` sempre soma só o que a sessão já
--             enxerga — liberar a policy pra "contar" também exporia as linhas
--             (e as identidades de quem segue) junto. O caminho é uma função
--             SECURITY DEFINER que devolve só o número (mesmo padrão de
--             usuario_visivel/tem_permissao) — contagem pública, identidade
--             privada, igual Catarse/Experiment fazem com apoiador.
--             Efeito colateral: idx_seguir_pesquisador_alvo (02) deixa de ser
--             índice morto — passa a ser exatamente o que esta função usa.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contar_seguidores_pesquisador(p_id INT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT count(*)::INT FROM seguir_pesquisador WHERE id_pesquisador = p_id;
$$;

CREATE OR REPLACE FUNCTION public.contar_seguidores_campanha(p_id INT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT count(*)::INT FROM seguir_campanha WHERE id_campanha = p_id;
$$;

-- ============================================================
-- [03-F] OPERAÇÕES DE AUTENTICAÇÃO (item "Problema 1" — Claude Web, 28-07-2026)
-- Descrição: email_verificado, tentativas_login_falhas, bloqueado_ate,
--            ultimo_login_em, ultimo_login_ip e deletado saíram do GRANT UPDATE
--            de usuario (06, [06-D-2]) — restringir só por coluna não bastava,
--            porque é o MESMO app_nestjs que atende o endpoint genérico de
--            "editar meu perfil" e o fluxo de autenticação; nenhuma lista de
--            colunas separa os dois papéis. Testado (Claude Web) como usuário
--            comum, via UPDATE direto: auto-verificar o próprio e-mail sem
--            clicar no link (bypass permanente), limpar o próprio bloqueio de
--            login, e "ressuscitar" a própria conta excluída. As 5 funções
--            abaixo são o único jeito de mudar essas colunas dali em diante —
--            mesmo padrão de atribuir_papel_padrao/recalcular_score_pesquisador:
--            SECURITY DEFINER, ponto único e auditável por operação nomeada, em
--            vez de UPDATE aberto.
-- ============================================================

-- ----------------------------------------------------------------------------
-- Função:     confirmar_email_usuario
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-F]
-- Regra:      Marca o e-mail como verificado. Chamada pelo NestJS depois de
--             validar o token em verificacao_email — esta função não valida o
--             token, só aplica o resultado já validado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirmar_email_usuario(p_id_usuario INT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE usuario SET email_verificado = TRUE WHERE id_usuario = p_id_usuario;
$$;

-- ----------------------------------------------------------------------------
-- Função:     registrar_falha_login
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-F]
-- Regra:      Incrementa tentativas_login_falhas; ao atingir
--             configuracoes.limite_tentativas_login, bloqueia a conta por
--             configuracoes.bloqueio_login_minutos (nenhum número fixo — os
--             dois são configuráveis pelo Painel Admin, mesmo padrão dos
--             outros limites do item 16 da Lista C).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_falha_login(p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tentativas INT;
    v_limite     INT;
    v_minutos    INT;
BEGIN
    v_limite  := public.config_numero('limite_tentativas_login', 5);
    v_minutos := public.config_numero('bloqueio_login_minutos', 15);

    UPDATE usuario
    SET tentativas_login_falhas = tentativas_login_falhas + 1
    WHERE id_usuario = p_id_usuario
    RETURNING tentativas_login_falhas INTO v_tentativas;

    IF v_tentativas >= v_limite THEN
        UPDATE usuario
        SET bloqueado_ate = NOW() + (v_minutos || ' minutes')::INTERVAL
        WHERE id_usuario = p_id_usuario;
    END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     liberar_bloqueio_login
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-F]
-- Regra:      Zera tentativas_login_falhas e limpa bloqueado_ate. Uso previsto:
--             desbloqueio manual (suporte/admin) antes do próximo login bem
--             sucedido — registrar_login_sucesso() já faz o mesmo reset
--             automaticamente quando o login dá certo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.liberar_bloqueio_login(p_id_usuario INT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE usuario
    SET tentativas_login_falhas = 0, bloqueado_ate = NULL
    WHERE id_usuario = p_id_usuario;
$$;

-- ----------------------------------------------------------------------------
-- Função:     registrar_login_sucesso
-- Assinatura: (p_id_usuario INT, p_ip TEXT) -> VOID
-- Bloco:      [03-F]
-- Regra:      Grava ultimo_login_em/ultimo_login_ip e zera o estado de falha
--             (tentativas_login_falhas, bloqueado_ate) — um login bem sucedido
--             sempre limpa o histórico de tentativas anteriores. p_ip é TEXT
--             (não VARCHAR(45), o tipo da coluna) de propósito — evita
--             ambiguidade de modificador de tipo na assinatura da função
--             usada por GRANT EXECUTE; o cast pra VARCHAR(45) da coluna
--             acontece implicitamente no UPDATE.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_login_sucesso(p_id_usuario INT, p_ip TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE usuario
    SET ultimo_login_em = NOW(), ultimo_login_ip = p_ip,
        tentativas_login_falhas = 0, bloqueado_ate = NULL
    WHERE id_usuario = p_id_usuario;
$$;

-- ----------------------------------------------------------------------------
-- Função:     excluir_conta_usuario
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-F]
-- Regra:      RNF-003 (LGPD) — marca a conta como deletado = TRUE. Ponto único
--             de exclusão de propósito: não existe função equivalente pra
--             reverter (deletado = FALSE) — a exclusão é deliberadamente uma
--             via de mão única, coerente com o desenho de anonimização já
--             existente (usuario_visivel(), item 17 em PENDENCIAS.md).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.excluir_conta_usuario(p_id_usuario INT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE usuario SET deletado = TRUE WHERE id_usuario = p_id_usuario;
$$;