-- ============================================================
--  CrowdAcadêmico — 07: SEED DE DADOS (mínimo 7 registros por tabela)
--  Ordem respeitando dependências de FK
--  Depende de: 01 a 06 (precisa das tabelas, RLS, grants e das
--  funções de score já criadas — o INSERT final desta seção chama
--  public.recalcular_todos_os_scores(), definida em 06)
--  Próximo arquivo (opcional/manual): 08_passo_manual_admin.sql
-- ============================================================

-- ============================================================
--  CrowdAcadêmico — SEED DE DADOS (mínimo 7 registros por tabela)
--  Ordem respeitando dependências de FK
-- ============================================================

-- Seed dos papéis básicos usados pelo app (ver AuthContext.tsx / eh_admin())
INSERT INTO papel (nome) VALUES ('admin'), ('pesquisador'), ('usuario')
ON CONFLICT (nome) DO NOTHING;

-- Inserção das dimensões raiz
INSERT INTO score_config (nome, descricao, peso, id_pai) VALUES
    ('perfil_academico',     'Perfil Acadêmico Declarado',  30, NULL),
    ('historico_plataforma', 'Histórico na Plataforma',     25, NULL),
    ('atualizacao_campanha', 'Atualização da Campanha',     20, NULL),
    ('reputacao_comunidade', 'Reputação da Comunidade',     25, NULL);

-- Subitens (mantido igual)
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

INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'volume_denuncias',    'Volume baixo de denúncias',                         10, id_score_config FROM score_config WHERE nome = 'reputacao_comunidade';
INSERT INTO score_config (nome, descricao, peso, id_pai)
SELECT 'gravidade_denuncias', 'Gravidade e procedência das denúncias confirmadas', 15, id_score_config FROM score_config WHERE nome = 'reputacao_comunidade';

INSERT INTO score_rotulo (rotulo, descricao, score_minimo, score_maximo) VALUES
('Atenção',       'Pesquisador com perfil incompleto ou histórico problemático',  0,  24),
('Em Construção', 'Pesquisador em início de trajetória na plataforma',           25,  49),
('Confiável',     'Pesquisador com bom histórico e perfil consistente',          50,  74),
('Referência',    'Pesquisador com excelente reputação e alto engajamento',      75, 100);


-- ============================================================
-- PAPEL
-- 'admin' e 'pesquisador' já existem (seed do script de schema, usado
-- por eh_admin()) — ON CONFLICT DO NOTHING evita o erro de duplicidade.
-- Os demais papéis (apoiador, moderador, revisor, curador, suporte)
-- são inseridos normalmente. Não fixamos os IDs resultantes em nenhum
-- lugar: papel_permissao e usuario_papel resolvem por nome (ver abaixo).
-- ============================================================
INSERT INTO papel (nome) VALUES
('admin'),
('pesquisador'),
('apoiador'),
('moderador'),
('revisor'),
('curador'),
('suporte')
ON CONFLICT (nome) DO NOTHING;


-- ============================================================
-- PERMISSAO
-- ============================================================
INSERT INTO permissao (nome) VALUES
('aprovar_campanha'),
('rejeitar_campanha'),
('suspender_usuario'),
('visualizar_relatorios'),
('gerenciar_configuracoes'),
('responder_denuncia'),
('editar_score');


-- ============================================================
-- PAPEL_PERMISSAO
-- Resolvido por nome (não por número fixo), já que os IDs de "papel"
-- não são previsíveis depois do ON CONFLICT DO NOTHING acima.
-- ============================================================
INSERT INTO papel_permissao (id_papel, id_permissao)
SELECT p.id_papel, perm.id_permissao
FROM papel p
JOIN permissao perm ON TRUE
WHERE (p.nome, perm.nome) IN (
    ('admin', 'aprovar_campanha'),
    ('admin', 'rejeitar_campanha'),
    ('admin', 'suspender_usuario'),
    ('admin', 'visualizar_relatorios'),
    ('admin', 'gerenciar_configuracoes'),
    ('moderador', 'responder_denuncia'),
    ('revisor', 'editar_score')
);


