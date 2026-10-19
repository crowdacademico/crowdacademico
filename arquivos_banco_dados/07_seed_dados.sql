-- ============================================================================
--  CROWDACADÊMICO - SISTEMA DE CROWDFUNDING PARA PESQUISA CIENTÍFICA
-- ============================================================================
--  Arquivo:     07_seed_dados.sql
--  Módulo:      Dados iniciais (referência e demonstração)
--  Depende de:  01 a 06
--  Próximo:     08_trigger_signup_usuario.sql
--
--  Senha de todo mundo neste seed = DevTcc123!
-- ----------------------------------------------------------------------------
--  Em palavras simples: o arquivo tem duas partes.
--  1. Referência: o que o sistema precisa para funcionar em qualquer banco (pontuação do score, papéis e
--     permissões, tipos de link, áreas do conhecimento, motivos de denúncia, a versão vigente de cada termo e os
--     parâmetros).
--  2. Demonstração, a partir do marcador [07-DEMONSTRACAO]: contas, pesquisadores, campanhas, contribuições,
--     comentários, denúncias, termos antigos, as permissões das ferramentas de teste e a leitura liberada de
--     desenvolvimento. Num banco de produção, a segunda parte não roda (rodar o arquivo só até o marcador).
-- ============================================================================

-- Todas as datas e horas escritas neste arquivo são do horário de Brasília. Sem isto, o Postgres (o Supabase roda
-- em UTC) lê '2024-01-01 00:00:00' como meia-noite de Londres, que em Brasília é 21h do dia anterior: a conta
-- criada em 01/01/2024 aparecia como "Membro desde 12/2023". SET LOCAL não serve aqui (o arquivo não roda numa
-- transação só); o SET vale até o fim da conexão, e o RESET no fim do arquivo devolve o padrão.
SET TIME ZONE 'America/Sao_Paulo';

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
SELECT 'linkedin',    'Link (ResearchGate, LinkedIn, GitHub...)', 6, id_score_config FROM score_config WHERE nome = 'perfil_academico';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'instituicao', 'Instituição de vínculo preenchida',   4, id_score_config FROM score_config WHERE nome = 'perfil_academico';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'titulo',      'Título acadêmico informado',          4, id_score_config FROM score_config WHERE nome = 'perfil_academico';

INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'campanhas_concluidas', 'Campanhas concluídas e encerradas', 15, id_score_config FROM score_config WHERE nome = 'historico_plataforma';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'taxa_aprovacao',       'Taxa de aprovação de campanhas',    10, id_score_config FROM score_config WHERE nome = 'historico_plataforma';

INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'regularidade_atualizacoes',   'Regularidade de atualizações de progresso',      8,  id_score_config FROM score_config WHERE nome = 'atualizacao_campanha';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'tempestividade_atualizacoes', 'Qualidade e tempestividade das atualizações',   12, id_score_config FROM score_config WHERE nome = 'atualizacao_campanha';

-- Reputação: denúncia procedente contra a campanha pesa mais que contra o perfil (fraude de campanha atinge quem
-- apoia). Cada parte zera em score_denuncias_para_zerar denúncias procedentes ([07-I-2]).
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'denuncias_perfil',   'Sem denúncias procedentes contra o perfil',       10, id_score_config FROM score_config WHERE nome = 'reputacao_comunidade';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'denuncias_campanha', 'Sem denúncias procedentes contra as campanhas',   15, id_score_config FROM score_config WHERE nome = 'reputacao_comunidade';

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
INSERT INTO papel (nome, codigo, descricao) VALUES
('admin', 'admin', 'Acesso total ao painel: usuários, papéis e permissões, parâmetros, catálogos, Termo de Uso, aprovação de campanhas, moderação e log.'),
('moderador', 'moderador', 'Cuida do conteúdo: julga denúncias, decide contestações de denúncias julgadas por outra pessoa, modera comentários e atualizações e pode encerrar uma campanha por moderação.'),
('revisor', 'revisor', 'Acompanha o funcionamento, só lendo: vê relatórios, a pontuação dos pesquisadores, a auditoria financeira e o log, sem dados pessoais.'),
('suporte', 'suporte', 'Atende quem tem problema para entrar: desbloqueia login, encerra sessões, reenvia a verificação de e-mail e cancela pedidos de recuperação de senha.'),
('curador', 'curador', 'Faz a curadoria das campanhas (aprova e rejeita) e cuida dos catálogos: áreas do conhecimento, tipos de link e motivos de denúncia.'),
('pesquisador', 'pesquisador', 'Recebido no upgrade para pesquisador: cria e gerencia as próprias campanhas. Não dá acesso ao que é de outras pessoas.'),
('usuario', 'usuario', 'Papel de toda conta cadastrada. Sozinho, não libera nenhuma área de administração.')
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
-- Gate do "Criar usuário" do painel (POST /usuario, checado no Nest). Não é policy: pol_usuario_insert é WITH
-- CHECK (true) porque o cadastro público grava a conta antes de existir sessão ([04-D-2]).
('usuario_criar'),
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
-- Gate de alterar_perfil_pesquisador_de_outro() (03, [03-U]): o modal de Alterar Usuário salva
-- vínculo/título acadêmico de QUEM está sendo editado (PATCH /perfil-pesquisador/:id); o self-service (sem id)
-- só edita o próprio perfil.
('perfil_pesquisador_alterar_de_outro'),
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
('evento_pagamento_visualizar'),
('pagamento_revisao_resolver'),
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
    ('admin', 'usuario_criar'),
    ('admin', 'usuario_suspender'),
    ('admin', 'usuario_visualizar_sensivel'),
    ('admin', 'perfil_pesquisador_visualizar_sensivel'),
    ('admin', 'perfil_pesquisador_corrigir_cpf'),
    ('admin', 'perfil_pesquisador_alterar_de_outro'),
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
    ('admin', 'evento_pagamento_visualizar'),
    ('admin', 'pagamento_revisao_resolver'),
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
    -- revisor: vê tudo do funcionamento (relatórios, pontuação, auditoria financeira e log), sem dados pessoais e sem
    -- alterar nada. Mudar pesos e faixas da pontuação (score_editar) é só do admin.
    ('revisor', 'relatorio_visualizar'),
    ('revisor', 'score_visualizar'),
    ('revisor', 'auditoria_financeira_visualizar'),
    ('revisor', 'log_visualizar'),
    -- suporte: atendimento de conta, sem acesso a dados sensíveis ou financeiros.
    ('suporte', 'sessao_revogar'),
    ('suporte', 'recuperacao_senha_revogar'),
    ('suporte', 'verificacao_email_reenviar'),
    -- Desbloquear login é atendimento de conta, mesmo escopo das outras permissões de 'suporte' acima.
    -- usuario_excluir NÃO fica com 'suporte': exclusão de conta é auto-serviço do titular (já funciona sem
    -- nenhuma permissão, ver excluir_conta_usuario em 03, [03-O]); suporte abre chamado, não executa. Só o
    -- admin mantém a permissão.
    ('suporte', 'usuario_desbloquear'),
    -- curador: aprova e rejeita campanhas (a curadoria) e cuida dos catálogos que classificam o conteúdo.
    -- relatorio_visualizar: sem ela a fila de campanhas aguardando aprovação fica invisível (pol_campanha_select, 04).
    -- score_visualizar apoia a decisão. Publicar o Termo de Uso é só do admin.
    ('curador', 'campanha_aprovar'),
    ('curador', 'campanha_rejeitar'),
    ('curador', 'relatorio_visualizar'),
    ('curador', 'tipolink_gerenciar'),
    ('curador', 'area_conhecimento_gerenciar'),
    ('curador', 'motivo_denuncia_gerenciar'),
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

-- [07-D-6] termos_de_uso / usuario_termo
-- Sustentam o RF-011 (aceite obrigatório no cadastro). Três versões de cada termo, em ordem de id: 1 e 2 são as
-- antigas (v1, de 2024, aceitas por quem se cadastrou ou fez o upgrade antes da v2), 3 e 4 são as vigentes (v2),
-- e 5 e 6 são rascunhos da próxima versão (v3), sem aceite. Aqui entram só as vigentes, com id 3 e 4 escritos à
-- mão para deixar o 1 e o 2 às antigas, que são da demonstração ([07-D-6], versões antigas). Nenhum texto é
-- jurídico validado: precisa de revisão antes de qualquer uso em produção.
--
-- PEGADINHA (vale para o NestJS, ao publicar uma versão nova): publicar v2 sem antes desativar v1 quebra com o
-- erro do índice parcial uq_termos_uso_ativo (02), que só permite 1 linha ativa POR TIPO. O UPDATE que desativa
-- a versão velha e o INSERT da versão nova precisam estar na MESMA transação (é o que este bloco já faz).
--
-- `tipo` explícito em toda linha abaixo: o sistema sempre tem 1 versão vigente de cada termo, o da conta
-- ('cadastro', que cobre também as contribuições) e o de pesquisador ('upgrade_pesquisador'), cada um com a
-- sua PRÓPRIA versão/histórico.
-- v2 da conta: em relação à v1, o item 5.4 diz que o IP de onde a contribuição foi feita é registrado (inclusive na
-- anônima) e guardado por 5 anos (configuracoes.ip_aceite_contribuicao_retencao_dias). Versão nova, não edição da
-- v1: versão já aceita não se altera, e toda conta aceita a v2 no próximo login.
INSERT INTO termos_de_uso (id_termo, tipo, versao, conteudo, ativo, criado_em) VALUES
(3, 'cadastro', 'v2-2026-10-03', 'TERMOS DE USO E POLÍTICA DE PRIVACIDADE - CROWDACADÊMICO

Estes Termos valem para a conta e para todas as contribuições feitas na plataforma. O aceite é registrado no cadastro e novamente a cada contribuição, com a versão vigente naquele momento.

1. OBJETO
O CrowdAcadêmico é uma plataforma de financiamento coletivo (crowdfunding) dedicada exclusivamente a projetos de pesquisa científica e tecnológica brasileira. Estes Termos regem o uso da plataforma por pesquisadores, apoiadores e demais usuários, cadastrados ou não.

2. CADASTRO E CONTA
O cadastro exige informações verdadeiras, completas e atualizadas. Cada pessoa pode manter apenas uma conta ativa. O usuário é responsável por manter a confidencialidade de sua senha e por toda atividade realizada em sua conta.

3. PERFIL DE PESQUISADOR
Para submeter e gerenciar campanhas, o usuário deve solicitar o upgrade para perfil de pesquisador, que tem termo próprio, aceito no momento do upgrade.

4. CAMPANHAS
Toda campanha passa por aprovação administrativa antes de ficar visível ao público. O CrowdAcadêmico não garante o sucesso de nenhuma campanha nem se responsabiliza pelo uso dos recursos arrecadados após o repasse ao pesquisador responsável.

5. CONTRIBUIÇÕES
5.1. Natureza. A contribuição é voluntária e destinada ao financiamento do projeto de pesquisa descrito na campanha. O CrowdAcadêmico atua como intermediário entre apoiador e pesquisador, não é parte na relação de pesquisa e não garante os resultados científicos do projeto apoiado.
5.2. Modelo de arrecadação e repasse. Conforme o modelo da campanha, informado na própria página antes da contribuição, o valor é repassado ao pesquisador somente se a meta for atingida (tudo ou nada) ou pode ser repassado mesmo sem atingi-la (flexível).
5.3. Reembolso. A contribuição é devolvida nos casos previstos nas regras da plataforma, como a campanha tudo ou nada que não atinge a meta ou a campanha encerrada por moderação antes do repasse. Fora desses casos, a contribuição é definitiva a partir da confirmação do pagamento.
5.4. Aceite por contribuição. A cada contribuição, o apoiador confirma estes Termos e as regras do modelo da campanha. A plataforma registra a data, a hora, a versão destes Termos vigente naquele momento, o identificador da transação e o endereço IP de onde a contribuição foi feita (inclusive na contribuição anônima), para fins de auditoria e de defesa em eventual contestação do pagamento. O endereço IP é guardado por 5 (cinco) anos, o prazo para reclamações de consumo (Código de Defesa do Consumidor, art. 27), e depois é apagado; os demais registros da contribuição seguem o item 5.5. A versão registrada é a que se aplica àquela contribuição, mesmo que uma versão nova seja publicada depois.
5.5. Dados de pagamento. Os dados de pagamento são processados pelo meio de pagamento escolhido (Pix, cartão ou boleto). A plataforma guarda o registro da contribuição e do aceite pelo prazo exigido em lei, mesmo que a conta seja encerrada.

6. PROPRIEDADE INTELECTUAL
O conteúdo publicado por pesquisadores (descrição de projeto, atualizações, materiais anexados) permanece de titularidade do autor. Ao publicar, o pesquisador concede ao CrowdAcadêmico licença não exclusiva para exibição pública do conteúdo na plataforma, pelo tempo em que a campanha ou o perfil permanecerem ativos.

7. PROTEÇÃO DE DADOS PESSOAIS (LGPD)
O tratamento de dados pessoais nesta plataforma segue a Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018). Coletamos apenas os dados necessários para cadastro, validação de identidade, processamento de contribuições e cumprimento de obrigações legais. O titular dos dados tem direito a: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; e revogação do consentimento, a qualquer momento, mediante solicitação pelos canais oficiais da plataforma. Dados sensíveis, como CPF, são armazenados de forma protegida e nunca exibidos publicamente em sua forma completa.

8. MODERAÇÃO E DENÚNCIAS
A equipe administrativa pode suspender ou encerrar campanhas, perfis ou contas que violem estes Termos, mediante denúncia fundamentada ou verificação própria, assegurado o direito de manifestação do usuário afetado.

9. ENCERRAMENTO DE CONTA
O usuário pode solicitar o encerramento de sua conta a qualquer momento. Dados vinculados a obrigações legais ou financeiras, como o histórico de contribuições, podem ser mantidos pelo prazo exigido pela legislação aplicável, mesmo após o encerramento.

10. ALTERAÇÕES DESTES TERMOS
Estes Termos podem ser atualizados periodicamente. A versão vigente é sempre a mais recente publicada, e o usuário é notificado para revisar e aceitar o texto atualizado.

11. FORO
Fica eleito o foro da comarca do domicílio do usuário para dirimir eventuais controvérsias, conforme o Código de Defesa do Consumidor, quando aplicável.', TRUE, '2026-10-03 00:00:00')
ON CONFLICT (tipo, versao) DO NOTHING;

