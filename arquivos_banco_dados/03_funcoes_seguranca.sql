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
-- MOVIDO (28-07-2026, uma IA - "três pontas menores"): morava em
-- 05_regras_negocio.sql, mas 03 (este arquivo, que roda ANTES do 05) já tinha
-- uma função chamando config_numero (registrar_falha_login, [03-O]) - o
-- bootstrap completo funcionava só porque nada CHAMA a função antes da hora;
-- rodar 01→03 isolado e invocar registrar_falha_login já dava "function
-- public.config_numero(unknown, integer) does not exist". Movida pra cá -
-- helper de leitura de configuração encaixa melhor junto das outras funções de
-- segurança/contexto do que junto das regras de negócio de score.
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
-- Regra:      Lê o id do usuário autenticado a partir da variável de sessão app.id_usuario_atual,
--             definida pelo NestJS via SET LOCAL logo no início da transação, após validar o JWT.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C001]
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
-- Regra:      Autorização por capacidade - valida se o usuário atual possui, via algum papel em
--             usuario_papel, a permissão nomeada em papel_permissao (ex.: 'campanha_aprovar'),
--             nunca por nome de papel.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C002]
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
-- Regra:      SECURITY DEFINER de propósito (09-08-2026, Bloco B/C do prompt de uma IA sobre
--             cabeçalho/avatar) - devolve o CÓDIGO (`papel.codigo`, não `papel.nome`) dos papéis de
--             um usuário pra login/refresh (03-auth) decidirem se mostram "Painel Admin" no
--             dropdown do cabeçalho.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C003]
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
-- Regra:      CORRIGIDO - pol_usuario_select (04) já escondia usuario.deletado = TRUE, mas
--             pol_perfil_select e pol_link_select eram USING (TRUE) sem olhar pra esse flag: perfil
--             acadêmico e links de uma conta "excluída" continuavam públicos.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C004]
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
-- Regra:      SECURITY DEFINER de propósito (09-08-2026, Bloco D do prompt do uma IA sobre cadastro
--             público) - grava o aceite dos Termos de Uso (usuario_termo) no MOMENTO do cadastro,
--             quando a conta acabou de ser criada NESTA MESMA requisição e ainda não existe sessão
--             nenhuma (id_usuario_atual() é NULL). ...
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C005]
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
-- Regra:      ADICIONADO (28-07-2026) - pol_seg_pesq_select/pol_seg_campanha_select (04) só liberam
--             SELECT das próprias linhas de "quem eu sigo"; ninguém consegue contar quantos
--             seguidores um pesquisador/campanha tem, nem o próprio dono.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C006]
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
-- [03-O] OPERAÇÕES DE AUTENTICAÇÃO (item "Problema 1" - uma IA, 28-07-2026)
-- Descrição: email_verificado, tentativas_login_falhas, bloqueado_ate,
--            ultimo_login_em, ultimo_login_ip e deletado saíram do GRANT UPDATE
--            de usuario (06, [06-D-2]) - restringir só por coluna não bastava,
--            porque é o MESMO app_nestjs que atende o endpoint genérico de
--            "editar meu perfil" e o fluxo de autenticação; nenhuma lista de
--            colunas separa os dois papéis. Testado numa auditoria de IA,
--            simulando um usuário comum, via UPDATE direto: auto-verificar o próprio e-mail sem
--            clicar no link (bypass permanente), limpar o próprio bloqueio de
--            login, e "ressuscitar" a própria conta excluída. As funções abaixo
--            são o único jeito de mudar essas colunas dali em diante - mesmo
--            padrão de atribuir_papel_padrao/recalcular_score_pesquisador:
--            SECURITY DEFINER, ponto único e auditável por operação nomeada, em
--            vez de UPDATE aberto.
--
-- CORRIGIDO (28-07-2026, 2ª auditoria de uma IA - "SECURITY DEFINER troca um
-- furo por outro se a função não checar quem está chamando"): a 1ª versão dessas
-- funções aceitava qualquer p_id_usuario sem checagem nenhuma - SECURITY DEFINER
-- desliga a RLS, então a função vira a ÚNICA guardiã, e a 1ª versão não guardava
-- nada. Testado numa auditoria de IA, simulando um usuário comum (id 9) chamando
-- excluir_conta_usuario(2)/liberar_bloqueio_login(2)/confirmar_email_usuario(2):
-- todas executavam - um usuário comum conseguia excluir a conta de QUALQUER outra
-- pessoa. Pior que o GRANT UPDATE aberto que essas funções vieram substituir (lá
-- pelo menos pol_usuario_update restringia a id_usuario_atual() = id_usuario).
-- Três correções diferentes, uma por categoria de função:
--   1. excluir_conta_usuario/liberar_bloqueio_login: ganharam checagem de
--      autorização própria (tem_permissao() - ver cada uma abaixo).
--   2. confirmar_email_usuario virou confirmar_email_por_token: em vez de confiar
--      num id_usuario vindo de fora, a função recebe o TOKEN (o segredo) e resolve
--      o dono sozinha - elimina a superfície de ataque por completo, não só
--      restringe.
--   3. registrar_falha_login/registrar_login_sucesso NÃO têm como se autorizar:
--      rodam durante o login, antes de existir sessão - id_usuario_atual() é NULL
--      ali por definição, o banco não tem como ajudar. Documentado em cada uma:
--      são de confiança do backend, e o endpoint de login precisa derivar o id do
--      e-mail informado, nunca aceitar o id do cliente (registrar_falha_login com
--      id arbitrário é vetor de negação de serviço - dá pra bloquear a conta de
--      qualquer pessoa chamando 5 vezes).
-- Higiene adicional: as 5 funções saem do EXECUTE-para-PUBLIC padrão do Postgres
-- (REVOKE + GRANT só pra app_nestjs, ver 06_grants.sql, [06-D-2b]) - hoje não é
-- explorável (só app_nestjs conecta ao banco), mas é grátis fechar pra função que
-- apaga conta.
-- ============================================================

-- ----------------------------------------------------------------------------
-- Função:     confirmar_email_por_token
-- Assinatura: (p_token_hash TEXT) -> BOOLEAN
-- Bloco:      [03-O]
-- Regra:      SUBSTITUI confirmar_email_usuario(p_id_usuario) - em vez de confiar num id vindo de
--             fora (que o NestJS resolvia depois de validar o token, mas a função em si aceitava
--             qualquer id), a função recebe o próprio token e resolve o dono sozinha: procura em
--             verificacao_email, confere que não expirou nem foi ...
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C007]
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
-- Regra:      Incrementa tentativas_login_falhas; ao atingir configuracoes.limite_tentativas_login,
--             bloqueia a conta por configuracoes.bloqueio_login_minutos (nenhum número fixo - os
--             dois são configuráveis pelo Painel Admin, mesmo padrão dos outros limites do item 16
--             da Lista C).
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C008]
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
-- Regra:      Zera tentativas_login_falhas e limpa bloqueado_ate.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C009]
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
-- Regra:      Grava ultimo_login_em/ultimo_login_ip e zera o estado de falha
--             (tentativas_login_falhas, bloqueado_ate) - um login bem sucedido sempre limpa o
--             histórico de tentativas anteriores. p_ip é TEXT (não VARCHAR(45), o tipo da coluna)
--             de propósito - evita ambiguidade de modificador de tipo na assinatura da ...
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C010]
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
-- Regra:      Item 7 de PENDENCIAS (exportação de dados do usuário, LGPD Art. 18) - deixa rastro em
--             log_auditoria a cada chamada de GET /usuario/eu/exportar-dados.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C011]
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
-- Regra:      RNF-003 (LGPD) - marca a conta como deletado = TRUE.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C012]
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

    -- ADICIONADO (30-08-2026, módulo 25-arquivo): desativa a foto de
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
-- Regra:      30-07-2026 - RF-084 dizia que suspender um pesquisador encerra automaticamente as
--             campanhas ativas dele e rejeita as pendentes, mas não existia NENHUM caminho no banco
--             pra suspender alguém: `pol_perfil_update` (04) só libera UPDATE em perfil_pesquisador
--             pro próprio dono (id_usuario = ...
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C013]
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
-- Regra:      30-07-2026 (item 60, PENDENCIAS.md - recomendação de uma IA, confirmada pelo Lucas).
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C014]
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