-- ============================================================
-- TIPO_LINK
-- ============================================================
-- CORRIGIDO: tipo_link ajustado para a allowlist fechada definida pela equipe.
INSERT INTO tipo_link (nome, ativo, regex, dominio) VALUES
('Lattes',            TRUE,  '^https?://lattes\.cnpq\.br/\d+$',                   'lattes.cnpq.br'),
('ORCID',             TRUE,  '^https?://orcid\.org/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$', 'orcid.org'),
('ResearchGate',      TRUE,  '^https?://(www\.)?researchgate\.net/profile/[\w\-]+$', 'researchgate.net'),
('LinkedIn',          TRUE,  '^https?://(www\.)?linkedin\.com/in/[\w\-]+/?$',      'linkedin.com'),
('GitHub',            TRUE,  '^https?://(www\.)?github\.com/[\w\-]+/?$',          'github.com');


-- ============================================================
-- AREA_CONHECIMENTO
-- ============================================================
-- CORRIGIDO: área de conhecimento adicionada para o valor Multidisciplinar.
INSERT INTO area_conhecimento (codigo_cnpq, nome, ativo) VALUES
('1.00.00.00-0', 'Ciências Exatas e da Terra',          TRUE),
('2.00.00.00-6', 'Ciências Biológicas',                 TRUE),
('3.00.00.00-1', 'Engenharias',                         TRUE),
('4.00.00.00-7', 'Ciências da Saúde',                   TRUE),
('5.00.00.00-2', 'Ciências Agrárias',                   TRUE),
('6.00.00.00-8', 'Ciências Sociais Aplicadas',          TRUE),
('7.00.00.00-3', 'Ciências Humanas',                    TRUE),
('8.00.00.00-9', 'Linguística, Letras e Artes',         TRUE),
('9.00.00.00-0', 'Multidisciplinar',                    TRUE);


-- ============================================================
-- MOTIVO_DENUNCIA
-- ============================================================
INSERT INTO motivo_denuncia (codigo, descricao, tipo) VALUES
('CAMP-001', 'Campanha com informações falsas ou enganosas',           'campanha'),
('CAMP-002', 'Campanha duplicada ou já existente',                     'campanha'),
('CAMP-003', 'Uso indevido de recursos arrecadados',                   'campanha'),
('CAMP-004', 'Campanha fora do escopo acadêmico',                      'campanha'),
('PERF-001', 'Perfil com dados acadêmicos falsos',                     'perfil'),
('PERF-002', 'Comportamento abusivo ou ofensivo',                      'perfil'),
('PERF-003', 'Usurpação de identidade de pesquisador real',            'perfil');


-- ============================================================
-- ARQUIVO (imagens de perfil — sem FK ainda ativa no INSERT)
-- ============================================================
-- ativo omitido: DEFAULT TRUE aplicado automaticamente
-- URLs do Pravatar (CC0, fotos reais que carregam de fato — feito
-- exatamente pra preencher dados de teste/demo como este).
INSERT INTO arquivo (url, nome_original, tipo_mime, tamanho_bytes) VALUES
('https://i.pravatar.cc/300?img=47',                              'ana_santos.jpg',       'image/jpeg',      102400),
('https://i.pravatar.cc/300?img=33',                              'carlos_melo.jpg',      'image/jpeg',       98304),
('https://i.pravatar.cc/300?img=44',                              'beatriz_lima.jpg',     'image/jpeg',      115200),
('https://i.pravatar.cc/300?img=14',                              'rafael_costa.jpg',     'image/jpeg',       87040),
('https://i.pravatar.cc/300?img=49',                              'juliana_ferreira.jpg', 'image/jpeg',      131072),
('https://i.pravatar.cc/300?img=22',                              'marcos_oliveira.jpg',  'image/jpeg',       94208),
('https://i.pravatar.cc/300?img=56',                              'patricia_rocha.jpg',   'image/jpeg',      109568),
('https://cdn.crowdacademico.com.br/docs/relatorio_q1.pdf',       'relatorio_q1.pdf',     'application/pdf', 512000);


