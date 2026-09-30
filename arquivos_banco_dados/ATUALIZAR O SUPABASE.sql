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
-- GRUPO AA (29-09-2026) - correções da auditoria de Nielsen. IDEMPOTENTE (pode colar de novo).
-- (O Grupo Z já foi colado em 29-09-2026 e saiu deste arquivo.)
-- Só troca funções (CREATE OR REPLACE) e textos: pode colar com o Nest ligado.
--
-- O que muda:
--   1. Datas da campanha: a tela passa a mandar o começo do dia de início (00:00) e o fim do dia de fim (23:59:59)
--      no horário de Brasília. Antes mandava meia-noite de Londres, e a campanha terminava às 21:00 do dia ANTERIOR
--      ao fim escolhido. A duração passa a contar dias de calendário, senão 60 dias com fim às 23:59 contariam
--      60,99 e seriam recusados. As campanhas que já existem não mudam.
--   2. Mensagens de erro sem palavra técnica: sai "(configuracoes)", o nome da tabela do link e a data crua em UTC;
--      valores em dinheiro aparecem como "R$ 500,00".
--   3. Descrição dos parâmetros em Parâmetros do Sistema sem número de RF nem nome de coluna. Só troca a descrição que
--      ainda é a original (se alguém já editou pelo painel, fica como está).
-- ============================================================================

-- 1. Duração da campanha em dias de calendário (e mensagem sem "(configuracoes)")

CREATE OR REPLACE FUNCTION fn_valida_prazo_campanha_negocio()
RETURNS TRIGGER AS $$
DECLARE
    v_prazo_minimo INT;
    v_prazo_maximo INT;
    v_duracao_dias DECIMAL;
BEGIN
    IF NEW.data_fim IS NULL OR NEW.data_inicio IS NULL THEN
        RETURN NEW;
    END IF;

    v_prazo_minimo := public.config_numero('prazo_minimo_campanha_dias', 15);
    v_prazo_maximo := public.config_numero('prazo_maximo_campanha_dias', 60);
    -- EXTRACT(EPOCH FROM intervalo) / 86400 dá o total de dias corridos, sem o
    -- risco de EXTRACT(DAY FROM ...) ler só o componente "dias" de um intervalo
    -- que também tenha meses (mesmo padrão já usado em calcular_score_atualizacao).
    -- FLOOR: a campanha vai do começo do dia de início ao fim do dia de fim (23:59:59); sem arredondar para baixo,
    -- 60 dias de calendário contariam 60,99 e passariam do máximo.
    v_duracao_dias := FLOOR(EXTRACT(EPOCH FROM (NEW.data_fim - NEW.data_inicio)) / 86400);

    IF v_duracao_dias < v_prazo_minimo OR v_duracao_dias > v_prazo_maximo THEN
        RAISE EXCEPTION 'A duração da campanha precisa estar entre % e % dias.', v_prazo_minimo, v_prazo_maximo
            USING ERRCODE = '90012';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Mensagens de erro na língua de quem usa

CREATE OR REPLACE FUNCTION public.trg_valida_escopo_tipolink()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_coluna    TEXT;
    v_permitido BOOLEAN;
    v_nome      TEXT;
    v_regex     TEXT;
    v_dominios  VARCHAR(255)[];
    v_host      TEXT;
