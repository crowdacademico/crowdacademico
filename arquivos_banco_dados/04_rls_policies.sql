-- ============================================================================
--  CROWDACADÊMICO - SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     04_rls_policies.sql
--  Módulo:      Row Level Security (RLS) e Policies
--  Depende de:  01_extensoes_enums_tabelas.sql, 03_funcoes_seguranca.sql
--  Próximo:     05_regras_negocio.sql
-- ----------------------------------------------------------------------------
--  Descrição:
--  Ativa FORCE ROW LEVEL SECURITY em todas as tabelas do schema e define
--  as policies de acesso, agrupadas por domínio na mesma ordem do arquivo
--  01 - ENABLE/FORCE e as próprias policies de cada tabela ficam juntos,
--  em vez de um bloco de ENABLE no topo separado das policies.
--
--  Inventário Mapeado:
--  - 42 Tabelas com RLS ativada e forçada
--  - 121 Policies (100% idempotentes - toda CREATE POLICY tem
--    DROP POLICY IF EXISTS correspondente)
-- ----------------------------------------------------------------------------
--  SUMÁRIO DOS BLOCOS DE CÓDIGO
-- ----------------------------------------------------------------------------
--  [04-A] Visão geral (FORCE ROW LEVEL SECURITY)
--  [04-B] RBAC (3 tabelas)
--  [04-C] CONFIG (5 tabelas)
--  [04-D] USUÁRIO (10 tabelas)
--  [04-E] CAMPANHA (11 tabelas)
--  [04-F] LINK (3 tabelas)
--  [04-G] ARQUIVO (2 tabelas)
--  [04-H] CONTRIBUIÇÃO (4 tabelas)
--  [04-I] SCORE (3 tabelas)
--  [04-L] LOG DE AUDITORIA (1 tabela)
-- ============================================================================

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - COMPLETO
-- ============================================================

-- CONVENÇÃO: dentro de policy, SEMPRE (SELECT public.tem_permissao('x')) e (SELECT public.id_usuario_atual()),
-- nunca a chamada solta. O SELECT vira InitPlan: avaliado UMA vez por comando, não uma vez por linha. Ver DOCUMENTACAO_BD.md [04-A].

-- [04-A] Visão geral: por que FORCE ROW LEVEL SECURITY em todas as tabelas (ver DOCUMENTACAO_BD.md)

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
-- [04-B-1b] papel: UPDATE liberado só para o rótulo (`nome`): GRANT UPDATE (nome), 06_grants.sql [06-B].
-- `codigo`, a coluna estável que as triggers de RBAC leem (01_extensoes_enums_tabelas.sql [01-B]), não tem
-- GRANT nenhum, então nem chega a ser possível tentar mudá-la por aqui: é isso que torna seguro abrir
-- esta policy.
DROP POLICY IF EXISTS pol_papel_update ON papel;
CREATE POLICY pol_papel_update ON papel FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('papel_gerenciar')));
DROP POLICY IF EXISTS pol_permissao_select ON permissao;
CREATE POLICY pol_permissao_select ON permissao FOR SELECT USING (true);
DROP POLICY IF EXISTS pol_papelperm_select ON papel_permissao;
CREATE POLICY pol_papelperm_select ON papel_permissao FOR SELECT USING (true);

-- [04-B-1] papel_permissao: escrita liberada para o Painel Admin. O TOGGLE de permissão em papel já
-- existente (a matriz Papel × Permissão) é feito pelo painel, gated pela mesma permissão que gateia
-- gerenciar o vínculo usuário-papel (`papel_gerenciar`, ver pol_usuariopapel_delete acima). `papel` e
-- `permissao` continuam só-leitura: CRIAR um papel ou permissão nova (não só conceder uma combinação já
-- existente) é decisão maior, mexe no catálogo em si e não só nos vínculos.
DROP POLICY IF EXISTS pol_papelperm_insert ON papel_permissao;
CREATE POLICY pol_papelperm_insert ON papel_permissao FOR INSERT TO app_nestjs WITH CHECK (
    (SELECT public.tem_permissao('papel_gerenciar'))
);
DROP POLICY IF EXISTS pol_papelperm_delete ON papel_permissao;
CREATE POLICY pol_papelperm_delete ON papel_permissao FOR DELETE TO app_nestjs USING (
    (SELECT public.tem_permissao('papel_gerenciar'))
);

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