-- [03-Q] corrigir_cpf_pesquisador - ADICIONADA (22-08-2026), mesmo motivo de
-- suspender_pesquisador/reativar_pesquisador acima: GRANT UPDATE de coluna
-- sozinho não bastava. pol_perfil_update (04) libera UPDATE pro próprio
-- dono, e cpf_criptografado estava dentro do GRANT UPDATE - ou seja, o
-- próprio pesquisador conseguia trocar o próprio CPF por um PATCH comum,
-- contrariando o RF-017 (correção de CPF é só via suporte). cpf_criptografado
-- saiu do GRANT UPDATE (06); esta função é o único caminho que resta,
-- gateada por uma permissão nova (perfil_pesquisador_corrigir_cpf, ver 07),
-- pensada pra ficar com o papel de suporte/admin, nunca com o próprio
-- pesquisador. Recebe cpf_criptografado E cpf_hash já prontos (calculados no
-- Nest, ver commons/seguranca/cpf-cifra.util.ts) - a função não sabe cifrar
-- nem calcular HMAC, só grava o que o backend já preparou, depois de checar
-- permissão.
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

-- [03-R] criar_perfil_pesquisador_para_outro - ADICIONADA (07-09-2026),
-- achado testando "promover outro usuário pra pesquisador" na Bancada do
-- Pesquisador (Campo de Testes, hoje parte permanente do painel):
-- POST /perfil-pesquisador (self-service, PerfilPesquisadorServiceCreate)
-- SEMPRE usa id_usuario_atual() como dono - pol_perfil_insert (04) exige
-- id_usuario = id_usuario_atual(), então tentar criar perfil pra outra
-- pessoa logado como Admin sempre colidia com o PRÓPRIO perfil do Admin
-- (already exists), nunca criava nada pra ninguém - silencioso e enganoso.
-- Esta função é o caminho SEPARADO, gateado por permissão própria
-- (perfil_pesquisador_criar_para_outro, ver 07), pensado pra suporte/admin
-- de verdade criar perfil em nome de outra pessoa - nunca reaproveitada
-- pelo self-service, que continua exatamente como estava. Recebe CPF já
-- cifrado/hashed (calculado no Nest, mesma fronteira de corrigir_cpf_
-- pesquisador, acima) - a função não sabe cifrar nem calcular HMAC.
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