BEGIN
    -- IF aninhado: NEW.id_usuario só existe em link_academico.
    IF TG_TABLE_NAME = 'link_academico' AND TG_OP = 'INSERT' THEN
        IF NOT EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = NEW.id_usuario) THEN
            RAISE EXCEPTION 'Só pesquisador tem links acadêmicos. Faça o upgrade para pesquisador primeiro.'
                USING ERRCODE = '92026';
        END IF;
    END IF;

    v_coluna := CASE TG_TABLE_NAME
        WHEN 'link_academico'   THEN 'permite_perfil'
        WHEN 'link_atualizacao' THEN 'permite_atualizacao'
        WHEN 'link_recompensa'  THEN 'permite_recompensa'
    END;

    EXECUTE format('SELECT %I FROM tipo_link WHERE id_tipolink = $1', v_coluna)
        INTO v_permitido USING NEW.id_tipolink;

    IF NOT COALESCE(v_permitido, FALSE) THEN
        RAISE EXCEPTION 'Este tipo de link não pode ser usado %.', CASE TG_TABLE_NAME
            WHEN 'link_academico'   THEN 'no perfil do pesquisador'
            WHEN 'link_atualizacao' THEN 'em atualização de campanha'
            ELSE 'em recompensa'
        END
            USING ERRCODE = '90002';
    END IF;

    SELECT nome, regex, dominio INTO v_nome, v_regex, v_dominios
    FROM tipo_link WHERE id_tipolink = NEW.id_tipolink;

    IF cardinality(v_dominios) > 0 THEN
        v_host := lower(substring(NEW.url FROM '^[A-Za-z][A-Za-z0-9+.-]*://([^/:?#@]+)'));
        IF v_host IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(v_dominios) d
            WHERE v_host = lower(d) OR v_host LIKE '%.' || lower(d)
        ) THEN
            RAISE EXCEPTION 'O link do tipo % precisa ser do endereço %.', v_nome, array_to_string(v_dominios, ' ou ')
                USING ERRCODE = '90024';
        END IF;
    END IF;

    IF v_regex IS NOT NULL AND btrim(v_regex) <> '' AND NEW.url !~ v_regex THEN
        RAISE EXCEPTION 'O link não está no formato esperado para o tipo %. Confira o endereço completo do perfil.', v_nome
            USING ERRCODE = '90025';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_valida_completude_campanha()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_min_orcamento  INT;
    v_min_marcos     INT;
    v_qtd_orcamento  INT;
    v_qtd_marcos     INT;
    v_soma_orcamento DECIMAL(10,2);
BEGIN
    v_min_orcamento := public.config_numero('orcamento_min_itens', 1)::INT;
    v_min_marcos    := public.config_numero('cronograma_min_marcos', 3)::INT;

    SELECT COUNT(*), COALESCE(SUM(valor), 0)
      INTO v_qtd_orcamento, v_soma_orcamento
      FROM orcamento_campanha
      WHERE id_campanha = NEW.id_campanha;

    SELECT COUNT(*)
      INTO v_qtd_marcos
      FROM marco_cronograma
      WHERE id_campanha = NEW.id_campanha;

    IF v_qtd_orcamento < v_min_orcamento THEN
        RAISE EXCEPTION 'A campanha precisa de pelo menos % % de orçamento, mas tem %.',
            v_min_orcamento, CASE WHEN v_min_orcamento = 1 THEN 'item' ELSE 'itens' END, v_qtd_orcamento
            USING ERRCODE = '90009';
    END IF;

    IF v_qtd_marcos < v_min_marcos THEN
        RAISE EXCEPTION 'A campanha precisa de pelo menos % % de cronograma, mas tem %.',
            v_min_marcos, CASE WHEN v_min_marcos = 1 THEN 'marco' ELSE 'marcos' END, v_qtd_marcos
            USING ERRCODE = '90010';
    END IF;

    IF v_soma_orcamento <> NEW.meta_financeira THEN
        RAISE EXCEPTION 'A soma dos itens de orçamento (%) precisa ser exatamente igual à meta financeira (%).', 'R$ ' || replace(to_char(v_soma_orcamento, 'FM999999990.00'), '.', ','), 'R$ ' || replace(to_char(NEW.meta_financeira, 'FM999999990.00'), '.', ',')
            USING ERRCODE = '90011';
    END IF;

    -- Prazo vencido bloqueia envio e aprovação, só por data_fim. Ver DOCUMENTACAO_BD.md [05-K-2-B].
    IF NEW.data_fim IS NULL OR NEW.data_fim <= NOW() THEN
        RAISE EXCEPTION 'O prazo da campanha já venceu. Atualize as datas antes de enviar.'
            USING ERRCODE = '90015';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_valida_meta_campanha_negocio()
RETURNS TRIGGER AS $$
DECLARE
    v_meta_minima DECIMAL;