-- Linha global só é visível sem `configuracao_gerenciar` se `publica = TRUE`; quem tem a permissão vê
-- tudo (inclusive interna, para poder editar pelo painel). Linha pessoal (id_usuario = dono) nunca muda:
-- sempre visível só para o próprio dono, pública ou não.
DROP POLICY IF EXISTS pol_config_select ON configuracoes;
CREATE POLICY pol_config_select ON configuracoes FOR SELECT TO app_nestjs USING (
    (id_usuario IS NULL AND (publica = TRUE OR (SELECT public.tem_permissao('configuracao_gerenciar'))))
    OR id_usuario = (SELECT public.id_usuario_atual())
);
-- [04-C-1] configuracoes: por que existem policies de escrita (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_config_insert ON configuracoes;
CREATE POLICY pol_config_insert ON configuracoes FOR INSERT TO app_nestjs WITH CHECK (
    (id_usuario IS NULL AND (SELECT public.tem_permissao('configuracao_gerenciar')))
    OR id_usuario = (SELECT public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_config_update ON configuracoes;
CREATE POLICY pol_config_update ON configuracoes FOR UPDATE TO app_nestjs USING (
    (id_usuario IS NULL AND (SELECT public.tem_permissao('configuracao_gerenciar')))
    OR id_usuario = (SELECT public.id_usuario_atual())
) WITH CHECK (
    (id_usuario IS NULL AND (SELECT public.tem_permissao('configuracao_gerenciar')))
    OR id_usuario = (SELECT public.id_usuario_atual())
);
-- Chave global NÃO se apaga (é contrato do sistema); só a configuração pessoal.
DROP POLICY IF EXISTS pol_config_delete ON configuracoes;
CREATE POLICY pol_config_delete ON configuracoes FOR DELETE TO app_nestjs USING (
    id_usuario = (SELECT public.id_usuario_atual())
);

DROP POLICY IF EXISTS pol_area_select ON area_conhecimento;
CREATE POLICY pol_area_select ON area_conhecimento FOR SELECT USING (true);
-- [04-C-2] area_conhecimento: por que existem policies de escrita (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_area_insert ON area_conhecimento;
CREATE POLICY pol_area_insert ON area_conhecimento FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('area_conhecimento_gerenciar')));
DROP POLICY IF EXISTS pol_area_update ON area_conhecimento;
CREATE POLICY pol_area_update ON area_conhecimento FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('area_conhecimento_gerenciar'))) WITH CHECK ((SELECT public.tem_permissao('area_conhecimento_gerenciar')));
-- Mesma permissão do update. FK_CAMPANHA_AREA_CONHECIMENTO segue sem CASCADE, então a policy libera a
-- operação mas o banco ainda rejeita (23503) se a área estiver em uso; area-conhecimento.service.remove.ts
-- traduz isso numa mensagem própria.
DROP POLICY IF EXISTS pol_area_delete ON area_conhecimento;
CREATE POLICY pol_area_delete ON area_conhecimento FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('area_conhecimento_gerenciar')));

DROP POLICY IF EXISTS pol_tipolink_select ON tipo_link;
CREATE POLICY pol_tipolink_select ON tipo_link FOR SELECT USING (true);
-- Cadastro e edição de tipos de link dependem de permissão específica para gestão administrativa.
DROP POLICY IF EXISTS pol_tipolink_insert ON tipo_link;
CREATE POLICY pol_tipolink_insert ON tipo_link FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('tipolink_gerenciar')));
DROP POLICY IF EXISTS pol_tipolink_update ON tipo_link;
CREATE POLICY pol_tipolink_update ON tipo_link FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('tipolink_gerenciar'))) WITH CHECK ((SELECT public.tem_permissao('tipolink_gerenciar')));
-- Mesma permissão do update. FK_LINK_ACADEMICO_TIPOLINK/FK_LINK_ATUALIZACAO_TIPOLINK/
-- FK_LINK_RECOMPENSA_TIPOLINK seguem sem CASCADE; tipo-link.service.remove.ts traduz o 23503 numa mensagem
-- própria.
DROP POLICY IF EXISTS pol_tipolink_delete ON tipo_link;
CREATE POLICY pol_tipolink_delete ON tipo_link FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('tipolink_gerenciar')));

DROP POLICY IF EXISTS pol_motivo_select ON motivo_denuncia;
CREATE POLICY pol_motivo_select ON motivo_denuncia FOR SELECT USING (true);
-- [04-C-3] motivo_denuncia: por que existem policies de escrita (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_motivo_insert ON motivo_denuncia;
CREATE POLICY pol_motivo_insert ON motivo_denuncia FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('motivo_denuncia_gerenciar')));
DROP POLICY IF EXISTS pol_motivo_update ON motivo_denuncia;
CREATE POLICY pol_motivo_update ON motivo_denuncia FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('motivo_denuncia_gerenciar'))) WITH CHECK ((SELECT public.tem_permissao('motivo_denuncia_gerenciar')));
-- Mesma permissão do update. FK_DENUNCIA_MOTIVO segue sem CASCADE; motivo-denuncia.service.remove.ts
-- traduz o 23503 numa mensagem própria.
DROP POLICY IF EXISTS pol_motivo_delete ON motivo_denuncia;
CREATE POLICY pol_motivo_delete ON motivo_denuncia FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('motivo_denuncia_gerenciar')));

