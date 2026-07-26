# 📚 Documentação Técnica do Banco de Dados — CrowdAcadêmico

Este documento centraliza as explicações de arquitetura, regras de negócio e decisões de modelagem do PostgreSQL. Seu objetivo é manter os scripts `.sql` enxutos, sem poluição de comentários extensos inline.

---

## 01. EXTENSÕES, ENUMS E TABELAS (`01_extensoes_enums_tabelas.sql`)

---

### [01-A] Bootstrap, Extensões e ENUMs

* **Transição de Autenticação (Supabase $\rightarrow$ NestJS Próprio):** O projeto migrou do modelo de autenticação delegada (Supabase Auth/PostgREST) para uma arquitetura com backend próprio em NestJS.
* **Role `app_nestjs`:** O sistema utiliza uma única role de aplicação para gerenciar a conexão da API com o PostgreSQL. A criação dessa role é executada via bloco `DO $$` no topo do script 01 para garantir sua existência antes da criação de qualquer política de RLS (arquivo 04).
* **Senha Placeholder:** A instrução de criação utiliza a senha `'TROCAR_NO_AMBIENTE_REAL'`. Em ambientes de homologação e produção, essa credencial deve ser alterada via variável de ambiente/secret manager.
* **Extensão `pgcrypto`:** Ativada no início do script para fornecer suporte a funções criptográficas, como a geração de UUIDs (`gen_random_uuid()`).
* **Evolução dos ENUMs:**
  * `status_campanha` e `status_contribuicao`: Incluem estados para tratar fluxos de moderação, rejeição, expiração e reembolsos manuais.
  * `tipo_motivo_denuncia`: Categoriza denúncias entre alvos de campanha e perfis de pesquisadores.

---

### [01-B] RBAC (Controle de Acesso Baseado em Papéis)

* **Estrutura:** Composta pelas tabelas `papel`, `permissao` e a tabela de ligação `papel_permissao`.
* **Desvinculação do Banco:** As permissões granulares são checadas dinamicamente na aplicação NestJS e na função `public.tem_permissao()`.

---

### [01-C] CONFIG (Configurações e Catálogos Globais)

* **`configuracoes`:** Permite armazenar parâmetros globais do sistema (`id_usuario IS NULL`) e preferências individuais de usuários (`id_usuario` preenchido). Possui constraint `UNIQUE` na coluna `chave` para suportar operações de *upsert*.
* **`tipo_link`:** Catálogo centralizador de redes e links externos. Os campos booleanos `permite_perfil`, `permite_atualizacao` e `permite_recompensa` definem o escopo de uso de cada tipo.
* **`motivo_denuncia`:** Catálogo de razões para denúncia com flag `ativo` para permitir desativação lógica sem apagar registros históricos.
* **`arquivo`:** Tabela base de metadados para upload de mídias (URLs, MIME type e tamanho).

---

### [01-D] USUÁRIO (Autenticação Própria, Segurança e Sessões)

* **`usuario`:** Tabela central de contas.
  * `senha_hash`: Campo obrigatório (`NOT NULL`) para armazenar o hash Bcrypt/Argon2.
  * **Proteção Anti-Brute-Force e Auditoria:** As colunas `email_verificado`, `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em` e `ultimo_login_ip` controlam o bloqueio temporário de conta após falhas sucessivas.
* **`usuario_papel`:** Relacionamento N:N entre usuários e papéis. Localizada fisicamente neste bloco por depender de `usuario`, mas documentada conceitualmente sob o domínio de RBAC.
* **`perfil_pesquisador`:** Dados acadêmicos do pesquisador. O campo `score_atual` é mantido como inteiro para otimizar leituras e atualizações do algoritmo de pontuação.
* **`termos_de_uso` e `usuario_termo`:** Controle de versionamento de termos (LGPD). Guarda a trilha de auditoria (IPv4/IPv6 e timestamp de aceite).
* **`notificacao`:** Fila/Histórico de envios de e-mail. Armazena o snapshot do e-mail do destinatário, contagem de tentativas e o texto do último erro retornado para depuração.
* **`verificacao_email` e `recuperacao_senha`:** Gerenciamento de tokens curtos e temporários para confirmação de conta e redefinição de senha.
  * **Índice Parcial:** O índice `ux_recuperacao_senha_ativo_por_usuario` garante que exista apenas **um token de recuperação ativo** por usuário de cada vez.
