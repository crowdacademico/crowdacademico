# Histórico dos comentários dos arquivos .sql

Arquivo morto criado em 24-09-2026. Os cabeçalhos longos de `01` a `06` (histórico de correções, porquês, achados de auditoria) foram tirados dos `.sql`, para eles voltarem a ser só código e um cabeçalho curto. **Nada foi apagado:** cada bloco original está abaixo, palavra por palavra, com o identificador `[NN-Cnnn]` que o `.sql` cita no ponteiro "Histórico e porquês". O texto é histórico e pode estar desatualizado (cada bloco traz a data em que foi escrito); a regra vigente está em `DOCUMENTACAO_BD.md`. Não edite este arquivo para mudar regra: ele só guarda o que já foi dito.

### [01-C001] 01_extensoes_enums_tabelas.sql (linhas originais 61 a 69)

```text
-- ADICIONADO (28-07-2026) - guarda de BYPASSRLS: não resolve sozinho o item 22 do
-- PENDENCIAS (ainda é preciso confirmar se o papel usado no SQL Editor do Supabase
-- tem BYPASSRLS antes do deploy), mas transforma uma falha silenciosa em uma parada
-- única e autoexplicativa. Sem esta guarda, rodar os arquivos 04-07 como um papel
-- sem BYPASSRLS (nem superusuário) produz dezenas de erros de "new row violates
-- row-level security policy" espalhados pelos INSERTs do 07 - 99 das 116 policies
-- são TO app_nestjs, então qualquer outro papel (dono da tabela incluído, por causa
-- do FORCE ROW LEVEL SECURITY do 04) fica bloqueado silenciosamente em quase tudo.
-- Com a guarda, o erro é um só, no início, e explica exatamente o que fazer.
```

### [01-C002] 01_extensoes_enums_tabelas.sql, arquivo (linhas originais 216 a 235)

```text
-- ATUALIZADA (24-08-2026, módulo 25-arquivo implementado - ver revisão de
-- arquitetura de upload B2/R2 e ATUALIZAR O SUPABASE.sql do mesmo dia):
-- duas mudanças pedidas na revisão:
-- 1. `url` (endereço completo) virou `chave` (só o caminho do objeto
--    dentro do bucket, ex. "publico/<uuid>.jpg"). A URL pública é montada
--    em RUNTIME por commons/storage, a partir de STORAGE_PUBLIC_BASE_URL
--    + esta coluna - trocar de domínio ou de provedor de armazenamento
--    (Backblaze B2 hoje, Cloudflare R2 amanhã, ambos falam o protocolo
--    S3) nunca mais precisa de UPDATE em massa aqui. UNIQUE porque o nome
--    é sempre gerado pelo backend (randomUUID em
--    arquivo.service.iniciar-upload.ts), nunca pelo cliente - colisão
--    indicaria bug, não uso normal.
-- 2. `id_usuario_upload` - a tabela não tinha dono. Sem isso não dava pra
--    responder "quem subiu este arquivo?", limitar quantos uploads uma
--    conta faz por hora, nem localizar o que uma conta banida enviou.
--    Sem FK inline de propósito: `usuario` só é criada MAIS ABAIXO neste
--    mesmo arquivo (e já referencia `arquivo` via FK_USUARIO_IMAGEM -
--    dependência circular entre as duas tabelas). A FK
--    FK_ARQUIVO_USUARIO_UPLOAD é adicionada por ALTER TABLE logo depois
--    que `usuario` existe (ver comentário lá).
```

### [01-C003] 01_extensoes_enums_tabelas.sql, orcamento_campanha (linhas originais 628 a 642)

```text
-- ADICIONADO (31-07-2026, Alexia): orçamento estruturado da campanha (itens de gasto
-- com categoria + valor), inspirado na estrutura de campanha do Experiment.com
-- (pedido do time). Substitui a antiga prática de descrever o
-- orçamento só em texto livre dentro de campanha.descricao - aqui vira dado
-- estruturado, que dá pra somar, validar contra meta_financeira e renderizar
-- em gráfico de pizza na página da campanha (o cálculo do percentual de cada
-- fatia fica pra depois - SUM(valor)/meta_financeira*100 é feito na consulta,
-- não armazenado). RN: soma de todos os itens de uma campanha precisa bater
-- EXATAMENTE com campanha.meta_financeira, e a quantidade de itens fica entre
-- configuracoes.orcamento_min_itens e configuracoes.orcamento_max_itens - ambas
-- checadas no envio, na aprovação e na inserção, ver fn_valida_completude_campanha e
-- fn_valida_limite_max_orcamento_campanha (05, [05-K-2]). Congela junto com o
-- resto da campanha (mesma condição de status de fn_congela_regras_campanha),
-- porque mexer nos itens depois de aprovado quebraria a igualdade com uma
-- meta_financeira que já está congelada.
```

### [01-C004] 01_extensoes_enums_tabelas.sql, marco_cronograma (linhas originais 660 a 673)

```text
-- ADICIONADO (31-07-2026, Alexia): cronograma estruturado da campanha (marcos com
-- título, descrição e data prevista), mesmo pedido/origem de orcamento_campanha
-- acima. Diferente de atualizacao_campanha (que registra o que JÁ aconteceu,
-- publicado durante a execução), marco_cronograma é o PLANO anunciado antes
-- da campanha começar a ser financiada - plano esse que trava assim que a
-- campanha efetivamente começa (campanha.data_inicio <= NOW()), mesma janela
-- de carência que campanha.data_inicio/data_fim já tinham (fn_congela_regras_
-- campanha, 05, feature "Em breve") - não trava já na aprovação, porque entre
-- aprovar e começar de fato o pesquisador pode legitimamente precisar
-- reorganizar datas. RN: a quantidade de marcos fica entre
-- configuracoes.cronograma_min_marcos e configuracoes.cronograma_max_marcos
-- (checadas no envio, na aprovação e na inserção, mesmas funções de orcamento_campanha) e
-- cada data_prevista precisa ser >= campanha.data_inicio (pode ultrapassar
-- data_fim sem problema - ver fn_valida_data_marco_cronograma, 05, [05-K-2]).
```

### [03-C001] 03_funcoes_seguranca.sql, id_usuario_atual (linhas originais 53 a 70)

```text
-- ============================================================
-- [03-J] CONTEXTO DE SESSÃO E IDENTIFICAÇÃO DE USUÁRIO
-- ============================================================
-- Função:     id_usuario_atual
-- Assinatura: () -> INT
-- Bloco:      [03-J]
-- Regra:      Lê o id do usuário autenticado a partir da variável de sessão
--             app.id_usuario_atual, definida pelo NestJS via SET LOCAL logo
--             no início da transação, após validar o JWT. O segundo
--             argumento true de current_setting() evita erro fatal quando a
--             variável não foi definida (sessão anônima), retornando NULL.
-- CORRIGIDO (bug crítico): `, true` só cobre "variável nunca definida" - não cobre
-- "definida como string vazia", e '' :: INT lança exceção. Como tem_permissao() chama
-- esta função e aparece em 89 das 105 policies, uma sessão anônima onde o NestJS
-- interpola algo como `${usuario?.id ?? ''}` derrubava QUALQUER consulta a tabela
-- protegida, inclusive a listagem pública de campanhas. NULLIF(..., '') trata os dois
-- casos (não definida e definida vazia) como a mesma coisa: usuário anônimo, NULL.
-- ----------------------------------------------------------------------------
```

### [03-C002] 03_funcoes_seguranca.sql, tem_permissao (linhas originais 81 a 103)

```text
-- ============================================================
-- [03-B] CONTROLE DE ACESSO GRANULAR (RBAC)
-- ============================================================
-- Função:     tem_permissao
-- Assinatura: (p_permissao TEXT) -> BOOLEAN
-- Bloco:      [03-B]
-- Regra:      Autorização por capacidade - valida se o usuário atual possui,
--             via algum papel em usuario_papel, a permissão nomeada em
--             papel_permissao (ex.: 'campanha_aprovar'), nunca por nome de
--             papel. Se id_usuario_atual() for NULL (anônimo), o subselect
--             não encontra nenhuma linha e a função retorna FALSE de forma
--             determinística, sem tratamento especial de NULL necessário.
-- ----------------------------------------------------------------------------
-- AMPLIADA (09-08-2026, Bloco G do prompt de uma IA - moderação):
-- passou a ignorar vínculo usuario_papel com suspenso_ate no futuro (ver
-- [01-B]) - um papel suspenso não concede mais nenhuma permissão dele
-- enquanto durar a suspensão, sem precisar remover o vínculo (volta
-- sozinho quando o prazo passa). Escopo desta mudança: só ignora PAPEL
-- suspenso, não checa suspensão de CONTA (usuario.suspenso_ate) - isso é
-- barrado no LOGIN (3-auth), mesmo raciocínio já usado pra bloqueado_ate;
-- um access token emitido pouco antes de uma suspensão de conta continua
-- válido até expirar (15min, JWT_ACCESS_EXPIRES_IN), risco residual aceito
-- de propósito, coerente com o resto do desenho de sessão do projeto.
```

### [03-C003] 03_funcoes_seguranca.sql, listar_papeis_usuario (linhas originais 122 a 144)

```text
-- ----------------------------------------------------------------------------
-- Função:     listar_papeis_usuario
-- Assinatura: (p_id_usuario INT) -> SETOF TEXT
-- Bloco:      [03-B]
-- Regra:      SECURITY DEFINER de propósito (09-08-2026, Bloco B/C do prompt
--             de uma IA sobre cabeçalho/avatar) - devolve o CÓDIGO
--             (`papel.codigo`, não `papel.nome`) dos papéis de um usuário
--             pra login/refresh (03-auth) decidirem se mostram "Painel
--             Admin" no dropdown do cabeçalho. `codigo`, não `nome`, pelo
--             mesmo motivo já documentado em [01-B]/alterar-papel.jsx: o
--             RÓTULO exibido (`nome`) é editável pelo painel - se essa
--             checagem lesse `nome`, renomear o papel "admin" pra outra
--             coisa quebraria silenciosamente a condição "é admin?" no
--             frontend. `codigo` nunca é exposto/editável, só `nome`.
--             Chamada de DENTRO do próprio login/refresh, onde
--             id_usuario_atual() ainda é NULL (a sessão que autorizaria
--             esse usuário está sendo criada NESTA MESMA requisição) -
--             pol_usuariopapel_select (04) exige id_usuario_atual() =
--             idUsuario OU tem_permissao('papel_gerenciar'), nenhum dos
--             dois é verdade ainda nesse momento; sem SECURITY DEFINER a
--             RLS devolveria 0 linhas sempre, mesmo pro dono da própria
--             sessão.
-- ----------------------------------------------------------------------------
```

### [03-C004] 03_funcoes_seguranca.sql, usuario_visivel (linhas originais 159 a 172)

```text
-- ============================================================
-- [03-D] VISIBILIDADE DE CONTA (SOFT DELETE)
-- ============================================================
-- Função:     usuario_visivel
-- Assinatura: (p_id INT) -> BOOLEAN
-- Bloco:      [03-D]
-- Regra:      CORRIGIDO - pol_usuario_select (04) já escondia usuario.deletado = TRUE,
--             mas pol_perfil_select e pol_link_select eram USING (TRUE) sem olhar
--             pra esse flag: perfil acadêmico e links de uma conta "excluída"
--             continuavam públicos. Centralizar a checagem numa função (mesmo
--             padrão de tem_permissao) evita que a próxima policy pública nasça
--             com o mesmo furo. Se o usuário não existir (não deveria acontecer,
--             FK garante), o padrão é considerar invisível.
-- ----------------------------------------------------------------------------
```

### [03-C005] 03_funcoes_seguranca.sql, registrar_aceite_termo (linhas originais 183 a 206)

```text
-- ----------------------------------------------------------------------------
-- Função:     registrar_aceite_termo
-- Assinatura: (p_id_usuario INT, p_id_termo INT, p_ip TEXT) -> VOID
-- Bloco:      [03-D-1]
-- Regra:      SECURITY DEFINER de propósito (09-08-2026, Bloco D do prompt do
--             uma IA sobre cadastro público) - grava o aceite dos Termos
--             de Uso (usuario_termo) no MOMENTO do cadastro, quando a conta
--             acabou de ser criada NESTA MESMA requisição e ainda não existe
--             sessão nenhuma (id_usuario_atual() é NULL). pol_usuario_termo_
--             insert (04) exige id_usuario = id_usuario_atual() - verdade
--             pra alguém JÁ logado aceitando um termo novo depois, mas nunca
--             verdade durante o próprio cadastro. Mesmo raciocínio de
--             atribuir_papel_padrao() (08_bootstrap_final.sql, [08-D-1]),
--             chamada no mesmo instante do mesmo jeito.
--             Sem checagem de autorização própria (diferente de
--             excluir_conta_usuario, [03-O]) porque quem decide QUAL
--             p_id_usuario passar é sempre o código do backend (o id do
--             usuário RECÉM-CRIADO na mesma transação, nunca um valor vindo
--             direto do corpo da requisição) - não existe caminho pelo qual
--             um cliente influencie esse parâmetro pra forjar aceite em nome
--             de outra conta. ON CONFLICT DO NOTHING: mesma trava de
--             UK_USUARIO_TERMO_USUARIO_TERMO (01), idempotente se chamada
--             de novo por engano.
-- ----------------------------------------------------------------------------
```

### [03-C006] 03_funcoes_seguranca.sql, contar_seguidores_pesquisador (linhas originais 218 a 236)

```text
-- ============================================================
-- [03-E] CONTAGEM AGREGADA DE SEGUIDORES (item 18 da Lista C)
-- ============================================================
-- Função:     contar_seguidores_pesquisador / contar_seguidores_campanha
-- Assinatura: (p_id INT) -> INT
-- Bloco:      [03-E]
-- Regra:      ADICIONADO (28-07-2026) - pol_seg_pesq_select/pol_seg_campanha_select
--             (04) só liberam SELECT das próprias linhas de "quem eu sigo"; ninguém
--             consegue contar quantos seguidores um pesquisador/campanha tem, nem o
--             próprio dono. Não dá pra resolver isso com uma policy: RLS filtra
--             LINHA, então `SELECT count(*)` sempre soma só o que a sessão já
--             enxerga - liberar a policy pra "contar" também exporia as linhas
--             (e as identidades de quem segue) junto. O caminho é uma função
--             SECURITY DEFINER que devolve só o número (mesmo padrão de
--             usuario_visivel/tem_permissao) - contagem pública, identidade
--             privada, igual Catarse/Experiment fazem com apoiador.
--             Efeito colateral: idx_seguir_pesquisador_alvo (02) deixa de ser
--             índice morto - passa a ser exatamente o que esta função usa.
-- ----------------------------------------------------------------------------
```

### [03-C007] 03_funcoes_seguranca.sql, confirmar_email_por_token (linhas originais 302 a 316)

