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
| **L** | LOG DE AUDITORIA (quem alterou o quê e quando — `log_auditoria`) | `01-L`, `02` *(sem bloco — índice já documentado junto da tabela)*, `04-L`, `05-L`, `06-L` |

> 📌 Por que `J` e `K` existem: nem tudo no banco pertence a um domínio de dado único. `id_usuario_atual()` (`03`) não é sobre nenhuma tabela específica — é infraestrutura de sessão usada por tudo. E várias triggers de `05` (ex.: validar repasse financeiro de uma campanha, ou impedir denúncia excessiva) mexem em mais de uma tabela de domínios diferentes ao mesmo tempo — forçá-las dentro de uma letra só (`E` ou `H`, por exemplo) esconderia que elas são regras de fronteira entre domínios, não de um domínio só. Por isso ganham letras próprias em vez de reaproveitar `A`-`I` com um significado diferente do já estabelecido. `L` (log de auditoria, 03-08-2026) segue a mesma lógica: não pertence a nenhum domínio específico (a mesma trigger genérica se aplica a `usuario`, `perfil_pesquisador`, `configuracoes`, RBAC e vários catálogos ao mesmo tempo).

---

## 01. EXTENSÕES, ENUMS E TABELAS (`01_extensoes_enums_tabelas.sql`)

### [01-A] Bootstrap, Extensões e ENUMs

* **Transição de Autenticação (Supabase $\rightarrow$ NestJS Próprio):** O projeto migrou do modelo de autenticação delegada (Supabase Auth/PostgREST) para uma arquitetura com backend próprio em NestJS.
* **Role `app_nestjs`:** O sistema utiliza uma única role de aplicação para gerenciar a conexão da API com o PostgreSQL. A criação dessa role é executada via bloco `DO $$` no topo do script 01 para garantir sua existência antes da criação de qualquer política de RLS (arquivo 04).
* 🗑️➡️✅ **Senha Placeholder — CORRIGIDO (28-07-2026):** a role nasce `NOLOGIN`, sem senha nenhuma — não mais com `LOGIN PASSWORD 'TROCAR_NO_AMBIENTE_REAL'`. A versão anterior falhava **aberta**: esquecer de trocar a senha em produção deixava o sistema funcionando normalmente com uma credencial conhecida publicada no próprio repositório Git, sem nenhum aviso. Com `NOLOGIN`, esquecer o passo de instalação falha **fechada**: o NestJS simplesmente não consegue conectar (`FATAL: role "app_nestjs" is not permitted to log in`), erro percebido em minutos. `GRANT` e `SET ROLE` continuam funcionando normalmente numa role `NOLOGIN` — só o login direto fica bloqueado até alguém rodar `ALTER ROLE app_nestjs LOGIN PASSWORD '...'`, passo obrigatório de instalação documentado em `tutorial-rodar-projeto.md`.
* 🗑️➡️✅ **Guarda de `BYPASSRLS` — ADICIONADO (28-07-2026):** bloco `DO $$` logo após a criação da role, que verifica se `current_user` tem `rolsuper` ou `rolbypassrls` e aborta o bootstrap com uma mensagem única e explicativa se não tiver. Não resolve sozinho a pendência de confirmar se o papel do SQL Editor do Supabase tem `BYPASSRLS` (ver `PENDENCIAS e correcoes.md`, item 22, ainda em aberto) — mas transforma uma falha silenciosa (dezenas de erros de RLS espalhados pelos arquivos `04`-`07`, já que 99 das 116 policies são `TO app_nestjs` e as 42 tabelas têm `FORCE ROW LEVEL SECURITY`) numa parada única e autoexplicativa logo no início. *(Números atualizados em 03-08-2026 — auditoria do Claude Web encontrou o inventário desatualizado em vários pontos deste documento; ver seção "Como conferir este inventário", ao final, pra sempre recontar em vez de confiar em número fixo.)*
* **Extensão `pgcrypto`:** Ativada no início do script para fornecer suporte a funções criptográficas, como a geração de UUIDs (`gen_random_uuid()`).
* **Evolução dos ENUMs:**
  * `status_campanha` e `status_contribuicao`: Incluem estados para tratar fluxos de moderação, rejeição, expiração e reembolsos manuais.
  * `tipo_motivo_denuncia`: Categoriza denúncias entre alvos de campanha e perfis de pesquisadores.
  * 🗑️➡️✅ **`tipo_vinculo` (ADICIONADO, 28-07-2026):** `'institucional'` / `'independente'` — ver `[01-D]` (`perfil_pesquisador`) para o raciocínio completo.

---

### [01-B] RBAC (Controle de Acesso Baseado em Papéis)

* **Estrutura:** Composta pelas tabelas `papel`, `permissao` e a tabela de ligação `papel_permissao`.
* **Desvinculação do Banco:** As permissões granulares são checadas dinamicamente na aplicação NestJS e na função `public.tem_permissao()`.
* 🗑️➡️✅ **`papel.codigo` — coluna nova (03-08-2026, achado de revisão externa):** `papel` só tinha `nome` (o rótulo, editável) — e 3 pontos do banco reconheciam um papel especial pelo TEXTO desse rótulo, sem trava nenhuma: `trg_admin_recebe_toda_permissao()` (`05`, `WHERE p.nome = 'admin'`), `fn_atribuir_papel_pesquisador()` (`05`, `WHERE nome = 'pesquisador'`) e `atribuir_papel_padrao()` (`08`, `WHERE nome = 'usuario'` — roda em todo cadastro real). Renomear qualquer um dos três pelo painel (não existe essa tela ainda, mas está a caminho) pararia essas 3 automações em silêncio, sem erro nenhum — testado e confirmado antes de corrigir. Mesmo padrão já usado em `tipo_link.codigo`/`motivo_denuncia.codigo` (`[01-C]`): `codigo VARCHAR(20) NOT NULL UNIQUE`, estável, nunca exposto pra edição — seedado (`07`, `[07-B-1]`) igual ao `nome` atual dos 7 papéis, então nada muda de comportamento hoje. As 3 funções passaram a ler `WHERE codigo = '...'`. Detalhamento completo (por que não é um bug ativo ainda, já que não existe endpoint de editar papel) em `temp_Nest_React.md`.

---

### [01-C] CONFIG (Configurações, Catálogos e Arquivo Base)

* **`configuracoes`:** Permite armazenar parâmetros globais do sistema (`id_usuario IS NULL`) e preferências individuais de usuários (`id_usuario` preenchido). Possui constraint `UNIQUE` na coluna `chave` para suportar operações de *upsert*.
* **`tipo_link`:** Catálogo centralizador de redes e links externos. Os campos booleanos `permite_perfil`, `permite_atualizacao` e `permite_recompensa` definem o escopo de uso de cada tipo. 🗑️➡️✅ **Coluna `codigo` nova (28-07-2026):** `motivo_denuncia` e `area_conhecimento` já tinham chave natural estável (`codigo`/`codigo_cnpq`); `tipo_link` era a única tabela de catálogo sem uma. Virou necessário quando o seed (`07`) passou a referenciar catálogo por chave natural em vez de id posicional (ver `PENDENCIAS e correcoes.md`, item 36, sobre o bug que essa prática expôs). Valores: `LATTES`, `ORCID`, `RESEARCHGATE`, `LINKEDIN`, `GITHUB`, `SITE_INSTITUCIONAL`, `OUTRO`. 🗑️➡️✅ **Reaberto e resolvido (28-07-2026):** a allowlist tinha fechado em 5 tipos com base numa checagem incompleta (só viu quais foram seedados, não os RF-014 que listam 7, incluindo "Site Institucional" e "Outro"). Os dois voltaram ao catálogo com `regex`/`dominio = NULL` de propósito (não têm domínio fixo pra validar — a aplicação valida só o formato genérico de URL) e `permite_perfil = TRUE` (mesmo escopo inicial dos outros tipos de identidade). Resolve também o item 19(e). 🗑️➡️✅ **`link_atualizacao`/`link_recompensa` destravadas pro GitHub (28-07-2026, item 15 da Lista C — decisão da Alexia):** antes, os 3 campos de escopo caíam todos no `DEFAULT` (só `permite_perfil=TRUE`), deixando `link_atualizacao`/`link_recompensa` impossíveis de usar (a trigger `trg_valida_escopo_tipolink` rejeitava qualquer linha). `GITHUB` ganhou `permite_atualizacao`/`permite_recompensa=TRUE` — exemplo dela: repositório de código como prova de progresso, ou como acesso antecipado (`tipo_recompensa='acesso_antecipado'`) a um repo privado. Os outros 4 tipos continuam só `permite_perfil` (identidade profissional, menos natural numa atualização/recompensa).
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
  * 🗑️➡️✅ **`deletado_em TIMESTAMP` / `deletado_por INT REFERENCES usuario` — colunas novas (28-07-2026, Claude Web — "excluir conta não deixa rastro"):** `excluir_conta_usuario()` (`03`, `[03-F]`) gravava só `deletado = TRUE`, sem quem fez nem quando — furo de conformidade com o Art. 37 da LGPD (registro das operações de tratamento; exclusão é a mais sensível). Preenchidas só pela própria função, nunca por `UPDATE` direto do app (fora do `GRANT UPDATE`, dentro do `GRANT SELECT` — `06`, `[06-D-2]`/`[06-D-9]`).
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
  * 🗑️➡️✅ **`CK_CAMPANHA_PRAZO` virou limite técnico largo (28-07-2026, item 16 da Lista C):** era `BETWEEN 15 dias AND 90 dias` — a regra de negócio real, misturada com o limite técnico na mesma constraint. Agora a constraint só barra erro grosseiro (1-365 dias); a regra de negócio mudou pra uma trigger (`fn_valida_prazo_campanha_negocio`/`trg_campanha_valida_prazo_negocio[_update]`, `05`, ver `[05-K-2]`) que lê `configuracoes.prazo_minimo_campanha_dias`/`prazo_maximo_campanha_dias` — mudar a política de prazo vira um `UPDATE` numa linha, não uma migração de constraint. **Decisão final (mesma data):** 15 a 60 dias (não 90) — qualquer duração nesse intervalo serve, `prazo_maximo_campanha_dias` foi de `90` pra `60`. As campanhas do seed com duração maior que 60 dias (histórico anterior à decisão) foram grandfathered — a trigger fica desligada só durante a carga do seed.
  * 🗑️➡️✅ **Feature "Em breve" / rascunho agendado (28-07-2026):** o pesquisador pode lançar a campanha na hora ou agendar um início futuro (contador regressivo no front, mesma ideia do Catarse) — sem precisar de status novo nem de coluna nova. Campanha aprovada já fica pública normalmente (`pol_campanha_select` libera por status, sem olhar `data_inicio`); o que muda é que `fn_valida_contribuicao_campanha_ativa()` (`05`, `[05-K-2]`) passou a bloquear contribuição também quando `data_inicio` está no futuro — comparado em tempo real, sem job/cron pra "virar ativa" sozinha. E `fn_congela_regras_campanha()` mudou: `data_inicio`/`data_fim` só congelam quando a campanha **já começou de fato** (`data_inicio` no passado), não mais no momento da aprovação — o pesquisador pode reagendar o início livremente enquanto está "Em breve" (as outras regras — meta/modelo/taxa/título/descrição — continuam congelando desde a aprovação, como já era).
  * 🗑️➡️✅ **`id_area_conhecimento` virou `NOT NULL` (28-07-2026):** a trigger de nível 2 (`[05-K-1]`) já bloqueava apontar pra grande área raiz, mas deixava `NULL` passar — uma campanha podia ficar sem nenhuma área, o que a escondia de qualquer filtro (pior do que aparecer só na grande área). Fecha a decisão de "nível 2 obrigatório" já tomada; as 10 campanhas do seed já cumpriam antes da mudança.
  * 🗑️➡️✅ **`encerrado_em TIMESTAMP` — coluna nova (27-07-2026):** nullable, sem valor padrão, **não** é congelada por `fn_congela_regras_campanha()` (é justamente o campo que precisa poder ser preenchido no momento do encerramento). Registra a data real de encerramento (natural, antecipado via RF-042 ou por moderação) — algo que `data_fim` deixou de conseguir representar depois de virar uma promessa congelada (ver `[05-K-2]`). 🗑️➡️✅ **BUG CORRIGIDO (28-07-2026, achado pelo Claude da Alexia):** a coluna nascia e ficava `NULL` pra sempre — nenhuma trigger, função ou `UPDATE` gravava nela. Trigger nova `fn_preenche_encerramento_campanha`/`trg_campanha_preenche_encerramento` (`05`, `[05-K-2]`) grava `NOW()` automaticamente quando o status entra em `'encerrado'`/`'encerrado_moderacao'`, sem depender do backend lembrar disso em toda rota que muda status.
  * 🗑️➡️✅ **`taxa_plataforma` passou a ser carimbada na aprovação (28-07-2026, item 20 da Lista C — RF-036):** a coluna existia mas nada nunca a preenchia — testado direto (criar campanha, aprovar): nascia `NULL` e continuava `NULL`. Trigger nova `fn_carimba_taxa_plataforma_aprovacao`/`trg_campanha_carimba_taxa` (`05`, ver `[05-K-2]`) copia `configuracoes.taxa_plataforma_padrao` no momento exato em que `aprovado_em` deixa de ser `NULL`, só se ainda não houver um valor customizado. Dali em diante a trigger de congelamento (`[05-K-2]`) já protege o valor.
  * 🗑️➡️✅ **`video_apresentacao_url VARCHAR(500)` — coluna nova (28-07-2026, item 19(c) da lista de pendências — RF-033):** vídeo de apresentação opcional em destaque na página da campanha. Só a URL (ex.: YouTube/Vimeo) — o arquivo de vídeo em si não é armazenado pela plataforma. Nullable, sem regra de congelamento própria (não está na lista de `fn_congela_regras_campanha`, então pode ser trocado a qualquer momento, diferente de título/descrição).
  * 🗑️➡️✅ **`CK_CAMPANHA_DESCRICAO_TAMANHO` — constraint nova (28-07-2026, achado do Claude Web):** `descricao` era `TEXT` sem limite nenhum. Limite técnico largo aqui (20.000 caracteres, só pra barrar absurdo); o limite de negócio de verdade (5.000, configurável) mora em `configuracoes.limite_caracteres_descricao_campanha` + trigger (`05`, `[05-K-1]`).
  * 🗑️➡️✅ **`CK_CAMPANHA_META_FINANCEIRA_POSITIVA` — constraint nova (28-07-2026, Claude Web — 5ª auditoria, MÉDIO 3):** `meta_financeira = 0.00` era aceita (reproduzido) — numa `all-or-nothing`, meta zero é sucesso instantâneo. Mesmo padrão do prazo: limite técnico largo aqui (só `> 0`); o mínimo de negócio de verdade (500,00, configurável) mora em `configuracoes.meta_minima_campanha` + trigger (`05`, `[05-K-2]`).
* **`atualizacao_campanha`:** Postagens de acompanhamento do projeto. O campo `ativo` permite o *soft delete* e a ocultação por moderação sem perda do histórico. 🗑️➡️✅ **`CK_ATUALIZACAO_CAMPANHA_CONTEUDO_TAMANHO` — constraint nova (28-07-2026, achado do Claude Web):** mesmo raciocínio de `CK_CAMPANHA_DESCRICAO_TAMANHO` — limite técnico largo aqui (20.000), limite de negócio configurável (5.000, `configuracoes.limite_caracteres_conteudo_atualizacao`) via trigger.
* 🗑️➡️✅ **`orcamento_campanha` e `marco_cronograma` — tabelas novas (31-07-2026, Alexia; valores corrigidos 01-08-2026):** orçamento estruturado (itens com categoria + valor, pra virar gráfico de pizza) e cronograma estruturado (marcos com título/descrição/data prevista), inspirados no Experiment.com. Substituem a antiga prática de descrever isso só em texto livre dentro de `campanha.descricao`. Decisão de produto confirmada por Lucas: **ambos são obrigatórios** pra aprovar uma campanha, não opcionais.
  * **Regras de negócio (todas em `05`, `[05-K-2]`):** orçamento congela na aprovação (mesma condição de `fn_congela_regras_campanha`, sem exceção nem pra admin); cronograma congela só quando a campanha começa de fato (`data_inicio <= NOW()`, mesma janela de carência do "Em breve"); data de um marco não pode ser anterior a `data_inicio` (mas pode ultrapassar `data_fim`); soma de `orcamento_campanha.valor` precisa bater **exatamente** com `campanha.meta_financeira` na aprovação.
  * **Quantidade de itens — piso e teto, os dois configuráveis:** `configuracoes.orcamento_min_itens`/`cronograma_min_marcos` (checados na aprovação, `fn_valida_completude_campanha_aprovacao`) e `configuracoes.orcamento_max_itens`/`cronograma_max_marcos` (checados já no `INSERT`, feedback imediato pro pesquisador, `fn_valida_limite_max_orcamento_campanha`/`fn_valida_limite_max_marco_cronograma`).
  * 🐛➡️✅ **Bug de calibração (31-07-2026 → 01-08-2026):** a primeira versão da Alexia guardava só uma chave por tabela (`orcamento_min_itens=10`, `cronograma_min_marcos=20`) usada como **mínimo obrigatório** — ela mesma percebeu a confusão depois: os números 10/20 eram pra ser o **teto**, não o piso (ela sugeriu 2 a 5 pro mínimo de verdade). Corrigido separando em 2 chaves por tabela (min/max); mínimo virou 3 pros dois (meio-termo da faixa sugerida, ajustável livremente depois). Achado e corrigido antes do commit — nunca chegou a rodar contra o banco real.
  * `CK_ORCAMENTO_CAMPANHA_DESCRICAO_TAMANHO`/`CK_MARCO_CRONOGRAMA_DESCRICAO_TAMANHO`: mesmo padrão de todo campo `TEXT` livre no projeto — limite técnico largo aqui (20.000), limite de negócio configurável (2.000, `configuracoes.limite_caracteres_descricao_orcamento`/`limite_caracteres_descricao_marco`) via trigger reaproveitando `fn_valida_limite_texto_livre` (`[05-K-1]`) em vez de duplicar função.
  * **RLS (`04`, `[04-E]`):** leitura segue a MESMA visibilidade de `pol_campanha_select` (por status, dono ou `relatorio_visualizar`) — decisão consciente de não copiar o `USING (TRUE)` de `pol_recompensa_select`, já que expor o orçamento de uma campanha ainda não aprovada não tem por quê. Escrita: dono da campanha ou `campanha_editar`.
  * ⚠️ **Pendente (não é bug):** as 10 campanhas do seed não ganharam linhas de exemplo nestas 2 tabelas — carrega sem erro (a trigger de completude só roda em `UPDATE` pra `'ativo'`, não no `INSERT` do seed), mas qualquer demonstração das telas novas usando o banco de teste vai aparecer vazia pra campanhas antigas.