-- ============================================================
-- USUARIO
-- ============================================================
-- CORRIGIDO: seed de usuário passou a usar criado_em.
INSERT INTO usuario (nome, email, senha_hash, id_imagem_perfil, criado_em) VALUES
('Ana Beatriz Santos',    'ana.santos@usp.br',          '$2b$12$hashed_ana001',    1, '2024-01-10 09:00:00'),
('Carlos Eduardo Melo',   'carlos.melo@unicamp.br',     '$2b$12$hashed_carlos002', 2, '2024-01-15 10:30:00'),
('Beatriz Lima Alves',    'beatriz.lima@ufmg.br',       '$2b$12$hashed_bea003',    3, '2024-02-01 08:45:00'),
('Rafael Costa Nunes',    'rafael.costa@ufrj.br',       '$2b$12$hashed_raf004',    4, '2024-02-10 14:00:00'),
('Juliana Ferreira Paz',  'juliana.ferreira@ufsc.br',   '$2b$12$hashed_jul005',    5, '2024-03-05 11:20:00'),
('Marcos Oliveira Ramos', 'marcos.oliveira@unesp.br',   '$2b$12$hashed_mar006',    6, '2024-03-12 16:00:00'),
('Patrícia Rocha Silva',  'patricia.rocha@unifesp.br',  '$2b$12$hashed_pat007',    7, '2024-04-01 09:30:00'),
('Admin Sistema',         'admin@crowdacademico.com.br','$2b$12$hashed_admin008',  NULL,'2024-01-01 00:00:00');


-- ============================================================
-- USUARIO_PAPEL
-- id_usuario é fixo (tabela usuario está vazia antes deste seed, então
-- os IDs 1-8 abaixo batem com a ordem de inserção acima). id_papel é
-- resolvido por nome pelo mesmo motivo da seção PAPEL_PERMISSAO.
-- ============================================================
INSERT INTO usuario_papel (id_usuario, id_papel)
SELECT v.id_usuario, p.id_papel
FROM (VALUES
    (1, 'pesquisador'), -- Ana
    (2, 'pesquisador'), -- Carlos
    (3, 'pesquisador'), -- Beatriz
    (4, 'pesquisador'), -- Rafael
    (5, 'pesquisador'), -- Juliana
    (6, 'pesquisador'), -- Marcos
    (7, 'pesquisador'), -- Patrícia
    (8, 'admin')        -- Admin
) AS v(id_usuario, papel_nome)
JOIN papel p ON p.nome = v.papel_nome;


-- ============================================================
-- CONFIGURACOES
-- ============================================================
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo) VALUES
(NULL, 'taxa_plataforma_padrao',     '5.00',  'decimal',  'Taxa padrão cobrada pela plataforma (%)',              TRUE),
(NULL, 'prazo_maximo_campanha_dias', '90',    'inteiro',  'Duração máxima permitida de uma campanha em dias',     TRUE),
-- TODO (pendente decisão da equipe): regra de score mínimo para campanha ainda não confirmada; manter sem trigger por enquanto.
(NULL, 'score_minimo_campanha',      '25.00', 'decimal',  'Score mínimo para criar campanha',                     TRUE),
(NULL, 'permitir_campanha_anonima',  'false', 'booleano', 'Permite contribuições anônimas nas campanhas',         TRUE),
(NULL, 'email_suporte',              'suporte@crowdacademico.com.br', 'texto', 'E-mail de suporte ao usuário',   TRUE),
(8,   'notificar_novas_campanhas',   'true',  'booleano', 'Admin recebe e-mail sobre novas campanhas',            TRUE),
(8,   'limite_denuncias_suspensao',  '5',     'inteiro',  'Nº de denúncias procedentes que suspendem o perfil',   TRUE);