* **`sessao`:** Persistência de *Refresh Tokens* hashed. Necessária para permitir o logout seguro, revogação de sessões e controle de múltiplos dispositivos em arquiteturas JWT *stateless*.

---

### [01-E] CAMPANHA (Campanhas, Moderação e Recompensas)

* **`campanha`:** Tabela principal de projetos de financiamento.
  * `chk_prazo_campanha`: Constraint que valida a duração da campanha entre 15 e 90 dias.
* **`atualizacao_campanha`:** Postagens de acompanhamento do projeto. O campo `ativo` permite o *soft delete* e a ocultação por moderação sem perda do histórico.
* **`comentario`:** Interações da comunidade.
  * Unicidade: Regra restringe a um comentário ativo por pesquisador em cada campanha.
  * `chk_comentario_endosso`: Constraint garante coerência matemática entre o booleano `endossado` e a sua ordem de exibição (`ordem_endosso`).
* **`denuncia`:** Registro de incidentes apontados por usuários, vinculados a um motivo do catálogo.
* **`recompensa`:** Recompensas oferecidas pelos pesquisadores. Possui validações para garantir `valor_minimo > 0` e quantidade disponível não negativa.

---

### [01-F] LINK (Tabelas de Associação de Links)

* **`link_academico`**, **`link_atualizacao`** e **`link_recompensa`:** Reutilizam o catálogo `tipo_link` para associar URLs externas a perfis de pesquisadores, atualizações de campanha e recompensas digitais.

---

### [01-G] ARQUIVO (Tabelas de Associação de Mídias)

* **`arquivo_atualizacao`** e **`arquivo_recompensa`:** Estabelecem o vinculo N:N entre a tabela base `arquivo` e as entidades de atualização/recompensa.

---

### [01-H] CONTRIBUIÇÃO (Transações e Auditoria Financeira)

* **`contribuicao`:** Registra os apoios financeiros.
  * Valor Mínimo: Restrição em nível de banco para contribuições de no mínimo R$ 5,00.
  * `token_sessao`: UUID gerado automaticamente (`gen_random_uuid()`) para proteger e rastrear doações anônimas contra enumeração sequencial por terceiros.
* **`auditoria_financeira`:** Registra o snapshot dos valores, meios de pagamento e transições de status a cada evento financeiro para fins de rastreabilidade contábil e histórico.
  * *Nota de Arquitetura:* O padrão imutável/append-only (somente inserção) é de responsabilidade da camada de serviço do NestJS. No RLS do PostgreSQL (`04_rls_policies.sql`), o `UPDATE` encontra-se atualmente sem restrições (`USING(true)`), ficando mapeado como pendência de arquitetura decidir se o banco deve restringir a alteração desta tabela a uma permissão administrativa específica.
* **`contribuicao_recompensa`:** Vincula um apoio às recompensas escolhidas pelo apoiador.
* **`aceite_termo_contribuicao`:** Registra o aceite do termo de doação específico da transação.

---

### [01-I] SCORE (Configuração e Cálculo de Pontuação)

* **`score_config`**, **`score_rotulo`** e **`score_pesquisador`:** Estrutura para gamificação e aferição de reputação dos pesquisadores na plataforma.
* **Integridade de Score:** A tabela `score_pesquisador` possui a constraint `uq_score_pesquisador_usuario_config` para impedir duplicidade de pontuação para o mesmo parâmetro e usuário.
* **Bloco `DO $$`:** Mantido ao final da tabela como verificação defensiva de legado para validar a existência da constraint de unicidade.




---

### Arquivo 02_indices.sql

---

