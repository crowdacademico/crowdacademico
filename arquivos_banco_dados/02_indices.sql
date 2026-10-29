-- ============================================================================
--  CROWDACADÊMICO - SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
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
--  automático suficiente para as consultas dessas tabelas - EXCETO
--  area_conhecimento.id_pai e os índices únicos de nome dos catálogos (ver [02-C]).
--
--  O Postgres não cria índice automático em FK; os de FK estão nos blocos de domínio abaixo. A contagem de
--  índices fica em DOCUMENTACAO_BD.md, conferida por teste.
-- ----------------------------------------------------------------------------
--  SUMÁRIO DOS BLOCOS DE CÓDIGO
-- ----------------------------------------------------------------------------
--  [02-C] CONFIG (exceção - ver nota acima)
--  [02-D] USUÁRIO
--  [02-E] CAMPANHA
--  [02-F] LINK
--  [02-G] ARQUIVO
--  [02-H] CONTRIBUIÇÃO
--  [02-I] SCORE
--  [02-J] LOG DE AUDITORIA
-- ============================================================================
-- [02-C] CONFIG
-- ============================================================
-- Sem índice, montar a árvore do seletor de área (grande área -> nível 2) faz busca completa. 90
-- linhas é pouco hoje, mas é o mesmo padrão já usado em idx_score_config_pai ([02-I]) para uma
-- hierarquia idêntica.
CREATE INDEX idx_area_conhecimento_pai      ON area_conhecimento(id_pai);

-- [02-C-1] Nome único ignorando acentos, maiúsculas e espaços repetidos (public.texto_normalizado, 01 [01-A-1]):
-- "Matemática" e "matematica " contam como o mesmo nome. Tipo de link: único no sistema. Área: único dentro da
-- mesma área-mãe (as grandes áreas, sem mãe, formam um grupo só). Motivo de denúncia: único dentro do mesmo tipo
-- (o mesmo motivo pode valer para campanha e para perfil). O Nest traduz a violação para 409 com mensagem própria
-- (commons/database/mensagens-duplicidade.constants.ts).
CREATE UNIQUE INDEX uq_tipo_link_nome_normalizado ON tipo_link (public.texto_normalizado(nome));
CREATE UNIQUE INDEX uq_area_conhecimento_nome_normalizado
    ON area_conhecimento (COALESCE(id_pai, 0), public.texto_normalizado(nome));
CREATE UNIQUE INDEX uq_motivo_denuncia_descricao_normalizada
    ON motivo_denuncia (tipo, public.texto_normalizado(descricao));

-- ============================================================
-- [02-D] USUÁRIO
-- ============================================================
CREATE INDEX idx_seguir_pesquisador_alvo    ON seguir_pesquisador(id_pesquisador);

-- Garante no máximo 1 versão ativa/vigente POR TIPO: único em "tipo" filtrado por ativo = TRUE
-- significa "entre as linhas ativas, tipo não pode repetir", ou seja, no máximo 1 termo ativo de
-- cada tipo ao mesmo tempo, nunca 2 do mesmo tipo.
CREATE UNIQUE INDEX uq_termos_uso_ativo ON termos_de_uso (tipo) WHERE ativo = TRUE;
CREATE INDEX idx_usuario_termo_termo        ON usuario_termo(id_termo);

