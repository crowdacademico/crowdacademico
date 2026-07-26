-- ============================================================
--  CrowdAcadêmico — 04: ROW LEVEL SECURITY (RLS) E POLICIES
--  Depende de: 01_extensoes_enums_tabelas.sql, 03_funcoes_seguranca.sql
--  Próximo arquivo: 05_regras_negocio.sql
-- ============================================================

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — COMPLETO
-- ============================================================

-- Habilitar RLS em TODAS as tabelas
-- COMENTÁRIO DE ALTERAÇÃO:
-- Ativamos FORCE ROW LEVEL SECURITY nas tabelas principais para garantir
-- que a proteção não seja contornada pelo próprio dono da tabela. Isso
-- reforça o enforcement da RLS mesmo em cenários de desenvolvimento local.

-- ============================================================
-- [04-B] RBAC (3 tabelas)
-- ============================================================
ALTER TABLE papel                ENABLE ROW LEVEL SECURITY;
ALTER TABLE papel                FORCE ROW LEVEL SECURITY;
ALTER TABLE permissao            ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissao            FORCE ROW LEVEL SECURITY;
ALTER TABLE papel_permissao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE papel_permissao      FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_papel_select ON papel;
CREATE POLICY pol_papel_select ON papel FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_permissao_select ON permissao;
CREATE POLICY pol_permissao_select ON permissao FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_papelperm_select ON papel_permissao;
CREATE POLICY pol_papelperm_select ON papel_permissao FOR SELECT USING (true);

-- ============================================================
-- [04-C] CONFIG (5 tabelas)
-- ============================================================
ALTER TABLE configuracoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes        FORCE ROW LEVEL SECURITY;
ALTER TABLE tipo_link            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_link            FORCE ROW LEVEL SECURITY;
ALTER TABLE area_conhecimento    ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_conhecimento    FORCE ROW LEVEL SECURITY;
ALTER TABLE motivo_denuncia      ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivo_denuncia      FORCE ROW LEVEL SECURITY;
ALTER TABLE arquivo              ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivo              FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_config_select ON configuracoes;
CREATE POLICY pol_config_select ON configuracoes FOR SELECT TO app_nestjs USING (id_usuario IS NULL OR id_usuario = public.id_usuario_atual());
-- ADICIONADO: configuracoes tinha só policy de SELECT — nenhuma escrita era
-- possível via RLS (nem pra config de sistema, nem pra preferência de
-- usuário), e a permissão configuracao_gerenciar, já seedada, não era usada
-- em lugar nenhum. Segue o mesmo critério do SELECT: linha de sistema
-- (id_usuario NULL) só quem tem configuracao_gerenciar mexe; linha de
-- preferência do próprio usuário (id_usuario = dono) ele mesmo mexe.
DROP POLICY IF EXISTS pol_config_insert ON configuracoes;
CREATE POLICY pol_config_insert ON configuracoes FOR INSERT TO app_nestjs WITH CHECK (
    (id_usuario IS NULL AND public.tem_permissao('configuracao_gerenciar'))
    OR id_usuario = public.id_usuario_atual()
);
DROP POLICY IF EXISTS pol_config_update ON configuracoes;
CREATE POLICY pol_config_update ON configuracoes FOR UPDATE TO app_nestjs USING (
    (id_usuario IS NULL AND public.tem_permissao('configuracao_gerenciar'))
    OR id_usuario = public.id_usuario_atual()
) WITH CHECK (
    (id_usuario IS NULL AND public.tem_permissao('configuracao_gerenciar'))
    OR id_usuario = public.id_usuario_atual()
);
DROP POLICY IF EXISTS pol_config_delete ON configuracoes;
CREATE POLICY pol_config_delete ON configuracoes FOR DELETE TO app_nestjs USING (
    (id_usuario IS NULL AND public.tem_permissao('configuracao_gerenciar'))
    OR id_usuario = public.id_usuario_atual()
);

DROP POLICY IF EXISTS pol_area_select ON area_conhecimento;
CREATE POLICY pol_area_select ON area_conhecimento FOR SELECT USING (true);
-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos policies de escrita para area_conhecimento para que a gestão
-- de catálogos funcione corretamente junto com o GRANT já concedido.
DROP POLICY IF EXISTS pol_area_insert ON area_conhecimento;
CREATE POLICY pol_area_insert ON area_conhecimento FOR INSERT TO app_nestjs WITH CHECK (public.tem_permissao('area_conhecimento_gerenciar'));
DROP POLICY IF EXISTS pol_area_update ON area_conhecimento;
CREATE POLICY pol_area_update ON area_conhecimento FOR UPDATE TO app_nestjs USING (public.tem_permissao('area_conhecimento_gerenciar')) WITH CHECK (public.tem_permissao('area_conhecimento_gerenciar'));

DROP POLICY IF EXISTS pol_tipolink_select ON tipo_link;
CREATE POLICY pol_tipolink_select ON tipo_link FOR SELECT USING (true);
-- ADICIONADO: cadastro e edição de tipos de link passam a depender de permissão específica para gestão administrativa.
DROP POLICY IF EXISTS pol_tipolink_insert ON tipo_link;
CREATE POLICY pol_tipolink_insert ON tipo_link FOR INSERT TO app_nestjs WITH CHECK (public.tem_permissao('tipolink_gerenciar'));
DROP POLICY IF EXISTS pol_tipolink_update ON tipo_link;
CREATE POLICY pol_tipolink_update ON tipo_link FOR UPDATE TO app_nestjs USING (public.tem_permissao('tipolink_gerenciar')) WITH CHECK (public.tem_permissao('tipolink_gerenciar'));