-- ------------------------------------------------------------
-- Constantes do motor de score (movidas de artificios.sql, onde
-- estavam misturadas com as funções de cálculo). São dados, não
-- lógica — por isso ficam aqui junto do resto do seed.
-- ------------------------------------------------------------
-- ============================================================
-- 2. MELHORIA NO BANCO: constantes do cálculo ficam em "configuracoes"
--    (não hardcoded no código) — assim o admin pode ajustar a régua
--    de penalidades sem precisar editar SQL/app.
-- ============================================================
INSERT INTO configuracoes (id_usuario, chave, valor, tipo, descricao, ativo) VALUES
(NULL, 'score_custo_denuncia',              '1',  'decimal', 'Pontos descontados por denúncia recebida (qualquer status), na dimensão Reputação', TRUE),
(NULL, 'score_custo_denuncia_procedente',   '3',  'decimal', 'Pontos extras descontados por denúncia confirmada (status=resolvida), na dimensão Reputação', TRUE),
(NULL, 'score_penalidade_abandono',         '3',  'decimal', 'Pontos descontados por campanha não atingida e nunca encerrada formalmente (sem solicitação de encerramento)', TRUE),
(NULL, 'score_penalidade_sem_justificativa','2',  'decimal', 'Pontos descontados por campanha não atingida cuja solicitação de encerramento não tem justificativa', TRUE),
(NULL, 'score_frequencia_esperada_mensal',  '1',  'decimal', 'Nº de atualizações de campanha esperadas por mês de duração, usado na dimensão Atualização da Campanha', TRUE)
ON CONFLICT (chave) DO NOTHING;


-- ============================================================
-- PERFIL_PESQUISADOR
-- ============================================================
-- CORRIGIDO: valores de score do seed arredondados para inteiro.
INSERT INTO perfil_pesquisador (id_usuario, cpf_criptografado, vinculo_institucional, titulo_academico, status_pesquisador, ativado_em, suspenso, score_atual, score_atualizado_em) VALUES
(1, 'enc_cpf_001', 'Universidade de São Paulo (USP)',                   'doutor',     'ativo', '2024-01-10 09:05:00', FALSE, 86, '2025-05-01 00:00:00'),
(2, 'enc_cpf_002', 'Universidade Estadual de Campinas (UNICAMP)',       'mestre',      'ativo', '2024-01-15 10:35:00', FALSE, 72, '2025-05-01 00:00:00'),
(3, 'enc_cpf_003', 'Universidade Federal de Minas Gerais (UFMG)',       'doutor',      'ativo', '2024-02-01 08:50:00', FALSE, 91, '2025-05-01 00:00:00'),
(4, 'enc_cpf_004', 'Universidade Federal do Rio de Janeiro (UFRJ)',     'especialista','ativo', '2024-02-10 14:10:00', FALSE, 48, '2025-05-01 00:00:00'),
(5, 'enc_cpf_005', 'Universidade Federal de Santa Catarina (UFSC)',     'mestre',      'ativo', '2024-03-05 11:25:00', FALSE, 62, '2025-05-01 00:00:00'),
(6, 'enc_cpf_006', 'Universidade Estadual Paulista (UNESP)',            'graduado',    'ativo', '2024-03-12 16:05:00', FALSE, 32, '2025-05-01 00:00:00'),
(7, 'enc_cpf_007', 'Universidade Federal de São Paulo (UNIFESP)',       'doutor',      'ativo', '2024-04-01 09:35:00', FALSE, 77, '2025-05-01 00:00:00');


-- ============================================================
-- LINK_ACADEMICO
-- ============================================================
INSERT INTO link_academico (id_usuario, id_tipolink, ordem, url) VALUES
(1, 1, 1, 'http://lattes.cnpq.br/1234567890123456'),
(1, 2, 2, 'https://orcid.org/0000-0001-2345-6789'),
(2, 1, 1, 'http://lattes.cnpq.br/9876543210987654'),
(3, 1, 1, 'http://lattes.cnpq.br/1111222233334444'),
(5, 4, 1, 'https://www.researchgate.net/profile/Juliana-Ferreira-Paz'),
(7, 2, 1, 'https://orcid.org/0000-0002-9876-5432');


