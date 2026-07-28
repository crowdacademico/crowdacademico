-- ============================================================================
--  CROWDACADÊMICO — SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     06_grants.sql
--  Módulo:      Grants (Permissões de Schema/Tabela/Coluna/Função)
--  Depende de:  01_extensoes_enums_tabelas.sql, 04_rls_policies.sql,
--               05_regras_negocio.sql (GRANT EXECUTE nas funções do motor de score)
--  Próximo:     07_seed_dados.sql
-- ----------------------------------------------------------------------------
--  Descrição:
--  Concede à role de aplicação (app_nestjs, criada em 01) exatamente os
--  privilégios que a camada de RLS (04) pressupõe — RLS e GRANT são duas
--  checagens independentes que o Postgres exige em conjunto: sem o GRANT
--  correto, uma policy que libera acesso nunca chega a ser avaliada, e a
--  operação falha antes com "permission denied". Segue a mesma ordem de
--  blocos de domínio do arquivo 01.
--
--  Inventário Mapeado:
--  - 3 Grants globais de schema/sequência
--  - 2 Grants/Revokes de coluna (proteção de dados sensíveis)
--  - Grants de tabela para 7 blocos de domínio (RBAC não precisa de grant
--    adicional — cobertura só de leitura, ver [06-B])
--  - 2 Grants de EXECUTE em função (motor de score)
-- ----------------------------------------------------------------------------
--  SUMÁRIO DOS BLOCOS DE CÓDIGO
-- ----------------------------------------------------------------------------
--  [06-A] GERAL (schema, sequências)
--  [06-B] RBAC (sem grant adicional)
--  [06-C] CONFIG
--  [06-D] USUÁRIO
--  [06-E] CAMPANHA
--  [06-F] LINK
--  [06-G] ARQUIVO
--  [06-H] CONTRIBUIÇÃO
--  [06-I] SCORE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Contexto histórico (por que os GRANTs estão consolidados aqui):
-- Este arquivo reúne GRANTs que antes ficavam espalhados em lugares
-- diferentes — o bloco principal de schema/tabela/coluna vinha de um
-- arquivo à parte de "artifícios", o GRANT nas sequências vinha do fim do
-- arquivo de seed (como um fix avulso, provavelmente porque o erro 42501
-- só apareceu depois que alguém tentou inserir e esbarrou na falta de
-- USAGE na sequência), e o GRANT EXECUTE nas funções de score também vinha
-- do arquivo de artifícios. Consolidado aqui, nenhum GRANT corre mais o
-- risco de ficar esquecido num outro arquivo.
-- ----------------------------------------------------------------------------

-- ============================================================================
--  [06-A] GERAL (schema, sequências)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO app_nestjs;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_nestjs;

-- [06-A-1] GRANT nas sequências: por que é necessário além do GRANT INSERT (ver DOCUMENTACAO_BD.md)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_nestjs;

-- ============================================================================
--  [06-B] RBAC
--  Nenhum GRANT adicional: papel, permissao e papel_permissao só têm
--  policy de SELECT em 04_rls_policies.sql (leitura pública), já coberta
--  pelo GRANT SELECT ON ALL TABLES acima. Gestão dessas 3 tabelas acontece
--  via seed/migração direta, não pela aplicação.
-- ============================================================================

-- ============================================================================
--  [06-C] CONFIG
-- ============================================================================
-- CORRIGIDO: arquivo tinha DELETE sem nenhuma policy de DELETE (ver [06-C] no DOCUMENTACAO_BD.md).
GRANT INSERT, UPDATE, DELETE ON configuracoes TO app_nestjs;
GRANT INSERT, UPDATE ON arquivo TO app_nestjs;

-- [06-C-1] area_conhecimento / motivo_denuncia: por que só INSERT/UPDATE (ver DOCUMENTACAO_BD.md)
GRANT INSERT, UPDATE ON area_conhecimento, motivo_denuncia TO app_nestjs;

-- [06-C-2] tipo_link: por que só INSERT/UPDATE, sem DELETE (ver DOCUMENTACAO_BD.md)
GRANT INSERT, UPDATE ON tipo_link TO app_nestjs;

