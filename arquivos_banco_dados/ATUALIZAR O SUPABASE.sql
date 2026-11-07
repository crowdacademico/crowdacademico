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
-- GRUPO BS (31-10-2026) - Notificações: o texto de cada aviso editável no painel e o sino. IDEMPOTENTE (pode colar de novo).
-- PARE O NEST antes de colar: o grupo muda a tabela notificacao e as policies dela, e isso pede uma trava que pode
-- esperar para sempre (ou dar deadlock) com o Nest e o envio de e-mails usando a tabela.
--
-- O que muda:
--   1. Tabela nova modelo_mensagem: o texto de cada aviso, por evento e canal (e-mail ou sino do painel), que o admin
--      edita em Configurações > Mensagens. Os textos iniciais são os mesmos que estavam no código do Nest.
--   2. notificacao ganha canal ('email' ou 'interna', o sino) e lida_em. O e-mail de destino fica vazio só no sino.
--   3. enfileirar_notificacao grava uma linha por canal ligado do evento. A campanha nova de quem a pessoa segue passa
--      a ir só para o sino (o e-mail dela começa desligado; liga na tela).
--   4. O app só altera lida_em em notificacao (marcar o próprio aviso do sino como lido).
-- Os e-mails que já estão no banco não mudam (viram canal 'email').
-- ============================================================================

CREATE TABLE IF NOT EXISTS modelo_mensagem (
    id_modelo_mensagem SERIAL,
    tipo_evento        VARCHAR(100) NOT NULL,                -- o mesmo nome de notificacao.tipo_evento
    canal              VARCHAR(20)  NOT NULL,                -- 'email' | 'interna' (o sino do painel)
    titulo             VARCHAR(200) NOT NULL,                -- e-mail: o assunto; sino: o título
    corpo              TEXT         NOT NULL,                -- parágrafos separados por linha em branco, com {{variáveis}}
    ativo              BOOLEAN      NOT NULL DEFAULT TRUE,
    obrigatoria        BOOLEAN      NOT NULL DEFAULT FALSE,
    atualizado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "PK_MODELO_MENSAGEM" PRIMARY KEY (id_modelo_mensagem),
    CONSTRAINT "UK_MODELO_MENSAGEM_EVENTO_CANAL" UNIQUE (tipo_evento, canal),
    CONSTRAINT "CK_MODELO_MENSAGEM_CANAL" CHECK (canal IN ('email', 'interna')),
    CONSTRAINT "CK_MODELO_MENSAGEM_TITULO" CHECK (BTRIM(titulo) <> ''),
    CONSTRAINT "CK_MODELO_MENSAGEM_CORPO" CHECK (BTRIM(corpo) <> ''),
    CONSTRAINT "CK_MODELO_MENSAGEM_OBRIGATORIA" CHECK (ativo OR NOT obrigatoria)
);

ALTER TABLE notificacao ADD COLUMN IF NOT EXISTS canal VARCHAR(20) NOT NULL DEFAULT 'email';
ALTER TABLE notificacao ADD COLUMN IF NOT EXISTS lida_em TIMESTAMPTZ;
ALTER TABLE notificacao ALTER COLUMN email_destinatario DROP NOT NULL;
ALTER TABLE notificacao DROP CONSTRAINT IF EXISTS "CK_NOTIFICACAO_CANAL";
ALTER TABLE notificacao ADD CONSTRAINT "CK_NOTIFICACAO_CANAL" CHECK (
        (canal = 'email' AND email_destinatario IS NOT NULL AND lida_em IS NULL)
        OR (canal = 'interna' AND email_destinatario IS NULL AND status = 'enviado')
    );

CREATE INDEX IF NOT EXISTS idx_notificacao_sino ON notificacao(id_usuario, criado_em DESC) WHERE canal = 'interna';

ALTER TABLE modelo_mensagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_mensagem FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pol_notificacao_update ON notificacao;
CREATE POLICY pol_notificacao_update ON notificacao FOR UPDATE TO app_nestjs
    USING (canal = 'interna' AND id_usuario = (SELECT public.id_usuario_atual()))
    WITH CHECK (canal = 'interna' AND id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_modelo_mensagem_select ON modelo_mensagem;
CREATE POLICY pol_modelo_mensagem_select ON modelo_mensagem FOR SELECT TO app_nestjs USING (true);
DROP POLICY IF EXISTS pol_modelo_mensagem_update ON modelo_mensagem;
CREATE POLICY pol_modelo_mensagem_update ON modelo_mensagem FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('configuracao_gerenciar'))) WITH CHECK ((SELECT public.tem_permissao('configuracao_gerenciar')));

GRANT SELECT ON modelo_mensagem TO app_nestjs;
GRANT UPDATE (titulo, corpo, ativo, atualizado_em) ON modelo_mensagem TO app_nestjs;
REVOKE UPDATE ON notificacao FROM app_nestjs;
GRANT UPDATE (lida_em) ON notificacao TO app_nestjs;

-- ----------------------------------------------------------------------------
-- Função:     enfileirar_notificacao
-- Assinatura: (p_id_usuario INT, p_tipo VARCHAR, p_dados JSONB DEFAULT '{}') -> INT
-- Bloco:      [05-Q]
-- Regra:      Avisa uma conta pelos canais ligados do evento (modelo_mensagem.ativo): o e-mail entra 'pendente' na
--             fila, com o e-mail e o nome da pessoa NESTE momento (ela pode trocar depois; o histórico mostra para onde
--             foi); o sino entra já 'enviado', sem dados.segredo (o token do link só vai por e-mail). O texto não é
--             gravado: é montado do modelo na hora de enviar (e-mail) ou de mostrar (sino). Devolve o id do e-mail ou,
--             sem e-mail, o do sino; NULL = nada gravado (conta inexistente ou excluída, ou nenhum canal ligado).
--             SECURITY DEFINER, sem autorização: quem chama são os gatilhos deste bloco e o Nest (cadastro e
--             recuperação de senha), sempre por causa de um evento que já passou pelas próprias regras.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enfileirar_notificacao(p_id_usuario INT, p_tipo VARCHAR, p_dados JSONB DEFAULT '{}'::jsonb)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email    VARCHAR(255);
    v_nome     VARCHAR(150);
    v_dados    JSONB;
    v_id_email INT;
    v_id_sino  INT;
BEGIN
    SELECT u.email, u.nome INTO v_email, v_nome
    FROM usuario u
    WHERE u.id_usuario = p_id_usuario AND NOT u.deletado;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_dados := jsonb_build_object('nome', v_nome) || COALESCE(p_dados, '{}'::jsonb);

    IF v_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM modelo_mensagem WHERE tipo_evento = p_tipo AND canal = 'email' AND ativo
    ) THEN
        INSERT INTO notificacao (id_usuario, canal, email_destinatario, tipo_evento, dados)
        VALUES (p_id_usuario, 'email', v_email, p_tipo, v_dados)
        RETURNING id_notificacao INTO v_id_email;
    END IF;

    IF EXISTS (
        SELECT 1 FROM modelo_mensagem WHERE tipo_evento = p_tipo AND canal = 'interna' AND ativo
    ) THEN
        INSERT INTO notificacao (id_usuario, canal, tipo_evento, dados, status, enviado_em)
        VALUES (p_id_usuario, 'interna', p_tipo, v_dados - 'segredo', 'enviado', NOW())
        RETURNING id_notificacao INTO v_id_sino;
    END IF;

    RETURN COALESCE(v_id_email, v_id_sino);
END;
$$;

-- modelo_mensagem: o histórico do texto de cada aviso (quem mudou, o antigo e o novo) é este registro.
DROP TRIGGER IF EXISTS trg_log_auditoria_modelo_mensagem ON modelo_mensagem;
CREATE TRIGGER trg_log_auditoria_modelo_mensagem
AFTER INSERT OR UPDATE OR DELETE ON modelo_mensagem
FOR EACH ROW EXECUTE FUNCTION public.fn_log_auditoria('id_modelo_mensagem');

INSERT INTO modelo_mensagem (tipo_evento, canal, titulo, corpo, ativo, obrigatoria) VALUES
('verificacao_email', 'email', 'Confirme o seu e-mail no CrowdAcadêmico',
 E'Falta só um passo para a sua conta ficar completa: confirmar que este e-mail é seu.\n\nSe não foi você quem criou a conta, ignore este e-mail.', TRUE, TRUE),
('recuperacao_senha', 'email', 'Crie uma nova senha no CrowdAcadêmico',
 E'Recebemos um pedido para criar uma nova senha para a sua conta.\n\nO link vale por {{minutos}} minutos e só pode ser usado uma vez.\n\nSe não foi você, ignore este e-mail: a sua senha continua a mesma.', TRUE, TRUE),
('campanha_aprovada', 'email', 'Sua campanha foi aprovada',
 E'Boa notícia: "{{titulo}}" foi aprovada e já está visível na plataforma.\n\nA partir da data de início, ela passa a receber contribuições.', TRUE, FALSE),
('campanha_rejeitada', 'email', 'Sua campanha não foi aprovada',
 E'"{{titulo}}" não foi aprovada desta vez.\n\n{{#justificativa}}Motivo: {{justificativa}}{{/justificativa}}\n\n{{#reenvios_restantes}}Você pode corrigir e enviar de novo até {{prazo_reenvio_ate}}. Reenvios restantes: {{reenvios_restantes}}.{{/reenvios_restantes}}{{^reenvios_restantes}}Os reenvios desta campanha acabaram. Ela fica só para consulta até {{prazo_reenvio_ate}}, quando é excluída.{{/reenvios_restantes}}', TRUE, FALSE),
