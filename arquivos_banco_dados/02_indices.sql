-- ============================================================================
--  CROWDACADÊMICO — SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     02_indices.sql
--  Módulo:      Índices de Performance
--  Depende de:  01_extensoes_enums_tabelas.sql
--  Próximo:     03_funcoes_seguranca.sql
-- ----------------------------------------------------------------------------
--  Descrição:
--  Cria os índices explícitos de aceleração de consulta, acompanhando a
--  mesma ordem de blocos de domínio do arquivo 01. RBAC e CONFIG não têm
--  bloco próprio aqui porque as chaves primárias e UNIQUE já criam índice
--  automático suficiente para as consultas dessas tabelas — EXCETO
--  area_conhecimento.id_pai (ver [02-C]), adicionado em 28-07-2026.
--
--  Inventário Mapeado:
--  - 44 Índices (CREATE INDEX / CREATE UNIQUE INDEX) em 7 blocos de domínio
--  (3 índices redundantes removidos, 1 movido do 01 pra cá; +5 em 28-07-2026,
--  achado do Claude Web — Postgres não cria índice automático em FK, e 16 das
--  56 estavam sem — ver [PENDENCIAS e correcoes.md] pro detalhamento de cada um)
-- ----------------------------------------------------------------------------
--  SUMÁRIO DOS BLOCOS DE CÓDIGO
-- ----------------------------------------------------------------------------
--  [02-C] CONFIG (exceção — ver nota acima)
--  [02-D] USUÁRIO
--  [02-E] CAMPANHA
--  [02-F] LINK
--  [02-G] ARQUIVO
--  [02-H] CONTRIBUIÇÃO
--  [02-I] SCORE
-- ============================================================================
-- [02-C] CONFIG
-- ============================================================
-- ADICIONADO (28-07-2026, Claude Web — "Problema 3", varredura das 56 FKs contra
-- os índices existentes): sem índice, montar a árvore do seletor de área (grande
-- área -> nível 2) faz busca completa. 90 linhas é pouco hoje, mas é o mesmo
-- padrão já usado em idx_score_config_pai ([02-I]) pra uma hierarquia idêntica.
CREATE INDEX idx_area_conhecimento_pai      ON area_conhecimento(id_pai);

-- ============================================================
-- [02-D] USUÁRIO
-- ============================================================
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

-- Garante no máximo 1 token de recuperação ativo (não usado) por usuário
CREATE UNIQUE INDEX ux_recuperacao_senha_ativo_por_usuario
    ON recuperacao_senha (id_usuario)
    WHERE usado_em IS NULL;
CREATE INDEX idx_sessao_refresh_token      ON sessao(refresh_token_hash);
CREATE INDEX idx_sessao_usuario            ON sessao(id_usuario);

