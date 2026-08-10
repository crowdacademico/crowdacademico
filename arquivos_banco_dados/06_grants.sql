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
--  [06-B] RBAC
--  [06-C] CONFIG
--  [06-D] USUÁRIO
--  [06-E] CAMPANHA
--  [06-F] LINK
--  [06-G] ARQUIVO
--  [06-H] CONTRIBUIÇÃO
--  [06-I] SCORE
--  [06-L] LOG DE AUDITORIA (só SELECT — ADICIONADO 03-08-2026)
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
--  permissao continua só-leitura (GRANT SELECT ON ALL TABLES já cobre) —
--  criar uma permissão nova continua sendo via seed/migração direta, de
--  propósito. papel_permissao ganhou INSERT/DELETE (03-08-2026, ver
--  [04-B-1] em 04_rls_policies.sql): admin agora consegue conceder ou
--  revogar uma permissão de um papel já existente pelo Painel Admin
--  (matriz Papel × Permissão), sem precisar mexer direto no banco.
--  papel ganhou UPDATE (só a coluna `nome`, 03-08-2026, ver [04-B-1b] em
--  04_rls_policies.sql) — renomear um papel já existente virou seguro
--  depois de `papel.codigo` existir (01_extensoes_enums_tabelas.sql
--  [01-B]): as 3 triggers de RBAC que reconheciam papel especial por
--  nome foram todas migradas pra ler `codigo`, que não tem GRANT nenhum
--  aqui — só `nome` (o rótulo) é uma coluna que a API pode escrever.
--  CRIAR um papel novo do zero continua fora de escopo.
-- ============================================================================
GRANT INSERT, DELETE ON papel_permissao TO app_nestjs;
GRANT UPDATE (nome) ON papel TO app_nestjs;

