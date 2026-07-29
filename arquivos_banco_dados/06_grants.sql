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
-- ADICIONADO (28-07-2026, Claude Web — 4ª auditoria): deletado_em/deletado_por —
-- só leitura aqui (não estão no GRANT UPDATE, [06-D-9] abaixo; só mudam via
-- excluir_conta_usuario, 03, [03-F]), pro Admin conseguir ver quem excluiu e
-- quando (a trilha que faltava pro Art. 37 da LGPD).
GRANT SELECT (
    id_usuario, nome, email, id_imagem_perfil, criado_em, deletado,
    deletado_em, deletado_por,
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
-- CORRIGIDO (28-07-2026, item 12 da Lista C — score deixa de ser público):
-- score_atual/score_atualizado_em saíram da lista abaixo. A policy de RLS de
-- score_pesquisador (04) foi corrigida pra parar de expor score publicamente,
-- mas essas 2 colunas aqui em perfil_pesquisador eram uma porta dos fundos —
-- um GRANT de coluna comum (sem RLS de coluna, que o Postgres não tem)
-- deixava o app_nestjs ler o cache do score de qualquer perfil por essa
-- tabela, mesmo com a policy de score_pesquisador já restrita. O valor
-- continua acessível de onde já era acessível de propósito: o próprio
-- pesquisador e quem tem 'score_visualizar', via score_pesquisador.score_total
-- (a policy corrigida, ver [04-I]) — a leitura via perfil_pesquisador não
-- tinha nenhuma dessas duas checagens, então precisava sair.
GRANT SELECT (
    id_usuario, cpf_criptografado, tipo_vinculo, vinculo_institucional,
    titulo_academico, status_pesquisador, ativado_em
) ON public.perfil_pesquisador TO app_nestjs;

-- CORRIGIDO: usuario, perfil_pesquisador, termos_de_uso e usuario_termo tinham DELETE
-- sem nenhuma policy de DELETE correspondente (ver [06-D] no DOCUMENTACAO_BD.md).
GRANT INSERT ON usuario, perfil_pesquisador, termos_de_uso TO app_nestjs;
GRANT UPDATE ON termos_de_uso TO app_nestjs;

-- CORRIGIDO (28-07-2026, achado pelo Claude Web): GRANT UPDATE de TABELA INTEIRA em
-- usuario/perfil_pesquisador era uma porta dos fundos grave — o GRANT SELECT já é
-- restrito por coluna (ver [06-D-2] acima), mas o UPDATE não era, e é o MESMO
-- app_nestjs que atende tanto um endpoint genérico de "editar meu perfil" quanto o
-- fluxo de autenticação. Testado como usuário comum autenticado, via UPDATE direto:
-- forjar o próprio score_atual pra 100, auto-marcar email_verificado = TRUE (bypass
-- permanente da verificação de e-mail — só precisa de um PATCH genérico no backend),
-- limpar o próprio bloqueio de login, e "ressuscitar" a própria conta excluída
-- (deletado = FALSE). Os 4 ataques funcionavam antes desta correção.
--
-- perfil_pesquisador: GRANT UPDATE por coluna, mesma lista do SELECT ([06-D-2] acima)
-- MENOS score_atual/score_atualizado_em — essas 2 só podem mudar via
-- recalcular_score_pesquisador() (SECURITY DEFINER, 05), nunca por UPDATE direto.
GRANT UPDATE (
    cpf_criptografado, tipo_vinculo, vinculo_institucional,
    titulo_academico, status_pesquisador, ativado_em
) ON public.perfil_pesquisador TO app_nestjs;

-- usuario: restrição por coluna sozinha não bastava aqui — email_verificado,
-- tentativas_login_falhas, bloqueado_ate, ultimo_login_em, ultimo_login_ip e deletado
-- são todos escritos LEGITIMAMENTE pelo mesmo app_nestjs que atende o endpoint de
-- perfil, então nenhuma lista de colunas separa "edição de perfil" de "operação de
-- autenticação" nesse nível. Solução: essas 6 colunas saem do GRANT por completo e só
-- mudam via função SECURITY DEFINER dedicada (mesmo padrão de atribuir_papel_padrao/
-- recalcular_score_pesquisador) — ver [03-F] em 03_funcoes_seguranca.sql. O GRANT
-- direto sobra só pro que é edição de perfil de verdade.
GRANT UPDATE (nome, id_imagem_perfil, senha_hash) ON public.usuario TO app_nestjs;

-- [06-D-2b] Funções de autenticação (ver [03-F] em 03_funcoes_seguranca.sql):
-- único jeito de mudar email_verificado, tentativas_login_falhas, bloqueado_ate,
-- ultimo_login_em, ultimo_login_ip e deletado agora que saíram do GRANT direto acima.
-- CORRIGIDO (28-07-2026, Claude Web — higiene): função nova no Postgres já nasce
-- com EXECUTE liberado pra PUBLIC por padrão (mesmo motivo por trás do comentário
-- em [06-I-1] sobre usuario_visivel/tem_permissao) — pra função que apaga conta ou
-- muda estado de autenticação, isso é folga desnecessária. REVOKE explícito antes
-- do GRANT, nas 5, mesmo não sendo hoje explorável (só app_nestjs conecta ao
-- banco). confirmar_email_usuario(INT) foi substituída por
-- confirmar_email_por_token(TEXT) — ver [03-F].
REVOKE EXECUTE ON FUNCTION public.confirmar_email_por_token(TEXT)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_falha_login(INT)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.liberar_bloqueio_login(INT)             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_login_sucesso(INT, TEXT)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.excluir_conta_usuario(INT)              FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_email_por_token(TEXT)          TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.registrar_falha_login(INT)               TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.liberar_bloqueio_login(INT)              TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.registrar_login_sucesso(INT, TEXT)       TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.excluir_conta_usuario(INT)               TO app_nestjs;
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
-- CORRIGIDO (28-07-2026, Claude Web — 4ª auditoria): as duas escrevem
-- (score_pesquisador/perfil_pesquisador) — recalcular_todos_os_scores() em
-- especial, sem custo de chamada nenhum pra quem chama, era negação de serviço
-- barata deixada aberta pra PUBLIC (percorre todos os pesquisadores a cada
-- chamada). REVOKE explícito, mesmo padrão das 5 funções de [03-F] e de
-- atribuir_papel_padrao (08).
REVOKE EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalcular_todos_os_scores()     FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalcular_score_pesquisador(INT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.recalcular_todos_os_scores()     TO app_nestjs;

-- ADICIONADO (28-07-2026, item 18 da Lista C): contagem agregada de seguidores,
-- chamada diretamente pelo NestJS pra exibir "N seguidores" sem expor quem segue
-- (ver [03-E]). Tecnicamente redundante com o padrão default do Postgres (EXECUTE
-- em função nova já é PUBLIC por padrão, é por isso que usuario_visivel/
-- tem_permissao não aparecem aqui) — mantido explícito pelo mesmo motivo do
-- GRANT acima: são funções chamadas diretamente como RPC pela aplicação, não só
-- usadas dentro de policy.
GRANT EXECUTE ON FUNCTION public.contar_seguidores_pesquisador(INT) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.contar_seguidores_campanha(INT)    TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.fn_precisa_revisao_score(INT)      TO app_nestjs;

-- NOTA: o GRANT EXECUTE de atribuir_papel_padrao() fica junto da
-- própria função em 08_trigger_signup_usuario.sql, não aqui — esse
-- arquivo roda ANTES do 08 (ver ordem de dependência no cabeçalho),
-- e a função ainda não existiria neste ponto da execução.
