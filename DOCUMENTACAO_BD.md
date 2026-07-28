# 📚 Documentação Técnica do Banco de Dados — CrowdAcadêmico

Este documento centraliza as explicações de arquitetura, regras de negócio e decisões de modelagem do PostgreSQL. Seu objetivo é manter os scripts `.sql` enxutos, sem poluição de comentários extensos inline.

Os marcadores usados nos comentários dos `.sql` seguem o formato `[NN-Y]` (arquivo-letra) ou `[NN-Y-N]` (arquivo-letra-item), onde `NN` é o número do arquivo (`01` a `08`) e `Y` é a letra do bloco. A letra é a mesma em qualquer arquivo onde aparecer — ver índice abaixo.

### Legenda dos símbolos usados neste documento

| Símbolo | Significado |
|---|---|
| 📌 | Nota explicativa — o porquê de uma decisão de modelagem |
| ⚠️ | Ponto de atenção / débito técnico — funciona, mas vale revisar no futuro |
| 🗑️ | Algo que foi removido |
| 🗑️➡️✅ | Algo que foi removido *e* trocado por uma correção |

---

## 🔤 Índice Global de Letras

Cada letra tem exatamente um significado, do `01` ao `08`. Se você está procurando tudo que existe sobre um assunto (tabela, índice, policy, grant, regra de negócio), procure pela mesma letra em qualquer arquivo.

| Letra | Domínio | Onde aparece |
|---|---|---|
| **A** | Visão Geral & Configuração Inicial (o ROOT) | `01-A` (bootstrap/role/extensões/enums), `04-A` (RLS geral) |
| **B** | RBAC (Papéis, Permissões e Vinculação) | `01-B`, `02` *(sem bloco — PK/UNIQUE já bastam)*, `03-B` (`tem_permissao()`), `04-B`, `06-B` *(sem grant adicional)*, `07-B` (seed de papel/permissao/papel_permissao) |
| **C** | CONFIG (Configurações, Catálogos e Arquivo Base) | `01-C`, `02` *(sem bloco)*, `04-C`, `06-C`, `07-C` (seed de catálogos e configuracoes) |
| **D** | USUÁRIO (Contas, Perfis, Autenticação, Termos e Sessões) | `01-D`, `02-D`, `04-D`, `06-D`, `07-D` (seed de usuario/perfil/seguir_pesquisador), `08-D-1` (`atribuir_papel_padrao()`) |
| **E** | CAMPANHA (Campanhas, Atualizações, Comentários, Denúncias, Recompensas) | `01-E`, `02-E`, `04-E`, `06-E`, `07-E` (seed de campanha e tabelas dependentes) |
| **F** | LINK (Vinculação de URLs Externas) | `01-F`, `02-F`, `04-F`, `06-F`, `07-F` (seed de link_academico) |
| **G** | ARQUIVO (Vinculação de Mídias) | `01-G`, `02-G`, `04-G`, `06-G`, `07-G` (seed de arquivo_atualizacao) |
| **H** | CONTRIBUIÇÃO (Apoios, Auditoria e Termos Financeiros) | `01-H`, `02-H`, `04-H`, `06-H`, `07-H` (seed de contribuicao/auditoria_financeira) |
| **I** | SCORE (Parâmetros, Rótulos, e todo o motor de cálculo/pontuação) | `01-I`, `02-I`, `04-I`, `05-I-1` a `05-I-4` (motor de score), `06-I`, `07-I` (seed de score_config/rotulo + constantes + backfill) |
| **J** | Segurança & Contexto de Sessão (`id_usuario_atual()`) | `03-J` |
| **K** | Regras de Negócio Transversais (validações que cruzam mais de um domínio ao mesmo tempo) | `05-K-1` a `05-K-3` |

> 📌 Por que `J` e `K` existem: nem tudo no banco pertence a um domínio de dado único. `id_usuario_atual()` (`03`) não é sobre nenhuma tabela específica — é infraestrutura de sessão usada por tudo. E várias triggers de `05` (ex.: validar repasse financeiro de uma campanha, ou impedir denúncia excessiva) mexem em mais de uma tabela de domínios diferentes ao mesmo tempo — forçá-las dentro de uma letra só (`E` ou `H`, por exemplo) esconderia que elas são regras de fronteira entre domínios, não de um domínio só. Por isso ganham letras próprias em vez de reaproveitar `A`-`I` com um significado diferente do já estabelecido.

---

## 01. EXTENSÕES, ENUMS E TABELAS (`01_extensoes_enums_tabelas.sql`)

### [01-A] Bootstrap, Extensões e ENUMs

* **Transição de Autenticação (Supabase $\rightarrow$ NestJS Próprio):** O projeto migrou do modelo de autenticação delegada (Supabase Auth/PostgREST) para uma arquitetura com backend próprio em NestJS.
* **Role `app_nestjs`:** O sistema utiliza uma única role de aplicação para gerenciar a conexão da API com o PostgreSQL. A criação dessa role é executada via bloco `DO $$` no topo do script 01 para garantir sua existência antes da criação de qualquer política de RLS (arquivo 04).
* 🗑️➡️✅ **Senha Placeholder — CORRIGIDO (28-07-2026):** a role nasce `NOLOGIN`, sem senha nenhuma — não mais com `LOGIN PASSWORD 'TROCAR_NO_AMBIENTE_REAL'`. A versão anterior falhava **aberta**: esquecer de trocar a senha em produção deixava o sistema funcionando normalmente com uma credencial conhecida publicada no próprio repositório Git, sem nenhum aviso. Com `NOLOGIN`, esquecer o passo de instalação falha **fechada**: o NestJS simplesmente não consegue conectar (`FATAL: role "app_nestjs" is not permitted to log in`), erro percebido em minutos. `GRANT` e `SET ROLE` continuam funcionando normalmente numa role `NOLOGIN` — só o login direto fica bloqueado até alguém rodar `ALTER ROLE app_nestjs LOGIN PASSWORD '...'`, passo obrigatório de instalação documentado em `tutorial-rodar-projeto.md`.
* 🗑️➡️✅ **Guarda de `BYPASSRLS` — ADICIONADO (28-07-2026):** bloco `DO $$` logo após a criação da role, que verifica se `current_user` tem `rolsuper` ou `rolbypassrls` e aborta o bootstrap com uma mensagem única e explicativa se não tiver. Não resolve sozinho a pendência de confirmar se o papel do SQL Editor do Supabase tem `BYPASSRLS` (ver `PENDENCIAS e correcoes.md`, item 22, ainda em aberto) — mas transforma uma falha silenciosa (dezenas de erros de RLS espalhados pelos arquivos `04`-`07`, já que 89 das 105 policies são `TO app_nestjs` e as 39 tabelas têm `FORCE ROW LEVEL SECURITY`) numa parada única e autoexplicativa logo no início.
* **Extensão `pgcrypto`:** Ativada no início do script para fornecer suporte a funções criptográficas, como a geração de UUIDs (`gen_random_uuid()`).
* **Evolução dos ENUMs:**
  * `status_campanha` e `status_contribuicao`: Incluem estados para tratar fluxos de moderação, rejeição, expiração e reembolsos manuais.
  * `tipo_motivo_denuncia`: Categoriza denúncias entre alvos de campanha e perfis de pesquisadores.
  * 🗑️➡️✅ **`tipo_vinculo` (ADICIONADO, 28-07-2026):** `'institucional'` / `'independente'` — ver `[01-D]` (`perfil_pesquisador`) para o raciocínio completo.

---

### [01-B] RBAC (Controle de Acesso Baseado em Papéis)

* **Estrutura:** Composta pelas tabelas `papel`, `permissao` e a tabela de ligação `papel_permissao`.
* **Desvinculação do Banco:** As permissões granulares são checadas dinamicamente na aplicação NestJS e na função `public.tem_permissao()`.

---

### [01-C] CONFIG (Configurações, Catálogos e Arquivo Base)

* **`configuracoes`:** Permite armazenar parâmetros globais do sistema (`id_usuario IS NULL`) e preferências individuais de usuários (`id_usuario` preenchido). Possui constraint `UNIQUE` na coluna `chave` para suportar operações de *upsert*.
* **`tipo_link`:** Catálogo centralizador de redes e links externos. Os campos booleanos `permite_perfil`, `permite_atualizacao` e `permite_recompensa` definem o escopo de uso de cada tipo. 🗑️➡️✅ **Coluna `codigo` nova (28-07-2026):** `motivo_denuncia` e `area_conhecimento` já tinham chave natural estável (`codigo`/`codigo_cnpq`); `tipo_link` era a única tabela de catálogo sem uma. Virou necessário quando o seed (`07`) passou a referenciar catálogo por chave natural em vez de id posicional (ver `PENDENCIAS e correcoes.md`, item 36, sobre o bug que essa prática expôs). Valores: `LATTES`, `ORCID`, `RESEARCHGATE`, `LINKEDIN`, `GITHUB`.
* 🗑️➡️✅ **`area_conhecimento` ganhou hierarquia de 2 níveis — CORRIGIDO (28-07-2026):** coluna `id_pai` nova, auto-referenciada (mesmo padrão de `score_config`, ver `[01-I]`) — antes só existiam as 9 grandes áreas do CNPq, que eram amplas demais pra um filtro de busca funcionar de verdade (ex.: "Ciências da Saúde" cobrindo de odontologia a saúde coletiva). Agora cada grande área (`id_pai IS NULL`) tem várias áreas de nível 2 como filhas (`id_pai` apontando pra ela) — ~81 áreas novas, seedadas em `07`. Decisão tomada junto: `campanha` passou a ser **obrigada** a informar uma área de nível 2 (coluna `NOT NULL`, nunca a grande área raiz) — ver a trigger em `[05-K-1]`. 🗑️➡️✅ **`codigo_cnpq` sem dígito verificador (28-07-2026):** a primeira versão guardava o código completo (ex.: `'1.03.00.00-7'`), mas os dígitos não vieram de fonte conferida — provado matematicamente (por outra sessão, com prova completa em `PENDENCIAS e correcoes.md`, item 38) que os dígitos semeados não podiam vir de nenhum algoritmo real de soma ponderada. Decisão: guardar só `'X.YY.00.00'`, sem o dígito — ele serve pra pegar erro de transcrição humana em papel, e aqui o código é só comparado por igualdade, nunca digitado à mão. Nomes e hierarquia continuam corretos e confiáveis (nomenclatura padrão CNPq).
* **`motivo_denuncia`:** Catálogo de razões para denúncia com flag `ativo` para permitir desativação lógica sem apagar registros históricos. 🗑️➡️✅ **5 motivos novos (28-07-2026):** `CAMP-005` a `CAMP-008` (plágio, conflito de interesse não declarado, campanha sem viabilidade metodológica, spam) e `PERF-004` (vínculo institucional falso — ficou mais relevante depois que `perfil_pesquisador.vinculo_institucional` virou `NOT NULL`).
* **`arquivo`:** Tabela base de metadados para upload de mídias (URLs, MIME type e tamanho).