('nova_campanha_pesquisador', 'email', 'Nova campanha de um pesquisador que você segue',
 E'{{nome_pesquisador}} publicou uma campanha nova: "{{titulo}}".', FALSE, FALSE),
('nova_atualizacao', 'email', 'Nova atualização numa campanha que você acompanha',
 E'"{{titulo}}" publicou uma atualização: "{{titulo_atualizacao}}".', TRUE, FALSE),
('campanha_sucesso', 'email', 'A campanha que você apoiou bateu a meta',
 E'"{{titulo}}" terminou e bateu a meta. Obrigado por apoiar a pesquisa!\n\nO valor arrecadado vai para o pesquisador depois do prazo de segurança da plataforma.', TRUE, FALSE),
('campanha_nao_atingida', 'email', 'A campanha que você apoiou não bateu a meta',
 E'"{{titulo}}" terminou sem bater a meta. Como ela é do modelo tudo ou nada, a sua contribuição vai ser devolvida.\n\nA devolução já começou. Você recebe outro e-mail quando ela for concluída.', TRUE, FALSE),
('campanha_encerrada_moderacao', 'email', 'A campanha que você apoiou foi encerrada',
 E'"{{titulo}}" foi encerrada pela moderação da plataforma.\n\nA sua contribuição vai ser devolvida. Você recebe outro e-mail quando a devolução for concluída.', TRUE, FALSE),
('devolucao_concluida', 'email', 'Sua contribuição foi devolvida',
 E'A devolução da sua contribuição para "{{titulo}}" foi concluída: {{valor}}.\n\nO prazo para o dinheiro aparecer na sua conta depende do seu banco.', TRUE, FALSE),
('repasse_previsto', 'email', 'Seu repasse foi programado',
 E'O repasse de "{{titulo}}" foi programado: {{valor}}, com data prevista para {{data_prevista}}.\n\nO dinheiro vai para a chave Pix cadastrada na sua conta. Confira se ela está certa: a correção da chave é sua responsabilidade.\n\n{{^tem_chave_verificada}}Você ainda não tem chave Pix verificada. Cadastre a chave em Minha Conta; sem ela, o repasse fica esperando.{{/tem_chave_verificada}}', TRUE, FALSE),
('encerramento_aprovado', 'email', 'Seu pedido de encerramento foi aprovado',
 E'O pedido para encerrar "{{titulo}}" antes do prazo foi aprovado, e o encerramento já começou.', TRUE, FALSE),
('encerramento_rejeitado', 'email', 'Seu pedido de encerramento não foi aprovado',
 E'O pedido para encerrar "{{titulo}}" antes do prazo não foi aprovado, e ela continua ativa.\n\n{{#justificativa}}Motivo: {{justificativa}}{{/justificativa}}', TRUE, FALSE),
('pesquisador_suspenso', 'email', 'Seu perfil de pesquisador foi suspenso',
 E'O seu perfil de pesquisador foi suspenso pela moderação{{#suspenso_ate}} até {{suspenso_ate}}{{/suspenso_ate}}.\n\n{{#motivo}}Motivo: {{motivo}}{{/motivo}}\n\nEnquanto durar a suspensão, você não envia campanhas nem publica atualizações.', TRUE, FALSE),
('pesquisador_reativado', 'email', 'Seu perfil de pesquisador foi reativado',
 E'O seu perfil de pesquisador está ativo de novo, com todas as permissões.', TRUE, FALSE),
('contestacao_aceita', 'email', 'Sua contestação foi aceita',
 E'A sua contestação foi aceita, e a denúncia deixou de contar na sua pontuação.\n\n{{#justificativa}}Justificativa: {{justificativa}}{{/justificativa}}', TRUE, FALSE),
('contestacao_recusada', 'email', 'Sua contestação não foi aceita',
 E'A sua contestação foi analisada e não foi aceita.\n\n{{#justificativa}}Justificativa: {{justificativa}}{{/justificativa}}', TRUE, FALSE),
('campanha_aprovada', 'interna', 'Campanha aprovada',
 E'"{{titulo}}" foi aprovada e já está visível na plataforma.', TRUE, FALSE),
('campanha_rejeitada', 'interna', 'Campanha não aprovada',
 E'"{{titulo}}" não foi aprovada.{{#justificativa}} Motivo: {{justificativa}}{{/justificativa}}', TRUE, FALSE),
('nova_campanha_pesquisador', 'interna', 'Nova campanha',
 E'{{nome_pesquisador}} publicou "{{titulo}}".', TRUE, FALSE),
('nova_atualizacao', 'interna', 'Nova atualização',
 E'"{{titulo}}" publicou: "{{titulo_atualizacao}}".', TRUE, FALSE),
('campanha_sucesso', 'interna', 'Meta atingida',
 E'"{{titulo}}", que você apoiou, bateu a meta.', TRUE, FALSE),
('campanha_nao_atingida', 'interna', 'Meta não atingida',
 E'"{{titulo}}" terminou sem bater a meta. A sua contribuição vai ser devolvida.', TRUE, FALSE),
('campanha_encerrada_moderacao', 'interna', 'Campanha encerrada',
 E'"{{titulo}}" foi encerrada pela moderação. A sua contribuição vai ser devolvida.', TRUE, FALSE),
('devolucao_concluida', 'interna', 'Contribuição devolvida',
 E'A devolução para "{{titulo}}" foi concluída: {{valor}}.', TRUE, FALSE),
('repasse_previsto', 'interna', 'Repasse programado',
 E'O repasse de "{{titulo}}" está previsto para {{data_prevista}}.{{^tem_chave_verificada}} Cadastre a sua chave Pix em Minha Conta.{{/tem_chave_verificada}}', TRUE, FALSE),
('encerramento_aprovado', 'interna', 'Encerramento aprovado',
 E'O pedido para encerrar "{{titulo}}" foi aprovado.', TRUE, FALSE),
('encerramento_rejeitado', 'interna', 'Encerramento não aprovado',
 E'O pedido para encerrar "{{titulo}}" não foi aprovado.', TRUE, FALSE),
('pesquisador_suspenso', 'interna', 'Perfil suspenso',
 E'O seu perfil de pesquisador foi suspenso{{#suspenso_ate}} até {{suspenso_ate}}{{/suspenso_ate}}.', TRUE, FALSE),
('pesquisador_reativado', 'interna', 'Perfil reativado',
 E'O seu perfil de pesquisador está ativo de novo.', TRUE, FALSE),
('contestacao_aceita', 'interna', 'Contestação aceita',
 E'A sua contestação foi aceita.', TRUE, FALSE),
('contestacao_recusada', 'interna', 'Contestação não aceita',
 E'A sua contestação não foi aceita.', TRUE, FALSE)
ON CONFLICT (tipo_evento, canal) DO NOTHING;

-- ============================================================================
-- GRUPO BT (01-11-2026) - Mensagens: o admin pode desligar também os e-mails de que um fluxo depende. IDEMPOTENTE.
-- Não precisa parar o Nest: só tira uma regra (CHECK) da tabela modelo_mensagem, que quase ninguém usa ao mesmo tempo.
--
-- O que muda: "Confirmar o e-mail" e "Criar nova senha" deixam de ter o "Ligado" travado. A tela passa a avisar o que
-- para de funcionar ao desligar, mas a decisão é do admin.
-- ============================================================================

ALTER TABLE modelo_mensagem DROP CONSTRAINT IF EXISTS "CK_MODELO_MENSAGEM_OBRIGATORIA";