## 02. ÍNDICES (`02_indices.sql`)

---

### Visão Geral de Performance

O script de índices organiza a aceleração de buscas no PostgreSQL e acompanha rigorosamente a ordem dos blocos conceituais do arquivo `01_extensoes_enums_tabelas.sql`. 

> 📌 **Nota de Arquitetura (RBAC e CONFIG):** As tabelas dos blocos `[02-B] RBAC` e `[02-C] CONFIG` não possuem instruções `CREATE INDEX` explícitas neste arquivo porque suas consultas principais já são atendidas pelos índices automáticos criados nativamente pelo PostgreSQL para as chaves primárias (`PRIMARY KEY`) e de unicidade (`UNIQUE`), como `chave` em `configuracoes` e `codigo_cnpq` em `area_conhecimento`.

Os índices explícitos criados neste script foram projetados para três cenários estratégicos:
1. **Chaves Estrangeiras (FKs):** Aceleração de `JOINs` em tabelas filhas para evitar leituras lentas (*sequential scans*).
2. **Caminhos Quentes (*Hot Paths*):** Otimização de fluxos críticos da aplicação, como verificação de tokens, renovação de sessões e filas de background.
3. **Regras de Negócio via Índices Parciais (`UNIQUE ... WHERE`):** Aplicação de restrições de unicidade condicional diretamente no banco de dados.

---

### [02-D] USUÁRIO

* **Rede de Pesquisadores:** `idx_seguir_pesquisador_usuario` e `idx_seguir_pesquisador_alvo` aceleram as consultas das redes de seguidores e seguidos.
* **Termo Vigente Único (`uq_termos_uso_ativo`):** Índice parcial `UNIQUE` que assegura no banco a existência de **no máximo uma versão ativa** de termos de uso por vez (`WHERE ativo = TRUE`).
* **Fila de Notificações (`idx_notificacao_status`):** Acelera a consulta do *worker* de background ao buscar mensagens com status `pendente`.
* **Autenticação e Sessão (*Hot Paths*):**
  * `verificacao_email`, `recuperacao_senha` e `sessao`: Índices sobre `token_hash`, `refresh_token_hash` e `id_usuario` previnem chamadas lentas a cada validação de link recebido por e-mail ou *refresh* de token JWT.

---

### [02-E] CAMPANHA

* **Listagens e Filtros de Plataforma:** `idx_campanha_status` e o índice composto `idx_campanha_status_data_fim` otimizam as buscas públicas de campanhas ativas e prestes a encerrar.
* **Relacionamentos e Moderação:** Índices focados nas FKs de `id_campanha` para tabelas dependentes (`seguir_campanha`, `atualizacao_campanha`, `repasse`, `solicitacao_encerramento`, `historico_rejeicao`, `comentario`, `recompensa` e `denuncia`).

---

### [02-F] LINK

* **Busca de Mídias/Redes Externas:** Índices de apoio às tabelas de associação (`link_academico`, `link_atualizacao` e `link_recompensa`) indexados pelas entidades pai e pelo catálogo `id_tipolink`.

---

### [02-G] ARQUIVO

* **Vínculos de Mídia:** Índices de junção em `arquivo_atualizacao` e `arquivo_recompensa`.
* **Imagem Principal da Recompensa (`uq_arquivo_recompensa_principal`):** Índice parcial `UNIQUE` que assegura que cada recompensa possua **no máximo uma mídia marcada como principal** (`WHERE principal = TRUE`).

---

### [02-H] CONTRIBUIÇÃO

* **Apoios e Painéis Financeiros:** Índices nas tabelas `contribuicao` (por campanha e usuário), `contribuicao_recompensa` e `aceite_termo_contribuicao` para agilizar a montagem do histórico de doações.

---

### [02-I] SCORE

* **Hierarquia e Histórico:** `idx_score_config_pai` otimiza a montagem das árvores de critérios de pontuação e `idx_score_pesq_usuario` acelera a consulta do histórico de pontuação do pesquisador.


--- 