DROP POLICY IF EXISTS pol_arquivo_select ON arquivo;
CREATE POLICY pol_arquivo_select ON arquivo FOR SELECT USING (TRUE);
-- O primeiro passo do upload de arquivo fica liberado; a posse real é garantida ao vincular em arquivo_atualizacao/arquivo_recompensa.
DROP POLICY IF EXISTS pol_arquivo_insert ON arquivo;
CREATE POLICY pol_arquivo_insert ON arquivo FOR INSERT TO app_nestjs WITH CHECK (TRUE);
DROP POLICY IF EXISTS pol_arquivo_update ON arquivo;
CREATE POLICY pol_arquivo_update ON arquivo FOR UPDATE TO app_nestjs USING (
    (SELECT public.tem_permissao('arquivo_gerenciar'))
    OR EXISTS (
        SELECT 1 FROM usuario u
        WHERE u.id_usuario = (SELECT public.id_usuario_atual())
          AND u.id_imagem_perfil = arquivo.id_arquivo
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

-- [04-D-1] verificacao_email / recuperacao_senha / sessao: por que RLS sem policy por usuário (ver DOCUMENTACAO_BD.md)
ALTER TABLE verificacao_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE verificacao_email FORCE ROW LEVEL SECURITY;
ALTER TABLE recuperacao_senha ENABLE ROW LEVEL SECURITY;
ALTER TABLE recuperacao_senha FORCE ROW LEVEL SECURITY;
ALTER TABLE sessao            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessao            FORCE ROW LEVEL SECURITY;

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

-- Usuário fica invisível quando marcado como deletado, salvo para admin.
DROP POLICY IF EXISTS pol_usuario_select ON usuario;
CREATE POLICY pol_usuario_select ON usuario FOR SELECT TO app_nestjs USING (deletado = FALSE OR (SELECT public.tem_permissao('usuario_visualizar_sensivel')));
-- [04-D-2] usuario: por que o INSERT usa WITH CHECK(true) (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_usuario_insert ON usuario;
CREATE POLICY pol_usuario_insert ON usuario FOR INSERT TO app_nestjs WITH CHECK (true);
-- Suspensão de usuário aceita permissão específica além do próprio dono.
DROP POLICY IF EXISTS pol_usuario_update ON usuario;
CREATE POLICY pol_usuario_update ON usuario FOR UPDATE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('usuario_suspender')));

-- [04-D-3] perfil_pesquisador: por que existe a policy de INSERT (ver DOCUMENTACAO_BD.md)
-- Perfil de conta deletada fica invisível (usuario_visivel).
DROP POLICY IF EXISTS pol_perfil_select ON perfil_pesquisador;
CREATE POLICY pol_perfil_select ON perfil_pesquisador FOR SELECT USING (public.usuario_visivel(id_usuario));
DROP POLICY IF EXISTS pol_perfil_insert ON perfil_pesquisador;
CREATE POLICY pol_perfil_insert ON perfil_pesquisador FOR INSERT TO app_nestjs WITH CHECK (
    id_usuario = (SELECT public.id_usuario_atual())
);
DROP POLICY IF EXISTS pol_perfil_update ON perfil_pesquisador;
CREATE POLICY pol_perfil_update ON perfil_pesquisador FOR UPDATE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));

-- [04-D-4b] usuario_papel (SELECT): cada pessoa vê os próprios papéis; quem tem papel_gerenciar vê os de todos (coluna "papel" da listagem de Usuários).
DROP POLICY IF EXISTS pol_usuariopapel_select ON usuario_papel;
CREATE POLICY pol_usuariopapel_select ON usuario_papel FOR SELECT TO app_nestjs USING (
    id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('papel_gerenciar'))
);
DROP POLICY IF EXISTS pol_usuariopapel_insert ON usuario_papel;
CREATE POLICY pol_usuariopapel_insert ON usuario_papel FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('papel_atribuir')));
-- [04-D-4] usuario_papel: por que existe a policy de DELETE (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_usuariopapel_delete ON usuario_papel;
CREATE POLICY pol_usuariopapel_delete ON usuario_papel FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('papel_gerenciar')));

-- termos_de_uso: leitura pública (precisa ser lido até por quem ainda
-- não tem conta, na tela de cadastro); só admin cria/edita uma versão.
DROP POLICY IF EXISTS pol_termos_select ON termos_de_uso;
CREATE POLICY pol_termos_select ON termos_de_uso FOR SELECT TO app_nestjs USING (true);
-- Gestão de termos de uso depende de permissão específica.
DROP POLICY IF EXISTS pol_termos_insert ON termos_de_uso;
CREATE POLICY pol_termos_insert ON termos_de_uso FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('termos_uso_gerenciar')));
DROP POLICY IF EXISTS pol_termos_update ON termos_de_uso;
CREATE POLICY pol_termos_update ON termos_de_uso FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('termos_uso_gerenciar')));
-- A trava de "só rascunho, nunca ativo/nunca aceito" mora no Nest (TermoUsoServiceExcluir), não aqui:
-- esta policy só decide QUEM pode tentar, não O QUE pode ser apagado.
DROP POLICY IF EXISTS pol_termos_delete ON termos_de_uso;
CREATE POLICY pol_termos_delete ON termos_de_uso FOR DELETE TO app_nestjs USING ((SELECT public.tem_permissao('termos_uso_gerenciar')));

-- usuario_termo: cada usuário só vê e registra o próprio aceite.
-- Sem política de UPDATE/DELETE: aceite é um registro de auditoria,
-- não deve ser alterável por ninguém (nem pelo próprio usuário).
DROP POLICY IF EXISTS pol_usuario_termo_select ON usuario_termo;
CREATE POLICY pol_usuario_termo_select ON usuario_termo FOR SELECT TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('usuario_visualizar_sensivel')));
DROP POLICY IF EXISTS pol_usuario_termo_insert ON usuario_termo;
CREATE POLICY pol_usuario_termo_insert ON usuario_termo FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()));