```text
-- ----------------------------------------------------------------------------
-- Função:     confirmar_email_por_token
-- Assinatura: (p_token_hash TEXT) -> BOOLEAN
-- Bloco:      [03-O]
-- Regra:      SUBSTITUI confirmar_email_usuario(p_id_usuario) - em vez de confiar
--             num id vindo de fora (que o NestJS resolvia depois de validar o
--             token, mas a função em si aceitava qualquer id), a função recebe o
--             próprio token e resolve o dono sozinha: procura em
--             verificacao_email, confere que não expirou nem foi usado
--             (confirmado_em IS NULL), marca confirmado_em = NOW() e verifica o
--             e-mail do dono daquele token, tudo numa transação. O segredo (o
--             token) É a autorização - elimina a superfície de ataque em vez de
--             só checá-la. Retorna TRUE se confirmou, FALSE se o token não existe,
--             já expirou ou já foi usado (o NestJS decide a mensagem de erro).
-- ----------------------------------------------------------------------------
```

### [03-C008] 03_funcoes_seguranca.sql, registrar_falha_login (linhas originais 342 a 358)

```text
-- ----------------------------------------------------------------------------
-- Função:     registrar_falha_login
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-O]
-- Regra:      Incrementa tentativas_login_falhas; ao atingir
--             configuracoes.limite_tentativas_login, bloqueia a conta por
--             configuracoes.bloqueio_login_minutos (nenhum número fixo - os
--             dois são configuráveis pelo Painel Admin, mesmo padrão dos
--             outros limites do item 16 da Lista C).
-- SEM AUTORIZAÇÃO DE PROPÓSITO - pré-autenticação: chamada durante o próprio
-- login, antes de existir sessão (id_usuario_atual() é NULL nesse momento por
-- definição). O banco não tem como checar quem está chamando; é de confiança do
-- backend. VETOR DE DoS se usada errado: chamar esta função com um id arbitrário
-- 5x bloqueia a conta de QUALQUER pessoa. O endpoint de login PRECISA derivar
-- p_id_usuario do e-mail informado no próprio formulário de login - nunca aceitar
-- um id vindo direto do cliente.
-- ----------------------------------------------------------------------------
```

### [03-C009] 03_funcoes_seguranca.sql, liberar_bloqueio_login (linhas originais 386 a 397)

```text
-- ----------------------------------------------------------------------------
-- Função:     liberar_bloqueio_login
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-O]
-- Regra:      Zera tentativas_login_falhas e limpa bloqueado_ate. SEMPRE ação de
--             suporte/admin sobre a conta de outra pessoa - nunca do próprio
--             usuário (quem está bloqueado não consegue logar pra chamar nada; e
--             registrar_login_sucesso() já faz o mesmo reset automaticamente
--             quando o login dá certo). Exige a permissão usuario_desbloquear -
--             CORRIGIDO (28-07-2026, uma IA): a 1ª versão não checava nada,
--             qualquer usuário comum conseguia desbloquear a conta de outro.
-- ----------------------------------------------------------------------------
```

### [03-C010] 03_funcoes_seguranca.sql, registrar_login_sucesso (linhas originais 415 a 431)

```text
-- ----------------------------------------------------------------------------
-- Função:     registrar_login_sucesso
-- Assinatura: (p_id_usuario INT, p_ip TEXT) -> VOID
-- Bloco:      [03-O]
-- Regra:      Grava ultimo_login_em/ultimo_login_ip e zera o estado de falha
--             (tentativas_login_falhas, bloqueado_ate) - um login bem sucedido
--             sempre limpa o histórico de tentativas anteriores. p_ip é TEXT
--             (não VARCHAR(45), o tipo da coluna) de propósito - evita
--             ambiguidade de modificador de tipo na assinatura da função
--             usada por GRANT EXECUTE; o cast pra VARCHAR(45) da coluna
--             acontece implicitamente no UPDATE.
-- SEM AUTORIZAÇÃO DE PROPÓSITO - pré-autenticação: mesma situação de
-- registrar_falha_login (chamada durante o próprio login, id_usuario_atual() é
-- NULL nesse momento). De confiança do backend - p_id_usuario precisa vir do
-- e-mail/senha já validados nesta mesma chamada de login, nunca de um parâmetro
-- solto vindo do cliente.
-- ----------------------------------------------------------------------------
```

### [03-C011] 03_funcoes_seguranca.sql, registrar_exportacao_dados (linhas originais 444 a 461)

```text
-- ----------------------------------------------------------------------------
-- Função:     registrar_exportacao_dados
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-O]
-- Regra:      Item 7 de PENDENCIAS (exportação de dados do usuário, LGPD
--             Art. 18) - deixa rastro em log_auditoria a cada chamada de
--             GET /usuario/eu/exportar-dados. `app_nestjs` só tem GRANT
--             SELECT em log_auditoria (06) - de propósito, quem grava é só
--             a trigger fn_log_auditoria() (05), pra ninguém conseguir
--             forjar/inflar o histórico de auditoria escrevendo direto
--             nele. Mesma categoria de pré-autorização de
--             registrar_falha_login/registrar_login_sucesso (acima nesta
--             seção): SECURITY DEFINER contorna essa restrição só pra este
--             propósito específico, sem abrir INSERT geral na tabela.
--             p_id_usuario precisa ser sempre o próprio usuário autenticado
--             (o endpoint não aceita :id, ver usuario.controller.exportar-
--             dados.ts) - nunca um valor arbitrário vindo do cliente.
-- ----------------------------------------------------------------------------
```

### [03-C012] 03_funcoes_seguranca.sql, excluir_conta_usuario (linhas originais 472 a 496)

```text
-- ----------------------------------------------------------------------------
-- Função:     excluir_conta_usuario
-- Assinatura: (p_id_usuario INT) -> VOID
-- Bloco:      [03-O]
-- Regra:      RNF-003 (LGPD) - marca a conta como deletado = TRUE. Ponto único
--             de exclusão de propósito: não existe função equivalente pra
--             reverter (deletado = FALSE) - a exclusão é deliberadamente uma
--             via de mão única, coerente com o desenho de anonimização já
--             existente (usuario_visivel(), item 17 em PENDENCIAS.md). Permite
--             o próprio usuário excluir a própria conta (sem precisar de
--             permissão nenhuma) OU quem tiver usuario_excluir agindo sobre a
--             conta de outra pessoa - CORRIGIDO (28-07-2026, uma IA): a 1ª
--             versão não checava nada, qualquer usuário comum conseguia excluir
--             a conta de qualquer outra.
-- CORRIGIDO (28-07-2026, uma IA - 4ª auditoria, "excluir conta não deixa
-- rastro"): gravava deletado = TRUE e mais nada - o Art. 37 da LGPD exige
-- registro de quem fez e quando numa operação de tratamento, e exclusão é a
-- mais sensível de todas. Passou a gravar deletado_em/deletado_por (01) também.
-- DECISÃO DE PRODUTO NA MESMA AUDITORIA: usuario_excluir saiu do papel
-- 'suporte' (07) - Catarse/Experiment tratam exclusão de conta como
-- auto-serviço do titular, suporte abre chamado mas não executa. Só o admin
-- mantém a permissão (auto-atribuída via trg_admin_recebe_toda_permissao); o
-- próprio usuário continua podendo excluir a própria conta sem nenhuma
-- permissão, como sempre.
-- ----------------------------------------------------------------------------
```

### [03-C013] 03_funcoes_seguranca.sql, suspender_pesquisador (linhas originais 538 a 580)

```text
-- ============================================================
-- [03-P] MODERAÇÃO SOBRE PESQUISADOR - SUSPENSÃO EM CASCATA (RF-084)
-- ============================================================
-- ----------------------------------------------------------------------------
-- Função:     suspender_pesquisador
-- Assinatura: (p_id_usuario INT) -> BOOLEAN
-- Bloco:      [03-P]
-- Regra:      30-07-2026 - RF-084 dizia que suspender um pesquisador encerra
--             automaticamente as campanhas ativas dele e rejeita as
--             pendentes, mas não existia NENHUM caminho no banco pra
--             suspender alguém: `pol_perfil_update` (04) só libera UPDATE em
--             perfil_pesquisador pro próprio dono (id_usuario =
--             id_usuario_atual()) - ou seja, `status_pesquisador` só podia
--             mudar por auto-serviço, nunca por ação de moderação. Esta
--             função é o caminho que faltava: exige a permissão
--             'usuario_suspender' - que já existia seedada (só pro admin) e
--             já era referenciada em `pol_usuario_update` (04), mas nunca
--             tinha uma escrita de verdade atrás dela (mesma classe de
--             "alavanca fantasma" já achada uma vez neste projeto, ver item
--             13 quinto ponto em PENDENCIAS.md - permissão existia, nada a
--             lia pra decidir algo). Passa a ganhar um uso real aqui. Marca o
--             perfil como suspenso e, na mesma transação, aplica a cascata do
--             RF-084. SECURITY DEFINER bypassa a RLS de campanha
--             (pol_campanha_update não libera pra quem só tem
--             'usuario_suspender'), mas NÃO bypassa `trg_campanha_valida_transicao`
--             (05) - a trigger continua rodando e só deixa passar porque
--             ganhou um ramo autoverificável novo pra este caso exato (ver [05-K-2]),
--             mesmo padrão já usado pro prazo vencido e pro cron de
--             encerramento (item 58, PENDENCIAS.md, parte 10). Retorna FALSE
--             sem fazer nada se o pesquisador já estava suspenso (idempotente).
--
-- ATUALIZADA (07-09-2026, pedido do Lucas): ganhou `p_ate`/`p_motivo`, mesmo
-- padrão de suspender_usuario ([03-N]) - motivo obrigatório, visível pro
-- próprio pesquisador (RF - "ele precisa saber o porquê"), diferente de
-- suspender a CONTA: aqui o login continua funcionando normal, só a
-- autoridade de pesquisador é suspensa. Expira sozinho quando `p_ate`
-- passa - ver reativar_pesquisadores_vencidos() (05), chamada por @Cron a
-- cada 15 min, mesmo padrão de encerrar_campanhas_vencidas.
--
-- ATUALIZADA (21-09-2026): a rejeição em cascata das campanhas 'aguardando_aprovacao'
-- grava uma linha em historico_rejeicao por campanha. Rascunhos não são tocados.
-- Ver DOCUMENTACAO_BD.md [05-K-2-B].
-- ----------------------------------------------------------------------------
```

### [03-C014] 03_funcoes_seguranca.sql, reativar_pesquisador (linhas originais 632 a 654)

```text
-- ----------------------------------------------------------------------------
-- Função:     reativar_pesquisador
-- Assinatura: (p_id_usuario INT) -> BOOLEAN
-- Bloco:      [03-P]
-- Regra:      30-07-2026 (item 60, PENDENCIAS.md - recomendação de uma IA,
--             confirmada pelo Lucas). Só devolve status_pesquisador pra
--             'ativo' - devolve a capacidade do pesquisador de criar campanha
--             nova. NÃO toca em nenhuma linha de campanha, de propósito:
--             quando suspender_pesquisador() rodou, o dinheiro das campanhas
--             fechadas já começou a se mexer (devolução ao doador no
--             all-or-nothing, ou repasse já liberado no flexível) - esse
--             movimento acontece no NestJS/gateway, fora do banco, reagindo à
--             mudança para 'encerrado_moderacao'. Reabrir a campanha depois
--             seria prometer algo que a plataforma não consegue cumprir (o
--             dinheiro já foi ou está indo embora). Campanha suspensa fica
--             fechada para sempre, mesmo após reativação - só campanha NOVA,
--             criada depois de reativado, é afetada. Mesma permissão de
--             suspender_pesquisador() (quem pode suspender pode reverter).
--
-- ATUALIZADA (07-09-2026): também limpa suspenso_ate/motivo_suspensao/
-- suspenso_por (CK_PERFIL_PESQUISADOR_SUSPENSAO exige os 3 juntos ou
-- nenhum, mesmo espírito de revogar_suspensao_usuario, [03-N]).
-- ----------------------------------------------------------------------------
```

### [03-C015] 03_funcoes_seguranca.sql, suspender_usuario (linhas originais 855 a 888)

```text
-- ============================================================
-- [03-N] MODERAÇÃO SOBRE CONTA - SUSPENSÃO DE USUÁRIO E DE PAPEL (09-08-2026)
-- ============================================================
-- Descrição: Bloco G do prompt de uma IA sobre cabeçalho/moderação -
-- diferente de [03-P] (suspende o PERFIL DE PESQUISADOR, com cascata sobre
-- campanhas, RF-084): aqui é suspensão de CONTA (bloqueia login) e
-- suspensão de UM PAPEL específico (usuario continua logado, só perde as
-- permissões daquele papel enquanto durar). NÃO reaproveita `bloqueado_ate`
-- (bloqueio automático por senha errada, [03-O]) - ver comentário completo
-- em `usuario.suspenso_ate` (01, [01-D]).
--
-- ⚠️ Letra `N`, não `F`/`G`: quando este bloco foi escrito, [03-O]
-- ("OPERAÇÕES DE AUTENTICAÇÃO") e [03-P] ("MODERAÇÃO SOBRE PESQUISADOR")
-- ainda se chamavam `[03-F]`/`[03-G]`, reaproveitando por engano letras que
-- o Índice Global (topo de DOCUMENTACAO_BD.md) já atribuía a outros domínios
-- (`F`=LINK, `G`=ARQUIVO) - colisão do mesmo tipo já corrigida uma vez neste
-- projeto (`[03-K]`→`[03-M]`). Corrigida em 09-08-2026 (renomeadas pra
-- `O`/`P`, livres) - ver PENDENCIAS e correcoes.md, item 51. `N` continua
-- sendo a letra deste bloco (nunca colidiu com nada); não voltou a ser `D`
-- porque a letra própria não é mais necessária pra evitar colisão, mas
-- trocar de novo agora só criaria churn sem ganho.
-- ----------------------------------------------------------------------------
-- Função:     suspender_usuario
-- Assinatura: (p_id_usuario INT, p_ate TIMESTAMPTZ, p_motivo TEXT) -> VOID
-- Bloco:      [03-N]
-- Regra:      Exige 'usuario_suspender' (mesma permissão de
--             suspender_pesquisador, [03-P] - é a mesma categoria de ação
--             administrativa). Motivo é OBRIGATÓRIO (RAISE EXCEPTION se
--             vazio) - reforça em código o que a CK_USUARIO_SUSPENSAO (01)
--             já garante no schema, com uma mensagem melhor que o erro cru
--             de CHECK constraint. "Reduzir a pena" usa esta MESMA função
--             de novo, com uma p_ate mais próxima - não existe uma função
--             separada só pra isso, suspender de novo já sobrescreve.
-- ----------------------------------------------------------------------------
```

### [03-C016] 03_funcoes_seguranca.sql, suspender_papel_usuario (linhas originais 938 a 951)

```text
-- ----------------------------------------------------------------------------
-- Função:     suspender_papel_usuario / revogar_suspensao_papel_usuario
-- Assinatura: (p_id_usuario INT, p_id_papel INT, p_ate TIMESTAMPTZ) -> VOID /
--             (p_id_usuario INT, p_id_papel INT) -> VOID
-- Bloco:      [03-N]
-- Regra:      Exige 'papel_gerenciar' (não 'usuario_suspender') - suspender
--             UM papel é decisão de RBAC (o que aquela pessoa pode fazer),
--             não de moderação de conta inteira; mesma permissão que já
--             governa a matriz Papel × Permissão. Preferível a REMOVER o
--             vínculo (usuario_papel_service.remove) porque preserva
--             quando foi atribuído e volta sozinho no prazo - tem_permissao()
--             ([03-B], ampliada nesta mesma rodada) passa a ignorar papel
--             com suspenso_ate no futuro.
-- ----------------------------------------------------------------------------
```

