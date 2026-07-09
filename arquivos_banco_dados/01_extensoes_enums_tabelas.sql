-- ============================================================
--  CrowdAcadêmico — 01: EXTENSÕES, ENUMS E TABELAS
--  Execução: 1º arquivo a rodar (sem dependências externas).
--  Próximo arquivo: 02_indices.sql
-- ============================================================

-- ============================================================
--  CrowdAcadêmico — PARTE 1: TABELAS (extensões, enums, tabelas, índices)
--  Gerado a partir de crowd_academico_revisado.sql
-- ============================================================

-- ============================================================
--  CrowdAcadêmico — Script revisado COMPLETO (Supabase/PostgreSQL)
--  Inclui todas as correções de RLS para tabelas faltantes
-- ============================================================

-- [O conteúdo original completo vai aqui - mantido intacto]
-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE tipo_configuracao     AS ENUM ('decimal', 'inteiro', 'texto', 'booleano');
CREATE TYPE status_pesquisador    AS ENUM ('ativo', 'suspenso');
CREATE TYPE titulo_academico      AS ENUM ('graduado', 'especialista', 'mestre', 'doutor');
CREATE TYPE modelo_campanha       AS ENUM ('all-or-nothing', 'flexivel');
-- CORRIGIDO: status_campanha recebeu o valor encerrado_moderacao.
CREATE TYPE status_campanha       AS ENUM ('aguardando_aprovacao', 'ativo', 'sucesso', 'nao_atingido', 'rejeitado', 'encerrado', 'encerrado_moderacao');
-- CORRIGIDO: status_contribuicao recebeu os valores expirado e reembolso_manual.
CREATE TYPE status_contribuicao   AS ENUM ('pendente', 'confirmado', 'repassado', 'a_devolver', 'devolvido', 'reembolsado', 'erro', 'expirado', 'reembolso_manual');
CREATE TYPE meio_pagamento        AS ENUM ('pix', 'cartao_credito', 'cartao_debito', 'boleto');
CREATE TYPE fase_atualizacao      AS ENUM ('andamento', 'resultado_preliminar', 'resultado_final');
CREATE TYPE tipo_atualizacao      AS ENUM ('texto', 'imagem', 'pdf', 'linkexterno');
CREATE TYPE status_denuncia       AS ENUM ('pendente', 'em_analise', 'resolvida', 'improcedente');
CREATE TYPE status_encerramento   AS ENUM ('pendente', 'aprovado', 'rejeitado', 'cancelado');
CREATE TYPE tipo_motivo_denuncia  AS ENUM ('campanha', 'perfil');
CREATE TYPE status_notificacao    AS ENUM ('pendente', 'enviado', 'falhou', 'cancelado');
CREATE TYPE tipo_recompensa       AS ENUM ('fisica', 'digital', 'reconhecimento', 'acesso_antecipado', 'outro');


-- ============================================================
-- CONFIGURACOES (sistema)
-- ============================================================
CREATE TABLE configuracoes (
    id_config   SERIAL PRIMARY KEY,
    id_usuario  INT,                          -- FK adicionada após criação de usuario
    chave       VARCHAR(255) NOT NULL UNIQUE, -- [R11] UNIQUE necessário pro upsert(onConflict:'chave')
    valor       VARCHAR(100),
    tipo        tipo_configuracao NOT NULL,
    descricao   VARCHAR(255),
    ativo       BOOLEAN DEFAULT TRUE
);