### Arquivo 03_funcoes_seguranca.sql

---

## 03. FUNÇÕES HELPER DE SEGURANÇA (`03_funcoes_seguranca.sql`)

---

### Visão Geral de Arquitetura

As funções helper atuam como a ponte de contexto de segurança entre o backend NestJS e o mecanismo de RLS do PostgreSQL. Elas eliminam a dependência de frameworks externos (como Supabase Auth / `auth.uid()`) e viabilizam um modelo de autorização stateless nativo no banco de dados.

Ambas as funções utilizam os modificadores de segurança essenciais:
* **`STABLE`:** Informa ao otimizador do PostgreSQL que a função não altera o banco e retorna o mesmo resultado dentro da mesma transação SQL.
* **`SECURITY DEFINER` + `SET search_path = public`:** Executa a função com privilégios do criador da função, blindando-a contra ataques de sequestro de caminho de busca (*search path hijacking*).

---

### [03-A] CONTEXTO DE SESSÃO (`id_usuario_atual`)

* **Mecanismo de Transação:** O NestJS, ao autenticar o JWT e abrir uma transação com o PostgreSQL, executa o comando `SET LOCAL app.id_usuario_atual = '<id>'`.
* **Leitura Segura:** A função lê a variável customizada da sessão do PostgreSQL via `current_setting('app.id_usuario_atual', true)`.
* **Tratamento de Nulos:** O segundo argumento `true` impede que o PostgreSQL lance uma exceção fatal caso a variável não tenha sido configurada na sessão, retornando `NULL` de forma segura.

---

### [03-B] CONTROLE DE ACESSO GRANULAR (`tem_permissao`)

* **Autorização por Capacidade (*Capability-Based*):** Em vez de verificar nomes de papéis (como "admin" ou "pesquisador"), a função valida a existência de uma permissão específica (ex: `'campanha_aprovar'`).
* **Descolamento Múltiplo:** Permite alterar, renomear, dividir ou criar novos papéis na tabela `papel` sem a necessidade de alterar nenhuma política de RLS (`04_rls_policies.sql`) ou recriar funções no banco de dados.
* **Comportamento para Desconectados:** Caso `public.id_usuario_atual()` retorne `NULL` (usuário anônimo ou sessão sem token), o *subselect* falha na condição de igualdade e a função retorna `FALSE` de forma determinística.


---

## 04. ROW LEVEL SECURITY E POLÍTICAS DE ACESSO (`04_rls_policies.sql`)

---

### Visão Geral de Arquitetura

O arquivo `04_rls_policies.sql` estabelece a camada de defesa em nível de linha (*Row Level Security* — RLS) para o banco de dados. Todas as 39 tabelas do schema possuem RLS ativada e forçada.

#### Princípios Fundamentais de Segurança
1. **Ativação Universal (`ENABLE` + `FORCE ROW LEVEL SECURITY`):**
   * O uso do `FORCE ROW LEVEL SECURITY` garante que até mesmo o dono das tabelas (*table owner*) fique sujeito às regras de RLS, eliminando brechas em ambientes de execução local ou microsserviços.
2. **Modelo Non-Bypass (`app_nestjs`):**
   * A aplicação conecta via papel sem privilégio de `BYPASSRLS`. Toda e qualquer instrução SQL (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) é filtrada dinamicamente pela sessão do usuário (`public.id_usuario_atual()`).
3. **Isolamento de Tabelas de Infraestrutura/Autenticação:**
   * Tabelas como `verificacao_email`, `recuperacao_senha` e `sessao` são acessadas antes do estabelecimento da sessão do usuário. Elas possuem RLS restrita especificamente ao papel da aplicação (`TO app_nestjs USING (true)`), deixando a validação de hashes sob responsabilidade do backend NestJS.

---

### Estrutura por Domínio de Dados

O arquivo é organizado em 8 blocos conceituais que espelham literalmente os títulos e a ordem dos arquivos de criação (`01`) e dados (`02`):