DROP POLICY IF EXISTS pol_motivo_select ON motivo_denuncia;
CREATE POLICY pol_motivo_select ON motivo_denuncia FOR SELECT USING (true);
-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos policies de escrita para motivo_denuncia para completar a
-- correção iniciada no GRANT de tabela e garantir que o fluxo de curadoria
-- funcione com o RBAC esperado.
DROP POLICY IF EXISTS pol_motivo_insert ON motivo_denuncia;
CREATE POLICY pol_motivo_insert ON motivo_denuncia FOR INSERT TO app_nestjs WITH CHECK (public.tem_permissao('motivo_denuncia_gerenciar'));
DROP POLICY IF EXISTS pol_motivo_update ON motivo_denuncia;
CREATE POLICY pol_motivo_update ON motivo_denuncia FOR UPDATE TO app_nestjs USING (public.tem_permissao('motivo_denuncia_gerenciar')) WITH CHECK (public.tem_permissao('motivo_denuncia_gerenciar'));

DROP POLICY IF EXISTS pol_arquivo_select ON arquivo;
CREATE POLICY pol_arquivo_select ON arquivo FOR SELECT USING (TRUE);
-- CORRIGIDO: o primeiro passo do upload de arquivo fica liberado; a posse real é garantida ao vincular em arquivo_atualizacao/arquivo_recompensa.
DROP POLICY IF EXISTS pol_arquivo_insert ON arquivo;
CREATE POLICY pol_arquivo_insert ON arquivo FOR INSERT TO app_nestjs WITH CHECK (TRUE);
DROP POLICY IF EXISTS pol_arquivo_update ON arquivo;
CREATE POLICY pol_arquivo_update ON arquivo FOR UPDATE TO app_nestjs USING (
    public.tem_permissao('arquivo_gerenciar')
    OR EXISTS (
        SELECT 1 FROM usuario u
        WHERE u.id_usuario = public.id_usuario_atual()
          AND u.id_imagem_perfil = arquivo.id_arquivo
    )
    OR EXISTS (
        SELECT 1 FROM arquivo_atualizacao aa
        JOIN atualizacao_campanha ac ON ac.id_atualizacao = aa.id_atualizacao
        JOIN campanha c ON c.id_campanha = ac.id_campanha
        WHERE aa.id_arquivo = arquivo.id_arquivo
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('atualizacao_moderar'))
    )
    OR EXISTS (
        SELECT 1 FROM arquivo_recompensa ar
        JOIN recompensa r ON r.id_recompensa = ar.id_recompensa
        JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE ar.id_arquivo = arquivo.id_arquivo
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
);

-- ============================================================
-- [04-D] USUÁRIO (10 tabelas)
-- ============================================================
ALTER TABLE usuario              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario              FORCE ROW LEVEL SECURITY;
ALTER TABLE perfil_pesquisador   ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_pesquisador   FORCE ROW LEVEL SECURITY;
ALTER TABLE usuario_papel        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_papel        FORCE ROW LEVEL SECURITY;
ALTER TABLE termos_de_uso        ENABLE ROW LEVEL SECURITY;
ALTER TABLE termos_de_uso        FORCE ROW LEVEL SECURITY;
ALTER TABLE usuario_termo        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_termo        FORCE ROW LEVEL SECURITY;
ALTER TABLE notificacao          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacao          FORCE ROW LEVEL SECURITY;

-- ============================================================
-- RLS destas três tabelas
-- ============================================================
-- CORRIGIDO: a versão anterior deixava RLS ligada e SEM NENHUMA
-- policy, presumindo que só um role com BYPASSRLS (ex.: service_role
-- do Supabase) acessaria estas tabelas. Esse role não existe mais
-- no projeto — o NestJS conecta como "app_nestjs" (role normal, sem
-- bypass), então RLS sem policy bloquearia 100% do acesso e quebraria
-- verificação de e-mail, recuperação de senha e sessão inteiras.
--
-- Além disso, boa parte desses fluxos acontece ANTES do usuário estar
-- autenticado (confirmar e-mail, "esqueci minha senha") — não dá pra
-- restringir por id_usuario_atual(), porque ainda não existe sessão.
-- Quem valida a posse do token (comparando o hash) é o próprio NestJS
-- na aplicação; a policy aqui só garante que NENHUM outro role além
-- de app_nestjs consegue tocar nessas tabelas.
ALTER TABLE verificacao_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE verificacao_email FORCE ROW LEVEL SECURITY;
ALTER TABLE recuperacao_senha ENABLE ROW LEVEL SECURITY;
ALTER TABLE recuperacao_senha FORCE ROW LEVEL SECURITY;
ALTER TABLE sessao            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessao            FORCE ROW LEVEL SECURITY;

-- ADICIONADO: DROP POLICY IF EXISTS pra permitir reexecução segura do
-- script num banco que já tenha essas 3 policies criadas.
DROP POLICY IF EXISTS pol_verificacao_email_all ON verificacao_email;
CREATE POLICY pol_verificacao_email_all ON verificacao_email
    FOR ALL TO app_nestjs USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pol_recuperacao_senha_all ON recuperacao_senha;
CREATE POLICY pol_recuperacao_senha_all ON recuperacao_senha
    FOR ALL TO app_nestjs USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pol_sessao_all ON sessao;
CREATE POLICY pol_sessao_all ON sessao
    FOR ALL TO app_nestjs USING (true) WITH CHECK (true);