CREATE INDEX idx_notificacao_usuario        ON notificacao(id_usuario);
CREATE INDEX idx_notificacao_status         ON notificacao(status); -- contagem por situação no painel (aba Notificações)
-- Fila do worker de e-mail (reservar_proxima_notificacao, [05-Q]): só as pendentes, na ordem em que podem sair.
CREATE INDEX idx_notificacao_fila           ON notificacao(proxima_tentativa_em) WHERE status = 'pendente';

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
-- (id_usuario, status): serve à regra de simultâneas, ao score e a "minhas campanhas", e à FK.
CREATE INDEX idx_campanha_usuario           ON campanha(id_usuario, status);
CREATE INDEX idx_campanha_status_data_fim   ON campanha(status, data_fim);
-- O índice de maior impacto: a busca pública principal do site (filtrar campanha por área, ver [01-C]); sem
-- ele, a busca varre a tabela inteira.
CREATE INDEX idx_campanha_area_conhecimento ON campanha(id_area_conhecimento);
CREATE INDEX idx_seguir_campanha_campanha   ON seguir_campanha(id_campanha);
CREATE INDEX idx_atualizacao_campanha       ON atualizacao_campanha(id_campanha);
-- Orçamento e cronograma estruturados (01, [01-E]): mesma justificativa das demais tabelas-filha de
-- campanha acima; toda leitura da página pública de uma campanha busca esses itens por id_campanha.
CREATE INDEX idx_orcamento_campanha         ON orcamento_campanha(id_campanha);
CREATE INDEX idx_marco_cronograma_campanha  ON marco_cronograma(id_campanha);
CREATE INDEX idx_repasse_campanha           ON repasse(id_campanha);
CREATE INDEX idx_repasse_status             ON repasse(status);
-- Fila do worker de repasse (reservar_proximo_repasse): só o que ainda pode precisar de trabalho.
CREATE INDEX idx_repasse_fila               ON repasse(proxima_tentativa_em, id_repasse) WHERE status IN ('pendente', 'processando');
-- O webhook de repasse acha o registro por (provedor, id da transferência).
CREATE UNIQUE INDEX uq_repasse_provedor_transferencia ON repasse(provedor, id_transferencia_api) WHERE id_transferencia_api IS NOT NULL;
-- Contribuições de um repasse (reservar_proximo_repasse e concluir_repasse somam e fecham por aqui).
CREATE INDEX idx_contribuicao_repasse      ON contribuicao(id_repasse) WHERE id_repasse IS NOT NULL;
-- Fila de reconciliação (reservar_contribuicoes_para_reconciliar): só Pix/cartão pendente com cobrança no gateway.
CREATE INDEX idx_contribuicao_reconciliar   ON contribuicao(criado_em) WHERE status = 'pendente' AND id_transacao_api IS NOT NULL;
-- Fila de cancelamento de cobrança no provedor (reservar_cobrancas_para_cancelar).
CREATE INDEX idx_contribuicao_cancelar_cobranca ON contribuicao(criado_em) WHERE status IN ('expirado', 'erro') AND id_transacao_api IS NOT NULL AND cobranca_cancelada_em IS NULL;
CREATE INDEX idx_auditoria_financeira_repasse ON auditoria_financeira(id_repasse) WHERE id_repasse IS NOT NULL;
CREATE INDEX idx_sol_encerramento_campanha  ON solicitacao_encerramento(id_campanha);
-- Um pedido de encerramento pendente por vez em cada campanha (RF-064).
CREATE UNIQUE INDEX uq_solicitacao_encerramento_pendente ON solicitacao_encerramento(id_campanha) WHERE status = 'pendente';
CREATE INDEX idx_historico_rejeicao_campanha ON historico_rejeicao(id_campanha);
-- FK sem índice que o score consulta.
CREATE INDEX idx_historico_rejeicao_dono    ON historico_rejeicao(id_usuario_dono);
CREATE INDEX idx_comentario_campanha        ON comentario(id_campanha);
-- (id_pesquisador, criado_em): a consulta do limite de frequência de comentário e a busca por autor ("meus
-- endossos", painel de moderação).
CREATE INDEX idx_comentario_pesquisador     ON comentario(id_pesquisador, criado_em);
CREATE INDEX idx_denuncia_alvo_campanha     ON denuncia(id_campanha_alvo);
CREATE INDEX idx_denuncia_alvo_pesq         ON denuncia(id_pesquisador_alvo);
-- Acelera o painel de moderação filtrando por motivo (ex.: "ver todas as denúncias de plágio").
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
-- Suporta tanto "GET /arquivo?meus=true" (se um dia existir) quanto a auditoria "o que esta conta
-- enviou" (limitar upload/hora, localizar upload de conta banida) sem full scan em `arquivo`.
CREATE INDEX idx_arquivo_usuario_upload ON arquivo(id_usuario_upload);
CREATE INDEX idx_arquivo_atualizacao_atualizacao ON arquivo_atualizacao(id_atualizacao);
-- arquivo_recompensa(id_arquivo) não precisa de índice aqui: UK_ARQUIVO_RECOMPENSA_ARQUIVO (01) já cria um.

-- Garante no máximo 1 imagem "principal" por recompensa
CREATE UNIQUE INDEX uq_arquivo_recompensa_principal ON arquivo_recompensa (id_recompensa) WHERE principal = TRUE;

-- ============================================================
-- [02-H] CONTRIBUIÇÃO
-- ============================================================
CREATE INDEX idx_contribuicao_campanha      ON contribuicao(id_campanha);
CREATE INDEX idx_contribuicao_usuario       ON contribuicao(id_usuario);
CREATE INDEX idx_contrib_recompensa_recompensa ON contribuicao_recompensa(id_recompensa);
CREATE INDEX idx_aceite_termo_contribuicao_termo        ON aceite_termo_contribuicao(id_termo);
-- RNF-007 (auditoria financeira): o histórico de eventos de uma contribuição é lido por id_contribuicao.
CREATE INDEX idx_auditoria_financeira_contribuicao ON auditoria_financeira(id_contribuicao);
-- Fila de webhooks ainda não processados (reprocessamento/reconciliação lê só o que sobrou).
CREATE INDEX idx_evento_pagamento_pendente ON evento_pagamento(processado_em) WHERE processado_em IS NULL;
-- Fila de revisão manual (evento que o sistema deliberadamente NÃO aplicou): separa "precisa de gente" de "vale tentar de novo".
-- Fila do worker de estorno (proximo_estorno_pendente): só contribuição a devolver, na ordem em que será tentada.
CREATE INDEX idx_contribuicao_fila_estorno ON contribuicao(proxima_tentativa_estorno_em, id_contribuicao) WHERE status = 'a_devolver';
CREATE INDEX idx_evento_pagamento_revisao_manual ON evento_pagamento(revisao_manual_em) WHERE revisao_manual_em IS NOT NULL AND processado_em IS NULL;
-- Mesma transação no mesmo gateway nunca aparece em duas contribuições. Parcial: contribuição 'pendente' ainda não
-- tem id_transacao_api e não pode competir nesta unicidade.
CREATE UNIQUE INDEX uq_contribuicao_provedor_transacao ON contribuicao(provedor, id_transacao_api) WHERE id_transacao_api IS NOT NULL;
-- Os workers de expiração e de estorno só olham estes dois status.
CREATE INDEX idx_contribuicao_status_aberto ON contribuicao(status) WHERE status IN ('pendente', 'a_devolver');

-- ============================================================
-- [02-I] SCORE
-- ============================================================
CREATE INDEX idx_score_config_pai           ON score_config(id_pai);

-- ============================================================
-- [02-I-NOTIFICACOES] Índices de modelos, regras e sino interno
-- ============================================================
-- Só uma versão ativa por evento/canal/idioma (a tela desativa a anterior ao criar a nova).
CREATE UNIQUE INDEX idx_modelo_mensagem_ativo_unico
    ON modelo_mensagem(tipo_evento, canal, idioma) WHERE ativo = TRUE;
-- (regra_notificacao não precisa de índice próprio: UK_REGRA_NOTIFICACAO_EVENTO_CANAL já cobre a busca por evento+canal.)
CREATE INDEX idx_notificacao_canal_interna_usuario_nao_lida
    ON notificacao(id_usuario, criado_em DESC) WHERE canal = 'interna' AND lida_em IS NULL;
CREATE INDEX idx_notificacao_canal_interna_usuario_data
    ON notificacao(id_usuario, criado_em DESC, id_notificacao DESC) WHERE canal = 'interna';

-- ============================================================
-- [02-J] LOG DE AUDITORIA
-- ============================================================
-- As duas consultas mais frequentes do log: "tudo que mudou neste registro" (tabela + identidade, o histórico de
-- alterações de cada tela) e "tudo que este usuário mexeu" (índice seguinte). Sem eles, as duas varrem a tabela
-- de log inteira, cada vez mais lenta conforme ela cresce.
CREATE INDEX idx_log_auditoria_registro    ON log_auditoria(tabela, identidade_registro);
-- `ocorrido_em DESC` no fim: cobre o ORDER BY do sino "Atividade recente" (minha-atividade.ts);
-- id_usuario_responsavel sozinho cobria só o filtro. Ainda serve sozinho para qualquer "WHERE
-- id_usuario_responsavel = X" que não ordene por data (prefixo à esquerda).
CREATE INDEX idx_log_auditoria_responsavel ON log_auditoria(id_usuario_responsavel, ocorrido_em DESC);
-- Cobre o par WHERE tabela = X / ORDER BY ocorrido_em DESC que o botão "Ver log"
-- (log-auditoria.service.findall.ts) faz o tempo todo; sem isso, o filtro por tabela até usa
-- idx_log_auditoria_registro (prefixo em comum), mas a ordenação por data continua sem índice, cada
-- vez mais lenta conforme a tabela cresce.
CREATE INDEX idx_log_auditoria_tabela_ocorrido ON log_auditoria(tabela, ocorrido_em DESC);
-- BRIN: tabela que só cresce, apagada por data (limpar_log_auditoria) e sempre lida com tabela ou
-- usuário no filtro (os índices acima), então um B-tree inteiro só ocuparia espaço. Serve à limpeza
-- por idade ("DELETE FROM log_auditoria WHERE ocorrido_em < ..."), que não filtra por tabela nem
-- por usuário, e para a qual os dois índices acima não ajudam (a coluna de filtro deles vem ANTES de
-- ocorrido_em).
CREATE INDEX idx_log_auditoria_ocorrido ON log_auditoria USING brin (ocorrido_em);