-- [04-D-5] notificacao: por que existem policies de INSERT/UPDATE (ver DOCUMENTACAO_BD.md)
-- Inclui 'notificacao_processar': o worker de envio de e-mail lê a fila de pendentes, e
-- 'usuario_visualizar_sensivel' não tem relação semântica com processar notificação.
DROP POLICY IF EXISTS pol_notificacao_select ON notificacao;
CREATE POLICY pol_notificacao_select ON notificacao FOR SELECT TO app_nestjs USING (
    id_usuario = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('usuario_visualizar_sensivel'))
    OR (SELECT public.tem_permissao('notificacao_processar'))
);
-- Escrita liberada para o app_nestjs, controle na aplicação (mesmo padrão de
-- verificacao_email/recuperacao_senha/sessao): toda notificação real é para um terceiro (admin aprova ->
-- avisa pesquisador; sistema avisa doadores) e o worker de envio roda sem usuário logado. Leitura
-- continua restrita ao dono.
DROP POLICY IF EXISTS pol_notificacao_insert ON notificacao;
CREATE POLICY pol_notificacao_insert ON notificacao FOR INSERT TO app_nestjs WITH CHECK (true);
DROP POLICY IF EXISTS pol_notificacao_update ON notificacao;
CREATE POLICY pol_notificacao_update ON notificacao FOR UPDATE TO app_nestjs USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pol_seg_pesq_select ON seguir_pesquisador;
CREATE POLICY pol_seg_pesq_select ON seguir_pesquisador FOR SELECT TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_seg_pesq_insert ON seguir_pesquisador;
CREATE POLICY pol_seg_pesq_insert ON seguir_pesquisador FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_seg_pesq_delete ON seguir_pesquisador;
CREATE POLICY pol_seg_pesq_delete ON seguir_pesquisador FOR DELETE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));

-- ============================================================
-- [04-E] CAMPANHA (11 tabelas)
-- ============================================================
ALTER TABLE campanha             ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha             FORCE ROW LEVEL SECURITY;
ALTER TABLE atualizacao_campanha ENABLE ROW LEVEL SECURITY;
ALTER TABLE atualizacao_campanha FORCE ROW LEVEL SECURITY;
ALTER TABLE orcamento_campanha   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_campanha   FORCE ROW LEVEL SECURITY;
ALTER TABLE marco_cronograma     ENABLE ROW LEVEL SECURITY;
ALTER TABLE marco_cronograma     FORCE ROW LEVEL SECURITY;
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

-- Campanhas públicas expõem apenas os status permitidos, preservando as demais para dono/admin.
DROP POLICY IF EXISTS pol_campanha_select ON campanha;
CREATE POLICY pol_campanha_select ON campanha FOR SELECT USING (
    status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
    OR id_usuario = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('relatorio_visualizar'))
);
-- Exige status_pesquisador = 'ativo': pesquisador suspenso não submete campanha nova.
DROP POLICY IF EXISTS pol_campanha_insert ON campanha;
CREATE POLICY pol_campanha_insert ON campanha FOR INSERT TO app_nestjs WITH CHECK (
    id_usuario = (SELECT public.id_usuario_atual())
    AND EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = (SELECT public.id_usuario_atual()) AND status_pesquisador = 'ativo')
);
-- [04-E-1] campanha: por que campanha_aprovar/campanha_rejeitar liberam o UPDATE (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_campanha_update ON campanha;
CREATE POLICY pol_campanha_update ON campanha FOR UPDATE TO app_nestjs USING (
    id_usuario = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('campanha_editar'))
    OR (SELECT public.tem_permissao('campanha_aprovar'))
    OR (SELECT public.tem_permissao('campanha_rejeitar'))
);
-- Excluir campanha: só 'rascunho'. A campanha que ainda não passou pela fila não tem linha em
-- historico_rejeicao; depois de enviada, apagar de vez tiraria do administrador o registro de que ela
-- existiu.
DROP POLICY IF EXISTS pol_campanha_delete ON campanha;
CREATE POLICY pol_campanha_delete ON campanha FOR DELETE TO app_nestjs USING (
    status = 'rascunho'
    AND (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
);

-- Atualização inativa (ocultada por moderação) só continua visível para o dono da campanha ou admin; o
-- público só vê as ativas.
DROP POLICY IF EXISTS pol_atualizacao_select ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_select ON atualizacao_campanha FOR SELECT USING (
    ativo = TRUE
    OR EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar'))))
);
-- Mesma checagem de status_pesquisador = 'ativo' de pol_campanha_insert: pesquisador suspenso não
-- publica atualização de campanha.
DROP POLICY IF EXISTS pol_atualizacao_insert ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_insert ON atualizacao_campanha FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    AND EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = (SELECT public.id_usuario_atual()) AND status_pesquisador = 'ativo')
);
-- [04-E-2] atualizacao_campanha: substituição do antigo eh_admin() (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_atualizacao_update ON atualizacao_campanha;
CREATE POLICY pol_atualizacao_update ON atualizacao_campanha FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('atualizacao_moderar'))
);

-- Orçamento e cronograma estruturados. Leitura segue a MESMA visibilidade de campanha
-- (pol_campanha_select), e não o padrão USING (TRUE) de pol_recompensa_select: expor o orçamento de uma
-- campanha ainda não aprovada (aguardando_aprovacao) a qualquer visitante não tem por quê, e o
-- dono/admin enxergam por fora dessa condição. Escrita: só o dono da campanha (ou campanha_editar); o
-- congelamento por status/data_inicio é da trigger em 05 (RLS controla QUEM, trigger controla QUANDO).
-- recompensa NÃO tem trigger de congelamento (só existem as 3 de campanha, orçamento e cronograma).
DROP POLICY IF EXISTS pol_orcamento_campanha_select ON orcamento_campanha;
CREATE POLICY pol_orcamento_campanha_select ON orcamento_campanha FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = orcamento_campanha.id_campanha
          AND (
              status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
              OR id_usuario = (SELECT public.id_usuario_atual())
              OR (SELECT public.tem_permissao('relatorio_visualizar'))
          )
    )
);
DROP POLICY IF EXISTS pol_orcamento_campanha_insert ON orcamento_campanha;
CREATE POLICY pol_orcamento_campanha_insert ON orcamento_campanha FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = orcamento_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_orcamento_campanha_update ON orcamento_campanha;
CREATE POLICY pol_orcamento_campanha_update ON orcamento_campanha FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = orcamento_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_orcamento_campanha_delete ON orcamento_campanha;
CREATE POLICY pol_orcamento_campanha_delete ON orcamento_campanha FOR DELETE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = orcamento_campanha.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);