ALTER TABLE seguir_pesquisador   ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguir_pesquisador   FORCE ROW LEVEL SECURITY;

-- CORRIGIDO: usuário agora fica invisível quando marcado como deletado, salvo para admin.
DROP POLICY IF EXISTS pol_usuario_select ON usuario;
CREATE POLICY pol_usuario_select ON usuario FOR SELECT TO app_nestjs USING (deletado = FALSE OR public.tem_permissao('usuario_visualizar_sensivel'));
-- ADICIONADO: faltava a policy de INSERT em usuario. O fluxo de signup
-- (08_trigger_signup_usuario.sql) já prevê o NestJS inserindo direto em
-- usuario dentro da própria transação, antes de existir qualquer sessão
-- — não há id_usuario_atual() pra checar nesse momento, então WITH
-- CHECK(true) é a única condição possível aqui; e-mail duplicado já é
-- barrado pelo UNIQUE em usuario.email (01), e validação de formato/força
-- de senha é responsabilidade do NestJS antes do INSERT.
DROP POLICY IF EXISTS pol_usuario_insert ON usuario;
CREATE POLICY pol_usuario_insert ON usuario FOR INSERT TO app_nestjs WITH CHECK (true);
-- CORRIGIDO: suspensão de usuário passa a aceitar permissão específica além do próprio dono.
DROP POLICY IF EXISTS pol_usuario_update ON usuario;
CREATE POLICY pol_usuario_update ON usuario FOR UPDATE TO app_nestjs USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('usuario_suspender'));

-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos a policy de INSERT em perfil_pesquisador para permitir o fluxo
-- de upgrade de usuário cadastrado para pesquisador. Sem essa policy, a RLS
-- bloqueia a operação mesmo com o GRANT de tabela em 06_grants.sql.
DROP POLICY IF EXISTS pol_perfil_select ON perfil_pesquisador;
CREATE POLICY pol_perfil_select ON perfil_pesquisador FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_perfil_insert ON perfil_pesquisador;
CREATE POLICY pol_perfil_insert ON perfil_pesquisador FOR INSERT TO app_nestjs WITH CHECK (
    id_usuario = public.id_usuario_atual()
);
DROP POLICY IF EXISTS pol_perfil_update ON perfil_pesquisador;
CREATE POLICY pol_perfil_update ON perfil_pesquisador FOR UPDATE TO app_nestjs USING (id_usuario = public.id_usuario_atual());

-- usuario_papel
DROP POLICY IF EXISTS pol_usuariopapel_select ON usuario_papel;
CREATE POLICY pol_usuariopapel_select ON usuario_papel FOR SELECT TO app_nestjs USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('papel_gerenciar'));
DROP POLICY IF EXISTS pol_usuariopapel_insert ON usuario_papel;
CREATE POLICY pol_usuariopapel_insert ON usuario_papel FOR INSERT TO app_nestjs WITH CHECK (public.tem_permissao('papel_atribuir'));
-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos a policy de DELETE para usuario_papel para permitir que o
-- painel revogue papéis atribuídos sem depender de um bypass de RLS.
DROP POLICY IF EXISTS pol_usuariopapel_delete ON usuario_papel;
CREATE POLICY pol_usuariopapel_delete ON usuario_papel FOR DELETE TO app_nestjs USING (public.tem_permissao('papel_gerenciar'));

-- termos_de_uso: leitura pública (precisa ser lido até por quem ainda
-- não tem conta, na tela de cadastro); só admin cria/edita uma versão.
DROP POLICY IF EXISTS pol_termos_select ON termos_de_uso;
CREATE POLICY pol_termos_select ON termos_de_uso FOR SELECT TO app_nestjs USING (true);
-- CORRIGIDO: gestão de termos de uso passa a depender de permissão específica.
DROP POLICY IF EXISTS pol_termos_insert ON termos_de_uso;
CREATE POLICY pol_termos_insert ON termos_de_uso FOR INSERT TO app_nestjs WITH CHECK (public.tem_permissao('termos_uso_gerenciar'));
DROP POLICY IF EXISTS pol_termos_update ON termos_de_uso;
CREATE POLICY pol_termos_update ON termos_de_uso FOR UPDATE TO app_nestjs USING (public.tem_permissao('termos_uso_gerenciar'));

-- usuario_termo: cada usuário só vê e registra o próprio aceite.
-- Sem política de UPDATE/DELETE: aceite é um registro de auditoria,
-- não deve ser alterável por ninguém (nem pelo próprio usuário).
DROP POLICY IF EXISTS pol_usuario_termo_select ON usuario_termo;
CREATE POLICY pol_usuario_termo_select ON usuario_termo FOR SELECT TO app_nestjs USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('usuario_visualizar_sensivel'));
DROP POLICY IF EXISTS pol_usuario_termo_insert ON usuario_termo;
CREATE POLICY pol_usuario_termo_insert ON usuario_termo FOR INSERT TO app_nestjs WITH CHECK (id_usuario = public.id_usuario_atual());

