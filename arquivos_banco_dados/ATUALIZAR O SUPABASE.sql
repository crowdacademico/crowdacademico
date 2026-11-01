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