* **`comentario`:** Interações da comunidade.
  * Unicidade: `UNIQUE (id_campanha, id_pesquisador)` restringe a **um comentário por pesquisador por campanha, para sempre** — a constraint não é condicionada por `ativo`. Ou seja, se o comentário for ocultado por moderação (`ativo = FALSE`), o pesquisador não consegue enviar um comentário novo para aquela campanha; ele só pode reeditar o registro já existente.
  * `CK_COMENTARIO_ENDOSSO`: Constraint garante coerência matemática entre o booleano `endossado` e a sua ordem de exibição (`ordem_endosso`).
  * A policy `pol_comentario_update` (`04_rls_policies.sql`) libera `UPDATE` para o próprio autor sem restringir quais colunas podem mudar — isso já permitiu, no passado, que o autor revertesse sozinho uma moderação (`ativo = FALSE → TRUE`). Já corrigido por trigger; ver `[04-E-4]` mais abaixo para o histórico completo.
* **`denuncia`:** Registro de incidentes apontados por usuários, vinculados a um motivo do catálogo.
  * 🗑️➡️✅ **`relato TEXT` — coluna nova (28-07-2026, item 19(b) da Lista C — RF-019/RF-072):** campo opcional pro denunciante detalhar o caso além do motivo pré-definido do catálogo. Nome escolhido de propósito pra não colidir com `motivo_denuncia.descricao` (o rótulo do motivo, não o relato de quem denuncia). 🗑️➡️✅ **`CK_DENUNCIA_RELATO_TAMANHO` — constraint nova (28-07-2026):** a Alexia avisou no WhatsApp, antes mesmo da coluna existir, que `relato` sem limite "pode dar problema" — o Claude Web confirmou (campo de formulário público, sem limite, vira vetor de abuso). Limite técnico largo aqui (5.000); limite de negócio configurável (1.000, `configuracoes.limite_caracteres_relato_denuncia`) via trigger.
  * 🗑️➡️✅ **`CK_DENUNCIA_ALVO_XOR` — constraint nova (27-07-2026):** antes, nada impedia os dois alvos (`id_campanha_alvo`/`id_pesquisador_alvo`) preenchidos ao mesmo tempo, ou os dois nulos. A constraint exige exatamente um dos dois preenchido. Trabalha em conjunto com a trigger `trg_denuncia_valida_tipo_motivo` (`05`, ver `[05-K-1]`), que garante que o motivo escolhido bate com o alvo.
  * 🗑️➡️✅ **`FK_DENUNCIA_CAMPANHA_ALVO` / `FK_DENUNCIA_PESQUISADOR_ALVO`: `ON DELETE SET NULL` → `ON DELETE RESTRICT` (27-07-2026):** um registro de moderação virar órfão sozinho (o alvo apagado e a denúncia continuando sem saber apontar pra nada) não é o comportamento correto pra um dado de auditoria; `RESTRICT` impede a exclusão do alvo enquanto a denúncia existir. Não muda nada na prática hoje, já que nem `campanha` nem `usuario` têm policy de `DELETE`.
* **`solicitacao_encerramento`:** Registra pedidos de encerramento antecipado de campanha (RF-042). 🗑️➡️✅ **`justificativa_admin TEXT` — coluna nova (28-07-2026, item 19(d) da Lista C — RF-041, a mais urgente das 5 colunas faltantes):** o RF-041 torna obrigatória a justificativa do Administrador ao rejeitar um pedido — antes não existia onde gravar isso, e negar sem registrar o motivo é indefensável se o pesquisador contestar depois. A tabela já tinha `justificativa_pesquisador` (o motivo de quem pede); a nova é o espelho, do lado de quem decide. 🗑️➡️✅ **`CK_SOLICITACAO_JUSTIFICATIVA_PESQ_TAMANHO`/`CK_SOLICITACAO_JUSTIFICATIVA_ADMIN_TAMANHO` — constraints novas (28-07-2026, achado do Claude Web):** as duas colunas eram `TEXT` sem limite. Limite técnico largo aqui (10.000 cada); limite de negócio configurável (2.000, `configuracoes.limite_caracteres_justificativa_encerramento`, compartilhada pelas duas) via trigger.
* **`recompensa`:** Recompensas oferecidas pelos pesquisadores. Possui validações para garantir `valor_minimo > 0` e quantidade disponível não negativa. 🗑️➡️✅ **`CK_RECOMPENSA_DESCRICAO_TAMANHO` — constraint nova (28-07-2026, achado do Claude Web):** mesmo raciocínio das outras — limite técnico largo aqui (10.000), limite de negócio configurável (2.000, `configuracoes.limite_caracteres_descricao_recompensa`) via trigger. 🗑️➡️✅ **ENUM `tipo_recompensa` restringido a recompensa simbólica — CORRIGIDO (28-07-2026):** os valores `fisica` e `outro` foram removidos, sobrando só `digital`, `reconhecimento` e `acesso_antecipado`. Recompensa física cria obrigação de entrega/logística que uma plataforma tocada por 2 pessoas não tem como fiscalizar (motivo original da dúvida sobre manter o domínio inteiro, ver Lista C, item 14, em `PENDENCIAS e correcoes.md`); os 3 valores que sobraram não têm frete, prazo de envio nem disputa de "não recebi" — `reconhecimento` é o pedido da parceira de TCC (nome do doador exibido no projeto), `acesso_antecipado` é o modelo do próprio Experiment.com (referência declarada do projeto). A coluna `tipo` também perdeu o `DEFAULT 'outro'` — nenhum dos 3 valores restantes é um "genérico" natural, a aplicação passa a escolher explicitamente. Feito com a tabela `recompensa` vazia no seed (nenhum dado existente pra migrar) — o Postgres não tem `ALTER TYPE ... DROP VALUE`, então mudar o ENUM contra um banco já populado exigiria recriar o tipo e converter a coluna; vazio, é só editar a definição.

---

### [01-F] LINK (Tabelas de Associação de Links)

* **`link_academico`, `link_atualizacao` e `link_recompensa`:** Reutilizam o catálogo `tipo_link` para associar URLs externas a perfis de pesquisadores, atualizações de campanha e recompensas digitais.
  * 🗑️➡️✅ **`link_academico.rotulo VARCHAR(100)` — coluna nova (28-07-2026, item 19(a) da lista de pendências — RF-014/016/018):** rótulo personalizável por link (ex.: "meu repositório do projeto X" em vez do nome genérico do tipo). Opcional — sem rótulo, o front cai pro nome do `tipo_link`. Vem acompanhada de um limite de 5 links por pesquisador, configurável (ver `trg_link_academico_valida_limite`, `[05-K-1]`) — antes não existia trava nenhuma.

---

### [01-G] ARQUIVO (Tabelas de Associação de Mídias)

* **`arquivo_atualizacao` e `arquivo_recompensa`:** Estabelecem o vinculo N:N entre a tabela base `arquivo` e as entidades de atualização/recompensa.

---

### [01-H] CONTRIBUIÇÃO (Transações e Auditoria Financeira)

* **`contribuicao`:** Registra os apoios financeiros.
  * Valor Mínimo: `CK_CONTRIBUICAO_VALOR_MINIMO` é só limite técnico largo (`valor > 0`) desde 30-07-2026 — o mínimo de negócio de verdade (R$ 5,00, configurável pelo Painel Admin) mora em `configuracoes.valor_minimo_contribuicao` + trigger (`05`, `[05-K-2]`), mesmo padrão do prazo/meta financeira (item 16 da Lista C). Antes disso era `CHECK (valor >= 5.00)` hardcoded — ver `PENDENCIAS e correcoes.md`, item RF-056.
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

> 📌 **Nota de Arquitetura (RBAC e CONFIG):** As tabelas dos blocos `[02-B] RBAC` e `[02-C] CONFIG` não possuem instruções `CREATE INDEX` explícitas neste arquivo porque suas consultas principais já são atendidas pelos índices automáticos criados nativamente pelo PostgreSQL para as chaves primárias (`PRIMARY KEY`) e de unicidade (`UNIQUE`), como `chave` em `configuracoes` e `codigo_cnpq` em `area_conhecimento`. 🗑️➡️✅ **Exceção nova (28-07-2026):** `area_conhecimento.id_pai` — não é PK/UNIQUE, é FK pra montar hierarquia — ver `[02-C]` abaixo.

Os índices explícitos criados neste script foram projetados para três cenários estratégicos:
1. **Chaves Estrangeiras (FKs):** Aceleração de `JOINs` em tabelas filhas para evitar leituras lentas (*sequential scans*).
2. **Caminhos Quentes (*Hot Paths*):** Otimização de fluxos críticos da aplicação, como verificação de tokens, renovação de sessões e filas de background.
3. **Regras de Negócio via Índices Parciais (`UNIQUE ... WHERE`):** Aplicação de restrições de unicidade condicional diretamente no banco de dados.

---

### [02-C] CONFIG

* 🗑️➡️✅ **`idx_area_conhecimento_pai` — novo (28-07-2026, Claude Web — "Problema 3", varredura das 56 FKs contra os índices existentes; 16 estavam sem):** Postgres não cria índice automático em coluna de FK. Sem este, montar a árvore do seletor de área (grande área → nível 2) faz busca completa — 90 linhas é pouco hoje, mesmo padrão já usado em `idx_score_config_pai` (`[02-I]`) pra uma hierarquia idêntica.

---

### [02-D] USUÁRIO

* **Rede de Pesquisadores:** `idx_seguir_pesquisador_alvo` acelera a consulta de quem segue um pesquisador (a ponta `id_usuario` já é coberta pelo índice automático do `UK_SEGUIR_PESQUISADOR_USUARIO_PESQUISADOR`, ver `[02-I]` mais abaixo para o mesmo raciocínio aplicado a `score_pesquisador`). 🗑️➡️✅ **Deixou de ser índice morto (28-07-2026, item 18 da Lista C):** até então, `pol_seg_pesq_select` bloqueava qualquer consulta por `id_pesquisador` (só o próprio seguidor via a própria linha), então esse índice nunca era de fato exercitado por ninguém. `contar_seguidores_pesquisador()` (`03`, ver `[03-E]`) passou a ser exatamente a consulta que usa este índice.
* **Termo Vigente Único (`uq_termos_uso_ativo`):** Índice parcial `UNIQUE` que assegura no banco a existência de no máximo uma versão ativa de termos de uso por vez (`WHERE ativo = TRUE`).
* **Fila de Notificações (`idx_notificacao_status`):** Acelera a consulta do *worker* de background ao buscar mensagens com status `pendente`.
* **Autenticação e Sessão (*Hot Paths*):**
  * `verificacao_email`, `recuperacao_senha` e `sessao`: Índices sobre `token_hash`, `refresh_token_hash` e `id_usuario` previnem chamadas lentas a cada validação de link recebido por e-mail ou *refresh* de token JWT.

---

### [02-E] CAMPANHA

* **Listagens e Filtros de Plataforma:** `idx_campanha_status` e o índice composto `idx_campanha_status_data_fim` otimizam as buscas públicas de campanhas ativas e prestes a encerrar. 🗑️➡️✅ **`idx_campanha_area_conhecimento` — novo (28-07-2026, Claude Web — "Problema 3"):** o de maior impacto dos 16 achados. A busca pública principal do site (filtrar campanha por área — RF que justificou investir nas 81 áreas de nível 2, ver `[01-C]`) fazia varredura completa da tabela sem este índice.
* **Relacionamentos e Moderação:** Índices focados nas FKs de `id_campanha` para tabelas dependentes (`seguir_campanha`, `atualizacao_campanha`, `repasse`, `solicitacao_encerramento`, `historico_rejeicao`, `comentario`, `recompensa` e `denuncia`). 🗑️➡️✅ **`idx_comentario_pesquisador`/`idx_denuncia_motivo` — novos (28-07-2026, Claude Web — "Problema 3"):** aceleram, respectivamente, "meus endossos"/painel de moderação por autor do comentário, e o painel de moderação filtrando denúncias por motivo.

---

### [02-F] LINK

* **Busca de Mídias/Redes Externas:** Índices de apoio às tabelas de associação (`link_academico`, `link_atualizacao` e `link_recompensa`) indexados pelas entidades pai e pelo catálogo `id_tipolink`.

---

### [02-G] ARQUIVO

* **Vínculos de Mídia:** Índices de junção em `arquivo_atualizacao` e `arquivo_recompensa`.
* **Imagem Principal da Recompensa (`uq_arquivo_recompensa_principal`):** Índice parcial `UNIQUE` que assegura que cada recompensa possua no máximo uma mídia marcada como principal (`WHERE principal = TRUE`).

---

### [02-H] CONTRIBUIÇÃO

* **Apoios e Painéis Financeiros:** Índices nas tabelas `contribuicao` (por campanha e usuário), `contribuicao_recompensa` e `aceite_termo_contribuicao` para agilizar a montagem do histórico de doações. 🗑️➡️✅ **`idx_auditoria_financeira_contribuicao` — novo (28-07-2026, Claude Web — "Problema 3"):** RNF-007 (auditoria financeira) — consultar o histórico de eventos de uma contribuição específica fazia varredura completa de `auditoria_financeira` sem este índice.

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

### [03-C] CONFIG — HELPER DE LEITURA (`config_numero`)

* 🗑️➡️✅ **MOVIDO (28-07-2026, Claude Web — "três pontas menores"):** morava em `05_regras_negocio.sql`, mas este arquivo (`03`, que roda ANTES do `05`) já tinha uma função nova chamando `config_numero` (`registrar_falha_login`, `[03-F]`) — o bootstrap completo funcionava só porque nada CHAMA a função antes da hora; rodar `01`→`03` isolado e invocar `registrar_falha_login` já dava `function public.config_numero(unknown, integer) does not exist`. Movida pra cá — helper de leitura de configuração encaixa melhor junto das outras funções de segurança/contexto do que junto das regras de negócio de score.
* **O que faz:** `config_numero(p_chave TEXT, p_padrao DECIMAL) RETURNS DECIMAL` — lê uma constante numérica de `configuracoes` com fallback seguro, nunca retorna `NULL`/erro mesmo que a chave ainda não exista. Usada por praticamente todo `05` (score, limites de negócio) e pelas funções de autenticação de `[03-F]`, neste mesmo arquivo.

---

### [03-J] SEGURANÇA & CONTEXTO DE SESSÃO (`id_usuario_atual`)

* **Mecanismo de Transação:** O NestJS, ao autenticar o JWT e abrir uma transação com o PostgreSQL, executa o comando `SET LOCAL app.id_usuario_atual = '<id>'`.
* **Leitura Segura:** A função lê a variável customizada da sessão do PostgreSQL via `current_setting('app.id_usuario_atual', true)`.
* 🗑️➡️✅ **Tratamento de Nulos — CORRIGIDO (bug crítico, 27-07-2026):** o segundo argumento `true` de `current_setting()` só cobre o caso "variável nunca foi definida" (sessão anônima), retornando `NULL` nesse caso. Ele **não** cobre o caso "variável definida como string vazia `''`" — e `''::INT` lança uma exceção fatal (`invalid input syntax for type integer`), em vez de retornar `NULL`. Como `tem_permissao()` chama esta função por baixo e aparece em 65 das 116 policies de `04_rls_policies.sql`, uma única sessão anônima onde o NestJS interpola algo como `` `${usuario?.id ?? ''}` `` (em vez de simplesmente nunca setar a variável) derrubava **qualquer** consulta a qualquer tabela protegida — inclusive a listagem pública de campanhas, que nem exige login. A correção: `SELECT NULLIF(current_setting('app.id_usuario_atual', true), '')::INT;` — o `NULLIF` trata "não definida" e "definida vazia" como a mesma coisa (`NULL`) antes mesmo de tentar o `::INT`, então os dois casos agora se comportam de forma idêntica e segura.

