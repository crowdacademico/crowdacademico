-- ============================================================
--  CrowdAcadêmico — 02: ÍNDICES
--  Depende de: 01_extensoes_enums_tabelas.sql
--  Próximo arquivo: 03_funcoes_seguranca.sql
-- ============================================================

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_campanha_usuario           ON campanha(id_usuario);
CREATE INDEX idx_campanha_status            ON campanha(status);
CREATE INDEX idx_contribuicao_campanha      ON contribuicao(id_campanha);
CREATE INDEX idx_contribuicao_usuario       ON contribuicao(id_usuario);
CREATE INDEX idx_denuncia_alvo_campanha     ON denuncia(id_campanha_alvo);
CREATE INDEX idx_denuncia_alvo_pesq         ON denuncia(id_pesquisador_alvo);
CREATE INDEX idx_score_pesq_usuario         ON score_pesquisador(id_usuario);
CREATE INDEX idx_score_config_pai           ON score_config(id_pai);
CREATE INDEX idx_atualizacao_campanha       ON atualizacao_campanha(id_campanha);
CREATE INDEX idx_link_academico_usuario     ON link_academico(id_usuario);
CREATE INDEX idx_seguir_pesquisador_usuario ON seguir_pesquisador(id_usuario);
CREATE INDEX idx_seguir_pesquisador_alvo    ON seguir_pesquisador(id_pesquisador);

-- Índices das tabelas novas (termos_de_uso, notificacao, recompensa)
CREATE INDEX idx_usuario_termo_termo        ON usuario_termo(id_termo);
CREATE INDEX idx_notificacao_usuario        ON notificacao(id_usuario);
CREATE INDEX idx_notificacao_status         ON notificacao(status);          -- acelera a fila "pendente" que o worker de envio consulta
CREATE INDEX idx_recompensa_campanha        ON recompensa(id_campanha);
CREATE INDEX idx_arquivo_recompensa_arquivo ON arquivo_recompensa(id_arquivo);

-- Índices das tabelas de contribuicao_recompensa / links reaproveitados
CREATE INDEX idx_contrib_recompensa_recompensa ON contribuicao_recompensa(id_recompensa);
CREATE INDEX idx_link_atualizacao_atualizacao  ON link_atualizacao(id_atualizacao);
CREATE INDEX idx_link_atualizacao_tipolink     ON link_atualizacao(id_tipolink);
CREATE INDEX idx_link_recompensa_recompensa    ON link_recompensa(id_recompensa);
CREATE INDEX idx_link_recompensa_tipolink      ON link_recompensa(id_tipolink);
-- [melhoria] impede duas versões "ativo = TRUE" ao mesmo tempo —
-- sem isso, nada no schema garante que existe só 1 termo vigente.
CREATE UNIQUE INDEX uq_termos_uso_ativo ON termos_de_uso (ativo) WHERE ativo = TRUE;
-- [melhoria] só pode existir 1 imagem "principal" por recompensa
CREATE UNIQUE INDEX uq_arquivo_recompensa_principal ON arquivo_recompensa (id_recompensa) WHERE principal = TRUE;