-- ============================================================================
-- GRUPO BU (01-11-2026) - Reenviar um e-mail que falhou: vai para o e-mail atual da conta. IDEMPOTENTE.
-- Não precisa parar o Nest: só troca uma função.
--
-- O que muda: o Reenviar das Notificações (Dashboard) manda para o e-mail que a conta tem hoje, e não mais para o
-- endereço da época (que pode ser justamente o errado, já corrigido). Conta excluída: o reenvio é recusado (91055).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     reenviar_notificacao
-- Assinatura: (p_id_notificacao INT) -> VOID
-- Bloco:      [05-Q]
-- Regra:      Tratamento manual do RF-121: um e-mail 'falhou' volta para a fila agora, com as tentativas zeradas e
--             para o e-mail ATUAL da conta (o de quando falhou pode ser justamente o endereço errado que a pessoa já
--             corrigiu). Exige notificacao_processar (92039); só 'falhou' pode voltar (91054: enviado não se manda de
--             novo por aqui, e cancelado já perdeu o link, se tinha um); conta excluída não recebe (91055, a mesma
--             regra de enfileirar_notificacao). SECURITY DEFINER com a checagem por dentro.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reenviar_notificacao(p_id_notificacao INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status     status_notificacao;
    v_id_usuario INT;
    v_email      VARCHAR(255);
BEGIN
    IF NOT public.tem_permissao('notificacao_processar') THEN
        RAISE EXCEPTION 'Sem permissão para reenviar e-mails.' USING ERRCODE = '92039';
    END IF;

    SELECT status, id_usuario INTO v_status, v_id_usuario
    FROM notificacao WHERE id_notificacao = p_id_notificacao FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'E-mail não encontrado.' USING ERRCODE = '90039';
    END IF;
    IF v_status <> 'falhou' THEN
        RAISE EXCEPTION 'Só um e-mail que falhou pode ser reenviado.' USING ERRCODE = '91054';
    END IF;
    SELECT email INTO v_email FROM usuario WHERE id_usuario = v_id_usuario AND NOT deletado;
    IF v_email IS NULL THEN
        RAISE EXCEPTION 'A conta deste e-mail foi excluída: não há para onde reenviar. Cancele o envio.'
            USING ERRCODE = '91055';
    END IF;

    UPDATE notificacao
       SET status = 'pendente', tentativas = 0, proxima_tentativa_em = NOW(), ultimo_erro = NULL,
           email_destinatario = v_email
     WHERE id_notificacao = p_id_notificacao;
END;
$$;

-- ============================================================================
-- GRUPO BV (01-11-2026) - Correções das auditorias de 01-11: log, pesquisador suspenso e limites de texto. IDEMPOTENTE.
-- ⚠️ PARE O NEST ANTES DE COLAR: a parte 4 faz ALTER TABLE em perfil_pesquisador (dá deadlock com o Nest rodando).
--
-- O que muda:
-- 1. O log não grava mais a chave Pix cifrada (como já não gravava a senha e o CPF): aparece "(protegido)". Os
--    registros antigos do log perdem esse valor também.
-- 2. O "Ver log" de Pedidos de Encerramento passa a mostrar quem aprovou, rejeitou ou cancelou cada pedido (antes
--    ficava sempre vazio: a tabela não tinha trigger de log).
-- 3. Dois limites de texto novos em Parâmetros: contestação da penalidade (e a justificativa da decisão) e
--    justificativa da rejeição da campanha. Os valores são os de antes (5.000 e 10.000), agora configuráveis. A
--    descrição dos limites de texto passa a dizer o teto de cada um ("até 20.000").
-- 4. Regra nova: pesquisador "suspenso" sempre tem a data da suspensão, e "ativo" nunca tem.
-- ============================================================================

-- 1. Chave Pix fora do log
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_perfil_atribui_papel_pesquisador ON perfil_pesquisador;
CREATE TRIGGER trg_perfil_atribui_papel_pesquisador
AFTER INSERT ON perfil_pesquisador
FOR EACH ROW EXECUTE FUNCTION public.fn_atribuir_papel_pesquisador();

-- ============================================================
-- Função:     fn_log_auditoria
-- Assinatura: (VARIADIC coluna_pk TEXT[]) -> TRIGGER
-- Bloco:      [05-L]
-- Regra:      Grava em log_auditoria quem (id_usuario_atual()), o quê (tabela + identidade do registro) e quando
--             (ocorrido_em, default NOW()) para qualquer INSERT/UPDATE/DELETE nas tabelas com a trigger abaixo. Função
--             genérica: os argumentos de fn_log_auditoria('coluna_pk_1'[, 'coluna_pk_2']) são a(s) coluna(s) de PRIMARY KEY
--             da tabela (1 para PK simples, 2 para composta, como usuario_papel/papel_permissao). SECURITY DEFINER: ninguém,
--             nem app_nestjs, tem GRANT INSERT em log_auditoria (06); a trigger grava com o privilégio de quem a CRIOU.
--             REDAÇÃO DE COLUNA SENSÍVEL: 'senha_hash' (usuario), 'cpf_criptografado', 'cpf_hash' e 'chave_pix_criptografada' (perfil_pesquisador) nunca
--             entram em dados_anteriores/dados_novos: são removidas do JSONB (operador `-`) DEPOIS de calcular
--             campos_alterados, então o NOME da coluna ainda aparece em campos_alterados (saber QUE a senha/CPF mudou é
--             auditoria válida; o valor, não). Se uma tabela nova entrar na lista de triggers e tiver outra coluna sensível
--             (ex.: token_hash), acrescente `- 'coluna'` nas duas linhas de v_antigos/v_novos. UPDATE que não muda nenhum
--             valor de verdade não gera linha (v_campos fica NULL e a função retorna cedo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_log_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_antigos_completo JSONB;
    v_novos_completo   JSONB;
    v_antigos          JSONB;
    v_novos            JSONB;
    v_campos           TEXT[];
    v_coluna           TEXT;
    v_partes           TEXT[] := ARRAY[]::TEXT[];
    v_identidade       TEXT;
BEGIN
    -- v_identidade é montada DENTRO de cada ramo (não antes, com um
    -- COALESCE(NEW, OLD) genérico) de propósito: NEW não existe em DELETE
    -- e OLD não existe em INSERT - cada ramo só referencia a variável que
    -- o Postgres garante estar preenchida naquele TG_OP.
    IF TG_OP = 'INSERT' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(NEW) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_novos := to_jsonb(NEW) - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash' - 'chave_pix_criptografada';
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_novos)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_novos);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(NEW) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_antigos_completo := to_jsonb(OLD);
        v_novos_completo   := to_jsonb(NEW);

        SELECT array_agg(chave) INTO v_campos
        FROM jsonb_object_keys(v_novos_completo) AS chave
        WHERE v_antigos_completo -> chave IS DISTINCT FROM v_novos_completo -> chave;

        IF v_campos IS NULL THEN
            RETURN NEW;
        END IF;

        -- score_atual/score_atualizado_em (perfil_pesquisador) mudam SOZINHOS toda vez que
        -- recalcular_score_pesquisador() roda (05, [05-I-4]; disparado por qualquer trigger que mexa em
        -- campanha/comentário/etc., não por ação direta sobre o PRÓPRIO perfil_pesquisador). Sem este filtro, isso
        -- viraria a maioria das linhas do log: ruído de motor automático afogando o que o log existe para mostrar
        -- (ação ADMINISTRATIVA de alguém). Se as ÚNICAS colunas que mudaram forem essas duas, não registra. Qualquer
        -- outra mudança em perfil_pesquisador (status_pesquisador, tipo_vinculo...) continua registrando, mesmo que
        -- score também tenha mudado junto.
        IF TG_TABLE_NAME = 'perfil_pesquisador' AND v_campos <@ ARRAY['score_atual', 'score_atualizado_em'] THEN
            RETURN NEW;
        END IF;

        -- registrar_login_sucesso() (03, [03-O]) roda em TODO login bem sucedido, sempre mudando
        -- ultimo_login_em/ultimo_login_ip: mesmo motivo do filtro de score_atual acima (motor automático, não ação
        -- administrativa). tentativas_login_falhas/bloqueado_ate (zerados pela mesma função) ficam FORA desta lista de
        -- propósito: se um login limpa um bloqueio anterior, ou um admin desbloqueia manualmente
        -- (usuario.service.unlock.ts), isso vale ficar no log; só o "logou normalmente" é ruído. O dado não sumiu,
        -- só saiu do log: ultimo_login_em está em UsuarioResponseDto/Consultar Usuário (ultimo_login_ip nunca é exposto
        -- pela API).
        IF TG_TABLE_NAME = 'usuario' AND v_campos <@ ARRAY['ultimo_login_em', 'ultimo_login_ip'] THEN
            RETURN NEW;
        END IF;

        v_antigos := v_antigos_completo - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash' - 'chave_pix_criptografada';
        v_novos   := v_novos_completo - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash' - 'chave_pix_criptografada';

        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, campos_alterados, dados_anteriores, dados_novos)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_campos, v_antigos, v_novos);
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(OLD) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_antigos := to_jsonb(OLD) - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash' - 'chave_pix_criptografada';
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_anteriores)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_antigos);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

UPDATE log_auditoria
   SET dados_anteriores = dados_anteriores - 'chave_pix_criptografada',
       dados_novos      = dados_novos - 'chave_pix_criptografada'
 WHERE tabela = 'perfil_pesquisador'
   AND (dados_anteriores ? 'chave_pix_criptografada' OR dados_novos ? 'chave_pix_criptografada');

-- 2. Log dos pedidos de encerramento
-- solicitacao_encerramento: o mesmo da denúncia, só a troca de situação (aprovar, rejeitar, cancelar). É o que o "Ver log"
-- da tela Pedidos de Encerramento mostra.
DROP TRIGGER IF EXISTS trg_log_auditoria_solicitacao_encerramento_status ON solicitacao_encerramento;
CREATE TRIGGER trg_log_auditoria_solicitacao_encerramento_status
AFTER UPDATE ON solicitacao_encerramento
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_log_auditoria('id_solicitacao_encerramento');

-- 3. Limites de texto
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'limite_caracteres_contestacao',            '5000', 'inteiro', 'Nº máximo de caracteres no pedido de revisão de uma penalidade e na justificativa da decisão (até 5.000)', TRUE, TRUE),
(NULL, 'limite_caracteres_justificativa_rejeicao', '10000', 'inteiro', 'Nº máximo de caracteres na justificativa da rejeição de uma campanha (até 10.000)', TRUE, TRUE)
ON CONFLICT (chave) DO NOTHING;