---

### [03-D] VISIBILIDADE DE CONTA (`usuario_visivel`)

* **Por que existe:** `pol_usuario_select` (`04`) já escondia `usuario.deletado = TRUE` do resultado, mas `pol_perfil_select` e `pol_link_select` eram `USING (TRUE)` sem checar esse flag em nenhum momento — o perfil acadêmico e os links de uma conta "excluída" continuavam 100% públicos, mesmo com a conta marcada como deletada.
* **O que faz:** `usuario_visivel(p_id INT) RETURNS BOOLEAN` — nega a visibilidade se a conta estiver `deletado = TRUE`; se o `id_usuario` não existir (não deveria acontecer, a FK garante), o padrão é considerar invisível (`COALESCE(..., TRUE)` antes do `NOT`).
* **Onde é usada:** `pol_perfil_select` e `pol_link_select` (`04_rls_policies.sql`, `[04-D]`/`[04-F]`), no lugar do antigo `USING (TRUE)`. `pol_campanha_select` fica de fora de propósito, por decisão ainda em aberto — ver `PENDENCIAS e correcoes.md`, item 17 (a campanha continua pública por status; só o autor fica anonimizado). `pol_score_select` passou a usar esta mesma função a partir de 30-07-2026, quando o score voltou a ser público de propósito — ver `[04-I]`.
* **Mesmo padrão de `tem_permissao()`:** função pura, `STABLE`, `SECURITY DEFINER`, centralizando a checagem num único lugar — evita que a próxima policy pública nasça com o mesmo furo.

---

### [03-E] CONTAGEM AGREGADA DE SEGUIDORES (`contar_seguidores_pesquisador`/`contar_seguidores_campanha`)

* 🗑️➡️✅ **ADICIONADO (28-07-2026, item 18 da Lista C):** `pol_seg_pesq_select`/`pol_seg_campanha_select` (`04`) só liberam `SELECT` das próprias linhas de "quem eu sigo" — ninguém conseguia contar quantos seguidores um pesquisador/campanha tem, nem o próprio dono. Não dá pra resolver com policy: RLS filtra **linha**, então `SELECT count(*)` sempre soma só o que a sessão já enxerga — liberar a policy pra "contar" também exporia as linhas (e as identidades de quem segue) junto.
* **O que fazem:** `contar_seguidores_pesquisador(p_id INT)`/`contar_seguidores_campanha(p_id INT) RETURNS INT` — mesmo padrão de `usuario_visivel`/`tem_permissao` (função pura, `STABLE`, `SECURITY DEFINER`), devolvendo só o número agregado.
* **Testado:** com 4 pessoas seguindo o pesquisador 2, `SELECT count(*) FROM seguir_pesquisador WHERE id_pesquisador=2` (via RLS, como um dos 4) devolve 1 (só a própria linha); `contar_seguidores_pesquisador(2)` devolve 4 (o número real). Contagem pública, identidade privada — mesmo padrão de Catarse/Experiment com contagem de apoiador.
* **Efeito colateral:** `idx_seguir_pesquisador_alvo` (`02`, ver `[02-D]`), que era índice sem nenhuma consulta possível (a policy bloqueava a busca que ele aceleraria), passa a ser exatamente o índice que estas duas funções usam.
* **`GRANT EXECUTE`:** concedido explicitamente pro `app_nestjs` em `06` (`[06-I-1]`), mesmo sendo tecnicamente redundante com o padrão default do Postgres (função nova já tem `EXECUTE` liberado pra `PUBLIC`) — mantido explícito por serem funções chamadas como RPC direto pela aplicação, não só usadas dentro de policy.

---

### [03-F] OPERAÇÕES DE AUTENTICAÇÃO (28-07-2026 — furo de segurança achado pelo Claude Web)

* 🗑️➡️✅ **Por que existem:** o `GRANT UPDATE` de `usuario` era de **tabela inteira** (o `SELECT` já era por coluna, mas o `UPDATE` não). Testado pelo Claude Web, como usuário comum autenticado: forjar o próprio `score_atual`, auto-marcar `email_verificado = TRUE` (bypass permanente da verificação de e-mail), limpar o próprio `bloqueado_ate`/`tentativas_login_falhas`, e "ressuscitar" a própria conta excluída (`deletado = FALSE`) — todos funcionavam via `UPDATE` direto. Restringir por coluna sozinho não resolve: `email_verificado`, `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em`, `ultimo_login_ip` e `deletado` são todos escritos legitimamente pelo MESMO `app_nestjs` que atende o endpoint genérico de "editar meu perfil" — nenhuma lista de colunas separa os dois papéis.
* **Solução:** essas 6 colunas saíram do `GRANT UPDATE` de `usuario` por completo (`06`, `[06-D-2]`) — o `GRANT` direto ficou só com `nome`, `id_imagem_perfil`, `senha_hash`. As 6 colunas só mudam via função `SECURITY DEFINER` dedicada — mesmo padrão de `atribuir_papel_padrao`/`recalcular_score_pesquisador`: ponto único, nomeado e auditável, em vez de `UPDATE` aberto.
* **As 5 funções:**
  | Função | Colunas que muda | Regra |
  |---|---|---|
  | `confirmar_email_por_token(p_token_hash)` | `email_verificado = TRUE` | Resolve o dono do token sozinha (busca em `verificacao_email`, confere `expira_em`/`confirmado_em`) — o token É a autorização. Retorna `BOOLEAN`. |
  | `registrar_falha_login(p_id_usuario)` | `tentativas_login_falhas++`, `bloqueado_ate` condicional | Bloqueia ao atingir `configuracoes.limite_tentativas_login` (5), por `configuracoes.bloqueio_login_minutos` (15) — nenhum número fixo, os dois configuráveis pelo Painel Admin. **Sem autorização de propósito** (ver nota abaixo). |
  | `liberar_bloqueio_login(p_id_usuario)` | `tentativas_login_falhas = 0`, `bloqueado_ate = NULL` | Exige `usuario_desbloquear` — sempre ação de suporte/admin sobre a conta de outra pessoa, nunca do próprio usuário. |
  | `registrar_login_sucesso(p_id_usuario, p_ip)` | `ultimo_login_em`, `ultimo_login_ip`, e zera o estado de falha | Um login bem sucedido sempre limpa o histórico de tentativas anteriores — `p_ip` é `TEXT` na assinatura (não `VARCHAR(45)`, o tipo da coluna) só pra evitar ambiguidade de modificador de tipo no `GRANT EXECUTE`. **Sem autorização de propósito** (ver nota abaixo). |
  | `excluir_conta_usuario(p_id_usuario)` | `deletado = TRUE`, `deletado_em = NOW()`, `deletado_por = id_usuario_atual()` | RNF-003 (LGPD) + Art. 37 (trilha de quem/quando). Permite o próprio usuário (`p_id_usuario = id_usuario_atual()`) OU quem tiver `usuario_excluir` — só o `admin` tem essa permissão (ver nota abaixo). Via de mão única, de propósito — não existe função equivalente pra reverter, coerente com o desenho de anonimização já existente (`usuario_visivel()`, `[03-D]`). |
* **`perfil_pesquisador` recebeu o mesmo tratamento** (`06`, `[06-D-2]`): `GRANT UPDATE` virou por coluna, mesma lista do `SELECT` **menos** `score_atual`/`score_atualizado_em` — essas 2 continuam só mudando via `recalcular_score_pesquisador()`.

> 🗑️➡️✅ **2ª auditoria do Claude Web (28-07-2026) — "SECURITY DEFINER troca um furo por outro se a função não checar quem está chamando":** a 1ª versão das 5 funções aceitava qualquer `p_id_usuario` sem checagem nenhuma. `SECURITY DEFINER` desliga a RLS, então a função vira a ÚNICA guardiã — testado, um usuário comum (id 9) conseguia chamar `excluir_conta_usuario(2)`/`liberar_bloqueio_login(2)`/`confirmar_email_usuario(2)` e todas executavam contra a conta de outra pessoa. Pior que o `GRANT UPDATE` aberto que essas funções vieram substituir (lá pelo menos `pol_usuario_update` restringia a `id_usuario_atual() = id_usuario`). Três correções diferentes: (1) `excluir_conta_usuario`/`liberar_bloqueio_login` ganharam checagem própria via `tem_permissao()` — permissões novas `usuario_excluir`/`usuario_desbloquear` (`07`), auto-atribuídas ao `admin` pela trigger `trg_admin_recebe_toda_permissao` e seedadas também pro papel `suporte`. (2) `confirmar_email_usuario(p_id)` virou `confirmar_email_por_token(p_token_hash)` — em vez de confiar num id vindo de fora, a função recebe o segredo (o token) e resolve o dono sozinha, eliminando a superfície de ataque em vez de só restringi-la. (3) `registrar_falha_login`/`registrar_login_sucesso` **não têm como se autorizar**: rodam durante o próprio login, antes de existir sessão (`id_usuario_atual()` é `NULL` ali por definição) — documentado no `.sql` como de confiança do backend, com aviso explícito de que `registrar_falha_login` com um id arbitrário é vetor de negação de serviço (bloqueia a conta de qualquer pessoa chamando 5x); o endpoint de login precisa derivar o id do e-mail informado, nunca aceitá-lo do cliente. **Higiene adicional:** as 5 saíram do `EXECUTE`-para-`PUBLIC` padrão do Postgres (`REVOKE` explícito antes do `GRANT` só pra `app_nestjs`, `06`, `[06-D-2b]`) — hoje não é explorável (só `app_nestjs` conecta ao banco), mas é grátis fechar pra função que apaga conta.

> 🗑️➡️✅ **3ª auditoria do Claude Web (28-07-2026) — "excluir conta não deixa rastro" + "três funções privilegiadas ainda em PUBLIC":** dois achados menores nesta rodada. (1) `excluir_conta_usuario` gravava `deletado = TRUE` e nada mais — sem quem fez nem quando, o Art. 37 da LGPD (registro das operações de tratamento, exclusão sendo a mais sensível) ficava sem trilha; piorado pelo fato de `usuario_excluir` estar concedida ao papel `suporte` (um atendente podia excluir a conta de qualquer um, sem registro). Corrigido em duas partes: `usuario` ganhou `deletado_em`/`deletado_por` (`[01-D]`), preenchidas só pela própria função; e `usuario_excluir` saiu do papel `suporte` (decisão de produto — Catarse/Experiment tratam exclusão como auto-serviço do titular, suporte abre chamado mas não executa), ficando só com o `admin`. `suporte` mantém `usuario_desbloquear`, a ação de atendimento de verdade. (2) `atribuir_papel_padrao` (`08`), `recalcular_score_pesquisador` e `recalcular_todos_os_scores` (`05`) — as 3 escrevem no banco e ainda estavam com `EXECUTE` liberado pra `PUBLIC`; `recalcular_todos_os_scores()` em especial é negação de serviço barata (percorre todos os pesquisadores, sem custo pra quem chama). `REVOKE ... FROM PUBLIC` + `GRANT` só pra `app_nestjs` nas 3, mesmo padrão das 5 de cima — hoje não explorável, mas consistente com o que já foi feito.

---

### [03-G] MODERAÇÃO SOBRE PESQUISADOR — SUSPENSÃO EM CASCATA (RF-084, 30-07-2026, construído do zero)

* **Por que existe:** RF-084 sempre descreveu suspensão de pesquisador encerrando em cascata as campanhas ativas e rejeitando as pendentes — mas até 30-07-2026 não existia NENHUM caminho no banco pra suspender alguém. `pol_perfil_update` (`04`) só libera `UPDATE` em `perfil_pesquisador` pro próprio dono (`id_usuario = id_usuario_atual()`); `status_pesquisador` só podia mudar por auto-serviço, nunca por ação de moderação.
* **O que faz:** `suspender_pesquisador(p_id_usuario INT) RETURNS BOOLEAN` (`SECURITY DEFINER`) — exige `tem_permissao('usuario_suspender')`, marca `perfil_pesquisador.status_pesquisador = 'suspenso'` e, na mesma transação, aplica a cascata: campanhas `'ativo'` do pesquisador viram `'encerrado_moderacao'`, campanhas `'aguardando_aprovacao'` viram `'rejeitado'`. Retorna `FALSE` sem fazer nada se o pesquisador já estava suspenso (idempotente).
* **`usuario_suspender` era uma alavanca fantasma:** a permissão já existia seedada (só pro `admin`) e já era citada dentro de `pol_usuario_update` (`04`), mas nada nunca lia ela pra decidir uma escrita de verdade — mesma classe de achado do item 13/quinto ponto em `PENDENCIAS e correcoes.md` (peso configurado, ninguém lendo). Passou a ter uso real aqui, sem precisar criar permissão nova.
* **`status_pesquisador` saiu do `GRANT UPDATE` genérico** de `perfil_pesquisador` (`06`, `[06-D-2]`) — sem isso, o próprio pesquisador conseguiria se auto-reativar (ou se auto-suspender por engano) por fora da função, driblando a cascata inteira.
* ⚠️ **Detalhe que precisou de correção junto, não depois (mesmo raciocínio do item 58 — encerramento automático de campanha, parte 10 em `PENDENCIAS.md`):** `SECURITY DEFINER` bypassa RLS, mas não bypassa trigger. `trg_campanha_valida_transicao` (`05`, `[05-K-2]`) continua rodando por baixo da função e bloquearia as duas transições da cascata, porque nem toda sessão que pode suspender um pesquisador tem `campanha_editar`/`campanha_aprovar`/`campanha_rejeitar`. A trigger ganhou um **5º ramo autoverificável**: libera exatamente `ativo → encerrado_moderacao` e `aguardando_aprovacao → rejeitado` sem checar permissão de campanha de quem está executando — só o fato de `perfil_pesquisador.status_pesquisador` do dono já estar `'suspenso'`, valor que só existe via `suspender_pesquisador()`.
* 🗑️➡️✅ **`reativar_pesquisador(p_id_usuario) RETURNS BOOLEAN` — ADICIONADA (30-07-2026, item 60, recomendação do Claude Web):** mesmo padrão de `suspender_pesquisador()` (`SECURITY DEFINER`, exige `usuario_suspender`), mas só devolve `status_pesquisador = 'ativo'` — **não toca em nenhuma campanha**. Motivo é financeiro, não estético: quando a suspensão rodou, o dinheiro das campanhas fechadas já começou a se mexer (devolução ao doador no all-or-nothing, ou repasse já liberado no flexível) — esse movimento acontece no NestJS/gateway, fora do banco. Reabrir a campanha depois seria prometer algo que a plataforma não consegue cumprir. Campanha fechada por `encerrado_moderacao` continua fechada para sempre, mesmo após reativação — só campanha NOVA, criada depois, é afetada.

> ⚠️ **Fronteira banco/backend (confirmada pelo Claude Web, 30-07-2026):** `suspender_pesquisador()` só muda o `status` da campanha para `'encerrado_moderacao'`. A devolução de dinheiro de verdade (marcar contribuição como `a_devolver`, chamar a API do gateway de pagamento) **não está automatizada no banco** — não dá pra automatizar só em SQL, porque exige chamar uma API externa. É trabalho do NestJS: reagir à mudança de status pra `encerrado_moderacao` e disparar o mesmo fluxo de devolução/repasse que já reage ao encerramento normal (`RF-038`). Não é bug nem pendência — é fronteira certa entre banco e backend — só não presumir que já está pronto.

---

### [03-B] CONTROLE DE ACESSO GRANULAR (`tem_permissao`)

* **Autorização por Capacidade (*Capability-Based*):** Em vez de verificar nomes de papéis (como "admin" ou "pesquisador"), a função valida a existência de uma permissão específica (ex: `'campanha_aprovar'`).
* **Descolamento Múltiplo:** Permite alterar, renomear, dividir ou criar novos papéis na tabela `papel` sem a necessidade de alterar nenhuma política de RLS (`04_rls_policies.sql`) ou recriar funções no banco de dados.
* **Comportamento para Desconectados:** Caso `public.id_usuario_atual()` retorne `NULL` (usuário anônimo ou sessão sem token), o *subselect* falha na condição de igualdade e a função retorna `FALSE` de forma determinística.

---

## 04. ROW LEVEL SECURITY E POLÍTICAS DE ACESSO (`04_rls_policies.sql`)

### Visão Geral de Arquitetura

O arquivo `04_rls_policies.sql` estabelece a camada de defesa em nível de linha (*Row Level Security* — RLS) para o banco de dados. Todas as 42 tabelas do schema possuem RLS ativada e forçada.

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
* 🗑️➡️✅ **[04-D-6] `perfil_pesquisador` (SELECT) — CORRIGIDO (27-07-2026):** `pol_perfil_select` era `USING (TRUE)`, sem checar `usuario.deletado` — o perfil acadêmico de uma conta excluída continuava 100% público. Passou a usar `public.usuario_visivel(id_usuario)` (`03`, ver `[03-D]`). `pol_campanha_select` fica de fora de propósito por enquanto — ver `PENDENCIAS e correcoes.md`, item 17.
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
* **Regra (30-07-2026):** as três tabelas são de leitura pública — `score_pesquisador` inclusive, exceto de perfis com conta deletada (`usuario_visivel()`). Alterações em matrizes, rótulos e no score calculado de cada pesquisador continuam restritas à permissão `'score_editar'`.

