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
--  até o primeiro uso real da aplicação). ATUALIZADO (27-07-2026): eram 26 -
--  termos_de_uso, usuario_termo, aceite_termo_contribuicao e notificacao
--  estavam vazias e passaram a ser semeadas (ver Achado A5/A6 em
--  PENDENCIAS e correcoes.md).
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

-- CORRIGIDO (28-07-2026, item 13-quinto-ponto da Lista C - consolidação de
-- constantes): peso mudou de 10/15 pra 1/3. Antes, esses pesos não eram lidos
-- por nenhuma função (calcular_score_reputacao usava score_custo_denuncia/
-- score_custo_denuncia_procedente, duas chaves soltas em configuracoes, com
-- valores 1 e 3) - o Painel Admin editando estes dois "pesos" aqui não movia
-- nada de verdade. Agora calcular_score_reputacao lê 1 e 3 daqui - os mesmos
-- valores de sempre, só que de uma fonte que o painel realmente controla.
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
-- ATUALIZADO (03-08-2026): `codigo` novo (01, [01-B]) - seedado igual ao
-- `nome` de cada papel, de propósito (o texto que as 3 triggers já
-- procuravam continua sendo o mesmo, só que agora numa coluna que `nome`
-- nunca mais pode acidentalmente deixar de bater).
-- Ordem = maior poder -> menor poder (mesma ordem de ORDEM_PAPEIS_POR_PODER,
-- matriz-papel-permissao.jsx) só para os IDs saírem bonitinhos (1=admin...
-- 7=usuario) num banco novo. Não referenciado por número em nenhum lugar
-- (papel_permissao e usuario_papel, abaixo, buscam papel por `nome`), então
-- reordenar aqui é seguro e não quebra nada além do id_papel gerado.
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
-- ORDENADO (07-08-2026, pedido do Lucas: "mesma ideia do papel, mas pras
-- permissões"): agrupado por domínio, na mesma ordem das letras do Índice
-- Global (ver DOCUMENTACAO_BD.md) - A, B, C, D, E, F, H, I, L (G/J/K não têm
-- nenhuma permissão própria hoje). Só id_permissao sai bonitinho/agrupado -
-- papel_permissao (abaixo, [07-B-3]) resolve por NOME, nunca por número,
-- então reordenar aqui não quebra nada (mesmo raciocínio já usado pra
-- reordenar `papel`, 03-08-2026).
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
-- ver nota completa em link_academico_gerenciar (grupo F) - as duas foram
-- adicionadas juntas pra fechar 100% das RLS policies sem eh_admin().
('arquivo_gerenciar'),
-- D - USUÁRIO (Contas, Perfis, Autenticação, Termos e Sessões)
('usuario_suspender'),
('usuario_visualizar_sensivel'),
-- ATUALIZADO (28-07-2026): cpf_criptografado entrou no GRANT SELECT de
-- perfil_pesquisador (06) - a coluna já pode ser lida pelo app_nestjs. Esta
-- permissão passa a ser o gate real de quem, na camada NestJS, pode de fato
-- pedir esse dado (não existe policy de RLS pra proteção de coluna - RLS só
-- filtra linha; o controle de "quem lê o CPF" é responsabilidade da aplicação).
('perfil_pesquisador_visualizar_sensivel'),
-- ADICIONADA (22-08-2026) - gate de corrigir_cpf_pesquisador() (03, [03-Q]).
-- cpf_criptografado/cpf_hash saíram do GRANT UPDATE direto de
-- perfil_pesquisador (06) porque o próprio pesquisador conseguia alterar o
-- próprio CPF (contrariando o RF-017, correção só via suporte) - esta é a
-- permissão que decide quem pode chamar a função de correção.
('perfil_pesquisador_corrigir_cpf'),
('termos_uso_gerenciar'),
-- NOTA: estas 3 são propositalmente sem policy de RLS - verificacao_email,
-- recuperacao_senha e sessao já têm policy FOR ALL USING(true) de propósito (o
-- projeto decidiu que a autorização desses fluxos fica no NestJS, não na RLS,
-- porque acontecem antes de existir sessão de usuário). Criar policy pra elas
-- seria redundante.
('sessao_revogar'),
('recuperacao_senha_revogar'),
('verificacao_email_reenviar'),
-- CORRIGIDO: o worker de envio de notificação precisava de uma permissão pra ler
-- a fila (pol_notificacao_select, 04) - antes disso, só dava pra rodar o worker
-- emprestando 'usuario_visualizar_sensivel', que não tem nada a ver com fila de
-- notificação e quebraria o envio de e-mail se alguém restringisse essa permissão
-- por motivo de privacidade no futuro sem perceber a dependência.
('notificacao_processar'),
-- ADICIONADO (28-07-2026, Claude Web - "Problema 1" da 2ª auditoria de segurança):
-- excluir_conta_usuario/liberar_bloqueio_login (03, [03-O]) são SECURITY DEFINER -
-- desligam a RLS, então a checagem de "quem pode agir sobre a conta de outra
-- pessoa" precisa estar dentro da própria função. usuario_excluir gateia excluir
-- a conta de OUTRO usuário (a própria sempre é permitida, sem a permissão);
-- usuario_desbloquear gateia liberar_bloqueio_login por inteiro - é sempre ação
-- de suporte/admin sobre a conta de outra pessoa, nunca do próprio usuário.
('usuario_excluir'),
('usuario_desbloquear'),
-- E - CAMPANHA (Campanhas, Atualizações, Comentários, Denúncias, Recompensas)
('campanha_aprovar'),
('campanha_rejeitar'),
('campanha_editar'),
('denuncia_responder'),
-- ADICIONADA (04-09-2026, RF-108): antes disso, encerrar campanha por
-- moderação exigia campanha_aprovar/campanha_rejeitar/solicitacao_
-- encerramento_decidir (só o admin tinha as três) - um moderador julgava a
-- denúncia procedente mas não conseguia agir sobre o próprio julgamento.
-- Permissão estreita de propósito: só a transição ativo -> encerrado_
-- moderacao, ver fn_valida_transicao_campanha (05, [05-K-2]).
('campanha_encerrar_moderacao'),
('solicitacao_encerramento_decidir'),
('comentario_moderar'),
('atualizacao_moderar'),
('repasse_aprovar'),
-- F - LINK (Vinculação de URLs Externas)
-- ADICIONADO: junto com arquivo_gerenciar (grupo C) - as duas únicas
-- permissões que faltavam para remover eh_admin() de 100% das RLS policies
-- (ver RBAC-pontos-discutidos.md).
('link_academico_gerenciar'),
-- H - CONTRIBUIÇÃO (Apoios, Auditoria e Termos Financeiros)
('contribuicao_visualizar_sensivel'),
('auditoria_financeira_visualizar'),
-- I - SCORE (Parâmetros, Rótulos e motor de cálculo)
('score_editar'),
-- ADICIONADO (28-07-2026, item 12 da Lista C - score deixa de ser público):
-- pol_score_select (04) passou a exigir esta permissão pra ver score de
-- terceiros; o próprio pesquisador continua vendo o próprio score sem ela.
('score_visualizar'),
-- L - LOG DE AUDITORIA
-- ADICIONADO (03-08-2026): gate de SELECT em log_auditoria (ver
-- pol_log_auditoria_select, 04_rls_policies.sql [04-L]) - sem esta
-- permissão, ninguém (nem admin, até este INSERT rodar) consegue ler o
-- histórico de quem alterou o quê. trg_permissao_auto_admin (05,
-- [05-K-3]) já concede ela ao papel 'admin' sozinho assim que a linha
-- abaixo é inserida - a linha explícita em [07-B-3] é só documentação,
-- mesmo padrão das outras permissões desta lista.
('log_visualizar')
ON CONFLICT (nome) DO NOTHING;


-- [07-B-3] papel_permissao: por que as linhas ('admin', ...) estão explícitas mesmo sendo redundantes com a trigger (ver DOCUMENTACAO_BD.md)
-- ORDENADO (07-08-2026, pedido do Lucas: "mesma lógica" do papel/permissao):
-- dentro do admin, as 32 permissões seguem a MESMA ordem por domínio de
-- [07-B-2] (A,B,C,D,E,F,H,I,L) - puramente cosmético, o WHERE...IN não liga
-- pra ordem das linhas, só ajuda quem lê o arquivo a achar as coisas. Os
-- grupos de papel também passaram a seguir a ordem de poder (admin ->
-- moderador -> revisor -> suporte -> curador - mesma de ORDEM_PAPEIS_POR_
-- PODER, matriz-papel-permissao.jsx); moderador/revisor/curador/suporte já
-- vinham naturalmente agrupados por domínio, não precisaram de reordenação
-- interna.
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
    -- ADICIONADA (04-09-2026, RF-108): fecha o ciclo de julgar uma denúncia
    -- e agir sobre ela sem precisar do admin - ver nota em [07-B-2].
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
    -- ADICIONADO (28-07-2026): desbloquear login é atendimento de conta - mesmo
    -- escopo das outras 3 permissões de 'suporte' acima.
    -- CORRIGIDO (28-07-2026, Claude Web - 4ª auditoria, decisão de produto):
    -- usuario_excluir NÃO fica com 'suporte' - Catarse/Experiment tratam
    -- exclusão de conta como auto-serviço do titular (que já funciona sem
    -- nenhuma permissão, ver excluir_conta_usuario em 03, [03-O]); suporte abre
    -- chamado, não executa. Só o admin mantém a permissão.
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
-- CORRIGIDO: tipo_link ajustado para a allowlist fechada definida pela equipe.
-- ADICIONADO (28-07-2026): coluna codigo (ver [01-C]) - chave natural estável,
-- usada pelo link_academico logo abaixo em vez do id posicional.
-- ATUALIZADO (28-07-2026, item 15 da Lista C - decisão da Alexia, "mantém, e
-- configura"): link_atualizacao/link_recompensa ficavam impossíveis de usar
-- porque os 3 campos de escopo caíam todos no DEFAULT (só permite_perfil=TRUE).
-- ATUALIZAÇÂO (15-08-2026):  SITE_INSTITUCIONAL/OUTRO removidos pois permitiam links sem verificação.
INSERT INTO tipo_link (codigo, nome, ativo, regex, dominio, permite_perfil, permite_atualizacao, permite_recompensa) VALUES
('LATTES',             'Lattes',               TRUE,  '^https?://lattes\.cnpq\.br/\d+$',                     '{lattes.cnpq.br}',   TRUE, FALSE, FALSE),
('ORCID',              'ORCID',                TRUE,  '^https?://orcid\.org/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$',   '{orcid.org}',        TRUE, FALSE, FALSE),
('RESEARCHGATE',       'ResearchGate',         TRUE,  '^https?://(www\.)?researchgate\.net/profile/[\w\-]+$', '{researchgate.net}', TRUE, FALSE, FALSE),
('LINKEDIN',           'LinkedIn',             TRUE,  '^https?://(www\.)?linkedin\.com/in/[\w\-]+/?$',        '{linkedin.com}',     TRUE, FALSE, FALSE),
('GITHUB',             'GitHub',               TRUE,  '^https?://(www\.)?github\.com/[\w\-]+/?$',             '{github.com}',       TRUE, TRUE,  TRUE);

-- [07-C-2] area_conhecimento
-- CORRIGIDO: área de conhecimento adicionada para o valor Multidisciplinar.
-- ADICIONADO (27-07-2026): descido pro 2º nível do CNPq (grande área -> área),
-- pedido explícito da Alexia ("Ciências da Saúde" cobrindo de odontologia a
-- saúde coletiva era amplo demais pro filtro de busca funcionar de verdade) -
-- id_pai aponta pra grande área raiz correspondente (mesmo padrão de
-- score_config/id_pai, ver [01-I]). Decisão tomada junto: campanha agora É
-- OBRIGADA a escolher uma área de nível 2 (trigger em 05, ver [05-K-1]).
--
-- CORRIGIDO (28-07-2026) - dígito verificador removido do codigo_cnpq: a
-- primeira versão deste seed guardava o código completo (ex.: '1.03.00.00-7'),
-- mas os dígitos verificadores não vieram de nenhuma fonte conferida (tentei
-- buscar a tabela oficial do CNPq/Lattes duas vezes, em duas sessões
-- diferentes, e os PDFs não deram pra extrair de forma confiável nas duas).
-- Prova de que os dígitos que tinham sido digitados não eram reais: nos
-- códigos de grande área só o primeiro dígito é diferente de zero, então em
-- qualquer esquema real de dígito verificador por soma ponderada (mod 10 ou
-- mod 11 - o mesmo princípio de CPF/CNPJ/PIS), o dígito seria função só desse
-- primeiro número; o seed tinha DV(1) = DV(7) = 3, o que matematicamente só
-- permite 1 ou 2 resultados distintos possíveis pros 9 valores - e o seed
-- tinha 8 valores distintos. Impossível vir de um algoritmo de verdade.
-- Decisão: guardar só 'X.YY.00.00', sem o dígito. O dígito verificador serve
-- pra pegar erro de digitação quando um humano transcreve o código num
-- formulário de papel - aqui, codigo_cnpq é comparado por igualdade, nunca
-- digitado à mão, então o dígito não protegia nada e era justamente a única
-- parte do dado que ninguém conseguia conferir. Os nomes das áreas e a que
-- grande área cada uma pertence continuam corretos e confiáveis (nomenclatura
-- padrão e estável do CNPq, usada em qualquer edital de pesquisa brasileiro) -
-- isso fecha o item 35 do PENDENCIAS com essa justificativa, em vez de deixar
-- pendente esperando um PDF que não abre.
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
-- ADICIONADO (27-07-2026): 5 motivos novos (CAMP-005 a 008, PERF-004) - categorias
-- que a moderação vai precisar rápido e que os 7 originais não cobriam. Puro dado
-- de catálogo, sem decisão de negócio nenhuma envolvida (mesmo padrão dos 7 já
-- existentes). PERF-004 (vínculo institucional falso) é diferente de PERF-001
-- (dados acadêmicos falsos, mais genérico) - ficou mais relevante depois que
-- perfil_pesquisador.vinculo_institucional virou NOT NULL.
-- Sem `codigo` (18-08-2026, coluna removida - ver 01_extensoes_enums_tabelas.sql)
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
-- CORRIGIDO: seed de usuário passou a usar criado_em.
-- CORRIGIDO (02-08-2026, achado do Lucas testando o painel admin): os
-- senha_hash abaixo eram placeholders FALSOS (tipo '$2b$12$hashed_ana001'),
-- nunca gerados pelo bcrypt de verdade - ou seja, NENHUM usuário do seed
-- conseguia logar, nem sabendo a senha certa, porque não existia senha
-- nenhuma por trás. Trocado por um hash bcrypt de verdade (custo 10, igual
-- CUSTO_BCRYPT em usuario.service.create.ts/update.ts), o MESMO pra
-- TODOS - só pra dev/seed, nunca em produção:
--   senha de todo mundo no seed = DevTcc123!
-- Gerado com `bcrypt.hash('DevTcc123!', 10)` e conferido com
-- `bcrypt.compare()` antes de entrar aqui. Serve pra logar como qualquer
-- papel (admin, moderador, pesquisador, usuario comum etc.) só trocando o
-- e-mail - ver a lista de e-mail/papel logo abaixo, em usuario_papel.
--
-- REORGANIZADO (07-08-2026, pedido do Lucas: "queria ver admin com o id
-- 1"): ordem agora é por poder (admin -> moderador -> revisor -> suporte
-- -> curador -> pesquisador -> usuario), igual já foi feito em `papel`
-- (03-08-2026). De quebra, corrige uma inconsistência que já existia no
-- arquivo: Admin estava na 1ª posição aqui, mas usuario_papel/perfil_
-- pesquisador/campanha/etc. (mais abaixo) ainda assumiam a ordem ANTIGA
-- (Ana=1...Admin=8) - um resquício de reorganização parcial de antes desta
-- sessão, nunca propagada pro resto do arquivo. Esta rodada corrigiu TODOS
-- os IDs numéricos do arquivo pra baterem com a ordem nova.
--
-- NOVO (07-08-2026, pedido do Lucas): "Admin Sistema 2" - segundo admin de
-- teste, pra sempre ter um admin de reserva se o primeiro fizer alguma
-- besteira só outro admin consegue desfazer. E 5 contas "Sistema" (uma por
-- papel, além de admin) - testes rápidos e intuitivos, sem nome de gente,
-- pra somar ao <dev> "Entrar como" (dev-login-rapido.jsx).
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
-- Continuam pesquisadores (confirmado com o Lucas, 07-08-2026): já têm um
-- "laboratório de teste" inteiro montado (perfil, campanha, denúncias,
-- links) desenhado pra cobrir as 4 faixas de score_rotulo - virar "usuario
-- comum" apagaria tudo isso. Só a posição/ID mudou, pra ficarem agrupados
-- com o resto dos pesquisadores.
('Bruno Tavares Costa',    'bruno.tavares@ufrgs.br',    '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-05-20 09:00:00'),
('Renata Vasconcelos Dias','renata.vasconcelos@ufpr.br','$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-05-22 09:00:00'),
('Eduardo Barbosa Nogueira','eduardo.barbosa@ufba.br',  '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-05-25 09:00:00'),
('Vinícius Almeida Ferraz','vinicius.ferraz@ufc.br',    '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-05-28 09:00:00'),

('Fernanda Souza Lima',   'fernanda.souza@gmail.com',            '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:00'), -- usuario comum (apoiador, nunca virou pesquisador)
-- ADICIONADOS (22-08-2026, pedido do Lucas): mais 2 contas "usuario comum"
-- zeradas, sem NENHUMA dependência (sem campanha, sem link, sem denúncia) -
-- pra sempre sobrar gente pra testar fluxo de "2ª conta tentando o mesmo
-- CPF" sem precisar mexer nos 12-21 (esses são donos de campanha no seed,
-- e 19-22 foram desenhados a dedo pras 4 faixas de score_rotulo - ver
-- comentário perto do bloco de campanha). Fernanda (23) sozinha não bastava
-- pra testar duplicidade de CPF entre DUAS contas diferentes.
('Marina Alves Torres',   'marina.torres@gmail.com',             '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:01'), -- usuario comum, zerada
('Gabriel Souza Martins', 'gabriel.martins@gmail.com',           '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:02'), -- usuario comum, zerada
('Camila Rocha Pereira',  'camila.rocha@gmail.com',              '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:03'), -- usuario comum, zerada
('Rafael Costa Andrade',  'rafael.costa.andrade@gmail.com',      '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:04'), -- usuario comum, zerado
('Larissa Mendes Cunha',  'larissa.mendes@gmail.com',            '$2b$10$t/InWEsjsIoCpA9uz/E4F.hc37lCZLvpjzp3YUJui7J9fiVhyPbjG', NULL, '2024-04-10 10:00:05'); -- usuario comum, zerada


-- [07-D-2] usuario_papel
-- id_usuario é fixo (tabela usuario está vazia antes deste seed, então
-- os IDs abaixo batem com a ordem de inserção acima, atualizada
-- 07-08-2026 - ver comentário completo em [07-D-1]). id_papel é resolvido
-- por nome pelo mesmo motivo do bloco [07-B-3].
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
-- ADICIONADO (27-07-2026): as duas estavam vazias, e sustentam o RF-011 (aceite
-- obrigatório no cadastro) - o texto real dos termos entra depois, quando a
-- equipe/jurídico definir, o que faltava era a estrutura de dados existir.
-- v1 é a versão vigente durante todo o período em que os usuários deste seed
-- se cadastraram (por isso é ela que aparece em usuario_termo, abaixo). v2 é a
-- versão atual - publicada depois, ainda sem nenhum aceite registrado, cenário
-- realista de "termo novo no ar, usuários antigos ainda não foram re-avisados".
--
-- PEGADINHA (vale documentar aqui pro NestJS, quando publicar uma versão nova):
-- publicar v2 sem antes desativar v1 quebra com o erro do índice parcial
-- uq_termos_uso_ativo (02) - só pode existir 1 linha com ativo = TRUE por vez.
-- O UPDATE que desativa a versão velha e o INSERT da versão nova precisam estar
-- na MESMA transação (é o que este bloco já faz).
INSERT INTO termos_de_uso (versao, conteudo, ativo, criado_em) VALUES
('v1-2024-01-01', '[PLACEHOLDER] Texto dos Termos de Uso e Política de Privacidade - versão 1. Conteúdo jurídico definitivo entra aqui quando a equipe/jurídico validar.', FALSE, '2024-01-01 00:00:00');

UPDATE termos_de_uso SET ativo = FALSE WHERE versao = 'v1-2024-01-01';
INSERT INTO termos_de_uso (versao, conteudo, ativo, criado_em) VALUES
('v2-2025-01-01', '[PLACEHOLDER] Texto dos Termos de Uso e Política de Privacidade - versão 2 (revisão anual). Conteúdo jurídico definitivo entra aqui quando a equipe/jurídico validar.', TRUE, '2025-01-01 00:00:00');

-- Todos os usuários aceitaram a v1 no próprio cadastro (aceito_em = pouco
-- depois de usuario.criado_em) - nenhum ainda re-aceitou a v2, propositalmente.
INSERT INTO usuario_termo (id_usuario, id_termo, aceito_em, ip_aceite)
SELECT id_usuario, 1, criado_em + INTERVAL '2 minutes', '187.10.20.30'
FROM usuario;


-- [07-C-5] configuracoes: por que este bloco vem depois de usuario (ver DOCUMENTACAO_BD.md)
-- ORDENADO (07-08-2026, pedido do Lucas: "mesma lógica" do papel/permissao):
-- agrupado por domínio (A,D,E,F,H,I - mesma ordem de [07-B-2]), já que
-- configuracao.service.findall.ts ordena por id_config, então a ordem do
-- INSERT aqui embaixo é a ordem que a tela realmente mostra. Puramente
-- cosmético pra CADA CHAVE em si: `chave` é UNIQUE e toda leitura (NestJS)
-- busca por nome, nunca por posição/id_config.
--
-- REVISADO (28-07-2026, Claude Web - "Problema 3", varredura inversa: pra cada chave
-- em configuracoes, quantas vezes ela aparece lida em algum dos 8 arquivos). 4 chaves
-- não tinham NENHUM consumidor - "alavancas fantasma": o Admin muda no painel e nada
-- acontece, o que é pior que um valor fixo no código (porque parece que devia
-- funcionar). Duas (email_suporte, notificar_novas_campanhas, mais abaixo) ganharam
-- comentário explicando quem lê (NestJS, não o banco); duas saíram do seed - ver
-- motivo em cada uma, no final deste bloco.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo) VALUES
-- A
(NULL, 'email_suporte',              'suporte@crowdacademico.com.br', 'texto', 'E-mail de suporte ao usuário',   TRUE), -- lida pelo NestJS (rodapé/e-mails transacionais), não pelo banco - nenhum .sql precisa dela
-- ADICIONADA (24-08-2026, módulo 25-arquivo): chave (não URL completa) do
-- objeto no bucket usado como foto de perfil de quem nunca cadastrou uma -
-- lida por ArquivoServiceResolverAvatar (25-arquivo), nunca pelo banco.
-- NULL de propósito: qual imagem usar ainda não foi decidido pelo time.
-- Assim que decidirem, é só subir o arquivo (endpoint de upload já
-- funciona) e colar a chave aqui pelo próprio painel Admin > Configurações
-- - sem deploy novo.
(NULL, 'avatar_padrao_chave',        NULL, 'texto', 'Chave do objeto (no bucket) usado como avatar de quem não tem foto de perfil cadastrada - definir após a equipe escolher a imagem', TRUE),
-- D
(NULL, 'limite_tentativas_login',    '5',     'inteiro',  'Nº de tentativas de login falhas antes de bloquear a conta',    TRUE),
(NULL, 'bloqueio_login_minutos',     '15',    'inteiro',  'Duração do bloqueio de login após exceder o limite de tentativas (minutos)', TRUE),
-- ADICIONADAS (04-09-2026, pedido do Lucas: "vamos colocar estes dois no
-- Painel Admin") - lidas por ConfiguracaoValorService (commons/configuracao)
-- em auth.service.login.ts/auth.service.cadastro.ts, mesmo padrão dos dois
-- de cima (limite_tentativas_login/bloqueio_login_minutos). Antes eram
-- constantes fixas em 3-auth/constants/auth.constants.ts, com um comentário
-- dizendo "parâmetro técnico, não regra de negócio configurável" - revisto
-- agora: são exatamente o mesmo tipo de janela de tempo que os dois de
-- cima, então não fazia sentido tratar diferente.
(NULL, 'refresh_token_dias_validade', '30',   'inteiro',  'Por quantos dias a sessão continua válida (refresh token) antes de precisar logar de novo', TRUE),
(NULL, 'verificacao_email_horas_validade', '24', 'inteiro', 'Validade do token de verificação de e-mail, em horas', TRUE),
-- ADICIONADA (09-08-2026, Bloco G - moderação/suspensão): opções de prazo
-- sugeridas no seletor de "Suspender Usuário" do painel; lida pelo React
-- (minha-conta/alterar-usuario), não por nenhuma trigger/função do banco.
(NULL, 'suspensao_usuario_opcoes_dias', '1,3,7,30', 'texto', 'Opções de prazo (em dias) sugeridas no seletor de suspensão de usuário - lista separada por vírgula.', TRUE),
(1,   'notificar_novas_campanhas',   'true',  'booleano', 'Admin recebe e-mail sobre novas campanhas',            TRUE), -- lida pelo worker de notificação do NestJS, não pelo banco - nenhuma trigger/função a consulta
-- E
-- ADICIONADO (28-07-2026, item 16 da Lista C): prazo_minimo_campanha_dias e os
-- 3 limites de negócio (campanhas simultâneas, endossos, denúncias/24h) que
-- antes estavam fixos no corpo das triggers (05) - ver comentário no header
-- deste bloco e nas funções correspondentes. Valores idênticos aos que já
-- estavam hardcoded (15, 2, 4, 5) - nada muda no comportamento hoje, só o
-- lugar de onde o número é lido.
(NULL, 'taxa_plataforma_padrao',     '5.00',  'decimal',  'Taxa padrão cobrada pela plataforma (%)',              TRUE),
(NULL, 'prazo_minimo_campanha_dias', '15',    'inteiro',  'Duração mínima permitida de uma campanha em dias',     TRUE),
-- ATUALIZADO (28-07-2026): 90 → 60. Decisão tomada direto por você e pela
-- Alexia (não ficou mais em aberto entre "90 ou 60", ver item 16 da Lista C).
(NULL, 'prazo_maximo_campanha_dias', '60',    'inteiro',  'Duração máxima permitida de uma campanha em dias',     TRUE),
(NULL, 'limite_campanhas_simultaneas','2',    'inteiro',  'Nº máximo de campanhas simultâneas (aguardando_aprovacao/ativo) por pesquisador (RF-029)', TRUE),
(NULL, 'limite_endossos_campanha',   '4',     'inteiro',  'Nº máximo de endossos ativos simultâneos por campanha (RF-063)', TRUE),
(NULL, 'limite_denuncias_24h',       '5',     'inteiro',  'Nº máximo de denúncias por usuário dentro da janela de configuracoes.janela_denuncias_horas (RF-076)', TRUE),
-- ADICIONADO (11-08-2026, achado pela IA: metade da regra de RF-076 já era
-- configurável desde 28-07, mas a JANELA de tempo continuava fixa em 24h no
-- corpo da função - ver validar_denuncia_frequencia() em 05, [05-K-3]).
(NULL, 'janela_denuncias_horas',     '24',    'inteiro',  'Janela de tempo (em horas) usada por limite_denuncias_24h (RF-076)', TRUE),
-- ADICIONADO (28-07-2026, Claude Web - "Problema 2"): limite de negócio (menor,
-- configurável) por cima do limite técnico largo das colunas (01) - mesmo padrão
-- config + trigger do prazo de campanha (item 16).
(NULL, 'limite_caracteres_descricao_campanha',     '5000', 'inteiro', 'Nº máximo de caracteres em campanha.descricao (RF)',                        TRUE),
(NULL, 'limite_caracteres_conteudo_atualizacao',   '5000', 'inteiro', 'Nº máximo de caracteres em atualizacao_campanha.conteudo',                  TRUE),
(NULL, 'limite_caracteres_relato_denuncia',        '1000', 'inteiro', 'Nº máximo de caracteres em denuncia.relato (sugestão do Claude Web)',       TRUE),
(NULL, 'limite_caracteres_justificativa_encerramento', '2000', 'inteiro', 'Nº máximo de caracteres em solicitacao_encerramento.justificativa_pesquisador/justificativa_admin', TRUE),
(NULL, 'limite_caracteres_descricao_recompensa',   '2000', 'inteiro', 'Nº máximo de caracteres em recompensa.descricao',                            TRUE),
-- ADICIONADO (31-07-2026, Alexia; valores corrigidos 01-08-2026): orçamento e
-- cronograma estruturados (01, [01-E]). Mesmo padrão config + trigger de tudo
-- acima nesta seção - mudar o mínimo/máximo exigido, ou o limite de texto,
-- vira um UPDATE nesta tabela, não uma migração. Ver
-- fn_valida_completude_campanha_aprovacao e fn_valida_limite_max_orcamento_
-- campanha/fn_valida_limite_max_marco_cronograma (05, [05-K-2]).
-- CORRIGIDO (01-08-2026): a Alexia confundiu min/max na primeira versão - os
-- valores 10/20 eram pra ser o TETO (nº máximo permitido por campanha), não o
-- piso obrigatório pra aprovar. Mínimo virou 3 pros dois (meio-termo da faixa
-- que ela sugeriu, 2 a 5 - ajustável livremente depois, sem migração).
-- ATUALIZADO (05-09-2026): orcamento_min_itens virou 1 (não mais 3) - achado
-- conferindo REQUISITOS_V5.md (RF-039: "valores padrão de 1 (mínimo) e 10
-- (máximo)") contra o banco; decisão do Lucas foi ajustar o banco pro texto
-- oficial do requisito. cronograma_min_marcos NÃO mudou, continua 3 (RF-041
-- já cita 3 corretamente).
(NULL, 'orcamento_min_itens',                      '1',    'inteiro', 'Nº mínimo de itens de orçamento exigido para aprovar uma campanha (RF-039)', TRUE),
(NULL, 'orcamento_max_itens',                      '10',   'inteiro', 'Nº máximo de itens de orçamento permitido por campanha',                    TRUE),
(NULL, 'cronograma_min_marcos',                    '3',    'inteiro', 'Nº mínimo de marcos de cronograma exigido para aprovar uma campanha',       TRUE),
(NULL, 'cronograma_max_marcos',                    '20',   'inteiro', 'Nº máximo de marcos de cronograma permitido por campanha',                  TRUE),
(NULL, 'limite_caracteres_descricao_orcamento',    '2000', 'inteiro', 'Nº máximo de caracteres em orcamento_campanha.descricao',                    TRUE),
(NULL, 'limite_caracteres_descricao_marco',        '2000', 'inteiro', 'Nº máximo de caracteres em marco_cronograma.descricao',                      TRUE),
-- ADICIONADO (28-07-2026, Claude Web - 5ª auditoria): meta 0.00 era aceita
-- (campanha all-or-nothing com meta zero é sucesso instantâneo). Mesmo padrão
-- do prazo (item 16): limite técnico largo na constraint (01, > 0), mínimo de
-- negócio de verdade aqui.
(NULL, 'meta_minima_campanha',       '500.00', 'decimal',  'Valor mínimo de meta financeira aceito para uma campanha (RF)',            TRUE),
-- F
(NULL, 'limite_links_academicos_perfil', '5', 'inteiro',  'Nº máximo de links acadêmicos por pesquisador (RF-014/016/018)', TRUE),
-- H
-- ADICIONADO (30-07-2026, RF-056 - sugestão do Claude Web, confirmada pelo
-- Lucas): mesmo padrão do item 16/meta_minima_campanha, acima. R$5,00 estava
-- hardcoded numa CHECK (01) - não é piso do gateway de pagamento (o PIX em si
-- não impõe mínimo), é política de negócio da própria plataforma, então
-- precisa ser configurável igual as outras. Valor idêntico ao que já estava
-- fixo (5.00) - nada muda no comportamento hoje, só o lugar de onde vem.
(NULL, 'valor_minimo_contribuicao',  '5.00',  'decimal',  'Valor mínimo aceito por contribuição, em R$ (RF-056)',                       TRUE),
-- I
-- DECIDIDO (28-07-2026, item 3 da lista de pendências): score NUNCA bloqueia
-- criação de campanha (nem Catarse nem Experiment fazem isso; o filtro real é
-- a aprovação manual do Admin). Este número vira só sinal pro painel do Admin
-- destacar, na fila de aprovação, campanhas de pesquisador abaixo do mínimo
-- pra receberem revisão mais cuidadosa - ver public.fn_precisa_revisao_score()
-- em 05_regras_negocio.sql, [05-I-1]. De propósito, sem trigger de bloqueio.
(NULL, 'score_minimo_campanha',      '25.00', 'decimal',  'Score mínimo para criar campanha (sinal de revisão manual, nunca bloqueio automático)', TRUE);
-- REMOVIDA (era 'permitir_campanha_anonima', booleano, default 'false'): não fazia
-- sentido no modelo atual - campanha.id_usuario é NOT NULL (01), toda campanha SEMPRE
-- tem um pesquisador identificado, é o que a curadoria (RF-068/069) exige. Contribuição
-- anônima já existe e funciona (contribuicao.token_sessao) - essa chave nunca
-- correspondeu a nenhuma funcionalidade real, e nenhuma trigger a lia.
-- REMOVIDA (era 'limite_denuncias_suspensao', inteiro, default '5'): nenhuma trigger
-- suspende perfil automaticamente por denúncias procedentes - não existe hoje (e não
-- deveria, pelo mesmo raciocínio já aplicado ao score no item 3/12: suspensão é decisão
-- do Admin via curadoria manual, não automação por contador). Se um dia isso mudar, a
-- chave volta junto com a trigger que a usa - não antes.

-- [07-I-2] configuracoes: constantes do motor de score (ver DOCUMENTACAO_BD.md)
-- Continua o grupo "I" de [07-C-5] (que termina em score_minimo_campanha,
-- logo acima) - id_config sai em sequência, sem interrupção de domínio.
-- CORRIGIDO (28-07-2026, item 13-quinto-ponto da Lista C): score_custo_denuncia/
-- score_custo_denuncia_procedente saíram daqui - migraram pra score_config
-- (nome='volume_denuncias'/'gravidade_denuncias', ver [07-I-1]), que é a tabela
-- que o Painel Admin realmente edita e que já tem trigger de recálculo. Manter
-- as 2 chaves aqui, sem nenhuma função lendo, recriaria o mesmo problema que
-- estamos corrigindo (constante seedada que não move nada).
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo) VALUES
(NULL, 'score_penalidade_abandono',         '3',  'decimal', 'Pontos descontados por campanha não atingida e nunca encerrada formalmente (sem solicitação de encerramento)', TRUE),
(NULL, 'score_penalidade_sem_justificativa','2',  'decimal', 'Pontos descontados por campanha não atingida cuja solicitação de encerramento não tem justificativa', TRUE),
(NULL, 'score_frequencia_esperada_mensal',  '1',  'decimal', 'Nº de atualizações de campanha esperadas por mês de duração, usado na dimensão Atualização da Campanha', TRUE)
ON CONFLICT (chave) DO NOTHING;

-- [07-G] configuracoes: limites de upload de arquivo (ARQUIVO)
-- ADICIONADO (04-09-2026, pedido do Lucas: "arquivo não é configurável
-- pelo Painel Admin... o administrador deve poder estabelecer o limite
-- mínimo e máximo do tamanho dos arquivos... a quantidade de upload por
-- usuário, e o tempo de respiro entre um upload e outro"). Mesmo padrão
-- de sempre - limite técnico largo continua no código (TAMANHO_MAXIMO_
-- BYTES_ABSOLUTO, arquivo.constants.ts, valida só a FORMA do DTO), o
-- valor de negócio de verdade vem daqui, lido por ConfiguracaoValorService
-- (commons/configuracao) em arquivo.service.iniciar-upload.ts/confirmar-
-- upload.ts. Valores idênticos aos que já estavam hardcoded (8MB/5MB
-- imagem/documento, 50MB cota) - nada muda no comportamento hoje, só o
-- lugar de onde o número vem. Os dois de rate limit (janela/intervalo)
-- são novos, sem hardcoded equivalente antes.
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo) VALUES
(NULL, 'arquivo_tamanho_minimo_bytes',          '100',      'inteiro', 'Tamanho mínimo aceito por arquivo enviado, em bytes - barra arquivo vazio/corrompido', TRUE),
(NULL, 'arquivo_tamanho_maximo_imagem_bytes',   '8388608',  'inteiro', 'Tamanho máximo aceito por imagem enviada (JPEG/PNG/WebP), em bytes (RF-017)', TRUE),
(NULL, 'arquivo_tamanho_maximo_documento_bytes','5242880',  'inteiro', 'Tamanho máximo aceito por documento enviado (PDF), em bytes (RF-017)', TRUE),
(NULL, 'arquivo_cota_bytes_por_usuario',        '52428800', 'inteiro', 'Cota total de armazenamento ativo por usuário, em bytes (RNF-017)', TRUE),
(NULL, 'arquivo_limite_uploads_janela',         '20',       'inteiro', 'Nº máximo de uploads confirmados por usuário dentro da janela de configuracoes.arquivo_janela_limite_uploads_minutos', TRUE),
(NULL, 'arquivo_janela_limite_uploads_minutos', '1440',     'inteiro', 'Janela de tempo (em minutos) usada por arquivo_limite_uploads_janela - padrão 1440 = 24h', TRUE),
(NULL, 'arquivo_intervalo_minimo_segundos',     '5',        'inteiro', 'Intervalo mínimo (em segundos) entre um upload confirmado e o próximo início de upload do mesmo usuário', TRUE)
ON CONFLICT (chave) DO NOTHING;


-- [07-D-3] perfil_pesquisador
-- ALTERADO: score_atual e score_atualizado_em removidos do INSERT de propósito.
-- Cadastrar esses dois direto não fazia sentido: a tabela tem trg_perfil_recalcula_score
-- (AFTER INSERT), que já dispara recalcular_score_pesquisador() sozinha assim que a linha
-- é criada. Qualquer valor digitado aqui seria sobrescrito no mesmo instante pelo cálculo
-- real (dimensões de perfil acadêmico, histórico, atualização e reputação - ver 05). O
-- score de cada um agora é 100% produto dos dados reais inseridos nos blocos abaixo
-- (link_academico, campanha, atualizacao_campanha, denuncia), não de um número fixo aqui.
-- ATUALIZADO (22-08-2026): cpf_criptografado deixou de ser um placeholder de texto puro
-- ('enc_cpf_001' e afins) - os 11 valores abaixo são CPFs FALSOS de verdade (dígito
-- verificador válido, nenhum de dígito repetido), de fato cifrados com
-- commons/seguranca/cpf-cifra.util.ts (AES-256-GCM, formato "v1:iv:tag:ciphertext") usando
-- as chaves de CPF_ENCRYPTION_KEY/CPF_INDEX_KEY do .env de desenvolvimento deste projeto -
-- ver DOCUMENTACAO_BD.md. cpf_hash é o índice cego correspondente (HMAC-SHA256). Gerados
-- por script descartável, nunca CPF de pessoa real (ver PENDENCIAS e correcoes.md, item
-- 745). Se algum dia CPF_ENCRYPTION_KEY/CPF_INDEX_KEY forem trocadas, estas 11 linhas
-- passam a ser indecifráveis (mesma regra de qualquer dado cifrado com chave antiga) - pra
-- um banco de dev/seed, basta rodar o seed de novo com uma chave nova.
INSERT INTO perfil_pesquisador (id_usuario, cpf_criptografado, cpf_hash, vinculo_institucional, titulo_academico, status_pesquisador, ativado_em) VALUES
(12, 'v1:mWTFzqRm8FMW14/u:iMiDqsRSTJ4KUyzcmKP18w==:bR7wgOpNkI+vSJ4=', '1610ee8b3555955f9e79eba6efa88324a4c30ced46b4bee5e6f2b6b3ed605797', 'Universidade de São Paulo (USP)',                   'doutor',     'ativo', '2024-01-10 09:05:00'),
(13, 'v1:biXIzmT/+Z0OVzgl:y8lT16d44wlXzCKzGAsK9A==:HxBEvdcXcZk8bHY=', 'b3b4544a4ec41edae5514228ab14306250a0fce3bc3f149f8a0ed92be2536dd8', 'Universidade Estadual de Campinas (UNICAMP)',       'mestre',      'ativo', '2024-01-15 10:35:00'),
(14, 'v1:/qWUrRI/9fzjm9Kh:uU6qNuQlvvFjghnTLVr8Og==:N5DdmozsScRBV8A=', '93d76c0ae76d371c84ead92cdc597742cd149067fe7f234552e10abe75ee5e7f', 'Universidade Federal de Minas Gerais (UFMG)',       'doutor',      'ativo', '2024-02-01 08:50:00'),
(15, 'v1:P3LMaMpY05s3WLyr:7eDEN698asnW0mHcOs18Hw==:a51Rr8evV8QG/zw=', 'a6b7b8e7c9b4114a993ffdd74c58a4f09b2ea02a107faca711642e5f6cb4538b', 'Universidade Federal do Rio de Janeiro (UFRJ)',     'especialista','ativo', '2024-02-10 14:10:00'),
(16, 'v1:gRfGHqP2CaS1KfN8:/Ndt5pdWu6A/ZxDBptQipQ==:XXTsLYETudrxeik=', '74fc41e2f0ea9e284b8c1d2379fcc4388988d1b4a18f53c88a626d91b5d4cbc6', 'Universidade Federal de Santa Catarina (UFSC)',     'mestre',      'ativo', '2024-03-05 11:25:00'),
(17, 'v1:7abSMfGxUwGXdwcb:by/laHiieT6GUyoRZK5eEQ==:rlvzzxsYevmjKR4=', '3f165d5243e5fbddf4290416d712da7ba1a1129f442c866bc855fac2c19f3458', 'Universidade Estadual Paulista (UNESP)',            'graduado',    'ativo', '2024-03-12 16:05:00'),
(18, 'v1:gH+4XLY9grNC1AAN:f0QkyT8OuWRTKwwbyHhtKQ==:/dE9nq3r7rYxs3k=', '3f022d05c183ecfb64cbb6ac2500e66ad731e684f1c9afd5e2cb801d5576d376', 'Universidade Federal de São Paulo (UNIFESP)',       'doutor',      'ativo', '2024-04-01 09:35:00'),
-- ADICIONADO: 4 pesquisadores novos, desenhados de propósito pra cobrir as 4 faixas de
-- score_rotulo (Atenção/Em Construção/Confiável/Referência) de forma DETERMINÍSTICA -
-- ou seja, o resultado depende só da fórmula real em 05_regras_negocio.sql, não de sorte.
-- Ver comentário completo logo depois do bloco de denuncia sobre como cada um chega
-- na faixa esperada.
(19, 'v1:LEFw0QnUeHqL2X91:6kAh7osqA4mnvClzmJIEpA==:YdQlSK3Dr/mdlFw=', 'a36805b35ddfe2257718bedd4035fd49afa11d5e3602285131419df0827d49f1', 'Universidade Federal do Rio Grande do Sul (UFRGS)', 'doutor',   'ativo', '2024-05-20 09:00:00'), -- Bruno:    alvo = Referência
(20, 'v1:N0tFgAz4WUtH/Zmi:9c3av62cgJj7CVWQsTTN/Q==:1jWfrfd+IZW7NZI=', '0d491a6df2cd5e6e9fe25c47630ff59d88a6e0a6a3d85f61badb2723a22ff19c', 'Universidade Federal do Paraná (UFPR)',             'mestre',   'ativo', '2024-05-22 09:00:00'), -- Renata:   alvo = Confiável
(21, 'v1:Irign/aW5mMCv4Ug:EQxzkR0lXxnJhmu8xAEhcw==:2lmUgJVYjExvdAM=', 'b5944441f2b1f45294195783812f36bc72c9bf38d2ef3d8a231c1a8d8f538ec5', 'Universidade Federal da Bahia (UFBA)',              'mestre',   'ativo', '2024-05-25 09:00:00'), -- Eduardo:  alvo = Em Construção
(22, 'v1:m7z9uq+435l0syBo:wVQB6djPxdi38eWcfpnUAQ==:45Hee0oUAA3IDek=', '469f49af437e577be058f668669a27ec903aa9ddc42895750ef3e1d45f05c380', 'Universidade Federal do Ceará (UFC)',               'graduado', 'ativo', '2024-05-28 09:00:00'); -- Vinícius: alvo = Atenção


-- [07-F-1] link_academico
-- ADICIONADO: Bruno (19) recebe os 3 links que a fórmula de score realmente soma
-- (calcular_score_perfil_academico, 05) - Lattes, ORCID e um "outro link" que bate no
-- ILIKE '%linkedin%'. É o único dos 4 novos pesquisadores com link_academico de propósito,
-- pra ele ser o único a fechar os 30/30 pontos possíveis nessa dimensão.
-- CORRIGIDO (28-07-2026): id_tipolink passou a ser resolvido por subquery em
-- tipo_link.codigo (chave natural), não mais pelo id posicional (1-5) - mesmo
-- princípio da correção do bug de denuncia, ver [07-E-8].
INSERT INTO link_academico (id_usuario, id_tipolink, ordem, url)
SELECT v.id_usuario, tl.id_tipolink, v.ordem, v.url
FROM (VALUES
    (12, 'LATTES',      1, 'http://lattes.cnpq.br/1234567890123456'),
    (12, 'ORCID',       2, 'https://orcid.org/0000-0001-2345-6789'),
    (13, 'LATTES',      1, 'http://lattes.cnpq.br/9876543210987654'),
    (14, 'LATTES',      1, 'http://lattes.cnpq.br/1111222233334444'),
    -- CORRIGIDO: era LinkedIn, mas a URL sempre foi do ResearchGate.
    (16, 'RESEARCHGATE', 1, 'https://www.researchgate.net/profile/Juliana-Ferreira-Paz'),
    (18, 'ORCID',       1, 'https://orcid.org/0000-0002-9876-5432'),
    (19, 'LATTES',      1, 'http://lattes.cnpq.br/1122334455667788'),
    (19, 'ORCID',       2, 'https://orcid.org/0000-0003-1234-5678'),
    (19, 'LINKEDIN',    3, 'https://www.linkedin.com/in/bruno-tavares-costa')
) AS v(id_usuario, tipolink_codigo, ordem, url)
JOIN tipo_link tl ON tl.codigo = v.tipolink_codigo;


-- [07-E-1] campanha
-- CORRIGIDO (27-07-2026): valor_bruto_arrecadado saiu do INSERT (a coluna já tem
-- DEFAULT 0). Antes, o número era digitado à mão e não batia com a soma real das
-- contribuições seedadas (9 das 10 campanhas divergiam, 3 delas com 0 contribuições
-- e um total de 5 dígitos mesmo assim) - exatamente o mesmo problema que já tinha
-- sido corrigido em perfil_pesquisador.score_atual (ver comentário do bloco
-- [07-D-3]), só que aqui ninguém tinha reparado ainda porque trg_sincroniza_
-- arrecadado_campanha ficava desligada durante toda a carga do seed (ver [07-H-1]).
-- Agora essa trigger específica fica ligada durante o INSERT de contribuicao, e o
-- valor final é 100% produto das contribuições reais inseridas logo abaixo - não
-- de um número digitado aqui.
-- CORRIGIDO (28-07-2026): trg_campanha_valida_prazo_negocio desligada só durante
-- esta carga - o prazo de negócio caiu de 90 pra 60 dias nesta mesma data (ver
-- [07-C-5]), e várias destas campanhas são dado histórico anterior à decisão
-- (algumas com mais de 60 dias de duração, ex.: campanha 3 tem 90). Mesmo
-- raciocínio já aplicado às triggers de contribuicao em [07-H-1]: dado histórico
-- não deveria ser barrado por uma regra que só passou a valer depois dele existir.
ALTER TABLE campanha DISABLE TRIGGER trg_campanha_valida_prazo_negocio;

-- CORRIGIDO (28-07-2026): encerrado_em explícito na campanha 7 (única com
-- status 'encerrado' no seed) - a trigger nova (fn_preenche_encerramento_campanha)
-- só dispara em UPDATE, não em INSERT, então um dado histórico que já nasce
-- 'encerrado' precisa do valor explícito aqui. Usei o mesmo avaliado_em da
-- solicitacao_encerramento correspondente ([07-E-5]) - o momento em que o
-- encerramento foi de fato decidido.
INSERT INTO campanha (id_usuario, id_admin, id_area_conhecimento, titulo, modelo, meta_financeira, taxa_plataforma, descricao, data_inicio, data_fim, status, aprovado_em, criado_em, encerrado_em) VALUES
(12, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '1.03.00.00'), 'Desenvolvimento de Algoritmo para Diagnóstico Precoce de Alzheimer por IA',      'all-or-nothing', 50000.00, 5.00, 'Pesquisa aplicada em inteligência artificial para detecção precoce da doença de Alzheimer usando redes neurais convolucionais.',                          '2024-02-01', '2024-04-01', 'sucesso',             '2024-02-01', '2024-01-20 10:00:00', NULL),
(13, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '3.13.00.00'), 'Prótese de Baixo Custo com Impressão 3D para Amputados do SUS',                  'flexivel',       35000.00, 5.00, 'Projeto de engenharia biomédica para fabricação de próteses funcionais de membros superiores a custo acessível para o sistema público.',                '2024-02-15', '2024-05-01', 'sucesso',             '2024-02-15', '2024-02-05 11:30:00', NULL),
(14, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '2.12.00.00'), 'Bioprospecção de Fungos da Caatinga com Potencial Antibiótico',                  'all-or-nothing', 40000.00, 5.00, 'Coleta e análise de fungos endofíticos da Caatinga para identificação de compostos com atividade antibacteriana frente a superbactérias.',              '2024-03-01', '2024-05-30', 'sucesso',             '2024-03-01', '2024-02-20 09:15:00', NULL),
(15, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '4.06.00.00'), 'Estudo Epidemiológico do Impacto da Dengue na Baixada Fluminense 2024',          'all-or-nothing', 25000.00, 5.00, 'Levantamento epidemiológico detalhado dos casos de dengue em municípios da Baixada Fluminense durante o surto de 2024.',                                 '2024-03-10', '2024-04-24', 'nao_atingido',        '2024-03-10', '2024-03-01 14:00:00', NULL),
(16, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '6.06.00.00'), 'Mapeamento Socioeconômico de Comunidades Quilombolas de Santa Catarina',         'flexivel',       30000.00, 5.00, 'Pesquisa quantitativa e qualitativa sobre indicadores socioeconômicos, acesso a direitos e identidade cultural em quilombos catarinenses.',              '2024-04-01', '2024-06-01', 'sucesso',             '2024-04-01', '2024-03-20 08:00:00', NULL),
(17, NULL, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '7.02.00.00'), 'Análise Discursiva das Fake News sobre Vacinas no Twitter (2022–2024)',       'all-or-nothing', 15000.00, 5.00, 'Estudo linguístico-computacional sobre estratégias discursivas de desinformação vacinal em redes sociais brasileiras.',                                  NULL,          NULL,         'aguardando_aprovacao', NULL,        '2025-04-10 16:00:00', NULL),
(18, 1, (SELECT id_area_conhecimento FROM area_conhecimento WHERE codigo_cnpq = '4.01.00.00'), 'Eficácia de Probióticos na Redução de Infecções Hospitalares em UTI Neonatal',  'all-or-nothing', 45000.00, 5.00, 'Ensaio clínico randomizado avaliando o uso de probióticos na microbiota intestinal de neonatos para prevenção de sepse hospitalar.',                    '2024-05-01', '2024-07-30', 'encerrado',           '2024-05-01', '2024-04-15 10:00:00', '2024-08-06 11:00:00'),
-- ADICIONADO: 3 campanhas novas (ids 8, 9, 10 nesta ordem de inserção), uma para cada
-- pesquisador novo que precisa de histórico real - ver o comentário completo depois do
-- bloco de denuncia sobre por que cada uma dá o resultado de score esperado.
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
-- CORRIGIDO: seed representa dados históricos já concluídos, então os dois
-- triggers de VALIDAÇÃO (pensados para tráfego em tempo real, que rejeitariam
-- inserir contribuição numa campanha que já não está mais 'ativo') são
-- desligados só durante a carga do seed e religados em seguida.
-- trg_sincroniza_arrecadado_campanha, diferente dos outros dois, não valida nada -
-- só soma - então fica LIGADA de propósito durante esta carga: é ela quem calcula
-- campanha.valor_bruto_arrecadado (ver [07-E-1]), em vez de alguém digitar o total
-- à mão e correr o risco de errar a conta ou deixar o número desatualizado.
ALTER TABLE contribuicao DISABLE TRIGGER trg_valida_status_contribuicao;
ALTER TABLE contribuicao DISABLE TRIGGER trg_contribuicao_all_or_nothing_pix;