-- ============================================================
-- PAPEL / PERMISSAO / RBAC
-- ============================================================
CREATE TABLE papel (
    id_papel SERIAL PRIMARY KEY,
    nome     VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE permissao (
    id_permissao SERIAL PRIMARY KEY,
    nome         VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE papel_permissao (
    id_papel     INT NOT NULL REFERENCES papel(id_papel)         ON DELETE CASCADE,
    id_permissao INT NOT NULL REFERENCES permissao(id_permissao) ON DELETE CASCADE,
    PRIMARY KEY (id_papel, id_permissao)
);


-- ============================================================
-- TIPO DE LINK ACADÊMICO
-- ============================================================
CREATE TABLE tipo_link (
    id_tipolink  SERIAL PRIMARY KEY,
    nome         VARCHAR(100) NOT NULL,
    ativo        BOOLEAN      DEFAULT TRUE,
    regex        TEXT,
    dominio      VARCHAR(255)
);

-- [melhoria] tipo_link agora é compartilhado por 3 contextos: perfil
-- acadêmico (Orcid, Lattes...), atualizações de campanha e recompensas.
-- Cada linha declara em quais contextos pode ser usada — assim "Orcid"
-- e "Lattes" continuam só para perfil, enquanto "YouTube"/"Site"/
-- "Google Drive" podem valer pra atualização e/ou recompensa também.
-- DEFAULT TRUE em permite_perfil preserva o comportamento das linhas
-- já existentes (todas eram, até então, só de perfil acadêmico).
ALTER TABLE tipo_link
    ADD COLUMN permite_perfil       BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN permite_atualizacao  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN permite_recompensa   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT chk_tipolink_algum_escopo
        CHECK (permite_perfil OR permite_atualizacao OR permite_recompensa);


-- ============================================================
-- AREA DE CONHECIMENTO
-- ============================================================
CREATE TABLE area_conhecimento (
    id_area_conhecimento SERIAL PRIMARY KEY,
    codigo_cnpq          VARCHAR(20)  NOT NULL UNIQUE,
    nome                 VARCHAR(100) NOT NULL,
    ativo                BOOLEAN      DEFAULT TRUE
);


-- ============================================================
-- MOTIVO DE DENÚNCIA
-- ============================================================
CREATE TABLE motivo_denuncia (
    id_motivo SERIAL PRIMARY KEY,
    codigo    VARCHAR(20)          NOT NULL UNIQUE,
    descricao VARCHAR(255),
    tipo      tipo_motivo_denuncia NOT NULL,
    -- CORRIGIDO: motivo_denuncia passou a ter indicador ativo/inativo.
    ativo     BOOLEAN             NOT NULL DEFAULT TRUE
);


-- ============================================================
-- USUARIO
-- ============================================================
CREATE TABLE usuario (
    id_usuario       SERIAL PRIMARY KEY,
    nome             VARCHAR(150) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    senha_hash       VARCHAR(255),             -- [R10] opcional
    id_supabase      UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    id_imagem_perfil INT,                     
    criado_em    TIMESTAMP    DEFAULT NOW(),
    deletado         BOOLEAN      DEFAULT FALSE
);

ALTER TABLE configuracoes
    ADD CONSTRAINT fk_config_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL;


-- ============================================================
-- USUARIO_PAPEL
-- ============================================================
CREATE TABLE usuario_papel (
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_papel   INT NOT NULL REFERENCES papel(id_papel)     ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_papel)
);


-- ============================================================
-- PERFIL PESQUISADOR
-- ============================================================
CREATE TABLE perfil_pesquisador (
    id_usuario            INT PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    cpf_criptografado     VARCHAR(255),
    vinculo_institucional VARCHAR(255),
    titulo_academico      titulo_academico,
    status_pesquisador    status_pesquisador DEFAULT 'ativo',
    ativado_em            TIMESTAMP,
    suspenso              BOOLEAN            DEFAULT FALSE,
    -- cache do score (agora em inteiro)
    score_atual           INTEGER            DEFAULT 0,
    score_atualizado_em   TIMESTAMP
);


-- ============================================================
-- LINK ACADEMICO
-- ============================================================
CREATE TABLE link_academico (
    id_link_academico SERIAL PRIMARY KEY,
    id_usuario        INT  NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_tipolink       INT  NOT NULL REFERENCES tipo_link(id_tipolink),
    ordem             INT,
    url               VARCHAR(500) NOT NULL
);


-- ============================================================
-- ARQUIVO
-- ============================================================
CREATE TABLE arquivo (
    id_arquivo    SERIAL PRIMARY KEY,
    url           TEXT         NOT NULL,
    nome_original TEXT         NOT NULL,
    tipo_mime     VARCHAR(255),
    tamanho_bytes INT,
    criado_em     TIMESTAMP    DEFAULT NOW(),
    ativo         BOOLEAN      DEFAULT TRUE,
    desativado_em TIMESTAMP
);

ALTER TABLE usuario
    ADD CONSTRAINT fk_usuario_imagem
    FOREIGN KEY (id_imagem_perfil) REFERENCES arquivo(id_arquivo) ON DELETE SET NULL;


-- ============================================================
-- CAMPANHA
-- ============================================================
CREATE TABLE campanha (
    id_campanha          SERIAL PRIMARY KEY,
    id_usuario           INT             NOT NULL REFERENCES usuario(id_usuario),
    id_admin             INT                      REFERENCES usuario(id_usuario),
    id_area_conhecimento INT                      REFERENCES area_conhecimento(id_area_conhecimento),
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
    criado_em            TIMESTAMP       DEFAULT NOW(),
    -- DEFINIDO PELA EQUIPE: prazo mínimo de 15 dias e máximo de 90 dias corridos, contados a partir da aprovação da campanha (RF-045).
    CONSTRAINT chk_prazo_campanha CHECK (
        data_fim IS NULL OR data_inicio IS NULL OR
        (data_fim - data_inicio) BETWEEN INTERVAL '15 days' AND INTERVAL '90 days'
    )
);


-- ============================================================
-- SEGUIR CAMPANHA
-- ============================================================
CREATE TABLE seguir_campanha (
    id_seg_campanha SERIAL PRIMARY KEY,
    id_usuario      INT NOT NULL REFERENCES usuario(id_usuario)   ON DELETE CASCADE,
    id_campanha     INT NOT NULL REFERENCES campanha(id_campanha) ON DELETE CASCADE,
    seguido_em      TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_usuario, id_campanha)
);