**Detalhamento por policy:**
* **[04-I-1] `score_config` (INSERT):** a policy de `INSERT` permite que o painel administrativo crie novas dimensões de score sem depender de uma regra de bypass da RLS.
* **[04-I-2] `score_rotulo` (INSERT):** a policy de `INSERT` permite a criação de novos rótulos de score pelo fluxo administrativo, com a permissão certa.
* 🔓 **[04-I-3] `score_pesquisador` (SELECT) — PÚBLICO DE PROPÓSITO (30-07-2026), revertendo a correção de 28-07-2026:** em 28-07-2026 (item 12/31 da Lista C) o score tinha sido fechado ao público — `pol_score_select` passou a exigir `id_usuario = id_usuario_atual() OR tem_permissao('score_visualizar')` — porque expor publicamente um juízo automatizado sobre pessoa identificada, sem previsão de contestação, é um risco de LGPD (Art. 9). Essa correção foi **revertida por decisão de produto**: o score público é a base de um segundo aplicativo do projeto, apelidado de "Serasa do Pesquisador" — consulta pública de reputação de pesquisadores cadastrados, pensada para funcionar tanto como sinal de confiança pro doador quanto como pressão social pro pesquisador manter a pontuação em dia. `pol_score_select` agora usa `public.usuario_visivel(id_usuario)` (a mesma função de `[03-D]`, reaproveitada em vez de reintroduzir um `USING (TRUE)` cru) — público pra qualquer sessão, mas some se a conta do pesquisador estiver deletada. **O risco de LGPD apontado em 28-07-2026 não foi mitigado, só conscientemente aceito** — não há hoje nenhum mecanismo de contestação/explicação do score pro pesquisador nem base legal documentada para o tratamento automatizado de dados exposto publicamente; fica registrado como pendência em aberto em `PENDENCIAS e correcoes.md`. A porta dos fundos de `perfil_pesquisador.score_atual`/`score_atualizado_em` (fechada em 28-07 via `[06-D-2]`) deixou de fazer sentido como restrição — as 2 colunas voltaram ao `GRANT SELECT` por conveniência (evita join pra montar a página pública de perfil), já que a tabela-fonte (`score_pesquisador`) é pública de qualquer forma agora.

---

## 05. MOTOR DE SCORE + REGRAS DE NEGÓCIO (`05_regras_negocio.sql`)

### Visão Geral

Este é o arquivo mais denso do banco: 51 funções e 66 triggers, organizados em 7 blocos que usam duas letras do índice global — `I` (SCORE, blocos `[05-I-1]` a `[05-I-4]`) e `K` (Regras de Negócio Transversais, blocos `[05-K-1]` a `[05-K-3]`), ver "Índice Global de Letras" no topo deste documento. Ele concentra toda regra que um `CHECK` simples não alcança — porque depende de consultar outra tabela (ex.: será que essa campanha está ativa?) ou de recalcular algo automaticamente quando um dado relacionado muda.

> 📌 **Por que o motor de score existe:** antes deste arquivo, `perfil_pesquisador.score_atual` e `score_pesquisador.pontos_obtidos` eram só valores fixos digitados no seed — nada calculava o score de verdade a partir de campanhas, denúncias, links acadêmicos ou do perfil. A tela de detalhes de pontuação no front lia campos que nem existiam no tipo real de dimensões de score, e a conta virava `NaN`. A solução foi mover o cálculo inteiro para dentro do banco, com o resultado guardado em cache (`perfil_pesquisador.score_atual` e `score_pesquisador`) e atualizado sozinho via trigger sempre que um dado relevante muda — funciona para qualquer registro novo, sem que o backend precise lembrar de chamar nada. Todos os pesos vêm de `score_config.peso` (nenhum número fixo no código): editar o peso no Painel Admin já recalcula o score de todo mundo.

---

### [05-I-1] Score — Helpers e Utilitários

* 🗑️➡️✅ **`config_numero` MUDOU DE ARQUIVO (28-07-2026):** morava aqui, agora mora em `03_funcoes_seguranca.sql`, `[03-C]` — ver lá o motivo (dependência invertida achada pelo Claude Web: `03` roda antes do `05`, mas já tinha uma função chamando `config_numero`).
* 🗑️➡️✅ **`fn_precisa_revisao_score(p_id_usuario)` — nova (28-07-2026, resolve o item 3 da lista de pendências):** retorna `BOOLEAN` — `TRUE` se `perfil_pesquisador.score_atual` do usuário estiver abaixo de `configuracoes.score_minimo_campanha`. Decisão tomada seguindo a sugestão do Claude: nem Catarse nem Experiment bloqueiam criação de campanha por score acumulado — quem filtra confiança de verdade é a aprovação manual do Admin (`status='aguardando_aprovacao'`). Por isso **não existe trigger de bloqueio** — esta função é só o sinal que o futuro Painel Admin usa pra destacar, na fila de aprovação, campanhas de pesquisador abaixo do mínimo pra receberem revisão mais cuidadosa. `SECURITY DEFINER` porque expõe só o booleano, nunca o valor real do score (`pol_score_select` restringe isso ao próprio dono).

---

### [05-I-2] Score — Cálculo das Dimensões

Quatro funções puras (`STABLE`, sem efeito colateral), uma por dimensão do score. Todas recebem `p_id_usuario INT` e devolvem um `INTEGER` já limitado entre `0` e o peso-raiz da dimensão (`LEAST/GREATEST`).

| Função | Dimensão | Fórmula |
|---|---|---|
| `calcular_score_perfil_academico` | Perfil Acadêmico Declarado | Soma os pesos (de `score_config`, filhos de `'perfil_academico'`) de: link Lattes, link ORCID, outro link acadêmico, vínculo institucional preenchido e título acadêmico informado. 🗑️➡️✅ **CORRIGIDO (28-07-2026, item 13(d) da Lista C — "GitHub não pontua"):** o reconhecimento de link era por `ILIKE` no **nome de exibição** do `tipo_link` (`'%linkedin%'`, `'%researchgate%'`, `'%academia%'`, `'%scholar%'`, `'%site%'`) — hardcoded, frágil, e nunca incluía GitHub mesmo o tipo já existindo no catálogo. Passou a comparar por `tipo_link.codigo` (chave estável, ver `[01-C]`); "outro link acadêmico" virou "qualquer `tipo_link` que não seja Lattes/ORCID" — reconhece GitHub automaticamente, e qualquer tipo novo que entrar no catálogo no futuro, sem editar esta função de novo. |
| `calcular_score_historico` | Histórico na Plataforma | `conclusao = (concluídas com sucesso / total encerradas) × peso_conclusao`; `aprovacao = (aprovadas pela moderação / total submetidas) × peso_aprovacao`; desconta `penalidade_abandono` por campanha `nao_atingido` que nunca teve solicitação de encerramento, e `penalidade_sem_justificativa` por campanha `nao_atingido` cuja solicitação não tem justificativa. 🗑️➡️✅ **`rejeitado` saiu do denominador de `total encerradas` (28-07-2026, item 13(b) da Lista C):** antes, uma campanha `rejeitado` derrubava a taxa de aprovação (correto) **e** entrava de novo no denominador da taxa de conclusão sem nunca poder entrar no numerador (punição duplicada pelo mesmo fato — erro aritmético, não escolha de negócio). 🗑️➡️✅ **`encerrado` virou neutro (28-07-2026, item 13(c) da Lista C — decisão da Alexia, "pode ser"):** antes contava como sucesso pleno (numerador **e** denominador); agora sai dos dois — encerramento antecipado (RF-040, com justificativa) não é premiado nem punido. |
| `calcular_score_atualizacao` | Atualização da Campanha | `regularidade = SUM(realizadas)/SUM(esperadas) × peso_regularidade`; `tempestividade = (% de campanhas em dia) × peso_tempestividade`. Só conta campanhas já iniciadas (`ativo`/`sucesso`/`nao_atingido`/`encerrado`); esperadas = duração em meses × `score_frequencia_esperada_mensal`. |
| `calcular_score_reputacao` | Reputação da Comunidade | `peso_raiz − (total de denúncias × custo) − (denúncias procedentes × custo_procedente)`. 🗑️➡️✅ **CORRIGIDO (28-07-2026, item 13(a) da Lista C — conformidade com RF-077):** antes, "total de denúncias" contava **qualquer** status (inclusive `pendente`, `em_analise` e `improcedente`), penalizando uma acusação ainda sob análise ou já descartada — o RF-077 define `improcedente` como "descartada após análise", então contar isso como culpa contradizia o próprio requisito. Agora só denúncias `resolvida` contam, tanto no custo base quanto no extra de procedência. 🗑️➡️✅ **`custo`/`custo_procedente` migraram de `configuracoes` pra `score_config` (mesma data, item 13-quinto-ponto):** antes liam `configuracoes.score_custo_denuncia`/`score_custo_denuncia_procedente` (valores 1/3); os pesos `volume_denuncias`/`gravidade_denuncias` já existiam em `score_config` (a tabela que o Painel Admin edita, com trigger de recálculo), mas com valores (10/15) que nenhuma função lia — o painel editando essas 2 linhas não movia nada. Migrado: a função passou a ler de `score_config` (valores ajustados pra 1/3, os mesmos de sempre — só mudou a fonte); as 2 chaves em `configuracoes` saíram do seed. Testado contra o seed inteiro: nenhum dos 4 pesquisadores do teste de faixas determinístico muda de faixa. |

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
| `campanha` (INSERT/DELETE) + `campanha` (UPDATE, com `WHEN`) | `trg_recalcular_por_campanha()` | `trg_campanha_recalcula_score` + `trg_campanha_recalcula_score_update` | o dono da campanha (`id_usuario`) |
| `denuncia` | `trg_recalcular_por_denuncia()` | `trg_denuncia_recalcula_score` | o pesquisador denunciado (`id_pesquisador_alvo`, se preenchido) |
| `atualizacao_campanha` | `trg_recalcular_por_atualizacao()` | `trg_atualizacao_recalcula_score` | o dono da campanha da atualização (busca via `id_campanha`) |
| `link_academico` | `trg_recalcular_por_link()` | `trg_link_recalcula_score` | o dono do link (`id_usuario`) |
| `perfil_pesquisador` (INSERT) | `trg_recalcular_por_perfil()` | `trg_perfil_recalcula_score` | o próprio perfil recém-criado |
| `perfil_pesquisador` (UPDATE) | `trg_recalcular_por_perfil()` | `trg_perfil_update_recalcula_score` | o próprio perfil, só quando `vinculo_institucional` ou `titulo_academico` mudam |
| `score_config` (UPDATE de `peso`) | `trg_recalcular_por_score_config()` | `trg_score_config_recalcula_todos` | **todos** os pesquisadores |

> 📌 **Por que `trg_perfil_update_recalcula_score` tem uma condição `WHEN`:** sem ela, o próprio `UPDATE` que o recálculo faz em `perfil_pesquisador.score_atual` disparia a trigger de novo — um loop infinito. A condição `WHEN (OLD.vinculo_institucional IS DISTINCT FROM NEW.vinculo_institucional OR OLD.titulo_academico IS DISTINCT FROM NEW.titulo_academico)` garante que só um UPDATE nos dados acadêmicos declarados (não no cache do score) dispare o recálculo.