UPDATE configuracoes SET descricao = 'Nº máximo de caracteres na descrição da campanha (até 20.000)' WHERE chave = 'limite_caracteres_descricao_campanha';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres no texto de uma atualização de campanha (até 20.000)' WHERE chave = 'limite_caracteres_conteudo_atualizacao';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres nos detalhes adicionais de uma denúncia (até 5.000)' WHERE chave = 'limite_caracteres_relato_denuncia';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres na justificativa da decisão sobre uma denúncia (até 5.000)' WHERE chave = 'limite_caracteres_justificativa_denuncia';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres em cada justificativa do pedido de encerramento antecipado (até 10.000)' WHERE chave = 'limite_caracteres_justificativa_encerramento';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres na descrição de uma recompensa (até 10.000)' WHERE chave = 'limite_caracteres_descricao_recompensa';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres na descrição de um item de orçamento (até 20.000)' WHERE chave = 'limite_caracteres_descricao_orcamento';
UPDATE configuracoes SET descricao = 'Nº máximo de caracteres na descrição de um marco do cronograma (até 20.000)' WHERE chave = 'limite_caracteres_descricao_marco';

-- Contestação da penalidade (o pedido do pesquisador e a justificativa de quem decide) e justificativa da rejeição
-- da campanha: o mesmo molde dos limites acima.
DROP TRIGGER IF EXISTS trg_denuncia_valida_limite_contestacao ON denuncia;
CREATE TRIGGER trg_denuncia_valida_limite_contestacao
    BEFORE INSERT OR UPDATE ON denuncia
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('contestacao', 'limite_caracteres_contestacao', '5000');
DROP TRIGGER IF EXISTS trg_denuncia_valida_limite_just_contestacao ON denuncia;
CREATE TRIGGER trg_denuncia_valida_limite_just_contestacao
    BEFORE INSERT OR UPDATE ON denuncia
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('justificativa_contestacao', 'limite_caracteres_contestacao', '5000');
DROP TRIGGER IF EXISTS trg_historico_rejeicao_valida_limite_texto ON historico_rejeicao;
CREATE TRIGGER trg_historico_rejeicao_valida_limite_texto
    BEFORE INSERT OR UPDATE ON historico_rejeicao
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_limite_texto_livre('justificativa', 'limite_caracteres_justificativa_rejeicao', '10000');

-- 4. Pesquisador suspenso sempre com data
ALTER TABLE perfil_pesquisador DROP CONSTRAINT IF EXISTS "CK_PERFIL_PESQUISADOR_STATUS_SUSPENSAO";
ALTER TABLE perfil_pesquisador ADD CONSTRAINT "CK_PERFIL_PESQUISADOR_STATUS_SUSPENSAO"
    CHECK ((status_pesquisador = 'suspenso') = (suspenso_ate IS NOT NULL));

-- ============================================================================
-- GRUPO BW (01-11-2026) - "Ver log" nas telas de pagamento e em Termos de Uso, Pontuação e Aprovar Campanhas. IDEMPOTENTE.
-- ⚠️ PARE O NEST ANTES DE COLAR: cria gatilhos em contribuicao, repasse e evento_pagamento (dá deadlock com o Nest rodando).
--
-- O que muda:
-- 1. O log passa a registrar a troca de situação de contribuição e de repasse, e a baixa de um aviso do provedor
--    (Reembolsos Manuais, Repasses em Atenção e Revisões de Pagamento ganham o "Ver log"). A auditoria financeira
--    continua sendo o registro oficial do dinheiro.
-- 2. O log nunca grava o token de sessão da contribuição nem o conteúdo inteiro do aviso do provedor.
-- (Termos de Uso, Pontuação e Aprovar Campanhas usam tabelas que já tinham log: só a tela muda.)
-- ============================================================================

-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_perfil_atribui_papel_pesquisador ON perfil_pesquisador;
CREATE TRIGGER trg_perfil_atribui_papel_pesquisador
AFTER INSERT ON perfil_pesquisador
FOR EACH ROW EXECUTE FUNCTION public.fn_atribuir_papel_pesquisador();

-- ============================================================
-- Função:     fn_log_auditoria
-- Assinatura: (VARIADIC coluna_pk TEXT[]) -> TRIGGER
-- Bloco:      [05-L]
-- Regra:      Grava em log_auditoria quem (id_usuario_atual()), o quê (tabela + identidade do registro) e quando
--             (ocorrido_em, default NOW()) para qualquer INSERT/UPDATE/DELETE nas tabelas com a trigger abaixo. Função
--             genérica: os argumentos de fn_log_auditoria('coluna_pk_1'[, 'coluna_pk_2']) são a(s) coluna(s) de PRIMARY KEY
--             da tabela (1 para PK simples, 2 para composta, como usuario_papel/papel_permissao). SECURITY DEFINER: ninguém,
--             nem app_nestjs, tem GRANT INSERT em log_auditoria (06); a trigger grava com o privilégio de quem a CRIOU.
--             REDAÇÃO DE COLUNA SENSÍVEL: 'senha_hash' (usuario), 'cpf_criptografado', 'cpf_hash' e 'chave_pix_criptografada'
--             (perfil_pesquisador), 'token_sessao' (contribuicao) e 'payload' (evento_pagamento, grande) nunca
--             entram em dados_anteriores/dados_novos: são removidas do JSONB (operador `-`) DEPOIS de calcular
--             campos_alterados, então o NOME da coluna ainda aparece em campos_alterados (saber QUE a senha/CPF mudou é
--             auditoria válida; o valor, não). Se uma tabela nova entrar na lista de triggers e tiver outra coluna sensível
--             (ex.: token_hash), acrescente `- 'coluna'` nas duas linhas de v_antigos/v_novos. UPDATE que não muda nenhum
--             valor de verdade não gera linha (v_campos fica NULL e a função retorna cedo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_log_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_antigos_completo JSONB;
    v_novos_completo   JSONB;
    v_antigos          JSONB;
    v_novos            JSONB;
    v_campos           TEXT[];
    v_coluna           TEXT;
    v_partes           TEXT[] := ARRAY[]::TEXT[];
    v_identidade       TEXT;
BEGIN
    -- v_identidade é montada DENTRO de cada ramo (não antes, com um
    -- COALESCE(NEW, OLD) genérico) de propósito: NEW não existe em DELETE
    -- e OLD não existe em INSERT - cada ramo só referencia a variável que
    -- o Postgres garante estar preenchida naquele TG_OP.
    IF TG_OP = 'INSERT' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(NEW) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_novos := to_jsonb(NEW) - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash' - 'chave_pix_criptografada' - 'token_sessao' - 'payload';
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_novos)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_novos);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(NEW) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_antigos_completo := to_jsonb(OLD);
        v_novos_completo   := to_jsonb(NEW);

        SELECT array_agg(chave) INTO v_campos
        FROM jsonb_object_keys(v_novos_completo) AS chave
        WHERE v_antigos_completo -> chave IS DISTINCT FROM v_novos_completo -> chave;

        IF v_campos IS NULL THEN
            RETURN NEW;
        END IF;

        -- score_atual/score_atualizado_em (perfil_pesquisador) mudam SOZINHOS toda vez que
        -- recalcular_score_pesquisador() roda (05, [05-I-4]; disparado por qualquer trigger que mexa em
        -- campanha/comentário/etc., não por ação direta sobre o PRÓPRIO perfil_pesquisador). Sem este filtro, isso
        -- viraria a maioria das linhas do log: ruído de motor automático afogando o que o log existe para mostrar
        -- (ação ADMINISTRATIVA de alguém). Se as ÚNICAS colunas que mudaram forem essas duas, não registra. Qualquer
        -- outra mudança em perfil_pesquisador (status_pesquisador, tipo_vinculo...) continua registrando, mesmo que
        -- score também tenha mudado junto.
        IF TG_TABLE_NAME = 'perfil_pesquisador' AND v_campos <@ ARRAY['score_atual', 'score_atualizado_em'] THEN
            RETURN NEW;
        END IF;

        -- registrar_login_sucesso() (03, [03-O]) roda em TODO login bem sucedido, sempre mudando
        -- ultimo_login_em/ultimo_login_ip: mesmo motivo do filtro de score_atual acima (motor automático, não ação
        -- administrativa). tentativas_login_falhas/bloqueado_ate (zerados pela mesma função) ficam FORA desta lista de
        -- propósito: se um login limpa um bloqueio anterior, ou um admin desbloqueia manualmente
        -- (usuario.service.unlock.ts), isso vale ficar no log; só o "logou normalmente" é ruído. O dado não sumiu,
        -- só saiu do log: ultimo_login_em está em UsuarioResponseDto/Consultar Usuário (ultimo_login_ip nunca é exposto
        -- pela API).
        IF TG_TABLE_NAME = 'usuario' AND v_campos <@ ARRAY['ultimo_login_em', 'ultimo_login_ip'] THEN
            RETURN NEW;
        END IF;

        v_antigos := v_antigos_completo - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash' - 'chave_pix_criptografada' - 'token_sessao' - 'payload';
        v_novos   := v_novos_completo - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash' - 'chave_pix_criptografada' - 'token_sessao' - 'payload';

        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, campos_alterados, dados_anteriores, dados_novos)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_campos, v_antigos, v_novos);
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        FOREACH v_coluna IN ARRAY TG_ARGV LOOP
            v_partes := v_partes || (to_jsonb(OLD) ->> v_coluna);
        END LOOP;
        v_identidade := array_to_string(v_partes, ',');

        v_antigos := to_jsonb(OLD) - 'senha_hash' - 'cpf_criptografado' - 'cpf_hash' - 'chave_pix_criptografada' - 'token_sessao' - 'payload';
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_anteriores)
        VALUES (TG_TABLE_NAME, v_identidade, TG_OP, public.id_usuario_atual(), v_antigos);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- Telas de pagamento (Reembolsos Manuais, Repasses em Atenção, Revisões de Pagamento): só a troca de situação, como a