DROP POLICY IF EXISTS pol_marco_cronograma_select ON marco_cronograma;
CREATE POLICY pol_marco_cronograma_select ON marco_cronograma FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = marco_cronograma.id_campanha
          AND (
              status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
              OR id_usuario = (SELECT public.id_usuario_atual())
              OR (SELECT public.tem_permissao('relatorio_visualizar'))
          )
    )
);
DROP POLICY IF EXISTS pol_marco_cronograma_insert ON marco_cronograma;
CREATE POLICY pol_marco_cronograma_insert ON marco_cronograma FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = marco_cronograma.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_marco_cronograma_update ON marco_cronograma;
CREATE POLICY pol_marco_cronograma_update ON marco_cronograma FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = marco_cronograma.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);
DROP POLICY IF EXISTS pol_marco_cronograma_delete ON marco_cronograma;
CREATE POLICY pol_marco_cronograma_delete ON marco_cronograma FOR DELETE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = marco_cronograma.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
    OR (SELECT public.tem_permissao('campanha_editar'))
);

-- [04-E-3] comentario: regras de visibilidade de comentário não endossado/inativo (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_comentario_select ON comentario;
CREATE POLICY pol_comentario_select ON comentario FOR SELECT USING (
    (ativo = TRUE AND endossado = TRUE)
    OR id_pesquisador = (SELECT public.id_usuario_atual())
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('comentario_moderar')))
    )
);
DROP POLICY IF EXISTS pol_comentario_insert ON comentario;
CREATE POLICY pol_comentario_insert ON comentario FOR INSERT TO app_nestjs WITH CHECK (
    id_pesquisador = (SELECT public.id_usuario_atual())
    AND EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = (SELECT public.id_usuario_atual()) AND status_pesquisador = 'ativo')
);
-- [04-E-4] comentario: histórico do bug de UPDATE (endosso) (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_comentario_update ON comentario;
CREATE POLICY pol_comentario_update ON comentario FOR UPDATE TO app_nestjs USING (
    id_pesquisador = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('comentario_moderar'))
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND id_usuario = (SELECT public.id_usuario_atual())
    )
) WITH CHECK (
    id_pesquisador = (SELECT public.id_usuario_atual())
    OR (SELECT public.tem_permissao('comentario_moderar'))
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND id_usuario = (SELECT public.id_usuario_atual())
    )
);

DROP POLICY IF EXISTS pol_denuncia_select ON denuncia;
CREATE POLICY pol_denuncia_select ON denuncia FOR SELECT TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('denuncia_responder')));
DROP POLICY IF EXISTS pol_denuncia_insert ON denuncia;
CREATE POLICY pol_denuncia_insert ON denuncia FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()));
-- Gestão de denúncias é controlada por permissão específica, não pelo papel genérico de admin.
DROP POLICY IF EXISTS pol_denuncia_update ON denuncia;
CREATE POLICY pol_denuncia_update ON denuncia FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('denuncia_responder')));

-- recompensa: leitura pública (aparece na página da campanha); só o
-- dono da campanha (ou admin) pode criar/editar as recompensas dela.
DROP POLICY IF EXISTS pol_recompensa_select ON recompensa;
CREATE POLICY pol_recompensa_select ON recompensa FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_recompensa_insert ON recompensa;
CREATE POLICY pol_recompensa_insert ON recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = recompensa.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
);
DROP POLICY IF EXISTS pol_recompensa_update ON recompensa;
CREATE POLICY pol_recompensa_update ON recompensa FOR UPDATE TO app_nestjs USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = recompensa.id_campanha AND (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar'))))
);

DROP POLICY IF EXISTS pol_seg_campanha_select ON seguir_campanha;
CREATE POLICY pol_seg_campanha_select ON seguir_campanha FOR SELECT TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));
DROP POLICY IF EXISTS pol_seg_campanha_insert ON seguir_campanha;
CREATE POLICY pol_seg_campanha_insert ON seguir_campanha FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()));
-- [04-E-5] seguir_campanha: por que existe a policy de DELETE (RF-009) (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_seg_campanha_delete ON seguir_campanha;
CREATE POLICY pol_seg_campanha_delete ON seguir_campanha FOR DELETE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()));

DROP POLICY IF EXISTS pol_solicitacao_select ON solicitacao_encerramento;
CREATE POLICY pol_solicitacao_select ON solicitacao_encerramento FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('solicitacao_encerramento_decidir')) OR EXISTS (
        SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = (SELECT public.id_usuario_atual())
    )
);
DROP POLICY IF EXISTS pol_solicitacao_insert ON solicitacao_encerramento;
CREATE POLICY pol_solicitacao_insert ON solicitacao_encerramento FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
);
-- Decisão sobre encerramento de campanha depende de permissão específica. O dono da campanha também pode
-- UPDATE: sem isso o valor 'cancelado' do ENUM status_encerramento (pesquisador desiste da própria
-- solicitação) seria inalcançável, já que quem tem a permissão de decidir só aprova/rejeita. A trigger
-- trg_valida_transicao_solicitacao (05) restringe o dono só à transição pendente -> cancelado, sem tocar
-- em mais nenhuma coluna.
DROP POLICY IF EXISTS pol_solicitacao_update ON solicitacao_encerramento;
CREATE POLICY pol_solicitacao_update ON solicitacao_encerramento FOR UPDATE TO app_nestjs USING (
    (SELECT public.tem_permissao('solicitacao_encerramento_decidir'))
    OR EXISTS (SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = (SELECT public.id_usuario_atual()))
);

