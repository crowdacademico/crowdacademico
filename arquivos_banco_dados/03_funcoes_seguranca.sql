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
--  têm mais GRANT UPDATE direto ([03-O]) — cada uma é SECURITY DEFINER,
--  ponto único e auditável, em vez de UPDATE aberto.
-- ============================================================
-- [03-C] CONFIG — HELPER DE LEITURA
-- ============================================================
-- ----------------------------------------------------------------------------
-- Função:     config_numero
-- Assinatura: (p_chave TEXT, p_padrao DECIMAL) -> DECIMAL
-- Bloco:      [03-C]
-- Regra:      Lê uma constante numérica da tabela configuracoes com fallback
--             seguro — nunca retorna NULL/erro mesmo se a chave ainda não
--             existir. Usada por praticamente todo o resto do banco (score,
--             limites de negócio em 05, e as funções de autenticação de
--             [03-O], neste mesmo arquivo).
-- MOVIDO (28-07-2026, Claude Web — "três pontas menores"): morava em
-- 05_regras_negocio.sql, mas 03 (este arquivo, que roda ANTES do 05) já tinha
-- uma função chamando config_numero (registrar_falha_login, [03-O]) — o
-- bootstrap completo funcionava só porque nada CHAMA a função antes da hora;
-- rodar 01→03 isolado e invocar registrar_falha_login já dava "function
-- public.config_numero(unknown, integer) does not exist". Movida pra cá —
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
-- AMPLIADA (09-08-2026, Bloco G do prompt do Claude Web — moderação):
-- passou a ignorar vínculo usuario_papel com suspenso_ate no futuro (ver
-- [01-B]) — um papel suspenso não concede mais nenhuma permissão dele
-- enquanto durar a suspensão, sem precisar remover o vínculo (volta
-- sozinho quando o prazo passa). Escopo desta mudança: só ignora PAPEL
-- suspenso, não checa suspensão de CONTA (usuario.suspenso_ate) — isso é
-- barrado no LOGIN (3-auth), mesmo raciocínio já usado pra bloqueado_ate;
-- um access token emitido pouco antes de uma suspensão de conta continua
-- válido até expirar (15min, JWT_ACCESS_EXPIRES_IN), risco residual aceito
-- de propósito, coerente com o resto do desenho de sessão do projeto.
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
-- Regra:      SECURITY DEFINER de propósito (09-08-2026, Bloco B/C do prompt
--             do Claude Web sobre cabeçalho/avatar) — devolve o CÓDIGO
--             (`papel.codigo`, não `papel.nome`) dos papéis de um usuário
--             pra login/refresh (03-auth) decidirem se mostram "Painel
--             Admin" no dropdown do cabeçalho. `codigo`, não `nome`, pelo
--             mesmo motivo já documentado em [01-B]/alterar-papel.jsx: o
--             RÓTULO exibido (`nome`) é editável pelo painel — se essa
--             checagem lesse `nome`, renomear o papel "admin" pra outra
--             coisa quebraria silenciosamente a condição "é admin?" no
--             frontend. `codigo` nunca é exposto/editável, só `nome`.
--             Chamada de DENTRO do próprio login/refresh, onde
--             id_usuario_atual() ainda é NULL (a sessão que autorizaria
--             esse usuário está sendo criada NESTA MESMA requisição) —
--             pol_usuariopapel_select (04) exige id_usuario_atual() =
--             idUsuario OU tem_permissao('papel_gerenciar'), nenhum dos
--             dois é verdade ainda nesse momento; sem SECURITY DEFINER a
--             RLS devolveria 0 linhas sempre, mesmo pro dono da própria
--             sessão.
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