### [03-C017] 03_funcoes_seguranca.sql, contar_metricas_dashboard (linhas originais 986 a 1041)

```text
-- ============================================================
-- [03-M] DASHBOARD ADMIN - MÉTRICAS AGREGADAS (08-08-2026)
-- ============================================================
-- ----------------------------------------------------------------------------
-- Função:     contar_metricas_dashboard
-- Assinatura: () -> TABLE(total_usuarios INT, total_pesquisadores INT,
--             total_papeis INT, total_permissoes INT, total_configuracoes INT,
--             total_campanhas INT, sessoes_ativas INT)
-- ATUALIZADA (23-08-2026): `total_campanhas` - o card "Campanhas" do
-- Dashboard nasceu mostrando "-" (DashboardServiceResumo mandava
-- `totalCampanhas: null` a propósito, comentário "campanha ainda não
-- existe") porque o módulo 12-campanha nem existia quando o Dashboard foi
-- construído (08-08-2026). Ele passou a existir em 22-08-2026, mas
-- ninguém tinha voltado aqui pra ligar os dois - achado pelo Lucas
-- brincando com o Campo de Testes ("por que o contador não começou a
-- funcionar sozinho?"). `count(*)` simples, mesmo padrão de total_papeis/
-- total_permissoes/total_configuracoes acima (conta TODAS as campanhas,
-- não só as aprovadas - é "quantas existem no sistema", não "quantas
-- estão no ar").
-- Bloco:      [03-M]
-- Regra:      08-08-2026 - GET /dashboard/resumo (nest/src/28-dashboard)
--             precisa de totais confiáveis pros cards da tela inicial do
--             painel. RLS filtra LINHA e não é uniforme entre as tabelas
--             envolvidas: `usuario` só libera não-deletado (ou quem tem
--             'usuario_visualizar_sensivel'), `configuracoes` só libera a
--             linha global ou a da própria sessão - um COUNT direto de
--             app_nestjs devolveria um número DIFERENTE dependendo de quem
--             está logado, o que é errado pra um card de "total do
--             sistema" (mesmo raciocínio de
--             contar_seguidores_pesquisador/campanha, acima em [03-E]).
--             Uma função só devolvendo TABLE (não 6 funções separadas)
--             porque o NestJS sempre pede os 6 números juntos numa
--             chamada só - não faz sentido virar 6 idas ao Postgres.
--             `pesquisadores` conta usuario_papel/papel direto (RLS
--             permissiva nas duas, USING(true)) - não precisa de
--             SECURITY DEFINER pra essa coluna especificamente, mas entra
--             na mesma função porque é pedida junto.
--             SEM contagem de log_auditoria de propósito (correção do
--             Lucas no mesmo dia: a prévia da tela era pra ser sobre
--             notificação pendente, não log - log_auditoria já tem seu
--             próprio painel "Ver log" embaixo de cada tabela).
-- ----------------------------------------------------------------------------
-- ATUALIZADA (12-09-2026, achado de agente numa auditoria RF x
-- implementação): RF-084 pede campanhas por status (ativas/sucesso/não
-- atingidas/aguardando aprovação), valor total arrecadado e denúncias
-- pendentes - nenhum dos três existia aqui, só `total_campanhas` (um
-- único count, sem quebra). Os 3 dados abaixo NÃO dependem de
-- `19-denuncia`/`22-contribuicao` (módulos Nest) existirem: `denuncia` e
-- as colunas de status/valor de `campanha` já são tabela/coluna real do
-- banco desde antes, lidas aqui direto por SQL - só a 5ª parte do
-- requisito ("campanhas sinalizadas por baixa pontuação de reputação")
-- fica de fora de propósito, porque depende do motor de score estar
-- fechado (ver PENDENCIAS e correcoes.md, RF-031).
-- ATUALIZADA (24-09-2026): ganhou `campanhas_para_revisao_score` (campanha na fila cujo pesquisador está abaixo
-- de score_minimo_campanha, ver fn_precisa_revisao_score em 05 [05-I-1]) e virou plpgsql: a função em 05 ainda
-- não existe quando este arquivo roda, e só plpgsql adia a checagem do corpo para a 1ª chamada.
```

### [04-C001] 04_rls_policies.sql, pol_orcamento_campanha_select (linhas originais 413 a 422)

```text
-- ADICIONADO (31-07-2026, Alexia): orçamento e cronograma estruturados. Leitura segue
-- a MESMA visibilidade de campanha (pol_campanha_select) - decisão consciente
-- de NÃO copiar o padrão "SELECT USING (TRUE)" de pol_recompensa_select: expor
-- o orçamento/plano de uma campanha que ainda nem foi aprovada (aguardando_
-- aprovacao) pra qualquer visitante não tem por quê, e o dono/admin já
-- enxergam por fora dessa condição. Escrita: só o dono da campanha (ou
-- campanha_editar); o congelamento por status/data_inicio é responsabilidade
-- da trigger em 05 (RLS controla QUEM, trigger controla QUANDO).
-- CORRIGIDO (21-09-2026): recompensa NÃO tem trigger de congelamento (só existem as 3 de
-- campanha, orçamento e cronograma). Pendência registrada em PENDENCIAS.
```

### [04-C002] 04_rls_policies.sql, pol_score_select (linhas originais 896 a 906)

```text
-- SUPERADA (30-07-2026, decisão de produto): a correção de 28-07-2026 (item 12
-- da Lista C) tinha fechado o score pro público, citando risco de LGPD (juízo
-- automatizado sobre pessoa identificada, exposto sem previsão de contestação,
-- Art. 9). Reaberta de propósito: o score volta a ser público porque é a base
-- de um segundo app do projeto ("Serasa do Pesquisador" - consulta pública de
-- reputação de pesquisadores cadastrados), decisão consciente de Lucas, não
-- descuido. O risco de LGPD apontado em 28-07 continua real e não foi
-- resolvido, só aceito - ver PENDENCIAS e correcoes.md pela nota completa.
-- Mantido: score de usuário deletado continua invisível (reaproveita
-- usuario_visivel(), 03_funcoes_seguranca.sql, [03-D], mesma função usada por
-- pol_perfil_select/pol_link_select - não reintroduz o USING(TRUE) cru de antes).
```

### [04-C003] 04_rls_policies.sql, log_auditoria (linhas originais 929 a 942)

```text
-- ============================================================
-- [04-L] LOG DE AUDITORIA (log_auditoria)
-- ============================================================
-- ADICIONADO (03-08-2026) - ver comentário completo em
-- 01_extensoes_enums_tabelas.sql [01-L]. Só SELECT tem policy aqui DE
-- PROPÓSITO: não existe pol_log_auditoria_insert/update/delete porque
-- app_nestjs não tem (e nunca deve ter) GRANT nenhum além de SELECT nesta
-- tabela (ver 06_grants.sql [06-L]) - sem o GRANT, uma policy de INSERT
-- aqui não abriria nada mesmo, então nem existe, pra não sugerir uma porta
-- que não existe. Quem grava é só a trigger `fn_log_auditoria()`
-- (SECURITY DEFINER, 05_regras_negocio.sql [05-L]), que roda com o
-- privilégio de quem criou a função (o papel usado no SQL Editor do
-- Supabase pra rodar as migrations), não como app_nestjs - RLS nem chega a
-- ser avaliada pra esse caminho.
```

### [05-C001] 05_regras_negocio.sql (linhas originais 38 a 56)

```text
-- ----------------------------------------------------------------------------
-- Contexto histórico do motor de score (por que ele existe):
-- perfil_pesquisador.score_atual e score_pesquisador.pontos_obtidos eram só
-- valores fixos digitados no seed - nada no app realmente calculava o score
-- a partir de campanha/denuncia/link_academico/perfil. 5 dos 7 pesquisadores
-- nem tinham linha em score_pesquisador. No app, a tela de detalhes de
-- pontuação lia campos que não existem no tipo real de dimensões de score
-- (que só tem perfil_academico, historico_plataforma, atualizacao_campanha,
-- reputacao_comunidade), então toda conta vinha undefined * peso = NaN.
--
-- Estratégia: calcular tudo dentro do banco (não no app), manter o resultado
-- em cache em perfil_pesquisador.score_atual / score_pesquisador, atualizado
-- automaticamente por TRIGGER sempre que campanha, denuncia,
-- atualizacao_campanha, link_academico, perfil_pesquisador ou score_config
-- mudarem - assim funciona pra QUALQUER registro novo, sem precisar lembrar
-- de chamar nada no app. Todos os pesos vêm de score_config.peso (não há
-- número "mágico" fixo no código) - editar o peso no Painel Admin já
-- recalcula o score de todo mundo automaticamente.
-- ----------------------------------------------------------------------------
```

### [05-C002] 05_regras_negocio.sql (linhas originais 58 a 74)

```text
-- ----------------------------------------------------------------------------
-- ATENÇÃO (28-07-2026, uma IA - 6ª auditoria, "manutenção e trabalhos de
-- fundo precisam de identidade"): depois de trg_campanha_valida_transicao
-- ([05-K-2]) e de pol_campanha_update (04) exigirem dono ou permissão real,
-- QUALQUER UPDATE em campanha rodado sem app.id_usuario_atual definido na
-- sessão - inclusive por um superusuário corrigindo dado manualmente no SQL
-- Editor - não afeta nenhuma linha (RLS filtra tudo antes da trigger sequer
-- avaliar) e devolve "UPDATE 0" SEM ERRO NENHUM. É o comportamento correto
-- (aprovação/rejeição de campanha precisa ser atribuível a alguém), mas o modo
-- de falhar é silencioso. Antes de qualquer UPDATE manual em campanha, rode:
--     SET app.id_usuario_atual = '<id de um usuário com a permissão certa>';
-- Mesmo tema pro worker de notificação (precisa de sessão com
-- notificacao_processar) e pro encerramento automático de campanha vencida -
-- este último já tem função pronta pra isso, encerrar_campanhas_vencidas()
-- ([05-K-2]), SECURITY DEFINER, chamada por agendamento sem precisar de
-- SET LOCAL manual. Documentado também em tutorial-rodar-projeto.md, item 8.
-- ----------------------------------------------------------------------------
```

### [05-C003] 05_regras_negocio.sql (linhas originais 76 a 108)

```text
-- ----------------------------------------------------------------------------
-- ERRCODE CUSTOMIZADO (02-08-2026, uma IA - pendência apontada pela
-- Alexia): as 42 `RAISE EXCEPTION` deste arquivo passaram a carregar
-- `USING ERRCODE = '<código>'`. Antes disso, todas caíam no SQLSTATE genérico
-- `P0001` (qualquer `RAISE EXCEPTION` sem ERRCODE explícito), e o Nest não
-- tinha como diferenciar "sem permissão" de "dado inválido" de "estado
-- conflitante" - usuario.service.remove.ts, por exemplo, tratava QUALQUER
-- erro de excluir_conta_usuario() como 403, mesmo que a causa real fosse uma
-- trigger de validação de dado (não de permissão) disparada por tabela
-- relacionada.
--
-- Faixas usadas (nenhuma colide com os SQLSTATE nativos do Postgres já
-- tratados em nest/src/commons/database/postgres-exception.filter.ts:
-- 23505, 23503, 23502, 23514, 42501, P0001):
--   90001-90999  VALIDAÇÃO DE DADO/NEGÓCIO      -> HTTP 400 Bad Request
--                (formato, limite de tamanho, mínimo, campo obrigatório
--                fora do CHECK técnico, etc - nada de permissão envolvida)
--   91001-91999  CONFLITO DE ESTADO/REGRA        -> HTTP 409 Conflict
--                (campanha "congelada" após aprovação, transição de status
--                inválida, limite de recursos atingido, estoque insuficiente,
--                ação incompatível com o status atual do registro)
--   92001-92999  AUTORIZAÇÃO NEGADA (regra de negócio, não RLS) -> HTTP 403
--                (checagem feita via tem_permissao() dentro da trigger, ou
--                restrição por identidade/conflito de interesse - dono, autor,
--                denunciante agindo sobre o próprio registro)
--   93001-93999  LIMITE DE TAXA (rate limit)     -> HTTP 429 Too Many Requests
--
-- Cada código é único neste arquivo (ver DOCUMENTACAO_ERRCODE.md, gerado
-- junto desta mudança, para a lista completa código -> origem -> mensagem).
-- Mapeamento em HttpException fica por conta do Nest (ver
-- postgres-exception.filter.ts) - este arquivo só declara o SQLSTATE, não
-- decide o status HTTP.
-- ----------------------------------------------------------------------------
```