> 📌 **Por que `tipo_link` e `arquivo` moram em CONFIG, e não em LINK/ARQUIVO:** a letra `C` não é só "Configurações" — o nome completo do domínio já é "Configurações, Catálogos e Arquivo Base" (ver título acima e o "Índice Global de Letras" no topo deste documento). A regra que organiza isso: o catálogo/recurso compartilhado mora em `C`, e quem *usa* esse catálogo para algo específico ganha sua própria letra.
>
> Esse padrão se repete 3 vezes no projeto, sempre com a mesma lógica:
> | Catálogo / recurso base (mora em `C`) | Quem usa (mora na letra própria) |
> |---|---|
> | `tipo_link` — catálogo de tipos de link (Lattes, ORCID, LinkedIn...) | `link_academico`, `link_atualizacao`, `link_recompensa` → letra **F** (LINK) |
> | `arquivo` — tabela base de metadados de mídia (URL, MIME, tamanho) | `arquivo_atualizacao`, `arquivo_recompensa` → letra **G** (ARQUIVO) |
> | `motivo_denuncia` — catálogo de motivos de denúncia | `denuncia` (a denúncia em si) → letra **E** (CAMPANHA) |
>
> Ou seja, `arquivo` não está "esquecido" em `C` por engano: ele é a tabela-base genérica (qualquer mídia enviada ao sistema — incluindo a foto de perfil do usuário, `usuario.id_imagem_perfil`), e as tabelas que a *associam* a um contexto específico (atualização de campanha, recompensa) é que ganham letra própria em `G`. O mesmo raciocínio vale para `tipo_link`/`F` e `motivo_denuncia`/`E`.

---

### [01-D] USUÁRIO (Autenticação Própria, Segurança e Sessões)

* **`usuario`:** Tabela central de contas.
  * `senha_hash`: Campo obrigatório (`NOT NULL`) para armazenar o hash Bcrypt/Argon2.
  * **Proteção Anti-Brute-Force:** As colunas `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em` e `ultimo_login_ip` controlam o bloqueio temporário de conta após falhas sucessivas de login.
  * **Verificação de E-mail:** `email_verificado` é uma flag independente — indica se o usuário confirmou o e-mail, não tem relação com bloqueio por tentativas de login.
* **`usuario_papel`:** Relacionamento N:N entre usuários e papéis. Localizada fisicamente neste bloco por depender de `usuario`, mas documentada conceitualmente sob o domínio de RBAC.
* **`perfil_pesquisador`:** Dados acadêmicos do pesquisador. O campo `score_atual` é mantido como inteiro para otimizar leituras e atualizações do algoritmo de pontuação. 🗑️ **Coluna `suspenso BOOLEAN` removida (27-07-2026):** duplicava o mesmo estado que `status_pesquisador ENUM` já representa, e só o segundo era de fato lido em algum lugar do banco — removida de `01` (tabela), `06` (grant de coluna) e `07` (seed).
  * 🗑️➡️✅ **`tipo_vinculo` — ADICIONADO (28-07-2026), preservando a regra da Alexia sem excluir o pesquisador independente:** `vinculo_institucional NOT NULL` implementava corretamente "perfil não nasce incompleto", mas como efeito colateral impedia a existência de pesquisador sem instituição — justamente o público que a Etapa 1 diz que a plataforma quer alcançar. Solução: ENUM `tipo_vinculo` (`'institucional'` / `'independente'`, `DEFAULT 'institucional'`); `vinculo_institucional` voltou a ser nullable, mas amarrado pela `CONSTRAINT "CK_PERFIL_VINCULO"` — institucional exige o campo preenchido e não-vazio, independente exige o campo `NULL`. Nenhum dos dois estados aceita ambiguidade (continua proibido cadastrar sem declarar nada) — é mais rigoroso que a versão anterior, não menos: "sem instituição" vira um fato declarado e filtrável, em vez de um campo em branco de significado ambíguo. Os 11 perfis do seed continuam válidos sem nenhum ajuste (`tipo_vinculo = 'institucional'` via `DEFAULT`). ⚠️ **Efeito no score, não decidido ainda:** `calcular_score_perfil_academico` (`05`) dá pontos por `vinculo_institucional` preenchido — um pesquisador independente perde esses pontos automaticamente; está amarrado à decisão de escopo do score (Lista C, itens 12/13, em `PENDENCIAS e correcoes.md`).
* **`termos_de_uso` e `usuario_termo`:** Controle de versionamento de termos (LGPD). Guarda a trilha de auditoria (IPv4/IPv6 e timestamp de aceite).
* **`notificacao`:** Fila/Histórico de envios de e-mail. Armazena o snapshot do e-mail do destinatário, contagem de tentativas e o texto do último erro retornado para depuração.
* **`verificacao_email` e `recuperacao_senha`:** Gerenciamento de tokens curtos e temporários para confirmação de conta e redefinição de senha.
  * **Índice Parcial:** O índice `ux_recuperacao_senha_ativo_por_usuario` garante que exista apenas um token de recuperação ativo por usuário de cada vez.
* **`sessao`:** Persistência de *Refresh Tokens* hashed. Necessária para permitir o logout seguro, revogação de sessões e controle de múltiplos dispositivos em arquiteturas JWT *stateless*.

---

### [01-E] CAMPANHA (Campanhas, Moderação e Recompensas)

* **`campanha`:** Tabela principal de projetos de financiamento.
  * `CK_CAMPANHA_PRAZO`: Constraint que valida a duração da campanha entre 15 e 90 dias.
  * 🗑️➡️✅ **`id_area_conhecimento` virou `NOT NULL` (28-07-2026):** a trigger de nível 2 (`[05-K-1]`) já bloqueava apontar pra grande área raiz, mas deixava `NULL` passar — uma campanha podia ficar sem nenhuma área, o que a escondia de qualquer filtro (pior do que aparecer só na grande área). Fecha a decisão de "nível 2 obrigatório" já tomada; as 10 campanhas do seed já cumpriam antes da mudança.
  * 🗑️➡️✅ **`encerrado_em TIMESTAMP` — coluna nova (27-07-2026):** nullable, sem valor padrão, **não** é congelada por `fn_congela_regras_campanha()` (é justamente o campo que precisa poder ser preenchido no momento do encerramento). Registra a data real de encerramento (natural, antecipado via RF-042 ou por moderação) — algo que `data_fim` deixou de conseguir representar depois de virar uma promessa congelada (ver `[05-K-2]`). Ainda não existe trigger que preencha essa coluna sozinha; quem grava o valor, por enquanto, é quem faz o `UPDATE` de status.
* **`atualizacao_campanha`:** Postagens de acompanhamento do projeto. O campo `ativo` permite o *soft delete* e a ocultação por moderação sem perda do histórico.
* **`comentario`:** Interações da comunidade.
  * Unicidade: `UNIQUE (id_campanha, id_pesquisador)` restringe a **um comentário por pesquisador por campanha, para sempre** — a constraint não é condicionada por `ativo`. Ou seja, se o comentário for ocultado por moderação (`ativo = FALSE`), o pesquisador não consegue enviar um comentário novo para aquela campanha; ele só pode reeditar o registro já existente.
  * `CK_COMENTARIO_ENDOSSO`: Constraint garante coerência matemática entre o booleano `endossado` e a sua ordem de exibição (`ordem_endosso`).
  * A policy `pol_comentario_update` (`04_rls_policies.sql`) libera `UPDATE` para o próprio autor sem restringir quais colunas podem mudar — isso já permitiu, no passado, que o autor revertesse sozinho uma moderação (`ativo = FALSE → TRUE`). Já corrigido por trigger; ver `[04-E-4]` mais abaixo para o histórico completo.
* **`denuncia`:** Registro de incidentes apontados por usuários, vinculados a um motivo do catálogo.
  * 🗑️➡️✅ **`CK_DENUNCIA_ALVO_XOR` — constraint nova (27-07-2026):** antes, nada impedia os dois alvos (`id_campanha_alvo`/`id_pesquisador_alvo`) preenchidos ao mesmo tempo, ou os dois nulos. A constraint exige exatamente um dos dois preenchido. Trabalha em conjunto com a trigger `trg_denuncia_valida_tipo_motivo` (`05`, ver `[05-K-1]`), que garante que o motivo escolhido bate com o alvo.
  * 🗑️➡️✅ **`FK_DENUNCIA_CAMPANHA_ALVO` / `FK_DENUNCIA_PESQUISADOR_ALVO`: `ON DELETE SET NULL` → `ON DELETE RESTRICT` (27-07-2026):** um registro de moderação virar órfão sozinho (o alvo apagado e a denúncia continuando sem saber apontar pra nada) não é o comportamento correto pra um dado de auditoria; `RESTRICT` impede a exclusão do alvo enquanto a denúncia existir. Não muda nada na prática hoje, já que nem `campanha` nem `usuario` têm policy de `DELETE`.
* **`recompensa`:** Recompensas oferecidas pelos pesquisadores. Possui validações para garantir `valor_minimo > 0` e quantidade disponível não negativa. 🗑️➡️✅ **ENUM `tipo_recompensa` restringido a recompensa simbólica — CORRIGIDO (28-07-2026):** os valores `fisica` e `outro` foram removidos, sobrando só `digital`, `reconhecimento` e `acesso_antecipado`. Recompensa física cria obrigação de entrega/logística que uma plataforma tocada por 2 pessoas não tem como fiscalizar (motivo original da dúvida sobre manter o domínio inteiro, ver Lista C, item 14, em `PENDENCIAS e correcoes.md`); os 3 valores que sobraram não têm frete, prazo de envio nem disputa de "não recebi" — `reconhecimento` é o pedido da parceira de TCC (nome do doador exibido no projeto), `acesso_antecipado` é o modelo do próprio Experiment.com (referência declarada do projeto). A coluna `tipo` também perdeu o `DEFAULT 'outro'` — nenhum dos 3 valores restantes é um "genérico" natural, a aplicação passa a escolher explicitamente. Feito com a tabela `recompensa` vazia no seed (nenhum dado existente pra migrar) — o Postgres não tem `ALTER TYPE ... DROP VALUE`, então mudar o ENUM contra um banco já populado exigiria recriar o tipo e converter a coluna; vazio, é só editar a definição.

---

### [01-F] LINK (Tabelas de Associação de Links)

* **`link_academico`, `link_atualizacao` e `link_recompensa`:** Reutilizam o catálogo `tipo_link` para associar URLs externas a perfis de pesquisadores, atualizações de campanha e recompensas digitais.

---

### [01-G] ARQUIVO (Tabelas de Associação de Mídias)

* **`arquivo_atualizacao` e `arquivo_recompensa`:** Estabelecem o vinculo N:N entre a tabela base `arquivo` e as entidades de atualização/recompensa.

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

* **`score_config`, `score_rotulo` e `score_pesquisador`:** Estrutura para gamificação e aferição de reputação dos pesquisadores na plataforma.
* **Integridade de Score:** A tabela `score_pesquisador` possui a constraint `UK_SCORE_PESQUISADOR_USUARIO_SCORE_CONFIG` para impedir duplicidade de pontuação para o mesmo parâmetro e usuário.
* **Bloco `DO $$`:** Mantido ao final da tabela como verificação defensiva de legado para validar a existência da constraint de unicidade.

---

## 02. ÍNDICES (`02_indices.sql`)

### Visão Geral de Performance

O script de índices organiza a aceleração de buscas no PostgreSQL e acompanha rigorosamente a ordem dos blocos conceituais do arquivo `01_extensoes_enums_tabelas.sql`. 

> 📌 **Nota de Arquitetura (RBAC e CONFIG):** As tabelas dos blocos `[02-B] RBAC` e `[02-C] CONFIG` não possuem instruções `CREATE INDEX` explícitas neste arquivo porque suas consultas principais já são atendidas pelos índices automáticos criados nativamente pelo PostgreSQL para as chaves primárias (`PRIMARY KEY`) e de unicidade (`UNIQUE`), como `chave` em `configuracoes` e `codigo_cnpq` em `area_conhecimento`.

