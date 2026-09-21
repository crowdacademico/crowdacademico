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


-- ############################################################################
-- 20-09-2026 - STATUS 'rascunho' PARA CAMPANHA (idempotente)
--
-- ATENÇÃO, SÃO 2 SCRIPTS SEPARADOS. Rode o SCRIPT 1 sozinho, espere o
-- "Success", e SÓ DEPOIS cole o SCRIPT 2. Isto não é estilo, é obrigatório:
-- o SQL Editor do Supabase envolve o que você cola em UMA transação, e o
-- PostgreSQL não deixa um valor de enum recém-criado ser USADO na mesma
-- transação em que foi criado. Colando tudo junto, o ALTER TYPE passa e a
-- primeira linha que escrever 'rascunho' falha com
-- "unsafe use of new value rascunho of enum type status_campanha".
--
-- POR QUE: hoje a campanha nasce 'aguardando_aprovacao' já no primeiro
-- clique de Criar, antes de ter orçamento e cronograma. O nome mente, porque
-- fn_valida_completude_campanha_aprovacao jamais deixaria aprovar nesse
-- estado. O pesquisador vê "Aguardando aprovação" numa campanha que ninguém
-- pode aprovar, e o administrador vê fila que não é fila.
-- ############################################################################


-- ----------------------------------------------------------------------------
-- SCRIPT 1 - RODE ESTE SOZINHO PRIMEIRO, E ESPERE O "Success"
-- ----------------------------------------------------------------------------

-- BEFORE 'aguardando_aprovacao' define a ordem de classificação do enum.
-- Importa porque ORDER BY status no PostgreSQL usa a ordem de DECLARAÇÃO, não
-- a alfabética, e é a mesma ordem que ORDEM_STATUS_CAMPANHA usa no front.
ALTER TYPE status_campanha ADD VALUE IF NOT EXISTS 'rascunho' BEFORE 'aguardando_aprovacao';


-- ----------------------------------------------------------------------------
-- SCRIPT 2 - SÓ DEPOIS DO SCRIPT 1 TER DADO "Success"
-- ----------------------------------------------------------------------------

-- 2.1 -----------------------------------------------------------------------
-- Transição nova: o DONO envia o próprio rascunho para a fila de aprovação.
-- Botão explícito ("Enviar para aprovação"), nunca automático - a transição
-- automática por trigger não teria SUJEITO, e fn_valida_transicao_campanha é
-- construída inteira em torno de QUEM está fazendo a transição (ela nasceu de
-- um achado de autoaprovação pelo dono). Colocar uma contagem de 2 tabelas
-- dentro do guardião de fraude de status seria superfície de ataque nova.
--
-- As 2 guardas de aprovado_em/id_admin são as mesmas da regra de reenvio de
-- campanha rejeitada, logo acima desta no arquivo 05 - enviar para a fila não
-- pode, de tabela, carimbar aprovação.
-- A função abaixo é a ORIGINAL do 05_regras_negocio.sql, copiada tal e qual,
-- com UM bloco novo acrescentado (marcado com ADICIONADO 20-09-2026). Nada
-- mais foi tocado - nem a ausência de SECURITY DEFINER, nem a regra ampla de
-- permissão de moderação, nem a cascata de suspensão (que exige o pesquisador
-- estar 'suspenso', e não uma permissão).
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

    -- Dono colocando a própria campanha na fila de aprovação. São 2 caminhos,
    -- tratados juntos porque a autorização é idêntica: corrigir e reenviar uma
    -- REJEITADA (isto já existia, separado) e enviar um RASCUNHO pela primeira
    -- vez (ADICIONADO em 20-09-2026).
    --
    -- A checagem de status_pesquisador também é NOVA, e fecha um buraco que já
    -- existia no caminho do reenvio: pol_campanha_update (04) NÃO checa
    -- suspensão, diferente de pol_campanha_insert e pol_atualizacao_insert. Sem
    -- isto, um pesquisador suspenso não pode criar campanha nem publicar
    -- atualização, mas PODE empurrar uma campanha pra fila do administrador -
    -- inclusive as que a própria suspensão acabou de rejeitar em cascata
    -- (suspender_pesquisador, 03). Mesma cláusula EXISTS das outras 2 policies.
    IF NEW.id_usuario = public.id_usuario_atual()
       AND OLD.status IN ('rejeitado', 'rascunho') AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
       AND EXISTS (
           SELECT 1 FROM perfil_pesquisador pp
           WHERE pp.id_usuario = public.id_usuario_atual() AND pp.status_pesquisador = 'ativo'
       )
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


-- 2.2 -----------------------------------------------------------------------
-- A checagem de completude passa a rodar TAMBÉM no envio, não só na aprovação.
--
-- POR QUE: hoje o erro "a soma do orçamento não bate com a meta" aparece na
-- tela do ADMINISTRADOR, ao clicar Aprovar, sobre uma campanha que não é dele.
-- Ele não tem como consertar, só rejeitar, e o pesquisador leva uma rejeição
-- por um problema que o sistema podia ter apontado antes. Rodar no envio faz o
-- erro chegar em quem pode consertar. Continua rodando na aprovação também,
-- porque entre enviar e aprovar a campanha ainda é editável (o congelamento só
-- começa em 'ativo'), então tirar de lá abriria um caminho de bypass.
--
-- A checagem de data_fim é nova, e fecha um buraco real: NENHUMA regra do banco
-- comparava as datas com NOW(). Uma campanha com prazo já vencido podia ser
-- aprovada normalmente e era encerrada como 'nao_atingido' pelo cron em até 15
-- minutos, sem receber uma única contribuição - e 'nao_atingido' PENALIZA o
-- score do pesquisador. Ele perdia reputação por um erro do sistema.
CREATE OR REPLACE FUNCTION public.fn_valida_completude_campanha_aprovacao()
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
        RAISE EXCEPTION 'A campanha precisa de pelo menos % itens de orçamento (tem %).', v_min_orcamento, v_qtd_orcamento
            USING ERRCODE = '90009';
    END IF;

    IF v_qtd_marcos < v_min_marcos THEN
        RAISE EXCEPTION 'A campanha precisa de pelo menos % marcos de cronograma (tem %).', v_min_marcos, v_qtd_marcos
            USING ERRCODE = '90010';
    END IF;

    IF v_soma_orcamento <> NEW.meta_financeira THEN
        RAISE EXCEPTION 'A soma dos itens de orçamento (%) precisa ser exatamente igual à meta financeira (%).', v_soma_orcamento, NEW.meta_financeira
            USING ERRCODE = '90011';
    END IF;

    -- ADICIONADO (20-09-2026). Simples de propósito: só exige que o prazo não
    -- esteja vencido. Não tenta deslizar datas nem recalcular cronograma - o
    -- pesquisador corrige as 2 datas no próprio formulário, que já existe.
    IF NEW.data_fim IS NULL OR NEW.data_fim <= NOW() THEN
        RAISE EXCEPTION 'O prazo da campanha já venceu (fim em %). Atualize as datas antes de enviar.', NEW.data_fim
            USING ERRCODE = '90015';
    END IF;

    RETURN NEW;