BEGIN
    v_meta_minima := public.config_numero('meta_minima_campanha', 500.00);

    IF NEW.meta_financeira < v_meta_minima THEN
        RAISE EXCEPTION 'A meta financeira precisa ser de pelo menos %.', 'R$ ' || replace(to_char(v_meta_minima, 'FM999999990.00'), '.', ',')
            USING ERRCODE = '90013';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_valida_contribuicao_valor_minimo()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_minimo DECIMAL;
BEGIN
    v_valor_minimo := public.config_numero('valor_minimo_contribuicao', 5.00);

    IF NEW.valor < v_valor_minimo THEN
        RAISE EXCEPTION 'O valor da contribuição precisa ser de pelo menos %.', 'R$ ' || replace(to_char(v_valor_minimo, 'FM999999990.00'), '.', ',')
            USING ERRCODE = '90014';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Descrições dos parâmetros na língua de quem usa



UPDATE configuracoes SET descricao = 'Nº máximo de campanhas ao mesmo tempo por pesquisador (ativas ou aguardando aprovação)'
    WHERE chave = 'limite_campanhas_simultaneas' AND id_usuario IS NULL AND descricao = 'Nº máximo de campanhas simultâneas (aguardando_aprovacao/ativo) por pesquisador (RF-029)';
UPDATE configuracoes SET descricao = 'Nº máximo de endossos ativos ao mesmo tempo por campanha'
    WHERE chave = 'limite_endossos_campanha' AND id_usuario IS NULL AND descricao = 'Nº máximo de endossos ativos simultâneos por campanha (RF-063)';
UPDATE configuracoes SET descricao = 'Nº máximo de denúncias que um usuário pode fazer dentro da janela de tempo das denúncias'
    WHERE chave = 'limite_denuncias_24h' AND id_usuario IS NULL AND descricao = 'Nº máximo de denúncias por usuário dentro da janela de configuracoes.janela_denuncias_horas (RF-076)';
UPDATE configuracoes SET descricao = 'Janela de tempo das denúncias, em horas (usada pelo limite de denúncias por usuário)'
    WHERE chave = 'janela_denuncias_horas' AND id_usuario IS NULL AND descricao = 'Janela de tempo (em horas) usada por limite_denuncias_24h (RF-076)';
UPDATE configuracoes SET descricao = 'Nº máximo de comentários que um usuário pode fazer dentro da janela de tempo dos comentários'
    WHERE chave = 'limite_comentarios_por_hora' AND id_usuario IS NULL AND descricao = 'Nº máximo de comentários por usuário dentro da janela de configuracoes.janela_comentarios_horas';
UPDATE configuracoes SET descricao = 'Janela de tempo dos comentários, em horas (usada pelo limite de comentários por usuário)'
    WHERE chave = 'janela_comentarios_horas' AND id_usuario IS NULL AND descricao = 'Janela de tempo (em horas) usada por limite_comentarios_por_hora';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres na descrição da campanha'
    WHERE chave = 'limite_caracteres_descricao_campanha' AND id_usuario IS NULL AND descricao = 'Nº máximo de caracteres em campanha.descricao (RF)';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres no texto de uma atualização de campanha'
    WHERE chave = 'limite_caracteres_conteudo_atualizacao' AND id_usuario IS NULL AND descricao = 'Nº máximo de caracteres em atualizacao_campanha.conteudo';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres no relato de uma denúncia'
    WHERE chave = 'limite_caracteres_relato_denuncia' AND id_usuario IS NULL AND descricao = 'Nº máximo de caracteres em denuncia.relato (sugestão de uma IA)';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres em cada justificativa do pedido de encerramento antecipado'
    WHERE chave = 'limite_caracteres_justificativa_encerramento' AND id_usuario IS NULL AND descricao = 'Nº máximo de caracteres em solicitacao_encerramento.justificativa_pesquisador/justificativa_admin';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres na descrição de uma recompensa'
    WHERE chave = 'limite_caracteres_descricao_recompensa' AND id_usuario IS NULL AND descricao = 'Nº máximo de caracteres em recompensa.descricao';