-- ============================================================
-- SEGUIR PESQUISADOR
-- ============================================================
CREATE TABLE seguir_pesquisador (
    id_seg_pesquisador SERIAL PRIMARY KEY,
    id_usuario         INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_pesquisador     INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    seguido_em         TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_usuario, id_pesquisador),
    CONSTRAINT chk_nao_seguir_si_mesmo CHECK (id_usuario <> id_pesquisador)
);


-- ============================================================
-- CONTRIBUICAO
-- ============================================================
CREATE TABLE contribuicao (
    id_contribuicao  SERIAL PRIMARY KEY,
    id_campanha      INT                 NOT NULL REFERENCES campanha(id_campanha),
    id_usuario       INT                          REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    -- CORRIGIDO: valor mínimo de contribuição definido em R$ 5,00.
    valor            DECIMAL(10,2)       NOT NULL CHECK (valor >= 5.00),
    meio_pagamento   meio_pagamento      NOT NULL,
    status           status_contribuicao NOT NULL DEFAULT 'pendente',
    anonima          BOOLEAN             DEFAULT FALSE,
    id_transacao_api VARCHAR(255),
    criado_em        TIMESTAMP           DEFAULT NOW()
);

-- CORRIGIDO: token de sessão para evitar que contribuições anônimas sejam enumeradas sequencialmente por terceiros.
ALTER TABLE contribuicao ADD COLUMN token_sessao UUID DEFAULT gen_random_uuid();


-- ============================================================
-- AUDITORIA FINANCEIRA
-- ============================================================
-- CORRIGIDO: auditoria_financeira passou a congelar valor e meio de pagamento no momento do evento.
CREATE TABLE auditoria_financeira (
    id_auditoria    SERIAL PRIMARY KEY,
    id_contribuicao INT          NOT NULL REFERENCES contribuicao(id_contribuicao),
    -- CORRIGIDO: auditoria financeira agora registra também o usuário/processo responsável pelo evento.
    id_usuario_responsavel INT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    valor           DECIMAL(10,2) NOT NULL,
    meio_pagamento  meio_pagamento,
    status_novo     VARCHAR(100) NOT NULL,
    status_anterior VARCHAR(100),
    evento          VARCHAR(200),
    timestamp       TIMESTAMP    DEFAULT NOW()
);


-- ============================================================
-- ATUALIZACAO CAMPANHA
-- ============================================================
CREATE TABLE atualizacao_campanha (
    id_atualizacao SERIAL PRIMARY KEY,
    id_campanha    INT              NOT NULL REFERENCES campanha(id_campanha) ON DELETE CASCADE,
    conteudo       TEXT             NOT NULL,
    publicado_em   TIMESTAMP        DEFAULT NOW(),
    fase           fase_atualizacao,
    tipo           tipo_atualizacao
);


-- ============================================================
-- ARQUIVO_ATUALIZACAO
-- ============================================================
CREATE TABLE arquivo_atualizacao (
    id_arq_atu     SERIAL PRIMARY KEY,
    id_arquivo     INT NOT NULL REFERENCES arquivo(id_arquivo)                  ON DELETE CASCADE,
    id_atualizacao INT NOT NULL REFERENCES atualizacao_campanha(id_atualizacao) ON DELETE CASCADE,
    UNIQUE (id_arquivo, id_atualizacao)
);