-- O dono da campanha enxerga a própria rejeição, como em solicitacao_encerramento e repasse (tabelas
-- irmãs, que liberam o dono via OR EXISTS): o RF-070 (pesquisador edita e reenvia campanha rejeitada)
-- precisa do motivo na própria plataforma, não só por e-mail (RF-071). O dono é reconhecido por
-- id_usuario_dono (gravado na linha), e não por EXISTS em campanha: o histórico sobrevive à exclusão da
-- campanha. Ver DOCUMENTACAO_BD.md [05-K-2-B].
DROP POLICY IF EXISTS pol_historicorej_select ON historico_rejeicao;
CREATE POLICY pol_historicorej_select ON historico_rejeicao FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('campanha_rejeitar'))
    OR id_usuario_dono = (SELECT public.id_usuario_atual())
);
-- [04-E-6] historico_rejeicao: por que existem policies de escrita (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_historicorej_insert ON historico_rejeicao;
CREATE POLICY pol_historicorej_insert ON historico_rejeicao FOR INSERT TO app_nestjs WITH CHECK (true);
-- Sem policy de UPDATE (e sem GRANT, ver 06) em historico_rejeicao: histórico de moderação é IMUTÁVEL;
-- senão qualquer pesquisador logado conseguiria reescrever a justificativa da própria rejeição.
DROP POLICY IF EXISTS pol_historicorej_update ON historico_rejeicao;

-- [04-E-7] repasse: por que existem policies de escrita (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_repasse_insert ON repasse;
CREATE POLICY pol_repasse_insert ON repasse FOR INSERT TO app_nestjs WITH CHECK (true);
-- Sem efeito prático para o app_nestjs: o GRANT UPDATE saiu (06, [06-E]) e status/repassado_em só mudam
-- via atualizar_status_repasse() (05, SECURITY DEFINER, [05-K-2]); mesmo raciocínio de
-- pol_contribuicao_update abaixo. Mantida por documentação.
DROP POLICY IF EXISTS pol_repasse_update ON repasse;
CREATE POLICY pol_repasse_update ON repasse FOR UPDATE TO app_nestjs USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pol_repasse_select ON repasse;
CREATE POLICY pol_repasse_select ON repasse FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('repasse_aprovar')) OR EXISTS (
        SELECT 1 FROM campanha WHERE id_campanha = repasse.id_campanha AND id_usuario = (SELECT public.id_usuario_atual())
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

-- Link de dono com conta deletada fica invisível (usuario_visivel).
DROP POLICY IF EXISTS pol_link_select ON link_academico;
CREATE POLICY pol_link_select ON link_academico FOR SELECT USING (public.usuario_visivel(id_usuario));
-- Mesma condição de UPDATE/DELETE logo abaixo (dono ou admin): o admin também cria link acadêmico em
-- nome do pesquisador (Bancada do Pesquisador).
DROP POLICY IF EXISTS pol_link_insert ON link_academico;
CREATE POLICY pol_link_insert ON link_academico FOR INSERT TO app_nestjs WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('link_academico_gerenciar')));
-- Links de perfil aceitam edição e remoção pelo dono do perfil ou pelo admin.
DROP POLICY IF EXISTS pol_link_update ON link_academico;
CREATE POLICY pol_link_update ON link_academico FOR UPDATE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('link_academico_gerenciar'))) WITH CHECK (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('link_academico_gerenciar')));
DROP POLICY IF EXISTS pol_link_delete ON link_academico;
CREATE POLICY pol_link_delete ON link_academico FOR DELETE TO app_nestjs USING (id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('link_academico_gerenciar')));

-- link_atualizacao: leitura pública (a atualização em si já é pública);
-- só o dono da campanha (ou admin) adiciona links.
DROP POLICY IF EXISTS pol_link_atualizacao_select ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_select ON link_atualizacao FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS pol_link_atualizacao_insert ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_insert ON link_atualizacao FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);
-- Edição e remoção de link de atualização restritas ao dono da campanha ou admin (mesma regra do INSERT).
DROP POLICY IF EXISTS pol_link_atualizacao_update ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_update ON link_atualizacao FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);
DROP POLICY IF EXISTS pol_link_atualizacao_delete ON link_atualizacao;
CREATE POLICY pol_link_atualizacao_delete ON link_atualizacao FOR DELETE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);

-- link_recompensa: só o dono da campanha (ou admin) adiciona links de resgate/download da recompensa;
-- a leitura fica restrita ao dono da campanha, admin ou comprador da recompensa.
DROP POLICY IF EXISTS pol_link_recompensa_select ON link_recompensa;
CREATE POLICY pol_link_recompensa_select ON link_recompensa FOR SELECT TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
    OR EXISTS (
        SELECT 1 FROM contribuicao_recompensa cr JOIN contribuicao co ON co.id_contribuicao = cr.id_contribuicao
        WHERE cr.id_recompensa = link_recompensa.id_recompensa
          AND co.id_usuario = (SELECT public.id_usuario_atual())
    )
);
DROP POLICY IF EXISTS pol_link_recompensa_insert ON link_recompensa;
CREATE POLICY pol_link_recompensa_insert ON link_recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);
-- [04-F-1] link_recompensa: assimetria proposital entre SELECT e UPDATE (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_link_recompensa_update ON link_recompensa;
CREATE POLICY pol_link_recompensa_update ON link_recompensa FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);
DROP POLICY IF EXISTS pol_link_recompensa_delete ON link_recompensa;
CREATE POLICY pol_link_recompensa_delete ON link_recompensa FOR DELETE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);

