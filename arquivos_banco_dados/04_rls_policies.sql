-- ============================================================
--  CrowdAcadêmico — 04: ROW LEVEL SECURITY (RLS) E POLICIES
--  Depende de: 01_extensoes_enums_tabelas.sql, 03_funcoes_seguranca.sql
--  Próximo arquivo: 05_grants.sql
-- ============================================================

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — COMPLETO
-- ============================================================

-- Habilitar RLS em TODAS as tabelas
ALTER TABLE usuario              ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_pesquisador   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribuicao         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentario           ENABLE ROW LEVEL SECURITY;
ALTER TABLE denuncia             ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguir_campanha      ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguir_pesquisador   ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_academico       ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivo              ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_pesquisador    ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_rotulo         ENABLE ROW LEVEL SECURITY;

-- Tabelas de referência e auxiliares (novas)
ALTER TABLE area_conhecimento    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_link            ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivo_denuncia      ENABLE ROW LEVEL SECURITY;
ALTER TABLE papel                ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissao            ENABLE ROW LEVEL SECURITY;
ALTER TABLE papel_permissao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_papel        ENABLE ROW LEVEL SECURITY;
ALTER TABLE atualizacao_campanha ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivo_atualizacao  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_financeira ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_rejeicao   ENABLE ROW LEVEL SECURITY;
ALTER TABLE repasse              ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacao_encerramento ENABLE ROW LEVEL SECURITY;

-- Tabelas novas (termos, notificações, recompensas)
ALTER TABLE termos_de_uso        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_termo        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aceite_termo_contribuicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacao          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recompensa           ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivo_recompensa   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribuicao_recompensa ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_atualizacao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_recompensa       ENABLE ROW LEVEL SECURITY;


-- Políticas existentes (mantidas)
-- CORRIGIDO: usuário agora fica invisível quando marcado como deletado, salvo para admin.
CREATE POLICY pol_usuario_select ON usuario FOR SELECT TO anon, authenticated USING (deletado = FALSE OR public.eh_admin());
CREATE POLICY pol_usuario_update ON usuario FOR UPDATE TO authenticated USING (id_supabase = auth.uid());

CREATE POLICY pol_perfil_select ON perfil_pesquisador FOR SELECT USING (TRUE);
CREATE POLICY pol_perfil_update ON perfil_pesquisador FOR UPDATE TO authenticated USING (id_usuario = public.id_usuario_atual());

-- CORRIGIDO: campanhas públicas agora expõem apenas os status permitidos, preservando as demais para dono/admin.
CREATE POLICY pol_campanha_select ON campanha FOR SELECT USING (
    status IN ('ativo', 'sucesso', 'nao_atingido', 'encerrado')
    OR id_usuario = public.id_usuario_atual()
    OR public.eh_admin()
);
CREATE POLICY pol_campanha_insert ON campanha FOR INSERT TO authenticated WITH CHECK (id_usuario = public.id_usuario_atual());
CREATE POLICY pol_campanha_update ON campanha FOR UPDATE TO authenticated USING (id_usuario = public.id_usuario_atual() OR public.eh_admin());

-- CORRIGIDO: anon passou a exigir token_sessao; leitura de
-- contribuicao por usuário autenticado continua igual.
DROP POLICY IF EXISTS pol_contribuicao_select ON contribuicao;
CREATE POLICY pol_contribuicao_select ON contribuicao FOR SELECT TO authenticated USING (
    id_usuario = public.id_usuario_atual() OR public.eh_admin()
);
CREATE POLICY pol_contribuicao_anon_select ON contribuicao FOR SELECT TO anon USING (
    id_usuario IS NULL
    AND token_sessao::text = current_setting('request.headers', true)::json->>'x-session-token'
);
CREATE POLICY pol_contribuicao_insert ON contribuicao FOR INSERT TO anon, authenticated WITH CHECK (
    id_usuario IS NULL OR id_usuario = public.id_usuario_atual()
);