#### [04-B] RBAC
* **Tabelas:** `papel`, `permissao`, `papel_permissao`.
* **Regra:** Tabelas de catálogo de controle de acesso possuem leitura pública (`FOR SELECT USING (true)`), permitindo que a função `public.tem_permissao()` resolva as checagens de autorização sem bloqueios recursivos.

#### [04-C] CONFIG
* **Tabelas:** `configuracoes`, `area_conhecimento`, `tipo_link`, `motivo_denuncia`, `arquivo`.
* **Regra:** Leitura pública para catálogos e arquivos básicos. Operações de escrita e alteração de parâmetros de sistema (`id_usuario IS NULL`) exigem permissão explícita (ex: `'configuracao_gerenciar'`).

#### [04-D] USUÁRIO
* **Tabelas:** `usuario`, `perfil_pesquisador`, `usuario_papel`, `termos_de_uso`, `usuario_termo`, `notificacao`, `verificacao_email`, `recuperacao_senha`, `sessao`, `seguir_pesquisador`.
* **Regra:** Usuários enxergam apenas os próprios dados sensíveis ou perfis não deletados. A atribuição de papéis (`usuario_papel`) exige a permissão `'papel_atribuir'`.

#### [04-E] CAMPANHA
* **Tabelas:** `campanha`, `atualizacao_campanha`, `comentario`, `denuncia`, `recompensa`, `seguir_campanha`, `solicitacao_encerramento`, `historico_rejeicao`, `repasse`.
* **Regra:** Campanhas visíveis publicamente apenas em status liberados (`ativo`, `sucesso`, `nao_atingido`, `encerrado`). Moderações e edições dependem de ser dono do recurso ou possuir permissões específicas (`'campanha_editar'`, `'campanha_aprovar'`, `'campanha_rejeitar'`, `'comentario_moderar'`).

> ⚠️ **Notas de Arquitetura & Débitos Técnicos ([04-E]):**
> * **Tabela `repasse`:** As políticas `pol_repasse_insert` e `pol_repasse_update` utilizam `WITH CHECK (true)` / `USING (true)`. A validação de quem pode gerar ou alterar um repasse é delegada integralmente ao backend NestJS.
> * **Permissão Órfã:** A permissão `campanha_encerrar` (presente no seed) não é consumida diretamente por nenhuma política de RLS neste arquivo (o encerramento é intermediado via `solicitacao_encerramento` e regras da aplicação).

#### [04-F] LINK
* **Tabelas:** `link_academico`, `link_atualizacao`, `link_recompensa`.
* **Regra:** Links de perfil e campanhas podem ser criados, editados ou removidos pelo próprio autor/pesquisador ou por usuários com papéis moderadores.

#### [04-G] ARQUIVO
* **Tabelas:** `arquivo_atualizacao`, `arquivo_recompensa`.
* **Regra:** O vínculo de arquivos de mídia a atualizações e recompensas é restrito aos proprietários da campanha vinculada ou administradores.

#### [04-H] CONTRIBUIÇÃO
* **Tabelas:** `contribuicao`, `auditoria_financeira`, `contribuicao_recompensa`, `aceite_termo_contribuicao`.
* **Regra:** Suporte a doações anônimas via validação do `app.token_sessao_atual`. Usuários autenticados visualizam apenas o seu próprio histórico financeiro ou via permissão `'contribuicao_visualizar_sensivel'`.

> ⚠️ **Nota de Arquitetura & Débito Técnico ([04-H]):**
> * **Tabela `auditoria_financeira`:** As políticas `pol_auditoria_insert` e `pol_auditoria_update` estão abertas para o papel `app_nestjs` (`USING (true) WITH CHECK (true)`), deixando a integridade da escrita sob responsabilidade do serviço de backend.

#### [04-I] SCORE
* **Tabelas:** `score_config`, `score_rotulo`, `score_pesquisador`.
* **Regra:** Leitura pública dos scores e parâmetros. Alterações em matrizes e rótulos de score são restritas à permissão `'score_editar'`.