Os índices explícitos criados neste script foram projetados para três cenários estratégicos:
1. **Chaves Estrangeiras (FKs):** Aceleração de `JOINs` em tabelas filhas para evitar leituras lentas (*sequential scans*).
2. **Caminhos Quentes (*Hot Paths*):** Otimização de fluxos críticos da aplicação, como verificação de tokens, renovação de sessões e filas de background.
3. **Regras de Negócio via Índices Parciais (`UNIQUE ... WHERE`):** Aplicação de restrições de unicidade condicional diretamente no banco de dados.

---

### [02-D] USUÁRIO

* **Rede de Pesquisadores:** `idx_seguir_pesquisador_alvo` acelera a consulta de quem segue um pesquisador (a ponta `id_usuario` já é coberta pelo índice automático do `UK_SEGUIR_PESQUISADOR_USUARIO_PESQUISADOR`, ver `[02-I]` mais abaixo para o mesmo raciocínio aplicado a `score_pesquisador`).
* **Termo Vigente Único (`uq_termos_uso_ativo`):** Índice parcial `UNIQUE` que assegura no banco a existência de no máximo uma versão ativa de termos de uso por vez (`WHERE ativo = TRUE`).
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
* **Imagem Principal da Recompensa (`uq_arquivo_recompensa_principal`):** Índice parcial `UNIQUE` que assegura que cada recompensa possua no máximo uma mídia marcada como principal (`WHERE principal = TRUE`).

---

### [02-H] CONTRIBUIÇÃO

* **Apoios e Painéis Financeiros:** Índices nas tabelas `contribuicao` (por campanha e usuário), `contribuicao_recompensa` e `aceite_termo_contribuicao` para agilizar a montagem do histórico de doações.

---

### [02-I] SCORE

* **Hierarquia:** `idx_score_config_pai` otimiza a montagem das árvores de critérios de pontuação. `score_pesquisador` não tem índice próprio por `id_usuario` porque a `UK_SCORE_PESQUISADOR_USUARIO_SCORE_CONFIG` (`01`) já cria um índice automático cobrindo essa busca (mesma lógica do `idx_seguir_pesquisador_usuario` removido em `[02-D]`).

---

## 03. FUNÇÕES HELPER DE SEGURANÇA (`03_funcoes_seguranca.sql`)

### Visão Geral de Arquitetura

As funções helper atuam como a ponte de contexto de segurança entre o backend NestJS e o mecanismo de RLS do PostgreSQL. Elas eliminam a dependência de frameworks externos (como Supabase Auth / `auth.uid()`) e viabilizam um modelo de autorização stateless nativo no banco de dados.

As três funções utilizam os modificadores de segurança essenciais:
* **`STABLE`:** Informa ao otimizador do PostgreSQL que a função não altera o banco e retorna o mesmo resultado dentro da mesma transação SQL.
* **`SECURITY DEFINER` + `SET search_path = public`:** Executa a função com privilégios do criador da função, blindando-a contra ataques de sequestro de caminho de busca (*search path hijacking*).

---

### [03-J] SEGURANÇA & CONTEXTO DE SESSÃO (`id_usuario_atual`)

* **Mecanismo de Transação:** O NestJS, ao autenticar o JWT e abrir uma transação com o PostgreSQL, executa o comando `SET LOCAL app.id_usuario_atual = '<id>'`.
* **Leitura Segura:** A função lê a variável customizada da sessão do PostgreSQL via `current_setting('app.id_usuario_atual', true)`.
* 🗑️➡️✅ **Tratamento de Nulos — CORRIGIDO (bug crítico, 27-07-2026):** o segundo argumento `true` de `current_setting()` só cobre o caso "variável nunca foi definida" (sessão anônima), retornando `NULL` nesse caso. Ele **não** cobre o caso "variável definida como string vazia `''`" — e `''::INT` lança uma exceção fatal (`invalid input syntax for type integer`), em vez de retornar `NULL`. Como `tem_permissao()` chama esta função por baixo e aparece em 89 das 105 policies de `04_rls_policies.sql`, uma única sessão anônima onde o NestJS interpola algo como `` `${usuario?.id ?? ''}` `` (em vez de simplesmente nunca setar a variável) derrubava **qualquer** consulta a qualquer tabela protegida — inclusive a listagem pública de campanhas, que nem exige login. A correção: `SELECT NULLIF(current_setting('app.id_usuario_atual', true), '')::INT;` — o `NULLIF` trata "não definida" e "definida vazia" como a mesma coisa (`NULL`) antes mesmo de tentar o `::INT`, então os dois casos agora se comportam de forma idêntica e segura.

---

### [03-D] VISIBILIDADE DE CONTA (`usuario_visivel`)

* **Por que existe:** `pol_usuario_select` (`04`) já escondia `usuario.deletado = TRUE` do resultado, mas `pol_perfil_select` e `pol_link_select` eram `USING (TRUE)` sem checar esse flag em nenhum momento — o perfil acadêmico e os links de uma conta "excluída" continuavam 100% públicos, mesmo com a conta marcada como deletada.
* **O que faz:** `usuario_visivel(p_id INT) RETURNS BOOLEAN` — nega a visibilidade se a conta estiver `deletado = TRUE`; se o `id_usuario` não existir (não deveria acontecer, a FK garante), o padrão é considerar invisível (`COALESCE(..., TRUE)` antes do `NOT`).
* **Onde é usada:** `pol_perfil_select` e `pol_link_select` (`04_rls_policies.sql`, `[04-D]`/`[04-F]`), no lugar do antigo `USING (TRUE)`. `pol_campanha_select` e `pol_score_select` ficam de fora de propósito, por decisão ainda em aberto — ver `PENDENCIAS e correcoes.md`, itens 17 e 31.
* **Mesmo padrão de `tem_permissao()`:** função pura, `STABLE`, `SECURITY DEFINER`, centralizando a checagem num único lugar — evita que a próxima policy pública nasça com o mesmo furo.

---

### [03-B] CONTROLE DE ACESSO GRANULAR (`tem_permissao`)

* **Autorização por Capacidade (*Capability-Based*):** Em vez de verificar nomes de papéis (como "admin" ou "pesquisador"), a função valida a existência de uma permissão específica (ex: `'campanha_aprovar'`).
* **Descolamento Múltiplo:** Permite alterar, renomear, dividir ou criar novos papéis na tabela `papel` sem a necessidade de alterar nenhuma política de RLS (`04_rls_policies.sql`) ou recriar funções no banco de dados.
* **Comportamento para Desconectados:** Caso `public.id_usuario_atual()` retorne `NULL` (usuário anônimo ou sessão sem token), o *subselect* falha na condição de igualdade e a função retorna `FALSE` de forma determinística.

---

## 04. ROW LEVEL SECURITY E POLÍTICAS DE ACESSO (`04_rls_policies.sql`)

### Visão Geral de Arquitetura

O arquivo `04_rls_policies.sql` estabelece a camada de defesa em nível de linha (*Row Level Security* — RLS) para o banco de dados. Todas as 39 tabelas do schema possuem RLS ativada e forçada.

#### Princípios Fundamentais de Segurança
1. **[04-A] Ativação Universal (`ENABLE` + `FORCE ROW LEVEL SECURITY`):**
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

**Detalhamento por policy:**
* **[04-C-1] `configuracoes`:** originalmente só existia policy de `SELECT` — nenhuma escrita era possível via RLS (nem para configuração de sistema, nem para preferência de usuário), e a permissão `configuracao_gerenciar` (já seedada) não era usada em lugar nenhum. As policies de `INSERT`/`UPDATE`/`DELETE` seguem o mesmo critério do `SELECT`: linha de sistema (`id_usuario IS NULL`) só quem tem `configuracao_gerenciar` mexe; linha de preferência do próprio usuário (`id_usuario` = dono) ele mesmo mexe.
* **[04-C-2] `area_conhecimento`:** as policies de escrita (`INSERT`/`UPDATE`) foram adicionadas para que a gestão de catálogos funcione corretamente junto com o `GRANT` de tabela já concedido em `06_grants.sql`.
* **[04-C-3] `motivo_denuncia`:** as policies de escrita foram adicionadas para completar a correção iniciada no `GRANT` de tabela e garantir que o fluxo de curadoria funcione com o RBAC esperado.

#### [04-D] USUÁRIO
* **Tabelas:** `usuario`, `perfil_pesquisador`, `usuario_papel`, `termos_de_uso`, `usuario_termo`, `notificacao`, `verificacao_email`, `recuperacao_senha`, `sessao`, `seguir_pesquisador`.
* **Regra:** Usuários enxergam apenas os próprios dados sensíveis ou perfis não deletados. A atribuição de papéis (`usuario_papel`) exige a permissão `'papel_atribuir'`.

**Detalhamento por policy:**
* **[04-D-1] `verificacao_email` / `recuperacao_senha` / `sessao`:** a versão anterior deixava RLS ligada e sem nenhuma policy, presumindo que só um role com `BYPASSRLS` (ex.: `service_role` do Supabase) acessaria estas tabelas. Esse role não existe mais no projeto — o NestJS conecta como `app_nestjs` (role normal, sem bypass), então RLS sem policy bloquearia 100% do acesso e quebraria verificação de e-mail, recuperação de senha e sessão inteiras. Além disso, boa parte desses fluxos acontece antes do usuário estar autenticado (confirmar e-mail, "esqueci minha senha") — não dá para restringir por `id_usuario_atual()`, porque ainda não existe sessão. Quem valida a posse do token (comparando o hash) é o próprio NestJS na aplicação; a policy `FOR ALL TO app_nestjs USING (true)` aqui só garante que nenhum outro role além de `app_nestjs` consegue tocar nessas tabelas.
* **[04-D-2] `usuario` (INSERT):** faltava a policy de `INSERT` em `usuario`. O fluxo de signup (`08_trigger_signup_usuario.sql`) já prevê o NestJS inserindo direto em `usuario` dentro da própria transação, antes de existir qualquer sessão — não há `id_usuario_atual()` para checar nesse momento, então `WITH CHECK (true)` é a única condição logicamente possível aqui. E-mail duplicado já é barrado pelo `UNIQUE` em `usuario.email` (`01`), e validação de formato/força de senha é responsabilidade do NestJS antes do `INSERT`.
* **[04-D-3] `perfil_pesquisador` (INSERT):** a policy de `INSERT` permite o fluxo de upgrade de usuário cadastrado para pesquisador. Sem ela, a RLS bloqueia a operação mesmo com o `GRANT` de tabela em `06_grants.sql`.
* **[04-D-4] `usuario_papel` (DELETE):** a policy de `DELETE` permite que o painel administrativo revogue papéis já atribuídos, sem depender de um bypass de RLS.
* 🗑️➡️✅ **[04-D-6] `perfil_pesquisador` (SELECT) — CORRIGIDO (27-07-2026):** `pol_perfil_select` era `USING (TRUE)`, sem checar `usuario.deletado` — o perfil acadêmico de uma conta excluída continuava 100% público. Passou a usar `public.usuario_visivel(id_usuario)` (`03`, ver `[03-D]`). `pol_campanha_select` e `pol_score_select` ficam de fora de propósito por enquanto — ver `PENDENCIAS e correcoes.md`, itens 17 e 31.
* **[04-D-5] `notificacao`:** 🗑️➡️✅ **CORRIGIDO (27-07-2026) — a primeira versão das policies de `INSERT`/`UPDATE` exigia `id_usuario = id_usuario_atual()`, inclusive pra criar.** Isso bloqueava toda notificação real do sistema, porque quem cria uma notificação nunca é o próprio destinatário (admin aprova campanha → avisa o pesquisador; sistema avisa quem doou) — e o *worker* de envio de e-mail, que roda sem usuário logado, também não conseguia ler a fila de pendentes. Ficou assim: `pol_notificacao_insert` é `WITH CHECK (true)`, `pol_notificacao_update` é `USING (true) WITH CHECK (true)` — mesmo padrão já usado em `verificacao_email`/`recuperacao_senha`/`sessao` (escrita liberada pro `app_nestjs`, controle de quem pode gravar o quê fica na aplicação). O `SELECT` continua restrito: dono da notificação, **ou** `usuario_visualizar_sensivel`, **ou** a permissão nova `notificacao_processar` (ver nota abaixo).
* 🗑️➡️✅ **`pol_notificacao_select` ganhou uma terceira condição — permissão `notificacao_processar` (27-07-2026):** antes, o *worker* de e-mail (que precisa ler a fila de notificações pendentes pra enviar) só tinha `usuario_visualizar_sensivel` como caminho de acesso — uma permissão cujo nome não tem nenhuma relação semântica com "processar fila de notificação", criando um acoplamento estranho e confuso de manter. Permissão nova `notificacao_processar` (seedada em `07`, atribuída ao papel `admin`) virou mais uma opção no `OR` da policy, ao lado das duas condições que já existiam — nada que já funcionava foi removido.