-- ============================================================
-- REPASSE
-- ============================================================
CREATE TABLE repasse (
    id_repasse    SERIAL PRIMARY KEY,
    id_campanha   INT           NOT NULL REFERENCES campanha(id_campanha),
    valor_bruto   DECIMAL(10,2) NOT NULL,
    valor_liquido DECIMAL(10,2) NOT NULL,
    meta_atingida BOOLEAN       DEFAULT FALSE,
    repassado_em  TIMESTAMP,
    taxa_relativa DECIMAL(5,2),
    status        VARCHAR(100)
);

-- CORRIGIDO: trigger que bloqueia repasse indevido em campanha
-- all-or-nothing que não atingiu a meta financeira.
CREATE OR REPLACE FUNCTION fn_valida_repasse_all_or_nothing()
RETURNS TRIGGER AS $$
DECLARE
    v_modelo     modelo_campanha;
    v_meta       DECIMAL;
    v_arrecadado DECIMAL;
BEGIN
    SELECT modelo, meta_financeira, valor_bruto_arrecadado
    INTO v_modelo, v_meta, v_arrecadado
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    -- CORRIGIDO: só bloqueia se houver tentativa real de liberar
    -- dinheiro (valor_liquido > 0); registro de "nada repassado" 
    -- (RF-038, valor_liquido = 0) continua permitido.
    IF v_modelo = 'all-or-nothing' AND v_arrecadado < v_meta AND NEW.valor_liquido > 0 THEN
        RAISE EXCEPTION 'Repasse bloqueado: campanhas all-or-nothing só podem repassar valores se a meta financeira for atingida.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_repasse
BEFORE INSERT ON repasse
FOR EACH ROW
EXECUTE FUNCTION fn_valida_repasse_all_or_nothing();


-- ============================================================
-- SOLICITACAO DE ENCERRAMENTO
-- ============================================================
CREATE TABLE solicitacao_encerramento (
    id_solicitacao_encerramento SERIAL PRIMARY KEY,
    id_campanha                 INT                 NOT NULL REFERENCES campanha(id_campanha),
    id_admin                    INT                          REFERENCES usuario(id_usuario),
    justificativa_pesquisador   TEXT,
    status                      status_encerramento NOT NULL DEFAULT 'pendente',
    solicitado_em               TIMESTAMP           DEFAULT NOW(),
    avaliado_em                 TIMESTAMP
);