-- ============================================================
-- [02-E] CAMPANHA
-- ============================================================
CREATE INDEX idx_campanha_usuario           ON campanha(id_usuario);
CREATE INDEX idx_campanha_status            ON campanha(status);
CREATE INDEX idx_campanha_status_data_fim   ON campanha(status, data_fim);
-- ADICIONADO (28-07-2026, Claude Web — "Problema 3"): o de maior impacto dos 16
-- achados. A busca pública principal do site (filtrar campanha por área — RF
-- que justificou investir nas 81 áreas de nível 2, ver [01-C]) fazia varredura
-- completa da tabela sem este índice.
CREATE INDEX idx_campanha_area_conhecimento ON campanha(id_area_conhecimento);
CREATE INDEX idx_seguir_campanha_campanha   ON seguir_campanha(id_campanha);
CREATE INDEX idx_atualizacao_campanha       ON atualizacao_campanha(id_campanha);
-- ADICIONADO (31-07-2026, Alexia): orçamento e cronograma estruturados (01, [01-E]) —
-- mesma justificativa das demais tabelas-filha de campanha acima: toda leitura
-- da página pública de uma campanha busca esses itens por id_campanha.
CREATE INDEX idx_orcamento_campanha         ON orcamento_campanha(id_campanha);
CREATE INDEX idx_marco_cronograma_campanha  ON marco_cronograma(id_campanha);
CREATE INDEX idx_repasse_campanha           ON repasse(id_campanha);
CREATE INDEX idx_sol_encerramento_campanha  ON solicitacao_encerramento(id_campanha);
CREATE INDEX idx_historico_rejeicao_campanha ON historico_rejeicao(id_campanha);
CREATE INDEX idx_comentario_campanha        ON comentario(id_campanha);
-- ADICIONADO (28-07-2026, Claude Web — "Problema 3"): acelera "meus endossos"/
-- painel de moderação por autor do comentário.
CREATE INDEX idx_comentario_pesquisador     ON comentario(id_pesquisador);
CREATE INDEX idx_denuncia_alvo_campanha     ON denuncia(id_campanha_alvo);
CREATE INDEX idx_denuncia_alvo_pesq         ON denuncia(id_pesquisador_alvo);
-- ADICIONADO (28-07-2026, Claude Web — "Problema 3"): acelera o painel de
-- moderação filtrando por motivo (ex.: "ver todas as denúncias de plágio").
CREATE INDEX idx_denuncia_motivo            ON denuncia(id_motivo);
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
-- ADICIONADO (24-08-2026, módulo 25-arquivo): suporta tanto
-- "GET /arquivo?meus=true" (se um dia existir) quanto a auditoria "o que
-- esta conta enviou" (limitar upload/hora, localizar upload de conta
-- banida) sem full scan em `arquivo`.
CREATE INDEX idx_arquivo_usuario_upload ON arquivo(id_usuario_upload);
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
CREATE INDEX idx_aceite_termo_contribuicao_termo        ON aceite_termo_contribuicao(id_termo);
-- ADICIONADO (28-07-2026, Claude Web — "Problema 3"): RNF-007 (auditoria
-- financeira) — consultar o histórico de eventos de uma contribuição específica
-- fazia varredura completa de auditoria_financeira sem este índice.
CREATE INDEX idx_auditoria_financeira_contribuicao ON auditoria_financeira(id_contribuicao);

-- ============================================================
-- [02-I] SCORE
-- ============================================================
CREATE INDEX idx_score_config_pai           ON score_config(id_pai);

-- ============================================================
-- [02-J] LOG DE AUDITORIA
-- ============================================================
-- ADICIONADO (03-08-2026): as duas consultas que a tela de "Histórico de
-- alterações" (futura) vai fazer o tempo todo — "tudo que mudou neste
-- registro" (tabela+identidade) e "tudo que este usuário mexeu" (dono da
-- FK). Sem estes dois, qualquer uma das duas vira sequential scan na
-- tabela de log inteira conforme ela cresce.
CREATE INDEX idx_log_auditoria_registro    ON log_auditoria(tabela, identidade_registro);
-- ATUALIZADO (11-08-2026, achado da parceira do Lucas: "vai virar uma
-- listona conforme o sistema cresce") — ganhou `ocorrido_em DESC` no
-- fim: id_usuario_responsavel sozinho não cobria o ORDER BY do sino
-- "Atividade recente" (minha-atividade.ts), só o filtro; ainda serve
-- sozinho pra qualquer "WHERE id_usuario_responsavel = X" que não
-- ordene por data (prefixo à esquerda).
CREATE INDEX idx_log_auditoria_responsavel ON log_auditoria(id_usuario_responsavel, ocorrido_em DESC);
-- NOVO (11-08-2026, mesmo achado) — cobre o par WHERE tabela = X / ORDER
-- BY ocorrido_em DESC que o botão "Ver log" (log-auditoria.service.
-- findall.ts) faz o tempo todo; sem isso, o filtro por tabela até usa
-- idx_log_auditoria_registro (prefixo em comum), mas a ordenação por
-- data continua sem índice, cada vez mais lenta conforme a tabela cresce.
CREATE INDEX idx_log_auditoria_tabela_ocorrido ON log_auditoria(tabela, ocorrido_em DESC);
-- NOVO (11-08-2026, mesmo achado) — sozinho (sem tabela/usuário), pensado
-- pra uma futura limpeza por idade ("DELETE FROM log_auditoria WHERE
-- ocorrido_em < ..."), que não filtra por tabela nem por usuário — os
-- dois índices acima não ajudariam essa consulta (a coluna de filtro
-- deles vem ANTES de ocorrido_em, e aqui não há filtro nenhum sobre ela).
CREATE INDEX idx_log_auditoria_ocorrido ON log_auditoria(ocorrido_em);