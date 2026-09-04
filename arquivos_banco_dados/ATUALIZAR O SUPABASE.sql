-- ============================================================================
-- Este arquivo é TEMPORÁRIO - depois a gente deleta.
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
-- inteiro de novo sem medo) - se algum dia entrar um bloco que não seja,
-- vai vir com um aviso bem visível.
-- ============================================================================


-- ============================================================================
-- 25-08-2026 (Excluir campanha)


DROP POLICY IF EXISTS pol_campanha_delete ON campanha;
CREATE POLICY pol_campanha_delete ON campanha FOR DELETE TO app_nestjs USING (
    status = 'aguardando_aprovacao'
    AND (id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
);

GRANT DELETE ON campanha TO app_nestjs;


-- ============================================================================
-- 24-08-2026 - módulo 25-arquivo implementado (upload via Backblaze B2,
-- URL pré-assinada, confirmação em 2 passos) - mudanças em
-- 01_extensoes_enums_tabelas.sql e 02_indices.sql, e 2 chaves novas em
-- 07_seed_dados.sql/configuracoes.
--
-- Seguro rodar de novo? O bloco de ALTER/CREATE INDEX sim (idempotente,
-- ver cada instrução). O INSERT da chave de configuração usa
-- ON CONFLICT (chave) DO NOTHING - também seguro repetir.
--
-- ATENÇÃO - ORDEM IMPORTA: se a tabela `arquivo` já tem linhas (mesmo que
-- de teste) com a coluna antiga `url` preenchida, o RENAME abaixo preserva
-- o CONTEÚDO dessas linhas na coluna `chave` - mas esse conteúdo era uma
-- URL COMPLETA (ex. "https://dominio-antigo/arquivo.jpg"), não uma chave
-- de objeto ("publico/uuid.jpg"). Se o banco já tinha arquivos de teste
-- gravados por um protótipo anterior, rode
-- `SELECT id_arquivo, chave FROM arquivo;` depois do RENAME e corrija à
-- mão as linhas que ainda têm URL completa - o módulo novo só entende
-- chave de objeto. Num banco sem nenhuma linha em `arquivo` ainda (mais
-- provável, já que o módulo nunca existiu até agora), não há nada pra
-- corrigir.
-- ============================================================================

ALTER TABLE arquivo RENAME COLUMN url TO chave;
ALTER TABLE arquivo ADD CONSTRAINT "UK_ARQUIVO_CHAVE" UNIQUE (chave);
ALTER TABLE arquivo ADD COLUMN IF NOT EXISTS id_usuario_upload INT;

-- Só adiciona a FK se ela ainda não existir (colar este arquivo de novo
-- não pode tentar criar a mesma constraint duas vezes).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_ARQUIVO_USUARIO_UPLOAD'
    ) THEN
        ALTER TABLE arquivo
            ADD CONSTRAINT "FK_ARQUIVO_USUARIO_UPLOAD"
            FOREIGN KEY (id_usuario_upload) REFERENCES usuario(id_usuario) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_arquivo_usuario_upload ON arquivo(id_usuario_upload);

INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo) VALUES
(NULL, 'avatar_padrao_chave', NULL, 'texto', 'Chave do objeto (no bucket) usado como avatar de quem não tem foto de perfil cadastrada - definir após a equipe escolher a imagem', TRUE)
ON CONFLICT (chave) DO NOTHING;


-- ============================================================================
-- 30-08-2026 - excluir_conta_usuario() passou a desativar (ativo=false) a
-- foto de perfil vinculada, na mesma transação da exclusão da conta.
-- Seguro rodar de novo? Sim - CREATE OR REPLACE FUNCTION é idempotente por
-- natureza, substitui a definição sem duplicar nada.
-- ============================================================================

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

    IF v_id_imagem_perfil IS NOT NULL THEN
        UPDATE arquivo
        SET ativo = FALSE, desativado_em = NOW()
        WHERE id_arquivo = v_id_imagem_perfil;
    END IF;
END;
$$;


-- ============================================================================
-- 04-09-2026 - RF-108: moderador ganhou permissão pra encerrar campanha por
-- moderação (antes só o admin conseguia, mesmo o moderador já podendo julgar
-- a denúncia como procedente). Permissão nova 'campanha_encerrar_moderacao'
-- (escopo estreito: só a transição ativo -> encerrado_moderacao, não
-- qualquer transição) + fn_valida_transicao_campanha() com um 6º ramo.
--
-- Seguro rodar de novo? Sim - o INSERT de permissao usa ON CONFLICT (nome) DO
-- NOTHING, o de papel_permissao usa ON CONFLICT (id_papel, id_permissao) DO
-- NOTHING, e CREATE OR REPLACE FUNCTION substitui sem duplicar. A concessão
-- pro papel 'admin' não precisa de INSERT explícito aqui - a trigger
-- trg_admin_recebe_toda_permissao já concede automaticamente qualquer
-- permissão nova assim que a linha abaixo é inserida.
-- ============================================================================