-- notificacao: leitura das próprias notificações e escrita controlada pelo
-- backend da aplicação. Como agora o projeto não depende de service_role
-- para ignorar RLS, adicionamos políticas de INSERT/UPDATE mínimas para
-- permitir a criação e atualização de notificações sem abrir o acesso para
-- qualquer usuário falsificar registros.
DROP POLICY IF EXISTS pol_notificacao_select ON notificacao;
CREATE POLICY pol_notificacao_select ON notificacao FOR SELECT TO app_nestjs USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('usuario_visualizar_sensivel'));
DROP POLICY IF EXISTS pol_notificacao_insert ON notificacao;
CREATE POLICY pol_notificacao_insert ON notificacao FOR INSERT TO app_nestjs WITH CHECK (id_usuario = public.id_usuario_atual());
DROP POLICY IF EXISTS pol_notificacao_update ON notificacao;
CREATE POLICY pol_notificacao_update ON notificacao FOR UPDATE TO app_nestjs USING (id_usuario = public.id_usuario_atual()) WITH CHECK (id_usuario = public.id_usuario_atual());

DROP POLICY IF EXISTS pol_seg_pesq_select ON seguir_pesquisador;
CREATE POLICY pol_seg_pesq_select ON seguir_pesquisador FOR SELECT TO app_nestjs USING (id_usuario = public.id_usuario_atual());
DROP POLICY IF EXISTS pol_seg_pesq_insert ON seguir_pesquisador;
CREATE POLICY pol_seg_pesq_insert ON seguir_pesquisador FOR INSERT TO app_nestjs WITH CHECK (id_usuario = public.id_usuario_atual());
DROP POLICY IF EXISTS pol_seg_pesq_delete ON seguir_pesquisador;
CREATE POLICY pol_seg_pesq_delete ON seguir_pesquisador FOR DELETE TO app_nestjs USING (id_usuario = public.id_usuario_atual());

-- ============================================================
-- [04-E] CAMPANHA (9 tabelas)
-- ============================================================
ALTER TABLE campanha             ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha             FORCE ROW LEVEL SECURITY;
ALTER TABLE atualizacao_campanha ENABLE ROW LEVEL SECURITY;
ALTER TABLE atualizacao_campanha FORCE ROW LEVEL SECURITY;
ALTER TABLE comentario           ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentario           FORCE ROW LEVEL SECURITY;
ALTER TABLE denuncia             ENABLE ROW LEVEL SECURITY;
ALTER TABLE denuncia             FORCE ROW LEVEL SECURITY;
ALTER TABLE recompensa           ENABLE ROW LEVEL SECURITY;
ALTER TABLE recompensa           FORCE ROW LEVEL SECURITY;
ALTER TABLE seguir_campanha      ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguir_campanha      FORCE ROW LEVEL SECURITY;
ALTER TABLE solicitacao_encerramento ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacao_encerramento FORCE ROW LEVEL SECURITY;
ALTER TABLE historico_rejeicao   ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_rejeicao   FORCE ROW LEVEL SECURITY;
ALTER TABLE repasse              ENABLE ROW LEVEL SECURITY;
ALTER TABLE repasse              FORCE ROW LEVEL SECURITY;

-- CORRIGIDO: campanhas públicas agora expõem apenas os status permitidos, preservando as demais para dono/admin.
DROP POLICY IF EXISTS pol_campanha_select ON campanha;
CREATE POLICY pol_campanha_select ON campanha FOR SELECT USING (
    status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
    OR id_usuario = public.id_usuario_atual()
    OR public.tem_permissao('relatorio_visualizar')
);
DROP POLICY IF EXISTS pol_campanha_insert ON campanha;
CREATE POLICY pol_campanha_insert ON campanha FOR INSERT TO app_nestjs WITH CHECK (id_usuario = public.id_usuario_atual());
-- CORRIGIDO: edição administrativa de campanha passa a depender de permissão específica, preservando a regra de dono da campanha.
-- CORRIGIDO: campanha_aprovar e campanha_rejeitar estavam seedadas mas
-- não usadas em policy nenhuma — só campanha_editar liberava UPDATE em
-- campanha, então um papel com só "aprovar" ou só "rejeitar" (sem o
-- "editar" genérico) não conseguia de fato aprovar/rejeitar nada. A RLS
-- de linha não distingue qual coluna está sendo alterada (isso exigiria
-- um trigger comparando OLD/NEW), então na prática qualquer uma das três
-- permissões libera o UPDATE — a app decide, por regra de negócio, quais
-- campos cada fluxo (aprovar/rejeitar/editar) de fato manda alterar.
DROP POLICY IF EXISTS pol_campanha_update ON campanha;
CREATE POLICY pol_campanha_update ON campanha FOR UPDATE TO app_nestjs USING (
    id_usuario = public.id_usuario_atual()
    OR public.tem_permissao('campanha_editar')
    OR public.tem_permissao('campanha_aprovar')
    OR public.tem_permissao('campanha_rejeitar')
);

-- atualizacao_campanha
-- CORRIGIDO: atualização inativa (ocultada por moderação) só continua
-- visível para o dono da campanha ou admin; o público só vê as ativas.
DROP POLICY IF EXISTS pol_atualizacao_select ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_select ON atualizacao_campanha FOR SELECT USING (
    ativo = TRUE
    OR EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND (id_usuario = public.id_usuario_atual() OR public.tem_permissao('atualizacao_moderar')))
);
DROP POLICY IF EXISTS pol_atualizacao_insert ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_insert ON atualizacao_campanha FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND id_usuario = public.id_usuario_atual())
);
-- CORRIGIDO: dono da campanha continua podendo editar o conteúdo da própria
-- atualização; ocultar (moderar) uma atualização de terceiro passa a exigir
-- a permissão específica atualizacao_moderar em vez do antigo eh_admin() genérico
-- (eh_admin() foi removido de vez de todas as policies, ver 03_funcoes_seguranca.sql).
DROP POLICY IF EXISTS pol_atualizacao_update ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_update ON atualizacao_campanha FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND id_usuario = public.id_usuario_atual())
    OR public.tem_permissao('atualizacao_moderar')
);