-- ============================================================
-- HISTORICO REJEICAO
-- ============================================================
CREATE TABLE historico_rejeicao (
    id_rejeicao   SERIAL PRIMARY KEY,
    id_campanha   INT  NOT NULL REFERENCES campanha(id_campanha),
    id_admin      INT           REFERENCES usuario(id_usuario),
    justificativa TEXT,
    rejeitado_em  TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- COMENTARIO
-- ============================================================
CREATE TABLE comentario (
    id_comentario  SERIAL PRIMARY KEY,
    id_campanha    INT          NOT NULL REFERENCES campanha(id_campanha)              ON DELETE CASCADE,
    id_pesquisador INT          REFERENCES perfil_pesquisador(id_usuario) ON DELETE SET NULL,
    conteudo       VARCHAR(500) NOT NULL,
    endossado      BOOLEAN      DEFAULT FALSE,
    criado_em      TIMESTAMP    DEFAULT NOW(),
    ordem_endosso  INT,
    -- CORRIGIDO: comentários passaram a ter unicidade por campanha e pesquisador.
    UNIQUE (id_campanha, id_pesquisador),
    -- CORRIGIDO: endossado e ordem_endosso agora ficam coerentes entre si.
    CONSTRAINT chk_comentario_endosso
        CHECK ((endossado = TRUE AND ordem_endosso IS NOT NULL) OR (endossado = FALSE AND ordem_endosso IS NULL))
);

-- CORRIGIDO: trigger que bloqueia novos comentários em campanhas
-- que foram rejeitadas ou banidas pela moderação.
CREATE OR REPLACE FUNCTION fn_valida_comentario_campanha_ativa()
RETURNS TRIGGER AS $$
DECLARE
    v_status status_campanha;
BEGIN
    SELECT status INTO v_status
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF v_status IN ('rejeitado', 'encerrado_moderacao') THEN
        RAISE EXCEPTION 'Operação bloqueada: não é possível comentar em campanhas rejeitadas ou sob moderação.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_comentario_status
BEFORE INSERT ON comentario
FOR EACH ROW
EXECUTE FUNCTION fn_valida_comentario_campanha_ativa();


-- ============================================================
-- DENUNCIA
-- ============================================================
CREATE TABLE denuncia (
    id_denuncia         SERIAL PRIMARY KEY,
    id_usuario          INT  NOT NULL REFERENCES usuario(id_usuario),
    id_campanha_alvo    INT           REFERENCES campanha(id_campanha) ON DELETE SET NULL,
    id_pesquisador_alvo INT           REFERENCES usuario(id_usuario)   ON DELETE SET NULL,
    id_motivo           INT  NOT NULL REFERENCES motivo_denuncia(id_motivo),
    status              status_denuncia NOT NULL DEFAULT 'pendente',
    criado_em           TIMESTAMP    DEFAULT NOW(),
    -- CORRIGIDO: denúncias passaram a ter unicidade por alvo e limite de taxa temporal.
    UNIQUE (id_usuario, id_campanha_alvo),
    UNIQUE (id_usuario, id_pesquisador_alvo)
);


-- ============================================================
-- TRIGGERS E FUNÇÕES DE REGRAS DE NEGÓCIO
-- ============================================================
CREATE OR REPLACE FUNCTION validar_contribuicao_all_or_nothing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_modelo campanha.modelo%TYPE;
BEGIN
    SELECT modelo INTO v_modelo
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF FOUND AND v_modelo = 'all-or-nothing' AND NEW.meio_pagamento <> 'pix' THEN
        RAISE EXCEPTION 'Campanhas all-or-nothing aceitam apenas contribuições via PIX';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contribuicao_all_or_nothing_pix
BEFORE INSERT ON contribuicao
FOR EACH ROW
EXECUTE FUNCTION validar_contribuicao_all_or_nothing();

-- CORRIGIDO: trigger que impede a alteração de regras financeiras
-- após a campanha ser aprovada/lançada (status 'ativo' em diante,
-- incluindo encerramento por moderação).
CREATE OR REPLACE FUNCTION fn_congela_regras_campanha()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao') THEN
        IF NEW.meta_financeira <> OLD.meta_financeira THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar a meta financeira após a aprovação da campanha.';
        END IF;

        IF NEW.modelo <> OLD.modelo THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o modelo de financiamento após a aprovação da campanha.';
        END IF;

        IF NEW.taxa_plataforma <> OLD.taxa_plataforma THEN
            RAISE EXCEPTION 'Operação bloqueada: a taxa da plataforma não pode ser alterada após o congelamento.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_congela_regras_campanha
BEFORE UPDATE ON campanha
FOR EACH ROW
EXECUTE FUNCTION fn_congela_regras_campanha();

-- CORRIGIDO: trigger que bloqueia contribuição em campanha que não
-- está ativa (status) ou cujo prazo já expirou (data_fim).
CREATE OR REPLACE FUNCTION fn_valida_contribuicao_campanha_ativa()
RETURNS TRIGGER AS $$
DECLARE
    v_status   status_campanha;
    v_data_fim TIMESTAMP;
BEGIN
    SELECT status, data_fim INTO v_status, v_data_fim
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF v_status <> 'ativo' THEN
        RAISE EXCEPTION 'Contribuição bloqueada: a campanha não está ativa no momento (status atual: %)', v_status;
    END IF;

    IF v_data_fim IS NOT NULL AND NOW() > v_data_fim THEN
        RAISE EXCEPTION 'Contribuição bloqueada: o prazo da campanha já foi encerrado.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_status_contribuicao
BEFORE INSERT ON contribuicao
FOR EACH ROW
EXECUTE FUNCTION fn_valida_contribuicao_campanha_ativa();

-- CORRIGIDO: trigger que sincroniza o valor bruto arrecadado da campanha
-- sempre que houver alteração nas contribuições da campanha.
CREATE OR REPLACE FUNCTION fn_sincroniza_arrecadado_campanha()
RETURNS TRIGGER AS $$
DECLARE
    v_id_campanha INT;
    v_total       DECIMAL(10,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_id_campanha := OLD.id_campanha;
    ELSE
        v_id_campanha := NEW.id_campanha;
    END IF;

    SELECT COALESCE(SUM(valor), 0)
    INTO v_total
    FROM contribuicao
    WHERE id_campanha = v_id_campanha;

    UPDATE campanha
    SET valor_bruto_arrecadado = COALESCE(v_total, 0)
    WHERE id_campanha = v_id_campanha;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sincroniza_arrecadado_campanha
AFTER INSERT OR UPDATE OR DELETE ON contribuicao
FOR EACH ROW
EXECUTE FUNCTION fn_sincroniza_arrecadado_campanha();

CREATE OR REPLACE FUNCTION validar_limite_campanhas_pesquisador()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
BEGIN
    IF NEW.status IN ('aguardando_aprovacao', 'ativo') THEN
        SELECT COUNT(*) INTO v_count
        FROM campanha
        WHERE id_usuario = NEW.id_usuario
          AND status IN ('aguardando_aprovacao', 'ativo')
          AND id_campanha <> COALESCE(NEW.id_campanha, -1);

        IF v_count >= 2 THEN
            RAISE EXCEPTION 'Pesquisador já possui o limite máximo de 2 campanhas ativas ou aguardando aprovação';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_campanha_limite_simultaneo
BEFORE INSERT OR UPDATE ON campanha
FOR EACH ROW
EXECUTE FUNCTION validar_limite_campanhas_pesquisador();

CREATE OR REPLACE FUNCTION validar_atualizacao_campanha()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_status status_campanha;
BEGIN
    SELECT status INTO v_status
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF FOUND AND v_status NOT IN ('ativo', 'sucesso', 'nao_atingido') THEN
        RAISE EXCEPTION 'Atualizações de campanha só são permitidas para campanhas ativas, com sucesso ou não atingidas';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_atualizacao_campanha_status
BEFORE INSERT ON atualizacao_campanha
FOR EACH ROW
EXECUTE FUNCTION validar_atualizacao_campanha();

CREATE OR REPLACE FUNCTION validar_comentario_endosso()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
BEGIN
    IF NEW.ordem_endosso IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM comentario
        WHERE id_campanha = NEW.id_campanha
          AND ordem_endosso IS NOT NULL
          AND id_comentario <> COALESCE(NEW.id_comentario, -1);

        IF v_count >= 4 THEN
            RAISE EXCEPTION 'Campanha já atingiu o limite máximo de 4 endossos ativos';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comentario_limite_endosso
BEFORE INSERT OR UPDATE ON comentario
FOR EACH ROW
EXECUTE FUNCTION validar_comentario_endosso();

CREATE OR REPLACE FUNCTION validar_comentario_autor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_usuario integer;
BEGIN
    SELECT id_usuario INTO v_id_usuario
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF FOUND AND v_id_usuario = NEW.id_pesquisador THEN
        RAISE EXCEPTION 'Pesquisador não pode comentar em sua própria campanha';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comentario_sem_autoria
BEFORE INSERT ON comentario
FOR EACH ROW
EXECUTE FUNCTION validar_comentario_autor();

CREATE OR REPLACE FUNCTION validar_denuncia_frequencia()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM denuncia
    WHERE id_usuario = NEW.id_usuario
      AND criado_em >= NOW() - INTERVAL '24 hours';

    IF v_count >= 5 THEN
        RAISE EXCEPTION 'Usuário já atingiu o limite de 5 denúncias nas últimas 24 horas';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_denuncia_limite_taxa
BEFORE INSERT ON denuncia
FOR EACH ROW
EXECUTE FUNCTION validar_denuncia_frequencia();

-- ============================================================
-- SCORE
-- ============================================================
CREATE TABLE score_config (
    id_score_config SERIAL PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    descricao       VARCHAR(255),
    peso            DECIMAL(5,2) NOT NULL,
    id_pai          INT          REFERENCES score_config(id_score_config) ON DELETE SET NULL,
    ativo           BOOLEAN      DEFAULT TRUE,
    criado_em       TIMESTAMP    DEFAULT NOW(),
    atualizado_em   TIMESTAMP    DEFAULT NOW()
);

-- ============================================================
-- SCORE — rótulos (com INTEGER)
-- ============================================================
CREATE TABLE score_rotulo (
    id_rotulo     SERIAL PRIMARY KEY,
    rotulo        VARCHAR(50)  NOT NULL,
    descricao     VARCHAR(255),
    score_minimo  INTEGER      NOT NULL,
    score_maximo  INTEGER      NOT NULL,
    ativo         BOOLEAN      DEFAULT TRUE,
    criado_em     TIMESTAMP    DEFAULT NOW(),
    atualizado_em TIMESTAMP    DEFAULT NOW(),
    CONSTRAINT chk_faixa CHECK (score_minimo < score_maximo)
);

-- ============================================================
-- SCORE — histórico de pontuação por pesquisador (INTEGER)
-- ============================================================
CREATE TABLE score_pesquisador (
    id_score_pesq   SERIAL PRIMARY KEY,
    id_usuario      INT          NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_score_config INT          NOT NULL REFERENCES score_config(id_score_config),
    id_rotulo       INT                   REFERENCES score_rotulo(id_rotulo) ON DELETE SET NULL,
    pontos_obtidos  INTEGER      NOT NULL,
    score_total     INTEGER,
    calculado_em    TIMESTAMP    DEFAULT NOW(),
    motivo          VARCHAR(255),
    
    CONSTRAINT uq_score_pesquisador_usuario_config 
        UNIQUE (id_usuario, id_score_config)
);


-- ============================================================
-- NOTA DE REORGANIZAÇÃO (movido de artificios.sql):
-- O bloco abaixo apenas garante, de forma defensiva/idempotente,
-- a mesma UNIQUE constraint que a tabela score_pesquisador já
-- declara acima (uq_score_pesquisador_usuario_config). Hoje ele é
-- redundante (não faz nada, pois a constraint já existe desde a
-- criação da tabela) — mantido aqui por segurança/histórico, mas
-- pode ser removido com segurança em uma limpeza futura.
-- ============================================================
-- ============================================================
-- 1. MELHORIA NO BANCO: índice único pra permitir UPSERT
--    score_pesquisador não tinha como saber "essa linha já existe
--    pra esse usuário+dimensão" — impossível fazer UPSERT sem isso.
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_score_pesquisador_usuario_config'
    ) THEN
        ALTER TABLE score_pesquisador
            ADD CONSTRAINT uq_score_pesquisador_usuario_config 
            UNIQUE (id_usuario, id_score_config);
    END IF;
END $$;


-- ============================================================
-- NOVAS TABELAS (acrescentadas em 2026-07 — presentes só no diagrama)
-- Todas referenciam tabelas já criadas acima, então podem ficar
-- no fim do arquivo sem quebrar a ordem de dependência de FKs.
-- ============================================================

-- ============================================================
-- TERMOS_DE_USO
-- ============================================================
CREATE TABLE termos_de_uso (
    id_termo  SERIAL PRIMARY KEY,
    versao    VARCHAR(20) NOT NULL UNIQUE,   -- ex: "2026-07-01", "v3" — precisa ser única
    conteudo  TEXT        NOT NULL,
    ativo     BOOLEAN     DEFAULT TRUE,
    criado_em TIMESTAMP   DEFAULT NOW()      -- [melhoria] registra quando cada versão entrou em vigor
);


-- ============================================================
-- USUARIO_TERMO
-- ============================================================
CREATE TABLE usuario_termo (
    id_usuario_termo SERIAL PRIMARY KEY,
    id_usuario       INT NOT NULL REFERENCES usuario(id_usuario)     ON DELETE CASCADE,
    id_termo         INT NOT NULL REFERENCES termos_de_uso(id_termo) ON DELETE RESTRICT, -- não deixa apagar um termo já aceito por alguém
    aceito_em        TIMESTAMP DEFAULT NOW(),
    ip_aceite        VARCHAR(45),            -- [melhoria] trilha de auditoria (LGPD): IPv4/IPv6 de quem aceitou
    UNIQUE (id_usuario, id_termo)            -- [melhoria] mesmo usuário não aceita a mesma versão duas vezes
);


-- ============================================================
-- NOTIFICACAO
-- ============================================================
CREATE TABLE notificacao (
    id_notificacao     SERIAL PRIMARY KEY,
    id_usuario         INT REFERENCES usuario(id_usuario) ON DELETE SET NULL, -- mantém o histórico de envio mesmo se o usuário for removido
    email_destinatario VARCHAR(255)       NOT NULL,          -- snapshot do e-mail no momento do envio (usuário pode trocar o e-mail depois)
    tipo_evento        VARCHAR(100)       NOT NULL,          -- ex: 'campanha_aprovada', 'doacao_recebida' — texto livre, como "evento" em auditoria_financeira
    status             status_notificacao NOT NULL DEFAULT 'pendente',
    tentativas         INT                NOT NULL DEFAULT 0,
    criado_em          TIMESTAMP          DEFAULT NOW(),
    enviado_em         TIMESTAMP,                             -- [melhoria] quando o envio de fato teve sucesso (NULL até lá)
    ultimo_erro        TEXT,                                  -- [melhoria] guarda o motivo da última falha, útil pra debugar retentativas
    CONSTRAINT chk_notificacao_tentativas CHECK (tentativas >= 0)
);


-- ============================================================
-- RECOMPENSA
-- ============================================================
CREATE TABLE recompensa (
    id_recompensa         SERIAL PRIMARY KEY,
    id_campanha           INT             NOT NULL REFERENCES campanha(id_campanha) ON DELETE CASCADE,
    titulo                VARCHAR(150)    NOT NULL,
    descricao             TEXT,
    valor_minimo          DECIMAL(10,2)   NOT NULL,          -- contribuição mínima pra desbloquear essa recompensa
    quantidade_disponivel INT,                                -- NULL = ilimitada
    tipo                  tipo_recompensa NOT NULL DEFAULT 'outro',
    ativo                 BOOLEAN         DEFAULT TRUE,
    criado_em             TIMESTAMP       DEFAULT NOW(),      -- [melhoria]
    CONSTRAINT chk_recompensa_valor_minimo CHECK (valor_minimo > 0),
    CONSTRAINT chk_recompensa_quantidade   CHECK (quantidade_disponivel IS NULL OR quantidade_disponivel >= 0)
);


-- ============================================================
-- ARQUIVO_RECOMPENSA
-- ============================================================
CREATE TABLE arquivo_recompensa (
    id_arq_recompensa SERIAL PRIMARY KEY,
    id_recompensa     INT NOT NULL REFERENCES recompensa(id_recompensa) ON DELETE CASCADE,
    id_arquivo        INT NOT NULL REFERENCES arquivo(id_arquivo)       ON DELETE CASCADE,
    ordem             INT,
    principal         BOOLEAN DEFAULT FALSE,
    UNIQUE (id_recompensa, id_arquivo)
);



-- ============================================================
-- CONTRIBUICAO_RECOMPENSA (acrescentada em 2026-07)
-- Permite que uma mesma contribuição adquira várias recompensas.
-- ============================================================
CREATE TABLE contribuicao_recompensa (
    id_contrib_recompensa SERIAL PRIMARY KEY,
    id_contribuicao       INT NOT NULL REFERENCES contribuicao(id_contribuicao) ON DELETE CASCADE,
    id_recompensa         INT NOT NULL REFERENCES recompensa(id_recompensa)     ON DELETE RESTRICT, -- não deixa apagar recompensa já adquirida por alguém
    quantidade            INT NOT NULL DEFAULT 1,          -- [melhoria] mesma recompensa pode ser levada em mais de 1 unidade
    adquirida_em          TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_contrib_recompensa_qtd CHECK (quantidade > 0),
    UNIQUE (id_contribuicao, id_recompensa) -- 1 linha por par; quantidade acumula em vez de duplicar linha
);


-- ============================================================
-- LINK_ATUALIZACAO (acrescentada em 2026-07)
-- Reaproveita tipo_link para os links de uma atualização de campanha
-- (ex.: link pro artigo publicado, vídeo, planilha de resultado).
-- Mesmo formato de link_academico.
-- ============================================================
CREATE TABLE link_atualizacao (
    id_link_atualizacao SERIAL PRIMARY KEY,
    id_atualizacao      INT NOT NULL REFERENCES atualizacao_campanha(id_atualizacao) ON DELETE CASCADE,
    id_tipolink         INT NOT NULL REFERENCES tipo_link(id_tipolink),
    ordem               INT,
    url                 VARCHAR(500) NOT NULL
);


-- ============================================================
-- LINK_RECOMPENSA (acrescentada em 2026-07)
-- Reaproveita tipo_link para os links de uma recompensa
-- (ex.: link de download digital, loja externa, formulário de resgate).
-- Mesmo formato de link_academico.
-- ============================================================
CREATE TABLE link_recompensa (
    id_link_recompensa SERIAL PRIMARY KEY,
    id_recompensa      INT NOT NULL REFERENCES recompensa(id_recompensa) ON DELETE CASCADE,
    id_tipolink        INT NOT NULL REFERENCES tipo_link(id_tipolink),
    ordem              INT,
    url                VARCHAR(500) NOT NULL
);




-- ============================================================
-- ACEITE_TERMO_CONTRIBUICAO
-- ============================================================
-- CORRIGIDO: nova tabela para registrar o aceite de termos por
-- transação (RF-054/RF-055), inclusive para contribuinte anônimo.
CREATE TABLE aceite_termo_contribuicao (
    id_aceite_contrib SERIAL PRIMARY KEY,
    id_contribuicao   INT NOT NULL REFERENCES contribuicao(id_contribuicao) ON DELETE CASCADE,
    id_termo          INT NOT NULL REFERENCES termos_de_uso(id_termo)       ON DELETE RESTRICT,
    aceito_em         TIMESTAMP DEFAULT NOW(),
    ip_aceite         VARCHAR(45),
    UNIQUE (id_contribuicao)
);