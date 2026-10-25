# 📚 Documentação Técnica do Banco de Dados - CrowdAcadêmico

> 📌 **Numeração de RF:** citações de RF por número podem estar numa numeração anterior. A `MATRIZ-RASTREABILIDADE-RF.md` está inteira na numeração vigente e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

**Em palavras simples:** este documento explica o banco de dados (PostgreSQL) do CrowdAcadêmico: as tabelas, quem pode ler e gravar cada uma, e as regras de negócio que o próprio banco garante. Ele descreve o banco **como ele é hoje**; a história de como cada regra chegou aqui fica fora do repositório. Como o Nest usa o banco está no `DOCUMENTACAO_BACKEND.md`; o caminho do dinheiro, no `DOCUMENTACAO_FINANCEIRO.md`; os códigos de erro, no `DOCUMENTACAO_ERRCODE.md`.

**Comentários dos `.sql`.** Cabeçalho curto (`Função`, `Assinatura`, `Bloco` e uma `Regra` objetiva, sem datas nem história) e, dentro de função, trigger e policy, só o comentário que explica uma regra difícil. O porquê longo mora aqui, na seção `[NN-Y]` correspondente. Os comentários do `07` explicam dado de demonstração; o `ATUALIZAR O SUPABASE.sql` é o registro datado de cada patch e por isso mantém a narrativa.

**Marcadores.** Os comentários dos `.sql` usam `[NN-Y]` (arquivo-letra) ou `[NN-Y-N]` (arquivo-letra-item), onde `NN` é o número do arquivo (`01` a `08`) e `Y` é a letra do assunto. A letra é a mesma em qualquer arquivo onde aparecer (ver o Índice Global de Letras).

### Legenda dos símbolos

| Símbolo | Significado |
|---|---|
| 📌 | Nota explicativa: o porquê de uma regra de modelagem |
| ⚠️ | Ponto de atenção: funciona, mas vale revisar no futuro |

## 📑 Índice