-- CORRIGIDO: comentários não endossados deixam de ser públicos;
-- só o autor, o dono da campanha ou o admin podem ver o que não
-- está endossado. Comentários endossados continuam públicos.
CREATE POLICY pol_comentario_select ON comentario FOR SELECT USING (
    endossado = TRUE
    OR id_pesquisador = public.id_usuario_atual()
    OR EXISTS (
        SELECT 1 FROM campanha
        WHERE id_campanha = comentario.id_campanha
          AND (id_usuario = public.id_usuario_atual() OR public.eh_admin())
    )
);
CREATE POLICY pol_comentario_insert ON comentario FOR INSERT TO authenticated WITH CHECK (
    id_pesquisador = public.id_usuario_atual()
    AND EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = public.id_usuario_atual() AND status_pesquisador = 'ativo')
);

CREATE POLICY pol_denuncia_select ON denuncia FOR SELECT TO authenticated USING (id_usuario = public.id_usuario_atual() OR public.eh_admin());
CREATE POLICY pol_denuncia_insert ON denuncia FOR INSERT TO authenticated WITH CHECK (id_usuario = public.id_usuario_atual());
CREATE POLICY pol_denuncia_update ON denuncia FOR UPDATE TO authenticated USING (public.eh_admin());

CREATE POLICY pol_seg_campanha_select ON seguir_campanha FOR SELECT TO authenticated USING (id_usuario = public.id_usuario_atual());
CREATE POLICY pol_seg_campanha_insert ON seguir_campanha FOR INSERT TO authenticated WITH CHECK (id_usuario = public.id_usuario_atual());

CREATE POLICY pol_seg_pesq_select ON seguir_pesquisador FOR SELECT TO authenticated USING (id_usuario = public.id_usuario_atual());
CREATE POLICY pol_seg_pesq_insert ON seguir_pesquisador FOR INSERT TO authenticated WITH CHECK (id_usuario = public.id_usuario_atual());
CREATE POLICY pol_seg_pesq_delete ON seguir_pesquisador FOR DELETE TO authenticated USING (id_usuario = public.id_usuario_atual());

CREATE POLICY pol_link_select ON link_academico FOR SELECT USING (TRUE);
CREATE POLICY pol_link_insert ON link_academico FOR INSERT TO authenticated WITH CHECK (id_usuario = public.id_usuario_atual());

CREATE POLICY pol_arquivo_select ON arquivo FOR SELECT USING (TRUE);

CREATE POLICY pol_score_select ON score_pesquisador FOR SELECT USING (TRUE);

CREATE POLICY pol_config_select ON configuracoes FOR SELECT TO anon, authenticated USING (id_usuario IS NULL OR id_usuario = public.id_usuario_atual());

CREATE POLICY "pol_score_config_select" ON public.score_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pol_score_config_update ON public.score_config FOR UPDATE TO authenticated USING (public.eh_admin());

CREATE POLICY "pol_score_rotulo_select" ON public.score_rotulo FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pol_score_rotulo_update ON public.score_rotulo FOR UPDATE TO authenticated USING (public.eh_admin());


-- =============================================
-- NOVAS POLÍTICAS PARA TABELAS FALTANTES
-- =============================================

-- Tabelas de referência (leitura pública)
CREATE POLICY pol_area_select ON area_conhecimento FOR SELECT USING (true);
CREATE POLICY pol_tipolink_select ON tipo_link FOR SELECT USING (true);
CREATE POLICY pol_motivo_select ON motivo_denuncia FOR SELECT USING (true);
CREATE POLICY pol_papel_select ON papel FOR SELECT USING (true);
CREATE POLICY pol_permissao_select ON permissao FOR SELECT USING (true);
CREATE POLICY pol_papelperm_select ON papel_permissao FOR SELECT USING (true);

-- usuario_papel
CREATE POLICY pol_usuariopapel_select ON usuario_papel FOR SELECT TO authenticated USING (id_usuario = public.id_usuario_atual() OR public.eh_admin());
CREATE POLICY pol_usuariopapel_insert ON usuario_papel FOR INSERT TO authenticated WITH CHECK (public.eh_admin());

