-- ============================================================================
--  CROWDACADÊMICO - SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     07_seed_dados.sql
--  Módulo:      Seed de Dados (mínimo 7 registros por tabela)
--  Depende de:  01 a 06 (precisa das tabelas, RLS, grants e das funções de
--               score já criadas - o INSERT final chama
--               public.recalcular_todos_os_scores(), definida em 05)
--  Próximo:     08_trigger_signup_usuario.sql (opcional/manual)

--  Senha de todo mundo no seed = DevTcc123!
-- ----------------------------------------------------------------------------
--  Descrição:
--  Povoa o banco com dados de demonstração/teste, na ordem física exigida
--  pelas dependências de Foreign Key - que NÃO é a mesma ordem alfabética
--  do índice global de letras (ver DOCUMENTACAO_BD.md). Alguns blocos são
--  intercalados de propósito: por exemplo, o seed de `configuracoes`
--  (letra C) só roda depois do de `usuario` (letra D) porque duas de suas
--  linhas referenciam o usuário admin. Os marcadores `[07-X]` abaixo
--  indicam a que domínio cada bloco pertence, mesmo fora de ordem.
--
--  Inventário Mapeado: 30 blocos de INSERT cobrindo as 39 tabelas com
--  dados obrigatórios de seed (tabelas só de associação/log ficam vazias
--  até o primeiro uso real da aplicação).
-- ----------------------------------------------------------------------------
--  CAMADAS DE DEPENDÊNCIA (o critério real por trás da ordem abaixo)
-- ----------------------------------------------------------------------------
--  Camada 1 - Tabelas-base: não dependem de nenhuma linha inserida por este
--  arquivo, só das tabelas fixas do 01 (ENUMs, etc). Podem ser inseridas em
--  qualquer ordem entre si.
--    score_config, score_rotulo, papel, permissao, papel_permissao,
--    tipo_link, area_conhecimento, motivo_denuncia, arquivo, usuario,
--    termos_de_uso
--
--  Camada 2 - Dependem de uma linha da Camada 1 já existir (o `usuario`
--  admin, sobretudo): usuario_papel, usuario_termo, configuracoes,
--  perfil_pesquisador, link_academico, campanha, seguir_pesquisador,
--  notificacao
--
--  Camada 3 - Dependem de uma linha da Camada 2 (principalmente de
--  `campanha` ou `contribuicao` já existirem): seguir_campanha,
--  contribuicao, aceite_termo_contribuicao, auditoria_financeira,
--  atualizacao_campanha, arquivo_atualizacao, repasse,
--  solicitacao_encerramento, historico_rejeicao, comentario, denuncia
--
--  Por isso o arquivo não segue a ordem alfabética do índice global de
--  letras (ver DOCUMENTACAO_BD.md) - a ordem física real é por camada de
--  dependência, e uma letra pode aparecer em mais de uma camada (ex.:
--  `configuracoes`, letra C, só entra na Camada 2 porque duas de suas
--  linhas referenciam o usuário admin).
-- ----------------------------------------------------------------------------
--  SUMÁRIO DOS BLOCOS DE CÓDIGO (ordem de execução, não alfabética)
-- ----------------------------------------------------------------------------
--  [07-I] score_config, score_rotulo                    (Camada 1)
--  [07-B] papel, permissao, papel_permissao              (Camada 1)
--  [07-C] tipo_link, area_conhecimento, motivo_denuncia,
--         arquivo                                        (Camada 1)
--  [07-D] usuario, usuario_papel                (Camada 1, Camada 2)
--  [07-D] termos_de_uso, usuario_termo           (Camada 1, Camada 2)
--  [07-C] configuracoes (vem depois de D de propósito - ver acima) (Camada 2)
--  [07-D] perfil_pesquisador                              (Camada 2)
--  [07-F] link_academico                                  (Camada 2)
--  [07-E] campanha                                        (Camada 2)
--  [07-E] seguir_campanha                                 (Camada 3)
--  [07-D] seguir_pesquisador                              (Camada 2)
--  [07-H] contribuicao, aceite_termo_contribuicao,
--         auditoria_financeira                            (Camada 3)
--  [07-E] atualizacao_campanha                            (Camada 3)
--  [07-G] arquivo_atualizacao                             (Camada 3)
--  [07-E] repasse, solicitacao_encerramento, historico_rejeicao,
--         comentario, denuncia                            (Camada 3)
--  [07-D] notificacao (posicionado no fim do arquivo, fisicamente,
--         mas depende só de usuario - Camada 2)
-- ============================================================================

-- [07-I-1] score_config: dimensões raiz e subitens do motor de pontuação
INSERT INTO score_config (nome, descricao, peso, id_pai) VALUES
    ('perfil_academico',     'Perfil Acadêmico Declarado',  30, NULL),
    ('historico_plataforma', 'Histórico na Plataforma',     25, NULL),
    ('atualizacao_campanha', 'Atualização da Campanha',     20, NULL),
    ('reputacao_comunidade', 'Reputação da Comunidade',     25, NULL);

-- Subitens
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'lattes',      'Currículo Lattes válido informado',  8, id_score_config FROM score_config WHERE nome = 'perfil_academico';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'orcid',       'ORCID iD informado',                 8, id_score_config FROM score_config WHERE nome = 'perfil_academico';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'linkedin',    'LinkedIn ou site acadêmico',          4, id_score_config FROM score_config WHERE nome = 'perfil_academico';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'instituicao', 'Instituição de vínculo preenchida',   5, id_score_config FROM score_config WHERE nome = 'perfil_academico';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'titulo',      'Título acadêmico informado',          5, id_score_config FROM score_config WHERE nome = 'perfil_academico';

INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'campanhas_concluidas', 'Campanhas concluídas e encerradas', 15, id_score_config FROM score_config WHERE nome = 'historico_plataforma';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'taxa_aprovacao',       'Taxa de aprovação de campanhas',    10, id_score_config FROM score_config WHERE nome = 'historico_plataforma';

INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'regularidade_atualizacoes',   'Regularidade de atualizações de progresso',      8,  id_score_config FROM score_config WHERE nome = 'atualizacao_campanha';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'tempestividade_atualizacoes', 'Qualidade e tempestividade das atualizações',   12, id_score_config FROM score_config WHERE nome = 'atualizacao_campanha';

-- volume_denuncias/gravidade_denuncias (1 e 3): calcular_score_reputacao lê estes valores daqui, a tabela que o
-- Painel Admin realmente controla (editar o peso recalcula o score de todos).
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'volume_denuncias',    'Custo por denúncia confirmada (pontos descontados por denúncia)', 1, id_score_config FROM score_config WHERE nome = 'reputacao_comunidade';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'gravidade_denuncias', 'Custo extra por denúncia confirmada procedente',                  3, id_score_config FROM score_config WHERE nome = 'reputacao_comunidade';

INSERT INTO score_rotulo (rotulo, descricao, score_minimo, score_maximo) VALUES
('Atenção',       'Pesquisador com perfil incompleto ou histórico problemático',  0,  24),
('Em Construção', 'Pesquisador em início de trajetória na plataforma',           25,  49),
('Confiável',     'Pesquisador com bom histórico e perfil consistente',          50,  74),
('Referência',    'Pesquisador com excelente reputação e alto engajamento',      75, 100);

-- [07-B-1] papel: por que estes 7 papéis e por que os IDs não são fixados (ver DOCUMENTACAO_BD.md)
-- `codigo` (01, [01-B]) é seedado igual ao `nome` de cada papel, de propósito: o texto que as 3 triggers
-- procuram continua o mesmo, agora numa coluna que o rename de `nome` não afeta.
-- Ordem = maior poder -> menor poder (mesma de ORDEM_PAPEIS_POR_PODER no React) só para os IDs saírem
-- bonitinhos (1=admin... 7=usuario) num banco novo. Não referenciado por número em nenhum lugar
-- (papel_permissao e usuario_papel, abaixo, buscam papel por `nome`), então reordenar aqui é seguro e não
-- quebra nada além do id_papel gerado.
INSERT INTO papel (nome, codigo) VALUES
('admin', 'admin'),
('moderador', 'moderador'),
('revisor', 'revisor'),
('suporte', 'suporte'),
('curador', 'curador'),
('pesquisador', 'pesquisador'),
('usuario', 'usuario')
ON CONFLICT (nome) DO NOTHING;

-- [07-B-2] permissao: por que o formato "entidade_acao" (ver DOCUMENTACAO_BD.md)
-- Agrupado por domínio, na mesma ordem das letras do Índice Global (ver DOCUMENTACAO_BD.md): A, B, C, D, E, F,
-- H, I, L (G/J/K não têm nenhuma permissão própria hoje). Só id_permissao sai agrupado: papel_permissao
-- (abaixo, [07-B-3]) resolve por NOME, nunca por número, então reordenar aqui não quebra nada.
INSERT INTO permissao (nome) VALUES
-- A - Visão Geral & Configuração Inicial
('relatorio_visualizar'),
-- B - RBAC (Papéis, Permissões e Vinculação)
('papel_atribuir'),
('papel_gerenciar'),
-- C - CONFIG (Configurações, Catálogos e Arquivo Base)
('configuracao_gerenciar'),
('tipolink_gerenciar'),
('area_conhecimento_gerenciar'),
('motivo_denuncia_gerenciar'),
-- Ver nota em link_academico_gerenciar (grupo F): as duas fecham a remoção de eh_admin() de 100% das RLS
-- policies.
('arquivo_gerenciar'),
-- D - USUÁRIO (Contas, Perfis, Autenticação, Termos e Sessões)
('usuario_suspender'),
('usuario_visualizar_sensivel'),
-- cpf_criptografado está no GRANT SELECT de perfil_pesquisador (06), então o app_nestjs pode ler a coluna. Esta
-- permissão é o gate real de quem, na camada NestJS, pode pedir esse dado (RLS só filtra linha, não protege
-- coluna: o controle de "quem lê o CPF" é da aplicação).
('perfil_pesquisador_visualizar_sensivel'),
-- Gate de corrigir_cpf_pesquisador() (03, [03-Q]). cpf_criptografado/cpf_hash não estão no GRANT UPDATE direto
-- de perfil_pesquisador (06): o próprio pesquisador não pode alterar o próprio CPF (RF-017, correção só via
-- suporte); esta permissão decide quem pode chamar a função de correção.
('perfil_pesquisador_corrigir_cpf'),
-- Gate de criar_perfil_pesquisador_para_outro() (03, [03-R]). O self-service (POST /perfil-pesquisador) sempre
-- cria em nome de quem está logado; esta permissão decide quem pode criar perfil de pesquisador em nome de
-- OUTRA pessoa (Bancada do Pesquisador, Campo de Testes).
('perfil_pesquisador_criar_para_outro'),
-- Gate de alterar_perfil_pesquisador_de_outro() (03, [03-U]): o modal de Alterar Usuário salva
-- vínculo/título acadêmico de QUEM está sendo editado (PATCH /perfil-pesquisador/:id); o self-service (sem id)
-- só edita o próprio perfil.
('perfil_pesquisador_alterar_de_outro'),
-- Campo de Testes: Admin cria campanha em nome de outro pesquisador (mesma classe de
-- perfil_pesquisador_criar_para_outro, acima) e exclui campanha à força, ignorando status (limpeza de dado de
-- teste; nunca oferecida no painel real).
('campanha_criar_para_outro'),
('campanha_excluir_forcado'),
('termos_uso_gerenciar'),
-- NOTA: estas 3 são propositalmente sem policy de RLS - verificacao_email,
-- recuperacao_senha e sessao já têm policy FOR ALL USING(true) de propósito (o
-- projeto decidiu que a autorização desses fluxos fica no NestJS, não na RLS,
-- porque acontecem antes de existir sessão de usuário). Criar policy pra elas
-- seria redundante.
('sessao_revogar'),
('recuperacao_senha_revogar'),
('verificacao_email_reenviar'),
-- O worker de envio de notificação precisa de uma permissão própria para ler a fila (pol_notificacao_select,
-- 04); emprestar 'usuario_visualizar_sensivel' quebraria o envio de e-mail se essa permissão fosse restringida
-- por privacidade no futuro.
('notificacao_processar'),
-- excluir_conta_usuario/liberar_bloqueio_login (03, [03-O]) são SECURITY DEFINER e desligam a RLS, então a
-- checagem de "quem pode agir sobre a conta de outra pessoa" fica dentro da própria função. usuario_excluir
-- gateia excluir a conta de OUTRO usuário (a própria sempre é permitida, sem a permissão); usuario_desbloquear
-- gateia liberar_bloqueio_login por inteiro (sempre ação de suporte/admin sobre a conta de outra pessoa).
('usuario_excluir'),
('usuario_desbloquear'),
-- E - CAMPANHA (Campanhas, Atualizações, Comentários, Denúncias, Recompensas)
('campanha_aprovar'),
('campanha_rejeitar'),
('campanha_editar'),
('denuncia_responder'),
-- RF-108: sem esta permissão, encerrar campanha por moderação exigia campanha_aprovar/campanha_rejeitar/
-- solicitacao_encerramento_decidir (só o admin tinha as três), e um moderador que julgava a denúncia procedente
-- não conseguia agir sobre o próprio julgamento. Permissão estreita de propósito: só a transição ativo ->
-- encerrado_moderacao, ver fn_valida_transicao_campanha (05, [05-K-2]).
('campanha_encerrar_moderacao'),
('solicitacao_encerramento_decidir'),
('comentario_moderar'),
('atualizacao_moderar'),
('repasse_aprovar'),
-- F - LINK (Vinculação de URLs Externas)
-- Junto com arquivo_gerenciar (grupo C): as duas fecham a remoção de eh_admin() de 100% das RLS policies (ver
-- RBAC-pontos-discutidos.md).
('link_academico_gerenciar'),
-- H - CONTRIBUIÇÃO (Apoios, Auditoria e Termos Financeiros)
('contribuicao_visualizar_sensivel'),
('auditoria_financeira_visualizar'),
-- I - SCORE (Parâmetros, Rótulos e motor de cálculo)
('score_editar'),
-- Permissão do catálogo sem uso em policy hoje: pol_score_select (04) é público (o score é a base do segundo
-- app do projeto), então esta permissão não gateia mais a leitura do score.
('score_visualizar'),
-- L - LOG DE AUDITORIA
-- Gate de SELECT em log_auditoria (ver pol_log_auditoria_select, 04_rls_policies.sql [04-L]): sem esta
-- permissão, só o próprio autor de uma linha a enxerga. trg_permissao_auto_admin (05, [05-K-3]) já concede ela
-- ao papel 'admin' sozinho assim que a linha abaixo é inserida; a linha explícita em [07-B-3] é só
-- documentação, mesmo padrão das outras permissões desta lista.
('log_visualizar')
ON CONFLICT (nome) DO NOTHING;