### [05-C004] 05_regras_negocio.sql, fn_precisa_revisao_score (linhas originais 126 a 140)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_precisa_revisao_score
-- Assinatura: (p_id_usuario INT) -> BOOLEAN
-- Bloco:      [05-I-1]
-- Regra:      Resolve o item 3 da Lista de Pendências (28-07-2026) - o score
--             NUNCA bloqueia a criação de campanha (nem Catarse nem Experiment
--             fazem isso; o filtro de confiança real é a aprovação manual do
--             Admin, via status='aguardando_aprovacao'). 'configuracoes.
--             score_minimo_campanha' vira só um SINAL pro painel do Admin
--             destacar, na fila de aprovação, campanhas de pesquisadores com
--             score abaixo do mínimo pra receberem uma revisão mais cuidadosa
--             - nunca uma trava automática e definitiva. SECURITY DEFINER
--             porque expõe só um booleano, sem vazar o valor real do score
--             (pol_score_select restringe score_atual ao próprio dono).
-- ----------------------------------------------------------------------------
```

### [05-C005] 05_regras_negocio.sql, calcular_score_perfil_academico (linhas originais 161 a 180)

```text
-- ----------------------------------------------------------------------------
-- Função:     calcular_score_perfil_academico
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 1 - Perfil Acadêmico Declarado. Soma os pesos (vindos
--             de score_config, subitens do pai 'perfil_academico') de: link
--             Lattes, link ORCID, outro link acadêmico (qualquer tipo_link que
--             não seja Lattes/ORCID), vínculo institucional preenchido e
--             título acadêmico informado no perfil_pesquisador.
-- CORRIGIDO (28-07-2026, item 13(d) da Lista C - "GitHub não pontua"): o
-- reconhecimento de link era por ILIKE no NOME de exibição do tipo_link
-- ('%linkedin%', '%researchgate%', '%academia%', '%scholar%', '%site%') -
-- hardcoded, frágil (rename de exibição quebra silenciosamente) e nunca incluía
-- GitHub, mesmo o tipo já existindo no catálogo. Passou a comparar por
-- tipo_link.codigo (chave estável, ver [01-C]) em vez do nome, e "outro link
-- acadêmico" virou "qualquer tipo_link cadastrado que não seja Lattes/ORCID" -
-- reconhece GitHub automaticamente, e qualquer tipo novo que entrar no catálogo
-- no futuro (sem precisar editar esta função de novo).
-- ----------------------------------------------------------------------------
-- Revisada em 24-09-2026, ver DOCUMENTACAO_BD.md [05-K-2-C].
```

### [05-C006] 05_regras_negocio.sql, calcular_score_historico (linhas originais 239 a 250)

```text
-- ----------------------------------------------------------------------------
-- Função:     calcular_score_historico
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 2 - Histórico na Plataforma. conclusao = (campanhas
--             concluídas com sucesso / total encerradas) * peso_conclusao;
--             aprovacao = (aprovadas pela moderação / total submetidas) *
--             peso_aprovacao; desconta penalidade_abandono por campanha
--             abandonada e penalidade_sem_justificativa por campanha não
--             atingida sem justificativa na solicitação de encerramento.
-- ----------------------------------------------------------------------------
-- Revisada em 24-09-2026, ver DOCUMENTACAO_BD.md [05-K-2-C].
```

### [05-C007] 05_regras_negocio.sql, calcular_score_atualizacao (linhas originais 324 a 336)

```text
-- ----------------------------------------------------------------------------
-- Função:     calcular_score_atualizacao
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 3 - Atualização da Campanha. regularidade =
--             SUM(realizadas)/SUM(esperadas) * peso_regularidade;
--             tempestividade = (% de campanhas em que realizadas >=
--             esperadas) * peso_tempestividade. Considera campanhas que já
--             começaram (ativo/sucesso/nao_atingido/encerrado).
--             atualizacoesEsperadas = duracaoEmMeses * frequencia_esperada_mensal
--             (configurável via score_frequencia_esperada_mensal).
-- ----------------------------------------------------------------------------
-- Revisada em 24-09-2026, ver DOCUMENTACAO_BD.md [05-K-2-C].
```

### [05-C008] 05_regras_negocio.sql, calcular_score_reputacao (linhas originais 406 a 435)

```text
-- ----------------------------------------------------------------------------
-- Função:     calcular_score_reputacao
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-2]
-- Regra:      Dimensão 4 - Reputação da Comunidade. reputacaoScore =
--             peso_raiz - totalDenuncias*custo - totalProcedentes*custo_procedente.
-- CORRIGIDO (28-07-2026, item 13(a) da Lista C - conformidade com RF-077, não
-- decisão de negócio): antes, v_total_denuncias contava QUALQUER denúncia
-- contra o pesquisador (inclusive 'pendente', 'em_analise' e 'improcedente'),
-- penalizando mesmo uma acusação ainda sob análise ou já descartada. O RF-077
-- define 'improcedente' como "denúncia descartada após análise" - contar isso
-- como se fosse culpa contradiz o próprio requisito. Agora só denúncias com
-- status 'resolvida' (= procedente, confirmada pela moderação) penalizam,
-- tanto no custo base quanto no custo extra de procedência. Testado: não muda
-- a faixa de nenhum dos 4 pesquisadores desenhados pro teste determinístico
-- (Eduardo, cujas 2 denúncias são 'pendente', sai de 23 pra 25 na dimensão -
-- 46→48 no total, continua "Em Construção"; Vinícius, cujas 4 denúncias já
-- eram todas 'resolvida', não muda - 19, continua "Atenção").
-- CORRIGIDO junto (item 13, quinto ponto - consolidação de constantes): os
-- pesos volume_denuncias/gravidade_denuncias já existiam em score_config
-- (a tabela que o Painel Admin edita, com trigger de recálculo automático),
-- mas nenhuma função os lia - o cálculo usava score_custo_denuncia/
-- score_custo_denuncia_procedente, duas chaves soltas em configuracoes, sem
-- nenhuma ligação com o score_config. Isso fazia o painel mostrar 2 alavancas
-- (volume_denuncias, gravidade_denuncias) que não moviam nada. Migrado: os
-- valores (1 e 3) agora vivem em score_config (nome='volume_denuncias'/
-- 'gravidade_denuncias', ver [07-I-1]), e as 2 chaves em configuracoes saíram
-- do seed (ver [07-I-2]) - score_config passa a ser a única fonte de verdade.
-- ----------------------------------------------------------------------------
-- Revisada em 24-09-2026, ver DOCUMENTACAO_BD.md [05-K-2-C].
```

### [05-C009] 05_regras_negocio.sql, recalcular_score_pesquisador (linhas originais 468 a 478)

```text
-- ----------------------------------------------------------------------------
-- Função:     recalcular_score_pesquisador
-- Assinatura: (p_id_usuario INT) -> INTEGER
-- Bloco:      [05-I-3]
-- Regra:      Recalcula as 4 dimensões de um pesquisador, grava em
--             score_pesquisador (UPSERT) e atualiza o cache em
--             perfil_pesquisador.score_atual. SECURITY DEFINER: precisa poder
--             escrever no perfil de QUALQUER pesquisador (ex: quando um admin
--             resolve uma denúncia contra outra pessoa), não só no perfil de
--             quem disparou a ação.
-- ----------------------------------------------------------------------------
```

### [05-C010] 05_regras_negocio.sql, trg_campanha_recalcula_score (linhas originais 600 a 624)

```text
-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_recalcula_score / trg_campanha_recalcula_score_update
-- Tabela:    campanha
-- Momento:   AFTER INSERT OR DELETE (a 1ª) / AFTER UPDATE com WHEN (a 2ª)
-- Função:    trg_recalcular_por_campanha()
-- Bloco:     [05-I-4]
-- Regra:     Dispara o recálculo de score do pesquisador dono da campanha.
-- CORRIGIDO (28-07-2026, achado numa auditoria de IA - "Problema 2", item #10
-- da 1ª análise, nunca corrigido até agora): a trigger original era AFTER INSERT OR UPDATE OR
-- DELETE sem nenhuma cláusula WHEN - todo UPDATE em campanha recalculava as 4
-- dimensões inteiras, mesmo quando nenhuma delas usa a coluna que mudou. A cadeia
-- contribuicao -> trg_sincroniza_arrecadado_campanha -> UPDATE campanha
-- (valor_bruto_arrecadado) -> esta trigger disparava um recálculo completo POR
-- DOAÇÃO - medido: 5 doações confirmadas = 20 gravações em score_pesquisador (4
-- por doação), todas produzindo o mesmo número, porque valor_bruto_arrecadado não
-- entra em nenhuma das 4 dimensões. Numa campanha com 500 doações, seriam 500
-- recálculos completos serializando o FOR UPDATE da linha da campanha - risco
-- direto pro RNF-006 (confirmação de pagamento refletida em até 30s). Postgres
-- não aceita TG_OP dentro de WHEN, então não dá pra resolver numa trigger só:
-- precisa de duas, mesmo padrão já usado em trg_perfil_update_recalcula_score.
-- Medido depois da correção: 0 gravações de score por doação (era 4); recálculo
-- ao aprovar/encerrar/rejeitar campanha continua disparando normalmente.
-- ----------------------------------------------------------------------------
-- 24-09-2026: rascunho não entra em nenhuma das 4 dimensões, então criar ou apagar (expirar) rascunho não
-- recalcula nada; as duas ficam separadas porque WHEN não aceita TG_OP.
```

### [05-C011] 05_regras_negocio.sql, trg_recalcular_por_perfil (linhas originais 769 a 779)

```text
-- ----------------------------------------------------------------------------
-- Função:     trg_recalcular_por_perfil
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Uso:        Invocada por trg_perfil_recalcula_score e
--             trg_perfil_update_recalcula_score
-- Regra:      Recalcula o score do próprio perfil_pesquisador que mudou. No
--             UPDATE, só dispara se vinculo_institucional/titulo_academico
--             mudaram de verdade (condição WHEN na trigger, evita loop
--             infinito com o próprio recalculo que atualiza score_atual).
-- ----------------------------------------------------------------------------
```

### [05-C012] 05_regras_negocio.sql, trg_score_config_recalcula_todos (linhas originais 838 a 848)

```text
-- ----------------------------------------------------------------------------
-- Trigger:   trg_score_config_recalcula_todos
-- Tabela:    score_config
-- Momento:   AFTER UPDATE OF peso, UMA vez por comando (FOR EACH STATEMENT)
-- Função:    trg_recalcular_por_score_config()
-- Bloco:     [05-I-4]
-- Regra:     Recalcula o score de todos os pesquisadores quando um peso é
--            editado no Painel Admin.
-- Por comando (21-09-2026): editar os 4 pesos raiz dispara 1 recálculo, não 4.
-- Perde o filtro "só se o peso mudou". Ver DOCUMENTACAO_BD.md [05-K-2-B].
-- ----------------------------------------------------------------------------
```

### [05-C013] 05_regras_negocio.sql, fn_valida_soma_pesos_score_config (linhas originais 855 a 877)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_soma_pesos_score_config
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Regra:      ADICIONADA (23-09-2026) - nada impedia os 4 pesos raiz de
--             score_config (id_pai IS NULL) somarem outra coisa que não 100.
--             Score_rotulo (faixas 0-100, seed) assume que o score MÁXIMO
--             possível é 100 - se a soma dos pesos fosse, por exemplo, 200,
--             ninguém nunca cairia na faixa "Referência" (75-100) de verdade,
--             e um score de 150 não teria rótulo nenhum (recalcular_score_
--             pesquisador, [05-I-2], devolveria NULL). CONSTRAINT TRIGGER
--             (não trigger comum) porque só assim dá pra ser DEFERRABLE -
--             sem isso, editar os 4 pesos em 4 UPDATEs separados (um por
--             linha, sem transação escrita à mão) reprovaria o 1º UPDATE
--             sozinho, mesmo que o conjunto final estivesse certo. FOR EACH
--             ROW é exigência do Postgres pra CONSTRAINT TRIGGER (não aceita
--             FOR EACH STATEMENT) - a função ignora NEW/OLD de propósito e
--             sempre olha a soma agregada da tabela inteira, então dispara
--             1x por linha afetada mas sempre confere o estado FINAL, já
--             no COMMIT (ou SET CONSTRAINTS ALL IMMEDIATE). Testado com
--             PGlite: 2 UPDATEs na mesma transação, inválidos no meio mas
--             certos no fim, o COMMIT passa; terminar errado, o COMMIT falha.
-- ----------------------------------------------------------------------------
```

### [05-C014] 05_regras_negocio.sql, fn_valida_cobertura_score_rotulo (linhas originais 908 a 926)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_cobertura_score_rotulo
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-I-4]
-- Regra:      ADICIONADA (23-09-2026) - EX_SCORE_ROTULO_SEM_SOBREPOSICAO (01,
--             [01-I]) só impede 2 faixas ativas se SOBREPOREM; não impede um
--             BURACO entre elas (ex.: uma faixa terminando em 49 e a próxima
--             começando em 51 deixaria o score 50 sem rótulo nenhum, mesmo
--             bug de fundo do achado de sobreposição). Exige cobertura EXATA
--             de 0 a 100 - "exata" só faz sentido porque
--             fn_valida_soma_pesos_score_config (acima) já garante que o
--             score máximo possível é 100. Mesmo mecanismo de CONSTRAINT
--             TRIGGER DEFERRABLE da função acima, pelo mesmo motivo (editar
--             faixa por faixa não pode reprovar um estado intermediário).
--             LEAD() OVER (ORDER BY score_minimo) compara cada faixa com a
--             PRÓXIMA (por score_minimo) - se a próxima não começa exatamente
--             1 depois do fim desta, tem buraco (ou sobreposição, já
--             impossível pela outra constraint).
-- ----------------------------------------------------------------------------
```

### [05-C015] 05_regras_negocio.sql, trg_valida_escopo_tipolink (linhas originais 1123 a 1134)

```text
-- ----------------------------------------------------------------------------
-- Função:     trg_valida_escopo_tipolink
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Uso:        Invocada por trg_link_academico_valida_tipo,
--             trg_link_atualizacao_valida_tipo e trg_link_recompensa_valida_tipo
-- Regra:      tipo_link é compartilhado por 3 tabelas (link_academico,
--             link_atualizacao, link_recompensa). Impede que alguém associe,
--             por exemplo, "Orcid" (permite_perfil=TRUE apenas) a uma
--             recompensa ou atualização - a FK sozinha não bloquearia isso,
--             só a existência do id_tipolink, não o contexto de uso.
-- ----------------------------------------------------------------------------
```

### [05-C016] 05_regras_negocio.sql, fn_valida_limite_link_academico (linhas originais 1173 a 1183)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_limite_link_academico
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Regra:      RESOLVE o item 19(a) da lista de pendências (28-07-2026) - os
--             RF-014/RF-016/RF-018 e a Etapa 2 falam em até 5 links por
--             pesquisador; a tabela nunca teve trava nenhuma. Limite lido de
--             configuracoes.limite_links_academicos_perfil (mesmo padrão dos
--             outros limites desta lista - campanhas simultâneas, endossos,
--             denúncias/24h), não hardcoded.
-- ----------------------------------------------------------------------------
```

### [05-C017] 05_regras_negocio.sql, fn_valida_limite_texto_livre (linhas originais 1222 a 1241)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_limite_texto_livre
-- Assinatura: () -> TRIGGER (genérica, recebe 2 argumentos via TG_ARGV)
-- Bloco:      [05-K-1]
-- Regra:      RESOLVE o "Problema 2" apontado por uma IA (28-07-2026) -
--             vários campos de texto livre preenchidos por usuário (denuncia.
--             relato, campanha.descricao, atualizacao_campanha.conteudo,
--             solicitacao_encerramento.justificativa_pesquisador/admin,
--             recompensa.descricao) não tinham NENHUM limite de tamanho - a
--             Alexia já tinha avisado disso no WhatsApp sobre o relato, antes
--             mesmo da coluna existir. Uma função genérica em vez de 6 quase
--             idênticas: TG_ARGV[0] é o nome da coluna a checar (lida via
--             to_jsonb(NEW), já que plpgsql não permite acesso dinâmico a
--             campo de um RECORD por nome), TG_ARGV[1] é a chave em
--             configuracoes, TG_ARGV[2] é o valor padrão caso a chave não
--             exista. O limite técnico largo (bem maior, fixo) já mora na
--             CHECK de cada coluna (01) - esta trigger é só o limite de
--             negócio, menor e configurável pelo Painel Admin.
-- ----------------------------------------------------------------------------
-- Revisada em 24-09-2026, ver DOCUMENTACAO_BD.md [05-K-2-C].
```

### [05-C018] 05_regras_negocio.sql, fn_valida_area_conhecimento_nivel2 (linhas originais 1351 a 1364)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_area_conhecimento_nivel2
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Regra:      ADICIONADO (27-07-2026) - area_conhecimento ganhou hierarquia de
--             2 níveis (grande área -> área, id_pai em 01) pra dar granularidade
--             de busca de verdade - "Ciências da Saúde" cobrindo de odontologia
--             a saúde coletiva era amplo demais pra filtro funcionar. Decisão
--             tomada junto (27-07-2026): campanha é obrigada a escolher uma área
--             de nível 2 (folha), nunca a grande área raiz - senão a granularidade
--             nova fica decorativa, ninguém é obrigado a usar. Não dá pra fazer
--             isso com CHECK simples (precisa consultar outra tabela), por isso
--             é trigger, não constraint.
-- ----------------------------------------------------------------------------
```

### [05-C019] 05_regras_negocio.sql, trg_valida_tipo_motivo_denuncia (linhas originais 1410 a 1420)

```text
-- ----------------------------------------------------------------------------
-- Função:     trg_valida_tipo_motivo_denuncia
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-1]
-- Uso:        Invocada por trg_denuncia_valida_tipo_motivo
-- Regra:      CORRIGIDO - a constraint CK_DENUNCIA_ALVO_XOR (01) já garante que
--             exatamente um alvo está preenchido; esta trigger garante que o
--             motivo escolhido é do tipo certo pro alvo escolhido (denunciar uma
--             campanha com um motivo cadastrado como 'perfil', ou vice-versa,
--             não fazia sentido e nada impedia).
-- ----------------------------------------------------------------------------
```