-- campanha. Sem isso, a conferência automática (de hora em hora) gravaria uma linha a cada passada.
DROP TRIGGER IF EXISTS trg_log_auditoria_contribuicao_status ON contribuicao;
CREATE TRIGGER trg_log_auditoria_contribuicao_status
AFTER UPDATE ON contribuicao
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_log_auditoria('id_contribuicao');

DROP TRIGGER IF EXISTS trg_log_auditoria_repasse_status ON repasse;
CREATE TRIGGER trg_log_auditoria_repasse_status
AFTER UPDATE ON repasse
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_log_auditoria('id_repasse');

-- evento_pagamento não tem situação: o que uma pessoa faz é dar a baixa (resolvido_em).
DROP TRIGGER IF EXISTS trg_log_auditoria_evento_pagamento_baixa ON evento_pagamento;
CREATE TRIGGER trg_log_auditoria_evento_pagamento_baixa
AFTER UPDATE ON evento_pagamento
FOR EACH ROW
WHEN (OLD.resolvido_em IS DISTINCT FROM NEW.resolvido_em)
EXECUTE FUNCTION public.fn_log_auditoria('id_evento_pagamento');

-- ============================================================================
-- GRUPO BX (02-11-2026) - Requisitos de 02-11: avisos novos e a trava da contestação decidida. IDEMPOTENTE.
-- Não precisa parar o Nest (só funções, gatilhos e dados; nenhuma regra de acesso nem ALTER TABLE).
--
-- O que muda:
-- 1. Decidida a contestação do pesquisador, a situação da denúncia não muda mais (o Julgar fica só de leitura).
-- 2. Avisos novos (e-mail e sino), cada um com o texto editável em Mensagens:
--    - ao pesquisador, quando uma denúncia contra ele é julgada procedente (motivo, justificativa e como contestar);
--    - ao pesquisador, quando uma campanha dele é encerrada pela moderação;
--    - a quem apoiou, quando a campanha termina antes do prazo por pedido aprovado (dizendo se o valor vai para o
--      pesquisador ou volta);
--    - lembrete a quem segue uma campanha perto do fim e ainda não contribuiu (uma vez só).
-- 3. O e-mail de suspensão passa a listar as campanhas encerradas e as rejeitadas. Se o texto desse e-mail já foi
--    mudado pela tela Mensagens, ele fica como está.
-- 4. Parâmetro novo em Parâmetros > Campanha: lembrete_fim_campanha_horas (48; 0 desliga o lembrete).
-- ============================================================================

-- 1. Trava da contestação decidida
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_contestacao_pendente
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Contestada a denúncia, a situação dela só muda pela decisão da contestação (RF-115):
--               esperando análise: só decidir_contestacao (03) muda, fechando as duas juntas; senão a contestação
--               ficaria aberta sobre uma denúncia já mudada (91048);
--               decidida (aceita ou recusada): não muda mais (91056). Sem isso, quem julgou procedente e perdeu na
--               contestação podia reabrir e voltar a procedente, e o pesquisador não pode contestar de novo (91045).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_contestacao_pendente()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.contestacao_status = 'pendente' AND NEW.contestacao_status = 'pendente'
       AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Esta denúncia tem uma contestação esperando análise: decida a contestação primeiro.'
            USING ERRCODE = '91048';
    END IF;
    IF OLD.contestacao_status IN ('aceita', 'recusada') AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'A contestação desta denúncia já foi decidida: a situação dela não muda mais.'
            USING ERRCODE = '91056';
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Avisos da campanha: o dono no encerramento por moderação; quem apoiou no encerramento antecipado aprovado
-- ----------------------------------------------------------------------------
-- Função:     fn_notifica_situacao_campanha (trigger)
-- Bloco:      [05-Q]
-- Regra:      E-mails de quando a campanha muda de situação:
--               aguardando_aprovacao -> ativo: o dono (RF-109) e quem segue o pesquisador (RF-029, campanha nova);
--               tudo-ou-nada -> sucesso: quem apoiou (RF-084 c);
--               tudo-ou-nada -> nao_atingido: quem apoiou, avisando que a devolução começou (RF-084 a);
--               -> encerrado_moderacao: quem apoiou, em qualquer modelo (RF-119; a moderação devolve tudo), e o dono
--                  (RF-120), também quando foi a suspensão dele que encerrou (RF-125);
--               -> encerrado por pedido aprovado pelo admin: quem apoiou, dizendo se o valor vai para o pesquisador ou
--                  volta (RF-084 d); o destino é o de destino_dinheiro_campanha. O pedido vira 'aprovado' antes da
--                  campanha mudar (decidir_solicitacao_encerramento, 03), então já está gravado aqui. O encerramento
--                  direto do pesquisador não avisa ninguém: só existe sem dinheiro em jogo.
--             A rejeição tem gatilho próprio em historico_rejeicao, porque a justificativa só existe lá.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notifica_situacao_campanha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status = 'aguardando_aprovacao' AND NEW.status = 'ativo' THEN
        PERFORM public.enfileirar_notificacao(NEW.id_usuario, 'campanha_aprovada',
            jsonb_build_object('id_campanha', NEW.id_campanha, 'titulo', NEW.titulo));
        PERFORM public.enfileirar_notificacao_seguidores(NEW.id_campanha, 'nova_campanha_pesquisador');
    ELSIF NEW.status = 'sucesso' AND NEW.modelo = 'all-or-nothing' THEN
        PERFORM public.enfileirar_notificacao_doadores(NEW.id_campanha, 'campanha_sucesso');
    ELSIF NEW.status = 'nao_atingido' AND NEW.modelo = 'all-or-nothing' THEN
        PERFORM public.enfileirar_notificacao_doadores(NEW.id_campanha, 'campanha_nao_atingida');
    ELSIF NEW.status = 'encerrado_moderacao' THEN
        PERFORM public.enfileirar_notificacao_doadores(NEW.id_campanha, 'campanha_encerrada_moderacao');
        PERFORM public.enfileirar_notificacao(NEW.id_usuario, 'moderacao_encerrou_campanha',
            jsonb_build_object('id_campanha', NEW.id_campanha, 'titulo', NEW.titulo));
    ELSIF NEW.status = 'encerrado' AND EXISTS (
        SELECT 1 FROM solicitacao_encerramento
        WHERE id_campanha = NEW.id_campanha AND status = 'aprovado' AND id_admin IS NOT NULL
    ) THEN
        PERFORM public.enfileirar_notificacao_doadores(NEW.id_campanha, 'campanha_encerrada_antes',
            jsonb_build_object('vai_para_pesquisador', public.destino_dinheiro_campanha(NEW.id_campanha) = 'repasse'));
    END IF;
    RETURN NULL;
END;
$$;

-- 3. Aviso da suspensão com as campanhas
-- ----------------------------------------------------------------------------
-- Função:     fn_notifica_situacao_pesquisador (trigger)
-- Bloco:      [05-Q]
-- Regra:      O pesquisador é avisado da suspensão, com o motivo e até quando (RF-122), e da reativação (RF-124), venha
--             ela do admin ou do fim do prazo (reativar_pesquisadores_vencidos).
--             O aviso da suspensão lista as campanhas que a cascata encerra (as ativas) e rejeita (as aguardando
--             aprovação), RF-125. suspender_pesquisador (03), o único caminho para 'suspenso', muda o perfil antes das
--             campanhas, então aqui elas ainda estão na situação de antes: a lista é exatamente o que a cascata vai fazer.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notifica_situacao_pesquisador()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status_pesquisador = 'suspenso' THEN
        PERFORM public.enfileirar_notificacao(NEW.id_usuario, 'pesquisador_suspenso',
            jsonb_build_object(
                'motivo', NEW.motivo_suspensao,
                'suspenso_ate', NEW.suspenso_ate,
                'campanhas_encerradas', (SELECT string_agg('"' || titulo || '"', ', ' ORDER BY id_campanha)
                                         FROM campanha WHERE id_usuario = NEW.id_usuario AND status = 'ativo'),
                'campanhas_rejeitadas', (SELECT string_agg('"' || titulo || '"', ', ' ORDER BY id_campanha)
                                         FROM campanha WHERE id_usuario = NEW.id_usuario AND status = 'aguardando_aprovacao')));
    ELSE
        PERFORM public.enfileirar_notificacao(NEW.id_usuario, 'pesquisador_reativado');
    END IF;
    RETURN NULL;
END;
$$;

-- 4. Aviso da denúncia procedente
-- ----------------------------------------------------------------------------
-- Função:     fn_notifica_denuncia_procedente (trigger)
-- Bloco:      [05-Q]
-- Regra:      Denúncia julgada procedente (RF-120): o pesquisador denunciado (o perfil, ou o dono da campanha) recebe o
--             motivo, a justificativa da moderação e o caminho para contestar (RF-034), sem saber quem denunciou.
--             Vale também quando a moderação revê a decisão e volta a procedente.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notifica_denuncia_procedente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pesquisador INT;
    v_titulo      VARCHAR(255);