-- v2 do pesquisador: em relação à v1, a seção 4 explica como a pontuação é calculada (as quatro dimensões, as
-- denúncias procedentes contra o perfil e contra as campanhas, o encerramento direto fora do histórico) e o pedido
-- de revisão (LGPD, art. 20). Versão nova, não edição da v1: versão já aceita não se altera.
INSERT INTO termos_de_uso (id_termo, tipo, versao, conteudo, ativo, criado_em) VALUES
(4, 'upgrade_pesquisador', 'v2-2026-10-03', 'TERMOS DE UPGRADE DE PERFIL DE PESQUISADOR - CROWDACADÊMICO

1. OBJETO
Este termo é exibido no momento em que um usuário comum solicita o upgrade de sua conta para perfil de pesquisador, complementando os Termos de Uso gerais aceitos no cadastro.

2. RESPONSABILIDADE PELAS INFORMAÇÕES DECLARADAS
Ao solicitar o upgrade, o usuário declara que o CPF, o vínculo institucional (quando aplicável) e o título acadêmico informados são verdadeiros. Informações falsas podem levar à suspensão do perfil de pesquisador e das campanhas vinculadas a ele.

3. RESPONSABILIDADES DO PERFIL DE PESQUISADOR
O perfil de pesquisador autoriza submeter e gerenciar campanhas de financiamento coletivo. O pesquisador é responsável pela veracidade das informações de cada campanha, pela execução do projeto descrito e pela prestação de contas aos apoiadores, conforme as regras de moderação da plataforma.

4. PONTUAÇÃO E REPUTAÇÃO
4.1. O perfil de pesquisador recebe uma pontuação (score) de 0 a 100, calculada automaticamente pela plataforma e exibida publicamente junto com uma faixa de reputação.
4.2. A pontuação considera quatro dimensões: (a) o perfil acadêmico declarado (links acadêmicos, vínculo institucional e título); (b) o histórico na plataforma (campanhas concluídas com sucesso e campanhas aprovadas pela moderação); (c) a regularidade das atualizações publicadas nas campanhas; e (d) a reputação na comunidade, que diminui com denúncias julgadas procedentes pela moderação, tanto contra o perfil quanto contra as campanhas do pesquisador.
4.3. Denúncias pendentes, em análise ou julgadas improcedentes não afetam a pontuação. A campanha encerrada pelo próprio pesquisador antes do prazo, sem nenhuma contribuição confirmada, não entra no histórico.
4.4. Os pesos de cada dimensão e as faixas de reputação são definidos pela administração da plataforma e podem ser ajustados. A pontuação é recalculada sempre que os dados do pesquisador ou esses pesos mudam.
4.5. A pontuação não impede a criação de campanhas: uma pontuação baixa apenas sinaliza à moderação que a campanha merece uma revisão mais cuidadosa.
4.6. O pesquisador pode pedir a revisão de uma pontuação que considere incorreta pelo canal de suporte da plataforma, conforme o artigo 20 da Lei 13.709/2018 (LGPD).

5. DADOS PESSOAIS (LGPD)
O CPF é armazenado de forma cifrada e nunca exibido publicamente em sua forma completa, conforme a Lei 13.709/2018 (LGPD). O vínculo institucional e o título acadêmico são exibidos publicamente no perfil, por serem informações de natureza profissional/acadêmica relevantes para os apoiadores.

6. ALTERAÇÕES DESTE TERMO
Este termo pode ser atualizado periodicamente; a versão vigente no momento da solicitação do upgrade é a que se aplica.', TRUE, '2026-10-03 00:00:00');
-- Com id escrito à mão, a sequência não anda sozinha: a próxima versão criada recebe o id 5.
SELECT setval(pg_get_serial_sequence('termos_de_uso', 'id_termo'), (SELECT max(id_termo) FROM termos_de_uso));


-- [07-C-5] configuracoes: por que este bloco vem depois de usuario (ver DOCUMENTACAO_BD.md)
-- Agrupado por domínio (A,D,E,F,H,I, mesma ordem de [07-B-2]): configuracoes.service.findall.ts ordena por
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
-- Lidas por ConfiguracaoValorService (commons/configuracao) em auth.service.login.ts/auth.service.register.ts,
-- mesmo padrão dos dois de cima (limite_tentativas_login/bloqueio_login_minutos): janelas de tempo configuráveis
-- pelo Painel Admin.
(NULL, 'refresh_token_dias_validade', '30',   'inteiro',  'Por quantos dias a sessão continua válida (refresh token) antes de precisar logar de novo', TRUE, FALSE),
(NULL, 'verificacao_email_horas_validade', '24', 'inteiro', 'Validade do token de verificação de e-mail, em horas', TRUE, FALSE),
(NULL, 'recuperacao_senha_minutos_validade', '30', 'inteiro', 'Validade do link de "Esqueci minha senha", em minutos', TRUE, FALSE),
-- Lida por contar_metricas_dashboard() (03, [03-M]): o card "sessões ativas" conta sessão criada (login ou
-- renovação do token) dentro desta janela.
-- Lida por desativar_arquivos_orfaos() (05, [05-G]): prazo para um arquivo enviado ser adotado por um dono
-- (foto de perfil, anexo) antes de ser desativado e apagado do armazenamento. 0 = desligado.
(NULL, 'arquivo_horas_para_vincular', '24', 'inteiro', 'Horas que um arquivo enviado pode ficar sem uso (sem virar foto ou anexo) antes de ser apagado', TRUE, FALSE),
(NULL, 'dashboard_sessao_ativa_minutos', '30', 'inteiro', 'Janela (em minutos) usada pelo painel para contar uma sessão como ativa agora', TRUE, FALSE),
-- Opções de prazo sugeridas no seletor de "Suspender Usuário" do painel; lida pelo React
-- (minha-conta/alterar-usuario), não por nenhuma trigger/função do banco.
(NULL, 'suspensao_usuario_opcoes_dias', '1,3,7,30', 'texto', 'Opções de prazo (em dias) sugeridas no seletor de suspensão de usuário - lista separada por vírgula.', TRUE, TRUE),
-- E
-- prazo_minimo_campanha_dias e os limites de negócio (campanhas simultâneas, endossos, denúncias/24h) são lidos
-- pelas triggers de 05 (ver as funções correspondentes); mudar a política é um UPDATE numa linha.
(NULL, 'taxa_plataforma_padrao',     '5.00',  'decimal',  'Taxa padrão cobrada pela plataforma (%)',              TRUE, TRUE),
(NULL, 'taxa_minima_repasse',        '2.00',  'decimal',  'Menor taxa da plataforma num repasse, em R$: cobre a tarifa do provedor pela transferência Pix ao pesquisador', TRUE, TRUE),
-- Lida por expirar_contribuicoes_pendentes() e encerrar_campanhas_vencidas() (05, [05-K-2]): o Pix pendente vence
-- depois disto, e a campanha vencida espera os pendentes ainda válidos antes de sair o resultado.
(NULL, 'pix_validade_horas',         '24',    'inteiro',  'Horas que um Pix gerado pode ser pago; depois disso a contribuição pendente vence', TRUE, TRUE),
(NULL, 'prazo_minimo_campanha_dias', '15',    'inteiro',  'Duração mínima permitida de uma campanha em dias',     TRUE, TRUE),
-- Prazo máximo de campanha: 60 dias (decisão de produto: 15 a 60).
(NULL, 'prazo_maximo_campanha_dias', '60',    'inteiro',  'Duração máxima permitida de uma campanha em dias',     TRUE, TRUE),
-- Lida só pelo React (formulário de criação, RF-069): sugestão, não regra. Fica entre o mínimo e o máximo acima.
(NULL, 'prazo_sugerido_campanha_dias', '30', 'inteiro', 'Duração que o formulário de criação de campanha sugere, em dias (a pessoa pode mudar)', TRUE, TRUE),
(NULL, 'limite_campanhas_simultaneas','2',    'inteiro',  'Nº máximo de campanhas ao mesmo tempo por pesquisador (ativas ou aguardando aprovação)', TRUE, TRUE),
(NULL, 'limite_endossos_campanha',   '4',     'inteiro',  'Nº máximo de endossos ativos ao mesmo tempo por campanha', TRUE, TRUE),
(NULL, 'limite_denuncias_24h',       '5',     'inteiro',  'Nº máximo de denúncias que um usuário pode fazer dentro da janela de tempo das denúncias', TRUE, TRUE),
-- Janela de tempo do limite de denúncias (RF-076), lida por validar_denuncia_frequencia() em 05, [05-K-3].
(NULL, 'janela_denuncias_horas',     '24',    'inteiro',  'Janela de tempo das denúncias, em horas (usada pelo limite de denúncias por usuário)', TRUE, TRUE),
-- `comentario` tem limite de frequência como denúncia (par acima), no mesmo padrão de 2 chaves (contagem +
-- janela) de limite_denuncias_24h/janela_denuncias_horas; 5 comentários por hora é o valor de partida, ajustável
-- sem migração.
(NULL, 'limite_comentarios_por_hora', '5',     'inteiro',  'Nº máximo de comentários que um usuário pode fazer dentro da janela de tempo dos comentários', TRUE, TRUE),
(NULL, 'janela_comentarios_horas',    '1',     'inteiro',  'Janela de tempo dos comentários, em horas (usada pelo limite de comentários por usuário)', TRUE, TRUE),
-- Limite de negócio (menor, configurável) por cima do limite técnico largo das colunas (01): mesmo padrão
-- config + trigger do prazo de campanha.
(NULL, 'limite_caracteres_descricao_campanha',     '5000', 'inteiro', 'Nº máximo de caracteres na descrição da campanha',                        TRUE, TRUE),
(NULL, 'limite_caracteres_conteudo_atualizacao',   '5000', 'inteiro', 'Nº máximo de caracteres no texto de uma atualização de campanha',                  TRUE, TRUE),
(NULL, 'limite_caracteres_relato_denuncia',        '1000', 'inteiro', 'Nº máximo de caracteres nos detalhes adicionais de uma denúncia',       TRUE, TRUE),
(NULL, 'limite_caracteres_justificativa_denuncia', '1000', 'inteiro', 'Nº máximo de caracteres na justificativa da decisão sobre uma denúncia', TRUE, TRUE),
(NULL, 'limite_caracteres_justificativa_encerramento', '2000', 'inteiro', 'Nº máximo de caracteres em cada justificativa do pedido de encerramento antecipado', TRUE, TRUE),
(NULL, 'limite_caracteres_descricao_recompensa',   '2000', 'inteiro', 'Nº máximo de caracteres na descrição de uma recompensa',                            TRUE, TRUE),
(NULL, 'limite_caracteres_comentario',             '500',  'inteiro', 'Nº máximo de caracteres de um comentário (até 500)',                       TRUE, TRUE),
-- Orçamento e cronograma estruturados (01, [01-E]): mudar o mínimo/máximo exigido, ou o limite de texto, é um
-- UPDATE nesta tabela, não uma migração. Ver fn_valida_completude_campanha e
-- fn_valida_limite_max_orcamento_campanha/fn_valida_limite_max_marco_cronograma (05, [05-K-2]). Os valores
-- 10/20 são o TETO (nº máximo por campanha), não o piso para aprovar; os pisos são orcamento_min_itens = 1
-- (RF-039: "valores padrão de 1 (mínimo) e 10 (máximo)") e cronograma_min_marcos = 3 (RF-041).
(NULL, 'orcamento_min_itens',                      '1',    'inteiro', 'Nº mínimo de itens de orçamento exigido para aprovar uma campanha', TRUE, TRUE),
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
(NULL, 'limite_caracteres_descricao_orcamento',    '2000', 'inteiro', 'Nº máximo de caracteres na descrição de um item de orçamento',                    TRUE, TRUE),
(NULL, 'limite_caracteres_descricao_marco',        '2000', 'inteiro', 'Nº máximo de caracteres na descrição de um marco do cronograma',                      TRUE, TRUE),
-- Meta 0.00 seria sucesso instantâneo numa campanha all-or-nothing. Mesmo padrão do prazo: limite técnico
-- largo na constraint (01, > 0), mínimo de negócio de verdade aqui.
(NULL, 'meta_minima_campanha',       '500.00', 'decimal',  'Valor mínimo de meta financeira aceito para uma campanha, em R$',            TRUE, TRUE),
-- F
(NULL, 'limite_links_academicos_perfil', '5', 'inteiro',  'Nº máximo de links acadêmicos por pesquisador', TRUE, TRUE),
-- H
-- valor_minimo_contribuicao (RF-056): mesmo padrão de meta_minima_campanha, acima. R$5,00 não é piso do gateway
-- de pagamento (o PIX em si não impõe mínimo), é política de negócio da própria plataforma, por isso
-- configurável.
(NULL, 'valor_minimo_contribuicao',  '5.00',  'decimal',  'Valor mínimo aceito por contribuição, em R$',                       TRUE, TRUE),
-- Tarifa do provedor de pagamento: quem apoia paga POR CIMA do valor (contribui 100, paga 100 + tarifa). Gravada na
-- contribuição no momento do apoio (fn_contribuicao_define_taxa_pagamento, 05); não entra no arrecadado, no repasse
-- nem na devolução, então a plataforma nunca paga a tarifa do provedor. 0 = sem tarifa.
-- Cartão de crédito: só em campanha flexível (trg_contribuicao_all_or_nothing_pix), à vista, pela página segura do
-- provedor. Pode ser desligado; faixa própria; tarifa percentual + fixa (estimativa: a real é lida do provedor em cada
-- cobrança); e o prazo médio em que o provedor libera o dinheiro (só para mostrar a previsão ao pesquisador).
(NULL, 'cartao_habilitado',                'true',  'booleano', 'Aceitar contribuição com cartão de crédito (só em campanha flexível)', TRUE, TRUE),
(NULL, 'valor_minimo_contribuicao_cartao', '20.00', 'decimal',  'Valor mínimo de uma contribuição com cartão, em R$', TRUE, TRUE),
(NULL, 'valor_maximo_contribuicao_cartao', '500.00','decimal',  'Valor máximo de uma contribuição com cartão, em R$ (limita o prejuízo de uma contestação de compra)', TRUE, TRUE),
(NULL, 'taxa_cartao_percentual',           '1.99',  'decimal',  'Parte percentual da tarifa do provedor no cartão, paga por quem apoia (estimativa; a real vem do provedor)', TRUE, TRUE),
(NULL, 'taxa_cartao_fixa',                 '0.49',  'decimal',  'Parte fixa da tarifa do provedor no cartão, em R$, paga por quem apoia (estimativa; a real vem do provedor)', TRUE, TRUE),
(NULL, 'cartao_dias_liberacao',            '30',    'inteiro',  'Dias, contados do pagamento, até o provedor liberar o dinheiro do cartão (previsão mostrada ao pesquisador)', TRUE, FALSE),
(NULL, 'taxa_pagamento_pix',         '1.99',  'decimal',  'Tarifa do provedor por Pix recebido, em R$, paga por quem apoia além do valor da contribuição', TRUE, TRUE),
(NULL, 'boleto_habilitado',          'false', 'booleano', 'Aceitar contribuição com boleto (só em campanha flexível)', TRUE, TRUE),
(NULL, 'taxa_pagamento_boleto',      '1.99',  'decimal',  'Tarifa do provedor por boleto pago, em R$, paga por quem apoia além do valor da contribuição (estimativa; a real vem do provedor)', TRUE, TRUE),
(NULL, 'boleto_vencimento_dias',     '3',     'inteiro',  'Dias, contados da contribuição, até o vencimento do boleto', TRUE, TRUE),
-- Workers de pagamento (23-pagamento no Nest; funções em 05, [05-K-2]): repasse ao pesquisador, devolução do
-- tudo-ou-nada e reconciliação com o provedor.
(NULL, 'repasse_carencia_dias',                  '15',   'inteiro', 'Dias, contados de quando o repasse é criado (o fim da campanha), antes de o dinheiro ir para o pesquisador: janela para estorno, contestação de cartão e devolução por fraude do Pix (MED)', TRUE, FALSE),
(NULL, 'repasse_lease_minutos',                  '10',   'inteiro', 'Minutos que um repasse fica reservado para um worker antes de outro poder tentar',          TRUE, FALSE),
(NULL, 'repasse_max_tentativas',                 '8',    'inteiro', 'Tentativas de transferência de um repasse antes de ele parar em erro (o admin reenfileira)', TRUE, FALSE),
(NULL, 'repasse_backoff_base_minutos',           '15',   'inteiro', 'Espera, em minutos, antes da 2ª tentativa de repasse (dobra a cada falha)',                 TRUE, FALSE),
(NULL, 'repasse_backoff_max_minutos',            '1440', 'inteiro', 'Maior espera, em minutos, entre tentativas de repasse',                                     TRUE, FALSE),
(NULL, 'estorno_prazo_pix_dias',                 '90',   'inteiro', 'Dias, contados do pagamento, em que o provedor ainda aceita devolver um Pix',               TRUE, FALSE),
(NULL, 'estorno_max_tentativas',                 '8',    'inteiro', 'Tentativas de devolução de uma contribuição antes de ir para reembolso manual',             TRUE, FALSE),
(NULL, 'estorno_backoff_base_minutos',           '15',   'inteiro', 'Espera, em minutos, antes da 2ª tentativa de devolução (dobra a cada falha)',              TRUE, FALSE),
(NULL, 'estorno_backoff_max_minutos',            '1440', 'inteiro', 'Maior espera, em minutos, entre tentativas de devolução',                                   TRUE, FALSE),
(NULL, 'reconciliacao_limite_minutos',           '30',   'inteiro', 'Minutos que uma contribuição pendente espera o aviso do provedor antes de ser reconsultada', TRUE, FALSE),
(NULL, 'reconciliacao_intervalo_minutos',        '60',   'inteiro', 'Minutos entre duas reconsultas da mesma contribuição pendente',                             TRUE, FALSE),
(NULL, 'reconciliacao_orfa_minutos',             '60',   'inteiro', 'Minutos até uma contribuição pendente que nunca ganhou cobrança no provedor ser dada como erro', TRUE, FALSE),
(NULL, 'webhook_reprocessar_espera_minutos',     '5',    'inteiro', 'Minutos que um aviso do provedor não aplicado espera antes de a conferência tentar de novo',   TRUE, FALSE),
(NULL, 'webhook_reprocessar_horas',              '24',   'inteiro', 'Horas tentando de novo um aviso do provedor sem correspondência antes de mandá-lo para revisão manual', TRUE, FALSE),
-- Interruptores das tarefas automáticas (nest/src/commons/agendamento/tarefa-automatica.ts): ligadas por padrão;
-- desligar pausa a execução agendada (o "Rodar agora" da T5 continua).
(NULL, 'tarefa_encerrar_campanhas_ligada', 'true', 'booleano', 'Tarefa automática: vencer os Pix pendentes e encerrar as campanhas cujo prazo passou. Desligada, a execução agendada fica em pausa', TRUE, FALSE),
(NULL, 'tarefa_repasse_ligada', 'true', 'booleano', 'Tarefa automática: pedir ao provedor a transferência dos repasses na fila. Desligada, a execução agendada fica em pausa', TRUE, FALSE),
(NULL, 'tarefa_devolucao_ligada', 'true', 'booleano', 'Tarefa automática: devolver as contribuições a devolver. Desligada, a execução agendada fica em pausa', TRUE, FALSE),
(NULL, 'tarefa_conferencia_ligada', 'true', 'booleano', 'Tarefa automática: conferir com o provedor os pagamentos sem aviso e os avisos parados. Desligada, a execução agendada fica em pausa', TRUE, FALSE),
(NULL, 'tarefa_envio_email_ligada', 'true', 'booleano', 'Tarefa automática: enviar os e-mails da fila (verificação de conta, avisos de campanha e de contribuição). Desligada, a execução agendada fica em pausa', TRUE, FALSE),
-- Fila de e-mails (nest/src/4-mail; funções em 05, [05-Q]).
(NULL, 'email_lease_minutos',                    '5',    'inteiro', 'Minutos que um e-mail fica reservado para um worker antes de outro poder tentar',             TRUE, FALSE),
(NULL, 'email_max_tentativas',                   '5',    'inteiro', 'Tentativas de envio de um e-mail antes de ele aparecer como falha no painel',                TRUE, FALSE),
(NULL, 'email_backoff_base_minutos',             '5',    'inteiro', 'Espera, em minutos, antes da 2ª tentativa de envio de um e-mail (dobra a cada falha)',      TRUE, FALSE),
(NULL, 'email_backoff_max_minutos',              '720',  'inteiro', 'Maior espera, em minutos, entre tentativas de envio de um e-mail',                         TRUE, FALSE),
(NULL, 'cancelamento_cobranca_intervalo_minutos','15',   'inteiro', 'Minutos entre tentativas de cancelar no provedor a cobrança de uma contribuição que venceu ou deu erro', TRUE, FALSE),
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
-- sequência, sem interrupção de domínio. Os pesos não estão aqui: vivem em score_config (ver [07-I-1]), a tabela
-- que a tela do score edita e que tem trigger de recálculo.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'score_denuncias_para_zerar',        '3',  'inteiro', 'Nº de denúncias procedentes contra o perfil, ou de campanhas com denúncia procedente, que zeram a parte delas da reputação', TRUE, FALSE),
(NULL, 'score_frequencia_esperada_mensal',  '1',  'decimal', 'Nº de atualizações de campanha esperadas por mês de duração, usado na dimensão Atualização da Campanha', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- [07-I-3] configuracoes: retenção do log de auditoria (ver DOCUMENTACAO_BD.md [05-L])
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'log_auditoria_retencao_dias', '365', 'inteiro', 'Dias que o log de auditoria é guardado antes de ser apagado por job diário (0 = guardar para sempre)', TRUE, FALSE),
-- Lida por limpar_ip_aceite_contribuicao() (05, [05-L]). 1825 dias = 5 anos, prazo do Código de Defesa do Consumidor
-- (art. 27) e o que o Termo de Uso promete (item 5.4): mudar o prazo pede uma versão nova do Termo.
(NULL, 'ip_aceite_contribuicao_retencao_dias', '1825', 'inteiro', 'Dias que o IP do aceite de cada contribuição é guardado antes de ser apagado (0 = guardar para sempre). O prazo está escrito no Termo de Uso: mudar aqui pede uma versão nova do Termo.', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- [07-I-4] configuracoes: cor do tempo de espera nas filas da moderação (coluna "esperando"). Par mínimo/máximo
-- conferido por fn_valida_pares_min_max_configuracoes (05). Públicos: o painel lê para pintar a coluna.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'espera_atencao_dias', '7',  'inteiro', 'Dias de espera (fila de aprovação, denúncias, pedidos de encerramento) até os quais o tempo aparece em verde; acima disso, laranja', TRUE, TRUE),
(NULL, 'espera_critica_dias', '30', 'inteiro', 'Dias de espera acima dos quais o tempo aparece em vermelho', TRUE, TRUE)
ON CONFLICT (chave) DO NOTHING;