-- ============================================================================
--  [06-D] USUÁRIO
-- ============================================================================
-- [06-D-1] usuario / perfil_pesquisador: por que o SELECT geral foi revogado (ver DOCUMENTACAO_BD.md)
REVOKE SELECT ON public.usuario FROM app_nestjs;
REVOKE SELECT ON public.perfil_pesquisador FROM app_nestjs;

-- ALTERADO: coluna id_supabase removida da tabela usuario (autenticação própria).
-- [06-D-2] usuario: por que estas colunas específicas de auth precisam estar no GRANT (ver DOCUMENTACAO_BD.md)
-- CORRIGIDO: faltava email_verificado na lista (coluna existe desde o 01, nunca tinha GRANT).
GRANT SELECT (
    id_usuario, nome, email, id_imagem_perfil, criado_em, deletado,
    email_verificado, senha_hash, tentativas_login_falhas, bloqueado_ate,
    ultimo_login_em, ultimo_login_ip
) ON public.usuario TO app_nestjs;

-- CORRIGIDO: coluna suspenso removida da tabela (01) — tirada da lista também.
-- CORRIGIDO (28-07-2026): cpf_criptografado adicionada — a coluna é NOT NULL
-- (Alexia), então o app_nestjs já era obrigado a GRAVAR o CPF, mas continuava
-- impossibilitado de LÊ-LO (mesma coluna fora do GRANT SELECT), o que travava o
-- KYC do RF-015 (a API de pagamento precisa do CPF pra configurar o recebimento
-- do pesquisador, e o backend não tinha como enviar um dado que nem conseguia
-- selecionar). A proteção que de fato importa passa a ser a permissão
-- perfil_pesquisador_visualizar_sensivel (seedada, hoje sem nenhum efeito porque
-- nada a usava) gateando a leitura no NestJS — não a coluna ficar inacessível
-- pro próprio backend.
GRANT SELECT (
    id_usuario, cpf_criptografado, tipo_vinculo, vinculo_institucional,
    titulo_academico, status_pesquisador, ativado_em, score_atual, score_atualizado_em
) ON public.perfil_pesquisador TO app_nestjs;

-- CORRIGIDO: usuario, perfil_pesquisador, termos_de_uso e usuario_termo tinham DELETE
-- sem nenhuma policy de DELETE correspondente (ver [06-D] no DOCUMENTACAO_BD.md).
GRANT INSERT, UPDATE ON usuario, perfil_pesquisador, termos_de_uso TO app_nestjs;
-- CORRIGIDO: usuario_termo também tinha UPDATE sem nenhuma policy de UPDATE — é
-- registro de aceite de termo, nunca deveria ser editável depois de criado.
GRANT INSERT ON usuario_termo TO app_nestjs;
-- CORRIGIDO: usuario_papel e seguir_pesquisador tinham UPDATE sem nenhuma policy de
-- UPDATE — as duas só têm operação de inserir/apagar, não existe "editar" nelas.
GRANT INSERT, DELETE ON usuario_papel, seguir_pesquisador TO app_nestjs;

-- [06-D-3] notificacao: por que precisou de GRANT de INSERT/UPDATE (ver DOCUMENTACAO_BD.md)
GRANT INSERT, UPDATE ON notificacao TO app_nestjs;

