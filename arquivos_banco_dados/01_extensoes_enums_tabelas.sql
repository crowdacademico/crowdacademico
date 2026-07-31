-- ============================================================================
--  CROWDACADÊMICO — SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     01_extensoes_enums_tabelas.sql
--  Módulo:      Extensões, ENUMs e Tabelas (DDL)
--  Depende de:  (nenhum — 1º arquivo a rodar, sem dependências externas)
--  Próximo:     02_indices.sql
-- ----------------------------------------------------------------------------
--  Descrição:
--  Define toda a estrutura de dados do banco: a role de aplicação, a
--  extensão pgcrypto, os tipos ENUM usados pelas colunas de status, e as 39
--  tabelas do schema — organizadas por domínio, na ordem exata de
--  dependência de Foreign Key, para permitir rodar o script do zero sem
--  erro de referência.
--
--  Todas as constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK) são
--  nomeadas explicitamente, entre aspas, em SCREAMING_SNAKE_CASE
--  (PK_/FK_/UK_/CK_ + nome da tabela) — facilita identificar rapidamente
--  qual tabela/coluna está envolvida quando o Postgres acusa um erro.
--
--  Inventário Mapeado:
--  - 1 Role de aplicação (app_nestjs) + 1 Extensão (pgcrypto)
--  - 14 Tipos ENUM
--  - 39 Tabelas em 8 blocos de domínio
-- ----------------------------------------------------------------------------
--  SUMÁRIO DOS BLOCOS DE CÓDIGO
-- ----------------------------------------------------------------------------
--  [01-A] BOOTSTRAP, EXTENSÕES E ENUMS
--  [01-B] RBAC (3 tabelas)
--  [01-C] CONFIG (5 tabelas)
--  [01-D] USUÁRIO (10 tabelas + Índices)
--  [01-E] CAMPANHA (9 tabelas)
--  [01-F] LINK (3 tabelas de associação)
--  [01-G] ARQUIVO (2 tabelas de associação)
--  [01-H] CONTRIBUIÇÃO (4 tabelas)
--  [01-I] SCORE (3 tabelas + Bloco DO)
-- ============================================================================
-- [01-A] Bootstrap, Extensões e ENUMs
-- ============================================================
-- CORRIGIDO (27-07-2026): role nasce NOLOGIN, sem senha nenhuma. A versão anterior
-- criava a role já com LOGIN e uma senha placeholder ('TROCAR_NO_AMBIENTE_REAL') —
-- esquecer de trocar isso em produção falha ABERTO (o sistema funciona perfeitamente
-- com uma senha conhecida publicada no GitHub, sem nenhum aviso). Com NOLOGIN,
-- esquecer o passo abaixo falha FECHADO: o NestJS simplesmente não consegue conectar
-- (FATAL: role "app_nestjs" is not permitted to log in), erro percebido em minutos,
-- não uma falha de segurança silenciosa. GRANT e SET ROLE continuam funcionando
-- normalmente numa role NOLOGIN — só LOGIN direto (usuário/senha) é que fica bloqueado.
-- PASSO OBRIGATÓRIO DE INSTALAÇÃO (rodar uma vez, fora deste arquivo, com a senha
-- real de cada ambiente — local ou produção — nunca versionada em texto puro):
--     ALTER ROLE app_nestjs LOGIN PASSWORD 'a_senha_que_voce_vai_por_no_.env';
-- (ver tutorial-rodar-projeto.md, que já tem esse passo numerado logo após o 01).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_nestjs') THEN
        CREATE ROLE app_nestjs NOLOGIN;
    END IF;
END
$$;

-- ADICIONADO (28-07-2026) — guarda de BYPASSRLS: não resolve sozinho o item 22 do
-- PENDENCIAS (ainda é preciso confirmar se o papel usado no SQL Editor do Supabase
-- tem BYPASSRLS antes do deploy), mas transforma uma falha silenciosa em uma parada
-- única e autoexplicativa. Sem esta guarda, rodar os arquivos 04-07 como um papel
-- sem BYPASSRLS (nem superusuário) produz dezenas de erros de "new row violates
-- row-level security policy" espalhados pelos INSERTs do 07 — 89 das 105 policies
-- são TO app_nestjs, então qualquer outro papel (dono da tabela incluído, por causa
-- do FORCE ROW LEVEL SECURITY do 04) fica bloqueado silenciosamente em quase tudo.
-- Com a guarda, o erro é um só, no início, e explica exatamente o que fazer.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = current_user
          AND (rolsuper OR rolbypassrls)
    ) THEN
        RAISE EXCEPTION 'Bootstrap abortado: o papel "%" nao ignora RLS. Como as 39 tabelas usam FORCE ROW LEVEL SECURITY e 89 das 105 policies sao TO app_nestjs, o seed falharia em silencio (dezenas de erros espalhados). Rode como superusuario, ou peca BYPASSRLS pro papel, ou use o papel indicado no tutorial-rodar-projeto.md.', current_user;
    END IF;
END
$$;

-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE tipo_configuracao     AS ENUM ('decimal', 'inteiro', 'texto', 'booleano');
CREATE TYPE status_pesquisador    AS ENUM ('ativo', 'suspenso');
CREATE TYPE tipo_vinculo          AS ENUM ('institucional', 'independente');
CREATE TYPE titulo_academico      AS ENUM ('graduado', 'especialista', 'mestre', 'doutor');
CREATE TYPE modelo_campanha       AS ENUM ('all-or-nothing', 'flexivel');
CREATE TYPE status_campanha       AS ENUM ('aguardando_aprovacao', 'ativo', 'sucesso', 'nao_atingido', 'rejeitado', 'encerrado', 'encerrado_moderacao');
CREATE TYPE status_contribuicao   AS ENUM ('pendente', 'confirmado', 'repassado', 'a_devolver', 'devolvido', 'reembolsado', 'erro', 'expirado', 'reembolso_manual');
CREATE TYPE meio_pagamento        AS ENUM ('pix', 'cartao_credito', 'cartao_debito', 'boleto');
CREATE TYPE fase_atualizacao      AS ENUM ('andamento', 'resultado_preliminar', 'resultado_final');
CREATE TYPE tipo_atualizacao      AS ENUM ('texto', 'imagem', 'pdf', 'linkexterno');
CREATE TYPE status_denuncia       AS ENUM ('pendente', 'em_analise', 'resolvida', 'improcedente');
CREATE TYPE status_encerramento   AS ENUM ('pendente', 'aprovado', 'rejeitado', 'cancelado');
CREATE TYPE tipo_motivo_denuncia  AS ENUM ('campanha', 'perfil');
CREATE TYPE status_notificacao    AS ENUM ('pendente', 'enviado', 'falhou', 'cancelado');
CREATE TYPE tipo_recompensa       AS ENUM ('digital', 'reconhecimento', 'acesso_antecipado');

