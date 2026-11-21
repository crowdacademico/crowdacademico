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

-- ============================================================================
-- GRUPO CG (12-11-2026) - O pesquisador consulta contribuições pagas recebidas. IDEMPOTENTE.
-- Não precisa parar o Nest (função e permissão; sem alteração de tabela ou policy).
--
-- O que muda:
-- 1. O pesquisador lista somente contribuições pagas (confirmado) das próprias campanhas.
-- 2. A identidade de apoios anônimos, sem conta ou de conta excluída não é retornada.
-- 3. A leitura é feita por função SECURITY DEFINER sem ampliar pol_contribuicao_select.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.contribuicoes_recebidas_pesquisador()
RETURNS TABLE (
    id_contribuicao INT,
    id_campanha INT,
    titulo_campanha VARCHAR,
    apoiador VARCHAR,
    valor DECIMAL,
    meio_pagamento meio_pagamento,
    status status_contribuicao,
    criado_em TIMESTAMPTZ,
    recompensas TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF public.id_usuario_atual() IS NULL THEN
        RAISE EXCEPTION 'É necessário estar autenticado para ver as contribuições recebidas.'
            USING ERRCODE = '92038';
    END IF;

    RETURN QUERY
    SELECT c.id_contribuicao,
           c.id_campanha,
           ca.titulo,
           CASE
               WHEN c.anonima OR u.id_usuario IS NULL OR u.deletado THEN 'Apoiador anônimo'
               ELSE u.nome
           END::VARCHAR,
           c.valor,
           c.meio_pagamento,
           c.status,
           c.criado_em,
           recompensas.nomes
    FROM contribuicao c
    JOIN campanha ca ON ca.id_campanha = c.id_campanha
    LEFT JOIN usuario u ON u.id_usuario = c.id_usuario
    LEFT JOIN LATERAL (
        SELECT string_agg(
                   r.titulo || CASE WHEN cr.quantidade > 1 THEN ' (x' || cr.quantidade::TEXT || ')' ELSE '' END,
                   ', ' ORDER BY r.valor_minimo
               ) AS nomes
        FROM contribuicao_recompensa cr
        JOIN recompensa r ON r.id_recompensa = cr.id_recompensa
        WHERE cr.id_contribuicao = c.id_contribuicao
    ) recompensas ON TRUE
    WHERE ca.id_usuario = public.id_usuario_atual()
      AND c.status = 'confirmado'
    ORDER BY c.criado_em DESC, c.id_contribuicao DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contribuicoes_recebidas_pesquisador() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contribuicoes_recebidas_pesquisador() TO app_nestjs;

-- ============================================================================
-- GRUPO CH (12-11-2026) - Restringir contribuições recebidas às que estão pagas. IDEMPOTENTE.
-- Cole este grupo nos bancos onde o Grupo CG já foi aplicado.
-- (Nota de 14-11-2026: este grupo é idêntico ao CG, não muda nada. A versão final da função está no Grupo CL.)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.contribuicoes_recebidas_pesquisador()
RETURNS TABLE (
    id_contribuicao INT,
    id_campanha INT,
    titulo_campanha VARCHAR,
    apoiador VARCHAR,
    valor DECIMAL,
    meio_pagamento meio_pagamento,
    status status_contribuicao,
    criado_em TIMESTAMPTZ,
    recompensas TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF public.id_usuario_atual() IS NULL THEN
        RAISE EXCEPTION 'É necessário estar autenticado para ver as contribuições recebidas.'
            USING ERRCODE = '92038';
    END IF;

    RETURN QUERY
    SELECT c.id_contribuicao,
           c.id_campanha,
           ca.titulo,
           CASE
               WHEN c.anonima OR u.id_usuario IS NULL OR u.deletado THEN 'Apoiador anônimo'
               ELSE u.nome
           END::VARCHAR,
           c.valor,
           c.meio_pagamento,
           c.status,
           c.criado_em,
           recompensas.nomes
    FROM contribuicao c
    JOIN campanha ca ON ca.id_campanha = c.id_campanha
    LEFT JOIN usuario u ON u.id_usuario = c.id_usuario
    LEFT JOIN LATERAL (
        SELECT string_agg(
                   r.titulo || CASE WHEN cr.quantidade > 1 THEN ' (x' || cr.quantidade::TEXT || ')' ELSE '' END,
                   ', ' ORDER BY r.valor_minimo
               ) AS nomes
        FROM contribuicao_recompensa cr
        JOIN recompensa r ON r.id_recompensa = cr.id_recompensa
        WHERE cr.id_contribuicao = c.id_contribuicao
    ) recompensas ON TRUE
    WHERE ca.id_usuario = public.id_usuario_atual()
      AND c.status = 'confirmado'
    ORDER BY c.criado_em DESC, c.id_contribuicao DESC;
END;
$$;

-- ============================================================================
-- GRUPO CI (12-11-2026) - Contagem pública e anônima de apoios pagos por campanha. IDEMPOTENTE.
-- Não precisa parar o Nest: cria somente função de leitura agregada e permissões.
--
-- O que muda:
--   1. Visitantes podem consultar a quantidade de apoios pagos em campanhas públicas.
--   2. A função não retorna dados individuais nem revela campanhas não publicadas.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.contar_apoios_publicos_campanha(p_id_campanha INT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT count(c.id_contribuicao)::INT
    FROM campanha ca
    LEFT JOIN contribuicao c
      ON c.id_campanha = ca.id_campanha
     AND c.status IN ('confirmado', 'repassado')
    WHERE ca.id_campanha = p_id_campanha
      AND ca.status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
$$;

REVOKE EXECUTE ON FUNCTION public.contar_apoios_publicos_campanha(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contar_apoios_publicos_campanha(INT) TO app_nestjs;

-- ============================================================================
-- GRUPO CJ (12-11-2026) - Retirar permissões administrativas de leitura herdadas por usuario/pesquisador. IDEMPOTENTE.
-- Não precisa parar o Nest: remove somente vínculos em papel_permissao.
-- ============================================================================
DELETE FROM papel_permissao pp
USING papel p, permissao perm
WHERE pp.id_papel = p.id_papel
  AND pp.id_permissao = perm.id_permissao
  AND p.codigo IN ('usuario', 'pesquisador')
  AND perm.nome IN (
    'relatorio_visualizar',
    'usuario_visualizar_sensivel',
    'perfil_pesquisador_visualizar_sensivel',
    'contribuicao_visualizar_sensivel',
    'auditoria_financeira_visualizar',
    'log_visualizar'
  );

-- ============================================================================
-- GRUPO CK (13-11-2026) - Imagem de capa da campanha. IDEMPOTENTE.
-- PARE O NEST antes de colar (corrigido em 14-11-2026; antes dizia que não precisava): o grupo altera a tabela
-- campanha e recria a policy de arquivo, e isso pede uma trava que pode esperar para sempre (ou dar deadlock) com o
-- Nest usando as duas tabelas, a mesma regra do Grupo BS. A coluna é nullable e as campanhas antigas continuam valendo.
--
-- O que muda:
--   1. campanha passa a apontar para um arquivo de imagem já confirmado pelo módulo 26-arquivo.
--   2. A validação exige arquivo ativo, imagem, enviado pela sessão atual e sem outro vínculo.
--   3. A limpeza de órfãos passa a reconhecer capas; o dono da campanha pode remover a imagem vinculada.
--   4. A capa fica congelada junto aos demais dados depois da aprovação.
-- ============================================================================
ALTER TABLE campanha ADD COLUMN IF NOT EXISTS id_imagem_capa INT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'CK_CAMPANHA_VIDEO_OU_IMAGEM_CAPA'
          AND conrelid = 'public.campanha'::regclass
    ) THEN
        ALTER TABLE campanha
            ADD CONSTRAINT "CK_CAMPANHA_VIDEO_OU_IMAGEM_CAPA"
            CHECK (video_apresentacao_url IS NULL OR id_imagem_capa IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FK_CAMPANHA_IMAGEM_CAPA'
          AND conrelid = 'public.campanha'::regclass
    ) THEN
        ALTER TABLE campanha
            ADD CONSTRAINT "FK_CAMPANHA_IMAGEM_CAPA"
            FOREIGN KEY (id_imagem_capa) REFERENCES arquivo(id_arquivo) ON DELETE SET NULL;
    END IF;
END;
$$;

GRANT INSERT (id_imagem_capa) ON campanha TO app_nestjs;
GRANT UPDATE (id_imagem_capa) ON campanha TO app_nestjs;

DROP POLICY IF EXISTS pol_arquivo_update ON arquivo;
CREATE POLICY pol_arquivo_update ON arquivo FOR UPDATE TO app_nestjs USING (
    (SELECT public.tem_permissao('arquivo_gerenciar'))
    OR EXISTS (
        SELECT 1 FROM usuario u
        WHERE u.id_usuario = (SELECT public.id_usuario_atual())
          AND u.id_imagem_perfil = arquivo.id_arquivo
    )
    OR EXISTS (
        SELECT 1 FROM campanha c
        WHERE c.id_imagem_capa = arquivo.id_arquivo
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
    OR EXISTS (
        SELECT 1 FROM arquivo_atualizacao aa
        JOIN atualizacao_campanha ac ON ac.id_atualizacao = aa.id_atualizacao
        JOIN campanha c ON c.id_campanha = ac.id_campanha
        WHERE aa.id_arquivo = arquivo.id_arquivo
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
    OR EXISTS (
        SELECT 1 FROM arquivo_recompensa ar
        JOIN recompensa r ON r.id_recompensa = ar.id_recompensa
        JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE ar.id_arquivo = arquivo.id_arquivo
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);

CREATE OR REPLACE FUNCTION public.fn_valida_posse_imagem_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_atual INT := public.id_usuario_atual();
    v_arquivo arquivo%ROWTYPE;
BEGIN
    IF NEW.id_imagem_perfil IS NULL
       OR (TG_OP = 'UPDATE' AND NEW.id_imagem_perfil IS NOT DISTINCT FROM OLD.id_imagem_perfil)
       OR v_atual IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT * INTO v_arquivo FROM arquivo WHERE id_arquivo = NEW.id_imagem_perfil;
    IF NOT FOUND OR v_arquivo.ativo IS NOT TRUE THEN
        RAISE EXCEPTION 'A foto escolhida não existe mais ou foi removida. Envie a imagem de novo.' USING ERRCODE = '90022';
    END IF;
    IF v_arquivo.id_usuario_upload IS DISTINCT FROM v_atual THEN
        RAISE EXCEPTION 'Só é possível usar como foto um arquivo que você mesmo enviou.' USING ERRCODE = '92025';
    END IF;
    IF EXISTS (SELECT 1 FROM usuario WHERE id_imagem_perfil = NEW.id_imagem_perfil AND id_usuario <> NEW.id_usuario)
       OR EXISTS (SELECT 1 FROM campanha WHERE id_imagem_capa = NEW.id_imagem_perfil)
       OR EXISTS (SELECT 1 FROM arquivo_atualizacao WHERE id_arquivo = NEW.id_imagem_perfil)
       OR EXISTS (SELECT 1 FROM arquivo_recompensa WHERE id_arquivo = NEW.id_imagem_perfil) THEN
        RAISE EXCEPTION 'Este arquivo já está em uso em outro lugar.' USING ERRCODE = '91029';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_valida_posse_imagem_capa_campanha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_atual INT := public.id_usuario_atual();
    v_arquivo arquivo%ROWTYPE;
BEGIN
    IF NEW.id_imagem_capa IS NULL
       OR (TG_OP = 'UPDATE' AND NEW.id_imagem_capa IS NOT DISTINCT FROM OLD.id_imagem_capa)
       OR v_atual IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT * INTO v_arquivo FROM arquivo WHERE id_arquivo = NEW.id_imagem_capa;
    IF NOT FOUND OR v_arquivo.ativo IS NOT TRUE OR v_arquivo.tipo_mime NOT LIKE 'image/%' THEN
        RAISE EXCEPTION 'A imagem de capa não existe mais ou foi removida. Envie a imagem de novo.' USING ERRCODE = '90022';
    END IF;
    IF v_arquivo.id_usuario_upload IS DISTINCT FROM v_atual THEN
        RAISE EXCEPTION 'Só é possível usar como capa uma imagem que você mesmo enviou.' USING ERRCODE = '92025';
    END IF;
    IF EXISTS (SELECT 1 FROM usuario WHERE id_imagem_perfil = NEW.id_imagem_capa)
       OR EXISTS (SELECT 1 FROM campanha WHERE id_imagem_capa = NEW.id_imagem_capa AND id_campanha <> NEW.id_campanha)
       OR EXISTS (SELECT 1 FROM arquivo_atualizacao WHERE id_arquivo = NEW.id_imagem_capa)
       OR EXISTS (SELECT 1 FROM arquivo_recompensa WHERE id_arquivo = NEW.id_imagem_capa) THEN
        RAISE EXCEPTION 'Esta imagem já está em uso em outro lugar.' USING ERRCODE = '91029';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_valida_posse_imagem_capa_campanha ON campanha;
CREATE TRIGGER trg_valida_posse_imagem_capa_campanha
BEFORE INSERT OR UPDATE OF id_imagem_capa ON campanha
FOR EACH ROW EXECUTE FUNCTION public.fn_valida_posse_imagem_capa_campanha();

CREATE OR REPLACE FUNCTION public.fn_valida_posse_anexo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_atual INT := public.id_usuario_atual();
    v_arquivo arquivo%ROWTYPE;
    v_em_uso BOOLEAN;
BEGIN
    IF v_atual IS NULL OR (TG_OP = 'UPDATE' AND NEW.id_arquivo IS NOT DISTINCT FROM OLD.id_arquivo) THEN
        RETURN NEW;
    END IF;
    SELECT * INTO v_arquivo FROM arquivo WHERE id_arquivo = NEW.id_arquivo;
    IF NOT FOUND OR v_arquivo.ativo IS NOT TRUE THEN
        RAISE EXCEPTION 'O arquivo escolhido não existe mais ou foi removido. Envie o arquivo de novo.' USING ERRCODE = '90022';
    END IF;
    IF v_arquivo.id_usuario_upload IS DISTINCT FROM v_atual THEN
        RAISE EXCEPTION 'Só é possível anexar um arquivo que você mesmo enviou.' USING ERRCODE = '92025';
    END IF;
    IF TG_TABLE_NAME = 'arquivo_atualizacao' THEN
        v_em_uso := EXISTS (SELECT 1 FROM arquivo_atualizacao WHERE id_arquivo = NEW.id_arquivo AND id_arq_atu IS DISTINCT FROM NEW.id_arq_atu)
                 OR EXISTS (SELECT 1 FROM arquivo_recompensa WHERE id_arquivo = NEW.id_arquivo);
    ELSE
        v_em_uso := EXISTS (SELECT 1 FROM arquivo_recompensa WHERE id_arquivo = NEW.id_arquivo AND id_arq_recompensa IS DISTINCT FROM NEW.id_arq_recompensa)
                 OR EXISTS (SELECT 1 FROM arquivo_atualizacao WHERE id_arquivo = NEW.id_arquivo);
    END IF;
    IF v_em_uso
       OR EXISTS (SELECT 1 FROM usuario WHERE id_imagem_perfil = NEW.id_arquivo)
       OR EXISTS (SELECT 1 FROM campanha WHERE id_imagem_capa = NEW.id_arquivo) THEN
        RAISE EXCEPTION 'Este arquivo já está em uso em outro lugar.' USING ERRCODE = '91029';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_campanha_campos_bloqueados(p public.campanha)
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN p.status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(p.id_campanha) THEN
            ARRAY['titulo', 'descricao', 'meta_financeira', 'modelo', 'data_inicio', 'data_fim',
                  'id_area_conhecimento', 'video_apresentacao_url', 'id_imagem_capa']
        WHEN public.fn_status_pos_aprovacao(p.status) THEN
            ARRAY['meta_financeira', 'modelo', 'taxa_plataforma', 'titulo', 'descricao',
                  'video_apresentacao_url', 'id_area_conhecimento', 'id_imagem_capa']
            || CASE WHEN p.data_inicio IS NOT NULL AND p.data_inicio <= NOW()
                    THEN ARRAY['data_fim', 'data_inicio'] ELSE ARRAY[]::TEXT[] END
        ELSE ARRAY[]::TEXT[]
    END;
$$;

CREATE OR REPLACE FUNCTION public.fn_campanha_erro_congelamento(p_campo TEXT, p_rejeitada BOOLEAN)
RETURNS TABLE (errcode TEXT, mensagem TEXT)
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT '91027', 'Esta campanha rejeitada já usou todos os reenvios permitidos e agora é somente leitura.'
    WHERE p_rejeitada
    UNION ALL
    SELECT v.errcode, v.mensagem
    FROM (VALUES
        ('meta_financeira',       '91004', 'Fraude bloqueada: não é permitido alterar a meta financeira após a aprovação da campanha.'),
        ('modelo',                '91005', 'Fraude bloqueada: não é permitido alterar o modelo de financiamento após a aprovação da campanha.'),
        ('taxa_plataforma',       '91006', 'Operação bloqueada: a taxa da plataforma não pode ser alterada após o congelamento.'),
        ('titulo',                '91007', 'Fraude bloqueada: não é permitido alterar o título após a aprovação da campanha.'),
        ('descricao',             '91008', 'Fraude bloqueada: não é permitido alterar a descrição após a aprovação da campanha.'),
        ('video_apresentacao_url','91023', 'Fraude bloqueada: não é permitido alterar o vídeo de apresentação após a aprovação da campanha.'),
        ('id_area_conhecimento',  '91024', 'Operação bloqueada: a área do conhecimento não pode ser alterada após a aprovação da campanha.'),
        ('id_imagem_capa',        '91030', 'Não é permitido alterar a imagem de capa após a aprovação da campanha.'),
        ('data_fim',              '91009', 'Operação bloqueada: o prazo da campanha não pode ser alterado depois que ela começa de verdade.'),
        ('data_inicio',           '91010', 'Operação bloqueada: a data de início da campanha não pode ser alterada depois que ela começa de verdade.')
    ) AS v(campo, errcode, mensagem)
    WHERE NOT p_rejeitada AND v.campo = p_campo;
$$;

CREATE OR REPLACE FUNCTION public.desativar_arquivos_orfaos()
RETURNS TABLE (id_arquivo INT, chave TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_horas INT;
    v_corte TIMESTAMPTZ;
    v_total INT;
BEGIN
    v_horas := public.config_numero('arquivo_horas_para_vincular', 24)::INT;
    IF v_horas <= 0 THEN RETURN; END IF;
    v_corte := NOW() - (v_horas * INTERVAL '1 hour');

    RETURN QUERY
    UPDATE arquivo a
       SET ativo = FALSE, desativado_em = NOW()
     WHERE a.ativo = TRUE
       AND a.criado_em < v_corte
       AND NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id_imagem_perfil = a.id_arquivo)
       AND NOT EXISTS (SELECT 1 FROM campanha c WHERE c.id_imagem_capa = a.id_arquivo)
       AND NOT EXISTS (SELECT 1 FROM arquivo_atualizacao aa WHERE aa.id_arquivo = a.id_arquivo)
       AND NOT EXISTS (SELECT 1 FROM arquivo_recompensa ar WHERE ar.id_arquivo = a.id_arquivo)
    RETURNING a.id_arquivo, a.chave::TEXT;

    GET DIAGNOSTICS v_total = ROW_COUNT;
    IF v_total > 0 THEN
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_novos)
        VALUES ('arquivo', 'órfãos anteriores a ' || to_char(v_corte, 'YYYY-MM-DD HH24:MI'), 'UPDATE', NULL,
                jsonb_build_object('quantidade', v_total, 'horas_para_vincular', v_horas, 'corte', v_corte));
    END IF;
END;
$$;

-- ============================================================================
-- GRUPO CL (14-11-2026) - Correções dos grupos CG a CK (integração da área pública). IDEMPOTENTE.
-- Não precisa parar o Nest: só troca o corpo de duas funções (sem alteração de tabela ou policy).
-- Cole depois do CK. Se o CG a CK ainda não foram colados, cole os cinco antes e este por último.
--
-- O que muda:
--   1. Imagem de capa congelada após a aprovação passa a sair com o código 91058. O CK usava 91030, que já é
--      "último administrador ativo" (fn_protege_ultimo_admin) e faria a tela mostrar o motivo errado.
--   2. contribuicoes_recebidas_pesquisador: "precisa estar autenticado" passa a sair com 92041. O CG usava 92038, que
--      já é "sem permissão para ver o resumo das contribuições" (resumo_contribuicoes_campanha).
--   3. contribuicoes_recebidas_pesquisador passa a listar também as contribuições já repassadas ('repassado'), a
--      mesma régua da contagem pública do CI. Antes, um apoio pago sumia da lista do pesquisador no dia do repasse.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_campanha_erro_congelamento(p_campo TEXT, p_rejeitada BOOLEAN)
RETURNS TABLE (errcode TEXT, mensagem TEXT)
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT '91027', 'Esta campanha rejeitada já usou todos os reenvios permitidos e agora é somente leitura.'
    WHERE p_rejeitada
    UNION ALL
    SELECT v.errcode, v.mensagem
    FROM (VALUES
        ('meta_financeira',       '91004', 'Fraude bloqueada: não é permitido alterar a meta financeira após a aprovação da campanha.'),
        ('modelo',                '91005', 'Fraude bloqueada: não é permitido alterar o modelo de financiamento após a aprovação da campanha.'),
        ('taxa_plataforma',       '91006', 'Operação bloqueada: a taxa da plataforma não pode ser alterada após o congelamento.'),
        ('titulo',                '91007', 'Fraude bloqueada: não é permitido alterar o título após a aprovação da campanha.'),
        ('descricao',             '91008', 'Fraude bloqueada: não é permitido alterar a descrição após a aprovação da campanha.'),
        ('video_apresentacao_url','91023', 'Fraude bloqueada: não é permitido alterar o vídeo de apresentação após a aprovação da campanha.'),
        ('id_area_conhecimento',  '91024', 'Operação bloqueada: a área do conhecimento não pode ser alterada após a aprovação da campanha.'),
        ('id_imagem_capa',       '91058', 'Operação bloqueada: a imagem de capa não pode ser alterada após a aprovação da campanha.'),
        ('data_fim',              '91009', 'Operação bloqueada: o prazo da campanha não pode ser alterado depois que ela começa de verdade.'),
        ('data_inicio',           '91010', 'Operação bloqueada: a data de início da campanha não pode ser alterada depois que ela começa de verdade.')
    ) AS v(campo, errcode, mensagem)
    WHERE NOT p_rejeitada AND v.campo = p_campo;
$$;

CREATE OR REPLACE FUNCTION public.contribuicoes_recebidas_pesquisador()
RETURNS TABLE (
    id_contribuicao INT,
    id_campanha INT,
    titulo_campanha VARCHAR,
    apoiador VARCHAR,
    valor DECIMAL,
    meio_pagamento meio_pagamento,
    status status_contribuicao,
    criado_em TIMESTAMPTZ,
    recompensas TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF public.id_usuario_atual() IS NULL THEN
        RAISE EXCEPTION 'É necessário estar autenticado para ver as contribuições recebidas.'
            USING ERRCODE = '92041';
    END IF;

    RETURN QUERY
    SELECT c.id_contribuicao,
           c.id_campanha,
           ca.titulo,
           CASE
               WHEN c.anonima OR u.id_usuario IS NULL OR u.deletado THEN 'Apoiador anônimo'
               ELSE u.nome
           END::VARCHAR,
           c.valor,
           c.meio_pagamento,
           c.status,
           c.criado_em,
           recompensas.nomes
    FROM contribuicao c
    JOIN campanha ca ON ca.id_campanha = c.id_campanha
    LEFT JOIN usuario u ON u.id_usuario = c.id_usuario
    LEFT JOIN LATERAL (
        SELECT string_agg(
                   r.titulo || CASE WHEN cr.quantidade > 1 THEN ' (x' || cr.quantidade::TEXT || ')' ELSE '' END,
                   ', ' ORDER BY r.valor_minimo
               ) AS nomes
        FROM contribuicao_recompensa cr
        JOIN recompensa r ON r.id_recompensa = cr.id_recompensa
        WHERE cr.id_contribuicao = c.id_contribuicao
    ) recompensas ON TRUE
    WHERE ca.id_usuario = public.id_usuario_atual()
      AND c.status IN ('confirmado', 'repassado')
    ORDER BY c.criado_em DESC, c.id_contribuicao DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contribuicoes_recebidas_pesquisador() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contribuicoes_recebidas_pesquisador() TO app_nestjs;

-- ============================================================================
-- GRUPO CM (14-11-2026) - Ciência do modelo flexível no apoio (RF-041). IDEMPOTENTE.
-- PARE O NEST antes de colar: o grupo altera a tabela contribuicao, e isso pede uma trava que pode esperar para
-- sempre (ou dar deadlock) com o Nest usando a tabela, a mesma regra do Grupo BS. A coluna é nullable: as
-- contribuições antigas continuam valendo.
-- Cole depois do CL. Suba o Nest novo junto: o Nest antigo não manda a ciência, e o novo grava nesta coluna.
--
-- O que muda:
--   1. contribuicao ganha ciencia_modelo_em: quando quem apoiou confirmou ciência do modelo flexível. O
--      POST /contribuicao recusa campanha flexível sem a ciência e grava NOW() aqui.
-- ============================================================================
ALTER TABLE contribuicao ADD COLUMN IF NOT EXISTS ciencia_modelo_em TIMESTAMPTZ;

-- ============================================================================
-- GRUPO CN (14-11-2026) - Desistir do apoio (direito de arrependimento, CDC art. 49). IDEMPOTENTE.
-- Não precisa parar o Nest: só cria uma função, um parâmetro e o GRANT (nenhuma tabela ou policy muda).
-- Cole depois do CM. Suba o Nest novo junto (rota POST /contribuicao/:id/desistir).
-- ATUALIZADO depois de colado (14-11-2026): quem desiste agora perde as recompensas. COLE O CN DE NOVO (é idempotente).
--
-- O que muda:
--   1. Parâmetro novo desistencia_prazo_dias (7): dias, contados da contribuição, para quem apoiou desistir.
--   2. Função desistir_contribuicao: quem apoiou com conta desiste da contribuição paga dentro do prazo, em qualquer
--      momento da campanha (inclusive depois do fim; a campanha não muda de status). A contribuição vai para
--      a_devolver: o estorno devolve o valor (a tarifa fica com o provedor) e o repasse pendente já desconta sozinho.
--   Códigos novos: 92042, 91059, 91060, 91061.
-- ============================================================================
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'desistencia_prazo_dias', '7', 'inteiro', 'Dias, contados da contribuição, em que quem apoiou pode desistir e receber o valor de volta (CDC, art. 49)', TRUE, TRUE)
ON CONFLICT (chave) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Função:     desistir_contribuicao
-- Assinatura: (p_id_contribuicao INT) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      Direito de arrependimento (CDC, art. 49): quem apoiou com conta desiste da própria contribuição paga em
--             até configuracoes.desistencia_prazo_dias (padrão 7) contados da contribuição. Vale em qualquer momento da
--             campanha, inclusive depois do fim: a campanha não muda de status (bem-sucedida continua bem-sucedida).
--             O caminho é o de sempre: confirmado -> a_devolver; o worker de estorno devolve o VALOR (a tarifa do meio de
--             pagamento fica com o provedor: a plataforma nunca arca com nada) e reservar_proximo_repasse() já tira do
--             repasse pendente o que deixou de estar 'confirmado'. Como a carência do repasse (15 dias) é maior que o
--             prazo de desistência, o dinheiro ainda não saiu; se o repasse já estiver em transferência, recusa (91061).
--             Quem desiste perde as recompensas que a contribuição deu (decisão do Lucas, 14-11-2026; na devolução do
--             tudo-ou-nada elas ficam, porque a pessoa não desistiu). Códigos: 92042 (sem sessão, ou contribuição que não é de quem pede), 91059 (não está
--             paga), 91060 (prazo passou), 91061 (repasse já em transferência). SECURITY DEFINER: a autorização é a
--             conferência de id_usuario contra id_usuario_atual().
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desistir_contribuicao(p_id_contribuicao INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario INT := public.id_usuario_atual();
    v         RECORD;
BEGIN
    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Entre na sua conta para desistir de um apoio.' USING ERRCODE = '92042';
    END IF;

    SELECT c.status, c.criado_em, r.status AS status_repasse
    INTO v
    FROM contribuicao c
    LEFT JOIN repasse r ON r.id_repasse = c.id_repasse
    WHERE c.id_contribuicao = p_id_contribuicao AND c.id_usuario = v_usuario
    FOR UPDATE OF c;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contribuição não encontrada.' USING ERRCODE = '92042';
    END IF;
    IF v.status <> 'confirmado' THEN
        RAISE EXCEPTION 'Só dá para desistir de uma contribuição paga e ainda não devolvida.' USING ERRCODE = '91059';
    END IF;
    IF v.criado_em + public.config_numero('desistencia_prazo_dias', 7) * INTERVAL '1 day' < NOW() THEN
        RAISE EXCEPTION 'O prazo para desistir deste apoio já passou.' USING ERRCODE = '91060';
    END IF;
    IF v.status_repasse IS NOT NULL AND v.status_repasse <> 'pendente' THEN
        RAISE EXCEPTION 'O repasse desta campanha já está em andamento. Fale com o suporte.' USING ERRCODE = '91061';
    END IF;

    PERFORM public.atualizar_status_contribuicao(p_id_contribuicao, 'a_devolver');
    DELETE FROM contribuicao_recompensa WHERE id_contribuicao = p_id_contribuicao;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.desistir_contribuicao(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desistir_contribuicao(INT) TO app_nestjs;

-- ============================================================================
-- GRUPO CO (14-11-2026) - Denúncia de comentário e moderação de comentário ofensivo. IDEMPOTENTE.
-- PARE O NEST antes de colar: o grupo altera a tabela denuncia (colunas, FK e índices), e isso pede uma trava que pode
-- esperar para sempre (ou dar deadlock) com o Nest usando a tabela, a mesma regra do Grupo BS. Suba o Nest novo junto.
-- Cole depois do CN.
--
-- O que muda:
--   1. denuncia ganha id_comentario e a cópia do comentário (conteúdo, se estava endossado, a campanha).
--   2. Uma denúncia por perfil continua valendo, mas cada comentário do mesmo autor pode ser denunciado à parte
--      (a constraint UK_DENUNCIA_USUARIO_PESQUISADOR_ALVO vira índice único parcial, com o mesmo nome).
--   3. O banco preenche o alvo (o autor) a partir do comentário. O comentário sai do ar na hora quando quem denuncia é
--      o dono da campanha, e quando a moderação julga a denúncia procedente.
--   Códigos novos: 90040, 90041.
-- ============================================================================
ALTER TABLE denuncia ADD COLUMN IF NOT EXISTS id_comentario INT;
ALTER TABLE denuncia ADD COLUMN IF NOT EXISTS comentario_conteudo TEXT;
ALTER TABLE denuncia ADD COLUMN IF NOT EXISTS comentario_endossado BOOLEAN;
ALTER TABLE denuncia ADD COLUMN IF NOT EXISTS comentario_id_campanha INT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_DENUNCIA_COMENTARIO') THEN
        ALTER TABLE denuncia ADD CONSTRAINT "FK_DENUNCIA_COMENTARIO"
            FOREIGN KEY (id_comentario) REFERENCES comentario(id_comentario) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE denuncia DROP CONSTRAINT IF EXISTS "UK_DENUNCIA_USUARIO_PESQUISADOR_ALVO";
CREATE UNIQUE INDEX IF NOT EXISTS "UK_DENUNCIA_USUARIO_PESQUISADOR_ALVO" ON denuncia(id_usuario, id_pesquisador_alvo) WHERE id_comentario IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "UK_DENUNCIA_USUARIO_COMENTARIO"       ON denuncia(id_usuario, id_comentario)       WHERE id_comentario IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_denuncia_comentario ON denuncia(id_comentario);

GRANT INSERT (id_usuario, id_campanha_alvo, id_pesquisador_alvo, id_comentario, id_motivo, relato) ON denuncia TO app_nestjs;

-- ----------------------------------------------------------------------------
-- Função:     fn_denuncia_comentario_preenche
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Denúncia de comentário (14-11-2026). Quem denuncia manda só id_comentario: o banco preenche o alvo (o perfil
--             do autor, id_pesquisador_alvo) e guarda a cópia do comentário naquele momento (conteúdo, se estava
--             endossado, a campanha). Roda como quem denuncia (sem SECURITY DEFINER): só dá para denunciar um comentário
--             que a pessoa consegue ver (pol_comentario_select, 04). Nome com "a_" de propósito: triggers BEFORE rodam em
--             ordem alfabética, e esta precisa vir antes de trg_denuncia_valida_alvo e trg_denuncia_valida_tipo_motivo,
--             que conferem o alvo. Códigos: 90040 (comentário não encontrado), 90041 (autor sem conta).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_denuncia_comentario_preenche()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v RECORD;
BEGIN
    IF NEW.id_comentario IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT id_pesquisador, conteudo, endossado, id_campanha INTO v
    FROM comentario WHERE id_comentario = NEW.id_comentario;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comentário não encontrado.' USING ERRCODE = '90040';
    END IF;
    IF v.id_pesquisador IS NULL THEN
        RAISE EXCEPTION 'O autor deste comentário não tem mais conta na plataforma.' USING ERRCODE = '90041';
    END IF;

    NEW.id_pesquisador_alvo    := v.id_pesquisador;
    NEW.id_campanha_alvo       := NULL;
    NEW.comentario_conteudo    := v.conteudo;
    NEW.comentario_endossado   := v.endossado;
    NEW.comentario_id_campanha := v.id_campanha;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_denuncia_a_comentario ON denuncia;
CREATE TRIGGER trg_denuncia_a_comentario
BEFORE INSERT ON denuncia
FOR EACH ROW
EXECUTE FUNCTION public.fn_denuncia_comentario_preenche();

-- ----------------------------------------------------------------------------
-- Função:     fn_denuncia_comentario_oculta
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      O comentário denunciado sai do ar (ativo = FALSE, sem endosso) em dois momentos:
--               - na hora, quando quem denuncia é o dono da campanha: denunciar e deixar de ver é uma ação só, e o
--                 autor não comenta mais ali (o comentário inativo ocupa a vaga de um por campanha);
--               - quando a moderação julga a denúncia procedente ('resolvida').
--             Quem endossou um comentário julgado ofensivo pode ser punido pelo caminho normal: a tela do julgamento
--             mostra que ele estava endossado (comentario_endossado) e a moderação abre uma denúncia contra a campanha.
--             As triggers de comentario continuam valendo: tirar o endosso exige ser o dono da campanha ou ter
--             comentario_moderar (validar_comentario_endosso_autor), que são justamente quem dispara esta função.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_denuncia_comentario_oculta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.id_comentario IS NULL THEN
        RETURN NULL;
    END IF;

    IF (TG_OP = 'INSERT' AND EXISTS (
            SELECT 1 FROM campanha WHERE id_campanha = NEW.comentario_id_campanha AND id_usuario = NEW.id_usuario))
       OR (TG_OP = 'UPDATE' AND NEW.status = 'resolvida' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        UPDATE comentario
        SET ativo = FALSE, endossado = FALSE, ordem_endosso = NULL
        WHERE id_comentario = NEW.id_comentario AND (ativo OR endossado);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_denuncia_comentario_oculta ON denuncia;
CREATE TRIGGER trg_denuncia_comentario_oculta
AFTER INSERT OR UPDATE OF status ON denuncia
FOR EACH ROW
EXECUTE FUNCTION public.fn_denuncia_comentario_oculta();

-- ============================================================================
-- GRUPO CP (14-11-2026) - "Criar para outro" (Campo de Testes, T2) com imagem de capa. IDEMPOTENTE.
-- Não precisa parar o Nest: só troca uma função (nenhuma tabela ou policy muda). Suba o Nest novo junto: o antigo
-- chama a função com um argumento a menos e continuaria funcionando, mas sem a capa.
-- Cole depois do CO.
--
-- O que muda:
--   1. criar_campanha_para_outro ganha p_id_imagem_capa: a capa enviada pelo admin vai junto com a campanha.
-- ============================================================================
-- [03-E-1] criar_campanha_para_outro: pol_campanha_insert (04) exige id_usuario = id_usuario_atual() E
-- pesquisador ativo, então não dá para criar em nome de um pesquisador escolhido sem personificação (mesma
-- classe de criar_perfil_pesquisador_para_outro, [03-P-2]). Esta função é o caminho separado, gateado por
-- campanha_criar_para_outro (ver 07); o self-service (POST /campanha) não a usa. Continua exigindo
-- pesquisador ATIVO (mesma regra do self-service, checada aqui em vez de RLS): só troca QUEM pode disparar
-- o INSERT em nome de outro. Validação de prazo/meta/limite de campanhas simultâneas NÃO é duplicada aqui:
-- continua toda em trigger (05_regras_negocio.sql) e dispara igual para INSERT via SECURITY DEFINER.
-- p_id_imagem_capa (14-11-2026): a capa enviada por quem cria (o admin); fn_valida_posse_imagem_capa_campanha (05) confere
-- que foi a conta atual que enviou. DROP antes: com um parâmetro a mais, CREATE OR REPLACE criaria uma sobrecarga.
DROP FUNCTION IF EXISTS public.criar_campanha_para_outro(INT, INT, TEXT, modelo_campanha, DECIMAL, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
CREATE OR REPLACE FUNCTION public.criar_campanha_para_outro(
    p_id_usuario INT,
    p_id_area_conhecimento INT,
    p_titulo TEXT,
    p_modelo modelo_campanha,
    p_meta_financeira DECIMAL,
    p_descricao TEXT,
    p_data_inicio TIMESTAMPTZ,
    p_data_fim TIMESTAMPTZ,
    p_video_apresentacao_url TEXT,
    p_id_imagem_capa INT DEFAULT NULL
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
        RAISE EXCEPTION 'Sem permissão para criar campanha em nome de outro pesquisador.' USING ERRCODE = '92018';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM perfil_pesquisador
        WHERE id_usuario = p_id_usuario AND status_pesquisador = 'ativo'
    ) THEN
        RAISE EXCEPTION 'O usuário escolhido não é um pesquisador ativo.' USING ERRCODE = '90021';
    END IF;

    INSERT INTO campanha (
        id_usuario, id_area_conhecimento, titulo, modelo,
        meta_financeira, descricao, data_inicio, data_fim, video_apresentacao_url, id_imagem_capa
    )
    VALUES (
        p_id_usuario, p_id_area_conhecimento, p_titulo, COALESCE(p_modelo, 'all-or-nothing'),
        p_meta_financeira, p_descricao, p_data_inicio, p_data_fim, p_video_apresentacao_url, p_id_imagem_capa
    )
    RETURNING id_campanha INTO v_id_campanha;

    RETURN v_id_campanha;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.criar_campanha_para_outro(INT, INT, TEXT, modelo_campanha, DECIMAL, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_campanha_para_outro(INT, INT, TEXT, modelo_campanha, DECIMAL, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT) TO app_nestjs;

-- ============================================================================
-- GRUPO CQ (14-11-2026) - Imagem de capa editável depois da aprovação. IDEMPOTENTE.
-- Não precisa parar o Nest: só troca uma função. Cole depois do CP.
--
-- O que muda:
--   1. A imagem de capa sai da lista de campos congelados na aprovação (o 91058 deixa de acontecer). O vídeo continua
--      congelado; como a campanha tem vídeo OU capa (CK_CAMPANHA_VIDEO_OU_IMAGEM_CAPA), campanha aprovada com vídeo
--      continua sem capa.
-- ============================================================================
-- Campos de campanha que o congelamento trava agora, na ordem em que a trigger confere. Fonte única para a
-- trigger fn_congela_regras_campanha e para GET /campanha/:id (camposBloqueados); ver DOCUMENTACAO_BD.md [05-K-2-D].
-- A imagem de capa NÃO congela na aprovação (decisão do Lucas, 14-11-2026): é só apresentação, não muda nada do que
-- quem apoiou aceitou (meta, modelo, taxa, prazo). Só trava na rejeitada sem reenvios, onde tudo é somente leitura.
CREATE OR REPLACE FUNCTION public.fn_campanha_campos_bloqueados(p public.campanha)
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN p.status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(p.id_campanha) THEN
            ARRAY['titulo', 'descricao', 'meta_financeira', 'modelo', 'data_inicio', 'data_fim',
                  'id_area_conhecimento', 'video_apresentacao_url', 'id_imagem_capa']
        WHEN public.fn_status_pos_aprovacao(p.status) THEN
            ARRAY['meta_financeira', 'modelo', 'taxa_plataforma', 'titulo', 'descricao',
                  'video_apresentacao_url', 'id_area_conhecimento']
            || CASE WHEN p.data_inicio IS NOT NULL AND p.data_inicio <= NOW()
                    THEN ARRAY['data_fim', 'data_inicio'] ELSE ARRAY[]::TEXT[] END
        ELSE ARRAY[]::TEXT[]
    END;
$$;

-- ============================================================================
-- GRUPO CR (14-11-2026) - Capa também no banner da página da campanha. IDEMPOTENTE.
-- PARE O NEST antes de colar: o grupo altera a tabela campanha (coluna nova), a mesma regra do Grupo BS. Suba o Nest
-- novo junto. Cole depois do CQ.
--
-- O que muda:
--   1. campanha ganha capa_no_banner (padrão TRUE): a imagem de capa também aparece de fundo no banner do topo da
--      página da campanha. Desmarcada, a capa fica só no lugar do vídeo. Não congela na aprovação.
-- ============================================================================
ALTER TABLE campanha ADD COLUMN IF NOT EXISTS capa_no_banner BOOLEAN NOT NULL DEFAULT TRUE;
GRANT INSERT (capa_no_banner), UPDATE (capa_no_banner) ON campanha TO app_nestjs;

-- ============================================================================
-- GRUPO CS (14-11-2026) - Excluir recompensa que ninguém ganhou ainda. IDEMPOTENTE.
-- Não precisa parar o Nest: só cria uma policy e um GRANT. Suba o Nest novo junto (rota DELETE /recompensa/:id).
-- Cole depois do CR.
--
-- O que muda:
--   1. O dono da campanha pode excluir uma recompensa. A que já foi concedida continua presa pela FK (RESTRICT): essa
--      se desativa no Alterar. O link e os arquivos dela saem junto (CASCADE).
-- ============================================================================
DROP POLICY IF EXISTS pol_recompensa_delete ON recompensa;
CREATE POLICY pol_recompensa_delete ON recompensa FOR DELETE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = recompensa.id_campanha AND (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar'))))
);
GRANT DELETE ON recompensa TO app_nestjs;

-- ============================================================================
-- GRUPO CT (16-11-2026) - Recompensas: liberação, quem ganhou e aviso por e-mail. IDEMPOTENTE.
-- Não precisa parar o Nest: só funções, uma policy, um gatilho e dois modelos de mensagem. Suba o Nest novo junto
-- (rota GET /recompensa/:id/ganhadores e o tipo de aviso recompensa_liberada). Cole depois do CS.
--
-- O que muda (conversa do Lucas com a Alexia, 15-11-2026):
--   1. recompensa_liberada (03): a recompensa só vale com a contribuição paga e não devolvida; no Tudo ou Nada, só
--      quando a campanha bate a meta. Devolução, desistência e reembolso tiram a recompensa.
--   2. pol_link_recompensa_select (04): o link especial só aparece com a recompensa liberada. CORRIGE um furo: antes,
--      um Pix gerado e nunca pago já mostrava o link.
--   3. fn_concede_recompensas (05): quem apoia como anônimo não ganha o reconhecimento.
--   4. listar_ganhadores_recompensa (05): o dono da campanha vê quem ganhou cada recompensa (só o nome). Código novo:
--      92043.
--   5. Aviso 'recompensa_liberada' (e-mail e sino): no flexível, quando o pagamento chega; no Tudo ou Nada, quando a
--      campanha bate a meta.
-- ============================================================================
-- [03-R-1] recompensa_liberada (16-11-2026, Lucas e Alexia): quando a recompensa de uma contribuição vale de verdade, e o
-- link especial dela aparece para quem ganhou (pol_link_recompensa_select, 04). Vale só com a contribuição PAGA e não
-- devolvida (confirmado ou já repassado): devolução, desistência e reembolso tiram a recompensa. No Tudo ou Nada, só
-- quando o dinheiro vai mesmo para o pesquisador (destino_dinheiro_campanha = 'repasse': bateu a meta, ou encerrou antes
-- do prazo com a meta batida); antes disso a recompensa fica "aguardando a meta", porque se a meta falhar tudo é
-- devolvido e o conteúdo digital teria saído de graça. No flexível, vale assim que paga.
-- Aqui (e não em 05) porque a policy de 04 depende dela; plpgsql para poder citar destino_dinheiro_campanha, que só
-- nasce em 05 (o corpo plpgsql só é conferido quando roda).
CREATE OR REPLACE FUNCTION public.recompensa_liberada(p_id_contribuicao INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM contribuicao co
        JOIN campanha ca ON ca.id_campanha = co.id_campanha
        WHERE co.id_contribuicao = p_id_contribuicao
          AND co.status IN ('confirmado', 'repassado')
          AND ca.status <> 'encerrado_moderacao'
          AND (ca.modelo = 'flexivel' OR public.destino_dinheiro_campanha(ca.id_campanha) = 'repasse')
    );
END;
$$;

DROP POLICY IF EXISTS pol_link_recompensa_select ON link_recompensa;
CREATE POLICY pol_link_recompensa_select ON link_recompensa FOR SELECT TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
    -- Quem ganhou só vê o link com a recompensa liberada (16-11-2026): antes bastava ter a recompensa ligada, e uma
    -- contribuição Pix gerada e nunca paga já mostrava o link.
    OR EXISTS (
        SELECT 1 FROM contribuicao_recompensa cr JOIN contribuicao co ON co.id_contribuicao = cr.id_contribuicao
        WHERE cr.id_recompensa = link_recompensa.id_recompensa
          AND co.id_usuario = (SELECT public.id_usuario_atual())
          AND public.recompensa_liberada(co.id_contribuicao)
    )
);

CREATE OR REPLACE FUNCTION public.fn_concede_recompensas()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id_usuario IS NOT NULL THEN
        INSERT INTO contribuicao_recompensa (id_contribuicao, id_recompensa)
        SELECT NEW.id_contribuicao, r.id_recompensa
        FROM recompensa r
        WHERE r.id_campanha = NEW.id_campanha AND r.ativo AND r.valor_minimo <= NEW.valor
          -- Reconhecimento é o nome publicado: quem apoiou como anônimo não ganha esse (16-11-2026).
          AND NOT (NEW.anonima AND r.tipo = 'reconhecimento');
    END IF;
    RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     listar_ganhadores_recompensa
-- Assinatura: (p_id_recompensa INT) -> TABLE (quem ganhou a recompensa)
-- Bloco:      [05-K-1]
-- Regra:      Para o dono da campanha (ou o admin) saber a quem entregar a recompensa, principalmente o reconhecimento
--             (16-11-2026, Alexia). Só contribuição paga e não devolvida (confirmado ou repassado). Só o NOME: o e-mail de
--             quem apoiou não vai para o pesquisador (a entrega digital é pelo link na plataforma). Apoio anônimo, sem
--             conta ou de conta excluída aparece como "Apoiador anônimo". `liberada` = recompensa_liberada (03): no Tudo
--             ou Nada, falso até a campanha bater a meta. Sem ser dono nem admin: 92043.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_ganhadores_recompensa(p_id_recompensa INT)
RETURNS TABLE (
    id_contribuicao INT,
    apoiador VARCHAR,
    valor DECIMAL,
    ganha_em TIMESTAMPTZ,
    liberada BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha ca ON ca.id_campanha = r.id_campanha
        WHERE r.id_recompensa = p_id_recompensa
          AND (ca.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    ) THEN
        RAISE EXCEPTION 'Só o dono da campanha vê quem ganhou a recompensa.' USING ERRCODE = '92043';
    END IF;

    RETURN QUERY
    SELECT c.id_contribuicao,
           CASE
               WHEN c.anonima OR u.id_usuario IS NULL OR u.deletado THEN 'Apoiador anônimo'
               ELSE u.nome
           END::VARCHAR,
           c.valor,
           cr.adquirida_em,
           public.recompensa_liberada(c.id_contribuicao)
    FROM contribuicao_recompensa cr
    JOIN contribuicao c ON c.id_contribuicao = cr.id_contribuicao
    LEFT JOIN usuario u ON u.id_usuario = c.id_usuario
    WHERE cr.id_recompensa = p_id_recompensa
      AND c.status IN ('confirmado', 'repassado')
    ORDER BY cr.adquirida_em, c.id_contribuicao;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     enfileirar_aviso_recompensas
-- Assinatura: (p_id_campanha INT, p_id_contribuicao INT DEFAULT NULL) -> INT
-- Bloco:      [05-Q]
-- Regra:      Avisa (e-mail e sino, 'recompensa_liberada') quem tem recompensa liberada: uma mensagem por pessoa, com os
--             nomes das recompensas. Com p_id_contribuicao, só aquela contribuição (o pagamento que acabou de chegar, no
--             flexível); sem ele, a campanha inteira (o Tudo ou Nada que bateu a meta). Só o que recompensa_liberada (03)
--             deixa. Devolve quantas pessoas foram avisadas. SECURITY DEFINER, sem autorização (só os gatilhos chamam).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enfileirar_aviso_recompensas(p_id_campanha INT, p_id_contribuicao INT DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_linha RECORD;
    v_total INT := 0;
BEGIN
    FOR v_linha IN
        SELECT co.id_usuario,
               ca.titulo,
               string_agg(DISTINCT r.titulo, ', ') AS recompensas
        FROM contribuicao co
        JOIN campanha ca ON ca.id_campanha = co.id_campanha
        JOIN contribuicao_recompensa cr ON cr.id_contribuicao = co.id_contribuicao
        JOIN recompensa r ON r.id_recompensa = cr.id_recompensa
        WHERE co.id_campanha = p_id_campanha
          AND co.id_usuario IS NOT NULL
          AND (p_id_contribuicao IS NULL OR co.id_contribuicao = p_id_contribuicao)
          AND public.recompensa_liberada(co.id_contribuicao)
        GROUP BY co.id_usuario, ca.titulo
    LOOP
        IF public.enfileirar_notificacao(v_linha.id_usuario, 'recompensa_liberada',
               jsonb_build_object('id_campanha', p_id_campanha, 'titulo', v_linha.titulo,
                                  'recompensas', v_linha.recompensas)) IS NOT NULL THEN
            v_total := v_total + 1;
        END IF;
    END LOOP;
    RETURN v_total;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     fn_notifica_recompensa_paga
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-Q]
-- Regra:      Contribuição que acabou de ser paga e já libera a recompensa (flexível, ou Tudo ou Nada que já bateu a
--             meta): avisa quem apoiou. No Tudo ou Nada ainda no ar, o aviso sai quando a campanha bate a meta
--             (fn_notifica_situacao_campanha).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notifica_recompensa_paga()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.enfileirar_aviso_recompensas(NEW.id_campanha, NEW.id_contribuicao);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifica_recompensa_paga ON contribuicao;
CREATE TRIGGER trg_notifica_recompensa_paga
AFTER UPDATE OF status ON contribuicao
FOR EACH ROW
WHEN (NEW.status = 'confirmado' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.id_usuario IS NOT NULL)
EXECUTE FUNCTION public.fn_notifica_recompensa_paga();

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
    -- Tudo ou Nada que saiu do ar com o dinheiro indo para o pesquisador: as recompensas que esperavam a meta valem
    -- agora (recompensa_liberada, 03). Avisa quem ganhou (16-11-2026).
    IF OLD.status = 'ativo' AND NEW.modelo = 'all-or-nothing'
       AND public.destino_dinheiro_campanha(NEW.id_campanha) = 'repasse' THEN
        PERFORM public.enfileirar_aviso_recompensas(NEW.id_campanha);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifica_situacao_campanha ON campanha;
CREATE TRIGGER trg_notifica_situacao_campanha
AFTER UPDATE OF status ON campanha
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_notifica_situacao_campanha();

-- ----------------------------------------------------------------------------
-- Função:     fn_notifica_rejeicao_campanha (trigger)
-- Bloco:      [05-Q]
-- Regra:      Campanha rejeitada (RF-109): o dono recebe a justificativa, quantos reenvios ainda tem e até quando pode
--             corrigir, pela mesma conta que a tela e o banco usam (fn_campanha_situacao_reenvio, [05-K-2-B]).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notifica_rejeicao_campanha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_situacao RECORD;
BEGIN
    IF NEW.id_campanha IS NULL OR NEW.id_usuario_dono IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT * INTO v_situacao FROM public.fn_campanha_situacao_reenvio(NEW.id_campanha);
    PERFORM public.enfileirar_notificacao(NEW.id_usuario_dono, 'campanha_rejeitada',
        jsonb_build_object('id_campanha', NEW.id_campanha, 'titulo', NEW.titulo_campanha,
                           'justificativa', NEW.justificativa,
                           'reenvios_restantes', v_situacao.reenvios_restantes,
                           'prazo_reenvio_ate', v_situacao.prazo_reenvio_ate));
    RETURN NULL;
END;
$$;

INSERT INTO modelo_mensagem (tipo_evento, canal, titulo, corpo, ativo, obrigatoria) VALUES
('recompensa_liberada', 'email', 'Sua recompensa está liberada',
 E'Obrigado por apoiar "{{titulo}}"! A sua recompensa está liberada: {{recompensas}}.\n\nVeja e acesse em Minha Conta, na aba Contribuições, em "Recompensas ganhas".', TRUE, FALSE),
('recompensa_liberada', 'interna', 'Recompensa liberada',
 E'Sua recompensa de "{{titulo}}" está liberada: {{recompensas}}.', TRUE, FALSE)
ON CONFLICT (tipo_evento, canal) DO NOTHING;

-- ============================================================================
-- GRUPO CU (16-11-2026) - Comentar e seguir só campanha publicada: correção de segurança. IDEMPOTENTE.
-- Não precisa parar o Nest: só troca duas funções. Cole depois do CT.
--
-- O que muda: as regras que barram comentar (91020) e seguir (91034) uma campanha ainda não publicada liam a situação
-- da campanha com a RLS de quem comentava. O rascunho de outra pessoa, invisível para ela, voltava vazio e passava:
-- dava para comentar ou seguir um rascunho alheio sabendo o id. Agora leem sem a RLS (SECURITY DEFINER), e campanha
-- não encontrada conta como não publicada.
-- ============================================================================
-- SECURITY DEFINER (16-11-2026): a situação da campanha é lida sem a RLS de quem comenta. Antes a leitura era com a
-- RLS, e o rascunho de outra pessoa (invisível para ela) voltava NULL e passava pela checagem: dava para comentar num
-- rascunho alheio sabendo o id. Ficou escondido enquanto existia a leitura de desenvolvimento [07-B-4].
CREATE OR REPLACE FUNCTION fn_valida_comentario_campanha_ativa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status status_campanha;
BEGIN
    SELECT status INTO v_status
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF v_status IN ('rejeitado', 'encerrado_moderacao') THEN
        RAISE EXCEPTION 'Operação bloqueada: não é possível comentar em campanhas rejeitadas ou sob moderação.'
            USING ERRCODE = '91020';
    END IF;
    IF v_status IS NULL OR v_status IN ('rascunho', 'aguardando_aprovacao') THEN
        RAISE EXCEPTION 'Operação bloqueada: esta campanha ainda não foi publicada, então não recebe comentários.'
            USING ERRCODE = '91020';
    END IF;

    RETURN NEW;
END;
$$;

-- SECURITY DEFINER (16-11-2026): mesmo motivo de fn_valida_comentario_campanha_ativa (o rascunho alheio, invisível
-- pela RLS, voltava NULL e deixava seguir).
CREATE OR REPLACE FUNCTION fn_valida_seguir_campanha_publicada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status status_campanha;
BEGIN
    SELECT status INTO v_status
    FROM campanha
    WHERE id_campanha = NEW.id_campanha;

    IF v_status IS NULL OR v_status NOT IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado') THEN
        RAISE EXCEPTION 'Só é possível seguir uma campanha publicada.'
            USING ERRCODE = '91034';
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- GRUPO CV (16-11-2026) - E-mail "Recebemos seu apoio" (comprovante de quem apoiou). IDEMPOTENTE.
-- Não precisa parar o Nest: um gatilho e dois modelos de mensagem. Suba o Nest novo junto (tipo de aviso
-- apoio_confirmado). Cole depois do CU.
--
-- O que muda:
--   1. Quem apoia com conta recebe e-mail e aviso no sino quando o pagamento é confirmado: campanha, valor, protocolo e
--      prazo para desistir. Antes não recebia nada até a campanha terminar.
--   2. Se o pagamento já libera recompensas, elas vêm neste mesmo e-mail (sai o gatilho trg_notifica_recompensa_paga do
--      grupo CT, para não chegarem dois e-mails no mesmo minuto). O aviso de recompensa do Tudo ou Nada que bate a meta
--      continua.
--   3. Corrige o texto do e-mail de recompensa do grupo CT: a aba da Minha Conta se chama Financeiro (só se o texto
--      ainda for o original; um texto já editado no painel fica como está).
-- ============================================================================
-- ----------------------------------------------------------------------------
-- Função:     fn_notifica_apoio_confirmado
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-Q]
-- Regra:      O comprovante de quem apoiou com conta (16-11-2026): quando o pagamento é confirmado, e-mail e sino
--             'apoio_confirmado' com a campanha, o valor, o protocolo e o prazo para desistir (desistencia_prazo_dias).
--             Se o pagamento já libera recompensas (flexível, ou Tudo ou Nada que já bateu a meta: recompensa_liberada,
--             03), elas vêm NESTE e-mail, para não chegarem dois no mesmo minuto. No Tudo ou Nada ainda no ar, o aviso
--             das recompensas sai à parte quando a campanha bate a meta (fn_notifica_situacao_campanha). Sem conta não
--             há para onde mandar (o gatilho só roda com id_usuario).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notifica_apoio_confirmado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_titulo      VARCHAR;
    v_recompensas TEXT;
BEGIN
    SELECT titulo INTO v_titulo FROM campanha WHERE id_campanha = NEW.id_campanha;
    IF public.recompensa_liberada(NEW.id_contribuicao) THEN
        SELECT string_agg(DISTINCT r.titulo, ', ') INTO v_recompensas
        FROM contribuicao_recompensa cr
        JOIN recompensa r ON r.id_recompensa = cr.id_recompensa
        WHERE cr.id_contribuicao = NEW.id_contribuicao;
    END IF;
    PERFORM public.enfileirar_notificacao(NEW.id_usuario, 'apoio_confirmado',
        jsonb_build_object('id_campanha', NEW.id_campanha, 'titulo', v_titulo, 'valor', NEW.valor,
                           'protocolo', NEW.id_contribuicao::TEXT,
                           'prazo_desistencia', public.config_numero('desistencia_prazo_dias', 7)::INT::TEXT,
                           'recompensas', v_recompensas));
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifica_recompensa_paga ON contribuicao;
DROP FUNCTION IF EXISTS public.fn_notifica_recompensa_paga();
DROP TRIGGER IF EXISTS trg_notifica_apoio_confirmado ON contribuicao;
CREATE TRIGGER trg_notifica_apoio_confirmado
AFTER UPDATE OF status ON contribuicao
FOR EACH ROW
WHEN (NEW.status = 'confirmado' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.id_usuario IS NOT NULL)
EXECUTE FUNCTION public.fn_notifica_apoio_confirmado();

INSERT INTO modelo_mensagem (tipo_evento, canal, titulo, corpo, ativo, obrigatoria) VALUES
('apoio_confirmado', 'email', 'Recebemos seu apoio',
 E'Obrigado por apoiar "{{titulo}}"! O pagamento de {{valor}} foi confirmado e já conta para a meta.\n\nProtocolo do seu apoio: {{protocolo}}. Guarde este número.\n\n{{#recompensas}}Suas recompensas já estão liberadas: {{recompensas}}. Veja em Minha Conta, na aba Financeiro.{{/recompensas}}\n\nSe mudar de ideia, você pode desistir em até {{prazo_desistencia}} dias, em Minha Conta, na aba Financeiro. O valor do apoio volta; a tarifa do meio de pagamento não.', TRUE, FALSE),
('apoio_confirmado', 'interna', 'Apoio confirmado',
 E'Seu apoio de {{valor}} a "{{titulo}}" foi confirmado. Protocolo {{protocolo}}.', TRUE, FALSE)
ON CONFLICT (tipo_evento, canal) DO NOTHING;

UPDATE modelo_mensagem
   SET corpo = replace(corpo, 'Veja e acesse em Minha Conta, na aba Contribuições, em "Recompensas ganhas".', 'Veja e acesse em Minha Conta, na aba Financeiro, em "Recompensas ganhas".')
 WHERE tipo_evento = 'recompensa_liberada' AND canal = 'email'
   AND corpo LIKE '%aba Contribuições%';

-- ============================================================================
-- GRUPO CW (16-11-2026) - Sincronizar as tarifas com o provedor. IDEMPOTENTE.
-- Não precisa parar o Nest: só uma função e o GRANT dela. Suba o Nest novo junto (tarefa diária às 5h e a rota
-- POST /pagamento/tarifas/sincronizar, o botão de Parâmetros). Cole depois do CV.
--
-- O que muda: o total mostrado ANTES de pagar (modal Apoiar, Transparência) sai dos parâmetros de tarifa. O Pix e o
-- boleto se acertavam só depois da primeira cobrança com preço novo, e o cartão nunca. Agora o Nest consulta as tarifas
-- do provedor todo dia e grava aqui; quando um desconto vence (o do sandbox, em 17-01-2027), o total continua certo.
-- ============================================================================
-- ----------------------------------------------------------------------------
-- Função:     sincronizar_tarifas_provedor
-- Assinatura: (p_pix DECIMAL, p_boleto DECIMAL, p_cartao_percentual DECIMAL, p_cartao_fixa DECIMAL) -> INT
-- Bloco:      [05-K-2]
-- Regra:      Grava as tarifas que o provedor informou hoje (GET /myAccount/fees no Asaas, com o desconto quando vale)
--             nos 4 parâmetros que o modal Apoiar e a Transparência mostram ANTES de a pessoa pagar (RF-063). Só troca
--             o que mudou, e a troca fica no log de auditoria, como em ajustar_tarifa_pagamento. O valor COBRADO não
--             depende disto (a cobrança é corrigida pelo líquido do provedor). Valor fora do esperado: 90036, nada muda.
--             Chamada pelo Nest (tarefa diária e o botão de Parâmetros, que confere configuracao_gerenciar antes).
--             Devolve quantos parâmetros mudaram (16-11-2026).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sincronizar_tarifas_provedor(
    p_pix DECIMAL, p_boleto DECIMAL, p_cartao_percentual DECIMAL, p_cartao_fixa DECIMAL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alterados INT := 0;
    v_linhas    INT;
    v_par       RECORD;
BEGIN
    IF p_pix IS NULL OR p_pix < 0 OR p_boleto IS NULL OR p_boleto < 0 OR p_cartao_fixa IS NULL OR p_cartao_fixa < 0
       OR p_cartao_percentual IS NULL OR p_cartao_percentual < 0 OR p_cartao_percentual >= 100 THEN
        RAISE EXCEPTION 'Tarifa do provedor fora do esperado.' USING ERRCODE = '90036';
    END IF;

    FOR v_par IN
        SELECT * FROM (VALUES
            ('taxa_pagamento_pix', p_pix),
            ('taxa_pagamento_boleto', p_boleto),
            ('taxa_cartao_percentual', p_cartao_percentual),
            ('taxa_cartao_fixa', p_cartao_fixa)
        ) AS t(chave, valor)
    LOOP
        UPDATE configuracoes SET valor = to_char(v_par.valor, 'FM999999990.00')
        WHERE chave = v_par.chave AND id_usuario IS NULL AND valor::DECIMAL IS DISTINCT FROM v_par.valor;
        GET DIAGNOSTICS v_linhas = ROW_COUNT;
        v_alterados := v_alterados + v_linhas;
    END LOOP;
    RETURN v_alterados;
END;
$$;

-- sincronizar_tarifas_provedor: a tarefa diária e o botão de Parâmetros (o Nest confere configuracao_gerenciar antes).
REVOKE EXECUTE ON FUNCTION public.sincronizar_tarifas_provedor(DECIMAL, DECIMAL, DECIMAL, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sincronizar_tarifas_provedor(DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO app_nestjs;

-- ============================================================================
-- GRUPO CX (16-11-2026) - Gráficos do Dashboard: arrecadação e cadastros por dia e por mês. IDEMPOTENTE.
-- Não precisa parar o Nest: só uma função nova e o GRANT dela. Suba o Nest novo junto (rota GET /dashboard/serie).
-- Cole depois do CW.
-- ============================================================================
-- ============================================================
-- Função:     serie_metricas_dashboard
-- Assinatura: (p_mensal BOOLEAN) -> TABLE(periodo_inicio DATE, periodo_anterior BOOLEAN, valor_arrecadado DECIMAL,
--             total_apoios INT, total_cadastros INT)
-- Bloco:      [03-M-2]
-- Regra:      Os gráficos do Dashboard (16-11-2026): quanto entrou em apoios pagos (status confirmado ou repassado) e
--             quantas contas foram criadas, dia a dia nos últimos 30 dias (p_mensal = FALSE) ou mês a mês nos últimos
--             12 meses (TRUE), e o MESMO tanto de períodos antes (periodo_anterior = TRUE), para a tela comparar com o
--             período anterior. Todo dia ou mês aparece, mesmo zerado (o gráfico não pula buracos). O dia do apoio é o
--             da criação da contribuição (o Pix se paga na hora; o cartão, em segundos). Fuso de Brasília: a plataforma
--             é brasileira, e "hoje" no gráfico é o hoje de quem usa (o mesmo fuso do seed). SECURITY DEFINER pelo mesmo
--             motivo de contar_metricas_dashboard: a RLS de contribuicao e usuario daria números diferentes conforme
--             quem está logado. Exige relatorio_visualizar (ERRCODE 92011).
CREATE OR REPLACE FUNCTION public.serie_metricas_dashboard(p_mensal BOOLEAN)
RETURNS TABLE (
    periodo_inicio    DATE,
    periodo_anterior  BOOLEAN,
    valor_arrecadado  DECIMAL(14,2),
    total_apoios      INT,
    total_cadastros   INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fuso CONSTANT TEXT := 'America/Sao_Paulo';
    v_hoje   DATE := (now() AT TIME ZONE v_fuso)::DATE;
    v_inicio DATE;   -- primeiro dia (ou mês) do período atual
    v_antes  DATE;   -- primeiro dia (ou mês) do período anterior
BEGIN
    IF NOT public.tem_permissao('relatorio_visualizar') THEN
        RAISE EXCEPTION 'Sem permissão para ver as métricas do painel.' USING ERRCODE = '92011';
    END IF;
    IF COALESCE(p_mensal, FALSE) THEN
        v_inicio := (date_trunc('month', v_hoje) - INTERVAL '11 months')::DATE;
        v_antes  := (v_inicio - INTERVAL '12 months')::DATE;
    ELSE
        v_inicio := v_hoje - 29;
        v_antes  := v_inicio - 30;
    END IF;

    RETURN QUERY
    WITH baldes AS (
        SELECT g::DATE AS dia
        FROM generate_series(v_antes::TIMESTAMP, v_hoje::TIMESTAMP,
                             CASE WHEN p_mensal THEN INTERVAL '1 month' ELSE INTERVAL '1 day' END) AS g
    ),
    apoios AS (
        SELECT CASE WHEN p_mensal THEN date_trunc('month', c.criado_em AT TIME ZONE v_fuso)::DATE
                    ELSE (c.criado_em AT TIME ZONE v_fuso)::DATE END AS dia,
               sum(c.valor) AS soma, count(*) AS qtd
        FROM contribuicao c
        WHERE c.status IN ('confirmado', 'repassado')
          AND c.criado_em >= (v_antes::TIMESTAMP AT TIME ZONE v_fuso)
        GROUP BY 1
    ),
    cadastros AS (
        SELECT CASE WHEN p_mensal THEN date_trunc('month', u.criado_em AT TIME ZONE v_fuso)::DATE
                    ELSE (u.criado_em AT TIME ZONE v_fuso)::DATE END AS dia,
               count(*) AS qtd
        FROM usuario u
        WHERE u.criado_em >= (v_antes::TIMESTAMP AT TIME ZONE v_fuso)
        GROUP BY 1
    )
    SELECT b.dia,
           b.dia < v_inicio,
           COALESCE(a.soma, 0)::DECIMAL(14,2),
           COALESCE(a.qtd, 0)::INT,
           COALESCE(k.qtd, 0)::INT
    FROM baldes b
    LEFT JOIN apoios a ON a.dia = b.dia
    LEFT JOIN cadastros k ON k.dia = b.dia
    ORDER BY b.dia;
END;
$$;

-- serie_metricas_dashboard(BOOLEAN) ([03-M-2]): os gráficos do Dashboard (GET /dashboard/serie). Confere
-- relatorio_visualizar por dentro; o PUBLIC não executa.
REVOKE EXECUTE ON FUNCTION public.serie_metricas_dashboard(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serie_metricas_dashboard(BOOLEAN) TO app_nestjs;

-- ============================================================================
-- GRUPO CY (16-11-2026) - Gráficos do Dashboard com data de início e fim à escolha. IDEMPOTENTE.
-- Não precisa parar o Nest, mas suba o Nest novo junto: a rota GET /dashboard/serie passa a pedir as datas, e o Nest
-- antigo chamaria a função velha, que este grupo apaga. Cole depois do CX.
-- ============================================================================
-- A versão do CX só sabia "30 dias" ou "12 meses" (um parâmetro só); esta recebe as duas datas. Assinatura nova =
-- função nova para o Postgres: a antiga sai, para não ficarem duas.
DROP FUNCTION IF EXISTS public.serie_metricas_dashboard(BOOLEAN);

-- ============================================================
-- Função:     serie_metricas_dashboard
-- Assinatura: (p_inicio DATE, p_fim DATE, p_mensal BOOLEAN) -> TABLE(periodo_inicio DATE, periodo_anterior BOOLEAN,
--             valor_arrecadado DECIMAL, total_apoios INT, total_cadastros INT)
-- Bloco:      [03-M-2]
-- Regra:      Os gráficos do Dashboard (16-11-2026): quanto entrou em apoios pagos (status confirmado ou repassado), quantos
--             apoios e quantas contas foram criadas, de p_inicio a p_fim (as datas que o admin escolhe), dia a dia
--             (p_mensal = FALSE) ou mês a mês (TRUE, em meses inteiros), e o MESMO tanto de tempo logo antes
--             (periodo_anterior = TRUE), para a tela comparar com o período anterior. Todo dia ou mês aparece, mesmo
--             zerado (o gráfico não pula buracos). Datas trocadas são desinvertidas; o período tem teto (2 anos dia a dia,
--             10 anos mês a mês: o Nest recusa antes, com mensagem), para uma chamada não varrer o banco inteiro. O dia do
--             apoio é o da criação da contribuição (o Pix se paga na hora; o cartão, em segundos). Fuso de Brasília: a
--             plataforma é brasileira, e "hoje" no gráfico é o hoje de quem usa (o mesmo fuso do seed). SECURITY DEFINER
--             pelo mesmo motivo de contar_metricas_dashboard: a RLS de contribuicao e usuario daria números diferentes
--             conforme quem está logado. Exige relatorio_visualizar (ERRCODE 92011).
CREATE OR REPLACE FUNCTION public.serie_metricas_dashboard(p_inicio DATE, p_fim DATE, p_mensal BOOLEAN)
RETURNS TABLE (
    periodo_inicio    DATE,
    periodo_anterior  BOOLEAN,
    valor_arrecadado  DECIMAL(14,2),
    total_apoios      INT,
    total_cadastros   INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fuso   CONSTANT TEXT := 'America/Sao_Paulo';
    v_mensal BOOLEAN := COALESCE(p_mensal, FALSE);
    v_hoje   DATE := (now() AT TIME ZONE v_fuso)::DATE;
    v_inicio DATE := LEAST(COALESCE(p_inicio, v_hoje - 29), COALESCE(p_fim, v_hoje));
    v_fim    DATE := GREATEST(COALESCE(p_inicio, v_hoje - 29), COALESCE(p_fim, v_hoje));
    v_antes  DATE;   -- primeiro dia (ou mês) do período anterior
    v_passo  INTERVAL;
BEGIN
    IF NOT public.tem_permissao('relatorio_visualizar') THEN
        RAISE EXCEPTION 'Sem permissão para ver as métricas do painel.' USING ERRCODE = '92011';
    END IF;

    IF v_mensal THEN
        v_inicio := date_trunc('month', v_inicio)::DATE;
        v_fim    := date_trunc('month', v_fim)::DATE;
        v_inicio := GREATEST(v_inicio, (v_fim - INTERVAL '119 months')::DATE);   -- teto: 10 anos
        v_antes  := (v_inicio - ((EXTRACT(YEAR FROM age(v_fim, v_inicio)) * 12 + EXTRACT(MONTH FROM age(v_fim, v_inicio)) + 1)
                                  * INTERVAL '1 month'))::DATE;
        v_passo  := INTERVAL '1 month';
    ELSE
        v_inicio := GREATEST(v_inicio, v_fim - 730);                            -- teto: 2 anos
        v_antes  := v_inicio - (v_fim - v_inicio + 1);
        v_passo  := INTERVAL '1 day';
    END IF;

    RETURN QUERY
    WITH baldes AS (
        SELECT g::DATE AS dia
        FROM generate_series(v_antes::TIMESTAMP, v_fim::TIMESTAMP, v_passo) AS g
    ),
    apoios AS (
        SELECT CASE WHEN v_mensal THEN date_trunc('month', c.criado_em AT TIME ZONE v_fuso)::DATE
                    ELSE (c.criado_em AT TIME ZONE v_fuso)::DATE END AS dia,
               sum(c.valor) AS soma, count(*) AS qtd
        FROM contribuicao c
        WHERE c.status IN ('confirmado', 'repassado')
          AND c.criado_em >= (v_antes::TIMESTAMP AT TIME ZONE v_fuso)
        GROUP BY 1
    ),
    cadastros AS (
        SELECT CASE WHEN v_mensal THEN date_trunc('month', u.criado_em AT TIME ZONE v_fuso)::DATE
                    ELSE (u.criado_em AT TIME ZONE v_fuso)::DATE END AS dia,
               count(*) AS qtd
        FROM usuario u
        WHERE u.criado_em >= (v_antes::TIMESTAMP AT TIME ZONE v_fuso)
        GROUP BY 1
    )
    SELECT b.dia,
           b.dia < v_inicio,
           COALESCE(a.soma, 0)::DECIMAL(14,2),
           COALESCE(a.qtd, 0)::INT,
           COALESCE(k.qtd, 0)::INT
    FROM baldes b
    LEFT JOIN apoios a ON a.dia = b.dia
    LEFT JOIN cadastros k ON k.dia = b.dia
    ORDER BY b.dia;
END;
$$;

-- serie_metricas_dashboard(DATE, DATE, BOOLEAN) ([03-M-2]): os gráficos do Dashboard (GET /dashboard/serie). Confere
-- relatorio_visualizar por dentro; o PUBLIC não executa.
REVOKE EXECUTE ON FUNCTION public.serie_metricas_dashboard(DATE, DATE, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serie_metricas_dashboard(DATE, DATE, BOOLEAN) TO app_nestjs;

-- ============================================================================
-- GRUPO CZ (16-11-2026) - Quem aprova não pode ser o dono da campanha (CT-11 do TCC). IDEMPOTENTE (pode colar de novo).
--
-- O que muda:
--   1. fn_valida_transicao_campanha (05): um administrador com a permissão de aprovar não aprova a própria campanha
--      (92044); e o encerramento direto ativo -> encerrado por quem tem a permissão de decidir pedidos não vale para o
--      dono (o encerramento sem contribuição, RF-068, continua).
--   2. decidir_solicitacao_encerramento (03): o dono da campanha não decide o próprio pedido de encerramento (92045).
-- Só troca o corpo das duas funções; a trigger e os grants continuam os mesmos. Não precisa parar o Nest.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_valida_transicao_campanha()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status      IS NOT DISTINCT FROM OLD.status
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'aguardando_aprovacao' AND NEW.status = 'ativo'
       AND NEW.aprovado_em IS NOT NULL
       AND public.tem_permissao('campanha_aprovar') THEN
        -- Conflito de interesse (CT-11): quem aprova não pode ser o dono, nem um administrador que tenha a própria
        -- campanha na fila. Outro administrador aprova. Só aqui, dentro de quem tem a permissão: o dono sem ela
        -- continua caindo no 92001 do fim (as grades da suíte 8 não mudam).
        IF NEW.id_usuario = public.id_usuario_atual() THEN
            RAISE EXCEPTION 'Você não pode aprovar a sua própria campanha. Outro administrador precisa fazer a aprovação.'
                USING ERRCODE = '92044';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND public.tem_permissao('campanha_rejeitar') THEN
        RETURN NEW;
    END IF;

    -- O dono não encerra a própria campanha por este caminho, mesmo tendo a permissão (decidir_solicitacao_encerramento
    -- recusa antes com 92045); segue para as regras de baixo, onde só o encerramento sem contribuição (10) o libera.
    IF OLD.status = 'ativo' AND NEW.status = 'encerrado'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_usuario IS DISTINCT FROM public.id_usuario_atual()
       AND public.tem_permissao('solicitacao_encerramento_decidir') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'ativo'
       AND OLD.data_fim IS NOT NULL AND OLD.data_fim <= NOW()
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
       AND (
            (NEW.status = 'sucesso'      AND NEW.valor_bruto_arrecadado >= NEW.meta_financeira)
         OR (NEW.status = 'nao_atingido' AND NEW.valor_bruto_arrecadado <  NEW.meta_financeira)
       )
    THEN
        RETURN NEW;
    END IF;

    -- Reenvio esgotado vale para QUALQUER perfil, inclusive quem tem campanha_editar.
    IF OLD.status = 'rejeitado' AND NEW.status = 'aguardando_aprovacao'
       AND public.fn_campanha_reenvios_esgotados(OLD.id_campanha) THEN
        RAISE EXCEPTION 'Esta campanha já usou todos os reenvios permitidos e agora é somente leitura.'
            USING ERRCODE = '91025';
    END IF;

    IF OLD.status IN ('rascunho', 'rejeitado') AND NEW.status = 'aguardando_aprovacao'
       AND NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin    IS NOT DISTINCT FROM OLD.id_admin
       AND public.tem_permissao('campanha_editar') THEN
        RETURN NEW;
    END IF;

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
            IF (SELECT s.prazo_reenvio_ate FROM public.fn_campanha_situacao_reenvio(OLD.id_campanha) s) <= NOW()
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
            (OLD.status = 'ativo'                AND NEW.status = 'encerrado_moderacao')
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

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND OLD.status = 'aguardando_aprovacao' AND NEW.status = 'rejeitado'
       AND public.fn_usuario_excluido(NEW.id_usuario)
    THEN
        RETURN NEW;
    END IF;

    IF NEW.aprovado_em IS NOT DISTINCT FROM OLD.aprovado_em
       AND NEW.id_admin IS NOT DISTINCT FROM OLD.id_admin
       AND OLD.status = 'ativo' AND NEW.status = 'encerrado'
       AND NEW.id_usuario = public.id_usuario_atual()
       AND EXISTS (SELECT 1 FROM solicitacao_encerramento se WHERE se.id_campanha = OLD.id_campanha AND se.status = 'aprovado' AND se.id_admin IS NULL)
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transição de status de campanha não autorizada (% -> %).', OLD.status, NEW.status
        USING ERRCODE = '92001';
END;
$$;

CREATE OR REPLACE FUNCTION public.decidir_solicitacao_encerramento(p_id_solicitacao INT, p_aprovar BOOLEAN, p_justificativa TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_campanha INT;
    v_status      status_encerramento;
BEGIN
    IF NOT public.tem_permissao('solicitacao_encerramento_decidir') THEN
        RAISE EXCEPTION 'Sem permissão para decidir pedidos de encerramento.' USING ERRCODE = '92032';
    END IF;
    SELECT id_campanha, status INTO v_id_campanha, v_status FROM solicitacao_encerramento WHERE id_solicitacao_encerramento = p_id_solicitacao;
    IF v_status IS DISTINCT FROM 'pendente' THEN
        RAISE EXCEPTION 'Só um pedido pendente pode ser decidido.' USING ERRCODE = '91041';
    END IF;
    -- Conflito de interesse: o dono da campanha não decide o próprio pedido, nem sendo administrador.
    IF EXISTS (SELECT 1 FROM campanha WHERE id_campanha = v_id_campanha AND id_usuario = public.id_usuario_atual()) THEN
        RAISE EXCEPTION 'Você não pode decidir o pedido de encerramento da sua própria campanha. Outro administrador precisa decidir.'
            USING ERRCODE = '92045';
    END IF;
    IF NOT p_aprovar AND (p_justificativa IS NULL OR btrim(p_justificativa) = '') THEN
        RAISE EXCEPTION 'Escreva por que o pedido foi rejeitado.' USING ERRCODE = '90029';
    END IF;
    IF p_aprovar AND NOT EXISTS (SELECT 1 FROM campanha WHERE id_campanha = v_id_campanha AND status = 'ativo') THEN
        RAISE EXCEPTION 'A campanha já não está ativa: o pedido não pode ser aprovado.' USING ERRCODE = '91042';
    END IF;

    UPDATE solicitacao_encerramento
    SET status = CASE WHEN p_aprovar THEN 'aprovado' ELSE 'rejeitado' END::status_encerramento,
        id_admin = public.id_usuario_atual(),
        justificativa_admin = NULLIF(btrim(COALESCE(p_justificativa, '')), ''),
        avaliado_em = NOW()
    WHERE id_solicitacao_encerramento = p_id_solicitacao;

    IF p_aprovar THEN
        UPDATE campanha SET status = 'encerrado' WHERE id_campanha = v_id_campanha;
    END IF;
    RETURN v_id_campanha;
END;
$$;

-- ============================================================================
-- GRUPO DA (17-11-2026) - Permissões da conta no login (o menu do painel mostra só o que a conta usa). IDEMPOTENTE.
-- Não precisa parar o Nest: só cria uma função e o GRANT dela. Suba o Nest novo junto (login e renovação passam a
-- devolver as permissões). Cole depois do CZ.
--
-- O que muda:
--   1. listar_permissoes_usuario(id): o nome das permissões que os papéis da conta dão, sem repetição (papel suspenso
--      não conta, como em tem_permissao). Só para a tela esconder o que a conta não consegue usar; a RLS continua
--      protegendo os dados.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     listar_permissoes_usuario
-- Assinatura: (p_id_usuario INT) -> SETOF TEXT
-- Bloco:      [03-B]
-- Regra:      Irmã de listar_papeis_usuario (17-11-2026): o NOME das permissões que os papéis do usuário dão, sem
--             repetição, para login/refresh (03-auth) devolverem à tela. O painel usa a lista só para esconder do menu
--             e da rota a tela que a conta não consegue usar; quem protege os dados continua sendo a RLS
--             (tem_permissao, a cada consulta). Mesma regra de tem_permissao: papel com suspenso_ate no futuro não
--             concede nada. SECURITY DEFINER pelo mesmo motivo de listar_papeis_usuario: roda dentro do login, com
--             id_usuario_atual() ainda NULL.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_permissoes_usuario(p_id_usuario INT)
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT pm.nome
    FROM usuario_papel up
    JOIN papel_permissao pp ON pp.id_papel = up.id_papel
    JOIN permissao pm ON pm.id_permissao = pp.id_permissao
    WHERE up.id_usuario = p_id_usuario
      AND (up.suspenso_ate IS NULL OR up.suspenso_ate <= now())
    ORDER BY pm.nome;
$$;

GRANT EXECUTE ON FUNCTION public.listar_permissoes_usuario(INT) TO app_nestjs;

-- ============================================================================
-- GRUPO DB (18-11-2026) - "Aprovar Repasse" vira "Ver Repasses" (repasse_visualizar), também para o Revisor. IDEMPOTENTE.
-- Não precisa parar o Nest, mas suba o Nest novo junto (ele passa a conferir repasse_visualizar).
--
-- O que muda:
--   1. A permissão repasse_aprovar só servia para LER a lista de repasses (o repasse sai sozinho, pela tarefa agendada;
--      ninguém o aprova à mão). Ela troca de nome para repasse_visualizar, e quem já a tinha continua com ela.
--   2. pol_repasse_select passa a conferir o nome novo.
--   3. O Revisor (quem audita o dinheiro) ganha a permissão: vê todos os repasses, só leitura.
-- ============================================================================

UPDATE permissao SET nome = 'repasse_visualizar'
WHERE nome = 'repasse_aprovar'
  AND NOT EXISTS (SELECT 1 FROM permissao WHERE nome = 'repasse_visualizar');

DROP POLICY IF EXISTS pol_repasse_select ON repasse;
CREATE POLICY pol_repasse_select ON repasse FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('repasse_visualizar')) OR EXISTS (
        SELECT 1 FROM campanha WHERE id_campanha = repasse.id_campanha AND id_usuario = (SELECT public.id_usuario_atual())
    )
);

INSERT INTO papel_permissao (id_papel, id_permissao)
SELECT p.id_papel, pm.id_permissao
FROM papel p, permissao pm
WHERE p.codigo = 'revisor' AND pm.nome = 'repasse_visualizar'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRUPO DC (18-11-2026) - Prazo de guarda das notificações. IDEMPOTENTE.
-- Não precisa parar o Nest; suba o Nest novo depois (a tarefa diária das 3h passa a chamar a função nova; o Nest
-- antigo só não a chama).
--
-- O que muda:
--   1. Parâmetro notificacao_retencao_dias (180; 0 = guardar para sempre).
--   2. Função limpar_notificacoes_antigas(): apaga as notificações já resolvidas (enviado, falhou, cancelado) mais
--      velhas que o prazo; pendente nunca sai. Deixa uma linha de rastro em log_auditoria.
--   3. O Suporte ganha notificacao_processar: vê na tela Notificações se o e-mail saiu ou falhou e reenvia ou cancela
--      o que falhou ("não recebi o e-mail"). A descrição do papel muda junto.
-- ============================================================================
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'notificacao_retencao_dias',  '180', 'inteiro', 'Dias que os e-mails e avisos do sino já resolvidos (enviados, com falha ou cancelados) são guardados antes de serem apagados por job diário (0 = guardar para sempre; pendentes nunca são apagados)', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Função:     limpar_notificacoes_antigas
-- Assinatura: () -> INT
-- Bloco:      [05-L]
-- Regra:      Prazo de guarda das notificações (18-11-2026): apaga os e-mails e os avisos do sino já resolvidos
--             (enviado, falhou, cancelado) mais velhos que notificacao_retencao_dias (180). Pendente nunca sai: ainda
--             vai ser enviado. Valor 0 ou negativo = guardar para sempre. Deixa uma linha de rastro em log_auditoria
--             quando apaga algo, como limpar_log_auditoria. SECURITY DEFINER, chamada pelo mesmo @Cron diário, sem
--             sessão de usuário. Por quê: a tabela crescia para sempre, e o mercado guarda o histórico de envio por
--             semanas (SendGrid 30 dias, Postmark 45); aqui ela também é a caixa do sino e o registro do RF-126, por
--             isso o padrão é maior (6 meses).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.limpar_notificacoes_antigas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dias      INT;
    v_corte     TIMESTAMPTZ;
    v_apagadas  INT;
BEGIN
    v_dias := public.config_numero('notificacao_retencao_dias', 180)::INT;
    IF v_dias <= 0 THEN
        RETURN 0;
    END IF;

    v_corte := NOW() - (v_dias * INTERVAL '1 day');

    DELETE FROM notificacao
    WHERE status IN ('enviado', 'falhou', 'cancelado')
      AND criado_em < v_corte;
    GET DIAGNOSTICS v_apagadas = ROW_COUNT;

    IF v_apagadas > 0 THEN
        INSERT INTO log_auditoria (tabela, identidade_registro, operacao, id_usuario_responsavel, dados_anteriores)
        VALUES ('notificacao', 'anteriores a ' || to_char(v_corte, 'YYYY-MM-DD'), 'DELETE', NULL,
                jsonb_build_object('quantidade', v_apagadas, 'dias_retencao', v_dias, 'corte', v_corte));
    END IF;

    RETURN v_apagadas;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.limpar_notificacoes_antigas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.limpar_notificacoes_antigas() TO app_nestjs;

INSERT INTO papel_permissao (id_papel, id_permissao)
SELECT p.id_papel, pm.id_permissao
FROM papel p, permissao pm
WHERE p.codigo = 'suporte' AND pm.nome = 'notificacao_processar'
ON CONFLICT DO NOTHING;

UPDATE papel
SET descricao = 'Atende quem tem problema para entrar: desbloqueia login, reenvia a verificação de e-mail e confere se os e-mails do sistema chegaram.'
WHERE codigo = 'suporte';

-- ============================================================================
-- GRUPO DD (18-11-2026) - Login com Google. IDEMPOTENTE.
-- Cole ANTES de subir o Nest novo (ele chama entrar_com_google). O Nest antigo continua funcionando com o grupo colado.
--
-- O que muda:
--   1. usuario.senha_hash aceita NULL (a conta criada pelo Google nasce sem senha) e ganha google_sub (o "sub" do ID
--      token, único). CHECK novo: toda conta ativa tem senha, Google ou os dois.
--   2. Função entrar_com_google(sub, email, nome): entra na conta do sub, liga a conta do mesmo e-mail ou cria a
--      conta nova (e-mail confirmado, sem senha, Termo de Uso pendente). Códigos novos: 90042 e 91062.
--   3. excluir_conta_usuario passa a apagar o google_sub (LGPD).
--   4. Parâmetro sessao_painel_horas_validade (12): a sessão de uma conta do painel vale no máximo 12 horas sem uso,
--      mesmo com "Manter conectado". Sem o parâmetro, o Nest novo usa os mesmos 12.
-- ============================================================================
ALTER TABLE usuario ALTER COLUMN senha_hash DROP NOT NULL;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UK_USUARIO_GOOGLE_SUB') THEN
        ALTER TABLE usuario ADD CONSTRAINT "UK_USUARIO_GOOGLE_SUB" UNIQUE (google_sub);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_USUARIO_FORMA_DE_ENTRAR') THEN
        ALTER TABLE usuario ADD CONSTRAINT "CK_USUARIO_FORMA_DE_ENTRAR"
            CHECK (deletado OR senha_hash IS NOT NULL OR google_sub IS NOT NULL);
    END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- Função:     entrar_com_google
-- Assinatura: (p_sub TEXT, p_email TEXT, p_nome TEXT) -> INT
-- Bloco:      [03-O]
-- Regra:      Login com Google (18-11-2026). O Nest já conferiu o ID token (assinatura, audience = GOOGLE_CLIENT_ID,
--             validade e email_verified = true) e manda só o que o token diz; esta função decide a conta e devolve o
--             id dela, ou NULL quando o e-mail é de uma conta excluída (o login responde igual ao e-mail sem conta).
--               1. Conta já ligada a este sub: entra nela (mesmo que o e-mail do Google tenha mudado).
--               2. Conta com o mesmo e-mail e sem vínculo: grava o vínculo e entra. A senha não muda. Exceção: se o
--                  e-mail dessa conta nunca foi confirmado, quem criou a senha nunca provou ser dono do endereço
--                  (alguém pode ter cadastrado o e-mail de outra pessoa antes dela). O Google acaba de provar quem é
--                  o dono: a conta fica com o e-mail confirmado, a senha antiga é apagada e as sessões abertas caem.
--                  A pessoa cria uma senha nova quando quiser, pela recuperação de senha.
--               3. Conta com o mesmo e-mail ligada a OUTRA conta Google: recusa (91062).
--               4. E-mail novo: cria a conta com o e-mail já confirmado e sem senha, com o papel padrão. Sem aceite do
--                  Termo de Uso: o login devolve aceitePendente (fn_termo_uso_pendente) e a conta só usa o sistema
--                  depois de aceitar, o mesmo fluxo do RF-015.
--             Suspensão e bloqueio continuam com o Nest, como no login por senha. SEM AUTORIZAÇÃO DE PROPÓSITO
--             (pré-autenticação, como registrar_login_sucesso): os dados vêm do token conferido no Nest, nunca do
--             corpo da requisição.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.entrar_com_google(p_sub TEXT, p_email TEXT, p_nome TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email      TEXT := lower(btrim(COALESCE(p_email, '')));
    v_sub        TEXT := btrim(COALESCE(p_sub, ''));
    v_id         INT;
    v_deletado   BOOLEAN;
    v_sub_atual  TEXT;
    v_verificado BOOLEAN;
    v_nome       TEXT;
BEGIN
    IF v_sub = '' OR v_email = '' THEN
        RAISE EXCEPTION 'O Google não mandou os dados da conta (identificador e e-mail).' USING ERRCODE = '90042';
    END IF;

    SELECT id_usuario, deletado INTO v_id, v_deletado FROM usuario WHERE google_sub = v_sub;
    IF FOUND THEN
        RETURN CASE WHEN v_deletado THEN NULL ELSE v_id END;
    END IF;

    SELECT id_usuario, deletado, google_sub, email_verificado
    INTO v_id, v_deletado, v_sub_atual, v_verificado
    FROM usuario WHERE email = v_email;
    IF FOUND THEN
        IF v_deletado THEN
            RETURN NULL;
        END IF;
        IF v_sub_atual IS NOT NULL THEN
            RAISE EXCEPTION 'Este e-mail já está ligado a outra conta Google. Entre com a conta Google de sempre ou com a sua senha.'
                USING ERRCODE = '91062';
        END IF;
        IF v_verificado THEN
            UPDATE usuario SET google_sub = v_sub WHERE id_usuario = v_id;
        ELSE
            UPDATE usuario
            SET google_sub = v_sub, email_verificado = TRUE, senha_hash = NULL,
                tentativas_login_falhas = 0, bloqueado_ate = NULL
            WHERE id_usuario = v_id;
            UPDATE sessao SET revogado_em = NOW() WHERE id_usuario = v_id AND revogado_em IS NULL;
        END IF;
        RETURN v_id;
    END IF;

    v_nome := left(btrim(COALESCE(NULLIF(btrim(p_nome), ''), split_part(v_email, '@', 1))), 150);
    INSERT INTO usuario (nome, email, senha_hash, email_verificado, google_sub)
    VALUES (v_nome, v_email, NULL, TRUE, v_sub)
    RETURNING id_usuario INTO v_id;
    PERFORM public.atribuir_papel_padrao(v_id);
    RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.entrar_com_google(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrar_com_google(TEXT, TEXT, TEXT) TO app_nestjs;

-- ----------------------------------------------------------------------------
-- Função:     excluir_conta_usuario
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-O]
-- Regra:      RNF-003 (LGPD): marca deletado = TRUE e grava deletado_em/deletado_por (Art. 37: quem fez e quando).
--             Via de mão única de propósito: não existe função para reverter. O próprio usuário exclui a própria
--             conta sem permissão nenhuma; quem tem usuario_excluir (só o admin, auto-atribuída por
--             trg_admin_recebe_toda_permissao) exclui a de outra pessoa.
--             Campanhas da conta (RF-016): com campanha ATIVA a exclusão é recusada (91031); rascunho e campanha
--             aguardando aprovação que nunca foi avaliada somem junto; a que aguarda por REENVIO de uma rejeitada
--             volta a 'rejeitado' e segue o caminho normal da rejeição (o histórico dela fica). O resto (sucesso,
--             não atingido, encerrada, rejeitada) fica como está. O último admin ativo não pode ser excluído (91030).
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

    -- google_sub = NULL (18-11-2026): a conta excluída deixa de entrar pelo Google, e o identificador da conta
    -- Google não fica guardado sem uso (LGPD).
    UPDATE usuario
    SET deletado = TRUE, deletado_em = NOW(), deletado_por = public.id_usuario_atual(), google_sub = NULL
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

INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'sessao_painel_horas_validade', '12', 'inteiro',  'Contas com acesso ao painel (admin, curador, moderador, suporte, revisor): por quantas horas sem uso a sessão continua válida, mesmo com "Manter conectado" (0 = vale o prazo comum de refresh_token_dias_validade)', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- ============================================================================
-- GRUPO DE (18-11-2026) - Teto de 60 minutos do link de redefinição de senha (RF-007). IDEMPOTENTE.
-- Não precisa parar o Nest. O Nest novo também limita a 60 sozinho; o antigo continua funcionando.
--
-- O que muda:
--   1. Gatilho trg_configuracoes_faixa: recuperacao_senha_minutos_validade só aceita inteiro de 1 a 60. Fora
--      disso o painel recebe o erro 90043 com a mensagem. Código novo: 90043.
--   2. Se o valor gravado hoje passar de 60, ele desce para 60 (o padrão continua 30).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_valida_faixa_configuracoes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    -- chave, mínimo, máximo, motivo (vai na mensagem)
    v_faixas TEXT[][] := ARRAY[
        ['recuperacao_senha_minutos_validade', '1', '60', 'o link de redefinição de senha vale no máximo 1 hora']
    ];
    v_faixa TEXT[];
BEGIN
    FOREACH v_faixa SLICE 1 IN ARRAY v_faixas LOOP
        IF NEW.chave = v_faixa[1] THEN
            IF NEW.valor IS NULL OR NEW.valor !~ '^\s*\d+\s*$'
               OR btrim(NEW.valor)::NUMERIC NOT BETWEEN v_faixa[2]::NUMERIC AND v_faixa[3]::NUMERIC THEN
                RAISE EXCEPTION 'O valor de "%" precisa ser um número inteiro entre % e %: %.',
                    v_faixa[1], v_faixa[2], v_faixa[3], v_faixa[4]
                    USING ERRCODE = '90043',
                          DETAIL = json_build_object('chave', v_faixa[1], 'minimo', v_faixa[2]::INT,
                                                     'maximo', v_faixa[3]::INT)::text;
            END IF;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_configuracoes_faixa ON configuracoes;
CREATE TRIGGER trg_configuracoes_faixa
    BEFORE INSERT OR UPDATE OF chave, valor ON configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_valida_faixa_configuracoes();

UPDATE configuracoes SET valor = '60'
WHERE chave = 'recuperacao_senha_minutos_validade' AND valor ~ '^\s*\d+\s*$' AND btrim(valor)::NUMERIC > 60;

-- ============================================================================
-- GRUPO DF (21-11-2026) - Notificação "Apoio confirmado" sem o protocolo. IDEMPOTENTE.
-- Não precisa parar o Nest.
--
-- O que muda:
--   1. A notificação interna (o sino) dizia "... foi confirmado. Protocolo 50.". O protocolo é o id da contribuição
--      e não serve para quem tem conta (desiste pela Minha Conta). Sai do texto.
--   2. Só troca se o texto ainda for o original: se o admin já mudou em Configurações > Mensagens, fica como está.
--   3. O e-mail e a página de apoio confirmado continuam com o protocolo (o visitante sem conta desiste pelo
--      suporte informando esse número).
-- ============================================================================
UPDATE modelo_mensagem
SET corpo = E'Seu apoio de {{valor}} a "{{titulo}}" foi confirmado.'
WHERE tipo_evento = 'apoio_confirmado' AND canal = 'interna'
  AND corpo = E'Seu apoio de {{valor}} a "{{titulo}}" foi confirmado. Protocolo {{protocolo}}.';


-- ============================================================================
-- GRUPO DG (21-11-2026) - Campanha aguardando aprovação não pode ser alterada. IDEMPOTENTE.
-- Não precisa parar o Nest. Código novo: 91063.
--
-- O que muda:
--   1. fn_campanha_campos_bloqueados: em 'aguardando_aprovacao' trava título, descrição, meta, modelo, datas, área,
--      vídeo e capa. A mesma lista vai para GET /campanha/:id (camposBloqueados), então a tela já mostra travado.
--   2. fn_congela_regras_campanha: mudar um desses campos com a campanha aguardando aprovação dá 91063.
--   3. fn_congela_orcamento_campanha e fn_congela_marco_cronograma: incluir, alterar ou excluir item de orçamento ou
--      marco de cronograma de campanha aguardando aprovação dá 91063.
--   Aprovar e rejeitar continuam: mudam só status, aprovado_em e quem decidiu, e a taxa é carimbada pela aprovação.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_campanha_campos_bloqueados(p public.campanha)
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN p.status = 'rejeitado' AND public.fn_campanha_reenvios_esgotados(p.id_campanha) THEN
            ARRAY['titulo', 'descricao', 'meta_financeira', 'modelo', 'data_inicio', 'data_fim',
                  'id_area_conhecimento', 'video_apresentacao_url', 'id_imagem_capa']
        -- Aguardando aprovação (21-11-2026): nada muda enquanto a curadoria analisa, para ela aprovar o que leu. A taxa
        -- fica de fora: é a aprovação que a carimba (fn_carimba_taxa_plataforma_aprovacao).
        WHEN p.status = 'aguardando_aprovacao' THEN
            ARRAY['titulo', 'descricao', 'meta_financeira', 'modelo', 'data_inicio', 'data_fim',
                  'id_area_conhecimento', 'video_apresentacao_url', 'id_imagem_capa']
        WHEN public.fn_status_pos_aprovacao(p.status) THEN
            ARRAY['meta_financeira', 'modelo', 'taxa_plataforma', 'titulo', 'descricao',
                  'video_apresentacao_url', 'id_area_conhecimento']
            || CASE WHEN p.data_inicio IS NOT NULL AND p.data_inicio <= NOW()
                    THEN ARRAY['data_fim', 'data_inicio'] ELSE ARRAY[]::TEXT[] END
        ELSE ARRAY[]::TEXT[]
    END;
$$;

CREATE OR REPLACE FUNCTION fn_congela_regras_campanha()
RETURNS TRIGGER AS $$
DECLARE
    v_campo TEXT;
    v_erro  RECORD;
BEGIN
    -- A lista de campos travados e o código/mensagem de cada um moram em fn_campanha_campos_bloqueados e
    -- fn_campanha_erro_congelamento (a mesma lista alimenta GET /campanha/:id). A comparação usa to_jsonb, que
    -- trata NULL como o IS DISTINCT FROM de antes (taxa_plataforma e data_inicio são nullable).
    FOREACH v_campo IN ARRAY public.fn_campanha_campos_bloqueados(OLD) LOOP
        IF (to_jsonb(NEW) -> v_campo) IS DISTINCT FROM (to_jsonb(OLD) -> v_campo) THEN
            IF OLD.status = 'aguardando_aprovacao' THEN
                RAISE EXCEPTION 'Campanha enviada para aprovação: não pode ser alterada enquanto a curadoria analisa.'
                    USING ERRCODE = '91063';
            END IF;
            SELECT * INTO v_erro FROM public.fn_campanha_erro_congelamento(v_campo, OLD.status = 'rejeitado');
            RAISE EXCEPTION '%', v_erro.mensagem USING ERRCODE = v_erro.errcode;
        END IF;
    END LOOP;

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

    IF public.fn_status_pos_aprovacao(v_status) THEN
        RAISE EXCEPTION 'Fraude bloqueada: não é permitido alterar o orçamento após a aprovação da campanha.'
            USING ERRCODE = '91011';
    END IF;

    -- Aguardando aprovação (21-11-2026): a curadoria aprova o orçamento que leu (mesmo código da campanha).
    IF v_status = 'aguardando_aprovacao' THEN
        RAISE EXCEPTION 'Campanha enviada para aprovação: o orçamento não pode ser alterado enquanto a curadoria analisa.'
            USING ERRCODE = '91063';
    END IF;

    -- Rejeitada sem reenvios é só leitura, ver fn_campanha_reenvios_esgotados. Na exclusão da própria campanha
    -- (cascata, expirar_campanhas_rejeitadas) v_status vem NULL, porque a linha-pai já sumiu, e o bloqueio não se
    -- aplica: é o que deixa a expiração apagar.
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

    IF public.fn_status_pos_aprovacao(v_status)
       AND v_data_inicio IS NOT NULL AND v_data_inicio <= NOW() THEN
        RAISE EXCEPTION 'Operação bloqueada: o cronograma não pode ser alterado depois que a campanha começa de verdade.'
            USING ERRCODE = '91013';
    END IF;

    -- Aguardando aprovação (21-11-2026): a curadoria aprova o cronograma que leu (mesmo código da campanha).
    IF v_status = 'aguardando_aprovacao' THEN
        RAISE EXCEPTION 'Campanha enviada para aprovação: o cronograma não pode ser alterado enquanto a curadoria analisa.'
            USING ERRCODE = '91063';
    END IF;

    -- Mesmo bloqueio de fn_congela_orcamento_campanha (ver comentário lá, inclusive sobre v_status NULL na
    -- cascata de exclusão).
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


-- ============================================================================
-- GRUPO DH (21-11-2026) - Motivo da exclusão de atualização pela moderação. IDEMPOTENTE.
-- Cole ANTES de subir o Nest novo (ele lê a coluna nova). Código novo: 90044.
--
-- O que muda:
--   1. Coluna atualizacao_campanha.motivo_moderacao (texto, até 1000 caracteres).
--   2. fn_atualizacao_ocultacao: a moderação só exclui (mantendo o registro) com o motivo escrito (90044). Depois o
--      motivo não muda; some se a atualização voltar ao ar. O dono vê o motivo no Estúdio, clicando na pílula Excluída.
--   As excluídas antes deste grupo ficam sem motivo: o Estúdio avisa que ele não foi registrado.
-- ============================================================================
ALTER TABLE atualizacao_campanha ADD COLUMN IF NOT EXISTS motivo_moderacao TEXT;

ALTER TABLE atualizacao_campanha DROP CONSTRAINT IF EXISTS "CK_ATUALIZACAO_CAMPANHA_MOTIVO_TAMANHO";
ALTER TABLE atualizacao_campanha ADD CONSTRAINT "CK_ATUALIZACAO_CAMPANHA_MOTIVO_TAMANHO" CHECK (char_length(motivo_moderacao) <= 1000);

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

    IF NEW.ocultada_moderacao AND NOT OLD.ocultada_moderacao THEN
        NEW.motivo_moderacao := NULLIF(btrim(NEW.motivo_moderacao), '');
        IF NEW.motivo_moderacao IS NULL THEN
            RAISE EXCEPTION 'Informe o motivo da exclusão: o pesquisador vê esse texto no Estúdio.'
                USING ERRCODE = '90044';
        END IF;
    ELSIF NEW.ocultada_moderacao THEN
        NEW.motivo_moderacao := OLD.motivo_moderacao;
    ELSE
        NEW.motivo_moderacao := NULL;
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================================
-- GRUPO DI (21-11-2026) - Atualização excluída pela moderação ou de campanha encerrada não pode ser alterada. IDEMPOTENTE.
-- Não precisa parar o Nest. Código novo: 91064.
--
-- O que muda:
--   1. fn_atualizacao_trava_edicao + 3 triggers: título, texto, fase e formato de uma atualização, e os anexos dela
--      (links e arquivos), não mudam se a moderação excluiu a atualização ou se a campanha está fora de ativa, sucesso
--      ou não atingida (a mesma regra de criar). Antes, o dono editava o texto de uma excluída pela moderação.
--   2. Ocultar e mostrar de novo continuam como estavam (fn_atualizacao_ocultacao).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função:     fn_atualizacao_trava_edicao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      21-11-2026 (teste com usuários): o conteúdo de uma atualização (título, texto, fase, formato) e os anexos
--             dela só mudam enquanto ela pode ser publicada: não depois que a moderação a excluiu (senão o pesquisador
--             reescreveria o que foi tirado do ar) e não com a campanha fora de 'ativo', 'sucesso' ou 'nao_atingido' (a
--             mesma regra de criar, validar_atualizacao_campanha). Os dois dão 91064. Ocultar e mostrar de novo
--             (ativo) não passam por aqui: seguem fn_atualizacao_ocultacao. Na tabela de anexos, roda em INSERT, UPDATE
--             e DELETE; se a atualização-pai já não existe (exclusão de vez, em cascata), não há o que travar.
--             SECURITY DEFINER: lê a situação da campanha sem a RLS de quem edita.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_atualizacao_trava_edicao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id_atualizacao INT;
    v_ocultada       BOOLEAN;
    v_status         status_campanha;
BEGIN
    IF TG_TABLE_NAME = 'atualizacao_campanha' THEN
        IF NEW.titulo IS NOT DISTINCT FROM OLD.titulo AND NEW.conteudo IS NOT DISTINCT FROM OLD.conteudo
           AND NEW.fase IS NOT DISTINCT FROM OLD.fase AND NEW.tipo IS NOT DISTINCT FROM OLD.tipo THEN
            RETURN NEW;
        END IF;
        v_id_atualizacao := OLD.id_atualizacao;
    ELSIF TG_OP = 'DELETE' THEN
        v_id_atualizacao := OLD.id_atualizacao;
    ELSE
        v_id_atualizacao := NEW.id_atualizacao;
    END IF;

    SELECT a.ocultada_moderacao, c.status INTO v_ocultada, v_status
    FROM atualizacao_campanha a
    JOIN campanha c ON c.id_campanha = a.id_campanha
    WHERE a.id_atualizacao = v_id_atualizacao;

    IF FOUND THEN
        IF v_ocultada THEN
            RAISE EXCEPTION 'Esta atualização foi excluída pela moderação e não pode mais ser alterada.'
                USING ERRCODE = '91064';
        END IF;
        IF v_status NOT IN ('ativo', 'sucesso', 'nao_atingido') THEN
            RAISE EXCEPTION 'A campanha está encerrada ou fora do ar: as atualizações dela não podem mais ser alteradas.'
                USING ERRCODE = '91064';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Triggers:  trg_atualizacao_trava_edicao, trg_link_atualizacao_trava_edicao, trg_arquivo_atualizacao_trava_edicao
-- Momento:   BEFORE UPDATE (atualização) e BEFORE INSERT OR UPDATE OR DELETE (anexos)
-- Função:    fn_atualizacao_trava_edicao()
-- Bloco:     [05-K-2]
-- Regra:     Conteúdo e anexos de atualização excluída pela moderação ou de campanha encerrada não mudam (91064).
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_atualizacao_trava_edicao ON atualizacao_campanha;
CREATE TRIGGER trg_atualizacao_trava_edicao
BEFORE UPDATE ON atualizacao_campanha
FOR EACH ROW
EXECUTE FUNCTION public.fn_atualizacao_trava_edicao();

DROP TRIGGER IF EXISTS trg_link_atualizacao_trava_edicao ON link_atualizacao;
CREATE TRIGGER trg_link_atualizacao_trava_edicao
BEFORE INSERT OR UPDATE OR DELETE ON link_atualizacao
FOR EACH ROW
EXECUTE FUNCTION public.fn_atualizacao_trava_edicao();

DROP TRIGGER IF EXISTS trg_arquivo_atualizacao_trava_edicao ON arquivo_atualizacao;
CREATE TRIGGER trg_arquivo_atualizacao_trava_edicao
BEFORE INSERT OR UPDATE OR DELETE ON arquivo_atualizacao
FOR EACH ROW
EXECUTE FUNCTION public.fn_atualizacao_trava_edicao();


-- ============================================================================
-- GRUPO DJ (21-11-2026) - Comentário excluído pelo dono fica guardado (exclusão lógica). IDEMPOTENTE.
-- Cole ANTES de subir o Nest novo (ele grava a coluna nova). Códigos novos: 91065 e 92046.
--
-- O que muda:
--   1. Coluna comentario.bloqueado. Os comentários que já estão fora do ar ficam bloqueados (era o que acontecia
--      até hoje: só o "Excluir e bloquear" deixava o comentário guardado).
--   2. "Um comentário por campanha" passa a contar só o que está no ar ou bloqueado (índice único parcial): o
--      comentário que o dono só excluiu fica guardado e o autor pode comentar de novo.
--   3. fn_comentario_bloqueio: autor bloqueado não comenta (91065); só o dono ou a moderação bloqueia (92046).
--   4. Apagar de vez: só a moderação (antes, o dono da campanha apagava o comentário do banco no "Excluir").
-- ============================================================================
ALTER TABLE comentario ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE comentario SET bloqueado = TRUE WHERE ativo = FALSE AND bloqueado = FALSE;

ALTER TABLE comentario DROP CONSTRAINT IF EXISTS "UK_COMENTARIO_CAMPANHA_PESQUISADOR";
DROP INDEX IF EXISTS "UK_COMENTARIO_CAMPANHA_PESQUISADOR";
CREATE UNIQUE INDEX "UK_COMENTARIO_CAMPANHA_PESQUISADOR" ON comentario(id_campanha, id_pesquisador) WHERE ativo OR bloqueado;

-- Apagar de vez: só a moderação (21-11-2026, decisão do Lucas: "só a administração apaga de vez"). O dono da campanha
-- exclui e bloqueia com exclusão lógica (UPDATE de ativo e bloqueado): o comentário fica guardado para a moderação.
DROP POLICY IF EXISTS pol_comentario_delete ON comentario;
CREATE POLICY pol_comentario_delete ON comentario FOR DELETE TO app_nestjs USING (
    (SELECT public.tem_permissao('comentario_moderar'))
);

-- ----------------------------------------------------------------------------
-- Função:     fn_comentario_bloqueio
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      21-11-2026. O dono da campanha tem dois jeitos de tirar um comentário, os dois lógicos (o comentário fica
--             guardado para a moderação): "Excluir" (ativo = FALSE; o autor pode comentar de novo) e "Excluir e
--             bloquear" (ativo = FALSE e bloqueado = TRUE; o autor não comenta mais nesta campanha). Aqui:
--               - INSERT: autor bloqueado nesta campanha não comenta (91065), e ninguém nasce bloqueado;
--               - UPDATE de bloqueado: só o dono da campanha ou a moderação (92046); bloquear sempre tira do ar;
--                 voltar ao ar (só a moderação, fn_bloqueia_reversao_moderacao_comentario) tira o bloqueio.
--             SECURITY DEFINER: lê o dono da campanha e o bloqueio sem a RLS de quem comenta.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_comentario_bloqueio()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.bloqueado := FALSE;
        IF EXISTS (
            SELECT 1 FROM comentario
            WHERE id_campanha = NEW.id_campanha AND id_pesquisador = NEW.id_pesquisador AND bloqueado
        ) THEN
            RAISE EXCEPTION 'O dono desta campanha bloqueou novos comentários seus nela.'
                USING ERRCODE = '91065';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.bloqueado IS DISTINCT FROM OLD.bloqueado
       AND NOT public.tem_permissao('comentario_moderar')
       AND NOT EXISTS (
           SELECT 1 FROM campanha WHERE id_campanha = NEW.id_campanha AND id_usuario = public.id_usuario_atual()
       ) THEN
        RAISE EXCEPTION 'Só o dono da campanha ou a moderação bloqueia ou desbloqueia o autor de um comentário.'
            USING ERRCODE = '92046';
    END IF;

    IF NEW.bloqueado THEN
        NEW.ativo := FALSE;
    END IF;
    IF NEW.ativo AND NOT OLD.ativo THEN
        NEW.bloqueado := FALSE;
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger:   trg_comentario_bloqueio
-- Tabela:    comentario
-- Momento:   BEFORE INSERT OR UPDATE
-- Função:    fn_comentario_bloqueio()
-- Bloco:     [05-K-3]
-- Regra:     Autor bloqueado não comenta de novo; só o dono ou a moderação mexe no bloqueio.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comentario_bloqueio ON comentario;
CREATE TRIGGER trg_comentario_bloqueio
BEFORE INSERT OR UPDATE ON comentario
FOR EACH ROW
EXECUTE FUNCTION public.fn_comentario_bloqueio();