-- [06-D-4] verificacao_email / recuperacao_senha / sessao: por que têm GRANT próprio (ver DOCUMENTACAO_BD.md)
-- CORRIGIDO (27-07-2026): faltava DELETE, mesmo a policy das 3 sendo FOR ALL (item 28).
-- Sem ele, um token de recuperação de senha expirado nunca sai da tabela — e o índice
-- parcial uq_recuperacao_senha_ativo_por_usuario (02) só permite 1 token não usado por
-- vez, então quem pede recuperação, não usa o link e pede de novo trava com erro de
-- unicidade, sem nenhum jeito de o app limpar o token velho antes. Dois usos previstos
-- pra este GRANT: (1) apagar o token de recuperação anterior no ato, quando um novo é
-- pedido (não marcar usado_em à força — isso faria a coluna mentir sobre o que de fato
-- aconteceu); (2) expurgo periódico por retenção (RNF-003: dado pessoal só pelo tempo
-- necessário — sessao guarda IP/user-agent). Como as policies são USING (true), o
-- DELETE vale pra qualquer linha de qualquer usuário — o expurgo do NestJS precisa ser
-- sempre uma consulta fixa com WHERE explícito em data (nunca um filtro dinâmico),
-- sugestão de janela: verificacao_email/recuperacao_senha, 30 dias após confirmado/
-- usado/expirado; sessao, 90 dias após revogado/expirado (margem pra investigar
-- incidente de segurança).
GRANT SELECT, INSERT, UPDATE, DELETE ON verificacao_email, recuperacao_senha, sessao TO app_nestjs;

-- ============================================================================
--  [06-E] CAMPANHA
-- ============================================================================
-- CORRIGIDO: só seguir_campanha tem policy de DELETE nesse bloco; as demais tinham
-- DELETE concedido sem nenhuma policy correspondente (ver [06-E] no DOCUMENTACAO_BD.md).
GRANT INSERT, UPDATE ON
    campanha, atualizacao_campanha, repasse,
    solicitacao_encerramento, historico_rejeicao, comentario, denuncia,
    recompensa
TO app_nestjs;
-- CORRIGIDO: seguir_campanha também tinha UPDATE sem nenhuma policy de UPDATE —
-- só existe inserir/apagar "seguir campanha", não faz sentido "editar" essa linha.
GRANT INSERT, DELETE ON seguir_campanha TO app_nestjs;

-- ============================================================================
--  [06-F] LINK
-- ============================================================================
GRANT INSERT, UPDATE, DELETE ON
    link_academico, link_atualizacao, link_recompensa
TO app_nestjs;

-- ============================================================================
--  [06-G] ARQUIVO
-- ============================================================================
-- CORRIGIDO: nenhuma das duas tem policy de DELETE (ver [06-G] no DOCUMENTACAO_BD.md).
GRANT INSERT, UPDATE ON
    arquivo_atualizacao, arquivo_recompensa
TO app_nestjs;

-- ============================================================================
--  [06-H] CONTRIBUIÇÃO
-- ============================================================================
-- CORRIGIDO: nenhuma das quatro tem policy de DELETE (ver [06-H] no DOCUMENTACAO_BD.md).
GRANT INSERT, UPDATE ON contribuicao, auditoria_financeira TO app_nestjs;
-- CORRIGIDO: contribuicao_recompensa e aceite_termo_contribuicao também tinham UPDATE
-- sem nenhuma policy de UPDATE — os comentários do 04 já dizem que os dois são
-- registro de auditoria/aquisição, não deveriam ser editáveis depois de criados.
GRANT INSERT ON contribuicao_recompensa, aceite_termo_contribuicao TO app_nestjs;

-- ============================================================================
--  [06-I] SCORE
-- ============================================================================
-- CORRIGIDO: nenhuma das duas tem policy de DELETE (ver [06-I] no DOCUMENTACAO_BD.md).
GRANT INSERT, UPDATE ON score_config, score_rotulo TO app_nestjs;

-- NOTA: score_pesquisador não recebe GRANT de tabela direto — toda escrita
-- passa pela função recalcular_score_pesquisador() (SECURITY DEFINER, ver
-- 05_regras_negocio.sql), que grava com os privilégios de quem criou a
-- função, não com os de app_nestjs.

-- [06-I-1] Funções do motor de score: por que precisam de GRANT EXECUTE (ver DOCUMENTACAO_BD.md)
GRANT EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.recalcular_todos_os_scores()     TO app_nestjs;

-- NOTA: o GRANT EXECUTE de atribuir_papel_padrao() fica junto da
-- própria função em 08_trigger_signup_usuario.sql, não aqui — esse
-- arquivo roda ANTES do 08 (ver ordem de dependência no cabeçalho),
-- e a função ainda não existiria neste ponto da execução.