-- listar_papeis_usuario (03, [03-B], 09-08-2026) — usada por login/refresh
-- (03-auth) pra saber se mostra "Painel Admin" no dropdown do cabeçalho.
GRANT EXECUTE ON FUNCTION public.listar_papeis_usuario(INT) TO app_nestjs;

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
-- excluir_conta_usuario, 03, [03-O]), pro Admin conseguir ver quem excluiu e
-- quando (a trilha que faltava pro Art. 37 da LGPD).
-- suspenso_ate/motivo_suspensao/suspenso_por (09-08-2026, [03-N]) — leitura
-- liberada pra Consultar Usuário mostrar o estado de suspensão e pro login
-- (3-auth) checar suspenso_ate antes de emitir token. Escrita continua só
-- via suspender_usuario()/revogar_suspensao_usuario() (SECURITY DEFINER),
-- nunca por este GRANT — mesma proteção das outras colunas de moderação.
GRANT SELECT (
    id_usuario, nome, email, id_imagem_perfil, criado_em, deletado,
    deletado_em, deletado_por,
    email_verificado, senha_hash, tentativas_login_falhas, bloqueado_ate,
    ultimo_login_em, ultimo_login_ip,
    suspenso_ate, motivo_suspensao, suspenso_por
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
-- SUPERADA (30-07-2026): a correção de 28-07-2026 (item 12 da Lista C) tinha
-- tirado score_atual/score_atualizado_em desta lista, porque era uma porta dos
-- fundos pra ler o score de qualquer perfil por aqui mesmo com a policy de
-- score_pesquisador (04) já restrita. Como pol_score_select (04) voltou a ser
-- pública (decisão de produto — ver nota lá e em PENDENCIAS e correcoes.md),
-- não existe mais porta dos fundos a fechar: as 2 colunas voltam pra cá, só
-- por conveniência (evita join com score_pesquisador pra montar a página
-- pública de perfil do pesquisador). GRANT UPDATE continua sem essas 2
-- colunas ([06-D-2b] mais abaixo) — isso é integridade de escrita, não
-- privacidade, e não muda com esta decisão.
GRANT SELECT (
    id_usuario, cpf_criptografado, tipo_vinculo, vinculo_institucional,
    titulo_academico, status_pesquisador, ativado_em,
    score_atual, score_atualizado_em
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
-- CORRIGIDO (30-07-2026, [03-P]): status_pesquisador também saiu daqui. Antes,
-- pol_perfil_update (04) só libera UPDATE pro próprio dono — combinado com
-- este GRANT, o único jeito de status_pesquisador mudar de verdade era o
-- próprio pesquisador se auto-suspender/reativar, o que não faz sentido, e não
-- existia caminho nenhum pra moderação suspender outra pessoa. Agora só muda
-- via suspender_pesquisador() (SECURITY DEFINER, 03, [03-P]).
GRANT UPDATE (
    cpf_criptografado, tipo_vinculo, vinculo_institucional,
    titulo_academico, ativado_em
) ON public.perfil_pesquisador TO app_nestjs;

-- usuario: restrição por coluna sozinha não bastava aqui — email_verificado,
-- tentativas_login_falhas, bloqueado_ate, ultimo_login_em, ultimo_login_ip e deletado
-- são todos escritos LEGITIMAMENTE pelo mesmo app_nestjs que atende o endpoint de
-- perfil, então nenhuma lista de colunas separa "edição de perfil" de "operação de
-- autenticação" nesse nível. Solução: essas 6 colunas saem do GRANT por completo e só
-- mudam via função SECURITY DEFINER dedicada (mesmo padrão de atribuir_papel_padrao/
-- recalcular_score_pesquisador) — ver [03-O] em 03_funcoes_seguranca.sql. O GRANT
-- direto sobra só pro que é edição de perfil de verdade.
GRANT UPDATE (nome, id_imagem_perfil, senha_hash) ON public.usuario TO app_nestjs;

-- [06-D-2b] Funções de autenticação (ver [03-O] em 03_funcoes_seguranca.sql):
-- único jeito de mudar email_verificado, tentativas_login_falhas, bloqueado_ate,
-- ultimo_login_em, ultimo_login_ip e deletado agora que saíram do GRANT direto acima.
-- CORRIGIDO (28-07-2026, Claude Web — higiene): função nova no Postgres já nasce
-- com EXECUTE liberado pra PUBLIC por padrão (mesmo motivo por trás do comentário
-- em [06-I-1] sobre usuario_visivel/tem_permissao) — pra função que apaga conta ou
-- muda estado de autenticação, isso é folga desnecessária. REVOKE explícito antes
-- do GRANT, nas 5, mesmo não sendo hoje explorável (só app_nestjs conecta ao
-- banco). confirmar_email_usuario(INT) foi substituída por
-- confirmar_email_por_token(TEXT) — ver [03-O].
REVOKE EXECUTE ON FUNCTION public.confirmar_email_por_token(TEXT)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_falha_login(INT)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.liberar_bloqueio_login(INT)             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_login_sucesso(INT, TEXT)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.excluir_conta_usuario(INT)              FROM PUBLIC;
-- registrar_aceite_termo(INT, INT, TEXT) — ver [03-D-1], usada pelo cadastro
-- público (POST /auth/cadastro, 3-auth) pra gravar o aceite de termo no
-- mesmo instante em que a conta é criada, sem sessão ainda existindo.
REVOKE EXECUTE ON FUNCTION public.registrar_aceite_termo(INT, INT, TEXT)  FROM PUBLIC;
-- suspender_pesquisador(INT) — ver [03-P]. Mesma higiene das demais funções
-- privilegiadas: nasce com EXECUTE liberado pra PUBLIC por padrão, precisa ser
-- revogado antes do GRANT explícito.
REVOKE EXECUTE ON FUNCTION public.suspender_pesquisador(INT)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reativar_pesquisador(INT)               FROM PUBLIC;
-- suspender_usuario/revogar_suspensao_usuario/suspender_papel_usuario/
-- revogar_suspensao_papel_usuario — ver [03-N]. Mesma higiene.
REVOKE EXECUTE ON FUNCTION public.suspender_usuario(INT, TIMESTAMPTZ, TEXT)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revogar_suspensao_usuario(INT)                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.suspender_papel_usuario(INT, INT, TIMESTAMPTZ)    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revogar_suspensao_papel_usuario(INT, INT)         FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_email_por_token(TEXT)          TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.registrar_falha_login(INT)               TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.liberar_bloqueio_login(INT)              TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.registrar_login_sucesso(INT, TEXT)       TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.excluir_conta_usuario(INT)               TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.registrar_aceite_termo(INT, INT, TEXT)   TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.suspender_pesquisador(INT)               TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.reativar_pesquisador(INT)                TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.suspender_usuario(INT, TIMESTAMPTZ, TEXT)      TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.revogar_suspensao_usuario(INT)                 TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.suspender_papel_usuario(INT, INT, TIMESTAMPTZ) TO app_nestjs;
GRANT EXECUTE ON FUNCTION public.revogar_suspensao_papel_usuario(INT, INT)      TO app_nestjs;
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
-- CORRIGIDO (28-07-2026, Claude Web — 5ª auditoria): repasse saiu daqui — mesmo
-- raciocínio de contribuicao (acima, [06-H]), é dinheiro saindo e
-- pol_repasse_update (04) também é USING(true). status/repassado_em só mudam
-- via atualizar_status_repasse() (05, SECURITY DEFINER, [05-K-2]).
GRANT INSERT, UPDATE ON
    campanha, atualizacao_campanha,
    solicitacao_encerramento, historico_rejeicao, comentario, denuncia,
    recompensa
TO app_nestjs;
GRANT INSERT ON repasse TO app_nestjs;

-- ADICIONADO (31-07-2026, Alexia): orçamento e cronograma estruturados (01, [01-E]).
-- Diferente da maioria acima, ganham DELETE também — o pesquisador precisa
-- poder remover um item de orçamento/marco antes de reenviar a campanha pra
-- aprovação (as policies de DELETE em 04 já existem; sem este GRANT, a
-- policy nunca chega a ser avaliada e o DELETE falha com "permission denied").
GRANT INSERT, UPDATE, DELETE ON orcamento_campanha, marco_cronograma TO app_nestjs;

REVOKE EXECUTE ON FUNCTION public.atualizar_status_repasse(INT, VARCHAR, TIMESTAMP) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_status_repasse(INT, VARCHAR, TIMESTAMP) TO app_nestjs;

-- ADICIONADO (28-07-2026, Claude Web — 6ª auditoria): encerrar_campanhas_vencidas()
-- é chamada por agendamento (@Cron no NestJS), sem sessão de usuário — mesma
-- categoria de higiene das outras funções pré-autorizadas ([03-O],
-- atualizar_status_contribuicao/atualizar_status_repasse, acima).
REVOKE EXECUTE ON FUNCTION public.encerrar_campanhas_vencidas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.encerrar_campanhas_vencidas() TO app_nestjs;
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
-- CORRIGIDO (28-07-2026, Claude Web — 5ª auditoria, "qualquer usuário confirma
-- qualquer contribuição"): contribuicao saiu daqui — GRANT UPDATE de tabela
-- inteira + pol_contribuicao_update USING(true) (04) deixava qualquer usuário
-- confirmar a própria doação (ou a de qualquer um) direto por UPDATE.
-- Reproduzido: fraudador doa pra própria campanha, confirma sozinho, a página
-- pública passa a exibir o valor arrecadado sem pagamento real nenhum. Dali em
-- diante, status/id_transacao_api só mudam via atualizar_status_contribuicao()
-- (05, SECURITY DEFINER, [05-K-2]) — ver GRANT EXECUTE mais abaixo.
-- auditoria_financeira continua com GRANT UPDATE de tabela inteira, de
-- propósito (item 9 da PENDENCIAS — decisão consciente, ainda em aberto).
GRANT INSERT ON contribuicao TO app_nestjs;
GRANT INSERT, UPDATE ON auditoria_financeira TO app_nestjs;

REVOKE EXECUTE ON FUNCTION public.atualizar_status_contribuicao(INT, status_contribuicao, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_status_contribuicao(INT, status_contribuicao, VARCHAR) TO app_nestjs;
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
-- chamada). REVOKE explícito, mesmo padrão das 5 funções de [03-O] e de
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

-- ADICIONADO (08-08-2026) — contar_metricas_dashboard() ([03-M]), mesmo
-- motivo do GRANT acima: RPC chamada direto pelo GET /dashboard/resumo.
GRANT EXECUTE ON FUNCTION public.contar_metricas_dashboard() TO app_nestjs;

-- NOTA: o GRANT EXECUTE de atribuir_papel_padrao() fica junto da
-- própria função em 08_trigger_signup_usuario.sql, não aqui — esse
-- arquivo roda ANTES do 08 (ver ordem de dependência no cabeçalho),
-- e a função ainda não existiria neste ponto da execução.

-- ============================================================
-- [06-L] LOG DE AUDITORIA
-- ============================================================
-- ADICIONADO (03-08-2026) — ver 01_extensoes_enums_tabelas.sql [01-L].
-- SÓ SELECT, DE PROPÓSITO: sem GRANT INSERT/UPDATE/DELETE nenhum, pra
-- ninguém, nunca (nem admin) — quem grava é a trigger SECURITY DEFINER
-- fn_log_auditoria() (05_regras_negocio.sql [05-L]), que não precisa de
-- GRANT nenhum pra app_nestjs porque roda com o privilégio de quem CRIOU a
-- função, não de quem disparou o UPDATE/INSERT/DELETE que a acionou. Um
-- log que a própria aplicação consegue alterar ou apagar não serve como
-- prova de nada — a proteção real está em NÃO EXISTIR o caminho, não em a
-- RLS bloquear um caminho que existe.
GRANT SELECT ON log_auditoria TO app_nestjs;