-- [03-S] criar_campanha_para_outro - ADICIONADA (08-09-2026), mesma classe
-- de achado de criar_perfil_pesquisador_para_outro ([03-R], acima):
-- "Criar campanha" saiu do Campo de Testes em 25-08-2026 (remoção do
-- Elenco) porque pol_campanha_insert (04) exige id_usuario =
-- id_usuario_atual() E pesquisador ativo - não dava mais pra "criar em
-- nome de" um pesquisador escolhido sem personificação. Esta função é o
-- caminho separado, gateado por permissão própria
-- (campanha_criar_para_outro, ver 07) - o self-service (POST /campanha)
-- continua exatamente como estava. Continua exigindo pesquisador ATIVO
-- (mesma regra de negócio do self-service, só que checada aqui em vez de
-- RLS) - não é bypass da regra, só troca QUEM pode disparar o INSERT em
-- nome de outro. Nenhuma validação de prazo/meta/limite de campanhas
-- simultâneas duplicada aqui de propósito - continua tudo em trigger
-- (05_regras_negocio.sql), dispara igual pra INSERT via SECURITY DEFINER.
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

-- [03-T] forcar_exclusao_campanha - ADICIONADA (08-09-2026), pedido do
-- Lucas: "o Admin, o todo poderoso, precisa poder excluir forçadamente
-- uma campanha, senão o Campo de Testes vai ficar muito sujo". Diferente
-- de campanha_excluir_forcado, isto IGNORA status de propósito (pol_
-- campanha_delete, 04, só libera 'rascunho' (era 'aguardando_aprovacao'
-- até 20-09-2026) - proteção
-- correta pra campanha REAL, com contribuição/repasse em andamento, que
-- continua intacta pro DELETE normal). Gateada por permissão própria
-- (campanha_excluir_forcado, ver 07) - NUNCA reaproveitando
-- campanha_editar de propósito: qualquer papel futuro com campanha_editar
-- (ex.: um moderador) não ganha este poder destrutivo de brinde, sem
-- decisão explícita. Decisão do Lucas (confirmada antes de implementar):
-- fica só uma ferramenta de bancada - o painel real de Gestão de
-- Campanhas nem tem Excluir hoje (só Consultar), e não é pra esta função
-- virar endpoint exposto lá.
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
-- Regra:      Exige 'usuario_suspender' (mesma permissão de suspender_pesquisador, [03-P] - é a
--             mesma categoria de ação administrativa).
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C015]
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
-- Regra:      Exige 'papel_gerenciar' (não 'usuario_suspender') - suspender UM papel é decisão de
--             RBAC (o que aquela pessoa pode fazer), não de moderação de conta inteira; mesma
--             permissão que já governa a matriz Papel × Permissão.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C016]
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
-- Regra:      08-08-2026 - GET /dashboard/resumo (nest/src/28-dashboard) precisa de totais
--             confiáveis pros cards da tela inicial do painel.
-- Histórico e porquês: HISTORICO_COMENTARIOS_SQL.md [03-C017]
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

-- [03-U] alterar_perfil_pesquisador_de_outro - ADICIONADA (14-09-2026),
-- achado rodando o painel admin de verdade: o modal de Alterar Usuário
-- (React) chama PATCH /perfil-pesquisador/:id pra salvar tipo de vínculo/
-- vínculo institucional/título acadêmico de QUEM está sendo editado, desde
-- 13-09-2026 - mas nenhuma rota nem função dava suporte a isso. O motivo:
-- pol_perfil_update (04) só libera UPDATE de perfil_pesquisador pro
-- PRÓPRIO dono (id_usuario = id_usuario_atual()), então um admin editando
-- o perfil de OUTRA pessoa por UPDATE direto sempre resultaria em 0
-- linhas silenciosas - mesma classe de bug já resolvida em
-- corrigir_cpf_pesquisador ([03-Q]) e criar_perfil_pesquisador_para_outro
-- ([03-R]), acima. Mesma solução: função SECURITY DEFINER, gateada por
-- permissão própria (perfil_pesquisador_alterar_de_outro, ver 07), que
-- ignora RLS de propósito - o self-service (PATCH /perfil-pesquisador,
-- sem id, PerfilPesquisadorServiceUpdate) continua exatamente como estava,
-- nunca reaproveitando esta função.
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