-- CORRIGIDO (RF-048): as 4 contribuições marcadas com (*) eram cartao_credito/boleto
-- em campanha all-or-nothing - a própria trg_contribuicao_all_or_nothing_pix existe
-- pra impedir exatamente isso, só entraram porque essa trigger fica desligada
-- durante a carga. Trocadas pra pix; não afeta o cálculo de score (que usa o status
-- da campanha, não o meio de pagamento da contribuição).
INSERT INTO contribuicao (id_campanha, id_usuario, valor, meio_pagamento, status, anonima, id_transacao_api, criado_em) VALUES
(1, 13, 5000.00, 'pix', 'repassado',  FALSE, 'TXN-PIX-0001', '2024-02-10 10:00:00'),
(1, 14, 2300.00, 'pix', 'repassado',  FALSE, 'TXN-PIX-0002', '2024-02-12 14:30:00'), -- (*) era cartao_credito
(2, 12, 1500.00, 'pix', 'repassado',  TRUE,  'TXN-PIX-0003', '2024-02-20 09:00:00'),
(3, 16, 8000.00, 'pix', 'repassado',  FALSE, 'TXN-PIX-0004', '2024-03-05 11:00:00'), -- (*) era boleto
(5, 15, 2200.00, 'cartao_debito',  'repassado',  FALSE, 'TXN-CD-0005',  '2024-04-10 15:00:00'),
(7, 17,  500.00, 'pix',            'repassado',  TRUE,  'TXN-PIX-0006', '2024-05-10 08:00:00'),
(4, 18,  800.00, 'pix', 'a_devolver', FALSE, 'TXN-PIX-0007', '2024-03-15 12:00:00'), -- (*) era cartao_credito
-- ADICIONADO: contribuições de usuários com papéis diferentes de 'pesquisador',
-- pra mostrar que qualquer usuário logado pode apoiar campanha, não só pesquisadores.
(3, 23,  50.00,  'pix',            'repassado',  FALSE, 'TXN-PIX-0008', '2024-02-25 09:00:00'), -- Fernanda, usuario comum, contribuição pública
(1, 8, 300.00, 'pix', 'repassado',  TRUE,  'TXN-PIX-0009',  '2024-02-28 10:00:00'), -- (*) era cartao_credito. Diego, moderador, contribuição anônima (anonima=TRUE mas id_usuario preservado p/ auditoria)
(5, 10, 150.00, 'pix',            'repassado',  FALSE, 'TXN-PIX-0010', '2024-04-12 09:00:00'), -- Thiago, curador, contribuição pública
-- ADICIONADO: contribuição de verdade anônima - sem nenhum usuário vinculado
-- (id_usuario NULL, coluna é nullable justamente pra cobrir doador sem conta/
-- ON DELETE SET NULL). Diferente das linhas com anonima=TRUE acima, que só
-- escondem a identidade da exibição pública mas mantêm o vínculo interno.
(2, NULL, 75.00, 'pix',            'repassado',  TRUE,  'TXN-PIX-0011', '2024-03-02 10:00:00'),
-- ADICIONADO (27-07-2026): o resto de cada campanha, distribuído em várias
-- contribuições de doadores diferentes, pra chegar exatamente no total que a
-- campanha correspondente costumava ter digitado à mão em valor_bruto_arrecadado
-- (ver comentário do [07-E-1]) - agora é a soma real dessas linhas, calculada
-- pela trigger, que decide o total, não o contrário. Campanha 'all-or-nothing'
-- só recebe pix; o resto pode usar qualquer meio de pagamento, igual antes.
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
-- ADICIONADO (27-07-2026): estava vazia, e sustenta o RF-054/RF-055 - a Etapa 2
-- descreve essa trilha (aceite dos termos por transação) como a defesa principal
-- da plataforma numa disputa de chargeback com operadora de cartão. Gerado a
-- partir da própria tabela contribuicao (não digitado linha por linha) - cada
-- contribuição aceitou a versão de termos vigente na época (v1, id_termo=1; ver
-- [07-D-6]), no mesmo instante da contribuição.
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
INSERT INTO historico_rejeicao (id_campanha, id_admin, justificativa, rejeitado_em) VALUES
(4, 1, 'Campanha não apresentou metodologia clara nem parecer de comitê de ética em pesquisa.',               '2024-03-08 10:00:00'),
(6, 1, 'Escopo da pesquisa não enquadrado como pesquisa acadêmica financiável pela plataforma.',              '2025-04-12 11:00:00'),
(1, 1, 'Versão inicial sem descrição detalhada dos dados utilizados. Resubmissão solicitada.',                '2024-01-25 09:00:00'),
(2, 1, 'Faltou anexar declaração institucional da UNICAMP. Campanha devolvida para ajuste.',                  '2024-02-08 14:00:00'),
(3, 1, 'Meta financeira considerada excessiva sem justificativa de custos detalhada. Ajuste e reenvio.',      '2024-02-22 10:00:00'),
(5, 1, 'Necessidade de inclusão de termo de consentimento das comunidades quilombolas no projeto.',           '2024-03-22 13:00:00'),
(7, 1, 'Protocolo de ensaio clínico incompleto. Aprovação pelo CEP obrigatória antes de prosseguir.',        '2024-04-17 11:00:00');


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
-- Resolve o motivo por `descricao` (18-08-2026) - antes era por `codigo`
-- (CAMP-001, PERF-001 etc.), coluna removida do catálogo (ver
-- 01_extensoes_enums_tabelas.sql); `descricao` é única o bastante neste
-- seed pra continuar funcionando como chave de leitura só aqui, sem
-- precisar de id_motivo cru (frágil a depender da ordem do INSERT acima).
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
    -- ADICIONADO: denúncias que alimentam de propósito a dimensão Reputação da
    -- Comunidade (calcular_score_reputacao, 05: 25 − total_denuncias×1 −
    -- total_procedentes×3) dos 2 pesquisadores novos que precisam de reputação
    -- imperfeita.
    -- Eduardo (21): 2 denúncias 'pendente' (ainda não procedentes) - custam só 1
    -- ponto cada (25 → 23), o suficiente pra tirar um pouco de reputação sem zerar
    -- a dimensão, já que ele só precisa ficar em "Em Construção" (25-49), não em
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
-- ADICIONADO (27-07-2026): estava vazia. 7 linhas em estados diferentes, pra
-- exercitar de verdade a permissão notificacao_processar (recém-criada, ver A4
-- em PENDENCIAS e correcoes.md) e o índice idx_notificacao_status (02) - até
-- aqui, nenhum dos dois nunca tinha rodado contra nenhuma linha real.
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

-- CORRIGIDO (28-07-2026, Claude Web - 5ª auditoria): a referência "[07-J] acima"
-- era uma referência quebrada - nunca existiu bloco [07-J] neste arquivo (o
-- Claude Web encontrou isso comparando .sql contra DOCUMENTACAO_BD.md, que
-- também não tinha nenhum capítulo [07-J]). O que a frase queria apontar são as
-- triggers de recálculo automático de score, que ficam em 05_regras_negocio.sql,
-- [05-I-4] - corrigido pra apontar pro lugar certo.
-- [07-I-3] Backfill de segurança: cada INSERT acima (perfil_pesquisador, link_academico,
-- campanha, atualizacao_campanha, denuncia) já dispara sua própria trigger de recálculo
-- (ver 05_regras_negocio.sql, [05-I-4]), então quando o seed chega aqui os scores dos 11 pesquisadores já
-- deveriam estar corretos. Esta chamada existe só como rede de segurança - reprocessa
-- todo mundo do zero, caso alguma trigger seja desligada/alterada no futuro e alguém
-- esqueça de rodar isso manualmente depois.
SELECT public.recalcular_todos_os_scores();