-- ----------------------------------------------------------------------------
-- Função:     registrar_aceite_termo
-- Assinatura: (p_id_usuario INT, p_id_termo INT, p_ip TEXT) -> VOID
-- Bloco:      [03-D-1]
-- Regra:      SECURITY DEFINER de propósito (09-08-2026, Bloco D do prompt do
--             Claude Web sobre cadastro público) — grava o aceite dos Termos
--             de Uso (usuario_termo) no MOMENTO do cadastro, quando a conta
--             acabou de ser criada NESTA MESMA requisição e ainda não existe
--             sessão nenhuma (id_usuario_atual() é NULL). pol_usuario_termo_
--             insert (04) exige id_usuario = id_usuario_atual() — verdade
--             pra alguém JÁ logado aceitando um termo novo depois, mas nunca
--             verdade durante o próprio cadastro. Mesmo raciocínio de
--             atribuir_papel_padrao() (08_bootstrap_final.sql, [08-D-1]),
--             chamada no mesmo instante do mesmo jeito.
--             Sem checagem de autorização própria (diferente de
--             excluir_conta_usuario, [03-O]) porque quem decide QUAL
--             p_id_usuario passar é sempre o código do backend (o id do
--             usuário RECÉM-CRIADO na mesma transação, nunca um valor vindo
--             direto do corpo da requisição) — não existe caminho pelo qual
--             um cliente influencie esse parâmetro pra forjar aceite em nome
--             de outra conta. ON CONFLICT DO NOTHING: mesma trava de
--             UK_USUARIO_TERMO_USUARIO_TERMO (01), idempotente se chamada
--             de novo por engano.
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
-- [03-O] OPERAÇÕES DE AUTENTICAÇÃO (item "Problema 1" — Claude Web, 28-07-2026)
-- Descrição: email_verificado, tentativas_login_falhas, bloqueado_ate,
--            ultimo_login_em, ultimo_login_ip e deletado saíram do GRANT UPDATE
--            de usuario (06, [06-D-2]) — restringir só por coluna não bastava,
--            porque é o MESMO app_nestjs que atende o endpoint genérico de
--            "editar meu perfil" e o fluxo de autenticação; nenhuma lista de
--            colunas separa os dois papéis. Testado (Claude Web) como usuário
--            comum, via UPDATE direto: auto-verificar o próprio e-mail sem
--            clicar no link (bypass permanente), limpar o próprio bloqueio de
--            login, e "ressuscitar" a própria conta excluída. As funções abaixo
--            são o único jeito de mudar essas colunas dali em diante — mesmo
--            padrão de atribuir_papel_padrao/recalcular_score_pesquisador:
--            SECURITY DEFINER, ponto único e auditável por operação nomeada, em
--            vez de UPDATE aberto.
--
-- CORRIGIDO (28-07-2026, 2ª auditoria do Claude Web — "SECURITY DEFINER troca um
-- furo por outro se a função não checar quem está chamando"): a 1ª versão dessas
-- funções aceitava qualquer p_id_usuario sem checagem nenhuma — SECURITY DEFINER
-- desliga a RLS, então a função vira a ÚNICA guardiã, e a 1ª versão não guardava
-- nada. Testado (Claude Web) como usuário comum (id 9) chamando
-- excluir_conta_usuario(2)/liberar_bloqueio_login(2)/confirmar_email_usuario(2):
-- todas executavam — um usuário comum conseguia excluir a conta de QUALQUER outra
-- pessoa. Pior que o GRANT UPDATE aberto que essas funções vieram substituir (lá
-- pelo menos pol_usuario_update restringia a id_usuario_atual() = id_usuario).
-- Três correções diferentes, uma por categoria de função:
--   1. excluir_conta_usuario/liberar_bloqueio_login: ganharam checagem de
--      autorização própria (tem_permissao() — ver cada uma abaixo).
--   2. confirmar_email_usuario virou confirmar_email_por_token: em vez de confiar
--      num id_usuario vindo de fora, a função recebe o TOKEN (o segredo) e resolve
--      o dono sozinha — elimina a superfície de ataque por completo, não só
--      restringe.
--   3. registrar_falha_login/registrar_login_sucesso NÃO têm como se autorizar:
--      rodam durante o login, antes de existir sessão — id_usuario_atual() é NULL
--      ali por definição, o banco não tem como ajudar. Documentado em cada uma:
--      são de confiança do backend, e o endpoint de login precisa derivar o id do
--      e-mail informado, nunca aceitar o id do cliente (registrar_falha_login com
--      id arbitrário é vetor de negação de serviço — dá pra bloquear a conta de
--      qualquer pessoa chamando 5 vezes).
-- Higiene adicional: as 5 funções saem do EXECUTE-para-PUBLIC padrão do Postgres
-- (REVOKE + GRANT só pra app_nestjs, ver 06_grants.sql, [06-D-2b]) — hoje não é
-- explorável (só app_nestjs conecta ao banco), mas é grátis fechar pra função que
-- apaga conta.
-- ============================================================

-- ----------------------------------------------------------------------------
-- Função:     confirmar_email_por_token
-- Assinatura: (p_token_hash TEXT) -> BOOLEAN
-- Bloco:      [03-O]
-- Regra:      SUBSTITUI confirmar_email_usuario(p_id_usuario) — em vez de confiar
--             num id vindo de fora (que o NestJS resolvia depois de validar o
--             token, mas a função em si aceitava qualquer id), a função recebe o
--             próprio token e resolve o dono sozinha: procura em
--             verificacao_email, confere que não expirou nem foi usado
--             (confirmado_em IS NULL), marca confirmado_em = NOW() e verifica o
--             e-mail do dono daquele token, tudo numa transação. O segredo (o
--             token) É a autorização — elimina a superfície de ataque em vez de
--             só checá-la. Retorna TRUE se confirmou, FALSE se o token não existe,
--             já expirou ou já foi usado (o NestJS decide a mensagem de erro).
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
-- Regra:      Incrementa tentativas_login_falhas; ao atingir
--             configuracoes.limite_tentativas_login, bloqueia a conta por
--             configuracoes.bloqueio_login_minutos (nenhum número fixo — os
--             dois são configuráveis pelo Painel Admin, mesmo padrão dos
--             outros limites do item 16 da Lista C).
-- SEM AUTORIZAÇÃO DE PROPÓSITO — pré-autenticação: chamada durante o próprio
-- login, antes de existir sessão (id_usuario_atual() é NULL nesse momento por
-- definição). O banco não tem como checar quem está chamando; é de confiança do
-- backend. VETOR DE DoS se usada errado: chamar esta função com um id arbitrário
-- 5x bloqueia a conta de QUALQUER pessoa. O endpoint de login PRECISA derivar
-- p_id_usuario do e-mail informado no próprio formulário de login — nunca aceitar
-- um id vindo direto do cliente.
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
-- Regra:      Zera tentativas_login_falhas e limpa bloqueado_ate. SEMPRE ação de
--             suporte/admin sobre a conta de outra pessoa — nunca do próprio
--             usuário (quem está bloqueado não consegue logar pra chamar nada; e
--             registrar_login_sucesso() já faz o mesmo reset automaticamente
--             quando o login dá certo). Exige a permissão usuario_desbloquear —
--             CORRIGIDO (28-07-2026, Claude Web): a 1ª versão não checava nada,
--             qualquer usuário comum conseguia desbloquear a conta de outro.
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
--             (tentativas_login_falhas, bloqueado_ate) — um login bem sucedido
--             sempre limpa o histórico de tentativas anteriores. p_ip é TEXT
--             (não VARCHAR(45), o tipo da coluna) de propósito — evita
--             ambiguidade de modificador de tipo na assinatura da função
--             usada por GRANT EXECUTE; o cast pra VARCHAR(45) da coluna
--             acontece implicitamente no UPDATE.
-- SEM AUTORIZAÇÃO DE PROPÓSITO — pré-autenticação: mesma situação de
-- registrar_falha_login (chamada durante o próprio login, id_usuario_atual() é
-- NULL nesse momento). De confiança do backend — p_id_usuario precisa vir do
-- e-mail/senha já validados nesta mesma chamada de login, nunca de um parâmetro
-- solto vindo do cliente.
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
-- Bloco:      [03-O]
-- Regra:      RNF-003 (LGPD) — marca a conta como deletado = TRUE. Ponto único
--             de exclusão de propósito: não existe função equivalente pra
--             reverter (deletado = FALSE) — a exclusão é deliberadamente uma
--             via de mão única, coerente com o desenho de anonimização já
--             existente (usuario_visivel(), item 17 em PENDENCIAS.md). Permite
--             o próprio usuário excluir a própria conta (sem precisar de
--             permissão nenhuma) OU quem tiver usuario_excluir agindo sobre a
--             conta de outra pessoa — CORRIGIDO (28-07-2026, Claude Web): a 1ª
--             versão não checava nada, qualquer usuário comum conseguia excluir
--             a conta de qualquer outra.
-- CORRIGIDO (28-07-2026, Claude Web — 4ª auditoria, "excluir conta não deixa
-- rastro"): gravava deletado = TRUE e mais nada — o Art. 37 da LGPD exige
-- registro de quem fez e quando numa operação de tratamento, e exclusão é a
-- mais sensível de todas. Passou a gravar deletado_em/deletado_por (01) também.
-- DECISÃO DE PRODUTO NA MESMA AUDITORIA: usuario_excluir saiu do papel
-- 'suporte' (07) — Catarse/Experiment tratam exclusão de conta como
-- auto-serviço do titular, suporte abre chamado mas não executa. Só o admin
-- mantém a permissão (auto-atribuída via trg_admin_recebe_toda_permissao); o
-- próprio usuário continua podendo excluir a própria conta sem nenhuma
-- permissão, como sempre.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.excluir_conta_usuario(p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT (p_id_usuario = public.id_usuario_atual() OR public.tem_permissao('usuario_excluir')) THEN
        RAISE EXCEPTION 'Sem permissão para excluir a conta de outro usuário.';
    END IF;

    UPDATE usuario
    SET deletado = TRUE, deletado_em = NOW(), deletado_por = public.id_usuario_atual()
    WHERE id_usuario = p_id_usuario;
END;
$$;

-- ============================================================
-- [03-P] MODERAÇÃO SOBRE PESQUISADOR — SUSPENSÃO EM CASCATA (RF-084)
-- ============================================================
-- ----------------------------------------------------------------------------
-- Função:     suspender_pesquisador
-- Assinatura: (p_id_usuario INT) -> BOOLEAN
-- Bloco:      [03-P]
-- Regra:      30-07-2026 — RF-084 dizia que suspender um pesquisador encerra
--             automaticamente as campanhas ativas dele e rejeita as
--             pendentes, mas não existia NENHUM caminho no banco pra
--             suspender alguém: `pol_perfil_update` (04) só libera UPDATE em
--             perfil_pesquisador pro próprio dono (id_usuario =
--             id_usuario_atual()) — ou seja, `status_pesquisador` só podia
--             mudar por auto-serviço, nunca por ação de moderação. Esta
--             função é o caminho que faltava: exige a permissão
--             'usuario_suspender' — que já existia seedada (só pro admin) e
--             já era referenciada em `pol_usuario_update` (04), mas nunca
--             tinha uma escrita de verdade atrás dela (mesma classe de
--             "alavanca fantasma" já achada uma vez neste projeto, ver item
--             13 quinto ponto em PENDENCIAS.md — permissão existia, nada a
--             lia pra decidir algo). Passa a ganhar um uso real aqui. Marca o
--             perfil como suspenso e, na mesma transação, aplica a cascata do
--             RF-084. SECURITY DEFINER bypassa a RLS de campanha
--             (pol_campanha_update não libera pra quem só tem
--             'usuario_suspender'), mas NÃO bypassa `trg_campanha_valida_transicao`
--             (05) — a trigger continua rodando e só deixa passar porque
--             ganhou um ramo autoverificável novo pra este caso exato (ver [05-K-2]),
--             mesmo padrão já usado pro prazo vencido e pro cron de
--             encerramento (item 58, PENDENCIAS.md, parte 10). Retorna FALSE
--             sem fazer nada se o pesquisador já estava suspenso (idempotente).
--             Não existe função simétrica de reativação ainda — ver item 60
--             em PENDENCIAS e correcoes.md.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspender_pesquisador(p_id_usuario INT)
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

    UPDATE perfil_pesquisador
    SET status_pesquisador = 'suspenso'
    WHERE id_usuario = p_id_usuario AND status_pesquisador <> 'suspenso';

    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    IF v_linhas = 0 THEN
        RETURN FALSE;
    END IF;

    UPDATE campanha SET status = 'encerrado_moderacao'
    WHERE id_usuario = p_id_usuario AND status = 'ativo';

    UPDATE campanha SET status = 'rejeitado'
    WHERE id_usuario = p_id_usuario AND status = 'aguardando_aprovacao';

    RETURN TRUE;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     reativar_pesquisador
-- Assinatura: (p_id_usuario INT) -> BOOLEAN
-- Bloco:      [03-P]
-- Regra:      30-07-2026 (item 60, PENDENCIAS.md — recomendação do Claude Web,
--             confirmada pelo Lucas). Só devolve status_pesquisador pra
--             'ativo' — devolve a capacidade do pesquisador de criar campanha
--             nova. NÃO toca em nenhuma linha de campanha, de propósito:
--             quando suspender_pesquisador() rodou, o dinheiro das campanhas
--             fechadas já começou a se mexer (devolução ao doador no
--             all-or-nothing, ou repasse já liberado no flexível) — esse
--             movimento acontece no NestJS/gateway, fora do banco, reagindo à
--             mudança para 'encerrado_moderacao'. Reabrir a campanha depois
--             seria prometer algo que a plataforma não consegue cumprir (o
--             dinheiro já foi ou está indo embora). Campanha suspensa fica
--             fechada para sempre, mesmo após reativação — só campanha NOVA,
--             criada depois de reativado, é afetada. Mesma permissão de
--             suspender_pesquisador() (quem pode suspender pode reverter).
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
    SET status_pesquisador = 'ativo'
    WHERE id_usuario = p_id_usuario AND status_pesquisador <> 'ativo';

    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    RETURN v_linhas > 0;
END;
$$;

-- ============================================================
-- [03-N] MODERAÇÃO SOBRE CONTA — SUSPENSÃO DE USUÁRIO E DE PAPEL (09-08-2026)
-- ============================================================
-- Descrição: Bloco G do prompt do Claude Web sobre cabeçalho/moderação —
-- diferente de [03-P] (suspende o PERFIL DE PESQUISADOR, com cascata sobre
-- campanhas, RF-084): aqui é suspensão de CONTA (bloqueia login) e
-- suspensão de UM PAPEL específico (usuario continua logado, só perde as
-- permissões daquele papel enquanto durar). NÃO reaproveita `bloqueado_ate`
-- (bloqueio automático por senha errada, [03-O]) — ver comentário completo
-- em `usuario.suspenso_ate` (01, [01-D]).
--
-- ⚠️ Letra `N`, não `F`/`G`: quando este bloco foi escrito, [03-O]
-- ("OPERAÇÕES DE AUTENTICAÇÃO") e [03-P] ("MODERAÇÃO SOBRE PESQUISADOR")
-- ainda se chamavam `[03-F]`/`[03-G]`, reaproveitando por engano letras que
-- o Índice Global (topo de DOCUMENTACAO_BD.md) já atribuía a outros domínios
-- (`F`=LINK, `G`=ARQUIVO) — colisão do mesmo tipo já corrigida uma vez neste
-- projeto (`[03-K]`→`[03-M]`). Corrigida em 09-08-2026 (renomeadas pra
-- `O`/`P`, livres) — ver PENDENCIAS e correcoes.md, item 51. `N` continua
-- sendo a letra deste bloco (nunca colidiu com nada); não voltou a ser `D`
-- porque a letra própria não é mais necessária pra evitar colisão, mas
-- trocar de novo agora só criaria churn sem ganho.
-- ----------------------------------------------------------------------------
-- Função:     suspender_usuario
-- Assinatura: (p_id_usuario INT, p_ate TIMESTAMPTZ, p_motivo TEXT) -> VOID
-- Bloco:      [03-N]
-- Regra:      Exige 'usuario_suspender' (mesma permissão de
--             suspender_pesquisador, [03-P] — é a mesma categoria de ação
--             administrativa). Motivo é OBRIGATÓRIO (RAISE EXCEPTION se
--             vazio) — reforça em código o que a CK_USUARIO_SUSPENSAO (01)
--             já garante no schema, com uma mensagem melhor que o erro cru
--             de CHECK constraint. "Reduzir a pena" usa esta MESMA função
--             de novo, com uma p_ate mais próxima — não existe uma função
--             separada só pra isso, suspender de novo já sobrescreve.
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
-- Regra:      Desbanir — limpa os 3 campos de uma vez (CK_USUARIO_SUSPENSAO,
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
-- Regra:      Exige 'papel_gerenciar' (não 'usuario_suspender') — suspender
--             UM papel é decisão de RBAC (o que aquela pessoa pode fazer),
--             não de moderação de conta inteira; mesma permissão que já
--             governa a matriz Papel × Permissão. Preferível a REMOVER o
--             vínculo (usuario_papel_service.remove) porque preserva
--             quando foi atribuído e volta sozinho no prazo — tem_permissao()
--             ([03-B], ampliada nesta mesma rodada) passa a ignorar papel
--             com suspenso_ate no futuro.
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
-- [03-M] DASHBOARD ADMIN — MÉTRICAS AGREGADAS (08-08-2026)
-- ============================================================
-- ----------------------------------------------------------------------------
-- Função:     contar_metricas_dashboard
-- Assinatura: () -> TABLE(total_usuarios INT, total_pesquisadores INT,
--             total_papeis INT, total_permissoes INT, total_configuracoes INT,
--             sessoes_ativas INT)
-- Bloco:      [03-M]
-- Regra:      08-08-2026 — GET /dashboard/resumo (nest/src/29-dashboard)
--             precisa de totais confiáveis pros cards da tela inicial do
--             painel. RLS filtra LINHA e não é uniforme entre as tabelas
--             envolvidas: `usuario` só libera não-deletado (ou quem tem
--             'usuario_visualizar_sensivel'), `configuracoes` só libera a
--             linha global ou a da própria sessão — um COUNT direto de
--             app_nestjs devolveria um número DIFERENTE dependendo de quem
--             está logado, o que é errado pra um card de "total do
--             sistema" (mesmo raciocínio de
--             contar_seguidores_pesquisador/campanha, acima em [03-E]).
--             Uma função só devolvendo TABLE (não 6 funções separadas)
--             porque o NestJS sempre pede os 6 números juntos numa
--             chamada só — não faz sentido virar 6 idas ao Postgres.
--             `pesquisadores` conta usuario_papel/papel direto (RLS
--             permissiva nas duas, USING(true)) — não precisa de
--             SECURITY DEFINER pra essa coluna especificamente, mas entra
--             na mesma função porque é pedida junto.
--             SEM contagem de log_auditoria de propósito (correção do
--             Lucas no mesmo dia: a prévia da tela era pra ser sobre
--             notificação pendente, não log — log_auditoria já tem seu
--             próprio painel "Ver log" embaixo de cada tabela).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contar_metricas_dashboard()
RETURNS TABLE (
    total_usuarios      INT,
    total_pesquisadores INT,
    total_papeis        INT,
    total_permissoes    INT,
    total_configuracoes INT,
    sessoes_ativas      INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        (SELECT count(*)::INT FROM usuario WHERE deletado = FALSE),
        (SELECT count(DISTINCT up.id_usuario)::INT
           FROM usuario_papel up
           JOIN papel p ON p.id_papel = up.id_papel
          WHERE p.nome = 'pesquisador'),
        (SELECT count(*)::INT FROM papel),
        (SELECT count(*)::INT FROM permissao),
        (SELECT count(*)::INT FROM configuracoes),
        (SELECT count(*)::INT FROM sessao WHERE revogado_em IS NULL AND expira_em > now());
$$;