#### [04-E] CAMPANHA
* **Tabelas:** `campanha`, `atualizacao_campanha`, `comentario`, `denuncia`, `recompensa`, `seguir_campanha`, `solicitacao_encerramento`, `historico_rejeicao`, `repasse`.
* **Regra:** Campanhas visíveis publicamente apenas em status liberados (`ativo`, `sucesso`, `nao_atingido`, `encerrado`). Moderações e edições dependem de ser dono do recurso ou possuir permissões específicas (`'campanha_editar'`, `'campanha_aprovar'`, `'campanha_rejeitar'`, `'comentario_moderar'`).

> ⚠️ **Notas de Arquitetura & Débitos Técnicos ([04-E]):**
> * **Tabela `repasse`:** As políticas `pol_repasse_insert` e `pol_repasse_update` utilizam `WITH CHECK (true)` / `USING (true)`. A validação de quem pode gerar ou alterar um repasse é delegada integralmente ao backend NestJS.

> 🗑️ **Permissão `campanha_encerrar` removida (era órfã).**
> - **Como era:** a permissão `campanha_encerrar` existia na seed (`07_seed_dados.sql`, era atribuída ao papel `admin`), mas nenhuma policy de RLS neste arquivo (`04`) a usava para liberar nada. Ela não fazia absolutamente nada na prática — não existia nenhum caminho de código que checasse essa permissão.
> - **Por que existia:** o encerramento de campanha antes do prazo já é resolvido por um fluxo próprio e mais completo — `solicitacao_encerramento` (pesquisador solicita, admin decide, com justificativa registrada em `historico_rejeicao`/`solicitacao_encerramento`, permissão `solicitacao_encerramento_decidir`). `campanha_encerrar` parece ter sido pensada como um atalho: um `UPDATE campanha SET status = 'encerrado'` direto, sem passar pela solicitação formal, mas esse atalho nunca chegou a ser implementado em nenhuma policy.
> - **Por que foi removida, e não implementada:** plataformas de crowdfunding de referência (Catarse, Experiment) não oferecem um "encerramento forçado sem justificativa" para administradores — encerrar uma campanha antes do prazo sempre passa por um motivo registrado, porque envolve dinheiro de apoiadores e precisa ser auditável. Criar o atalho enfraqueceria exatamente o rastro de auditoria que o fluxo `solicitacao_encerramento` já garante. Como a permissão nunca foi usada em nenhuma policy, removê-la não muda nenhum comportamento do sistema — só limpa uma permissão morta que não levava a lugar nenhum.
> - **O que muda daqui pra frente:** o único caminho para encerrar uma campanha antes do prazo natural é o fluxo formal via `solicitacao_encerramento` + `solicitacao_encerramento_decidir`. Não existe mais (e nunca existiu de fato) um encerramento direto por admin.
> - **Onde foi removida:** `07_seed_dados.sql`, bloco `[07-B-2]` (linha da `INSERT INTO permissao`) e bloco `[07-B-3]` (linha `('admin', 'campanha_encerrar')` da `INSERT INTO papel_permissao`). Ver também `[07-B-2]` mais abaixo neste documento.

**Detalhamento por policy:**
* **[04-E-1] `campanha` (UPDATE):** `campanha_aprovar` e `campanha_rejeitar` estavam seedadas mas não eram usadas em nenhuma policy — só `campanha_editar` liberava `UPDATE` em `campanha`, então um papel com só "aprovar" ou só "rejeitar" (sem o "editar" genérico) não conseguia de fato aprovar/rejeitar nada. A RLS de linha não distingue qual coluna está sendo alterada (isso exigiria um trigger comparando `OLD`/`NEW`), então na prática qualquer uma das três permissões libera o `UPDATE` — a aplicação decide, por regra de negócio, quais campos cada fluxo (aprovar/rejeitar/editar) de fato manda alterar.
* **[04-E-2] `atualizacao_campanha` (UPDATE):** o dono da campanha continua podendo editar o conteúdo da própria atualização; ocultar (moderar) uma atualização de terceiro passa a exigir a permissão específica `atualizacao_moderar`, em vez do antigo `eh_admin()` genérico (`eh_admin()` foi removido de vez de todas as policies — ver `03_funcoes_seguranca.sql`).
* **[04-E-3] `comentario` (SELECT):** comentários não endossados deixaram de ser públicos — só o autor, o dono da campanha ou quem tem `comentario_moderar` podem ver o que não está endossado; comentários endossados continuam públicos. Comentário inativo (removido por moderação) só continua visível para o próprio autor, o dono da campanha ou moderação.
* **[04-E-4] `comentario` (UPDATE) — histórico do bug de endosso:** o soft delete de comentário permite que o autor desative o próprio comentário, e que moderação/admin desativem qualquer um. Só que "endossar comentário" (setar `endossado`/`ordem_endosso`) nunca teve policy de `UPDATE` que cobrisse essa ação — não existia nenhuma policy de `UPDATE` em `comentario` antes disso, e a primeira versão do `UPDATE` (criada junto com o soft delete) só liberava o próprio autor ou moderação, nunca o dono da campanha. Como só quem endossa é o dono da campanha, sobre um comentário de outra pessoa, sem essa condição o endosso continuava impossível na prática. A restrição de que o dono da campanha só deve mexer em `endossado`/`ordem_endosso` (e não no conteúdo do comentário) fica a cargo do endpoint específico de endosso no NestJS, não da RLS.

> 🗑️➡️✅ **[04-E-4] Correção adicional — autor conseguia reverter a própria moderação (Achado 4).**
> - **Como era:** `pol_comentario_update` libera `UPDATE` para o próprio autor (`id_pesquisador = id_usuario_atual()`) na linha inteira, sem restringir qual coluna pode mudar — isso é uma limitação da RLS em si (RLS de linha nunca sabe distinguir *qual coluna* está sendo alterada, só *quem* está alterando; o mesmo já acontecia em `[04-E-1]` para `campanha_aprovar`/`campanha_rejeitar`). Na prática, isso significava que um comentário ocultado por moderação (`ativo = FALSE`) podia ser reativado pelo próprio autor com um simples `UPDATE comentario SET ativo = TRUE WHERE id_comentario = ...` — a moderação virava decorativa, porque quem foi moderado conseguia desfazer a moderação sozinho.
> - **Por que a RLS sozinha não resolve:** dar à RLS o poder de saber "essa coluna específica só pode mudar por certas mãos" exigiria reescrever a policy pra checar coluna por coluna dentro do `USING`/`WITH CHECK`, o que o Postgres não faz de forma nativa — o jeito correto é uma trigger, que compara `OLD` com `NEW` antes de aceitar o `UPDATE`.
> - **Como ficou:** nova função `fn_bloqueia_reversao_moderacao_comentario()` + trigger `trg_comentario_bloqueia_reversao_moderacao` (`BEFORE UPDATE`, `05_regras_negocio.sql`, bloco `[05-K-3]` — ver detalhamento na seção 05 deste documento). A regra é cirúrgica: só bloqueia a transição específica `ativo: FALSE → TRUE` quando quem está alterando não tem a permissão `comentario_moderar`. Todo o resto continua exatamente igual a antes:
>   - O autor continua podendo editar o texto do próprio comentário livremente.
>   - O autor continua podendo ocultar (`ativo: TRUE → FALSE`) o próprio comentário — isso nunca foi o problema, e continua liberado.
>   - Quem tem `comentario_moderar` (moderador/admin) continua podendo reverter (`FALSE → TRUE`) normalmente — a trigger só barra quem **não** tem essa permissão.
> - **Por que essa opção e não um fluxo de "recurso":** plataformas de referência (Catarse, Experiment) não dão ao autor um botão de "desfazer moderação" — qualquer contestação acontece fora do sistema (suporte/e-mail), não como feature codificada. Manter o escopo pequeno aqui é a escolha certa para o estágio atual do projeto; um fluxo de recurso formal (autor pede revisão, moderador decide) pode virar uma feature nova no futuro, se um dia for necessário — mas isso é adição de funcionalidade, não correção de bug.
* **[04-E-5] `seguir_campanha` (DELETE):** faltava a policy de `DELETE` — sem ela, "deixar de seguir campanha" (RF-009) ficava bloqueado pela RLS, mesmo já existindo o equivalente para `seguir_pesquisador` (`pol_seg_pesq_delete`).
* **[04-E-6] `historico_rejeicao`:** as policies de escrita foram adicionadas para permitir o registro de rejeições de campanha pelo fluxo de moderação. 🗑️➡️✅ **`pol_historicorej_select` — CORRIGIDO (27-07-2026):** só liberava quem tem `campanha_rejeitar`, diferente das duas tabelas irmãs (`solicitacao_encerramento`, `repasse`), que corretamente liberam também o dono da campanha via `EXISTS (... id_usuario = id_usuario_atual())`. Sem isso, o dono de uma campanha rejeitada não conseguia ver o motivo pela própria plataforma (RF-070 prevê editar e reenviar) — dependia só do e-mail (RF-071). Acrescentado o mesmo `OR EXISTS (...)` que as tabelas irmãs já usavam.
* **[04-E-7] `repasse`:** as policies de escrita foram adicionadas porque esse fluxo é gerado pelo backend a partir da consolidação financeira da campanha — sem elas, a RLS bloqueia a criação e atualização do registro mesmo com o `GRANT` de tabela correto (ver nota de débito técnico acima).
* 🗑️➡️✅ **[04-E-8] `campanha` / `atualizacao_campanha` (INSERT) — pesquisador suspenso passa a ser barrado — CORRIGIDO (27-07-2026):** `pol_comentario_insert` já checava `status_pesquisador = 'ativo'` antes de liberar `INSERT`, mas `pol_campanha_insert` e `pol_atualizacao_insert` não tinham essa mesma checagem — um pesquisador suspenso ainda conseguia criar campanha nova ou publicar atualização. As duas policies passaram a exigir `EXISTS (SELECT 1 FROM perfil_pesquisador WHERE id_usuario = public.id_usuario_atual() AND status_pesquisador = 'ativo')`, replicando o padrão que já existia só em `comentario`. Como o seed roda como superusuário (*bypassa* RLS) e todos os 7 pesquisadores seedados já são `'ativo'`, nada mudou na carga do `07`.

#### [04-F] LINK
* **Tabelas:** `link_academico`, `link_atualizacao`, `link_recompensa`.
* **Regra:** Links de perfil e campanhas podem ser criados, editados ou removidos pelo próprio autor/pesquisador ou por usuários com papéis moderadores.

