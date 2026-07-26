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

# [03-A] FUNÇÕES HELPER PARA RLS


-- ALTERADO: não usa mais auth.uid() (Supabase Auth). O NestJS, após
-- validar o JWT próprio, executa `SET LOCAL app.id_usuario_atual = '<id>'`
-- no início da transação, e esta função lê esse valor da sessão.
-- `current_setting(..., true)` com o 2º argumento true não lança erro
-- caso a variável não tenha sido definida (retorna NULL).


-- ADICIONADO: checagem de permissão granular, para RBAC de verdade (não
-- só admin/não-admin). Nunca referencia nome de papel — só permissão.
-- Papel é puramente um "pacote de permissões" guardado em papel_permissao;
-- trocar, renomear ou dividir papéis no futuro não exige tocar nesta
-- função nem em nenhuma policy que a utilize.