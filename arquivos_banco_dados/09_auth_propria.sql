-- ============================================================
--  CrowdAcadêmico — 09: AUTENTICAÇÃO PRÓPRIA (tabelas de suporte)
--  Depende de: 01_extensoes_enums_tabelas.sql (tabela usuario)
--  Próximo arquivo: nenhum (último da sequência de auth)
-- ============================================================
--
--  NOVO: estas três tabelas substituem funcionalidades que antes
--  eram resolvidas pelo Supabase Auth (GoTrue) e que agora passam a
--  ser responsabilidade do NestJS + Postgres.
-- ============================================================


-- ============================================================
-- VERIFICACAO_EMAIL
-- ============================================================
-- Confirmação de e-mail no cadastro. Tabela própria (em vez de
-- coluna solta em usuario) porque pode haver mais de um pedido de
-- confirmação (usuário perde o e-mail, pede de novo) e cada token
-- antigo precisa poder ser invalidado sem apagar histórico.
-- A flag usuario.email_verificado (ver 01) é o que o resto do
-- sistema consulta; esta tabela guarda só o processo de chegar lá.
CREATE TABLE verificacao_email (
    id_verificacao SERIAL PRIMARY KEY,
    id_usuario     INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token_hash     VARCHAR(255) NOT NULL,   -- nunca gravar o token em texto puro
    criado_em      TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em      TIMESTAMP NOT NULL,
    confirmado_em  TIMESTAMP
);


-- ============================================================
-- RECUPERACAO_SENHA
-- ============================================================
-- "Esqueci minha senha": gera token, envia e-mail, valida, troca a
-- senha e invalida o token. Antes era resolvido pelo fluxo nativo
-- do Supabase Auth.
CREATE TABLE recuperacao_senha (
    id_recuperacao SERIAL PRIMARY KEY,
    id_usuario     INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token_hash     VARCHAR(255) NOT NULL,
    criado_em      TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em      TIMESTAMP NOT NULL,     -- recomendado: expiração curta, 15-30 min
    usado_em       TIMESTAMP
);


-- ============================================================
-- SESSAO (refresh tokens)
-- ============================================================
-- Sem o Supabase Auth, quem emite e assina o JWT é o próprio NestJS.
-- Para suportar "sair", "sair de todos os dispositivos" e revogar um
-- token comprometido, os refresh tokens emitidos precisam ser
-- persistidos aqui (um JWT sozinho, stateless, não permite revogação).
CREATE TABLE sessao (
    id_sessao          SERIAL PRIMARY KEY,
    id_usuario         INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    criado_em          TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em          TIMESTAMP NOT NULL,
    revogado_em        TIMESTAMP,
    ip                 VARCHAR(45),
    user_agent         TEXT
);


-- ============================================================
-- RLS destas três tabelas
-- ============================================================
-- Mesmo padrão já usado para "notificacao" em 04/05: quem grava e lê
-- token_hash de verificação/recuperação e refresh tokens é só o
-- backend (NestJS), nunca o usuário final diretamente. Por isso RLS
-- fica habilitada e SEM NENHUMA policy — ninguém além do dono da
-- tabela (ou de um role com BYPASSRLS) consegue acessar, o que é o
-- comportamento desejado aqui. Não se cria GRANT para anon/authenticated
-- nestas tabelas.
ALTER TABLE verificacao_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE recuperacao_senha ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessao            ENABLE ROW LEVEL SECURITY;