1. [Índice Global de Letras](#-índice-global-de-letras)
2. [01. Extensões, ENUMs e tabelas](#01-extensões-enums-e-tabelas-01_extensoes_enums_tabelassql)
3. [02. Índices](#02-índices-02_indicessql)
4. [03. Funções helper de segurança](#03-funções-helper-de-segurança-03_funcoes_segurancasql)
5. [04. Row Level Security e políticas de acesso](#04-row-level-security-e-políticas-de-acesso-04_rls_policiessql)
6. [05. Motor de score e regras de negócio](#05-motor-de-score--regras-de-negócio-05_regras_negociosql)
7. [06. Grants](#06-grants-06_grantssql)
8. [07. Seed de dados](#07-seed-de-dados-07_seed_dadossql)
9. [08. Atribuição de papel padrão no cadastro](#08-atribuição-de-papel-padrão-no-signup-08_trigger_signup_usuariosql)
10. [Anexos A a F](#anexo-a---por-que-a-autenticação-própria-funciona-do-jeito-que-funciona)
11. [Como conferir este inventário](#como-conferir-este-inventário)

---

## 🔤 Índice Global de Letras

Cada letra tem exatamente um significado, do `01` ao `08`. Para achar tudo sobre um assunto (tabela, índice, policy, grant, regra de negócio), procure pela mesma letra em qualquer arquivo.

> ⚠️ Ao criar um bloco `[0X-LETRA]` novo, confira PRIMEIRO nesta tabela se a letra já tem dono. Assunto novo dentro de um domínio que já existe vira sub-item (`[03-P-1]`), não letra nova.

| Letra | Domínio | Onde aparece |
|---|---|---|
| **A** | Visão Geral & Configuração Inicial (o ROOT) | `01-A` (bootstrap/role/extensões/enums), `04-A` (RLS geral), `06-A` |
| **B** | RBAC (Papéis, Permissões e Vinculação) | `01-B`, `01-B-1`, `03-B` (`tem_permissao()`), `04-B`, `06-B`, `07-B` (seed de papel/permissao/papel_permissao) |
| **C** | CONFIG (Configurações, Catálogos e Arquivo Base) | `01-C`, `02-C`, `03-C` (`config_numero`), `04-C`, `06-C`, `07-C` |
| **D** | USUÁRIO (Contas, Perfis, Autenticação, Termos e Sessões) | `01-D`, `02-D`, `03-D`/`03-D-1` (`usuario_visivel()`/`registrar_aceite_termo()`), `04-D`, `06-D`, `07-D`, `08-D-1` (`atribuir_papel_padrao()`) |
| **E** | CAMPANHA (Campanhas, Atualizações, Comentários, Denúncias, Recompensas) | `01-E`, `02-E`, `03-E` (contagem de seguidores), `03-E-1` (`criar_campanha_para_outro`), `03-E-2` (`forcar_exclusao_campanha`), `04-E`, `06-E`, `07-E` |
| **F** | LINK (Vinculação de URLs Externas) | `01-F`, `02-F`, `04-F`, `06-F`, `07-F` |
| **G** | ARQUIVO (Vinculação de Mídias) | `01-G`, `02-G`, `04-G`, `05-G` (posse e órfãos), `06-G`, `07-G` |
| **H** | CONTRIBUIÇÃO (Apoios, Auditoria e Termos Financeiros) | `01-H`, `02-H`, `04-H`, `06-H`, `07-H` |
| **I** | SCORE (Parâmetros, Rótulos e o motor de cálculo) | `01-I`, `02-I`, `04-I`, `05-I-1` a `05-I-4`, `06-I`, `07-I` |
| **J** | Segurança & Contexto de Sessão (`id_usuario_atual()`) | `03-J` |
| **K** | Regras de Negócio Transversais (validações que cruzam mais de um domínio) | `05-K-1` a `05-K-3` |
| **L** | LOG DE AUDITORIA (quem alterou o quê e quando, `log_auditoria`) | `01-L`, `02-L`, `04-L`, `05-L`, `06-L`, `07-L` (retenção) |
| **M** | DASHBOARD ADMIN (métricas agregadas da tela inicial do painel) | `03-M` (`contar_metricas_dashboard()`) |
| **N** | MODERAÇÃO SOBRE CONTA (suspensão de usuário e de papel) | `01-D`/`01-B` (colunas), `03-N` |
| **O** | OPERAÇÕES DE AUTENTICAÇÃO (confirmação de e-mail, bloqueio por tentativas, exclusão de conta) | `03-O` |
| **P** | MODERAÇÃO E FERRAMENTAS SOBRE PESQUISADOR | `03-P` (suspensão em cascata, RF-084), `03-P-1` (`corrigir_cpf_pesquisador`), `03-P-2` (`criar_perfil_pesquisador_para_outro`), `03-P-3` (`alterar_perfil_pesquisador_de_outro`) |
| **Q** | NOTIFICAÇÃO (a fila de e-mails, RF-121) | `01-D` (colunas de `notificacao`), `02-D` (`idx_notificacao_fila`), `05-Q`, `06-Q`, `07-D-7` (seed) |

> 📌 **Por que `J`, `K`, `L`, `M`, `N`, `O` e `P` existem:** nem tudo no banco pertence a um domínio de dado único. `id_usuario_atual()` (`03`) é infraestrutura de sessão usada por tudo. Várias triggers de `05` mexem em tabelas de domínios diferentes ao mesmo tempo (ex.: validar o repasse de uma campanha); forçá-las numa letra só esconderia que são regras de fronteira. `L` (log de auditoria) vale para várias tabelas ao mesmo tempo, com a mesma trigger genérica. `M` agrega números de vários domínios numa função só. `N`, `O` e `P` são operações sobre conta e pesquisador que pedem permissão própria e ficam agrupadas por quem as usa (atendimento e moderação).

---

## 01. EXTENSÕES, ENUMS E TABELAS (`01_extensoes_enums_tabelas.sql`)

### [01-A] Bootstrap, Extensões e ENUMs

* **Autenticação própria em NestJS:** o projeto não usa o Supabase Auth/PostgREST; o Supabase é só o host do Postgres (e do armazenamento de arquivos). A autenticação mora no Nest (Anexo A).
* **Role `app_nestjs`:** uma única role de aplicação faz a conexão da API com o PostgreSQL. Ela é criada num bloco `DO $$` no topo do `01`, antes de qualquer policy de RLS (`04`).
* **A role nasce `NOLOGIN`, sem senha:** esquecer o passo de instalação falha **fechado**: o NestJS não conecta (`FATAL: role "app_nestjs" is not permitted to log in`), erro percebido em minutos. `GRANT` e `SET ROLE` funcionam numa role `NOLOGIN`; só o login direto fica bloqueado até rodar `ALTER ROLE app_nestjs LOGIN PASSWORD '...'`, passo obrigatório de instalação em `.Tutorial-rodar-projeto.md`.
  * **Por quê:** uma senha padrão escrita no repositório falharia **aberto**: esquecer de trocá-la deixaria o sistema funcionando com uma credencial conhecida, sem aviso.
* **Guarda de `BYPASSRLS`:** um bloco `DO $$` logo depois da criação da role verifica se `current_user` tem `rolsuper` ou `rolbypassrls` e para a instalação com uma mensagem única se não tiver (no Supabase, o papel `postgres` do SQL Editor tem `rolbypassrls = true`).
  * **Por quê:** quase todas as policies são `TO app_nestjs` e todas as tabelas têm `FORCE ROW LEVEL SECURITY`; sem a guarda, um papel sem `BYPASSRLS` produziria dezenas de erros de RLS espalhados pelos arquivos `04` a `07`, em vez de uma parada autoexplicativa no começo.
* **Extensão `pgcrypto`:** funções criptográficas, como `gen_random_uuid()`.
* **Extensão `unaccent` e função `texto_normalizado` ([01-A-1]):** base da comparação "é o mesmo nome?" dos catálogos: tira acentos, passa para minúsculas, junta espaços repetidos e tira os das pontas ("  São   Paulo " vira "sao paulo").
  * É `IMMUTABLE` porque índice exige, com `search_path` fixo (`public, extensions`) para achar o dicionário `unaccent` onde quer que a extensão esteja: no Supabase as extensões moram no esquema `extensions`; no PGlite dos testes e num Postgres comum, no padrão. Por isso a extensão é criada num bloco `DO` que escolhe o esquema.
  * É `SECURITY DEFINER`: quem grava o nome (e faz o índice rodar a função) é o `app_nestjs`, que não tem acesso ao esquema `extensions` do Supabase. Assim só esta função enxerga a extensão. Usada pelos índices únicos de [02-C-1].
* **Coluna com `DEFAULT` não aceita vazio:** toda coluna com valor padrão (datas "quando aconteceu", `ativo`, `campanha.valor_bruto_arrecadado`...) é `NOT NULL`. O padrão só vale quando a coluna não é informada; um `null` mandado por engano ficaria gravado em silêncio (ex.: o arrecadado vazio sumiria das somas), e o Nest responde 400 "Falta preencher um campo obrigatório" com o campo marcado. A suíte 28 do PGlite falha se aparecer coluna nova com `DEFAULT` que aceite vazio. A exceção é `contribuicao.token_sessao`, que pode ficar vazio quando a contribuição tem conta. É o padrão de mercado (Django e Rails criam a coluna assim).
* **Data e hora são sempre `TIMESTAMPTZ`** (`criado_em`, `expira_em`, `bloqueado_ate`, `ultimo_login_em` etc.): o valor vale como um instante (UTC por baixo), e a tela converte para o horário de Brasília.
* **ENUMs:**
  * `status_campanha` (com `rascunho` como primeiro valor e `DEFAULT`, ver [05-K-2-B]) e `status_contribuicao`: incluem os estados de moderação, rejeição, expiração e reembolso manual.
  * `tipo_motivo_denuncia`: separa os motivos de denúncia de campanha dos de perfil de pesquisador.
  * `tipo_vinculo`: `'institucional'` / `'independente'` (ver [01-D], `perfil_pesquisador`).

---

### [01-B] RBAC (Controle de Acesso Baseado em Papéis)

* **Estrutura:** as tabelas `papel`, `permissao` e a tabela de ligação `papel_permissao`.
* **Checagem:** as permissões são lidas pela função `public.tem_permissao()` ([03-B]), usada pelas policies e pelas funções do banco; o Nest pergunta à mesma função quando precisa (`DOCUMENTACAO_BACKEND.md`, seção 4).
* **`papel.codigo`, o identificador fixo:** `VARCHAR(20) NOT NULL UNIQUE`, estável, nunca exposto para edição. As automações que reconhecem um papel especial leem o código, nunca o nome: `trg_admin_recebe_toda_permissao()` (`05`, `codigo = 'admin'`), `fn_atribuir_papel_pesquisador()` (`05`, `codigo = 'pesquisador'`) e `atribuir_papel_padrao()` (`08`, `codigo = 'usuario'`, roda em todo cadastro).
  * **`papel.nome` é editável pelo painel** (`PATCH /papel/:id`, DTO só com `nome` e `descricao`): `pol_papel_update` (`04`) exige `papel_gerenciar`, e o `GRANT UPDATE (nome, descricao) ON papel` (`06`) é por coluna; `codigo` não tem `GRANT` nenhum. Dupla proteção: a coluna que as automações leem não é alcançável nem pela RLS nem pelo GRANT.
  * **Por quê:** lendo o nome, renomear um papel pelo painel pararia essas automações em silêncio, sem erro nenhum. Mesmo padrão de `tipo_link.codigo` ([01-C]).
* **`papel.ordem_exibicao`, a ordem de poder nas listas:** número que diz a posição de cada papel, do maior cargo (1, admin) para o menor (7, usuario). A coluna e o filtro "Papel" (Usuários, T1, Permissões) e a matriz Papel × Permissão ordenam por ele. É `NOT NULL`, `UNIQUE` e maior que zero, e o `app_nestjs` não o altera (o `GRANT UPDATE` de `papel` é só de `nome` e `descricao`).
  * **Por quê:** o nome é renomeável pelo painel e o `id_papel` só diz em que ordem o papel foi criado; um papel novo criado depois cairia abaixo de "usuário". Com a posição escrita, renomear não muda a ordem e um papel novo entra onde for posto.
  * **Caso-limite:** é só exibição. O que cada papel pode fazer é a matriz Papel × Permissão e a RLS, nunca este número. Não há tela para reordenar: os papéis nascem no seed. O nome de um papel não aceita vírgula (`PapelRequestUpdate`), porque as telas juntam os papéis de uma conta com vírgula. Provado no PGlite (suíte 57).
* **`papel.descricao`:** para que serve o papel, em uma frase (lista de Papéis e atribuição de papel no Alterar Usuário). Editável pelo painel, como o nome.

### [01-B-1] O que cada papel faz

**Em palavras simples:** o administrador pode tudo. Os outros papéis de gestão dividem as tarefas do dia a dia, cada um com só o que precisa. Mudar permissões e papéis é só do administrador. A lista sai das permissões gravadas em `07_seed_dados.sql` ([07-B-3]).

* **Curador:** faz a curadoria das campanhas e cuida dos catálogos que classificam o conteúdo.
  * Aprova e rejeita campanhas enviadas para aprovação.
  * Gerencia as áreas do conhecimento, os tipos de link acadêmico e os motivos de denúncia.
* **Moderador:** cuida do conteúdo publicado.
  * Julga denúncias e decide as contestações da pontuação das denúncias julgadas por outra pessoa.
  * Oculta comentários e atualizações de campanha.
  * Encerra campanha por moderação (RF-114).
* **Suporte:** atende problemas de acesso à conta.
  * Desbloqueia login e reenvia o e-mail de verificação; vê a lista de contas, a ficha e o histórico de login (`usuario_visualizar_atendimento`), sem dados sensíveis nem a fila de e-mails.
  * Não encerra sessões de outra pessoa nem cancela pedido de nova senha, e não precisa: a própria pessoa encerra as sessões em Minha Conta, trocar a senha pelo "Esqueci a senha" derruba todas, a suspensão também, e o pedido de nova senha vence sozinho (`recuperacao_senha_minutos_validade`). Conta invadida em que o dono perdeu o próprio e-mail: o admin suspende a conta, o que derruba as sessões.
* **Revisor:** acompanha o funcionamento da plataforma, só lendo.
  * Vê os relatórios do painel, a auditoria financeira e o log, sem dados pessoais.
* **Pesquisador:** cria e gerencia as próprias campanhas (o que faz é liberado por ser o dono).
* **Usuário:** papel de toda conta; apoia campanhas e cuida da própria conta.

A pontuação dos pesquisadores é pública: todo papel a vê, sem permissão própria.

> Durante o desenvolvimento, toda conta logada vê todas as telas (só leitura), para testar ([07-B-4]); isso sai no deploy.

---

### [01-C] CONFIG (Configurações, Catálogos e Arquivo Base)

* **`configuracoes`:** parâmetros globais do sistema (`id_usuario IS NULL`) e preferências individuais (`id_usuario` preenchido). `UNIQUE` em `chave`, para *upsert*.
  * **Coluna `publica`** (`BOOLEAN NOT NULL DEFAULT FALSE`): separa o que o navegador precisa para montar uma tela (ex.: `valor_minimo_contribuicao`) do que é parâmetro interno de segurança ou moderação (ex.: `limite_tentativas_login`). `GET /configuracoes` sem login só devolve as públicas; quem tem `configuracao_gerenciar` vê todas (`pol_config_select`, [04-C]). Só tem efeito em linha global.
  * **Por que nasce `FALSE`:** uma chave nova nasce interna e só fica pública por ato deliberado; com `DEFAULT TRUE`, esquecer de marcar seria o mesmo que expor.
* **`tipo_link`:** catálogo de redes e links externos. As flags `permite_perfil`, `permite_atualizacao` e `permite_recompensa` definem onde cada tipo pode ser usado. Tem `codigo` estável (chave natural, usada pelo seed para referenciar o catálogo sem depender do id).
  * **Tipos ativos:** `LATTES`, `ORCID`, `RESEARCHGATE`, `LINKEDIN` e `GITHUB`, todos com domínio e formato conferidos (`regex`, `dominio`). Não existe tipo "Outro" nem "Site Institucional": um tipo sem domínio aceitaria qualquer URL, o oposto do que os outros garantem.
  * **Só o `GITHUB` serve a atualização e recompensa** (`permite_atualizacao`/`permite_recompensa = TRUE`): repositório como prova de progresso, ou como acesso antecipado (`tipo_recompensa = 'acesso_antecipado'`) a um repositório privado. Os outros quatro são só de perfil (identidade profissional). Manter as três flags booleanas, sem tabela dinâmica, está no Anexo C.
* **`area_conhecimento`, em dois níveis:** `id_pai` auto-referenciado (mesmo padrão de `score_config`, [01-I]). Cada grande área do CNPq (`id_pai IS NULL`) tem as áreas de nível 2 como filhas. A campanha é **obrigada** a informar uma área de nível 2, nunca a grande área (trigger em [05-K-1]).
  * **Por quê:** só as 9 grandes áreas seriam amplas demais para o filtro de busca (ex.: "Ciências da Saúde" cobrindo de odontologia a saúde coletiva).
  * **`codigo_cnpq` sem dígito verificador** (`'X.YY.00.00'`): o código é comparado por igualdade e nunca digitado à mão, então o dígito não protegeria nada. Nomes e hierarquia seguem a nomenclatura padrão do CNPq.
* **`motivo_denuncia`:** catálogo de razões de denúncia, com `ativo` para desativar sem apagar os registros históricos. `descricao` é `NOT NULL` e é o único identificador do catálogo (nenhuma regra do banco lê um código de motivo). A exclusão de verdade também é possível pelo painel (`pol_motivo_delete`, [04-C]). Motivos de campanha incluem plágio, conflito de interesse não declarado, campanha sem viabilidade metodológica e spam; os de perfil incluem vínculo institucional falso.
* **`arquivo`:** metadados de cada mídia enviada (chave do objeto, MIME type, tamanho e quem enviou).
  * **`chave`, não URL:** guarda só o caminho do objeto no armazenamento (ex.: `publico/<uuid>.webp`). A URL pública é montada na hora pelo Nest (`commons/storage`), juntando o endereço base do armazenamento com a chave. Trocar de domínio ou de provedor (os dois falam o protocolo S3) não exige atualizar nenhuma linha. `UNIQUE` porque o nome é sempre gerado pelo backend (`randomUUID`), nunca pelo cliente: colisão seria bug.
  * **`id_usuario_upload`:** quem enviou. Sem isso não daria para responder "quem subiu este arquivo?", limitar a cota por conta, conferir a posse da foto de perfil ([05-G]) nem achar o que uma conta banida enviou. A FK é criada por `ALTER TABLE` depois de `usuario` existir, porque as duas tabelas se referenciam (`usuario.id_imagem_perfil` aponta para `arquivo`). `ON DELETE SET NULL`: apagar a conta que enviou não apaga o arquivo, que pode continuar em uso.

> 📌 **Por que `tipo_link` e `arquivo` moram em CONFIG, e não em LINK/ARQUIVO:** a letra `C` é "Configurações, Catálogos e Arquivo Base". O catálogo ou recurso compartilhado mora em `C`, e quem *usa* esse catálogo para algo específico ganha a própria letra:
>
> | Catálogo / recurso base (mora em `C`) | Quem usa (mora na letra própria) |
> |---|---|
> | `tipo_link` - tipos de link (Lattes, ORCID, LinkedIn...) | `link_academico`, `link_atualizacao`, `link_recompensa` → **F** (LINK) |
> | `arquivo` - metadados de mídia (chave, MIME, tamanho) | `arquivo_atualizacao`, `arquivo_recompensa` → **G** (ARQUIVO) |
> | `motivo_denuncia` - motivos de denúncia | `denuncia` → **E** (CAMPANHA) |
>
> `arquivo` é a tabela-base genérica (qualquer mídia, inclusive a foto de perfil, `usuario.id_imagem_perfil`); as tabelas que a associam a um contexto (atualização, recompensa) é que ganham a letra `G`.

---

### [01-D] USUÁRIO (Autenticação Própria, Segurança e Sessões)

* **`usuario`:** tabela central de contas.
  * `senha_hash`: obrigatório (`NOT NULL`), hash bcrypt.
  * **E-mail sempre em minúsculas:** `trg_usuario_normaliza_email` grava `lower(btrim(email))` (o Nest também normaliza, `DOCUMENTACAO_BACKEND.md`, seção 19). Sem isso, `UK_USUARIO_EMAIL` só barraria texto igual, e "Alice@" e "alice@" virariam duas contas.
  * **Proteção contra força bruta:** `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em` e `ultimo_login_ip` controlam o bloqueio temporário depois de falhas seguidas de login.
  * **`email_verificado`:** indica se o usuário confirmou o e-mail; não tem relação com o bloqueio por tentativas.
  * **`deletado_em` e `deletado_por`:** quem excluiu a conta e quando. Preenchidas só por `excluir_conta_usuario()` ([03-O]), nunca por `UPDATE` direto do app (fora do `GRANT UPDATE`, dentro do `GRANT SELECT`, [06-D]). **Por quê:** a exclusão é a operação de tratamento mais sensível, e a LGPD (art. 37) pede o registro delas.
* **`usuario_papel`:** N:N entre usuários e papéis. Fica fisicamente neste bloco por depender de `usuario`, mas é RBAC.
* **`perfil_pesquisador`:** dados acadêmicos do pesquisador. `score_atual` é inteiro, para leituras rápidas do motor de pontuação. O estado do pesquisador é um só: `status_pesquisador` (ENUM), sem booleano repetindo a mesma informação.
  * **`ativado_em`** (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`): a data do upgrade. Nenhum caminho de upgrade (a própria conta pelo Nest, ou `criar_perfil_pesquisador_para_outro`) informa a data; o padrão grava na hora. **Caso-limite:** suspender e reativar o pesquisador não muda a data: é a do primeiro upgrade. Suíte PGlite 44.
  * **`tipo_vinculo`:** `'institucional'` exige `vinculo_institucional` preenchido e não vazio; `'independente'` exige `NULL` (`CK_PERFIL_VINCULO`). Nenhum dos dois aceita ambiguidade: "sem instituição" é um fato declarado e filtrável, não um campo em branco. **Por quê:** obrigar a instituição excluiria o pesquisador independente, justamente um público que a plataforma quer alcançar. ⚠️ `calcular_score_perfil_academico` (`05`) dá pontos pela instituição preenchida, então o pesquisador independente não recebe esses pontos.
  * **CPF cifrado (`cpf_criptografado`) e índice cego (`cpf_hash`):** ver o bloco abaixo.
* **`termos_de_uso` e `usuario_termo`:** as versões de cada termo e o aceite de cada conta, com IP e data (LGPD). Versão já aceita não se apaga nem se altera ([05-K-3]).
* **`notificacao`:** a fila e o histórico dos e-mails: snapshot do e-mail do destinatário, tentativas e o texto do último erro ([05-Q]).
* **`verificacao_email` e `recuperacao_senha`:** tokens curtos e temporários de confirmação de conta e de nova senha. O índice parcial `ux_recuperacao_senha_ativo_por_usuario` garante um só token de recuperação ativo por pessoa.
* **`sessao`:** refresh tokens guardados como hash. Permite sair com segurança, revogar sessões e controlar vários aparelhos numa arquitetura JWT.
  * **`origem`** (`'login'` ou `'refresh'`, `CK_SESSAO_ORIGEM`, `DEFAULT 'refresh'`): toda renovação silenciosa do token (a cada ~15 minutos de uso) também cria uma linha; a coluna separa isso de um login de verdade na tela de histórico de login. O padrão é `'refresh'` de propósito: uma linha sem origem informada nunca aparece como login sem ser.

#### CPF: cifra no Nest e índice cego

É o único dado cifrado de verdade do projeto (diferente do hash de senha, que é irreversível). O CPF **precisa** poder voltar ao valor original: a verificação de identidade do pagamento lê o CPF.

* **O problema de fundo:** cifra de verdade é de propósito **não determinística**: cifrar o mesmo CPF duas vezes produz dois resultados diferentes (por um valor aleatório novo a cada operação). Isso impede comparar valores cifrados e perceber que escondem o mesmo dado, mas também impede `UNIQUE` na coluna cifrada e impede "procurar quem tem este CPF".
* **Onde cifrar: no Nest** (`node:crypto`, AES-256-GCM), não no Postgres (`pgcrypto`, `pgp_sym_encrypt`).
  * **Por quê:** nenhuma trigger, função ou policy do banco lê `cpf_criptografado` para decidir nada (a única aparição fora da coluna e do `GRANT` é a exclusão dela do log de auditoria, [05-L]). E no Nest a chave nunca sai do processo da aplicação: o banco só recebe e devolve texto já cifrado; com `pgcrypto`, a chave viajaria para dentro do Supabase a cada leitura e gravação. Efeito colateral favorável: o AES-256-GCM em base64 é bem mais curto que o formato OpenPGP.
* **Formato salvo: `v1:<iv>:<tag>:<ciphertext>`** (cada parte em base64, unidas por `:`). O **IV** é o valor aleatório de cada cifrada (não é segredo, nunca se repete com a mesma chave). A **tag de autenticação** é o "selo" do GCM: se um byte do texto cifrado for alterado, a conferência falha e a função se recusa a devolver um CPF corrompido. O **`v1:`** é a versão da receita: se o algoritmo mudar ou a chave for trocada, linhas `v1:` e `v2:` convivem na mesma coluna e a migração pode ser feita aos poucos.
* **`cpf_criptografado` é `TEXT`:** o tamanho é ditado pelo algoritmo (cerca de 61 caracteres hoje), não por uma regra de produto; `TEXT` não exige revisitar um limite se a receita mudar, e não tem custo no Postgres.
* **`cpf_hash TEXT NOT NULL UNIQUE`, o índice cego:** `HMAC-SHA256(cpf_normalizado, CPF_INDEX_KEY)`. É determinístico (o mesmo CPF dá sempre o mesmo valor, então aceita `UNIQUE` e comparação direta) e não reversível. Serve a três necessidades: **(1)** impedir duas contas com o mesmo CPF; **(2)** o suporte achar a conta pelo CPF informado (RF-017, correção de CPF); **(3)** a curadoria cruzar "este CPF já teve campanha rejeitada por fraude, em outra conta".
  * **Por que HMAC e não um hash simples:** um CPF tem só cerca de 10⁹ combinações válidas; alguém com acesso ao banco poderia calcular o hash de todos de antemão e reverter na prática. O HMAC exige uma chave secreta, sem a qual não dá para montar essa tabela.
* **Duas chaves no `.env`: `CPF_ENCRYPTION_KEY` e `CPF_INDEX_KEY`.** Têm ciclos de vida diferentes: trocar a de cifra é uma migração tranquila (decifra com a velha, cifra com a nova, linha a linha); trocar a do índice invalida todo `cpf_hash` de uma vez e exige recalcular a coluna inteira numa operação só. Separadas, trocar uma não força trocar a outra. ⚠️ **Perder qualquer uma das duas depois de ter dado real cadastrado é irreversível.**
* **Regra de produto:** um CPF corresponde a, no máximo, uma conta de pesquisador (`cpf_hash UNIQUE`).
* **Seed:** os CPFs do seed são falsos (dígito verificador válido), cifrados de verdade com as chaves do `.env` de desenvolvimento, para testar o caminho real de ponta a ponta. O sistema confere só o dígito verificador (formato), não se o CPF existe na Receita.

---

### [01-E] CAMPANHA (Campanhas, Moderação e Recompensas)

* **`campanha`:** a tabela principal de projetos de financiamento.
  * **Limite técnico na constraint, regra de negócio na trigger.** Este é o padrão de todo número que é regra de produto:
    * `CK_CAMPANHA_PRAZO` só barra erro grosseiro (1 a 365 dias); a duração permitida (15 a 60 dias) vem de `configuracoes.prazo_minimo_campanha_dias`/`prazo_maximo_campanha_dias`, conferida por `fn_valida_prazo_campanha_negocio` ([05-K-2]). Mudar a política de prazo é um `UPDATE` numa linha, não uma migração de constraint.
    * `CK_CAMPANHA_META_FINANCEIRA_POSITIVA` só exige `> 0`; o mínimo de negócio (R$ 500,00) vem de `configuracoes.meta_minima_campanha` ([05-K-2]). Meta zero, num tudo-ou-nada, seria sucesso instantâneo.
    * `CK_CAMPANHA_DESCRICAO_TAMANHO` barra o absurdo (20.000 caracteres); o limite de negócio (5.000) vem de `configuracoes.limite_caracteres_descricao_campanha` ([05-K-1]).
  * **"Em breve":** o pesquisador pode lançar a campanha na hora ou agendar um início futuro (contador regressivo, como no Catarse), sem status novo. Campanha aprovada já é pública (`pol_campanha_select` libera por status); `fn_valida_contribuicao_campanha_ativa()` ([05-K-2]) recusa contribuição enquanto `data_inicio` está no futuro, comparando em tempo real, sem tarefa agendada. `data_inicio` e `data_fim` só congelam quando a campanha **começa de fato**; meta, modelo, taxa, título e descrição congelam na aprovação.
  * **`id_area_conhecimento NOT NULL`:** junto da trigger de nível 2 ([05-K-1]), toda campanha tem uma área de nível 2; sem área, ela sumiria de qualquer filtro.
  * **`encerrado_em`:** a data real de encerramento (natural, antecipado ou por moderação), gravada sozinha por `trg_campanha_preenche_encerramento` ([05-K-2]) quando o status entra em `'encerrado'`/`'encerrado_moderacao'`, sem depender do backend lembrar disso. Não é congelada. **Por quê:** `data_fim` é uma promessa congelada e não consegue representar um encerramento antes do prazo.
  * **`taxa_plataforma` carimbada na aprovação** (RF-036): `trg_campanha_carimba_taxa` ([05-K-2]) copia `configuracoes.taxa_plataforma_padrao` no instante em que `aprovado_em` deixa de ser `NULL`, se ainda não houver uma taxa própria; a trigger de congelamento protege o valor dali em diante.
  * **Sugestão de 30 dias** (RF-069): `configuracoes.prazo_sugerido_campanha_dias` (30, pública), lida só pela tela para preencher a data de fim. É sugestão, não regra: a regra continua sendo o mínimo e o máximo. Não entra no par mínimo/máximo; uma sugestão fora do intervalo aparece em vermelho no aviso de prazo, e o banco recusa no envio.
  * **`video_apresentacao_url`** (`VARCHAR(500)`, opcional): vídeo de apresentação em destaque (YouTube, Vimeo). Só a URL; o vídeo não é armazenado. Congela na aprovação, como o título.
* **`atualizacao_campanha`:** postagens de acompanhamento do projeto. `ativo` permite ocultar por moderação sem perder o histórico. Limite técnico de 20.000 caracteres (`CK_ATUALIZACAO_CAMPANHA_CONTEUDO_TAMANHO`) e de negócio de 5.000 (`configuracoes.limite_caracteres_conteudo_atualizacao`).
* **`orcamento_campanha` e `marco_cronograma`:** orçamento estruturado (itens com categoria e valor, que viram gráfico) e cronograma estruturado (marcos com título, descrição e data prevista), inspirados no Experiment.com. **Os dois são obrigatórios** para aprovar uma campanha.
  * **Regras (em [05-K-2]):** o orçamento congela na aprovação (sem exceção nem para o admin); o cronograma congela quando a campanha começa de fato; a data de um marco não pode ser anterior a `data_inicio` (pode passar de `data_fim`); a soma de `orcamento_campanha.valor` precisa bater **exatamente** com `campanha.meta_financeira` na aprovação.
  * **Quantidade de itens, piso e teto configuráveis:** `orcamento_min_itens` (1) e `cronograma_min_marcos` (3), conferidos na aprovação (`fn_valida_completude_campanha`), seguindo os RF-039 e RF-041; `orcamento_max_itens` e `cronograma_max_marcos`, conferidos já no `INSERT` (aviso imediato ao pesquisador).
  * **Descrição:** limite técnico de 20.000 e de negócio de 2.000 (`limite_caracteres_descricao_orcamento`/`limite_caracteres_descricao_marco`), reaproveitando `fn_valida_limite_texto_livre` ([05-K-1]).
  * **RLS ([04-E]):** a leitura segue a mesma visibilidade da campanha (por status, dono ou `relatorio_visualizar`); expor o orçamento de uma campanha ainda não aprovada não tem por quê. Escrita: dono da campanha ou `campanha_editar`.
* **`comentario`:** a comunidade conversando com o pesquisador.
  * `UNIQUE (id_campanha, id_pesquisador)`: **um comentário por pesquisador por campanha, para sempre**, mesmo ocultado (`ativo = FALSE`): o pesquisador pode reeditar o registro, não abrir outro.
  * `CK_COMENTARIO_ENDOSSO`: coerência entre `endossado` e a posição de exibição (`ordem_endosso`). `CK_COMENTARIO_CONTEUDO_NAO_VAZIO`: texto só com espaços é recusado (gastaria a única vaga do pesquisador naquela campanha).
  * **Comentário não é rede social:** só o autor, o dono da campanha e a moderação veem o comentário; o público vê só os endossados. O dono pode **Excluir** um comentário recebido (`DELETE`, `pol_comentario_delete`: só o dono, só comentário ativo; o autor pode comentar de novo) ou **Excluir e bloquear** (para ofensa, ameaça ou spam: `UPDATE ativo = FALSE`; a linha guardada ocupa a vaga do `UNIQUE` e o autor não comenta mais naquela campanha, nem reativa o próprio comentário). Ninguém é avisado (RF-093). **Caso-limite:** o comentário bloqueado não pode ser apagado depois (desfaria o bloqueio), e não existe "desbloquear" pela tela. Suíte 29 do PGlite.
  * `pol_comentario_update` libera `UPDATE` ao autor sem restringir colunas; as triggers impedem o autor de reverter uma moderação e de endossar o próprio comentário ([04-E], [05-K-3]).
* **`denuncia`:** incidentes apontados por usuários, ligados a um motivo do catálogo.
  * **`relato`** (opcional): o denunciante detalha o caso além do motivo. Limite técnico de 5.000 e de negócio de 1.000 (`limite_caracteres_relato_denuncia`): campo de formulário sem limite vira vetor de abuso.
  * **`CK_DENUNCIA_ALVO_XOR`:** exatamente um alvo preenchido (`id_campanha_alvo` ou `id_pesquisador_alvo`). Trabalha junto com `trg_denuncia_valida_tipo_motivo` ([05-K-1]), que confere se o motivo bate com o alvo.
  * **FKs dos alvos com `ON DELETE RESTRICT`:** uma denúncia é registro de moderação; o alvo sumir e a denúncia ficar apontando para nada destruiria o rastro.
* **`solicitacao_encerramento`:** pedidos de encerramento antes do prazo. Tem a justificativa de quem pede (`justificativa_pesquisador`) e a de quem decide (`justificativa_admin`, obrigatória para rejeitar: negar sem registrar o motivo seria indefensável numa contestação). Limite técnico de 10.000 em cada e de negócio de 2.000 (`limite_caracteres_justificativa_encerramento`, compartilhado). Ver [05-K-2-H].
* **`historico_rejeicao`:** uma linha por rejeição de campanha (`id_campanha`, `id_usuario_dono`, `titulo_campanha`, `id_admin`, `justificativa`, `rejeitado_em`). Dono e título são gravados no instante da rejeição e **não há FK para `campanha`**: o histórico sobrevive à exclusão da campanha (que é excluída sozinha quando o prazo de reenvio vence). `id_campanha` fica só como referência, indexada. Imutável (sem policy nem GRANT de UPDATE). Ver [05-K-2-B].
* **`recompensa`:** recompensas **simbólicas** oferecidas pelos pesquisadores: `tipo_recompensa` só tem `digital`, `reconhecimento` e `acesso_antecipado`, sem `DEFAULT` (a aplicação escolhe). `valor_minimo > 0`; `quantidade_disponivel` existe e aceita `NULL` (ilimitada), mas o sistema não controla estoque. Limite técnico de 10.000 na descrição e de negócio de 2.000 (`limite_caracteres_descricao_recompensa`).
  * **Por que só simbólica:** recompensa física cria obrigação de entrega e logística que uma plataforma tocada por duas pessoas não tem como fiscalizar; os três tipos não têm frete, prazo de envio nem disputa de "não recebi". `reconhecimento` é o nome de quem apoiou exibido no projeto; `acesso_antecipado` é o modelo do Experiment.com.

---

### [01-F] LINK (Tabelas de Associação de Links)

* **`link_academico`, `link_atualizacao` e `link_recompensa`:** usam o catálogo `tipo_link` para ligar URLs externas a perfis de pesquisador, atualizações de campanha e recompensas digitais.
  * **`link_academico.rotulo`** (`VARCHAR(100)`, opcional): rótulo próprio do link (ex.: "meu repositório do projeto X"); sem rótulo, a tela mostra o nome do tipo. Cada pesquisador tem até 5 links, configurável (`trg_link_academico_valida_limite`, [05-K-1]).

---

### [01-G] ARQUIVO (Tabelas de Associação de Mídias)

* **`arquivo_atualizacao` e `arquivo_recompensa`:** o vínculo N:N entre a tabela base `arquivo` e as atualizações e recompensas. A posse e a limpeza de órfãos estão em [05-G].

---

### [01-H] CONTRIBUIÇÃO (Transações e Auditoria Financeira)

> 📌 **Visão de ponta a ponta do dinheiro** (tarifa, destino no fim da campanha, repasse, devolução, validação de saque, parâmetros): `DOCUMENTACAO_FINANCEIRO.md`. Aqui ficam as regras do banco, bloco a bloco.

* **`contribuicao`:** os apoios financeiros.
  * **Valor mínimo:** `CK_CONTRIBUICAO_VALOR_MINIMO` é só limite técnico (`valor > 0`); o mínimo de negócio (R$ 5,00, configurável) vem de `configuracoes.valor_minimo_contribuicao` ([05-K-2]), o mesmo padrão do prazo e da meta.
  * **`token_sessao`:** UUID gerado sozinho (`gen_random_uuid()`), para rastrear a contribuição sem conta sem expor um número sequencial adivinhável.
  * **Sem `UPDATE` direto:** não há policy nem `GRANT` de `UPDATE`; a situação só muda por `atualizar_status_contribuicao()` ([05-K-2]), que valida a transição e grava a auditoria.
  * **O dono pode contribuir na própria campanha:** nenhuma trava contra `contribuicao.id_usuario` igual ao dono; a contribuição segue todas as regras de qualquer outra, e a taxa da plataforma vale igual. **Por quê:** é comum o próprio autor completar o que falta. **Caso-limite:** no tudo-ou-nada, o próprio pesquisador pode completar a meta.
* **`auditoria_financeira`:** o retrato de cada mudança de dinheiro (situação anterior e nova, valor, evento, quem fez), de contribuição ou de repasse. **Só aceita inclusão:** não há policy nem `GRANT` de escrita para o `app_nestjs`; quem grava são só as funções `SECURITY DEFINER` de `05` ([04-H-1], [06-H]). O histórico do dinheiro não se apaga nem se edita.
* **`contribuicao_recompensa`:** liga um apoio à recompensa escolhida.
* **`aceite_termo_contribuicao`:** o aceite do termo na hora de contribuir, com o IP (apagado depois do prazo de retenção, [05-L]).

---

### [01-I] SCORE (Configuração e Cálculo de Pontuação)

* **`score_config`, `score_rotulo` e `score_pesquisador`:** a pontuação de reputação dos pesquisadores. `UK_SCORE_PESQUISADOR_USUARIO_SCORE_CONFIG` impede duas pontuações para o mesmo parâmetro e a mesma pessoa.
* **`score_rotulo`: duas faixas ATIVAS nunca se sobrepõem.** `EX_SCORE_ROTULO_SEM_SOBREPOSICAO`, `EXCLUDE USING gist (int4range(score_minimo, score_maximo, '[]') WITH &&) WHERE (ativo = TRUE)`.
  * **Por quê:** `recalcular_score_pesquisador` ([05-I-2]) escolhe o rótulo com `LIMIT 1` sem `ORDER BY`; com faixas sobrepostas, o mesmo score poderia cair em rótulos diferentes em execuções diferentes.
  * `int4range` com GiST tem suporte nativo ao `&&`, sem a extensão `btree_gist`. É `DEFERRABLE INITIALLY DEFERRED`: a checagem roda no `COMMIT`, então editar duas faixas vizinhas na mesma transação passa por um estado intermediário sem ser recusado. Faixa inativa fica fora da checagem.
* **A soma dos pesos raiz de `score_config` é exatamente 100, e as faixas ativas cobrem 0 a 100 sem buraco:** duas `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` (`trg_score_config_soma_pesos`, `trg_score_rotulo_cobertura`, [05-I-4]). O `EXCLUDE` só impede sobreposição; estas fecham o buraco (uma faixa até 49 e a próxima começando em 51 deixaria o score 50 sem rótulo).

---

## 02. ÍNDICES (`02_indices.sql`)

### Visão Geral de Performance

O script de índices segue a ordem dos blocos de `01_extensoes_enums_tabelas.sql`. Os índices explícitos atendem três cenários:
1. **Chaves estrangeiras:** o Postgres não cria índice automático em coluna de FK; sem ele, um `JOIN` com a tabela filha faz leitura completa (*sequential scan*).
2. **Caminhos quentes:** verificação de token, renovação de sessão e filas das tarefas automáticas.
3. **Regras de negócio por índice parcial (`UNIQUE ... WHERE`):** unicidade condicional garantida no próprio banco.

> 📌 **RBAC e CONFIG quase não têm `CREATE INDEX`:** as consultas principais já usam os índices automáticos das `PRIMARY KEY` e `UNIQUE` (ex.: `chave` em `configuracoes`, `codigo_cnpq` em `area_conhecimento`). As exceções estão em [02-C].

---

### [02-C] CONFIG

* **`idx_area_conhecimento_pai`:** a FK `id_pai` monta a árvore do seletor de área (grande área → nível 2); mesmo padrão de `idx_score_config_pai` ([02-I]).
* **[02-C-1] Nome único ignorando acentos, maiúsculas e espaços:** três índices únicos funcionais sobre `texto_normalizado` ([01-A-1]), para "Matemática" e "matematica " nunca coexistirem:
  * `uq_tipo_link_nome_normalizado`: único no sistema;
  * `uq_area_conhecimento_nome_normalizado`: único dentro da mesma área-mãe (as grandes áreas, sem mãe, formam um grupo só via `COALESCE(id_pai, 0)`; o mesmo nome sob mães diferentes é legítimo na árvore do CNPq);
  * `uq_motivo_denuncia_descricao_normalizada`: único dentro do mesmo `tipo` (o mesmo motivo pode valer para campanha e para perfil).
  * O índice garante a regra mesmo com dois cadastros ao mesmo tempo. O Nest traduz a violação para 409 com mensagem por índice (`nest/src/commons/database/mensagens-duplicidade.constants.ts`). Suíte 19 do PGlite.

---

### [02-D] USUÁRIO

* **`idx_seguir_pesquisador_alvo`:** quem segue um pesquisador; é o índice de `contar_seguidores_pesquisador()` ([03-E]). A outra ponta (`id_usuario`) já é coberta pelo índice automático de `UK_SEGUIR_PESQUISADOR_USUARIO_PESQUISADOR`.
* **`uq_termos_uso_ativo`:** índice parcial `UNIQUE` que garante no máximo uma versão ativa de cada termo por vez (`WHERE ativo = TRUE`).
* **Notificações:** `idx_notificacao_fila` (índice parcial `WHERE status = 'pendente'`, pela próxima tentativa) é a fila do envio de e-mails ([05-Q]); `idx_notificacao_status` serve à contagem por situação na aba Notificações; `idx_notificacao_usuario`, à FK.
* **Autenticação e sessão:** índices sobre `token_hash`, `refresh_token_hash` e `id_usuario` em `verificacao_email`, `recuperacao_senha` e `sessao`, consultados a cada link de e-mail e a cada renovação de token.

---

### [02-E] CAMPANHA

* **`idx_campanha_status_data_fim`:** as buscas públicas de campanhas ativas e prestes a terminar, e a tarefa que encerra as vencidas. Não existe `idx_campanha_status` sozinho: seria prefixo deste.
* **`idx_campanha_area_conhecimento`:** a busca pública principal (filtrar campanha por área).
* **Índices de apoio:** `idx_campanha_usuario` é `(id_usuario, status)` (regra de campanhas simultâneas, score e "minhas campanhas"; serve também à FK); `idx_comentario_pesquisador` é `(id_pesquisador, criado_em)` (limite de frequência de comentário e moderação por autor); `idx_historico_rejeicao_dono` cobre `historico_rejeicao(id_usuario_dono)` (consultado pelo score); `idx_denuncia_motivo` (moderação filtrando por motivo).
* **FKs de `id_campanha`** nas tabelas dependentes (`seguir_campanha`, `atualizacao_campanha`, `repasse`, `solicitacao_encerramento`, `historico_rejeicao`, `comentario`, `recompensa` e `denuncia`).
* No volume do TCC nenhum muda a velocidade de forma perceptível; cada um existe por um motivo que dá para explicar.

---

### [02-F] LINK

* Índices das tabelas de associação (`link_academico`, `link_atualizacao`, `link_recompensa`) pelas entidades pai e pelo catálogo `id_tipolink`.

---

### [02-G] ARQUIVO

* Índices de junção em `arquivo_atualizacao` e `arquivo_recompensa`.
* **`uq_arquivo_recompensa_principal`:** índice parcial `UNIQUE`: cada recompensa tem no máximo uma mídia principal (`WHERE principal = TRUE`).

---

### [02-H] CONTRIBUIÇÃO

* Índices em `contribuicao` (por campanha e por usuário), `contribuicao_recompensa` e `aceite_termo_contribuicao`, para o histórico de contribuições.
* **`idx_auditoria_financeira_contribuicao`:** o histórico de uma contribuição na auditoria financeira (RNF-007).

---

### [02-I] SCORE

* **`idx_score_config_pai`:** a montagem da árvore de critérios. `score_pesquisador` não tem índice próprio por `id_usuario`: `UK_SCORE_PESQUISADOR_USUARIO_SCORE_CONFIG` (`01`) já cria um índice automático que cobre essa busca.

---

### [02-L] LOG DE AUDITORIA

* **`idx_log_auditoria_ocorrido`** é BRIN: o log só cresce em ordem de tempo, e o BRIN resume blocos inteiros de linhas por faixa de data, muito menor que um B-tree para a limpeza por retenção ([05-L]).

---

## 03. FUNÇÕES HELPER DE SEGURANÇA (`03_funcoes_seguranca.sql`)

### Visão Geral de Arquitetura

As funções deste arquivo são a ponte entre a sessão do NestJS e a RLS do PostgreSQL: dizem ao banco quem está pedindo e o que essa pessoa pode, sem depender do Supabase Auth (`auth.uid()`).

* **`STABLE`** (nas de leitura): a função não altera o banco e devolve o mesmo resultado dentro da mesma transação.
* **`SECURITY DEFINER` + `SET search_path = public`:** roda com os privilégios de quem criou a função, protegida contra sequestro do caminho de busca (*search path hijacking*).
* **Regra das funções `SECURITY DEFINER` que escrevem:** como elas desligam a RLS, **a própria função é a única guardiã**. Toda função que age sobre a conta de outra pessoa confere a permissão dentro dela (`tem_permissao()`), e as que não têm como conferir (as que rodam antes de existir sessão, como o login) recebem só valores decididos pelo backend, nunca vindos do cliente. Todas saem do `EXECUTE` padrão de `PUBLIC` (`REVOKE` antes do `GRANT` só para `app_nestjs`, [06-D]).

---

### [03-C] CONFIG - helper de leitura (`config_numero`)

* `config_numero(p_chave TEXT, p_padrao DECIMAL) RETURNS DECIMAL`: lê uma constante numérica de `configuracoes` com valor de reserva; nunca devolve `NULL` nem erro, mesmo que a chave não exista. Usada por quase todo o `05` (score, limites de negócio) e pelas funções de autenticação ([03-O]).
* Mora no `03` (e não no `05`) porque as funções do `03` já a chamam, e o `03` roda antes.

---

### [03-J] SEGURANÇA & CONTEXTO DE SESSÃO (`id_usuario_atual`)

* **Como a sessão chega ao banco:** o NestJS, ao abrir a transação da requisição, faz `set_config('app.id_usuario_atual', '<id>', true)` (local à transação; `DOCUMENTACAO_BACKEND.md`, seção 2).
* **Leitura:** `SELECT NULLIF(current_setting('app.id_usuario_atual', true), '')::INT`.
  * **Por que o `NULLIF`:** o segundo argumento `true` de `current_setting()` cobre a variável "nunca definida" (devolve `NULL`), mas não a "definida como texto vazio": `''::INT` daria erro fatal. Com o `NULLIF`, os dois casos viram `NULL` (anônimo) antes do `::INT`. Sem isso, uma sessão anônima com a variável vazia derrubaria qualquer consulta a tabela protegida, inclusive a lista pública de campanhas, porque `tem_permissao()` chama esta função e aparece em boa parte das policies.

---

### [03-D] VISIBILIDADE DE CONTA (`usuario_visivel`)

* `usuario_visivel(p_id INT) RETURNS BOOLEAN`: nega a visibilidade se a conta estiver `deletado = TRUE`; se o id não existir, também considera invisível (`COALESCE(..., TRUE)` antes do `NOT`).
* **Onde é usada:** `pol_perfil_select`, `pol_link_select` e `pol_score_select` (`04`). **Por quê:** sem ela, o perfil acadêmico, os links e a pontuação de uma conta excluída continuariam públicos. A campanha continua pública por status (`pol_campanha_select`); só o autor fica anonimizado.
* Mesmo padrão de `tem_permissao()`: função pura, `STABLE`, `SECURITY DEFINER`, com a checagem num lugar só, para a próxima policy pública não nascer com o mesmo furo.

### [03-D-1] ACEITE DE TERMOS NO CADASTRO (`registrar_aceite_termo`)

* `registrar_aceite_termo(p_id_usuario, p_id_termo, p_ip) RETURNS VOID`: grava em `usuario_termo` (`ON CONFLICT (id_usuario, id_termo) DO NOTHING`).
* **Por que existe:** `pol_usuario_termo_insert` (`04`) exige `id_usuario = id_usuario_atual()`, que é verdade para quem já está logado, mas nunca durante o próprio cadastro: a conta é criada na mesma requisição e `id_usuario_atual()` continua `NULL` até o fim dela. O mesmo problema que `atribuir_papel_padrao()` ([08-D-1]) resolve para o papel padrão.
* **Sem checagem de autorização própria:** `p_id_usuario` é sempre a conta recém-criada na mesma transação, decidida pelo backend (`POST /auth/cadastro`), e o `id_termo` é o da versão ativa, resolvido pelo servidor; nenhum cliente consegue forjar aceite em nome de outra conta.

---

* **`fn_termo_uso_pendente(id)`** (RF-015): devolve a versão vigente que a conta ainda não aceitou, primeiro a do termo da conta e, para quem tem perfil de pesquisador, a do termo de pesquisador; `NULL` sem nada pendente. O Nest pergunta no login e em cada renovação de sessão (`DOCUMENTACAO_BACKEND.md`, seção 19).

---

### [03-E] CONTAGEM DE SEGUIDORES (`contar_seguidores_pesquisador`/`contar_seguidores_campanha`)

* `contar_seguidores_pesquisador(p_id INT)` / `contar_seguidores_campanha(p_id INT) RETURNS INT`: só o número agregado.
* **Por que função, e não policy:** `pol_seg_pesq_select`/`pol_seg_campanha_select` (`04`) só liberam as linhas de "quem eu sigo". A RLS filtra **linha**: liberar a contagem pela policy exporia também quem segue. A função conta tudo e devolve só o total (contagem pública, identidade privada, como Catarse e Experiment fazem com apoiadores).
* **`contar_aceites_termo(id)`**, o mesmo padrão: soma os aceites do cadastro (`usuario_termo`) e das contribuições (`aceite_termo_contribuicao`) e devolve só o número, para a tela de Termos saber se uma versão ainda pode ser editada. Pela RLS, o aceite de contribuição só apareceria para quem vê dado sensível de contribuição.
* `GRANT EXECUTE` explícito para o `app_nestjs` (`06`): são chamadas direto pela aplicação.

### [03-E-1] CRIAR CAMPANHA PARA OUTRO (`criar_campanha_para_outro`) e [03-E-2] FORÇAR EXCLUSÃO (`forcar_exclusao_campanha`)

Duas ferramentas do Campo de Testes (`nest/src/30-campo-testes`, só fora de produção):
* **`criar_campanha_para_outro`:** `pol_campanha_insert` exige `id_usuario = id_usuario_atual()` e pesquisador ativo; esta função cria em nome de um pesquisador escolhido, exigindo `campanha_criar_para_outro`. Continua exigindo pesquisador ATIVO (conferido aqui, em vez da RLS). Prazo, meta e limite de campanhas simultâneas não são repetidos: as triggers do `05` rodam igual por baixo.
* **`forcar_exclusao_campanha`:** exclui uma campanha em qualquer status, exigindo `campanha_excluir_forcado` (nunca `campanha_editar`: um papel com permissão de editar não ganha este poder destrutivo de brinde). O `DELETE` normal (`pol_campanha_delete`) continua liberando só `rascunho`, a proteção certa para campanha real.
* No banco de produção, o bloco "modo produção" tira essas permissões do admin ([07-B]).

---

### [03-O] OPERAÇÕES DE AUTENTICAÇÃO

* **Por que existem:** colunas como `email_verificado`, `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em`, `ultimo_login_ip` e `deletado` são escritas legitimamente pelo mesmo `app_nestjs` que atende "editar meu perfil", e nenhuma lista de colunas separa os dois casos. Com `UPDATE` direto, um usuário comum poderia forjar a própria verificação de e-mail, limpar o próprio bloqueio ou "ressuscitar" a própria conta excluída.
* **Solução:** essas colunas ficam fora do `GRANT UPDATE` de `usuario` (`06`, [06-D]), que tem só `nome`, `id_imagem_perfil` e `senha_hash`. Elas só mudam por estas funções `SECURITY DEFINER`, cada uma um ponto único, nomeado e auditável:

  | Função | O que muda | Regra |
  |---|---|---|
  | `confirmar_email_por_token(p_token_hash)` | `email_verificado = TRUE` | Acha o dono pelo token (`verificacao_email`, confere validade e uso): o token **é** a autorização. Devolve `BOOLEAN`. |
  | `registrar_falha_login(p_id_usuario)` | `tentativas_login_falhas++`, `bloqueado_ate` | Bloqueia ao chegar em `limite_tentativas_login` (5) por `bloqueio_login_minutos` (15), os dois configuráveis. **Sem autorização de propósito** (ver abaixo). |
  | `liberar_bloqueio_login(p_id_usuario)` | zera o bloqueio | Exige `usuario_desbloquear` (suporte e admin). |
  | `registrar_login_sucesso(p_id_usuario, p_ip)` | `ultimo_login_em`, `ultimo_login_ip`, zera as falhas | **Sem autorização de propósito.** `p_ip` é `TEXT` na assinatura só para evitar ambiguidade de tipo no `GRANT EXECUTE`. |
  | `excluir_conta_usuario(p_id_usuario)` | `deletado = TRUE`, `deletado_em`, `deletado_por` | A própria pessoa (`p_id_usuario = id_usuario_atual()`) ou quem tem `usuario_excluir` (só o admin: exclusão é auto-serviço do titular; o suporte abre chamado, não executa). Mão única: não há função para desfazer. Recusa conta com campanha ativa (91031) e o último administrador (91030). |
  | `registrar_exportacao_dados(p_id_usuario)` | uma linha `EXPORT` em `log_auditoria` | Rastro da exportação de dados (RF-016, LGPD art. 18). O `app_nestjs` não tem `INSERT` no log; a função abre só esta linha. `p_id_usuario` é sempre a conta logada (a rota não aceita id). |
  | `redefinir_senha_por_token(...)` | `senha_hash`, zera o bloqueio, encerra as sessões | O token de "Esqueci a senha" (`recuperacao_senha`) é a autorização, usado uma vez. |

* **`excluir_conta_usuario` em detalhe:**
  * **Campanhas:** recusa com campanha `ativo` (91031). Na exclusão, o rascunho e a campanha aguardando aprovação sem nunca ter sido avaliada são apagados; a que aguarda por reenvio de uma rejeitada volta a `rejeitado` (com uma linha em `historico_rejeicao`, "Reenvio cancelado: o pesquisador excluiu a própria conta.", sem admin) e segue o caminho normal da rejeição (ramo 9 da transição, [05-K-2]). As outras ficam como estão. **Por quê:** uma campanha ativa continuaria arrecadando com a dona excluída.
  * **Sessões:** encerra todas as sessões abertas da conta (`sessao.revogado_em`), como a suspensão ([03-N]).
  * **Sem login, recusa:** a comparação é `COALESCE(p_id_usuario = id_usuario_atual(), FALSE)`. Sem ninguém logado, `id_usuario_atual()` é `NULL`, e `IF NOT (NULL OR FALSE)` também seria `NULL`: a recusa não dispararia. O Nest já exige login, mas o banco é a última barreira. Suíte 27 do PGlite.
* **As que rodam sem sessão** (`registrar_falha_login`, `registrar_login_sucesso`) não têm como se autorizar: o login acontece antes de existir sessão. O id vem sempre do e-mail já consultado pelo backend, nunca do cliente. ⚠️ `registrar_falha_login` com um id qualquer seria negação de serviço (bloquearia a conta de alguém em 5 chamadas); por isso a função só é chamada pelo endpoint de login.
* **`perfil_pesquisador` tem o mesmo cuidado** (`06`, [06-D]): o `GRANT UPDATE` é por coluna, sem `score_atual`/`score_atualizado_em` (só mudam por `recalcular_score_pesquisador()`), sem `status_pesquisador` e sem as colunas de suspensão ([03-P]).
* **Exportação de dados:** o CPF sai mascarado (3 primeiros e 2 últimos dígitos), nunca em texto puro; mais o limite de 1 por hora por conta e `Cache-Control: no-store` (no Nest, `DOCUMENTACAO_BACKEND.md`, seção 7.4).

---

### [03-P] MODERAÇÃO SOBRE PESQUISADOR: SUSPENSÃO EM CASCATA (RF-084)

* **`suspender_pesquisador(p_id_usuario, p_ate TIMESTAMPTZ, p_motivo TEXT) RETURNS BOOLEAN`** (`SECURITY DEFINER`, exige `usuario_suspender`): marca `status_pesquisador = 'suspenso'`, grava `suspenso_ate`, `motivo_suspensao` (obrigatório) e `suspenso_por`, e na mesma transação aplica a cascata: campanhas `'ativo'` do pesquisador viram `'encerrado_moderacao'`, e as `'aguardando_aprovacao'` viram `'rejeitado'`. Devolve `FALSE` sem fazer nada se já estava suspenso.
  * Suspende só a **autoridade de pesquisador**: a conta continua entrando normalmente (diferente da suspensão de conta, [03-N]).
  * `CK_PERFIL_PESQUISADOR_SUSPENSAO`: as três colunas andam juntas (todas preenchidas ou todas `NULL`).
  * As colunas de suspensão e `status_pesquisador` ficam fora do `GRANT UPDATE` (sem isso, o próprio pesquisador se reativaria por fora da função), mas **dentro** do `GRANT SELECT` por coluna, para a leitura direta da suspensão (`GET .../suspensao`) funcionar.
* **`reativar_pesquisadores_vencidos() RETURNS INT`** (`05`, chamada por tarefa agendada a cada 15 minutos): reativa sozinho quem passou do prazo.
* **`reativar_pesquisador(p_id_usuario) RETURNS BOOLEAN`** (exige `usuario_suspender`): devolve `status_pesquisador = 'ativo'` e limpa as colunas de suspensão. **Não reabre nenhuma campanha:** quando a suspensão rodou, o dinheiro das campanhas encerradas já começou a andar (devolução no tudo-ou-nada, repasse no flexível); reabrir seria prometer o que a plataforma não cumpre. Só campanha nova é afetada.
* **Triggers continuam rodando:** `SECURITY DEFINER` desliga a RLS, não as triggers. `trg_campanha_valida_transicao` ([05-K-2]) tem um ramo próprio que libera exatamente `ativo → encerrado_moderacao` e `aguardando_aprovacao → rejeitado` quando o dono já está `'suspenso'` (valor que só existe via `suspender_pesquisador()`), porque quem suspende não precisa ter as permissões de campanha.
* **O dinheiro:** a cascata só muda o status. O destino do dinheiro sai de `destino_dinheiro_campanha()` e das tarefas automáticas do pagamento: campanha `encerrado_moderacao` devolve (`DOCUMENTACAO_FINANCEIRO.md`, seção 5).

### [03-P-1] CORRIGIR CPF (`corrigir_cpf_pesquisador`), [03-P-2] CRIAR PERFIL PARA OUTRO (`criar_perfil_pesquisador_para_outro`) e [03-P-3] ALTERAR PERFIL DE OUTRO (`alterar_perfil_pesquisador_de_outro`)

Três funções `SECURITY DEFINER` para agir sobre o perfil de **outra** pessoa, que a RLS não permite (`pol_perfil_insert` e `pol_perfil_update` só liberam o próprio dono). Cada uma com permissão própria (`07`):
* **[03-P-1] `corrigir_cpf_pesquisador`** (`perfil_pesquisador_corrigir_cpf`): o único caminho para mudar o CPF (RF-017, correção feita pelo suporte ou pelo admin, nunca pelo próprio pesquisador). `cpf_criptografado` fica fora do `GRANT UPDATE`.
* **[03-P-2] `criar_perfil_pesquisador_para_outro`** (`perfil_pesquisador_criar_para_outro`): o upgrade em nome de outra conta (T1 do Campo de Testes). O upgrade da própria conta não a usa.
* **[03-P-3] `alterar_perfil_pesquisador_de_outro`** (`perfil_pesquisador_alterar_de_outro`): vínculo, instituição e título de quem está sendo editado no Alterar Usuário. Sem ela, o `UPDATE` direto afetaria 0 linhas, em silêncio.
* As duas que recebem CPF o recebem **já cifrado e com o `cpf_hash`** (calculados no Nest, [01-D]): o banco não sabe cifrar nem calcular o HMAC, só grava o que o backend preparou, depois de conferir a permissão.

---

### [03-B] CONTROLE DE ACESSO GRANULAR (`tem_permissao`)

* **Autorização por capacidade:** em vez de conferir nomes de papel ("admin", "pesquisador"), a função confere uma permissão específica (ex.: `'campanha_aprovar'`). Papéis podem ser renomeados, divididos ou criados sem mexer em nenhuma policy (`04`) nem função. Ver Anexo B.
* **Papel suspenso não conta:** um vínculo `usuario_papel` com `suspenso_ate` no futuro não concede nenhuma permissão dele ([03-N]).
* **Anônimo:** com `id_usuario_atual()` em `NULL`, a função devolve `FALSE`.
* **`listar_papeis_usuario(p_id_usuario)`** (`SECURITY DEFINER`, `SETOF TEXT`): os **códigos** (`papel.codigo`) dos papéis de uma conta. O login e a renovação precisam deles na mesma requisição que cria a sessão, quando `id_usuario_atual()` ainda é `NULL` e a policy de `usuario_papel` barraria até o dono. Código, e não nome, porque o nome é renomeável.

---

### [03-M] DASHBOARD ADMIN: MÉTRICAS AGREGADAS (`contar_metricas_dashboard`)

* **Por que existe:** os cards da tela inicial do painel precisam de totais do sistema (usuários, pesquisadores, papéis, permissões, configurações, contas ativas, campanhas na fila). A RLS filtra linha e não é igual entre essas tabelas: um `COUNT` direto daria um número diferente para cada pessoa logada.
* **`SECURITY DEFINER`, `STABLE`**, como as contagens de [03-E]: devolve só números, nunca linhas.
* **Permissão dentro da função:** começa com `IF NOT public.tem_permissao('relatorio_visualizar') THEN RAISE ... ERRCODE '92011'` (o Nest devolve 403). Como ela desliga a RLS, sem isso qualquer conta logada leria as métricas.
* **Contas ativas = pessoas, não sessões:** `sessoes_ativas` conta pessoas distintas (`count(DISTINCT id_usuario)`) com login ou renovação dentro de `configuracoes.dashboard_sessao_ativa_minutos` (30): a mesma pessoa em dois aparelhos conta uma vez. O nome da coluna ficou `sessoes_ativas` para não mudar o campo que o React lê.
* **Campanhas na fila com pesquisador de score baixo** (`campanhas_para_revisao_score`, parte do RF-084): campanha `aguardando_aprovacao` cujo pesquisador está abaixo de `score_minimo_campanha` (`fn_precisa_revisao_score`, [05-I-1]). Só um sinal para o admin revisar com mais cuidado; nunca bloqueia. A função é **plpgsql** porque `fn_precisa_revisao_score` mora no `05`, que roda depois, e o plpgsql só confere o corpo na primeira chamada.
* **Uma função devolvendo `TABLE`:** o Nest pede todos os números juntos, numa ida só ao banco. Mudar o tipo de retorno exige `DROP FUNCTION` antes.

---

### [03-N] MODERAÇÃO SOBRE CONTA: SUSPENSÃO DE USUÁRIO E DE PAPEL

* **Suspensão de conta:** `usuario.suspenso_ate`, `motivo_suspensao` e `suspenso_por`, que andam juntas (`CK_USUARIO_SUSPENSAO`). É barrada no **login** e na **renovação** da sessão (`3-auth`), não na RLS.
  * **Conceito diferente de `bloqueado_ate`** (bloqueio automático por senha errada, [03-O]): na mesma coluna, `liberar_bloqueio_login()` apagaria uma suspensão sem querer, e um login bem-sucedido a reverteria.
  * **Caso-limite:** um token de acesso emitido pouco antes da suspensão vale até expirar (15 minutos); a renovação já é recusada.
* **Suspensão de papel:** `usuario_papel.suspenso_ate` (`NULL` = valendo). Melhor que apagar o vínculo: guarda quando o papel foi dado e volta sozinho no prazo. `tem_permissao()` ignora o papel suspenso.
* **Funções (`SECURITY DEFINER`):**
  * `suspender_usuario(p_id_usuario, p_ate, p_motivo)` / `revogar_suspensao_usuario(p_id_usuario)`: exigem `usuario_suspender`; ninguém suspende a própria conta (92027) nem o último administrador (91030).
  * `suspender_papel_usuario(p_id_usuario, p_id_papel, p_ate, p_motivo)` / `revogar_suspensao_papel_usuario(p_id_usuario, p_id_papel)`: exigem `papel_gerenciar` (decisão de RBAC, não de moderação de conta). O motivo é obrigatório (RF-118).
  * A data final precisa estar no futuro (90023). "Reduzir a pena" é chamar a suspensão de novo com uma data mais próxima: a função sobrescreve.
* **O sistema nunca fica sem admin:** `fn_eh_ultimo_admin_ativo()` diz se a conta é a única com o papel admin valendo agora; com ela, `suspender_usuario()`, `suspender_papel_usuario()` (no papel admin), `excluir_conta_usuario()` e a trigger `trg_usuario_papel_protege_ultimo_admin` (no `DELETE` de `usuario_papel`) recusam com 91030. **Caso-limite:** "valendo agora" ignora papel suspenso e conta suspensa ou excluída; com dois admins em que um está suspenso, o outro conta como o último.
* **Suspender a conta encerra as sessões dela** (`sessao.revogado_em`); sem isso, a sessão aberta continuaria renovando sozinha por até 30 dias. A suspensão de um **papel** não encerra sessão: a conta continua entrando, só perde o que aquele papel dava.
* **Prazos configuráveis:** `configuracoes.suspensao_usuario_opcoes_dias` (`'1,3,7,30'`) alimenta o seletor de dias no painel.

---

## 04. ROW LEVEL SECURITY E POLÍTICAS DE ACESSO (`04_rls_policies.sql`)

> **Convenção de performance: dentro de policy, `(SELECT public.tem_permissao('x'))` e `(SELECT public.id_usuario_atual())`, nunca a chamada solta.** Sem o `SELECT`, o Postgres avalia a função **uma vez por linha**; com ele, o `SELECT` sem dependência da linha vira um *InitPlan* e roda **uma vez por comando** (o truque que o Supabase recomenda para `auth.uid()`). Medido no PGlite com funções que contam chamadas: `SELECT * FROM log_auditoria` com 304 linhas chama cada função 1 vez (sem o truque, 304); somando 8 listagens do admin, `tem_permissao` cai de 385 chamadas para 6. Quem vê o quê é idêntico com e sem o `SELECT`. No volume do TCC a diferença não se percebe; a convenção existe para policy nova nascer certa.

### Visão Geral de Arquitetura

O `04_rls_policies.sql` é a defesa em nível de linha (*Row Level Security*, RLS). Todas as tabelas têm RLS ativada e todas, menos uma, a têm **forçada**. A exceção é `log_auditoria`, só ativada de propósito: quem grava nela são funções `SECURITY DEFINER` e não existe policy de `INSERT`, então forçar a RLS bloquearia o próprio log ([04-L]).

#### Princípios
1. **[04-A] `ENABLE` + `FORCE ROW LEVEL SECURITY`:** o `FORCE` faz até o dono da tabela ficar sujeito às regras.
2. **`app_nestjs` sem `BYPASSRLS`:** a aplicação conecta por um papel sem esse atributo, então toda instrução (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) é filtrada pela sessão do usuário (`public.id_usuario_atual()`).

   > 📌 **O que é `BYPASSRLS`.** RLS é um recurso nativo do Postgres: numa tabela com RLS, toda instrução é filtrada pelas policies (`CREATE POLICY`), não importa quem mandou. `BYPASSRLS` é um **atributo de papel** que faz o Postgres ignorar esse filtro por completo: uma chave mestra.
   >
   > **Não é o mesmo que superusuário** (`rolsuper`), embora todo superusuário também passe por cima da RLS. O papel `postgres` do SQL Editor do Supabase tem `rolsuper = false` e `rolbypassrls = true`: o Supabase não entrega o superusuário do servidor, mas entrega ao dono do projeto um papel que administra o próprio banco.
   >
   > **Por que o `app_nestjs` nunca pode ter esse atributo:** é isso que torna a RLS o ponto de autorização **real** do sistema. Com ele, o app leria e gravaria qualquer linha de qualquer tabela, não importa quem estivesse logado. Também por isso **toda função `SECURITY DEFINER` é criada pelo SQL Editor**, nunca pela conexão do `app_nestjs`: quem faz a função passar por cima da RLS é o **dono** dela; criada pelo app, ela nasceria com o dono errado e não passaria por cima de nada.
   >
   > **Por que o seed e qualquer script colado no SQL Editor rodam com `BYPASSRLS`:** o seed grava dados de demonstração em massa (campanhas de pesquisadores diferentes, contribuições, sessões, denúncias) sem nenhum usuário logado. Como quase todas as policies são `TO app_nestjs`, um papel sem `BYPASSRLS` receberia dezenas de erros de RLS; o bloco `DO $$` do começo do `01` detecta isso e para com uma mensagem única ([01-A]).
   >
   > **Regra prática:** o que é colado no SQL Editor passa por cima da RLS (seguro para seed, migração e criação de função); o que o Nest faz, pela conexão `app_nestjs`, nunca passa. Essa é a fronteira de segurança que sustenta todo o resto deste documento.
3. **Tabelas de autenticação** (`verificacao_email`, `recuperacao_senha`, `sessao`): são usadas antes de existir sessão (confirmar e-mail, "esqueci a senha", login, renovação), então não dá para filtrar por `id_usuario_atual()`. A policy é `FOR ALL TO app_nestjs USING (true)`: só garante que nenhum outro papel toque nelas; quem confere a posse do token (comparando o hash) é o Nest.

---

### Estrutura por Domínio de Dados

O arquivo segue os blocos do `01`.

#### [04-B] RBAC
* **Tabelas:** `papel`, `permissao`, `papel_permissao`.
* **Leitura pública** (`FOR SELECT USING (true)`), para `tem_permissao()` resolver as checagens sem bloqueio recursivo. Escrita: **[04-B-1]** `papel_permissao` (a matriz Papel × Permissão) exige `papel_gerenciar`; **[04-B-1b]** em `papel`, só o `UPDATE` de nome e descrição (`pol_papel_update`, [01-B]); `permissao` e a criação de papel novo não têm escrita pela aplicação (mexem no catálogo, decisão maior que conceder uma combinação).

#### [04-C] CONFIG
* **Tabelas:** `configuracoes`, `area_conhecimento`, `tipo_link`, `motivo_denuncia`, `arquivo`.
* **Leitura pública** dos catálogos e dos arquivos. Escrita exige a permissão do catálogo (`area_conhecimento_gerenciar`, `tipolink_gerenciar`, `motivo_denuncia_gerenciar`, `configuracao_gerenciar`).
* **[04-C-1] `configuracoes`:** linha do sistema (`id_usuario IS NULL`) só quem tem `configuracao_gerenciar` grava; linha de preferência, o próprio dono. `pol_config_select`: `(id_usuario IS NULL AND (publica = TRUE OR tem_permissao('configuracao_gerenciar') OR tem_permissao('relatorio_visualizar'))) OR id_usuario = id_usuario_atual()`: parâmetro interno só aparece para quem administra ou acompanha o sistema.
* **[04-C-2] `area_conhecimento`, [04-C-3] `motivo_denuncia` e `tipo_link`:** `INSERT`, `UPDATE` e `DELETE` com a permissão do catálogo. As FKs que apontam para eles não têm `CASCADE`: a policy libera a exclusão, mas o banco recusa (`23503`) se o item estiver em uso, e o Nest responde 409 dizendo onde e quantas vezes ele é usado (`DOCUMENTACAO_BACKEND.md`, seção 5.1).

#### [04-D] USUÁRIO
* **Tabelas:** `usuario`, `perfil_pesquisador`, `usuario_papel`, `termos_de_uso`, `usuario_termo`, `notificacao`, `verificacao_email`, `recuperacao_senha`, `sessao`, `seguir_pesquisador`.
* **[04-D-1] `verificacao_email`, `recuperacao_senha`, `sessao`:** `FOR ALL TO app_nestjs USING (true)` (ver o princípio 3, acima). ⚠️ Em `sessao`, quem decide de quem é a sessão é o Nest (confere o segredo do token e o dono); uma regra por dono, com exceção para login e renovação, fica para o deploy, junto do cookie e do CORS.
* **[04-D-2] `usuario` (INSERT) com `WITH CHECK (true)`:** o cadastro grava a conta antes de existir sessão. E-mail duplicado é barrado pelo `UNIQUE`; formato e força de senha, pelo Nest.
* **`usuario` (SELECT):** `pol_usuario_select` libera `deletado = FALSE` para qualquer sessão (o login precisa achar a conta antes de existir alguém logado); quem decide a listagem de usuários é a permissão no Nest (`usuario_visualizar_sensivel` ou `usuario_visualizar_atendimento`).
* **[04-D-3] `perfil_pesquisador` (INSERT):** o upgrade da própria conta. O upgrade em nome de outra pessoa é por função ([03-P-2]).
* **[04-D-4] `usuario_papel` (DELETE):** o painel revoga um papel atribuído.
* **[04-D-4b] `usuario_papel` (SELECT):** `id_usuario = id_usuario_atual() OR tem_permissao('papel_gerenciar') OR tem_permissao('relatorio_visualizar')`. Cada pessoa vê os próprios vínculos (o login e a Minha Conta precisam); a administração vê os de todos (coluna "papel" da lista de Usuários). Ler não exige a permissão de alterar. Suíte 11 do PGlite (admin, pesquisador, moderador e anônimo).
* **[04-D-5] `notificacao`:** `INSERT` e `UPDATE` abertos ao `app_nestjs` (quem cria uma notificação quase nunca é o destinatário, e o envio roda sem usuário logado). O `SELECT` é restrito: o dono da notificação, `usuario_visualizar_sensivel` ou `notificacao_processar` (a permissão de quem lê a fila de envio).
* **[04-D-6] `perfil_pesquisador` (SELECT):** `usuario_visivel(id_usuario)` ([03-D]): público, mas some com a conta excluída.

#### [04-E] CAMPANHA
* **Tabelas:** `campanha`, `atualizacao_campanha`, `comentario`, `denuncia`, `recompensa`, `seguir_campanha`, `solicitacao_encerramento`, `historico_rejeicao`, `repasse`.
* **Campanha visível ao público só nos status publicados** (`ativo`, `sucesso`, `nao_atingido`, `encerrado`); o dono vê as próprias em qualquer status, e quem tem `relatorio_visualizar` vê todas.
* **[04-E-1] `campanha` (UPDATE):** o dono, `campanha_editar`, `campanha_aprovar` ou `campanha_rejeitar`. A RLS não distingue colunas nem transições; quem decide qual transição de status cada permissão abre é a trigger `trg_campanha_valida_transicao` ([05-K-2-C], 92001), e quais campos ficam travados, a de congelamento ([05-K-2-D]).
* **[04-E-8] `campanha` e `atualizacao_campanha` (INSERT):** exigem pesquisador **ativo** (`EXISTS (... perfil_pesquisador ... status_pesquisador = 'ativo')`), a mesma regra do comentário: pesquisador suspenso não cria campanha nem publica atualização.
* **Encerrar uma campanha antes do prazo** tem três caminhos, todos com motivo registrado e nenhuma permissão de "encerrar direto": o pedido do dono decidido pelo admin (`solicitacao_encerramento_decidir`, [05-K-2-H]), o "Cancelar o projeto" do dono quando não há dinheiro em jogo, e o encerramento por moderação a partir de uma denúncia ([05-K-2-G]). **Por quê:** encerrar mexe com dinheiro de quem apoiou e precisa ser auditável, como no Catarse e no Experiment.
* **[04-E-2] `atualizacao_campanha` (UPDATE):** o dono edita a própria atualização; ocultar a de outra pessoa exige `atualizacao_moderar`.
* **[04-E-3] `comentario` (SELECT):** o comentário **endossado** é público, desde que a campanha seja visível para quem lê (`EXISTS (SELECT 1 FROM campanha WHERE id_campanha = comentario.id_campanha)`, avaliado com a regra de leitura de `campanha`); o não endossado e o ocultado só para o autor, o dono da campanha e a moderação (RF-098).
  * **Por que o `EXISTS`:** sem ele, os comentários endossados de uma campanha encerrada pela moderação continuariam saindo pela API, embora a campanha suma da página pública. **Caso-limite:** vale qualquer status que a leitura de campanha esconda; mudou a leitura de campanha, muda junto. Suíte 43 do PGlite.
* **[04-E-4] `comentario` (UPDATE):** liberado ao autor, ao dono da campanha e a quem tem `comentario_moderar`. Como a RLS não distingue colunas, três triggers ([05-K-3]) dizem quem muda o quê: só o autor edita o texto (92007); só o dono da campanha ou a moderação mexe no endosso (92008); e só quem tem `comentario_moderar` reverte um comentário ocultado (`ativo: FALSE → TRUE`, 92005). O autor continua podendo ocultar o próprio comentário. Contestar uma moderação acontece fora do sistema (suporte), como no Catarse e no Experiment.
* **[04-E-5] `seguir_campanha` (DELETE):** deixar de seguir.
* **[04-E-6] `historico_rejeicao`:**
  * **INSERT:** `tem_permissao('campanha_rejeitar') AND id_admin = id_usuario_atual()`: só quem pode rejeitar grava, assinando com o próprio nome. **Por quê:** o número de rejeições decide quantos reenvios restam; uma rejeição forjada prejudicaria o pesquisador. **Caso-limite:** a cascata de `suspender_pesquisador()` grava por função `SECURITY DEFINER`, sem passar pela policy.
  * **SELECT:** quem tem `campanha_rejeitar`, `relatorio_visualizar` ou o dono (`id_usuario_dono`, gravado na linha), para o pesquisador ver o motivo pela própria plataforma (RF-070).
  * **Imutável:** sem policy de `UPDATE` ([05-K-2-B]).
* **[04-E-7] `repasse`:** sem policy de `INSERT` nem de `UPDATE`. Toda escrita é das funções `SECURITY DEFINER` de `05` (`criar_repasse_campanha`, `atualizar_status_repasse` etc.), que não dependem de policy nem de `GRANT`.

#### [04-F] LINK
* **Tabelas:** `link_academico`, `link_atualizacao`, `link_recompensa`.
* **[04-F-2] `link_academico` (SELECT):** `usuario_visivel(id_usuario)` ([03-D]). Escrita: o próprio pesquisador.
* **[04-F-1] `link_recompensa`:** quem **ganhou** a recompensa lê o link; editar e remover é só do dono da campanha ou de `campanha_editar`, porque o link é fornecido por quem oferece a recompensa.

#### [04-G] ARQUIVO
* **Tabelas:** `arquivo_atualizacao`, `arquivo_recompensa`.
* **Vínculo de mídia** restrito ao dono da campanha ou à administração. **[04-G-1] `arquivo_recompensa` (UPDATE):** trocar a imagem principal da recompensa. A posse do arquivo é conferida por trigger ([05-G]).

#### [04-H] CONTRIBUIÇÃO
* **Tabelas:** `contribuicao`, `auditoria_financeira`, `contribuicao_recompensa`, `aceite_termo_contribuicao`.
* **Leitura:** quem contribuiu vê as próprias (com conta, por `id_usuario`; sem conta, pelo `token_sessao` da contribuição, lido de `app.token_sessao_atual`); `contribuicao_visualizar_sensivel` vê todas; o dono da campanha vê o resumo pela função `resumo_contribuicoes_campanha` (92038).
* **[04-H-0] `contribuicao` sem policy de `UPDATE`:** o `app_nestjs` não tem `UPDATE` na tabela ([06-H]) e toda mudança passa por `atualizar_status_contribuicao()` e pelas outras funções `SECURITY DEFINER` de `05`. **Por quê:** uma policy aberta "só como documentação" convidaria a devolver o `GRANT` e reabrir a fraude de confirmar a própria contribuição por `UPDATE` direto. **Caso-limite:** se um dia o Nest precisar alterar uma coluna de `contribuicao` direto, vem um `GRANT` por coluna e uma policy com regra de verdade.
* **[04-H-1] `auditoria_financeira`:** só leitura (`pol_auditoria_select`): quem contribuiu vê as linhas da própria contribuição, e `auditoria_financeira_visualizar` vê todas. Sem policy nem `GRANT` de escrita: toda linha é gravada pelas funções `SECURITY DEFINER` de `05`.
* **[04-H-2] `aceite_termo_contribuicao` (SELECT):** quem contribuiu sem conta relê o próprio aceite pelo mesmo `token_sessao` com que o gravou.

#### [04-I] SCORE
* **Tabelas:** `score_config`, `score_rotulo`, `score_pesquisador`.
* **Leitura pública**, com `score_pesquisador` passando por `usuario_visivel()` (some com a conta excluída). Escrita de pesos e faixas exige `score_editar` (só o admin; o revisor só lê).
* **[04-I-1] e [04-I-2] `score_config`, `score_rotulo` (INSERT):** criar dimensões e rótulos pelo painel, com `score_editar`.
* **[04-I-3] `score_pesquisador` (SELECT) é público de propósito.** A pontuação pública é a base de uma consulta pública de reputação de pesquisadores: sinal de confiança para quem apoia e incentivo para o pesquisador manter a pontuação em dia.
  * **Por quê, e o cuidado com a LGPD:** é um juízo automatizado sobre pessoa identificada. O pesquisador pode contestar a pontuação que vem de uma denúncia ([05-K-2-J]), e o Termo do Pesquisador diz que ele pode pedir a revisão de uma pontuação pelo suporte (LGPD, art. 20).
  * `perfil_pesquisador.score_atual`/`score_atualizado_em` estão no `GRANT SELECT` (a página pública de perfil não precisa de `JOIN`), já que a tabela de origem é pública.

#### [04-L] LOG DE AUDITORIA
* **`log_auditoria`:** só tem policy de `SELECT` (`pol_log_auditoria_select`): quem tem `log_visualizar` vê tudo; sem ela, cada pessoa vê só as linhas de que é autora. Sem policy de escrita: o `app_nestjs` só tem `GRANT SELECT` ([06-L]), e quem grava é a trigger `fn_log_auditoria()` ([05-L]).

---

## 05. MOTOR DE SCORE + REGRAS DE NEGÓCIO (`05_regras_negocio.sql`)

### Visão Geral

O arquivo mais denso do banco (a contagem exata de funções e triggers está em "Como conferir este inventário"). Concentra toda regra que um `CHECK` simples não alcança, porque depende de consultar outra tabela (ex.: esta campanha está ativa?) ou de recalcular algo sozinho quando um dado relacionado muda. Usa as letras `I` (score, [05-I-1] a [05-I-4]), `K` (regras transversais, [05-K-1] a [05-K-3]), `G` (arquivo), `Q` (notificação) e `L` (log).

> 📌 **O motor de score mora no banco.** A pontuação de cada pesquisador é calculada a partir dos dados reais (campanhas, denúncias, links, perfil) e guardada em cache (`perfil_pesquisador.score_atual` e `score_pesquisador`), atualizada por trigger sempre que um dado relevante muda: vale para qualquer registro novo, sem o backend precisar lembrar de chamar nada. Todos os pesos vêm de `score_config.peso`; editar um peso no painel recalcula o score de todo mundo.

**Regras gerais deste arquivo:**
* **Limite técnico na constraint (`01`), regra de negócio na trigger, lendo `configuracoes`:** mudar uma política (prazo, meta mínima, limites de texto, de links, de campanhas simultâneas, de endossos, de denúncias) é um `UPDATE` numa linha, não uma migração.
* **`SECURITY DEFINER` desliga a RLS, não as triggers:** uma função privilegiada continua passando por todas as validações por baixo.
* **Conferência agregada enxerga o banco inteiro:** funções que contam ou somam (completude do orçamento e do cronograma, total arrecadado, seguidores) são `SECURITY DEFINER`. Sem isso, o resultado dependeria do que a sessão de quem chama consegue ver linha a linha, e uma permissão sem `relatorio_visualizar` veria 0 itens e não aprovaria nada, sem erro nenhum.
* **Idempotência:** toda trigger tem `DROP TRIGGER IF EXISTS` logo antes do `CREATE TRIGGER`.
* **Ordem das triggers:** quando várias rodam no mesmo momento, o Postgres as executa em ordem alfabética do nome. Onde a ordem importa, o nome foi escolhido para isso (ex.: o endosso calcula a ordem antes de a trigger de limite conferir).

---

### [05-I-1] Score - Helpers

* **`fn_precisa_revisao_score(p_id_usuario)`** devolve `TRUE` se o `score_atual` do pesquisador estiver abaixo de `configuracoes.score_minimo_campanha`. **Não existe trigger de bloqueio:** é só o sinal que a fila de aprovação usa para destacar a campanha que merece revisão mais cuidadosa. **Por quê:** nem o Catarse nem o Experiment bloqueiam criar campanha por pontuação; quem filtra a confiança é a aprovação feita por uma pessoa.
* **`fn_fator_subitem(p_id_pai, p_nome)`:** peso do item / soma dos itens ligados da mesma dimensão (0 se desligado, nunca `NULL`); ver [05-I-2].

---

### [05-I-2] Score - Cálculo das Dimensões

**Em palavras simples:** a pontuação de 0 a 100 soma quatro dimensões. O peso de cada dimensão é o máximo de pontos dela; cada item de dentro vale a sua **parte** desse máximo (`fn_fator_subitem`). Mudar o peso de uma dimensão não exige mexer nos itens, e desligar um item passa a parte dele para os outros. O administrador muda pesos e faixas em Configurações > Pontuação (Score).

Quatro funções puras (`STABLE`), uma por dimensão, cada uma recebendo `p_id_usuario` e devolvendo um inteiro entre 0 e o peso da dimensão:

| Função | Dimensão | Como calcula |
|---|---|---|
| `calcular_score_perfil_academico` | Perfil Acadêmico Declarado | Soma as partes de: link Lattes, link ORCID, "outro link" (qualquer `tipo_link` que não seja Lattes nem ORCID, reconhecido por `tipo_link.codigo`: GitHub e qualquer tipo novo contam sozinhos; conta uma vez, com um ou com vários), instituição preenchida e título informado. Instituição e título vêm de campos do perfil, não de link. |
| `calcular_score_historico` | Histórico na Plataforma | **Conclusão** = sucesso / (sucesso + não concluídas) × parte da conclusão. **Não concluída:** `nao_atingido`, ou `encerrado` com pedido aprovado **pelo administrador** (havia dinheiro em jogo). **Fora da conta:** o "Cancelar o projeto" (sem dinheiro em jogo), o `encerrado_moderacao` (já pesa na reputação; contar nos dois lugares seria punição dupla) e o que ainda não terminou. **Aprovação** = aprovadas / (aprovadas + rejeitadas definitivas) × parte da aprovação; rejeitada definitiva é a que está no `historico_rejeicao` e já não existe (excluída sem nunca ter sido aprovada, [05-K-2-B]). |
| `calcular_score_atualizacao` | Atualização da Campanha | **Regularidade** = atualizações realizadas / esperadas; **tempestividade** = % de campanhas em dia; a soma vezes o peso da dimensão. Só campanhas já iniciadas (`ativo`, `sucesso`, `nao_atingido`, `encerrado`) e só atualizações ativas (`ativo = TRUE`: a ocultada pela moderação não conta). Esperadas = duração em meses × `score_frequencia_esperada_mensal`. |
| `calcular_score_reputacao` | Reputação da Comunidade | Duas partes, **perfil** e **campanhas**, cada uma caindo em linha reta até zerar em `configuracoes.score_denuncias_para_zerar` denúncias procedentes. Só denúncia `resolvida` (procedente) conta. A parte "perfil" conta denúncias; a parte "campanhas" conta **campanhas** com denúncia procedente (`count(DISTINCT id_campanha_alvo)`). |

* **Sem desconto fixo por "abandono":** não bater a meta já baixa a taxa de conclusão na proporção certa, enquanto um desconto fixo pesaria igual para quem tem 1 ou 20 campanhas. Kickstarter e Catarse não punem quem não bate a meta nem quem cancela; mostram o histórico e deixam o apoiador julgar.
* **A reputação pune a falta, não o número de quem a viu:** várias denúncias procedentes contra a mesma campanha tiram pontos uma vez só (padrão de moderação: a penalidade é por infração confirmada). Fraude de campanha pesa mais que a do perfil porque atinge quem apoia.
* **Casos-limite aceitos** (pontos para um debate futuro): quem encerra antes do prazo com contribuição, por motivo legítimo, perde igual a quem não bateu a meta; o "Cancelar o projeto" pode ser usado para fugir de um "não atingido" que se aproxima, desde que ninguém tenha pago (sem contribuição ninguém foi lesado); quem não bate a meta várias vezes só vê a taxa cair. Pesquisador sem campanha fica com a parte "campanhas" inteira. Gravidade por motivo de denúncia não existe (a campanha grave já é encerrada na hora pela moderação). Suítes 38 e 45 do PGlite.

---

### [05-I-3] Score - Orquestração

* **`recalcular_score_pesquisador(p_id_usuario)`:** chama as quatro funções, soma, escolhe o rótulo em `score_rotulo` (`ORDER BY score_minimo`, para faixas vizinhas darem sempre o mesmo resultado), grava em `score_pesquisador` (`ON CONFLICT ... DO UPDATE`) e atualiza o cache em `perfil_pesquisador.score_atual`. `SECURITY DEFINER`: precisa escrever no perfil de qualquer pesquisador (ex.: quando a moderação resolve uma denúncia contra outra pessoa).
* **`recalcular_todos_os_scores()`:** recalcula todo mundo. Disparada quando um peso ou uma faixa muda.

---

### [05-I-4] Score - Triggers de recálculo e de validação

Cada trigger observa uma tabela que alimenta alguma dimensão e recalcula só quem foi afetado:

| Tabela observada | Trigger | Quem é recalculado | Quando |
|---|---|---|---|
| `campanha` | `trg_campanha_recalcula_score` (INSERT), `_delete`, `_update` | o dono | INSERT e DELETE só se não for rascunho; UPDATE só quando muda `status`, `data_fim`, `aprovado_em` ou `id_usuario` |
| `denuncia` | `trg_denuncia_recalcula_score` | o pesquisador denunciado ou o dono da campanha denunciada | só quando a denúncia entra em `resolvida` ou sai dela |
| `atualizacao_campanha` | `trg_atualizacao_recalcula_score` | o dono da campanha | só quando muda `ativo` ou `id_campanha` (editar o texto não recalcula) |
| `link_academico` | `trg_link_recalcula_score` | o dono do link | só quando muda o tipo ou o dono (trocar a URL ou o rótulo não recalcula) |
| `perfil_pesquisador` | `trg_perfil_recalcula_score` (INSERT), `trg_perfil_update_recalcula_score` | o próprio perfil | UPDATE só quando muda `vinculo_institucional` ou `titulo_academico` |
| `score_config` | `trg_score_config_recalcula_todos` (`FOR EACH STATEMENT`) | todos | INSERT, DELETE, mudança de peso ou de `ativo` |
| `score_rotulo` | `trg_score_rotulo_recalcula_todos` | todos (o rótulo) | qualquer mudança de faixa |

* **Por que tantos `WHEN`:** o próprio recálculo grava em `perfil_pesquisador.score_atual`; sem o `WHEN`, essa gravação dispararia a trigger de novo (laço infinito). E toda contribuição confirmada faz `UPDATE campanha` (o total arrecadado): sem o `WHEN`, cada doação recalcularia as quatro dimensões à toa, segurando a linha da campanha. O Postgres não aceita `TG_OP` dentro de `WHEN`, por isso INSERT, DELETE e UPDATE são triggers separadas.
* **`FOR EACH STATEMENT` em `score_config`:** a tela salva todos os pesos num comando só, e o recálculo roda uma vez (com `FOR EACH ROW`, editar os quatro pesos raiz recalcularia a plataforma quatro vezes).
* **Validações no `COMMIT` (`CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED`):** `trg_score_config_soma_pesos` (os pesos raiz ativos somam exatamente 100, ao inserir, alterar ou apagar; 90017) e `trg_score_rotulo_cobertura` (as faixas ativas cobrem 0 a 100 sem buraco, comparando cada faixa com a próxima por `LEAD()`; 90018). Peso negativo é recusado (90030), e dimensão ligada sem nenhum item ligado com peso maior que zero também (90031), porque nunca pontuaria. Diferidas porque editar várias linhas na mesma transação passa por estados intermediários inválidos. O Postgres só aceita `CONSTRAINT TRIGGER` por linha; as funções ignoram `NEW`/`OLD` e reconferem a tabela inteira.
* **A tela do score edita só peso, ligado e faixas:** `GRANT UPDATE (peso, ativo)` em `score_config` e `GRANT UPDATE (rotulo, descricao, score_minimo, score_maximo)` em `score_rotulo` (`06`). `nome` e `id_pai` ficam fora: são a estrutura que as funções procuram pelo nome; renomear um item faria a parte dele sumir sem erro. **Caso-limite:** salvar recalcula todos os pesquisadores dentro da requisição; com milhares de pesquisadores pode levar alguns segundos. A tela não cria nem apaga item nem faixa.
* **Pesos e faixas entram no log de auditoria** (`trg_log_auditoria_score_config`, `trg_log_auditoria_score_rotulo`): mudar um peso altera o score público de todos.

---

### [05-K-1] Regras Transversais - Integridade e Escopo

> 📌 **Mensagens sem palavra técnica:** as mensagens das faixas 90 a 93 chegam à tela como estão, então não citam nome de tabela, de coluna nem de chave de `configuracoes`; dinheiro aparece como "R$ 500,00" e datas no formato brasileiro.

| Tabela | Trigger (função) | Regra |
|---|---|---|
| `contribuicao_recompensa` | `trg_contrib_recompensa_valida` (`trg_valida_contribuicao_recompensa`) | A recompensa precisa ser da **mesma campanha** da contribuição (a FK só garante que ela existe em algum lugar). |
| `link_academico`, `link_atualizacao`, `link_recompensa` | `trg_link_*_valida_tipo` (`trg_valida_escopo_tipolink`) | O tipo de link precisa estar liberado para aquela tabela (`permite_perfil`, `permite_atualizacao`, `permite_recompensa`), e o endereço precisa ser do domínio e do formato do tipo (90002, 90024, 90025). Só pesquisador tem link acadêmico (92026). Uma função só, que escolhe a coluna por `TG_TABLE_NAME`. |
| `link_academico` | `trg_link_academico_valida_limite` (`fn_valida_limite_link_academico`, `BEFORE INSERT`) | No máximo `configuracoes.limite_links_academicos_perfil` (5) links por pesquisador. Só no `INSERT`: editar um link não aumenta a contagem. |
| `campanha`, `atualizacao_campanha`, `denuncia`, `solicitacao_encerramento` (×2), `recompensa`, `orcamento_campanha`, `marco_cronograma` | `trg_*_valida_limite_texto` (`fn_valida_limite_texto_livre`) | O limite de negócio de cada texto livre, lido de `configuracoes`. Uma função genérica: cada trigger passa a coluna e a chave por `TG_ARGV` (a coluna é lida por `to_jsonb(NEW) ->> coluna`). **Só vale quando o texto muda (90003):** rodando em todo `UPDATE`, baixar o limite pelo painel faria toda doação falhar (a soma do arrecadado faz `UPDATE campanha`) e pararia o encerramento das vencidas. |
| `campanha` | `trg_campanha_valida_area_nivel2` (+ `_update`) | A área precisa ser de nível 2, nunca uma grande área (90004). |
| `denuncia` | `trg_denuncia_valida_tipo_motivo` | O motivo precisa ser do tipo do alvo (motivo de campanha não serve a denúncia de perfil, e o contrário; 90005, 90006). Junto com `CK_DENUNCIA_ALVO_XOR` ([01-E]). |

---

### [05-K-2] Regras Transversais - Campanhas e Financeiro

> 📌 **Visão de ponta a ponta do dinheiro** (tarifa, destino no fim da campanha, repasse, devolução, validação de saque, parâmetros): `DOCUMENTACAO_FINANCEIRO.md`. Aqui ficam as regras do banco.

#### Transição de status da campanha (`fn_valida_transicao_campanha`, `trg_campanha_valida_transicao`)

Protege **quem** muda `status`, `aprovado_em` e `id_admin`. `pol_campanha_update` libera `UPDATE` ao dono, e o congelamento só protege a campanha depois de aprovada: sem esta trigger, o dono de uma campanha aguardando aprovação faria `status = 'ativo', aprovado_em = NOW(), id_admin = <ele mesmo>` e a campanha iria ao ar como se aprovada. Transições liberadas (a primeira que bater libera; qualquer outra levanta **92001**, com `origem -> destino` na mensagem):

1. Nenhum dos três campos sensíveis mudou.
2. `aguardando_aprovacao → ativo` por quem tem `campanha_aprovar`.
3. `aguardando_aprovacao → rejeitado` por quem tem `campanha_rejeitar`.
4. `ativo → encerrado` por quem tem `solicitacao_encerramento_decidir`.
5. Encerramento por prazo vencido, **autoverificável**: só com `data_fim <= NOW()` e o status novo batendo com arrecadado × meta (sucesso só se bateu, `nao_atingido` só se não). Impossível mentir o resultado, e não depende de permissão nem de "usuário de sistema".
6. Envio para aprovação (`rascunho` ou `rejeitado` → `aguardando_aprovacao`) por quem tem `campanha_editar` ou pelo próprio dono, se for pesquisador ativo (92009) e, no reenvio, dentro do prazo (91026). Reenvio esgotado barra qualquer perfil, inclusive o admin (91025).
7. Cascata da suspensão do pesquisador (RF-084), **autoverificável**: só se o dono está `'suspenso'` hoje, e só `ativo → encerrado_moderacao` ou `aguardando_aprovacao → rejeitado` ([03-P]).
8. Encerramento por moderação de denúncia (RF-108): `campanha_encerrar_moderacao` faz **só** `ativo → encerrado_moderacao` (escopo estreito: um moderador não vira aprovador por isso).
9. Conta do dono excluída (RF-016), **autoverificável**: só `aguardando_aprovacao → rejeitado`, com o dono já marcado como excluído (`excluir_conta_usuario()`, [03-O]).
10. "Cancelar o projeto" pelo dono (RF-064), **autoverificável**: `ativo → encerrado` só com o pedido aprovado sem admin que `encerrar_campanha_sem_contribuicao()` grava ([05-K-2-H]).

**Cada permissão abre só a sua transição:** ter uma delas nunca libera outra (ex.: `nao_atingido → sucesso` sem bater a meta).

#### Regras de campanha e de contribuição

| Tabela | Trigger (função) | Regra |
|---|---|---|
| `campanha` | `trg_congela_regras_campanha` (`fn_congela_regras_campanha`) | Depois da aprovação, recusa mudar meta, modelo, taxa, título, descrição, vídeo e área; `data_inicio` e `data_fim` só congelam quando a campanha começa de fato. A lista vem de `fn_campanha_campos_bloqueados` ([05-K-2-D]). |
| `campanha` | `trg_campanha_valida_prazo_negocio` (+ `_update`) | Duração entre `prazo_minimo_campanha_dias` e `prazo_maximo_campanha_dias` (15 a 60; 90012), contada em **dias de calendário** (`FLOOR`): a tela manda 00:00 do dia de início e 23:59:59 do dia de fim, no fuso de quem usa, e sem o `FLOOR` 60 dias de calendário contariam 60,99 e seriam recusados. |
| `campanha` | `trg_campanha_valida_meta_negocio` (+ `_update`) | Meta a partir de `meta_minima_campanha` (R$ 500,00; 90013). |
| `campanha` | `trg_campanha_limite_simultaneo` (`validar_limite_campanhas_pesquisador`) | No máximo `limite_campanhas_simultaneas` campanhas em andamento (aguardando aprovação ou ativas) por pesquisador (RF-029; 91018). Conta só quando a campanha **entra** nesses status (rascunho não conta, então o limite é cobrado no envio), com `pg_advisory_xact_lock` por pesquisador: sem o lock, dois envios ao mesmo tempo contariam 1 e passariam os dois. |
| `campanha` | `trg_campanha_valida_completude` (`fn_valida_completude_campanha`) | No envio, no reenvio e na aprovação: mínimo de itens de orçamento e de marcos, soma do orçamento **igual** à meta e `data_fim` no futuro (90009, 90010, 90011, 90015). O erro chega no envio, a quem pode consertar. `data_inicio` no passado é legítimo. O `WHEN` lista `rascunho` e `rejeitado` por nome, para não pegar a cascata de suspensão. |
| `campanha` | `trg_campanha_carimba_taxa` | Na aprovação, copia `taxa_plataforma_padrao` para `campanha.taxa_plataforma`, se não houver taxa própria (RF-036). |
| `campanha` | `trg_campanha_preenche_encerramento` | Grava `encerrado_em = NOW()` ao entrar num status terminal (`fn_status_terminal`). |
| `campanha` | `trg_campanha_carimba_envio_aprovacao` (+ `_update`) | Grava `enviado_aprovacao_em = NOW()` a cada entrada na fila de aprovação (envio ou reenvio); no `INSERT` ignora o valor enviado. É o "esperando há X dias" da fila ([05-K-2-K]). |
| `campanha` | `trg_campanha_valida_data_inicio_contra_marcos` | Um `PATCH` de `data_inicio` não pode passar da data de um marco já cadastrado (90008). |
| `campanha` | `trg_campanha_exige_historico_rejeicao` (`CONSTRAINT TRIGGER`, no `COMMIT`) | Toda rejeição, venha de onde vier, grava `historico_rejeicao` na mesma transação (91028). Sem isso, a campanha ficaria em reenvio infinito e nunca expiraria. |
| `orcamento_campanha` | `trg_orcamento_campanha_congela`, `trg_orcamento_campanha_valida_limite_max` | Congela na aprovação, sem exceção nem para o admin (91011); no máximo `orcamento_max_itens` itens (91012). |
| `marco_cronograma` | `trg_marco_cronograma_congela`, `trg_marco_cronograma_valida_data`, `trg_marco_cronograma_valida_limite_max` | Congela quando a campanha, já aprovada, começa de fato (91013); a data não pode ser anterior a `data_inicio` (pode passar de `data_fim`, ex.: divulgação do resultado; 90008); no máximo `cronograma_max_marcos` marcos (91014). |
| `atualizacao_campanha` | `trg_atualizacao_campanha_status` | Só se publica atualização em campanha `ativo`, `sucesso` ou `nao_atingido` (91019). Fase e formato são `NOT NULL` (RF-052). |
| `solicitacao_encerramento` | `trg_valida_transicao_solicitacao` | Sem `solicitacao_encerramento_decidir`, só a transição `pendente → cancelado` pelo dono (92002, 92003); aprovar ou rejeitar só pela função de decidir (92033, [05-K-2-H]). |
| `seguir_campanha` | `trg_seguir_campanha_valida_publicada` | Só se segue campanha publicada (`ativo`, `sucesso`, `nao_atingido`, `encerrado`; 91034). Quem já segue continua seguindo se o status mudar depois. |
| `repasse` | `trg_valida_repasse` (`fn_valida_repasse_all_or_nothing`) | Recusa repasse com valor em tudo-ou-nada que não bateu a meta (91003). Repasse "zerado" é permitido; num `UPDATE`, só recusa quando o valor liberado **aumenta** (corrigir status ou data de um repasse já feito nunca trava). |
| `contribuicao` | `trg_contribuicao_all_or_nothing_pix` (+ `_update`) | Tudo-ou-nada só aceita Pix, e quem contribui sem conta só usa Pix (90007). O `UPDATE` só revalida quando muda o meio ou a campanha, para não travar a confirmação do pagamento. |
| `contribuicao` | `trg_valida_status_contribuicao` (`fn_valida_contribuicao_campanha_ativa`) | Só contribui em campanha `ativo`, já começada ("Em breve" recusa) e dentro do prazo (91015, 91016, 91017). |
| `contribuicao` | `trg_contribuicao_valida_valor_minimo` | Valor mínimo de negócio (`valor_minimo_contribuicao`; 90014); no cartão, a faixa `valor_minimo_contribuicao_cartao`/`valor_maximo_contribuicao_cartao` (90037, 90038); cartão e boleto desligáveis (91052, 91053). Só no `INSERT`: o valor não muda depois. |
| `contribuicao` | `trg_sincroniza_arrecadado_campanha` | Recalcula `campanha.valor_bruto_arrecadado` (contribuições `confirmado` e `repassado`) a cada mudança. `SECURITY DEFINER`: como quem doou, o `UPDATE` na campanha seria filtrado pela RLS e o total ficaria errado em silêncio. ⚠️ Faz `SELECT ... FOR UPDATE` na campanha antes de somar: sem a trava, duas confirmações ao mesmo tempo poderiam somar sem enxergar uma à outra, e uma "sumiria" do total. |
| `contribuicao` | `trg_valida_transicao_status_contribuicao` | A situação só segue a máquina de estados (`DOCUMENTACAO_FINANCEIRO.md`, seção 4; 91050). |

**Mudanças de dinheiro só por função `SECURITY DEFINER`** (o `app_nestjs` não tem `UPDATE` em `contribuicao` nem escrita em `repasse` e `auditoria_financeira`):
* **`atualizar_status_contribuicao(...)`:** a única porta para mudar a situação de uma contribuição; valida a transição e grava uma linha em `auditoria_financeira` a cada chamada. **Por quê:** com `UPDATE` direto, qualquer pessoa confirmaria a própria contribuição sem pagar, e o arrecadado público subiria. Sem autorização própria de propósito: é chamada pelo webhook, sem sessão, depois de o Nest validar a assinatura do aviso.
* **`atualizar_status_repasse(...)`:** o mesmo para o repasse (dinheiro saindo).
* As demais (aplicar o aviso do provedor, criar e concluir repasse, estorno, revisão manual) estão descritas no `DOCUMENTACAO_FINANCEIRO.md`; cada uma confere a sua permissão ou é chamada só pelas tarefas automáticas e pelo webhook.

#### Tarefas agendadas (funções chamadas pelo Nest, sem sessão)

* **`encerrar_campanhas_vencidas()`:** encerra a campanha `ativo` com prazo vencido como `sucesso` ou `nao_atingido`, e já aciona o destino do dinheiro (`DOCUMENTACAO_FINANCEIRO.md`, seção 5). `SECURITY DEFINER`, porque a RLS não deixaria uma tarefa sem sessão ver linha nenhuma (o `UPDATE` daria 0 linhas, sem erro, e as campanhas ficariam `ativo` para sempre). Passa pela trigger de transição (ramo 5). O `CASE` que escolhe o status tem `::status_campanha`: sem o cast, resolve para texto e falha (42804).
* **`expirar_contribuicoes_pendentes()`:** o Pix pendente que passou de `pix_validade_horas` vira `expirado` ([05-K-2-F]).
* **`expirar_campanhas_rascunho()`:** apaga o rascunho mais velho que `campanha_rascunho_ttl_horas` (336, 14 dias), contado da **criação**.
* **`expirar_campanhas_rejeitadas()`:** apaga a rejeitada cujo prazo de reenvio venceu ([05-K-2-B]).
* **`reativar_pesquisadores_vencidos()`:** reativa quem passou do prazo da suspensão ([03-P]).
* **Uma linha por vez ([05-K-2-E]).**

> ⚠️ **`UPDATE` manual em `campanha` sem sessão devolve `UPDATE 0`, sem erro.** Mexer numa campanha direto no SQL Editor sem dizer quem está mexendo não muda nada: `pol_campanha_update` exige o dono ou uma permissão, e a RLS esconde as linhas antes da trigger rodar. É o comportamento certo (aprovar, rejeitar e encerrar precisam ser atribuíveis a alguém), só que silencioso. Antes do `UPDATE` manual: `SET app.id_usuario_atual = '<id de um usuário com a permissão certa>';`.

---

### [05-K-2-B] Campanha: rascunho, rejeição e reenvio

**A campanha nasce em `rascunho`** (`DEFAULT` de `campanha.status`) e só vai para a fila por um botão explícito, nunca sozinha (uma trigger que a enviasse não teria um sujeito, e a transição é construída em torno de quem a faz).

| De | Para | Quem | Condições (ERRCODE) |
|---|---|---|---|
| `rascunho` | `aguardando_aprovacao` | dono | pesquisador ativo (92009), completude e prazo (90009, 90010, 90011, 90015), limite de simultâneas (91018) |
| `aguardando_aprovacao` | `ativo` | quem tem `campanha_aprovar` | a mesma completude e prazo, de novo |
| `aguardando_aprovacao` | `rejeitado` | quem tem `campanha_rejeitar` | grava `historico_rejeicao` (91028) |
| `rejeitado` | `aguardando_aprovacao` | dono | pesquisador ativo, reenvios disponíveis (91025), dentro do prazo (91026), completude e prazo, limite de simultâneas |
| `rejeitado` | (excluída) | tarefa | prazo de reenvio vencido |
| `rascunho` | (excluída) | tarefa ou dono | prazo do rascunho vencido; o dono também exclui (`pol_campanha_delete`) |

* Não existe "recolher" (`aguardando_aprovacao → rascunho`) nem estado intermediário de correção: a rejeitada volta direto para a fila.
* **Rejeição e reenvio:** o primeiro envio mais `campanha_rejeitada_max_reenvios` (3) reenvios = até 4 rejeições; a quarta esgota. Cada rejeição dá `campanha_rejeitada_prazo_dias` (30) contados da **última** rejeição; o prazo não corre enquanto a campanha está na fila.
* **`fn_campanha_situacao_reenvio(id)` é a única conta** (`rejeicoes`, `reenvios_restantes`, `somente_leitura`, `prazo_reenvio_ate`), usada pela transição, pela tarefa de expiração e por `GET /campanha/:id`: a tela mostra exatamente o que o banco vai decidir. `SECURITY DEFINER`, porque quem escreve pode ser um admin sem `campanha_rejeitar`, que não enxergaria o histórico pela RLS. `fn_campanha_reenvios_esgotados(id)` é um embrulho dela.
* **Esgotada, a campanha é somente leitura** para qualquer perfil, inclusive o admin (91027 nas três funções de congelamento; 91025 ao tentar reenviar).
* **Suspenso não envia (92009):** sem isso, um pesquisador suspenso empurraria para a fila até as campanhas que a própria suspensão acabou de rejeitar.
* **O prazo de reenvio (91026) também é conferido na transição,** não só pela tarefa: a tarefa roda de hora em hora, e a campanha que já deveria ter sumido não pode ser reenviada nessa janela.
* **Tarefas de expiração:** `expirar_campanhas_rascunho()` apaga linha a linha e pula só o rascunho que uma FK segura (`foreign_key_violation` e `restrict_violation`, ex.: um rascunho com denúncia), para os outros vencidos expirarem; `expirar_campanhas_rejeitadas()` pula a rejeitada com contribuição, repasse, pedido de encerramento ou denúncia, e a sem nenhuma linha de histórico (sem data não há como saber o prazo).
* **`historico_rejeicao` independente da campanha:** sem FK para `campanha`, com dono e título gravados na hora; imutável. A cascata da suspensão também grava uma linha por campanha rejeitada (`id_admin` = quem suspendeu); rascunhos não são tocados.
* **A exclusão em cascata não é barrada pelo "só leitura":** ao apagar a campanha, as triggers de congelamento das linhas filhas encontram a campanha já apagada e não bloqueiam. É o que deixa a expiração apagar uma campanha esgotada.
* **Rejeitada que expira muda o score na hora:** `trg_campanha_recalcula_score_delete` recalcula o dono, e é nesse instante que a campanha passa a contar como rejeitada definitiva ([05-I-2]).
* **Reagendar datas mantendo a duração:** `deslizar_datas_campanha(id, nova_data_inicio)` move `data_inicio`, `data_fim` e os marcos pelo mesmo intervalo, numa instrução só (a ordem depende do sentido: para frente, os marcos primeiro). Só rascunho ou rejeitada, e só o dono ou quem tem `campanha_editar` (90016, 92010).
* **Status com nome, em vez de lista repetida:** `fn_status_pos_aprovacao(status)` (as três funções de congelamento) e `fn_status_terminal(status)` (`fn_preenche_encerramento_campanha`): um status novo no enum é lembrado num lugar só. As outras listas parecidas são outra coisa e ficam como estão: a leitura pública de `pol_campanha_select` (sem `encerrado_moderacao`), as dimensões do score e a lista de `deslizar_datas_campanha`.

### [05-K-2-C] Integridade: privilégios e configuração

Regras conferidas no PGlite com o banco inteiro, usando o papel real `app_nestjs` e a sessão de um usuário (e não só `postgres`, que ignora a RLS e esconde defeito de privilégio; Anexo E).

* **`INSERT` e `UPDATE` por coluna em `campanha`** (`06`): `valor_bruto_arrecadado`, `taxa_plataforma`, `encerrado_em`, `enviado_aprovacao_em`, `modelo` (no `UPDATE`) e `id_usuario` ficam fora do `GRANT` do `app_nestjs`; só trigger ou função `SECURITY DEFINER` os mudam. Sem isso, o dono faria `UPDATE campanha SET valor_bruto_arrecadado = 999999`.
* **Configuração:**
  * **O valor bate com o tipo** (`CK_CONFIGURACOES_VALOR_TIPO`, `01`): `'5,00'` (vírgula) numa chave decimal derrubaria `config_numero()` em toda aprovação; a escrita já falha com 23514.
  * **O mínimo não passa do máximo** (`trg_configuracoes_pares_min_max`, `CONSTRAINT TRIGGER` diferida, 90019): prazo da campanha, itens de orçamento, marcos e tamanho de arquivo. Sem a trava, `prazo_minimo = 70` com `prazo_maximo = 60` impediria qualquer envio, sem mensagem clara. Só confere linhas globais, ativas e numéricas; `mínimo = máximo` vale. Como cada edição do painel é uma transação, subir o mínimo acima do máximo atual exige subir o máximo antes; o erro diz qual par e qual ordem seguir, e leva os valores no `DETAIL` (o Nest devolve como `dados`).
  * **Chave global não se apaga nem se desativa** (`pol_config_delete` e `CK_CONFIGURACOES_GLOBAL_ATIVA`): é parte do contrato do sistema; apagar `limite_campanhas_simultaneas` faria o código cair num padrão escondido. Para "desligar" uma regra, muda-se o valor. **Caso-limite:** uma chave global criada por engano pelo painel não se apaga mais por ele.
* **`contar_metricas_dashboard()` acha o papel pelo código**, não pelo nome (renomear o papel não zera a métrica).

### [05-K-2-D] Campanha: campos bloqueados numa função só

* **`fn_campanha_campos_bloqueados(campanha) RETURNS TEXT[]`:** os campos que o congelamento trava naquele momento. Aprovada em diante: `meta_financeira`, `modelo`, `taxa_plataforma`, `titulo`, `descricao`, `video_apresentacao_url` e `id_area_conhecimento`, mais `data_fim` e `data_inicio` depois que a campanha começa de verdade. Rejeitada esgotada: todos os campos de conteúdo. Nos outros estados: lista vazia. A ordem da lista decide qual mensagem aparece quando dois campos mudam juntos.
* **`fn_campanha_erro_congelamento(campo, rejeitada)`:** o código e a mensagem de cada campo (91004 a 91010, 91023, 91024; 91027 para a esgotada).
* **`fn_congela_regras_campanha()`** percorre a lista e compara `to_jsonb(NEW) -> campo` com `to_jsonb(OLD) -> campo` (`IS DISTINCT FROM`, que trata `NULL` certo). Campo novo em `campanha` só fica editável depois da aprovação se alguém o tirar da lista: esquecer um `IF` não é possível.
* **`GET /campanha/:id`** devolve `camposBloqueados` (com os nomes do DTO) pela mesma função: a tela trava exatamente o que o banco vai recusar. Suítes 8, 9 e 14 do PGlite.

### [05-K-2-E] Tarefas agendadas: uma linha por vez

* `encerrar_campanhas_vencidas`, `expirar_campanhas_rejeitadas` e `reativar_pesquisadores_vencidos` tratam cada linha num bloco `BEGIN ... EXCEPTION WHEN OTHERS`: a linha recusada vira `WARNING` no log do Postgres (com o SQLSTATE) e é tentada de novo no ciclo seguinte; as outras seguem. **Por quê:** num comando só sobre todas as linhas, uma trigger que recusasse uma linha faria o comando inteiro falhar em todo ciclo, até alguém achar o problema.
* `expirar_campanhas_rascunho` só engole as violações de FK (causa conhecida); as três acima engolem qualquer erro, porque a causa de uma recusa de trigger não se conhece de antemão. **Caso-limite:** uma linha que sempre falha repete o `WARNING` a cada ciclo; convém olhar o log do Postgres de vez em quando. Cada bloco é uma subtransação, irrelevante no volume do sistema. Suíte 16 do PGlite.

### [05-K-2-F] O pagamento que chega depois do fim da campanha

**Em palavras simples:** o apoio por Pix nasce "pendente" e só conta na meta quando o pagamento é confirmado. A campanha vencida espera os Pix ainda válidos (no máximo o tempo de validade deles) antes de sair o resultado, como o "Aguardando" do Catarse.

* `pix_validade_horas` (24, público; o provedor recebe o mesmo prazo ao gerar o código). `expirar_contribuicoes_pendentes()` vence o Pix mais velho que isso (no mesmo agendamento de 15 minutos, antes do encerramento), e `encerrar_campanhas_vencidas()` pula a campanha que ainda tem Pix pendente válido. Nenhum status novo: o "aguardando confirmação" é calculado, como o "Em breve".
* **Por quê:** é justo com quem pagou dentro do prazo e com o pesquisador, e tem fim garantido: nenhum Pix novo nasce depois do fim (91017).
* **Caso-limite:** só o Pix segura o encerramento (o cartão confirma na hora). Uma confirmação que chega depois do encerramento é aplicada com a regra do fechamento: repasse adicional, ou devolução no tudo-ou-nada que não bateu a meta (`aplicar_evento_pagamento`, `DOCUMENTACAO_FINANCEIRO.md`). Suíte 34 do PGlite.

### [05-K-2-G] Denúncia: alvo, julgamento e encerramento por moderação

* **O alvo tem de fazer sentido** (`trg_denuncia_valida_alvo`, `BEFORE INSERT`, `SECURITY DEFINER`): só campanha ativa ("Em breve" conta; 91035), só perfil de pesquisador (90026), e ninguém denuncia a própria campanha nem o próprio perfil (92029). Só na criação: a campanha pode ser encerrada depois e a denúncia segue para julgamento.
* **Sem "em análise":** a denúncia vai direto de pendente para `resolvida` (procedente) ou `improcedente`. `CK_DENUNCIA_SEM_EM_ANALISE` recusa `'em_analise'`, que continua no tipo, fora de uso (tirar um valor de um tipo obrigaria a recriar as triggers e policies que usam a coluna). **Por quê:** "em análise" não guardava quem estava analisando, então não dizia nada além de "pendente". ⚠️ O texto do RF-111 ainda cita "em análise".
* **Quem julga muda só a situação e a justificativa** (`UPDATE` por coluna: `status`, `justificativa_moderacao`; limite em `limite_caracteres_justificativa_denuncia`). Motivo, alvo, relato e autor ficam como o denunciante registrou. `julgado_em` e `id_julgador` são gravados por `trg_denuncia_registra_julgador`.
* **Ninguém julga a própria denúncia** (`trg_denuncia_sem_autojulgamento`, 92006): o mesmo conflito de interesse do autoendosso.
* **Limite de frequência** (`trg_denuncia_limite_taxa`, 93001): no máximo `limite_denuncias_24h` denúncias por pessoa dentro de `janela_denuncias_horas` (RF-076).
* **Encerrar a campanha sai de uma denúncia procedente:** `encerrar_campanha_por_denuncia(p_id_denuncia, p_justificativa)` (`03`, `SECURITY DEFINER`): exige `denuncia_responder` e `campanha_encerrar_moderacao` (92030), justificativa (90027), denúncia de campanha (91036) e campanha ativa (91037); a denúncia vira `resolvida` e a campanha `encerrado_moderacao`, juntas, e o dinheiro segue para devolução. **Por quê:** `pol_campanha_update` não abre a campanha ao moderador; ele encerra só por esse caminho, sempre com uma denúncia procedente e uma justificativa (RF-114). **Caso-limite:** as outras denúncias pendentes da mesma campanha continuam pendentes. Suíte 36 do PGlite.

### [05-K-2-H] Encerramento antecipado: pedir, decidir e cancelar o projeto

**Em palavras simples:** sem dinheiro em jogo, o pesquisador cancela o projeto sozinho; com qualquer contribuição em jogo, pede ao administrador, porque o dinheiro precisa ser devolvido ou repassado.

* **`encerrar_campanha_sem_contribuicao(p_id_campanha, p_justificativa)`** (`03`, `SECURITY DEFINER`), o "Cancelar o projeto": só o dono (92031), com justificativa (90028), campanha ativa (91038) e nenhuma contribuição pendente (de qualquer meio) nem confirmada (91043). Pix vencido, pagamento com erro e contribuição já devolvida não contam. Grava um pedido `aprovado` sem `id_admin` e encerra a campanha (ramo 10 da transição). Um pedido pendente da mesma campanha é cancelado na mesma operação. **Por quê:** o encerramento direto fica registrado no mesmo lugar dos outros (quem, quando, por quê), sem tabela nova.
* **`decidir_solicitacao_encerramento(p_id_solicitacao, p_aprovar, p_justificativa)`** (`03`, `SECURITY DEFINER`): exige `solicitacao_encerramento_decidir` (92032), só pedido pendente (91041), rejeitar com justificativa (90029), aprovar só com a campanha ainda ativa (91042). Grava quem decidiu e quando; aprovar encerra a campanha na mesma operação, e o dinheiro segue `destino_dinheiro_campanha()`. Mudança direta de status para aprovado ou rejeitado é recusada (92033). O app só insere campanha e justificativa e só muda `status` para cancelar (`GRANT` por coluna). **Por quê:** pedido aprovado e campanha encerrada são uma coisa só; em dois passos, um poderia acontecer sem o outro.
* **Um pendente por vez em cada campanha** (`uq_solicitacao_encerramento_pendente`); pedido decidido ou cancelado não muda mais (91041). Suíte 37 do PGlite.

### [05-K-2-J] Contestação da pontuação na própria denúncia (RF-033)

**Em palavras simples:** o pesquisador que acha injusta uma denúncia julgada procedente contra ele (contra o perfil ou contra uma campanha dele) pede revisão na Minha Conta. A moderação decide na tela de Denúncias: se ele tiver razão, a denúncia vira improcedente e a pontuação se recalcula sozinha; se não, continua valendo. Sempre com justificativa, e o resultado vai por e-mail ([05-Q]).

* **Contesta-se uma denúncia, não a nota.** As outras penalidades são fatos (campanha concluída ou não, atualização publicada ou não) ou dados que o próprio pesquisador corrige (o perfil). A única que nasce de uma decisão humana, e pode estar errada, é a denúncia procedente. Padrão de mercado: no Mercado Livre o vendedor contesta uma avaliação específica; na Uber o motorista pede revisão de uma avaliação. Aceitar muda a denúncia, e a nota se recalcula por `trg_denuncia_recalcula_score` ("corrige o dado, nunca a nota").
* **Na própria linha da denúncia:** `contestacao`, `contestacao_status` (`status_contestacao`: pendente, aceita, recusada), `contestada_em`, `justificativa_contestacao` e `id_julgador_contestacao`, com `CK_DENUNCIA_CONTESTACAO_COERENTE`. **Por quê:** a relação é 1 para 1 opcional (no máximo uma contestação por denúncia, sem recontestar depois da recusa), e a contestação é julgada na mesma tela da denúncia. **Caso-limite:** se um dia houver várias tentativas ou contestação de penalidade que não vem de denúncia, cabe uma tabela própria.
* **Só pelas funções (`03`):**
  * `contestar_denuncia(p_id_denuncia, p_texto)`: só o penalizado (o alvo da denúncia de perfil ou o dono da campanha denunciada, 92034), com texto (90032), só denúncia procedente (91044), uma vez por denúncia (91045) e uma esperando análise por vez (91046);
  * `decidir_contestacao(p_id_denuncia, p_aceitar, p_justificativa)`: exige `denuncia_responder` (92035), só contestação esperando (91047), quem registrou a denúncia não decide (92006), quem **julgou** a denúncia também não decide a contestação contra a própria decisão (92036), justificativa obrigatória (90033); aceitar põe a denúncia em improcedente na mesma operação;
  * `denuncias_contra_mim()`: as procedentes e as contestadas do pesquisador logado, **sem quem denunciou**.
  * `fn_valida_contestacao_pendente` (`05`): com contestação esperando, a situação da denúncia só muda pela decisão dela (91048). A decisão entra no log de auditoria.
* **Por quê:** o pesquisador não lê nem altera a linha da denúncia (`04`) e não pode saber quem o denunciou. O `INSERT` do app em `denuncia` é por coluna (autor, alvo, motivo, relato): ninguém cria uma denúncia já julgada nem já contestada.
* **Caso-limite:** aceitar não reabre uma campanha encerrada por moderação; só corrige a nota. Sem prazo para contestar. Suíte 40 do PGlite.

### [05-K-2-K] "Esperando há X dias": a ordem das filas

* **`campanha.enviado_aprovacao_em`** é gravada a cada entrada na fila (envio ou reenvio, `trg_campanha_carimba_envio_aprovacao`). A fila Aprovar Campanhas mostra há quantos dias cada campanha espera, desde o último envio, e não "criada em" (uma campanha criada em agosto e enviada hoje não espera desde agosto).
* **Toda tela com a coluna "esperando" põe primeiro o que ainda espera uma pessoa, o mais antigo no topo**, e depois o que já foi resolvido, o mais novo primeiro: Aprovar Campanhas, Denúncias, Pedidos de Encerramento, Eventos de Pagamento e Notificações. A espera é pintada por cor: verde até `espera_atencao_dias` (7), laranja até `espera_critica_dias` (30), vermelho acima. É o mesmo cálculo em toda tela (`ordenarFilaSla`, `react/src/services/constant/util/fila-sla.util.ts`; regra DS-49). **Por quê:** é a ordem de atendimento de qualquer fila com prazo (SLA, o acordo de quanto tempo cada pedido pode esperar): quem espera há mais tempo é atendido primeiro.

---

### [05-K-3] Regras Transversais - Comunidade, Engajamento e RBAC

| Tabela | Trigger (função) | Regra |
|---|---|---|
| `comentario` | `trg_valida_comentario_status` | Só se comenta em campanha publicada: não em `rascunho`, `aguardando_aprovacao`, `rejeitado` nem `encerrado_moderacao` (91020). |
| `comentario` | `trg_comentario_sem_autoria` (`validar_comentario_autor`) | O dono não comenta na própria campanha (RF-097; 92004). |
| `comentario` | `trg_comentario_ignora_endosso_criacao` | Zera `endossado` e `ordem_endosso` em todo comentário novo: só o dono da campanha endossa (RF-094). Não confia no Nest deixar de mandar o campo. |
| `comentario` | `trg_comentario_endosso_autor` (`validar_comentario_endosso_autor`) | Só o dono da campanha ou quem tem `comentario_moderar` muda `endossado` (RF-089; 92008). Ao endossar, calcula `ordem_endosso` = `MAX + 1` dos comentários ativos da campanha, sob `pg_advisory_xact_lock(92008, id_campanha)` (dois endossos ao mesmo tempo não repetem o número nem passam do limite); ao tirar o endosso, zera. |
| `comentario` | `trg_comentario_limite_endosso` (`validar_comentario_endosso`) | No máximo `limite_endossos_campanha` endossos ativos por campanha (RF-063; 91021). Roda depois da anterior (ordem alfabética) e por isso confere `NEW.endossado`. O comentário ocultado pela moderação não ocupa vaga. |
| `comentario` | `trg_comentario_edicao_conteudo` (`validar_comentario_edicao_conteudo`) | Só o autor edita o texto (92007), e só enquanto não está endossado (RF-096; 91022). |
| `comentario` | `trg_comentario_bloqueia_reversao_moderacao` | Só quem tem `comentario_moderar` reverte um comentário ocultado (`ativo: FALSE → TRUE`; 92005). O autor continua podendo ocultar o próprio. |
| `comentario` | `trg_comentario_limite_taxa` (`validar_comentario_frequencia`) | No máximo `limite_comentarios_por_hora` comentários por pesquisador dentro de `janela_comentarios_horas`, somando todas as campanhas: limite contra rajada (93002). |
| `termos_de_uso` | `fn_protege_termo_aceito` | Versão já aceita não se exclui (91032) nem tem texto, tipo ou versão alterados (91033), RF-091: é a prova do que cada pessoa aceitou. Versão nunca aceita se corrige à vontade. Ativar e desativar continuam livres. As FKs dos aceites (`FK_USUARIO_TERMO_TERMO`, `FK_ACEITE_TERMO_CONTRIBUICAO_TERMO`) não são `ON DELETE CASCADE`. |
| `permissao` | `trg_permissao_auto_admin` (`trg_admin_recebe_toda_permissao`) | Toda permissão nova é dada sozinha ao papel `admin` (reconhecido pelo código). **Por quê:** as policies conferem permissão (`tem_permissao('x')`), nunca "é admin"; sem esta trigger, toda permissão nova exigiria lembrar de concedê-la ao admin (Anexo B). |
| `perfil_pesquisador` (INSERT) | `trg_perfil_atribui_papel_pesquisador` (`fn_atribuir_papel_pesquisador`, `SECURITY DEFINER`) | Quem ganha perfil de pesquisador ganha o papel `pesquisador`: "tem perfil ⇔ tem o papel". `SECURITY DEFINER` pelo mesmo motivo de `atribuir_papel_padrao` ([08-D-1]): quem cria o perfil ainda não tem `papel_atribuir`. |
| `usuario_papel` | `trg_usuario_papel_protege_ultimo_admin` (`fn_protege_ultimo_admin`) | Ninguém tira o papel admin do último administrador ativo (91030); suspender e excluir a conta conferem o mesmo nas próprias funções ([03-N]). |

---

### [05-G] Arquivo: posse e limpeza de órfãos

**Em palavras simples:** duas regras do banco para arquivos. Uma "trava": só se usa como foto, ou se anexa, um arquivo que a própria pessoa enviou e que ninguém mais está usando. Uma "faxina", todo dia às 4h: o arquivo que ninguém usou em 24 horas é apagado.

* **Posse da foto** (`trg_valida_posse_imagem_perfil`, função `fn_valida_posse_imagem_perfil`, `SECURITY DEFINER`) e **dos anexos** (`trg_valida_posse_anexo_atualizacao`, `trg_valida_posse_anexo_recompensa`, função `fn_valida_posse_anexo`): o arquivo precisa estar ativo (90022), ter sido enviado por quem está logado (92025) e não estar em uso em outro lugar (91029).
* **Cada arquivo mora num lugar só:** ou a foto de alguém, ou o anexo de **uma** atualização, ou o de **uma** recompensa. Como segunda proteção, `UK_ARQUIVO_ATUALIZACAO_ARQUIVO` e `UK_ARQUIVO_RECOMPENSA_ARQUIVO` (`01`) são só pelo arquivo; o Nest traduz em "Este arquivo já está anexado em outro lugar.". Para usar o mesmo PDF em dois lugares, envia-se de novo.
* **Por quê:** a posse da foto ou do anexo dá permissão de apagar o arquivo (`pol_arquivo_update`, `04`); sem a trava, qualquer conta apontaria a própria foto para o arquivo de outra pessoa e poderia apagá-lo. E um arquivo compartilhado faria a remoção de um lugar levar o outro junto.
* **Faxina:** `desativar_arquivos_orfaos()` desativa todo arquivo ativo que ninguém adotou em `configuracoes.arquivo_horas_para_vincular` (24; 0 = desligado), devolve as chaves para o Nest apagar do armazenamento e deixa uma linha de rastro no log. **Por quê:** o upload é confirmado antes de salvar (a tela mostra a foto antes), então todo "enviou e não salvou" vira órfão.
* **O que acontece quando...** (com alguém logado):

  | Situação | Resultado |
  |---|---|
  | Usa como foto, ou anexa, um arquivo que a própria pessoa enviou e que não está em uso | Passa |
  | O arquivo foi enviado por outra pessoa (inclusive trocando o arquivo de um anexo) | Recusa, 92025 (403) |
  | O arquivo não existe ou já foi removido | Recusa, 90022 (400) |
  | O arquivo já é foto de alguém ou anexo de outro lugar | Recusa, 91029 (409) |
  | Sem sessão (seed, SQL direto), o mesmo arquivo em dois anexos da mesma tabela | Recusa pela regra de valor único (23505) |
  | A pessoa tira a foto (`id_imagem_perfil = NULL`) | Passa sempre |
  | Um arquivo enviado não vira foto nem anexo em 24 horas | A faxina das 4h desativa e apaga do armazenamento |

* **Caso-limite:** a trava só vale com alguém logado (o cadastro público não aceita foto). O admin que troca a foto de outra pessoa envia o arquivo ele mesmo, então passa. Uma tabela nova que aponte para `arquivo` precisa entrar nos `NOT EXISTS` da faxina e na regra de posse. Suíte 22 do PGlite.

---

### [05-Q] Notificação: a fila de e-mails e os gatilhos que a alimentam

**Em palavras simples:** todo e-mail do sistema nasce como uma linha `pendente` em `notificacao`, na mesma transação do evento (aprovar, rejeitar, encerrar, devolver, suspender). O Nest (`4-mail`) reserva uma linha por vez, monta o texto e envia; o resultado volta para a mesma linha. Se a ação for desfeita, o e-mail some junto; se o servidor cair, nada se perde.

| Função | Quem chama | O que faz |
|---|---|---|
| `enfileirar_notificacao(id_usuario, tipo, dados)` | gatilhos e o Nest (verificação de conta, nova senha) | Copia o e-mail e o nome da conta; conta excluída ou inexistente: nada gravado |
| `enfileirar_notificacao_doadores(id_campanha, tipo, dados)` | só gatilhos (sem `EXECUTE` para o `app_nestjs`) | Um e-mail por pessoa com conta que pagou alguma contribuição da campanha |
| `enfileirar_notificacao_seguidores(id_campanha, tipo, dados)` | só gatilhos | Quem segue a campanha ou o pesquisador dono, uma vez por pessoa, nunca o dono |
| `reservar_proxima_notificacao(p_ignorar_espera)` | o envio (sem sessão) | A próxima `pendente` vencida (com `TRUE`, só no "Rodar agora" da T6, também a que espera nova tentativa); conta a tentativa e empurra `proxima_tentativa_em` (`email_lease_minutos`); `FOR UPDATE SKIP LOCKED` |
| `concluir_notificacao(...)` | o envio | `enviado`, com assunto, provedor e id da mensagem; apaga `dados.segredo` |
| `falhar_notificacao(...)` | o envio | Recuperável e com tentativas: volta com espera `email_backoff_base_minutos * 2^(n-1)`, até `email_backoff_max_minutos`; senão, `falhou` |
| `reenviar_notificacao(id)` / `cancelar_notificacao(id)` | aba Notificações | Exigem `notificacao_processar` (92039); só `falhou` reenvia, só `pendente`/`falhou` cancela (91054); inexistente: 90039 |

| Gatilho | Tabela e momento | E-mail |
|---|---|---|
| `trg_notifica_situacao_campanha` | `campanha`, depois de mudar `status` | aprovada (o dono e quem segue o pesquisador); tudo-ou-nada `sucesso` e `nao_atingido`, e `encerrado_moderacao` (quem pagou) |
| `trg_notifica_rejeicao_campanha` | `historico_rejeicao`, depois do `INSERT` | rejeitada, com a justificativa e os reenvios que restam |
| `trg_notifica_devolucao` | `contribuicao`, ao virar `devolvido`, com conta | devolução concluída |
| `trg_notifica_decisao_encerramento` | `solicitacao_encerramento`, `pendente` para `aprovado`/`rejeitado` | a decisão do pedido |
| `trg_notifica_situacao_pesquisador` | `perfil_pesquisador`, ao mudar `status_pesquisador` | suspenso (motivo e prazo) ou reativado |
| `trg_notifica_contestacao` | `denuncia`, contestação decidida | o resultado da contestação |
| `trg_notifica_atualizacao` | `atualizacao_campanha`, nova e ativa | atualização publicada, para quem segue |

* **Os e-mails nascem nos gatilhos** (só `AFTER`), e o texto é montado no Nest na hora de enviar, a partir de `tipo_evento` + `dados`. **Por quê:** qualquer caminho que mude a situação (tela, tarefa agendada, função de moderação, webhook, o seed) gera o aviso, sem depender de cada service lembrar: o padrão "caixa de saída" (outbox), o mesmo da fila do repasse.
* **O link com token** (verificar conta, nova senha) espera cifrado em `dados.segredo` e é apagado ao enviar ou cancelar. **Por quê:** `verificacao_email` e `recuperacao_senha` guardam o token só como hash; a fila não pode desfazer essa proteção. **Caso-limite:** reenviar um e-mail que falhou manda o mesmo link, que pode ter vencido.
* **Seed:** o de demonstração chama as funções reais, então gera e-mails de verdade na fila; o `[07-D-7]` os marca como enviados pelo provedor `seed`. O banco de produção nasce sem esses dados.

---

### ERRCODE customizado - 90xxx/91xxx/92xxx/93xxx

Toda recusa de regra deste arquivo e do `03` sai com `RAISE EXCEPTION ... USING ERRCODE = '<código>'`, em quatro faixas que não colidem com os SQLSTATE nativos tratados pelo Nest (`23505`, `23503`, `23502`, `23514`, `42501`, `P0001`):

| Faixa | Categoria | HTTP |
|---|---|---|
| `90001`–`90999` | Validação de dado ou de negócio (formato, limite, mínimo, obrigatório fora do `CHECK`) | 400 |
| `91001`–`91999` | Conflito de estado (campanha congelada, transição inválida, limite atingido) | 409 |
| `92001`–`92999` | Autorização negada por regra de negócio (permissão conferida dentro da função, ou conflito de interesse: dono, autor ou denunciante agindo sobre o próprio registro); **não é RLS** | 403 |
| `93001`–`93999` | Limite de taxa | 429 |

A tabela completa (código, função, tabela, mensagem) mora só no **`DOCUMENTACAO_ERRCODE.md`**. O Nest (`postgres-exception.filter.ts`) reconhece a faixa pelos dois primeiros dígitos e responde com a mensagem original da função, que já é escrita para quem usa o sistema.

---

### [05-L] `log_auditoria`: quem alterou o quê e quando

Registro genérico de `INSERT`, `UPDATE` e `DELETE` das ações administrativas comuns ("o admin editou o nome de um usuário", "revogou uma permissão pela matriz"), que os registros específicos (`auditoria_financeira`, `historico_rejeicao`) não cobrem.

* **Tabela** ([01-L]): `log_auditoria(id_log, tabela, identidade_registro, operacao, id_usuario_responsavel, campos_alterados, dados_anteriores, dados_novos, ocorrido_em)`. `identidade_registro` é `TEXT`: cobre PK simples (`'42'`) e composta (`'8,3'`). `operacao` aceita `INSERT`, `UPDATE`, `DELETE` e `EXPORT` (a exportação de dados, gravada por `registrar_exportacao_dados`, [03-O]).
* **Função e triggers:** `fn_log_auditoria()`, `SECURITY DEFINER`, aplicada com `fn_log_auditoria('coluna_pk'[, 'coluna_pk_2'])` em `usuario`, `perfil_pesquisador`, `configuracoes`, `usuario_papel`, `papel_permissao`, `papel`, `motivo_denuncia`, `area_conhecimento`, `tipo_link`, `termos_de_uso`, `score_config`, `score_rotulo`, e em `campanha` e `denuncia` só na mudança de `status` (o que importa é "quem aprovou, rejeitou ou suspendeu o quê e quando"). `contribuicao` fica de fora: já tem `auditoria_financeira`.
* **Coluna sensível nunca entra no conteúdo:** `senha_hash`, `cpf_criptografado` e `cpf_hash` são removidas de `dados_anteriores`/`dados_novos` antes de gravar, mas o **nome** da coluna aparece em `campos_alterados` (saber **que** a senha mudou é auditoria válida). Uma tabela nova com coluna sensível precisa entrar nessa remoção.
* **Retrato completo, não diferença:** `dados_anteriores`/`dados_novos` guardam a linha inteira (já sem o sensível) nas duas pontas, para reconstruir o estado.
* **Sem ruído do motor de score:** um `UPDATE` em `perfil_pesquisador` que só mudou `score_atual`/`score_atualizado_em` não gera linha. Um `UPDATE` que não muda valor nenhum também não.
* **À prova do próprio admin** ([04-L], [06-L]): só existe leitura (`log_visualizar`); nenhuma escrita para ninguém. Só a trigger grava.
* **Retenção:** `limpar_log_auditoria()` (`SECURITY DEFINER`, tarefa diária das 3h) apaga o que passou de `configuracoes.log_auditoria_retencao_dias` (**365**; 0 = guardar para sempre). É a **única** forma de apagar log. Ao apagar, grava **uma** linha de rastro (`tabela = 'log_auditoria'`, `operacao = 'DELETE'`, com a quantidade, os dias e a data de corte); se não apaga nada, não grava nada. O que sai não é arquivado: um ano cobre a contestação razoável. O índice BRIN de `ocorrido_em` serve a essa limpeza ([02-L]).
* **Tela:** `GET /log-auditoria` (`nest/src/28-log-auditoria`, só leitura) e o botão "Ver log" das listas do painel.

#### IP do aceite na contribuição

**Em palavras simples:** a cada contribuição, inclusive sem conta, a plataforma registra o IP de onde ela foi feita, como prova do aceite do Termo numa contestação de pagamento. O Termo diz isso e diz o prazo; depois do prazo, o IP é apagado e o resto do aceite continua.

* `ip_aceite_contribuicao_retencao_dias` (**1825**, 5 anos; 0 = guardar para sempre; interno). `limpar_ip_aceite_contribuicao()` (`SECURITY DEFINER`, na mesma tarefa diária das 3h) apaga o `ip_aceite` mais velho que isso. O IP vem da requisição (`trust proxy` no deploy, `DOCUMENTACAO_BACKEND.md`).
* **Por quê:** 5 anos é o prazo do Código de Defesa do Consumidor para reclamar (art. 27), e a LGPD permite guardar o IP para defesa em processo (art. 7º, VI). O Marco Civil da Internet (art. 15) obriga quem opera como empresa a guardar os registros de acesso (IP, data e hora) por 6 meses. E o IP não tira um anonimato que o Pix não dá: o banco de quem pagou sabe quem pagou, e o recebedor costuma ver o nome e parte do CPF.
* **Casos-limite:** mudar o parâmetro não muda o Termo, que tem o prazo escrito (mudar o prazo pede uma versão nova do Termo). O parâmetro aceita 0, que não combina com o "período mínimo necessário" da LGPD; fica por ser prático em testes, e em operação o valor é o que o Termo promete. ⚠️ O art. 15 do Marco Civil pede o registro de **cada acesso**, não só do aceite; hoje o IP fica no aceite do termo, no aceite da contribuição e no último login. Fazer esse registro é item para antes de entrar em operação (PENDENCIAS, "No dia do deploy"). Suíte 35 do PGlite.

---

## 06. GRANTS (`06_grants.sql`)

### Visão Geral

Concede à role `app_nestjs` (criada no `01`) exatamente os privilégios que a RLS (`04`) pressupõe. RLS e GRANT são duas checagens **independentes** que o Postgres exige juntas: sem o GRANT de tabela ou de coluna, a operação falha com `permission denied` antes de a policy ser avaliada. E um GRANT sem policy correspondente nunca funciona (só dá a falsa impressão de que a operação é possível); por isso cada GRANT de escrita existe só onde há policy para ele. Todos os GRANTs moram neste arquivo, na ordem dos blocos do `01`.

**Regras gerais:**
* **Por coluna onde há dado que o app não pode mudar:** `usuario`, `perfil_pesquisador`, `campanha`, `denuncia`, `score_config`, `score_rotulo`, `papel` e `solicitacao_encerramento` têm `INSERT` ou `UPDATE` só nas colunas que o Nest grava; o resto muda só por trigger ou função `SECURITY DEFINER`.
* **Dinheiro sem escrita direta:** `contribuicao` só tem `INSERT`; `repasse` e `auditoria_financeira`, nenhuma escrita ([06-H]).
* **Funções que escrevem saem do `EXECUTE` padrão de `PUBLIC`:** `REVOKE EXECUTE ... FROM PUBLIC` e `GRANT EXECUTE` só para `app_nestjs`. Hoje só o `app_nestjs` conecta, mas fechar é de graça para funções que apagam conta ou recalculam a plataforma inteira.

---

### [06-A] Geral (Schema e Sequências)

* **`GRANT USAGE ON SCHEMA public` e `GRANT SELECT ON ALL TABLES`:** a base, refinada por `REVOKE` e GRANT de coluna nas tabelas sensíveis ([06-D]).
* **[06-A-1] `GRANT USAGE, SELECT ON ALL SEQUENCES`:** sem isso, o `INSERT` não consegue gerar o próximo valor de uma coluna `SERIAL` (42501).

---

### [06-B] RBAC

* `GRANT INSERT, DELETE ON papel_permissao` (a matriz Papel × Permissão, com `papel_gerenciar`) e `GRANT UPDATE (nome, descricao) ON papel` (Alterar Papel). `codigo` e `ordem_exibicao` não têm GRANT nenhum ([01-B]). `permissao` e a criação de papel novo não têm escrita pela aplicação.

---

### [06-C] CONFIG

* `configuracoes`: `INSERT`, `UPDATE`, `DELETE` (a policy só deixa apagar a configuração pessoal do dono, [05-K-2-C]).
* **[06-C-1]** `area_conhecimento`, `motivo_denuncia`, `tipo_link`: `INSERT`, `UPDATE`, `DELETE`. As FKs que apontam para eles não têm `CASCADE`: o banco recusa (23503) a exclusão de um item em uso, e o Nest responde 409 dizendo onde ele é usado; desativar (`ativo`) continua disponível.
* `arquivo`: `INSERT`, `UPDATE` (desativar), sem `DELETE`: a exclusão é lógica, e o objeto do armazenamento é apagado pela faxina ([05-G]).

---

### [06-D] USUÁRIO

* **[06-D-1] `usuario` e `perfil_pesquisador`:** `SELECT` geral revogado; o `SELECT` é por coluna, para o `app_nestjs` não ter acesso indiscriminado antes mesmo da RLS.
* **[06-D-2] `usuario`, colunas de autenticação no `SELECT`:** `senha_hash`, `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em`, `ultimo_login_ip` e `email_verificado` estão no GRANT de coluna: o login precisa conferir a senha e o bloqueio. Só o login lê `senha_hash` (`DOCUMENTACAO_BACKEND.md`, seção 6.3).
* **`perfil_pesquisador` no `SELECT`:** inclui `cpf_criptografado` (o Nest decifra só para o dono ou para quem tem `perfil_pesquisador_visualizar_sensivel`; quem decide é o Nest, não a coluna ficar inacessível para o próprio backend), `tipo_vinculo`, as colunas de suspensão e `score_atual`/`score_atualizado_em` (a pontuação é pública, [04-I-3]).
* **[06-D-9] `UPDATE` por coluna:** `usuario` só `nome`, `id_imagem_perfil` e `senha_hash`; as colunas de verificação, bloqueio, login e exclusão mudam só pelas funções de [03-O]. `perfil_pesquisador` sem `score_atual`/`score_atualizado_em` (só o recálculo, [05-I-3]), sem `status_pesquisador` e as colunas de suspensão ([03-P]) e sem `cpf_criptografado` ([03-P-1]).
* **[06-D-10] `usuario`, `INSERT` por coluna:** só `nome`, `email`, `senha_hash` e `id_imagem_perfil` (o que o cadastro e a criação pelo admin enviam); o resto nasce do `DEFAULT`. Um `INSERT` com `email_verificado = TRUE` ou já suspenso dá 42501. Suíte 12 do PGlite.
* **`termos_de_uso`:** `INSERT`, `UPDATE`, `DELETE` (a versão já aceita é protegida por trigger, [05-K-3]). **`usuario_termo`:** só `INSERT` (o aceite não se edita).
* **`usuario_papel` e `seguir_pesquisador`:** `INSERT`, `DELETE` (não se "edita" uma relação; a suspensão de papel é por função, [03-N]).
* **[06-D-3] `notificacao`:** `INSERT`, `UPDATE`, com as policies de [04-D-5].
* **[06-D-4] `verificacao_email`, `recuperacao_senha`, `sessao`:** `SELECT`, `INSERT`, `UPDATE`, `DELETE`, com a policy `FOR ALL` de [04-D-1]. O `DELETE` serve para apagar o pedido de nova senha anterior a cada pedido novo (sem isso, o índice de um só token ativo, [02-D], bloquearia o segundo pedido). ⚠️ Como a policy é `USING (true)`, um `DELETE` vale para qualquer linha: uma limpeza por retenção precisa ser sempre uma consulta fixa por data, nunca um filtro dinâmico.
* **[06-D-2b] Funções:** as de autenticação e moderação ([03-O], [03-N], [03-P], [03-P-1] a [03-P-3], [03-E-1] e [03-E-2]) com `REVOKE ... FROM PUBLIC` e `GRANT EXECUTE` só para `app_nestjs`.

---

### [06-E] CAMPANHA

* **`campanha`:** `INSERT` e `UPDATE` por coluna (sem `valor_bruto_arrecadado`, `taxa_plataforma`, `encerrado_em`, `enviado_aprovacao_em`, e sem `modelo` e `id_usuario` no `UPDATE`; [05-K-2-C]) e `DELETE` (a policy só libera `rascunho`).
* **`atualizacao_campanha`, `comentario`, `recompensa`:** `INSERT`, `UPDATE`; `comentario` também `DELETE` (o autor apaga o próprio).
* **`denuncia`:** `INSERT` por coluna (autor, alvo, motivo, relato) e `UPDATE` por coluna (`status`, `justificativa_moderacao`): ninguém cria uma denúncia já julgada ou já contestada ([05-K-2-J]).
* **`solicitacao_encerramento`:** `INSERT` (campanha e justificativa) e `UPDATE (status)`, só para cancelar ([05-K-2-H]).
* **`historico_rejeicao`:** só `INSERT` (imutável).
* **`orcamento_campanha`, `marco_cronograma`:** `INSERT`, `UPDATE`, `DELETE`.
* **`seguir_campanha`:** `INSERT`, `DELETE`.
* **`repasse`:** nenhuma escrita. `status` e `repassado_em` só mudam por `atualizar_status_repasse()`, e o repasse nasce pelas funções do fechamento ([05-K-2]).

---

### [06-F] LINK

* `link_academico`, `link_atualizacao`, `link_recompensa`: `INSERT`, `UPDATE`, `DELETE`.

---

### [06-G] ARQUIVO

* `arquivo_atualizacao`, `arquivo_recompensa`: `INSERT`, `UPDATE`, sem `DELETE` (não há policy de `DELETE`).

---

### [06-H] CONTRIBUIÇÃO

* **`contribuicao`:** só `INSERT`. A situação e a cobrança só mudam por `atualizar_status_contribuicao()` e pelas outras funções `SECURITY DEFINER` do `05`. **Por quê:** com `UPDATE` direto, alguém confirmaria a própria contribuição sem pagar e o arrecadado público subiria.
* **`contribuicao_recompensa`, `aceite_termo_contribuicao`:** só `INSERT` (registro de escolha e de aceite, não se editam).
* **`auditoria_financeira`:** nenhuma escrita: só as funções do `05` gravam, e o histórico do dinheiro não se apaga nem se edita.
* **Funções do dinheiro:** `GRANT EXECUTE` para `app_nestjs` nas que o Nest chama (listagens e ações das pendências de pagamento, webhook, tarefas automáticas).

---

### [06-I] SCORE

* **`score_config` e `score_rotulo`:** `INSERT` e `UPDATE` por coluna (`peso`, `ativo` em `score_config`; `rotulo`, `descricao`, `score_minimo`, `score_maximo` em `score_rotulo`): `nome` e `id_pai` são a estrutura que as funções procuram ([05-I-4]).
* **`score_pesquisador`:** nenhuma escrita: só `recalcular_score_pesquisador()` (`SECURITY DEFINER`) grava.
* **[06-I-1] Funções:** `recalcular_score_pesquisador()`, `recalcular_todos_os_scores()`, `contar_seguidores_pesquisador()` e `contar_seguidores_campanha()` com `GRANT EXECUTE` para `app_nestjs`; as duas de recálculo também com `REVOKE ... FROM PUBLIC` (`recalcular_todos_os_scores()` aberta seria negação de serviço barata).

### [06-L] LOG DE AUDITORIA

* `log_auditoria`: só `SELECT`. Nenhuma escrita para ninguém; a trigger `fn_log_auditoria()` grava ([05-L]).

### [06-Q] NOTIFICAÇÃO

* `GRANT EXECUTE` para `app_nestjs` nas funções da fila que o Nest chama ([05-Q]); as de enfileirar para quem pagou e para quem segue ficam sem: só os gatilhos as usam.

---

## 07. SEED DE DADOS (`07_seed_dados.sql`)

### Visão Geral

📌 **Um arquivo só, em duas partes.**
- **Em palavras simples:** o `07` tem primeiro o que o sistema precisa para funcionar em qualquer banco (a pontuação, os papéis e as permissões, os tipos de link, as áreas, os motivos de denúncia, a versão **vigente** de cada termo e os parâmetros). Depois do marcador `[07-DEMONSTRACAO]` vem a demonstração: contas (senha `DevTcc123!`), perfis, campanhas, contribuições, comentários, denúncias, as versões antigas dos termos, a leitura liberada de desenvolvimento ([07-B-4]) e as permissões das ferramentas de teste.
- **Uso:** no desenvolvimento e na sala de aula, o arquivo roda inteiro. Num banco de produção, roda **só até o marcador**: o banco nasce sem nenhuma conta, sem as permissões de teste e sem a leitura liberada. A primeira pessoa se cadastra pelo site e quem administra o banco a promove a admin uma vez (`INSERT INTO usuario_papel` com o papel `admin`; `.Tutorial-rodar-projeto.md`).
- **Caso-limite:** a versão antiga de um termo, que a demonstração precisa para o histórico de aceites, entra já desativada (a vigente nasce antes, na referência). Conferido pela suíte 33 do PGlite, que monta o banco de produção cortando o `07` no marcador.

📌 **A demonstração mostra uma situação do sistema em cada canto.**
- **Em palavras simples:** a demonstração mostra tudo o que o sistema faz: cada situação de campanha, de contribuição, de repasse, de pedido de encerramento, de denúncia e de contestação; Pix, cartão e boleto; cada situação da caixa de avisos do provedor; e pesquisadores nas faixas de pontuação por motivos reais. As datas são contadas a partir do dia em que o banco é montado, então ela nunca envelhece.
- **Quem é quem** (os ids assumem esta ordem de inserção; os ids da demonstração são fixos de propósito):
  - **1 a 7:** contas "Sistema", uma por papel (o Admin Sistema 2 é o admin de reserva), para os testes rápidos e o "Entrar como" de desenvolvimento.
  - **8 a 17:** os pesquisadores da demonstração, cada um com uma história (o resumo da pontuação de cada um está no fim do `07`, [07-D-5]).
  - **18 a 20:** quem apoia as campanhas.
  - **21 a 23:** contas comuns zeradas, com o e-mail ainda não verificado; a 21 também fica com o aceite do termo da conta pendente, para demonstrar a tela de aceite (o pesquisador 16 fica pendente no termo de pesquisador).
- **21 campanhas**, uma para cada situação, listadas no cabeçalho de [07-E-1] (sucesso com repasse, não atingida com cada devolução numa situação, repasse em erro, "Em breve", rascunho, rejeitada com reenvio, encerrada por moderação, fila de aprovação nas três cores da espera, pedidos de encerramento em cada situação...).
- **O dinheiro passa pelas funções reais:** toda contribuição nasce pendente, e o resto acontece pelas mesmas funções que o sistema usa com o provedor de verdade ([07-H-5]): o aviso do provedor confirma, o fechamento da campanha cria o repasse ou manda devolver, as tarefas de repasse e de estorno andam, a moderação julga, o admin decide. Funções temporárias (`pg_temp`) só fazem o papel do provedor e datam cada passo. O provedor da demonstração é `seed`, que nenhuma tarefa automática trata: ligar o provedor de verdade nunca tenta cobrar, devolver ou transferir um dado de demonstração.
  - **Por quê:** escrever o resultado à mão não prova nada; passar pelas funções reais prova que elas aceitam cada caminho.
- **Regras da demonstração:**
  - **ninguém nasce suspenso** (suspender é uma ação do painel, demonstrada ao vivo);
  - **ninguém nasce com foto, e nenhuma atualização com anexo** (`arquivo` fica vazio, [07-C-4]): os objetos não existem no armazenamento, e a foto ou o anexo não abririam;
  - **toda campanha que já foi enviada tem orçamento (soma igual à meta) e cronograma** ([07-E-1b]), como a aprovação exige; a campanha 20 fica na fila com 2 marcos, de propósito, para o checklist "Pronta para aprovar?" mostrar o que falta;
  - **o endosso de comentário é feito como o dono da campanha** ([07-E-7]), porque a criação do comentário zera o endosso;
  - **todo aceite é da versão vigente na data** (escolhida pela data, nunca por id fixo); cada termo tem a versão antiga (ids 1 e 2), a vigente (3 e 4) e um rascunho da próxima (5 e 6, sem aceite, [07-H-4]);
  - **CPFs falsos** (dígito verificador válido) cifrados de verdade com as chaves do `.env` de desenvolvimento ([01-D]); as chaves Pix também são fictícias; dois pesquisadores não cadastraram chave, e o repasse de um deles espera na fila;
  - **toda conta confirmou o e-mail** pelo mesmo caminho do sistema ([07-D-8]), menos as contas 21 a 23;
  - **recompensas simbólicas** ([07-E-8]): os três tipos, uma desativada e um link especial; cada contribuição paga de quem tem conta ganha a maior recompensa que o valor alcançou;
  - **e-mails** ([07-D-7]): os que as funções do seed puseram na fila viram "enviados" (provedor `seed`), para o envio não disparar tudo ao subir, e entram casos de cada situação (esperando nova tentativa, falhou, cancelado) para a aba Notificações.
- **Conferido** pela suíte de coerência do seed (PGlite 18): todo status aparece, a caixa de avisos tem cada situação, nada passa pelo provedor de verdade, ninguém passa do limite de campanhas simultâneas, e nada acontece antes de a conta existir.

📌 **Datas do seed no horário de Brasília.** `SET TIME ZONE 'America/Sao_Paulo'` no começo do `07` e `RESET TIME ZONE` no fim: toda data escrita no seed vale como horário de Brasília. Sem isso, o Postgres (que no Supabase roda em UTC) leria "01/01/2024 00:00" como meia-noite de Londres, e a conta apareceria como "Membro desde 12/2023". Conta criada de verdade usa `NOW()` e nunca tem o problema.

**A ordem física segue a dependência de FK**, não a ordem alfabética das letras: uma tabela filha só recebe `INSERT` depois que a linha da tabela pai existe. Por isso, por exemplo, o parâmetro pessoal do admin (`notificar_novas_campanhas`, `id_usuario = 1`) entra depois de `usuario`.

### Ordem de Execução (com a letra de cada bloco)

| Ordem | Bloco | Marcador |
|---|---|---|
| 1 | `score_config` (dimensões e itens) e `score_rotulo` | `[07-I-1]` |
| 2 | `papel` | `[07-B-1]` |
| 3 | `permissao` | `[07-B-2]` |
| 4 | `papel_permissao` | `[07-B-3]` |
| 5 | `tipo_link` | `[07-C-1]` |
| 6 | `area_conhecimento` | `[07-C-2]` |
| 7 | `motivo_denuncia` | `[07-C-3]` |
| 8 | `termos_de_uso` (as versões vigentes) | `[07-D-6]` |
| 9 | `configuracoes` (parâmetros do sistema) | `[07-C-5]` |
| 10 | `configuracoes` (constantes do score) | `[07-I-2]` |
| 11 | `configuracoes` (retenção do log) | `[07-L]` |
| 12 | `configuracoes` (cores da espera) | `[07-I-4]` |
| 13 | `configuracoes` (limites de upload) | `[07-G]` |
| - | **Marcador `[07-DEMONSTRACAO]`**: daqui para baixo, só desenvolvimento e aula | - |
| 14 | Leitura liberada de desenvolvimento | `[07-B-4]` |
| 15 | `arquivo` (vazio) | `[07-C-4]` |
| 16 | `usuario` | `[07-D-1]` |
| 17 | `usuario_papel` | `[07-D-2]` |
| 18 | `termos_de_uso` (versões antigas), `usuario_termo` e o parâmetro pessoal do admin | `[07-D-6]` |
| 19 | `perfil_pesquisador` (com chave Pix e aceite do termo de pesquisador) | `[07-D-3]` |
| 20 | `verificacao_email` | `[07-D-8]` |
| 21 | `link_academico` | `[07-F-1]` |
| 22 | `campanha` | `[07-E-1]` |
| 23 | `orcamento_campanha` e `marco_cronograma` | `[07-E-1b]` |
| 24 | `historico_rejeicao` | `[07-E-6]` |
| 25 | `atualizacao_campanha` | `[07-E-3]` |
| 26 | `comentario` (e os endossos, como o dono) | `[07-E-7]` |
| 27 | `seguir_campanha` e `seguir_pesquisador` | `[07-E-2]`, `[07-D-4]` |
| 28 | `contribuicao` (todas nascem pendentes) | `[07-H-1]` |
| 29 | `aceite_termo_contribuicao` | `[07-H-3]` |
| 30 | A vida de cada contribuição pelas funções do sistema: avisos do provedor, auditoria financeira, repasses, denúncias, pedidos de encerramento e contestações | `[07-H-5]` |
| 31 | `recompensa`, `link_recompensa`, `contribuicao_recompensa` | `[07-E-8]` |
| 32 | `notificacao` | `[07-D-7]` |
| 33 | `termos_de_uso` (rascunhos da próxima versão) | `[07-H-4]` |
| - | Resumo da demonstração e como entrar no sistema | `[07-D-5]` |
| 34 | `recalcular_todos_os_scores()` (rede de segurança) | `[07-I-3]` |

### Detalhamento

* **[07-I-1] `score_config` e `score_rotulo`:** as quatro dimensões (Perfil Acadêmico 30, Histórico 25, Atualização 20, Reputação 25) e os itens de cada uma; as faixas de rótulo cobrindo 0 a 100. No Perfil Acadêmico, Lattes e ORCID valem 8 cada, "outro link" 6, instituição e título 4 cada; na Reputação, perfil 10 e campanhas 15.
* **[07-B-1] `papel`:** os 7 papéis, com `codigo`, `descricao` e `ordem_exibicao` (admin 1, moderador 2, revisor 3, suporte 4, curador 5, pesquisador 6, usuario 7). `ON CONFLICT DO NOTHING`; os ids não são fixados em lugar nenhum: `papel_permissao` e `usuario_papel` sempre resolvem pelo nome ou pelo código. Não existe papel "apoiador": contribuir não é ação restrita a um papel.
* **[07-B-2] `permissao`:** nomes no formato `entidade_acao` (Anexo B). Não existe permissão de "encerrar campanha direto": o encerramento antes do prazo é pelo pedido, pelo "Cancelar o projeto" ou pela moderação a partir de uma denúncia ([04-E]).
* **[07-B-3] `papel_permissao`:** resolvido pelo nome. As linhas `('admin', ...)` são redundantes com `trg_permissao_auto_admin`, mas ficam explícitas para documentar "o admin tem tudo" sem abrir outro arquivo. O que cada papel tem está em [01-B-1]. Três regras de separação de funções:
  * **Só o admin muda a pontuação** (`score_editar`): os requisitos dizem que pesos e faixas são do Administrador. O revisor que tenta salvar não recebe erro do banco (a RLS filtra: 0 linhas), e o Nest transforma isso em falta de permissão. Suíte 41.
  * **O curador aprova e rejeita campanhas e cuida dos catálogos; o Termo de Uso é só do admin:** publicar uma versão nova obriga todas as contas a aceitar de novo, e documento jurídico fica com o dono do sistema. O curador tem `relatorio_visualizar`, sem a qual a fila de aprovação ficaria vazia para ele.
  * **O revisor só lê** (`relatorio_visualizar`, `auditoria_financeira_visualizar`, `log_visualizar`), sem dados pessoais (LGPD), como o "Viewer" do Google Cloud.
* **[07-B-4] Desenvolvimento: toda conta logada lê tudo.** O papel `usuario` recebe as 6 permissões de **leitura** (`relatorio_visualizar`, `usuario_visualizar_sensivel`, `perfil_pesquisador_visualizar_sensivel`, `contribuicao_visualizar_sensivel`, `auditoria_financeira_visualizar`, `log_visualizar`), para qualquer papel testar todas as telas. Nenhuma permissão de alterar. Como fica depois do marcador, o banco de produção nasce sem elas; as suítes de teste do banco rodam as regras de produção sem essas permissões.
* **[07-C-5] `configuracoes`:** agrupado por domínio; a ordem do `INSERT` é a ordem que a tela de Parâmetros mostra (`id_config`). **Sem "alavanca fantasma":** chave sem nenhum consumidor não entra, porque o admin mudaria algo e nada aconteceria (pior que um valor fixo, porque parece que devia funcionar). A **descrição** de cada parâmetro é o que o admin lê primeiro na tela de Parâmetros: sem número de RF, sem nome de coluna nem de outra chave. Janelas de tempo de produto (validade da sessão, do link de verificação, do pedido de nova senha) são parâmetros; parâmetros de segurança, como o custo do bcrypt, ficam no código.
* **[07-I-2] Constantes do score:** `score_frequencia_esperada_mensal` e `score_denuncias_para_zerar`, para o admin ajustar a régua pelo painel.
* **[07-L] Retenção do log:** `log_auditoria_retencao_dias` (365) e `ip_aceite_contribuicao_retencao_dias` (1825) ([05-L]).
* **[07-I-4] Cores da espera:** `espera_atencao_dias` (7) e `espera_critica_dias` (30), públicos, conferidos como par mínimo e máximo ([05-K-2-C], [05-K-2-K]).
* **[07-G] Limites de upload:** as 7 chaves de arquivo (tamanho mínimo e máximos, cota por conta, limite de envios por janela, intervalo mínimo). Quem as lê é o Nest (`ConfiguracaoValorService`, `DOCUMENTACAO_BACKEND.md`, seção 8).
* **[07-D-6] e [07-H-3] Termos e aceites:** o `tipo_termo` tem só `'cadastro'` (o termo da conta, que cobre também as contribuições) e `'upgrade_pesquisador'`. Cada contribuição registra em `aceite_termo_contribuicao` a versão do termo da conta vigente naquele momento (RF-054, RF-055), o que cobre também quem contribui sem conta. ⚠️ Publicar uma versão nova sem desativar a anterior quebra o índice `uq_termos_uso_ativo` ([02-D]): desativar a velha e inserir a nova precisam estar na mesma transação.
* **[07-D-5] Como entrar no sistema depois do seed:** qualquer conta da demonstração entra com `DevTcc123!`. Num banco sem a demonstração, a primeira conta é criada pelo cadastro (que dá o papel `usuario`, [08-D-1]) e promovida a admin uma vez, à mão: `INSERT INTO usuario_papel (id_usuario, id_papel) SELECT <id_usuario>, id_papel FROM papel WHERE codigo = 'admin'`.
* **[07-I-3] Recálculo final:** cada `INSERT` acima já dispara a trigger de recálculo, então a pontuação já estaria certa; `recalcular_todos_os_scores()` no fim é só a rede de segurança, caso uma trigger seja desligada no futuro.

---

## 08. ATRIBUIÇÃO DE PAPEL PADRÃO NO SIGNUP (`08_trigger_signup_usuario.sql`)

### Visão Geral

O menor arquivo do banco: uma função e um `GRANT`. O nome do arquivo diz "trigger", mas **não há trigger nenhuma aqui**: o conteúdo é uma função chamada pelo Nest. O nome ficou porque os arquivos numerados não são renomeados.

### [08-D-1] `atribuir_papel_padrao(p_id_usuario)`

* **Quando roda:** o Nest a chama na mesma transação do cadastro, logo depois do `INSERT` em `usuario`. O cadastro completo: 1) gravar a conta com o hash da senha; 2) chamar esta função; 3) gravar o aceite do termo (`registrar_aceite_termo`, [03-D-1]) e o token de verificação de e-mail, que vai para a fila de e-mails ([05-Q]).
* **Por que `SECURITY DEFINER`:** `pol_usuariopapel_insert` (`04`) exige `papel_atribuir`, e quem acabou de se cadastrar não tem papel nenhum ("ovo e galinha"). A função grava só o papel `usuario` (reconhecido pelo código), nunca `admin`.
* **`ON CONFLICT DO NOTHING`:** chamar duas vezes para a mesma conta (ex.: nova tentativa da rede) não dá erro.
* **`REVOKE ... FROM PUBLIC` + `GRANT EXECUTE` só para `app_nestjs`:** a função escreve em `usuario_papel`.

---

# 📎 ANEXOS

O raciocínio de arquitetura por trás de regras que valem para o banco inteiro.

---

## Anexo A - Por que a autenticação própria funciona do jeito que funciona

* **React → NestJS → Postgres:** o navegador nunca fala direto com o banco; o Supabase Auth (GoTrue) e o PostgREST não são usados. Quem valida o JWT é o Nest, que diz ao banco quem está pedindo com `set_config('app.id_usuario_atual', '<id>', true)` no começo de cada transação ([03-J]). O valor é local à transação e some no `COMMIT`/`ROLLBACK`, o que é seguro com o pool de conexões, desde que cada requisição use **uma** conexão do pool dentro de uma transação, nunca um `pool.query(...)` solto (`DOCUMENTACAO_BACKEND.md`, seção 2).
* **`usuario` não tem coluna ligada a `auth.users`:** sem o Supabase Auth, ela não apontaria para nada. Se um dia entrar login social como método **adicional**, uma coluna assim pode voltar, sem FK e opcional.
* **O cadastro é um passo explícito no Nest,** na mesma transação: hash da senha, papel padrão (`atribuir_papel_padrao()`, [08-D-1]), aceite do termo e e-mail de verificação. Fica tudo num lugar só, mais fácil de testar e de registrar erro.
* **Por que a RLS existe mesmo com o Nest sendo o único cliente:** é **defesa em profundidade**. Se um service esquecer um `WHERE id_usuario = ...`, tiver uma falha de injeção de SQL ou uma credencial vazar, a RLS ainda impede que uma pessoa leia ou altere o dado de outra. O custo é baixo, porque a maior parte das policies é regra de negócio pura (o dono vê o próprio recurso, campanha aprovada é pública).
* **Portabilidade:** RLS é do Postgres e não migra para outro banco. Trocar de banco perderia essa camada (recriável ou não na tecnologia nova); por isso as regras que o Nest também confere não dependem só dela.

---

## Anexo B - Por que o RBAC é 100% orientado a dado, nunca a nome de papel

* **Uma função só decide permissão, `tem_permissao(...)`** ([03-B]); nenhuma policy nem função confere nome de papel. Um "é admin?" genérico criaria dois vocabulários de autorização (nome de papel × permissão), e os outros papéis (moderador, revisor, curador, suporte) nunca seriam respeitados por uma policy que só soubesse distinguir admin de não admin.
* **A rede de segurança do admin** é `trg_permissao_auto_admin` ([05-K-3]): toda permissão nova nasce dada ao papel `admin`, que ninguém precisa lembrar de atualizar.
* **Quando uma permissão nova é criada:** reaproveitar uma permissão existente e equivalente sempre que houver; para uma entidade filha de outra já coberta (o arquivo ou o link de uma atualização), usar a permissão da entidade-mãe (`atualizacao_moderar`, `campanha_editar`); criar permissão nova só quando não houver equivalente.
* **Nome no formato `entidade_acao`**, minúsculo, sem acento. A ação de negócio usa o mesmo nome do segmento da rota (`POST /campanha/:id/aprovar` → `campanha_aprovar`), o que facilita a auditoria. E o essencial: **o que o dono faz com o próprio recurso não vira permissão**, continua resolvido pela RLS de posse (`id_usuario = id_usuario_atual()`). Só viram permissão as ações sobre recurso de terceiro, ou que não pertencem ao dono (aprovar, moderar, atribuir papel).
* **O Nest e a RLS falam o mesmo vocabulário:** onde o Nest confere uma permissão, ele pergunta à mesma `tem_permissao()` com a mesma string (`DOCUMENTACAO_BACKEND.md`, seção 4); se as duas camadas usassem nomes diferentes, divergiriam em silêncio.
* **O papel `pesquisador` não tem permissões próprias:** as policies conferem a existência do `perfil_pesquisador` (ativo), não o papel. O papel existe para a lista de Usuários e para uma permissão futura de pesquisador que não dependa do perfil, e é dado sozinho no upgrade (`trg_perfil_atribui_papel_pesquisador`, [05-K-3]).

---

## Anexo C - Os contextos de link: três colunas, não tabela

* **Como é:** `tipo_link` diz onde cada tipo pode ser usado com três colunas booleanas (`permite_perfil`, `permite_atualizacao`, `permite_recompensa`), lidas por `trg_valida_escopo_tipolink` ([05-K-1]).
* **Por quê:** dos cinco tipos ativos, só o `GITHUB` usa mais de um lugar, e não há um quarto lugar previsto. Três colunas são fáceis de ler num `SELECT * FROM tipo_link`.
* **Se um dia aparecer um quarto lugar,** o caminho é trocar as três colunas por uma coluna de vetor de ENUM (`contextos contexto_link[]`), como o vetor `dominio` da mesma tabela. **Não** uma tabela dinâmica `contexto_link`/`tipolink_contexto`: ela exigiria `JOIN` em toda consulta, uma tela administrativa própria e uma trigger para garantir pelo menos um lugar por tipo, sem flexibilidade real (todo lugar novo pede código novo para ser interpretado, com tabela ou sem).

> 📌 **Por que `atribuir_papel_padrao()` não tem `GRANT` no `06`:** o `06` roda antes do `08`; a função ainda não existiria. O `GRANT EXECUTE` dela fica junto dela, no `08`.

---

## Anexo D - Onde mora uma regra de negócio: banco ou Nest

**Critério:**

> Se um defeito no Nest violar essa regra, **alguém perde dinheiro ou dado**? → fica no banco.
> Se a regra é só **escolha de negócio, sem consequência de integridade**? → pode ir para o Nest.

* **Fica no banco:** o tudo-ou-nada do repasse, o congelamento da campanha depois da aprovação (`fn_congela_regras_campanha`), a **transição de status da campanha** (`fn_valida_transicao_campanha`) e toda mudança de dinheiro.
  * **Por que a transição fica no banco:** uma cadeia de fraude testada de ponta a ponta (o pesquisador cria a campanha, aprova a própria campanha, doa para si mesmo e marca a doação como paga) passava por todas as rotas do Nest; quem a impediu foi a trigger do banco.
* **Pode ir para o Nest:** o limite de campanhas simultâneas por pesquisador e o limite de denúncias por dia.
* **Como aplicar:** não existe rodada dedicada a "migrar regra". Quando alguém for mudar uma regra que está em "pode ir para o Nest", aproveita a mudança para levá-la, nunca como projeto à parte.

---

## Anexo E - Como testamos o banco sem tocar no Supabase (PGlite)

**O que é.** PGlite (`@electric-sql/pglite`) é o PostgreSQL de verdade, compilado para WebAssembly, rodando dentro de um processo Node, em memória. É o mesmo motor, então `CREATE TRIGGER`, `CONSTRAINT TRIGGER ... DEFERRABLE`, `EXCLUDE USING gist`, RLS, `SECURITY DEFINER`, `SET ROLE` e `ERRCODE` se comportam como no Supabase. Cada execução nasce vazia e some ao terminar: sem servidor, sem senha, sem rede.

**Para que serve aqui.** A maior parte das regras de negócio mora em triggers e funções, e regra que ninguém exercita só é descoberta quando alguém esbarra nela. Com o PGlite, o banco é montado **inteiro** a partir dos arquivos `01` a `08`, e cada fraude ou erro que o sistema deve barrar é tentado de verdade, conferindo o ERRCODE. Achou o que só ler o código não achava (ex.: o total arrecadado errado em silêncio para quem doava, a rejeição sem histórico).

**O que ele não é.** Não é o banco de ninguém: nada do que roda nele muda o Supabase. Ele responde "este SQL funciona e faz o que eu disse?" antes de o banco ser recriado.

**A técnica:**
1. Um script Node cria `new PGlite({ extensions: { pgcrypto } })` e executa os 8 arquivos em ordem.
2. Funções isoladas são **extraídas do arquivo-fonte por código** (do `CREATE OR REPLACE FUNCTION` até o `$$;`), nunca redigitadas de memória.
3. Cada caso roda entre `BEGIN` e `ROLLBACK`; o esperado é `OK` ou `ERRO <SQLSTATE>`.
4. Para simular o Nest: `SET LOCAL ROLE app_nestjs` e `select set_config('app.id_usuario_atual', '17', true)`. **Sem isso o teste roda como `postgres`, que ignora a RLS e esconde os defeitos de privilégio.**
5. Para preparar um dado que o banco proibiria criar (campanha com data no passado): `SET LOCAL session_replication_role = replica` desliga as triggers só naquele trecho, e `= origin` religa.

**Cuidados conhecidos.** No Windows, o Node imprime `Assertion failed ... UV_HANDLE_CLOSING` ao encerrar: é ruído do PGlite, o resultado antes dele vale. `ROLLBACK` depois de um `COMMIT` que já falhou por constraint diferida derruba o PGlite. Cada instrução solta é sua própria transação, então um teste que passa por um estado intermediário inválido precisa de `BEGIN ... COMMIT` explícito. E, ao gerar `.sql` por script JavaScript, nunca `texto.replace(a, b)` quando `b` contém `$$` (o JavaScript trata `$$` como um `$` só e corrompe o corpo das funções): `replace(a, () => b)`.

**Onde ficam os testes.** Numa pasta local de testes do banco, fora do repositório: as suítes numeradas (uma por regra ou módulo, cada uma montando o banco do zero), o executor que grava o relatório, as ferramentas de conferência (tipos do Nest contra o banco, documentação contra o código, valores escritos no React) e os snapshots de comportamento. As suítes de caracterização de `campanha` e `comentario` (grade de estados × usuários × operações) são a rede de segurança das regras mais críticas.

---

## Anexo F - ENUM ou tabela de catálogo

* **`ENUM` é um contrato** que trigger, policy e função assumem. Se o admin pudesse criar `status = 'suspenso_temporario'` pelo painel, nenhuma regra saberia tratar o valor, e a campanha entraria num estado que ninguém previu, em silêncio. Configurável demais, o sistema vira um segundo banco de dados mal feito dentro do primeiro (*inner-platform effect*).
* **Critério:** se o admin adicionar um valor novo, alguma regra precisa saber o que fazer com ele? Se sim, fica `ENUM` (mudança vira código, com revisão); se não, pode virar catálogo.
  * `status_campanha`, `status_contribuicao`, `status_encerramento` e `modelo_campanha` ficam `ENUM`: a lógica depende do valor.
  * `titulo_academico` (só conferido como preenchido ou não, no score) e `meio_pagamento` são candidatos a catálogo no futuro.
  * `permissao` continua só leitura pela API: uma permissão só existe de verdade quando alguma policy ou função a confere; criar a linha sem a regra vira um botão que não faz nada.

---

## Como conferir este inventário

**Contagem do inventário** (recontada nos `.sql` em 24-10-2026; evite repetir estes números em outros documentos, eles envelhecem): **43 tabelas**, **118 policies**, **108 triggers** no `05` (104 comuns e 4 `CONSTRAINT TRIGGER`), **182 funções** (143 no `05`, 37 no `03`, 1 no `08`, 1 no `01`), **65 índices** no `02` e **131 códigos** de ERRCODE próprio (tabelas no `DOCUMENTACAO_ERRCODE.md`).

Para recontar direto do banco (no SQL Editor do Supabase ou no banco local):

```sql
-- Tabelas (do esquema public, sem as internas do Postgres e das extensões)
SELECT count(*) FROM pg_tables WHERE schemaname = 'public';

-- Policies de RLS
SELECT count(*) FROM pg_policies WHERE schemaname = 'public';

-- Triggers (NOT tgisinternal tira as triggers automáticas das FKs)
SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal;

-- Funções do esquema public (03 + 05 + 08 + 01)
SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
```

Ou nos arquivos: `grep -c "CREATE TABLE" 01_extensoes_enums_tabelas.sql`, `grep -c "^CREATE POLICY" 04_rls_policies.sql`, e assim por diante.