**Detalhamento por policy:**
* 🗑️➡️✅ **[04-F-2] `link_academico` (SELECT) — CORRIGIDO (27-07-2026):** mesmo problema e mesma correção do `[04-D-6]` — `pol_link_select` era `USING (TRUE)`, sem checar `usuario.deletado`. Passou a usar `public.usuario_visivel(id_usuario)` (`03`, ver `[03-D]`).
* **[04-F-1] `link_recompensa` (UPDATE) — assimetria proposital:** edição e remoção de link de recompensa são restritas ao dono da campanha ou a quem tem `campanha_editar` — de propósito sem o comprador aqui, diferente do `SELECT` (onde o comprador pode ler). O link é fornecido pelo pesquisador para entrega da recompensa, então só quem fornece pode alterá-lo ou removê-lo; o comprador só pode ler.

#### [04-G] ARQUIVO
* **Tabelas:** `arquivo_atualizacao`, `arquivo_recompensa`.
* **Regra:** O vínculo de arquivos de mídia a atualizações e recompensas é restrito aos proprietários da campanha vinculada ou administradores.

**Detalhamento por policy:**
* **[04-G-1] `arquivo_recompensa` (UPDATE):** a policy de `UPDATE` permite trocar a imagem principal da recompensa quando a campanha for editada.

#### [04-H] CONTRIBUIÇÃO
* **Tabelas:** `contribuicao`, `auditoria_financeira`, `contribuicao_recompensa`, `aceite_termo_contribuicao`.
* **Regra:** Suporte a doações anônimas via validação do `app.token_sessao_atual`. Usuários autenticados visualizam apenas o seu próprio histórico financeiro ou via permissão `'contribuicao_visualizar_sensivel'`.

> ⚠️ **Nota de Arquitetura & Débito Técnico ([04-H]):**
> * **Tabela `auditoria_financeira`:** As políticas `pol_auditoria_insert` e `pol_auditoria_update` estão abertas para o papel `app_nestjs` (`USING (true) WITH CHECK (true)`), deixando a integridade da escrita sob responsabilidade do serviço de backend.

**Detalhamento por policy:**
* **[04-H-1] `auditoria_financeira`:** as policies de escrita foram adicionadas para permitir o registro de eventos financeiros e auditoria do fluxo de contribuição (ver nota de débito técnico acima).
* 🗑️➡️✅ **[04-H-2] `aceite_termo_contribuicao` (SELECT) — CORRIGIDO (28-07-2026):** a policy de `INSERT` já aceitava `c.id_usuario IS NULL` (doador anônimo registrando o aceite dos termos), mas a de `SELECT` só liberava `c.id_usuario = id_usuario_atual()` — um doador anônimo conseguia criar o próprio registro de aceite e nunca mais conseguia relê-lo, mesmo já enxergando a própria contribuição via `pol_contribuicao_anon_select`. Corrigido replicando o mesmo ramo de `token_sessao` que essa policy irmã já usa.

#### [04-I] SCORE
* **Tabelas:** `score_config`, `score_rotulo`, `score_pesquisador`.
* **Regra:** Leitura pública dos scores e parâmetros. Alterações em matrizes e rótulos de score são restritas à permissão `'score_editar'`.

**Detalhamento por policy:**
* **[04-I-1] `score_config` (INSERT):** a policy de `INSERT` permite que o painel administrativo crie novas dimensões de score sem depender de uma regra de bypass da RLS.
* **[04-I-2] `score_rotulo` (INSERT):** a policy de `INSERT` permite a criação de novos rótulos de score pelo fluxo administrativo, com a permissão certa.

---

## 05. MOTOR DE SCORE + REGRAS DE NEGÓCIO (`05_regras_negocio.sql`)

### Visão Geral

Este é o arquivo mais denso do banco: 31 funções e 29 triggers, organizados em 7 blocos que usam duas letras do índice global — `I` (SCORE, blocos `[05-I-1]` a `[05-I-4]`) e `K` (Regras de Negócio Transversais, blocos `[05-K-1]` a `[05-K-3]`), ver "Índice Global de Letras" no topo deste documento. Ele concentra toda regra que um `CHECK` simples não alcança — porque depende de consultar outra tabela (ex.: será que essa campanha está ativa?) ou de recalcular algo automaticamente quando um dado relacionado muda.

> 📌 **Por que o motor de score existe:** antes deste arquivo, `perfil_pesquisador.score_atual` e `score_pesquisador.pontos_obtidos` eram só valores fixos digitados no seed — nada calculava o score de verdade a partir de campanhas, denúncias, links acadêmicos ou do perfil. A tela de detalhes de pontuação no front lia campos que nem existiam no tipo real de dimensões de score, e a conta virava `NaN`. A solução foi mover o cálculo inteiro para dentro do banco, com o resultado guardado em cache (`perfil_pesquisador.score_atual` e `score_pesquisador`) e atualizado sozinho via trigger sempre que um dado relevante muda — funciona para qualquer registro novo, sem que o backend precise lembrar de chamar nada. Todos os pesos vêm de `score_config.peso` (nenhum número fixo no código): editar o peso no Painel Admin já recalcula o score de todo mundo.

---

### [05-I-1] Score — Helpers e Utilitários

* **`config_numero(p_chave, p_padrao)`:** lê uma constante numérica de `configuracoes` com fallback seguro — nunca retorna `NULL`/erro mesmo que a chave ainda não exista, o que evitaria `NaN` se algum peso ou penalidade não estivesse cadastrado.

---

### [05-I-2] Score — Cálculo das Dimensões

Quatro funções puras (`STABLE`, sem efeito colateral), uma por dimensão do score. Todas recebem `p_id_usuario INT` e devolvem um `INTEGER` já limitado entre `0` e o peso-raiz da dimensão (`LEAST/GREATEST`).

| Função | Dimensão | Fórmula |
|---|---|---|
| `calcular_score_perfil_academico` | Perfil Acadêmico Declarado | Soma os pesos (de `score_config`, filhos de `'perfil_academico'`) de: link Lattes, link ORCID, outro link acadêmico (LinkedIn/ResearchGate/Academia/Scholar/site), vínculo institucional preenchido e título acadêmico informado. |
| `calcular_score_historico` | Histórico na Plataforma | `conclusao = (concluídas com sucesso / total encerradas) × peso_conclusao`; `aprovacao = (aprovadas pela moderação / total submetidas) × peso_aprovacao`; desconta `penalidade_abandono` por campanha `nao_atingido` que nunca teve solicitação de encerramento, e `penalidade_sem_justificativa` por campanha `nao_atingido` cuja solicitação não tem justificativa. |
| `calcular_score_atualizacao` | Atualização da Campanha | `regularidade = SUM(realizadas)/SUM(esperadas) × peso_regularidade`; `tempestividade = (% de campanhas em dia) × peso_tempestividade`. Só conta campanhas já iniciadas (`ativo`/`sucesso`/`nao_atingido`/`encerrado`); esperadas = duração em meses × `score_frequencia_esperada_mensal`. |
| `calcular_score_reputacao` | Reputação da Comunidade | `peso_raiz − (total de denúncias × custo) − (denúncias procedentes × custo_procedente)`. |

> ⚠️ **Não existe status "abandonada" no enum `status_campanha`.** `calcular_score_historico` deduz isso na consulta: campanha `nao_atingido` sem nenhuma `solicitacao_encerramento` conta como abandonada; campanha `nao_atingido` com solicitação mas sem `justificativa_pesquisador` preenchida conta como "sem justificativa". Essa dedução está comentada diretamente no corpo da função, junto às consultas que ela afeta.

> ⚠️ **`calcular_score_atualizacao` filtra por `atualizacao_campanha.ativo = TRUE`.** Sem esse filtro, uma atualização ocultada por moderação (soft delete) continuaria contando a favor da regularidade do pesquisador — foi uma correção aplicada depois da criação da coluna `ativo` em `01`.

---

### [05-I-3] Score — Orquestração e Cálculo Geral

* **`recalcular_score_pesquisador(p_id_usuario)`:** chama as 4 funções de `[05-I-2]`, soma o total, resolve o `id_rotulo` correspondente em `score_rotulo`, grava em `score_pesquisador` (via `UPSERT` — `ON CONFLICT (id_usuario, id_score_config) DO UPDATE`) e atualiza o cache em `perfil_pesquisador.score_atual`. É `SECURITY DEFINER` de propósito: precisa poder escrever no perfil de qualquer pesquisador (ex.: quando um admin resolve uma denúncia contra outra pessoa), não só de quem disparou a ação.
* **`recalcular_todos_os_scores()`:** roda `recalcular_score_pesquisador` para todo mundo. Usada pelo botão "Recalcular" do Painel Admin e disparada automaticamente quando um peso de `score_config` muda (ver `[05-I-4]`).

---

### [05-I-4] Score — Triggers e Funções de Automação

Cada trigger observa uma tabela que alimenta alguma dimensão do score e recalcula automaticamente quem foi afetado — ninguém no backend precisa lembrar de chamar `recalcular_score_pesquisador` manualmente.

| Tabela observada | Função de apoio | Trigger | Quem é recalculado |
|---|---|---|---|
| `campanha` | `trg_recalcular_por_campanha()` | `trg_campanha_recalcula_score` | o dono da campanha (`id_usuario`) |
| `denuncia` | `trg_recalcular_por_denuncia()` | `trg_denuncia_recalcula_score` | o pesquisador denunciado (`id_pesquisador_alvo`, se preenchido) |
| `atualizacao_campanha` | `trg_recalcular_por_atualizacao()` | `trg_atualizacao_recalcula_score` | o dono da campanha da atualização (busca via `id_campanha`) |
| `link_academico` | `trg_recalcular_por_link()` | `trg_link_recalcula_score` | o dono do link (`id_usuario`) |
| `perfil_pesquisador` (INSERT) | `trg_recalcular_por_perfil()` | `trg_perfil_recalcula_score` | o próprio perfil recém-criado |
| `perfil_pesquisador` (UPDATE) | `trg_recalcular_por_perfil()` | `trg_perfil_update_recalcula_score` | o próprio perfil, só quando `vinculo_institucional` ou `titulo_academico` mudam |
| `score_config` (UPDATE de `peso`) | `trg_recalcular_por_score_config()` | `trg_score_config_recalcula_todos` | **todos** os pesquisadores |

> 📌 **Por que `trg_perfil_update_recalcula_score` tem uma condição `WHEN`:** sem ela, o próprio `UPDATE` que o recálculo faz em `perfil_pesquisador.score_atual` disparia a trigger de novo — um loop infinito. A condição `WHEN (OLD.vinculo_institucional IS DISTINCT FROM NEW.vinculo_institucional OR OLD.titulo_academico IS DISTINCT FROM NEW.titulo_academico)` garante que só um UPDATE nos dados acadêmicos declarados (não no cache do score) dispare o recálculo.

---

### [05-K-1] Regras Transversais — Integridade e Escopo