-- [07-B-3] papel_permissao: por que as linhas ('admin', ...) estão explícitas mesmo sendo redundantes com a trigger (ver DOCUMENTACAO_BD.md)
-- Ordem cosmética: dentro do admin, as permissões seguem a MESMA ordem por domínio de [07-B-2] (A,B,C,D,E,F,H,I,L);
-- o WHERE...IN não liga para a ordem das linhas, só ajuda quem lê o arquivo a achar as coisas. Os grupos de
-- papel seguem a ordem de poder (admin -> moderador -> revisor -> suporte -> curador, a mesma de
-- ORDEM_PAPEIS_POR_PODER no React).
INSERT INTO papel_permissao (id_papel, id_permissao)
SELECT p.id_papel, perm.id_permissao
FROM papel p
JOIN permissao perm ON TRUE
WHERE (p.nome, perm.nome) IN (
    -- A
    ('admin', 'relatorio_visualizar'),
    -- B
    ('admin', 'papel_atribuir'),
    ('admin', 'papel_gerenciar'),
    -- C
    ('admin', 'configuracao_gerenciar'),
    ('admin', 'tipolink_gerenciar'),
    ('admin', 'area_conhecimento_gerenciar'),
    ('admin', 'motivo_denuncia_gerenciar'),
    ('admin', 'arquivo_gerenciar'),
    -- D
    ('admin', 'usuario_suspender'),
    ('admin', 'usuario_visualizar_sensivel'),
    ('admin', 'perfil_pesquisador_visualizar_sensivel'),
    ('admin', 'perfil_pesquisador_corrigir_cpf'),
    ('admin', 'perfil_pesquisador_criar_para_outro'),
    ('admin', 'perfil_pesquisador_alterar_de_outro'),
    ('admin', 'campanha_criar_para_outro'),
    ('admin', 'campanha_excluir_forcado'),
    ('admin', 'termos_uso_gerenciar'),
    ('admin', 'sessao_revogar'),
    ('admin', 'recuperacao_senha_revogar'),
    ('admin', 'verificacao_email_reenviar'),
    ('admin', 'notificacao_processar'),
    ('admin', 'usuario_excluir'),
    ('admin', 'usuario_desbloquear'),
    -- E
    ('admin', 'campanha_aprovar'),
    ('admin', 'campanha_rejeitar'),
    ('admin', 'campanha_editar'),
    ('admin', 'denuncia_responder'),
    ('admin', 'campanha_encerrar_moderacao'),
    ('admin', 'solicitacao_encerramento_decidir'),
    ('admin', 'comentario_moderar'),
    ('admin', 'atualizacao_moderar'),
    ('admin', 'repasse_aprovar'),
    -- F
    ('admin', 'link_academico_gerenciar'),
    -- H
    ('admin', 'contribuicao_visualizar_sensivel'),
    ('admin', 'auditoria_financeira_visualizar'),
    -- I
    ('admin', 'score_editar'),
    ('admin', 'score_visualizar'),
    -- L
    ('admin', 'log_visualizar'),
    -- moderador: cuida da moderação de conteúdo e denúncias. score_visualizar
    -- ajuda a priorizar fila de moderação (sinal de apoio, não bloqueio).
    ('moderador', 'denuncia_responder'),
    ('moderador', 'comentario_moderar'),
    ('moderador', 'atualizacao_moderar'),
    -- RF-108: fecha o ciclo de julgar uma denúncia e agir sobre ela sem precisar do admin (ver nota em [07-B-2]).
    ('moderador', 'campanha_encerrar_moderacao'),
    ('moderador', 'score_visualizar'),
    -- revisor: cuida só do critério/configuração de score - precisa ver o
    -- score de todo mundo pra calibrar peso/regra com dado real.
    ('revisor', 'score_editar'),
    ('revisor', 'score_visualizar'),
    -- suporte: atendimento de conta, sem acesso a dados sensíveis ou financeiros.
    ('suporte', 'sessao_revogar'),
    ('suporte', 'recuperacao_senha_revogar'),
    ('suporte', 'verificacao_email_reenviar'),
    -- Desbloquear login é atendimento de conta, mesmo escopo das outras permissões de 'suporte' acima.
    -- usuario_excluir NÃO fica com 'suporte': exclusão de conta é auto-serviço do titular (já funciona sem
    -- nenhuma permissão, ver excluir_conta_usuario em 03, [03-O]); suporte abre chamado, não executa. Só o
    -- admin mantém a permissão.
    ('suporte', 'usuario_desbloquear'),
    -- curador: cuida dos catálogos que dão suporte ao conteúdo da plataforma.
    -- score_visualizar apoia a curadoria manual de aprovação de campanha.
    ('curador', 'tipolink_gerenciar'),
    ('curador', 'area_conhecimento_gerenciar'),
    ('curador', 'motivo_denuncia_gerenciar'),
    ('curador', 'termos_uso_gerenciar'),
    ('curador', 'score_visualizar')
)
ON CONFLICT DO NOTHING;

-- [07-C-1] tipo_link
-- Allowlist fechada definida pela equipe (SITE_INSTITUCIONAL/OUTRO não existem porque permitiam links sem
-- verificação). `codigo`: chave natural estável (ver [01-C]), usada por link_academico logo abaixo em vez do id
-- posicional. Os 3 campos de escopo (permite_perfil/permite_atualizacao/permite_recompensa) são configurados por
-- tipo: sem isso caem no DEFAULT (só permite_perfil=TRUE) e link_atualizacao/link_recompensa ficam impossíveis
-- de usar.
INSERT INTO tipo_link (codigo, nome, ativo, regex, dominio, permite_perfil, permite_atualizacao, permite_recompensa) VALUES
('LATTES',             'Lattes',               TRUE,  '^https?://lattes\.cnpq\.br/\d+$',                     '{lattes.cnpq.br}',   TRUE, FALSE, FALSE),
('ORCID',              'ORCID',                TRUE,  '^https?://orcid\.org/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$',   '{orcid.org}',        TRUE, FALSE, FALSE),
('RESEARCHGATE',       'ResearchGate',         TRUE,  '^https?://(www\.)?researchgate\.net/profile/[\w\-]+$', '{researchgate.net}', TRUE, FALSE, FALSE),
('LINKEDIN',           'LinkedIn',             TRUE,  '^https?://(www\.)?linkedin\.com/in/[\w\-]+/?$',        '{linkedin.com}',     TRUE, FALSE, FALSE),
('GITHUB',             'GitHub',               TRUE,  '^https?://(www\.)?github\.com/[\w\-]+/?$',             '{github.com}',       TRUE, TRUE,  TRUE);

-- [07-C-2] area_conhecimento
-- 2 níveis do CNPq (grande área -> área): "Ciências da Saúde" cobrindo de odontologia a saúde coletiva era amplo
-- demais para o filtro de busca funcionar. id_pai aponta para a grande área raiz (mesmo padrão de
-- score_config/id_pai, ver [01-I]); a campanha é OBRIGADA a escolher uma área de nível 2 (trigger em 05, ver
-- [05-K-1]). Inclui a área Multidisciplinar.
--
-- codigo_cnpq guarda só 'X.YY.00.00', sem dígito verificador: os dígitos que existiam não vieram de nenhuma fonte
-- conferida (nos códigos de grande área só o primeiro dígito é diferente de zero, então um dígito verificador
-- real por soma ponderada seria função só dele, e o seed antigo tinha 8 valores distintos para 9 entradas:
-- impossível vir de um algoritmo de verdade). Como codigo_cnpq é comparado por igualdade e nunca digitado à
-- mão, o dígito não protegia nada. Os nomes das áreas e a grande área de cada uma seguem a nomenclatura padrão
-- e estável do CNPq.
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo) VALUES
('1.00.00.00', 'Ciências Exatas e da Terra',          NULL, TRUE),
('2.00.00.00', 'Ciências Biológicas',                 NULL, TRUE),
('3.00.00.00', 'Engenharias',                         NULL, TRUE),
('4.00.00.00', 'Ciências da Saúde',                   NULL, TRUE),
('5.00.00.00', 'Ciências Agrárias',                   NULL, TRUE),
('6.00.00.00', 'Ciências Sociais Aplicadas',          NULL, TRUE),
('7.00.00.00', 'Ciências Humanas',                    NULL, TRUE),
('8.00.00.00', 'Linguística, Letras e Artes',         NULL, TRUE),
('9.00.00.00', 'Multidisciplinar',                    NULL, TRUE);

-- Nível 2 - filhas de "Ciências Exatas e da Terra" (id 1) - 8 áreas, códigos
-- e nomes conferidos via busca.
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo)
SELECT v.codigo, v.nome, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '1.00.00.00'), TRUE
FROM (VALUES
    ('1.01.00.00', 'Matemática'),
    ('1.02.00.00', 'Probabilidade e Estatística'),
    ('1.03.00.00', 'Ciência da Computação'),
    ('1.04.00.00', 'Astronomia'),
    ('1.05.00.00', 'Física'),
    ('1.06.00.00', 'Química'),
    ('1.07.00.00', 'Geociências'),
    ('1.08.00.00', 'Oceanografia')
) AS v(codigo, nome);

-- Nível 2 - filhas de "Ciências Biológicas" (id 2) - 13 áreas.
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo)
SELECT v.codigo, v.nome, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '2.00.00.00'), TRUE
FROM (VALUES
    ('2.01.00.00', 'Biologia Geral'),
    ('2.02.00.00', 'Genética'),
    ('2.03.00.00', 'Botânica'),
    ('2.04.00.00', 'Zoologia'),
    ('2.05.00.00', 'Ecologia'),
    ('2.06.00.00', 'Morfologia'),
    ('2.07.00.00', 'Fisiologia'),
    ('2.08.00.00', 'Bioquímica'),
    ('2.09.00.00', 'Biofísica'),
    ('2.10.00.00', 'Farmacologia'),
    ('2.11.00.00', 'Imunologia'),
    ('2.12.00.00', 'Microbiologia'),
    ('2.13.00.00', 'Parasitologia')
) AS v(codigo, nome);

-- Nível 2 - filhas de "Engenharias" (id 3) - 13 áreas.
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo)
SELECT v.codigo, v.nome, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '3.00.00.00'), TRUE
FROM (VALUES
    ('3.01.00.00', 'Engenharia Civil'),
    ('3.02.00.00', 'Engenharia de Minas'),
    ('3.03.00.00', 'Engenharia de Materiais e Metalúrgica'),
    ('3.04.00.00', 'Engenharia Elétrica'),
    ('3.05.00.00', 'Engenharia Mecânica'),
    ('3.06.00.00', 'Engenharia Química'),
    ('3.07.00.00', 'Engenharia Sanitária'),
    ('3.08.00.00', 'Engenharia de Produção'),
    ('3.09.00.00', 'Engenharia Nuclear'),
    ('3.10.00.00', 'Engenharia de Transportes'),
    ('3.11.00.00', 'Engenharia Naval e Oceânica'),
    ('3.12.00.00', 'Engenharia Aeroespacial'),
    ('3.13.00.00', 'Engenharia Biomédica')
) AS v(codigo, nome);

-- Nível 2 - filhas de "Ciências da Saúde" (id 4) - 9 áreas.
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo)
SELECT v.codigo, v.nome, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '4.00.00.00'), TRUE
FROM (VALUES
    ('4.01.00.00', 'Medicina'),
    ('4.02.00.00', 'Odontologia'),
    ('4.03.00.00', 'Farmácia'),
    ('4.04.00.00', 'Enfermagem'),
    ('4.05.00.00', 'Nutrição'),
    ('4.06.00.00', 'Saúde Coletiva'),
    ('4.07.00.00', 'Fonoaudiologia'),
    ('4.08.00.00', 'Fisioterapia e Terapia Ocupacional'),
    ('4.09.00.00', 'Educação Física')
) AS v(codigo, nome);

-- Nível 2 - filhas de "Ciências Agrárias" (id 5) - 7 áreas.
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo)
SELECT v.codigo, v.nome, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '5.00.00.00'), TRUE
FROM (VALUES
    ('5.01.00.00', 'Agronomia'),
    ('5.02.00.00', 'Recursos Florestais e Engenharia Florestal'),
    ('5.03.00.00', 'Engenharia Agrícola'),
    ('5.04.00.00', 'Zootecnia'),
    ('5.05.00.00', 'Medicina Veterinária'),
    ('5.06.00.00', 'Recursos Pesqueiros e Engenharia de Pesca'),
    ('5.07.00.00', 'Ciência e Tecnologia de Alimentos')
) AS v(codigo, nome);