-- [07-G] configuracoes: limites de upload de arquivo (ARQUIVO)
-- Limites de tamanho, cota por usuário e ritmo de upload, configuráveis pelo Painel Admin. O limite técnico
-- largo continua no código (TAMANHO_MAXIMO_BYTES_ABSOLUTO, arquivo.constants.ts, valida só a FORMA do DTO); o
-- valor de negócio vem daqui, lido por ConfiguracaoValorService (commons/configuracao) em
-- arquivo.service.start-upload.ts/confirmar-upload.ts.
-- `publica`: os 4 tetos de tamanho/cota são úteis ao navegador para validar/avisar antes de subir um arquivo
-- grande demais (ex.: "máximo 8MB" na tela de upload): PÚBLICA. Os 2 de rate limit (janela/intervalo) são
-- anti-abuso, mesma categoria de limite_tentativas_login/bloqueio_login_minutos: INTERNA, não ajudam ninguém a
-- montar tela, só quem tenta abusar saberia o intervalo exato de espera.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'arquivo_tamanho_minimo_bytes',          '100',      'inteiro', 'Tamanho mínimo aceito por arquivo enviado, em bytes - barra arquivo vazio/corrompido', TRUE, TRUE),
(NULL, 'arquivo_tamanho_maximo_imagem_bytes',   '8388608',  'inteiro', 'Tamanho máximo aceito por imagem enviada (JPEG/PNG/WebP), em bytes', TRUE, TRUE),
(NULL, 'arquivo_tamanho_maximo_documento_bytes','5242880',  'inteiro', 'Tamanho máximo aceito por documento enviado (PDF), em bytes', TRUE, TRUE),
(NULL, 'arquivo_cota_bytes_por_usuario',        '52428800', 'inteiro', 'Cota total de armazenamento ativo por usuário, em bytes', TRUE, TRUE),
(NULL, 'arquivo_limite_uploads_janela',         '20',       'inteiro', 'Nº máximo de uploads confirmados por usuário dentro da janela de tempo dos uploads', TRUE, FALSE),
(NULL, 'arquivo_janela_limite_uploads_minutos', '1440',     'inteiro', 'Janela de tempo dos uploads, em minutos (1440 = 24 horas)', TRUE, FALSE),
(NULL, 'arquivo_intervalo_minimo_segundos',     '5',        'inteiro', 'Intervalo mínimo (em segundos) entre um upload confirmado e o próximo início de upload do mesmo usuário', TRUE, FALSE)
ON CONFLICT (chave) DO NOTHING;

-- ============================================================================
-- [07-DEMONSTRACAO] DAQUI PARA BAIXO: SÓ DESENVOLVIMENTO E AULA
-- Contas de teste (senha DevTcc123!), campanhas, contribuições e as ferramentas de teste. Num banco de produção,
-- rode este arquivo só até a linha acima deste bloco.
-- ============================================================================

-- O envio de e-mail nasce DESLIGADO no banco de demonstração (no de produção, ligado, [07-C]): o e-mail espera na
-- fila até alguém conferir e clicar em Rodar agora na T6, sem sair sozinho nem gastar a cota do provedor nos testes.
UPDATE configuracoes SET valor = 'false' WHERE chave = 'tarefa_envio_email_ligada' AND id_usuario IS NULL;


-- Permissões das ferramentas de teste do painel. trg_permissao_auto_admin (05) dá cada uma ao admin assim que a
-- linha nasce; um banco de produção não roda esta parte, então nasce sem elas.
--   perfil_pesquisador_criar_para_outro: criar_perfil_pesquisador_para_outro() (03, [03-R]), Bancada do Pesquisador.
--   campanha_criar_para_outro e campanha_excluir_forcado: criar campanha em nome de outro pesquisador e excluir
--   campanha à força, ignorando status (limpeza de dado de teste; nunca oferecida no painel real).
INSERT INTO permissao (nome) VALUES
('perfil_pesquisador_criar_para_outro'),
('campanha_criar_para_outro'),
('campanha_excluir_forcado')
ON CONFLICT (nome) DO NOTHING;

-- [07-B-4] DESENVOLVIMENTO: toda conta logada VÊ tudo (nunca altera). O papel 'usuario', que todo cadastro
-- recebe, ganha só as permissões de LEITURA, para qualquer papel conseguir testar todas as telas. As de alterar
-- (gerenciar, editar, aprovar, suspender...) continuam só com quem já tinha. REMOVER antes do deploy (entra no
-- bloco "modo produção", ver PENDENCIAS e correcoes.md).
INSERT INTO papel_permissao (id_papel, id_permissao)
SELECT p.id_papel, perm.id_permissao
FROM papel p
JOIN permissao perm ON TRUE
WHERE p.codigo = 'usuario'
  AND perm.nome IN (
    'relatorio_visualizar',
    'usuario_visualizar_sensivel',
    'perfil_pesquisador_visualizar_sensivel',
    'contribuicao_visualizar_sensivel',
    'auditoria_financeira_visualizar',
    'score_visualizar',
    'log_visualizar'
  )
ON CONFLICT DO NOTHING;

-- [07-C-4] arquivo: vazio. O seed não tem imagens nem documentos no armazenamento, e uma linha aqui apontaria
-- para um arquivo que não existe (foto "cadastrada" sem imagem, anexo que não abre). Ninguém nasce com foto de
-- perfil e nenhuma atualização nasce com anexo; arquivo só entra pelo envio de verdade.

-- [07-D-1] usuario
-- senha_hash: hash bcrypt de verdade (custo 10, igual CUSTO_BCRYPT_SENHA em usuario.constants.ts), o MESMO para
-- TODOS, só para dev/seed, nunca em produção:
--   senha de todo mundo no seed = DevTcc123!
-- Gerado com `bcrypt.hash('DevTcc123!', 10)` e conferido com `bcrypt.compare()`. Serve para logar como qualquer
-- papel só trocando o e-mail (ver a lista de e-mail/papel logo abaixo, em usuario_papel).
--
-- Quem é quem (os IDs numéricos dos blocos abaixo assumem esta ordem de inserção):
--   1 a 7    contas "Sistema", uma por papel (Admin Sistema 2 é o admin de reserva: só outro admin desfaz a
--            besteira de um admin), para os testes rápidos e o "Entrar como" de desenvolvimento (dev-login-rapido).
--   8 a 17   pesquisadores da demonstração, cada um com uma história (ver o resumo no fim deste arquivo):
--            8 Ana (Referência), 9 Bruno, 10 Carlos, 11 Renata, 12 Eduardo, 13 Beatriz, 14 Juliana, 15 Patrícia,
--            16 Vinícius e 17 Gabriel (os dois na faixa Atenção).
--   18 a 20  quem apoia as campanhas (Fernanda, Tiago, Helena).
--   21 a 23  contas comuns zeradas, sem nenhuma dependência e com o e-mail ainda não verificado: sobram sempre duas
--            para testar "2ª conta tentando o mesmo CPF" (22 e 23); a 21 (Marina) também fica com o aceite do termo
--            da conta pendente, para demonstrar a tela de aceite.
-- Ninguém nasce suspenso: suspender é uma ação do painel, demonstrada ao vivo.
INSERT INTO usuario (nome, email, senha_hash, id_imagem_perfil, criado_em) VALUES
('Admin Sistema',            'admin@crowdacademico.com.br',           '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:00'),
('Admin Sistema 2',          'admin2@crowdacademico.com.br',          '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:01'),
('Moderador Sistema',        'moderador@crowdacademico.com.br',       '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:02'),
('Revisor Sistema',          'revisor@crowdacademico.com.br',         '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:03'),
('Suporte Sistema',          'suporte.sistema@crowdacademico.com.br', '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:04'),
('Curador Sistema',          'curador@crowdacademico.com.br',         '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:05'),
('Pesquisador Sistema',      'pesquisador@crowdacademico.com.br',     '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-01-01 00:00:06'),

('Ana Beatriz Santos',       'ana.santos@usp.br',                     '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-01-10 09:00:00'),
('Bruno Tavares Costa',      'bruno.tavares@ufrgs.br',                '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-01-20 09:00:00'),
('Carlos Eduardo Melo',      'carlos.melo@unicamp.br',                '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-02-03 10:30:00'),
('Renata Vasconcelos Dias',  'renata.vasconcelos@ufpr.br',            '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-02-14 09:00:00'),
('Eduardo Barbosa Nogueira', 'eduardo.barbosa@ufba.br',               '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-02-25 09:00:00'),
('Beatriz Lima Alves',       'beatriz.lima@ufmg.br',                  '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-03-05 08:45:00'),
('Juliana Ferreira Paz',     'juliana.ferreira@ufsc.br',              '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-03-18 11:20:00'),
('Patrícia Rocha Silva',     'patricia.rocha@unifesp.br',             '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-04-02 09:30:00'),
('Vinícius Almeida Ferraz',  'vinicius.ferraz@gmail.com',             '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-04-20 09:00:00'),
('Gabriel Souza Martins',    'gabriel.martins@gmail.com',             '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-05-08 10:00:00'),

('Fernanda Souza Lima',      'fernanda.souza@gmail.com',              '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-01-15 10:00:00'),
('Tiago Ramos Pereira',      'tiago.ramos@gmail.com',                 '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-02-01 14:00:00'),
('Helena Duarte Campos',     'helena.campos@outlook.com',             '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-02-20 19:30:00'),

('Marina Alves Torres',      'marina.torres@gmail.com',               '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-06-10 10:00:00'),
('Rafael Costa Andrade',     'rafael.costa.andrade@gmail.com',        '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-06-10 10:00:01'),
('Larissa Mendes Cunha',     'larissa.mendes@gmail.com',              '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2025-06-10 10:00:02');

-- [07-D-2] usuario_papel
-- id_usuario é fixo (a tabela usuario está vazia antes deste seed, então os IDs abaixo batem com a ordem de
-- inserção acima, ver [07-D-1]). id_papel é resolvido por nome, pelo mesmo motivo do bloco [07-B-3]. O papel
-- 'pesquisador' de 8 a 17 vem do próprio perfil (trg_perfil_atribui_papel_pesquisador, 05), como no upgrade real.
INSERT INTO usuario_papel (id_usuario, id_papel)
SELECT v.id_usuario, p.id_papel
FROM (VALUES
    (1, 'admin'),        -- Admin Sistema
    (2, 'admin'),        -- Admin Sistema 2
    (3, 'moderador'),    -- Moderador Sistema
    (4, 'revisor'),      -- Revisor Sistema
    (5, 'suporte'),      -- Suporte Sistema
    (6, 'curador'),      -- Curador Sistema
    (7, 'pesquisador')   -- Pesquisador Sistema
) AS v(id_usuario, papel_nome)
JOIN papel p ON p.nome = v.papel_nome
ON CONFLICT DO NOTHING;

-- Toda conta tem também o papel 'usuario', como no cadastro real (atribuir_papel_padrao, 08): as contas deste
-- seed são inseridas direto, sem passar pelo cadastro. O papel 'usuario' não tem nenhuma permissão de alterar.
INSERT INTO usuario_papel (id_usuario, id_papel)
SELECT u.id_usuario, p.id_papel
FROM usuario u
JOIN papel p ON p.codigo = 'usuario'
ON CONFLICT DO NOTHING;

-- [07-D-6] termos_de_uso (versões antigas) / usuario_termo
-- As versões vigentes (id 3 e 4) estão na parte de referência deste arquivo; aqui entram as antigas, já
-- desativadas (id 1 e 2), que os usuários deste seed aceitaram quando se cadastraram ou fizeram o upgrade (o
-- histórico de aceites aponta para elas pela data). Os rascunhos da próxima versão (id 5 e 6) entram depois de
-- todos os aceites ([07-H-3]).
INSERT INTO termos_de_uso (id_termo, tipo, versao, conteudo, ativo, criado_em) VALUES
(1, 'cadastro', 'v1-2024-01-01', 'TERMOS DE USO E POLÍTICA DE PRIVACIDADE - CROWDACADÊMICO

Estes Termos valem para a conta e para todas as contribuições feitas na plataforma. O aceite é registrado no cadastro e novamente a cada contribuição, com a versão vigente naquele momento.

1. OBJETO
O CrowdAcadêmico é uma plataforma de financiamento coletivo (crowdfunding) dedicada exclusivamente a projetos de pesquisa científica e tecnológica brasileira. Estes Termos regem o uso da plataforma por pesquisadores, apoiadores e demais usuários, cadastrados ou não.

2. CADASTRO E CONTA
O cadastro exige informações verdadeiras, completas e atualizadas. Cada pessoa pode manter apenas uma conta ativa. O usuário é responsável por manter a confidencialidade de sua senha e por toda atividade realizada em sua conta.

3. PERFIL DE PESQUISADOR
Para submeter e gerenciar campanhas, o usuário deve solicitar o upgrade para perfil de pesquisador, que tem termo próprio, aceito no momento do upgrade.

4. CAMPANHAS
Toda campanha passa por aprovação administrativa antes de ficar visível ao público. O CrowdAcadêmico não garante o sucesso de nenhuma campanha nem se responsabiliza pelo uso dos recursos arrecadados após o repasse ao pesquisador responsável.

5. CONTRIBUIÇÕES
5.1. Natureza. A contribuição é voluntária e destinada ao financiamento do projeto de pesquisa descrito na campanha. O CrowdAcadêmico atua como intermediário entre apoiador e pesquisador, não é parte na relação de pesquisa e não garante os resultados científicos do projeto apoiado.
5.2. Modelo de arrecadação e repasse. Conforme o modelo da campanha, informado na própria página antes da contribuição, o valor é repassado ao pesquisador somente se a meta for atingida (tudo ou nada) ou pode ser repassado mesmo sem atingi-la (flexível).
5.3. Reembolso. A contribuição é devolvida nos casos previstos nas regras da plataforma, como a campanha tudo ou nada que não atinge a meta ou a campanha encerrada por moderação antes do repasse. Fora desses casos, a contribuição é definitiva a partir da confirmação do pagamento.
5.4. Aceite por contribuição. A cada contribuição, o apoiador confirma estes Termos e as regras do modelo da campanha. A plataforma registra a data, a hora, a versão destes Termos vigente naquele momento e o identificador da transação, para fins de auditoria e de defesa em eventual contestação do pagamento. A versão registrada é a que se aplica àquela contribuição, mesmo que uma versão nova seja publicada depois.
5.5. Dados de pagamento. Os dados de pagamento são processados pelo meio de pagamento escolhido (Pix, cartão ou boleto). A plataforma guarda o registro da contribuição e do aceite pelo prazo exigido em lei, mesmo que a conta seja encerrada.

6. PROPRIEDADE INTELECTUAL
O conteúdo publicado por pesquisadores (descrição de projeto, atualizações, materiais anexados) permanece de titularidade do autor. Ao publicar, o pesquisador concede ao CrowdAcadêmico licença não exclusiva para exibição pública do conteúdo na plataforma, pelo tempo em que a campanha ou o perfil permanecerem ativos.

7. PROTEÇÃO DE DADOS PESSOAIS (LGPD)
O tratamento de dados pessoais nesta plataforma segue a Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018). Coletamos apenas os dados necessários para cadastro, validação de identidade, processamento de contribuições e cumprimento de obrigações legais. O titular dos dados tem direito a: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; e revogação do consentimento, a qualquer momento, mediante solicitação pelos canais oficiais da plataforma. Dados sensíveis, como CPF, são armazenados de forma protegida e nunca exibidos publicamente em sua forma completa.

8. MODERAÇÃO E DENÚNCIAS
A equipe administrativa pode suspender ou encerrar campanhas, perfis ou contas que violem estes Termos, mediante denúncia fundamentada ou verificação própria, assegurado o direito de manifestação do usuário afetado.

9. ENCERRAMENTO DE CONTA
O usuário pode solicitar o encerramento de sua conta a qualquer momento. Dados vinculados a obrigações legais ou financeiras, como o histórico de contribuições, podem ser mantidos pelo prazo exigido pela legislação aplicável, mesmo após o encerramento.

10. ALTERAÇÕES DESTES TERMOS
Estes Termos podem ser atualizados periodicamente. A versão vigente é sempre a mais recente publicada, e o usuário é notificado para revisar e aceitar o texto atualizado.

11. FORO
Fica eleito o foro da comarca do domicílio do usuário para dirimir eventuais controvérsias, conforme o Código de Defesa do Consumidor, quando aplicável.', FALSE, '2024-01-01 00:00:00'),
(2, 'upgrade_pesquisador', 'v1-2024-01-01', 'TERMOS DE UPGRADE DE PERFIL DE PESQUISADOR - CROWDACADÊMICO

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
Este termo pode ser atualizado periodicamente; a versão vigente no momento da solicitação do upgrade é a que se aplica.', FALSE, '2024-01-01 00:00:00');

-- Cada usuário aceitou, no próprio cadastro (aceito_em = pouco depois de usuario.criado_em), a versão do termo
-- da conta vigente naquele momento.
INSERT INTO usuario_termo (id_usuario, id_termo, aceito_em, ip_aceite)
SELECT u.id_usuario,
       (SELECT t.id_termo FROM termos_de_uso t
        WHERE t.tipo = 'cadastro' AND t.criado_em <= u.criado_em + INTERVAL '2 minutes'
        ORDER BY t.criado_em DESC LIMIT 1),
       u.criado_em + INTERVAL '2 minutes', '187.10.20.30'
FROM usuario u;

-- RF-015: quando a versão vigente entrou, cada conta aceitou de novo no acesso seguinte (um dia depois), menos a
-- conta 21 (Marina Torres), que fica com o aceite PENDENTE de propósito para demonstrar a tela de aceite.
INSERT INTO usuario_termo (id_usuario, id_termo, aceito_em, ip_aceite)
SELECT u.id_usuario, t.id_termo, LEAST(t.criado_em + INTERVAL '1 day', NOW()), '187.10.20.30'
FROM usuario u
JOIN termos_de_uso t ON t.tipo = 'cadastro' AND t.ativo
WHERE u.id_usuario <> 21
ON CONFLICT (id_usuario, id_termo) DO NOTHING;

-- Parâmetro de uma conta específica (o admin da demonstração): só existe porque a conta existe.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(1,   'notificar_novas_campanhas',   'true',  'booleano', 'Admin recebe e-mail sobre novas campanhas',            TRUE, FALSE);

-- Campo de Testes (só desenvolvimento): pagamento automático do provedor de teste, desligado por padrão. Ligado, a
-- cada minuto o provedor de teste paga as cobranças pendentes (nest/src/30-campo-testes, CHAVE_PAGAMENTO_AUTOMATICO).
-- E até onde a Caixa de E-mails (T6) foi limpa: ela lista os e-mails do banco, e só o "Limpar a caixa" tira alguém dela.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo, publica) VALUES
(NULL, 'teste_pagamento_automatico_ligado', 'false', 'booleano', 'Campo de Testes: o provedor de teste paga sozinho, a cada minuto, as contribuições pendentes (só no modo rápido)', TRUE, FALSE),
(NULL, 'teste_caixa_email_limpa_ate_id', '0', 'inteiro', 'Campo de Testes: a Caixa de E-mails (T6) mostra só os e-mails com número acima deste; o Limpar a caixa grava o maior número de agora', TRUE, FALSE);