UPDATE configuracoes SET descricao = 'Nº mínimo de itens de orçamento exigido para aprovar uma campanha'
    WHERE chave = 'orcamento_min_itens' AND id_usuario IS NULL AND descricao = 'Nº mínimo de itens de orçamento exigido para aprovar uma campanha (RF-039)';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres na descrição de um item de orçamento'
    WHERE chave = 'limite_caracteres_descricao_orcamento' AND id_usuario IS NULL AND descricao = 'Nº máximo de caracteres em orcamento_campanha.descricao';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres na descrição de um marco do cronograma'
    WHERE chave = 'limite_caracteres_descricao_marco' AND id_usuario IS NULL AND descricao = 'Nº máximo de caracteres em marco_cronograma.descricao';
UPDATE configuracoes SET descricao = 'Valor mínimo de meta financeira aceito para uma campanha, em R$'
    WHERE chave = 'meta_minima_campanha' AND id_usuario IS NULL AND descricao = 'Valor mínimo de meta financeira aceito para uma campanha (RF)';
UPDATE configuracoes SET descricao = 'Nº máximo de links acadêmicos por pesquisador'
    WHERE chave = 'limite_links_academicos_perfil' AND id_usuario IS NULL AND descricao = 'Nº máximo de links acadêmicos por pesquisador (RF-014/016/018)';
UPDATE configuracoes SET descricao = 'Valor mínimo aceito por contribuição, em R$'
    WHERE chave = 'valor_minimo_contribuicao' AND id_usuario IS NULL AND descricao = 'Valor mínimo aceito por contribuição, em R$ (RF-056)';
UPDATE configuracoes SET descricao = 'Tamanho máximo aceito por imagem enviada (JPEG/PNG/WebP), em bytes'
    WHERE chave = 'arquivo_tamanho_maximo_imagem_bytes' AND id_usuario IS NULL AND descricao = 'Tamanho máximo aceito por imagem enviada (JPEG/PNG/WebP), em bytes (RF-017)';
UPDATE configuracoes SET descricao = 'Tamanho máximo aceito por documento enviado (PDF), em bytes'
    WHERE chave = 'arquivo_tamanho_maximo_documento_bytes' AND id_usuario IS NULL AND descricao = 'Tamanho máximo aceito por documento enviado (PDF), em bytes (RF-017)';
UPDATE configuracoes SET descricao = 'Cota total de armazenamento ativo por usuário, em bytes'
    WHERE chave = 'arquivo_cota_bytes_por_usuario' AND id_usuario IS NULL AND descricao = 'Cota total de armazenamento ativo por usuário, em bytes (RNF-017)';
UPDATE configuracoes SET descricao = 'Nº máximo de uploads confirmados por usuário dentro da janela de tempo dos uploads'
    WHERE chave = 'arquivo_limite_uploads_janela' AND id_usuario IS NULL AND descricao = 'Nº máximo de uploads confirmados por usuário dentro da janela de configuracoes.arquivo_janela_limite_uploads_minutos';
UPDATE configuracoes SET descricao = 'Janela de tempo dos uploads, em minutos (1440 = 24 horas)'
    WHERE chave = 'arquivo_janela_limite_uploads_minutos' AND id_usuario IS NULL AND descricao = 'Janela de tempo (em minutos) usada por arquivo_limite_uploads_janela - padrão 1440 = 24h';

-- ============================================================================
-- GRUPO AB (29-09-2026) - RF-091 na tela de Termos. IDEMPOTENTE (pode colar de novo).
-- Só cria uma função: pode colar com o Nest ligado.
--
-- O que muda:
--   1. contar_aceites_termo(id): quantos aceites cada versão do Termo tem, só o número, sem dado de quem aceitou.
--      A lista de Termos passa a apagar a lixeira de versão já aceita, e o Alterar mostra o texto só para leitura.
--      Antes de colar, a lista funciona como antes (o Nest percebe que a função não existe e segue sem a contagem).
-- ============================================================================

-- 1. Contagem de aceites por versão do Termo