-- Nível 2 - filhas de "Ciências Sociais Aplicadas" (id 6) - 13 áreas.
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo)
SELECT v.codigo, v.nome, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '6.00.00.00'), TRUE
FROM (VALUES
    ('6.01.00.00', 'Direito'),
    ('6.02.00.00', 'Administração'),
    ('6.03.00.00', 'Economia'),
    ('6.04.00.00', 'Arquitetura e Urbanismo'),
    ('6.05.00.00', 'Planejamento Urbano e Regional'),
    ('6.06.00.00', 'Demografia'),
    ('6.07.00.00', 'Ciência da Informação'),
    ('6.08.00.00', 'Museologia'),
    ('6.09.00.00', 'Comunicação'),
    ('6.10.00.00', 'Serviço Social'),
    ('6.11.00.00', 'Economia Doméstica'),
    ('6.12.00.00', 'Desenho Industrial'),
    ('6.13.00.00', 'Turismo')
) AS v(codigo, nome);

-- Nível 2 - filhas de "Ciências Humanas" (id 7) - 10 áreas.
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo)
SELECT v.codigo, v.nome, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '7.00.00.00'), TRUE
FROM (VALUES
    ('7.01.00.00', 'Filosofia'),
    ('7.02.00.00', 'Sociologia'),
    ('7.03.00.00', 'Antropologia'),
    ('7.04.00.00', 'Arqueologia'),
    ('7.05.00.00', 'História'),
    ('7.06.00.00', 'Geografia'),
    ('7.07.00.00', 'Psicologia'),
    ('7.08.00.00', 'Educação'),
    ('7.09.00.00', 'Ciência Política'),
    ('7.10.00.00', 'Teologia')
) AS v(codigo, nome);

-- Nível 2 - filhas de "Linguística, Letras e Artes" (id 8) - 3 áreas.
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo)
SELECT v.codigo, v.nome, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '8.00.00.00'), TRUE
FROM (VALUES
    ('8.01.00.00', 'Linguística'),
    ('8.02.00.00', 'Letras'),
    ('8.03.00.00', 'Artes')
) AS v(codigo, nome);

-- Nível 2 - filhas de "Multidisciplinar" (id 9) - 5 áreas (grande área mais
-- recente do CNPq; lista abaixo é a mais estável/citada, mas é a que tem
-- maior chance de precisar de ajuste na conferência oficial).
INSERT INTO area_conhecimento (codigo_cnpq, nome, id_pai, ativo)
SELECT v.codigo, v.nome, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '9.00.00.00'), TRUE
FROM (VALUES
    ('9.01.00.00', 'Biotecnologia'),
    ('9.02.00.00', 'Ciências Ambientais'),
    ('9.03.00.00', 'Biodiversidade'),
    ('9.04.00.00', 'Ensino'),
    ('9.05.00.00', 'Materiais')
) AS v(codigo, nome);

-- [07-C-3] motivo_denuncia
-- Puro dado de catálogo. PERF-004 (vínculo institucional falso) é diferente de PERF-001 (dados acadêmicos
-- falsos, mais genérico): ficou relevante depois que perfil_pesquisador.vinculo_institucional virou NOT NULL.
-- Sem `codigo` (coluna removida, ver 01_extensoes_enums_tabelas.sql).
INSERT INTO motivo_denuncia (descricao, tipo) VALUES
('Campanha com informações falsas ou enganosas',           'campanha'),
('Campanha duplicada ou já existente',                     'campanha'),
('Uso indevido de recursos arrecadados',                   'campanha'),
('Campanha fora do escopo acadêmico',                      'campanha'),
('Plágio ou apropriação de trabalho alheio',                'campanha'),
('Conflito de interesse não declarado',                     'campanha'),
('Campanha sem viabilidade metodológica',                   'campanha'),
('Spam ou divulgação fora de contexto acadêmico',           'campanha'),
('Perfil com dados acadêmicos falsos',                      'perfil'),
('Comportamento abusivo ou ofensivo',                       'perfil'),
('Usurpação de identidade de pesquisador real',              'perfil'),
('Vínculo institucional falso ou não comprovável',           'perfil');

-- [07-C-4] arquivo (imagens de perfil - sem FK ainda ativa no INSERT)
-- ativo omitido: DEFAULT TRUE aplicado automaticamente
INSERT INTO arquivo (chave, nome_original, tipo_mime, tamanho_bytes) VALUES
('publico/seed-ana-santos.jpg',       'ana_santos.jpg',       'image/jpeg',      102400),
('publico/seed-carlos-melo.jpg',      'carlos_melo.jpg',      'image/jpeg',       98304),
('publico/seed-beatriz-lima.jpg',     'beatriz_lima.jpg',     'image/jpeg',      115200),
('publico/seed-rafael-costa.jpg',     'rafael_costa.jpg',     'image/jpeg',       87040),
('publico/seed-juliana-ferreira.jpg', 'juliana_ferreira.jpg', 'image/jpeg',      131072),
('publico/seed-marcos-oliveira.jpg',  'marcos_oliveira.jpg',  'image/jpeg',       94208),
('publico/seed-patricia-rocha.jpg',   'patricia_rocha.jpg',   'image/jpeg',      109568),
('publico/seed-relatorio-q1.pdf',     'relatorio_q1.pdf',     'application/pdf', 512000);

-- [07-D-1] usuario
-- senha_hash: hash bcrypt de verdade (custo 10, igual CUSTO_BCRYPT_SENHA em usuario.constants.ts), o MESMO para
-- TODOS, só para dev/seed, nunca em produção:
--   senha de todo mundo no seed = DevTcc123!
-- Gerado com `bcrypt.hash('DevTcc123!', 10)` e conferido com `bcrypt.compare()`. Serve para logar como qualquer
-- papel (admin, moderador, pesquisador, usuario comum etc.) só trocando o e-mail (ver a lista de e-mail/papel
-- logo abaixo, em usuario_papel).
--
-- Ordem por poder (admin -> moderador -> revisor -> suporte -> curador -> pesquisador -> usuario), igual à de
-- `papel`; os IDs numéricos de usuario_papel/perfil_pesquisador/campanha etc. (mais abaixo) assumem esta ordem.
--
-- "Admin Sistema 2": segundo admin de teste (sempre um admin de reserva, já que só outro admin desfaz a
-- besteira de um admin) e 5 contas "Sistema" (uma por papel, além de admin) para testes rápidos e intuitivos,
-- sem nome de gente, somando ao "Entrar como" de desenvolvimento (dev-login-rapido).
INSERT INTO usuario (nome, email, senha_hash, id_imagem_perfil, criado_em) VALUES
('Admin Sistema',          'admin@crowdacademico.com.br',            '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:00'),
('Admin Sistema 2',        'admin2@crowdacademico.com.br',           '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:01'),
('Moderador Sistema',      'moderador@crowdacademico.com.br',        '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:02'),
('Revisor Sistema',        'revisor@crowdacademico.com.br',          '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:03'),
('Suporte Sistema',        'suporte.sistema@crowdacademico.com.br',  '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:04'),
('Curador Sistema',        'curador@crowdacademico.com.br',          '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:05'),
('Pesquisador Sistema',    'pesquisador@crowdacademico.com.br',      '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:06'),

('Diego Martins Alves',   'diego.martins@crowdacademico.com.br', '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-05 09:00:00'), -- moderador
('Camila Nunes Barros',   'camila.nunes@crowdacademico.com.br',  '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-05 09:00:00'), -- revisor
('Thiago Almeida Rocha',  'thiago.almeida@crowdacademico.com.br','$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-05 09:00:00'), -- curador
('Larissa Pinto Gomes',   'larissa.pinto@crowdacademico.com.br', '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-05 09:00:00'), -- suporte

('Ana Beatriz Santos',    'ana.santos@usp.br',          '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG',    1, '2024-01-10 09:00:00'),
('Carlos Eduardo Melo',   'carlos.melo@unicamp.br',     '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', 2, '2024-01-15 10:30:00'),
('Beatriz Lima Alves',    'beatriz.lima@ufmg.br',       '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG',    3, '2024-02-01 08:45:00'),
('Rafael Costa Nunes',    'rafael.costa@ufrj.br',       '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG',    4, '2024-02-10 14:00:00'),
('Juliana Ferreira Paz',  'juliana.ferreira@ufsc.br',   '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG',    5, '2024-03-05 11:20:00'),
('Marcos Oliveira Ramos', 'marcos.oliveira@unesp.br',   '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG',    6, '2024-03-12 16:00:00'),
('Patrícia Rocha Silva',  'patricia.rocha@unifesp.br',  '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG',    7, '2024-04-01 09:30:00'),
-- Continuam pesquisadores: já têm um "laboratório de teste" inteiro montado (perfil, campanha, denúncias,
-- links) desenhado para cobrir as 4 faixas de score_rotulo; virar "usuario comum" apagaria tudo isso. Só a
-- posição/ID mudou, para ficarem agrupados com o resto dos pesquisadores.
('Bruno Tavares Costa',    'bruno.tavares@ufrgs.br',    '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-05-20 09:00:00'),
('Renata Vasconcelos Dias','renata.vasconcelos@ufpr.br','$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-05-22 09:00:00'),
('Eduardo Barbosa Nogueira','eduardo.barbosa@ufba.br',  '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-05-25 09:00:00'),
('Vinícius Almeida Ferraz','vinicius.ferraz@ufc.br',    '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-05-28 09:00:00'),

('Fernanda Souza Lima',   'fernanda.souza@gmail.com',            '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:00'), -- usuario comum (apoiador, nunca virou pesquisador)
-- 2 contas "usuario comum" zeradas, sem NENHUMA dependência (sem campanha, sem link, sem denúncia), para sempre
-- sobrar gente para testar o fluxo de "2ª conta tentando o mesmo CPF" sem mexer nos 12-21 (donos de campanha
-- no seed; 19-22 foram desenhados a dedo para as 4 faixas de score_rotulo, ver comentário perto do bloco de
-- campanha). Fernanda (23) sozinha não bastava para testar duplicidade de CPF entre DUAS contas.
('Marina Alves Torres',   'marina.torres@gmail.com',             '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:01'), -- usuario comum, zerada
('Gabriel Souza Martins', 'gabriel.martins@gmail.com',           '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:02'), -- usuario comum, zerada
('Camila Rocha Pereira',  'camila.rocha@gmail.com',              '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:03'), -- usuario comum, zerada
('Rafael Costa Andrade',  'rafael.costa.andrade@gmail.com',      '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:04'), -- usuario comum, zerado
('Larissa Mendes Cunha',  'larissa.mendes@gmail.com',            '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:05'); -- usuario comum, zerada

-- [07-D-2] usuario_papel
-- id_usuario é fixo (a tabela usuario está vazia antes deste seed, então os IDs abaixo batem com a ordem de
-- inserção acima, ver [07-D-1]). id_papel é resolvido por nome, pelo mesmo motivo do bloco [07-B-3].
INSERT INTO usuario_papel (id_usuario, id_papel)
SELECT v.id_usuario, p.id_papel
FROM (VALUES
    (1, 'admin'),        -- Admin Sistema
    (2, 'admin'),        -- Admin Sistema 2
    (3, 'moderador'),    -- Moderador Sistema
    (4, 'revisor'),      -- Revisor Sistema
    (5, 'suporte'),      -- Suporte Sistema
    (6, 'curador'),      -- Curador Sistema
    (7, 'pesquisador'),  -- Pesquisador Sistema
    (8, 'moderador'),    -- Diego
    (9, 'revisor'),      -- Camila
    (10, 'curador'),     -- Thiago
    (11, 'suporte'),     -- Larissa
    (12, 'pesquisador'), -- Ana
    (13, 'pesquisador'), -- Carlos
    (14, 'pesquisador'), -- Beatriz
    (15, 'pesquisador'), -- Rafael
    (16, 'pesquisador'), -- Juliana
    (17, 'pesquisador'), -- Marcos
    (18, 'pesquisador'), -- Patrícia
    (19, 'pesquisador'), -- Bruno
    (20, 'pesquisador'), -- Renata
    (21, 'pesquisador'), -- Eduardo
    (22, 'pesquisador'), -- Vinícius
    (23, 'usuario'),     -- Fernanda (apoiador comum)
    (24, 'usuario'),     -- Marina (apoiador comum, zerada)
    (25, 'usuario'),     -- Gabriel (apoiador comum, zerado)
    (26, 'usuario'),     -- Camila (apoiador comum, zerada)
    (27, 'usuario'),     -- Rafael (apoiador comum, zerado)
    (28, 'usuario')      -- Larissa (apoiador comum, zerada)
) AS v(id_usuario, papel_nome)
JOIN papel p ON p.nome = v.papel_nome
ON CONFLICT DO NOTHING;

-- [07-D-6] termos_de_uso / usuario_termo
-- Sustentam o RF-011 (aceite obrigatório no cadastro); o texto real dos termos entra quando a equipe/jurídico
-- definir. v1 é a versão vigente durante todo o período em que os usuários deste seed se cadastraram (por isso
-- é ela que aparece em usuario_termo, abaixo). v2 é a versão atual, publicada depois e ainda sem aceite
-- registrado: cenário realista de "termo novo no ar, usuários antigos ainda não foram re-avisados".
--
-- PEGADINHA (vale para o NestJS, ao publicar uma versão nova): publicar v2 sem antes desativar v1 quebra com o
-- erro do índice parcial uq_termos_uso_ativo (02), que só permite 1 linha ativa POR TIPO. O UPDATE que desativa
-- a versão velha e o INSERT da versão nova precisam estar na MESMA transação (é o que este bloco já faz).
--
-- `tipo` explícito em toda linha abaixo, mesmo v1/v2/v3 sendo todas 'cadastro': o sistema sempre tem 1 Termo de
-- Uso vigente por momento de aceite (cadastro, contribuição a campanha, upgrade de pesquisador), cada um com a
-- sua PRÓPRIA versão/histórico.
INSERT INTO termos_de_uso (tipo, versao, conteudo, ativo, criado_em) VALUES
('cadastro', 'v1-2024-01-01', '[PLACEHOLDER] Texto dos Termos de Uso e Política de Privacidade - versão 1. Conteúdo jurídico definitivo entra aqui quando a equipe/jurídico validar.', FALSE, '2024-01-01 00:00:00');