-- [07-D-3] perfil_pesquisador
-- score_atual e score_atualizado_em não estão no INSERT de propósito: a tabela tem trg_perfil_recalcula_score
-- (AFTER INSERT), e o score de cada um é 100% produto dos dados reais dos blocos abaixo (link_academico, campanha,
-- atualizacao_campanha, denuncia).
-- cpf_criptografado: CPFs FALSOS de verdade (dígito verificador válido, nenhum de dígito repetido), cifrados com
-- commons/seguranca/cpf-cifra.util.ts (AES-256-GCM, formato "v1:iv:tag:ciphertext") usando as chaves
-- CPF_ENCRYPTION_KEY/CPF_INDEX_KEY do .env de desenvolvimento (ver DOCUMENTACAO_BD.md); cpf_hash é o índice cego
-- correspondente (HMAC-SHA256). A chave Pix (chave_pix_criptografada) é cifrada do mesmo jeito
-- (chave-pix-cifra.util.ts) e também é fictícia. Se CPF_ENCRYPTION_KEY/CPF_INDEX_KEY forem trocadas, estas linhas
-- passam a ser indecifráveis: para um banco de dev/seed, basta rodar o seed de novo com uma chave nova.
-- chave_pix_verificada_em: a titularidade foi confirmada logo depois do cadastro da chave. A Renata (11) e o
-- Gabriel (17) não cadastraram chave: o repasse da Renata espera na fila ("aguardando conta").
INSERT INTO perfil_pesquisador (id_usuario, cpf_criptografado, cpf_hash, tipo_vinculo, vinculo_institucional, titulo_academico, status_pesquisador, ativado_em, tipo_chave_pix, chave_pix_criptografada, chave_pix_verificada_em) VALUES
(7,  'v1:uUtOS/UIKkMBczzR:wKf1XU/T4DU7wxlBRIN9XA==:EdujkWtk43mcH08=', 'e44f434dd801bdcb2846daafc2646d428b8b8fe6ef64b37513c8c25ec219b639', 'institucional', 'CrowdAcadêmico (conta de teste)',                   'doutor',   'ativo', '2024-01-01 00:10:00', NULL, NULL, NULL),
(8,  'v1:mWTFzqRm8FMW14/u:iMiDqsRSTJ4KUyzcmKP18w==:bR7wgOpNkI+vSJ4=', '1610ee8b3555955f9e79eba6efa88324a4c30ced46b4bee5e6f2b6b3ed605797', 'institucional', 'Universidade de São Paulo (USP)',                   'doutor',   'ativo', '2025-01-10 09:05:00', 'email',     'v1:DIg7v8LA7dyr+Hqc:/t3SmH58SpMInR0yfJkHNw==:pHcryKbuuai0kI/pNqU1pOw=', '2025-01-12 10:00:00'),
(9,  'v1:LEFw0QnUeHqL2X91:6kAh7osqA4mnvClzmJIEpA==:YdQlSK3Dr/mdlFw=', 'a36805b35ddfe2257718bedd4035fd49afa11d5e3602285131419df0827d49f1', 'institucional', 'Universidade Federal do Rio Grande do Sul (UFRGS)', 'doutor',   'ativo', '2025-01-20 09:10:00', 'aleatoria', 'v1:EfKf5Hclz5tm/h+T:KJmGoeQeWZSNRaipD4HNUA==:KVxgWW8ltrfAJpbXZALbopeudEZSFV2yqIM0w9LTrmCP9PwI', '2025-01-22 10:00:00'),
(10, 'v1:biXIzmT/+Z0OVzgl:y8lT16d44wlXzCKzGAsK9A==:HxBEvdcXcZk8bHY=', 'b3b4544a4ec41edae5514228ab14306250a0fce3bc3f149f8a0ed92be2536dd8', 'institucional', 'Universidade Estadual de Campinas (UNICAMP)',       'mestre',   'ativo', '2025-02-03 10:40:00', 'telefone',  'v1:I+ZcnKpeMi97idPx:NfCZ9KymQMW8UvQMGQu2mA==:8XC0qKatn99KCCOfdXo=', '2025-02-05 10:00:00'),
(11, 'v1:N0tFgAz4WUtH/Zmi:9c3av62cgJj7CVWQsTTN/Q==:1jWfrfd+IZW7NZI=', '0d491a6df2cd5e6e9fe25c47630ff59d88a6e0a6a3d85f61badb2723a22ff19c', 'institucional', 'Universidade Federal do Paraná (UFPR)',             'mestre',   'ativo', '2025-02-14 09:10:00', NULL, NULL, NULL),
(12, 'v1:Irign/aW5mMCv4Ug:EQxzkR0lXxnJhmu8xAEhcw==:2lmUgJVYjExvdAM=', 'b5944441f2b1f45294195783812f36bc72c9bf38d2ef3d8a231c1a8d8f538ec5', 'institucional', 'Universidade Federal da Bahia (UFBA)',              'mestre',   'ativo', '2025-02-25 09:10:00', 'email',     'v1:KqxuwtOm724qtOI7:LxuKQ2zTrdCHnZIRCVTZSA==:KVYEoHKuZvIt/Y3uC+Fx7b6M9Q1khBQ=', '2025-03-01 10:00:00'),
(13, 'v1:/qWUrRI/9fzjm9Kh:uU6qNuQlvvFjghnTLVr8Og==:N5DdmozsScRBV8A=', '93d76c0ae76d371c84ead92cdc597742cd149067fe7f234552e10abe75ee5e7f', 'institucional', 'Universidade Federal de Minas Gerais (UFMG)',       'doutor',   'ativo', '2025-03-05 09:00:00', 'aleatoria', 'v1:TdqU/vNUZWF3B/+j:13UEjgEEINz8P7Q8u+d+YA==:/gDJVLCsBlqUtMvDYXOlfrf1f0ADW7RUBKKQvmCayaTlrLiR', '2025-03-08 10:00:00'),
(14, 'v1:gRfGHqP2CaS1KfN8:/Ndt5pdWu6A/ZxDBptQipQ==:XXTsLYETudrxeik=', '74fc41e2f0ea9e284b8c1d2379fcc4388988d1b4a18f53c88a626d91b5d4cbc6', 'institucional', 'Universidade Federal de Santa Catarina (UFSC)',     'mestre',   'ativo', '2025-03-18 11:30:00', 'email',     'v1:BktVyX2lb13+pXgw:HAs2NfQY/xfhwkfL0/ew3g==:KkqcgrQXrBTRVaZBeeJCH7C8m17wRUqS', '2025-03-20 10:00:00'),
(15, 'v1:gH+4XLY9grNC1AAN:f0QkyT8OuWRTKwwbyHhtKQ==:/dE9nq3r7rYxs3k=', '3f022d05c183ecfb64cbb6ac2500e66ad731e684f1c9afd5e2cb801d5576d376', 'institucional', 'Universidade Federal de São Paulo (UNIFESP)',       'doutor',   'ativo', '2025-04-02 09:40:00', 'email',     'v1:UD+7wVPGzE/66K9j:i0IbQ4LVWvBT6wjsi1KUOw==:bIv+5CJ+YHLcwyezRmobW+Y1dadW8TCQ6Q==', '2025-04-05 10:00:00'),
(16, 'v1:m7z9uq+435l0syBo:wVQB6djPxdi38eWcfpnUAQ==:45Hee0oUAA3IDek=', '469f49af437e577be058f668669a27ec903aa9ddc42895750ef3e1d45f05c380', 'independente',  NULL,                                                'graduado', 'ativo', '2025-04-20 09:10:00', 'aleatoria', 'v1:osAv1z/OK2WZ8RU3:vJDeX+k0L2kD5Q+T4CijEA==:dAVI1j17QB+ioBwcDzGp53tIsEZ6cX8H8FdqhOfJ+69WbX3s', '2025-04-22 10:00:00'),
(17, 'v1:C1Zn4ew8FWLXPe4S:wcLOpqSIBgvH2Genmxlgsw==:RGXCLYPxkIwNTWM=', 'b9569cd5536268347eacea693dc45a92962d3084beca606e73fead8c3723d8fa', 'independente',  NULL,                                                'graduado', 'ativo', NOW() - INTERVAL '40 days', NULL, NULL, NULL);

-- Estes pesquisadores já nascem com perfil pronto acima, então aceitaram o Termo de Upgrade de Pesquisador na
-- data em que o próprio perfil foi ativado (ativado_em), na versão vigente naquela data.
INSERT INTO usuario_termo (id_usuario, id_termo, aceito_em, ip_aceite)
SELECT
    pp.id_usuario,
    (SELECT t.id_termo FROM termos_de_uso t
     WHERE t.tipo = 'upgrade_pesquisador' AND t.criado_em <= pp.ativado_em
     ORDER BY t.criado_em DESC LIMIT 1),
    pp.ativado_em,
    '187.10.20.30'
FROM perfil_pesquisador pp;

-- RF-015 vale também para o termo de pesquisador: quando a versão vigente entrou, cada pesquisador aceitou de novo
-- no acesso seguinte, menos o Vinícius (16), que fica com o aceite PENDENTE de propósito para demonstrar a tela.
INSERT INTO usuario_termo (id_usuario, id_termo, aceito_em, ip_aceite)
SELECT pp.id_usuario, t.id_termo, LEAST(t.criado_em + INTERVAL '1 day', NOW()), '187.10.20.30'
FROM perfil_pesquisador pp
JOIN termos_de_uso t ON t.tipo = 'upgrade_pesquisador' AND t.ativo
WHERE pp.id_usuario <> 16
ON CONFLICT (id_usuario, id_termo) DO NOTHING;

-- [07-D-8] verificacao_email: toda conta confirmou o e-mail logo depois do cadastro, pelo mesmo caminho do
-- sistema (um token em verificacao_email, depois email_verificado = TRUE). Exceção de propósito: as 3 contas
-- comuns zeradas (21, 22 e 23) seguem com o e-mail não verificado, para testar esse estado. O token é só um hash
-- de preenchimento: já nasce confirmado, nunca é usado. A validade vem de verificacao_email_horas_validade.
INSERT INTO verificacao_email (id_usuario, token_hash, criado_em, expira_em, confirmado_em)
SELECT u.id_usuario,
       encode(sha256(convert_to('seed-verificacao-' || u.id_usuario, 'UTF8')), 'hex'),
       u.criado_em + INTERVAL '1 minute',
       u.criado_em + INTERVAL '1 minute'
         + (SELECT valor::INT FROM configuracoes WHERE chave = 'verificacao_email_horas_validade' AND id_usuario IS NULL) * INTERVAL '1 hour',
       u.criado_em + INTERVAL '10 minutes'
FROM usuario u
WHERE u.id_usuario NOT IN (21, 22, 23);

UPDATE usuario u SET email_verificado = TRUE
WHERE EXISTS (SELECT 1 FROM verificacao_email v WHERE v.id_usuario = u.id_usuario AND v.confirmado_em IS NOT NULL);

-- [07-F-1] link_academico
-- A Ana (8) tem os 3 tipos de link que a fórmula do score soma (calcular_score_perfil_academico, 05): Lattes, ORCID
-- e um "outro link" (qualquer tipo_link que não seja Lattes/ORCID). Os outros têm um ou dois, ou nenhum. id_tipolink
-- é resolvido por tipo_link.codigo (chave natural), não pelo id posicional.
INSERT INTO link_academico (id_usuario, id_tipolink, ordem, url)
SELECT v.id_usuario, tl.id_tipolink, v.ordem, v.url
FROM (VALUES
    (8,  'LATTES',       1, 'http://lattes.cnpq.br/1234567890123456'),
    (8,  'ORCID',        2, 'https://orcid.org/0000-0001-2345-6789'),
    (8,  'RESEARCHGATE', 3, 'https://www.researchgate.net/profile/Ana-Beatriz-Santos'),
    (9,  'LATTES',       1, 'http://lattes.cnpq.br/1122334455667788'),
    (10, 'RESEARCHGATE', 1, 'https://www.researchgate.net/profile/Carlos-Eduardo-Melo'),
    (13, 'LATTES',       1, 'http://lattes.cnpq.br/1111222233334444'),
    (13, 'ORCID',        2, 'https://orcid.org/0000-0002-9876-5432'),
    (14, 'RESEARCHGATE', 1, 'https://www.researchgate.net/profile/Juliana-Ferreira-Paz')
) AS v(id_usuario, tipolink_codigo, ordem, url)
JOIN tipo_link tl ON tl.codigo = v.tipolink_codigo;

-- [07-E-1] campanha
-- Uma campanha para cada situação do sistema, com datas relativas ao dia em que o banco é montado (a demonstração
-- nunca envelhece). As que já terminaram nascem 'ativo' com o prazo no passado e são fechadas mais abaixo pelas
-- próprias rotinas do sistema ([07-H-5]): é o fechamento de verdade que cria o repasse ou manda devolver.
--    1 Ana       tudo-ou-nada  sucesso, repasse concluído
--    2 Ana       flexível      sucesso com cartão; um cartão pago no fim gera um repasse adicional
--    3 Ana       flexível      ativa: Pix, cartão a liberar, boleto, Pix aguardando pagamento, vencido, órfão, estornado
--    4 Bruno     tudo-ou-nada  sucesso, rejeitada uma vez antes de ser aprovada
--    5 Bruno     tudo-ou-nada  não atingida: cada devolução numa situação
--    6 Carlos    flexível      não atingida, fica com o que arrecadou; a transferência falhou (repasse em erro)
--    7 Carlos    tudo-ou-nada  ativa, já bateu a meta e pediu para encerrar antes do prazo (há 1 dia)
--    8 Renata    tudo-ou-nada  sucesso; o repasse espera ela cadastrar a chave Pix
--    9 Eduardo   flexível      encerrada antes do prazo com o pedido aprovado; transferência em andamento
--   10 Beatriz   flexível      ativa, pedido de encerramento esperando há 40 dias, denúncia pendente
--   11 Beatriz   flexível      ativa, um pedido rejeitado e outro esperando há 15 dias
--   12 Juliana   tudo-ou-nada  "Em breve" (RF-059): aprovada, começa daqui a 7 dias
--   13 Juliana   tudo-ou-nada  rascunho
--   14 Patrícia  tudo-ou-nada  rejeitada há 5 dias, com reenvio disponível
--   15 Patrícia  tudo-ou-nada  projeto cancelado pela pesquisadora: todo o dinheiro voltou
--   16 Vinícius  flexível      encerrada por moderação depois de denúncias procedentes
--   17 Gabriel   tudo-ou-nada  na fila há 15 dias; dono na faixa Atenção ("Score baixo")
--   18 Renata    tudo-ou-nada  na fila, reenviada depois de uma rejeição (há 2 dias)
--   19 Vinícius  tudo-ou-nada  na fila há 40 dias; dono na faixa Atenção
--   20 Bruno     tudo-ou-nada  na fila há 3 dias, com 2 marcos: o checklist "Pronta para aprovar?" mostra o que falta
--                              (no uso real o envio barra isso; só aconteceria se os parâmetros mudassem depois)
--   21 Pesquisador Sistema     ativa e sem comentário, para testar comentário e endosso pelo login rápido (não é da
--                              demonstração: a faceta Origem do Campo de Testes a mostra como "teste")
-- A fila de aprovação mostra as três cores da espera (até 7 dias, até 30, acima: espera_atencao_dias e
-- espera_critica_dias), e Pedidos de Encerramento também (1, 15 e 40 dias). Quem aprova e rejeita é o Curador
-- Sistema (6). A duração de toda campanha fica entre prazo_minimo_campanha_dias e prazo_maximo_campanha_dias.
-- seed_campanha é uma tabela temporária (some no fim da sessão) que também gera o orçamento e o cronograma abaixo.
CREATE TEMP TABLE seed_campanha (
    n INT PRIMARY KEY, dono INT, aprovador INT, area TEXT, titulo TEXT, modelo modelo_campanha, meta DECIMAL(10,2),
    descricao TEXT, inicio INT, fim INT, status status_campanha, aprovada INT, criada INT, enviada INT
);
INSERT INTO seed_campanha VALUES
    -- n, dono, aprovador, área CNPq, título, modelo, meta, descrição, início, fim, status, aprovada, criada, enviada (dias a partir de hoje)
    (1,  8,  6,    '1.03.00.00', 'Desenvolvimento de Algoritmo para Diagnóstico Precoce de Alzheimer por IA', 'all-or-nothing', 12000.00, 'Pesquisa aplicada em inteligência artificial para detecção precoce da doença de Alzheimer usando redes neurais convolucionais.', -230, -185, 'ativo', -232, -240, -236),
    (2,  8,  6,    '1.03.00.00', 'Assistente de Leitura para Pessoas com Dislexia Baseado em IA', 'flexivel', 8000.00, 'Ferramenta de apoio à leitura que adapta fonte, espaçamento e ritmo do texto conforme o perfil de leitura de pessoas com dislexia.', -140, -100, 'ativo', -142, -150, -146),
    (3,  8,  6,    '1.03.00.00', 'Detecção de Retinopatia Diabética em Fotos de Celular', 'flexivel', 15000.00, 'Modelo de visão computacional para triagem de retinopatia diabética a partir de fotos de fundo de olho tiradas com celular em unidades básicas de saúde.', -20, 25, 'ativo', -22, -30, -26),
    (4,  9,  6,    '2.12.00.00', 'Bioprospecção de Fungos da Caatinga com Potencial Antibiótico', 'all-or-nothing', 20000.00, 'Coleta e análise de fungos endofíticos da Caatinga para identificação de compostos com atividade antibacteriana frente a superbactérias.', -150, -105, 'ativo', -152, -165, -154),
    (5,  9,  6,    '4.06.00.00', 'Estudo Epidemiológico do Impacto da Dengue na Baixada Fluminense', 'all-or-nothing', 25000.00, 'Levantamento epidemiológico detalhado dos casos de dengue em municípios da Baixada Fluminense durante o surto mais recente.', -55, -10, 'ativo', -57, -65, -61),
    (6,  10, 6,    '3.13.00.00', 'Prótese de Baixo Custo com Impressão 3D para Amputados do SUS', 'flexivel', 28000.00, 'Projeto de engenharia biomédica para fabricação de próteses funcionais de membros superiores a custo acessível para o sistema público.', -80, -35, 'ativo', -82, -90, -86),
    (7,  10, 6,    '3.13.00.00', 'Cadeira de Rodas Motorizada de Baixo Custo com Peças Recicladas', 'all-or-nothing', 5000.00, 'Projeto de uma cadeira de rodas motorizada montada com peças recicladas de bicicletas e patinetes, para doação em comunidades de baixa renda.', -25, 20, 'ativo', -27, -35, -31),
    (8,  11, 6,    '4.05.00.00', 'Efeito do Exercício Físico na Imunidade de Idosos Pós-Covid', 'all-or-nothing', 10000.00, 'Acompanhamento de marcadores imunológicos em idosos que tiveram covid, comparando grupos com e sem programa de exercício supervisionado.', -48, -3, 'ativo', -50, -58, -54),
    (9,  12, 6,    '2.05.00.00', 'Levantamento de Espécies Invasoras em Ecossistemas Costeiros', 'flexivel', 18000.00, 'Mapeamento de espécies exóticas invasoras em restingas e manguezais do litoral nordestino e seu impacto na fauna nativa.', -40, 10, 'ativo', -42, -50, -46),
    (10, 13, 6,    '2.12.00.00', 'Qualidade da Água de Nascentes Urbanas em Belo Horizonte', 'flexivel', 20000.00, 'Análise física, química e microbiológica da água de nascentes em áreas urbanas de Belo Horizonte, com mapa público dos resultados.', -50, 10, 'ativo', -52, -60, -56),
    (11, 13, 6,    '6.06.00.00', 'Memória Oral das Benzedeiras do Vale do Ribeira', 'flexivel', 10000.00, 'Registro em áudio e vídeo das práticas e saberes das benzedeiras do Vale do Ribeira, com devolução do acervo às comunidades.', -30, 15, 'ativo', -32, -40, -36),
    (12, 14, 6,    '6.06.00.00', 'Mapeamento Socioeconômico de Comunidades Quilombolas de Santa Catarina', 'all-or-nothing', 22000.00, 'Pesquisa quantitativa e qualitativa sobre indicadores socioeconômicos, acesso a direitos e identidade cultural em quilombos catarinenses.', 7, 45, 'ativo', -2, -12, -8),
    (13, 14, NULL, '7.02.00.00', 'Análise Discursiva das Fake News sobre Vacinas nas Redes Sociais', 'all-or-nothing', 15000.00, 'Estudo linguístico-computacional sobre estratégias discursivas de desinformação vacinal em redes sociais brasileiras.', NULL, NULL, 'rascunho', NULL, -2, NULL),
    (14, 15, NULL, '4.01.00.00', 'Adesão ao Tratamento de Hipertensão em Comunidades Ribeirinhas', 'all-or-nothing', 8000.00, 'Estudo sobre os fatores que levam ao abandono do tratamento de hipertensão em comunidades ribeirinhas do Amazonas.', 20, 60, 'rejeitado', NULL, -15, -10),
    (15, 15, 6,    '4.01.00.00', 'Eficácia de Probióticos na Redução de Infecções Hospitalares em UTI Neonatal', 'all-or-nothing', 30000.00, 'Ensaio clínico randomizado avaliando o uso de probióticos na microbiota intestinal de neonatos para prevenção de sepse hospitalar.', -35, 10, 'ativo', -37, -45, -41),
    (16, 16, 6,    '7.08.00.00', 'Avaliação de Programa de Reforço Escolar em Escolas Públicas de Fortaleza', 'flexivel', 18000.00, 'Avaliação do impacto de um programa de reforço escolar em matemática nas escolas municipais de Fortaleza.', -40, 5, 'ativo', -42, -50, -46),
    (17, 17, NULL, '2.05.00.00', 'Inventário de Abelhas Nativas em Parques Urbanos de Curitiba', 'all-or-nothing', 9000.00, 'Levantamento das espécies de abelhas sem ferrão em parques urbanos, com coleta, identificação e mapa de ocorrência.', 8, 38, 'aguardando_aprovacao', NULL, -18, -15),
    (18, 11, NULL, '4.05.00.00', 'Estudo sobre Microbiota Intestinal em Pacientes Oncológicos', 'all-or-nothing', 20000.00, 'Caracterização da microbiota intestinal e sua relação com resposta a quimioterapia em pacientes com câncer colorretal.', 12, 52, 'aguardando_aprovacao', NULL, -30, -2),
    (19, 16, NULL, '6.07.00.00', 'Percepção de Segurança no Transporte Público Noturno', 'all-or-nothing', 6000.00, 'Questionário e entrevistas com usuárias do transporte público noturno sobre percepção de segurança e rotas evitadas.', 6, 36, 'aguardando_aprovacao', NULL, -45, -40),
    (20, 9,  NULL, '1.03.00.00', 'Nova Plataforma de Diagnóstico por Imagem com Machine Learning', 'all-or-nothing', 30000.00, 'Sistema de apoio ao diagnóstico radiológico baseado em visão computacional, validado com dados de dois hospitais universitários.', 10, 45, 'aguardando_aprovacao', NULL, -5, -3),
    (21, 7,  6,    '6.07.00.00', 'Campanha de Teste: Comentários e Endosso', 'flexivel', 10000.00, 'Campanha ativa para testar comentários, endosso e atualizações. Comente em nome de um pesquisador na Bancada da Campanha; endosse entrando como Pesquisador Sistema, em Minhas Campanhas.', -5, 40, 'ativo', -5, -7, -6);

