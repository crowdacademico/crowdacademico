-- ============================================================================
--  CROWDACADÊMICO - SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
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
--  têm mais GRANT UPDATE direto ([03-O]) - cada uma é SECURITY DEFINER,
--  ponto único e auditável, em vez de UPDATE aberto.
-- ============================================================
-- [03-C] CONFIG - HELPER DE LEITURA
-- ============================================================
-- ----------------------------------------------------------------------------
-- Função:     config_numero
-- Assinatura: (p_chave TEXT, p_padrao DECIMAL) -> DECIMAL
-- Bloco:      [03-C]
-- Regra:      Lê uma constante numérica da tabela configuracoes com fallback
--             seguro - nunca retorna NULL/erro mesmo se a chave ainda não
--             existir. Usada por praticamente todo o resto do banco (score,
--             limites de negócio em 05, e as funções de autenticação de
--             [03-O], neste mesmo arquivo).
-- Mora aqui, e não em 05_regras_negocio.sql, porque registrar_falha_login ([03-O]) já a chama e o 03 roda
-- ANTES do 05 (rodar 01 e 03 isolados e invocá-la dava "function public.config_numero(unknown, integer)
-- does not exist").
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.config_numero(p_chave TEXT, p_padrao DECIMAL)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT valor::DECIMAL FROM configuracoes WHERE chave = p_chave AND ativo = TRUE LIMIT 1),
        p_padrao
    );
$$;

-- ============================================================
-- Função:     id_usuario_atual
-- Assinatura: () -> INT
-- Bloco:      [03-J]
-- Regra:      Lê o id do usuário autenticado a partir da variável de sessão app.id_usuario_atual, definida pelo
--             NestJS via SET LOCAL logo no início da transação, após validar o JWT. NULLIF(..., '') trata a variável
--             não definida e a definida vazia do mesmo jeito (usuário anônimo, NULL), sem exceção de cast.
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
-- Função:     tem_permissao
-- Assinatura: (p_permissao TEXT) -> BOOLEAN
-- Bloco:      [03-B]
-- Regra:      Autorização por capacidade: valida se o usuário atual possui, via algum papel em usuario_papel, a
--             permissão nomeada em papel_permissao (ex.: 'campanha_aprovar'), nunca por nome de papel. Ignora vínculo
--             com suspenso_ate no futuro (papel suspenso não concede nada). Anônimo (id_usuario_atual() NULL) retorna
--             FALSE de forma determinística.
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
          AND (up.suspenso_ate IS NULL OR up.suspenso_ate <= now())
    );
$$;

-- ----------------------------------------------------------------------------
-- Função:     listar_papeis_usuario
-- Assinatura: (p_id_usuario INT) -> SETOF TEXT
-- Bloco:      [03-B]
-- Regra:      SECURITY DEFINER de propósito: devolve o CÓDIGO (`papel.codigo`, não `papel.nome`) dos papéis de um
--             usuário, para login/refresh (03-auth) decidirem se mostram "Painel Admin" no dropdown do cabeçalho.
--             É chamada de dentro do próprio login/refresh, onde id_usuario_atual() ainda é NULL; sem SECURITY
--             DEFINER a RLS de usuario_papel devolveria 0 linhas.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_papeis_usuario(p_id_usuario INT)
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p.codigo
    FROM usuario_papel up
    JOIN papel p ON p.id_papel = up.id_papel
    WHERE up.id_usuario = p_id_usuario
    ORDER BY p.codigo;
$$;

-- ============================================================
-- Função:     usuario_visivel
-- Assinatura: (p_id INT) -> BOOLEAN
-- Bloco:      [03-D]
-- Regra:      Centraliza a checagem de conta "excluída" (deletado = TRUE) para as policies públicas (perfil, links)
--             não nascerem com o furo de expor uma conta excluída, mesmo padrão de tem_permissao. Usuário
--             inexistente (não deveria acontecer, FK garante) é considerado invisível.
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