UPDATE termos_de_uso SET ativo = FALSE WHERE tipo = 'cadastro' AND versao = 'v1-2024-01-01';
INSERT INTO termos_de_uso (tipo, versao, conteudo, ativo, criado_em) VALUES
('cadastro', 'v2-2025-01-01', '[PLACEHOLDER] Texto dos Termos de Uso e Política de Privacidade - versão 2 (revisão anual). Conteúdo jurídico definitivo entra aqui quando a equipe/jurídico validar.', FALSE, '2025-01-01 00:00:00');

-- v3: primeira versão com texto de rascunho REALISTA (não é lorem ipsum, mas TAMBÉM NÃO é texto jurídico
-- validado: inspirado na LGPD e em termos de plataformas de financiamento coletivo reais, para parar de mostrar
-- "[PLACEHOLDER]" a quem testa o sistema; precisa de revisão jurídica antes de qualquer uso em produção).
-- v1/v2 continuam [PLACEHOLDER] de propósito: são histórico, e texto de versão já substituída não se corrige
-- depois (mesma regra que a tela de administração aplica a qualquer versão nova; ver
-- views/5-termo-uso/criar-termo-uso.tsx).
UPDATE termos_de_uso SET ativo = FALSE WHERE tipo = 'cadastro' AND versao = 'v2-2025-01-01';
INSERT INTO termos_de_uso (tipo, versao, conteudo, ativo, criado_em) VALUES
('cadastro', 'v3-2026-09-13', 'TERMOS DE USO E POLÍTICA DE PRIVACIDADE - CROWDACADÊMICO

1. OBJETO
O CrowdAcadêmico é uma plataforma de financiamento coletivo (crowdfunding) dedicada exclusivamente a projetos de pesquisa científica e tecnológica brasileira. Estes Termos regem o uso da plataforma por pesquisadores, apoiadores e demais usuários cadastrados.

2. CADASTRO E CONTA
O cadastro exige informações verdadeiras, completas e atualizadas. Cada pessoa pode manter apenas uma conta ativa. O usuário é responsável por manter a confidencialidade de sua senha e por toda atividade realizada em sua conta.

3. PERFIL DE PESQUISADOR
Para submeter e gerenciar campanhas, o usuário deve solicitar o upgrade para perfil de pesquisador, informando CPF, vínculo institucional (quando aplicável) e título acadêmico. Essas informações são usadas exclusivamente para validação e exibição pública do perfil.

4. CAMPANHAS E CONTRIBUIÇÕES
Toda campanha passa por aprovação administrativa antes de ficar visível ao público. O CrowdAcadêmico não garante o sucesso de nenhuma campanha nem se responsabiliza pelo uso dos recursos arrecadados após o repasse ao pesquisador responsável. Contribuições são voluntárias e, uma vez processadas, seguem a política de reembolso vigente na campanha específica.

5. PROPRIEDADE INTELECTUAL
O conteúdo publicado por pesquisadores (descrição de projeto, atualizações, materiais anexados) permanece de titularidade do autor. Ao publicar, o pesquisador concede ao CrowdAcadêmico licença não exclusiva para exibição pública do conteúdo na plataforma, pelo tempo em que a campanha ou o perfil permanecerem ativos.

6. PROTEÇÃO DE DADOS PESSOAIS (LGPD)
O tratamento de dados pessoais nesta plataforma segue a Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018). Coletamos apenas os dados necessários para cadastro, validação de identidade, processamento de contribuições e cumprimento de obrigações legais. O titular dos dados tem direito a: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; e revogação do consentimento, a qualquer momento, mediante solicitação pelos canais oficiais da plataforma. Dados sensíveis, como CPF, são armazenados de forma protegida e nunca exibidos publicamente em sua forma completa.

7. MODERAÇÃO E DENÚNCIAS
A equipe administrativa pode suspender ou encerrar campanhas, perfis ou contas que violem estes Termos, mediante denúncia fundamentada ou verificação própria, assegurado o direito de manifestação do usuário afetado.

8. ENCERRAMENTO DE CONTA
O usuário pode solicitar o encerramento de sua conta a qualquer momento. Dados vinculados a obrigações legais ou financeiras, como histórico de contribuições, podem ser mantidos pelo prazo exigido pela legislação aplicável, mesmo após o encerramento.

9. ALTERAÇÕES DESTES TERMOS
Estes Termos podem ser atualizados periodicamente. A versão vigente é sempre a mais recente publicada nesta tela, e o usuário é notificado para revisar e reaceitar o texto atualizado.

10. FORO
Fica eleito o foro da comarca do domicílio do usuário para dirimir eventuais controvérsias, conforme o Código de Defesa do Consumidor, quando aplicável.', TRUE, '2026-09-13 00:00:00');