-- atualizacao_campanha
CREATE POLICY pol_atualizacao_select ON atualizacao_campanha FOR SELECT USING (TRUE);
CREATE POLICY pol_atualizacao_insert ON atualizacao_campanha FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND id_usuario = public.id_usuario_atual())
);
CREATE POLICY pol_atualizacao_update ON atualizacao_campanha FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = atualizacao_campanha.id_campanha AND (id_usuario = public.id_usuario_atual() OR public.eh_admin()))
);

-- arquivo_atualizacao
CREATE POLICY pol_arqatu_select ON arquivo_atualizacao FOR SELECT USING (TRUE);

-- auditoria_financeira
CREATE POLICY pol_auditoria_select ON auditoria_financeira FOR SELECT TO authenticated USING (
    public.eh_admin() OR EXISTS (
        SELECT 1 FROM contribuicao c 
        WHERE c.id_contribuicao = auditoria_financeira.id_contribuicao 
          AND c.id_usuario = public.id_usuario_atual()
    )
);

-- historico_rejeicao
CREATE POLICY pol_historicorej_select ON historico_rejeicao FOR SELECT TO authenticated USING (public.eh_admin());

-- repasse
CREATE POLICY pol_repasse_select ON repasse FOR SELECT TO authenticated USING (
    public.eh_admin() OR EXISTS (
        SELECT 1 FROM campanha WHERE id_campanha = repasse.id_campanha AND id_usuario = public.id_usuario_atual()
    )
);

-- solicitacao_encerramento
CREATE POLICY pol_solicitacao_select ON solicitacao_encerramento FOR SELECT TO authenticated USING (
    public.eh_admin() OR EXISTS (
        SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = public.id_usuario_atual()
    )
);
CREATE POLICY pol_solicitacao_insert ON solicitacao_encerramento FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = solicitacao_encerramento.id_campanha AND id_usuario = public.id_usuario_atual())
);
CREATE POLICY pol_solicitacao_update ON solicitacao_encerramento FOR UPDATE TO authenticated USING (public.eh_admin());


-- =============================================
-- POLÍTICAS DAS TABELAS NOVAS
-- =============================================

-- termos_de_uso: leitura pública (precisa ser lido até por quem ainda
-- não tem conta, na tela de cadastro); só admin cria/edita uma versão.
CREATE POLICY pol_termos_select ON termos_de_uso FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pol_termos_insert ON termos_de_uso FOR INSERT TO authenticated WITH CHECK (public.eh_admin());
CREATE POLICY pol_termos_update ON termos_de_uso FOR UPDATE TO authenticated USING (public.eh_admin());

-- usuario_termo: cada usuário só vê e registra o próprio aceite.
-- Sem política de UPDATE/DELETE: aceite é um registro de auditoria,
-- não deve ser alterável por ninguém (nem pelo próprio usuário).
CREATE POLICY pol_usuario_termo_select ON usuario_termo FOR SELECT TO authenticated USING (id_usuario = public.id_usuario_atual() OR public.eh_admin());
CREATE POLICY pol_usuario_termo_insert ON usuario_termo FOR INSERT TO authenticated WITH CHECK (id_usuario = public.id_usuario_atual());

-- CORRIGIDO: aceite de termos por contribuição agora tem política de leitura e escrita compatível com doação anônima.
CREATE POLICY pol_aceite_termo_contribuicao_select ON aceite_termo_contribuicao FOR SELECT TO authenticated USING (
    public.eh_admin() OR EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = aceite_termo_contribuicao.id_contribuicao
          AND c.id_usuario = public.id_usuario_atual()
    )
);
CREATE POLICY pol_aceite_termo_contribuicao_insert ON aceite_termo_contribuicao FOR INSERT TO anon, authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM contribuicao c
        WHERE c.id_contribuicao = aceite_termo_contribuicao.id_contribuicao
          AND (c.id_usuario IS NULL OR c.id_usuario = public.id_usuario_atual())
    )
);

-- notificacao: só leitura das próprias notificações. Sem política de
-- INSERT/UPDATE para authenticated de propósito — quem cria e atualiza
-- notificação é o backend (via service_role, que ignora RLS), nunca o
-- cliente direto; senão qualquer usuário poderia forjar notificações.
CREATE POLICY pol_notificacao_select ON notificacao FOR SELECT TO authenticated USING (id_usuario = public.id_usuario_atual() OR public.eh_admin());