> 🗑️➡️✅ **`trg_campanha_recalcula_score` split em duas — CORRIGIDO (28-07-2026, Claude Web — "Problema 2" da 2ª auditoria, item #10 da 1ª análise dele, nunca corrigido até esta rodada):** a trigger original era `AFTER INSERT OR UPDATE OR DELETE` numa trigger só, sem `WHEN` — todo `UPDATE` em `campanha` recalculava as 4 dimensões inteiras, mesmo quando nada relevante ao score mudou. A cadeia `contribuicao` → `trg_sincroniza_arrecadado_campanha` → `UPDATE campanha` (só `valor_bruto_arrecadado`) → esta trigger disparava um recálculo completo **por doação confirmada** — medido: 5 doações = 20 gravações em `score_pesquisador` (4 por doação), todas produzindo o mesmo número, porque `valor_bruto_arrecadado` não entra em nenhuma das 4 dimensões. Numa campanha com 500 doações seriam 500 recálculos completos, cada um segurando o `FOR UPDATE` da linha da campanha (`[05-K-2]`) — risco direto pro RNF-006 (confirmação de pagamento refletida em até 30s). Postgres não aceita `TG_OP` dentro de `WHEN`, então a correção precisou de 2 triggers (mesmo padrão de `trg_perfil_update_recalcula_score`, acima): `trg_campanha_recalcula_score` ficou só `AFTER INSERT OR DELETE` (sempre recalcula); `trg_campanha_recalcula_score_update` é `AFTER UPDATE` com `WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.data_fim IS DISTINCT FROM NEW.data_fim OR OLD.aprovado_em IS DISTINCT FROM NEW.aprovado_em OR OLD.id_usuario IS DISTINCT FROM NEW.id_usuario)` — só as colunas que de fato alimentam alguma dimensão. Medido depois: 0 gravações de score por doação (era 4); recálculo ao aprovar/encerrar/rejeitar campanha continua disparando normalmente.

---

### [05-K-1] Regras Transversais — Integridade e Escopo

| Tabela | Função | Trigger | Regra |
|---|---|---|---|
| `contribuicao_recompensa` | `trg_valida_contribuicao_recompensa()` | `trg_contrib_recompensa_valida` | A recompensa escolhida precisa pertencer à **mesma campanha** da contribuição (a FK sozinha não garante isso — só garante que o `id_recompensa` existe em algum lugar), e a soma reservada não pode ultrapassar `quantidade_disponivel`. |
| `link_academico` | `trg_valida_escopo_tipolink()` | `trg_link_academico_valida_tipo` | Só aceita `id_tipolink` com `permite_perfil = TRUE`. |
| `link_academico` | `fn_valida_limite_link_academico()` | `trg_link_academico_valida_limite` (`BEFORE INSERT`) | 🗑️➡️✅ **Nova (28-07-2026, resolve o item 19(a) da lista de pendências).** Bloqueia o `(limite+1)`-ésimo link acadêmico de um mesmo pesquisador — limite lido de `configuracoes.limite_links_academicos_perfil` (RF-014/016/018 falam em até 5), mesmo padrão dos outros limites (campanhas simultâneas, endossos, denúncias/24h). Só em `INSERT`: editar a URL/rótulo de um link já existente nunca aumenta a contagem. |
| `campanha`, `atualizacao_campanha`, `denuncia`, `solicitacao_encerramento` (×2), `recompensa` | `fn_valida_limite_texto_livre()` | `trg_*_valida_limite_texto` (`BEFORE INSERT OR UPDATE`, 6 instâncias) | 🗑️➡️✅ **Nova (28-07-2026, achado "Problema 2" do Claude Web).** `descricao`/`conteudo`/`relato`/`justificativa_*` eram `TEXT` sem limite nenhum — vetor de abuso num campo de formulário público (a Alexia já tinha avisado disso no WhatsApp sobre o `relato`, antes mesmo da coluna existir). Uma função genérica só, os 6 triggers passam qual coluna e qual chave de `configuracoes` checar via `TG_ARGV` (a coluna é lida via `to_jsonb(NEW) ->> coluna`, já que plpgsql não permite acesso dinâmico a campo de `RECORD` por nome). O limite técnico largo (maior, fixo) mora na `CHECK` de cada coluna (`01`); esta trigger é só o limite de negócio, menor e configurável. |
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
| `campanha` | `fn_congela_regras_campanha()` | `trg_congela_regras_campanha` | A partir do status `ativo` em diante (inclusive `encerrado`/`encerrado_moderacao`), bloqueia `UPDATE` que altere `meta_financeira`, `modelo`, `taxa_plataforma`, `titulo` ou `descricao` — proteção contra alterar as regras do jogo (ou reescrever o projeto) depois que a campanha já está no ar. `data_fim`/`data_inicio` têm regra própria (ver linha abaixo). 🗑️➡️✅ **`titulo`/`descricao` foram adicionados em 27-07-2026** (trocar a descrição de um projeto já financiado era o vetor de fraude mais óbvio que ainda não estava coberto). Ver também a coluna `campanha.encerrado_em` (`[01-E]`), que registra a data real de encerramento — algo que `data_fim` (a promessa) deixou de conseguir fazer depois de congelada. 🗑️➡️✅ **`data_fim`/`data_inicio` — ATUALIZADO (28-07-2026, feature "Em breve"):** só congelam quando a campanha **já começou de fato** (`OLD.data_inicio <= NOW()`), não mais no momento da aprovação — enquanto a campanha está "Em breve" (aprovada, pública, mas com `data_inicio` no futuro), o pesquisador pode reagendar o início livremente. |
| `contribuicao` | `fn_valida_contribuicao_campanha_ativa()` | `trg_valida_status_contribuicao` | Bloqueia nova contribuição se a campanha não estiver com status `ativo`, se ainda estiver "Em breve" (`data_inicio` no futuro), ou se o prazo (`data_fim`) já tiver passado. 🗑️➡️✅ **Checagem de `data_inicio` — ADICIONADA (28-07-2026, feature "Em breve"/rascunho agendado):** o pesquisador pode agendar um início futuro pra campanha em vez de lançar na hora (contador regressivo no front, mesma ideia do Catarse) — a campanha já fica pública (`pol_campanha_select` libera por status), mas não podia receber nenhuma doação antes de `data_inicio` chegar; essa checagem fechava um buraco real (antes, nada impedia contribuir numa campanha "ativa" com início ainda no futuro). |
| `contribuicao` | `fn_sincroniza_arrecadado_campanha()` | `trg_sincroniza_arrecadado_campanha` | Recalcula `campanha.valor_bruto_arrecadado` somando as contribuições `confirmado`/`repassado`, a cada INSERT/UPDATE/DELETE em `contribuicao`. |
| `campanha` | `validar_limite_campanhas_pesquisador()` | `trg_campanha_limite_simultaneo` | Um pesquisador não pode ter mais campanhas simultâneas (`aguardando_aprovacao`/`ativo`) do que `configuracoes.limite_campanhas_simultaneas` (RF-029). 🗑️➡️✅ **CORRIGIDO (28-07-2026, item 16 da Lista C):** limite (2) estava hardcoded no corpo da função; passou a ler `configuracoes`, mesmo valor de hoje como `DEFAULT`. |
| `atualizacao_campanha` | `validar_atualizacao_campanha()` | `trg_atualizacao_campanha_status` | Só permite publicar atualização em campanha `ativo`, `sucesso` ou `nao_atingido`. |
| `solicitacao_encerramento` | `fn_valida_transicao_solicitacao()` | `trg_valida_transicao_solicitacao` | 🗑️➡️✅ **Nova (27-07-2026).** `BEFORE UPDATE`: quem não tem `solicitacao_encerramento_decidir` só pode fazer a transição `pendente → cancelado`, sem tocar em `id_admin`/`justificativa_pesquisador` — companheira da liberação de `pol_solicitacao_update` (`04`) pro dono da campanha cancelar a própria solicitação (antes, só o admin conseguia mexer nessa tabela via `UPDATE`; ver `[04-E]`). |
| `campanha` | `fn_valida_prazo_campanha_negocio()` | `trg_campanha_valida_prazo_negocio` (`BEFORE INSERT`) + `_update` (`BEFORE UPDATE`, só quando `data_inicio`/`data_fim` mudam) | 🗑️➡️✅ **Nova (28-07-2026, item 16 da Lista C).** A regra de negócio de prazo saiu de `CK_CAMPANHA_PRAZO` (que virou só um limite técnico largo, ver `[01-E]`) e passou pra cá, lendo `configuracoes.prazo_minimo_campanha_dias`/`prazo_maximo_campanha_dias` — mudar a política de prazo vira um `UPDATE`, não uma migração de constraint. **Valores decididos na mesma data: 15 a 60 dias** (não 90). |
| `campanha` | `fn_carimba_taxa_plataforma_aprovacao()` | `trg_campanha_carimba_taxa` | 🗑️➡️✅ **Nova (28-07-2026, item 20 da Lista C — RF-036).** `BEFORE UPDATE`, só quando `aprovado_em` muda de `NULL` pra um valor: copia `configuracoes.taxa_plataforma_padrao` pra `campanha.taxa_plataforma`, se ainda não houver valor customizado. Sem esta trigger, `taxa_plataforma` nunca era preenchida — testado (criar e aprovar campanha real): nascia e continuava `NULL`. |
| `campanha` | `fn_preenche_encerramento_campanha()` | `trg_campanha_preenche_encerramento` | 🗑️➡️✅ **Nova (28-07-2026) — bug achado pelo Claude da Alexia.** `BEFORE UPDATE`, só quando `status` muda: grava `campanha.encerrado_em = NOW()` automaticamente ao entrar em `'sucesso'`/`'nao_atingido'`/`'encerrado'`/`'encerrado_moderacao'`, se ainda não tiver valor. A coluna (`[01-E]`) nascia e ficava `NULL` pra sempre — nenhum mecanismo gravava nela antes desta trigger. 🗑️➡️✅ **Condição ampliada (28-07-2026, Claude Web — 6ª auditoria):** cobria só `'encerrado'`/`'encerrado_moderacao'`, mas o próprio comentário original da coluna já dizia "encerramento **natural**, antecipado ou por moderação" — faltava o natural de verdade (`'sucesso'`/`'nao_atingido'`). Só apareceu ao dar um caminho de verdade ao encerramento automático (`encerrar_campanhas_vencidas()`, abaixo) — antes disso nada no `.sql` fazia essa transição via `UPDATE`. |
| `campanha` | `encerrar_campanhas_vencidas()` | *(não é trigger — chamada direta, RPC/agendamento)* | 🗑️➡️✅ **Nova (28-07-2026, Claude Web — 6ª auditoria).** `SECURITY DEFINER`. `pol_campanha_update` (`04`) exige ser dono ou ter `campanha_editar`/`campanha_aprovar`/`campanha_rejeitar` — um job de fundo (cron do RF-037) não é nenhum dos dois, então a RLS não deixava nenhuma linha visível: o `UPDATE` do job devolvia `0` linhas afetadas, **sem erro**, e campanhas vencidas ficavam `'ativo'` pra sempre. Percorre `campanha` com `status='ativo' AND data_fim <= NOW()`, marca `'sucesso'`/`'nao_atingido'` conforme a meta, retorna a contagem de linhas (`GET DIAGNOSTICS`) pro job logar de verdade. Bypassa a RLS, não a trigger — `trg_campanha_valida_transicao` (acima) continua validando cada transição pelo ramo autoverificável. Chamada por agendamento (`@Cron` no NestJS), sem sessão de usuário — mesma categoria pré-autorização de `[03-F]`. |
| `campanha` | `fn_valida_transicao_campanha()` | `trg_campanha_valida_transicao` | 🗑️➡️✅ **Nova (28-07-2026, CRÍTICO 1 — 5ª auditoria do Claude Web, achado simulando jornada de usuário mal-intencionado).** `BEFORE UPDATE`. `pol_campanha_update` (`04`) libera `UPDATE` pro dono, e `fn_congela_regras_campanha` só protege a partir de `OLD.status` já congelado — `'aguardando_aprovacao'` não estava nessa lista. Reproduzido: dono comum fazia `UPDATE campanha SET status='ativo', aprovado_em=NOW(), id_admin=<próprio>` e funcionava, com `trg_campanha_carimba_taxa` carimbando a taxa sozinha — campanha fraudulenta indistinguível de uma aprovada. Libera, em ordem: nenhum dos 3 campos sensíveis (`status`/`aprovado_em`/`id_admin`) mudou; quem tem `campanha_aprovar`/`campanha_rejeitar`/`solicitacao_encerramento_decidir`; encerramento por prazo vencido **autoverificável** (confere `valor_bruto_arrecadado` vs `meta_financeira` contra o próprio dado — impossível de mentir, sem depender de permissão ou "usuário de sistema"); dono reenviando campanha rejeitada (RF-070); **5º ramo, ADICIONADO 30-07-2026 (RF-084 — cascata de suspensão, ver `[03-G]` em `03_funcoes_seguranca.sql`):** `ativo → encerrado_moderacao` ou `aguardando_aprovacao → rejeitado`, também **autoverificável** — libera sem checar permissão de quem executa, só o fato de `perfil_pesquisador.status_pesquisador` do dono da campanha já estar `'suspenso'` (valor que só `suspender_pesquisador()` escreve). Necessário porque `SECURITY DEFINER` bypassa RLS mas não bypassa esta trigger — sem o ramo novo, a cascata de suspensão ficaria bloqueada sempre que quem suspende não tivesse também permissão de campanha. Qualquer outra transição: bloqueada. |
| `campanha` | `fn_valida_meta_campanha_negocio()` | `trg_campanha_valida_meta_negocio` (`BEFORE INSERT`) + `_update` (`BEFORE UPDATE`, só quando `meta_financeira` muda) | 🗑️➡️✅ **Nova (28-07-2026, MÉDIO 3 — 5ª auditoria).** Campanha com `meta_financeira = 0.00` era aceita (numa `all-or-nothing`, meta zero é sucesso instantâneo). Mesmo padrão do prazo (`fn_valida_prazo_campanha_negocio`, acima): limite técnico largo na `CHECK` (`01`, só `> 0`); mínimo de negócio de verdade lido de `configuracoes.meta_minima_campanha` (500,00). |
| `orcamento_campanha` | `fn_congela_orcamento_campanha()` | `trg_orcamento_campanha_congela` | 🗑️➡️✅ **Nova (31-07-2026, Alexia).** `SECURITY DEFINER` (ver nota ⚠️ abaixo). `BEFORE INSERT OR UPDATE OR DELETE`. Bloqueia qualquer alteração no orçamento assim que `campanha.status` entra em `'ativo'` em diante (mesma condição de `fn_congela_regras_campanha`, sem exceção nem pra admin) — a soma precisa continuar batendo com uma `meta_financeira` que já está congelada. |
| `orcamento_campanha` | `fn_valida_limite_max_orcamento_campanha()` | `trg_orcamento_campanha_valida_limite_max` | 🗑️➡️✅ **Nova (01-08-2026).** `SECURITY DEFINER` (ver nota ⚠️ abaixo). `BEFORE INSERT`. Bloqueia o item nº 11 (padrão) em diante, lendo `configuracoes.orcamento_max_itens` — feedback imediato pro pesquisador, em vez de só descobrir o excesso na aprovação. |
| `marco_cronograma` | `fn_congela_marco_cronograma()` | `trg_marco_cronograma_congela` | 🗑️➡️✅ **Nova (31-07-2026, Alexia).** `SECURITY DEFINER` (ver nota ⚠️ abaixo). `BEFORE INSERT OR UPDATE OR DELETE`. Diferente do orçamento: só trava quando a campanha **já está aprovada** (`status IN ('ativo','sucesso','nao_atingido','encerrado','encerrado_moderacao')`) **e** já começou de fato (`data_inicio <= NOW()`) — mesma janela de carência do "Em breve": entre aprovar e começar, o pesquisador pode reorganizar o plano. 🗑️➡️✅ **CORRIGIDO (01-08-2026, achado pelo Claude Web em auditoria):** a versão original checava só `data_inicio <= NOW()`, sem o `status` — uma campanha ainda `aguardando_aprovacao` com `data_inicio` no passado (comum: pesquisador cria a campanha já querendo lançar imediato, sem usar "Em breve") tinha o cronograma congelado antes mesmo de ser aprovada, e sem os 3 marcos mínimos `fn_valida_completude_campanha_aprovacao` nunca deixava aprovar — trava circular. Adicionada a mesma condição de `status` de `fn_congela_orcamento_campanha`/`fn_congela_regras_campanha`. |
| `marco_cronograma` | `fn_valida_data_marco_cronograma()` | `trg_marco_cronograma_valida_data` | 🗑️➡️✅ **Nova (31-07-2026, Alexia).** `SECURITY DEFINER` (ver nota ⚠️ abaixo). `BEFORE INSERT OR UPDATE`. Impede `data_prevista` anterior a `campanha.data_inicio` — pode ultrapassar `data_fim` sem problema (ex.: marco de divulgação de resultado, comum acontecer depois do prazo de arrecadação). |
| `marco_cronograma` | `fn_valida_limite_max_marco_cronograma()` | `trg_marco_cronograma_valida_limite_max` | 🗑️➡️✅ **Nova (01-08-2026).** `SECURITY DEFINER` (ver nota ⚠️ abaixo). `BEFORE INSERT`. Mesmo raciocínio do orçamento (acima): lê `configuracoes.cronograma_max_marcos`, feedback imediato. |
| `campanha` | `fn_valida_completude_campanha_aprovacao()` | `trg_campanha_valida_completude_aprovacao` | 🗑️➡️✅ **Nova (31-07-2026, Alexia; valores corrigidos 01-08-2026).** `SECURITY DEFINER` (ver nota ⚠️ abaixo). `BEFORE UPDATE`, só quando `status` entra em `'ativo'`. Bloqueia aprovação se faltar orçamento/cronograma completos (mínimo de `configuracoes.orcamento_min_itens`/`cronograma_min_marcos`) ou se `SUM(orcamento_campanha.valor)` não bater EXATAMENTE com `meta_financeira`. 🐛➡️✅ **Bug de calibração, achado e corrigido antes do commit:** a 1ª versão usava as mesmas chaves `orcamento_min_itens`/`cronograma_min_marcos` com os valores 10/20 — que eram pra ser o TETO, não o piso. Separado em chaves min/max distintas; mínimo virou 3 (meio-termo da faixa 2-5 sugerida por quem escreveu a trigger), teto ficou com os valores originais (10/20), agora aplicado por `fn_valida_limite_max_orcamento_campanha`/`fn_valida_limite_max_marco_cronograma` (acima). |
| `contribuicao` | `atualizar_status_contribuicao()` | *(não é trigger — chamada direta, RPC)* | 🗑️➡️✅ **Nova (28-07-2026, CRÍTICO 2 — 5ª auditoria, cadeia de fraude parte 2/2).** `SECURITY DEFINER`. `pol_contribuicao_update` (`04`) é `USING(true)` com `GRANT UPDATE` de tabela inteira — qualquer usuário confirmava a própria contribuição direto por `UPDATE` (reproduzido: doar pra própria campanha, se auto-confirmar, ver o valor arrecadado público subir sem pagamento real). `status`/`id_transacao_api` saíram do `GRANT UPDATE` (`06`, `[06-H]`); só mudam por esta função — pré-autorização (webhook do gateway, sem sessão), mesma categoria de `registrar_falha_login`/`registrar_login_sucesso` (`[03-F]`). |
| `repasse` | `atualizar_status_repasse()` | *(não é trigger — chamada direta, RPC)* | 🗑️➡️✅ **Nova (28-07-2026, extensão do CRÍTICO 2 — "também é dinheiro saindo").** Mesmo padrão de `atualizar_status_contribuicao`, pra `pol_repasse_update` (também `USING(true)`). `trg_valida_repasse` continua rodando por baixo normalmente (RLS é bypassada, trigger não). |
| `contribuicao` | `fn_valida_contribuicao_valor_minimo()` | `trg_contribuicao_valida_valor_minimo` | 🗑️➡️✅ **Nova (30-07-2026, RF-056 — sugestão do Claude Web).** `BEFORE INSERT`. Mesmo padrão de `fn_valida_meta_campanha_negocio`/`fn_valida_prazo_campanha_negocio`: `CK_CONTRIBUICAO_VALOR_MINIMO` (`01`) virou só limite técnico largo (`valor > 0`); esta trigger aplica o mínimo de negócio de verdade, lendo `configuracoes.valor_minimo_contribuicao` (5,00). Só `INSERT` — valor de contribuição não muda depois de criada. |

> ⚠️ **`trg_sincroniza_arrecadado_campanha` usa `SELECT ... FOR UPDATE` antes de somar.** Isso trava a linha da campanha durante o recálculo — sem essa trava, duas contribuições confirmadas ao mesmo tempo poderiam cada uma somar sem enxergar a outra ainda commitada, e a que "vence a corrida" por último sobrescreveria o total (uma contribuição confirmada "sumiria" do valor arrecadado). Esse comentário está preservado no corpo da função, por ser justamente o tipo de detalhe que importa entender antes de mexer nessa trigger.

> 🐛➡️✅ **As 6 funções novas de orçamento/cronograma (linhas acima) ganharam `SECURITY DEFINER` numa revisão em 01-08-2026, antes do commit — achado sem ser pedido, revendo o próprio trabalho.** Sem isso, os `SELECT`/`COUNT`/`SUM` que essas funções fazem contra `campanha`/`orcamento_campanha`/`marco_cronograma` ficariam sujeitos à RLS de quem está executando. `pol_campanha_select` (`04`) não inclui `'campanha_editar'` entre suas condições de visibilidade (só status/dono/`'relatorio_visualizar'`); `pol_orcamento_campanha_select`/`pol_marco_cronograma_select` têm a mesma lacuna. Pro dono da campanha — o caso de longe mais comum — isso nunca foi problema, porque `id_usuario = id_usuario_atual()` já satisfaz a policy diretamente. O risco é silencioso e específico: **hoje, só o papel `admin` tem `campanha_aprovar`/`campanha_rejeitar`/`campanha_editar`, e `admin` também tem `relatorio_visualizar`** — o que mascarou o bug por acidente (nunca teria aparecido em teste manual com o usuário admin). Mas o item 57 (pendência em aberto, ver `PENDENCIAS e correcoes.md`) cogita justamente dar a um papel como `moderador` permissão de aprovar/editar campanha sem necessariamente dar `relatorio_visualizar` junto — no dia em que isso acontecer sem este `SECURITY DEFINER`, a contagem de itens de orçamento/cronograma passaria a enxergar sempre `0` linhas pra esse papel, bloqueando toda aprovação mesmo com o orçamento completo, sem erro nenhum, sem log, sem pista do motivo. Mesmo raciocínio já usado em `contar_seguidores_pesquisador()` (`03`) e `encerrar_campanhas_vencidas()` (`05`, item 58 em `PENDENCIAS.md`): uma verificação agregada precisa enxergar o total real do banco, não só o que a sessão de quem chama consegue ver linha a linha.

---

### [05-K-3] Regras Transversais — Comunidade, Engajamento e RBAC

| Tabela | Função | Trigger | Regra |
|---|---|---|---|
| `comentario` | `fn_valida_comentario_campanha_ativa()` | `trg_valida_comentario_status` | Bloqueia novo comentário em campanha `rejeitado` ou `encerrado_moderacao`. |
| `comentario` | `validar_comentario_endosso()` | `trg_comentario_limite_endosso` | No máximo `configuracoes.limite_endossos_campanha` endossos ativos simultâneos por campanha (RF-063; conta só `ordem_endosso IS NOT NULL AND ativo = TRUE` — um endosso removido por moderação libera a vaga). 🗑️➡️✅ **CORRIGIDO (28-07-2026, item 16 da Lista C):** limite (4) estava hardcoded; passou a ler `configuracoes`, mesmo valor de hoje como `DEFAULT`. |
| `comentario` | `validar_comentario_autor()` | `trg_comentario_sem_autoria` | O dono da campanha não pode comentar na própria campanha (RF-066). |
| `comentario` | `fn_bloqueia_reversao_moderacao_comentario()` | `trg_comentario_bloqueia_reversao_moderacao` | Bloqueia a transição `ativo: FALSE → TRUE` (reverter uma moderação) por quem não tem a permissão `comentario_moderar`. Fecha a brecha em que `pol_comentario_update` (`04`) libera `UPDATE` para o autor sem restringir coluna — ver `[04-E-4]`. |
| `denuncia` | `validar_denuncia_frequencia()` | `trg_denuncia_limite_taxa` | No máximo `configuracoes.limite_denuncias_24h` denúncias por usuário a cada 24 horas (RF-076). 🗑️➡️✅ **CORRIGIDO (28-07-2026, item 16 da Lista C):** limite (5) estava hardcoded; passou a ler `configuracoes`, mesmo valor de hoje como `DEFAULT`. |
| `denuncia` | `fn_valida_denuncia_sem_autojulgamento()` | `trg_denuncia_sem_autojulgamento` | 🗑️➡️✅ **Nova (28-07-2026, MENOR 5 — 5ª auditoria).** `BEFORE UPDATE`, só quando `status` muda. Reproduzido: um moderador criou denúncia contra um pesquisador e a marcou como `'resolvida'` (custa 4 pontos de score ao alvo) — `pol_denuncia_update` checa a permissão, mas não checa se quem julga é o próprio denunciante. Mesmo conflito de interesse que `validar_comentario_autor()` já bloqueia pra auto-endosso. Bloqueia qualquer transição de status feita pelo próprio `id_usuario` da denúncia. |
| `permissao` | `trg_admin_recebe_toda_permissao()` | `trg_permissao_auto_admin` | Toda permissão nova criada em `permissao` é automaticamente atribuída ao papel `admin` em `papel_permissao`. |
| `perfil_pesquisador` (INSERT) | `fn_atribuir_papel_pesquisador()` | `trg_perfil_atribui_papel_pesquisador` | 🗑️➡️✅ **Nova (28-07-2026, MÉDIO 4 — 5ª auditoria, achado na jornada "mestre vira pesquisador").** `SECURITY DEFINER` (mesmo "ovo e galinha" de `atribuir_papel_padrao`, `08` — quem está criando o perfil ainda não tem `papel_atribuir`). O papel `'pesquisador'` nunca era atribuído pelo app (só pelo seed, aos 11 semeados) — mantém o invariante "tem `perfil_pesquisador` ⇔ tem o papel `'pesquisador'`". |

> 📌 **Por que `trg_permissao_auto_admin` existe:** é a rede de segurança da remoção do antigo `eh_admin()` das RLS policies (todas as policies do `04` passaram a checar `tem_permissao('x')` em vez de um bypass genérico de admin — ver `RBAC-pontos-discutidos.md`). Sem esta trigger, toda permissão nova criada exigiria lembrar de inserir manualmente a linha correspondente em `papel_permissao` para `'admin'` — e um esquecimento faria o admin perder acesso a algo que antes vinha de graça via `eh_admin()`. Com a trigger, toda permissão nova já nasce atribuída ao papel `admin` automaticamente.

---

### Idempotência

As 66 triggers deste arquivo têm `DROP TRIGGER IF EXISTS` imediatamente antes do `CREATE TRIGGER` correspondente — o arquivo pode ser reaplicado sozinho num banco de desenvolvimento já existente, sem precisar resetar tudo do zero (mesmo padrão já aplicado em `04_rls_policies.sql`). *(Nota 28-07-2026: esta linha tinha ficado presa numa contagem antiga — 33 — enquanto a Visão Geral, no topo deste mesmo capítulo, já dizia o número certo. Achado pelo Claude Web na 5ª auditoria; as duas contagens do capítulo foram sincronizadas de novo em 03-08-2026, depois de mais uma rodada de auditoria — ver "Como conferir este inventário", ao final do documento.)*

---

### ERRCODE customizado — 90xxx/91xxx/92xxx/93xxx

🗑️➡️✅ **CORRIGIDO (03-08-2026, Alexia + Claude Web — pendência apontada pelo Claude da Alexia em 02-08-2026):** as 42 `RAISE EXCEPTION` deste arquivo caíam todas no SQLSTATE genérico do Postgres pra exceção sem código explícito (`P0001`) — o NestJS não tinha como diferenciar "sem permissão" de "dado inválido" de "estado conflitante" olhando só o código do erro, só o texto da mensagem (frágil: qualquer reformulação de mensagem quebraria a distinção). Cada uma das 42 ganhou `USING ERRCODE = '<código>'` — mudança puramente aditiva, nenhuma mensagem/lógica/trigger foi alterada (conferido linha a linha no diff).

**4 faixas, sem colidir com nenhum SQLSTATE nativo do Postgres já tratado em `postgres-exception.filter.ts` (`23505`, `23503`, `23502`, `23514`, `42501`, `P0001`):**

| Faixa | Categoria | HTTP |
|---|---|---|
| `90001`–`90999` | Validação de dado/negócio (formato, limite de tamanho, mínimo, campo obrigatório fora do CHECK técnico) | 400 |
| `91001`–`91999` | Conflito de estado/regra de negócio (campanha congelada após aprovação, transição inválida, limite atingido) | 409 |
| `92001`–`92999` | Autorização negada por regra de negócio (checada via `tem_permissao()` dentro da trigger, ou conflito de interesse — dono/autor/denunciante agindo sobre o próprio registro) — **não é RLS**, é checagem procedural dentro da própria função/trigger | 403 |
| `93001`–`93999` | Limite de taxa (rate limit) | 429 |

Tabela completa (código → função/trigger → tabela → mensagem, as 42 linhas) fica em **`DOCUMENTACAO_ERRCODE.md`**, na raiz do projeto — não duplicada aqui pra este arquivo (já grande) não crescer mais, e pra ter um lugar só de onde tirar a lista quando uma regra nova entrar.

**Lado Nest (fechando o ciclo, mesma data):** `commons/database/postgres-exception.filter.ts` ganhou uma checagem pelo prefixo de 2 dígitos do código (`90`/`91`/`92`/`93`) antes do `switch` dos SQLSTATE nativos, mapeando pra 400/409/403/429 automaticamente, com a mensagem original da função (já em português, já específica) — nenhuma tradução manual código-a-código do lado do Nest, só a faixa.

**Ponto em aberto, não deste arquivo:** `excluir_conta_usuario()` (`03_funcoes_seguranca.sql`, `[03-F]`) ainda lança `RAISE EXCEPTION` sem ERRCODE customizado — hoje sem problema prático (nenhuma trigger de `05` está ligada à tabela `usuario`, então o catch-all de `usuario.service.remove.ts` não tem como confundir um erro de validação com um de permissão), mas se um dia uma trigger de `05` passar a valer sobre `usuario`, vale revisitar com o mesmo padrão de faixa daqui.

---

### `log_auditoria` — quem alterou o quê e quando (03-08-2026, sugestão do Claude Web)

Registro genérico de INSERT/UPDATE/DELETE, pensado pra fechar um buraco real: os dois logs que já existiam no banco (`auditoria_financeira` e `historico_rejeicao`) são pontuais — nenhum dos dois cobre uma ação administrativa comum, tipo "admin editou o nome de um usuário" ou "admin revogou uma permissão pela matriz". Detalhamento técnico completo (motivação, as 4 decisões de design, exemplo de query) em `temp_Nest_React.md`, seção "Rodada do Claude Web 'esforço alto'" — aqui só o resumo oficial.

- **Tabela** (`01_extensoes_enums_tabelas.sql` `[01-L]`): `log_auditoria(id_log, tabela, identidade_registro, operacao, id_usuario_responsavel, campos_alterados, dados_anteriores, dados_novos, ocorrido_em)`. `identidade_registro` é `TEXT` (não `INT`) de propósito — cobre PK simples (`'42'`) e PK composta (`usuario_papel`/`papel_permissao`, sem coluna `id_X` própria — vira `'8,3'`).
- **Função + triggers** (`05_regras_negocio.sql` `[05-L]`): `fn_log_auditoria()`, `SECURITY DEFINER`, aplicada via `EXECUTE FUNCTION fn_log_auditoria('coluna_pk'[, 'coluna_pk_2'])` em `usuario`, `perfil_pesquisador`, `configuracoes`, `usuario_papel`, `papel_permissao`, `motivo_denuncia`, `area_conhecimento`, `tipo_link`, `termos_de_uso` (completo) e em `campanha`/`denuncia` só na transição de `status` (`WHEN (OLD.status IS DISTINCT FROM NEW.status)`).
- **Redação de coluna sensível**: `senha_hash`/`cpf_criptografado` nunca entram em `dados_anteriores`/`dados_novos` (removidas do JSONB antes de gravar) — mas o NOME da coluna continua aparecendo em `campos_alterados` quando muda, porque saber QUE mudou é auditoria válida.
- **À prova do próprio admin** (`04_rls_policies.sql` `[04-L]` + `06_grants.sql` `[06-L]`): só existe policy/GRANT de SELECT (atrás da permissão nova `log_visualizar`) — sem INSERT/UPDATE/DELETE pra ninguém, nunca. Só a trigger `SECURITY DEFINER` grava.
- **Não é feature de tela ainda** — só a fundação (tabela + triggers + permissão) existe por enquanto; uma tela de "Histórico de alterações" no painel fica pra quando for priorizada.

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

* **Tabelas:** `usuario`, `perfil_pesquisador` (INSERT de tabela inteira; `UPDATE` **por coluna**, ver `[06-D-9]`), `termos_de_uso` (INSERT/UPDATE, sem `DELETE`); `usuario_termo` (só INSERT); `usuario_papel`, `seguir_pesquisador` (INSERT/DELETE, sem `UPDATE`); `notificacao` (INSERT/UPDATE); `verificacao_email`/`recuperacao_senha`/`sessao` (SELECT/INSERT/UPDATE).

**Detalhamento por grant:**
* **[06-D-1] `usuario` / `perfil_pesquisador` — SELECT geral revogado:** o acesso público a essas duas tabelas foi reduzido no nível de GRANT para evitar que `app_nestjs` tenha acesso indiscriminado a dados sensíveis antes mesmo da avaliação das policies de RLS.
* **[06-D-2] `usuario` — colunas de autenticação no GRANT de coluna:** faltavam as colunas usadas pelo próprio fluxo de login (`senha_hash`, `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em`, `ultimo_login_ip`). Sem elas, o GRANT de coluna barra o `SELECT` antes mesmo de a RLS ser avaliada, e o NestJS não consegue checar a senha no login nem aplicar a proteção contra brute-force. 🗑️➡️✅ **`email_verificado` — CORRIGIDO (27-07-2026):** a coluna existe desde `01`, mas nunca tinha entrado nessa lista — sem ela, o fluxo de verificação de e-mail não conseguia nem ler a própria flag. 🗑️ **`suspenso` removida da lista do GRANT de `perfil_pesquisador` (27-07-2026):** consequência direta da coluna ter sido removida da tabela em `01` — ver `[01-D]`. 🗑️➡️✅ **`cpf_criptografado` e `tipo_vinculo` adicionadas ao GRANT SELECT de `perfil_pesquisador` (28-07-2026):** o CPF é `NOT NULL` (Alexia) — o `app_nestjs` já era obrigado a gravá-lo, mas continuava sem conseguir lê-lo (coluna fora do `GRANT SELECT`), travando o KYC do RF-015 (a API de pagamento precisa desse dado pra configurar o recebimento do pesquisador). A proteção de acesso que de fato importa passa a ser a permissão `perfil_pesquisador_visualizar_sensivel` (já seedada, até então sem nenhum efeito) gateando a leitura no NestJS — não a coluna ficar inacessível pro próprio backend. 🗑️➡️✅ **`score_atual`/`score_atualizado_em` SAÍRAM do GRANT SELECT (28-07-2026, item 12 da Lista C):** eram uma porta dos fundos pro score de qualquer pesquisador — a policy de `score_pesquisador` foi corrigida pra parar de ser pública (ver `[04-I-3]`), mas essas 2 colunas aqui, sem RLS de coluna (o Postgres não tem), continuavam vazando o mesmo dado pra qualquer um via `perfil_pesquisador`. O valor continua acessível de onde já era acessível de propósito: `score_pesquisador.score_total`, via a policy corrigida.
* 🗑️➡️✅ **[06-D-8] `DELETE`/`UPDATE` mortos removidos de vários GRANTs — CORRIGIDO (27-07-2026):** dois achados separados, mesmo padrão nos dois — um `GRANT` sem nenhuma policy de RLS correspondente pra aquela operação nunca funcionava de verdade, só dava a falsa impressão de que era possível. **`DELETE`** foi removido de 21 tabelas que não tinham policy de `DELETE` (mantido só onde a policy existe: `configuracoes`, `usuario_papel`, `seguir_pesquisador`, `seguir_campanha`, `link_academico`, `link_atualizacao`, `link_recompensa`) — neste bloco, isso tirou `DELETE` de `usuario`, `perfil_pesquisador` e `termos_de_uso`. **`UPDATE`** foi removido de 6 tabelas que não tinham policy de `UPDATE` — neste bloco, `usuario_termo` (registro de aceite de termo, não deveria ser editável depois de criado) e `usuario_papel`/`seguir_pesquisador` (só existe inserir/apagar essas relações, não faz sentido "editar"). Ver `PENDENCIAS e correcoes.md`, itens `A7` e `27`, pra contagem completa nos 8 arquivos e pra prova de que nada quebrou.
* **[06-D-3] `notificacao`:** ganhou `pol_notificacao_insert`/`pol_notificacao_update` em `04` (o backend passou a gravar notificação através do próprio `app_nestjs`, não mais via um role que ignorasse RLS), mas faltava o GRANT de tabela correspondente — sem os dois níveis juntos (RLS + GRANT), toda tentativa de `INSERT`/`UPDATE` falhava com `permission denied for table notificacao`, mesmo com a policy liberando.
* 🗑️➡️✅ **[06-D-9] `usuario`/`perfil_pesquisador` — `GRANT UPDATE` de tabela inteira era um furo de segurança — CORRIGIDO (28-07-2026, achado do Claude Web):** o `SELECT` já era por coluna (`[06-D-2]`), mas o `UPDATE` era de tabela inteira — testado como usuário comum: forjar `score_atual`, auto-verificar o próprio e-mail, limpar o próprio bloqueio de login, e reverter `deletado`. **Corrigido:** `perfil_pesquisador` ganhou `GRANT UPDATE` por coluna (mesma lista do `SELECT` menos `score_atual`/`score_atualizado_em`); `usuario` ficou só com `nome`/`id_imagem_perfil`/`senha_hash` no `GRANT UPDATE` direto — as 6 colunas restantes (`email_verificado`, `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em`, `ultimo_login_ip`, `deletado`) só mudam via as funções `SECURITY DEFINER` de `[03-F]`. **Rodada seguinte (mesma data, 2ª auditoria):** essas funções também não checavam quem estava chamando — furo maior que o original. `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT` só pra `app_nestjs` nas 5, e checagem de autorização própria em 2 delas. Detalhamento completo em `[03-F]`.
* **[06-D-4] `verificacao_email` / `recuperacao_senha` / `sessao`:** têm policy real em `04` (`TO app_nestjs USING (true)`) e precisam do GRANT correspondente — RLS libera mas falta permissão de tabela, e vice-versa; os dois níveis são exigidos juntos pelo Postgres. 🗑️➡️✅ **`DELETE` concedido nas 3 — CORRIGIDO (28-07-2026, antigo item 28 do `PENDENCIAS`):** a policy das 3 já era `FOR ALL` (cobre `DELETE`), mas o `GRANT` só ia até `UPDATE` — sem isso, um token de recuperação de senha expirado nunca saía da tabela, e o índice parcial `ux_recuperacao_senha_ativo_por_usuario` (`02`, só 1 token não-usado por vez) bloqueava qualquer novo pedido de recuperação depois do primeiro expirar sem uso (testado e confirmado antes da correção). Dois usos previstos pra esse `DELETE`: (1) apagar o token de recuperação anterior no ato de um novo pedido, em vez de marcar `usado_em` à força (o que faria a coluna mentir sobre o que de fato aconteceu); (2) expurgo periódico por retenção (RNF-003 — dado pessoal só pelo tempo necessário; `sessao` guarda IP/user-agent) — sugestão de janela: 30 dias pra `verificacao_email`/`recuperacao_senha` após confirmado/usado/expirado, 90 dias pra `sessao` após revogado/expirado. Como as policies são `USING (true)`, o `DELETE` vale pra qualquer linha de qualquer usuário — o expurgo do NestJS precisa ser sempre uma consulta fixa com `WHERE` explícito em data, nunca um filtro dinâmico.

---

### [06-E] CAMPANHA

* **Tabelas:** `campanha`, `atualizacao_campanha`, `solicitacao_encerramento`, `historico_rejeicao`, `comentario`, `denuncia`, `recompensa` (INSERT/UPDATE, sem `DELETE`); `seguir_campanha` (INSERT/DELETE, sem `UPDATE`); `repasse` (só INSERT, ver nota abaixo).
* 🗑️➡️✅ **`DELETE` removido das 8 primeiras — CORRIGIDO (27-07-2026):** nenhuma delas tem policy de `DELETE` em `04` — só `seguir_campanha` tem (`pol_seg_campanha_delete`, RF-009 "deixar de seguir"). `UPDATE` também não faz sentido pra `seguir_campanha` (só existe seguir/deixar de seguir), por isso ficou com `INSERT`/`DELETE` em vez de `INSERT`/`UPDATE`. Mesma limpeza geral do `A7`/`27` — ver `[06-D-8]`, mais acima, e `PENDENCIAS e correcoes.md`.
* 🗑️➡️✅ **`repasse` perdeu `UPDATE` de tabela inteira — CORRIGIDO (28-07-2026, Claude Web — 5ª auditoria, extensão do CRÍTICO 2):** `pol_repasse_update` (`04`) é `USING(true)` — é dinheiro saindo, mesmo raciocínio de `contribuicao` (`[06-H]`, abaixo). `status`/`repassado_em` só mudam via `atualizar_status_repasse()` (`05`, `SECURITY DEFINER`, `[05-K-2]`).

---

### [06-F] LINK

* **Tabelas:** `link_academico`, `link_atualizacao`, `link_recompensa` — INSERT/UPDATE/DELETE completos.

---

### [06-G] ARQUIVO

* **Tabelas:** `arquivo_atualizacao`, `arquivo_recompensa` — INSERT/UPDATE, sem `DELETE`. 🗑️➡️✅ **CORRIGIDO (27-07-2026):** nenhuma das duas tem policy de `DELETE` em `04` — mesma limpeza geral do `A7`, ver `[06-D-8]`.

---

### [06-H] CONTRIBUIÇÃO

* **Tabelas:** `auditoria_financeira` (INSERT/UPDATE, sem `DELETE`); `contribuicao_recompensa`, `aceite_termo_contribuicao` (só INSERT); `contribuicao` (só INSERT, ver nota abaixo).
* 🗑️➡️✅ **CORRIGIDO (27-07-2026):** nenhuma das quatro tem policy de `DELETE` em `04` (mesma limpeza geral do `A7`, ver `[06-D-8]`). `contribuicao_recompensa`/`aceite_termo_contribuicao` também perderam `UPDATE` — os comentários do `04` já diziam que os dois são registro de auditoria/aquisição, não deveriam ser editáveis depois de criados (mesmo raciocínio do `27`).
* 🗑️➡️✅ **`contribuicao` perdeu `UPDATE` de tabela inteira — CORRIGIDO (28-07-2026, Claude Web — 5ª auditoria, CRÍTICO 2):** `pol_contribuicao_update` era `USING(true)` — reproduzido: fraudador doava pra própria campanha e se auto-confirmava por `UPDATE` direto, inflando `campanha.valor_bruto_arrecadado` publicamente sem pagamento real. `status`/`id_transacao_api` só mudam via `atualizar_status_contribuicao()` (`05`, `SECURITY DEFINER`, `[05-K-2]`) — pré-autorização (webhook do gateway), mesma categoria das funções de `[03-F]`. `auditoria_financeira` continua com `UPDATE` de tabela inteira, de propósito (item 9 da `PENDENCIAS`, ainda em aberto).

---

### [06-I] SCORE

* **Tabelas:** `score_config`, `score_rotulo` — INSERT/UPDATE, sem `DELETE`. 🗑️➡️✅ **CORRIGIDO (27-07-2026):** nenhuma das duas tem policy de `DELETE` em `04` — mesma limpeza geral do `A7`, ver `[06-D-8]`.
* **`score_pesquisador` não recebe GRANT de tabela direto:** toda escrita passa pela função `recalcular_score_pesquisador()` (`SECURITY DEFINER`, ver `05_regras_negocio.sql`), que grava com os privilégios de quem criou a função, não com os de `app_nestjs`.

**Detalhamento por grant:**
* **[06-I-1] Funções do motor de score:** precisam de `GRANT EXECUTE` para que o app possa chamar `recalcular_todos_os_scores()` via RPC (botão "Recalcular" do Painel Admin) e `recalcular_score_pesquisador()`. 🗑️➡️✅ **`contar_seguidores_pesquisador`/`contar_seguidores_campanha` (28-07-2026, item 18 da Lista C):** mesmo motivo — chamadas diretas como RPC pela aplicação pra exibir contagem de seguidores (ver `[03-E]`). 🗑️➡️✅ **`REVOKE EXECUTE ... FROM PUBLIC` nas duas de score — CORRIGIDO (28-07-2026, Claude Web — 3ª auditoria):** as duas escrevem (`score_pesquisador`/`perfil_pesquisador`); `recalcular_todos_os_scores()` sem `REVOKE` era negação de serviço barata liberada pra `PUBLIC` (percorre todos os pesquisadores, sem custo pra quem chama) — mesmo padrão de `REVOKE` já aplicado às 5 funções de `[03-F]`.

---

## 07. SEED DE DADOS (`07_seed_dados.sql`)

### Visão Geral

Povoa o banco com dados de demonstração/teste (mínimo 7 registros por tabela relevante). É o único arquivo em que a **ordem física não segue a ordem alfabética do índice global de letras** — ela segue estritamente a ordem de dependência de Foreign Key, porque aqui (diferente de `04`/`06`) a ordem das instruções importa de verdade: uma tabela filha só pode receber `INSERT` depois que a linha da tabela pai já existe.

> ⚠️ **Por que a ordem não é alfabética:** o exemplo mais claro é `configuracoes` (letra C). Uma das suas linhas de seed (`notificar_novas_campanhas`) referencia o usuário admin pelo `id_usuario`. Por isso o `INSERT` em `configuracoes` só pode rodar depois do `INSERT` em `usuario` (letra D) — o arquivo intercala C e D de propósito, e isso já estava correto antes desta reorganização. Reordenar cegamente para "C sempre antes de D" quebraria o script. *(Correção 28-07-2026: esta nota citava também `limite_denuncias_suspensao` como segundo exemplo — a chave foi removida do seed numa rodada anterior, ver "🟢 Já corrigido" em `PENDENCIAS e correcoes.md`, item 45; a nota ficou desatualizada e só foi pega agora, na 5ª auditoria do Claude Web.)*

### Ordem de Execução (com a letra de cada bloco)

*(Correção 28-07-2026, achado pela 5ª auditoria do Claude Web: 3 blocos que existem de verdade no `.sql` — `[07-D-6]`, `[07-D-7]` e `[07-H-3]` — não apareciam nesta tabela nem no detalhamento abaixo. São justamente os blocos de termos de uso e aceite por contribuição, a trilha que sustenta o RF-011/054/055. Adicionados agora, na posição física correta.)*

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
| 12 | `termos_de_uso` / `usuario_termo` | USUÁRIO | `[07-D-6]` |
| 13 | `configuracoes` (parâmetros de sistema + preferências do admin) | CONFIG | `[07-C-5]` |
| 14 | `configuracoes` (constantes do motor de score) | SCORE¹ | `[07-I-2]` |
| 15 | `perfil_pesquisador` | USUÁRIO | `[07-D-3]` |
| 16 | `link_academico` | LINK | `[07-F-1]` |
| 17 | `campanha` | CAMPANHA | `[07-E-1]` |
| 18 | `seguir_campanha` | CAMPANHA | `[07-E-2]` |
| 19 | `seguir_pesquisador` | USUÁRIO | `[07-D-4]` |
| 20 | `contribuicao` | CONTRIBUIÇÃO | `[07-H-1]` |
| 21 | `aceite_termo_contribuicao` | CONTRIBUIÇÃO | `[07-H-3]` |
| 22 | `auditoria_financeira` | CONTRIBUIÇÃO | `[07-H-2]` |
| 23 | `atualizacao_campanha` | CAMPANHA | `[07-E-3]` |
| 24 | `arquivo_atualizacao` | ARQUIVO | `[07-G-1]` |
| 25 | `repasse` | CAMPANHA | `[07-E-4]` |
| 26 | `solicitacao_encerramento` | CAMPANHA | `[07-E-5]` |
| 27 | `historico_rejeicao` | CAMPANHA | `[07-E-6]` |
| 28 | `comentario` | CAMPANHA | `[07-E-7]` |
| 29 | `denuncia` | CAMPANHA | `[07-E-8]` |
| 30 | `notificacao` | USUÁRIO | `[07-D-7]` |
| — | Nota sobre como logar após o seed | USUÁRIO | `[07-D-5]` |
| 31 | Backfill (`recalcular_todos_os_scores()`) | SCORE | `[07-I-3]` |

¹ A *tabela* `configuracoes` é do domínio CONFIG (`01-C`), mas este bloco específico só contém constantes usadas pelo motor de cálculo de score — por isso foi arquivado sob a letra `I`, junto com o resto do que envolve pontuação. É a mesma tabela, mas o **conteúdo** desse bloco pertence a outro domínio; ver nota abaixo.

---

### Detalhamento (blocos com histórico ou decisão de design)

* **[07-I-1] `score_config` / `score_rotulo`:** este `INSERT` era originalmente um resquício de uma versão anterior do seed (o comentário antigo citava `AuthContext.tsx`, do fluxo de autenticação via Supabase que não existe mais) e duplicava parcialmente o `INSERT INTO papel` mais completo do bloco `[07-B-1]`. Os papéis `'admin'`, `'pesquisador'` e `'usuario'` continuam seedados só em `[07-B-1]`; aqui ficou só a inserção de verdade das dimensões e subitens de score.

* **[07-B-1] `papel`:** 7 papéis seedados de uma vez: `'admin'` (recebe automaticamente toda permissão nova via `trg_permissao_auto_admin`, ver `05_regras_negocio.sql`), `'pesquisador'` (usado pela regra de dono de campanha), `'usuario'` (papel padrão atribuído a todo novo cadastro por `atribuir_papel_padrao()`, ver `08_trigger_signup_usuario.sql`), e `'moderador'`/`'revisor'`/`'curador'`/`'suporte'` (RBAC granular via `papel_permissao`, ver `[07-B-3]`). `ON CONFLICT DO NOTHING` evita erro de duplicidade se o script rodar mais de uma vez; os IDs resultantes não são fixados em lugar nenhum — `papel_permissao` e `usuario_papel` sempre resolvem por nome. O papel `'apoiador'` foi removido deliberadamente: contribuir financeiramente não é uma ação restrita a um papel específico, qualquer usuário autenticado (`'usuario'` ou `'pesquisador'`) pode fazer isso.

* **[07-B-2] `permissao`:** nomes padronizados no formato `"entidade_acao"` (ver `RBAC-pontos-discutidos.md`). Mantém idempotência via `ON CONFLICT (nome) DO NOTHING`.
  - 🗑️ **`campanha_encerrar` removida deste `INSERT` (era permissão órfã, nunca usada por nenhuma policy do `04`)** — detalhamento completo de como era, por que existia e por que foi removida (em vez de implementada) está em `[04-E]` mais acima neste mesmo documento.

* **[07-B-3] `papel_permissao`:** resolvido por nome (não por número fixo), já que os IDs de `papel` não são previsíveis depois do `ON CONFLICT DO NOTHING` de `[07-B-1]`. Como `trg_permissao_auto_admin` (`05_regras_negocio.sql`, executado antes deste arquivo) já dispara em todo `INSERT` em `permissao` e atribui a permissão nova ao papel `'admin'` automaticamente, as linhas `('admin', ...)` deste bloco já seriam preenchidas sozinhas pela trigger — foram mantidas explícitas mesmo assim só por clareza de leitura (documentam a intenção "admin tem tudo" sem depender de abrir outro arquivo para confirmar). `ON CONFLICT DO NOTHING` garante que não há duplicidade.
  - 🗑️ **`('admin', 'campanha_encerrar')` removida junto** — consequência direta de `campanha_encerrar` ter saído de `[07-B-2]`; sem a permissão existir, essa atribuição não faria sentido.

* 🗑️➡️✅ **[07-D-6] `termos_de_uso` / `usuario_termo` — não aparecia neste capítulo (achado da 5ª auditoria do Claude Web):** sustenta o RF-011 (aceite obrigatório no cadastro). Duas versões: `v1-2024-01-01` (vigente durante todo o cadastro dos 17 usuários do seed, por isso é ela que aparece em `usuario_termo`) e `v2-2025-01-01` (versão atual, publicada depois, ainda sem nenhum aceite — cenário realista de "termo novo no ar, usuários antigos não foram re-avisados"). Texto real é `[PLACEHOLDER]` — a estrutura existe, o conteúdo jurídico definitivo entra quando a equipe/jurídico validar. **Pegadinha documentada no próprio `.sql`:** publicar uma v2 sem desativar a v1 antes quebra o índice parcial `uq_termos_uso_ativo` (`02`, só 1 versão `ativo=TRUE` por vez) — o `UPDATE` que desativa a velha e o `INSERT` da nova precisam estar na mesma transação.
* **[07-C-5] `configuracoes` (parâmetros de sistema):** este bloco só pode rodar depois de `[07-D-1]` (`usuario`) porque uma das suas linhas (`notificar_novas_campanhas`) tem `id_usuario = 8`, referenciando o usuário Admin do seed.

* **[07-I-2] `configuracoes` (constantes do motor de score):** dados (não lógica) que alimentam as fórmulas de `05_regras_negocio.sql` — `score_custo_denuncia`, `score_penalidade_abandono`, etc. Ficam em `configuracoes` (não hardcoded no código) exatamente para que o admin possa ajustar a régua de penalidades pelo Painel Admin sem precisar editar SQL/app.

* 🗑️➡️✅ **[07-H-3] `aceite_termo_contribuicao` — não aparecia neste capítulo (achado da 5ª auditoria do Claude Web):** sustenta o RF-054/RF-055 — a Etapa 2 descreve essa trilha (aceite dos termos por transação) como a defesa principal da plataforma numa disputa de chargeback com operadora de cartão. Gerado por `SELECT` a partir da própria `contribuicao` (não digitado linha por linha) — cada contribuição aceitou a versão de termos vigente na época (`v1`, `id_termo=1`, ver `[07-D-6]`), no mesmo instante da contribuição.
* 🗑️➡️✅ **[07-D-7] `notificacao` — não aparecia neste capítulo (achado da 5ª auditoria do Claude Web):** estava vazia; 7 linhas em estados diferentes (`enviado`/`pendente`/`falhou`/`cancelado`) pra exercitar de verdade a permissão `notificacao_processar` e o índice `idx_notificacao_status` (`02`) — até então, nenhum dos dois tinha rodado contra nenhuma linha real.
* **[07-D-5] Como logar no app após o seed:** com autenticação própria, o fluxo é: 1) cadastrar o usuário pelo endpoint de signup do NestJS (gera o `senha_hash` e chama `public.atribuir_papel_padrao(id_usuario)`, que atribui o papel `'usuario'` — ver `08_trigger_signup_usuario.sql`); 2) o papel `'admin'` não é atribuído automaticamente por nada disso — depois do signup, é preciso dar o papel a um usuário manualmente com `INSERT INTO usuario_papel (id_usuario, id_papel) SELECT <id_usuario>, id_papel FROM papel WHERE nome = 'admin'`.