INSERT INTO permissao (nome) VALUES
('campanha_encerrar_moderacao')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO papel_permissao (id_papel, id_permissao)
SELECT p.id_papel, perm.id_permissao
FROM papel p
JOIN permissao perm ON TRUE
WHERE (p.nome, perm.nome) = ('moderador', 'campanha_encerrar_moderacao')
ON CONFLICT (id_papel, id_permissao) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_valida_transicao_campanha()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status      IS NOT DISTINCT FROM OLD.status
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin THEN
        RETURN NEW;
    END IF;

    IF public.tem_permissao('campanha_aprovar')
       OR public.tem_permissao('campanha_rejeitar')
       OR public.tem_permissao('solicitacao_encerramento_decidir') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'ativo'
       AND OLD.data_fim IS NOT NULL AND OLD.data_fim <= NOW()
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND (
            (NEW.status = 'sucesso'      AND NEW.valor_bruto_arrecadado >= NEW.meta_financeira)
         OR (NEW.status = 'nao_atingido' AND NEW.valor_bruto_arrecadado <  NEW.meta_financeira)
       )
    THEN
        RETURN NEW;
    END IF;

    IF NEW.id_usuario = public.id_usuario_atual()
       AND OLD.status = 'rejeitado' AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
    THEN
        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND (
            (OLD.status = 'ativo'               AND NEW.status = 'encerrado_moderacao')
         OR (OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado')
       )
       AND EXISTS (
           SELECT 1 FROM perfil_pesquisador pp
           WHERE pp.id_usuario = NEW.id_usuario AND pp.status_pesquisador = 'suspenso'
       )
    THEN
        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND OLD.status = 'ativo' AND NEW.status = 'encerrado_moderacao'
       AND public.tem_permissao('campanha_encerrar_moderacao')
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status de campanha não autorizada.'
        USING ERRCODE = '92001';
END;
$$;


-- ============================================================================
-- 04-09-2026 - limites de upload de arquivo viraram configuráveis pelo
-- Painel Admin (tamanho mín./máx. por tipo, cota por usuário, rate limit
-- de quantidade/intervalo entre uploads). Nenhuma mudança de schema - só
-- 7 chaves novas em `configuracoes`, lidas pelo Nest (ConfiguracaoValorService,
-- commons/configuracao) em vez dos valores hardcoded de antes.
--
-- Seguro rodar de novo? Sim - ON CONFLICT (chave) DO NOTHING.
-- ============================================================================

INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo) VALUES
(NULL, 'arquivo_tamanho_minimo_bytes',          '100',      'inteiro', 'Tamanho mínimo aceito por arquivo enviado, em bytes - barra arquivo vazio/corrompido', TRUE),
(NULL, 'arquivo_tamanho_maximo_imagem_bytes',   '8388608',  'inteiro', 'Tamanho máximo aceito por imagem enviada (JPEG/PNG/WebP), em bytes (RF-017)', TRUE),
(NULL, 'arquivo_tamanho_maximo_documento_bytes','5242880',  'inteiro', 'Tamanho máximo aceito por documento enviado (PDF), em bytes (RF-017)', TRUE),
(NULL, 'arquivo_cota_bytes_por_usuario',        '52428800', 'inteiro', 'Cota total de armazenamento ativo por usuário, em bytes (RNF-017)', TRUE),
(NULL, 'arquivo_limite_uploads_janela',         '20',       'inteiro', 'Nº máximo de uploads confirmados por usuário dentro da janela de configuracoes.arquivo_janela_limite_uploads_minutos', TRUE),
(NULL, 'arquivo_janela_limite_uploads_minutos', '1440',     'inteiro', 'Janela de tempo (em minutos) usada por arquivo_limite_uploads_janela - padrão 1440 = 24h', TRUE),
(NULL, 'arquivo_intervalo_minimo_segundos',     '5',        'inteiro', 'Intervalo mínimo (em segundos) entre um upload confirmado e o próximo início de upload do mesmo usuário', TRUE)
ON CONFLICT (chave) DO NOTHING;


-- ============================================================================
-- NÃO ENTRA NESTE ARQUIVO (registrado aqui só pra não se perder)
-- ============================================================================

-- 07_seed_dados.sql (03-08-2026): a ordem das linhas de INSERT INTO papel foi
-- trocada, pra ficar do maior poder pro menor (admin primeiro, usuario por
-- último) - só pra IDs saírem bonitinhos num banco NOVO. Não é um trecho pra
-- colar aqui: o INSERT já tem "ON CONFLICT (nome) DO NOTHING", então rodar
-- de novo num banco que já tem os 7 papéis não muda NADA (os papéis já
-- existem com os IDs antigos). Se um dia você quiser essa ordem no banco
-- ATUAL, precisaria apagar e recriar as linhas de papel com cuidado - não é
-- "colar e rodar", por isso não está aqui.