BEGIN
    SELECT id_usuario, titulo INTO v_pesquisador, v_titulo FROM campanha WHERE id_campanha = NEW.id_campanha_alvo;
    PERFORM public.enfileirar_notificacao(COALESCE(NEW.id_pesquisador_alvo, v_pesquisador), 'denuncia_procedente',
        jsonb_build_object(
            'id_denuncia', NEW.id_denuncia,
            'id_campanha', NEW.id_campanha_alvo,
            'titulo', v_titulo,
            'motivo', (SELECT descricao FROM motivo_denuncia WHERE id_motivo = NEW.id_motivo),
            'justificativa', NEW.justificativa_moderacao));
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifica_denuncia_procedente ON denuncia;
CREATE TRIGGER trg_notifica_denuncia_procedente
AFTER UPDATE OF status ON denuncia
FOR EACH ROW
WHEN (NEW.status = 'resolvida' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_notifica_denuncia_procedente();

-- 5. Lembrete de fim de campanha (a tarefa de encerrar campanhas chama a cada 15 minutos)
-- ----------------------------------------------------------------------------
-- Função:     enviar_lembretes_fim_campanha
-- Assinatura: () -> INT
-- Bloco:      [05-Q]
-- Regra:      Lembrete de fim de campanha (RF-055): quem segue uma campanha ativa e ainda não contribuiu recebe um
--             aviso quando falta lembrete_fim_campanha_horas (padrão 48) para o fim; 0 desliga. Uma vez só por pessoa
--             e campanha: o próprio aviso já enviado é a marca (notificacao com o mesmo tipo e id_campanha). Contribuiu
--             = tem contribuição a caminho ou paga (pendente, confirmado, repassado). Nunca o dono da campanha.
--             Devolve quantas pessoas foram avisadas. SECURITY DEFINER, sem autorização: quem chama é a tarefa de
--             encerrar campanhas (CampanhaServiceCloseExpired, a cada 15 minutos), sem sessão de usuário.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enviar_lembretes_fim_campanha()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_horas INT := public.config_numero('lembrete_fim_campanha_horas', 48);
    v       RECORD;
    v_total INT := 0;
BEGIN
    IF v_horas <= 0 THEN
        RETURN 0;
    END IF;

    FOR v IN
        SELECT c.id_campanha, c.titulo, c.data_fim, sc.id_usuario
        FROM campanha c
        JOIN seguir_campanha sc ON sc.id_campanha = c.id_campanha
        WHERE c.status = 'ativo'
          AND c.data_fim > NOW()
          AND c.data_fim <= NOW() + v_horas * INTERVAL '1 hour'
          AND sc.id_usuario <> c.id_usuario
          AND NOT EXISTS (
              SELECT 1 FROM contribuicao ct
              WHERE ct.id_campanha = c.id_campanha AND ct.id_usuario = sc.id_usuario
                AND ct.status IN ('pendente', 'confirmado', 'repassado'))
          AND NOT EXISTS (
              SELECT 1 FROM notificacao n
              WHERE n.id_usuario = sc.id_usuario AND n.tipo_evento = 'lembrete_fim_campanha'
                AND n.dados->>'id_campanha' = c.id_campanha::text)
        ORDER BY c.id_campanha, sc.id_usuario
    LOOP
        IF public.enfileirar_notificacao(v.id_usuario, 'lembrete_fim_campanha',
            jsonb_build_object('id_campanha', v.id_campanha, 'titulo', v.titulo, 'data_fim', v.data_fim)) IS NOT NULL THEN
            v_total := v_total + 1;
        END IF;
    END LOOP;
    RETURN v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enviar_lembretes_fim_campanha() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_lembretes_fim_campanha() TO app_nestjs;

INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'lembrete_fim_campanha_horas', '48',  'inteiro',  'Horas antes do fim da campanha em que quem a segue e ainda não contribuiu recebe um lembrete, uma vez só (0 desliga)', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

UPDATE configuracoes SET descricao = 'Tarefa automática: vencer os Pix pendentes, encerrar as campanhas cujo prazo passou e lembrar quem segue uma campanha perto do fim. Desligada, a execução agendada fica em pausa'
WHERE chave = 'tarefa_encerrar_campanhas_ligada' AND descricao = 'Tarefa automática: vencer os Pix pendentes e encerrar as campanhas cujo prazo passou. Desligada, a execução agendada fica em pausa';

-- 6. Os textos dos avisos novos e o novo texto do e-mail de suspensão (só se ainda for o original)
INSERT INTO modelo_mensagem (tipo_evento, canal, titulo, corpo, ativo, obrigatoria) VALUES
('denuncia_procedente', 'email', 'Uma denúncia contra você foi julgada procedente',
 E'{{#titulo}}Uma denúncia contra a sua campanha "{{titulo}}"{{/titulo}}{{^titulo}}Uma denúncia contra o seu perfil de pesquisador{{/titulo}} foi analisada pela moderação e julgada procedente. Ela passa a contar na sua pontuação de reputação.\n\n{{#motivo}}Motivo da denúncia: {{motivo}}{{/motivo}}\n\n{{#justificativa}}Justificativa da decisão: {{justificativa}}{{/justificativa}}\n\nSe achar a decisão injusta, você pode contestá-la uma vez, em Minha Conta, aba Acadêmico, explicando o porquê.', TRUE, FALSE),
('moderacao_encerrou_campanha', 'email', 'Sua campanha foi encerrada pela moderação',
 E'"{{titulo}}" foi encerrada pela moderação da plataforma e saiu da página pública.\n\nTodo o valor arrecadado vai ser devolvido a quem apoiou. O motivo vem em outro aviso: a denúncia julgada procedente ou a suspensão do seu perfil.', TRUE, FALSE),
('campanha_encerrada_antes', 'email', 'A campanha que você apoiou terminou antes do prazo',
 E'"{{titulo}}" foi encerrada antes do prazo, a pedido do pesquisador, com a aprovação da plataforma.\n\n{{#vai_para_pesquisador}}O valor arrecadado, com a sua contribuição, vai para o pesquisador depois do prazo de segurança da plataforma.{{/vai_para_pesquisador}}{{^vai_para_pesquisador}}Como a campanha é do modelo tudo ou nada e não bateu a meta, a sua contribuição vai ser devolvida. Você recebe outro e-mail quando a devolução for concluída.{{/vai_para_pesquisador}}', TRUE, FALSE),
('lembrete_fim_campanha', 'email', 'Uma campanha que você segue está perto do fim',
 E'"{{titulo}}", uma campanha que você segue, termina em {{data_fim}}.\n\nSe quiser apoiar a pesquisa, ainda dá tempo.', TRUE, FALSE),
('denuncia_procedente', 'interna', 'Denúncia procedente',
 E'{{#titulo}}Uma denúncia contra "{{titulo}}"{{/titulo}}{{^titulo}}Uma denúncia contra o seu perfil{{/titulo}} foi julgada procedente. Você pode contestá-la em Minha Conta.', TRUE, FALSE),
('moderacao_encerrou_campanha', 'interna', 'Campanha encerrada pela moderação',
 E'"{{titulo}}" foi encerrada pela moderação. O valor arrecadado vai ser devolvido.', TRUE, FALSE),
('campanha_encerrada_antes', 'interna', 'Campanha encerrada antes do prazo',
 E'"{{titulo}}" terminou antes do prazo.{{#vai_para_pesquisador}} O valor vai para o pesquisador.{{/vai_para_pesquisador}}{{^vai_para_pesquisador}} A sua contribuição vai ser devolvida.{{/vai_para_pesquisador}}', TRUE, FALSE),
('lembrete_fim_campanha', 'interna', 'Campanha perto do fim',
 E'"{{titulo}}" termina em {{data_fim}}. Ainda dá tempo de apoiar.', TRUE, FALSE)
ON CONFLICT (tipo_evento, canal) DO NOTHING;

UPDATE modelo_mensagem SET corpo = E'O seu perfil de pesquisador foi suspenso pela moderação{{#suspenso_ate}} até {{suspenso_ate}}{{/suspenso_ate}}.\n\n{{#motivo}}Motivo: {{motivo}}{{/motivo}}\n\n{{#campanhas_encerradas}}Campanhas ativas encerradas pela suspensão, com o valor devolvido a quem apoiou: {{campanhas_encerradas}}.{{/campanhas_encerradas}}\n\n{{#campanhas_rejeitadas}}Campanhas que esperavam aprovação e foram rejeitadas: {{campanhas_rejeitadas}}.{{/campanhas_rejeitadas}}\n\nEnquanto durar a suspensão, você não envia campanhas nem publica atualizações.'
WHERE tipo_evento = 'pesquisador_suspenso' AND canal = 'email' AND corpo = E'O seu perfil de pesquisador foi suspenso pela moderação{{#suspenso_ate}} até {{suspenso_ate}}{{/suspenso_ate}}.\n\n{{#motivo}}Motivo: {{motivo}}{{/motivo}}\n\nEnquanto durar a suspensão, você não envia campanhas nem publica atualizações.';

-- ============================================================================
-- GRUPO BY (03-11-2026) - Atualizações de campanha: quem ocultou. IDEMPOTENTE (pode colar de novo).
-- PARE O NEST ANTES DE COLAR (tem ALTER TABLE) e suba de novo depois.
--
-- O que muda:
-- 1. Coluna nova ocultada_moderacao: diz se a atualização foi ocultada pela moderação ou pelo próprio dono.
-- 2. O dono continua ocultando e mostrando de novo as suas; o que a moderação ocultou, só a moderação mostra de novo.
-- 3. Demonstração: o link da atualização de código aberto, uma atualização ocultada pela moderação e outra pelo dono
--    (só entram se ainda não existirem e se as campanhas 1, 3 e 5 estiverem publicadas).
-- ============================================================================

-- 1. Coluna
ALTER TABLE atualizacao_campanha ADD COLUMN IF NOT EXISTS ocultada_moderacao BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Regra
CREATE OR REPLACE FUNCTION fn_atualizacao_ocultacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.ocultada_moderacao := OLD.ocultada_moderacao;

    IF OLD.ativo = TRUE AND NEW.ativo = FALSE THEN
        NEW.ocultada_moderacao := NOT EXISTS (
            SELECT 1 FROM campanha WHERE id_campanha = NEW.id_campanha AND id_usuario = public.id_usuario_atual()
        );
    ELSIF OLD.ativo = FALSE AND NEW.ativo = TRUE THEN
        IF OLD.ocultada_moderacao AND NOT public.tem_permissao('atualizacao_moderar') THEN
            RAISE EXCEPTION 'Esta atualização foi ocultada pela moderação: só a moderação pode mostrá-la de novo.'
                USING ERRCODE = '92040';
        END IF;
        NEW.ocultada_moderacao := FALSE;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizacao_ocultacao ON atualizacao_campanha;
CREATE TRIGGER trg_atualizacao_ocultacao
BEFORE UPDATE ON atualizacao_campanha
FOR EACH ROW
EXECUTE FUNCTION fn_atualizacao_ocultacao();

-- 3. Demonstração
INSERT INTO link_atualizacao (id_atualizacao, id_tipolink, ordem, url)
SELECT a.id_atualizacao, t.id_tipolink, 1, 'https://github.com/crowdacademico'
FROM atualizacao_campanha a, tipo_link t
WHERE a.titulo = 'Artigo submetido com o código aberto' AND t.codigo = 'GITHUB' AND t.permite_atualizacao
  AND NOT EXISTS (SELECT 1 FROM link_atualizacao l WHERE l.id_atualizacao = a.id_atualizacao);

INSERT INTO atualizacao_campanha (id_campanha, titulo, conteudo, publicado_em, fase, tipo)
SELECT v.n, v.titulo, v.conteudo, NOW() + v.dias * INTERVAL '1 day', 'andamento', v.tipo::tipo_atualizacao
FROM (VALUES
    (3, 'Fotos de pacientes sem autorização', 'Seguem algumas fotos dos exames feitos ontem na unidade de saúde.', -8, 'imagem'),
    (5, 'Agenda de visitas (versão antiga)', 'Esta agenda foi substituída pela publicação seguinte.', -45, 'texto')
) AS v(n, titulo, conteudo, dias, tipo)
JOIN campanha c ON c.id_campanha = v.n AND c.status IN ('ativo', 'sucesso', 'nao_atingido')
WHERE NOT EXISTS (SELECT 1 FROM atualizacao_campanha a WHERE a.titulo = v.titulo);

DO $$
BEGIN
    PERFORM set_config('app.id_usuario_atual', '3', TRUE);
    UPDATE atualizacao_campanha SET ativo = FALSE WHERE titulo = 'Fotos de pacientes sem autorização' AND ativo;
    PERFORM set_config('app.id_usuario_atual', COALESCE((SELECT id_usuario FROM campanha WHERE id_campanha = 5)::TEXT, ''), TRUE);
    UPDATE atualizacao_campanha SET ativo = FALSE WHERE titulo = 'Agenda de visitas (versão antiga)' AND ativo;
    PERFORM set_config('app.id_usuario_atual', '', TRUE);
END;
$$;

-- ============================================================================
-- GRUPO BZ (03-11-2026) - Atualizações: a moderação exclui (mantendo o registro ou de vez). IDEMPOTENTE.
-- COLE DEPOIS DO GRUPO BY. PARE O NEST ANTES DE COLAR (tem regra de acesso nova) e suba de novo depois.
--
-- O que muda:
-- 1. A moderação pode apagar de vez uma atualização (os anexos vão junto). O dono não apaga.
-- 2. A mensagem para o dono que tenta pôr de volta uma atualização excluída pela moderação.
-- ============================================================================

-- 1. Apagar de vez
GRANT DELETE ON atualizacao_campanha TO app_nestjs;
DROP POLICY IF EXISTS pol_atualizacao_delete ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_delete ON atualizacao_campanha FOR DELETE TO app_nestjs USING (
    (SELECT public.tem_permissao('atualizacao_moderar'))
);

-- 2. Mensagem
CREATE OR REPLACE FUNCTION fn_atualizacao_ocultacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.ocultada_moderacao := OLD.ocultada_moderacao;

    IF OLD.ativo = TRUE AND NEW.ativo = FALSE THEN
        NEW.ocultada_moderacao := NOT EXISTS (
            SELECT 1 FROM campanha WHERE id_campanha = NEW.id_campanha AND id_usuario = public.id_usuario_atual()
        );
    ELSIF OLD.ativo = FALSE AND NEW.ativo = TRUE THEN
        IF OLD.ocultada_moderacao AND NOT public.tem_permissao('atualizacao_moderar') THEN
            RAISE EXCEPTION 'Esta atualização foi excluída pela moderação e não pode voltar a aparecer.'
                USING ERRCODE = '92040';
        END IF;
        NEW.ocultada_moderacao := FALSE;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- GRUPO CA (04-11-2026) - Link obrigatório nas recompensas e o pesquisador exclui as próprias atualizações. IDEMPOTENTE.
-- PARE O NEST ANTES DE COLAR (tem regra de acesso nova) e suba de novo depois.
--
-- O que muda:
-- 1. Recompensa ativa de acesso antecipado ou entrega digital precisa do link especial (é por ele que chega a quem
--    apoiou). As da demonstração ganham o link antes da regra entrar.
-- 2. O pesquisador pode apagar de vez as próprias atualizações, menos a que a moderação excluiu.
-- ============================================================================

-- 1. Links da demonstração e a regra
INSERT INTO link_recompensa (id_recompensa, id_tipolink, ordem, url)
SELECT r.id_recompensa, t.id_tipolink, 0, v.url
FROM recompensa r
JOIN (VALUES
    ('Acesso aos dados da pesquisa', 'https://github.com/crowdacademico-dados'),
    ('Testar o aplicativo antes do lançamento', 'https://github.com/leitura-acessivel-beta'),
    ('Ler os resultados antes da publicação', 'https://github.com/retinopatia-resultados')
) AS v(titulo, url) ON v.titulo = r.titulo
JOIN tipo_link t ON t.codigo = 'GITHUB' AND t.permite_recompensa
WHERE NOT EXISTS (SELECT 1 FROM link_recompensa l WHERE l.id_recompensa = r.id_recompensa);
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_link_recompensa
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Regra:      RF-103: acesso antecipado e entrega digital chegam a quem apoiou pelo link especial, então a recompensa
--             ativa desses dois tipos precisa ter pelo menos um link (91057). Reconhecimento não tem o que entregar.
--             CONSTRAINT TRIGGER DEFERRABLE: a recompensa e o link são gravados em comandos separados da mesma
--             transação, e a conferência é do estado FINAL, no COMMIT. Vale ao criar ou mudar a recompensa e ao tirar
--             ou trocar o link.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_valida_link_recompensa()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_id INT := CASE WHEN TG_OP = 'DELETE' THEN OLD.id_recompensa ELSE NEW.id_recompensa END;
BEGIN
    IF EXISTS (
        SELECT 1 FROM recompensa r
        WHERE r.id_recompensa = v_id
          AND r.ativo
          AND r.tipo IN ('acesso_antecipado', 'digital')
          AND NOT EXISTS (SELECT 1 FROM link_recompensa l WHERE l.id_recompensa = r.id_recompensa)
    ) THEN
        RAISE EXCEPTION 'Acesso antecipado e entrega digital precisam do link especial: é por ele que a recompensa chega a quem apoiou.'
            USING ERRCODE = '91057';
    END IF;
    RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- Triggers:  trg_recompensa_exige_link, trg_link_recompensa_exige_link
-- Tabelas:   recompensa (criar ou mudar), link_recompensa (tirar ou trocar)
-- Momento:   AFTER, DEFERRABLE INITIALLY DEFERRED
-- Função:    fn_valida_link_recompensa()
-- Bloco:     [05-K-1]
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_recompensa_exige_link ON recompensa;
CREATE CONSTRAINT TRIGGER trg_recompensa_exige_link
    AFTER INSERT OR UPDATE ON recompensa
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_link_recompensa();

DROP TRIGGER IF EXISTS trg_link_recompensa_exige_link ON link_recompensa;
CREATE CONSTRAINT TRIGGER trg_link_recompensa_exige_link
    AFTER UPDATE OR DELETE ON link_recompensa
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_link_recompensa();

-- 2. O pesquisador apaga as próprias atualizações
DROP POLICY IF EXISTS pol_atualizacao_delete ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_delete ON atualizacao_campanha FOR DELETE TO app_nestjs USING (
    (SELECT public.tem_permissao('atualizacao_moderar'))
    OR (
        NOT ocultada_moderacao
        AND EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    )
);

-- ============================================================================
-- GRUPO CB (04-11-2026) - Só a moderação apaga uma atualização de vez. IDEMPOTENTE.
-- PARE O NEST ANTES DE COLAR (muda regra de acesso) e suba de novo depois.
--
-- O que muda: desfaz a parte 2 do Grupo CA. O pesquisador sempre exclui mantendo o registro: o que ele publicou (um
-- vírus, um conteúdo malicioso) fica guardado como prova. Só a moderação escolhe apagar de vez.
-- ============================================================================
DROP POLICY IF EXISTS pol_atualizacao_delete ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_delete ON atualizacao_campanha FOR DELETE TO app_nestjs USING (
    (SELECT public.tem_permissao('atualizacao_moderar'))
);

-- ============================================================================
-- GRUPO CC (04-11-2026) - Recompensa automática: quem contribui ganha todas as que o valor alcança. IDEMPOTENTE.
-- Não precisa parar o Nest (só função, gatilho e dados; nenhuma regra de acesso nem ALTER TABLE).
--
-- O que muda:
-- 1. Ninguém escolhe recompensa: ao contribuir (com conta), a pessoa ganha todas as recompensas ativas da campanha
--    cujo valor mínimo a contribuição alcança (com R$ 151, as de R$ 50, R$ 100 e R$ 150).
-- 2. As contribuições que já existem ganham as recompensas que faltavam pela mesma regra.
-- ============================================================================

-- 1. A regra
-- ----------------------------------------------------------------------------
-- Função:     fn_concede_recompensas
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Regra:      RF-104 e RF-105: quem contribui ganha, sem escolher, todas as recompensas ativas da campanha cujo valor
--             mínimo a contribuição alcança (com R$ 151, as de R$ 50, R$ 100 e R$ 150). Só quem tem conta: a recompensa é
--             para alguém. O valor que conta é o da contribuição, sem a tarifa. Recompensa criada depois não vale para
--             contribuição antiga. Aparece como ganha quando a contribuição é paga.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_concede_recompensas()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id_usuario IS NOT NULL THEN
        INSERT INTO contribuicao_recompensa (id_contribuicao, id_recompensa)
        SELECT NEW.id_contribuicao, r.id_recompensa
        FROM recompensa r
        WHERE r.id_campanha = NEW.id_campanha AND r.ativo AND r.valor_minimo <= NEW.valor;
    END IF;
    RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_contribuicao_concede_recompensas
-- Tabela:    contribuicao
-- Momento:   AFTER INSERT
-- Função:    fn_concede_recompensas()
-- Bloco:     [05-K-1]
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_contribuicao_concede_recompensas ON contribuicao;
CREATE TRIGGER trg_contribuicao_concede_recompensas
    AFTER INSERT ON contribuicao
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_concede_recompensas();

-- 2. As que já existem
INSERT INTO contribuicao_recompensa (id_contribuicao, id_recompensa, adquirida_em)
SELECT c.id_contribuicao, r.id_recompensa, c.criado_em
FROM contribuicao c
JOIN recompensa r ON r.id_campanha = c.id_campanha AND r.ativo AND r.valor_minimo <= c.valor
WHERE c.id_usuario IS NOT NULL
ON CONFLICT (id_contribuicao, id_recompensa) DO NOTHING;

-- ============================================================================
-- GRUPO CD (07-11-2026) - Parâmetro do tipo "dinheiro", parte 1 de 2. IDEMPOTENTE.
-- COLE SOZINHO e rode; depois cole o Grupo CE numa colagem separada (o Postgres não deixa usar um valor novo de
-- tipo na mesma colagem em que ele foi criado). Não precisa parar o Nest.
--
-- O que muda: os parâmetros em reais ganham um tipo próprio, para o painel mostrar o campo de R$ (R$ 123,45).
-- ============================================================================
ALTER TYPE tipo_configuracao ADD VALUE IF NOT EXISTS 'dinheiro';

-- ============================================================================
-- GRUPO CE (07-11-2026) - Parâmetro do tipo "dinheiro", parte 2 de 2. IDEMPOTENTE.
-- COLE DEPOIS DO GRUPO CD, numa colagem separada. Não precisa parar o Nest (nenhuma regra de acesso).
--
-- O que muda:
-- 1. O formato aceito para "dinheiro": número com até 2 casas (ex.: 5.00).
-- 2. A conferência de mínimo e máximo passa a ler também os parâmetros em reais.
-- 3. Os 8 parâmetros em R$ mudam de "decimal" para "dinheiro" (as porcentagens continuam "decimal").
-- ============================================================================

-- 1. Formato (as conferências deixadas para o fim rodam antes: com alguma pendente, a tabela não pode mudar)
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE configuracoes DROP CONSTRAINT IF EXISTS "CK_CONFIGURACOES_VALOR_TIPO";
ALTER TABLE configuracoes ADD CONSTRAINT "CK_CONFIGURACOES_VALOR_TIPO" CHECK (
       valor IS NULL
    OR tipo = 'texto'
    OR (tipo = 'inteiro'  AND valor ~ '^[0-9]+$')
    OR (tipo = 'decimal'  AND valor ~ '^[0-9]+(\.[0-9]+)?$')
    OR (tipo = 'dinheiro' AND valor ~ '^[0-9]+(\.[0-9]{1,2})?$')
    OR (tipo = 'booleano' AND valor IN ('true', 'false')));

-- 2. Mínimo e máximo
CREATE OR REPLACE FUNCTION public.fn_valida_pares_min_max_configuracoes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_pares TEXT[][] := ARRAY[
        ['prazo_minimo_campanha_dias',    'prazo_maximo_campanha_dias'],
        ['orcamento_min_itens',           'orcamento_max_itens'],
        ['cronograma_min_marcos',         'cronograma_max_marcos'],
        ['arquivo_tamanho_minimo_bytes',  'arquivo_tamanho_maximo_imagem_bytes'],
        ['arquivo_tamanho_minimo_bytes',  'arquivo_tamanho_maximo_documento_bytes'],
        ['espera_atencao_dias',           'espera_critica_dias'],
        ['repasse_backoff_base_minutos',  'repasse_backoff_max_minutos'],
        ['estorno_backoff_base_minutos',  'estorno_backoff_max_minutos'],
        ['valor_minimo_contribuicao_cartao', 'valor_maximo_contribuicao_cartao']
    ];
    v_chave  TEXT;
    v_par    TEXT[];
    v_minimo DECIMAL;
    v_maximo DECIMAL;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_chave := OLD.chave;
    ELSE
        v_chave := NEW.chave;
    END IF;

    FOREACH v_par SLICE 1 IN ARRAY v_pares LOOP
        IF v_chave = v_par[1] OR v_chave = v_par[2] THEN
            SELECT valor::DECIMAL INTO v_minimo FROM configuracoes
            WHERE chave = v_par[1] AND id_usuario IS NULL AND ativo = TRUE AND tipo IN ('inteiro', 'decimal', 'dinheiro');
            SELECT valor::DECIMAL INTO v_maximo FROM configuracoes
            WHERE chave = v_par[2] AND id_usuario IS NULL AND ativo = TRUE AND tipo IN ('inteiro', 'decimal', 'dinheiro');

            IF v_minimo IS NOT NULL AND v_maximo IS NOT NULL AND v_minimo > v_maximo THEN
                RAISE EXCEPTION 'O valor mínimo (%) de "%" não pode ser maior que o máximo (%) de "%". Antes de subir o mínimo, suba o máximo (ou baixe o máximo só depois de baixar o mínimo).',
                    v_minimo, v_par[1], v_maximo, v_par[2]
                    USING ERRCODE = '90019',
                          DETAIL = json_build_object('chaveMinimo', v_par[1], 'valorMinimo', v_minimo,
                                                     'chaveMaximo', v_par[2], 'valorMaximo', v_maximo)::text;
            END IF;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$;

-- 3. Os parâmetros em reais
UPDATE configuracoes SET tipo = 'dinheiro'
WHERE id_usuario IS NULL AND tipo = 'decimal' AND chave IN (
    'taxa_minima_repasse', 'meta_minima_campanha', 'valor_minimo_contribuicao', 'valor_minimo_contribuicao_cartao',
    'valor_maximo_contribuicao_cartao', 'taxa_cartao_fixa', 'taxa_pagamento_pix', 'taxa_pagamento_boleto');

-- ============================================================================
-- GRUPO CF (07-11-2026) - CANCELADO, NÃO COLE (aguardando a Alexia decidir sobre recompensa com arquivo; o código
-- foi desfeito e está guardado fora do repositório). Recompensa com arquivo. IDEMPOTENTE.
--
-- O que muda: acesso antecipado e entrega digital podem chegar a quem apoiou por um arquivo (imagem ou PDF) em vez
-- do link especial. A recompensa ativa desses dois tipos precisa de pelo menos um dos dois.
-- ============================================================================
-- CREATE OR REPLACE FUNCTION public.fn_valida_link_recompensa()
-- RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- DECLARE
--     v_id INT := CASE WHEN TG_OP = 'DELETE' THEN OLD.id_recompensa ELSE NEW.id_recompensa END;
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM recompensa r
--         WHERE r.id_recompensa = v_id
--           AND r.ativo
--           AND r.tipo IN ('acesso_antecipado', 'digital')
--           AND NOT EXISTS (SELECT 1 FROM link_recompensa l WHERE l.id_recompensa = r.id_recompensa)
--           AND NOT EXISTS (SELECT 1 FROM arquivo_recompensa a WHERE a.id_recompensa = r.id_recompensa)
--     ) THEN
--         RAISE EXCEPTION 'Acesso antecipado e entrega digital precisam do link especial ou de um arquivo: é por eles que a recompensa chega a quem apoiou.'
--             USING ERRCODE = '91057';
--     END IF;
--     RETURN NULL;
-- END;
-- $$;