### [05-C020] 05_regras_negocio.sql, fn_valida_repasse_all_or_nothing (linhas originais 1463 a 1479)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_repasse_all_or_nothing
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Bloqueia repasse indevido em campanha all-or-nothing que não
--             atingiu a meta financeira. Só bloqueia se houver tentativa real
--             de liberar dinheiro (valor_liquido > 0); registro de "nada
--             repassado" (RF-038, valor_liquido = 0) continua permitido.
-- CORRIGIDO: a versão anterior comparava só NEW.valor_liquido > 0, então depois que
-- a A3 passou a validar também em UPDATE, um repasse já feito ficava impossível de
-- corrigir (status, data) se a campanha tivesse sido revertida (contribuições
-- devolvidas derrubando valor_bruto_arrecadado abaixo da meta). Agora só bloqueia
-- quando o valor liberado está de fato AUMENTANDO em relação ao que já era antes -
-- reduzir, zerar ou só mudar status/data nunca deveria travar. TG_OP = 'UPDATE'
-- guarda o acesso a OLD porque, num INSERT, o registro OLD não existe (referenciar
-- OLD.coluna nesse caso lança "record OLD is not assigned yet").
-- ----------------------------------------------------------------------------
```

### [05-C021] 05_regras_negocio.sql, trg_valida_repasse (linhas originais 1509 a 1520)

```text
-- ----------------------------------------------------------------------------
-- Trigger:   trg_valida_repasse
-- Tabela:    repasse
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_repasse_all_or_nothing()
-- Bloco:     [05-K-2]
-- Regra:     Impede repasse com valor em campanha all-or-nothing sem meta
--            atingida.
-- ----------------------------------------------------------------------------
-- CORRIGIDO: era BEFORE INSERT só - um INSERT com valor_liquido = 0 (permitido, RF-038)
-- seguido de UPDATE pro valor cheio furava a regra all-or-nothing sem revalidar nada,
-- já que pol_repasse_update é USING(true) de propósito (item 9 da PENDENCIAS).
```

### [05-C022] 05_regras_negocio.sql, atualizar_status_repasse (linhas originais 1527 a 1545)

```text
-- ----------------------------------------------------------------------------
-- Função:     atualizar_status_repasse
-- Assinatura: (p_id_repasse INT, p_status VARCHAR, p_repassado_em TIMESTAMP DEFAULT NULL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      CRÍTICO 2 (extensão) - 5ª auditoria de uma IA: "estender o
--             mesmo tratamento a repasse, que também é dinheiro saindo".
--             `pol_repasse_update` (04) é `USING (true)` de propósito (item 9
--             da PENDENCIAS) - o `GRANT UPDATE` de tabela inteira que isso
--             exigia saiu (`06`); dali em diante o único jeito de mudar
--             `status`/`repassado_em` é por aqui. `SECURITY DEFINER`, mas
--             `trg_valida_repasse` continua rodando normalmente por baixo (RLS
--             é bypassada, trigger não) - a regra all-or-nothing continua
--             protegida mesmo passando por esta função.
-- SEM AUTORIZAÇÃO DE PROPÓSITO - pré-autenticação: chamada pelo webhook do
-- gateway de pagamento/repasse, sem sessão de usuário (mesma categoria de
-- registrar_falha_login/registrar_login_sucesso, [03-O]). De confiança do
-- backend: o endpoint que chama esta função precisa validar a assinatura do
-- webhook antes, nunca aceitar a chamada de uma rota pública qualquer.
-- ----------------------------------------------------------------------------
```

### [05-C023] 05_regras_negocio.sql, trg_contribuicao_all_or_nothing_pix_update (linhas originais 1603 a 1617)

```text
-- ----------------------------------------------------------------------------
-- Trigger:   trg_contribuicao_all_or_nothing_pix_update
-- Tabela:    contribuicao
-- Momento:   BEFORE UPDATE (só quando meio_pagamento ou id_campanha mudam de valor)
-- Função:    validar_contribuicao_all_or_nothing()
-- Bloco:     [05-K-2]
-- Regra:     CORRIGIDO - a versão anterior (BEFORE INSERT OR UPDATE sem WHEN)
--            revalidava meio_pagamento em TODO UPDATE, mesmo quando só o status
--            mudava (exatamente o que o webhook de confirmação de pagamento faz).
--            Isso congelava para sempre qualquer contribuição não-PIX que já
--            existisse numa campanha all-or-nothing (ex.: dado histórico do seed,
--            carregado com a trigger desligada). A cláusula WHEN restringe a
--            revalidação para quando o que de fato importa muda, sem abrir mão
--            de impedir trocar o meio de pagamento por baixo dos panos depois.
-- ----------------------------------------------------------------------------
```

### [05-C024] 05_regras_negocio.sql, fn_congela_regras_campanha (linhas originais 1629 a 1640)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_congela_regras_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Impede a alteração de meta financeira, modelo de financiamento,
--             taxa, título ou descrição após a campanha ser aprovada (status
--             'ativo' em diante, incluindo encerramento por moderação) -
--             proteção contra fraude/alteração retroativa. data_fim/
--             data_inicio têm regra própria: só congelam quando a campanha
--             já começou de fato (data_inicio no passado) - ver comentário
--             mais abaixo, no corpo da função (feature "Em breve").
-- ----------------------------------------------------------------------------
```

### [05-C025] 05_regras_negocio.sql, fn_congela_orcamento_campanha (linhas originais 1757 a 1786)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_congela_orcamento_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (31-07-2026, Alexia) - orçamento estruturado da campanha
--             (01, [01-E]). Congela na MESMA condição de fn_congela_regras_
--             campanha (status já aprovado em diante) - diferente do
--             cronograma abaixo, que só trava quando a campanha começa de
--             fato. Faz sentido serem diferentes: a soma do orçamento precisa
--             bater EXATAMENTE com meta_financeira (fn_valida_completude_
--             campanha_aprovacao, mais abaixo), e meta_financeira já está
--             congelada desde a aprovação - deixar o orçamento editável até o
--             início de fato permitiria trocar os itens sem nunca quebrar
--             essa igualdade, o que ainda assim seria alteração retroativa de
--             informação já aprovada/exibida publicamente. Cobre INSERT/
--             UPDATE/DELETE porque adicionar ou remover um item depois de
--             aprovado é tão problemático quanto editar o valor de um
--             existente.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER. Sem
-- isso, o SELECT status FROM campanha abaixo fica sujeito à RLS de quem está
-- executando - pol_campanha_select (04) não inclui 'campanha_editar' entre
-- suas condições, só status/dono/'relatorio_visualizar'. Pro dono da campanha
-- (o caso de longe mais comum) isso nunca foi problema, porque o próprio
-- id_usuario=self já satisfaz a policy. Mas alguém com só 'campanha_editar'
-- (sem 'relatorio_visualizar') mexendo no orçamento de campanha de outra
-- pessoa ainda não aprovada enxergaria v_status = NULL (RLS filtra a linha) e
-- o `IF v_status IN (...)` nunca dispararia - a trava de congelamento ficaria
-- silenciosamente inerte. Mesmo raciocínio de fn_valida_completude_campanha_
-- aprovacao (abaixo, no mesmo bloco), onde este padrão foi detalhado.
-- ----------------------------------------------------------------------------
```

### [05-C026] 05_regras_negocio.sql, fn_valida_limite_max_orcamento_campanha (linhas originais 1831 a 1857)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_limite_max_orcamento_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (01-08-2026, correção do que a Alexia mandou em
--             31-07-2026): ela tinha misturado o número que devia ser TETO
--             (10) com o de PISO (que devia ser bem menor) dentro da MESMA
--             chave `orcamento_min_itens`. Separado em duas chaves:
--             `orcamento_min_itens` (checado na aprovação, ver
--             fn_valida_completude_campanha) e `orcamento_max_itens`
--             (10, checado aqui). Checar o máximo no INSERT - não só na
--             aprovação - dá feedback imediato pro pesquisador no item 11,
--             em vez de deixar ele descobrir só quando a campanha for
--             recusada na moderação.
-- CORRIGIDO (05-09-2026): `orcamento_min_itens` mudou de 3 pra 1 - achado
-- conferindo os Requisitos Funcionais (RF-039) contra o banco, que citava
-- "valor padrão de 1 (mínimo)" enquanto o seed tinha 3. Decisão do Lucas:
-- ajustar o banco pro texto oficial do requisito, não o contrário.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER. O
-- COUNT(*) abaixo é sobre a própria orcamento_campanha, sujeito à sua RLS de
-- SELECT (pol_orcamento_campanha_select, 04) - que passou pra quem tem
-- permissão de INSERT (dono ou 'campanha_editar') mas não necessariamente
-- pra SELECT (só status/dono/'relatorio_visualizar'). Pro dono, nunca foi
-- problema; pra quem só tem 'campanha_editar', o COUNT ficaria sempre 0,
-- deixando o teto inerte em vez de bloquear - mesmo raciocínio de
-- fn_congela_orcamento_campanha (acima).
-- ----------------------------------------------------------------------------
```

### [05-C027] 05_regras_negocio.sql, fn_congela_marco_cronograma (linhas originais 1891 a 1920)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_congela_marco_cronograma
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (31-07-2026, Alexia) - cronograma estruturado da campanha
--             (01, [01-E]). Diferente do orçamento (acima), o cronograma NÃO
--             trava na aprovação - trava só quando a campanha já começou de
--             fato (campanha.data_inicio <= NOW()), mesma janela de carência
--             já usada pra campanha.data_inicio/data_fim em fn_congela_
--             regras_campanha ("Em breve"): entre aprovar e o início real, o
--             pesquisador pode legitimamente precisar reorganizar datas do
--             plano. Cobre INSERT/UPDATE/DELETE pelo mesmo motivo do
--             orçamento.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER, mesmo
-- raciocínio de fn_congela_orcamento_campanha (acima) - o SELECT data_inicio
-- FROM campanha abaixo ficaria sujeito à RLS de quem executa, silenciosamente
-- inerte pra quem tem só 'campanha_editar' sem 'relatorio_visualizar'.
-- CORRIGIDO (01-08-2026, achado por uma IA em auditoria): a checagem só
-- olhava data_inicio <= NOW(), sem olhar o status da campanha - diferente de
-- fn_congela_regras_campanha e fn_congela_orcamento_campanha, que só travam
-- com a campanha JÁ aprovada (status IN ('ativo', ...)). Isso travava o
-- cadastro dos marcos obrigatórios ainda em 'aguardando_aprovacao': um
-- pesquisador que cria a campanha com data_inicio = agora (sem usar "Em
-- breve") tem o cronograma congelado assim que o relógio passa de
-- data_inicio, mesmo a campanha nunca tendo sido aprovada - e sem os 3
-- marcos mínimos, fn_valida_completude_campanha nunca deixa
-- aprovar (trava circular). Corrigido acrescentando a mesma condição de
-- status usada nas outras duas funções irmãs: só congela se a campanha JÁ
-- estiver aprovada em diante E data_inicio já tiver passado.
-- ----------------------------------------------------------------------------
```

### [05-C028] 05_regras_negocio.sql, fn_valida_data_marco_cronograma (linhas originais 1965 a 1979)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_data_marco_cronograma
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (31-07-2026, Alexia) - a data prevista de um marco pode
--             ultrapassar campanha.data_fim sem problema (um marco de
--             divulgação de resultado, por exemplo, é comum acontecer depois
--             do prazo de arrecadação), mas não pode ser anterior a
--             campanha.data_inicio - não faz sentido planejar algo "antes da
--             campanha começar". Sai cedo se data_inicio ainda não foi
--             definida (mesmo padrão de fn_valida_prazo_campanha_negocio):
--             sem data_inicio não há o que comparar.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER, mesmo
-- raciocínio de fn_congela_orcamento_campanha (acima).
-- ----------------------------------------------------------------------------
```

### [05-C029] 05_regras_negocio.sql, fn_valida_data_inicio_contra_marcos (linhas originais 2010 a 2024)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_data_inicio_contra_marcos
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADA (23-09-2026) - a trigger acima só vigia a porta do
--             marco (INSERT/UPDATE em marco_cronograma), nunca disparava por
--             escrita em campanha. Um PATCH comum mudando data_inicio pra
--             frente deixava, sem erro nenhum, marcos anteriores ao novo
--             início - exatamente o estado que fn_valida_data_marco_cronograma
--             proíbe do outro lado. deslizar_datas_campanha() (05, [05-K-2])
--             não sofre disso, porque ela move os marcos manualmente antes de
--             mover a campanha; este buraco era só no PATCH direto. Mesmo
--             ERRCODE 90008 da trigger irmã: é a mesma regra de negócio, só
--             vista pelo lado da campanha.
-- ----------------------------------------------------------------------------
```

### [05-C030] 05_regras_negocio.sql, fn_valida_limite_max_marco_cronograma (linhas originais 2057 a 2067)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_limite_max_marco_cronograma
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (01-08-2026) - mesmo raciocínio de
--             fn_valida_limite_max_orcamento_campanha (acima): checa
--             configuracoes.cronograma_max_marcos (20) no INSERT, feedback
--             imediato em vez de só na aprovação.
-- CORRIGIDO (01-08-2026, achado em revisão): faltava SECURITY DEFINER, mesmo
-- raciocínio de fn_valida_limite_max_orcamento_campanha (acima).
-- ----------------------------------------------------------------------------
```

### [05-C031] 05_regras_negocio.sql, fn_valida_transicao_campanha (linhas originais 2101 a 2159)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_transicao_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      CRÍTICO 1 - 5ª auditoria de uma IA, achado simulando a
--             jornada de um usuário mal-intencionado (não por leitura de
--             código): `pol_campanha_update` (04) libera UPDATE pro próprio
--             dono (`id_usuario = id_usuario_atual()`), e `fn_congela_regras_
--             campanha` só passa a proteger a linha a partir do momento em que
--             `OLD.status` já está em `('ativo','sucesso','nao_atingido',
--             'encerrado','encerrado_moderacao')` - `'aguardando_aprovacao'`
--             não está nessa lista. Reproduzido: um pesquisador comum, dono da
--             própria campanha em `aguardando_aprovacao`, executava
--             `UPDATE campanha SET status='ativo', aprovado_em=NOW(),
--             id_admin=<ele mesmo>` e funcionava - a campanha saía do ar como
--             se um Administrador tivesse aprovado, e `trg_campanha_carimba_
--             taxa` ainda carimbava `taxa_plataforma=5.00` sozinha, deixando a
--             campanha fraudulenta indistinguível de uma aprovada de verdade.
--             Nenhuma das triggers existentes protegia especificamente QUEM
--             pode mudar `status`/`aprovado_em`/`id_admin` - só o valor final
--             dos outros campos, depois que a campanha já estava aprovada.
-- Regras de transição permitidas, nesta ordem (a primeira que bater libera):
--   1. Nenhum dos 3 campos sensíveis mudou (edição normal de outro campo,
--      já coberta por fn_congela_regras_campanha) - sai cedo.
--   2. Quem tem 'campanha_aprovar', 'campanha_rejeitar' ou
--      'solicitacao_encerramento_decidir' pode fazer qualquer transição - é o
--      Administrador/curador de verdade.
--   3. Encerramento por prazo vencido - AUTOVERIFICÁVEL, sem precisar de
--      permissão nem de um "usuário de sistema": só passa se o prazo já
--      venceu (`data_fim <= NOW()`) E o novo status bate matematicamente com
--      `valor_bruto_arrecadado` vs `meta_financeira` (sucesso só se atingiu a
--      meta, nao_atingido só se não atingiu) - impossível mentir o resultado,
--      porque a condição confere o próprio dado contra si mesma.
--   4. Dono reenviando campanha rejeitada pra nova avaliação (RF-070):
--      só a transição rejeitado -> aguardando_aprovacao, sem tocar
--      aprovado_em/id_admin.
--   5. Cascata de suspensão do pesquisador (RF-084, 30-07-2026) -
--      AUTOVERIFICÁVEL, mesmo espírito do item 3: só passa se o dono da
--      campanha (NEW.id_usuario) está HOJE com status_pesquisador =
--      'suspenso' em perfil_pesquisador, E a transição é exatamente uma das
--      duas que a suspensão prevê (ativo -> encerrado_moderacao ou
--      aguardando_aprovacao -> rejeitado). Não depende de permissão de quem
--      está executando - só do fato, que ninguém consegue forjar por fora de
--      suspender_pesquisador() (03_funcoes_seguranca.sql, [03-P]), o único
--      caminho que escreve status_pesquisador='suspenso'.
--   6. Encerramento por moderação de denúncia (RF-108, 04-09-2026) - quem tem
--      'campanha_encerrar_moderacao' pode fazer especificamente a transição
--      ativo -> encerrado_moderacao, sem tocar aprovado_em/id_admin. Existe
--      porque o item 2 (campanha_aprovar/campanha_rejeitar/solicitacao_
--      encerramento_decidir) só cobria o Administrador - um moderador que
--      julga a denúncia procedente (permissão 'denuncia_responder') não
--      conseguia executar a própria decisão, precisava pedir pro admin fazer
--      fora do sistema. Permissão nova, escopo estreito de propósito: só
--      libera ESSA transição específica, não qualquer uma (diferente do item
--      2) - um moderador não vira aprovador/rejeitador de campanha nova só
--      por ganhar isso.
--   Qualquer outra tentativa de mudar status/aprovado_em/id_admin: bloqueada.
-- ----------------------------------------------------------------------------
-- Revisada em 24-09-2026, ver DOCUMENTACAO_BD.md [05-K-2-C].
```

### [05-C032] 05_regras_negocio.sql, trg_campanha_valida_transicao (linhas originais 2306 a 2316)

```text
-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_transicao
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE
-- Função:    fn_valida_transicao_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia auto-aprovação/auto-rejeição/forjar id_admin. Libera
--            aprovação/rejeição real (Admin), encerramento automático por
--            prazo (autoverificável) e reenvio de campanha rejeitada pelo
--            próprio dono (RF-070).
-- ----------------------------------------------------------------------------
```

### [05-C033] 05_regras_negocio.sql, fn_valida_completude_campanha (linhas originais 2323 a 2373)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_completude_campanha  (renomeada em 21-09-2026, ver [05-K-2-B])
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (31-07-2026, Alexia) - orçamento e cronograma estruturados
--             (01, [01-E]) são obrigatórios, e a moderação da campanha (Admin
--             aprovando, ou seja, a transição para 'ativo') é o momento
--             combinado pra checar isso, junto com o resto - não existe
--             moderação separada pros itens. Três condições, todas
--             configuráveis via `configuracoes` (mesmo padrão de meta_minima_
--             campanha/limite_*, acima nesta seção):
--               1. Pelo menos configuracoes.orcamento_min_itens itens de orçamento;
--               2. Pelo menos configuracoes.cronograma_min_marcos marcos de cronograma;
--               3. SUM(orcamento_campanha.valor) = campanha.meta_financeira, EXATO
--                  (não "no máximo", não "aproximado" - bate certinho).
--             O TETO de itens/marcos (10/20) é responsabilidade de
--             fn_valida_limite_max_orcamento_campanha/fn_valida_limite_max_
--             marco_cronograma (acima), checado já no INSERT - aqui só o PISO,
--             que só dá pra confirmar no momento da aprovação (antes disso o
--             pesquisador ainda pode estar adicionando itens). Roda em toda
--             transição PARA 'ativo' vinda de qualquer outro status
--             (normalmente aguardando_aprovacao -> ativo, via campanha_
--             aprovar) - se OLD.status já era 'ativo', não passou por aqui de
--             novo (WHEN abaixo). fn_valida_transicao_campanha (acima) já
--             garantiu QUEM pode fazer essa transição; esta função garante
--             que a campanha está de fato completa antes de ir ao ar.
-- CORRIGIDO (01-08-2026): os defaults de fallback do config_numero() abaixo
-- eram 10/20 (a Alexia tinha confundido min com max) - corrigidos pra 3/3,
-- coerente com as chaves *_min_itens/*_min_marcos seedadas na época. O
-- comportamento de verdade sempre vem da chave em configuracoes; o fallback
-- só entra em ação se a linha sumir do banco.
-- CORRIGIDO (05-09-2026): fallback de `orcamento_min_itens` mudou de 3 pra
-- 1, acompanhando a mudança do valor seedado (ver comentário da função
-- fn_valida_limite_max_orcamento_campanha, acima nesta seção - RF-039 dos
-- Requisitos Funcionais). `cronograma_min_marcos` não mudou, continua 3.
-- CORRIGIDO (01-08-2026, achado em revisão, antes do commit): faltava
-- SECURITY DEFINER. Sem isso, os SELECT COUNT(*)/SUM() abaixo, contra
-- orcamento_campanha/marco_cronograma, ficam sujeitos à RLS de QUEM está
-- aprovando - e pol_orcamento_campanha_select/pol_marco_cronograma_select (04)
-- só liberam leitura por status/dono/'relatorio_visualizar', nenhum dos quais
-- vale ainda quando a campanha está 'aguardando_aprovacao'. Hoje só 'admin'
-- tem 'campanha_aprovar', e 'admin' também tem 'relatorio_visualizar' -
-- mascarou o bug por acidente. Se um dia outro papel ganhar 'campanha_aprovar'/
-- 'campanha_rejeitar'/'solicitacao_encerramento_decidir' sem também ter
-- 'relatorio_visualizar' (é literalmente a decisão em aberto do item 57), a
-- contagem enxergaria sempre 0 linhas e bloquearia toda aprovação, mesmo com
-- orçamento/cronograma completos - falha silenciosa, sem erro nenhum. Mesmo
-- raciocínio já usado em contar_seguidores_pesquisador()/encerrar_campanhas_
-- vencidas() (03/05): agregado precisa enxergar o total real, não só o que a
-- sessão de quem chama consegue ver linha a linha.
-- ----------------------------------------------------------------------------
```

### [05-C034] 05_regras_negocio.sql, trg_campanha_valida_completude (linhas originais 2421 a 2432)

```text
-- ----------------------------------------------------------------------------
-- Trigger:   trg_campanha_valida_completude
-- Tabela:    campanha
-- Momento:   BEFORE UPDATE (aprovação, envio de rascunho e reenvio de rejeitada)
-- Função:    fn_valida_completude_campanha()
-- Bloco:     [05-K-2]
-- Regra:     Bloqueia aprovação/envio de campanha sem orçamento e cronograma
--            completos, com a soma do orçamento batendo exatamente com a meta,
--            e com o prazo ainda não vencido.
-- ----------------------------------------------------------------------------
-- WHEN cobre as 3 portas de entrada (aprovação, envio de rascunho, reenvio de
-- rejeitada), listadas por nome. Ver DOCUMENTACAO_BD.md [05-K-2-B].
```

### [05-C035] 05_regras_negocio.sql, fn_preenche_encerramento_campanha (linhas originais 2443 a 2467)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_preenche_encerramento_campanha
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (28-07-2026) - bug real encontrado numa auditoria
--             de IA feita pela Alexia: a coluna encerrado_em (`[01-E]`, criada em 27-07-2026
--             pro RF-042/RF-058) nunca era preenchida por nada - nem trigger,
--             nem UPDATE algum no `.sql`. Nascia e ficava NULL pra sempre,
--             mesmo em campanha já encerrada. Esta trigger fecha o buraco:
--             quando o status entra em 'encerrado' ou 'encerrado_moderacao'
--             (vindo de qualquer outro status), grava NOW() automaticamente,
--             sem depender do backend lembrar de fazer isso em toda rota que
--             muda status. Só grava se ainda não tiver um valor (não
--             sobrescreve um encerrado_em já registrado).
-- CORRIGIDO (28-07-2026, uma IA - 6ª auditoria, ao implementar
-- encerrar_campanhas_vencidas() logo abaixo): o comentário original da coluna
-- (`[01-E]`) já dizia "registra a data real de encerramento (natural,
-- antecipado ou por moderação)" - mas esta trigger só cobria "antecipado"
-- (`encerrado`) e "por moderação" (`encerrado_moderacao`); faltava o
-- encerramento "natural" de verdade, `'sucesso'`/`'nao_atingido'` (campanha que
-- chega no fim do prazo por conta própria). Ninguém tinha percebido porque,
-- até agora, nada no `.sql` fazia essa transição via `UPDATE` (o seed grava o
-- status final direto no `INSERT`) - só apareceu ao dar ao encerramento
-- automático um caminho de verdade.
-- ----------------------------------------------------------------------------
```

### [05-C036] 05_regras_negocio.sql, encerrar_campanhas_vencidas (linhas originais 2496 a 2542)

```text
-- ----------------------------------------------------------------------------
-- Função:     encerrar_campanhas_vencidas
-- Assinatura: () -> INT
-- Bloco:      [05-K-2]
-- Regra:      ÚNICO ACHADO - 6ª auditoria de uma IA, achado simulando o
--             cron do RF-037 rodando de verdade: um job de fundo roda como
--             app_nestjs SEM sessão de usuário (`id_usuario_atual()` é `NULL`).
--             `pol_campanha_update` (04) exige ser dono OU ter
--             `campanha_editar`/`campanha_aprovar`/`campanha_rejeitar` - um job
--             não é nenhum dos dois, então a RLS não deixa NENHUMA linha
--             visível pra ele. Reproduzido: `UPDATE campanha SET status=
--             'sucesso' WHERE <vencida, meta batida>` devolvia `UPDATE 0` - SEM
--             erro nenhum. Falha silenciosa, a pior categoria: um cron
--             reportaria "ok" todo dia sem encerrar nenhuma campanha vencida,
--             que ficaria `'ativo'` pra sempre - página pública anunciando
--             campanha aberta com contador regressivo negativo, enquanto
--             `fn_valida_contribuicao_campanha_ativa` já rejeitaria doações
--             novas com "o prazo já foi encerrado". O doador veria uma
--             campanha aberta recusando o próprio dinheiro. Importante: a
--             causa NÃO é `trg_campanha_valida_transicao` (`[05-K-2]`, acima)
--             - o ramo autoverificável dela está certo (testado rodando como
--             superusuário: passa nos dois casos legítimos, bloqueia a
--             mentira) - é a RLS que barra antes da trigger sequer avaliar.
-- Solução, mesmo padrão de atualizar_status_contribuicao/atualizar_status_
-- repasse: `SECURITY DEFINER` bypassa a RLS (não a trigger - `trg_campanha_
-- valida_transicao` continua rodando por baixo e validando cada transição pelo
-- mesmo ramo autoverificável de sempre; não afrouxa nem a trigger nem a
-- policy). Chamada por agendamento (@Cron no NestJS), sem sessão de usuário -
-- mesma categoria pré-autorização de registrar_falha_login/registrar_login_
-- sucesso ([03-O]) e do webhook de atualizar_status_contribuicao. Retorna a
-- quantidade de campanhas encerradas, pro job poder logar de verdade (em vez
-- de silêncio) quantas mudaram.
--
-- CORRIGIDO (07-09-2026, achado incidental no teste manual de fechamento da
-- migração TypeScript do react/, nada a ver com ela): faltava `::status_
-- campanha` no resultado do CASE abaixo. `error: column "status" is of type
-- status_campanha but expression is of type text` (42804) - o Postgres NÃO
-- aplica cast de atribuição a um `CASE` com dois ramos literais do jeito que
-- aplicaria a um único literal solto (`SET status = 'sucesso'` funcionaria
-- sem cast; o `CASE` resolve pra `text` antes de chegar na coluna). Isso
-- quebrava a função a cada chamada, com ou sem campanha vencida pra
-- processar (erro de tipo, não de dado) - o `@Cron` de 15 em 15 min
-- (`CampanhaServiceEncerrarVencidas`, ligado em 05-09-2026 pro RF-057)
-- vinha falhando desde então. Comentário “mesmo padrão de atualizar_status_
-- repasse” (acima) não se sustentava: aquela função recebe `p_status`
-- como parâmetro único, nunca um `CASE` de dois literais.
-- ----------------------------------------------------------------------------
```

### [05-C037] 05_regras_negocio.sql, reativar_pesquisadores_vencidos (linhas originais 2702 a 2716)

```text
-- ----------------------------------------------------------------------------
-- Função:     reativar_pesquisadores_vencidos
-- Assinatura: () -> INT
-- Regra:      ADICIONADA (07-09-2026) - mesmo espírito e mesmo formato de
--             encerrar_campanhas_vencidas(), acima: suspender_pesquisador()
--             (03_funcoes_seguranca.sql, [03-P]) grava `suspenso_ate`, mas
--             nada reverte sozinho quando o prazo passa - sem isso, a
--             suspensão do PODER de pesquisador nunca expiraria de verdade,
--             mesmo com o prazo escolhido pelo Admin já vencido. Chamada
--             por agendamento (@Cron no NestJS, mesmo padrão de
--             CampanhaServiceEncerrarVencidas) - não expira ao vivo em cada
--             policy que lê status_pesquisador (evita reabrir as 3 policies
--             de 04 que já checam status_pesquisador = 'ativo'; ver
--             ACHADOS_PARA_DISCUTIR.md).
-- ----------------------------------------------------------------------------
```

### [05-C038] 05_regras_negocio.sql, fn_carimba_taxa_plataforma_aprovacao (linhas originais 2741 a 2756)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_carimba_taxa_plataforma_aprovacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (28-07-2026, item 20 da Lista C - o que o RF-036 pede
--             literalmente, não decisão de negócio sobre "se"). taxa_plataforma
--             existia mas nada nunca a preenchia - o requisito que protege o
--             pesquisador de ter a taxa alterada depois da aprovação não estava
--             implementado (só existia a trigger de congelamento, protegendo um
--             valor que nunca chegava a ser gravado). No momento em que
--             aprovado_em deixa de ser NULL, copia configuracoes.
--             taxa_plataforma_padrao pra campanha.taxa_plataforma - só se ainda
--             não tiver um valor explícito (não sobrescreve uma taxa customizada
--             que porventura já tenha sido definida). Daí em diante, a trigger de
--             congelamento (acima) já protege esse valor contra alteração.
-- ----------------------------------------------------------------------------
```

### [05-C039] 05_regras_negocio.sql, fn_valida_prazo_campanha_negocio (linhas originais 2784 a 2797)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_prazo_campanha_negocio
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      ADICIONADO (28-07-2026, item 16 da Lista C): a regra de negócio
--             real de duração de campanha sai da constraint (que virou só um
--             limite técnico largo, ver CK_CAMPANHA_PRAZO em 01) e passa a ler
--             configuracoes.prazo_minimo_campanha_dias/
--             prazo_maximo_campanha_dias - mudar a política de prazo vira um
--             UPDATE numa linha, não uma migração de estrutura.
-- ATUALIZADO (28-07-2026, mesma data): decisão tomada por você e pela Alexia,
-- direto - prazo agora é 15 a 60 dias (não mais 15-90). O RF-045 (janela de
-- estorno do PIX do Banco Central) fica satisfeito com folga.
-- ----------------------------------------------------------------------------
```

### [05-C040] 05_regras_negocio.sql, fn_valida_meta_campanha_negocio (linhas originais 2847 a 2862)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_meta_campanha_negocio
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      MÉDIO 3 - 5ª auditoria de uma IA: campanha com
--             `meta_financeira = 0.00` era aceita (reproduzido, existia uma no
--             banco de teste) - sem `CHECK` e sem chave de configuração. Numa
--             campanha `all-or-nothing`, meta zero é sucesso instantâneo (a
--             primeira contribuição confirmada já bate a meta). Mesmo padrão
--             do prazo (item 16): o limite técnico (`meta_financeira > 0`) já
--             mora na `CHECK` (01); esta trigger aplica o mínimo de negócio de
--             verdade, maior e configurável, via
--             `configuracoes.meta_minima_campanha` - mudar o valor mínimo
--             aceito vira um `UPDATE` numa linha, não uma migração de
--             constraint.
-- ----------------------------------------------------------------------------
```

### [05-C041] 05_regras_negocio.sql, fn_valida_transicao_solicitacao (linhas originais 2902 a 2913)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_transicao_solicitacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      CORRIGIDO - pol_solicitacao_update (04) passou a liberar UPDATE
--             também pro dono da campanha (não só quem decide), pra destravar o
--             valor 'cancelado' do ENUM status_encerramento. Esta trigger garante
--             que o dono só consegue fazer exatamente uma coisa: cancelar a
--             própria solicitação enquanto ainda está 'pendente' - nenhuma outra
--             coluna, nem outra transição de status. Quem tem
--             solicitacao_encerramento_decidir continua sem nenhuma restrição.
-- ----------------------------------------------------------------------------
```

### [05-C042] 05_regras_negocio.sql, fn_valida_contribuicao_campanha_ativa (linhas originais 2949 a 2963)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_contribuicao_campanha_ativa
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Bloqueia contribuição em campanha que não está com status
--             'ativo' no momento, cujo prazo (data_fim) já expirou, ou que
--             ainda está "Em breve" (data_inicio no futuro).
-- ADICIONADO (28-07-2026) - feature "Em breve"/rascunho agendado: o pesquisador
-- pode aprovar a campanha e escolher lançar na hora ou agendar um início futuro
-- (mesma ideia do Catarse, contador regressivo no front). A campanha já fica
-- pública assim que aprovada (pol_campanha_select, 04, libera por status -
-- ver [04-E]), mas não pode receber nenhuma doação antes de data_inicio
-- chegar. Não precisa de status novo nem de job/cron pra "virar ativa" -
-- data_inicio no passado já é o suficiente, comparado em tempo real aqui.
-- ----------------------------------------------------------------------------
```

### [05-C043] 05_regras_negocio.sql, fn_valida_contribuicao_valor_minimo (linhas originais 3009 a 3021)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_contribuicao_valor_minimo
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      30-07-2026 (RF-056, sugestão de uma IA). R$5,00 estava
--             hardcoded direto na CHECK CK_CONTRIBUICAO_VALOR_MINIMO (01) -
--             não é piso do gateway de pagamento (PIX em si não impõe
--             mínimo), é política de negócio da plataforma. Mesmo padrão do
--             prazo/meta financeira (item 16): o limite técnico
--             (`valor > 0`) já mora na CHECK; esta trigger aplica o mínimo de
--             negócio de verdade, configurável, via
--             configuracoes.valor_minimo_contribuicao.
-- ----------------------------------------------------------------------------
```

### [05-C044] 05_regras_negocio.sql, trg_contribuicao_valida_valor_minimo (linhas originais 3038 a 3049)

```text
-- ----------------------------------------------------------------------------
-- Trigger:   trg_contribuicao_valida_valor_minimo
-- Tabela:    contribuicao
-- Momento:   BEFORE INSERT
-- Função:    fn_valida_contribuicao_valor_minimo()
-- Bloco:     [05-K-2]
-- Regra:     Aplica o mínimo de negócio do valor de contribuição
--            (configuracoes), separado do limite técnico (constraint em 01).
--            Só BEFORE INSERT - valor de contribuição não é alterado depois
--            de criada (status/id_transacao_api mudam via
--            atualizar_status_contribuicao, 03, nunca o valor em si).
-- ----------------------------------------------------------------------------
```

### [05-C045] 05_regras_negocio.sql, atualizar_status_contribuicao (linhas originais 3103 a 3128)

```text
-- ----------------------------------------------------------------------------
-- Função:     atualizar_status_contribuicao
-- Assinatura: (p_id INT, p_status status_contribuicao, p_id_transacao VARCHAR DEFAULT NULL) -> VOID
-- Bloco:      [05-K-2]
-- Regra:      CRÍTICO 2 - 5ª auditoria de uma IA, achado simulando a
--             jornada de um usuário mal-intencionado: `pol_contribuicao_update`
--             (04) era `USING (true)` com `GRANT UPDATE` de tabela inteira -
--             qualquer usuário confirmava a própria contribuição (ou a de
--             qualquer um) direto por `UPDATE`. Reproduzido: fraudador doa
--             R$ 9.000 pra própria campanha (`status='pendente'`), executa
--             `UPDATE contribuicao SET status='confirmado'`, e
--             `trg_sincroniza_arrecadado_campanha` (acima) soma o valor de
--             verdade em `campanha.valor_bruto_arrecadado` - a página pública
--             passa a exibir R$ 9.000 arrecadados sem nenhum pagamento real
--             ter acontecido. Corrigido no mesmo padrão de `[03-O]`: a
--             coluna `status` (e `id_transacao_api`) sai do `GRANT UPDATE`
--             (`06`) e só muda por aqui - `SECURITY DEFINER`, mas
--             `trg_sincroniza_arrecadado_campanha` e as triggers de validação
--             all-or-nothing continuam rodando por baixo normalmente (RLS é
--             bypassada, trigger não).
-- SEM AUTORIZAÇÃO DE PROPÓSITO - pré-autenticação: chamada pelo webhook do
-- gateway de pagamento, sem sessão de usuário (mesma categoria de
-- registrar_falha_login/registrar_login_sucesso, [03-O]). De confiança do
-- backend: o endpoint que chama esta função precisa validar a assinatura do
-- webhook do gateway antes, nunca expor isso como rota pública genérica.
-- ----------------------------------------------------------------------------
```

### [05-C046] 05_regras_negocio.sql, validar_limite_campanhas_pesquisador (linhas originais 3144 a 3163)

```text
-- ----------------------------------------------------------------------------
-- Função:     validar_limite_campanhas_pesquisador
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-2]
-- Regra:      Um pesquisador não pode ter mais campanhas simultâneas (nos
--             status 'aguardando_aprovacao' ou 'ativo') do que
--             configuracoes.limite_campanhas_simultaneas (padrão 2, ver
--             REQUISITOS_V7, "limite de campanhas simultâneas").
-- ATUALIZADO (21-09-2026): 'rascunho' NÃO conta, então o limite passou a ser
-- cobrado no ENVIO pra aprovação (rascunho -> aguardando_aprovacao e reenvio de
-- rejeitada), não na criação: rascunhos podem ser criados livremente. Continua
-- BEFORE INSERT OR UPDATE, então não há caminho que fure o limite. A mensagem
-- foi reescrita porque o erro agora chega no momento do envio, e a antiga falava
-- em "campanhas ativas ou aguardando aprovação" como se fosse na criação.
-- CORRIGIDO (28-07-2026, item 16 da Lista C): limite de 2 estava hardcoded
-- no corpo da função - mudar exigia editar e reaplicar o arquivo inteiro.
-- Passou a ler configuracoes (mesmo valor de hoje, 2, como DEFAULT de
-- segurança caso a chave não exista).
-- ----------------------------------------------------------------------------
-- Revisada em 24-09-2026, ver DOCUMENTACAO_BD.md [05-K-2-C].
```

### [05-C047] 05_regras_negocio.sql, validar_comentario_endosso (linhas originais 3308 a 3318)

```text
-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_endosso
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Uma campanha não pode ter mais endossos ativos simultâneos
--             (ordem_endosso preenchida) do que
--             configuracoes.limite_endossos_campanha (RF-063).
-- CORRIGIDO (28-07-2026, item 16 da Lista C): limite de 4 estava hardcoded
-- no corpo da função. Passou a ler configuracoes (mesmo valor de hoje, 4,
-- como DEFAULT de segurança caso a chave não exista).
-- ----------------------------------------------------------------------------
```

### [05-C048] 05_regras_negocio.sql, validar_comentario_autor (linhas originais 3366 a 3376)

```text
-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_autor
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Pesquisador não pode comentar em sua própria campanha (RF-092).
--             CORRIGIDO (12-09-2026, achado de agente numa auditoria RF x
--             implementação) - citava RF-066 (prazo mínimo/máximo de
--             campanha, sem relação nenhuma), resíduo de uma numeração de
--             RF antiga que nunca foi atualizado aqui. A regra em si
--             sempre esteve correta, só o comentário estava desatualizado.
-- ----------------------------------------------------------------------------
```

### [05-C049] 05_regras_negocio.sql, fn_comentario_ignora_endosso_na_criacao (linhas originais 3411 a 3429)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_comentario_ignora_endosso_na_criacao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      ADICIONADO (15-09-2026, achado numa auditoria RF x
--             implementação) - RF-089 é claro: só o pesquisador CRIADOR DA
--             CAMPANHA marca um comentário como "Endossado", nunca o autor
--             do próprio comentário. `ComentarioRequestCreate` (Nest)
--             aceitava `endossado` vindo do cliente na hora de criar, e
--             `pol_comentario_insert` (04) só checa `id_pesquisador =
--             id_usuario_atual()` - nada impedia um pesquisador se
--             autoendossar ao comentar na campanha de outro, publicando o
--             próprio comentário na seção de endossos (RF-090) sem o dono
--             aprovar nada. Zera os 2 campos incondicionalmente no INSERT,
--             não confia em "o Nest não vai mais mandar isso" - defesa em
--             profundidade, igual o resto deste arquivo faz com colunas
--             sensíveis (ver GRANT UPDATE restrito de perfil_pesquisador,
--             06_grants.sql).
-- ----------------------------------------------------------------------------
```