-- Desligadas só nesta carga: trg_campanha_valida_prazo_negocio (as datas de início ficam no passado),
-- trg_campanha_limite_simultaneo (as que vão fechar mais abaixo ainda estão 'ativo' agora; no fim, ninguém passa do
-- limite de campanhas simultâneas) e trg_campanha_carimba_envio_aprovacao (troca enviado_aprovacao_em por NOW()).
ALTER TABLE campanha DISABLE TRIGGER trg_campanha_valida_prazo_negocio;
ALTER TABLE campanha DISABLE TRIGGER trg_campanha_limite_simultaneo;
ALTER TABLE campanha DISABLE TRIGGER trg_campanha_carimba_envio_aprovacao;

INSERT INTO campanha (id_usuario, id_admin, id_area_conhecimento, titulo, modelo, meta_financeira, taxa_plataforma, descricao, data_inicio, data_fim, status, aprovado_em, criado_em, enviado_aprovacao_em)
SELECT s.dono, s.aprovador, ac.id_area_conhecimento, s.titulo, s.modelo, s.meta,
       public.config_numero('taxa_plataforma_padrao', 5.00), s.descricao,
       NOW() + s.inicio * INTERVAL '1 day', NOW() + s.fim * INTERVAL '1 day', s.status,
       NOW() + s.aprovada * INTERVAL '1 day', NOW() + s.criada * INTERVAL '1 day', NOW() + s.enviada * INTERVAL '1 day'
FROM seed_campanha s
JOIN area_conhecimento ac ON ac.codigo_cnpq = s.area
ORDER BY s.n;

ALTER TABLE campanha ENABLE TRIGGER trg_campanha_valida_prazo_negocio;
ALTER TABLE campanha ENABLE TRIGGER trg_campanha_limite_simultaneo;
ALTER TABLE campanha ENABLE TRIGGER trg_campanha_carimba_envio_aprovacao;

-- Os blocos abaixo usam o número da lista como id_campanha: confere que a renumeração bateu.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM seed_campanha s LEFT JOIN campanha c ON c.id_campanha = s.n WHERE c.titulo IS DISTINCT FROM s.titulo) THEN
        RAISE EXCEPTION 'seed: os ids das campanhas não seguem a lista de [07-E-1]';
    END IF;
END;
$$;

-- [07-E-1b] orcamento_campanha e marco_cronograma de toda campanha que já foi enviada (o rascunho, 13, ainda não
-- precisa): 3 itens que somam a meta e 3 marcos dentro do prazo, como o envio exige (fn_valida_completude_campanha, 05).
-- A campanha 20 fica com 2 marcos de propósito (ver [07-E-1]). As congela ficam desligadas só aqui, porque a maioria
-- já nasce aprovada.
ALTER TABLE orcamento_campanha DISABLE TRIGGER trg_orcamento_campanha_congela;
ALTER TABLE marco_cronograma DISABLE TRIGGER trg_marco_cronograma_congela;

INSERT INTO orcamento_campanha (id_campanha, categoria, descricao, valor, ordem)
SELECT v.n, v.categoria, v.descricao, s.meta * v.fracao, v.ordem
FROM (VALUES
    (1,  'Equipamentos', 'Servidor com GPU para treinar o modelo', 0.5, 1), (1, 'Serviços de terceiros', 'Laudo das imagens por neurologistas', 0.3, 2), (1, 'Bolsas', 'Bolsa de iniciação científica (6 meses)', 0.2, 3),
    (2,  'Equipamentos', 'Tablets para os testes com usuários', 0.5, 1), (2, 'Serviços de terceiros', 'Avaliação por fonoaudiólogas', 0.3, 2), (2, 'Bolsas', 'Bolsa de iniciação científica (4 meses)', 0.2, 3),
    (3,  'Equipamentos', 'Lentes acopláveis para celular', 0.5, 1), (3, 'Serviços de terceiros', 'Anotação das imagens por oftalmologistas', 0.3, 2), (3, 'Viagens', 'Visitas às unidades básicas de saúde', 0.2, 3),
    (4,  'Material de consumo', 'Meios de cultura e reagentes', 0.5, 1), (4, 'Serviços de terceiros', 'Sequenciamento genético das amostras', 0.3, 2), (4, 'Viagens', 'Expedições de coleta na Caatinga', 0.2, 3),
    (5,  'Bolsas', 'Agentes de pesquisa de campo', 0.5, 1), (5, 'Serviços de terceiros', 'Análise estatística dos dados', 0.3, 2), (5, 'Viagens', 'Deslocamento entre os municípios', 0.2, 3),
    (6,  'Equipamentos', 'Impressora 3D de grande formato', 0.5, 1), (6, 'Material de consumo', 'Filamentos e componentes mecânicos', 0.3, 2), (6, 'Serviços de terceiros', 'Avaliação por fisioterapeutas', 0.2, 3),
    (7,  'Material de consumo', 'Baterias e motores', 0.5, 1), (7, 'Equipamentos', 'Ferramentas de montagem', 0.3, 2), (7, 'Serviços de terceiros', 'Avaliação de segurança', 0.2, 3),
    (8,  'Material de consumo', 'Kits de exame imunológico', 0.5, 1), (8, 'Bolsas', 'Bolsa de iniciação científica (6 meses)', 0.3, 2), (8, 'Serviços de terceiros', 'Educador físico para as sessões', 0.2, 3),
    (9,  'Viagens', 'Saídas de campo pelo litoral', 0.5, 1), (9, 'Material de campo', 'Equipamentos de coleta e GPS', 0.3, 2), (9, 'Serviços de terceiros', 'Identificação das espécies por especialista', 0.2, 3),
    (10, 'Serviços de terceiros', 'Análises microbiológicas', 0.5, 1), (10, 'Material de campo', 'Frascos e sondas de medição', 0.3, 2), (10, 'Viagens', 'Deslocamento entre as nascentes', 0.2, 3),
    (11, 'Equipamentos', 'Gravador e microfones', 0.5, 1), (11, 'Viagens', 'Deslocamento até as comunidades', 0.3, 2), (11, 'Serviços de terceiros', 'Edição do acervo em vídeo', 0.2, 3),
    (12, 'Viagens', 'Visitas às comunidades', 0.5, 1), (12, 'Bolsas', 'Bolsa de iniciação científica (4 meses)', 0.3, 2), (12, 'Material de consumo', 'Impressão dos questionários e do relatório', 0.2, 3),
    (14, 'Viagens', 'Barco até as comunidades', 0.5, 1), (14, 'Material de consumo', 'Aparelhos de pressão', 0.3, 2), (14, 'Serviços de terceiros', 'Transcrição das entrevistas', 0.2, 3),
    (15, 'Material de consumo', 'Probióticos e placebo', 0.5, 1), (15, 'Serviços de terceiros', 'Exames laboratoriais', 0.3, 2), (15, 'Bolsas', 'Bolsa de enfermagem de pesquisa', 0.2, 3),
    (16, 'Bolsas', 'Aplicadores das avaliações', 0.5, 1), (16, 'Material de consumo', 'Impressão das provas', 0.3, 2), (16, 'Serviços de terceiros', 'Análise estatística', 0.2, 3),
    (17, 'Material de campo', 'Armadilhas e frascos de coleta', 0.5, 1), (17, 'Viagens', 'Deslocamento entre os parques', 0.3, 2), (17, 'Serviços de terceiros', 'Identificação das espécies por especialista', 0.2, 3),
    (18, 'Serviços de terceiros', 'Sequenciamento das amostras', 0.5, 1), (18, 'Material de consumo', 'Kits de coleta', 0.3, 2), (18, 'Bolsas', 'Bolsa de iniciação científica (3 meses)', 0.2, 3),
    (19, 'Serviços de terceiros', 'Transcrição das entrevistas', 0.5, 1), (19, 'Material de consumo', 'Impressão dos questionários', 0.3, 2), (19, 'Bolsas', 'Entrevistadoras de campo', 0.2, 3),
    (20, 'Equipamentos', 'Servidor para a plataforma', 0.5, 1), (20, 'Serviços de terceiros', 'Anotação das imagens por radiologistas', 0.3, 2), (20, 'Material de consumo', 'Licenças de software', 0.2, 3),
    (21, 'Material de consumo', 'Material de divulgação', 0.6, 1), (21, 'Serviços de terceiros', 'Revisão do texto', 0.4, 2)
) AS v(n, categoria, descricao, fracao, ordem)
JOIN seed_campanha s ON s.n = v.n;

INSERT INTO marco_cronograma (id_campanha, titulo, descricao, data_prevista, ordem)
SELECT s.n, v.titulo_marco, NULL, c.data_inicio + (c.data_fim - c.data_inicio) * v.fracao, v.ordem
FROM (VALUES
    (1,  'Base de exames organizada', 0.15, 1), (1, 'Primeira versão do modelo', 0.5, 2), (1, 'Validação com o hospital parceiro', 0.9, 3),
    (2,  'Protótipo do assistente', 0.15, 1), (2, 'Testes com usuários', 0.5, 2), (2, 'Versão publicada', 0.9, 3),
    (3,  'Coleta das imagens', 0.15, 1), (3, 'Treino do modelo', 0.5, 2), (3, 'Validação nas unidades de saúde', 0.9, 3),
    (4,  'Coleta das amostras de solo', 0.15, 1), (4, 'Isolamento dos fungos', 0.5, 2), (4, 'Testes de atividade antibiótica', 0.9, 3),
    (5,  'Levantamento dos casos notificados', 0.15, 1), (5, 'Visitas aos bairros', 0.5, 2), (5, 'Relatório epidemiológico', 0.9, 3),
    (6,  'Modelo digital da prótese', 0.15, 1), (6, 'Protótipos impressos', 0.5, 2), (6, 'Testes com pacientes do SUS', 0.9, 3),
    (7,  'Projeto da cadeira', 0.15, 1), (7, 'Montagem do protótipo', 0.5, 2), (7, 'Testes com usuários', 0.9, 3),
    (8,  'Recrutamento dos participantes', 0.15, 1), (8, 'Coleta inicial de sangue', 0.5, 2), (8, 'Coleta final e análise', 0.9, 3),
    (9,  'Primeiras trilhas mapeadas', 0.15, 1), (9, 'Catalogação das espécies', 0.5, 2), (9, 'Mapa das espécies invasoras', 0.9, 3),
    (10, 'Mapeamento das nascentes', 0.15, 1), (10, 'Coleta e análise das amostras', 0.5, 2), (10, 'Mapa público dos resultados', 0.9, 3),
    (11, 'Primeiras entrevistas gravadas', 0.15, 1), (11, 'Edição do acervo', 0.5, 2), (11, 'Devolução do acervo às comunidades', 0.9, 3),
    (12, 'Contato com as lideranças', 0.15, 1), (12, 'Aplicação dos questionários', 0.5, 2), (12, 'Devolutiva às comunidades', 0.9, 3),
    (14, 'Visitas às comunidades', 0.15, 1), (14, 'Entrevistas com agentes de saúde', 0.5, 2), (14, 'Relatório final', 0.9, 3),
    (15, 'Aprovação no comitê de ética do hospital', 0.15, 1), (15, 'Acompanhamento dos recém-nascidos', 0.5, 2), (15, 'Análise dos resultados', 0.9, 3),
    (16, 'Avaliação inicial dos alunos', 0.15, 1), (16, 'Acompanhamento das aulas de reforço', 0.5, 2), (16, 'Avaliação final e relatório', 0.9, 3),
    (17, 'Primeira campanha de coleta', 0.15, 1), (17, 'Segunda campanha de coleta', 0.5, 2), (17, 'Mapa de ocorrência publicado', 0.9, 3),
    (18, 'Recrutamento dos pacientes', 0.15, 1), (18, 'Coleta das amostras', 0.5, 2), (18, 'Análise do sequenciamento', 0.9, 3),
    (19, 'Aplicação dos questionários', 0.15, 1), (19, 'Entrevistas', 0.5, 2), (19, 'Relatório final', 0.9, 3),
    (20, 'Base de imagens anotada', 0.3, 1), (20, 'Teste com os radiologistas', 0.8, 2),
    (21, 'Início das atividades', 0.15, 1), (21, 'Relatório parcial', 0.5, 2), (21, 'Relatório final', 0.9, 3)
) AS v(n, titulo_marco, fracao, ordem)
JOIN seed_campanha s ON s.n = v.n
JOIN campanha c ON c.id_campanha = s.n;

ALTER TABLE orcamento_campanha ENABLE TRIGGER trg_orcamento_campanha_congela;
ALTER TABLE marco_cronograma ENABLE TRIGGER trg_marco_cronograma_congela;

-- [07-E-6] historico_rejeicao
-- id_usuario_dono e titulo_campanha são o snapshot gravado na rejeição (ver 01). A 14 está rejeitada agora; a 18 foi
-- rejeitada e reenviada; a 4 foi rejeitada uma vez antes de ser aprovada.
INSERT INTO historico_rejeicao (id_campanha, id_usuario_dono, titulo_campanha, id_admin, justificativa, rejeitado_em)
SELECT c.id_campanha, c.id_usuario, c.titulo, 6, v.justificativa, NOW() + v.dias * INTERVAL '1 day'
FROM (VALUES
    (14, 'O orçamento não explica como será o acesso às comunidades fora da época de cheia. Detalhe e reenvie.', -5),
    (18, 'Faltou o parecer do comitê de ética para a coleta de amostras dos pacientes. Anexe e reenvie.', -6),
    (4,  'Meta financeira sem justificativa de custos detalhada. Detalhe o orçamento e reenvie.', -158)
) AS v(n, justificativa, dias)
JOIN campanha c ON c.id_campanha = v.n;

-- [07-E-3] atualizacao_campanha
-- Publicadas enquanto a campanha estava no ar (trg_atualizacao_campanha_status, 05, só aceita campanha publicada).
-- A quantidade pesa na dimensão Atualização do score: a Ana publica com regularidade em todas; os outros, menos.
-- Imagem e PDF sem arquivo: o seed não sobe nada para o armazenamento (ver [07-C-4]).
INSERT INTO atualizacao_campanha (id_campanha, titulo, conteudo, publicado_em, fase, tipo)
SELECT v.n, v.titulo, v.conteudo, NOW() + v.dias * INTERVAL '1 day', v.fase::fase_atualizacao, v.tipo::tipo_atualizacao
FROM (VALUES
    (1,  'Início da coleta de dados clínicos', 'Iniciamos a coleta com o hospital parceiro. Primeiros 200 exames de neuroimagem organizados.', -215, 'andamento', 'texto'),
    (1,  'Artigo submetido com o código aberto', 'O artigo foi submetido e o código e o conjunto de dados estão em repositório público.', -186, 'resultado_final', 'linkexterno'),
    (2,  'Primeiros testes com leitores', 'Doze leitores com dislexia testaram o protótipo; a velocidade de leitura subiu em média 18%.', -128, 'andamento', 'imagem'),
    (2,  'Resultado preliminar dos testes', 'A versão com espaçamento adaptável teve a melhor compreensão de texto nos testes.', -102, 'resultado_preliminar', 'texto'),
    (3,  'Primeiras fotos coletadas', 'Já temos 1.200 fotos de fundo de olho de três unidades básicas de saúde.', -15, 'andamento', 'texto'),
    (3,  'Primeira versão do modelo', 'A primeira versão acerta 87% dos casos na base de validação; seguimos ajustando.', -4, 'resultado_preliminar', 'texto'),
    (4,  'Coleta de amostras concluída', 'Coleta concluída em 5 áreas da Caatinga: 120 fungos catalogados para análise.', -130, 'andamento', 'texto'),
    (4,  'Relatório final dos testes', 'Três compostos mostraram atividade contra bactérias resistentes. Relatório completo em PDF.', -106, 'resultado_final', 'pdf'),
    (5,  'Visitas aos bairros começaram', 'A equipe de campo começou as visitas em quatro municípios.', -40, 'andamento', 'texto'),
    (6,  'Protótipos impressos', 'Os primeiros 10 protótipos foram impressos e estão com os fisioterapeutas.', -60, 'andamento', 'imagem'),
    (7,  'Projeto da cadeira pronto', 'O projeto mecânico foi validado e as peças recicladas já foram separadas.', -10, 'andamento', 'texto'),
    (8,  'Recrutamento concluído', 'Recrutamos 60 idosos, divididos nos dois grupos do estudo.', -30, 'andamento', 'texto'),
    (9,  'Primeiras trilhas mapeadas', 'Mapeamos 3 das 8 trilhas previstas em restingas do litoral.', -25, 'andamento', 'texto'),
    (10, 'Nascentes mapeadas', 'Identificamos 14 nascentes; a coleta das amostras começa na próxima semana.', -30, 'andamento', 'texto')
) AS v(n, titulo, conteudo, dias, fase, tipo);