> 🗑️ **Dois blocos removidos por estarem 100% obsoletos** (não só migrados — de fato apagados, sem equivalente aqui): um "FIX — permission denied for sequence" que descrevia um problema já resolvido, e uma "NOTA DE REORGANIZAÇÃO" que apontava para um arquivo `05_grants.sql` que nunca existiu de verdade (o nome correto sempre foi `06_grants.sql`). Ambos descreviam o `GRANT USAGE, SELECT ON ALL SEQUENCES`, que já vive e já está plenamente documentado em `06_grants.sql` (`[06-A-1]`) — mantê-los aqui seria pura duplicação desatualizada.

---

## 08. ATRIBUIÇÃO DE PAPEL PADRÃO NO SIGNUP (`08_trigger_signup_usuario.sql`)

### Visão Geral

O menor arquivo do banco: 1 função + 1 `GRANT`. Apesar do nome do arquivo ainda dizer "trigger", **não existe mais nenhuma trigger aqui** — é histórico do nome, mantido porque o projeto já decidiu não renomear arquivos (ver regras de edição). O conteúdo real é uma função chamável, não uma trigger de tabela.

> 📌 **Por que o nome do arquivo menciona "trigger" mas o conteúdo não tem nenhuma:** a versão original deste arquivo continha um trigger em `auth.users` (`on_auth_user_created`/`handle_new_user`) que criava a linha em `public.usuario` automaticamente quando o Supabase Auth cadastrava alguém. Com a saída do Supabase Auth do fluxo (autenticação própria), nunca mais existe um `INSERT` em `auth.users` — esse trigger não tinha mais como disparar e foi removido. A única parte que ainda valia a pena manter — "atribuir o papel padrão `'usuario'` a quem acabou de se cadastrar" — foi reaproveitada como uma função chamável pelo NestJS, em vez de ficar presa a um trigger de tabela que não existe mais.