-- ============================================================
-- [01-B] RBAC (3 tabelas)
-- ============================================================
CREATE TABLE papel (
    id_papel SERIAL,
    nome     VARCHAR(50) NOT NULL,

    CONSTRAINT "PK_PAPEL" PRIMARY KEY (id_papel),
    CONSTRAINT "UK_PAPEL_NOME" UNIQUE (nome)
);

CREATE TABLE permissao (
    id_permissao SERIAL,
    nome         VARCHAR(50) NOT NULL,

    CONSTRAINT "PK_PERMISSAO" PRIMARY KEY (id_permissao),
    CONSTRAINT "UK_PERMISSAO_NOME" UNIQUE (nome)
);

CREATE TABLE papel_permissao (
    id_papel     INT NOT NULL,
    id_permissao INT NOT NULL,

    CONSTRAINT "PK_PAPEL_PERMISSAO" PRIMARY KEY (id_papel, id_permissao),
    CONSTRAINT "FK_PAPEL_PERMISSAO_PAPEL" FOREIGN KEY (id_papel) REFERENCES papel(id_papel) ON DELETE CASCADE,
    CONSTRAINT "FK_PAPEL_PERMISSAO_PERMISSAO" FOREIGN KEY (id_permissao) REFERENCES permissao(id_permissao) ON DELETE CASCADE
);

-- ============================================================
-- [01-C] CONFIG (5 tabelas)
-- ============================================================

CREATE TABLE tipo_link (
    id_tipolink         SERIAL,
    codigo              VARCHAR(20)  NOT NULL,
    nome                VARCHAR(100) NOT NULL,
    ativo               BOOLEAN      DEFAULT TRUE,
    regex               TEXT,
    dominio             VARCHAR(255),
    permite_perfil      BOOLEAN NOT NULL DEFAULT TRUE,
    permite_atualizacao BOOLEAN NOT NULL DEFAULT FALSE,
    permite_recompensa  BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT "PK_TIPO_LINK" PRIMARY KEY (id_tipolink),
    CONSTRAINT "UK_TIPO_LINK_CODIGO" UNIQUE (codigo),
    CONSTRAINT "CK_TIPO_LINK_ALGUM_ESCOPO"
        CHECK (permite_perfil OR permite_atualizacao OR permite_recompensa)
);

-- ADICIONADO (27-07-2026): id_pai auto-referenciado — mesmo padrão já usado em
-- score_config (ver [01-I]) — pra suportar a hierarquia de 2 níveis do CNPq
-- (grande área -> área). Antes, as 9 linhas eram só as grandes áreas; ver seed
-- em 07_seed_dados.sql para as áreas de nível 2 (filhas) e o motivo da mudança.
CREATE TABLE area_conhecimento (
    id_area_conhecimento SERIAL,
    codigo_cnpq          VARCHAR(20)  NOT NULL,
    nome                 VARCHAR(100) NOT NULL,
    id_pai                INT,
    ativo                BOOLEAN      DEFAULT TRUE,

    CONSTRAINT "PK_AREA_CONHECIMENTO" PRIMARY KEY (id_area_conhecimento),
    CONSTRAINT "UK_AREA_CONHECIMENTO_CODIGO_CNPQ" UNIQUE (codigo_cnpq),
    CONSTRAINT "FK_AREA_CONHECIMENTO_PAI" FOREIGN KEY (id_pai) REFERENCES area_conhecimento(id_area_conhecimento) ON DELETE SET NULL
);

CREATE TABLE motivo_denuncia (
    id_motivo SERIAL,
    codigo    VARCHAR(20)          NOT NULL,
    descricao VARCHAR(255),
    tipo      tipo_motivo_denuncia NOT NULL,

    ativo     BOOLEAN             NOT NULL DEFAULT TRUE,

    CONSTRAINT "PK_MOTIVO_DENUNCIA" PRIMARY KEY (id_motivo),
    CONSTRAINT "UK_MOTIVO_DENUNCIA_CODIGO" UNIQUE (codigo)
);

CREATE TABLE arquivo (
    id_arquivo    SERIAL,
    url           TEXT         NOT NULL,
    nome_original TEXT         NOT NULL,
    tipo_mime     VARCHAR(255) NOT NULL,
    tamanho_bytes INT NOT NULL,
    criado_em     TIMESTAMP    DEFAULT NOW(),
    ativo         BOOLEAN      DEFAULT TRUE,
    desativado_em TIMESTAMP,

    CONSTRAINT "PK_ARQUIVO" PRIMARY KEY (id_arquivo)
);