CREATE OR REPLACE FUNCTION public.contar_aceites_termo(p_id_termo INT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT ((SELECT count(*) FROM usuario_termo WHERE id_termo = p_id_termo)
          + (SELECT count(*) FROM aceite_termo_contribuicao WHERE id_termo = p_id_termo))::INT;
$$;

REVOKE EXECUTE ON FUNCTION public.contar_aceites_termo(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contar_aceites_termo(INT) TO app_nestjs;

-- ============================================================================
-- GRUPO AC (30-09-2026) - achado da simulação do modo produção. IDEMPOTENTE (pode colar de novo).
-- Só troca uma função: pode colar com o Nest ligado.
-- 
-- O que muda:
--   1. excluir_conta_usuario: sem ninguém logado, a checagem "é a própria conta OU tem permissão" dava NULL (e não
--      FALSE) e deixava passar. Hoje a rota do Nest já exige login, então ninguém chegava aqui sem login; o banco
--      passa a recusar por conta própria (92013).
-- ============================================================================

-- 1. Excluir conta: sem login é sempre recusado

CREATE OR REPLACE FUNCTION public.excluir_conta_usuario(p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_imagem_perfil INT;
BEGIN
    -- COALESCE: sem ninguém logado, id_usuario_atual() é NULL, e "p_id_usuario = NULL" é NULL, não FALSE;
    -- "NOT (NULL OR FALSE)" também é NULL, e o IF deixava passar sem login.
    IF NOT (COALESCE(p_id_usuario = public.id_usuario_atual(), FALSE)
            OR COALESCE(public.tem_permissao('usuario_excluir'), FALSE)) THEN
        RAISE EXCEPTION 'Sem permissão para excluir a conta de outro usuário.' USING ERRCODE = '92013';
    END IF;
    IF public.fn_eh_ultimo_admin_ativo(p_id_usuario) THEN
        RAISE EXCEPTION 'Não é possível excluir a conta do último administrador ativo do sistema.' USING ERRCODE = '91030';
    END IF;
    IF EXISTS (SELECT 1 FROM campanha WHERE id_usuario = p_id_usuario AND status = 'ativo') THEN
        RAISE EXCEPTION 'Não é possível excluir a conta enquanto houver campanha ativa. A exclusão fica liberada quando a campanha terminar.'
            USING ERRCODE = '91031';
    END IF;

    SELECT id_imagem_perfil INTO v_id_imagem_perfil
    FROM usuario WHERE id_usuario = p_id_usuario;

    UPDATE usuario
    SET deletado = TRUE, deletado_em = NOW(), deletado_por = public.id_usuario_atual()
    WHERE id_usuario = p_id_usuario;

    -- Conta excluída não renova mais nenhuma sessão (mesmo motivo de suspender_usuario).
    UPDATE sessao SET revogado_em = NOW()
    WHERE id_usuario = p_id_usuario AND revogado_em IS NULL;

    DELETE FROM campanha c
    WHERE c.id_usuario = p_id_usuario
      AND (c.status = 'rascunho'
           OR (c.status = 'aguardando_aprovacao'
               AND NOT EXISTS (SELECT 1 FROM historico_rejeicao h WHERE h.id_campanha = c.id_campanha)));

    -- A volta a 'rejeitado' pede linha em historico_rejeicao na mesma transação (trg_campanha_exige_historico_rejeicao,
    -- 05); id_admin NULL porque ninguém da moderação rejeitou.
    WITH devolvidas AS (
        UPDATE campanha SET status = 'rejeitado'
        WHERE id_usuario = p_id_usuario AND status = 'aguardando_aprovacao'
        RETURNING id_campanha, id_usuario, titulo
    )
    INSERT INTO historico_rejeicao (id_campanha, id_usuario_dono, titulo_campanha, id_admin, justificativa)
    SELECT id_campanha, id_usuario, titulo, NULL,
           'Reenvio cancelado: o pesquisador excluiu a própria conta.'
    FROM devolvidas;

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

-- ============================================================================
-- GRUPO AD (30-09-2026) - colunas com valor padrão deixam de aceitar vazio. IDEMPOTENTE (pode colar de novo).
-- *** PARE O NEST ANTES DE COLAR *** (ALTER TABLE: com o Nest ligado pode travar esperando as conexões dele).
-- Religue o Nest depois do "Success".
--
-- Em palavras simples: 39 colunas (datas "quando aconteceu", sim/não como "ativo", e o valor arrecadado)
-- já se preenchem sozinhas quando ninguém informa nada, mas aceitavam "vazio" se alguém mandasse de propósito.
-- Agora o banco recusa o vazio. Nada muda para quem usa o sistema: nenhum código grava vazio nelas hoje.
--
-- O que muda:
--   1. Antes da trava, qualquer linha vazia recebe o valor padrão da coluna (então colar nunca dá erro).
--   2. NOT NULL nas 39 colunas. Fica de fora contribuicao.token_sessao (chave do doador anônimo: pode ser
--      apagada no futuro sem apagar a doação).
-- ============================================================================

UPDATE public.aceite_termo_contribuicao SET aceito_em = NOW() WHERE aceito_em IS NULL;
ALTER TABLE public.aceite_termo_contribuicao
    ALTER COLUMN aceito_em SET NOT NULL;

UPDATE public.area_conhecimento SET ativo = TRUE WHERE ativo IS NULL;
ALTER TABLE public.area_conhecimento
    ALTER COLUMN ativo SET NOT NULL;

UPDATE public.arquivo SET ativo = TRUE WHERE ativo IS NULL;
UPDATE public.arquivo SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.arquivo
    ALTER COLUMN ativo SET NOT NULL,
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.arquivo_recompensa SET principal = FALSE WHERE principal IS NULL;
ALTER TABLE public.arquivo_recompensa
    ALTER COLUMN principal SET NOT NULL;

UPDATE public.atualizacao_campanha SET publicado_em = NOW() WHERE publicado_em IS NULL;
ALTER TABLE public.atualizacao_campanha
    ALTER COLUMN publicado_em SET NOT NULL;

UPDATE public.auditoria_financeira SET "timestamp" = NOW() WHERE "timestamp" IS NULL;
ALTER TABLE public.auditoria_financeira
    ALTER COLUMN "timestamp" SET NOT NULL;

UPDATE public.campanha SET criado_em = NOW() WHERE criado_em IS NULL;
UPDATE public.campanha SET valor_bruto_arrecadado = 0 WHERE valor_bruto_arrecadado IS NULL;
ALTER TABLE public.campanha
    ALTER COLUMN criado_em SET NOT NULL,
    ALTER COLUMN valor_bruto_arrecadado SET NOT NULL;

UPDATE public.comentario SET criado_em = NOW() WHERE criado_em IS NULL;
UPDATE public.comentario SET endossado = FALSE WHERE endossado IS NULL;
ALTER TABLE public.comentario
    ALTER COLUMN criado_em SET NOT NULL,
    ALTER COLUMN endossado SET NOT NULL;

UPDATE public.configuracoes SET ativo = TRUE WHERE ativo IS NULL;
ALTER TABLE public.configuracoes
    ALTER COLUMN ativo SET NOT NULL;

UPDATE public.contribuicao SET anonima = FALSE WHERE anonima IS NULL;
UPDATE public.contribuicao SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.contribuicao
    ALTER COLUMN anonima SET NOT NULL,
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.contribuicao_recompensa SET adquirida_em = NOW() WHERE adquirida_em IS NULL;
ALTER TABLE public.contribuicao_recompensa
    ALTER COLUMN adquirida_em SET NOT NULL;

UPDATE public.denuncia SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.denuncia
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.historico_rejeicao SET rejeitado_em = NOW() WHERE rejeitado_em IS NULL;
ALTER TABLE public.historico_rejeicao
    ALTER COLUMN rejeitado_em SET NOT NULL;

UPDATE public.marco_cronograma SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.marco_cronograma
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.notificacao SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.notificacao
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.orcamento_campanha SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.orcamento_campanha
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.recompensa SET ativo = TRUE WHERE ativo IS NULL;
UPDATE public.recompensa SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.recompensa
    ALTER COLUMN ativo SET NOT NULL,
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.repasse SET meta_atingida = FALSE WHERE meta_atingida IS NULL;
ALTER TABLE public.repasse
    ALTER COLUMN meta_atingida SET NOT NULL;

UPDATE public.score_config SET ativo = TRUE WHERE ativo IS NULL;
UPDATE public.score_config SET atualizado_em = NOW() WHERE atualizado_em IS NULL;
UPDATE public.score_config SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.score_config
    ALTER COLUMN ativo SET NOT NULL,
    ALTER COLUMN atualizado_em SET NOT NULL,
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.score_pesquisador SET calculado_em = NOW() WHERE calculado_em IS NULL;
ALTER TABLE public.score_pesquisador
    ALTER COLUMN calculado_em SET NOT NULL;

UPDATE public.score_rotulo SET ativo = TRUE WHERE ativo IS NULL;
UPDATE public.score_rotulo SET atualizado_em = NOW() WHERE atualizado_em IS NULL;
UPDATE public.score_rotulo SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.score_rotulo
    ALTER COLUMN ativo SET NOT NULL,
    ALTER COLUMN atualizado_em SET NOT NULL,
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.seguir_campanha SET seguido_em = NOW() WHERE seguido_em IS NULL;
ALTER TABLE public.seguir_campanha
    ALTER COLUMN seguido_em SET NOT NULL;

UPDATE public.seguir_pesquisador SET seguido_em = NOW() WHERE seguido_em IS NULL;
ALTER TABLE public.seguir_pesquisador
    ALTER COLUMN seguido_em SET NOT NULL;

UPDATE public.solicitacao_encerramento SET solicitado_em = NOW() WHERE solicitado_em IS NULL;
ALTER TABLE public.solicitacao_encerramento
    ALTER COLUMN solicitado_em SET NOT NULL;

UPDATE public.termos_de_uso SET ativo = TRUE WHERE ativo IS NULL;
UPDATE public.termos_de_uso SET criado_em = NOW() WHERE criado_em IS NULL;
ALTER TABLE public.termos_de_uso
    ALTER COLUMN ativo SET NOT NULL,
    ALTER COLUMN criado_em SET NOT NULL;

UPDATE public.tipo_link SET ativo = TRUE WHERE ativo IS NULL;
ALTER TABLE public.tipo_link
    ALTER COLUMN ativo SET NOT NULL;

UPDATE public.usuario SET criado_em = NOW() WHERE criado_em IS NULL;
UPDATE public.usuario SET deletado = FALSE WHERE deletado IS NULL;
ALTER TABLE public.usuario
    ALTER COLUMN criado_em SET NOT NULL,
    ALTER COLUMN deletado SET NOT NULL;

UPDATE public.usuario_termo SET aceito_em = NOW() WHERE aceito_em IS NULL;
ALTER TABLE public.usuario_termo
    ALTER COLUMN aceito_em SET NOT NULL;

-- ============================================================================
-- GRUPO AE (30-09-2026) - o dono da campanha exclui comentário recebido. IDEMPOTENTE (pode colar de novo).
-- *** PARE O NEST ANTES DE COLAR *** (DROP/CREATE POLICY: com o Nest ligado pode travar esperando as conexões dele).
-- Religue o Nest depois do "Success".
--
-- Em palavras simples: o dono da campanha passa a poder apagar de vez um comentário que recebeu (o autor pode
-- comentar de novo). "Excluir e bloquear" já funcionava: deixa o comentário inativo, guardado, e o autor não
-- comenta mais naquela campanha. Um comentário bloqueado não pode ser apagado, para o bloqueio não se desfazer.
--
-- O que muda:
--   1. GRANT DELETE em comentario para o app_nestjs.
--   2. Regra de acesso pol_comentario_delete: só o dono da campanha, e só comentário ativo.
-- ============================================================================

GRANT DELETE ON comentario TO app_nestjs;

DROP POLICY IF EXISTS pol_comentario_delete ON comentario;
CREATE POLICY pol_comentario_delete ON comentario FOR DELETE TO app_nestjs USING (
    ativo = TRUE
    AND EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND id_usuario = (SELECT public.id_usuario_atual())
    )
);