-- [07-E-7] comentario
-- Só pesquisador comenta, nunca na própria campanha, e só em campanha publicada (todas estavam no ar nestas datas).
-- Todos nascem sem endosso (trg_comentario_ignora_endosso_criacao, 05): endossar é o passo seguinte, feito como o
-- dono da campanha (bloco logo abaixo).
INSERT INTO comentario (id_campanha, id_pesquisador, conteudo, criado_em)
SELECT v.n, v.autor, v.conteudo, NOW() + v.dias * INTERVAL '1 day'
FROM (VALUES
    (1,  9,  'Pesquisa extremamente relevante! A detecção precoce de Alzheimer pode mudar vidas.', -212),
    (1,  10, 'Parabéns pela metodologia. Seria interessante publicar o conjunto de dados aberto.', -200),
    (1,  13, 'Acompanhei cada etapa desta campanha. Exemplo de transparência e rigor científico.', -190),
    (3,  9,  'Triagem por celular pode chegar onde não há oftalmologista. Projeto muito bem pensado.', -14),
    (3,  11, 'Como vocês vão lidar com a qualidade variável das câmeras dos celulares?', -10),
    (3,  12, 'O cronograma parece realista para a quantidade de fotos prevista.', -6),
    (3,  16, 'Acho que a acurácia anunciada é otimista demais para fotos de celular.', -3),
    (4,  8,  'Vocês pretendem depositar as cepas numa coleção de referência? Isso ajudaria outros grupos.', -130),
    (5,  14, 'Pena que a arrecadação está lenta. O tema é urgente; vou divulgar.', -30),
    (5,  8,  'Os dados de campo são valiosos mesmo que a meta não seja batida. Torço por uma nova campanha.', -15),
    (6,  13, 'O custo por unidade ficou muito abaixo do mercado. Ótimo exemplo de retorno direto à sociedade.', -50),
    (10, 8,  'Mapa público dos resultados é exatamente o que as prefeituras precisam.', -20),
    (10, 10, 'Vocês vão repetir a coleta na época de chuva? A qualidade da água muda bastante.', -12),
    (16, 8,  'Não encontrei a autorização da secretaria de educação para a coleta nas escolas.', -30)
) AS v(n, autor, conteudo, dias);

-- Endossos, feitos como o dono de cada campanha (o mesmo caminho da tela): validar_comentario_endosso_autor (05)
-- confere que quem endossa é o dono e calcula a posição do endosso na ordem em que eles acontecem.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.id_comentario, ca.id_usuario AS dono
        FROM comentario c
        JOIN campanha ca ON ca.id_campanha = c.id_campanha
        JOIN (VALUES (1, 9), (1, 10), (3, 9), (3, 11), (4, 8), (5, 14), (6, 13), (10, 8))
            AS e(id_campanha, id_pesquisador)
          ON e.id_campanha = c.id_campanha AND e.id_pesquisador = c.id_pesquisador
        ORDER BY c.criado_em
    LOOP
        PERFORM set_config('app.id_usuario_atual', r.dono::TEXT, TRUE);
        UPDATE comentario SET endossado = TRUE WHERE id_comentario = r.id_comentario;
    END LOOP;
    PERFORM set_config('app.id_usuario_atual', '', TRUE);
END;
$$;

-- [07-E-2] seguir_campanha / [07-D-4] seguir_pesquisador
INSERT INTO seguir_campanha (id_usuario, id_campanha) VALUES
(18, 3), (19, 3), (20, 10), (18, 5), (19, 1), (9, 3), (13, 7);

INSERT INTO seguir_pesquisador (id_usuario, id_pesquisador) VALUES
(18, 8), (19, 8), (20, 13), (9, 8), (8, 9), (18, 10), (13, 8);

-- [07-H-1] contribuicao
-- Toda contribuição nasce 'pendente', como no POST /contribuicao, e o resto da vida dela acontece pelas mesmas
-- funções que o sistema usa com o provedor de verdade ([07-H-5]): o aviso do provedor (webhook) confirma, o
-- fechamento da campanha cria o repasse ou manda devolver, o worker de estorno devolve. Assim cada status, cada
-- linha de auditoria_financeira e cada evento de pagamento é o que o sistema realmente produziria.
-- provedor = 'seed': as cobranças 'pay_seed_...' nunca existiram em provedor nenhum, e os processos automáticos
-- (devolução, repasse, conferência, reprocessamento de avisos) só tratam o provedor configurado. Assim, ligar o
-- Asaas ou o provedor de teste não faz o sistema tentar cobrar, devolver ou transferir um dado de demonstração.
-- A tarifa do provedor (taxa_pagamento) é gravada pela própria trigger (trg_contribuicao_define_taxa_pagamento, 05).
-- Regras que valem aqui como no uso real: cartão e boleto só em campanha flexível (trg_contribuicao_all_or_nothing_pix
-- fica LIGADA), cartão entre os limites de valor. Desligada só nesta carga: trg_valida_status_contribuicao (várias
-- campanhas já passaram do prazo hoje; o apoio foi feito quando estavam no ar). O boleto nasce desligado
-- (boleto_habilitado): a contribuição 21 é de quando ele estava ligado, e por isso entra com a validação de valor
-- desligada só para ela.
CREATE TEMP TABLE seed_contribuicao (
    k INT PRIMARY KEY, n INT, quem INT, valor DECIMAL(10,2), meio meio_pagamento, anonima BOOLEAN, dias NUMERIC, cobranca BOOLEAN
);
INSERT INTO seed_contribuicao VALUES
    -- k, campanha, quem apoiou (NULL = sem conta), valor, meio, anônima, criada (dias a partir de hoje), tem cobrança
    (1,  1,  18,   3000.00, 'pix',            FALSE, -228, TRUE),
    (2,  1,  19,   2500.00, 'pix',            FALSE, -220, TRUE),
    (3,  1,  20,   2000.00, 'pix',            FALSE, -210, TRUE),
    (4,  1,  9,    1500.00, 'pix',            FALSE, -205, TRUE),
    (5,  1,  10,   1200.00, 'pix',            FALSE, -200, TRUE),
    (6,  1,  NULL,  800.00, 'pix',            TRUE,  -195, TRUE),
    (7,  1,  14,   1000.00, 'pix',            FALSE, -190, TRUE),
    (8,  2,  18,   2500.00, 'pix',            FALSE, -138, TRUE),
    (9,  2,  20,   2000.00, 'pix',            FALSE, -130, TRUE),
    (10, 2,  19,   1500.00, 'pix',            FALSE, -125, TRUE),
    (11, 2,  9,    1000.00, 'pix',            TRUE,  -118, TRUE),
    (12, 2,  18,    300.00, 'cartao_credito', FALSE, -135, TRUE),
    (13, 2,  20,    450.00, 'cartao_credito', FALSE, -134, TRUE),
    (14, 2,  19,    250.00, 'cartao_credito', FALSE, -102, TRUE),
    (15, 3,  18,   2000.00, 'pix',            FALSE, -19,  TRUE),
    (16, 3,  19,   1500.00, 'pix',            FALSE, -17,  TRUE),
    (17, 3,  20,   1000.00, 'pix',            FALSE, -15,  TRUE),
    (18, 3,  9,     800.00, 'pix',            TRUE,  -13,  TRUE),
    (19, 3,  10,    500.00, 'pix',            FALSE, -18,  TRUE),
    (20, 3,  18,    200.00, 'cartao_credito', FALSE, -12,  TRUE),
    (21, 3,  19,    400.00, 'boleto',         FALSE, -11,  TRUE),
    (22, 3,  14,    300.00, 'pix',            FALSE, -0.08, TRUE),
    (23, 3,  15,    250.00, 'pix',            FALSE, -3,   TRUE),
    (24, 3,  12,    100.00, 'pix',            FALSE, -5,   TRUE),
    (25, 3,  9,      60.00, 'pix',            FALSE, -2,   TRUE),
    (26, 3,  17,     50.00, 'pix',            FALSE, -0.1, FALSE),
    (27, 4,  8,    5000.00, 'pix',            FALSE, -148, TRUE),
    (28, 4,  18,   6000.00, 'pix',            FALSE, -140, TRUE),
    (29, 4,  19,   4000.00, 'pix',            FALSE, -132, TRUE),
    (30, 4,  20,   3000.00, 'pix',            FALSE, -120, TRUE),
    (31, 4,  10,   2000.00, 'pix',            FALSE, -110, TRUE),
    (32, 5,  18,   1500.00, 'pix',            FALSE, -52,  TRUE),
    (33, 5,  19,   1200.00, 'pix',            FALSE, -48,  TRUE),
    (34, 5,  20,   1000.00, 'pix',            FALSE, -45,  TRUE),
    (35, 5,  8,     800.00, 'pix',            FALSE, -40,  TRUE),
    (36, 5,  14,    600.00, 'pix',            FALSE, -33,  TRUE),
    (37, 5,  10,    400.00, 'pix',            FALSE, -25,  TRUE),
    (38, 5,  NULL,  300.00, 'pix',            TRUE,  -20,  TRUE),
    (39, 6,  18,   3000.00, 'pix',            FALSE, -78,  TRUE),
    (40, 6,  8,    2500.00, 'pix',            FALSE, -70,  TRUE),
    (41, 6,  20,   2000.00, 'pix',            FALSE, -60,  TRUE),
    (42, 6,  19,    400.00, 'cartao_credito', FALSE, -72,  TRUE),
    (43, 7,  8,    1200.00, 'pix',            FALSE, -22,  TRUE),
    (44, 7,  18,    800.00, 'pix',            FALSE, -14,  TRUE),
    (45, 7,  19,   2000.00, 'pix',            FALSE, -9,   TRUE),
    (46, 7,  20,   1500.00, 'pix',            FALSE, -4,   TRUE),
    (47, 8,  18,   4000.00, 'pix',            FALSE, -46,  TRUE),
    (48, 8,  20,   3000.00, 'pix',            FALSE, -40,  TRUE),
    (49, 8,  19,   2500.00, 'pix',            FALSE, -30,  TRUE),
    (50, 8,  8,     500.00, 'pix',            FALSE, -12,  TRUE),
    (51, 9,  18,   2000.00, 'pix',            FALSE, -38,  TRUE),
    (52, 9,  19,   1500.00, 'pix',            FALSE, -30,  TRUE),
    (53, 9,  20,    300.00, 'cartao_credito', FALSE, -28,  TRUE),
    (54, 10, 8,    2000.00, 'pix',            FALSE, -47,  TRUE),
    (55, 10, 18,   1500.00, 'pix',            FALSE, -41,  TRUE),
    (56, 10, 19,    800.00, 'pix',            FALSE, -35,  TRUE),
    (57, 11, 20,   1000.00, 'pix',            FALSE, -28,  TRUE),
    (58, 11, 18,    120.00, 'cartao_credito', FALSE, -26,  TRUE),
    (59, 15, 18,   1000.00, 'pix',            FALSE, -33,  TRUE),
    (60, 15, 19,    700.00, 'pix',            FALSE, -29,  TRUE),
    (61, 15, 8,     500.00, 'pix',            FALSE, -20,  TRUE),
    (62, 16, 18,    600.00, 'pix',            FALSE, -38,  TRUE),
    (63, 16, 20,    400.00, 'pix',            FALSE, -36,  TRUE),
    (64, 16, 19,    200.00, 'cartao_credito', FALSE, -30,  TRUE);

ALTER TABLE contribuicao DISABLE TRIGGER trg_valida_status_contribuicao;
INSERT INTO contribuicao (id_campanha, id_usuario, valor, meio_pagamento, anonima, provedor, id_transacao_api, criado_em)
SELECT s.n, s.quem, s.valor, s.meio, s.anonima, 'seed',
       CASE WHEN s.cobranca THEN 'pay_seed_' || lpad(s.k::TEXT, 3, '0') END, NOW() + s.dias * INTERVAL '1 day'
FROM seed_contribuicao s
WHERE s.meio <> 'boleto' AND s.k < 21
ORDER BY s.k;
ALTER TABLE contribuicao DISABLE TRIGGER trg_contribuicao_valida_valor_minimo;
INSERT INTO contribuicao (id_campanha, id_usuario, valor, meio_pagamento, anonima, provedor, id_transacao_api, criado_em)
SELECT s.n, s.quem, s.valor, s.meio, s.anonima, 'seed', 'pay_seed_' || lpad(s.k::TEXT, 3, '0'), NOW() + s.dias * INTERVAL '1 day'
FROM seed_contribuicao s
WHERE s.k = 21;
ALTER TABLE contribuicao ENABLE TRIGGER trg_contribuicao_valida_valor_minimo;
INSERT INTO contribuicao (id_campanha, id_usuario, valor, meio_pagamento, anonima, provedor, id_transacao_api, criado_em)
SELECT s.n, s.quem, s.valor, s.meio, s.anonima, 'seed',
       CASE WHEN s.cobranca THEN 'pay_seed_' || lpad(s.k::TEXT, 3, '0') END, NOW() + s.dias * INTERVAL '1 day'
FROM seed_contribuicao s
WHERE s.k > 21
ORDER BY s.k;
ALTER TABLE contribuicao ENABLE TRIGGER trg_valida_status_contribuicao;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM seed_contribuicao s LEFT JOIN contribuicao c ON c.id_contribuicao = s.k
               WHERE c.id_campanha IS DISTINCT FROM s.n OR c.valor IS DISTINCT FROM s.valor) THEN
        RAISE EXCEPTION 'seed: os ids das contribuições não seguem a lista de [07-H-1]';
    END IF;
END;
$$;

-- [07-H-3] aceite_termo_contribuicao
-- Sustenta o RF-054/RF-055: a trilha do aceite dos termos por transação é a defesa da plataforma numa contestação de
-- pagamento. Cada contribuição aceitou a versão do termo da conta vigente no instante da contribuição.
INSERT INTO aceite_termo_contribuicao (id_contribuicao, id_termo, aceito_em, ip_aceite)
SELECT c.id_contribuicao,
       (SELECT t.id_termo FROM termos_de_uso t
        WHERE t.tipo = 'cadastro' AND t.criado_em <= c.criado_em
        ORDER BY t.criado_em DESC LIMIT 1),
       c.criado_em, '187.10.20.30'
FROM contribuicao c;

-- [07-H-5] A vida de cada contribuição, pelas funções do sistema
-- Cada passo abaixo chama a MESMA função que o Nest chama no uso real (webhook do provedor, fechamento da campanha,
-- worker de repasse e de estorno, painel de revisão). Essas funções gravam a hora da chamada (NOW()); as funções
-- temporárias pg_temp.* (somem no fim da sessão, nunca ficam no banco) só fazem o papel do provedor e datam cada
-- passo no dia em que ele teria acontecido. O que cada uma mostra está no resumo do fim deste arquivo.
-- seed_relogio guarda o instante em que esta parte começou: tudo o que uma função gravar a partir dele ainda não
-- foi datado. Funciona com o arquivo rodando numa transação só (SQL Editor do Supabase) ou comando a comando.
CREATE TEMP TABLE seed_relogio AS SELECT NOW() AS inicio;

CREATE FUNCTION pg_temp.datar(p_quando TIMESTAMPTZ) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_inicio TIMESTAMPTZ := (SELECT inicio FROM seed_relogio);
    v_sessao TEXT := COALESCE(current_setting('app.id_usuario_atual', TRUE), '');
BEGIN
    UPDATE auditoria_financeira SET timestamp = p_quando WHERE timestamp >= v_inicio;
    UPDATE evento_pagamento SET recebido_em = p_quando WHERE recebido_em >= v_inicio;
    UPDATE evento_pagamento SET processado_em = p_quando WHERE processado_em >= v_inicio;
    UPDATE evento_pagamento SET revisao_manual_em = p_quando WHERE revisao_manual_em >= v_inicio;
    UPDATE repasse SET repassado_em = p_quando WHERE repassado_em >= v_inicio;
    UPDATE repasse SET criado_em = p_quando WHERE criado_em >= v_inicio;
    UPDATE contribuicao SET dinheiro_liberado_em = p_quando WHERE dinheiro_liberado_em >= v_inicio;
    UPDATE contribuicao SET cobranca_cancelada_em = p_quando WHERE cobranca_cancelada_em >= v_inicio;
    UPDATE campanha SET encerrado_em = p_quando WHERE encerrado_em >= v_inicio;
    -- Pedido já decidido só muda nas mãos de quem decide (fn_valida_transicao_solicitacao, 05): a data é acertada
    -- como o Admin Sistema, e a sessão de quem estava agindo volta em seguida.
    PERFORM set_config('app.id_usuario_atual', '1', TRUE);
    UPDATE solicitacao_encerramento SET solicitado_em = p_quando WHERE solicitado_em >= v_inicio;
    UPDATE solicitacao_encerramento SET avaliado_em = p_quando WHERE avaliado_em >= v_inicio;
    PERFORM set_config('app.id_usuario_atual', v_sessao, TRUE);
    UPDATE denuncia SET julgado_em = p_quando WHERE julgado_em >= v_inicio;
    UPDATE denuncia SET contestada_em = p_quando WHERE contestada_em >= v_inicio;
END;
$$;

-- O aviso que o provedor manda (webhook), gravado na caixa de entrada pelo mesmo registrar_evento_pagamento.
CREATE FUNCTION pg_temp.aviso(p_tipo TEXT, p_objeto TEXT, p_id TEXT, p_quando TIMESTAMPTZ) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    v_externo TEXT := 'evt_seed_' || lpad(((SELECT count(*) FROM evento_pagamento) + 1)::TEXT, 4, '0');
    v_id      INT;
BEGIN
    SELECT r.id_evento INTO v_id
    FROM public.registrar_evento_pagamento('seed', v_externo, p_tipo,
        jsonb_build_object('id', v_externo, 'event', p_tipo, p_objeto, jsonb_build_object('id', p_id))) r;
    PERFORM pg_temp.datar(p_quando);
    RETURN v_id;
END;
$$;

-- Aviso de cobrança aplicado como o webhook aplica; confere o resultado esperado.
CREATE FUNCTION pg_temp.cobranca(p_k INT, p_tipo TEXT, p_status status_contribuicao, p_quando TIMESTAMPTZ,
                                 p_esperado TEXT, p_liberado BOOLEAN DEFAULT FALSE) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_cobranca TEXT := (SELECT id_transacao_api FROM contribuicao WHERE id_contribuicao = p_k);
    v_res      TEXT;