-- Primeira versão do tipo 'contribuicao'. Mesmo aviso do v3 acima: rascunho REALISTA inspirado na LGPD e em
-- política de reembolso comum de crowdfunding, NÃO é texto jurídico validado.
INSERT INTO termos_de_uso (tipo, versao, conteudo, ativo, criado_em) VALUES
('contribuicao', 'v1-2026-09-13', 'TERMOS DE CONTRIBUIÇÃO - CROWDACADÊMICO

1. OBJETO
Este termo é exibido no momento em que um apoiador confirma uma contribuição financeira a uma campanha de pesquisa no CrowdAcadêmico, complementando os Termos de Uso gerais aceitos no cadastro.

2. NATUREZA DA CONTRIBUIÇÃO
A contribuição é voluntária e destinada ao financiamento do projeto de pesquisa descrito na campanha. O CrowdAcadêmico atua como intermediário entre apoiador e pesquisador, não sendo parte na relação de pesquisa em si, e não garante os resultados científicos do projeto apoiado.

3. MODELO DE ARRECADAÇÃO E REPASSE
Dependendo do modelo da campanha (tudo ou nada / flexível), o valor pode ser repassado ao pesquisador somente se a meta for atingida, ou repassado progressivamente. O apoiador é informado do modelo antes de contribuir, na própria página da campanha.

4. POLÍTICA DE REEMBOLSO
Contribuições podem ser reembolsadas total ou parcialmente nos casos previstos nas regras da plataforma (ex.: campanha não atinge a meta em modelo "tudo ou nada", campanha encerrada por moderação antes do repasse). Fora desses casos, a contribuição é considerada definitiva a partir da confirmação do pagamento.

5. DADOS PESSOAIS E DE PAGAMENTO (LGPD)
Dados de pagamento são processados pelo meio de pagamento escolhido (Pix, cartão, boleto) e tratados conforme a Lei 13.709/2018 (LGPD). O CrowdAcadêmico armazena o registro da contribuição e o aceite deste termo (com data e IP) para fins de auditoria e cumprimento de obrigação legal, mesmo que a conta do apoiador seja futuramente encerrada.

6. ALTERAÇÕES DESTE TERMO
Este termo pode ser atualizado periodicamente; a versão vigente no momento da confirmação da contribuição é a que se aplica àquela contribuição específica, mesmo que uma versão nova seja publicada depois.', TRUE, '2026-09-13 00:00:00');

-- Primeira versão do tipo 'upgrade_pesquisador' (o 3º momento de aceite: upgrade de perfil de pesquisador).
-- Mesmo aviso de sempre: rascunho REALISTA, NÃO é texto jurídico validado.
INSERT INTO termos_de_uso (tipo, versao, conteudo, ativo, criado_em) VALUES
('upgrade_pesquisador', 'v1-2026-09-13', 'TERMOS DE UPGRADE DE PERFIL DE PESQUISADOR - CROWDACADÊMICO

1. OBJETO
Este termo é exibido no momento em que um usuário comum solicita o upgrade de sua conta para perfil de pesquisador, complementando os Termos de Uso gerais aceitos no cadastro.

2. RESPONSABILIDADE PELAS INFORMAÇÕES DECLARADAS
Ao solicitar o upgrade, o usuário declara que o CPF, o vínculo institucional (quando aplicável) e o título acadêmico informados são verdadeiros. Informações falsas podem levar à suspensão do perfil de pesquisador e das campanhas vinculadas a ele.

3. RESPONSABILIDADES DO PERFIL DE PESQUISADOR
O perfil de pesquisador autoriza submeter e gerenciar campanhas de financiamento coletivo. O pesquisador é responsável pela veracidade das informações de cada campanha, pela execução do projeto descrito e pela prestação de contas aos apoiadores, conforme as regras de moderação da plataforma.

4. PONTUAÇÃO E REPUTAÇÃO
O perfil de pesquisador está sujeito ao sistema de pontuação (score) da plataforma, que reflete o histórico de campanhas, cumprimento de prazos e conduta. A pontuação pode influenciar a visibilidade de campanhas futuras.

5. DADOS PESSOAIS (LGPD)
O CPF é armazenado de forma cifrada e nunca exibido publicamente em sua forma completa, conforme a Lei 13.709/2018 (LGPD). O vínculo institucional e o título acadêmico são exibidos publicamente no perfil, por serem informações de natureza profissional/acadêmica relevantes para os apoiadores.

6. ALTERAÇÕES DESTE TERMO
Este termo pode ser atualizado periodicamente; a versão vigente no momento da solicitação do upgrade é a que se aplica.', TRUE, '2026-09-13 00:00:00');

-- Todos os usuários aceitaram a v1 no próprio cadastro (aceito_em = pouco
-- depois de usuario.criado_em) - nenhum ainda re-aceitou v2 nem v3,
-- propositalmente (cenário realista: ninguém foi reavisado depois que uma
-- versão nova é publicada, exatamente o que uma tela de admin de verdade
-- deveria eventualmente cobrar dos usuários no próximo login).
INSERT INTO usuario_termo (id_usuario, id_termo, aceito_em, ip_aceite)
SELECT id_usuario, 1, criado_em + INTERVAL '2 minutes', '187.10.20.30'
FROM usuario;

-- [07-C-5] configuracoes: por que este bloco vem depois de usuario (ver DOCUMENTACAO_BD.md)
-- Agrupado por domínio (A,D,E,F,H,I, mesma ordem de [07-B-2]): configuracao.service.findall.ts ordena por
-- id_config, então a ordem do INSERT é a ordem que a tela mostra. Puramente cosmético para cada chave: `chave` é
-- UNIQUE e toda leitura (NestJS) busca por nome, nunca por posição/id_config.
--
-- Não pode haver "alavanca fantasma": chave sem nenhum consumidor faz o Admin mudar algo no painel e nada
-- acontecer (pior que um valor fixo no código, porque parece que devia funcionar). email_suporte e
-- notificar_novas_campanhas (mais abaixo) são lidas pelo NestJS, não pelo banco; chave sem consumidor não entra
-- no seed (ver os comentários no final deste bloco).
-- `publica`: PÚBLICA é o que o navegador precisa para montar/validar uma tela (admin ou pública); INTERNA é
-- parâmetro de segurança/moderação (tudo que envolve tentativa de login, bloqueio, validade de token/sessão) ou
-- constante que só uma trigger/service interno lê, nunca exibida a ninguém. `suspensao_usuario_opcoes_dias` é
-- PÚBLICA por necessidade técnica: `ConfiguracoesProvider` usa `configuracaoApi.buscarPublicas()`, que NUNCA
-- manda token (nem para o próprio admin); se essa chave fosse interna, o seletor de "Suspender Usuário" no
-- painel perderia as opções de prazo.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
-- A
(NULL, 'email_suporte',              'suporte@crowdacademico.com.br', 'texto', 'E-mail de suporte ao usuário',   TRUE, TRUE), -- lida pelo NestJS (rodapé/e-mails transacionais), não pelo banco - nenhum .sql precisa dela
-- B
(NULL, 'limite_tentativas_login',    '5',     'inteiro',  'Nº de tentativas de login falhas antes de bloquear a conta',    TRUE, FALSE),
(NULL, 'bloqueio_login_minutos',     '15',    'inteiro',  'Duração do bloqueio de login após exceder o limite de tentativas (minutos)', TRUE, FALSE),
-- Lidas por ConfiguracaoValorService (commons/configuracao) em auth.service.login.ts/auth.service.cadastro.ts,
-- mesmo padrão dos dois de cima (limite_tentativas_login/bloqueio_login_minutos): janelas de tempo configuráveis
-- pelo Painel Admin.
(NULL, 'refresh_token_dias_validade', '30',   'inteiro',  'Por quantos dias a sessão continua válida (refresh token) antes de precisar logar de novo', TRUE, FALSE),
(NULL, 'verificacao_email_horas_validade', '24', 'inteiro', 'Validade do token de verificação de e-mail, em horas', TRUE, FALSE),
-- Opções de prazo sugeridas no seletor de "Suspender Usuário" do painel; lida pelo React
-- (minha-conta/alterar-usuario), não por nenhuma trigger/função do banco.
(NULL, 'suspensao_usuario_opcoes_dias', '1,3,7,30', 'texto', 'Opções de prazo (em dias) sugeridas no seletor de suspensão de usuário - lista separada por vírgula.', TRUE, TRUE),
(1,   'notificar_novas_campanhas',   'true',  'booleano', 'Admin recebe e-mail sobre novas campanhas',            TRUE, FALSE), -- lida pelo worker de notificação do NestJS, não pelo banco - nenhuma trigger/função a consulta; `publica` é irrelevante aqui (linha pessoal, id_usuario=1, RLS já restringe ao dono)
-- E
-- prazo_minimo_campanha_dias e os limites de negócio (campanhas simultâneas, endossos, denúncias/24h) são lidos
-- pelas triggers de 05 (ver as funções correspondentes); mudar a política é um UPDATE numa linha.
(NULL, 'taxa_plataforma_padrao',     '5.00',  'decimal',  'Taxa padrão cobrada pela plataforma (%)',              TRUE, TRUE),
(NULL, 'prazo_minimo_campanha_dias', '15',    'inteiro',  'Duração mínima permitida de uma campanha em dias',     TRUE, TRUE),
-- Prazo máximo de campanha: 60 dias (decisão de produto: 15 a 60).
(NULL, 'prazo_maximo_campanha_dias', '60',    'inteiro',  'Duração máxima permitida de uma campanha em dias',     TRUE, TRUE),
(NULL, 'limite_campanhas_simultaneas','2',    'inteiro',  'Nº máximo de campanhas simultâneas (aguardando_aprovacao/ativo) por pesquisador (RF-029)', TRUE, TRUE),
(NULL, 'limite_endossos_campanha',   '4',     'inteiro',  'Nº máximo de endossos ativos simultâneos por campanha (RF-063)', TRUE, TRUE),
(NULL, 'limite_denuncias_24h',       '5',     'inteiro',  'Nº máximo de denúncias por usuário dentro da janela de configuracoes.janela_denuncias_horas (RF-076)', TRUE, TRUE),
-- Janela de tempo do limite de denúncias (RF-076), lida por validar_denuncia_frequencia() em 05, [05-K-3].
(NULL, 'janela_denuncias_horas',     '24',    'inteiro',  'Janela de tempo (em horas) usada por limite_denuncias_24h (RF-076)', TRUE, TRUE),
-- `comentario` tem limite de frequência como denúncia (par acima), no mesmo padrão de 2 chaves (contagem +
-- janela) de limite_denuncias_24h/janela_denuncias_horas; 5 comentários por hora é o valor de partida, ajustável
-- sem migração.
(NULL, 'limite_comentarios_por_hora', '5',     'inteiro',  'Nº máximo de comentários por usuário dentro da janela de configuracoes.janela_comentarios_horas', TRUE, TRUE),
(NULL, 'janela_comentarios_horas',    '1',     'inteiro',  'Janela de tempo (em horas) usada por limite_comentarios_por_hora', TRUE, TRUE),
-- Limite de negócio (menor, configurável) por cima do limite técnico largo das colunas (01): mesmo padrão
-- config + trigger do prazo de campanha.
(NULL, 'limite_caracteres_descricao_campanha',     '5000', 'inteiro', 'Nº máximo de caracteres em campanha.descricao (RF)',                        TRUE, TRUE),
(NULL, 'limite_caracteres_conteudo_atualizacao',   '5000', 'inteiro', 'Nº máximo de caracteres em atualizacao_campanha.conteudo',                  TRUE, TRUE),
(NULL, 'limite_caracteres_relato_denuncia',        '1000', 'inteiro', 'Nº máximo de caracteres em denuncia.relato (sugestão de uma IA)',       TRUE, TRUE),
(NULL, 'limite_caracteres_justificativa_encerramento', '2000', 'inteiro', 'Nº máximo de caracteres em solicitacao_encerramento.justificativa_pesquisador/justificativa_admin', TRUE, TRUE),
(NULL, 'limite_caracteres_descricao_recompensa',   '2000', 'inteiro', 'Nº máximo de caracteres em recompensa.descricao',                            TRUE, TRUE),
-- Orçamento e cronograma estruturados (01, [01-E]): mudar o mínimo/máximo exigido, ou o limite de texto, é um
-- UPDATE nesta tabela, não uma migração. Ver fn_valida_completude_campanha e
-- fn_valida_limite_max_orcamento_campanha/fn_valida_limite_max_marco_cronograma (05, [05-K-2]). Os valores
-- 10/20 são o TETO (nº máximo por campanha), não o piso para aprovar; os pisos são orcamento_min_itens = 1
-- (RF-039: "valores padrão de 1 (mínimo) e 10 (máximo)") e cronograma_min_marcos = 3 (RF-041).
(NULL, 'orcamento_min_itens',                      '1',    'inteiro', 'Nº mínimo de itens de orçamento exigido para aprovar uma campanha (RF-039)', TRUE, TRUE),
(NULL, 'orcamento_max_itens',                      '10',   'inteiro', 'Nº máximo de itens de orçamento permitido por campanha',                    TRUE, TRUE),
(NULL, 'cronograma_min_marcos',                    '3',    'inteiro', 'Nº mínimo de marcos de cronograma exigido para aprovar uma campanha',       TRUE, TRUE),
(NULL, 'cronograma_max_marcos',                    '20',   'inteiro', 'Nº máximo de marcos de cronograma permitido por campanha',                  TRUE, TRUE),
-- Prazo do RASCUNHO de campanha: gate de expirar_campanhas_rascunho() (05, [05-K-2]). A campanha nasce
-- 'rascunho' e só vai para a fila de aprovação por envio explícito do pesquisador. Se a pessoa nunca voltar
-- (queda de energia, aba fechada, desistência), o rascunho some sozinho depois deste prazo, contado da CRIAÇÃO e
-- não da última edição (ver REQUISITOS_V7). 336h = 14 dias: prazos curtos (como 48h) contradizem a própria
-- justificativa do sistema ("cadastrar aos poucos"): quem preenchia na segunda e voltava na quarta perdia tudo.
(NULL, 'campanha_rascunho_ttl_horas',              '336',  'inteiro', 'Horas até uma campanha em rascunho ser apagada automaticamente (contadas da criação)', TRUE, TRUE),
-- Regra de rejeição e reenvio (ver REQUISITOS_V7). Máximo de reenvios após a 1ª rejeição: 3 reenvios = até 4
-- rejeições no total (a 4ª esgota). Prazo, em dias, que a campanha rejeitada continua disponível ao
-- pesquisador, contado da ÚLTIMA rejeição; sem reenvio nesse prazo, a campanha é excluída por
-- expirar_campanhas_rejeitadas() (05).
(NULL, 'campanha_rejeitada_max_reenvios',          '3',    'inteiro', 'Nº máximo de reenvios de uma campanha rejeitada, depois da 1ª rejeição',       TRUE, TRUE),
(NULL, 'campanha_rejeitada_prazo_dias',            '30',   'inteiro', 'Dias que uma campanha rejeitada fica disponível para reenvio, contados da última rejeição', TRUE, TRUE),
(NULL, 'limite_caracteres_descricao_orcamento',    '2000', 'inteiro', 'Nº máximo de caracteres em orcamento_campanha.descricao',                    TRUE, TRUE),
(NULL, 'limite_caracteres_descricao_marco',        '2000', 'inteiro', 'Nº máximo de caracteres em marco_cronograma.descricao',                      TRUE, TRUE),
-- Meta 0.00 seria sucesso instantâneo numa campanha all-or-nothing. Mesmo padrão do prazo: limite técnico
-- largo na constraint (01, > 0), mínimo de negócio de verdade aqui.
(NULL, 'meta_minima_campanha',       '500.00', 'decimal',  'Valor mínimo de meta financeira aceito para uma campanha (RF)',            TRUE, TRUE),
-- F
(NULL, 'limite_links_academicos_perfil', '5', 'inteiro',  'Nº máximo de links acadêmicos por pesquisador (RF-014/016/018)', TRUE, TRUE),
-- H
-- valor_minimo_contribuicao (RF-056): mesmo padrão de meta_minima_campanha, acima. R$5,00 não é piso do gateway
-- de pagamento (o PIX em si não impõe mínimo), é política de negócio da própria plataforma, por isso
-- configurável.
(NULL, 'valor_minimo_contribuicao',  '5.00',  'decimal',  'Valor mínimo aceito por contribuição, em R$ (RF-056)',                       TRUE, TRUE),
-- I
-- score_minimo_campanha: o score NUNCA bloqueia a criação de campanha (nem Catarse nem Experiment fazem isso; o
-- filtro real é a aprovação manual do Admin). Este número é só um sinal para o painel do Admin destacar, na
-- fila de aprovação, campanhas de pesquisador abaixo do mínimo, para revisão mais cuidadosa (ver
-- public.fn_precisa_revisao_score() em 05_regras_negocio.sql, [05-I-1]). De propósito, sem trigger de
-- bloqueio.
(NULL, 'score_minimo_campanha',      '25.00', 'decimal',  'Score mínimo para criar campanha (sinal de revisão manual, nunca bloqueio automático)', TRUE, FALSE);
-- Chaves que NÃO existem, de propósito: 'permitir_campanha_anonima' (campanha.id_usuario é NOT NULL, toda
-- campanha tem um pesquisador identificado, o que a curadoria RF-068/069 exige; contribuição anônima já existe
-- via contribuicao.token_sessao) e 'limite_denuncias_suspensao' (nenhuma trigger suspende perfil
-- automaticamente por denúncias procedentes: suspensão é decisão do Admin via curadoria manual; se um dia isso
-- mudar, a chave volta junto com a trigger que a usa).

-- [07-I-2] configuracoes: constantes do motor de score (ver DOCUMENTACAO_BD.md)
-- Continua o grupo "I" de [07-C-5] (que termina em score_minimo_campanha, logo acima); id_config sai em
-- sequência, sem interrupção de domínio. Os custos por denúncia (volume_denuncias/gravidade_denuncias) não
-- estão aqui: vivem em score_config (ver [07-I-1]), a tabela que o Painel Admin edita e que tem trigger de
-- recálculo; chave aqui sem nenhuma função lendo seria uma constante seedada que não move nada.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'score_penalidade_abandono',         '3',  'decimal', 'Pontos descontados por campanha não atingida e nunca encerrada formalmente (sem solicitação de encerramento)', TRUE, FALSE),
(NULL, 'score_penalidade_sem_justificativa','2',  'decimal', 'Pontos descontados por campanha não atingida cuja solicitação de encerramento não tem justificativa', TRUE, FALSE),
(NULL, 'score_frequencia_esperada_mensal',  '1',  'decimal', 'Nº de atualizações de campanha esperadas por mês de duração, usado na dimensão Atualização da Campanha', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- [07-I-3] configuracoes: retenção do log de auditoria (ver DOCUMENTACAO_BD.md [05-L])
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'log_auditoria_retencao_dias', '365', 'inteiro', 'Dias que o log de auditoria é guardado antes de ser apagado por job diário (0 = guardar para sempre)', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- [07-G] configuracoes: limites de upload de arquivo (ARQUIVO)
-- Limites de tamanho, cota por usuário e ritmo de upload, configuráveis pelo Painel Admin. O limite técnico
-- largo continua no código (TAMANHO_MAXIMO_BYTES_ABSOLUTO, arquivo.constants.ts, valida só a FORMA do DTO); o
-- valor de negócio vem daqui, lido por ConfiguracaoValorService (commons/configuracao) em
-- arquivo.service.iniciar-upload.ts/confirmar-upload.ts.
-- `publica`: os 4 tetos de tamanho/cota são úteis ao navegador para validar/avisar antes de subir um arquivo
-- grande demais (ex.: "máximo 8MB" na tela de upload): PÚBLICA. Os 2 de rate limit (janela/intervalo) são
-- anti-abuso, mesma categoria de limite_tentativas_login/bloqueio_login_minutos: INTERNA, não ajudam ninguém a
-- montar tela, só quem tenta abusar saberia o intervalo exato de espera.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'arquivo_tamanho_minimo_bytes',          '100',      'inteiro', 'Tamanho mínimo aceito por arquivo enviado, em bytes - barra arquivo vazio/corrompido', TRUE, TRUE),
(NULL, 'arquivo_tamanho_maximo_imagem_bytes',   '8388608',  'inteiro', 'Tamanho máximo aceito por imagem enviada (JPEG/PNG/WebP), em bytes (RF-017)', TRUE, TRUE),
(NULL, 'arquivo_tamanho_maximo_documento_bytes','5242880',  'inteiro', 'Tamanho máximo aceito por documento enviado (PDF), em bytes (RF-017)', TRUE, TRUE),
(NULL, 'arquivo_cota_bytes_por_usuario',        '52428800', 'inteiro', 'Cota total de armazenamento ativo por usuário, em bytes (RNF-017)', TRUE, TRUE),
(NULL, 'arquivo_limite_uploads_janela',         '20',       'inteiro', 'Nº máximo de uploads confirmados por usuário dentro da janela de configuracoes.arquivo_janela_limite_uploads_minutos', TRUE, FALSE),
(NULL, 'arquivo_janela_limite_uploads_minutos', '1440',     'inteiro', 'Janela de tempo (em minutos) usada por arquivo_limite_uploads_janela - padrão 1440 = 24h', TRUE, FALSE),
(NULL, 'arquivo_intervalo_minimo_segundos',     '5',        'inteiro', 'Intervalo mínimo (em segundos) entre um upload confirmado e o próximo início de upload do mesmo usuário', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- [07-D-3] perfil_pesquisador
-- score_atual e score_atualizado_em não estão no INSERT de propósito: a tabela tem trg_perfil_recalcula_score
-- (AFTER INSERT), que dispara recalcular_score_pesquisador() assim que a linha é criada, e qualquer valor
-- digitado aqui seria sobrescrito no mesmo instante. O score de cada um é 100% produto dos dados reais dos
-- blocos abaixo (link_academico, campanha, atualizacao_campanha, denuncia).
-- cpf_criptografado: os 11 valores abaixo são CPFs FALSOS de verdade (dígito verificador válido, nenhum de
-- dígito repetido), cifrados com commons/seguranca/cpf-cifra.util.ts (AES-256-GCM, formato
-- "v1:iv:tag:ciphertext") usando as chaves CPF_ENCRYPTION_KEY/CPF_INDEX_KEY do .env de desenvolvimento (ver
-- DOCUMENTACAO_BD.md); cpf_hash é o índice cego correspondente (HMAC-SHA256). Gerados por script descartável,
-- nunca CPF de pessoa real. Se CPF_ENCRYPTION_KEY/CPF_INDEX_KEY forem trocadas, estas 11 linhas passam a ser
-- indecifráveis (como qualquer dado cifrado com chave antiga): para um banco de dev/seed, basta rodar o seed de
-- novo com uma chave nova.
INSERT INTO perfil_pesquisador (id_usuario, cpf_criptografado, cpf_hash, vinculo_institucional, titulo_academico, status_pesquisador, ativado_em) VALUES
(12, 'v1:mWTFzqRm8FMW14/u:iMiDqsRSTJ4KUyzcmKP18w==:bR7wgOpNkI+vSJ4=', '1610ee8b3555955f9e79eba6efa88324a4c30ced46b4bee5e6f2b6b3ed605797', 'Universidade de São Paulo (USP)',                   'doutor',     'ativo', '2024-01-10 09:05:00'),
(13, 'v1:biXIzmT/+Z0OVzgl:y8lT16d44wlXzCKzGAsK9A==:HxBEvdcXcZk8bHY=', 'b3b4544a4ec41edae5514228ab14306250a0fce3bc3f149f8a0ed92be2536dd8', 'Universidade Estadual de Campinas (UNICAMP)',       'mestre',      'ativo', '2024-01-15 10:35:00'),
(14, 'v1:/qWUrRI/9fzjm9Kh:uU6qNuQlvvFjghnTLVr8Og==:N5DdmozsScRBV8A=', '93d76c0ae76d371c84ead92cdc597742cd149067fe7f234552e10abe75ee5e7f', 'Universidade Federal de Minas Gerais (UFMG)',       'doutor',      'ativo', '2024-02-01 08:50:00'),
(15, 'v1:P3LMaMpY05s3WLyr:7eDEN698asnW0mHcOs18Hw==:a51Rr8evV8QG/zw=', 'a6b7b8e7c9b4114a993ffdd74c58a4f09b2ea02a107faca711642e5f6cb4538b', 'Universidade Federal do Rio de Janeiro (UFRJ)',     'especialista','ativo', '2024-02-10 14:10:00'),
(16, 'v1:gRfGHqP2CaS1KfN8:/Ndt5pdWu6A/ZxDBptQipQ==:XXTsLYETudrxeik=', '74fc41e2f0ea9e284b8c1d2379fcc4388988d1b4a18f53c88a626d91b5d4cbc6', 'Universidade Federal de Santa Catarina (UFSC)',     'mestre',      'ativo', '2024-03-05 11:25:00'),
(17, 'v1:7abSMfGxUwGXdwcb:by/laHiieT6GUyoRZK5eEQ==:rlvzzxsYevmjKR4=', '3f165d5243e5fbddf4290416d712da7ba1a1129f442c866bc855fac2c19f3458', 'Universidade Estadual Paulista (UNESP)',            'graduado',    'ativo', '2024-03-12 16:05:00'),
(18, 'v1:gH+4XLY9grNC1AAN:f0QkyT8OuWRTKwwbyHhtKQ==:/dE9nq3r7rYxs3k=', '3f022d05c183ecfb64cbb6ac2500e66ad731e684f1c9afd5e2cb801d5576d376', 'Universidade Federal de São Paulo (UNIFESP)',       'doutor',      'ativo', '2024-04-01 09:35:00'),
-- 4 pesquisadores desenhados de propósito para cobrir as 4 faixas de score_rotulo (Atenção/Em
-- Construção/Confiável/Referência) de forma DETERMINÍSTICA: o resultado depende só da fórmula real em
-- 05_regras_negocio.sql, não de sorte. Ver o comentário completo depois do bloco de denuncia sobre como cada um
-- chega na faixa esperada.
(19, 'v1:LEFw0QnUeHqL2X91:6kAh7osqA4mnvClzmJIEpA==:YdQlSK3Dr/mdlFw=', 'a36805b35ddfe2257718bedd4035fd49afa11d5e3602285131419df0827d49f1', 'Universidade Federal do Rio Grande do Sul (UFRGS)', 'doutor',   'ativo', '2024-05-20 09:00:00'), -- Bruno:    alvo = Referência
(20, 'v1:N0tFgAz4WUtH/Zmi:9c3av62cgJj7CVWQsTTN/Q==:1jWfrfd+IZW7NZI=', '0d491a6df2cd5e6e9fe25c47630ff59d88a6e0a6a3d85f61badb2723a22ff19c', 'Universidade Federal do Paraná (UFPR)',             'mestre',   'ativo', '2024-05-22 09:00:00'), -- Renata:   alvo = Confiável
(21, 'v1:Irign/aW5mMCv4Ug:EQxzkR0lXxnJhmu8xAEhcw==:2lmUgJVYjExvdAM=', 'b5944441f2b1f45294195783812f36bc72c9bf38d2ef3d8a231c1a8d8f538ec5', 'Universidade Federal da Bahia (UFBA)',              'mestre',   'ativo', '2024-05-25 09:00:00'), -- Eduardo:  alvo = Em Construção
(22, 'v1:m7z9uq+435l0syBo:wVQB6djPxdi38eWcfpnUAQ==:45Hee0oUAA3IDek=', '469f49af437e577be058f668669a27ec903aa9ddc42895750ef3e1d45f05c380', 'Universidade Federal do Ceará (UFC)',               'graduado', 'ativo', '2024-05-28 09:00:00'); -- Vinícius: alvo = Atenção

-- Estes 11 pesquisadores já nascem com perfil pronto acima, então "aceitaram" o Termo de Upgrade de
-- Pesquisador na mesma data em que o próprio perfil foi ativado (ativado_em). Usa subquery pelo id_termo ATIVO
-- do tipo 'upgrade_pesquisador' (não um id fixo): continua correto mesmo se a versão vigente desse tipo mudar
-- antes deste seed rodar.
INSERT INTO usuario_termo (id_usuario, id_termo, aceito_em, ip_aceite)
SELECT
    id_usuario,
    (SELECT id_termo FROM termos_de_uso WHERE tipo = 'upgrade_pesquisador' AND ativo = TRUE),
    ativado_em,
    '187.10.20.30'
FROM perfil_pesquisador;

-- [07-F-1] link_academico
-- Bruno (19) recebe os 3 links que a fórmula de score realmente soma (calcular_score_perfil_academico, 05):
-- Lattes, ORCID e um "outro link" (qualquer tipo_link que não seja Lattes/ORCID). É o único dos 4 novos
-- pesquisadores com link_academico de propósito, para ser o único a fechar os 30/30 pontos possíveis nessa
-- dimensão. id_tipolink é resolvido por subquery em tipo_link.codigo (chave natural), não pelo id posicional
-- (mesmo princípio do bug de denuncia, ver [07-E-8]).
INSERT INTO link_academico (id_usuario, id_tipolink, ordem, url)
SELECT v.id_usuario, tl.id_tipolink, v.ordem, v.url
FROM (VALUES
    (12, 'LATTES',      1, 'http://lattes.cnpq.br/1234567890123456'),
    (12, 'ORCID',       2, 'https://orcid.org/0000-0001-2345-6789'),
    (13, 'LATTES',      1, 'http://lattes.cnpq.br/9876543210987654'),
    (14, 'LATTES',      1, 'http://lattes.cnpq.br/1111222233334444'),
    (16, 'RESEARCHGATE', 1, 'https://www.researchgate.net/profile/Juliana-Ferreira-Paz'),
    (18, 'ORCID',       1, 'https://orcid.org/0000-0002-9876-5432'),
    (19, 'LATTES',      1, 'http://lattes.cnpq.br/1122334455667788'),
    (19, 'ORCID',       2, 'https://orcid.org/0000-0003-1234-5678'),
    (19, 'LINKEDIN',    3, 'https://www.linkedin.com/in/bruno-tavares-costa')
) AS v(id_usuario, tipolink_codigo, ordem, url)
JOIN tipo_link tl ON tl.codigo = v.tipolink_codigo;

-- [07-E-1] campanha
-- valor_bruto_arrecadado não está no INSERT (a coluna tem DEFAULT 0): o valor final é 100% produto das
-- contribuições reais inseridas logo abaixo, somadas por trg_sincroniza_arrecadado_campanha (que fica LIGADA
-- durante o INSERT de contribuicao, ver [07-H-1]), e não de um número digitado à mão (que divergia da soma
-- real). Mesmo princípio de perfil_pesquisador.score_atual (bloco [07-D-3]).
-- trg_campanha_valida_prazo_negocio fica desligada só durante esta carga: várias campanhas são dado histórico
-- anterior à regra de prazo atual (algumas com mais de 60 dias de duração, ex.: a campanha 3 tem 90). Mesmo
-- raciocínio das triggers de contribuicao em [07-H-1]: dado histórico não deve ser barrado por uma regra que só
-- passou a valer depois dele existir.
ALTER TABLE campanha DISABLE TRIGGER trg_campanha_valida_prazo_negocio;

-- encerrado_em explícito na campanha 7 (única com status 'encerrado' no seed): fn_preenche_encerramento_campanha
-- só dispara em UPDATE, não em INSERT, então um dado histórico que já nasce 'encerrado' precisa do valor
-- explícito (o mesmo avaliado_em da solicitacao_encerramento correspondente, [07-E-5]).
-- Metas das campanhas 2 e 5 ajustadas para não passarem do arrecadado (28.500 e 22.000): "sucesso" abaixo da
-- meta é um estado que o próprio banco proíbe no caminho automático.
INSERT INTO campanha (id_usuario, id_admin, id_area_conhecimento, titulo, modelo, meta_financeira, taxa_plataforma, descricao, data_inicio, data_fim, status, aprovado_em, criado_em, encerrado_em) VALUES
(12, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '1.03.00.00'), 'Desenvolvimento de Algoritmo para Diagnóstico Precoce de Alzheimer por IA',      'all-or-nothing', 50000.00, 5.00, 'Pesquisa aplicada em inteligência artificial para detecção precoce da doença de Alzheimer usando redes neurais convolucionais.',                          '2024-02-01', '2024-04-01', 'sucesso',             '2024-02-01', '2024-01-20 10:00:00', NULL),
(13, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '3.13.00.00'), 'Prótese de Baixo Custo com Impressão 3D para Amputados do SUS',                  'flexivel',       28000.00, 5.00, 'Projeto de engenharia biomédica para fabricação de próteses funcionais de membros superiores a custo acessível para o sistema público.',                '2024-02-15', '2024-05-01', 'sucesso',             '2024-02-15', '2024-02-05 11:30:00', NULL),
(14, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '2.12.00.00'), 'Bioprospecção de Fungos da Caatinga com Potencial Antibiótico',                  'all-or-nothing', 40000.00, 5.00, 'Coleta e análise de fungos endofíticos da Caatinga para identificação de compostos com atividade antibacteriana frente a superbactérias.',              '2024-03-01', '2024-05-30', 'sucesso',             '2024-03-01', '2024-02-20 09:15:00', NULL),
(15, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '4.06.00.00'), 'Estudo Epidemiológico do Impacto da Dengue na Baixada Fluminense 2024',          'all-or-nothing', 25000.00, 5.00, 'Levantamento epidemiológico detalhado dos casos de dengue em municípios da Baixada Fluminense durante o surto de 2024.',                                 '2024-03-10', '2024-04-24', 'nao_atingido',        '2024-03-10', '2024-03-01 14:00:00', NULL),
(16, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '6.06.00.00'), 'Mapeamento Socioeconômico de Comunidades Quilombolas de Santa Catarina',         'flexivel',       22000.00, 5.00, 'Pesquisa quantitativa e qualitativa sobre indicadores socioeconômicos, acesso a direitos e identidade cultural em quilombos catarinenses.',              '2024-04-01', '2024-06-01', 'sucesso',             '2024-04-01', '2024-03-20 08:00:00', NULL),
(17, NULL, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '7.02.00.00'), 'Análise Discursiva das Fake News sobre Vacinas no Twitter (2022–2024)',       'all-or-nothing', 15000.00, 5.00, 'Estudo linguístico-computacional sobre estratégias discursivas de desinformação vacinal em redes sociais brasileiras.',                                  NULL,          NULL,         'rascunho',             NULL,        NOW(),                 NULL),
(18, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '4.01.00.00'), 'Eficácia de Probióticos na Redução de Infecções Hospitalares em UTI Neonatal',  'all-or-nothing', 45000.00, 5.00, 'Ensaio clínico randomizado avaliando o uso de probióticos na microbiota intestinal de neonatos para prevenção de sepse hospitalar.',                    '2024-05-01', '2024-07-30', 'encerrado',           '2024-05-01', '2024-04-15 10:00:00', '2024-08-06 11:00:00'),
-- 3 campanhas novas (ids 8, 9, 10 nesta ordem de inserção), uma para cada pesquisador novo que precisa de
-- histórico real: ver o comentário completo depois do bloco de denuncia sobre por que cada uma dá o resultado de
-- score esperado.
(19, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '1.03.00.00'), 'Nova Plataforma de Diagnóstico por Imagem com Machine Learning',              'all-or-nothing', 30000.00, 5.00, 'Sistema de apoio ao diagnóstico radiológico baseado em visão computacional, validado com dados de dois hospitais universitários.',                      '2024-06-01', '2024-07-16', 'sucesso',             '2024-06-01', '2024-05-20 10:00:00', NULL),
(20, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '4.05.00.00'), 'Estudo sobre Microbiota Intestinal em Pacientes Oncológicos',                 'flexivel',       20000.00, 5.00, 'Caracterização da microbiota intestinal e sua relação com resposta a quimioterapia em pacientes com câncer colorretal.',                                '2024-06-01', '2024-07-21', 'sucesso',             '2024-06-01', '2024-05-22 09:30:00', NULL),
(21, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '2.05.00.00'), 'Levantamento de Espécies Invasoras em Ecossistemas Costeiros',                'all-or-nothing', 25000.00, 5.00, 'Mapeamento de espécies exóticas invasoras em restingas e manguezais do litoral nordestino e seu impacto na fauna nativa.',                              '2024-06-01', '2024-08-20', 'ativo',               '2024-06-01', '2024-05-25 08:30:00', NULL);