-- ============================================================
-- CAMPANHA
-- ============================================================
INSERT INTO campanha (id_usuario, id_admin, id_area_conhecimento, titulo, modelo, meta_financeira, valor_bruto_arrecadado, taxa_plataforma, descricao, data_inicio, data_fim, status, aprovado_em, criado_em) VALUES
(1, 8, 1, 'Desenvolvimento de Algoritmo para Diagnóstico Precoce de Alzheimer por IA',      'all-or-nothing', 50000.00, 52300.00, 5.00, 'Pesquisa aplicada em inteligência artificial para detecção precoce da doença de Alzheimer usando redes neurais convolucionais.',                          '2024-02-01', '2024-04-01', 'sucesso',             '2024-02-01', '2024-01-20 10:00:00'),
(2, 8, 3, 'Prótese de Baixo Custo com Impressão 3D para Amputados do SUS',                  'flexivel',       35000.00, 28500.00, 5.00, 'Projeto de engenharia biomédica para fabricação de próteses funcionais de membros superiores a custo acessível para o sistema público.',                '2024-02-15', '2024-05-01', 'sucesso',             '2024-02-15', '2024-02-05 11:30:00'),
(3, 8, 2, 'Bioprospecção de Fungos da Caatinga com Potencial Antibiótico',                  'all-or-nothing', 40000.00, 40000.00, 5.00, 'Coleta e análise de fungos endofíticos da Caatinga para identificação de compostos com atividade antibacteriana frente a superbactérias.',              '2024-03-01', '2024-05-30', 'sucesso',             '2024-03-01', '2024-02-20 09:15:00'),
(4, 8, 4, 'Estudo Epidemiológico do Impacto da Dengue na Baixada Fluminense 2024',          'all-or-nothing', 25000.00,  8000.00, 5.00, 'Levantamento epidemiológico detalhado dos casos de dengue em municípios da Baixada Fluminense durante o surto de 2024.',                                 '2024-03-10', '2024-04-24', 'nao_atingido',        '2024-03-10', '2024-03-01 14:00:00'),
(5, 8, 6, 'Mapeamento Socioeconômico de Comunidades Quilombolas de Santa Catarina',         'flexivel',       30000.00, 22000.00, 5.00, 'Pesquisa quantitativa e qualitativa sobre indicadores socioeconômicos, acesso a direitos e identidade cultural em quilombos catarinenses.',              '2024-04-01', '2024-06-01', 'sucesso',             '2024-04-01', '2024-03-20 08:00:00'),
(6, NULL, 7, 'Análise Discursiva das Fake News sobre Vacinas no Twitter (2022–2024)',       'all-or-nothing', 15000.00,  0.00,    5.00, 'Estudo linguístico-computacional sobre estratégias discursivas de desinformação vacinal em redes sociais brasileiras.',                                  NULL,          NULL,         'aguardando_aprovacao', NULL,        '2025-04-10 16:00:00'),
(7, 8, 4, 'Eficácia de Probióticos na Redução de Infecções Hospitalares em UTI Neonatal',  'all-or-nothing', 45000.00, 45000.00, 5.00, 'Ensaio clínico randomizado avaliando o uso de probióticos na microbiota intestinal de neonatos para prevenção de sepse hospitalar.',                    '2024-05-01', '2024-07-30', 'encerrado',           '2024-05-01', '2024-04-15 10:00:00');


-- ============================================================
-- SEGUIR_CAMPANHA
-- ============================================================
INSERT INTO seguir_campanha (id_usuario, id_campanha) VALUES
(2, 1),
(3, 1),
(4, 2),
(5, 3),
(6, 3),
(7, 5),
(1, 7);


-- ============================================================
-- SEGUIR_PESQUISADOR
-- ============================================================
INSERT INTO seguir_pesquisador (id_usuario, id_pesquisador) VALUES
(2, 1),
(3, 1),
(4, 3),
(5, 2),
(6, 7),
(7, 3),
(1, 5);


-- ============================================================
-- CONTRIBUICAO
-- ============================================================
-- CORRIGIDO: seed representa dados históricos já concluídos, então
-- os triggers de proteção (pensados para tráfego em tempo real)
-- são desligados só durante a carga do seed e religados em seguida.
ALTER TABLE contribuicao DISABLE TRIGGER trg_valida_status_contribuicao;
ALTER TABLE contribuicao DISABLE TRIGGER trg_contribuicao_all_or_nothing_pix;