END;
$$;

-- O WHEN passa a cobrir as 3 portas de entrada: aprovação, envio de rascunho e
-- reenvio de campanha rejeitada. Os 2 últimos são listados NOMINALMENTE (e não
-- como "qualquer coisa -> aguardando_aprovacao") pra não pegar de carona a
-- cascata de suspensão do pesquisador, que também pousa nesse status.
DROP TRIGGER IF EXISTS trg_campanha_valida_completude_aprovacao ON campanha;
CREATE TRIGGER trg_campanha_valida_completude_aprovacao
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (
     (NEW.status = 'ativo'                AND OLD.status IS DISTINCT FROM 'ativo')
  OR (NEW.status = 'aguardando_aprovacao' AND OLD.status IN ('rascunho', 'rejeitado'))
)
EXECUTE FUNCTION public.fn_valida_completude_campanha_aprovacao();


-- 2.3 -----------------------------------------------------------------------
-- Congelamento: 2 campos que ficaram de fora por terem nascido DEPOIS da
-- trigger. video_apresentacao_url é o mesmo vetor de fraude que a descrição
-- (trocar o vídeo de um projeto já financiado é mostrar outro projeto pra quem
-- já doou), e CampanhaRequestUpdate aceita os dois hoje.
CREATE OR REPLACE FUNCTION fn_congela_regras_campanha()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao') THEN
        IF NEW.meta_financeira IS DISTINCT FROM OLD.meta_financeira THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar a meta financeira após a aprovação da campanha.'
                USING ERRCODE = '91004';
        END IF;

        IF NEW.modelo IS DISTINCT FROM OLD.modelo THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o modelo de financiamento após a aprovação da campanha.'
                USING ERRCODE = '91005';
        END IF;

        IF NEW.taxa_plataforma IS DISTINCT FROM OLD.taxa_plataforma THEN
            RAISE EXCEPTION 'Operação bloqueada: a taxa da plataforma não pode ser alterada após o congelamento.'
                USING ERRCODE = '91006';
        END IF;

        IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o título após a aprovação da campanha.'
                USING ERRCODE = '91007';
        END IF;

        IF NEW.descricao IS DISTINCT FROM OLD.descricao THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar a descrição após a aprovação da campanha.'
                USING ERRCODE = '91008';
        END IF;

        IF NEW.video_apresentacao_url IS DISTINCT FROM OLD.video_apresentacao_url THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o vídeo de apresentação após a aprovação da campanha.'
                USING ERRCODE = '91023';
        END IF;

        IF NEW.id_area_conhecimento IS DISTINCT FROM OLD.id_area_conhecimento THEN
            RAISE EXCEPTION 'Operação bloqueada: a área do conhecimento não pode ser alterada após a aprovação da campanha.'
                USING ERRCODE = '91024';
        END IF;

        IF OLD.data_inicio IS NOT NULL AND OLD.data_inicio <= NOW() THEN
            IF NEW.data_fim IS DISTINCT FROM OLD.data_fim THEN
                RAISE EXCEPTION 'Operação bloqueada: o prazo da campanha não pode ser alterado depois que ela começa de verdade.'
                    USING ERRCODE = '91009';
            END IF;

            IF NEW.data_inicio IS DISTINCT FROM OLD.data_inicio THEN
                RAISE EXCEPTION 'Operação bloqueada: a data de início da campanha não pode ser alterada depois que ela começa de verdade.'
                    USING ERRCODE = '91010';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 2.4 -----------------------------------------------------------------------
-- O job de expiração passa a filtrar por STATUS, não por completude calculada.
--
-- Isto conserta, de brinde, um bug que derrubava o job inteiro HOJE:
-- historico_rejeicao.id_campanha é FK SEM ON DELETE CASCADE. Uma campanha
-- rejeitada e reenviada fica em 'aguardando_aprovacao', tem linha em
-- historico_rejeicao, e tem criado_em antigo por definição - exatamente o
-- alvo do DELETE antigo. O DELETE batia em violação de FK, a função levantava
-- exceção, e a partir daí nenhum rascunho expirava mais. Filtrando por
-- status = 'rascunho', nada que já passou pela fila é alcançado.
--
-- O critério de completude SAI da função de propósito. Enquanto o job
-- precisava saber o que é "completo", ele duplicava fn_valida_completude_
-- campanha_aprovacao, e as duas já divergiram uma vez (a primeira versão
-- esqueceu a checagem da soma). Agora existe uma definição só, num lugar só.
CREATE OR REPLACE FUNCTION public.expirar_campanhas_rascunho()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ttl_horas INT;
    v_expiradas INT;
BEGIN
    v_ttl_horas := public.config_numero('campanha_rascunho_ttl_horas', 336);

    DELETE FROM campanha c
    WHERE c.status = 'rascunho'
      AND c.criado_em <= NOW() - (v_ttl_horas * INTERVAL '1 hour');

    GET DIAGNOSTICS v_expiradas = ROW_COUNT;

    RETURN v_expiradas;
END;
$$;