| Tabela | Função | Trigger | Regra |
|---|---|---|---|
| `contribuicao_recompensa` | `trg_valida_contribuicao_recompensa()` | `trg_contrib_recompensa_valida` | A recompensa escolhida precisa pertencer à **mesma campanha** da contribuição (a FK sozinha não garante isso — só garante que o `id_recompensa` existe em algum lugar), e a soma reservada não pode ultrapassar `quantidade_disponivel`. |
| `link_academico` | `trg_valida_escopo_tipolink()` | `trg_link_academico_valida_tipo` | Só aceita `id_tipolink` com `permite_perfil = TRUE`. |
| `link_atualizacao` | `trg_valida_escopo_tipolink()` | `trg_link_atualizacao_valida_tipo` | Só aceita `id_tipolink` com `permite_atualizacao = TRUE`. |
| `link_recompensa` | `trg_valida_escopo_tipolink()` | `trg_link_recompensa_valida_tipo` | Só aceita `id_tipolink` com `permite_recompensa = TRUE`. |
| `campanha` | `fn_valida_area_conhecimento_nivel2()` | `trg_campanha_valida_area_nivel2` (`BEFORE INSERT`) + `trg_campanha_valida_area_nivel2_update` (`BEFORE UPDATE`, só quando `id_area_conhecimento` muda) | 🗑️➡️✅ **Nova (28-07-2026).** `area_conhecimento` ganhou hierarquia de 2 níveis (`id_pai`, ver `[01-C]`) — esta trigger bloqueia `campanha.id_area_conhecimento` de apontar pra uma grande área raiz (`id_pai IS NULL`); `NULL` continua permitido (a coluna é nullable), a trigger só entra em ação quando uma área é de fato informada. |
| `denuncia` | `trg_valida_tipo_motivo_denuncia()` | `trg_denuncia_valida_tipo_motivo` | 🗑️➡️✅ **Nova (27-07-2026).** `BEFORE INSERT OR UPDATE`: cruza `motivo_denuncia.tipo` com qual coluna de alvo foi preenchida (`id_campanha_alvo` ou `id_pesquisador_alvo`) — motivo de tipo "campanha" não pode ser usado numa denúncia contra pesquisador, e vice-versa. Trabalha em conjunto com a constraint `CK_DENUNCIA_ALVO_XOR` (`01`, ver `[01-E]`), que garante que exatamente um dos dois alvos está preenchido; esta trigger garante que o motivo escolhido bate com esse alvo. |

> 📌 **Uma função, três triggers:** `tipo_link` é compartilhado pelas 3 tabelas de link (`01-F`), então uma única função genérica (`trg_valida_escopo_tipolink`) resolve, via `TG_TABLE_NAME`, qual coluna booleana de `tipo_link` checar em cada caso — evita, por exemplo, associar "Currículo Lattes" (que só tem `permite_perfil = TRUE`) a uma recompensa.

---

### [05-K-2] Regras Transversais — Campanhas e Financeiro

| Tabela | Função | Trigger | Regra |
|---|---|---|---|
| `repasse` | `fn_valida_repasse_all_or_nothing()` | `trg_valida_repasse` | `BEFORE INSERT OR UPDATE`. Bloqueia repasse com `valor_liquido > 0` em campanha `all-or-nothing` que não atingiu a meta. Repasse "zerado" (RF-038, `valor_liquido = 0`, registrando que nada foi repassado) continua permitido. 🗑️➡️✅ **CORRIGIDO (27-07-2026):** a versão anterior comparava sempre contra `0`, então um `UPDATE` que só corrigia status/data de um repasse já concluído (ex.: reverter pra `'devolvido'` depois que a meta caiu por um reembolso) era bloqueado do mesmo jeito que um repasse novo indevido — mesmo sem estar liberando nenhum valor novo. Agora usa `TG_OP = 'UPDATE'` para só acessar `OLD.valor_liquido` quando faz sentido (no `INSERT`, `OLD` não existe) e compara `NEW.valor_liquido > COALESCE(v_valor_liquido_anterior, 0)` — só bloqueia quem tenta liberar **mais** dinheiro do que já tinha sido liberado antes. |
| `contribuicao` | `validar_contribuicao_all_or_nothing()` | `trg_contribuicao_all_or_nothing_pix` (`BEFORE INSERT`) + `trg_contribuicao_all_or_nothing_pix_update` (`BEFORE UPDATE`, nova em 27-07-2026) | Campanhas `all-or-nothing` só aceitam contribuição via PIX. 🗑️➡️✅ **A trigger de `UPDATE` é nova e tem uma cláusula `WHEN`:** a primeira tentativa de fechar essa regra também no `UPDATE` (ver `A3` no histórico de `PENDENCIAS e correcoes.md`) revalidava `meio_pagamento` em todo `UPDATE`, mesmo quando só o `status` mudava — travando pra sempre as contribuições não-PIX que já existiam em campanhas `all-or-nothing` (dado histórico do seed) e bloqueando o próprio webhook de confirmação de pagamento. A trigger nova só revalida quando `meio_pagamento` ou `id_campanha` de fato mudam (`WHEN (NEW.meio_pagamento IS DISTINCT FROM OLD.meio_pagamento OR NEW.id_campanha IS DISTINCT FROM OLD.id_campanha)`). |
| `campanha` | `fn_congela_regras_campanha()` | `trg_congela_regras_campanha` | A partir do status `ativo` em diante (inclusive `encerrado`/`encerrado_moderacao`), bloqueia `UPDATE` que altere `meta_financeira`, `modelo`, `taxa_plataforma`, `titulo`, `descricao`, `data_fim` **ou `data_inicio`** — proteção contra alterar as regras do jogo (ou reescrever o projeto/prazo) depois que a campanha já está no ar. 🗑️➡️✅ **`titulo`/`descricao`/`data_fim` e, depois, `data_inicio` foram adicionados em 27-07-2026** (trocar a descrição de um projeto já financiado, ou mexer no prazo, era o vetor de fraude mais óbvio que ainda não estava coberto — `data_inicio` entrou por último, depois de um teste real mostrar que dava pra mudar a duração da campanha só mexendo na data de início, já que só `data_fim` tinha sido congelado antes). Ver também a coluna nova `campanha.encerrado_em` (`[01-E]`), criada na mesma rodada para registrar a data real de encerramento — que `data_fim` (a promessa) deixou de conseguir fazer depois de congelada. |
| `contribuicao` | `fn_valida_contribuicao_campanha_ativa()` | `trg_valida_status_contribuicao` | Bloqueia nova contribuição se a campanha não estiver com status `ativo`, ou se o prazo (`data_fim`) já tiver passado. |
| `contribuicao` | `fn_sincroniza_arrecadado_campanha()` | `trg_sincroniza_arrecadado_campanha` | Recalcula `campanha.valor_bruto_arrecadado` somando as contribuições `confirmado`/`repassado`, a cada INSERT/UPDATE/DELETE em `contribuicao`. |
| `campanha` | `validar_limite_campanhas_pesquisador()` | `trg_campanha_limite_simultaneo` | Um pesquisador não pode ter mais de **2 campanhas simultâneas** em `aguardando_aprovacao` ou `ativo`. |
| `atualizacao_campanha` | `validar_atualizacao_campanha()` | `trg_atualizacao_campanha_status` | Só permite publicar atualização em campanha `ativo`, `sucesso` ou `nao_atingido`. |
| `solicitacao_encerramento` | `fn_valida_transicao_solicitacao()` | `trg_valida_transicao_solicitacao` | 🗑️➡️✅ **Nova (27-07-2026).** `BEFORE UPDATE`: quem não tem `solicitacao_encerramento_decidir` só pode fazer a transição `pendente → cancelado`, sem tocar em `id_admin`/`justificativa_pesquisador` — companheira da liberação de `pol_solicitacao_update` (`04`) pro dono da campanha cancelar a própria solicitação (antes, só o admin conseguia mexer nessa tabela via `UPDATE`; ver `[04-E]`). |

> ⚠️ **`trg_sincroniza_arrecadado_campanha` usa `SELECT ... FOR UPDATE` antes de somar.** Isso trava a linha da campanha durante o recálculo — sem essa trava, duas contribuições confirmadas ao mesmo tempo poderiam cada uma somar sem enxergar a outra ainda commitada, e a que "vence a corrida" por último sobrescreveria o total (uma contribuição confirmada "sumiria" do valor arrecadado). Esse comentário está preservado no corpo da função, por ser justamente o tipo de detalhe que importa entender antes de mexer nessa trigger.

---

### [05-K-3] Regras Transversais — Comunidade, Engajamento e RBAC

| Tabela | Função | Trigger | Regra |
|---|---|---|---|
| `comentario` | `fn_valida_comentario_campanha_ativa()` | `trg_valida_comentario_status` | Bloqueia novo comentário em campanha `rejeitado` ou `encerrado_moderacao`. |
| `comentario` | `validar_comentario_endosso()` | `trg_comentario_limite_endosso` | No máximo **4 endossos ativos** simultâneos por campanha (conta só `ordem_endosso IS NOT NULL AND ativo = TRUE` — um endosso removido por moderação libera a vaga). |
| `comentario` | `validar_comentario_autor()` | `trg_comentario_sem_autoria` | O dono da campanha não pode comentar na própria campanha (RF-066). |
| `comentario` | `fn_bloqueia_reversao_moderacao_comentario()` | `trg_comentario_bloqueia_reversao_moderacao` | Bloqueia a transição `ativo: FALSE → TRUE` (reverter uma moderação) por quem não tem a permissão `comentario_moderar`. Fecha a brecha em que `pol_comentario_update` (`04`) libera `UPDATE` para o autor sem restringir coluna — ver `[04-E-4]`. |
| `denuncia` | `validar_denuncia_frequencia()` | `trg_denuncia_limite_taxa` | No máximo **5 denúncias por usuário a cada 24 horas**. |
| `permissao` | `trg_admin_recebe_toda_permissao()` | `trg_permissao_auto_admin` | Toda permissão nova criada em `permissao` é automaticamente atribuída ao papel `admin` em `papel_permissao`. |

> 📌 **Por que `trg_permissao_auto_admin` existe:** é a rede de segurança da remoção do antigo `eh_admin()` das RLS policies (todas as policies do `04` passaram a checar `tem_permissao('x')` em vez de um bypass genérico de admin — ver `RBAC-pontos-discutidos.md`). Sem esta trigger, toda permissão nova criada exigiria lembrar de inserir manualmente a linha correspondente em `papel_permissao` para `'admin'` — e um esquecimento faria o admin perder acesso a algo que antes vinha de graça via `eh_admin()`. Com a trigger, toda permissão nova já nasce atribuída ao papel `admin` automaticamente.

---

### Idempotência

As 29 triggers deste arquivo têm `DROP TRIGGER IF EXISTS` imediatamente antes do `CREATE TRIGGER` correspondente — o arquivo pode ser reaplicado sozinho num banco de desenvolvimento já existente, sem precisar resetar tudo do zero (mesmo padrão já aplicado em `04_rls_policies.sql`).

---

## 06. GRANTS (`06_grants.sql`)

### Visão Geral

Este arquivo concede à role `app_nestjs` (criada em `01`) exatamente os privilégios que a RLS (`04`) pressupõe. RLS e GRANT são duas checagens **independentes** que o Postgres exige em conjunto: mesmo com uma policy liberando o acesso, se o GRANT de tabela/coluna não existir, a operação falha antes com `permission denied` — a policy nunca chega a ser avaliada. O arquivo segue a mesma ordem de blocos de domínio do `01`.

> 📌 **Por que os GRANTs ficam consolidados aqui:** antes, esses privilégios estavam espalhados — o bloco principal de schema/tabela/coluna vinha de um arquivo à parte de "artifícios", o GRANT nas sequências vinha do fim do arquivo de seed (como correção avulsa, provavelmente depois que alguém esbarrou no erro 42501 ao tentar inserir), e o GRANT `EXECUTE` das funções de score também vinha do arquivo de artifícios. Consolidado aqui, nenhum GRANT corre mais o risco de ficar esquecido num outro arquivo.

---

### [06-A] Geral (Schema e Sequências)