-- ============================================================
-- [04-G] ARQUIVO (2 tabelas)
-- ============================================================
ALTER TABLE arquivo_atualizacao  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivo_atualizacao  FORCE ROW LEVEL SECURITY;
ALTER TABLE arquivo_recompensa   ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivo_recompensa   FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_arqatu_select ON arquivo_atualizacao;
CREATE POLICY pol_arqatu_select ON arquivo_atualizacao FOR SELECT USING (TRUE);
-- A ligação de arquivos a atualizações exige dono da campanha ou admin.
DROP POLICY IF EXISTS pol_arqatu_insert ON arquivo_atualizacao;
CREATE POLICY pol_arqatu_insert ON arquivo_atualizacao FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha ac
        JOIN campanha c ON c.id_campanha = ac.id_campanha
        WHERE ac.id_atualizacao = arquivo_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);
DROP POLICY IF EXISTS pol_arqatu_update ON arquivo_atualizacao;
CREATE POLICY pol_arqatu_update ON arquivo_atualizacao FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha ac
        JOIN campanha c ON c.id_campanha = ac.id_campanha
        WHERE ac.id_atualizacao = arquivo_atualizacao.id_atualizacao
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('atualizacao_moderar')))
    )
);

-- arquivo_recompensa: escrita só por quem é dono da campanha dona da recompensa (ou admin), mesmo padrão
-- de arquivo_atualizacao; a leitura fica restrita ao dono da campanha, admin ou comprador da recompensa.
DROP POLICY IF EXISTS pol_arqrecompensa_select ON arquivo_recompensa;
CREATE POLICY pol_arqrecompensa_select ON arquivo_recompensa FOR SELECT TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
    OR EXISTS (
        SELECT 1 FROM contribuicao_recompensa cr JOIN contribuicao co ON co.id_contribuicao = cr.id_contribuicao
        WHERE cr.id_recompensa = arquivo_recompensa.id_recompensa
          AND co.id_usuario = (SELECT public.id_usuario_atual())
    )
);
DROP POLICY IF EXISTS pol_arqrecompensa_insert ON arquivo_recompensa;
CREATE POLICY pol_arqrecompensa_insert ON arquivo_recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
);
-- [04-G-1] arquivo_recompensa: por que existe a policy de UPDATE (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_arqrecompensa_update ON arquivo_recompensa;
CREATE POLICY pol_arqrecompensa_update ON arquivo_recompensa FOR UPDATE TO app_nestjs USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('campanha_editar')))
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

-- Anônimo exige token_sessao; a leitura por usuário autenticado segue a regra normal.
DROP POLICY IF EXISTS pol_contribuicao_select ON contribuicao;
CREATE POLICY pol_contribuicao_select ON contribuicao FOR SELECT TO app_nestjs USING (
    id_usuario = (SELECT public.id_usuario_atual()) OR (SELECT public.tem_permissao('contribuicao_visualizar_sensivel'))
);
-- A policy anônima usa a variável de sessão do NestJS.
DROP POLICY IF EXISTS pol_contribuicao_anon_select ON contribuicao;
CREATE POLICY pol_contribuicao_anon_select ON contribuicao FOR SELECT TO app_nestjs USING (
    id_usuario IS NULL
    AND token_sessao::text = current_setting('app.token_sessao_atual', true)
);
DROP POLICY IF EXISTS pol_contribuicao_insert ON contribuicao;
CREATE POLICY pol_contribuicao_insert ON contribuicao FOR INSERT TO app_nestjs WITH CHECK (
    id_usuario IS NULL OR id_usuario = (SELECT public.id_usuario_atual())
);
-- O webhook de pagamento precisa atualizar o status da contribuição sem depender do dono. Sem efeito
-- prático para o app_nestjs: o GRANT UPDATE saiu (06, [06-H]), porque USING(true) + GRANT de tabela
-- inteira deixava qualquer usuário confirmar a própria contribuição por UPDATE direto. O único caminho é
-- atualizar_status_contribuicao() (05, SECURITY DEFINER, [05-K-2]), que bypassa RLS. Mantida só por
-- documentação.
DROP POLICY IF EXISTS pol_contribuicao_update ON contribuicao;
CREATE POLICY pol_contribuicao_update ON contribuicao FOR UPDATE TO app_nestjs USING (
    true
);