BEGIN
    v_res := public.aplicar_evento_pagamento(pg_temp.aviso(p_tipo, 'payment', v_cobranca, p_quando), 'seed',
                                             v_cobranca, p_status, NULL, p_liberado);
    IF v_res IS DISTINCT FROM p_esperado THEN
        RAISE EXCEPTION 'seed: aviso % da contribuição % deu % (esperado %)', p_tipo, p_k, v_res, p_esperado;
    END IF;
    PERFORM pg_temp.datar(p_quando);
END;
$$;

-- Pagamento confirmado três minutos depois de a contribuição ser criada. Cartão: o provedor confirma e só libera o
-- dinheiro cerca de 30 dias depois (pg_temp.liberar). Boleto: o dinheiro já chega liberado.
CREATE FUNCTION pg_temp.pagar(p_k INT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_meio meio_pagamento;
    v_criado TIMESTAMPTZ;
BEGIN
    SELECT meio_pagamento, criado_em INTO v_meio, v_criado FROM contribuicao WHERE id_contribuicao = p_k;
    PERFORM pg_temp.cobranca(p_k, CASE WHEN v_meio = 'cartao_credito' THEN 'PAYMENT_CONFIRMED' ELSE 'PAYMENT_RECEIVED' END,
                             'confirmado', v_criado + INTERVAL '3 minutes', 'aplicado', v_meio = 'boleto');
END;
$$;

CREATE FUNCTION pg_temp.liberar(p_k INT, p_quando TIMESTAMPTZ) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_temp.cobranca(p_k, 'PAYMENT_RECEIVED', 'confirmado', p_quando, 'sem_mudanca', TRUE);
END;
$$;

-- O repasse de uma campanha (o primeiro, ou o adicional do cartão).
CREATE FUNCTION pg_temp.repasse(p_n INT, p_ordem INT DEFAULT 1) RETURNS INT LANGUAGE sql AS $$
    SELECT id_repasse FROM repasse WHERE id_campanha = p_n ORDER BY id_repasse OFFSET p_ordem - 1 LIMIT 1;
$$;

-- O worker de repasse pede a transferência (pendente -> processando) e guarda o id dela, como faz com o provedor.
CREATE FUNCTION pg_temp.transferir(p_id INT, p_quando TIMESTAMPTZ) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.atualizar_status_repasse(p_id, 'processando', NULL, 'transferência iniciada');
    PERFORM public.registrar_transferencia_repasse(p_id, 'trf_seed_' || p_id);
    PERFORM pg_temp.datar(p_quando);
END;
$$;

-- Aviso de transferência aplicado como o webhook de repasse aplica.
CREATE FUNCTION pg_temp.aviso_repasse(p_id INT, p_tipo TEXT, p_status status_repasse, p_motivo TEXT,
                                      p_quando TIMESTAMPTZ, p_esperado TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_res TEXT;
BEGIN
    v_res := public.aplicar_evento_repasse(pg_temp.aviso(p_tipo, 'transfer', 'trf_seed_' || p_id, p_quando), 'seed',
                                           'trf_seed_' || p_id, p_status, p_motivo);
    IF v_res IS DISTINCT FROM p_esperado THEN
        RAISE EXCEPTION 'seed: aviso % do repasse % deu % (esperado %)', p_tipo, p_id, v_res, p_esperado;
    END IF;
    PERFORM pg_temp.datar(p_quando);
END;
$$;

CREATE FUNCTION pg_temp.dia(p_dias NUMERIC) RETURNS TIMESTAMPTZ LANGUAGE sql AS $$
    SELECT (SELECT inicio FROM seed_relogio) + p_dias * INTERVAL '1 day';
$$;

-- 1. Os pagamentos confirmados (toda contribuição com cobrança, menos as que ficam pendentes ou vencem).
DO $$
DECLARE
    v_k INT;
BEGIN
    FOR v_k IN SELECT k FROM seed_contribuicao WHERE cobranca AND k NOT IN (22, 23, 24, 25) ORDER BY k LOOP
        PERFORM pg_temp.pagar(v_k);
    END LOOP;
END;
$$;

-- 2. O dinheiro do cartão liberado pelo provedor, cerca de 30 dias depois. Na campanha 2, o cartão 14 foi pago perto
--    do fim e só é liberado depois do fechamento: vira um repasse adicional (passo 6). Os cartões 20, 53 e 58 ainda
--    não foram liberados ("Cartão a liberar"); o 64 foi pago numa campanha que a moderação encerrou.
SELECT pg_temp.liberar(12, pg_temp.dia(-105));
SELECT pg_temp.liberar(13, pg_temp.dia(-104));
SELECT pg_temp.liberar(42, pg_temp.dia(-42));

-- 3. Estorno pedido no painel do provedor (quem apoiou pediu de volta): confirmado -> reembolsado, fora da arrecadação.
SELECT pg_temp.cobranca(19, 'PAYMENT_REFUNDED', 'reembolsado', pg_temp.dia(-6), 'aplicado');

-- 4. Moderação. As denúncias entram pendentes e são julgadas pelo Moderador Sistema (3) do jeito do painel: um UPDATE
--    com ele logado, que trg_denuncia_registra_julgador (05) carimba com quem julgou e quando. A 10, contra a campanha
--    16, é julgada por encerrar_campanha_por_denuncia (03), que também encerra a campanha por moderação: o dinheiro
--    pago vai para devolução (trg_campanha_encerrada_destino_dinheiro, 05). Só 'resolvida' (procedente) pesa no score.
CREATE TEMP TABLE seed_denuncia (
    d INT PRIMARY KEY, quem INT, campanha INT, pesquisador INT, motivo TEXT, relato TEXT, dias INT,
    decisao status_denuncia, justificativa TEXT, julgada INT
);
INSERT INTO seed_denuncia VALUES
    (1,  16, 3,    NULL, 'Campanha com informações falsas ou enganosas', 'A acurácia anunciada não aparece em nenhum artigo publicado.', -8, 'improcedente', 'Os números estão no relatório técnico citado na campanha; a denúncia não procede.', -7),
    (2,  18, 10,   NULL, 'Campanha fora do escopo acadêmico', 'Parece um serviço de análise de água para empresas, não uma pesquisa.', -45, 'pendente', NULL, NULL),
    (3,  19, NULL, 10,   'Vínculo institucional falso ou não comprovável', 'Não encontrei o nome dele na página do programa de pós-graduação.', -6, 'pendente', NULL, NULL),
    (4,  8,  NULL, 12,   'Perfil com dados acadêmicos falsos', 'O título de mestre informado não aparece no currículo Lattes.', -60, 'resolvida', 'O título de mestre não foi confirmado pela universidade na data da análise.', -58),
    (5,  8,  NULL, 16,   'Perfil com dados acadêmicos falsos', 'Diz ter vínculo com a UFC, mas a universidade não o conhece.', -70, 'resolvida', 'O vínculo informado não existe; confirmado com a universidade.', -68),
    (6,  9,  NULL, 16,   'Comportamento abusivo ou ofensivo', 'Respondeu de forma agressiva às perguntas nos comentários.', -55, 'resolvida', 'Mensagens ofensivas a outros pesquisadores confirmadas.', -54),
    (7,  10, NULL, 16,   'Usurpação de identidade de pesquisador real', 'As publicações do perfil são de outro pesquisador.', -50, 'resolvida', 'Usava publicações de outro pesquisador como se fossem suas.', -49),
    (8,  18, 16,   NULL, 'Campanha com informações falsas ou enganosas', 'As escolas citadas dizem que não participam do projeto.', -20, 'resolvida', 'As escolas citadas não confirmaram nenhuma parceria.', -19),
    (9,  20, 16,   NULL, 'Campanha sem viabilidade metodológica', 'Não há autorização da secretaria de educação para a coleta.', -16, 'resolvida', 'Não há autorização da secretaria de educação para a coleta.', -15),
    (10, 19, 16,   NULL, 'Uso indevido de recursos arrecadados', 'O orçamento prevê pagamentos para uma empresa do próprio pesquisador.', -13, 'resolvida', 'Fraude confirmada: a campanha foi encerrada por moderação e o dinheiro volta para quem apoiou.', -12),
    (11, 8,  NULL, 17,   'Perfil com dados acadêmicos falsos', 'A graduação informada não foi encontrada na instituição.', -30, 'resolvida', 'A graduação informada não foi encontrada na instituição.', -29),
    (12, 9,  NULL, 17,   'Comportamento abusivo ou ofensivo', 'Ataques pessoais em comentários de outras campanhas.', -25, 'resolvida', 'Ataques pessoais em comentários confirmados.', -24),
    (13, 18, NULL, 17,   'Usurpação de identidade de pesquisador real', 'As fotos de campo do perfil são de outro grupo de pesquisa.', -20, 'resolvida', 'As fotos de campo do perfil não são dele.', -19);

INSERT INTO denuncia (id_usuario, id_campanha_alvo, id_pesquisador_alvo, id_motivo, relato, criado_em)
SELECT s.quem, s.campanha, s.pesquisador, md.id_motivo, s.relato, pg_temp.dia(s.dias)
FROM seed_denuncia s
JOIN motivo_denuncia md ON md.descricao = s.motivo
ORDER BY s.d;

DO $$
DECLARE
    r RECORD;
BEGIN
    PERFORM set_config('app.id_usuario_atual', '3', TRUE);
    FOR r IN SELECT * FROM seed_denuncia WHERE decisao <> 'pendente' ORDER BY julgada, d LOOP
        IF r.d = 10 THEN
            PERFORM public.encerrar_campanha_por_denuncia(r.d, r.justificativa);
        ELSE
            UPDATE denuncia SET status = r.decisao, justificativa_moderacao = r.justificativa WHERE id_denuncia = r.d;
        END IF;
        PERFORM pg_temp.datar(pg_temp.dia(r.julgada));
    END LOOP;
    PERFORM set_config('app.id_usuario_atual', '', TRUE);
END;
$$;

-- 5. Pedidos de encerramento antes do prazo (RF-064 a RF-066), pelo caminho do painel: o pesquisador pede, o Admin
--    Sistema (1) decide com decidir_solicitacao_encerramento (03). Aprovar encerra a campanha e o dinheiro vai para o
--    pesquisador (trg_campanha_encerrada_destino_dinheiro, 05). A Ana desistiu do pedido dela (cancelado pela dona). A
--    Patrícia cancelou o projeto (encerrar_campanha_sem_contribuicao, 03): todo o dinheiro volta para quem apoiou.
INSERT INTO solicitacao_encerramento (id_campanha, justificativa_pesquisador, solicitado_em) VALUES
(3,  'Os parceiros anteciparam a coleta e talvez não precisemos de todo o prazo. Solicito encerrar antes.', pg_temp.dia(-10)),
(9,  'A coleta de campo terminou antes do previsto e o valor arrecadado já cobre a catalogação. Solicito encerrar antes do prazo.', pg_temp.dia(-7)),
(11, 'Uma das comunidades pediu para adiar as entrevistas. Solicito encerrar com o que foi arrecadado.', pg_temp.dia(-25)),
(10, 'O laboratório parceiro encerrou o convênio e não temos mais onde fazer as análises microbiológicas. Solicito encerrar antes do prazo.', pg_temp.dia(-40));

DO $$
BEGIN
    PERFORM set_config('app.id_usuario_atual', '8', TRUE);
    UPDATE solicitacao_encerramento SET status = 'cancelado' WHERE id_campanha = 3;
    PERFORM set_config('app.id_usuario_atual', '1', TRUE);
    PERFORM public.decidir_solicitacao_encerramento(
        (SELECT id_solicitacao_encerramento FROM solicitacao_encerramento WHERE id_campanha = 11), FALSE,
        'As entrevistas são a etapa principal do projeto; encerrar agora deixaria a pesquisa sem ela. Reorganize o cronograma.');
    PERFORM pg_temp.datar(pg_temp.dia(-24));
    PERFORM public.decidir_solicitacao_encerramento(
        (SELECT id_solicitacao_encerramento FROM solicitacao_encerramento WHERE id_campanha = 9), TRUE, NULL);
    PERFORM pg_temp.datar(pg_temp.dia(-5));
    PERFORM set_config('app.id_usuario_atual', '15', TRUE);
    PERFORM public.encerrar_campanha_sem_contribuicao(15,
        'O hospital parceiro suspendeu o estudo e não há como continuar. Todo o dinheiro volta para quem apoiou.');
    PERFORM pg_temp.datar(pg_temp.dia(-8));
    PERFORM set_config('app.id_usuario_atual', '', TRUE);
END;
$$;

-- Os que continuam esperando a decisão (há 15 dias, há 1 dia; o da campanha 10 há 40).
INSERT INTO solicitacao_encerramento (id_campanha, justificativa_pesquisador, solicitado_em) VALUES
(11, 'As comunidades confirmaram que não vão receber a equipe neste ano. Solicito encerrar com o que foi arrecadado.', pg_temp.dia(-15)),
(7,  'A meta foi batida e as peças já foram compradas com o valor arrecadado. Solicito encerrar antes do prazo.', pg_temp.dia(-1));

-- 6. O fechamento pelo prazo (encerrar_campanhas_vencidas, 05, a tarefa automática "Fechar campanhas vencidas"):
--    sucesso cria o repasse; tudo-ou-nada que não bateu a meta manda cada contribuição para devolução; o flexível fica
--    com o que arrecadou. Cada campanha é datada uma hora depois do próprio prazo. Depois, o cartão 14 é liberado e
--    criar_repasses_liberados (05) cria o repasse adicional dele.
DO $$
DECLARE
    v_n INT;
BEGIN
    PERFORM public.encerrar_campanhas_vencidas();
    UPDATE auditoria_financeira a SET timestamp = ca.data_fim + INTERVAL '1 hour'
    FROM contribuicao c JOIN campanha ca ON ca.id_campanha = c.id_campanha
    WHERE a.id_contribuicao = c.id_contribuicao AND a.timestamp >= (SELECT inicio FROM seed_relogio);
    UPDATE campanha SET encerrado_em = data_fim + INTERVAL '1 hour' WHERE encerrado_em >= (SELECT inicio FROM seed_relogio);
    UPDATE repasse r SET criado_em = ca.data_fim + INTERVAL '1 hour'
    FROM campanha ca
    WHERE ca.id_campanha = r.id_campanha AND r.criado_em >= (SELECT inicio FROM seed_relogio);
END;
$$;

SELECT pg_temp.liberar(14, pg_temp.dia(-72));
DO $$
BEGIN
    PERFORM public.criar_repasses_liberados();
    PERFORM pg_temp.datar(pg_temp.dia(-72));
END;
$$;

-- Repasse de demonstração só com o provedor do seed: nenhum worker de verdade o pega.
UPDATE repasse SET provedor = 'seed' WHERE provedor IS NULL;

-- 7. As transferências. Concluídas pelo aviso TRANSFER_DONE (contribuições -> 'repassado'). A do Carlos falhou
--    (TRANSFER_FAILED: a chave Pix de destino não existe mais) e fica em erro, esperando alguém corrigir e recolocar
--    na fila; depois chega um TRANSFER_DONE atrasado da mesma transferência, que o sistema não aplica: o provedor diz
--    que concluiu e o registro diz que falhou, e o aviso vai para revisão manual. A do Eduardo está em andamento. A da
--    Renata nem começou: ela ainda não cadastrou a chave Pix ("aguardando conta").
SELECT pg_temp.transferir(pg_temp.repasse(1), pg_temp.dia(-184));
SELECT pg_temp.aviso_repasse(pg_temp.repasse(1), 'TRANSFER_DONE', 'concluido', NULL, pg_temp.dia(-183), 'aplicado');
SELECT pg_temp.transferir(pg_temp.repasse(4), pg_temp.dia(-104));
SELECT pg_temp.aviso_repasse(pg_temp.repasse(4), 'TRANSFER_DONE', 'concluido', NULL, pg_temp.dia(-103), 'aplicado');
SELECT pg_temp.transferir(pg_temp.repasse(2), pg_temp.dia(-99));
SELECT pg_temp.aviso_repasse(pg_temp.repasse(2), 'TRANSFER_DONE', 'concluido', NULL, pg_temp.dia(-98), 'aplicado');
SELECT pg_temp.transferir(pg_temp.repasse(2, 2), pg_temp.dia(-71));
SELECT pg_temp.aviso_repasse(pg_temp.repasse(2, 2), 'TRANSFER_DONE', 'concluido', NULL, pg_temp.dia(-70), 'aplicado');
SELECT pg_temp.transferir(pg_temp.repasse(6), pg_temp.dia(-34));
SELECT pg_temp.aviso_repasse(pg_temp.repasse(6), 'TRANSFER_FAILED', 'erro', 'A chave Pix de destino não existe mais no banco do recebedor.', pg_temp.dia(-33), 'aplicado');
SELECT pg_temp.aviso_repasse(pg_temp.repasse(6), 'TRANSFER_DONE', 'concluido', NULL, pg_temp.dia(-32), 'revisao_manual');
SELECT pg_temp.transferir(pg_temp.repasse(9), pg_temp.dia(-4));

-- 8. As devoluções, como o worker de estorno as faz (proximo_estorno_pendente, concluir_estorno e
--    registrar_falha_estorno, 05). Quem apoiou recebe o valor inteiro; a tarifa do provedor não volta.
--    Campanha 5 (tudo-ou-nada que não bateu a meta), uma devolução em cada situação:
--      32 e 33 devolvidas (na 32 chega depois o aviso de estorno do próprio provedor, que o sistema reconhece);
--      34 o provedor aceitou o pedido e ainda não devolveu; 35 o banco de quem apoiou recusou e a devolução foi para
--      reembolso manual; 36 também, e uma pessoa já devolveu por fora (concluir_reembolso_manual); 37 falhou por
--      falta de saldo e vai tentar de novo; 38 ainda está na fila.
--    Campanha 15 (projeto cancelado): tudo devolvido. Campanha 16 (moderação): os Pix devolvidos, o cartão na fila.
DO $$
BEGIN
    PERFORM public.concluir_estorno(32, 1500.00);
    PERFORM public.concluir_estorno(33, 1200.00);
    PERFORM public.registrar_falha_estorno(34, NULL, TRUE, 1000.00, TRUE);
    PERFORM public.registrar_falha_estorno(35, 'O banco de quem apoiou recusou a devolução: a conta de origem foi encerrada.', FALSE);
    PERFORM public.registrar_falha_estorno(36, 'O banco de quem apoiou recusou a devolução: a conta de origem foi encerrada.', FALSE);
    PERFORM public.registrar_falha_estorno(37, 'Saldo insuficiente no provedor para fazer a devolução.', TRUE);
    PERFORM pg_temp.datar(pg_temp.dia(-9));
END;
$$;
SELECT pg_temp.cobranca(32, 'PAYMENT_REFUNDED', 'reembolsado', pg_temp.dia(-9) + INTERVAL '5 minutes', 'sem_mudanca');

DO $$
BEGIN
    PERFORM set_config('app.id_usuario_atual', '1', TRUE);
    PERFORM public.concluir_reembolso_manual(36, 600.00,
        'Devolvido por transferência Pix manual para a nova conta informada por quem apoiou; comprovante guardado no atendimento.');
    PERFORM set_config('app.id_usuario_atual', '', TRUE);
    PERFORM pg_temp.datar(pg_temp.dia(-6));

    PERFORM public.concluir_estorno(59, 1000.00);
    PERFORM public.concluir_estorno(60, 700.00);
    PERFORM public.concluir_estorno(61, 500.00);
    PERFORM pg_temp.datar(pg_temp.dia(-7));

    PERFORM public.concluir_estorno(62, 600.00);
    PERFORM public.concluir_estorno(63, 400.00);
    PERFORM pg_temp.datar(pg_temp.dia(-11));
END;
$$;

-- 9. Os Pix que não foram pagos a tempo. O 24 venceu pelo aviso do provedor (PAYMENT_OVERDUE); o 23 e o 25, pela
--    tarefa automática (expirar_contribuicoes_pendentes, 05), 24 horas depois de criados; a cobrança do 25 foi
--    cancelada no provedor (marcar_cobranca_cancelada). O 26 nunca chegou a ter cobrança: é uma órfã e vira 'erro'
--    (encerrar_contribuicoes_orfas, 05) uma hora depois. O 22 foi gerado há 2 horas e continua esperando o pagamento.
SELECT pg_temp.cobranca(24, 'PAYMENT_OVERDUE', 'expirado', pg_temp.dia(-4), 'aplicado');
DO $$
BEGIN
    PERFORM public.expirar_contribuicoes_pendentes();
    UPDATE auditoria_financeira a SET timestamp = c.criado_em + public.config_numero('pix_validade_horas', 24) * INTERVAL '1 hour'
    FROM contribuicao c
    WHERE a.id_contribuicao = c.id_contribuicao AND a.timestamp >= (SELECT inicio FROM seed_relogio);
    PERFORM public.marcar_cobranca_cancelada(25);
    PERFORM pg_temp.datar(pg_temp.dia(-1) + INTERVAL '15 minutes');
    PERFORM public.encerrar_contribuicoes_orfas();
    PERFORM pg_temp.datar(pg_temp.dia(-0.1) + INTERVAL '1 hour');
END;
$$;

-- 10. A caixa de entrada de avisos que o sistema não resolve sozinho (tela Eventos de Pagamento):
--     - pagamento que chegou para um Pix já vencido (23): o dinheiro entrou, mas não conta na arrecadação; em revisão
--       manual, esperando alguém devolver no provedor. O mesmo com o 24, que o Admin já resolveu (resolver_revisao_pagamento);
--     - aviso de um pagamento que nenhuma contribuição conhece, recebido há 2 horas: fica para tentar de novo;
--     - outro igual, de 30 horas atrás: a conferência desistiu de achar o dono e o mandou para revisão manual com o
--       mesmo texto do Nest (pagamento.service.reconcile.ts);
--     - aviso de cobrança criada (PAYMENT_CREATED), que o sistema grava e ignora.
SELECT pg_temp.cobranca(23, 'PAYMENT_RECEIVED', 'confirmado', pg_temp.dia(-1), 'revisao_manual');
SELECT pg_temp.cobranca(24, 'PAYMENT_RECEIVED', 'confirmado', pg_temp.dia(-3), 'revisao_manual');
DO $$
DECLARE
    v_id INT;
BEGIN
    PERFORM set_config('app.id_usuario_atual', '1', TRUE);
    PERFORM public.resolver_revisao_pagamento(
        (SELECT a.id_evento_pagamento FROM auditoria_financeira a
         WHERE a.id_contribuicao = 24 AND a.evento = 'pagamento_recebido_em_revisao_manual'),
        'Valor devolvido pelo painel do provedor a quem pagou o Pix vencido.');
    PERFORM set_config('app.id_usuario_atual', '', TRUE);
    PERFORM pg_temp.datar(pg_temp.dia(-2));

    v_id := pg_temp.aviso('PAYMENT_RECEIVED', 'payment', 'pay_seed_901', NOW() - INTERVAL '2 hours');
    PERFORM public.aplicar_evento_pagamento(v_id, 'seed', 'pay_seed_901', 'confirmado');
    PERFORM pg_temp.datar(NOW() - INTERVAL '2 hours');

    v_id := pg_temp.aviso('PAYMENT_RECEIVED', 'payment', 'pay_seed_902', NOW() - INTERVAL '30 hours');
    PERFORM public.aplicar_evento_pagamento(v_id, 'seed', 'pay_seed_902', 'confirmado');
    PERFORM public.mandar_evento_para_revisao(v_id,
        'Dinheiro recebido no provedor sem contribuição correspondente no sistema. Confira no provedor de onde veio e, se for o caso, devolva.');
    PERFORM pg_temp.datar(NOW() - INTERVAL '6 hours');

    v_id := pg_temp.aviso('PAYMENT_CREATED', 'payment', 'pay_seed_022', (SELECT criado_em FROM contribuicao WHERE id_contribuicao = 22));
    PERFORM public.aplicar_evento_pagamento(v_id, 'seed', 'pay_seed_022', NULL);
    PERFORM pg_temp.datar((SELECT criado_em FROM contribuicao WHERE id_contribuicao = 22));
END;
$$;

-- 11. Contestações (RF-033), uma de cada situação: o Eduardo contesta a dele e espera a análise; o Vinícius contestou
--     uma das dele e o Admin recusou; o Gabriel provou que a denúncia era falsa e o Admin aceitou (a denúncia vira
--     improcedente e a nota se recalcula). Quem julgou a denúncia (o Moderador Sistema) nunca decide a contestação.
DO $$
BEGIN
    PERFORM set_config('app.id_usuario_atual', '16', TRUE);
    PERFORM public.contestar_denuncia(5, 'O vínculo com a universidade existe; trabalho como pesquisador voluntário no laboratório.');
    PERFORM pg_temp.datar(pg_temp.dia(-66));
    PERFORM set_config('app.id_usuario_atual', '1', TRUE);
    PERFORM public.decidir_contestacao(5, FALSE, 'A universidade confirmou por escrito que não há vínculo de nenhum tipo.');

    PERFORM set_config('app.id_usuario_atual', '17', TRUE);
    PERFORM public.contestar_denuncia(13, 'As fotos são do meu trabalho de campo; enviei os arquivos originais com os dados de localização.');
    PERFORM pg_temp.datar(pg_temp.dia(-10));
    PERFORM set_config('app.id_usuario_atual', '1', TRUE);
    PERFORM public.decidir_contestacao(13, TRUE, 'Os arquivos originais comprovam a autoria das fotos. A denúncia não procede.');

    PERFORM set_config('app.id_usuario_atual', '12', TRUE);
    PERFORM public.contestar_denuncia(4, 'O título de mestre foi emitido pela UFBA; anexei o diploma ao perfil. Peço a revisão.');
    PERFORM pg_temp.datar(pg_temp.dia(-1));
    PERFORM set_config('app.id_usuario_atual', '', TRUE);
END;
$$;

-- Nada do que foi gravado acima pode ter ficado com a hora da montagem do banco.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auditoria_financeira WHERE timestamp >= (SELECT inicio FROM seed_relogio))
       OR EXISTS (SELECT 1 FROM evento_pagamento WHERE recebido_em >= (SELECT inicio FROM seed_relogio)
                     OR processado_em >= (SELECT inicio FROM seed_relogio))
       OR EXISTS (SELECT 1 FROM campanha WHERE encerrado_em >= (SELECT inicio FROM seed_relogio))
       OR EXISTS (SELECT 1 FROM repasse WHERE criado_em >= (SELECT inicio FROM seed_relogio)) THEN
        RAISE EXCEPTION 'seed: sobrou registro sem data em [07-H-5]';
    END IF;
END;
$$;

-- [07-E-8] recompensa, link_recompensa e contribuicao_recompensa
-- Recompensas simbólicas (RF-099 a RF-101), sem estoque: os três tipos, uma desativada e um link especial (que só o
-- dono, o admin e quem ganhou enxergam). Cada contribuição paga de quem tem conta ganha a maior recompensa ativa que o
-- valor dela alcançou; as abaixo de todos os mínimos ficam sem recompensa, como no uso real.
INSERT INTO recompensa (id_campanha, titulo, descricao, valor_minimo, tipo, ativo, criado_em)
SELECT v.id_campanha, v.titulo, v.descricao, v.valor_minimo, v.tipo::tipo_recompensa, v.ativo, c.criado_em + INTERVAL '1 day'
FROM (VALUES
    (1, 'Seu nome nos agradecimentos', 'O nome de quem apoiou aparece nos agradecimentos do artigo publicado.', 1000.00, 'reconhecimento', TRUE),
    (1, 'Acesso aos dados da pesquisa', 'O conjunto de dados anonimizado usado no treino do algoritmo.', 2500.00, 'digital', TRUE),
    (2, 'Seu nome no site do projeto', NULL, 250.00, 'reconhecimento', TRUE),
    (2, 'Testar o aplicativo antes do lançamento', 'Convite para a versão de testes do assistente de leitura.', 1000.00, 'acesso_antecipado', TRUE),
    (3, 'Agradecimento no relatório final', NULL, 50.00, 'reconhecimento', TRUE),
    (3, 'Ler os resultados antes da publicação', NULL, 500.00, 'acesso_antecipado', TRUE),
    (3, 'Vídeo dos bastidores do laboratório', 'Retirada pelo pesquisador: o vídeo não pôde ser gravado.', 1500.00, 'digital', FALSE)
) AS v(id_campanha, titulo, descricao, valor_minimo, tipo, ativo)
JOIN campanha c ON c.id_campanha = v.id_campanha;

INSERT INTO link_recompensa (id_recompensa, id_tipolink, ordem, url)
SELECT r.id_recompensa, (SELECT id_tipolink FROM tipo_link WHERE codigo = 'GITHUB'), 0, 'https://github.com/crowdacademico-dados'
FROM recompensa r WHERE r.id_campanha = 1 AND r.tipo = 'digital';

INSERT INTO contribuicao_recompensa (id_contribuicao, id_recompensa, adquirida_em)
SELECT c.id_contribuicao, escolhida.id_recompensa, c.criado_em
FROM contribuicao c
CROSS JOIN LATERAL (
    SELECT r.id_recompensa FROM recompensa r
    WHERE r.id_campanha = c.id_campanha AND r.ativo AND r.valor_minimo <= c.valor
    ORDER BY r.valor_minimo DESC LIMIT 1
) escolhida
WHERE c.id_campanha IN (1, 2, 3)
  AND c.id_usuario IS NOT NULL
  AND c.status IN ('confirmado', 'repassado', 'a_devolver', 'devolvido', 'reembolso_manual');

-- [07-D-7] notificacao
-- As funções que o seed chamou acima (rejeitar, encerrar, devolver, decidir, suspender) já puseram os e-mails delas na
-- fila, como no uso real ([05-Q]). Aqui eles viram "enviados" na hora em que foram criados (provedor 'seed'), para o
-- worker não mandar tudo de uma vez ao subir; e entram três casos para a aba Notificações mostrar cada situação: um
-- esperando nova tentativa, dois que falharam (um por tentativas esgotadas, outro por endereço recusado) e um cancelado.
UPDATE notificacao
   SET status = 'enviado', tentativas = 1, enviado_em = criado_em, provedor = 'seed', dados = dados - 'segredo'
 WHERE status = 'pendente';

INSERT INTO notificacao (id_usuario, email_destinatario, tipo_evento, dados, status, tentativas, criado_em, proxima_tentativa_em, provedor, assunto, ultimo_erro)
SELECT u.id_usuario, u.email, v.tipo, jsonb_build_object('nome', u.nome) || v.dados, v.status::status_notificacao, v.tentativas,
       NOW() - v.idade, NOW() + v.espera, v.provedor, v.assunto, v.erro
FROM (VALUES
    (15, 'nova_atualizacao', jsonb_build_object('id_campanha', 1, 'titulo', (SELECT titulo FROM campanha WHERE id_campanha = 1), 'titulo_atualizacao', 'Primeiros resultados'),
     'pendente', 2, INTERVAL '1 hour', INTERVAL '2 hours', 'brevo', 'Nova atualização na campanha que você segue',
     'O provedor recusou por excesso de envios no minuto (429); nova tentativa agendada'),
    (16, 'pesquisador_reativado', '{}'::jsonb, 'falhou', 5, INTERVAL '50 days', INTERVAL '0 seconds', 'brevo',
     'Seu perfil de pesquisador foi reativado', 'O provedor não respondeu (tempo esgotado) em 5 tentativas'),
    (20, 'devolucao_concluida', jsonb_build_object('id_campanha', 2, 'titulo', (SELECT titulo FROM campanha WHERE id_campanha = 2), 'valor', 50),
     'falhou', 1, INTERVAL '15 days', INTERVAL '0 seconds', 'brevo', 'Sua contribuição foi devolvida',
     'Endereço recusado pelo servidor de destino (550 mailbox not found)'),
    (14, 'nova_atualizacao', jsonb_build_object('id_campanha', 3, 'titulo', (SELECT titulo FROM campanha WHERE id_campanha = 3), 'titulo_atualizacao', 'Mudança de cronograma'),
     'cancelado', 0, INTERVAL '3 days', INTERVAL '0 seconds', NULL, NULL, 'Cancelado no painel: a atualização foi retirada')
) AS v(id, tipo, dados, status, tentativas, idade, espera, provedor, assunto, erro)
JOIN usuario u ON u.id_usuario = v.id;

-- [07-H-4] termos_de_uso: rascunhos da próxima versão (v3, id 5 e 6), feitos a partir da vigente com uma seção nova.
-- Ainda não publicados (ativo = FALSE) e sem aceite: a tela mostra "Rascunho" e deixa editar e excluir. Entram
-- depois de todos os aceites porque um rascunho não muda a versão que valia em cada data. A quebra de linha da
-- seção nova (\1) é a do próprio texto: o arquivo pode estar salvo com quebra do Windows ou do Linux.
INSERT INTO termos_de_uso (tipo, versao, conteudo, ativo, criado_em)
SELECT tipo, 'v3-rascunho', regexp_replace(conteudo, '11\. FORO(\r?\n)', '11. COMUNICAÇÕES\1As comunicações da plataforma (versão nova destes Termos, decisão de denúncia, encerramento de campanha apoiada) são enviadas para o e-mail cadastrado. O usuário é responsável por mantê-lo atualizado.\1\112. FORO\1'), FALSE, NOW()
FROM termos_de_uso WHERE tipo = 'cadastro' AND ativo;
INSERT INTO termos_de_uso (tipo, versao, conteudo, ativo, criado_em)
SELECT tipo, 'v3-rascunho', regexp_replace(conteudo, '6\. ALTERAÇÕES DESTE TERMO(\r?\n)', '6. CONTESTAÇÃO DE DENÚNCIAS\1O pesquisador pode contestar uma vez cada denúncia julgada procedente contra o perfil ou contra uma campanha dele. A contestação é decidida por outra pessoa da moderação, nunca por quem julgou a denúncia.\1\17. ALTERAÇÕES DESTE TERMO\1'), FALSE, NOW()
FROM termos_de_uso WHERE tipo = 'upgrade_pesquisador' AND ativo;

-- ----------------------------------------------------------------------------
-- RESUMO DA DEMONSTRAÇÃO: o que cada pessoa mostra e por que cai na faixa de score que cai. Nenhum número foi
-- digitado à mão em score_atual: tudo sai das triggers de recálculo (05) sobre os dados acima.
--
--                     Perfil acad. Histórico Atualização Reputação  Total  Faixa
-- Ana       (8)            30          25          20         25     100  Referência
-- Bruno     (9)            16          18          14         25      73  Confiável
-- Renata    (11)            8          25           5         25      63  Confiável
-- Beatriz   (13)           24          10           2         25      61  Confiável
-- Carlos    (10)           14          10           5         25      54  Confiável
-- Juliana   (14)           14          10           0         25      49  Em Construção
-- Eduardo   (12)            8          10           5         22      45  Em Construção
-- Patrícia  (15)            8          10           0         25      43  Em Construção
-- Vinícius  (16)            4          10           0         10      24  Atenção
-- Gabriel   (17)            4           0           0         18      22  Atenção
--
-- Ana: Lattes, ORCID e ResearchGate, instituição e título (30); duas campanhas de sucesso e nenhuma rejeitada (25);
--   publica atualizações com regularidade (20); nenhuma denúncia procedente. A improcedente contra a campanha 3
--   não pesa. Na campanha 3 (ativa) estão todos os estados de um apoio em andamento.
-- Bruno: um sucesso e uma não atingida dão metade da conclusão (7,5) mais a aprovação inteira (10). A campanha 5
--   mostra cada devolução numa situação; a 20 espera na fila com o checklist incompleto.
-- Renata: o sucesso da campanha 8 vale a conclusão inteira; o repasse espera a chave Pix dela. A 18 voltou para a
--   fila depois de uma rejeição (rejeição corrigida não pesa: só a definitiva, a de campanha apagada).
-- Beatriz: duas campanhas ativas (o limite de campanhas simultâneas), com pedidos de encerramento esperando.
-- Carlos: a não atingida flexível conta como não concluída (0 na conclusão). A transferência dela falhou.
-- Juliana: a campanha "Em breve" já foi aprovada (10), mas ainda não começou. Tem também um rascunho.
-- Eduardo: o encerramento antes do prazo aprovado pelo admin conta como não concluída; 1 denúncia procedente
--   contra o perfil (a parte "perfil" da reputação cai a 6,67), contestada e esperando análise.
-- Patrícia: o projeto cancelado por ela não entra na conclusão (só o encerramento aprovado pelo admin entra); a 14
--   está rejeitada, com reenvio disponível.
-- Vinícius: 3 denúncias procedentes contra o perfil zeram a parte "perfil"; a campanha 16, encerrada por
--   moderação, conta como 1 campanha denunciada (15 vira 10). Uma das denúncias foi contestada e a contestação
--   recusada. Também está com o aceite do termo de pesquisador pendente.
-- Gabriel: pesquisador novo, sem campanha aprovada; 2 das 3 denúncias contra o perfil seguem procedentes (a
--   terceira caiu pela contestação aceita): 3,33 + 15 = 18.
-- ----------------------------------------------------------------------------

-- [07-D-5] Como logar no app depois deste seed (autenticação própria, ver DOCUMENTACAO_BD.md)

-- [07-I-3] Backfill de segurança: cada INSERT acima (perfil_pesquisador, link_academico, campanha,
-- atualizacao_campanha, denuncia) já dispara sua própria trigger de recálculo (ver 05_regras_negocio.sql,
-- [05-I-4]), então quando o seed chega aqui os scores dos 11 pesquisadores já deveriam estar corretos. Esta
-- chamada existe só como rede de segurança: reprocessa todo mundo do zero, caso alguma trigger seja
-- desligada/alterada no futuro e alguém esqueça de rodar isso manualmente depois.
SELECT public.recalcular_todos_os_scores();

-- Volta o fuso da conexão ao padrão (ver o SET TIME ZONE no início deste arquivo).
RESET TIME ZONE;