-- 2.5 -----------------------------------------------------------------------
-- Excluir campanha: só rascunho. Depois de enviada à fila, apagar de vez
-- tiraria do administrador o registro de que aquilo existiu.
DROP POLICY IF EXISTS pol_campanha_delete ON campanha;
CREATE POLICY pol_campanha_delete ON campanha FOR DELETE TO app_nestjs USING (
    status = 'rascunho'
    AND (id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
);


-- 2.6 -----------------------------------------------------------------------
-- TTL: 48h -> 336h (14 dias).
--
-- 48h contradizia a própria justificativa do sistema ("cadastrar aos poucos"):
-- quem preenchia os dados na segunda e voltava na quarta perdia tudo. 14 dias
-- cobre com folga o caso real de "quero estudar melhor o orçamento e o
-- cronograma antes de fechar", e continua sendo uma limpeza de verdade.
UPDATE configuracoes SET valor = '336'
 WHERE chave = 'campanha_rascunho_ttl_horas';


-- 2.7 -----------------------------------------------------------------------
-- Migração dos dados. Mesmo critério que o job usava até agora: a definição de
-- rascunho não muda aqui, ela só deixa de ser CALCULADA e passa a ser
-- ARMAZENADA.
--
-- DISABLE TRIGGER USER é necessário porque nenhuma regra cobre a transição
-- 'aguardando_aprovacao' -> 'rascunho' (ela não existe no fluxo normal, só na
-- migração). Desliga junto o recálculo de score e o log de auditoria, o que
-- aqui é desejável - você não quer 300 linhas de log dizendo "migração".
--
-- CONFIRA ANTES: troque o UPDATE por SELECT id_campanha, titulo, status e
-- olhe a lista, pra ver se não tem nada que o administrador esteja esperando
-- aprovar.
ALTER TABLE campanha DISABLE TRIGGER USER;

UPDATE campanha c SET status = 'rascunho'
 WHERE c.status = 'aguardando_aprovacao'
   AND (
     (SELECT COUNT(*) FROM orcamento_campanha o WHERE o.id_campanha = c.id_campanha)
        < public.config_numero('orcamento_min_itens', 1)
     OR (SELECT COUNT(*) FROM marco_cronograma m WHERE m.id_campanha = c.id_campanha)
        < public.config_numero('cronograma_min_marcos', 3)
     OR (SELECT COALESCE(SUM(o.valor), 0) FROM orcamento_campanha o WHERE o.id_campanha = c.id_campanha)
        <> c.meta_financeira
   );

ALTER TABLE campanha ENABLE TRIGGER USER;


-- 2.8 -----------------------------------------------------------------------
-- O DEFAULT vem POR ÚLTIMO de propósito. Enquanto ele for
-- 'aguardando_aprovacao', qualquer INSERT que chegue durante a migração cai no
-- estado antigo, que o passo 2.7 já tratou. Trocando antes, um INSERT na
-- janela em que as triggers estão desligadas nasceria 'rascunho' sem validação
-- nenhuma.
ALTER TABLE campanha ALTER COLUMN status SET DEFAULT 'rascunho';












-- ############################################################################
-- 20-09-2026 (2ª rodada) - SCORE: 2 CONSERTOS PEQUENOS (idempotente)
--
-- Sem "2 scripts separados" desta vez: nenhum valor de enum novo aqui, pode
-- colar tudo de uma vez. Os 2 itens são independentes um do outro.
-- ############################################################################

-- 3.1 -----------------------------------------------------------------------
-- ORDER BY score_minimo no LIMIT 1 do rótulo. Sem ele, se duas faixas de
-- score_rotulo se sobrepuserem, o Postgres devolvia uma linha QUALQUER, e o
-- mesmo pesquisador com o mesmo score podia aparecer com rótulos diferentes em
-- execuções diferentes. Com ele o resultado é sempre o mesmo (a faixa de menor
-- mínimo). Não impede a sobreposição, só torna o resultado estável.
--
-- A função abaixo é a ORIGINAL do 05_regras_negocio.sql copiada por comando (não
-- redigitada), com só o ORDER BY acrescentado.
CREATE OR REPLACE FUNCTION public.recalcular_score_pesquisador(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_perfil      INTEGER;
    v_historico   INTEGER;
    v_atualizacao INTEGER;
    v_reputacao   INTEGER;
    v_total       INTEGER;
    v_id_rotulo   INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = p_id_usuario) THEN
        RETURN NULL;
    END IF;

    v_perfil      := public.calcular_score_perfil_academico(p_id_usuario);
    v_historico   := public.calcular_score_historico(p_id_usuario);
    v_atualizacao := public.calcular_score_atualizacao(p_id_usuario);
    v_reputacao   := public.calcular_score_reputacao(p_id_usuario);

    v_total := v_perfil + v_historico + v_atualizacao + v_reputacao;

    -- ORDER BY score_minimo (20-09-2026): sem ele o LIMIT 1 escolhia uma linha
    -- QUALQUER quando duas faixas de score_rotulo se sobrepõem, e o mesmo
    -- pesquisador com o mesmo score podia aparecer com rótulos diferentes em
    -- execuções diferentes. Com ele, o resultado é sempre o mesmo (a faixa de
    -- menor mínimo). Não impede a sobreposição, só torna o resultado estável.
    SELECT id_rotulo INTO v_id_rotulo
    FROM score_rotulo
    WHERE v_total >= score_minimo AND v_total <= score_maximo AND ativo = TRUE
    ORDER BY score_minimo
    LIMIT 1;

    INSERT INTO score_pesquisador (id_usuario, id_score_config, id_rotulo, pontos_obtidos, score_total, calculado_em, motivo)
    SELECT p_id_usuario, sc.id_score_config, v_id_rotulo, v.pontos, v_total, NOW(), 'recalculo_automatico'
    FROM score_config sc
    JOIN (VALUES
        ('perfil_academico',     v_perfil),
        ('historico_plataforma', v_historico),
        ('atualizacao_campanha', v_atualizacao),
        ('reputacao_comunidade', v_reputacao)
    ) AS v(nome, pontos) ON v.nome = sc.nome
    WHERE sc.id_pai IS NULL AND sc.ativo = TRUE
    ON CONFLICT (id_usuario, id_score_config)
    DO UPDATE SET
        pontos_obtidos = EXCLUDED.pontos_obtidos,
        id_rotulo      = EXCLUDED.id_rotulo,
        score_total    = EXCLUDED.score_total,
        calculado_em   = EXCLUDED.calculado_em,
        motivo         = EXCLUDED.motivo;

    UPDATE perfil_pesquisador
    SET score_atual = v_total,
        score_atualizado_em = NOW()
    WHERE id_usuario = p_id_usuario;

    RETURN v_total;
END;
$$;


-- 3.2 -----------------------------------------------------------------------
-- Recalcular scores UMA vez por comando, não uma por linha. Editar os 4 pesos
-- raiz num UPDATE só disparava 4 recálculos completos de TODOS os
-- pesquisadores, dentro da mesma requisição. Por comando é 1.
--
-- Perda aceita: FOR EACH STATEMENT não enxerga OLD/NEW por linha, então some o
-- filtro "só se o peso mudou de valor". Salvar o mesmo valor recalcula à toa,
-- o que é inofensivo. (Tabela de transição recuperaria o filtro, mas o
-- PostgreSQL não permite junto com UPDATE OF <coluna>.)
DROP TRIGGER IF EXISTS trg_score_config_recalcula_todos ON score_config;
CREATE TRIGGER trg_score_config_recalcula_todos
    AFTER UPDATE OF peso ON score_config
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trg_recalcular_por_score_config();












-- ############################################################################
-- 21-09-2026 - REJEIÇÃO E REENVIO, RASCUNHO COMPLETO (idempotente)
--
-- Regras novas de campanha, ver REQUISITOS_V7: ciclo de rejeição e reenvio
-- (máximo de reenvios, prazo depois de cada rejeição, campanha só para leitura
-- quando esgotada, exclusão automática), histórico de rejeição que sobrevive à
-- exclusão da campanha, reagendamento de datas mantendo a duração, e a taxa de
-- aprovação do score.
--
-- UM BLOCO SÓ, pode colar tudo de uma vez: NENHUM valor de enum novo aqui.
-- ('rascunho' já entrou na rodada de 20-09, que você já rodou. O aviso de "2
-- scripts separados" daquela rodada não vale para esta.)
--
-- Duas coisas para saber antes de colar:
--   * O PASSO 4 remove a policy de UPDATE de historico_rejeicao (e o PASSO 5
--     tira o GRANT). A partir daqui o histórico de rejeição é IMUTÁVEL. Nenhum
--     código do sistema fazia UPDATE nele, então nada quebra.
--   * O PASSO 6 é só conferência (tudo comentado). Vale rodar depois, e olhar
--     especialmente a última consulta: ela lista as campanhas rejeitadas cujo
--     prazo de 30 dias JÁ venceu, e que o job de expiração vai APAGAR na
--     próxima hora cheia depois de o backend subir.
-- ############################################################################


-- ----------------------------------------------------------------------------
-- PASSO 1 - historico_rejeicao passa a ser independente da campanha
-- ----------------------------------------------------------------------------
-- Ordem que importa: as 2 colunas nascem NULLABLE, são PREENCHIDAS a partir de
-- campanha, e só depois viram NOT NULL, e SÓ ENTÃO a FK para campanha é
-- removida. Fazer na ordem inversa perderia o vínculo antes de copiar os dados.
ALTER TABLE historico_rejeicao ADD COLUMN IF NOT EXISTS id_usuario_dono INT;
ALTER TABLE historico_rejeicao ADD COLUMN IF NOT EXISTS titulo_campanha VARCHAR(255);

UPDATE historico_rejeicao h
SET id_usuario_dono = c.id_usuario,
    titulo_campanha = c.titulo
FROM campanha c
WHERE c.id_campanha = h.id_campanha
  AND (h.id_usuario_dono IS NULL OR h.titulo_campanha IS NULL);

ALTER TABLE historico_rejeicao ALTER COLUMN id_usuario_dono SET NOT NULL;
ALTER TABLE historico_rejeicao ALTER COLUMN titulo_campanha SET NOT NULL;

ALTER TABLE historico_rejeicao DROP CONSTRAINT IF EXISTS "FK_HISTORICO_REJEICAO_CAMPANHA";
ALTER TABLE historico_rejeicao DROP CONSTRAINT IF EXISTS "FK_HISTORICO_REJEICAO_DONO";
ALTER TABLE historico_rejeicao
    ADD CONSTRAINT "FK_HISTORICO_REJEICAO_DONO" FOREIGN KEY (id_usuario_dono) REFERENCES usuario(id_usuario);


-- ----------------------------------------------------------------------------
-- PASSO 2 - parâmetros novos (ON CONFLICT DO NOTHING: não sobrescreve se já existir)
-- ----------------------------------------------------------------------------
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'campanha_rejeitada_max_reenvios', '3',  'inteiro', 'Nº máximo de reenvios de uma campanha rejeitada, depois da 1ª rejeição',                        TRUE, TRUE),
(NULL, 'campanha_rejeitada_prazo_dias',   '30', 'inteiro', 'Dias que uma campanha rejeitada fica disponível para reenvio, contados da última rejeição', TRUE, TRUE)
ON CONFLICT (chave) DO NOTHING;


-- ----------------------------------------------------------------------------
-- PASSO 3 - funções (todas copiadas por comando dos arquivos 03 e 05, não redigitadas)
-- ----------------------------------------------------------------------------

-- 3.1 Conta de reenvios esgotados, num lugar só (usada pelas funções abaixo).
CREATE OR REPLACE FUNCTION public.fn_campanha_reenvios_esgotados(p_id_campanha INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*) > public.config_numero('campanha_rejeitada_max_reenvios', 3)
    FROM historico_rejeicao
    WHERE id_campanha = p_id_campanha;
$$;

-- 3.2 Transições: dono envia rascunho / reenvia rejeitada, agora com pesquisador
-- ativo, reenvios disponíveis e prazo (ERRCODE 92009, 91025, 91026).
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

    -- Dono colocando a própria campanha na fila de aprovação. São 2 caminhos,
    -- tratados juntos porque a autorização é idêntica: corrigir e reenviar uma
    -- REJEITADA e enviar um RASCUNHO pela primeira vez (este ADICIONADO em
    -- 20-09-2026, junto com o status 'rascunho').
    --
    -- Botão explícito nos 2 casos, NUNCA transição automática quando a campanha
    -- fica completa: uma transição disparada por trigger não teria SUJEITO, e
    -- esta função é construída inteira em torno de QUEM faz a transição (ela
    -- nasceu do achado de autoaprovação pelo dono). Automatizar exigiria contar
    -- linhas de 2 outras tabelas aqui dentro, com SECURITY DEFINER pra furar a
    -- RLS, dentro do guardião de fraude de status.
    --
    -- As 2 guardas de aprovado_em/id_admin impedem que "colocar na fila"
    -- carimbe aprovação de tabela.
    --
    -- Pesquisador SUSPENSO não envia nem reenvia (20-09-2026): pol_campanha_update
    -- (04) não checa suspensão, diferente de pol_campanha_insert e
    -- pol_atualizacao_insert. Sem isto, um suspenso não criava campanha nem
    -- publicava atualização, mas empurrava uma campanha pra fila do administrador.
    --
    -- REENVIO de rejeitada tem 2 condições novas (21-09-2026, ver REQUISITOS_V7),
    -- cada uma com ERRCODE próprio pro Nest e a tela dizerem o motivo certo:
    --   * reenvios ainda disponíveis (91025): depois da 1ª rejeição a campanha
    --     admite campanha_rejeitada_max_reenvios reenvios; esgotados, vira só
    --     leitura (ver fn_campanha_reenvios_esgotados);
    --   * dentro do prazo (91026): campanha_rejeitada_prazo_dias contados da
    --     ÚLTIMA rejeição. Depois disso ela é excluída por
    --     expirar_campanhas_rejeitadas(); a janela entre vencer e o job rodar
    --     (até 1h) é fechada aqui pra não deixar reenviar uma campanha que já
    --     deveria ter sumido. Sem nenhuma linha de histórico (rejeitada por fora
    --     do fluxo normal) não há data pra comparar e o reenvio passa, igual ao
    --     job, que também não a apaga.
    IF NEW.id_usuario = public.id_usuario_atual()
       AND OLD.status IN ('rejeitado', 'rascunho') AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
    THEN
        IF NOT EXISTS (
            SELECT 1 FROM perfil_pesquisador pp
            WHERE pp.id_usuario = public.id_usuario_atual() AND pp.status_pesquisador = 'ativo'
        ) THEN
            RAISE EXCEPTION 'Pesquisador suspenso não pode enviar campanha para aprovação.'
                USING ERRCODE = '92009';
        END IF;

        IF OLD.status = 'rejeitado' THEN
            IF public.fn_campanha_reenvios_esgotados(OLD.id_campanha) THEN
                RAISE EXCEPTION 'Esta campanha já usou todos os reenvios permitidos e agora é somente leitura.'
                    USING ERRCODE = '91025';
            END IF;

            IF (SELECT MAX(h.rejeitado_em) FROM historico_rejeicao h WHERE h.id_campanha = OLD.id_campanha)
               <= NOW() - (public.config_numero('campanha_rejeitada_prazo_dias', 30)::INT * INTERVAL '1 day')
            THEN
                RAISE EXCEPTION 'O prazo para reenviar esta campanha rejeitada já venceu.'
                    USING ERRCODE = '91026';
            END IF;
        END IF;

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

-- 3.3 Congelamento: rejeitada sem reenvios é só leitura (ERRCODE 91027).
CREATE OR REPLACE FUNCTION fn_congela_regras_campanha()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao') THEN
        -- CORRIGIDO: taxa_plataforma é nullable; "<>" contra NULL nunca dá TRUE, deixando
        -- a taxa mudar sem bloqueio numa campanha aprovada com taxa ainda não preenchida.
        -- IS DISTINCT FROM trata NULL corretamente nos três casos.
        IF NEW.meta_financeira IS DISTINCT FROM OLD.meta_financeira THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar a meta financeira após a aprovação da campanha.'
                USING ERRCODE = '91004';
        END IF;

        IF NEW.modelo IS DISTINCT FROM OLD.modelo THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o modelo de financiamento após a aprovação da campanha.'
                USING ERRCODE = '91005';
        END IF;

        IF NEW.taxa_plataforma IS DISTINCT FROM OLD.taxa_plataforma THEN
            RAISE EXCEPTION 'Operação bloqueada: a taxa da plataforma não pode ser alterada após o congelamento.'
                USING ERRCODE = '91006';
        END IF;

        -- CORRIGIDO (B2): título, descrição e prazo não eram protegidos - trocar a
        -- descrição de um projeto já financiado é o vetor de fraude mais óbvio que
        -- existe numa plataforma de doação. Mesma trigger, mesmos campos protegidos.
        IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o título após a aprovação da campanha.'
                USING ERRCODE = '91007';
        END IF;

        IF NEW.descricao IS DISTINCT FROM OLD.descricao THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar a descrição após a aprovação da campanha.'
                USING ERRCODE = '91008';
        END IF;

        -- CORRIGIDO (20-09-2026, achado numa revisão do Lucas): regressão por
        -- omissão. Estes 2 campos nasceram DEPOIS desta trigger (video_
        -- apresentacao_url em 28-07-2026) e nunca foram incluídos, apesar de
        -- CampanhaRequestUpdate aceitar os dois e pol_campanha_update liberar o
        -- dono. O vídeo é o MESMO vetor de fraude que a descrição (comentário
        -- logo acima), com mais impacto - trocar o vídeo de apresentação de um
        -- projeto já financiado é apresentar outro projeto para quem já doou.
        IF NEW.video_apresentacao_url IS DISTINCT FROM OLD.video_apresentacao_url THEN
            RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o vídeo de apresentação após a aprovação da campanha.'
                USING ERRCODE = '91023';
        END IF;

        IF NEW.id_area_conhecimento IS DISTINCT FROM OLD.id_area_conhecimento THEN
            RAISE EXCEPTION 'Operação bloqueada: a área do conhecimento não pode ser alterada após a aprovação da campanha.'
                USING ERRCODE = '91024';
        END IF;

        -- ADICIONADO (28-07-2026) - feature "Em breve": data_fim/data_inicio só
        -- congelam quando a campanha JÁ COMEÇOU de fato (data_inicio no passado),
        -- não no momento da aprovação. Enquanto a campanha está "Em breve"
        -- (aprovada, pública, mas com data_inicio no futuro - ver
        -- fn_valida_contribuicao_campanha_ativa), o pesquisador pode reagendar o
        -- início livremente (precisa de mais tempo de divulgação, por exemplo).
        -- meta/modelo/taxa/título/descrição continuam congelados desde a aprovação
        -- - só as datas ganharam esse período de carência.
        IF OLD.data_inicio IS NOT NULL AND OLD.data_inicio <= NOW() THEN
            IF NEW.data_fim IS DISTINCT FROM OLD.data_fim THEN
                RAISE EXCEPTION 'Operação bloqueada: o prazo da campanha não pode ser alterado depois que ela começa de verdade.'
                    USING ERRCODE = '91009';
            END IF;

            -- CORRIGIDO (regressão do B2): data_inicio tinha ficado de fora - dava pra
            -- recuar a data de início e mudar a duração da campanha pelo outro lado,
            -- sem nenhum bloqueio, mesmo com data_fim já congelado.
            IF NEW.data_inicio IS DISTINCT FROM OLD.data_inicio THEN
                RAISE EXCEPTION 'Operação bloqueada: a data de início da campanha não pode ser alterada depois que ela começa de verdade.'
                    USING ERRCODE = '91010';
            END IF;
        END IF;
    END IF;

    -- ADICIONADO (21-09-2026, ver REQUISITOS_V7): campanha REJEITADA que já usou
    -- todos os reenvios fica só para leitura, pra qualquer perfil, inclusive o
    -- Administrador. Bloqueia mudança de qualquer campo de CONTEÚDO; status,
    -- aprovado_em e id_admin ficam de fora porque quem decide essas mudanças é
    -- fn_valida_transicao_campanha (e o reenvio esgotado já é barrado lá, com
    -- ERRCODE 91025).
    IF OLD.status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(OLD.id_campanha) THEN
        IF NEW.titulo                    IS DISTINCT FROM OLD.titulo
           OR NEW.descricao              IS DISTINCT FROM OLD.descricao
           OR NEW.meta_financeira        IS DISTINCT FROM OLD.meta_financeira
           OR NEW.modelo                 IS DISTINCT FROM OLD.modelo
           OR NEW.data_inicio            IS DISTINCT FROM OLD.data_inicio
           OR NEW.data_fim               IS DISTINCT FROM OLD.data_fim
           OR NEW.id_area_conhecimento   IS DISTINCT FROM OLD.id_area_conhecimento
           OR NEW.video_apresentacao_url IS DISTINCT FROM OLD.video_apresentacao_url
        THEN
            RAISE EXCEPTION 'Esta campanha rejeitada já usou todos os reenvios permitidos e agora é somente leitura.'
                USING ERRCODE = '91027';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_congela_orcamento_campanha()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id_campanha INT := COALESCE(NEW.id_campanha, OLD.id_campanha);
    v_status      status_campanha;
BEGIN
    SELECT status INTO v_status FROM campanha WHERE id_campanha = v_id_campanha;

    IF v_status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao') THEN
        RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o orçamento após a aprovação da campanha.'
            USING ERRCODE = '91011';
    END IF;

    -- ADICIONADO (21-09-2026): rejeitada sem reenvios é só leitura, ver
    -- fn_campanha_reenvios_esgotados. Na exclusão da própria campanha (cascata,
    -- expirar_campanhas_rejeitadas) v_status vem NULL, porque a linha-pai já
    -- sumiu, e o bloqueio não se aplica - é o que deixa a expiração apagar.
    IF v_status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(v_id_campanha) THEN
        RAISE EXCEPTION 'Esta campanha rejeitada já usou todos os reenvios permitidos e agora é somente leitura.'
            USING ERRCODE = '91027';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_congela_marco_cronograma()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id_campanha INT := COALESCE(NEW.id_campanha, OLD.id_campanha);
    v_status      status_campanha;
    v_data_inicio TIMESTAMP;
BEGIN
    SELECT status, data_inicio INTO v_status, v_data_inicio FROM campanha WHERE id_campanha = v_id_campanha;

    IF v_status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao')
       AND v_data_inicio IS NOT NULL AND v_data_inicio <= NOW() THEN
        RAISE EXCEPTION 'Operação bloqueada: o cronograma não pode ser alterado depois que a campanha começa de verdade.'
            USING ERRCODE = '91013';
    END IF;

    -- ADICIONADO (21-09-2026): mesmo bloqueio de fn_congela_orcamento_campanha
    -- (ver comentário lá, inclusive sobre v_status NULL na cascata de exclusão).
    IF v_status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(v_id_campanha) THEN
        RAISE EXCEPTION 'Esta campanha rejeitada já usou todos os reenvios permitidos e agora é somente leitura.'
            USING ERRCODE = '91027';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- 3.4 Completude: RENOMEADA de fn_valida_completude_campanha_aprovacao (passou a
-- rodar em 3 transições). Cria a nova, repõe o trigger apontando pra ela, e só
-- então apaga a antiga, senão o DROP FUNCTION falharia por dependência.
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
        RAISE EXCEPTION 'A campanha precisa de pelo menos % itens de orçamento (tem %).', v_min_orcamento, v_qtd_orcamento
            USING ERRCODE = '90009';
    END IF;

    IF v_qtd_marcos < v_min_marcos THEN
        RAISE EXCEPTION 'A campanha precisa de pelo menos % marcos de cronograma (tem %).', v_min_marcos, v_qtd_marcos
            USING ERRCODE = '90010';
    END IF;

    IF v_soma_orcamento <> NEW.meta_financeira THEN
        RAISE EXCEPTION 'A soma dos itens de orçamento (%) precisa ser exatamente igual à meta financeira (%).', v_soma_orcamento, NEW.meta_financeira
            USING ERRCODE = '90011';
    END IF;

    -- ADICIONADO (20-09-2026): NENHUMA regra do banco comparava as datas da
    -- campanha com NOW(). A única checagem de "não pode ser no passado" vivia
    -- no navegador (bancada-campanha.tsx). Consequência real: um rascunho
    -- parado alguns dias tinha a data_fim vencida, era aprovado sem nenhuma
    -- trigger reclamar, e encerrar_campanhas_vencidas() o marcava como
    -- 'nao_atingido' em até 15 minutos, sem receber uma única contribuição. E
    -- 'nao_atingido' PENALIZA o score do pesquisador (calcular_score_historico,
    -- [05-I]) - ele perdia reputação permanente por um erro do sistema.
    --
    -- Só data_fim, de propósito. data_inicio no passado é legítimo (campanha
    -- que começou hoje de manhã e é aprovada à tarde). Não tenta deslizar datas
    -- nem recalcular o cronograma junto: o pesquisador corrige as 2 datas no
    -- formulário que já existe, e é só isso.
    IF NEW.data_fim IS NULL OR NEW.data_fim <= NOW() THEN
        RAISE EXCEPTION 'O prazo da campanha já venceu (fim em %). Atualize as datas antes de enviar.', NEW.data_fim
            USING ERRCODE = '90015';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campanha_valida_completude_aprovacao ON campanha;
DROP TRIGGER IF EXISTS trg_campanha_valida_completude ON campanha;
CREATE TRIGGER trg_campanha_valida_completude
BEFORE UPDATE ON campanha
FOR EACH ROW
WHEN (
     (NEW.status = 'ativo'                AND OLD.status IS DISTINCT FROM 'ativo')
  OR (NEW.status = 'aguardando_aprovacao' AND OLD.status IN ('rascunho', 'rejeitado'))
)
EXECUTE FUNCTION public.fn_valida_completude_campanha();

DROP FUNCTION IF EXISTS public.fn_valida_completude_campanha_aprovacao();

-- 3.5 Expiração da campanha rejeitada e reagendamento de datas.
CREATE OR REPLACE FUNCTION public.expirar_campanhas_rejeitadas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expiradas INT;
BEGIN
    DELETE FROM campanha c
    WHERE c.status = 'rejeitado'
      AND (SELECT MAX(h.rejeitado_em) FROM historico_rejeicao h WHERE h.id_campanha = c.id_campanha)
          <= NOW() - (public.config_numero('campanha_rejeitada_prazo_dias', 30)::INT * INTERVAL '1 day')
      AND NOT EXISTS (SELECT 1 FROM denuncia d WHERE d.id_campanha_alvo = c.id_campanha);

    GET DIAGNOSTICS v_expiradas = ROW_COUNT;

    RETURN v_expiradas;
END;
$$;

CREATE OR REPLACE FUNCTION public.deslizar_datas_campanha(
    p_id_campanha INT,
    p_nova_data_inicio TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data_inicio TIMESTAMPTZ;
    v_delta       INTERVAL;
BEGIN
    SELECT data_inicio INTO v_data_inicio
    FROM campanha
    WHERE id_campanha = p_id_campanha
      AND (id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
      AND status IN ('rascunho', 'rejeitado');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Só o dono (ou quem pode editar campanhas) reagenda uma campanha em rascunho ou rejeitada.'
            USING ERRCODE = '92010';
    END IF;

    IF v_data_inicio IS NULL OR p_nova_data_inicio IS NULL THEN
        RAISE EXCEPTION 'A campanha precisa ter data de início para as datas serem reagendadas.'
            USING ERRCODE = '90016';
    END IF;

    v_delta := p_nova_data_inicio - v_data_inicio;

    IF v_delta >= INTERVAL '0' THEN
        UPDATE marco_cronograma SET data_prevista = data_prevista + v_delta
        WHERE id_campanha = p_id_campanha;

        UPDATE campanha
        SET data_inicio = data_inicio + v_delta,
            data_fim    = data_fim + v_delta
        WHERE id_campanha = p_id_campanha;
    ELSE
        UPDATE campanha
        SET data_inicio = data_inicio + v_delta,
            data_fim    = data_fim + v_delta
        WHERE id_campanha = p_id_campanha;

        UPDATE marco_cronograma SET data_prevista = data_prevista + v_delta
        WHERE id_campanha = p_id_campanha;
    END IF;
END;
$$;

-- 3.6 Limite de simultâneas: só a mensagem de erro mudou (e o comentário).
CREATE OR REPLACE FUNCTION validar_limite_campanhas_pesquisador()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
    v_limite integer;
BEGIN
    IF NEW.status IN ('aguardando_aprovacao', 'ativo') THEN
        v_limite := public.config_numero('limite_campanhas_simultaneas', 2);

        SELECT COUNT(*) INTO v_count
        FROM campanha
        WHERE id_usuario = NEW.id_usuario
          AND status IN ('aguardando_aprovacao', 'ativo')
          AND id_campanha <> COALESCE(NEW.id_campanha, -1);

        IF v_count >= v_limite THEN
            RAISE EXCEPTION 'Você já possui % campanhas em andamento (ativas ou aguardando aprovação). Aguarde uma delas terminar antes de enviar esta para aprovação.', v_limite
                USING ERRCODE = '91018';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3.7 Score: taxa de aprovação conta só a campanha excluída sem nunca ter sido
-- aprovada; rascunho fora do cálculo.
CREATE OR REPLACE FUNCTION public.calcular_score_historico(p_id_usuario INT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_pai                INT;
    v_peso_raiz             DECIMAL;
    v_peso_conclusao        DECIMAL := 0;
    v_peso_aprovacao        DECIMAL := 0;
    v_total_encerradas      INT := 0;
    v_concluidas_sucesso    INT := 0;
    v_total_submetidas      INT := 0;
    v_aprovadas             INT := 0;
    v_rejeitadas_definitivas INT := 0;
    v_abandonadas           INT := 0;
    v_sem_justificativa     INT := 0;
    v_conclusao             DECIMAL := 0;
    v_aprovacao             DECIMAL := 0;
    v_penalidade_abandono   DECIMAL;
    v_penalidade_sem_just   DECIMAL;
    v_total                 DECIMAL := 0;
BEGIN
    SELECT id_score_config, peso INTO v_id_pai, v_peso_raiz
    FROM score_config WHERE nome = 'historico_plataforma' AND ativo = TRUE;

    IF v_id_pai IS NULL THEN RETURN 0; END IF;

    SELECT COALESCE(peso,0) INTO v_peso_conclusao FROM score_config WHERE id_pai = v_id_pai AND nome = 'campanhas_concluidas' AND ativo = TRUE;
    SELECT COALESCE(peso,0) INTO v_peso_aprovacao FROM score_config WHERE id_pai = v_id_pai AND nome = 'taxa_aprovacao'       AND ativo = TRUE;

    v_penalidade_abandono := public.config_numero('score_penalidade_abandono', 3);
    v_penalidade_sem_just := public.config_numero('score_penalidade_sem_justificativa', 2);

    -- ALTERADO (21-09-2026, ver REQUISITOS_V7, pontuação de reputação): a taxa de
    -- aprovação deixou de dividir por "toda campanha do usuário". Dois problemas
    -- com as regras novas: um RASCUNHO entraria no total (e o rascunho não é
    -- nada, ainda), e uma rejeitada que EXPIRA sumia da conta (a taxa subiria
    -- justamente quando o pesquisador deixa uma campanha rejeitada morrer).
    -- Agora conta como rejeitada APENAS a campanha excluída sem nunca ter sido
    -- aprovada:
    --   aprovadas              = campanhas existentes com aprovado_em preenchido;
    --   rejeitadas definitivas = campanhas que aparecem no histórico de
    --                            rejeições e NÃO existem mais (o histórico
    --                            sobrevive à exclusão, ver 01);
    --   total                  = aprovadas + rejeitadas definitivas.
    -- Ficam FORA do total: rascunho, aguardando aprovação, e rejeitada ainda
    -- dentro do prazo. Rejeições de uma campanha depois APROVADA no reenvio
    -- também não contam: ela existe, então não é "definitiva".
    -- "Não existe mais" equivale a "nunca aprovada" porque campanha aprovada não
    -- é excluída pelos caminhos normais. A exceção é forcar_exclusao_campanha,
    -- ferramenta do Campo de Testes, cujo efeito nesta conta é aceito.
    SELECT count(*) INTO v_aprovadas FROM campanha WHERE id_usuario = p_id_usuario AND aprovado_em IS NOT NULL;
    SELECT count(DISTINCT h.id_campanha) INTO v_rejeitadas_definitivas
    FROM historico_rejeicao h
    WHERE h.id_usuario_dono = p_id_usuario
      AND NOT EXISTS (SELECT 1 FROM campanha c WHERE c.id_campanha = h.id_campanha);
    v_total_submetidas := v_aprovadas + v_rejeitadas_definitivas;
    -- CORRIGIDO (28-07-2026, item 13(b) da Lista C - erro aritmético, não decisão de
    -- negócio): 'rejeitado' saiu do denominador da taxa de conclusão. Contar a mesma
    -- rejeição duas vezes (uma vez derrubando a taxa de aprovação, outra vez entrando
    -- no denominador da taxa de conclusão sem nunca poder entrar no numerador) penaliza
    -- o mesmo fato duas vezes.
    -- CORRIGIDO (28-07-2026, item 13(c) da Lista C - decisão da Alexia, "pode ser"):
    -- 'encerrado' (encerramento antecipado com justificativa, RF-040/RF-042) contava
    -- como sucesso pleno no numerador. Virou neutro: sai também do denominador, não
    -- só do numerador - uma campanha interrompida pelo próprio pesquisador não é
    -- premiada nem punida, só não conta pra taxa de conclusão.
    SELECT count(*) INTO v_total_encerradas FROM campanha WHERE id_usuario = p_id_usuario
        AND status IN ('sucesso','nao_atingido');
    SELECT count(*) INTO v_concluidas_sucesso FROM campanha WHERE id_usuario = p_id_usuario
        AND status = 'sucesso';

    -- Mapeamento pros dados reais (documentado por não haver status
    -- "abandonada" explícito no enum status_campanha):
    --   abandonada        = status='nao_atingido' e NUNCA pediu encerramento
    --   sem justificativa = status='nao_atingido', pediu encerramento, mas sem justificativa
    SELECT count(*) INTO v_abandonadas FROM campanha c
    WHERE c.id_usuario = p_id_usuario AND c.status = 'nao_atingido'
      AND NOT EXISTS (SELECT 1 FROM solicitacao_encerramento se WHERE se.id_campanha = c.id_campanha);

    SELECT count(*) INTO v_sem_justificativa FROM campanha c
    WHERE c.id_usuario = p_id_usuario AND c.status = 'nao_atingido'
      AND EXISTS (SELECT 1 FROM solicitacao_encerramento se WHERE se.id_campanha = c.id_campanha
                  AND (se.justificativa_pesquisador IS NULL OR btrim(se.justificativa_pesquisador) = ''));

    IF v_total_encerradas > 0 THEN
        v_conclusao := (v_concluidas_sucesso::DECIMAL / v_total_encerradas) * v_peso_conclusao;
    END IF;

    IF v_total_submetidas > 0 THEN
        v_aprovacao := (v_aprovadas::DECIMAL / v_total_submetidas) * v_peso_aprovacao;
    END IF;

    v_total := v_conclusao + v_aprovacao
               - (v_abandonadas * v_penalidade_abandono)
               - (v_sem_justificativa * v_penalidade_sem_just);

    RETURN ROUND(LEAST(GREATEST(v_total, 0), v_peso_raiz))::INTEGER;
END;
$$;

-- 3.8 Suspensão de pesquisador: a rejeição automática passa a gravar no histórico.
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
-- PASSO 4 - policies: o dono enxerga o próprio histórico por id_usuario_dono, e o
-- histórico de moderação fica IMUTÁVEL (sem policy de UPDATE).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS pol_historicorej_select ON historico_rejeicao;
CREATE POLICY pol_historicorej_select ON historico_rejeicao FOR SELECT TO app_nestjs USING (
    public.tem_permissao('campanha_rejeitar')
    OR id_usuario_dono = public.id_usuario_atual()
);

DROP POLICY IF EXISTS pol_historicorej_update ON historico_rejeicao;


-- ----------------------------------------------------------------------------
-- PASSO 5 - grants
-- ----------------------------------------------------------------------------
REVOKE UPDATE ON historico_rejeicao FROM app_nestjs;

REVOKE EXECUTE ON FUNCTION public.expirar_campanhas_rejeitadas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expirar_campanhas_rejeitadas() TO app_nestjs;

REVOKE EXECUTE ON FUNCTION public.deslizar_datas_campanha(INT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deslizar_datas_campanha(INT, TIMESTAMPTZ) TO app_nestjs;

REVOKE EXECUTE ON FUNCTION public.fn_campanha_reenvios_esgotados(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_campanha_reenvios_esgotados(INT) TO app_nestjs;


-- ----------------------------------------------------------------------------
-- PASSO 6 (SÓ CONFERÊNCIA, não altera nada) - descomente para conferir depois
-- ----------------------------------------------------------------------------
-- Rejeições existentes ganharam dono e título? (deve devolver 0 linhas)
--   SELECT id_rejeicao FROM historico_rejeicao WHERE id_usuario_dono IS NULL OR titulo_campanha IS NULL;
-- Campanhas rejeitadas hoje, quantas rejeições cada uma tem e se já esgotou:
--   SELECT c.id_campanha, c.titulo, COUNT(h.id_rejeicao) AS rejeicoes,
--          public.fn_campanha_reenvios_esgotados(c.id_campanha) AS esgotada,
--          MAX(h.rejeitado_em) AS ultima_rejeicao
--   FROM campanha c LEFT JOIN historico_rejeicao h ON h.id_campanha = c.id_campanha
--   WHERE c.status = 'rejeitado' GROUP BY c.id_campanha, c.titulo;
-- Campanhas que a expiração apagaria na PRÓXIMA rodada (rejeitadas com prazo vencido):
--   SELECT c.id_campanha, c.titulo, MAX(h.rejeitado_em) AS ultima_rejeicao
--   FROM campanha c JOIN historico_rejeicao h ON h.id_campanha = c.id_campanha
--   WHERE c.status = 'rejeitado'
--   GROUP BY c.id_campanha, c.titulo
--   HAVING MAX(h.rejeitado_em) <= NOW() - INTERVAL '30 days';