DROP POLICY IF EXISTS pol_auditoria_select ON auditoria_financeira;
CREATE POLICY pol_auditoria_select ON auditoria_financeira FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('auditoria_financeira_visualizar')) OR EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = auditoria_financeira.id_contribuicao
          AND c.id_usuario = (SELECT public.id_usuario_atual())
    )
);
-- [04-H-1] auditoria_financeira: por que existem policies de escrita (ver DOCUMENTACAO_BD.md)
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
    EXISTS (SELECT 1 FROM contribuicao WHERE id_contribuicao = contribuicao_recompensa.id_contribuicao AND id_usuario = (SELECT public.id_usuario_atual()))
    OR EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = contribuicao_recompensa.id_recompensa AND c.id_usuario = (SELECT public.id_usuario_atual())
    )
    OR (SELECT public.tem_permissao('contribuicao_visualizar_sensivel'))
);
DROP POLICY IF EXISTS pol_contrib_recompensa_insert ON contribuicao_recompensa;
CREATE POLICY pol_contrib_recompensa_insert ON contribuicao_recompensa FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (SELECT 1 FROM contribuicao WHERE id_contribuicao = contribuicao_recompensa.id_contribuicao AND id_usuario = (SELECT public.id_usuario_atual()))
);

-- Aceite de termos por contribuição tem política de leitura e escrita compatível com doação anônima: o
-- SELECT tem o mesmo ramo de doador anônimo (token_sessao) de pol_contribuicao_anon_select, para o doador
-- anônimo reler o próprio aceite (o INSERT aceita c.id_usuario IS NULL).
DROP POLICY IF EXISTS pol_aceite_termo_contribuicao_select ON aceite_termo_contribuicao;
CREATE POLICY pol_aceite_termo_contribuicao_select ON aceite_termo_contribuicao FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('contribuicao_visualizar_sensivel')) OR EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = aceite_termo_contribuicao.id_contribuicao
          AND (
              c.id_usuario = (SELECT public.id_usuario_atual())
              OR (
                  c.id_usuario IS NULL
                  AND c.token_sessao::text = current_setting('app.token_sessao_atual', true)
              )
          )
    )
);
DROP POLICY IF EXISTS pol_aceite_termo_contribuicao_insert ON aceite_termo_contribuicao;
CREATE POLICY pol_aceite_termo_contribuicao_insert ON aceite_termo_contribuicao FOR INSERT TO app_nestjs WITH CHECK (
    EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = aceite_termo_contribuicao.id_contribuicao
          AND (c.id_usuario IS NULL OR c.id_usuario = (SELECT public.id_usuario_atual()))
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

-- O score é público de propósito: é a base de um segundo app do projeto (consulta pública de reputação
-- de pesquisadores cadastrados), decisão de produto. O risco de LGPD (juízo automatizado sobre pessoa
-- identificada, sem previsão de contestação, Art. 9) foi aceito conscientemente. Score de usuário
-- deletado continua invisível (usuario_visivel(), 03, [03-D]).
DROP POLICY IF EXISTS pol_score_select ON score_pesquisador;
CREATE POLICY pol_score_select ON score_pesquisador FOR SELECT TO app_nestjs USING (
    public.usuario_visivel(id_usuario)
);

DROP POLICY IF EXISTS pol_score_config_select ON public.score_config;
CREATE POLICY pol_score_config_select ON public.score_config FOR SELECT TO app_nestjs USING (true);
-- [04-I-1] score_config: por que existe a policy de INSERT (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_score_config_insert ON public.score_config;
CREATE POLICY pol_score_config_insert ON public.score_config FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('score_editar')));
-- Acesso à configuração de score depende de permissão específica.
DROP POLICY IF EXISTS pol_score_config_update ON public.score_config;
CREATE POLICY pol_score_config_update ON public.score_config FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('score_editar')));

DROP POLICY IF EXISTS pol_score_rotulo_select ON public.score_rotulo;
CREATE POLICY pol_score_rotulo_select ON public.score_rotulo FOR SELECT TO app_nestjs USING (true);
-- [04-I-2] score_rotulo: por que existe a policy de INSERT (ver DOCUMENTACAO_BD.md)
DROP POLICY IF EXISTS pol_score_rotulo_insert ON public.score_rotulo;
CREATE POLICY pol_score_rotulo_insert ON public.score_rotulo FOR INSERT TO app_nestjs WITH CHECK ((SELECT public.tem_permissao('score_editar')));
DROP POLICY IF EXISTS pol_score_rotulo_update ON public.score_rotulo;
CREATE POLICY pol_score_rotulo_update ON public.score_rotulo FOR UPDATE TO app_nestjs USING ((SELECT public.tem_permissao('score_editar')));

-- ============================================================
-- [04-L] LOG DE AUDITORIA (log_auditoria)
-- ============================================================
-- Só SELECT tem policy aqui, de propósito: app_nestjs não tem (e nunca deve ter) GRANT além de SELECT
-- nesta tabela (ver 06_grants.sql [06-L]), então uma policy de INSERT não abriria nada e nem existe, para
-- não sugerir uma porta que não existe. Quem grava é só a trigger `fn_log_auditoria()` (SECURITY DEFINER,
-- 05_regras_negocio.sql [05-L]), que roda com o privilégio de quem criou a função, não como app_nestjs.
ALTER TABLE log_auditoria ENABLE ROW LEVEL SECURITY;

-- Além de quem tem 'log_visualizar' (visão administrativa, qualquer linha), o próprio AUTOR de uma linha
-- também a enxerga ("minhas últimas ações"): autoatendimento, mesmo espírito de o usuário ver/editar a
-- própria conta sem precisar de permissão. Estritamente aditivo: é um segundo caminho de visibilidade
-- além de log_visualizar.
DROP POLICY IF EXISTS pol_log_auditoria_select ON public.log_auditoria;
CREATE POLICY pol_log_auditoria_select ON public.log_auditoria FOR SELECT TO app_nestjs USING (
    (SELECT public.tem_permissao('log_visualizar')) OR id_usuario_responsavel = (SELECT public.id_usuario_atual())
);