-- CORRIGIDO: comentários não endossados deixam de ser públicos;
-- só o autor, o dono da campanha ou o admin podem ver o que não
-- está endossado. Comentários endossados continuam públicos.
-- ADICIONADO: comentário inativo (removido por moderação) só continua
-- visível para o próprio autor, o dono da campanha ou o admin.
DROP POLICY IF EXISTS pol_comentario_select ON comentario;
CREATE POLICY pol_comentario_select ON comentario FOR SELECT USING (
    (ativo = TRUE AND endossado = TRUE)
    OR id_pesquisador = public.id_usuario_atual()
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND (id_usuario = public.id_usuario_atual() OR public.tem_permissao('comentario_moderar'))
    )
);
DROP POLICY IF EXISTS pol_comentario_insert ON comentario;
CREATE POLICY pol_comentario_insert ON comentario FOR INSERT TO app_nestjs WITH CHECK (
    id_pesquisador = public.id_usuario_atual()
    AND EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = public.id_usuario_atual() AND status_pesquisador = 'ativo')
);
-- ADICIONADO: soft delete de comentário. O autor pode desativar o próprio
-- comentário; moderação (papel com permissão comentario_moderar) ou admin
-- podem desativar qualquer um.
-- CORRIGIDO: "endossar comentário" (setar endossado/ordem_endosso) nunca
-- teve política de UPDATE que cobrisse essa ação — no `main` não existia
-- NENHUMA policy de UPDATE em comentario, e o UPDATE acrescentado nesta
-- rodada (soft delete) só liberava o próprio autor ou moderação, nunca o
-- dono da campanha. Só quem endossa é o dono da campanha, sobre um
-- comentário de outra pessoa, então sem essa condição o endosso continuava
-- impossível na prática. A restrição de que o dono da campanha só deve
-- mexer em endossado/ordem_endosso (e não no conteúdo do comentário) fica
-- a cargo do endpoint específico de endosso no NestJS, não da RLS.
DROP POLICY IF EXISTS pol_comentario_update ON comentario;
CREATE POLICY pol_comentario_update ON comentario FOR UPDATE TO app_nestjs USING (
    id_pesquisador = public.id_usuario_atual()
    OR public.tem_permissao('comentario_moderar')
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND id_usuario = public.id_usuario_atual()
    )
) WITH CHECK (
    id_pesquisador = public.id_usuario_atual()
    OR public.tem_permissao('comentario_moderar')
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND id_usuario = public.id_usuario_atual()
    )
);

DROP POLICY IF EXISTS pol_denuncia_select ON denuncia;
CREATE POLICY pol_denuncia_select ON denuncia FOR SELECT TO app_nestjs USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('denuncia_responder'));
DROP POLICY IF EXISTS pol_denuncia_insert ON denuncia;
CREATE POLICY pol_denuncia_insert ON denuncia FOR INSERT TO app_nestjs WITH CHECK (id_usuario = public.id_usuario_atual());
-- CORRIGIDO: gestão de denúncias passa a ser controlada por permissão específica, não pelo papel genérico de admin.
DROP POLICY IF EXISTS pol_denuncia_update ON denuncia;
CREATE POLICY pol_denuncia_update ON denuncia FOR UPDATE TO app_nestjs USING (public.tem_permissao('denuncia_responder'));

-- recompensa: leitura pública (aparece na página da campanha); só o
-- dono da campanha (ou admin) pode criar/editar as recompensas dela.
DROP POLICY IF EXISTS pol_recompensa_select ON recompensa;
CREATE POLICY pol_recompensa_select ON recompensa FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_recompensa_insert ON recompensa;
CREATE POLICY pol_recompensa_insert ON recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = recompensa.id_campanha AND id_usuario = public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_recompensa_update ON recompensa;
CREATE POLICY pol_recompensa_update ON recompensa FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = recompensa.id_campanha AND (id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar')))
);

DROP POLICY IF EXISTS pol_seg_campanha_select ON seguir_campanha;
CREATE POLICY pol_seg_campanha_select ON seguir_campanha FOR SELECT TO app_nestjs USING (id_usuario = public.id_usuario_atual());
DROP POLICY IF EXISTS pol_seg_campanha_insert ON seguir_campanha;
CREATE POLICY pol_seg_campanha_insert ON seguir_campanha FOR INSERT TO app_nestjs WITH CHECK (id_usuario = public.id_usuario_atual());
-- ADICIONADO: faltava a policy de DELETE — sem ela, "deixar de seguir
-- campanha" (RF-009) ficava bloqueado pela RLS, mesmo já existindo o
-- equivalente para seguir_pesquisador (pol_seg_pesq_delete).
DROP POLICY IF EXISTS pol_seg_campanha_delete ON seguir_campanha;
CREATE POLICY pol_seg_campanha_delete ON seguir_campanha FOR DELETE TO app_nestjs USING (id_usuario = public.id_usuario_atual());