-- ----------------------------------------------------------------------------
-- Função:     registrar_aceite_termo
-- Assinatura: (p_id_usuario INT, p_id_termo INT, p_ip TEXT) -> VOID
-- Bloco:      [03-D-1]
-- Regra:      SECURITY DEFINER de propósito: grava o aceite dos Termos de Uso (usuario_termo) no MOMENTO do
--             cadastro, quando a conta acabou de ser criada NESTA MESMA requisição e ainda não existe sessão
--             (id_usuario_atual() é NULL), e pol_usuario_termo_insert (04) exige id_usuario = id_usuario_atual().
--             Sem checagem própria: quem escolhe p_id_usuario é o backend (o id recém-criado), nunca o corpo da
--             requisição. ON CONFLICT DO NOTHING: idempotente (UK_USUARIO_TERMO_USUARIO_TERMO).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_aceite_termo(p_id_usuario INT, p_id_termo INT, p_ip TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO usuario_termo (id_usuario, id_termo, ip_aceite)
    VALUES (p_id_usuario, p_id_termo, p_ip)
    ON CONFLICT (id_usuario, id_termo) DO NOTHING;
$$;

-- ============================================================
-- Função:     contar_seguidores_pesquisador / contar_seguidores_campanha
-- Assinatura: (p_id INT) -> INT
-- Bloco:      [03-E]
-- Regra:      pol_seg_pesq_select/pol_seg_campanha_select (04) só liberam as próprias linhas de "quem eu sigo", e
--             RLS filtra LINHA: liberar a policy para contar exporia também a identidade de quem segue. Estas
--             funções SECURITY DEFINER devolvem só o número (contagem pública, identidade privada) e usam
--             idx_seguir_pesquisador_alvo (02).
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
-- [03-O] OPERAÇÕES DE AUTENTICAÇÃO
-- Descrição: email_verificado, tentativas_login_falhas, bloqueado_ate, ultimo_login_em, ultimo_login_ip e
--            deletado não estão no GRANT UPDATE de usuario (06, [06-D-2]): o MESMO app_nestjs atende o
--            "editar meu perfil" e o fluxo de autenticação, e nenhuma lista de colunas separa os dois.
--            Estas funções são o único jeito de mudar essas colunas: SECURITY DEFINER, ponto único e
--            auditável por operação nomeada (mesmo padrão de atribuir_papel_padrao/
--            recalcular_score_pesquisador).
--
-- SECURITY DEFINER desliga a RLS, então a função é a ÚNICA guardiã e precisa checar quem a chama, por
-- categoria:
--   1. excluir_conta_usuario/liberar_bloqueio_login: checagem de autorização própria (tem_permissao(),
--      ver cada uma abaixo).
--   2. confirmar_email_por_token: recebe o TOKEN (o segredo) e resolve o dono sozinha, em vez de confiar
--      num id_usuario vindo de fora.
--   3. registrar_falha_login/registrar_login_sucesso NÃO têm como se autorizar: rodam durante o login,
--      antes de existir sessão (id_usuario_atual() é NULL por definição). São de confiança do backend, e
--      o endpoint de login precisa derivar o id do e-mail informado, nunca aceitar o id do cliente
--      (registrar_falha_login com id arbitrário é vetor de negação de serviço: 5 chamadas bloqueiam a
--      conta de qualquer pessoa).
-- As 5 funções saem do EXECUTE-para-PUBLIC padrão do Postgres (REVOKE + GRANT só para app_nestjs, ver
-- 06_grants.sql, [06-D-2b]): hoje não é explorável (só app_nestjs conecta), mas é grátis fechar para a
-- função que apaga conta.
-- ============================================================

-- ----------------------------------------------------------------------------
-- Função:     confirmar_email_por_token
-- Assinatura: (p_token_hash TEXT) -> BOOLEAN
-- Bloco:      [03-O]
-- Regra:      Recebe o próprio token e resolve o dono sozinha: procura em verificacao_email, confere que não expirou
--             nem foi usado (confirmado_em IS NULL), marca confirmado_em = NOW() e verifica o e-mail do dono daquele
--             token, tudo numa transação. O segredo (o token) É a autorização: elimina a superfície de ataque em vez
--             de só checá-la. Retorna TRUE se confirmou, FALSE se o token não existe, expirou ou já foi usado (o
--             NestJS decide a mensagem de erro).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirmar_email_por_token(p_token_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_usuario INT;
BEGIN
    UPDATE verificacao_email
    SET confirmado_em = NOW()
    WHERE token_hash = p_token_hash
      AND confirmado_em IS NULL
      AND expira_em > NOW()
    RETURNING id_usuario INTO v_id_usuario;

    IF v_id_usuario IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE usuario SET email_verificado = TRUE WHERE id_usuario = v_id_usuario;
    RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     registrar_falha_login
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-O]
-- Regra:      Incrementa tentativas_login_falhas; ao atingir configuracoes.limite_tentativas_login, bloqueia a conta
--             por configuracoes.bloqueio_login_minutos (nenhum número fixo: os dois são configuráveis pelo Painel
--             Admin). SEM AUTORIZAÇÃO DE PROPÓSITO (pré-autenticação, ver [03-O] acima): o endpoint de login PRECISA
--             derivar p_id_usuario do e-mail informado, nunca aceitar um id vindo do cliente (vetor de DoS).
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
-- Bloco:      [03-O]
-- Regra:      Zera tentativas_login_falhas e limpa bloqueado_ate. SEMPRE ação de suporte/admin sobre a conta de outra
--             pessoa (quem está bloqueado não consegue logar para chamar nada; registrar_login_sucesso() já faz o
--             mesmo reset quando o login dá certo). Exige a permissão usuario_desbloquear.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.liberar_bloqueio_login(p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('usuario_desbloquear') THEN
        RAISE EXCEPTION 'Sem permissão para desbloquear login.';
    END IF;

    UPDATE usuario
    SET tentativas_login_falhas = 0, bloqueado_ate = NULL
    WHERE id_usuario = p_id_usuario;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     registrar_login_sucesso
-- Assinatura: (p_id_usuario INT, p_ip TEXT) -> VOID
-- Bloco:      [03-O]
-- Regra:      Grava ultimo_login_em/ultimo_login_ip e zera o estado de falha (tentativas_login_falhas, bloqueado_ate):
--             um login bem sucedido sempre limpa o histórico de tentativas. p_ip é TEXT (não VARCHAR(45), o tipo da
--             coluna) de propósito, para evitar ambiguidade de modificador de tipo na assinatura usada por GRANT
--             EXECUTE. SEM AUTORIZAÇÃO DE PROPÓSITO (pré-autenticação, como registrar_falha_login): p_id_usuario vem
--             do e-mail/senha já validados nesta mesma chamada de login, nunca do cliente.
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
-- Função:     registrar_exportacao_dados
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-O]
-- Regra:      Deixa rastro em log_auditoria a cada chamada de GET /usuario/eu/exportar-dados (LGPD Art. 18).
--             app_nestjs só tem SELECT em log_auditoria (06): quem grava é a trigger fn_log_auditoria() (05), para
--             ninguém forjar o histórico; SECURITY DEFINER contorna isso só para este propósito, sem abrir INSERT
--             geral. p_id_usuario é sempre o próprio usuário autenticado (o endpoint não aceita :id).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_exportacao_dados(p_id_usuario INT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel)
    VALUES ('usuario', p_id_usuario::TEXT, 'EXPORT', p_id_usuario);
$$;

-- ----------------------------------------------------------------------------
-- Função:     excluir_conta_usuario
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-O]
-- Regra:      RNF-003 (LGPD): marca deletado = TRUE e grava deletado_em/deletado_por (Art. 37: quem fez e quando).
--             Via de mão única de propósito: não existe função para reverter. O próprio usuário exclui a própria
--             conta sem permissão nenhuma; quem tem usuario_excluir (só o admin, auto-atribuída por
--             trg_admin_recebe_toda_permissao) exclui a de outra pessoa.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.excluir_conta_usuario(p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_imagem_perfil INT;
BEGIN
    IF NOT (p_id_usuario = public.id_usuario_atual() OR public.tem_permissao('usuario_excluir')) THEN
        RAISE EXCEPTION 'Sem permissão para excluir a conta de outro usuário.';
    END IF;

    SELECT id_imagem_perfil INTO v_id_imagem_perfil
    FROM usuario WHERE id_usuario = p_id_usuario;

    UPDATE usuario
    SET deletado = TRUE, deletado_em = NOW(), deletado_por = public.id_usuario_atual()
    WHERE id_usuario = p_id_usuario;

    -- Desativa a foto de
    -- perfil vinculada na mesma transação - sem isto, a linha em `arquivo`
    -- ficava ativo=true pra sempre, mesmo com a conta dona já excluída.
    -- SECURITY DEFINER bypassa pol_arquivo_update DE PROPÓSITO aqui: quem
    -- executou a exclusão da conta já foi autorizado acima (dono OU
    -- 'usuario_excluir') - não faz sentido também exigir 'arquivo_gerenciar'
    -- ou posse sobre o arquivo em si só pra essa consequência automática.
    -- Os BYTES de verdade no bucket NÃO são apagados aqui - Postgres não
    -- fala com o provedor de armazenamento (B2/R2/Supabase Storage). Isso é
    -- feito depois, do lado da aplicação (ver
    -- nest/src/1-usuario/service/usuario.service.remove.ts), que lê
    -- `arquivo.chave` (ainda intacta, só `ativo` mudou) e chama
    -- armazenamento.excluirObjeto().
    IF v_id_imagem_perfil IS NOT NULL THEN
        UPDATE arquivo
        SET ativo = FALSE, desativado_em = NOW()
        WHERE id_arquivo = v_id_imagem_perfil;
    END IF;
END;
$$;

-- ============================================================
-- Função:     suspender_pesquisador
-- Assinatura: (p_id_usuario INT) -> BOOLEAN
-- Bloco:      [03-P]
-- Regra:      Exige 'usuario_suspender'. Marca o perfil como suspenso (com p_ate/p_motivo: motivo obrigatório,
--             visível para o próprio pesquisador; o login continua normal, só a autoridade de pesquisador é
--             suspensa) e, na mesma transação, aplica a cascata do RF-084: encerra as campanhas ativas e rejeita as
--             'aguardando_aprovacao' (uma linha em historico_rejeicao por campanha; rascunhos não são tocados).
--             SECURITY DEFINER bypassa a RLS de campanha, mas NÃO a trg_campanha_valida_transicao (05, [05-K-2]),
--             que tem um ramo autoverificável para este caso. Expira sozinha via reativar_pesquisadores_vencidos()
--             (05). Retorna FALSE sem fazer nada se já estava suspenso (idempotente).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspender_pesquisador(
    p_id_usuario INT,
    p_ate TIMESTAMPTZ,
    p_motivo TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_linhas INT;
BEGIN
    IF NOT public.tem_permissao('usuario_suspender') THEN
        RAISE EXCEPTION 'Sem permissão para suspender pesquisador.';
    END IF;
    IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
        RAISE EXCEPTION 'Motivo da suspensão é obrigatório.';
    END IF;

    UPDATE perfil_pesquisador
    SET status_pesquisador = 'suspenso',
        suspenso_ate = p_ate,
        motivo_suspensao = p_motivo,
        suspenso_por = public.id_usuario_atual()
    WHERE id_usuario = p_id_usuario AND status_pesquisador <> 'suspenso';

    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    IF v_linhas = 0 THEN
        RETURN FALSE;
    END IF;

    UPDATE campanha SET status = 'encerrado_moderacao'
    WHERE id_usuario = p_id_usuario AND status = 'ativo';

    -- CTE + INSERT numa instrução só: as linhas devolvidas pelo UPDATE
    -- alimentam o histórico sem precisar de laço nem de segunda leitura.
    WITH rejeitadas AS (
        UPDATE campanha SET status = 'rejeitado'
        WHERE id_usuario = p_id_usuario AND status = 'aguardando_aprovacao'
        RETURNING id_campanha, id_usuario, titulo
    )
    INSERT INTO historico_rejeicao (id_campanha, id_usuario_dono, titulo_campanha, id_admin, justificativa)
    SELECT id_campanha, id_usuario, titulo, public.id_usuario_atual(),
           'Rejeitada automaticamente por suspensão do pesquisador.'
    FROM rejeitadas;

    RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     reativar_pesquisador
-- Assinatura: (p_id_usuario INT) -> BOOLEAN
-- Bloco:      [03-P]
-- Regra:      Devolve status_pesquisador para 'ativo' (a capacidade de criar campanha nova) e limpa
--             suspenso_ate/motivo_suspensao/suspenso_por (CK_PERFIL_PESQUISADOR_SUSPENSAO exige os 3 juntos ou
--             nenhum). NÃO toca em nenhuma campanha, de propósito: o dinheiro das campanhas fechadas por
--             suspender_pesquisador() já começou a se mexer (devolução ao doador ou repasse, no NestJS/gateway), e
--             reabri-las prometeria algo que a plataforma não cumpre. Só campanha NOVA é afetada. Mesma permissão
--             de suspender_pesquisador().
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reativar_pesquisador(p_id_usuario INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_linhas INT;
BEGIN
    IF NOT public.tem_permissao('usuario_suspender') THEN
        RAISE EXCEPTION 'Sem permissão para reativar pesquisador.';
    END IF;

    UPDATE perfil_pesquisador
    SET status_pesquisador = 'ativo',
        suspenso_ate = NULL,
        motivo_suspensao = NULL,
        suspenso_por = NULL
    WHERE id_usuario = p_id_usuario AND status_pesquisador <> 'ativo';

    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    RETURN v_linhas > 0;
END;
$$;

-- [03-Q] corrigir_cpf_pesquisador: GRANT UPDATE de coluna sozinho não bastava. pol_perfil_update (04) libera
-- UPDATE para o próprio dono, e cpf_criptografado estava no GRANT UPDATE: o próprio pesquisador trocaria o
-- CPF por um PATCH comum, contrariando o RF-017 (correção de CPF é só via suporte). cpf_criptografado
-- saiu do GRANT UPDATE (06); esta função é o único caminho, gateada por perfil_pesquisador_corrigir_cpf
-- (ver 07), para o papel de suporte/admin, nunca para o próprio pesquisador. Recebe cpf_criptografado E
-- cpf_hash já prontos (calculados no Nest, ver commons/seguranca/cpf-cifra.util.ts): a função não sabe
-- cifrar nem calcular HMAC, só grava o que o backend preparou, depois de checar permissão.
CREATE OR REPLACE FUNCTION public.corrigir_cpf_pesquisador(
    p_id_usuario INT,
    p_cpf_criptografado TEXT,
    p_cpf_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_linhas INT;
BEGIN
    IF NOT public.tem_permissao('perfil_pesquisador_corrigir_cpf') THEN
        RAISE EXCEPTION 'Sem permissão para corrigir CPF de pesquisador.';
    END IF;

    UPDATE perfil_pesquisador
    SET cpf_criptografado = p_cpf_criptografado,
        cpf_hash = p_cpf_hash
    WHERE id_usuario = p_id_usuario;

    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    RETURN v_linhas > 0;
END;
$$;

-- [03-R] criar_perfil_pesquisador_para_outro: POST /perfil-pesquisador (self-service,
-- PerfilPesquisadorServiceCreate) SEMPRE usa id_usuario_atual() como dono, pois pol_perfil_insert (04) exige
-- id_usuario = id_usuario_atual(); criar perfil para outra pessoa logado como Admin colidia com o PRÓPRIO
-- perfil do Admin (already exists) e não criava nada para ninguém. Esta função é o caminho SEPARADO,
-- gateado por perfil_pesquisador_criar_para_outro (ver 07), para suporte/admin criar perfil em nome de
-- outra pessoa; o self-service não a usa. Recebe CPF já cifrado/hashed (calculado no Nest, mesma fronteira
-- de corrigir_cpf_pesquisador, acima): a função não sabe cifrar nem calcular HMAC.
CREATE OR REPLACE FUNCTION public.criar_perfil_pesquisador_para_outro(
    p_id_usuario INT,
    p_cpf_criptografado TEXT,
    p_cpf_hash TEXT,
    p_tipo_vinculo tipo_vinculo,
    p_vinculo_institucional TEXT,
    p_titulo_academico titulo_academico
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('perfil_pesquisador_criar_para_outro') THEN
        RAISE EXCEPTION 'Sem permissão para criar perfil de pesquisador em nome de outro usuário.';
    END IF;

    INSERT INTO perfil_pesquisador (
        id_usuario, cpf_criptografado, cpf_hash,
        tipo_vinculo, vinculo_institucional, titulo_academico
    )
    VALUES (
        p_id_usuario, p_cpf_criptografado, p_cpf_hash,
        p_tipo_vinculo, p_vinculo_institucional, p_titulo_academico
    );
END;
$$;

-- [03-S] criar_campanha_para_outro: pol_campanha_insert (04) exige id_usuario = id_usuario_atual() E
-- pesquisador ativo, então não dá para criar em nome de um pesquisador escolhido sem personificação (mesma
-- classe de criar_perfil_pesquisador_para_outro, [03-R]). Esta função é o caminho separado, gateado por
-- campanha_criar_para_outro (ver 07); o self-service (POST /campanha) não a usa. Continua exigindo
-- pesquisador ATIVO (mesma regra do self-service, checada aqui em vez de RLS): só troca QUEM pode disparar
-- o INSERT em nome de outro. Validação de prazo/meta/limite de campanhas simultâneas NÃO é duplicada aqui:
-- continua toda em trigger (05_regras_negocio.sql) e dispara igual para INSERT via SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.criar_campanha_para_outro(
    p_id_usuario INT,
    p_id_area_conhecimento INT,
    p_titulo TEXT,
    p_modelo modelo_campanha,
    p_meta_financeira DECIMAL,
    p_descricao TEXT,
    p_data_inicio TIMESTAMPTZ,
    p_data_fim TIMESTAMPTZ,
    p_video_apresentacao_url TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_campanha INT;
BEGIN
    IF NOT public.tem_permissao('campanha_criar_para_outro') THEN
        RAISE EXCEPTION 'Sem permissão para criar campanha em nome de outro pesquisador.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM perfil_pesquisador
        WHERE id_usuario = p_id_usuario AND status_pesquisador = 'ativo'
    ) THEN
        RAISE EXCEPTION 'O usuário escolhido não é um pesquisador ativo.';
    END IF;

    INSERT INTO campanha (
        id_usuario, id_area_conhecimento, titulo, modelo,
        meta_financeira, descricao, data_inicio, data_fim, video_apresentacao_url
    )
    VALUES (
        p_id_usuario, p_id_area_conhecimento, p_titulo, COALESCE(p_modelo, 'all-or-nothing'),
        p_meta_financeira, p_descricao, p_data_inicio, p_data_fim, p_video_apresentacao_url
    )
    RETURNING id_campanha INTO v_id_campanha;

    RETURN v_id_campanha;
END;
$$;

-- [03-T] forcar_exclusao_campanha: o Admin precisa poder excluir forçadamente uma campanha (senão o Campo
-- de Testes fica sujo). IGNORA o status de propósito: pol_campanha_delete (04) só libera 'rascunho',
-- proteção correta para campanha REAL, com contribuição/repasse em andamento, que continua intacta para o
-- DELETE normal. Gateada por campanha_excluir_forcado (ver 07), NUNCA reaproveitando campanha_editar: um
-- papel futuro com campanha_editar (ex.: moderador) não ganha este poder destrutivo de brinde. É
-- ferramenta de bancada; não deve virar endpoint exposto no painel real de Gestão de Campanhas.
CREATE OR REPLACE FUNCTION public.forcar_exclusao_campanha(p_id_campanha INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_linhas INT;
BEGIN
    IF NOT public.tem_permissao('campanha_excluir_forcado') THEN
        RAISE EXCEPTION 'Sem permissão para excluir campanha à força.';
    END IF;

    DELETE FROM campanha WHERE id_campanha = p_id_campanha;
    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    RETURN v_linhas > 0;
END;
$$;

-- ============================================================
-- Função:     suspender_usuario
-- Assinatura: (p_id_usuario INT, p_ate TIMESTAMPTZ, p_motivo TEXT) -> VOID
-- Bloco:      [03-N]
-- Regra:      Exige 'usuario_suspender' (mesma permissão de suspender_pesquisador, [03-P]: mesma categoria de ação
--             administrativa). Motivo OBRIGATÓRIO (RAISE EXCEPTION se vazio): reforça em código o
--             CK_USUARIO_SUSPENSAO (01) com uma mensagem melhor que o erro cru de CHECK. "Reduzir a pena" usa esta
--             MESMA função de novo, com uma p_ate mais próxima: suspender de novo já sobrescreve.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspender_usuario(p_id_usuario INT, p_ate TIMESTAMPTZ, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('usuario_suspender') THEN
        RAISE EXCEPTION 'Sem permissão para suspender usuário.';
    END IF;
    IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
        RAISE EXCEPTION 'Motivo da suspensão é obrigatório.';
    END IF;

    UPDATE usuario
    SET suspenso_ate = p_ate,
        motivo_suspensao = p_motivo,
        suspenso_por = public.id_usuario_atual()
    WHERE id_usuario = p_id_usuario;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     revogar_suspensao_usuario
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-N]
-- Regra:      Desbanir - limpa os 3 campos de uma vez (CK_USUARIO_SUSPENSAO,
--             01, exige isso: os 3 juntos ou nenhum). Mesma permissão de
--             suspender (quem pode suspender pode reverter).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revogar_suspensao_usuario(p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('usuario_suspender') THEN
        RAISE EXCEPTION 'Sem permissão para revogar suspensão de usuário.';
    END IF;

    UPDATE usuario
    SET suspenso_ate = NULL,
        motivo_suspensao = NULL,
        suspenso_por = NULL
    WHERE id_usuario = p_id_usuario;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     suspender_papel_usuario / revogar_suspensao_papel_usuario
-- Assinatura: (p_id_usuario INT, p_id_papel INT, p_ate TIMESTAMPTZ) -> VOID /
--             (p_id_usuario INT, p_id_papel INT) -> VOID
-- Bloco:      [03-N]
-- Regra:      Exige 'papel_gerenciar' (não 'usuario_suspender'): suspender UM papel é decisão de RBAC (o que aquela
--             pessoa pode fazer), não de moderação de conta inteira; mesma permissão que governa a matriz Papel x
--             Permissão. Preferível a REMOVER o vínculo porque preserva quando foi atribuído e volta sozinho no
--             prazo; tem_permissao() ([03-B]) ignora papel com suspenso_ate no futuro.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspender_papel_usuario(p_id_usuario INT, p_id_papel INT, p_ate TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('papel_gerenciar') THEN
        RAISE EXCEPTION 'Sem permissão para suspender papel de usuário.';
    END IF;

    UPDATE usuario_papel
    SET suspenso_ate = p_ate
    WHERE id_usuario = p_id_usuario AND id_papel = p_id_papel;
END;
$$;

CREATE OR REPLACE FUNCTION public.revogar_suspensao_papel_usuario(p_id_usuario INT, p_id_papel INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('papel_gerenciar') THEN
        RAISE EXCEPTION 'Sem permissão para revogar suspensão de papel de usuário.';
    END IF;

    UPDATE usuario_papel
    SET suspenso_ate = NULL
    WHERE id_usuario = p_id_usuario AND id_papel = p_id_papel;
END;
$$;

-- ============================================================
-- Função:     contar_metricas_dashboard
-- Assinatura: () -> TABLE(total_usuarios INT, total_pesquisadores INT, total_papeis INT,
--             total_permissoes INT, total_configuracoes INT, total_campanhas INT, sessoes_ativas
--             INT)
-- Bloco:      [03-M]
-- Regra:      GET /dashboard/resumo (nest/src/28-dashboard) precisa de totais confiáveis para os cards do painel. RLS
--             filtra LINHA e não é uniforme entre as tabelas (`usuario` só libera não-deletado, `configuracoes` só a
--             linha global ou a da própria sessão): um COUNT direto de app_nestjs devolveria números DIFERENTES
--             conforme quem está logado, errado para "total do sistema" (mesmo raciocínio de
--             contar_seguidores_pesquisador, [03-E]). Uma função só devolvendo TABLE porque o NestJS sempre pede os
--             números juntos. Sem contagem de log_auditoria de propósito (ela tem o próprio painel "Ver log").
--             Exige a permissão relatorio_visualizar (ERRCODE 92011).
CREATE OR REPLACE FUNCTION public.contar_metricas_dashboard()
RETURNS TABLE (
    total_usuarios                 INT,
    total_pesquisadores            INT,
    total_papeis                   INT,
    total_permissoes                INT,
    total_configuracoes            INT,
    total_campanhas                INT,
    sessoes_ativas                  INT,
    campanhas_ativas                INT,
    campanhas_sucesso               INT,
    campanhas_nao_atingida          INT,
    campanhas_aguardando_aprovacao  INT,
    valor_total_arrecadado          DECIMAL(14,2),
    denuncias_pendentes             INT,
    campanhas_para_revisao_score    INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.tem_permissao('relatorio_visualizar') THEN
        RAISE EXCEPTION 'Sem permissão para ver as métricas do painel.' USING ERRCODE = '92011';
    END IF;
    RETURN QUERY SELECT
        (SELECT count(*)::INT FROM usuario WHERE deletado = FALSE),
        (SELECT count(DISTINCT up.id_usuario)::INT
           FROM usuario_papel up
           JOIN papel p ON p.id_papel = up.id_papel
          WHERE p.codigo = 'pesquisador'),
        (SELECT count(*)::INT FROM papel),
        (SELECT count(*)::INT FROM permissao),
        (SELECT count(*)::INT FROM configuracoes),
        (SELECT count(*)::INT FROM campanha),
        (SELECT count(*)::INT FROM sessao WHERE revogado_em IS NULL AND expira_em > now()),
        (SELECT count(*)::INT FROM campanha WHERE status = 'ativo'),
        (SELECT count(*)::INT FROM campanha WHERE status = 'sucesso'),
        (SELECT count(*)::INT FROM campanha WHERE status = 'nao_atingido'),
        (SELECT count(*)::INT FROM campanha WHERE status = 'aguardando_aprovacao'),
        (SELECT COALESCE(SUM(valor_bruto_arrecadado), 0)::DECIMAL(14,2) FROM campanha),
        (SELECT count(*)::INT FROM denuncia WHERE status = 'pendente'),
        (SELECT count(*)::INT FROM campanha c
          WHERE c.status = 'aguardando_aprovacao' AND public.fn_precisa_revisao_score(c.id_usuario));
END;
$$;

-- [03-U] alterar_perfil_pesquisador_de_outro: o modal de Alterar Usuário (React) chama PATCH
-- /perfil-pesquisador/:id para salvar tipo de vínculo/vínculo institucional/título acadêmico de QUEM está
-- sendo editado, mas pol_perfil_update (04) só libera UPDATE de perfil_pesquisador para o PRÓPRIO dono: um
-- admin editando o perfil de OUTRA pessoa por UPDATE direto resultaria em 0 linhas silenciosas (mesma
-- classe de corrigir_cpf_pesquisador, [03-Q], e criar_perfil_pesquisador_para_outro, [03-R]). Mesma
-- solução: função SECURITY DEFINER gateada por perfil_pesquisador_alterar_de_outro (ver 07), que ignora
-- RLS de propósito; o self-service (PATCH /perfil-pesquisador, sem id, PerfilPesquisadorServiceUpdate) não
-- a usa.
CREATE OR REPLACE FUNCTION public.alterar_perfil_pesquisador_de_outro(
    p_id_usuario INT,
    p_tipo_vinculo tipo_vinculo,
    p_vinculo_institucional TEXT,
    p_titulo_academico titulo_academico
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_linhas INT;
BEGIN
    IF NOT public.tem_permissao('perfil_pesquisador_alterar_de_outro') THEN
        RAISE EXCEPTION 'Sem permissão para alterar perfil de pesquisador de outro usuário.';
    END IF;

    UPDATE perfil_pesquisador
    SET tipo_vinculo = p_tipo_vinculo,
        vinculo_institucional = CASE
            WHEN p_tipo_vinculo = 'institucional' THEN p_vinculo_institucional
            ELSE NULL
        END,
        titulo_academico = p_titulo_academico
    WHERE id_usuario = p_id_usuario;

    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    RETURN v_linhas > 0;
END;
$$;