### [05-C050] 05_regras_negocio.sql, validar_comentario_endosso_autor (linhas originais 3455 a 3468)

```text
-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_endosso_autor
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      ADICIONADO (15-09-2026, mesma auditoria acima) - metade 2 do
--             mesmo bug: `pol_comentario_update` (04) libera UPDATE pro
--             autor do comentário, pro dono da campanha OU pra quem tem
--             'comentario_moderar', mas nenhuma trigger restringia QUAL
--             coluna cada um pode tocar. Sem isto, o autor conseguia
--             endossar o PRÓPRIO comentário também via UPDATE, não só no
--             INSERT (bloqueado acima) - mesma falha de RF-089 por outra
--             porta. Só quem é o dono da campanha ou tem
--             'comentario_moderar' pode mudar `endossado`.
-- ----------------------------------------------------------------------------
```

### [05-C051] 05_regras_negocio.sql, validar_comentario_edicao_conteudo (linhas originais 3507 a 3523)

```text
-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_edicao_conteudo
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      ADICIONADO (15-09-2026, mesma auditoria) - RF-091: "o
--             pesquisador pode editar o comentário já enviado ENQUANTO ELE
--             NÃO ESTIVER com status de endossado". Faltava a trigger que
--             faz valer a 2ª metade dessa frase - sem ela, dava pra editar
--             `conteudo` de um comentário já endossado (mudando o que está
--             publicado na página pública sem o dono saber) e, pelo mesmo
--             motivo de `pol_comentario_update` não distinguir coluna, até
--             o DONO/moderador conseguiam editar o TEXTO de um comentário
--             que não escreveram - RF-091 é claro que editar conteúdo é
--             ação exclusiva do próprio autor. `ativo` (ocultar/reverter)
--             não é afetado por esta trigger, mora só em
--             fn_bloqueia_reversao_moderacao_comentario (acima).
-- ----------------------------------------------------------------------------
```