-- solicitacao_encerramento
DROP POLICY IF EXISTS pol_solicitacao_select ON solicitacao_encerramento;
CREATE POLICY pol_solicitacao_select ON solicitacao_encerramento FOR SELECT TO app_nestjs USING (
    public.tem_permissao('solicitacao_encerramento_decidir') OR EXISTS (
        SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = public.id_usuario_atual()
    )
);
DROP POLICY IF EXISTS pol_solicitacao_insert ON solicitacao_encerramento;
CREATE POLICY pol_solicitacao_insert ON solicitacao_encerramento FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = public.id_usuario_atual())
);
-- CORRIGIDO: decisão sobre encerramento de campanha passa a depender de permissão específica.
DROP POLICY IF EXISTS pol_solicitacao_update ON solicitacao_encerramento;
CREATE POLICY pol_solicitacao_update ON solicitacao_encerramento FOR UPDATE TO app_nestjs USING (public.tem_permissao('solicitacao_encerramento_decidir'));

-- historico_rejeicao
DROP POLICY IF EXISTS pol_historicorej_select ON historico_rejeicao;
CREATE POLICY pol_historicorej_select ON historico_rejeicao FOR SELECT TO app_nestjs USING (public.tem_permissao('campanha_rejeitar'));
-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos políticas de escrita para historico_rejeicao para permitir
-- o registro de rejeições de campanha pelo fluxo de moderação.
DROP POLICY IF EXISTS pol_historicorej_insert ON historico_rejeicao;
CREATE POLICY pol_historicorej_insert ON historico_rejeicao FOR INSERT TO app_nestjs WITH CHECK (true);
DROP POLICY IF EXISTS pol_historicorej_update ON historico_rejeicao;
CREATE POLICY pol_historicorej_update ON historico_rejeicao FOR UPDATE TO app_nestjs USING (true) WITH CHECK (true);

-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos políticas de escrita para repasse porque esse fluxo é
-- gerado pelo backend a partir da consolidação financeira da campanha.
-- Sem isso, a RLS bloqueia a criação e atualização do registro mesmo com
-- o GRANT de tabela correto.
DROP POLICY IF EXISTS pol_repasse_insert ON repasse;
CREATE POLICY pol_repasse_insert ON repasse FOR INSERT TO app_nestjs WITH CHECK (true);
DROP POLICY IF EXISTS pol_repasse_update ON repasse;
CREATE POLICY pol_repasse_update ON repasse FOR UPDATE TO app_nestjs USING (true) WITH CHECK (true);

-- repasse
DROP POLICY IF EXISTS pol_repasse_select ON repasse;
CREATE POLICY pol_repasse_select ON repasse FOR SELECT TO app_nestjs USING (
    public.tem_permissao('repasse_aprovar') OR EXISTS (
        SELECT 1 FROM campanha WHERE id_campanha = repasse.id_campanha AND id_usuario = public.id_usuario_atual()
    )
);

-- ============================================================
-- [04-F] LINK (3 tabelas)
-- ============================================================
ALTER TABLE link_academico       ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_academico       FORCE ROW LEVEL SECURITY;
ALTER TABLE link_atualizacao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_atualizacao      FORCE ROW LEVEL SECURITY;
ALTER TABLE link_recompensa       ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_recompensa       FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_link_select ON link_academico;
CREATE POLICY pol_link_select ON link_academico FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_link_insert ON link_academico;
CREATE POLICY pol_link_insert ON link_academico FOR INSERT TO app_nestjs WITH CHECK (id_usuario = public.id_usuario_atual());
-- ADICIONADO: links de perfil passam a aceitar edição e remoção pelo dono do perfil ou pelo admin.
DROP POLICY IF EXISTS pol_link_update ON link_academico;
CREATE POLICY pol_link_update ON link_academico FOR UPDATE TO app_nestjs USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('link_academico_gerenciar')) WITH CHECK (id_usuario = public.id_usuario_atual() OR public.tem_permissao('link_academico_gerenciar'));
DROP POLICY IF EXISTS pol_link_delete ON link_academico;
CREATE POLICY pol_link_delete ON link_academico FOR DELETE TO app_nestjs USING (id_usuario = public.id_usuario_atual() OR public.tem_permissao('link_academico_gerenciar'));

-- link_atualizacao: leitura pública (a atualização em si já é pública);
-- só o dono da campanha (ou admin) adiciona links.
DROP POLICY IF EXISTS pol_link_atualizacao_select ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_select ON link_atualizacao FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_link_atualizacao_insert ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_insert ON link_atualizacao FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('atualizacao_moderar'))
    )
);
-- ADICIONADO: edição e remoção de link de atualização, restritas ao dono da campanha ou admin (mesma regra do INSERT).
DROP POLICY IF EXISTS pol_link_atualizacao_update ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_update ON link_atualizacao FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('atualizacao_moderar'))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('atualizacao_moderar'))
    )
);
DROP POLICY IF EXISTS pol_link_atualizacao_delete ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_delete ON link_atualizacao FOR DELETE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('atualizacao_moderar'))
    )
);

-- link_recompensa: leitura pública; só o dono da campanha (ou admin)
-- adiciona links de resgate/download da recompensa.
-- CORRIGIDO: links de recompensa agora ficam acessíveis apenas ao dono da campanha, admin ou comprador da recompensa.
DROP POLICY IF EXISTS pol_link_recompensa_select ON link_recompensa;
CREATE POLICY pol_link_recompensa_select ON link_recompensa FOR SELECT TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
    OR EXISTS (
        SELECT 1 FROM contribuicao_recompensa cr JOIN contribuicao co ON co.id_contribuicao = cr.id_contribuicao
        WHERE cr.id_recompensa = link_recompensa.id_recompensa
          AND co.id_usuario = public.id_usuario_atual()
    )
);
DROP POLICY IF EXISTS pol_link_recompensa_insert ON link_recompensa;
CREATE POLICY pol_link_recompensa_insert ON link_recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
);
-- ADICIONADO: edição e remoção de link de recompensa. Só o dono da campanha
-- ou admin — de propósito SEM o comprador aqui (diferente do SELECT acima):
-- o link é fornecido pelo pesquisador para entrega da recompensa, então só
-- quem fornece pode alterá-lo ou removê-lo; o comprador só pode ler.
DROP POLICY IF EXISTS pol_link_recompensa_update ON link_recompensa;
CREATE POLICY pol_link_recompensa_update ON link_recompensa FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
);
DROP POLICY IF EXISTS pol_link_recompensa_delete ON link_recompensa;
CREATE POLICY pol_link_recompensa_delete ON link_recompensa FOR DELETE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
);