-- recompensa: leitura pública (aparece na página da campanha); só o
-- dono da campanha (ou admin) pode criar/editar as recompensas dela.
CREATE POLICY pol_recompensa_select ON recompensa FOR SELECT USING (TRUE);
CREATE POLICY pol_recompensa_insert ON recompensa FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = recompensa.id_campanha AND id_usuario = public.id_usuario_atual())
);
CREATE POLICY pol_recompensa_update ON recompensa FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM campanha WHERE id_campanha = recompensa.id_campanha AND (id_usuario = public.id_usuario_atual() OR public.eh_admin()))
);

-- arquivo_recompensa: leitura pública; escrita só por quem é dono da
-- campanha dona da recompensa (ou admin) — mesmo padrão de arquivo_atualizacao.
-- CORRIGIDO: arquivos de recompensa agora ficam acessíveis apenas ao dono da campanha, admin ou comprador da recompensa.
CREATE POLICY pol_arqrecompensa_select ON arquivo_recompensa FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.eh_admin())
    )
    OR EXISTS (
        SELECT 1 FROM contribuicao_recompensa cr JOIN contribuicao co ON co.id_contribuicao = cr.id_contribuicao
        WHERE cr.id_recompensa = arquivo_recompensa.id_recompensa
          AND co.id_usuario = public.id_usuario_atual()
    )
);
CREATE POLICY pol_arqrecompensa_insert ON arquivo_recompensa FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = arquivo_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.eh_admin())
    )
);

-- contribuicao_recompensa: quem contribuiu vê e registra as próprias
-- aquisições; o dono da campanha (ou admin) também pode ver, pra
-- organizar o envio/entrega das recompensas. Sem UPDATE/DELETE:
-- uma vez adquirida, é um registro de compra, não deve ser editável.
CREATE POLICY pol_contrib_recompensa_select ON contribuicao_recompensa FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM contribuicao WHERE id_contribuicao = contribuicao_recompensa.id_contribuicao AND id_usuario = public.id_usuario_atual())
    OR EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = contribuicao_recompensa.id_recompensa AND c.id_usuario = public.id_usuario_atual()
    )
    OR public.eh_admin()
);
CREATE POLICY pol_contrib_recompensa_insert ON contribuicao_recompensa FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM contribuicao WHERE id_contribuicao = contribuicao_recompensa.id_contribuicao AND id_usuario = public.id_usuario_atual())
);

-- link_atualizacao: leitura pública (a atualização em si já é pública);
-- só o dono da campanha (ou admin) adiciona links.
CREATE POLICY pol_link_atualizacao_select ON link_atualizacao FOR SELECT USING (TRUE);
CREATE POLICY pol_link_atualizacao_insert ON link_atualizacao FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM atualizacao_campanha a JOIN campanha c ON c.id_campanha = a.id_campanha
        WHERE a.id_atualizacao = link_atualizacao.id_atualizacao
          AND (c.id_usuario = public.id_usuario_atual() OR public.eh_admin())
    )
);

-- link_recompensa: leitura pública; só o dono da campanha (ou admin)
-- adiciona links de resgate/download da recompensa.
-- CORRIGIDO: links de recompensa agora ficam acessíveis apenas ao dono da campanha, admin ou comprador da recompensa.
CREATE POLICY pol_link_recompensa_select ON link_recompensa FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.eh_admin())
    )
    OR EXISTS (
        SELECT 1 FROM contribuicao_recompensa cr JOIN contribuicao co ON co.id_contribuicao = cr.id_contribuicao
        WHERE cr.id_recompensa = link_recompensa.id_recompensa
          AND co.id_usuario = public.id_usuario_atual()
    )
);
CREATE POLICY pol_link_recompensa_insert ON link_recompensa FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM recompensa r JOIN campanha c ON c.id_campanha = r.id_campanha
        WHERE r.id_recompensa = link_recompensa.id_recompensa
          AND (c.id_usuario = public.id_usuario_atual() OR public.eh_admin())
    )
);