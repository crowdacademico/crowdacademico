-- ============================================================
--  CrowdAcadêmico — 02: ÍNDICES
--  Depende de: 01_extensoes_enums_tabelas.sql
--  Próximo arquivo: 03_funcoes_seguranca.sql
-- ============================================================
-- [02-D] USUÁRIO
-- ============================================================
CREATE INDEX idx_seguir_pesquisador_usuario ON seguir_pesquisador(id_usuario);
CREATE INDEX idx_seguir_pesquisador_alvo    ON seguir_pesquisador(id_pesquisador);

-- Garante no máximo 1 versão de termo ativa/vigente no sistema
CREATE UNIQUE INDEX uq_termos_uso_ativo ON termos_de_uso (ativo) WHERE ativo = TRUE;
CREATE INDEX idx_usuario_termo_termo        ON usuario_termo(id_termo);

CREATE INDEX idx_notificacao_usuario        ON notificacao(id_usuario);
CREATE INDEX idx_notificacao_status         ON notificacao(status); -- acelera a fila "pendente" que o worker de envio consulta

-- Autenticação própria (caminho quente: validação de token e refresh de sessão)
CREATE INDEX idx_verificacao_email_token   ON verificacao_email(token_hash);
CREATE INDEX idx_verificacao_email_usuario ON verificacao_email(id_usuario);
CREATE INDEX idx_recuperacao_senha_token   ON recuperacao_senha(token_hash);
CREATE INDEX idx_recuperacao_senha_usuario ON recuperacao_senha(id_usuario);
CREATE INDEX idx_sessao_refresh_token      ON sessao(refresh_token_hash);
CREATE INDEX idx_sessao_usuario            ON sessao(id_usuario);

-- ============================================================
-- [02-E] CAMPANHA
-- ============================================================
CREATE INDEX idx_campanha_usuario           ON campanha(id_usuario);
CREATE INDEX idx_campanha_status            ON campanha(status);
CREATE INDEX idx_campanha_status_data_fim   ON campanha(status, data_fim);
CREATE INDEX idx_seguir_campanha_campanha   ON seguir_campanha(id_campanha);
CREATE INDEX idx_atualizacao_campanha       ON atualizacao_campanha(id_campanha);
CREATE INDEX idx_repasse_campanha           ON repasse(id_campanha);
CREATE INDEX idx_sol_encerramento_campanha  ON solicitacao_encerramento(id_campanha);
CREATE INDEX idx_historico_rejeicao_campanha ON historico_rejeicao(id_campanha);
CREATE INDEX idx_comentario_campanha        ON comentario(id_campanha);
CREATE INDEX idx_denuncia_alvo_campanha     ON denuncia(id_campanha_alvo);
CREATE INDEX idx_denuncia_alvo_pesq         ON denuncia(id_pesquisador_alvo);
CREATE INDEX idx_recompensa_campanha        ON recompensa(id_campanha);

-- ============================================================
-- [02-F] LINK
-- ============================================================
CREATE INDEX idx_link_academico_usuario     ON link_academico(id_usuario);
CREATE INDEX idx_link_atualizacao_atualizacao  ON link_atualizacao(id_atualizacao);
CREATE INDEX idx_link_atualizacao_tipolink     ON link_atualizacao(id_tipolink);
CREATE INDEX idx_link_recompensa_recompensa    ON link_recompensa(id_recompensa);
CREATE INDEX idx_link_recompensa_tipolink      ON link_recompensa(id_tipolink);

-- ============================================================
-- [02-G] ARQUIVO
-- ============================================================
CREATE INDEX idx_arquivo_atualizacao_atualizacao ON arquivo_atualizacao(id_atualizacao);
CREATE INDEX idx_arquivo_recompensa_arquivo ON arquivo_recompensa(id_arquivo);

-- Garante no máximo 1 imagem "principal" por recompensa
CREATE UNIQUE INDEX uq_arquivo_recompensa_principal ON arquivo_recompensa (id_recompensa) WHERE principal = TRUE;

-- ============================================================
-- [02-H] CONTRIBUIÇÃO
-- ============================================================
CREATE INDEX idx_contribuicao_campanha      ON contribuicao(id_campanha);
CREATE INDEX idx_contribuicao_usuario       ON contribuicao(id_usuario);
CREATE INDEX idx_contrib_recompensa_recompensa ON contribuicao_recompensa(id_recompensa);
CREATE INDEX idx_aceite_termo_contribuicao_contribuicao ON aceite_termo_contribuicao(id_contribuicao);
CREATE INDEX idx_aceite_termo_contribuicao_termo        ON aceite_termo_contribuicao(id_termo);

-- ============================================================
-- [02-I] SCORE
-- ============================================================
CREATE INDEX idx_score_config_pai           ON score_config(id_pai);
CREATE INDEX idx_score_pesq_usuario         ON score_pesquisador(id_usuario);