INSERT INTO contribuicao (id_campanha, id_usuario, valor, meio_pagamento, status, anonima, id_transacao_api, criado_em) VALUES
(1, 2, 5000.00, 'pix',            'repassado',  FALSE, 'TXN-PIX-0001', '2024-02-10 10:00:00'),
(1, 3, 2300.00, 'cartao_credito', 'repassado',  FALSE, 'TXN-CC-0002',  '2024-02-12 14:30:00'),
(2, 1, 1500.00, 'pix',            'repassado',  TRUE,  'TXN-PIX-0003', '2024-02-20 09:00:00'),
(3, 5, 8000.00, 'boleto',         'repassado',  FALSE, 'TXN-BOL-0004', '2024-03-05 11:00:00'),
(5, 4, 2200.00, 'cartao_debito',  'repassado',  FALSE, 'TXN-CD-0005',  '2024-04-10 15:00:00'),
(7, 6,  500.00, 'pix',            'repassado',  TRUE,  'TXN-PIX-0006', '2024-05-10 08:00:00'),
(4, 7,  800.00, 'cartao_credito', 'a_devolver', FALSE, 'TXN-CC-0007',  '2024-03-15 12:00:00');

ALTER TABLE contribuicao ENABLE TRIGGER trg_valida_status_contribuicao;
ALTER TABLE contribuicao ENABLE TRIGGER trg_contribuicao_all_or_nothing_pix;