-- ============================================================
-- [04-G] ARQUIVO (2 tabelas)
-- ============================================================
ALTER TABLE arquivo_atualizacao  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivo_atualizacao  FORCE ROW LEVEL SECURITY;
ALTER TABLE arquivo_recompensa   ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivo_recompensa   FORCE ROW LEVEL SECURITY;

-- arquivo_atualizacao
DROP POLICY IF EXISTS pol_arqatu_select ON arquivo_atualizacao;
CREATE POLICY pol_arqatu_select ON arquivo_atualizacao FOR SELECT USING (TRUE);
-- CORRIGIDO: a ligação de arquivos a atualizações agora exige dono da campanha ou admin.
DROP POLICY IF EXISTS pol_arqatu_insert ON arquivo_atualizacao;
CREATE POLICY pol_arqatu_insert ON arquivo_atualizacao FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha ac
        JOIN campanha c ON c.id_campanha = ac.id_campanha
        WHERE ac.id_atualizacao = arquivo_atualizacao.id_atualizacao
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('atualizacao_moderar'))
    )
);
DROP POLICY IF EXISTS pol_arqatu_update ON arquivo_atualizacao;
CREATE POLICY pol_arqatu_update ON arquivo_atualizacao FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha ac
        JOIN campanha c ON c.id_campanha = ac.id_campanha
        WHERE ac.id_atualizacao = arquivo_atualizacao.id_atualizacao
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('atualizacao_moderar'))
    )
);

-- arquivo_recompensa: leitura pública; escrita só por quem é dono da
-- campanha dona da recompensa (ou admin) — mesmo padrão de arquivo_atualizacao.
-- CORRIGIDO: arquivos de recompensa agora ficam acessíveis apenas ao dono da campanha, admin ou comprador da recompensa.
DROP POLICY IF EXISTS pol_arqrecompensa_select ON arquivo_recompensa;
CREATE POLICY pol_arqrecompensa_select ON arquivo_recompensa FOR SELECT TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
    OR EXISTS (
        SELECT 1 FROM contribuicao_recompensa cr JOIN contribuicao co ON co.id_contribuicao = cr.id_contribuicao
        WHERE cr.id_recompensa = arquivo_recompensa.id_recompensa
          AND co.id_usuario = public.id_usuario_atual()
    )
);
DROP POLICY IF EXISTS pol_arqrecompensa_insert ON arquivo_recompensa;
CREATE POLICY pol_arqrecompensa_insert ON arquivo_recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
);
-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos a policy de UPDATE para arquivo_recompensa para permitir
-- trocar a imagem principal da recompensa quando a campanha for editada.
DROP POLICY IF EXISTS pol_arqrecompensa_update ON arquivo_recompensa;
CREATE POLICY pol_arqrecompensa_update ON arquivo_recompensa FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.tem_permissao('campanha_editar'))
    )
);

-- ============================================================
-- [04-H] CONTRIBUIÇÃO (4 tabelas)
-- ============================================================
ALTER TABLE contribuicao         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribuicao         FORCE ROW LEVEL SECURITY;
ALTER TABLE auditoria_financeira ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_financeira FORCE ROW LEVEL SECURITY;
ALTER TABLE contribuicao_recompensa ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribuicao_recompensa FORCE ROW LEVEL SECURITY;
ALTER TABLE aceite_termo_contribuicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE aceite_termo_contribuicao FORCE ROW LEVEL SECURITY;

-- CORRIGIDO: anon passou a exigir token_sessao; leitura de
-- contribuicao por usuário autenticado continua igual.
DROP POLICY IF EXISTS pol_contribuicao_select ON contribuicao;
CREATE POLICY pol_contribuicao_select ON contribuicao FOR SELECT TO app_nestjs USING (
    id_usuario = public.id_usuario_atual() OR public.tem_permissao('contribuicao_visualizar_sensivel')
);
-- CORRIGIDO: a policy anônima passou a usar a variável de sessão do NestJS.
DROP POLICY IF EXISTS pol_contribuicao_anon_select ON contribuicao;
CREATE POLICY pol_contribuicao_anon_select ON contribuicao FOR SELECT TO app_nestjs USING (
    id_usuario IS NULL
    AND token_sessao::text = current_setting('app.token_sessao_atual', true)
);
DROP POLICY IF EXISTS pol_contribuicao_insert ON contribuicao;
CREATE POLICY pol_contribuicao_insert ON contribuicao FOR INSERT TO app_nestjs WITH CHECK (
    id_usuario IS NULL OR id_usuario = public.id_usuario_atual()
);
-- CORRIGIDO: o webhook de pagamento precisa atualizar o status da contribuição sem depender do dono da contribuição.
DROP POLICY IF EXISTS pol_contribuicao_update ON contribuicao;
CREATE POLICY pol_contribuicao_update ON contribuicao FOR UPDATE TO app_nestjs USING (
    true
);