### [08-D-1] `atribuir_papel_padrao(p_id_usuario)`

* **Quando roda:** chamada pelo NestJS manualmente, dentro da mesma transação do signup, logo após o `INSERT` em `usuario`. O fluxo completo de signup é: 1) gerar o hash da senha e inserir em `usuario`; 2) chamar esta função; 3) criar o registro em `verificacao_email` e disparar o e-mail de confirmação (ver Anexo A, no final deste documento).
* **Por que é `SECURITY DEFINER`:** a policy `pol_usuariopapel_insert` (`04`) exige a permissão `'papel_atribuir'` para inserir em `usuario_papel` — mas um usuário que acabou de se cadastrar não tem nenhuma permissão ainda (nem papel nenhum). A função roda com os privilégios de quem a criou, contornando esse problema de "ovo e galinha" só para esta gravação específica (atribuir o papel `'usuario'` — nunca `'admin'`, que continua exigindo atribuição manual, ver `[07-D-5]`).
* **`ON CONFLICT DO NOTHING`:** protege contra chamar a função duas vezes para o mesmo usuário (ex.: retry de rede) sem gerar erro de duplicidade.
* **`GRANT EXECUTE`:** sem ele, a chamada do NestJS falharia com `permission denied` (erro `42501`) — o mesmo problema que as funções de score já tiveram, resolvido da mesma forma (ver `[06-I-1]`). 🗑️➡️✅ **`REVOKE EXECUTE ... FROM PUBLIC` antes do `GRANT` — CORRIGIDO (28-07-2026, Claude Web — 3ª auditoria):** a função escreve em `usuario_papel`; mesmo padrão de higiene já aplicado às funções de `[03-F]` e às de score (`[06-I-1]`).




