ALTER TABLE campanha ENABLE TRIGGER trg_campanha_valida_prazo_negocio;

-- [07-E-2] seguir_campanha
INSERT INTO seguir_campanha (id_usuario, id_campanha) VALUES
(13, 1),
(14, 1),
(15, 2),
(16, 3),
(17, 3),
(18, 5),
(12, 7);

-- [07-D-4] seguir_pesquisador
INSERT INTO seguir_pesquisador (id_usuario, id_pesquisador) VALUES
(13, 12),
(14, 12),
(15, 14),
(16, 13),
(17, 18),
(18, 14),
(12, 16);

-- [07-H-1] contribuicao
-- O seed representa dados históricos já concluídos, então os dois triggers de VALIDAÇÃO (pensados para tráfego
-- em tempo real, que rejeitariam inserir contribuição numa campanha que já não está 'ativo') são desligados só
-- durante a carga do seed e religados em seguida. trg_sincroniza_arrecadado_campanha, diferente dos outros dois,
-- não valida nada, só soma, então fica LIGADA de propósito: é ela quem calcula campanha.valor_bruto_arrecadado
-- (ver [07-E-1]), em vez de alguém digitar o total à mão e errar a conta.
ALTER TABLE contribuicao DISABLE TRIGGER trg_valida_status_contribuicao;
ALTER TABLE contribuicao DISABLE TRIGGER trg_contribuicao_all_or_nothing_pix;