-- auditoria_financeira
DROP POLICY IF EXISTS pol_auditoria_select ON auditoria_financeira;
CREATE POLICY pol_auditoria_select ON auditoria_financeira FOR SELECT TO app_nestjs USING (
    public.tem_permissao('auditoria_financeira_visualizar') OR EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = auditoria_financeira.id_contribuicao
          AND c.id_usuario = public.id_usuario_atual()
    )
);
-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos políticas de escrita para auditoria_financeira para permitir
-- o registro de eventos financeiros e auditoria do fluxo de contribuição.
DROP POLICY IF EXISTS pol_auditoria_insert ON auditoria_financeira;
CREATE POLICY pol_auditoria_insert ON auditoria_financeira FOR INSERT TO app_nestjs WITH CHECK (true);
DROP POLICY IF EXISTS pol_auditoria_update ON auditoria_financeira;
CREATE POLICY pol_auditoria_update ON auditoria_financeira FOR UPDATE TO app_nestjs USING (true) WITH CHECK (true);

-- contribuicao_recompensa: quem contribuiu vê e registra as próprias
-- aquisições; o dono da campanha (ou admin) também pode ver, pra
-- organizar o envio/entrega das recompensas. Sem UPDATE/DELETE:
-- uma vez adquirida, é um registro de compra, não deve ser editável.
DROP POLICY IF EXISTS pol_contrib_recompensa_select ON contribuicao_recompensa;
CREATE POLICY pol_contrib_recompensa_select ON contribuicao_recompensa FOR SELECT TO app_nestjs USING (
    EXISTS (SELECT 1 FROM contribuicao WHERE id_contribuicao = contribuicao_recompensa.id_contribuicao AND id_usuario = public.id_usuario_atual())
    OR EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = contribuicao_recompensa.id_recompensa AND c.id_usuario = public.id_usuario_atual()
    )
    OR public.tem_permissao('contribuicao_visualizar_sensivel')
);
DROP POLICY IF EXISTS pol_contrib_recompensa_insert ON contribuicao_recompensa;
CREATE POLICY pol_contrib_recompensa_insert ON contribuicao_recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM contribuicao WHERE id_contribuicao = contribuicao_recompensa.id_contribuicao AND id_usuario = public.id_usuario_atual())
);

-- CORRIGIDO: aceite de termos por contribuição agora tem política de leitura e escrita compatível com doação anônima.
DROP POLICY IF EXISTS pol_aceite_termo_contribuicao_select ON aceite_termo_contribuicao;
CREATE POLICY pol_aceite_termo_contribuicao_select ON aceite_termo_contribuicao FOR SELECT TO app_nestjs USING (
    public.tem_permissao('contribuicao_visualizar_sensivel') OR EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = aceite_termo_contribuicao.id_contribuicao
          AND c.id_usuario = public.id_usuario_atual()
    )
);
DROP POLICY IF EXISTS pol_aceite_termo_contribuicao_insert ON aceite_termo_contribuicao;
CREATE POLICY pol_aceite_termo_contribuicao_insert ON aceite_termo_contribuicao FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = aceite_termo_contribuicao.id_contribuicao
          AND (c.id_usuario IS NULL OR c.id_usuario = public.id_usuario_atual())
    )
);

-- ============================================================
-- [04-I] SCORE (3 tabelas)
-- ============================================================
ALTER TABLE score_pesquisador    ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_pesquisador    FORCE ROW LEVEL SECURITY;
ALTER TABLE score_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_config         FORCE ROW LEVEL SECURITY;
ALTER TABLE score_rotulo         ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_rotulo         FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_score_select ON score_pesquisador;
CREATE POLICY pol_score_select ON score_pesquisador FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS pol_score_config_select ON public.score_config;
CREATE POLICY "pol_score_config_select" ON public.score_config FOR SELECT TO app_nestjs USING (true);
-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos a policy de INSERT para score_config para permitir que o
-- painel administrativo crie novas dimensões de score sem depender de
-- uma regra de bypass da RLS.
DROP POLICY IF EXISTS pol_score_config_insert ON public.score_config;
CREATE POLICY pol_score_config_insert ON public.score_config FOR INSERT TO app_nestjs WITH CHECK (public.tem_permissao('score_editar'));
-- CORRIGIDO: acesso à configuração de score passa a depender de permissão específica.
DROP POLICY IF EXISTS pol_score_config_update ON public.score_config;
CREATE POLICY pol_score_config_update ON public.score_config FOR UPDATE TO app_nestjs USING (public.tem_permissao('score_editar'));

DROP POLICY IF EXISTS pol_score_rotulo_select ON public.score_rotulo;
CREATE POLICY "pol_score_rotulo_select" ON public.score_rotulo FOR SELECT TO app_nestjs USING (true);
-- COMENTÁRIO DE ALTERAÇÃO:
-- Adicionamos a policy de INSERT para score_rotulo para permitir a criação
-- de novos rótulos de score pelo fluxo administrativo com a permissão certa.
DROP POLICY IF EXISTS pol_score_rotulo_insert ON public.score_rotulo;
CREATE POLICY pol_score_rotulo_insert ON public.score_rotulo FOR INSERT TO app_nestjs WITH CHECK (public.tem_permissao('score_editar'));
DROP POLICY IF EXISTS pol_score_rotulo_update ON public.score_rotulo;
CREATE POLICY pol_score_rotulo_update ON public.score_rotulo FOR UPDATE TO app_nestjs USING (public.tem_permissao('score_editar'));