-- ============================================================
-- [01-D] USUÁRIO (10 tabelas + Índices)
-- ============================================================
CREATE TABLE usuario (
    id_usuario       SERIAL,
    nome             VARCHAR(150) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    senha_hash       VARCHAR(255) NOT NULL,     -- [01-I] SENHA HASH OBRIGATÓRIA PARA LOGIN PRÓPRIO
    id_imagem_perfil INT,
    criado_em        TIMESTAMP    DEFAULT NOW(),
    deletado         BOOLEAN      DEFAULT FALSE,
    -- ADICIONADAS (28-07-2026, Claude Web — "o único ponto onde a LGPD ainda tem
    -- uma ponta solta"): excluir_conta_usuario() (03, [03-F]) gravava deletado =
    -- TRUE e nada mais — sem quem fez nem quando, o Art. 37 da LGPD (registro das
    -- operações de tratamento, exclusão sendo a mais sensível de todas) ficava
    -- sem trilha. Preenchidas pela própria função (deletado_por =
    -- id_usuario_atual()) — nunca pelo app diretamente, mesma proteção das
    -- outras colunas de auth que saíram do GRANT UPDATE direto.
    deletado_em      TIMESTAMP,
    deletado_por     INT,

    email_verificado         BOOLEAN   NOT NULL DEFAULT FALSE,
    tentativas_login_falhas  INT       NOT NULL DEFAULT 0,
    bloqueado_ate            TIMESTAMP,
    ultimo_login_em          TIMESTAMP,
    ultimo_login_ip          VARCHAR(45),

    CONSTRAINT "PK_USUARIO" PRIMARY KEY (id_usuario),
    CONSTRAINT "UK_USUARIO_EMAIL" UNIQUE (email),
    CONSTRAINT "FK_USUARIO_IMAGEM" FOREIGN KEY (id_imagem_perfil) REFERENCES arquivo(id_arquivo) ON DELETE SET NULL,
    CONSTRAINT "FK_USUARIO_DELETADO_POR" FOREIGN KEY (deletado_por) REFERENCES usuario(id_usuario)
);

-- [01-C] configuracoes — movido de CONFIG devido à ordem de criação
-- necessária para o funcionamento das tabelas: duas linhas do seed de
-- configuracoes referenciam o usuário admin (id_usuario), então esta
-- tabela só pode ser criada depois de `usuario` já existir.
CREATE TABLE configuracoes (
    id_config   SERIAL,
    id_usuario  INT,
    chave       VARCHAR(255) NOT NULL,        -- [R11] UNIQUE necessário pro upsert(onConflict:'chave')
    valor       VARCHAR(100),
    tipo        tipo_configuracao NOT NULL,
    descricao   VARCHAR(255),
    ativo       BOOLEAN DEFAULT TRUE,

    CONSTRAINT "PK_CONFIGURACOES" PRIMARY KEY (id_config),
    CONSTRAINT "UK_CONFIGURACOES_CHAVE" UNIQUE (chave),
    CONSTRAINT "FK_CONFIGURACOES_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL
);

CREATE TABLE usuario_papel (  -- fica aqui por depender de usuario; documentada no RBAC
    id_usuario INT NOT NULL,
    id_papel   INT NOT NULL,

    CONSTRAINT "PK_USUARIO_PAPEL" PRIMARY KEY (id_usuario, id_papel),
    CONSTRAINT "FK_USUARIO_PAPEL_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "FK_USUARIO_PAPEL_PAPEL" FOREIGN KEY (id_papel) REFERENCES papel(id_papel) ON DELETE CASCADE
);


CREATE TABLE perfil_pesquisador (
    id_usuario            INT NOT NULL,
    cpf_criptografado     VARCHAR(255) NOT NULL,
    tipo_vinculo          tipo_vinculo NOT NULL DEFAULT 'institucional',
    vinculo_institucional VARCHAR(255),
    titulo_academico      titulo_academico NOT NULL,
    status_pesquisador    status_pesquisador NOT NULL DEFAULT 'ativo',
    ativado_em            TIMESTAMP,
    score_atual           INTEGER    NOT NULL  DEFAULT 0,
    score_atualizado_em   TIMESTAMP,

    CONSTRAINT "PK_PERFIL_PESQUISADOR" PRIMARY KEY (id_usuario),
    CONSTRAINT "FK_PERFIL_PESQUISADOR_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    -- Institucional exige o nome da instituição preenchido (não vazio); independente
    -- exige que o campo fique vazio (não é "esqueceram de preencher", é um fato
    -- declarado). Nenhum dos dois estados aceita ambiguidade.
    CONSTRAINT "CK_PERFIL_VINCULO" CHECK (
        (tipo_vinculo = 'institucional' AND vinculo_institucional IS NOT NULL AND btrim(vinculo_institucional) <> '')
        OR (tipo_vinculo = 'independente' AND vinculo_institucional IS NULL)
    )
);

CREATE TABLE seguir_pesquisador (
    id_seg_pesquisador SERIAL,
    id_usuario         INT NOT NULL,
    id_pesquisador     INT NOT NULL,
    seguido_em         TIMESTAMP DEFAULT NOW(),

    CONSTRAINT "PK_SEGUIR_PESQUISADOR" PRIMARY KEY (id_seg_pesquisador),
    CONSTRAINT "FK_SEGUIR_PESQUISADOR_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "FK_SEGUIR_PESQUISADOR_PESQUISADOR" FOREIGN KEY (id_pesquisador) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "UK_SEGUIR_PESQUISADOR_USUARIO_PESQUISADOR" UNIQUE (id_usuario, id_pesquisador),
    CONSTRAINT "CK_SEGUIR_PESQUISADOR_NAO_AUTOSEGUIR" CHECK (id_usuario <> id_pesquisador)
);

CREATE TABLE termos_de_uso (
    id_termo  SERIAL,
    versao    VARCHAR(20) NOT NULL,   -- ex: "2026-07-01", "v3" — precisa ser única
    conteudo  TEXT        NOT NULL,
    ativo     BOOLEAN     DEFAULT TRUE,
    criado_em TIMESTAMP   DEFAULT NOW(),      -- [melhoria] registra quando cada versão entrou em vigor

    CONSTRAINT "PK_TERMOS_DE_USO" PRIMARY KEY (id_termo),
    CONSTRAINT "UK_TERMOS_DE_USO_VERSAO" UNIQUE (versao)
);

CREATE TABLE usuario_termo (
    id_usuario_termo SERIAL,
    id_usuario       INT NOT NULL,
    id_termo         INT NOT NULL,
    aceito_em        TIMESTAMP DEFAULT NOW(),
    ip_aceite        VARCHAR(45),            -- [melhoria] trilha de auditoria (LGPD): IPv4/IPv6 de quem aceitou

    CONSTRAINT "PK_USUARIO_TERMO" PRIMARY KEY (id_usuario_termo),
    CONSTRAINT "FK_USUARIO_TERMO_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "FK_USUARIO_TERMO_TERMO" FOREIGN KEY (id_termo) REFERENCES termos_de_uso(id_termo) ON DELETE RESTRICT, -- não deixa apagar um termo já aceito por alguém
    CONSTRAINT "UK_USUARIO_TERMO_USUARIO_TERMO" UNIQUE (id_usuario, id_termo) -- [melhoria] mesmo usuário não aceita a mesma versão duas vezes
);

CREATE TABLE notificacao (
    id_notificacao     SERIAL,
    id_usuario         INT,                                   -- mantém o histórico de envio mesmo se o usuário for removido
    email_destinatario VARCHAR(255)       NOT NULL,          -- snapshot do e-mail no momento do envio (usuário pode trocar o e-mail depois)
    tipo_evento        VARCHAR(100)       NOT NULL,          -- ex: 'campanha_aprovada', 'doacao_recebida' — texto livre, como "evento" em auditoria_financeira
    status             status_notificacao NOT NULL DEFAULT 'pendente',
    tentativas         INT                NOT NULL DEFAULT 0,
    criado_em          TIMESTAMP          DEFAULT NOW(),
    enviado_em         TIMESTAMP,                             -- [melhoria] quando o envio de fato teve sucesso (NULL até lá)
    ultimo_erro        TEXT,                                  -- [melhoria] guarda o motivo da última falha, útil pra debugar retentativas

    CONSTRAINT "PK_NOTIFICACAO" PRIMARY KEY (id_notificacao),
    CONSTRAINT "FK_NOTIFICACAO_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    CONSTRAINT "CK_NOTIFICACAO_TENTATIVAS" CHECK (tentativas >= 0)
);

CREATE TABLE verificacao_email (
    id_verificacao SERIAL,
    id_usuario     INT NOT NULL,
    token_hash     VARCHAR(255) NOT NULL,   -- nunca gravar o token em texto puro
    criado_em      TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em      TIMESTAMP NOT NULL,
    confirmado_em  TIMESTAMP,

    CONSTRAINT "PK_VERIFICACAO_EMAIL" PRIMARY KEY (id_verificacao),
    CONSTRAINT "FK_VERIFICACAO_EMAIL_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "CK_VERIFICACAO_EMAIL_EXPIRA" CHECK (expira_em > criado_em) -- garante que o token não nasça já expirado (erro de geração no backend)
);

CREATE TABLE recuperacao_senha (
    id_recuperacao SERIAL,
    id_usuario     INT NOT NULL,
    token_hash     VARCHAR(255) NOT NULL,
    criado_em      TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em      TIMESTAMP NOT NULL,     -- recomendado: expiração curta, 15-30 min
    usado_em       TIMESTAMP,

    CONSTRAINT "PK_RECUPERACAO_SENHA" PRIMARY KEY (id_recuperacao),
    CONSTRAINT "FK_RECUPERACAO_SENHA_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "CK_RECUPERACAO_SENHA_EXPIRA" CHECK (expira_em > criado_em) -- garante que o token não nasça já expirado (erro de geração no backend)
);

CREATE TABLE sessao (
    id_sessao          SERIAL,
    id_usuario         INT NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    criado_em          TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em          TIMESTAMP NOT NULL,
    revogado_em        TIMESTAMP,
    ip                 VARCHAR(45),
    user_agent         TEXT,

    CONSTRAINT "PK_SESSAO" PRIMARY KEY (id_sessao),
    CONSTRAINT "FK_SESSAO_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "CK_SESSAO_EXPIRA" CHECK (expira_em > criado_em) -- garante que o refresh token não nasça já expirado
);

-- ============================================================
-- [01-E] CAMPANHA (9 tabelas)
-- ============================================================
CREATE TABLE campanha (
    id_campanha          SERIAL,
    id_usuario           INT             NOT NULL,
    id_admin             INT,
    id_area_conhecimento INT             NOT NULL,
    titulo               VARCHAR(255)    NOT NULL,
    modelo               modelo_campanha NOT NULL DEFAULT 'all-or-nothing',
    meta_financeira      DECIMAL(10,2)   NOT NULL,
    valor_bruto_arrecadado DECIMAL(10,2) DEFAULT 0,
    taxa_plataforma      DECIMAL(5,2),
    descricao            TEXT,
    data_inicio          TIMESTAMP,
    data_fim             TIMESTAMP,
    status               status_campanha NOT NULL DEFAULT 'aguardando_aprovacao',
    aprovado_em          TIMESTAMP,
    -- CORRIGIDO: data_fim é a promessa (congelada por fn_congela_regras_campanha,
    -- 05); faltava onde registrar quando a campanha de fato terminou (natural,
    -- antecipado ou por moderação) — sem isso o RF-042/RF-058 não tinham onde gravar.
    encerrado_em         TIMESTAMP,
    -- ADICIONADO (28-07-2026, item 19(c)): RF-033 pede vídeo de apresentação
    -- opcional em destaque na página da campanha. Só a URL (ex.: YouTube/
    -- Vimeo) — o arquivo de vídeo em si não é armazenado pela plataforma.
    video_apresentacao_url VARCHAR(500),
    criado_em            TIMESTAMP       DEFAULT NOW(),

    CONSTRAINT "PK_CAMPANHA" PRIMARY KEY (id_campanha),
    CONSTRAINT "FK_CAMPANHA_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    CONSTRAINT "FK_CAMPANHA_ADMIN" FOREIGN KEY (id_admin) REFERENCES usuario(id_usuario),
    CONSTRAINT "FK_CAMPANHA_AREA_CONHECIMENTO" FOREIGN KEY (id_area_conhecimento) REFERENCES area_conhecimento(id_area_conhecimento),
    CONSTRAINT "CK_CAMPANHA_PRAZO" CHECK (
        data_fim IS NULL OR data_inicio IS NULL OR
        (data_fim - data_inicio) BETWEEN INTERVAL '1 day' AND INTERVAL '365 days'
    ),
    -- ADICIONADO (28-07-2026, Claude Web — "Problema 2"): campo de texto livre sem
    -- limite nenhum. Mesmo padrão do prazo (item 16): CHECK aqui é só limite técnico
    -- largo (barra absurdo tipo upload de megabytes de texto); o limite de negócio de
    -- verdade (menor, configurável) mora em configuracoes + trigger, ver [05-K-1].
    CONSTRAINT "CK_CAMPANHA_DESCRICAO_TAMANHO" CHECK (descricao IS NULL OR char_length(descricao) <= 20000),
    -- campanha com meta 0.00 era aceita (reproduzido). Mesmo padrão do prazo
    -- (item 16): CHECK aqui é só limite técnico largo (> 0, barra só o absurdo
    -- matemático); o mínimo de negócio de verdade (configurável, maior que 0)
    -- mora em configuracoes.meta_minima_campanha + trigger, ver [05-K-2].
    CONSTRAINT "CK_CAMPANHA_META_FINANCEIRA_POSITIVA" CHECK (meta_financeira > 0)
);

CREATE TABLE seguir_campanha (
    id_seg_campanha SERIAL,
    id_usuario      INT NOT NULL,
    id_campanha     INT NOT NULL,
    seguido_em      TIMESTAMP DEFAULT NOW(),

    CONSTRAINT "PK_SEGUIR_CAMPANHA" PRIMARY KEY (id_seg_campanha),
    CONSTRAINT "FK_SEGUIR_CAMPANHA_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "FK_SEGUIR_CAMPANHA_CAMPANHA" FOREIGN KEY (id_campanha) REFERENCES campanha(id_campanha) ON DELETE CASCADE,
    CONSTRAINT "UK_SEGUIR_CAMPANHA_USUARIO_CAMPANHA" UNIQUE (id_usuario, id_campanha)
);

CREATE TABLE atualizacao_campanha (
    id_atualizacao SERIAL,
    id_campanha    INT              NOT NULL,
    titulo         VARCHAR(150)     NOT NULL,
    conteudo       TEXT             NOT NULL,
    publicado_em   TIMESTAMP        DEFAULT NOW(),
    fase           fase_atualizacao,
    tipo           tipo_atualizacao,
    ativo          BOOLEAN          NOT NULL DEFAULT TRUE, -- SOFT DELETE E MODERAÇÃO DAS ATUALIZAÇÕES

    CONSTRAINT "PK_ATUALIZACAO_CAMPANHA" PRIMARY KEY (id_atualizacao),
    CONSTRAINT "FK_ATUALIZACAO_CAMPANHA_CAMPANHA" FOREIGN KEY (id_campanha) REFERENCES campanha(id_campanha) ON DELETE CASCADE,
    -- ADICIONADO (28-07-2026, Claude Web — "Problema 2"): mesmo raciocínio de
    -- CK_CAMPANHA_DESCRICAO_TAMANHO — limite técnico largo aqui, limite de negócio
    -- configurável via trigger, ver [05-K-1].
    CONSTRAINT "CK_ATUALIZACAO_CAMPANHA_CONTEUDO_TAMANHO" CHECK (char_length(conteudo) <= 20000)
);

CREATE TABLE repasse (
    id_repasse    SERIAL,
    id_campanha   INT           NOT NULL,
    valor_bruto   DECIMAL(10,2) NOT NULL,
    valor_liquido DECIMAL(10,2) NOT NULL,
    meta_atingida BOOLEAN       DEFAULT FALSE,
    repassado_em  TIMESTAMP,
    taxa_relativa DECIMAL(5,2),
    status        VARCHAR(100),

    CONSTRAINT "PK_REPASSE" PRIMARY KEY (id_repasse),
    CONSTRAINT "FK_REPASSE_CAMPANHA" FOREIGN KEY (id_campanha) REFERENCES campanha(id_campanha)
);

CREATE TABLE solicitacao_encerramento (
    id_solicitacao_encerramento SERIAL,
    id_campanha                 INT                 NOT NULL,
    id_admin                    INT,
    justificativa_pesquisador   TEXT,
    justificativa_admin         TEXT,
    status                      status_encerramento NOT NULL DEFAULT 'pendente',
    solicitado_em               TIMESTAMP           DEFAULT NOW(),
    avaliado_em                 TIMESTAMP,

    CONSTRAINT "PK_SOLICITACAO_ENCERRAMENTO" PRIMARY KEY (id_solicitacao_encerramento),
    CONSTRAINT "FK_SOLICITACAO_ENCERRAMENTO_CAMPANHA" FOREIGN KEY (id_campanha) REFERENCES campanha(id_campanha),
    CONSTRAINT "FK_SOLICITACAO_ENCERRAMENTO_ADMIN" FOREIGN KEY (id_admin) REFERENCES usuario(id_usuario),
    -- ADICIONADO (28-07-2026, Claude Web — "Problema 2"): mesmo raciocínio de
    -- CK_CAMPANHA_DESCRICAO_TAMANHO, pros dois campos de justificativa — limite
    -- técnico largo aqui, limite de negócio configurável via trigger, ver [05-K-1].
    CONSTRAINT "CK_SOLICITACAO_JUSTIFICATIVA_PESQ_TAMANHO" CHECK (justificativa_pesquisador IS NULL OR char_length(justificativa_pesquisador) <= 10000),
    CONSTRAINT "CK_SOLICITACAO_JUSTIFICATIVA_ADMIN_TAMANHO" CHECK (justificativa_admin IS NULL OR char_length(justificativa_admin) <= 10000)
);

CREATE TABLE historico_rejeicao (
    id_rejeicao   SERIAL,
    id_campanha   INT  NOT NULL,
    id_admin      INT,
    justificativa TEXT,
    rejeitado_em  TIMESTAMP DEFAULT NOW(),

    CONSTRAINT "PK_HISTORICO_REJEICAO" PRIMARY KEY (id_rejeicao),
    CONSTRAINT "FK_HISTORICO_REJEICAO_CAMPANHA" FOREIGN KEY (id_campanha) REFERENCES campanha(id_campanha),
    CONSTRAINT "FK_HISTORICO_REJEICAO_ADMIN" FOREIGN KEY (id_admin) REFERENCES usuario(id_usuario)
);

CREATE TABLE comentario (
    id_comentario  SERIAL,
    id_campanha    INT          NOT NULL,
    id_pesquisador INT,
    conteudo       VARCHAR(500) NOT NULL,
    endossado      BOOLEAN      DEFAULT FALSE,
    criado_em      TIMESTAMP    DEFAULT NOW(),
    ordem_endosso  INT,
    ativo          BOOLEAN      NOT NULL DEFAULT TRUE, -- SOFT DELETE DOS COMENTÁRIOS

    CONSTRAINT "PK_COMENTARIO" PRIMARY KEY (id_comentario),
    CONSTRAINT "FK_COMENTARIO_CAMPANHA" FOREIGN KEY (id_campanha) REFERENCES campanha(id_campanha) ON DELETE CASCADE,
    CONSTRAINT "FK_COMENTARIO_PESQUISADOR" FOREIGN KEY (id_pesquisador) REFERENCES perfil_pesquisador(id_usuario) ON DELETE SET NULL,
    CONSTRAINT "UK_COMENTARIO_CAMPANHA_PESQUISADOR" UNIQUE (id_campanha, id_pesquisador),
    CONSTRAINT "CK_COMENTARIO_ENDOSSO"
        CHECK ((endossado = TRUE AND ordem_endosso IS NOT NULL) OR (endossado = FALSE AND ordem_endosso IS NULL))
);

CREATE TABLE denuncia (
    id_denuncia         SERIAL,
    id_usuario          INT  NOT NULL,
    id_campanha_alvo    INT,
    id_pesquisador_alvo INT,
    id_motivo           INT  NOT NULL,
    relato              TEXT,-- descrição adicional pro denunciante.
    status              status_denuncia NOT NULL DEFAULT 'pendente',
    criado_em           TIMESTAMP    DEFAULT NOW(),

    CONSTRAINT "PK_DENUNCIA" PRIMARY KEY (id_denuncia),
    CONSTRAINT "FK_DENUNCIA_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    -- SET NULL -> RESTRICT — denúncia é registro de moderação; um alvo
    -- virando NULL sozinho com o tempo destruiria rastro de auditoria. Na prática não
    -- muda nada hoje (nem campanha nem usuario têm policy de DELETE, ver 06_grants.sql).
    CONSTRAINT "FK_DENUNCIA_CAMPANHA_ALVO" FOREIGN KEY (id_campanha_alvo) REFERENCES campanha(id_campanha) ON DELETE RESTRICT,
    CONSTRAINT "FK_DENUNCIA_PESQUISADOR_ALVO" FOREIGN KEY (id_pesquisador_alvo) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT "FK_DENUNCIA_MOTIVO" FOREIGN KEY (id_motivo) REFERENCES motivo_denuncia(id_motivo),
    CONSTRAINT "UK_DENUNCIA_USUARIO_CAMPANHA_ALVO" UNIQUE (id_usuario, id_campanha_alvo),
    CONSTRAINT "UK_DENUNCIA_USUARIO_PESQUISADOR_ALVO" UNIQUE (id_usuario, id_pesquisador_alvo),
    -- Nada garantia exatamente um alvo preenchido (dava pra ter os dois ou nenhum).
    CONSTRAINT "CK_DENUNCIA_ALVO_XOR" CHECK (
        (id_campanha_alvo IS NOT NULL AND id_pesquisador_alvo IS NULL)
        OR (id_campanha_alvo IS NULL AND id_pesquisador_alvo IS NOT NULL)
    ),
    -- ADICIONADO (28-07-2026, Claude Web — "Problema 2", a Alexia já tinha avisado no
    -- WhatsApp antes mesmo da coluna existir: "relato como text pode dar problema, tem
    -- que ver depois se dá pra restringir o tamanho"): sem limite nenhum, um campo de
    -- denúncia pública virava vetor de abuso (o limite de 5 denúncias/24h não impede
    -- megabytes de texto POR denúncia). Limite técnico largo aqui; limite de negócio
    -- configurável via trigger, ver [05-K-1].
    CONSTRAINT "CK_DENUNCIA_RELATO_TAMANHO" CHECK (relato IS NULL OR char_length(relato) <= 5000)
);

CREATE TABLE recompensa (
    id_recompensa         SERIAL,
    id_campanha           INT             NOT NULL,
    titulo                VARCHAR(150)    NOT NULL,
    descricao             TEXT,
    valor_minimo          DECIMAL(10,2)   NOT NULL,          -- contribuição mínima pra desbloquear essa recompensa
    quantidade_disponivel INT,                                -- NULL = ilimitada
    tipo                  tipo_recompensa NOT NULL,
    ativo                 BOOLEAN         DEFAULT TRUE,
    criado_em             TIMESTAMP       DEFAULT NOW(),      -- [melhoria]

    CONSTRAINT "PK_RECOMPENSA" PRIMARY KEY (id_recompensa),
    CONSTRAINT "FK_RECOMPENSA_CAMPANHA" FOREIGN KEY (id_campanha) REFERENCES campanha(id_campanha) ON DELETE CASCADE,
    CONSTRAINT "CK_RECOMPENSA_VALOR_MINIMO" CHECK (valor_minimo > 0),
    CONSTRAINT "CK_RECOMPENSA_QUANTIDADE"   CHECK (quantidade_disponivel IS NULL OR quantidade_disponivel >= 0),
    -- ADICIONADO (28-07-2026, Claude Web — "Problema 2"): mesma categoria de texto
    -- livre sem limite, mesmo raciocínio de CK_CAMPANHA_DESCRICAO_TAMANHO. Limite
    -- técnico largo aqui; limite de negócio configurável via trigger, ver [05-K-1].
    CONSTRAINT "CK_RECOMPENSA_DESCRICAO_TAMANHO" CHECK (descricao IS NULL OR char_length(descricao) <= 10000)
);

-- ============================================================
-- [01-F] LINK (3 tabelas de associação)
-- ============================================================
CREATE TABLE link_academico (
    id_link_academico SERIAL,
    id_usuario        INT  NOT NULL,
    id_tipolink       INT  NOT NULL,
    ordem             INT,
    url               VARCHAR(500) NOT NULL,
    -- ADICIONADO (28-07-2026, item 19(a)): RF-014/RF-016/RF-018 e a Etapa 2
    -- falam em rótulo personalizável por link ("meu repositório do projeto X",
    -- em vez de só o nome genérico do tipo_link). Opcional — sem rótulo, o
    -- front cai pro nome do tipo_link.
    rotulo             VARCHAR(100),

    CONSTRAINT "PK_LINK_ACADEMICO" PRIMARY KEY (id_link_academico),
    CONSTRAINT "FK_LINK_ACADEMICO_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "FK_LINK_ACADEMICO_TIPOLINK" FOREIGN KEY (id_tipolink) REFERENCES tipo_link(id_tipolink)
);

CREATE TABLE link_atualizacao (
    id_link_atualizacao SERIAL,
    id_atualizacao      INT NOT NULL,
    id_tipolink         INT NOT NULL,
    ordem               INT,
    url                 VARCHAR(500) NOT NULL,

    CONSTRAINT "PK_LINK_ATUALIZACAO" PRIMARY KEY (id_link_atualizacao),
    CONSTRAINT "FK_LINK_ATUALIZACAO_ATUALIZACAO" FOREIGN KEY (id_atualizacao) REFERENCES atualizacao_campanha(id_atualizacao) ON DELETE CASCADE,
    CONSTRAINT "FK_LINK_ATUALIZACAO_TIPOLINK" FOREIGN KEY (id_tipolink) REFERENCES tipo_link(id_tipolink)
);

CREATE TABLE link_recompensa (
    id_link_recompensa SERIAL,
    id_recompensa      INT NOT NULL,
    id_tipolink        INT NOT NULL,
    ordem              INT,
    url                VARCHAR(500) NOT NULL,

    CONSTRAINT "PK_LINK_RECOMPENSA" PRIMARY KEY (id_link_recompensa),
    CONSTRAINT "FK_LINK_RECOMPENSA_RECOMPENSA" FOREIGN KEY (id_recompensa) REFERENCES recompensa(id_recompensa) ON DELETE CASCADE,
    CONSTRAINT "FK_LINK_RECOMPENSA_TIPOLINK" FOREIGN KEY (id_tipolink) REFERENCES tipo_link(id_tipolink)
);

-- ============================================================
-- [01-G] ARQUIVO (2 tabelas de associação)
-- ============================================================
CREATE TABLE arquivo_atualizacao (
    id_arq_atu     SERIAL,
    id_arquivo     INT NOT NULL,
    id_atualizacao INT NOT NULL,

    CONSTRAINT "PK_ARQUIVO_ATUALIZACAO" PRIMARY KEY (id_arq_atu),
    CONSTRAINT "FK_ARQUIVO_ATUALIZACAO_ARQUIVO" FOREIGN KEY (id_arquivo) REFERENCES arquivo(id_arquivo) ON DELETE CASCADE,
    CONSTRAINT "FK_ARQUIVO_ATUALIZACAO_ATUALIZACAO" FOREIGN KEY (id_atualizacao) REFERENCES atualizacao_campanha(id_atualizacao) ON DELETE CASCADE,
    CONSTRAINT "UK_ARQUIVO_ATUALIZACAO_ARQUIVO_ATUALIZACAO" UNIQUE (id_arquivo, id_atualizacao)
);

CREATE TABLE arquivo_recompensa (
    id_arq_recompensa SERIAL,
    id_recompensa     INT NOT NULL,
    id_arquivo        INT NOT NULL,
    ordem             INT,
    principal         BOOLEAN DEFAULT FALSE,

    CONSTRAINT "PK_ARQUIVO_RECOMPENSA" PRIMARY KEY (id_arq_recompensa),
    CONSTRAINT "FK_ARQUIVO_RECOMPENSA_RECOMPENSA" FOREIGN KEY (id_recompensa) REFERENCES recompensa(id_recompensa) ON DELETE CASCADE,
    CONSTRAINT "FK_ARQUIVO_RECOMPENSA_ARQUIVO" FOREIGN KEY (id_arquivo) REFERENCES arquivo(id_arquivo) ON DELETE CASCADE,
    CONSTRAINT "UK_ARQUIVO_RECOMPENSA_RECOMPENSA_ARQUIVO" UNIQUE (id_recompensa, id_arquivo)
);

-- ============================================================
-- [01-H] CONTRIBUIÇÃO (4 tabelas)
-- ============================================================
CREATE TABLE contribuicao (
    id_contribuicao  SERIAL,
    id_campanha      INT                 NOT NULL,
    id_usuario       INT,
    valor            DECIMAL(10,2)       NOT NULL,
    meio_pagamento   meio_pagamento      NOT NULL,
    status           status_contribuicao NOT NULL DEFAULT 'pendente',
    anonima          BOOLEAN             DEFAULT FALSE,
    id_transacao_api VARCHAR(255),
    criado_em        TIMESTAMP           DEFAULT NOW(),
    token_sessao     UUID                DEFAULT gen_random_uuid(),

    CONSTRAINT "PK_CONTRIBUICAO" PRIMARY KEY (id_contribuicao),
    CONSTRAINT "FK_CONTRIBUICAO_CAMPANHA" FOREIGN KEY (id_campanha) REFERENCES campanha(id_campanha),
    CONSTRAINT "FK_CONTRIBUICAO_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    -- ALTERADO (30-07-2026, RF-056, mesmo padrão do item 16 da Lista C):
    -- CK_CONTRIBUICAO_VALOR_MINIMO era `>= 5.00` direto na constraint — hardcoded,
    -- igual o prazo e a meta financeira estavam antes de virarem configuráveis.
    -- Vira só limite técnico largo (`> 0`, barra só erro grosseiro tipo valor
    -- zero/negativo); o mínimo de negócio de verdade (5.00, configurável pelo
    -- Painel Admin) mora em configuracoes.valor_minimo_contribuicao + trigger,
    -- ver [05-K-2] em 05_regras_negocio.sql.
    CONSTRAINT "CK_CONTRIBUICAO_VALOR_MINIMO" CHECK (valor > 0)
);

CREATE TABLE auditoria_financeira (
    id_auditoria    SERIAL,
    id_contribuicao INT          NOT NULL,
    id_usuario_responsavel INT,
    valor           DECIMAL(10,2) NOT NULL,
    meio_pagamento  meio_pagamento,
    status_novo     VARCHAR(100) NOT NULL,
    status_anterior VARCHAR(100),
    evento          VARCHAR(200),
    timestamp       TIMESTAMP    DEFAULT NOW(),

    CONSTRAINT "PK_AUDITORIA_FINANCEIRA" PRIMARY KEY (id_auditoria),
    CONSTRAINT "FK_AUDITORIA_FINANCEIRA_CONTRIBUICAO" FOREIGN KEY (id_contribuicao) REFERENCES contribuicao(id_contribuicao),
    CONSTRAINT "FK_AUDITORIA_FINANCEIRA_USUARIO_RESPONSAVEL" FOREIGN KEY (id_usuario_responsavel) REFERENCES usuario(id_usuario) ON DELETE SET NULL
);

CREATE TABLE contribuicao_recompensa (
    id_contrib_recompensa SERIAL,
    id_contribuicao       INT NOT NULL,
    id_recompensa         INT NOT NULL,
    quantidade            INT NOT NULL DEFAULT 1,          -- [melhoria] mesma recompensa pode ser levada em mais de 1 unidade
    adquirida_em          TIMESTAMP DEFAULT NOW(),

    CONSTRAINT "PK_CONTRIBUICAO_RECOMPENSA" PRIMARY KEY (id_contrib_recompensa),
    CONSTRAINT "FK_CONTRIBUICAO_RECOMPENSA_CONTRIBUICAO" FOREIGN KEY (id_contribuicao) REFERENCES contribuicao(id_contribuicao) ON DELETE CASCADE,
    CONSTRAINT "FK_CONTRIBUICAO_RECOMPENSA_RECOMPENSA" FOREIGN KEY (id_recompensa) REFERENCES recompensa(id_recompensa) ON DELETE RESTRICT, -- não deixa apagar recompensa já adquirida por alguém
    CONSTRAINT "CK_CONTRIBUICAO_RECOMPENSA_QTD" CHECK (quantidade > 0),
    CONSTRAINT "UK_CONTRIBUICAO_RECOMPENSA_CONTRIBUICAO_RECOMPENSA" UNIQUE (id_contribuicao, id_recompensa) -- 1 linha por par; quantidade acumula em vez de duplicar linha
);

CREATE TABLE aceite_termo_contribuicao (
    id_aceite_contrib SERIAL,
    id_contribuicao   INT NOT NULL,
    id_termo          INT NOT NULL,
    aceito_em         TIMESTAMP DEFAULT NOW(),
    ip_aceite         VARCHAR(45),

    CONSTRAINT "PK_ACEITE_TERMO_CONTRIBUICAO" PRIMARY KEY (id_aceite_contrib),
    CONSTRAINT "FK_ACEITE_TERMO_CONTRIBUICAO_CONTRIBUICAO" FOREIGN KEY (id_contribuicao) REFERENCES contribuicao(id_contribuicao) ON DELETE CASCADE,
    CONSTRAINT "FK_ACEITE_TERMO_CONTRIBUICAO_TERMO" FOREIGN KEY (id_termo) REFERENCES termos_de_uso(id_termo) ON DELETE RESTRICT,
    CONSTRAINT "UK_ACEITE_TERMO_CONTRIBUICAO_CONTRIBUICAO" UNIQUE (id_contribuicao)
);

-- ============================================================
-- [01-I] SCORE (3 tabelas + Bloco DO)
-- ============================================================
CREATE TABLE score_config (
    id_score_config SERIAL,
    nome            VARCHAR(100) NOT NULL,
    descricao       VARCHAR(255),
    peso            DECIMAL(5,2) NOT NULL,
    id_pai          INT,
    ativo           BOOLEAN      DEFAULT TRUE,
    criado_em       TIMESTAMP    DEFAULT NOW(),
    atualizado_em   TIMESTAMP    DEFAULT NOW(),

    CONSTRAINT "PK_SCORE_CONFIG" PRIMARY KEY (id_score_config),
    CONSTRAINT "FK_SCORE_CONFIG_PAI" FOREIGN KEY (id_pai) REFERENCES score_config(id_score_config) ON DELETE SET NULL
);

CREATE TABLE score_rotulo (
    id_rotulo     SERIAL,
    rotulo        VARCHAR(50)  NOT NULL,
    descricao     VARCHAR(255),
    score_minimo  INTEGER      NOT NULL,
    score_maximo  INTEGER      NOT NULL,
    ativo         BOOLEAN      DEFAULT TRUE,
    criado_em     TIMESTAMP    DEFAULT NOW(),
    atualizado_em TIMESTAMP    DEFAULT NOW(),

    CONSTRAINT "PK_SCORE_ROTULO" PRIMARY KEY (id_rotulo),
    CONSTRAINT "CK_SCORE_ROTULO_FAIXA" CHECK (score_minimo < score_maximo)
);

CREATE TABLE score_pesquisador (
    id_score_pesq   SERIAL,
    id_usuario      INT          NOT NULL,
    id_score_config INT          NOT NULL,
    id_rotulo       INT,
    pontos_obtidos  INTEGER      NOT NULL,
    score_total     INTEGER,
    calculado_em    TIMESTAMP    DEFAULT NOW(),
    motivo          VARCHAR(255),

    CONSTRAINT "PK_SCORE_PESQUISADOR" PRIMARY KEY (id_score_pesq),
    CONSTRAINT "FK_SCORE_PESQUISADOR_USUARIO" FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT "FK_SCORE_PESQUISADOR_SCORE_CONFIG" FOREIGN KEY (id_score_config) REFERENCES score_config(id_score_config),
    CONSTRAINT "FK_SCORE_PESQUISADOR_ROTULO" FOREIGN KEY (id_rotulo) REFERENCES score_rotulo(id_rotulo) ON DELETE SET NULL,
    CONSTRAINT "UK_SCORE_PESQUISADOR_USUARIO_SCORE_CONFIG" UNIQUE (id_usuario, id_score_config)
);