* **`GRANT USAGE ON SCHEMA public` e `GRANT SELECT ON ALL TABLES`:** acesso de base ao schema e leitura geral — depois refinada por `REVOKE`/GRANT de coluna nas tabelas sensíveis (`[06-D]`).
* **[06-A-1] `GRANT USAGE, SELECT ON ALL SEQUENCES`:** sem isso, `GRANT INSERT` sozinho não é suficiente — o Postgres não consegue gerar o próximo valor de uma coluna `SERIAL`/`IDENTITY` sem `USAGE` na sequência por trás dela (erro `42501`). Afeta toda tabela com `GRANT INSERT` neste arquivo; resolvido de uma vez para todas com um único `GRANT` sobre todas as sequências do schema.

---

### [06-B] RBAC

Nenhum GRANT adicional. `papel`, `permissao` e `papel_permissao` só têm policy de `SELECT` em `04_rls_policies.sql` (leitura pública), já coberta pelo `GRANT SELECT ON ALL TABLES` de `[06-A]`. A gestão dessas 3 tabelas acontece via seed/migração direta, não pela aplicação.

---

### [06-C] CONFIG

* **Tabelas:** `configuracoes` (INSERT/UPDATE/DELETE completos), `arquivo` (INSERT/UPDATE, sem `DELETE`), `area_conhecimento`, `motivo_denuncia` (INSERT/UPDATE), `tipo_link` (só INSERT/UPDATE).

**Detalhamento por grant:**
* 🗑️➡️✅ **[06-C-0] `arquivo` — `DELETE` removido — CORRIGIDO (27-07-2026):** nenhuma policy de RLS de `DELETE` existe pra essa tabela (só `configuracoes`, do mesmo bloco, tem policy de `DELETE` de verdade) — o `GRANT DELETE` que existia nunca funcionava, só dava a falsa impressão de que a operação era possível. Faz parte da limpeza mais ampla de 21 tabelas nesse mesmo estado — ver nota geral em `[06-D]`, mais abaixo, e `PENDENCIAS e correcoes.md`, item `A7`.
* **[06-C-1] `area_conhecimento` / `motivo_denuncia`:** receberam apenas os GRANTs mínimos necessários para que as policies de RLS funcionem na gestão de catálogos — princípio de privilégio mínimo, evitando permissões amplas desnecessárias.
* **[06-C-2] `tipo_link`:** ganhou `pol_tipolink_insert`/`pol_tipolink_update` em `04` (permissão `tipolink_gerenciar`), mas faltava o GRANT de tabela correspondente — sem ele, mesmo um curador/admin com a permissão certa recebia `permission denied for table tipo_link` antes de a RLS ser avaliada, e cadastrar um novo tipo de link (ex.: "TikTok") continuava impossível na prática (mesmo problema descrito em `RBAC-pontos-discutidos.md`, seção 6.3). Sem `DELETE` de propósito: `tipo_link` já tem coluna `ativo` para desativação lógica (soft delete via `UPDATE`), não precisa apagar linha.

---

### [06-D] USUÁRIO

* **Tabelas:** `usuario`, `perfil_pesquisador`, `termos_de_uso` (INSERT/UPDATE, sem `DELETE`); `usuario_termo` (só INSERT); `usuario_papel`, `seguir_pesquisador` (INSERT/DELETE, sem `UPDATE`); `notificacao` (INSERT/UPDATE); `verificacao_email`/`recuperacao_senha`/`sessao` (SELECT/INSERT/UPDATE).

**Detalhamento por grant:**
* **[06-D-1] `usuario` / `perfil_pesquisador` — SELECT geral revogado:** o acesso público a essas duas tabelas foi reduzido no nível de GRANT para evitar que `app_nestjs` tenha acesso indiscriminado a dados sensíveis antes mesmo da avaliação das policies de RLS.
* **[06-D-2] `usuario` — colunas de autenticação no GRANT de coluna:** faltavam as colunas usadas pelo próprio fluxo de login (`senha_hash`, `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em`, `ultimo_login_ip`). Sem elas, o GRANT de coluna barra o `SELECT` antes mesmo de a RLS ser avaliada, e o NestJS não consegue checar a senha no login nem aplicar a proteção contra brute-force. 🗑️➡️✅ **`email_verificado` — CORRIGIDO (27-07-2026):** a coluna existe desde `01`, mas nunca tinha entrado nessa lista — sem ela, o fluxo de verificação de e-mail não conseguia nem ler a própria flag. 🗑️ **`suspenso` removida da lista do GRANT de `perfil_pesquisador` (27-07-2026):** consequência direta da coluna ter sido removida da tabela em `01` — ver `[01-D]`. 🗑️➡️✅ **`cpf_criptografado` e `tipo_vinculo` adicionadas ao GRANT SELECT de `perfil_pesquisador` (28-07-2026):** o CPF é `NOT NULL` (Alexia) — o `app_nestjs` já era obrigado a gravá-lo, mas continuava sem conseguir lê-lo (coluna fora do `GRANT SELECT`), travando o KYC do RF-015 (a API de pagamento precisa desse dado pra configurar o recebimento do pesquisador). A proteção de acesso que de fato importa passa a ser a permissão `perfil_pesquisador_visualizar_sensivel` (já seedada, até então sem nenhum efeito) gateando a leitura no NestJS — não a coluna ficar inacessível pro próprio backend.
* 🗑️➡️✅ **[06-D-8] `DELETE`/`UPDATE` mortos removidos de vários GRANTs — CORRIGIDO (27-07-2026):** dois achados separados, mesmo padrão nos dois — um `GRANT` sem nenhuma policy de RLS correspondente pra aquela operação nunca funcionava de verdade, só dava a falsa impressão de que era possível. **`DELETE`** foi removido de 21 tabelas que não tinham policy de `DELETE` (mantido só onde a policy existe: `configuracoes`, `usuario_papel`, `seguir_pesquisador`, `seguir_campanha`, `link_academico`, `link_atualizacao`, `link_recompensa`) — neste bloco, isso tirou `DELETE` de `usuario`, `perfil_pesquisador` e `termos_de_uso`. **`UPDATE`** foi removido de 6 tabelas que não tinham policy de `UPDATE` — neste bloco, `usuario_termo` (registro de aceite de termo, não deveria ser editável depois de criado) e `usuario_papel`/`seguir_pesquisador` (só existe inserir/apagar essas relações, não faz sentido "editar"). Ver `PENDENCIAS e correcoes.md`, itens `A7` e `27`, pra contagem completa nos 8 arquivos e pra prova de que nada quebrou.
* **[06-D-3] `notificacao`:** ganhou `pol_notificacao_insert`/`pol_notificacao_update` em `04` (o backend passou a gravar notificação através do próprio `app_nestjs`, não mais via um role que ignorasse RLS), mas faltava o GRANT de tabela correspondente — sem os dois níveis juntos (RLS + GRANT), toda tentativa de `INSERT`/`UPDATE` falhava com `permission denied for table notificacao`, mesmo com a policy liberando.
* **[06-D-4] `verificacao_email` / `recuperacao_senha` / `sessao`:** têm policy real em `04` (`TO app_nestjs USING (true)`) e precisam do GRANT correspondente — RLS libera mas falta permissão de tabela, e vice-versa; os dois níveis são exigidos juntos pelo Postgres. 🗑️➡️✅ **`DELETE` concedido nas 3 — CORRIGIDO (28-07-2026, antigo item 28 do `PENDENCIAS`):** a policy das 3 já era `FOR ALL` (cobre `DELETE`), mas o `GRANT` só ia até `UPDATE` — sem isso, um token de recuperação de senha expirado nunca saía da tabela, e o índice parcial `ux_recuperacao_senha_ativo_por_usuario` (`02`, só 1 token não-usado por vez) bloqueava qualquer novo pedido de recuperação depois do primeiro expirar sem uso (testado e confirmado antes da correção). Dois usos previstos pra esse `DELETE`: (1) apagar o token de recuperação anterior no ato de um novo pedido, em vez de marcar `usado_em` à força (o que faria a coluna mentir sobre o que de fato aconteceu); (2) expurgo periódico por retenção (RNF-003 — dado pessoal só pelo tempo necessário; `sessao` guarda IP/user-agent) — sugestão de janela: 30 dias pra `verificacao_email`/`recuperacao_senha` após confirmado/usado/expirado, 90 dias pra `sessao` após revogado/expirado. Como as policies são `USING (true)`, o `DELETE` vale pra qualquer linha de qualquer usuário — o expurgo do NestJS precisa ser sempre uma consulta fixa com `WHERE` explícito em data, nunca um filtro dinâmico.

---

### [06-E] CAMPANHA

* **Tabelas:** `campanha`, `atualizacao_campanha`, `repasse`, `solicitacao_encerramento`, `historico_rejeicao`, `comentario`, `denuncia`, `recompensa` (INSERT/UPDATE, sem `DELETE`); `seguir_campanha` (INSERT/DELETE, sem `UPDATE`).
* 🗑️➡️✅ **`DELETE` removido das 8 primeiras — CORRIGIDO (27-07-2026):** nenhuma delas tem policy de `DELETE` em `04` — só `seguir_campanha` tem (`pol_seg_campanha_delete`, RF-009 "deixar de seguir"). `UPDATE` também não faz sentido pra `seguir_campanha` (só existe seguir/deixar de seguir), por isso ficou com `INSERT`/`DELETE` em vez de `INSERT`/`UPDATE`. Mesma limpeza geral do `A7`/`27` — ver `[06-D-8]`, mais acima, e `PENDENCIAS e correcoes.md`.

---

### [06-F] LINK

* **Tabelas:** `link_academico`, `link_atualizacao`, `link_recompensa` — INSERT/UPDATE/DELETE completos.

---

### [06-G] ARQUIVO

* **Tabelas:** `arquivo_atualizacao`, `arquivo_recompensa` — INSERT/UPDATE, sem `DELETE`. 🗑️➡️✅ **CORRIGIDO (27-07-2026):** nenhuma das duas tem policy de `DELETE` em `04` — mesma limpeza geral do `A7`, ver `[06-D-8]`.

---

### [06-H] CONTRIBUIÇÃO

* **Tabelas:** `contribuicao`, `auditoria_financeira` (INSERT/UPDATE, sem `DELETE`); `contribuicao_recompensa`, `aceite_termo_contribuicao` (só INSERT).
* 🗑️➡️✅ **CORRIGIDO (27-07-2026):** nenhuma das quatro tem policy de `DELETE` em `04` (mesma limpeza geral do `A7`, ver `[06-D-8]`). `contribuicao_recompensa`/`aceite_termo_contribuicao` também perderam `UPDATE` — os comentários do `04` já diziam que os dois são registro de auditoria/aquisição, não deveriam ser editáveis depois de criados (mesmo raciocínio do `27`).

---

### [06-I] SCORE

* **Tabelas:** `score_config`, `score_rotulo` — INSERT/UPDATE, sem `DELETE`. 🗑️➡️✅ **CORRIGIDO (27-07-2026):** nenhuma das duas tem policy de `DELETE` em `04` — mesma limpeza geral do `A7`, ver `[06-D-8]`.
* **`score_pesquisador` não recebe GRANT de tabela direto:** toda escrita passa pela função `recalcular_score_pesquisador()` (`SECURITY DEFINER`, ver `05_regras_negocio.sql`), que grava com os privilégios de quem criou a função, não com os de `app_nestjs`.

**Detalhamento por grant:**
* **[06-I-1] Funções do motor de score:** precisam de `GRANT EXECUTE` para que o app possa chamar `recalcular_todos_os_scores()` via RPC (botão "Recalcular" do Painel Admin) e `recalcular_score_pesquisador()`.

---

## 07. SEED DE DADOS (`07_seed_dados.sql`)

### Visão Geral