-- ============================================================
-- AUDITORIA_FINANCEIRA
-- ============================================================
INSERT INTO auditoria_financeira (id_contribuicao, status_novo, status_anterior, evento, timestamp) VALUES
(1, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-02-10 10:05:00'),
(1, 'repassado',  'confirmado', 'meta_atingida_repasse_efetuado', '2024-04-05 10:00:00'),
(2, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-02-12 14:35:00'),
(3, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-02-20 09:10:00'),
(4, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-03-05 11:15:00'),
(7, 'confirmado', 'pendente',   'pagamento_confirmado_gateway',   '2024-03-15 12:10:00'),
(7, 'a_devolver', 'confirmado', 'meta_nao_atingida_devolucao',    '2024-04-25 00:00:00');


-- ============================================================
-- ATUALIZACAO_CAMPANHA
-- ============================================================
INSERT INTO atualizacao_campanha (id_campanha, conteudo, publicado_em, fase, tipo) VALUES
(1, 'Iniciamos a coleta de dados clínicos com parceria do Hospital das Clínicas. Primeiros 200 exames de neuroimagem analisados.', '2024-02-20 10:00:00', 'andamento',          'texto'),
(1, 'Modelo de deep learning atingiu acurácia de 89% na base de validação. Aguardamos revisão por pares..',                        '2024-03-15 14:00:00', 'resultado_preliminar','texto'),
(2, 'Primeiros 10 protótipos de prótese impressos e testados por voluntários. Ajustes ergonômicos em andamento.',                  '2024-03-05 09:30:00', 'andamento',          'imagem'),
(3, 'Coleta de amostras concluída em 5 biomas. 120 espécies de fungos catalogadas para análise laboratorial.',                     '2024-04-01 11:00:00', 'andamento',          'texto'),
(5, 'Questionários aplicados em 12 comunidades quilombolas. Dados sendo sistematizados para análise estatística.',                  '2024-05-01 08:00:00', 'andamento',          'texto'),
(7, 'Ensaio clínico concluído. Grupo probiótico apresentou redução de 34% nas taxas de sepse versus controle.',                    '2024-09-01 10:00:00', 'resultado_final',    'pdf'),
(1, 'Artigo submetido ao periódico Nature Medicine. Código e dataset disponibilizados em repositório público.',                     '2024-04-10 16:00:00', 'resultado_final',    'linkexterno');


-- ============================================================
-- ARQUIVO_ATUALIZACAO
-- ============================================================
INSERT INTO arquivo_atualizacao (id_arquivo, id_atualizacao) VALUES
(3, 3),
(8, 6),
(1, 1),
(2, 2),
(4, 4),
(5, 5),
(6, 7);


-- ============================================================
-- REPASSE
-- ============================================================
ALTER TABLE repasse DISABLE TRIGGER trg_valida_repasse;

INSERT INTO repasse (id_campanha, valor_bruto, valor_liquido, meta_atingida, repassado_em, taxa_relativa, status) VALUES
(1, 52300.00, 49685.00, TRUE,  '2024-04-05 10:00:00', 5.00, 'concluido'),
(2, 28500.00, 27075.00, FALSE, '2024-05-10 10:00:00', 5.00, 'concluido'),
(3, 40000.00, 38000.00, TRUE,  '2024-06-10 10:00:00', 5.00, 'concluido'),
(5, 22000.00, 20900.00, FALSE, '2024-06-10 10:00:00', 5.00, 'concluido'),
(7, 45000.00, 42750.00, TRUE,  '2024-08-10 10:00:00', 5.00, 'concluido'),
(4,  8000.00,  0.00,    FALSE, NULL,                   5.00, 'a_devolver'),
(2, 28500.00,    0.00,  FALSE, NULL,                   5.00, 'parcial_processando');

ALTER TABLE repasse ENABLE TRIGGER trg_valida_repasse;


-- ============================================================
-- SOLICITACAO_ENCERRAMENTO
-- ============================================================
INSERT INTO solicitacao_encerramento (id_campanha, id_admin, justificativa_pesquisador, status, solicitado_em, avaliado_em) VALUES
(7, 8,   'Todos os objetivos do ensaio clínico foram atingidos e resultados publicados. Solicito encerramento formal.', 'aprovado',  '2024-08-05 09:00:00', '2024-08-06 11:00:00'),
(1, 8,   'Artigo publicado e resultados divulgados à comunidade. Encerrando ciclo da campanha.',                         'aprovado',  '2024-04-12 10:00:00', '2024-04-13 09:00:00'),
(3, 8,   'Análises laboratoriais concluídas e relatório final entregue. Solicito encerramento.',                         'aprovado',  '2024-06-15 14:00:00', '2024-06-16 10:00:00'),
(4, 8,   'Meta financeira não atingida. Solicitando encerramento e devolução de valores aos apoiadores.',                'aprovado',  '2024-04-25 00:00:00', '2024-04-25 08:00:00'),
(5, 8,   'Relatório de pesquisa entregue à UFSC e comunidades. Encerrando formalmente a campanha.',                     'aprovado',  '2024-06-12 11:00:00', '2024-06-13 09:00:00'),
(2, 8,   'Distribuição das próteses concluída. Solicito encerramento e repasse dos valores arrecadados.',               'aprovado',  '2024-05-12 08:00:00', '2024-05-13 10:00:00'),
(6, NULL,'Desejo encerrar a campanha antes da aprovação por motivos pessoais de agenda.',                                'cancelado', '2025-04-15 12:00:00', NULL);


-- ============================================================
-- HISTORICO_REJEICAO
-- ============================================================
INSERT INTO historico_rejeicao (id_campanha, id_admin, justificativa, rejeitado_em) VALUES
(4, 8, 'Campanha não apresentou metodologia clara nem parecer de comitê de ética em pesquisa.',               '2024-03-08 10:00:00'),
(6, 8, 'Escopo da pesquisa não enquadrado como pesquisa acadêmica financiável pela plataforma.',              '2024-04-12 11:00:00'),
(1, 8, 'Versão inicial sem descrição detalhada dos dados utilizados. Resubmissão solicitada.',                '2024-01-25 09:00:00'),
(2, 8, 'Faltou anexar declaração institucional da UNICAMP. Campanha devolvida para ajuste.',                  '2024-02-08 14:00:00'),
(3, 8, 'Meta financeira considerada excessiva sem justificativa de custos detalhada. Ajuste e reenvio.',      '2024-02-22 10:00:00'),
(5, 8, 'Necessidade de inclusão de termo de consentimento das comunidades quilombolas no projeto.',           '2024-03-22 13:00:00'),
(7, 8, 'Protocolo de ensaio clínico incompleto. Aprovação pelo CEP obrigatória antes de prosseguir.',        '2024-04-17 11:00:00');


-- ============================================================
-- COMENTARIO
-- ============================================================
INSERT INTO comentario (id_campanha, id_pesquisador, conteudo, endossado, criado_em, ordem_endosso) VALUES
(1, 2, 'Pesquisa extremamente relevante! A detecção precoce de Alzheimer pode mudar vidas. Apoio totalmente.',          TRUE,  '2024-02-15 10:00:00', 1),
(1, 3, 'Parabéns pela metodologia robusta com redes neurais. Seria interessante publicar o dataset aberto.',            TRUE,  '2024-02-18 14:00:00', 2),
(1, 7, 'Acompanhei cada etapa desta campanha. Exemplo de transparência e rigor científico.',                           TRUE,  '2024-04-12 13:00:00', 3),
(2, 1, 'Iniciativa incrível de engenharia aplicada. A parceria com o SUS é essencial para o impacto real.',            FALSE, '2024-03-01 09:00:00', NULL),
(3, 5, 'Bioprospecção da Caatinga é subutilizada. Fico feliz em ver investimento nessa área tão rica.',                TRUE,  '2024-03-10 11:00:00', 1),
(5, 7, 'Estudo importantíssimo para as comunidades quilombolas. A metodologia participativa é um diferencial.',         FALSE, '2024-04-15 16:00:00', NULL),
(7, 2, 'Ensaio clínico com resultado impressionante de 34% de redução de sepse. Esse trabalho merece publicação top.', TRUE,  '2024-09-05 10:00:00', 1);


-- ============================================================
-- DENUNCIA
-- ============================================================
INSERT INTO denuncia (id_usuario, id_campanha_alvo, id_pesquisador_alvo, id_motivo, status, criado_em) VALUES
(2, 6,    NULL, 1, 'improcedente', '2025-04-11 09:00:00'),
(3, NULL, 6,    5, 'pendente',     '2025-04-12 10:00:00'),
(4, 4,    NULL, 1, 'resolvida',    '2024-03-16 11:00:00'),
(5, NULL, 4,    6, 'em_analise',   '2024-03-20 14:00:00'),
(6, 2,    NULL, 2, 'improcedente', '2024-03-02 08:00:00'),
(7, NULL, 6,    7, 'pendente',     '2025-04-13 15:00:00'),
(1, 6,    NULL, 4, 'pendente',     '2025-04-14 10:00:00');



-- ============================================================
-- Para logar no app, crie um usuário real em:
--   Supabase → Authentication → Users → Add user → Auto Confirm User
-- O trigger on_auth_user_created cria o registro em usuario automaticamente.
-- O papel admin é atribuído pelo schema (veja crowd_academico_schema.sql).
-- ============================================================

-- ============================================================
--  FIX — permission denied for sequence ..._seq
-- ============================================================
--  Causa: GRANT INSERT numa tabela não libera automaticamente o uso
--  da sequência por trás de uma coluna SERIAL/IDENTITY. Sem USAGE na
--  sequência, o Postgres não consegue gerar o próximo ID no INSERT,
--  mesmo a tabela já tendo GRANT INSERT — daí o erro 42501.
--
--  Isso afeta TODA tabela que recebeu GRANT INSERT pra "authenticated"
--  no script anterior (seguir_pesquisador, campanha, contribuicao,
--  comentario, denuncia, seguir_campanha, link_academico, etc.) — não
--  só seguir_pesquisador. Esta linha resolve pra todas de uma vez.
-- ============================================================

-- ------------------------------------------------------------
-- NOTA DE REORGANIZAÇÃO: o GRANT nas sequências que originalmente
-- ficava aqui (fix avulso de "permission denied for sequence")
-- foi movido para 05_grants.sql, junto dos demais GRANTs.
-- ------------------------------------------------------------


-- ============================================================
-- 10. BACKFILL — recalcula os 7 pesquisadores do seed agora, trocando
--     os valores fixos (digitados à mão) pelos valores calculados de
--     verdade a partir dos dados que já existem no banco.
-- ============================================================
SELECT public.recalcular_todos_os_scores();