### [05-C052] 05_regras_negocio.sql, fn_bloqueia_reversao_moderacao_comentario (linhas originais 3559 a 3569)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_bloqueia_reversao_moderacao_comentario
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Só quem tem a permissão 'comentario_moderar' pode reverter
--             (ativo FALSE -> TRUE) um comentário que a moderação ocultou.
--             O autor continua podendo editar o próprio texto e ocultar
--             (ativo TRUE -> FALSE) o próprio comentário normalmente - só a
--             reversão da moderação é bloqueada. (Ver DOCUMENTACAO_BD.md
--             [04-E-3]/[05-K-3]).
-- ----------------------------------------------------------------------------
```

### [05-C053] 05_regras_negocio.sql, trg_comentario_bloqueia_reversao_moderacao (linhas originais 3582 a 3592)

```text
-- ----------------------------------------------------------------------------
-- Trigger:   trg_comentario_bloqueia_reversao_moderacao
-- Tabela:    comentario
-- Momento:   BEFORE UPDATE
-- Função:    fn_bloqueia_reversao_moderacao_comentario()
-- Bloco:     [05-K-3]
-- Regra:     Fecha a brecha em que pol_comentario_update (04) libera UPDATE
--            pro autor sem restringir coluna - sem esta trigger, o autor
--            conseguia desfazer sozinho uma moderação (voltar ativo pra
--            TRUE) com um UPDATE direto, sem passar por moderador/admin.
-- ----------------------------------------------------------------------------
```

### [05-C054] 05_regras_negocio.sql, validar_comentario_frequencia (linhas originais 3599 a 3612)

```text
-- ----------------------------------------------------------------------------
-- Função:     validar_comentario_frequencia
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      ADICIONADA (12-09-2026, pedido do Lucas, achado numa auditoria):
--             `comentario` era o único mecanismo de conteúdo do usuário sem
--             limite de frequência/quantidade - endosso/link_academico/
--             upload já tinham teto, denúncia já tinha frequência. Mesmo
--             desenho de validar_denuncia_frequencia() (acima) - conta
--             quantos comentários o mesmo pesquisador postou dentro da
--             janela, bloqueia o (limite+1)-ésimo. Não distingue campanha -
--             é limite de FREQUÊNCIA (anti-rajada/spam), não de volume total
--             por campanha, então soma comentários em QUALQUER campanha.
-- ----------------------------------------------------------------------------
```

### [05-C055] 05_regras_negocio.sql, validar_denuncia_frequencia (linhas originais 3656 a 3672)

```text
-- ----------------------------------------------------------------------------
-- Função:     validar_denuncia_frequencia
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      Um usuário não pode registrar mais denúncias (campanha + perfil
--             somadas) do que configuracoes.limite_denuncias_24h dentro da
--             janela configuracoes.janela_denuncias_horas (RF-076).
-- CORRIGIDO (28-07-2026, item 16 da Lista C): limite de 5 estava hardcoded
-- no corpo da função. Passou a ler configuracoes (mesmo valor de hoje, 5,
-- como DEFAULT de segurança caso a chave não exista).
-- CORRIGIDO (11-08-2026, achado pela IA testando outra tela: só metade da
-- regra virou configurável em 28-07 - a CONTAGEM (5) passou pra
-- configuracoes, mas a JANELA (24 horas) continuou fixa no INTERVAL, direto
-- no corpo da função. Agora janela_denuncias_horas também é lida de
-- configuracoes (default 24, idêntico ao valor de hoje - nada muda no
-- comportamento atual, só o lugar de onde o número vem).
-- ----------------------------------------------------------------------------
```

### [05-C056] 05_regras_negocio.sql, fn_valida_denuncia_sem_autojulgamento (linhas originais 3715 a 3731)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_valida_denuncia_sem_autojulgamento
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      MENOR 5 - 5ª auditoria de uma IA, reproduzido: um moderador
--             (Diego, id 10) criou uma denúncia contra um pesquisador e depois
--             marcou a própria denúncia como 'resolvida' - o que custa 4
--             pontos de score ao alvo (calcular_score_reputacao, [05-I-2]).
--             `pol_denuncia_update` (04) já checa a permissão
--             `denuncia_responder`, mas não checa se quem julga é o mesmo que
--             denunciou - mesmo tipo de conflito de interesse que
--             `validar_comentario_autor()` já bloqueia pra auto-endosso
--             (`[05-K-3]`, acima). Bloqueia qualquer transição de `status`
--             feita pelo próprio denunciante, não só pra 'resolvida' - também
--             não faz sentido o denunciante marcar a própria denúncia como
--             'improcedente'.
-- ----------------------------------------------------------------------------
```

### [05-C057] 05_regras_negocio.sql, trg_admin_recebe_toda_permissao (linhas originais 3760 a 3782)

```text
-- ----------------------------------------------------------------------------
-- Função:     trg_admin_recebe_toda_permissao
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Uso:        Invocada por trg_permissao_auto_admin
-- Regra:      Rede de segurança para a remoção de eh_admin() das RLS
--             policies (ver RBAC-pontos-discutidos.md e 04_rls_policies.sql).
--             Toda policy passou a checar tem_permissao('x') em vez de
--             eh_admin(). Sem esta trigger, toda permissão nova criada
--             exigiria lembrar de também inserir a linha correspondente em
--             papel_permissao para 'admin' manualmente - e um esquecimento
--             faria o admin perder acesso a algo que antes tinha de graça
--             via eh_admin(). Com a trigger, toda permissão nova já nasce
--             atribuída ao papel 'admin' automaticamente, tornando
--             tem_permissao(...) um substituto 100% seguro do bypass antigo.
-- CORRIGIDO (03-08-2026, achado de revisão externa): lia `WHERE p.nome =
-- 'admin'` - o admin é reconhecido pelo TEXTO do rótulo editável, então
-- renomear o papel 'admin' pelo painel (dia que essa tela existir) faria
-- toda permissão nova parar de ser auto-concedida, em silêncio, sem erro
-- nenhum (testado e confirmado antes de corrigir). Agora lê `codigo`
-- (01_extensoes_enums_tabelas.sql [01-B]), coluna que nunca é exposta pra
-- edição - só `nome` (o rótulo) pode mudar.
-- ----------------------------------------------------------------------------
```

### [05-C058] 05_regras_negocio.sql, fn_atribuir_papel_pesquisador (linhas originais 3807 a 3832)

```text
-- ----------------------------------------------------------------------------
-- Função:     fn_atribuir_papel_pesquisador
-- Assinatura: () -> TRIGGER
-- Bloco:      [05-K-3]
-- Regra:      MÉDIO 4 - 5ª auditoria de uma IA, achado na jornada "usuário
--             com mestrado vira pesquisador": quando o app cria o
--             `perfil_pesquisador` (upgrade de conta), o usuário fica só com o
--             papel `'usuario'` - o papel `'pesquisador'` nunca é atribuído
--             por ninguém. O seed atribui `'pesquisador'` aos 11 pesquisadores
--             semeados (dado histórico), mas o fluxo real do app não replica
--             isso. Hoje não quebra nada (o papel `'pesquisador'` nasce com 0
--             permissões, e as policies checam a existência do
--             `perfil_pesquisador`, não o papel) - mas cria duas realidades
--             diferentes no banco, e vira bug silencioso no dia em que alguém
--             conceder a primeira permissão ao papel `'pesquisador'`, que é a
--             coisa mais natural do mundo de acontecer num RBAC dinâmico.
--             Mantém o invariante "tem perfil <=> tem o papel" - mesmo
--             espírito de `atribuir_papel_padrao()` (08) e de
--             `trg_admin_recebe_toda_permissao()` (acima): `SECURITY DEFINER`
--             porque o usuário que está virando pesquisador ainda não tem
--             `'papel_atribuir'` (mesmo problema de "ovo e galinha").
-- CORRIGIDO (03-08-2026, achado de revisão externa): lia `WHERE nome =
-- 'pesquisador'` - mesmo risco de `trg_admin_recebe_toda_permissao`
-- (acima): renomear o papel pelo painel faria completar o perfil de
-- pesquisador parar de atribuir o papel, em silêncio. Agora lê `codigo`.
-- ----------------------------------------------------------------------------
```

### [05-C059] 05_regras_negocio.sql, fn_log_auditoria (linhas originais 3868 a 3914)

```text
-- ============================================================
-- [05-L] LOG DE AUDITORIA (log_auditoria)
-- ============================================================
-- ADICIONADO (03-08-2026, sugestão de uma IA) - ver comentário
-- completo em 01_extensoes_enums_tabelas.sql [01-L]. Uma função genérica,
-- aplicada em N tabelas via CREATE TRIGGER ... EXECUTE FUNCTION
-- fn_log_auditoria('coluna_pk_1'[, 'coluna_pk_2']) - os argumentos são os
-- nomes da(s) coluna(s) de PRIMARY KEY daquela tabela específica (1 pra PK
-- simples, 2 pra PK composta como usuario_papel/papel_permissao).
-- ----------------------------------------------------------------------------
-- Função:     fn_log_auditoria
-- Assinatura: (VARIADIC coluna_pk TEXT[]) -> TRIGGER
-- Bloco:      [05-L]
-- Regra:      Grava em log_auditoria quem (id_usuario_atual()), o quê
--             (tabela + identidade do registro) e quando (ocorrido_em,
--             default NOW()) qualquer INSERT/UPDATE/DELETE nas tabelas com
--             a trigger abaixo aplicada.
--
--             SECURITY DEFINER: pol_log_auditoria_select (04) não tem
--             policy de INSERT - ninguém, nem app_nestjs, tem GRANT INSERT
--             nesta tabela (06). A trigger só consegue gravar porque roda
--             com o privilégio de quem A CRIOU (SECURITY DEFINER), não de
--             quem disparou o UPDATE/INSERT/DELETE que a acionou.
--
--             REDAÇÃO DE COLUNA SENSÍVEL: 'senha_hash' (usuario),
--             'cpf_criptografado' e 'cpf_hash' (as duas de perfil_
--             pesquisador) nunca entram em dados_anteriores/dados_novos -
--             removidas do JSONB (operador `-`) DEPOIS de calcular
--             campos_alterados (por isso o nome da coluna ainda aparece em
--             campos_alterados quando ela muda - saber QUE a senha/CPF
--             mudou é auditoria válida; o HASH em si, não). `cpf_hash`
--             ADICIONADO (12-09-2026, achado de agente numa auditoria RF x
--             implementação, RF-117: "CPF nunca tem seu valor gravado no
--             log") - é um HMAC-SHA256 com chave secreta, não reversível
--             sem ela, mas ainda uma redação de dado derivado do CPF; lido
--             ao pé da letra, RF-117 pede o mesmo cuidado dado a
--             cpf_criptografado. Se uma tabela nova entrar na lista de triggers abaixo
--             e tiver outra coluna sensível (ex.: token_hash, se um dia
--             verificacao_email/recuperacao_senha entrarem pra este log),
--             adicione um `- 'nome_da_coluna'` a mais nas duas linhas de
--             v_antigos/v_novos.
--
--             UPDATE que não muda nenhum valor de verdade (ex.: um SET
--             igual ao que já estava) não gera linha nenhuma - v_campos
--             fica NULL e a função retorna cedo, antes do INSERT em
--             log_auditoria.
-- ----------------------------------------------------------------------------
```

### [06-C001] 06_grants.sql (linhas originais 39 a 49)

```text
-- ----------------------------------------------------------------------------
-- Contexto histórico (por que os GRANTs estão consolidados aqui):
-- Este arquivo reúne GRANTs que antes ficavam espalhados em lugares
-- diferentes - o bloco principal de schema/tabela/coluna vinha de um
-- arquivo à parte de "artifícios", o GRANT nas sequências vinha do fim do
-- arquivo de seed (como um fix avulso, provavelmente porque o erro 42501
-- só apareceu depois que alguém tentou inserir e esbarrou na falta de
-- USAGE na sequência), e o GRANT EXECUTE nas funções de score também vinha
-- do arquivo de artifícios. Consolidado aqui, nenhum GRANT corre mais o
-- risco de ficar esquecido num outro arquivo.
-- ----------------------------------------------------------------------------
```

### [06-C002] 06_grants.sql (linhas originais 128 a 163)

```text
-- CORRIGIDO: coluna suspenso removida da tabela (01) - tirada da lista também.
-- CORRIGIDO (28-07-2026): cpf_criptografado adicionada - a coluna é NOT NULL
-- (Alexia), então o app_nestjs já era obrigado a GRAVAR o CPF, mas continuava
-- impossibilitado de LÊ-LO (mesma coluna fora do GRANT SELECT), o que travava o
-- KYC do RF-015 (a API de pagamento precisa do CPF pra configurar o recebimento
-- do pesquisador, e o backend não tinha como enviar um dado que nem conseguia
-- selecionar). A proteção que de fato importa passa a ser a permissão
-- perfil_pesquisador_visualizar_sensivel (seedada, hoje sem nenhum efeito porque
-- nada a usava) gateando a leitura no NestJS - não a coluna ficar inacessível
-- pro próprio backend.
-- SUPERADA (30-07-2026): a correção de 28-07-2026 (item 12 da Lista C) tinha
-- tirado score_atual/score_atualizado_em desta lista, porque era uma porta dos
-- fundos pra ler o score de qualquer perfil por aqui mesmo com a policy de
-- score_pesquisador (04) já restrita. Como pol_score_select (04) voltou a ser
-- pública (decisão de produto - ver nota lá e em PENDENCIAS e correcoes.md),
-- não existe mais porta dos fundos a fechar: as 2 colunas voltam pra cá, só
-- por conveniência (evita join com score_pesquisador pra montar a página
-- pública de perfil do pesquisador). GRANT UPDATE continua sem essas 2
-- colunas ([06-D-2b] mais abaixo) - isso é integridade de escrita, não
-- privacidade, e não muda com esta decisão.
-- ATUALIZADO (22-08-2026): cpf_hash entrou na lista - é o índice cego (ver
-- DOCUMENTACAO_BD.md), o backend precisa poder LER pra checar duplicidade
-- (RF-017/suporte localizando conta por CPF) e ESCREVER na criação (grant de
-- INSERT logo abaixo). Nunca é exposto na resposta HTTP (não é dado de
-- exibição, é só chave de busca interna) - isso é regra de DTO/converter no
-- Nest, o GRANT aqui só permite a leitura pelo backend.
-- suspenso_ate/motivo_suspensao/suspenso_por (07-09-2026, [03-P]) - ADICIONADAS
-- à tabela mas ESQUECIDAS aqui na 1ª rodada (achado 08-09-2026, testando ao
-- vivo depois do Lucas colar o SQL: `buscarSuspensao()` batia em "permission
-- denied for table perfil_pesquisador" porque o SELECT por coluna é
-- restritivo - a suspensão em si funcionava, porque escreve via
-- suspender_pesquisador()/reativar_pesquisador() SECURITY DEFINER, que
-- ignora GRANT; só a LEITURA direta ficava cega). Mesmo raciocínio de
-- usuario ([06-D-2] acima): leitura liberada pra Consultar/Alterar
-- Pesquisador mostrarem o estado de suspensão, escrita continua só via as
-- funções SECURITY DEFINER, nunca por este GRANT.
```

### [06-C003] 06_grants.sql (linhas originais 183 a 215)

```text
-- CORRIGIDO (28-07-2026, achado por uma IA): GRANT UPDATE de TABELA INTEIRA em
-- usuario/perfil_pesquisador era uma porta dos fundos grave - o GRANT SELECT já é
-- restrito por coluna (ver [06-D-2] acima), mas o UPDATE não era, e é o MESMO
-- app_nestjs que atende tanto um endpoint genérico de "editar meu perfil" quanto o
-- fluxo de autenticação. Testado como usuário comum autenticado, via UPDATE direto:
-- forjar o próprio score_atual pra 100, auto-marcar email_verificado = TRUE (bypass
-- permanente da verificação de e-mail - só precisa de um PATCH genérico no backend),
-- limpar o próprio bloqueio de login, e "ressuscitar" a própria conta excluída
-- (deletado = FALSE). Os 4 ataques funcionavam antes desta correção.
--
-- perfil_pesquisador: GRANT UPDATE por coluna, mesma lista do SELECT ([06-D-2] acima)
-- MENOS score_atual/score_atualizado_em - essas 2 só podem mudar via
-- recalcular_score_pesquisador() (SECURITY DEFINER, 05), nunca por UPDATE direto.
-- CORRIGIDO (30-07-2026, [03-P]): status_pesquisador também saiu daqui. Antes,
-- pol_perfil_update (04) só libera UPDATE pro próprio dono - combinado com
-- este GRANT, o único jeito de status_pesquisador mudar de verdade era o
-- próprio pesquisador se auto-suspender/reativar, o que não faz sentido, e não
-- existia caminho nenhum pra moderação suspender outra pessoa. Agora só muda
-- via suspender_pesquisador() (SECURITY DEFINER, 03, [03-P]).
-- CORRIGIDO (22-08-2026, achado de uma IA analisando o módulo
-- 6-perfil-pesquisador antes de implementar): cpf_criptografado TAMBÉM saiu
-- daqui, mesma classe de bug - pol_perfil_update (04) libera UPDATE pro
-- próprio dono, e esta lista incluía cpf_criptografado, então o próprio
-- pesquisador conseguia alterar o CPF já cadastrado por um PATCH comum,
-- contrariando o RF-017 (correção de CPF é só via suporte). cpf_hash nunca
-- entrou aqui de propósito (teria o mesmo problema, e sempre precisa mudar
-- em conjunto com cpf_criptografado, nunca sozinho). Agora os dois só mudam
-- via corrigir_cpf_pesquisador() (SECURITY DEFINER, 03) - ver GRANT EXECUTE
-- correspondente mais abaixo.
-- suspenso_ate/motivo_suspensao/suspenso_por (07-09-2026) - mesma classe de
-- exclusão de status_pesquisador/cpf_*, acima: só mudam via
-- suspender_pesquisador()/reativar_pesquisador() (SECURITY DEFINER, 03),
-- nunca por UPDATE direto - de propósito fora desta lista.
```