Povoa o banco com dados de demonstração/teste (mínimo 7 registros por tabela relevante). É o único arquivo em que a **ordem física não segue a ordem alfabética do índice global de letras** — ela segue estritamente a ordem de dependência de Foreign Key, porque aqui (diferente de `04`/`06`) a ordem das instruções importa de verdade: uma tabela filha só pode receber `INSERT` depois que a linha da tabela pai já existe.

> ⚠️ **Por que a ordem não é alfabética:** o exemplo mais claro é `configuracoes` (letra C). Duas das suas linhas de seed (`notificar_novas_campanhas`, `limite_denuncias_suspensao`) referenciam o usuário admin pelo `id_usuario`. Por isso o `INSERT` em `configuracoes` só pode rodar depois do `INSERT` em `usuario` (letra D) — o arquivo intercala C e D de propósito, e isso já estava correto antes desta reorganização. Reordenar cegamente para "C sempre antes de D" quebraria o script.

### Ordem de Execução (com a letra de cada bloco)

| Ordem física | Bloco | Letra | Marcador |
|---|---|---|---|
| 1 | `score_config` (dimensões + subitens) | SCORE | `[07-I-1]` |
| 2 | `score_rotulo` | SCORE | `[07-I-1]` |
| 3 | `papel` | RBAC | `[07-B-1]` |
| 4 | `permissao` | RBAC | `[07-B-2]` |
| 5 | `papel_permissao` | RBAC | `[07-B-3]` |
| 6 | `tipo_link` | CONFIG | `[07-C-1]` |
| 7 | `area_conhecimento` | CONFIG | `[07-C-2]` |
| 8 | `motivo_denuncia` | CONFIG | `[07-C-3]` |
| 9 | `arquivo` | CONFIG | `[07-C-4]` |
| 10 | `usuario` | USUÁRIO | `[07-D-1]` |
| 11 | `usuario_papel` | USUÁRIO | `[07-D-2]` |
| 12 | `configuracoes` (parâmetros de sistema + 2 preferências do admin) | CONFIG | `[07-C-5]` |
| 13 | `configuracoes` (constantes do motor de score) | SCORE¹ | `[07-I-2]` |
| 14 | `perfil_pesquisador` | USUÁRIO | `[07-D-3]` |
| 15 | `link_academico` | LINK | `[07-F-1]` |
| 16 | `campanha` | CAMPANHA | `[07-E-1]` |
| 17 | `seguir_campanha` | CAMPANHA | `[07-E-2]` |
| 18 | `seguir_pesquisador` | USUÁRIO | `[07-D-4]` |
| 19 | `contribuicao` | CONTRIBUIÇÃO | `[07-H-1]` |
| 20 | `auditoria_financeira` | CONTRIBUIÇÃO | `[07-H-2]` |
| 21 | `atualizacao_campanha` | CAMPANHA | `[07-E-3]` |
| 22 | `arquivo_atualizacao` | ARQUIVO | `[07-G-1]` |
| 23 | `repasse` | CAMPANHA | `[07-E-4]` |
| 24 | `solicitacao_encerramento` | CAMPANHA | `[07-E-5]` |
| 25 | `historico_rejeicao` | CAMPANHA | `[07-E-6]` |
| 26 | `comentario` | CAMPANHA | `[07-E-7]` |
| 27 | `denuncia` | CAMPANHA | `[07-E-8]` |
| — | Nota sobre como logar após o seed | USUÁRIO | `[07-D-5]` |
| 28 | Backfill (`recalcular_todos_os_scores()`) | SCORE | `[07-I-3]` |

¹ A *tabela* `configuracoes` é do domínio CONFIG (`01-C`), mas este bloco específico só contém constantes usadas pelo motor de cálculo de score — por isso foi arquivado sob a letra `I`, junto com o resto do que envolve pontuação. É a mesma tabela, mas o **conteúdo** desse bloco pertence a outro domínio; ver nota abaixo.

---

### Detalhamento (blocos com histórico ou decisão de design)

* **[07-I-1] `score_config` / `score_rotulo`:** este `INSERT` era originalmente um resquício de uma versão anterior do seed (o comentário antigo citava `AuthContext.tsx`, do fluxo de autenticação via Supabase que não existe mais) e duplicava parcialmente o `INSERT INTO papel` mais completo do bloco `[07-B-1]`. Os papéis `'admin'`, `'pesquisador'` e `'usuario'` continuam seedados só em `[07-B-1]`; aqui ficou só a inserção de verdade das dimensões e subitens de score.

* **[07-B-1] `papel`:** 7 papéis seedados de uma vez: `'admin'` (recebe automaticamente toda permissão nova via `trg_permissao_auto_admin`, ver `05_regras_negocio.sql`), `'pesquisador'` (usado pela regra de dono de campanha), `'usuario'` (papel padrão atribuído a todo novo cadastro por `atribuir_papel_padrao()`, ver `08_trigger_signup_usuario.sql`), e `'moderador'`/`'revisor'`/`'curador'`/`'suporte'` (RBAC granular via `papel_permissao`, ver `[07-B-3]`). `ON CONFLICT DO NOTHING` evita erro de duplicidade se o script rodar mais de uma vez; os IDs resultantes não são fixados em lugar nenhum — `papel_permissao` e `usuario_papel` sempre resolvem por nome. O papel `'apoiador'` foi removido deliberadamente: contribuir financeiramente não é uma ação restrita a um papel específico, qualquer usuário autenticado (`'usuario'` ou `'pesquisador'`) pode fazer isso.

* **[07-B-2] `permissao`:** nomes padronizados no formato `"entidade_acao"` (ver `RBAC-pontos-discutidos.md`). Mantém idempotência via `ON CONFLICT (nome) DO NOTHING`.
  - 🗑️ **`campanha_encerrar` removida deste `INSERT` (era permissão órfã, nunca usada por nenhuma policy do `04`)** — detalhamento completo de como era, por que existia e por que foi removida (em vez de implementada) está em `[04-E]` mais acima neste mesmo documento.

* **[07-B-3] `papel_permissao`:** resolvido por nome (não por número fixo), já que os IDs de `papel` não são previsíveis depois do `ON CONFLICT DO NOTHING` de `[07-B-1]`. Como `trg_permissao_auto_admin` (`05_regras_negocio.sql`, executado antes deste arquivo) já dispara em todo `INSERT` em `permissao` e atribui a permissão nova ao papel `'admin'` automaticamente, as linhas `('admin', ...)` deste bloco já seriam preenchidas sozinhas pela trigger — foram mantidas explícitas mesmo assim só por clareza de leitura (documentam a intenção "admin tem tudo" sem depender de abrir outro arquivo para confirmar). `ON CONFLICT DO NOTHING` garante que não há duplicidade.
  - 🗑️ **`('admin', 'campanha_encerrar')` removida junto** — consequência direta de `campanha_encerrar` ter saído de `[07-B-2]`; sem a permissão existir, essa atribuição não faria sentido.

* **[07-C-5] `configuracoes` (parâmetros de sistema):** este bloco só pode rodar depois de `[07-D-1]` (`usuario`) porque duas das suas 7 linhas (`notificar_novas_campanhas`, `limite_denuncias_suspensao`) têm `id_usuario = 8`, referenciando o usuário Admin do seed.

* **[07-I-2] `configuracoes` (constantes do motor de score):** dados (não lógica) que alimentam as fórmulas de `05_regras_negocio.sql` — `score_custo_denuncia`, `score_penalidade_abandono`, etc. Ficam em `configuracoes` (não hardcoded no código) exatamente para que o admin possa ajustar a régua de penalidades pelo Painel Admin sem precisar editar SQL/app.

* **[07-D-5] Como logar no app após o seed:** com autenticação própria, o fluxo é: 1) cadastrar o usuário pelo endpoint de signup do NestJS (gera o `senha_hash` e chama `public.atribuir_papel_padrao(id_usuario)`, que atribui o papel `'usuario'` — ver `08_trigger_signup_usuario.sql`); 2) o papel `'admin'` não é atribuído automaticamente por nada disso — depois do signup, é preciso dar o papel a um usuário manualmente com `INSERT INTO usuario_papel (id_usuario, id_papel) SELECT <id_usuario>, id_papel FROM papel WHERE nome = 'admin'`.

> 🗑️ **Dois blocos removidos por estarem 100% obsoletos** (não só migrados — de fato apagados, sem equivalente aqui): um "FIX — permission denied for sequence" que descrevia um problema já resolvido, e uma "NOTA DE REORGANIZAÇÃO" que apontava para um arquivo `05_grants.sql` que nunca existiu de verdade (o nome correto sempre foi `06_grants.sql`). Ambos descreviam o `GRANT USAGE, SELECT ON ALL SEQUENCES`, que já vive e já está plenamente documentado em `06_grants.sql` (`[06-A-1]`) — mantê-los aqui seria pura duplicação desatualizada.

---

## 08. ATRIBUIÇÃO DE PAPEL PADRÃO NO SIGNUP (`08_trigger_signup_usuario.sql`)

### Visão Geral

O menor arquivo do banco: 1 função + 1 `GRANT`. Apesar do nome do arquivo ainda dizer "trigger", **não existe mais nenhuma trigger aqui** — é histórico do nome, mantido porque o projeto já decidiu não renomear arquivos (ver regras de edição). O conteúdo real é uma função chamável, não uma trigger de tabela.

> 📌 **Por que o nome do arquivo menciona "trigger" mas o conteúdo não tem nenhuma:** a versão original deste arquivo continha um trigger em `auth.users` (`on_auth_user_created`/`handle_new_user`) que criava a linha em `public.usuario` automaticamente quando o Supabase Auth cadastrava alguém. Com a saída do Supabase Auth do fluxo (autenticação própria), nunca mais existe um `INSERT` em `auth.users` — esse trigger não tinha mais como disparar e foi removido. A única parte que ainda valia a pena manter — "atribuir o papel padrão `'usuario'` a quem acabou de se cadastrar" — foi reaproveitada como uma função chamável pelo NestJS, em vez de ficar presa a um trigger de tabela que não existe mais.

### [08-D-1] `atribuir_papel_padrao(p_id_usuario)`

* **Quando roda:** chamada pelo NestJS manualmente, dentro da mesma transação do signup, logo após o `INSERT` em `usuario`. O fluxo completo de signup é: 1) gerar o hash da senha e inserir em `usuario`; 2) chamar esta função; 3) criar o registro em `verificacao_email` e disparar o e-mail de confirmação (ver `PLANO_AUTENTICACAO_PROPRIA.md`).
* **Por que é `SECURITY DEFINER`:** a policy `pol_usuariopapel_insert` (`04`) exige a permissão `'papel_atribuir'` para inserir em `usuario_papel` — mas um usuário que acabou de se cadastrar não tem nenhuma permissão ainda (nem papel nenhum). A função roda com os privilégios de quem a criou, contornando esse problema de "ovo e galinha" só para esta gravação específica (atribuir o papel `'usuario'` — nunca `'admin'`, que continua exigindo atribuição manual, ver `[07-D-5]`).
* **`ON CONFLICT DO NOTHING`:** protege contra chamar a função duas vezes para o mesmo usuário (ex.: retry de rede) sem gerar erro de duplicidade.
* **`GRANT EXECUTE`:** sem ele, a chamada do NestJS falharia com `permission denied` (erro `42501`) — o mesmo problema que as funções de score já tiveram, resolvido da mesma forma (ver `[06-I-1]`).

> 📌 **Por que `atribuir_papel_padrao()` não aparece aqui:** o `GRANT EXECUTE` dessa função fica junto dela mesma em `08_trigger_signup_usuario.sql`, porque `06` roda antes do `08` na ordem de dependência — a função ainda não existiria neste ponto da execução se o grant estivesse aqui.