---

# 📎 ANEXOS — conteúdo consolidado de `PLANO_AUTENTICACAO_PROPRIA.md` e `RBAC-pontos-discutidos.md` (28-07-2026)

> Os dois arquivos de origem eram documentos de **discussão técnica escritos antes da implementação** (plano de migração para autenticação própria; diagnóstico e decisões do RBAC granular). Quase tudo que eles propunham já foi implementado — e já está documentado nos capítulos `03`, `04`, `06` e `08` acima, com muito mais detalhe e já refletindo o código real. Este anexo existe só para não perder duas coisas que os capítulos numerados não cobrem: **o raciocínio de arquitetura por trás de decisões já tomadas** (o "por quê", não só o "o quê") e **os pontos que os próprios documentos originais já marcavam como em aberto** — pra não sumirem quando os arquivos forem apagados.

---

## Anexo A — Por que a autenticação própria funciona do jeito que funciona

*(Consolidado de `PLANO_AUTENTICACAO_PROPRIA.md` — o plano que tirou o sistema do Supabase Auth.)*

* **Contexto histórico:** o sistema nasceu usando o Supabase Auth (GoTrue) pra login/cadastro/recuperação de senha, com o frontend falando direto com o Postgres via PostgREST. A decisão foi trocar por autenticação própria no NestJS, com a arquitetura confirmada **React → NestJS → Postgres** (o frontend nunca mais fala direto com o banco). Isso muda a forma como a RLS precisa ser pensada — ver abaixo.
* **`id_usuario_atual()` não usa mais `auth.uid()`:** no modelo Supabase, essa função existia só porque o GoTrue injetava o JWT dele diretamente na sessão do Postgres via PostgREST. Sem PostgREST no meio, não existe mais esse JWT automático — quem valida o JWT agora é o próprio NestJS, que define `SET LOCAL app.id_usuario_atual = '<id>'` no início de cada transação, depois de validar o token. `SET LOCAL` é escopado à transação atual (some sozinho no `COMMIT`/`ROLLBACK`), o que é seguro mesmo com pool de conexões compartilhado entre requests — é por isso que o mesmo mecanismo tem que ser um `Client` retirado do pool dentro de uma transação, nunca um `pool.query(...)` solto (ver `tutorial-rodar-projeto.md`, item 1).
* **`id_supabase UUID REFERENCES auth.users(id)` foi removida de `usuario` de propósito:** essa coluna só fazia sentido enquanto o GoTrue populava `auth.users`. Sem ele, não sobra nada pra essa FK apontar — mantê-la travaria todo cadastro novo. Se um dia entrar SSO/OAuth como método *adicional* (não substituindo login por senha), a coluna pode voltar, sem FK e nullable.
* **O trigger de signup em `auth.users` foi substituído por lógica explícita no NestJS:** antes, um trigger `AFTER INSERT ON auth.users` criava a linha em `usuario` automaticamente. Sem Supabase Auth, esse `INSERT` nunca mais acontece — o trigger simplesmente para de disparar. A criação do usuário (hash de senha, papel padrão via `atribuir_papel_padrao()`, disparo do e-mail de verificação) virou um passo explícito dentro do endpoint de signup do NestJS, na mesma transação — o que é até uma vantagem: fica tudo num lugar só, mais fácil de testar e logar erro (ver `08_trigger_signup_usuario.sql`).
* **Por que a RLS continua existindo mesmo não sendo mais "estritamente necessária":** como o NestJS é o único client do Postgres, toda autorização já poderia — e deveria — ser aplicada em código antes da query chegar no banco (guards, interceptors, checagem de dono no service layer). A RLS deixou de ser a *única* barreira (como era no modelo Supabase, onde o frontend batia direto no PostgREST) e virou **defesa em profundidade**: se um dia um service esquecer um `WHERE id_usuario = ...`, tiver uma falha de SQL injection, ou uma credencial vazar, a RLS ainda impede um usuário de ler/alterar dado de outro. O custo de manter é baixo porque a maior parte de `04_rls_policies.sql` já é regra de negócio pura (dono vê o próprio recurso, campanha aprovada é pública) — só a peça que identifica "quem é o usuário atual" precisou trocar.
* **Ponto de atenção sobre portabilidade, se um dia trocarem de banco:** RLS é sintaxe específica do Postgres — não migra pra outro SGBD. Por isso a autorização "de verdade" sempre deve morar no NestJS (isso sim é portável). A RLS fica como camada extra de segurança no Postgres, não como algo que o sistema *depende* pra funcionar corretamente — trocar de banco no futuro perderia essa camada redundante (recriável ou não na tecnologia nova), mas nenhuma regra crítica de negócio se perderia junto, porque essa mora no NestJS.

---

## Anexo B — Por que o RBAC é 100% orientado a dado, nunca a nome de papel

*(Consolidado de `RBAC-pontos-discutidos.md` — o diagnóstico que resultou no `tem_permissao()` atual.)*

* **O problema histórico que motivou o redesenho — "RBAC de enfeite":** existia uma função `eh_admin()` que checava o **nome do papel** (`'admin'`) diretamente, usada em 35 lugares de `04_rls_policies.sql` como bypass genérico de "admin vê/mexe em tudo". Isso criava dois vocabulários de autorização ao mesmo tempo (nome de papel vs. permissão): mesmo que o NestJS implementasse corretamente "usuário com permissão X pode fazer Y", a RLS rejeitava a operação mesmo assim, porque só sabia distinguir admin de não-admin — os papéis `moderador`/`revisor`/`curador`/`suporte` nunca eram respeitados por nenhuma policy que usasse `eh_admin()`.
* **Decisão tomada (já aplicada, é o estado atual do banco):** `eh_admin()` foi removida por completo, e as 35 ocorrências migraram para `tem_permissao(...)` (`03_funcoes_seguranca.sql`, `[03-B]`) — hoje é o único mecanismo de autorização usado em RLS, nenhuma policy referencia nome de papel. A rede de segurança contra "admin perde acesso sozinho ao esquecerem de atribuir uma permissão nova a ele" é a trigger `trg_permissao_auto_admin` (`05_regras_negocio.sql`, `[05-K-3]`): toda permissão nova já nasce atribuída ao papel `admin` automaticamente.
* **Critério usado pra mapear os bypasses antigos pra permissões novas:** reaproveitar uma permissão já existente e semanticamente equivalente sempre que havia uma (`denuncia_responder`, `repasse_aprovar`, etc.); quando o bypass cobria uma entidade filha de outra já coberta (arquivo/link de atualização ou de recompensa), reaproveitar a permissão da entidade-mãe (`atualizacao_moderar`, `campanha_editar`) em vez de criar uma permissão nova por tabela; e só criar permissão nova quando não havia nenhuma equivalente razoável — foi o caso de só duas, `link_academico_gerenciar` e `arquivo_gerenciar`.
* **Convenção de nomenclatura das permissões em uso — `entidade_acao`, minúsculo, sem acento:** o raciocínio por trás, pra quem for criar permissão nova no futuro: CRUD genérico (create/read/update/delete) ficaria em inglês, porque mapeia 1:1 com verbo HTTP (permite um guard genérico no NestJS que deriva a ação da rota, sem tradução manual); já uma ação de negócio específica que não é um CRUD (ex.: "aprovar") fica em português, com o mesmo nome usado no segmento da URL (`POST /campanhas/:id/aprovar` → `campanha_aprovar`) — facilita auditoria porque o nome da permissão bate literalmente com a rota. E o mais importante: **CRUD do próprio dono sobre o próprio recurso não vira permissão nenhuma** — continua resolvido só pela RLS de posse (`id_usuario = id_usuario_atual()`). Só viram permissão as ações administrativas sobre recurso de terceiro, ou ações que não pertencem ao dono de forma alguma (aprovar, moderar, estornar, atribuir papel).
* **Reforço pro dia do guard no NestJS:** RLS e NestJS devem sempre checar a **mesma string de permissão**, nunca nome de papel — as duas camadas precisam falar o mesmo vocabulário, ou elas divergem silenciosamente com o tempo.

---

## Anexo C — Pontos que já eram "em aberto" nos documentos originais e ainda merecem uma linha de decisão

1. **`tipo_link.regex`/`tipo_link.dominio` nunca foram validados por nenhuma trigger.** As duas colunas existem e são preenchidas no seed (sugerindo validação de formato de URL — ex.: Orcid bater com `orcid.org`), mas nenhuma função no `.sql` de fato confere a `url` inserida contra elas. Hoje qualquer URL passa, desde que o tipo de link seja permitido no contexto (`permite_perfil`/`permite_atualizacao`/`permite_recompensa`). **Ainda não decidido:** essa validação fica só no NestJS (as colunas viram fonte de verdade pro backend buscar o padrão) ou o banco também valida (reaproveitando o padrão dinâmico já usado em `trg_valida_escopo_tipolink`)? Continua genuinamente em aberto — não foi resolvido em nenhuma das rodadas de auditoria posteriores.
2. **Endosso de comentário — é ação de curadoria ou só o dono da campanha?** Nunca foi confirmado se "endossar comentário" deveria virar uma permissão dedicada (curadoria por papel específico) ou se continua sendo só o dono da campanha endossando um comentário recebido na própria campanha (nesse caso, RLS de posse, sem permissão nenhuma — é como está hoje). Vale confirmar antes do NestJS implementar a tela de endosso, pra não modelar guard nenhum que a regra de negócio real não pede.
3. **Papel `pesquisador` seguiu sem permissões próprias** — isso já foi confirmado, em rodada bem posterior a estes dois documentos, como não sendo mais um problema de "enfeite": as policies checam a existência do `perfil_pesquisador`, não o papel; o papel em si existe pra granularidade futura, caso um dia precise de uma permissão específica de pesquisador que não dependa de ter perfil. (O item relacionado — o papel nunca era atribuído automaticamente pelo app — já foi corrigido, ver a trigger `trg_perfil_atribui_papel_pesquisador` no capítulo `05`.)

---

## Anexo D — Proposta de `contexto_link` (documento original completo — ligada ao item 2 do `PENDENCIAS e correcoes.md`)

Esta é a proposta técnica completa por trás do item 2 ("Debate `tipo_link`/`contexto_link`", ainda **adiado, não mexer sem pedir**) — preservada aqui na íntegra porque tem o desenho de schema e a análise de prós/contras que vão ser necessários no dia em que essa decisão for tomada.

**Motivação original:** os contextos de link já cresceram uma vez na prática — `link_atualizacao` e `link_recompensa` foram acrescentadas depois de `link_academico` já existir com as 3 flags booleanas (`permite_perfil`, `permite_atualizacao`, `permite_recompensa`). Isso sugere que "quais entidades podem ter link" é uma dimensão que muda ao longo do tempo — e hoje mudar isso exige alterar schema (`ALTER TABLE tipo_link ADD COLUMN`) e código (o `CASE` dentro de `trg_valida_escopo_tipolink`), não só dado.

**Modelo proposto, caso a decisão seja migrar:**
```sql
CREATE TABLE contexto_link (
    id_contexto SERIAL PRIMARY KEY,
    nome        VARCHAR(50) NOT NULL UNIQUE,  -- 'perfil', 'atualizacao', 'recompensa'
    tabela      VARCHAR(63) NOT NULL UNIQUE   -- nome real da tabela alvo: 'link_academico', etc.
);

CREATE TABLE tipolink_contexto (
    id_tipolink INT NOT NULL REFERENCES tipo_link(id_tipolink)     ON DELETE CASCADE,
    id_contexto INT NOT NULL REFERENCES contexto_link(id_contexto) ON DELETE CASCADE,
    PRIMARY KEY (id_tipolink, id_contexto)
);
```
A trigger de validação deixaria de ter qualquer `CASE`/nome de contexto hardcoded, virando um `EXISTS` genérico contra `tipolink_contexto` + `contexto_link`, filtrando por `TG_TABLE_NAME` — mesmo espírito do resto do banco (comportamento guiado por dado, não por string fixa em código).

**Prós:** adicionar um contexto novo no futuro (ex.: link em denúncia, em perfil de instituição, ou o "vídeo/YouTube" que a Alexia citou como exemplo — ver item 15 do `PENDENCIAS`) vira só dado, sem `ALTER TABLE` nem editar a função da trigger; abre espaço pra regras por contexto que um booleano não expressa (ex.: uma coluna `obrigatorio` ou `regex_override` em `tipolink_contexto`, caso um tipo de link precise de validação diferente dependendo de onde é usado).

**Contras:** mais um `JOIN` pra validar cada insert/update de link (custo desprezível no tamanho atual das tabelas, mas uma indireção a mais pra quem lê o schema pela primeira vez); com só 3 contextos conhecidos hoje, o ganho imediato é menor do que parece — 3 booleanos também são fáceis de ler direto num `SELECT * FROM tipo_link`; é trabalho de migração agora (ainda que mais barato fazer sem dado em produção do que depois).

**A decisão que falta:** se vocês têm expectativa razoável de mais contextos de link aparecerem, vale migrar agora, antes do NestJS modelar as entities em cima do formato atual. Se o modelo for considerado fechado nesses 3 contextos, manter os booleanos é aceitável e mais simples — é exatamente a decisão pendente no item 2 do `PENDENCIAS e correcoes.md`.

> 📌 **Por que `atribuir_papel_padrao()` não aparece aqui:** o `GRANT EXECUTE` dessa função fica junto dela mesma em `08_trigger_signup_usuario.sql`, porque `06` roda antes do `08` na ordem de dependência — a função ainda não existiria neste ponto da execução se o grant estivesse aqui.

---

## Como conferir este inventário

*(Adicionado 03-08-2026, sugestão do Claude Web depois de auditar a documentação e achar 4 números desatualizados neste arquivo — tabelas, policies, triggers e funções não tinham sido atualizados nas últimas 3 rodadas, apesar de `log_auditoria`/`orcamento_campanha`/`marco_cronograma` terem sido adicionadas. Em vez de outra pessoa ter que contar `CREATE TABLE`/`CREATE POLICY`/`CREATE TRIGGER` na mão (ou confiar de olho num número escrito num comentário), estas 4 queries dizem a verdade direto do banco — rode no SQL Editor do Supabase sempre que for atualizar os números deste documento.)*

```sql
-- Tabelas (público, sem contar as internas do Postgres/extensões)
SELECT count(*) FROM pg_tables WHERE schemaname = 'public';

-- Policies de RLS
SELECT count(*) FROM pg_policies WHERE schemaname = 'public';

-- Triggers (NOT tgisinternal exclui as triggers automáticas de FK —
-- senão o número vem inflado com coisa que ninguém escreveu à mão)
SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal;

-- Funções/procedures no schema public (soma tudo: 03 + 05 + 08)
SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
```

**Números confirmados em 03-08-2026** (contados também por fora, via `grep -c` nos `.sql`, batendo com as 4 queries acima): **42 tabelas**, **116 policies** (99 `TO app_nestjs`, 65 chamam `tem_permissao()`), **66 triggers** (todas em `05`), **65 funções** (51 em `05` + 13 em `03` + 1 em `08`, `atribuir_papel_padrao()`).