-- RF-048: as 4 contribuições marcadas com (*) são pix porque a campanha é all-or-nothing:
-- trg_contribuicao_all_or_nothing_pix existe para impedir cartao_credito/boleto nesse caso, e só deixaria passar
-- porque fica desligada durante a carga. Não afeta o cálculo de score (que usa o status da campanha, não o meio
-- de pagamento da contribuição).
INSERT INTO contribuicao (id_campanha, id_usuario, valor, meio_pagamento, status, anonima, id_transacao_api, criado_em) VALUES
(1, 13, 5000.00, 'pix', 'repassado',  FALSE, 'TXN-PIX-0001', '2024-02-10 10:00:00'),
(1, 14, 2300.00, 'pix', 'repassado',  FALSE, 'TXN-PIX-0002', '2024-02-12 14:30:00'), -- (*) era cartao_credito
(2, 12, 1500.00, 'pix', 'repassado',  TRUE,  'TXN-PIX-0003', '2024-02-20 09:00:00'),
(3, 16, 8000.00, 'pix', 'repassado',  FALSE, 'TXN-PIX-0004', '2024-03-05 11:00:00'), -- (*) era boleto
(5, 15, 2200.00, 'cartao_debito',  'repassado',  FALSE, 'TXN-CD-0005',  '2024-04-10 15:00:00'),
(7, 17,  500.00, 'pix',            'repassado',  TRUE,  'TXN-PIX-0006', '2024-05-10 08:00:00'),
(4, 18,  800.00, 'pix', 'a_devolver', FALSE, 'TXN-PIX-0007', '2024-03-15 12:00:00'), -- (*) era cartao_credito
-- Contribuições de usuários com papéis diferentes de 'pesquisador', para mostrar que qualquer usuário logado
-- pode apoiar campanha, não só pesquisadores.
(3, 23,  50.00,  'pix',            'repassado',  FALSE, 'TXN-PIX-0008', '2024-02-25 09:00:00'), -- Fernanda, usuario comum, contribuição pública
(1, 8, 300.00, 'pix', 'repassado',  TRUE,  'TXN-PIX-0009',  '2024-02-28 10:00:00'), -- (*) era cartao_credito. Diego, moderador, contribuição anônima (anonima=TRUE mas id_usuario preservado p/ auditoria)
(5, 10, 150.00, 'pix',            'repassado',  FALSE, 'TXN-PIX-0010', '2024-04-12 09:00:00'), -- Thiago, curador, contribuição pública
-- Contribuição de verdade anônima: sem nenhum usuário vinculado (id_usuario NULL; a coluna é nullable
-- justamente para cobrir doador sem conta/ON DELETE SET NULL). Diferente das linhas com anonima=TRUE acima, que
-- só escondem a identidade da exibição pública mas mantêm o vínculo interno.
(2, NULL, 75.00, 'pix',            'repassado',  TRUE,  'TXN-PIX-0011', '2024-03-02 10:00:00'),
-- O resto de cada campanha, distribuído em várias contribuições de doadores diferentes: o
-- valor_bruto_arrecadado é a soma real dessas linhas, calculada pela trigger (ver [07-E-1]). Campanha
-- 'all-or-nothing' só recebe pix; o resto pode usar qualquer meio de pagamento.
(1, 15,  15000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0012', '2024-02-14 10:00:00'),
(1, 16,  12000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0013', '2024-02-16 11:00:00'),
(1, 18,  10000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0014', '2024-02-18 09:00:00'),
(1, 23,   5000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0015', '2024-03-01 14:00:00'),
(1, 9,  2700.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0016', '2024-03-05 10:00:00'),

(2, 14,  8000.00, 'pix',            'repassado', FALSE, 'TXN-PIX-0017', '2024-03-10 10:00:00'),
(2, 15,  7000.00, 'cartao_credito', 'repassado', FALSE, 'TXN-CC-0018',  '2024-03-15 11:00:00'),
(2, 17,  6000.00, 'boleto',         'repassado', FALSE, 'TXN-BOL-0019', '2024-03-20 09:00:00'),
(2, 23,  3925.00, 'pix',            'repassado', FALSE, 'TXN-PIX-0020', '2024-03-25 10:00:00'),
(2, 11, 2000.00, 'cartao_debito',  'repassado', FALSE, 'TXN-CD-0021',  '2024-04-01 14:00:00'),

(3, 13,  12000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0022', '2024-03-08 10:00:00'),
(3, 15,   9000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0023', '2024-03-12 11:00:00'),
(3, 17,   6000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0024', '2024-03-18 09:00:00'),
(3, 18,   4950.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0025', '2024-03-22 10:00:00'),

-- Campanha 4 (nao_atingido): estas 3 ficam 'confirmado', não 'repassado' - a
-- campanha não bateu a meta, então nada foi repassado ao pesquisador. Junto com a
-- linha 'a_devolver' já existente acima (id_usuario=18), representam o instantâneo
-- de quando a campanha foi marcada nao_atingido: uma parte já entrou no fluxo de
-- devolução, o resto ainda esperando o processamento do reembolso em lote.
(4, 12, 3000.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0026', '2024-03-12 10:00:00'),
(4, 13, 2500.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0027', '2024-03-14 11:00:00'),
(4, 14, 2500.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0028', '2024-03-16 09:00:00'),

(5, 12, 8000.00, 'pix',            'repassado', FALSE, 'TXN-PIX-0029', '2024-04-15 10:00:00'),
(5, 17, 6000.00, 'cartao_credito', 'repassado', FALSE, 'TXN-CC-0030',  '2024-04-18 11:00:00'),
(5, 18, 3000.00, 'boleto',         'repassado', FALSE, 'TXN-BOL-0031', '2024-04-22 09:00:00'),
(5, 23, 2650.00, 'cartao_debito',  'repassado', FALSE, 'TXN-CD-0032',  '2024-04-25 10:00:00'),

(7, 12, 15000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0033', '2024-05-15 10:00:00'),
(7, 13, 12000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0034', '2024-05-20 11:00:00'),
(7, 15, 10000.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0035', '2024-05-25 09:00:00'),
(7, 16,  7500.00, 'pix', 'repassado', FALSE, 'TXN-PIX-0036', '2024-06-01 10:00:00'),

-- Campanhas 8 e 9 (sucesso, sem linha em repasse ainda - ver [07-E-4]): 'confirmado'
-- em vez de 'repassado', pra não sugerir um repasse que ainda não foi registrado.
(8, 12,  12000.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0037', '2024-06-05 10:00:00'),
(8, 13,  10000.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0038', '2024-06-08 11:00:00'),
(8, 14,   6000.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0039', '2024-06-12 09:00:00'),
(8, 15,   4000.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0040', '2024-06-15 10:00:00'),

(9, 16, 8000.00,  'pix',            'confirmado', FALSE, 'TXN-PIX-0041', '2024-06-05 10:00:00'),
(9, 17, 6000.00,  'cartao_credito', 'confirmado', FALSE, 'TXN-CC-0042',  '2024-06-10 11:00:00'),
(9, 18, 4000.00,  'boleto',         'confirmado', FALSE, 'TXN-BOL-0043', '2024-06-15 09:00:00'),
(9, 23, 3000.00,  'cartao_debito',  'confirmado', FALSE, 'TXN-CD-0044',  '2024-06-20 10:00:00'),

-- Campanha 10 ('ativo', em andamento): 'confirmado', ainda não há repasse porque
-- a campanha nem terminou.
(10, 12, 3000.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0045', '2024-06-10 10:00:00'),
(10, 13, 2500.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0046', '2024-06-15 11:00:00'),
(10, 14, 2000.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0047', '2024-06-20 09:00:00'),
(10, 15, 1500.00, 'pix', 'confirmado', FALSE, 'TXN-PIX-0048', '2024-06-25 10:00:00');

ALTER TABLE contribuicao ENABLE TRIGGER trg_valida_status_contribuicao;
ALTER TABLE contribuicao ENABLE TRIGGER trg_contribuicao_all_or_nothing_pix;

-- [07-H-3] aceite_termo_contribuicao
-- Sustenta o RF-054/RF-055: a Etapa 2 descreve essa trilha (aceite dos termos por transação) como a defesa
-- principal da plataforma numa disputa de chargeback com operadora de cartão. Gerado a partir da própria tabela
-- contribuicao (não digitado linha por linha): cada contribuição aceitou a versão de termos vigente na época (v1,
-- id_termo=1; ver [07-D-6]), no mesmo instante da contribuição.
INSERT INTO aceite_termo_contribuicao (id_contribuicao, id_termo, aceito_em, ip_aceite)
SELECT id_contribuicao, 1, criado_em, '187.10.20.30'
FROM contribuicao;

-- [07-H-2] auditoria_financeira
INSERT INTO auditoria_financeira (id_contribuicao, valor, status_novo, status_anterior, evento, timestamp) VALUES
(1, 5000.00, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-02-10 10:05:00'),
(1, 5000.00, 'repassado',  'confirmado', 'meta_atingida_repasse_efetuado', '2024-04-05 10:00:00'),
(2, 2300.00, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-02-12 14:35:00'),
(3, 1500.00, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-02-20 09:10:00'),
(4, 8000.00, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-03-05 11:15:00'),
(7,  800.00, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-03-15 12:10:00'),
(7,  800.00, 'a_devolver', 'confirmado', 'meta_nao_atingida_devolucao',    '2024-04-25 00:00:00');

-- [07-E-3] atualizacao_campanha
ALTER TABLE atualizacao_campanha DISABLE TRIGGER trg_atualizacao_campanha_status;

INSERT INTO atualizacao_campanha (id_campanha, titulo, conteudo, publicado_em, fase, tipo) VALUES
(1, 'Início da coleta de dados clínicos',        'Iniciamos a coleta de dados clínicos com parceria do Hospital das Clínicas. Primeiros 200 exames de neuroimagem analisados.', '2024-02-20 10:00:00', 'andamento',          'texto'),
(1, 'Modelo atinge 89% de acurácia',             'Modelo de deep learning atingiu acurácia de 89% na base de validação. Aguardamos revisão por pares..',                        '2024-03-15 14:00:00', 'resultado_preliminar','texto'),
(2, 'Primeiros protótipos testados',             'Primeiros 10 protótipos de prótese impressos e testados por voluntários. Ajustes ergonômicos em andamento.',                  '2024-03-05 09:30:00', 'andamento',          'imagem'),
(3, 'Coleta de amostras concluída',              'Coleta de amostras concluída em 5 biomas. 120 espécies de fungos catalogadas para análise laboratorial.',                     '2024-04-01 11:00:00', 'andamento',          'texto'),
(5, 'Questionários aplicados nas comunidades',   'Questionários aplicados em 12 comunidades quilombolas. Dados sendo sistematizados para análise estatística.',                  '2024-05-01 08:00:00', 'andamento',          'texto'),
(7, 'Ensaio clínico concluído',                  'Ensaio clínico concluído. Grupo probiótico apresentou redução de 34% nas taxas de sepse versus controle.',                    '2024-09-01 10:00:00', 'resultado_final',    'pdf'),
(1, 'Artigo submetido à Nature Medicine',        'Artigo submetido ao periódico Nature Medicine. Código e dataset disponibilizados em repositório público.',                     '2024-04-10 16:00:00', 'resultado_final',    'linkexterno'),
(8,  'Modelo de visão computacional treinado',    'Primeira versão do modelo treinada com 15 mil exames anotados por 2 hospitais parceiros. Acurácia inicial de 91% em validação.', '2024-06-20 10:00:00', 'andamento',          'texto'),
(8,  'Validação clínica concluída',               'Validação prospectiva concluída com radiologistas de referência. Resultados finais submetidos para publicação.',                  '2024-07-10 14:00:00', 'resultado_final',    'texto'),
(10, 'Primeiras trilhas de campo mapeadas',        'Concluído o mapeamento de 3 das 8 trilhas previstas em restingas do litoral. Catalogação de espécies em andamento.',             '2024-07-05 09:00:00', 'andamento',          'texto');

ALTER TABLE atualizacao_campanha ENABLE TRIGGER trg_atualizacao_campanha_status;

-- [07-G-1] arquivo_atualizacao
INSERT INTO arquivo_atualizacao (id_arquivo, id_atualizacao) VALUES
(3, 3),
(8, 6),
(1, 1),
(2, 2),
(4, 4),
(5, 5),
(6, 7);

-- [07-E-4] repasse
ALTER TABLE repasse DISABLE TRIGGER trg_valida_repasse;

INSERT INTO repasse (id_campanha, valor_bruto, valor_liquido, meta_atingida, repassado_em, taxa_relativa, status) VALUES
(1, 52300.00, 49685.00, TRUE,  '2024-04-05 10:00:00', 5.00, 'concluido'),
(2, 28500.00, 27075.00, FALSE, '2024-05-10 10:00:00', 5.00, 'concluido'),
(3, 40000.00, 38000.00, TRUE,  '2024-06-10 10:00:00', 5.00, 'concluido'),
(5, 22000.00, 20900.00, FALSE, '2024-06-10 10:00:00', 5.00, 'concluido'),
(7, 45000.00, 42750.00, TRUE,  '2024-08-10 10:00:00', 5.00, 'concluido'),
(4,  8000.00,  0.00,    FALSE, NULL,                   5.00, 'a_devolver');

ALTER TABLE repasse ENABLE TRIGGER trg_valida_repasse;

-- [07-E-5] solicitacao_encerramento
INSERT INTO solicitacao_encerramento (id_campanha, id_admin, justificativa_pesquisador, status, solicitado_em, avaliado_em) VALUES
(7, 1,   'Todos os objetivos do ensaio clínico foram atingidos e resultados publicados. Solicito encerramento formal.', 'aprovado',  '2024-08-05 09:00:00', '2024-08-06 11:00:00'),
(1, 1,   'Artigo publicado e resultados divulgados à comunidade. Encerrando ciclo da campanha.',                         'aprovado',  '2024-04-12 10:00:00', '2024-04-13 09:00:00'),
(3, 1,   'Análises laboratoriais concluídas e relatório final entregue. Solicito encerramento.',                         'aprovado',  '2024-06-15 14:00:00', '2024-06-16 10:00:00'),
(4, 1,   'Meta financeira não atingida. Solicitando encerramento e devolução de valores aos apoiadores.',                'aprovado',  '2024-04-25 00:00:00', '2024-04-25 08:00:00'),
(5, 1,   'Relatório de pesquisa entregue à UFSC e comunidades. Encerrando formalmente a campanha.',                     'aprovado',  '2024-06-12 11:00:00', '2024-06-13 09:00:00'),
(2, 1,   'Distribuição das próteses concluída. Solicito encerramento e repasse dos valores arrecadados.',               'aprovado',  '2024-05-12 08:00:00', '2024-05-13 10:00:00'),
(6, NULL,'Desejo encerrar a campanha antes da aprovação por motivos pessoais de agenda.',                                'cancelado', '2025-04-15 12:00:00', NULL);

-- [07-E-6] historico_rejeicao
-- id_usuario_dono e titulo_campanha são o snapshot gravado na rejeição (ver 01):
-- aqui vêm de campanha pra não repetir dado à mão em cada linha.
INSERT INTO historico_rejeicao (id_campanha, id_usuario_dono, titulo_campanha, id_admin, justificativa, rejeitado_em)
SELECT v.id_campanha, c.id_usuario, c.titulo, v.id_admin, v.justificativa, v.rejeitado_em::TIMESTAMPTZ
FROM (VALUES
(4, 1, 'Campanha não apresentou metodologia clara nem parecer de comitê de ética em pesquisa.',               '2024-03-08 10:00:00'),
(6, 1, 'Escopo da pesquisa não enquadrado como pesquisa acadêmica financiável pela plataforma.',              '2025-04-12 11:00:00'),
(1, 1, 'Versão inicial sem descrição detalhada dos dados utilizados. Resubmissão solicitada.',                '2024-01-25 09:00:00'),
(2, 1, 'Faltou anexar declaração institucional da UNICAMP. Campanha devolvida para ajuste.',                  '2024-02-08 14:00:00'),
(3, 1, 'Meta financeira considerada excessiva sem justificativa de custos detalhada. Ajuste e reenvio.',      '2024-02-22 10:00:00'),
(5, 1, 'Necessidade de inclusão de termo de consentimento das comunidades quilombolas no projeto.',           '2024-03-22 13:00:00'),
(7, 1, 'Protocolo de ensaio clínico incompleto. Aprovação pelo CEP obrigatória antes de prosseguir.',        '2024-04-17 11:00:00')
) AS v(id_campanha, id_admin, justificativa, rejeitado_em)
JOIN campanha c ON c.id_campanha = v.id_campanha;

-- [07-E-7] comentario
INSERT INTO comentario (id_campanha, id_pesquisador, conteudo, endossado, criado_em, ordem_endosso) VALUES
(1, 13, 'Pesquisa extremamente relevante! A detecção precoce de Alzheimer pode mudar vidas. Apoio totalmente.',          TRUE,  '2024-02-15 10:00:00', 1),
(1, 14, 'Parabéns pela metodologia robusta com redes neurais. Seria interessante publicar o dataset aberto.',            TRUE,  '2024-02-18 14:00:00', 2),
(1, 18, 'Acompanhei cada etapa desta campanha. Exemplo de transparência e rigor científico.',                           TRUE,  '2024-04-12 13:00:00', 3),
(2, 12, 'Iniciativa incrível de engenharia aplicada. A parceria com o SUS é essencial para o impacto real.',            FALSE, '2024-03-01 09:00:00', NULL),
(3, 16, 'Bioprospecção da Caatinga é subutilizada. Fico feliz em ver investimento nessa área tão rica.',                TRUE,  '2024-03-10 11:00:00', 1),
(5, 18, 'Estudo importantíssimo para as comunidades quilombolas. A metodologia participativa é um diferencial.',         FALSE, '2024-04-15 16:00:00', NULL),
(7, 13, 'Ensaio clínico com resultado impressionante de 34% de redução de sepse. Esse trabalho merece publicação top.', TRUE,  '2024-09-05 10:00:00', 1);

-- [07-E-8] denuncia
-- Resolve o motivo por `descricao` (a coluna `codigo` não existe mais no catálogo, ver
-- 01_extensoes_enums_tabelas.sql); `descricao` é única o bastante neste seed para servir de chave de leitura só
-- aqui, sem precisar de id_motivo cru (frágil à ordem do INSERT acima).
INSERT INTO denuncia (id_usuario, id_campanha_alvo, id_pesquisador_alvo, id_motivo, status, criado_em)
SELECT v.id_usuario, v.id_campanha_alvo, v.id_pesquisador_alvo, md.id_motivo, v.status::status_denuncia, v.criado_em::timestamptz
FROM (VALUES
    (13, 6,    NULL::int, 'Campanha com informações falsas ou enganosas', 'improcedente', '2025-04-11 09:00:00'),
    (14, NULL, 17,        'Perfil com dados acadêmicos falsos',           'pendente',     '2025-04-12 10:00:00'),
    (15, 4,    NULL,      'Campanha com informações falsas ou enganosas', 'resolvida',    '2024-03-16 11:00:00'),
    (16, NULL, 15,        'Comportamento abusivo ou ofensivo',            'em_analise',   '2024-03-20 14:00:00'),
    (17, 2,    NULL,      'Campanha duplicada ou já existente',           'improcedente', '2024-03-02 08:00:00'),
    (18, NULL, 17,        'Usurpação de identidade de pesquisador real',  'pendente',     '2025-04-13 15:00:00'),
    (12, 6,    NULL,      'Campanha fora do escopo acadêmico',            'pendente',     '2025-04-14 10:00:00'),
    -- Denúncias que alimentam de propósito a dimensão Reputação da Comunidade (calcular_score_reputacao, 05) dos 2
    -- pesquisadores novos que precisam de reputação imperfeita.
    -- Eduardo (21): 2 denúncias 'pendente' (ainda não procedentes) não custam ponto nenhum, pois só 'resolvida'
    -- penaliza; a reputação dele fica intacta e ele só precisa ficar em "Em Construção" (25-49), não em
    -- "Atenção".
    (13, NULL, 21, 'Perfil com dados acadêmicos falsos',          'pendente',  '2024-06-10 09:00:00'),
    (23, NULL, 21, 'Comportamento abusivo ou ofensivo',           'pendente',  '2024-06-12 10:00:00'),
    -- Vinícius (22): 4 denúncias 'resolvida' (= procedente) de 4 denunciantes
    -- diferentes (a UNIQUE de denuncia é por par usuário/alvo, por isso não repito
    -- denunciante) - cada uma custa 1+3=4 pontos (25 → 9), derrubando a reputação
    -- o bastante pra, somada ao resto do perfil dele (sem link, sem campanha),
    -- garantir a faixa "Atenção" (0-24).
    (12, NULL, 22, 'Perfil com dados acadêmicos falsos',          'resolvida', '2024-06-01 09:00:00'),
    (15, NULL, 22, 'Comportamento abusivo ou ofensivo',           'resolvida', '2024-06-02 10:00:00'),
    (9,  NULL, 22, 'Usurpação de identidade de pesquisador real', 'resolvida', '2024-06-03 11:00:00'),
    (11, NULL, 22, 'Perfil com dados acadêmicos falsos',          'resolvida', '2024-06-04 12:00:00')
) AS v(id_usuario, id_campanha_alvo, id_pesquisador_alvo, motivo_descricao, status, criado_em)
JOIN motivo_denuncia md ON md.descricao = v.motivo_descricao;

-- [07-D-7] notificacao
-- 7 linhas em estados diferentes, para exercitar a permissão notificacao_processar e o índice
-- idx_notificacao_status (02) contra linhas reais.
INSERT INTO notificacao (id_usuario, email_destinatario, tipo_evento, status, tentativas, criado_em, enviado_em, ultimo_erro) VALUES
(12, 'ana.santos@usp.br',           'campanha_aprovada',                  'enviado',  1, '2024-02-01 10:05:00', '2024-02-01 10:05:30', NULL),
(13, 'carlos.melo@unicamp.br',      'doacao_recebida',                    'enviado',  1, '2024-02-10 10:00:30', '2024-02-10 10:01:00', NULL),
(15, 'rafael.costa@ufrj.br',        'campanha_rejeitada',                 'pendente', 0, '2024-01-25 09:00:10', NULL,                   NULL),
(17, 'marcos.oliveira@unesp.br',    'solicitacao_encerramento_aprovada',  'pendente', 0, '2024-05-13 10:00:05', NULL,                   NULL),
(14, 'beatriz.lima@ufmg.br',        'denuncia_recebida_contra_perfil',    'falhou',   3, '2024-03-20 08:00:10', NULL,                   'SMTP timeout: gateway de e-mail não respondeu após 3 tentativas'),
(23, 'fernanda.souza@gmail.com',    'doacao_confirmada',                  'falhou',   2, '2024-02-25 09:00:10', NULL,                   'Endereço de e-mail rejeitado pelo servidor de destino (550 mailbox not found)'),
(16, 'juliana.ferreira@ufsc.br',    'campanha_proxima_do_prazo',          'cancelado',0, '2024-05-20 08:00:00', NULL,                   'Cancelada: campanha encerrada antes do envio programado');

-- ----------------------------------------------------------------------------
-- RESUMO: por que cada um dos 4 pesquisadores novos cai na faixa de
-- score_rotulo esperada, tudo calculado por trg_perfil_recalcula_score /
-- trg_link_recalcula_score / trg_campanha_recalcula_score / trg_atualizacao_
-- recalcula_score / trg_denuncia_recalcula_score (05) - nenhum número foi
-- digitado à mão em score_atual.
--
--                    Perfil acad. Histórico Atualização Reputação  Total  Faixa
-- Bruno    (19)          30          25          20         25     100  Referência (75-100)
-- Renata   (20)          10          25           0         25      60  Confiável  (50-74)
-- Eduardo  (21)          10          10           3         23      46  Em Construção (25-49)
-- Vinícius (22)          10           0           0          9      19  Atenção    (0-24)
--
-- Perfil acadêmico: Bruno tem Lattes+ORCID+LinkedIn+instituição+título (8+8+4+5+5=30);
--   os outros 3 só têm instituição+título (5+5=10, obrigatório desde que a coluna virou
--   NOT NULL - não dá pra zerar essa dimensão de propósito).
-- Histórico: Bruno e Renata têm campanha 'sucesso' e aprovada (15+10=25); Eduardo tem
--   campanha 'ativo' aprovada mas ainda não encerrada (só os 10 da aprovação); Vinícius
--   não tem nenhuma campanha (0).
-- Atualização: Bruno publicou 2 atualizações numa campanha curta = crédito cheio (20);
--   Eduardo publicou 1 numa campanha mais longa = crédito parcial (3); Renata e Vinícius
--   não têm nenhuma atualização (0).
-- Reputação: Bruno e Renata não têm denúncia (25); Eduardo tem 2 pendentes (25−2=23);
--   Vinícius tem 4 procedentes (25−4×4=9).
-- ----------------------------------------------------------------------------

-- [07-D-5] Como logar no app depois deste seed (autenticação própria, ver DOCUMENTACAO_BD.md)

-- [07-I-3] Backfill de segurança: cada INSERT acima (perfil_pesquisador, link_academico, campanha,
-- atualizacao_campanha, denuncia) já dispara sua própria trigger de recálculo (ver 05_regras_negocio.sql,
-- [05-I-4]), então quando o seed chega aqui os scores dos 11 pesquisadores já deveriam estar corretos. Esta
-- chamada existe só como rede de segurança: reprocessa todo mundo do zero, caso alguma trigger seja
-- desligada/alterada no futuro e alguém esqueça de rodar isso manualmente depois.
SELECT public.recalcular_todos_os_scores();