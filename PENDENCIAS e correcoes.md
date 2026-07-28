#### Pendências reais do sistema

*(Atualizado após a reorganização + revisão completa de `01` a `08` com o Claude)*

*(Reorganizado em 26/07/2026: pendências reais no topo, resolvidas/corrigidas no final — pra facilitar achar rápido o que ainda precisa de decisão)*

---
---

# 🔴 PENDÊNCIAS (ainda em aberto — precisam de decisão)


## 🗓️ 28-07-2026 — Correções mecânicas (Tier A/B) + novidades da Alexia (via CLAUDE WEB)

*(Rodada motivada por uma pergunta direta sua ao CLAUDE WEB: "existe algo que já pode ser consertado, independente de reunião?" — ele separou por Tier A (zero decisão) / Tier B (uma linha de decisão, com as 3 perguntas revisadas a fundo antes de eu implementar) / "Parte 2" (as novidades que a Alexia trouxe pelo WhatsApp — recompensa simbólica, área de conhecimento mais específica, mais motivos de denúncia — e a sugestão da matriz de rastreabilidade). Você deu o OK nas 2 decisões de produto (recompensa e área de conhecimento) nesta mesma conversa. Mesmo padrão de sempre: 🔴 = ainda pendente, 🟢 = já corrigido, com prova mecânica.)*

### 🔴 Pendente desta rodada

🔴 **33. Matriz de rastreabilidade RF × banco — sugerida, não feita**

O CLAUDE WEB identificou esta como "a fala mais importante do WhatsApp inteiro": a Alexia pediu pra "passar as tabelas mais uma vez e ver se cobrem as necessidades, porque vamos ter que iniciar o backend". A Lista C já tem achados soltos disso (colunas faltando do item 19, taxa não carimbada do item 20), mas ninguém fez a varredura completa nos dois sentidos — pegar os 85 RFs da Etapa 3 e marcar, um por um, se o banco sustenta, sustenta parcialmente ou não sustenta.

> Sugestão do *** CLAUDE ***: isso não é uma correção de `.sql`, é um trabalho de auditoria à parte (provavelmente vale um documento próprio, tipo `MATRIZ-RASTREABILIDADE-RF.md`), e sai de lá uma tabela que também serve pra Etapa 3 do TCC. Não fiz agora porque é um esforço de outra natureza (leitura de 85 RFs contra 39 tabelas) e não estava no pedido desta rodada — mas é o que realmente destrava começar o NestJS com confiança de que a base aguenta, ao invés de descobrir no meio do caminho que falta uma coluna.

*(Os itens 21-22-28-31-32 de rodadas anteriores continuam nas seções acima. Este 33 é o único achado novo desta rodada que ficou de fato pendente — todo o resto (Tier A, Tier B, e as 2 decisões de produto da Alexia) foi resolvido no mesmo dia, ver abaixo.)*






### 🟢 Já corrigido nesta rodada (28-07-2026)

*(Tudo abaixo já está aplicado no `.sql` — fica aqui só pra registro e prova de que nada quebrou, mesmo padrão das rodadas anteriores.)*

#### Tier A — bugs mecânicos, zero decisão envolvida — **todos 🟢 corrigidos em 28-07-2026**

🟢 **A1. Cabeçalho do `05` dizia 26 triggers, eram 27** — conferido com `grep`, corrigido pra 27 (e depois pra 29, ver A-área-conhecimento mais abaixo). Uma linha.

🟢 **A2. 4 contribuições do seed violavam o RF-048 (PIX obrigatório em all-or-nothing)** — `id_contribuicao` 2, 4, 7 e 9 eram `cartao_credito`/`boleto` em campanha `all-or-nothing` — só entraram porque `trg_contribuicao_all_or_nothing_pix` fica desligada durante a carga do seed (`[07-H-1]`). **Corrigido:** as 4 trocadas pra `pix` (marcadas com `-- (*)` no `.sql`, indicando qual era o valor antigo). Não afeta o cálculo de score (que usa status da campanha, não meio de pagamento).

🟢 **A3. `valor_bruto_arrecadado` era digitado à mão e não batia com a soma real das contribuições** — 9 das 10 campanhas divergiam (3 delas com **zero** contribuições e um total de 5 dígitos mesmo assim). Mesmo tipo de problema que a Alexia já tinha corrigido em `perfil_pesquisador.score_atual` (parar de digitar, deixar a trigger calcular) — só que ninguém tinha reparado que o mesmo valia pra `campanha.valor_bruto_arrecadado`, porque `trg_sincroniza_arrecadado_campanha` ficava desligada durante toda a carga do seed. **Corrigido:** a coluna saiu do `INSERT INTO campanha` (usa o `DEFAULT 0`); `trg_sincroniza_arrecadado_campanha` passou a ficar **ligada** durante a carga de `contribuicao` (as outras 2 triggers de validação continuam desligadas, por bons motivos, ver comentário no `.sql`); 37 novas linhas de contribuição foram distribuídas entre doadores diferentes pra cada campanha somar exatamente o total que tinha antes. **Prova mecânica** (feita com regex/PowerShell, não à mão): somei programaticamente as 48 linhas finais de `contribuicao` por campanha e todas batem exatamente com os totais antigos — 52300 / 28500 / 40000 / 8000 / 22000 / 45000 / 32000 / 21000 / 9000 — e confirmei que **nenhuma** contribuição em campanha `all-or-nothing` usa meio de pagamento diferente de `pix`. Isso também resolveu o item 4 (linha duplicada de `repasse` na campanha 2) — removida, porque a duplicata só existia pra "empurrar" o total antigo, que agora vem de verdade da soma das contribuições.

🟢 **A4. `pol_aceite_termo_contribuicao_select` esquecia o doador anônimo** — a policy de `INSERT` já aceitava `id_usuario IS NULL`, a de `SELECT` não tinha o ramo correspondente (`token_sessao`) — um doador anônimo registrava o aceite dos termos e nunca mais conseguia relê-lo. **Corrigido:** replicado o mesmo ramo de `token_sessao` que `pol_contribuicao_anon_select` já usa.

🟢 **A5. `termos_de_uso`, `usuario_termo` e `aceite_termo_contribuicao` seedadas** — as três estavam vazias e sustentam o RF-011 (aceite obrigatório no cadastro), RF-054 e RF-055 (aceite por transação, defesa em disputa de chargeback, segundo a Etapa 2). **Corrigido:** 2 versões de termos (v1 histórica, já `ativo = FALSE`; v2 atual, `ativo = TRUE`, ainda sem ninguém re-aceitando — cenário realista de "termo novo publicado, ninguém foi reavisado ainda"); os 17 usuários aceitando a v1 no próprio cadastro; `aceite_termo_contribuicao` gerada por `SELECT` a partir da própria `contribuicao` (não digitada linha por linha), uma linha por contribuição. Documentei também, em comentário no `.sql`, a pegadinha real que testei: publicar uma versão nova de termos sem desativar a anterior na mesma transação quebra com o índice parcial `uq_termos_uso_ativo` (`02`) — o `UPDATE` que desativa a antiga e o `INSERT` da nova precisam estar juntos.

🟢 **A6. `notificacao` seedada** — estava vazia; 7 linhas em `pendente`/`enviado`/`falhou`/`cancelado`, exercitando de verdade a permissão `notificacao_processar` e o índice `idx_notificacao_status` pela primeira vez.

#### Tier B — decisão de uma linha, revisada a fundo antes de aplicar — **B1 e B2 🟢 aplicados; B3 fica pendente de propósito**

🟢 **B1. `GRANT DELETE` em `verificacao_email`, `recuperacao_senha` e `sessao`** — as 3 já tinham policy `FOR ALL` (cobre `DELETE`), mas o `GRANT` só ia até `UPDATE` (item 28, antigo). O CLAUDE WEB testou o fluxo real antes de recomendar: pedir recuperação de senha, deixar o token expirar sem usar, e pedir de novo — **quebra** com erro de unicidade (`ux_recuperacao_senha_ativo_por_usuario` só permite 1 token não-usado por vez), e sem `DELETE` o app não tem como limpar o token velho (a alternativa de "marcar como usado à força" faria a coluna `usado_em` mentir sobre o que de fato aconteceu). **Aplicado:** `DELETE` concedido nas 3, com comentário no `.sql` documentando os 2 usos previstos (apagar token velho no ato de pedir um novo; expurgo periódico por retenção — 30 dias pra `verificacao_email`/`recuperacao_senha`, 90 dias pra `sessao`) e o cuidado de que, como as policies são `USING (true)`, o expurgo do NestJS precisa ser sempre uma consulta fixa com `WHERE` explícito em data, nunca um filtro dinâmico.

🟢 **B2. Senha placeholder da role `app_nestjs` (pendência 1, antiga)** — trocado de `LOGIN PASSWORD 'TROCAR_NO_AMBIENTE_REAL'` pra `NOLOGIN`. Testado (pelo CLAUDE WEB) que `GRANT`/`SET ROLE` continuam funcionando normalmente numa role `NOLOGIN`, e que esquecer o passo de produção agora falha **fechado** (`FATAL: role "app_nestjs" is not permitted to log in`, percebido em minutos) em vez de falhar **aberto** (senha conhecida publicada no GitHub, sistema funcionando "normalmente"). **Aplicado:** `01` cria a role `NOLOGIN`; `tutorial-rodar-projeto.md` ganhou aviso de que o `ALTER ROLE app_nestjs LOGIN PASSWORD '...'` agora é **obrigatório** (sem ele, ninguém — nem você — consegue conectar como `app_nestjs`), tanto na checklist rápida quanto na Parte 3 detalhada.

🔴 **B3. `codigo` em `tipo_link` — fica pendente de propósito** — o CLAUDE WEB recomendou **não** adicionar agora: o único consumidor real seria o motor de score (item 12 da Lista C, ainda sem decisão de escopo) ou os 2 tipos de link que faltam (item 19e), e criar uma coluna que nada lê hoje é exatamente o padrão que gerou os 21 `GRANT DELETE` mortos e as permissões órfãs que já limpamos. Custo de esperar é zero (`tipo_link` é catálogo de 5 linhas recriado do zero a cada bootstrap). **Não mexido** — fica vinculado aos itens 12/19e.

#### Novidades trazidas pela Alexia (via WhatsApp → CLAUDE WEB) — decisão dada por você nesta conversa

🟢 **34. Recompensa simbólica — resolve o item 14 da Lista C** — a ideia da Alexia ("nome do doador no projeto") já existia no ENUM `tipo_recompensa` como o valor `reconhecimento`; `acesso_antecipado` é o modelo do próprio Experiment.com, referência declarada do TCC. A objeção original ao domínio inteiro (recompensa física cria obrigação de logística que 2 pessoas não conseguem fiscalizar) morre se `fisica` sair do ENUM — e `outro` era uma porta aberta pra reintroduzir isso pela brecha. **Você decidiu:** remover os dois. **Aplicado:** `tipo_recompensa` (`01`) agora é só `('digital', 'reconhecimento', 'acesso_antecipado')`; feito com a tabela `recompensa` vazia (nenhum dado existente pra migrar) — o momento mais barato possível pra essa mudança, porque o Postgres não tem `ALTER TYPE ... DROP VALUE` (teria que recriar o tipo contra um banco já populado). O `DEFAULT 'outro'` da coluna `tipo` também saiu — nenhum dos 3 valores que sobraram é um "genérico" natural, a aplicação passa a escolher explicitamente. O item 14 da Lista C sai de "remover o domínio inteiro" pra "manter com escopo restrito" — ainda precisa de 2-3 RFs novos na Etapa 3 descrevendo recompensa simbólica, isso fica com vocês dois.

🟢 **35. `area_conhecimento` desce pro 2º nível do CNPq — resolve o pedido da Alexia** — "Ciências da Saúde" cobrindo de odontologia a saúde coletiva era amplo demais pro filtro de busca valer a pena. **Você decidiu:** nível 2 vira obrigatório (campanha não pode mais ficar só na grande área raiz). **Aplicado:** coluna `id_pai` nova em `area_conhecimento` (`01`, mesmo padrão auto-referenciado de `score_config`); ~81 áreas de nível 2 seedadas em `07` (via `SELECT` resolvendo o pai pelo `codigo_cnpq`, não por ID fixo); trigger nova `trg_campanha_valida_area_nivel2`/`trg_campanha_valida_area_nivel2_update` (`05`, `[05-K-1]`) bloqueando `campanha.id_area_conhecimento` de apontar pra uma grande área raiz (`id_pai IS NULL`) — só entra em ação quando uma área é de fato informada, `NULL` continua permitido. As 10 campanhas do seed foram atualizadas pra apontar pra uma área de nível 2 dentro da mesma grande área que já tinham antes (ex.: campanha 1, antes só "Ciências Exatas", agora "Ciência da Computação"). **⚠️ Aviso importante, documentado também no `.sql`:** tentei buscar a Tabela de Áreas do Conhecimento oficial do CNPq/Lattes pra conferir cada código, mas o PDF não deu pra extrair de forma confiável — os **nomes** das áreas e a qual grande área cada uma pertence estão corretos (nomenclatura padrão CNPq, usada em qualquer edital brasileiro), mas os **dígitos verificadores** dos códigos não foram todos conferidos contra a fonte oficial (só a grande área 1, Ciências Exatas, foi conferida via busca — incluindo a correção do próprio código raiz, que estava errado no seed: era `1.00.00.00-0`, o oficial é `1.00.00.00-3`). Isso não quebra nada tecnicamente (`codigo_cnpq` não tem validação de formato/dígito no banco, é só texto único) — mas antes de citar esses códigos exatos na Etapa 3, vale conferir linha por linha contra a tabela oficial.

*(Nota: o item 3 do CLAUDE WEB — mais motivos de denúncia — já está registrado dentro do A5/A6 acima; foram 5 motivos novos: `CAMP-005` a `CAMP-008` e `PERF-004`, dado puro de catálogo, sem decisão de negócio.)*

**Prova mecânica de que nada quebrou (rodada inteira, 28-07-2026):** 39 tabelas (igual). `PK_`=39, `FK_`=56 (+1: `FK_AREA_CONHECIMENTO_PAI`), `UK_`=18 (igual), `CK_`=14 (igual) — parênteses balanceados em `01`, `05` e `07` (checado programaticamente, saldo zero nos três). Policies: continua 105 `CREATE POLICY` (só editei uma policy existente — `pol_aceite_termo_contribuicao_select` —, nenhuma nova). Funções de `05`: 31 (+1: `fn_valida_area_conhecimento_nivel2`). Triggers de `05`: 29 (+2: as duas de área nível 2). `area_conhecimento`: 90 linhas (9 grandes áreas + 81 áreas de nível 2, contadas programaticamente, sem duplicata de `codigo_cnpq`). `contribuicao`: 48 linhas (11 antigas + 37 novas), soma por campanha conferida linha a linha via script, batendo 100% com os totais antigos. `repasse`: 6 linhas (era 7, a duplicata da campanha 2 saiu). Tabelas seedadas: 30 (+4: `termos_de_uso`, `usuario_termo`, `aceite_termo_contribuicao`, `notificacao`).

## 🗓️ 28-07-2026 (parte 2) — o CLAUDE WEB rodou de verdade num Postgres e achou um bug crítico — **todos 🟢 corrigidos no mesmo dia**

*(Depois da rodada acima, o CLAUDE WEB rodou os 8 arquivos de verdade num Postgres — não só leu — pra conferir a prova mecânica. Achou 1 erro real e sério, confirmou que o A3 ficou "impecável", e resolveu o item 35 (dígito do CNPq) por um caminho matemático, já que nenhum dos dois teve acesso à tabela oficial do CNPq. Você pediu pra eu implementar tudo tentando não descartar as ideias da Alexia — deu certo nas duas: motivo de denúncia e vínculo institucional.)*

🟢 **36. BUG CRÍTICO — o seed não termina de rodar: `denuncia` falhava inteira, em silêncio — CORRIGIDO**

`id_motivo` em `denuncia` referenciava o **id serial posicional** do catálogo (1-7), não uma chave estável. Quando os 5 motivos novos do item A5 (rodada anterior) entraram — `CAMP-005` a `CAMP-008` **antes** do bloco `PERF-*` — os ids de `PERF-001`/`002`/`003` mudaram de `5`/`6`/`7` pra `9`/`10`/`11`:

| | antes | depois |
|---|---|---|
| `PERF-001` | 5 | 9 |
| `PERF-002` | 6 | 10 |
| `PERF-003` | 7 | 11 |

As 8 linhas de `denuncia` que apontavam pra alvo de perfil continuavam usando `5`/`6`/`7` — que virou motivo de **campanha**, aplicado num alvo de **perfil**. `trg_valida_tipo_motivo_denuncia` (criada bem pra pegar exatamente isso, no A5) rejeitava — e como o `INSERT` é um único comando com 13 linhas, **as 13 falhavam junto**, sem travar o script (só um erro que passa despercebido rodando os 8 arquivos em sequência). `denuncia` nascia vazia, `calcular_score_reputacao` devolvia os 25 pontos cheios da dimensão Reputação pra todo mundo, e o teste determinístico das 4 faixas de score (Bruno/Renata/Eduardo/Vinícius, desenhado com tanto cuidado na rodada anterior) se desfazia sem nenhum aviso: Eduardo saía com 48 em vez de 46 (ainda "Em Construção", por sorte), mas Vinícius saía com 35 ("Em Construção") em vez de 19 ("Atenção") — a faixa "Atenção" ficava **sem ninguém**.

**Corrigido:** duas coisas, não só uma —
1. As 13 linhas de `denuncia` remapeadas (as de perfil, que usavam `5`/`6`/`7`, corrigidas pra apontar pro motivo certo).
2. **Causa raiz, não só sintoma:** `id_motivo` passou a ser resolvido por `SELECT ... FROM motivo_denuncia WHERE codigo = '...'` (chave natural, estável), não mais por número de posição. Inserir motivo novo no meio do catálogo nunca mais quebra essas linhas, seja qual for o id que ele ganhar. Mesmo princípio aplicado a `link_academico` (`id_tipolink` também virou subquery por `codigo` — ver item 39, abaixo).

Prova: as 4 faixas de score voltam exatas — 100 (Bruno, Referência) / 60 (Renata, Confiável) / 46 (Eduardo, Em Construção) / 19 (Vinícius, Atenção).

🟢 **37. `campanha.id_area_conhecimento` deixava passar `NULL` — CORRIGIDO**

A trigger de nível 2 (rodada anterior) bloqueava a grande área raiz, mas deixava `NULL` passar — testado pelo CLAUDE WEB, campanha sem nenhuma área era aceita. A regra ficava "não pode ser vago, mas pode ser omisso" — e omisso é pior: campanha sem área nenhuma some de **todos** os filtros, enquanto uma classificada só na grande área pelo menos aparece num filtro amplo. **Corrigido:** `id_area_conhecimento` virou `NOT NULL` — as 10 campanhas do seed já tinham área de nível 2 desde a rodada anterior, então não exigiu nenhum ajuste nelas. Isso fecha a decisão de "nível 2 obrigatório" que você já tinha tomado, não é uma decisão nova.

🟢 **38. Item 35 (dígito verificador do CNPq) resolvido — sem precisar da fonte oficial**

Nem eu nem o CLAUDE WEB conseguimos acesso à tabela oficial do CNPq/Lattes (eu por falha de extração do PDF, ele por não ter acesso à web no ambiente dele). Ele atacou por outro ângulo: **provou matematicamente** que os dígitos que eu tinha semeado não vinham de nenhum algoritmo real. Nos códigos de grande área (`N.00.00.00-D`) só o primeiro dígito é diferente de zero — então em qualquer esquema real de dígito verificador por soma ponderada (o mesmo princípio de CPF/CNPJ/PIS, todos mod 11), o dígito seria função só desse primeiro número. O seed tinha `DV(1) = DV(7) = 3`, o que matematicamente só permite 1 ou 2 resultados distintos possíveis pros 9 valores — e o seed tinha 8 valores distintos. Impossível vir de um algoritmo de verdade.

**Corrigido:** removi o dígito verificador dos 90 `codigo_cnpq` — agora é `'1.03.00.00'`, não `'1.03.00.00-7'`. O dígito verificador serve pra pegar erro de digitação quando um humano transcreve um código num formulário de papel; aqui, `codigo_cnpq` é comparado por igualdade, nunca digitado à mão — o dígito não protegia nada e era a única parte do dado que ninguém conseguia conferir. Os nomes das áreas e a hierarquia continuam corretos e confiáveis (nomenclatura padrão do CNPq). Item 35 fecha com essa justificativa, em vez de ficar pendente esperando um PDF que não abre.

🟢 **39. `tipo_link` ganhou coluna `codigo` — B3 reaberto e resolvido**

O B3 (rodada anterior) tinha sido adiado por falta de consumidor real. O item 36 criou um: o próprio seed precisava referenciar `tipo_link` por chave natural pra fechar o mesmo tipo de bug em `link_academico`. **Corrigido:** coluna `codigo VARCHAR(20) UNIQUE` adicionada (`LATTES`, `ORCID`, `RESEARCHGATE`, `LINKEDIN`, `GITHUB`); `link_academico` (`07`) passou a resolver `id_tipolink` por subquery em `codigo`, não mais por número de posição.

🟢 **40. Guarda de `BYPASSRLS` no topo do `01` — não resolve o item 22, mas melhora o sintoma**

O item 22 (papel do Supabase precisa de `BYPASSRLS`) continua em aberto — só quem confirma isso no painel do Supabase é você. Mas hoje, se alguém rodar o seed sem `BYPASSRLS`, o resultado são dezenas de erros de RLS espalhados pelos 8 arquivos, sem nenhuma pista do motivo real. **Adicionado:** um bloco `DO $$` no início do `01` que checa `rolsuper OR rolbypassrls` pro `current_user` e aborta com uma mensagem única e explicativa, em vez de deixar o erro real acontecer 25+ vezes escondido no meio do `07`.

🟢 **41. `cpf_criptografado` sem GRANT de leitura — trava o KYC do RF-015 — CORRIGIDO**

Com o `NOT NULL` da Alexia em `cpf_criptografado`, o `app_nestjs` passou a ser **obrigado** a gravar o CPF, mas continuava impossibilitado de **lê-lo** — a coluna nunca tinha entrado no `GRANT SELECT` de `perfil_pesquisador`. O RF-015 exige mandar esse dado pra API de pagamento configurar o recebimento do pesquisador; sem conseguir nem selecionar a coluna, o backend não tinha como. **Corrigido:** `cpf_criptografado` (e `tipo_vinculo`, ver item 42) entraram no `GRANT SELECT`. A proteção que de fato importa — quem no backend pode ler isso — passa a ser a permissão `perfil_pesquisador_visualizar_sensivel` (já seedada, até agora sem nenhum efeito) gateando a leitura no NestJS; isso é trabalho de aplicação, fora do escopo do `.sql`.

🟢 **42. `tipo_vinculo` — o único ajuste numa ideia da Alexia, sem descartar nada dela**

O `vinculo_institucional NOT NULL` da Alexia implementa exatamente o que ela quis ("perfil não nasce pela metade") — regra certa, mantida. O efeito colateral: impedia a existência de pesquisador **sem** instituição, que é justamente o público que a justificativa da Etapa 1 diz que a plataforma quer alcançar. **Corrigido preservando a regra dela:** ENUM novo `tipo_vinculo` (`'institucional'`, `'independente'`), coluna nova em `perfil_pesquisador` com `DEFAULT 'institucional'`; `vinculo_institucional` voltou a ser nullable, mas amarrado por `CONSTRAINT "CK_PERFIL_VINCULO"`: institucional exige o nome da instituição preenchido (não vazio); independente exige o campo vazio. Nenhum dos dois aceita ambiguidade — continua **proibido** cadastrar sem declarar nada, exatamente a regra da Alexia. Os 11 perfis do seed continuam válidos sem nenhum ajuste (todos ficam `tipo_vinculo = 'institucional'` pelo `DEFAULT`, com instituição preenchida).

> ⚠️ **Ponto de atenção pra Lista C, não pra ignorar:** `calcular_score_perfil_academico` (`05`) dá pontos por `vinculo_institucional` preenchido. Com essa mudança, o pesquisador independente perde esses pontos automaticamente (campo vazio = sem crédito) — isso é decisão de vocês dois e está amarrada ao destino do score (itens 12/13 da Lista C), não deve passar despercebido quando o score for decidido.

**Prova mecânica desta parte 2:** `PK_`=39 (igual), `FK_`=56 (igual), `UK_`=19 (+1: `UK_TIPO_LINK_CODIGO`), `CK_`=15 (+1: `CK_PERFIL_VINCULO`) — parênteses balanceados em `01`, `04`, `05`, `06` e `07` (saldo zero nos cinco, conferido programaticamente). Funções/triggers de `05`: sem mudança nesta parte (31/29, nenhuma função ou trigger nova — só dado e GRANT). Policies: continua 105 (nenhuma tocada nesta parte). `area_conhecimento`: continua 90 linhas, agora sem dígito verificador (conferido: zero ocorrências do padrão `X.YY.00.00-D` no arquivo inteiro). `contribuicao`: recontado, continua 48 linhas com as mesmas 9 somas batendo exatamente (nada nesta parte tocou em contribuição/campanha financeiro). `tipo_link`: 5 linhas, todas com `codigo` único.






## 🗓️ 27-07-2026 — Nova rodada (banco comparado com os requisitos do TCC)

*(Itens encontrados e descritos pelo CLAUDE nesta data — separados de propósito das pendências mais antigas abaixo, pra não confundir uma coisa com a outra. 🔴 = ainda pendente. 🟢 = já corrigido nesta mesma data, com prova de que nada quebrou. Reorganizado em 27-07-2026: dentro deste grupo de data, tudo que ainda está 🔴 ficou no topo, e tudo que já é 🟢 foi pro fundo desta mesma seção — 6 linhas em branco separando os dois blocos, mais abaixo — sem misturar com os itens resolvidos de datas mais antigas, que continuam onde sempre estiveram, na seção `✅ RESOLVIDAS / CORRIGIDAS` no fim do arquivo.)*

### 🔴 Pendente nesta rodada

🔴 **22. O seed só roda com superusuário ou papel com `BYPASSRLS` — isso nunca foi escrito em lugar nenhum**

`papel`, `permissao` e `papel_permissao` só têm policy de `SELECT` — não existe nenhuma policy de `INSERT`/`UPDATE` pra elas, porque a intenção sempre foi "gestão via seed/migração direta, não pela aplicação" (isso já está documentado no `DOCUMENTACAO_BD.md`, `[06-B]`). *(Correção 27-07-2026: a primeira versão deste item citava `score_config` como mais um exemplo de "tabela só com policy de SELECT" — isso estava errado, e o CLAUDE WEB pegou. `score_config`/`score_rotulo` têm policy de `INSERT` e `UPDATE` de verdade, exigindo a permissão `score_editar` (`04_rls_policies.sql`, `[04-I-1]`/`[04-I-2]`). O motivo pelo qual o seed falha nelas mesmo assim não é "falta de policy" — é o mesmo motivo do parágrafo abaixo: a policy existe, mas é `TO app_nestjs`, e um papel diferente desse simplesmente não casa com ela, tenha ela `INSERT` ou não. Conferido de novo com `grep`: `papel`/`permissao`/`papel_permissao` são os exemplos certos de "só SELECT mesmo".)* O que nunca foi dito explicitamente é que isso torna **obrigatório** rodar `07_seed_dados.sql` como um papel que ignora RLS (superusuário, ou um papel comum com o atributo `BYPASSRLS`) — com as 39 tabelas em `FORCE ROW LEVEL SECURITY`, até o dono de uma tabela fica sujeito às policies dela, e como 89 das 105 policies são `TO app_nestjs` (não `TO public`), um dono qualquer sem `BYPASSRLS` recebe dezenas de erros de `new row violates row-level security policy`.

Isso importa porque o banco vai rodar no Supabase, e lá você executa SQL pelo papel que o próprio Supabase fornece no editor deles — não necessariamente um superusuário local. Se esse papel não tiver `BYPASSRLS`, o seed falha lá do mesmo jeito, mesmo já tendo funcionado na sua máquina.

> Sugestão do *** CLAUDE ***: duas coisas, nenhuma delas é mudar o `.sql`. Primeiro, confirmar no próprio Supabase se o papel usado no SQL Editor deles (geralmente `postgres`) tem `BYPASSRLS` — normalmente tem, mas vale confirmar antes de contar com isso, não depois de um deploy dar errado. Segundo, o `tutorial-rodar-projeto.md` merece uma linha explícita dizendo isso: "o `07` (e qualquer re-execução do seed) precisa rodar como superusuário ou papel com `BYPASSRLS` — nunca como `app_nestjs`".

*(Os três achados a seguir — 28, 31 e 32 — vieram da mesma rodada de testes que encontrou as regressões 23-26, que já foram corrigidas e estão na seção "🟢 Já corrigido nesta rodada", mais abaixo. Estes três não são regressão de nada — são achados novos, e continuam em aberto.)*

🔴 **28. O inverso do 27 — `verificacao_email`/`recuperacao_senha`/`sessao` não conseguem `DELETE`, mesmo a policy permitindo** — as 3 têm policy `FOR ALL` (que cobre `DELETE`), mas o `GRANT` (`06`) é só `SELECT, INSERT, UPDATE` — falta `DELETE`. `app_nestjs` nunca consegue apagar sessão expirada ou token já consumido; essas 3 tabelas só crescem. Provavelmente proposital (revogar é só marcar `revogado_em`/`usado_em`, nunca apagar linha) — mas aí a política de retenção de dado precisa estar escrita em algum lugar, porque o RNF-003 fala em guardar dado pessoal só pelo tempo mínimo necessário, e sessão antiga com IP e user-agent é dado pessoal.

🔴 **31. `score_pesquisador` de usuário deletado continua público** — mesmo gap do A9 (que cobriu só `perfil_pesquisador` e `link_academico`, como pedido); `pol_score_select` continua `USING (TRUE)`. Não mexido de propósito — o score está na Lista C aguardando decisão de escopo (itens 12-13); se ele ficar, entra na mesma correção do `usuario_visivel()`.

🔴 **32. 15 das 39 tabelas ficam vazias depois do seed** — separando por motivo:
- **Vazias porque o seed quebrava** (já resolvido — ver item 21, na seção "🟢 Já corrigido nesta rodada", mais abaixo): `atualizacao_campanha`, `arquivo_atualizacao`, `auditoria_financeira`.
- **Vazias porque o seed simplesmente não escreve nelas:** `termos_de_uso`, `usuario_termo`, `aceite_termo_contribuicao`, `notificacao`. Esta é a que preocupa mais: `termos_de_uso` sem nenhuma linha significa que o RF-011 (aceite obrigatório no cadastro), RF-054 e RF-055 (aceite por transação, prova documental contra chargeback) não têm nenhum dado de exemplo, e o índice `uq_termos_uso_ativo` nunca é exercitado — é justamente a trilha de auditoria que a Etapa 2 descreve como defesa principal da plataforma numa disputa com operadora de cartão.
- **Vazias por escopo** (Lista C, não mexer): a família `recompensa` e a família `link_atualizacao`/`link_recompensa`, mais as tabelas de runtime de autenticação (normal nascerem vazias).

### Lista C — travado até vocês dois decidirem (nada mexido aqui)

🔴 **12. O motor de score não tem nenhum requisito escrito**

Procurei "score", "pontuação" e "reputação" nos três `.docx` do TCC (Etapa 1, 2 e 3): zero ocorrências, em nenhum dos três. Não existe RU, RF nem RNF que mencione pontuação ou reputação de pesquisador. Mesmo assim, o banco tem hoje 3 tabelas (`score_config`, `score_rotulo`, `score_pesquisador`), 6 funções de cálculo, 7 triggers de recálculo automático, pesos e 4 rótulos seedados ("Atenção", "Em Construção", "Confiável" e "Referência") e 2 permissões dedicadas. É o maior subsistema do banco sem nenhum requisito por trás — e 5 dos problemas técnicos encontrados na revisão moram exatamente dentro dele. A decisão que precisa ser tomada é anterior a qualquer correção: o score faz parte do MVP ou não?

> Sugestão do *** CLAUDE ***: eu congelaria o motor de score fora do MVP e registraria isso como trabalho futuro, que é uma seção que todo TCC tem e que fica mais forte com código já modelado por trás. Três razões: primeiro, nem o Experiment.com nem a Catarse têm score público de reputação de criador — os dois resolvem confiança por curadoria humana, que o CrowdAcadêmico já tem via `aguardando_aprovacao` e os RF-068/RF-069, então o score é uma terceira camada resolvendo um problema que a curadoria já resolve. Segundo, um score público é um juízo automatizado sobre uma pessoa identificada, exibido publicamente (`pol_score_select` é `USING (TRUE)`), sem nenhuma previsão de contestação pelo pesquisador — num trabalho que tem o RNF-003 sobre LGPD, isso é uma pergunta desconfortável de banca. Terceiro, e mais prático: congelar o score resolve de uma vez os problemas 13 desta lista, sem precisar decidir nada sobre cada um deles separadamente. A alternativa, se vocês quiserem manter, é torná-lo interno: visível só no painel do Administrador como sinal de apoio à curadoria manual, nunca na página pública — isso já elimina a exposição de LGPD e exige escrever só 2 ou 3 RFs novos na Etapa 3.

🔴 **13. Quatro regras do score que precisam de decisão, caso ele fique**

Se a decisão do item 12 for manter o score, estes quatro pontos precisam ser resolvidos antes de o Claude Code mexer em qualquer função de cálculo. Nenhum é bug: são escolhas de regra que hoje estão implementadas de um jeito que talvez não seja o que vocês queriam. (a) Denúncia improcedente penaliza igual — a função `calcular_score_reputacao` conta todas as denúncias contra o pesquisador, inclusive as que a moderação julgou `improcedente`, o que contradiz o RF-077, que define improcedente como "denúncia descartada após análise". (b) Campanha rejeitada pune duas vezes — a rejeição derruba a taxa de aprovação e ainda entra no denominador da taxa de conclusão. (c) Campanha encerrada antecipadamente conta como sucesso — `calcular_score_historico` trata o status `encerrado` (o encerramento do RF-040, com justificativa) como se fosse meta atingida. (d) GitHub não pontua — a função procura por Lattes, ORCID, LinkedIn, ResearchGate e mais três padrões que não existem na allowlist, mas nenhum padrão casa com GitHub, então um pesquisador com repositório público não ganha nada por isso.

> Sugestão do *** CLAUDE ***: em (a) eu contaria apenas denúncias com status `resolvida`, ignorando `pendente`, `em_analise` e `improcedente` — uma acusação sob análise não é culpa e uma acusação descartada é o contrário disso; isso também fecha uma brecha real, porque hoje cinco contas coordenadas derrubam permanentemente o score de alguém dentro do limite de 5 denúncias por 24 horas do RF-076, mesmo que a moderação dê razão ao pesquisador nas cinco. Em (b) eu tiraria `rejeitado` do denominador da taxa de conclusão, já que a rejeição já é contabilizada uma vez na taxa de aprovação. Em (c) eu contaria o encerramento antecipado como neutro, fora do numerador e fora do denominador — tratar uma campanha interrompida pelo próprio pesquisador igual a uma que bateu a meta é generoso demais e distorce a comparação entre pesquisadores. Em (d) eu daria peso ao GitHub, porque em exatas e computação um repositório público é evidência acadêmica tão legítima quanto ResearchGate — mas seja qual for a escolha de vocês, ela precisa estar escrita, senão parece esquecimento. Existe ainda um quinto ponto puramente técnico ligado a isso: os pesos `volume_denuncias` e `gravidade_denuncias` estão seedados em `score_config` mas nenhuma função os lê (o cálculo usa constantes da tabela `configuracoes`), o que significa que o painel do Admin mostraria duas alavancas que não movem nada; a correção é escolher uma única fonte de verdade para as constantes de score, e eu ficaria com `score_config`, que é a tabela que o painel edita e que já tem trigger de recálculo.

🔴 **14. O domínio de recompensa não tem nenhum requisito escrito**

Mesma situação do item 12: a palavra "recompensa" aparece zero vezes nos três `.docx`. Não há RU, RF nem RNF sobre oferecer contrapartidas materiais ao doador. O banco, porém, tem 4 tabelas dedicadas (`recompensa`, `contribuicao_recompensa`, `arquivo_recompensa` e `link_recompensa`), o ENUM `tipo_recompensa`, cerca de 12 policies de RLS, grants, índices e uma trigger de validação. É um subsistema inteiro construído para uma funcionalidade que o projeto nunca especificou.

> Sugestão do *** CLAUDE ***: acho que isso é herança mental da Catarse, que trabalha com recompensas por ser plataforma de projeto cultural e criativo. O Experiment.com, que é a referência que vocês declaram na Etapa 1 e na Etapa 2, deliberadamente não trabalha com recompensas: a contrapartida ao apoiador é a publicação aberta do progresso e dos resultados da pesquisa, que no CrowdAcadêmico já está implementada como `atualizacao_campanha` e coberta pelos RF-030 e RF-031. Ou seja, vocês já copiaram o modelo certo — o de recompensa ficou sobrando. Minha recomendação é remover as 4 tabelas do MVP e registrar como possibilidade futura. Se preferirem manter, aí é preciso escrever os RFs correspondentes na Etapa 3, e vale considerar que recompensa material cria obrigação de entrega e logística, que é justamente o tipo de responsabilidade que uma plataforma acadêmica com equipe de duas pessoas não tem como fiscalizar.

🔴 **15. Duas tabelas de link que é impossível usar hoje**

O seed de `tipo_link` cadastra os 5 tipos (Lattes, ORCID, ResearchGate, LinkedIn e GitHub) informando apenas nome, regex e domínio. Os três campos de escopo caem no valor padrão: `permite_perfil` fica `TRUE`, mas `permite_atualizacao` e `permite_recompensa` ficam `FALSE`. Como a trigger `trg_valida_escopo_tipolink` rejeita qualquer link fora do escopo permitido, hoje toda tentativa de inserir uma linha em `link_atualizacao` ou em `link_recompensa` levanta exceção. As duas tabelas, mais 8 policies de RLS, 4 índices e os grants correspondentes, são código que existe, roda no bootstrap e nunca vai funcionar. A revisão anterior chegou a olhar esse assunto, mas verificou quais tipos foram seedados (concluindo, corretamente, que a lista de 5 é proposital) e não os campos de escopo.

> Sugestão do *** CLAUDE ***: não ligaria os campos sem antes decidir o escopo. `link_recompensa` some junto com a decisão do item 14. Já `link_atualizacao` é uma pergunta separada: o RF-030 fala de publicar atualizações de progresso, mas nunca menciona anexar links a elas — é funcionalidade que não foi pedida. Minha recomendação é remover as duas tabelas junto com o domínio de recompensa. Se vocês quiserem manter `link_atualizacao` (faz sentido, por exemplo, um pesquisador linkar o artigo publicado numa atualização de resultado final), então é preciso ligar `permite_atualizacao` para os tipos apropriados no seed e escrever o RF correspondente. O que não pode continuar é o estado atual, porque é o pior dos dois mundos: o custo de manter o código sem nenhum benefício.

🔴 **16. Limites de negócio fixos no código em vez de configuráveis**

Quatro números que os requisitos tratam como regra de negócio estão hoje fixos dentro do banco, exigindo alteração de estrutura para mudar: o prazo de 15 a 90 dias (fixo na constraint `CK_CAMPANHA_PRAZO`), o limite de 2 campanhas simultâneas do RF-029, o limite de 4 endossos do RF-063 e o limite de 5 denúncias por 24 horas do RF-076. No caso do prazo há um agravante: existe uma configuração `prazo_maximo_campanha_dias` na tabela `configuracoes` que dá a impressão de controlar isso, mas quem manda de verdade é a constraint — mudar a configuração não muda nada. E esse número específico está em discussão aberta: o próprio RF-045 já registra que o arranjo PIX do Banco Central permite devolução em até 90 dias, o que faz uma campanha de 90 dias somada ao tempo de moderação ficar fora da janela de estorno, e propõe reduzir o máximo para 60 dias.

> Sugestão do *** CLAUDE ***: o critério que eu usaria é simples e vale para os quatro: se o número aparece escrito num RF, ele é regra de negócio e mora na tabela `configuracoes`; se ele existe só para impedir dado absurdo entrar no banco, é limite técnico e mora na constraint. Aplicando isso ao prazo, a constraint viraria um limite absoluto largo (por exemplo, 1 a 365 dias, só para barrar erro grosseiro) e a regra comercial real, seja ela 15 a 90 ou 15 a 60, ficaria em `configuracoes` com a validação feita no NestJS. A vantagem prática é grande: mudar a política de prazo vira um `UPDATE` numa linha, não uma migração de estrutura em banco já com dados. E isso destrava a decisão do RF-045 — vocês podem começar com 90, medir, e reduzir para 60 depois sem custo técnico nenhum. Sobre a decisão em si dos 90 versus 60 dias, eu iria de 60: o RF-038 já prevê `reembolso_manual` como plano B, mas depender de tratamento manual de estorno numa plataforma operada por duas pessoas é justamente o cenário que vocês não querem, e 60 dias continua bem acima da média de campanha bem-sucedida na Catarse e no Experiment.

🔴 **17. Campanha de usuário excluído continua pública**

O RNF-003 promete que o titular pode pedir exclusão dos seus dados. A policy `pol_usuario_select` já esconde usuários marcados como `deletado`, mas a policy de campanha não olha isso — as campanhas de uma conta excluída continuam visíveis publicamente, com o vínculo à pessoa. Só que apagar de verdade também não é opção: o RNF-007 exige manter logs financeiros por no mínimo 5 anos, e uma campanha que recebeu dinheiro é registro financeiro. Não existe hoje nenhum requisito que descreva o que "excluir conta" significa na prática nesta plataforma.

> Sugestão do *** CLAUDE ***: o caminho que resolve os dois lados é anonimizar o autor, não apagar a campanha. A campanha continua existindo com todo o histórico financeiro intacto (atendendo o RNF-007 e protegendo quem doou, que tem direito de ver para onde foi o dinheiro), mas passa a ser exibida como pesquisador removido, sem nome, sem vínculo institucional e sem links. É exatamente o que plataformas de doação fazem quando alguém encerra a conta, porque a alternativa (fazer a campanha sumir) prejudica justamente o doador, que é a parte mais vulnerável da relação. Isso precisa virar um RF novo na Etapa 3 definindo o que é excluído, o que é anonimizado e o que é retido por obrigação legal — hoje o RNF-003 promete a exclusão de forma genérica sem dizer como, e é o tipo de lacuna que uma banca atenta pergunta.

🔴 **18. Ninguém consegue ver quantos seguidores tem**

As policies de `seguir_campanha` e `seguir_pesquisador` permitem que cada usuário veja apenas as próprias linhas. Na prática isso significa que não existe nenhuma forma de contar quantas pessoas seguem uma campanha ou um pesquisador: nem o dono da campanha, nem o pesquisador, nem o Administrador conseguem consultar isso. Existe até um índice em `02_indices.sql` (`idx_seguir_pesquisador_alvo`) criado justamente para acelerar a busca por pesquisador seguido, ou seja, uma consulta que a segurança do banco proíbe de acontecer.

> Sugestão do *** CLAUDE ***: aqui a pergunta é de produto, não técnica: vocês querem exibir número de seguidores? A favor de exibir: é sinal público de tração, ajuda o doador indeciso e é praticamente padrão em plataforma de financiamento coletivo. Contra: é mais um número que pode desanimar campanha nova com poucos seguidores, e o RF-058 já dá ao pesquisador as métricas que importam de verdade, que são arrecadação e número de doadores confirmados. Minha recomendação é liberar a contagem agregada mas não a lista de quem segue — o pesquisador e o público veem "142 seguidores", ninguém vê os nomes. Isso preserva a privacidade de quem segue (que é o motivo pelo qual a policy está restritiva hoje) e ainda entrega o sinal de tração. Se a decisão for não exibir, aí o índice `idx_seguir_pesquisador_alvo` deve ser removido, porque está ocupando espaço e tempo de escrita para uma consulta que nunca vai rodar.

🔴 **19. Colunas que faltam para requisitos que já estão escritos**

Comparando o banco contra a Etapa 3, existem cinco pontos em que um requisito já aprovado descreve algo que o banco não consegue armazenar. (a) Rótulo personalizado de link acadêmico — os RF-014, RF-016 e RF-018 e a Etapa 2 falam em até 5 links com rótulo personalizável, mas `link_academico` não tem coluna de rótulo nem trava de 5. (b) Descrição da denúncia — os RF-019 e RF-072 pedem campo opcional de descrição adicional, que não existe na tabela `denuncia`. (c) Vídeo de apresentação — o RF-033 pede campo opcional de URL de vídeo exibido em destaque na página da campanha, e `campanha` não tem essa coluna. (d) Justificativa do Administrador ao rejeitar encerramento antecipado — o RF-041 torna obrigatório, mas `solicitacao_encerramento` só tem campo para a justificativa do pesquisador. (e) Tipos de link — o RF-014 lista sete tipos, incluindo "Site Institucional" e "Outro" com regras próprias, e o seed tem cinco.

> Sugestão do *** CLAUDE ***: todos os cinco são baratos de resolver no banco (quatro são coluna nova e um é linha no seed), mas nenhum deve ser feito por reflexo, porque os `.docx` vão ser revisados e a pergunta correta é a inversa: o requisito continua valendo ou ele é que deve sair? Meu palpite item a item: os rótulos de link (a) eu manteria, porque aparecem em três RFs e na Etapa 2, é claramente decisão consolidada de vocês. A descrição da denúncia (b) eu manteria também, porque denúncia só com motivo pré-definido dá pouca informação para o Administrador julgar, e é o tipo de campo que a moderação sente falta rápido. O vídeo (c) eu manteria, é barato (só armazena URL, nenhum arquivo) e aumenta muito a conversão de campanha. A justificativa do Admin (d) é a mais importante das cinco, porque hoje o RF-041 é impossível de cumprir e negar um pedido de encerramento sem registrar o motivo é frágil se o pesquisador contestar depois. E sobre os sete tipos de link (e), eu voltaria atrás na decisão anterior de fechar em cinco: "Site Institucional" e "Outro" são justamente o que atende pesquisador de instituição pequena, que é exatamente o público que a justificativa da Etapa 1 diz que a plataforma quer alcançar; a objeção original era que esses dois não têm domínio validável, o que se resolve deixando `regex` e `dominio` nulos e validando só o formato de URL.

🔴 **20. A taxa da plataforma nunca é gravada na campanha**

O RF-036 exige que o percentual de taxa vigente no momento da aprovação seja gravado e vinculado à campanha, e usado no cálculo do repasse independentemente de alterações posteriores feitas pelo Administrador. A coluna `taxa_plataforma` existe em `campanha`, mas é opcional, não tem valor padrão e nenhuma parte do banco a preenche em momento nenhum. Existe uma configuração `taxa_plataforma_padrao` no seed, mas nada liga uma coisa à outra. Na prática, o requisito que protege o pesquisador de ter a taxa alterada depois da aprovação não está implementado.

> Sugestão do *** CLAUDE ***: isso é o que o RF-036 pede literalmente, então acho que não há muito o que decidir sobre o "se", só sobre o "quando" — o Claude Code criaria uma trigger que copia o valor de `configuracoes.taxa_plataforma_padrao` para `campanha.taxa_plataforma` no momento exato em que a campanha é aprovada (quando `aprovado_em` deixa de ser nulo). A partir daí a trigger de congelamento que já existe protege esse valor. Coloquei isto na lista de decisões e não na de correções mecânicas porque envolve uma pergunta de negócio pequena mas real: se a taxa é 5% por padrão (RF-036) mas a Etapa 2 diz que o valor definitivo será calculado depois de analisar os custos da API de pagamento, tomando Experiment (cerca de 8%) e Catarse (cerca de 13%) como referência, então vocês precisam definir com qual número o sistema entra em operação. Sugiro deixar 5% no seed mesmo e tratar a definição final como ajuste de configuração, já que depois dessa trigger mudar a taxa passa a ser seguro: campanhas já aprovadas ficam imunes por construção.










### 🟢 Já corrigido nesta rodada (27-07-2026)

*(Tudo abaixo já está aplicado no `.sql` — fica aqui só pra registro e prova de que nada quebrou, mesmo padrão da seção `✅ RESOLVIDAS / CORRIGIDAS` no fim do arquivo, mas mantido separado porque é tudo desta mesma data — 27-07-2026.)*

#### Lista A — bugs mecânicos, o próprio `.sql` se contradizendo (não precisavam de decisão de negócio) — **todos 🟢 corrigidos em 27-07-2026**

🟢 **A1. `usuario.email_verificado` fora do `GRANT`** — `06_grants.sql` `[06-D-2]`: a coluna existe na tabela mas não estava na lista do `GRANT SELECT` por coluna — `app_nestjs` não conseguia ler, quebrava o fluxo de verificação de e-mail. **Corrigido:** coluna adicionada à lista.

🟢 **A2. `fn_congela_regras_campanha` não bloqueava o que diz bloquear** — `05_regras_negocio.sql` `[05-K-2]`: usava `<>` em vez de `IS DISTINCT FROM`; como `taxa_plataforma` é nullable, comparar contra `NULL` nunca dava `TRUE`, e dava pra definir a taxa numa campanha já aprovada. **Corrigido:** as 3 comparações trocadas pra `IS DISTINCT FROM`.

🟢 **A3. Regras financeiras que só valiam no `INSERT`** — `trg_valida_repasse` e `trg_contribuicao_all_or_nothing_pix` (`05`, `[05-K-2]`) eram `BEFORE INSERT` só — um `INSERT` com valor zerado seguido de `UPDATE` pro valor real furava as duas regras. **Corrigido:** as duas agora são `BEFORE INSERT OR UPDATE`. *(Conferi as outras 2 triggers do mesmo bloco — `trg_valida_status_contribuicao` e `trg_atualizacao_campanha_status` — e decidi NÃO estender essas duas: elas validam o status da campanha no momento de criar um registro filho novo; se disparassem em UPDATE também, bloqueariam operações legítimas como confirmar um pagamento ou moderar uma atualização depois que a campanha já encerrou — teria criado um bug novo em vez de corrigir um.)*

🟢 **A4. Fila de notificação não podia ser processada por ninguém** — `04_rls_policies.sql` `[04-D-5]`: as policies de `notificacao` exigiam `id_usuario = id_usuario_atual()`, inclusive pra criar — mas toda notificação real do sistema é pra um terceiro. **Corrigido:** `INSERT`/`UPDATE` liberados pro `app_nestjs` (`WITH CHECK (true)`/`USING (true)`, mesmo padrão de `verificacao_email`/`recuperacao_senha`/`sessao`); o `SELECT` continua restrito ao dono.

🟢 **A5. `denuncia` aceitava alvo incoerente** — nada impedia os dois alvos preenchidos, os dois nulos, ou um motivo do tipo errado pro alvo escolhido. **Corrigido:** `CHECK "CK_DENUNCIA_ALVO_XOR"` novo em `01` (exatamente um alvo preenchido) + trigger nova `trg_denuncia_valida_tipo_motivo` em `05` (cruza `motivo_denuncia.tipo` com qual coluna foi preenchida). Conferido que as 7 linhas do seed já passavam nas duas regras sem alteração nenhuma.

🟢 **A6. O valor `'cancelado'` do ENUM `status_encerramento` era inalcançável** — só quem tinha `solicitacao_encerramento_decidir` (o admin) conseguia `UPDATE`; o pesquisador nunca conseguia cancelar a própria solicitação. **Corrigido:** `pol_solicitacao_update` (`04`) passou a liberar também o dono da campanha; trigger nova `trg_valida_transicao_solicitacao` (`05`) restringe o dono só à transição `pendente → cancelado`, sem tocar em `id_admin`/`justificativa_pesquisador`.

🟢 **A7. 21 tabelas com `GRANT DELETE` que nunca funcionava** — contagem exata conferida (28 tabelas com `GRANT DELETE`, só 7 com policy de `DELETE` de verdade). **Corrigido:** `DELETE` removido do `GRANT` das 21 tabelas sem policy; mantido só em `configuracoes`, `usuario_papel`, `seguir_pesquisador`, `seguir_campanha`, `link_academico`, `link_atualizacao`, `link_recompensa`.

🟢 **A8. Coluna `suspenso` duplicada e morta** — `perfil_pesquisador` tinha `suspenso BOOLEAN` e `status_pesquisador ENUM` pro mesmo estado, e só o segundo era de fato lido em algum lugar. **Corrigido:** coluna `suspenso` removida de `01` (tabela), `06` (grant) e `07` (seed) — conferido que os 7 valores por linha continuam alinhados com as colunas depois da remoção.

🟢 **A9. Perfil e links de usuário deletado continuavam públicos** — `pol_perfil_select` e `pol_link_select` eram `USING (TRUE)`, sem checar `usuario.deletado`. **Corrigido:** função nova `usuario_visivel(p_id INT)` em `03` (mesmo padrão de `tem_permissao`), aplicada nas duas policies. `pol_campanha_select` fica de fora de propósito — ver Lista C.

🟢 **A10. Comentários/permissões órfãs sem explicação** — **Corrigido:** comentário novo em `07` explicando que `recuperacao_senha_revogar`/`sessao_revogar`/`verificacao_email_reenviar` são propositalmente sem policy (camada NestJS), e que `perfil_pesquisador_visualizar_sensivel` hoje não tem efeito nenhum (`cpf_criptografado` nem está no `GRANT SELECT`). *(A contagem de 105 policies no cabeçalho do `04` já estava certa — conferido com `grep`, não havia 106 como uma das revisões cogitou; nada foi mudado aí.)*

#### Lista B — decisão de uma linha (você deu o OK) — **todos 🟢 aplicados em 27-07-2026**

🟢 **B1. FKs de alvo em `denuncia`: `SET NULL` → `RESTRICT`** — mais correto pra um registro de moderação não virar órfão sozinho com o tempo. **Aplicado** — não muda nada na prática hoje, já que nem `campanha` nem `usuario` têm policy de `DELETE`.

🟢 **B2. Congelamento anti-fraude estendido pra `titulo`, `descricao`, `data_fim` e `data_inicio`** — trocar a descrição ou o prazo de um projeto já financiado era o vetor de fraude mais óbvio, e nada bloqueava. **Aplicado** na mesma `fn_congela_regras_campanha` do A2 (`data_inicio` entrou depois, no mesmo dia — ver item 26, logo abaixo). *Correção 27-07-2026: a frase original aqui dizia "conferido que nada no `05`/`07` escreve em `data_fim` depois da criação — não afeta o seed", o que dava a entender que o congelamento tinha saído de graça, sem nenhum efeito colateral. Não é bem assim — o item 26, logo abaixo, mostra o teste que encontrou o efeito colateral real (o fluxo do RF-042, encerramento antecipado, quebrado, porque ele também precisa gravar em `data_fim`) e a correção aplicada no mesmo dia. A frase "não afeta o seed" continua tecnicamente certa (o `07_seed_dados.sql` mesmo não escreve em `data_fim`), só não devia ter sido lida como "não afeta nada".*

🟢 **B3. Pesquisador suspenso agora é barrado de criar campanha/publicar atualização** — replicado o mesmo padrão que já existia só em `pol_comentario_insert` (`status_pesquisador = 'ativo'`) pras policies de `INSERT` de `campanha` e `atualizacao_campanha`. **Aplicado.** Como o seed roda como superusuário (bypassa RLS) e todos os 7 pesquisadores seedados já são `'ativo'`, o seed continua rodando sem nenhuma mudança.

**Prova mecânica de que nada quebrou (Lista A + B juntas):** 39 tabelas (igual); `PK_`=39, `FK_`=55, `UK_`=18 (iguais); `CK_` foi de 13 pra 14 (a nova `CK_DENUNCIA_ALVO_XOR`); parênteses balanceados em `01`. Policies: 105 `CREATE POLICY` / 105 `DROP POLICY`, continua 100% idempotente. Triggers foram de 24 pra 26 (`trg_denuncia_valida_tipo_motivo`, `trg_valida_transicao_solicitacao`); funções de `05` foram de 28 pra 30, e `03` de 2 pra 3 (`usuario_visivel`) — cabeçalhos de inventário atualizados nos arquivos correspondentes. Reconferi linha a linha o seed inteiro (`denuncia`, `perfil_pesquisador`) contra as constraints/triggers novas — todas as linhas já existentes continuam passando sem precisar mudar nenhum valor do seed.

*(Os itens 21 e 23-26 abaixo vieram de rodadas de teste real — Postgres 16 instalado, os 8 arquivos executados de verdade, cenário por cenário, não só lidos. Confirmei cada afirmação técnica direto contra o `.sql` atual antes de corrigir.)*

🟢 **21. `07_seed_dados.sql` não roda até o fim do jeito que está — 3 erros em cascata — CORRIGIDO em 27-07-2026**

Conferido linha a linha, os três são reais:
- **`auditoria_financeira`**: a coluna `valor` é `DECIMAL(10,2) NOT NULL`, sem valor padrão, e o `INSERT INTO auditoria_financeira (id_contribuicao, status_novo, status_anterior, evento, timestamp)` do seed nunca informa essa coluna. As 7 linhas falham com `null value in column "valor" violates not-null constraint`.
- **`atualizacao_campanha`**: a campanha 7 do seed tem `status = 'encerrado'`, mas `validar_atualizacao_campanha()` só aceita `'ativo'`, `'sucesso'` ou `'nao_atingido'`. Como o `INSERT` de `atualizacao_campanha` é um único comando com 7 linhas e uma delas mira a campanha 7, o comando inteiro falha — nenhuma das 7 atualizações é criada.
- **`arquivo_atualizacao`**: consequência direta do erro anterior — sem nenhuma linha em `atualizacao_campanha`, o `INSERT` em `arquivo_atualizacao` (que referencia `id_atualizacao`) quebra por `FK_ARQUIVO_ATUALIZACAO_ATUALIZACAO`.

Isso significa que a afirmação anterior de que o banco "roda do zero sem erro" nunca tinha sido testada por execução real — só por leitura estática (contagens, comparação de arquivo, simulação manual). Os arquivos `01` a `06` e o `08` continuam passando sem nenhum erro.

> Sugestão do *** CLAUDE ***: os três têm o mesmo tipo de correção, mecânica e sem decisão de negócio envolvida. `auditoria_financeira` precisa de um valor em `valor` em cada uma das 7 linhas (dá pra usar o mesmo valor da `contribuicao` correspondente). Já `atualizacao_campanha`/`arquivo_atualizacao` têm duas saídas possíveis: ou o bloco ganha uma trigger desligada temporariamente, ou a atualização da campanha 7 é reordenada pra rodar num momento em que a campanha ainda esteja com status permitido.

**Corrigido:** `auditoria_financeira` ganhou a coluna `valor` no `INSERT` (mesmo valor da `contribuicao` correspondente, em cada uma das 7 linhas). `atualizacao_campanha` ganhou `ALTER TABLE atualizacao_campanha DISABLE/ENABLE TRIGGER trg_atualizacao_campanha_status` envolvendo o `INSERT` (mesmo raciocínio do `[07-H-1]`, campanha 7 é dado histórico já concluído). `arquivo_atualizacao` se resolveu sozinho como consequência. Prova: os 7 `INSERT` continuam com os mesmos dados, só ganharam a coluna/trigger que faltava.

🟢 **23. BUG CRÍTICO — `id_usuario_atual()` derruba o sistema inteiro se a variável de sessão vier como texto vazio, não só "não definida" — CORRIGIDO**

`current_setting('app.id_usuario_atual', true)::INT` — o segundo argumento `true` só protege contra a variável nunca ter sido definida (retorna `NULL` nesse caso, como o comentário da função já dizia). Ele **não** protege contra a variável estar definida como string vazia `''`. Testado direto no banco:
```sql
SELECT set_config('app.id_usuario_atual', '', false);
SELECT public.id_usuario_atual();        -- ERROR: invalid input syntax for type integer: ""
SELECT public.tem_permissao('campanha_aprovar');  -- mesmo erro
SELECT count(*) FROM campanha;           -- mesmo erro, inclusive na listagem pública
```
Como `tem_permissao()` chama `id_usuario_atual()` por baixo, e `tem_permissao()` aparece em 89 das 105 policies, uma única sessão com essa variável vazia (em vez de simplesmente não definida) derruba qualquer consulta a qualquer tabela protegida — **inclusive a página pública de campanhas, que nem exige login**. E o gatilho é banal: é exatamente o que acontece em JavaScript quando alguém escreve algo como `` `${usuario?.id ?? ''}` `` pra um visitante anônimo, ou quando alguém "limpa" a variável ao final de uma requisição em vez de deixar o `SET LOCAL` expirar sozinho com o fim da transação — ou seja, é o erro mais provável de acontecer bem na hora de implementar a pendência 5 (contexto de sessão por requisição), antes mesmo de existir uma rota de login.

> Sugestão do *** CLAUDE ***: `SELECT NULLIF(current_setting('app.id_usuario_atual', true), '')::INT;` — uma palavra (`NULLIF`) resolve os três casos (não definida, definida vazia, definida com valor) corretamente.

**Corrigido:** `id_usuario_atual()` (`03`) agora usa `NULLIF(current_setting(...), '')::INT`, com comentário explicando a pegadinha. Prova: string vazia e "nunca definida" agora se comportam de forma idêntica (`NULL`), e `tem_permissao()`/qualquer policy que dependa dela volta a funcionar em ambos os casos.

🟢 **24. Regressão da A3 — o webhook de pagamento não consegue confirmar 3 das 7 contribuições do seed — CORRIGIDO**

A correção da A3 (`BEFORE INSERT` → `BEFORE INSERT OR UPDATE` em `trg_contribuicao_all_or_nothing_pix`) foi aplicada literalmente, mas `validar_contribuicao_all_or_nothing()` revalida `meio_pagamento` **mesmo quando essa coluna não está sendo alterada**. O seed tem 3 contribuições não-PIX em campanhas `all-or-nothing` (`id_contribuicao` 2 e 7 em cartão de crédito, 4 em boleto — entraram porque a trigger estava desligada durante a carga, ver bloco `[07-H-1]`). Testado:
```sql
UPDATE contribuicao SET status='confirmado' WHERE id_contribuicao=4;
-- ERROR: Campanhas all-or-nothing aceitam apenas contribuições via PIX
```
Um `UPDATE` que só muda `status` (exatamente o que um webhook de confirmação de pagamento faz o tempo todo) é bloqueado. Essas 3 linhas ficam permanentemente congeladas — e o mesmo aconteceria com qualquer linha futura que, por algum motivo, fique fora da regra.

> Sugestão do *** CLAUDE ***: separar a trigger em duas — uma `BEFORE INSERT` sem condição (comportamento original) e outra `BEFORE UPDATE` com uma cláusula `WHEN (NEW.meio_pagamento IS DISTINCT FROM OLD.meio_pagamento OR NEW.id_campanha IS DISTINCT FROM OLD.id_campanha)`, só revalidando quando o que importa de fato muda. Isso mantém a proteção que a A3 queria (impedir trocar o meio de pagamento por baixo dos panos) sem travar o fluxo normal de confirmação.

**Corrigido:** exatamente essa separação foi feita em `05` — `trg_contribuicao_all_or_nothing_pix` (`BEFORE INSERT`, sem condição) e `trg_contribuicao_all_or_nothing_pix_update` (`BEFORE UPDATE`, com o `WHEN` sugerido). As 3 contribuições não-PIX do seed continuam existindo como estavam (não mexi no seed pra "corrigir" o dado histórico — isso ficou só como observação, não é bug de código) e agora aceitam `UPDATE` de `status` numa boa. Prova: a trigger nova aparece na contagem (`05` foi de 26 para 27 triggers).

🟢 **25. Regressão da A3 — o repasse fica intocável depois que o dinheiro é devolvido — CORRIGIDO**

Mesmo mecanismo, em `fn_valida_repasse_all_or_nothing()`. Fluxo do RF-038 testado numa campanha `all-or-nothing` que bateu a meta, teve repasse registrado, e depois teve as contribuições revertidas pra `'a_devolver'` (derrubando `valor_bruto_arrecadado` pra 0):
```sql
UPDATE repasse SET status='devolvido' WHERE id_campanha=7;
-- ERROR: Repasse bloqueado: campanhas all-or-nothing só podem repassar
--        valores se a meta financeira for atingida.
```
A trigger relê `valor_bruto_arrecadado` (agora zero) e bloqueia — mesmo o `UPDATE` não estando liberando nenhum dinheiro novo, só corrigindo status/data de um repasse que já tinha acontecido.

> Sugestão do *** CLAUDE ***: só validar quando o valor liberado está de fato aumentando: `NEW.valor_liquido > COALESCE(OLD.valor_liquido, 0)`. No `INSERT`, `OLD` não existe e a expressão se comporta igual a hoje (`NEW.valor_liquido > 0`); no `UPDATE`, só bloqueia quem tenta liberar mais dinheiro do que já tinha sido liberado antes — reduzir, zerar ou só mudar status/data nunca deveria travar.

**Corrigido:** `fn_valida_repasse_all_or_nothing()` agora usa `TG_OP = 'UPDATE'` pra decidir se olha `OLD.valor_liquido` (só faz sentido acessar `OLD` num `UPDATE` — num `INSERT` o registro `OLD` nem existe, e tentar ler ele quebraria com "record OLD is not assigned yet"). A comparação final ficou `NEW.valor_liquido > COALESCE(v_valor_liquido_anterior, 0)`, exatamente a lógica sugerida.

🟢 **26. Regressão da B2 — congelar `data_fim` tirou o lugar de registrar quando a campanha realmente terminou, e `data_inicio` ficou de fora por engano — CORRIGIDO**

Testado o fluxo do RF-042 (admin aprova encerramento antecipado):
```sql
UPDATE campanha SET status='encerrado', data_fim=NOW() WHERE id_campanha=5;
-- ERROR: Operação bloqueada: o prazo da campanha não pode ser alterado após o congelamento.
```
Congelar `data_fim` continua certo — é a data prometida a quem doou, mudar depois é exatamente o que o congelamento deveria impedir. O problema é que não existe nenhuma coluna pra registrar a data real de encerramento (natural, antecipado ou por moderação) — `data_fim` é a promessa, não o fato. E tem uma assimetria: `data_inicio` **não** foi incluído no congelamento do B2 — dá pra mover a data de início de uma campanha aprovada livremente, e a duração dela muda por esse lado sem nenhum bloqueio (testado: recuar `data_inicio` em 10 dias fez a duração pular de 60 pra 70 dias sem erro nenhum).

> Sugestão do *** CLAUDE ***: manter `data_fim` congelado, adicionar `data_inicio` na mesma lista de campos protegidos do B2 (mesma trigger, mesmo padrão), e criar uma coluna nova `encerrado_em TIMESTAMP` em `campanha`, preenchida em qualquer tipo de encerramento. Isso também serve ao RF-058 (data do repasse no painel) e à auditoria em geral.

**Corrigido:** `data_inicio` entrou na mesma trigger `fn_congela_regras_campanha` (`05`), junto de `titulo`/`descricao`/`data_fim`. A coluna `encerrado_em TIMESTAMP` foi criada em `campanha` (`01`), nullable, sem valor padrão — não é congelada de propósito (é justamente o campo que deve poder ser preenchido no momento do encerramento). O seed não referencia essa coluna pelo nome, então as 7 linhas continuam inserindo normal, só com `encerrado_em = NULL`. Ainda não existe uma trigger que preencha `encerrado_em` sozinha — quem grava esse valor, por enquanto, é quem faz o `UPDATE` de status (fica pro NestJS, ou pra uma trigger futura se decidirem automatizar).

#### Achados menores desta rodada (já corrigidos)

🟢 **27. `GRANT UPDATE` sem policy de `UPDATE` em 6 tabelas — CORRIGIDO** — mesmo problema do A7 (que só cobriu `DELETE`), agora do lado do `UPDATE`: `aceite_termo_contribuicao`, `contribuicao_recompensa`, `usuario_termo`, `seguir_campanha`, `seguir_pesquisador`, `usuario_papel` tinham `GRANT UPDATE` sem nenhuma policy correspondente. Nas 3 primeiras é proposital (comentários do `04` já dizem isso: "aceite/aquisição é registro de auditoria, não deve ser editável"); nas outras 3 (`seguir_*`, `usuario_papel`) a operação real é inserir e apagar, não tem o que atualizar. **Corrigido:** `UPDATE` removido do `GRANT` das 6, em `06_grants.sql`.

🟢 **29. Dono da campanha não vê por que ela foi rejeitada — CORRIGIDO** — `pol_historicorej_select` só liberava quem tem `campanha_rejeitar`; diferente de `solicitacao_encerramento` e `repasse` (as duas tabelas irmãs), que corretamente liberam também `EXISTS (... id_usuario = id_usuario_atual())` pro dono. O RF-070 prevê o pesquisador editar e reenviar campanha rejeitada — sem ver o motivo na própria plataforma, ele dependia só do e-mail do RF-071. **Corrigido:** acrescentado o mesmo `OR EXISTS (...)` que as duas tabelas irmãs já usavam.

🟢 **30. Worker de notificação dependia de uma permissão com nome enganoso — CORRIGIDO** — o A4 destravou a escrita (o mais grave), mas o `SELECT` continuava exigindo ser o dono da notificação ou ter `usuario_visualizar_sensivel` — funcionava, mas criava acoplamento estranho: o worker de e-mail precisava rodar autenticado com uma permissão cujo nome diz "ver dado sensível de usuário", não "processar fila de notificação". **Corrigido:** nova permissão `notificacao_processar` (seedada em `07`, atribuída ao `admin`), acrescentada como mais uma opção em `pol_notificacao_select` (`04`), ao lado da condição de dono e de `usuario_visualizar_sensivel` — nada que já funcionava foi removido, só uma opção nova.

**Confirmado que a Lista A/B em si está correta** (nenhum item foi revertido) — as regressões 24-26 são efeito colateral de uma correção real, não a correção em si estando errada. A auto-correção anterior sobre "105 vs 106 policies" também foi reconfirmada como engano de contagem (a contagem certa sempre foi 105, batendo com o cabeçalho do `04`) — nada a mudar aí.

**Prova mecânica de que nada quebrou (itens 21, 23-27, 29-30 juntos):** 39 tabelas (igual, só ganhou a coluna `encerrado_em` em `campanha`); `PK_`=39, `FK_`=55, `UK_`=18, `CK_`=14 (todos iguais). Parênteses balanceados em `01`. Policies: continua 105 `CREATE POLICY` / 105 `DROP POLICY` (só editei policies existentes, nenhuma nova). Triggers foram de 26 para 27 (`trg_contribuicao_all_or_nothing_pix_update`, a única trigger nova). Funções: 30 em `05` e 3 em `03`, sem mudança de contagem (só corpo de função existente foi alterado). Reconferi o seed inteiro linha a linha depois das mudanças — as 7 linhas de `auditoria_financeira`, as 7 de `atualizacao_campanha` e as 7 de `campanha` continuam com os mesmos dados de antes, só ganhando a coluna/trigger que faltava.

---


## No `.sql`


### 🔴 1. Senha placeholder

Senha placeholder `'TROCAR_NO_AMBIENTE_REAL'` na criação da role `app_nestjs` em `01_extensoes_enums_tabelas.sql`. Só é risco fora do ambiente local — lembrar de trocar quando for pra produção.

> Sugestão do *** CLAUDE ***: não mexeria no `.sql` em si — o placeholder faz sentido continuar aí pro ambiente local. O que eu faria é transformar isso num passo obrigatório de checklist de deploy (já existe um rascunho disso no `tutorial-rodar-projeto.md`, na parte de "troque a senha"): a senha de produção não devia nunca ficar em nenhum arquivo versionado, nem provisória — o ideal é gerar ela automaticamente (`openssl rand` ou equivalente) no momento do deploy e guardar só num gerenciador de segredos (variável de ambiente do provedor de hospedagem, nunca num `.env` versionado no Git). Isso se resolve sozinho quando chegar a hora de colocar em produção — não precisa de decisão de equipe agora, só não esquecer depois.

> Segunda opinião (27-07-2026): um ponto contrário vale registrar — checklist depende de alguém lembrar; se esquecer, o sistema continua funcionando perfeitamente, só que inseguro (falha aberta, sem nenhum aviso). Uma alternativa é criar a role já como `NOLOGIN`, sem senha nenhuma, e deixar o `ALTER ROLE app_nestjs LOGIN PASSWORD '...'` como o passo separado e obrigatório do deploy. Assim, se alguém esquecer esse passo, o NestJS simplesmente não consegue conectar — falha fechada, barulhenta, percebida em minutos, em vez de uma senha conhecida ficando exposta em silêncio. As duas soluções resolvem o mesmo risco de formas diferentes (checklist vs. "fail closed" por design) — decisão de vocês qual preferem.


### 🔴 2. Debate `tipo_link` / `contexto_link`

Debate sobre criar 2 tabelas novas (`tipo_link` e `contexto_link` reformulados) — **adiado, não mexer sem pedir**. Assunto que você e sua parceira ainda estão discutindo sobre como modelar.

> Sugestão do *** CLAUDE ***: olhando Catarse e Experiment, os dois têm um conjunto de contextos de link bem pequeno e estável (perfil do criador, página do projeto, atualizações) — não é algo que cresce toda hora na prática. Isso favorece o modelo atual (3 flags booleanas: `permite_perfil`, `permite_atualizacao`, `permite_recompensa`), que é mais simples de ler e de mexer no dia a dia. Eu só migraria pra uma tabela `contexto_link` dinâmica (como o `RBAC-pontos-discutidos.md`, seção 6.5, já esboça) se vocês já tiverem um plano concreto de adicionar um 4º ou 5º contexto em breve (ex.: link em denúncia, em perfil de instituição) — sem esse plano concreto, a complexidade extra da tabela nova não se paga ainda. Minha recomendação: manter como está por enquanto, e só revisitar quando um novo contexto for realmente necessário (não antes, por precaução).


### 🔴 3. `score_minimo_campanha` seedado mas nunca aplicado

`07_seed_dados.sql` (linha 269-270) cadastra a configuração `score_minimo_campanha = 25.00` ("Score mínimo para criar campanha"), com um comentário explícito no próprio arquivo:

> `-- TODO (pendente decisão da equipe): regra de score mínimo para campanha ainda não confirmada; manter sem trigger por enquanto.`

Conferido em `05_regras_negocio.sql`: não existe nenhuma trigger que leia essa configuração — ou seja, hoje um pesquisador com score 0 pode criar campanha normalmente, a regra existe só "no papel". Não é bug (o próprio comentário já avisa que é proposital, aguardando decisão), mas é uma pendência real de negócio: **vocês querem mesmo essa trava?**

Se sim, é uma trigger pequena em `05` (tipo `trg_campanha_limite_simultaneo`, mas checando score em vez de contagem) que bloqueia `INSERT` em `campanha` se `perfil_pesquisador.score_atual < config_numero('score_minimo_campanha', ...)`.

> Sugestão do *** CLAUDE ***: nem Catarse nem Experiment bloqueiam a criação de campanha por um "score de reputação" acumulado na plataforma — os dois confiam na aprovação manual de um curador/admin (que este projeto já tem, via `status = 'aguardando_aprovacao'`) como o filtro de confiança real, não em histórico de uso do sistema. Faz sentido: um pesquisador cadastrado ontem, com score 0, pode ser totalmente legítimo (é só novo na plataforma) — travar ele automaticamente prejudicaria exatamente quem uma plataforma de crowdfunding científico mais precisa atrair, que são pesquisadores novos por ali. Minha recomendação: - não implementar a trigger de bloqueio automático -. Em vez disso, usar `score_minimo_campanha` só como um - sinal de apoio pra revisão manual - — por exemplo, o painel do admin pode destacar/sinalizar campanhas de pesquisadores com score abaixo do mínimo pra receberem uma revisão mais cuidadosa antes de aprovar, sem bloquear ninguém de forma automática e definitiva.


### 🟠 4. Possível linha duplicada em `repasse` (campanha 2)

`07_seed_dados.sql` (`[07-E-4]`, linhas ~403 e ~408) tem duas linhas de repasse para a mesma campanha (`id_campanha = 2`), ambas com o mesmo `valor_bruto` (28.500,00):
- uma `'concluido'` com `valor_liquido = 27.075,00` (28.500 × 0,95, a conta normal de repasse com taxa de 5%);
- outra `'parcial_processando'` com `valor_liquido = 0,00` e `repassado_em = NULL`.

A campanha é `modelo = 'flexivel'` (repasse abaixo da meta é esperado e correto nesse modelo, isso **não** é o problema) — a dúvida é por que existem **duas** linhas de repasse pro mesmo valor bruto, uma já concluída e outra "em processamento" com valor zerado.

Pode ser um resquício de teste/copy-paste no seed, ou pode representar um cenário proposital (ex.: tentativa de repasse que falhou e foi reprocessada). Não mexi em nada, só sinalizando pra nós decidirmos se é lixo de seed pra remover ou um cenário de teste válido pra manter (e, nesse caso, talvez valha um comentário explicando a intenção).

> Sugestão do *** CLAUDE ***: olhando os dois valores, isso não parece um cenário real intencional — se fosse um segundo repasse de verdade (ex.: mais dinheiro arrecadado depois do primeiro repasse), o `valor_bruto` da segunda linha seria diferente (incremental), não idêntico ao da primeira. Minha recomendação: remover a linha `'parcial_processando'` duplicada e manter só a `'concluido'`, que é a que reflete corretamente uma campanha `flexivel` já finalizada. Se no futuro vocês quiserem um exemplo de seed mostrando "uma tentativa de repasse que falhou e foi reprocessada" (um cenário de teste legítimo), eu recriaria isso com valores e datas claramente diferentes entre as duas linhas, mais um comentário explicando a intenção — do jeito que está hoje, sem essa diferença, é fácil confundir com lixo de teste.

> Atualização (27-07-2026): a linha duplicada é sintoma, não a causa raiz. Todas as 7 linhas de `repasse` têm `valor_bruto` batendo com o total inventado de cada campanha, não com a soma real das contribuições seedadas — ver o item novo sobre `valor_bruto_arrecadado` na seção de resolvidas mais abaixo. Corrigir só a linha duplicada e deixar as outras 6 do jeito que estão é resolver a parte errada do problema. Por isso o círculo virou 🟠 em vez de 🔴 simples: o diagnóstico original (a linha é lixo de seed) continua certo, só que é menor do que o problema de verdade.

---








## Só resolve em código Nest/React (ainda não existem)


- 🔴 5. Contexto de sessão por requisição

`SET LOCAL app.id_usuario_atual` por requisição (dentro de uma transação, usando um `Client` específico da pool).

> Sugestão do *** CLAUDE ***: implementar como um interceptor/middleware global do NestJS (não espalhado controller por controller) — assim fica impossível esquecer o `SET LOCAL` numa rota nova que alguém criar depois. Vale também um teste de integração simples que tenta acessar dado de outro usuário sem esse `SET LOCAL` e confirma que a RLS realmente bloqueia.


- 🔴 6. Fluxo de autenticação completo

Signup, login, verificação de e-mail, recuperação de senha, refresh token.

> Sugestão do *** CLAUDE ***: os prazos que já estão documentados no `01` (token de recuperação de senha com expiração de 15-30 min, ver comentário da tabela) já batem com o padrão que plataformas como Catarse/Experiment usam pra esse tipo de fluxo — não mudaria nada aí. Um reforço que vale considerar: rate-limit de tentativa de login (mesmo simples, tipo "5 tentativas por IP a cada 15 min") é algo que sistemas de referência têm e que ainda não está no escopo — vale colocar na lista quando for implementar.


- 🔴 7. Guards/interceptors no NestJS

Espelhando `tem_permissao()` do banco no lado da aplicação.

> Sugestão do *** CLAUDE ***: pra não correr o risco de as duas camadas (banco e NestJS) divergirem com o tempo, eu geraria a lista de permissões que o guard do NestJS reconhece - a partir da própria tabela `permissao` - (uma consulta na subida da aplicação, ou um script que gera uma constante/enum automaticamente), em vez de digitar a lista de novo à mão no código do backend. Assim, toda permissão nova só precisa ser criada uma vez, no banco.


- 🔴 8. Conexão sempre como `app_nestjs`

Garantir que a conexão do backend use sempre `app_nestjs`, nunca superusuário (senão a RLS é ignorada silenciosamente).

> Sugestão do *** CLAUDE ***: um health-check simples na subida do NestJS (`SELECT current_user`) que impede a aplicação de subir se a conexão não for exatamente `app_nestjs` — evita o erro silencioso de rodar com superusuário sem ninguém perceber, o que faria a RLS inteira parecer que "funciona" em teste mas não proteger nada de verdade.


- 🔴 9. Validação de escrevibilidade financeira

`auditoria_financeira` e `repasse` têm policies de escrita `USING (true)` — a RLS não valida quem grava aí, fica 100% a cargo do serviço do NestJS.

> Sugestão do *** CLAUDE ***: seguindo o padrão de qualquer plataforma de pagamento séria (inclusive Catarse/Experiment, que também dependem de gateway externo pra processar pagamento), eu isolaria a escrita em `auditoria_financeira`/`repasse` dentro de um único serviço interno do NestJS, chamado só pelo webhook do gateway de pagamento — nunca exposto como um endpoint CRUD genérico que outra parte do app possa chamar por engano.

> Correção de foco (27-07-2026): o risco real aqui não é "ter que escrever a regra duas vezes" (uma vez em SQL, outra no NestJS) — é que hoje, especificamente no caminho do dinheiro (`repasse`, `auditoria_financeira`, `historico_rejeicao`), a RLS está `USING (true)` e não protege nada, exatamente onde mais importaria proteger. Isso já foi testado de verdade: inserir um `repasse` com `valor_liquido = 0` numa campanha `all-or-nothing` abaixo da meta (permitido, RF-038) e depois fazer `UPDATE` pro valor cheio passava direto, sem revalidar a regra all-or-nothing. **Esse teste específico já não funciona mais** — foi corrigido em 27-07-2026 (ver `A3` na seção de resolvidas: `trg_valida_repasse` agora também dispara em `UPDATE`, não só `INSERT`). O ponto de fundo continua válido: `auditoria_financeira`/`repasse`/`historico_rejeicao` seguem com escrita aberta por decisão consciente, então o serviço isolado do NestJS sugerido acima continua sendo a defesa que falta.


---


## Decisões que precisamos tomar, não bugs


- 🔴 10. React em JavaScript ou TypeScript

> Sugestão do *** CLAUDE ***: TypeScript. O NestJS já é TypeScript por padrão — manter o front em JavaScript puro cria uma costura inconsistente entre as duas pontas, e vocês perdem a chance de compartilhar tipos entre back e front (ex.: o formato de uma campanha, de uma contribuição). Pra quem ainda está aprendendo, o TypeScript pega em tempo de compilação exatamente o tipo de erro bobo (nome de campo errado, tipo trocado) que sem ele só aparece rodando o app — é uma rede de segurança a mais, não só "código chato de escrever a mais".


- 🔴 11. Pool direto no Service

Só nota de melhoria futura, não urgente.

> Sugestão do *** CLAUDE ***: usar o padrão de injeção de dependência do próprio NestJS — registrar o `Pool` do `pg` como um provider único do módulo e injetar ele nos services, em vez de cada service criar sua própria instância de `Pool`. É o jeito idiomático do framework e evita vazamento de conexão (vários pools abertos sem necessidade).


---
---
---
---
---


# ✅ RESOLVIDAS / CORRIGIDAS

*(Já aplicado no `.sql` — só ficam aqui pra registro e explicação, não precisa fazer mais nada)*


## 🟢 Permissão `campanha_encerrar` sem policy de RLS — **[RESOLVIDO]**

Decidido **remover** a permissão (era órfã, nunca usada por nenhuma policy) em vez de implementar um atalho de encerramento direto.

**5 permissões sem policy de RLS que motivaram essa revisão:** `campanha_encerrar`, `perfil_pesquisador_visualizar_sensivel`, `sessao_revogar`, `recuperacao_senha_revogar`, `verificacao_email_reenviar`.

Pergunta original: dava pra mandar a IA do VSCode "consertar" isso de uma vez? Não é tão simples quanto parece — não é "esqueceu de escrever a policy", é que ninguém tinha decidido ainda o que cada permissão deveria liberar. Mandar a IA "consertar" sem isso é arriscado: ela teria que adivinhar a regra, e podia acertar errado.

Separando as 5:

- **`sessao_revogar`, `recuperacao_senha_revogar`, `verificacao_email_reenviar`** — essas 3 tabelas já têm policy `FOR ALL USING (true)` de propósito (o próprio projeto decidiu que a autorização desses fluxos fica no NestJS, não na RLS, porque acontecem antes do login existir). Criar uma policy pra essas permissões seria redundante — não muda nada. Não vale a pena mexer.

- 🟠 **`perfil_pesquisador_visualizar_sensivel`** — texto original dizia "já está resolvida" porque o `cpf_criptografado` foi excluído do `GRANT SELECT` geral (`06_grants.sql` — a coluna não aparece na lista liberada pro `app_nestjs`), e criar uma policy de RLS pra isso não encaixaria bem (é proteção de coluna, não de linha). **Isso ainda é verdade, mas "resolvida" foi longe demais** — segunda opinião (27-07-2026): a permissão continua no seed, continua sendo dada automaticamente ao papel `admin` (via `trg_permissao_auto_admin`) e continua sem fazer absolutamente nada, porque nenhuma policy a usa. Tem um problema mais sério embaixo: como `cpf_criptografado` não está em nenhum `GRANT SELECT`, **ninguém lê essa coluna** — não é "só o admin lê", é que nem o `app_nestjs` consegue. O RF-015 diz que o CPF é armazenado "para fins de verificação de identidade" (KYC da API de pagamento, conforme a Etapa 2) — se o backend não consegue nem selecionar a coluna, ele não tem como mandar esse dado pra API de pagamento configurar o recebimento do pesquisador. Decisão real que falta tomar: ou o CPF entra no `GRANT SELECT` (com o acesso controlado no NestJS, onde essa permissão faria sentido de verdade), ou fica confirmado que a coluna é só-escrita e a permissão sai do seed por não ter uso nenhum. O estado atual — nem uma coisa nem outra — é o pior dos dois: uma permissão fantasma protegendo uma coluna que ninguém consegue usar.

- **`campanha_encerrar`** — essa era a única em aberto de verdade. Decisão tomada:
  - **Como era:** a permissão existia (`07_seed_dados.sql`, atribuída ao papel `admin`), mas nenhuma policy de RLS a usava — não fazia nada na prática.
  - **As duas opções que estavam na mesa:** (a) ela era redundante com `solicitacao_encerramento_decidir` (que já existe, já funciona, já registra justificativa) — nesse caso, só remover; (b) ela deveria virar um atalho de encerramento direto via `UPDATE`, sem passar pela solicitação formal — nesse caso, precisaria de uma policy nova.
  - **Como decidimos:** olhando como Catarse e Experiment (referências do projeto) tratam encerramento de campanha — nenhuma das duas dá a um admin um botão de "encerrar na marra" sem justificativa, exatamente porque tem dinheiro de apoiador envolvido e isso precisa ser auditável. O projeto já tem o fluxo certo (`solicitacao_encerramento` + `historico_rejeicao`, com justificativa registrada); criar um atalho paralelo enfraqueceria esse rastro sem necessidade real.
  - **O que foi feito:** `campanha_encerrar` foi removida de `07_seed_dados.sql` (do `INSERT INTO permissao` e do `INSERT INTO papel_permissao` que a dava ao admin). Como a permissão nunca era checada em nenhuma policy, essa remoção não muda nenhum comportamento do sistema hoje — só elimina uma permissão morta.
  - **O que isso significa daqui pra frente:** encerrar uma campanha antes do prazo natural só é possível pelo caminho formal (`solicitacao_encerramento_decidir`). Não existe (e nunca existiu de fato) um atalho direto de admin.

📄 Detalhamento técnico completo: `DOCUMENTACAO_BD.md`, seção `[04-E]` (nota "Permissão `campanha_encerrar` removida") e seção `[07-B-2]`.


---


## 🟠 `tipo_link` com só 5 de 7 tipos seedados — **[PARCIALMENTE RESOLVIDO / REABERTO]**

Revisando de novo, o comentário do próprio seed (`07_seed_dados.sql`, linha 183: *"tipo_link ajustado para a allowlist fechada definida pela equipe"*) deixa claro que isso não é uma pendência: os 5 tipos atuais (Lattes, ORCID, ResearchGate, LinkedIn, GitHub) são uma lista fechada intencional, todos com `regex`/`dominio` validáveis.

"Site Institucional" e "Outro" não têm domínio fixo pra validar, então não encaixam nesse modelo — não são "2 tipos que faltam seedar", são 2 tipos que foram deliberadamente deixados de fora.

> Atualização (27-07-2026): esse fechamento foi feito com evidência incompleta — verificou quais tipos foram seedados, mas nunca olhou as 3 colunas de escopo (`permite_perfil`/`permite_atualizacao`/`permite_recompensa`), que ficam todas no valor padrão pros 5 tipos seedados e por isso derrubam duas tabelas inteiras (ver item 15 da Lista C, mais acima: `link_atualizacao`/`link_recompensa` impossíveis de usar). E a Etapa 3 dos `.docx` (RF-014) parece listar os 7 tipos com comportamento próprio pro "Outro" — o que contradiz a "decisão fechada" registrada aqui. **Reaberto** até vocês dois confirmarem qual foi a decisão de verdade — ver item 19(e) da Lista C.


---


## 🟢 3 índices redundantes em `02_indices.sql` — **[CORRIGIDO]**

*(Esta seção é pra quem escreveu a parte de índices entender exatamente o que mudou e por quê — nada foi apagado por "achismo", é uma consequência mecânica de como o Postgres já lida com `UNIQUE`.)*

Removidos: `idx_seguir_pesquisador_usuario`, `idx_score_pesq_usuario`, `idx_aceite_termo_contribuicao_contribuicao`.

**O que é um índice, rapidinho:** um índice é uma estrutura auxiliar que o banco mantém pra achar linhas rápido sem varrer a tabela inteira — tipo o índice remissivo de um livro. Toda vez que você cria uma `UNIQUE (coluna_A, coluna_B)`, o Postgres **cria um índice sozinho, automaticamente**, por baixo dos panos, pra conseguir garantir essa unicidade. Esse índice automático já vem ordenado primeiro por `coluna_A`, depois por `coluna_B` — igual uma lista telefônica ordenada por sobrenome e, dentro do mesmo sobrenome, por nome.

**Por que um `CREATE INDEX` extra pode ser inútil:** se alguém cria manualmente um `CREATE INDEX` só em `coluna_A` (a primeira coluna do `UNIQUE`), esse índice novo não ajuda em nada — o automático já cobre essa busca. Só cria dois problemas: espaço em disco desperdiçado, e todo `INSERT`/`UPDATE`/`DELETE` fica um pouco mais lento (o Postgres precisa atualizar TODOS os índices a cada mudança, inclusive o inútil).

Isso só deixa de ser verdade se a busca for pela **segunda coluna sozinha** — aí sim um índice dedicado faz sentido. Esse padrão já era seguido em outros lugares do arquivo (ex.: `seguir_campanha` só tem índice em `id_campanha`, nunca em `id_usuario`) — só ficaram 3 pontos fora dele.

**Os 3 casos:**

1. **`idx_seguir_pesquisador_usuario`** — `seguir_pesquisador` já tem `UNIQUE (id_usuario, id_pesquisador)` (`01`, linha 187). Como `id_usuario` é a 1ª coluna, o índice era 100% duplicado. (O índice na 2ª coluna, `idx_seguir_pesquisador_alvo`, continua existindo — mas ver a atualização abaixo: "necessário" foi otimista demais.)

> Atualização (27-07-2026): a remoção dos 3 continua certa, mas a frase "esse sim é necessário" sobre `idx_seguir_pesquisador_alvo` não é — `pol_seg_pesq_select` (`04`) só libera `SELECT` onde `id_usuario = id_usuario_atual()` (cada um só vê as próprias linhas de "quem eu sigo"). Isso significa que a busca por `id_pesquisador` (quem segue um pesquisador X) que esse índice acelera não pode ser feita por ninguém — nem o próprio pesquisador, nem o Administrador. Ver item 18 da Lista C, mais acima: o índice só volta a fazer sentido se vocês decidirem liberar contagem de seguidores.

2. **`idx_aceite_termo_contribuicao_contribuicao`** — a tabela tem `UNIQUE (id_contribuicao)` sozinha (`01`, linha 466). O índice automático já era *idêntico* ao manual — clone puro.

3. **`idx_score_pesq_usuario`** — `score_pesquisador` tem `UNIQUE (id_usuario, id_score_config)` (`01`, linha 505-506). Mesmo raciocínio: `id_usuario` é a 1ª coluna, índice redundante.
   - *Detalhe a mais pra esse:* se no futuro o sistema precisar buscar só por `id_score_config`, aí sim valeria um índice novo — mas nessa coluna, não em `id_usuario`. Não foi feito agora porque depende de saber que consulta o motor de score vai realmente fazer — é otimização futura, não correção.

**Prova de que nada quebrou:**
- Nenhuma tabela, coluna, `UNIQUE` ou `PRIMARY KEY` foi tocada — só as 3 linhas de `CREATE INDEX` extras foram apagadas.
- Contagem de índices no arquivo: era 39, agora é 36.
- `git diff` mostra só essas 3 linhas removidas mais o número no cabeçalho.
- Qualquer consulta que antes usava esses 3 índices continua funcionando igual — só passa a usar o índice automático do `UNIQUE`, que já fazia o mesmo trabalho.


---


## 🟢 Bagunça de nomes de arquivo em 05/06/07/08 — **[CORRIGIDO]**

Comentários internos de `05_regras_negocio.sql`, `06_grants.sql`, `07_seed_dados.sql` e `08_trigger_signup_usuario.sql` citavam nomes de arquivo que não existem no disco (`05_grants.sql`, `06_score_engine_triggers.sql`, `06b_regras_negocio.sql`).

Alguém (provavelmente outra sessão de IA) parece ter cogitado inverter a ordem de execução — rodar os GRANTs antes do motor de score/triggers — e atualizou só os comentários dos 4 arquivos pra refletir essa ideia nova, sem nunca renomear os arquivos de fato nem terminar a mudança. As pistas exatas:

- `05_regras_negocio.sql` (linha 2) se autodenominava "06b: MOTOR DE SCORE...", dizia depender de `05_grants.sql` e que o próximo era `06_grants.sql`.
- `06_grants.sql` (linha 2) se autodenominava "05: GRANTS", dizia que o próximo era `06_score_engine_triggers.sql`.
- `07_seed_dados.sql` citava "06b_regras_negocio.sql".
- `08_trigger_signup_usuario.sql` citava "05_grants.sql".

Nenhum desses nomes existe no disco. Testei tecnicamente se a inversão sugerida pelos comentários funcionaria: **não funciona**. `06_grants.sql` faz `GRANT EXECUTE` em funções que só existem depois que `05_regras_negocio.sql` roda e as cria — se os GRANTs rodassem antes, essas linhas dariam erro de "função não existe". Confirmei também que `05_regras_negocio.sql` não tem nenhuma referência a `app_nestjs` ou `GRANT` — não precisa dos grants pra rodar.

**Conclusão: a ordem real no disco (`05_regras_negocio` → `06_grants`) está certa e não deve mudar.** Os comentários dentro dos 4 arquivos já foram higienizados — cada cabeçalho hoje se autoidentifica com o nome de arquivo correto.


---


## 🟢 Aspas inconsistentes em nomes de policy — **[RESOLVIDO]**

Nomes de policy com aspas inconsistentes em `04_rls_policies.sql`: `"pol_score_config_select"` e `"pol_score_rotulo_select"` usavam aspas duplas, diferente das outras ~103 policies. Já padronizado — confirmado que não sobra nenhuma policy com aspas no arquivo.


---


## 🟢 Reorganização de comentários (`01` a `08`) — **[CONCLUÍDO]**

Todos os 8 arquivos já foram migrados para o `DOCUMENTACAO_BD.md` (blocos `[NN-Y]`/`[NN-Y-N]`), com prova mecânica de que nenhuma linha de SQL foi alterada no processo em nenhum deles. `05` e `08` também ganharam docstring padronizada (Função/Assinatura/Bloco/Regra) em cada função/trigger.


---


## 🟢 Autor podia reverter a própria moderação em `comentario` — **[RESOLVIDO]**

**O problema, em termos simples:** um comentário pode ser "desligado" (coluna `ativo` vira `FALSE`) quando a moderação decide ocultá-lo — por exemplo, um comentário ofensivo. O problema: a regra que permite ao **autor do comentário** editar o próprio comentário (`pol_comentario_update`, em `04_rls_policies.sql`) não tinha como saber *qual campo* estava sendo alterado — ela só sabia dizer "esse usuário pode mexer nessa linha", sem distinguir "mexer no texto" de "mexer no `ativo`". Isso é uma limitação de como o RLS (Row Level Security) do Postgres funciona, não um erro de digitação.

Na prática, isso significava que o próprio autor de um comentário ocultado por moderação podia rodar um comando tipo `UPDATE comentario SET ativo = TRUE WHERE id_comentario = 42` e reverter a moderação sozinho — a moderação virava decorativa.

**Por que precisava de uma trigger, e não dava pra resolver só na policy:** o RLS do Postgres decide **antes** da alteração acontecer, olhando só "quem está mexendo" — ele não compara automaticamente o valor antigo (`OLD`) com o valor novo (`NEW`) coluna por coluna. Pra bloquear uma mudança **específica de uma coluna só**, é preciso uma trigger, que compara `OLD.ativo` com `NEW.ativo` antes de aceitar.

**O que foi criado** — em `05_regras_negocio.sql`, bloco `[05-K-3]`:

```sql
CREATE OR REPLACE FUNCTION fn_bloqueia_reversao_moderacao_comentario()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.ativo = FALSE AND NEW.ativo = TRUE AND NOT public.tem_permissao('comentario_moderar') THEN
        RAISE EXCEPTION 'Operação bloqueada: só a moderação pode reverter um comentário ocultado.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comentario_bloqueia_reversao_moderacao ON comentario;
CREATE TRIGGER trg_comentario_bloqueia_reversao_moderacao
BEFORE UPDATE ON comentario
FOR EACH ROW
EXECUTE FUNCTION fn_bloqueia_reversao_moderacao_comentario();
```

A regra é **cirúrgica**: só entra em ação exatamente na transição `ativo` de `FALSE` para `TRUE` (reverter uma moderação), e só bloqueia quem **não** tem a permissão `comentario_moderar`.

**O que continua igual (nada mais mudou):**
- O autor continua podendo editar o texto do próprio comentário livremente.
- O autor continua podendo **ocultar** o próprio comentário (`ativo` de `TRUE` para `FALSE`) — isso nunca foi o problema, e continua liberado.
- Um moderador/admin (quem tem `comentario_moderar`) continua podendo reverter uma ocultação normalmente.
- Nenhuma tabela, coluna ou policy foi alterada — só uma função e uma trigger novas foram adicionadas.

**Por que decidimos travar em vez de criar um "recurso" pro autor:** conversamos sobre como plataformas de referência do projeto (Catarse, Experiment) lidam com isso — nenhuma delas dá ao autor um botão de "contestar a moderação" dentro do próprio sistema; qualquer contestação acontece por fora (suporte, e-mail), não como feature codificada. Pra um projeto neste estágio (TCC/MVP), a solução mais simples e defensável é travar a reversão, sem inventar um fluxo de recurso que ninguém pediu ainda.

📄 Detalhamento técnico completo: `DOCUMENTACAO_BD.md`, seção `[04-E-4]` e seção `[05-K-3]`.


---


## 🟠 Trigger não desligada sobrescrevia `valor_bruto_arrecadado` do seed — **[MECANICAMENTE CORRIGIDO / DADO AINDA INCONSISTENTE]**

`07_seed_dados.sql` não desligava a trigger `trg_sincroniza_arrecadado_campanha` ao inserir o histórico de `contribuicao` — ela recalculava e sobrescrevia os valores de `valor_bruto_arrecadado` digitados a mão no seed (ex.: campanha 1 caía de 52.300 pra 7.300).

Já corrigido: a trigger agora é desligada/religada junto das outras duas do mesmo bloco `[07-H-1]`.

> Atualização (27-07-2026) — o círculo virou 🟠 porque a correção acima é real e continua certa (a trigger de fato fica desligada durante a carga do seed, isso foi verificado), mas ela só escondeu o sintoma, não resolveu a causa. Confirmado com uma prova concreta: os números que o seed grava em `valor_bruto_arrecadado` não batem com a soma real das `contribuicao` seedadas — não é diferença pequena, é ordem de grandeza:
>
> | Campanha | `valor_bruto_arrecadado` gravado | Soma real das contribuições seedadas |
> |---|---|---|
> | 1 | 52.300,00 | 7.300,00 |
> | 2 | 28.500,00 | 1.500,00 |
> | 3 | 40.000,00 | 8.000,00 |
> | 4 | 8.000,00 | 0,00 |
> | 5 | 22.000,00 | 2.200,00 |
> | 7 | 45.000,00 | 500,00 |
>
> O motivo é que o seed cadastra só um punhado de contribuições de exemplo (pra cumprir o "mínimo 7 registros"), mas os totais das campanhas foram digitados como se fossem valores realistas e completos, sem os dois baterem entre si. Isso não é cosmético: a primeira vez que uma contribuição de verdade for confirmada numa dessas campanhas (mesmo que seja só um teste de R$ 100 no front), `trg_sincroniza_arrecadado_campanha` acorda, recalcula a partir da soma real e o valor "bonito" do seed desaparece de uma vez, sem erro, sem aviso — só um número bem menor aparecendo do nada. É exatamente o tipo de coisa que consome uma tarde de depuração porque ninguém desconfia do seed.
>
> **Ainda não corrigido.** Fica pendente decidir entre duas saídas: adicionar contribuições suficientes pra somar os totais de verdade (mais trabalho, mas exercita os fluxos reais e dá massa de dados mais realista pro front), ou baixar os totais das campanhas pra bater com as contribuições que já existem (mais rápido). Depois disso, o `DISABLE TRIGGER` do `[07-H-1]` pode continuar existindo por segurança, mas vira redundante em vez de ser a única coisa segurando uma inconsistência. Ver também a pendência 4 (linha duplicada em `repasse`), que é o mesmo problema visto por outro ângulo.


---


## 🟢 `ALTER TABLE` morto que nunca executava (`01`, tabela `score_pesquisador`) — **[CORRIGIDO]**

Auditoria física de `01_extensoes_enums_tabelas.sql` encontrou um bloco de código que nunca fazia nada:

```sql
CREATE TABLE score_pesquisador (
    ...
    CONSTRAINT uq_score_pesquisador_usuario_config
        UNIQUE (id_usuario, id_score_config)   -- já cria a constraint aqui dentro
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_score_pesquisador_usuario_config') THEN
        ALTER TABLE score_pesquisador ADD CONSTRAINT uq_score_pesquisador_usuario_config UNIQUE (...);
    END IF;
END $$;
```

A constraint já nasce dentro do próprio `CREATE TABLE`, duas linhas acima. O bloco `DO $$...` fica checando "se a constraint não existir, cria" — mas ela **sempre** já existe nesse ponto (acabou de ser criada no comando anterior), então o `IF` nunca é verdadeiro e o `ALTER TABLE` nunca chega a rodar. Parece sobra de uma versão antiga do arquivo, de antes de a constraint virar inline.

**O que foi feito:** o bloco `DO $$...` inteiro (11 linhas) foi removido. A constraint continua existindo exatamente igual, só que agora sem o código morto por baixo. Zero mudança de comportamento — só limpeza.


---


## 🟢 Índice morando no arquivo errado (`ux_recuperacao_senha_ativo_por_usuario`) — **[CORRIGIDO]**

Esse índice parcial ("só 1 token de recuperação de senha ativo por usuário") estava dentro do `01_extensoes_enums_tabelas.sql`, logo depois da `CREATE TABLE recuperacao_senha`. O problema: existem **dois outros índices do mesmo tipo** no projeto (parcial, "só 1 X ativo por vez") — `uq_termos_uso_ativo` e `uq_arquivo_recompensa_principal` — e **os dois moram em `02_indices.sql`**, nunca em `01`. Esse era o único fora desse padrão.

**O que foi feito:** o índice foi movido de `01_extensoes_enums_tabelas.sql` para `02_indices.sql`, ficando junto dos outros índices de `recuperacao_senha` (`idx_recuperacao_senha_token`, `idx_recuperacao_senha_usuario`), no mesmo lugar onde os outros 2 índices "só 1 ativo" já vivem. Contagem de índices em `02` foi de 36 para 37 (o índice não sumiu, só mudou de arquivo). Nenhuma tabela, coluna ou lógica foi alterada — a tabela `recuperacao_senha` já existe desde o `01`, então o índice continua sendo criado exatamente no mesmo estado do banco, só que 1 arquivo depois.


---


## 🟢 Os 4 `ALTER TABLE` de `01_extensoes_enums_tabelas.sql` foram eliminados — **[CORRIGIDO]**

O arquivo tinha 4 `ALTER TABLE`. 3 deles não tinham motivo técnico real e foram simplesmente juntados de volta no `CREATE TABLE` original: `tipo_link` (3 colunas + `CHECK`), `usuario` (FK da foto de perfil) e `contribuicao` (`token_sessao`).

O 4º — `configuracoes` ganhando a FK de `usuario` via `ALTER` — parecia inevitável à primeira vista: `configuracoes` é letra `C`, `usuario` é letra `D`, e o arquivo mantinha todo o bloco `C` fisicamente antes de todo o bloco `D`. Como `configuracoes.id_usuario` aponta pra `usuario`, que ainda não existia naquele ponto do arquivo, a FK só podia vir depois, via `ALTER TABLE`.

**A solução (sugerida pela Alexia):** mover o `CREATE TABLE configuracoes` fisicamente pra logo depois do `CREATE TABLE usuario` (deixando de ficar fisicamente agrupado com o resto da letra `C`), com um comentário no novo local explicando o motivo:

```sql
-- [01-C] configuracoes — movido de CONFIG devido à ordem de criação
-- necessária para o funcionamento das tabelas: duas linhas do seed de
-- configuracoes referenciam o usuário admin (id_usuario), então esta
-- tabela só pode ser criada depois de `usuario` já existir.
CREATE TABLE configuracoes ( ... FK inline ... );
```

Com isso, a FK nasce direto dentro do `CREATE TABLE`, sem `ALTER` nenhum. `configuracoes` continua marcada como `[01-C]` no comentário (a letra não muda, só a posição física) — no lugar antigo, ficou uma nota de uma linha avisando onde ela foi parar, pra ninguém procurar e não achar.

**Resultado final: zero `ALTER TABLE` no arquivo inteiro.**

**Prova de que nada quebrou:** 39 tabelas, 39 `PK_`, 55 `FK_`, 18 `UK_`, 13 `CK_` — todos os números batem com antes da mudança. Comparei o conjunto completo de colunas do arquivo antes/depois: idêntico. Parênteses balanceados.












# OPNIÃO DO CLAUDE SOBRE NOSSO SISTEMA:

Vou ser direto, porque você pediu opinião real, não elogio.

O sistema está estruturalmente sólido — RBAC bem desenhado, RLS consistente, seed rica, e a documentação que construímos juntos deixa tudo rastreável. Mas revisando o conjunto todo (não peça por peça), tem 3 coisas que eu faria diferente, e elas vêm exatamente dos 3 documentos que você citou.

1. RLS como "defesa em profundidade" está custando caro pra dois devs não-programadores.

O próprio PLANO_AUTENTICACAO_PROPRIA.md (seção 4.1) já avisava isso na época: "Estritamente, [manter RLS] não é necessário", já que o NestJS é o único client do banco — a recomendação foi manter mesmo assim, como camada extra. Isso significa que toda regra de autorização precisa ser escrita duas vezes: uma vez em policy SQL, outra vez em guard/service do NestJS (o próprio RBAC-pontos-discutidos.md, seção 2.3, já previa isso). Hoje isso já é ~105 policies + 24 triggers só de regra — pra duas pessoas mantendo sozinhas, esse é o tipo de coisa que droga com o tempo (uma trava muda na aplicação e ninguém lembra de espelhar no banco, ou vice-versa). Não é errado ter feito assim, é uma escolha de segurança válida — só que é bom vocês saberem que estão pagando esse preço conscientemente, não de graça.

2. Toda vez que apareceu uma regra "só essa coluna, não a linha toda", a solução foi outra trigger nova.

Reparei nisso revisando hoje: RLS não sabe distinguir coluna, só linha — então toda vez que precisou (campanha_aprovar vs campanha_editar, e agora o comentario/ativo que resolvemos), a saída foi escrever mais uma trigger comparando OLD/NEW. Isso é um padrão que vai se repetir conforme o sistema cresce — é bom já esperar que vão aparecer mais casos desses, não é uma coisa pontual que já acabou.

3. O motor de score é desproporcionalmente grande pra um MVP de TCC.

05_regras_negocio.sql sozinho tem 28 funções/24 triggers — e uma fatia enorme disso é o motor de pontuação (4 dimensões, pesos configuráveis, recálculo em cascata). É bem construído, mas se eu estivesse desenhando do zero pra uma banca de TCC, eu teria começado com um score bem mais simples (ou até só um número editável manualmente) e sofisticado depois, em vez de já nascer com esse nível de engenharia. Não é "não devia existir" — é mais "talvez tenha vindo cedo demais, antes de o resto do produto (front, fluxo de contribuição de verdade) existir".

O que eu realmente cortaria, se pudesse: nada do que já existe é lixo ou redundante hoje — a campanha_encerrar que removemos era exatamente esse tipo de coisa, e já foi. O que eu adicionaria, isso sim, é algum teste automatizado (mesmo que simples, tipo um script que insere dado de teste e confere se a RLS bloqueia o que deveria bloquear). Quase todo bug que achamos nessas últimas sessões (trigger não desligada, comentario revertendo moderação, índices redundantes) só apareceu porque eu vasculhei manualmente — nada no projeto teria pego isso sozinho antes de ir pra produção.

> sugestão do CLAUDE : Sobre o Playwright: ele testa o que aparece na tela (clica em botão, preenche formulário, confere texto) — ele nunca fala com o Postgres diretamente. Ele é perfeito pra testar o React+NestJS depois que existirem, mas não cobre nada do .sql (RLS, triggers, constraints). Pra isso, o equivalente seria *** pgTAP *** (framework de teste que roda dentro do próprio Postgres) ou testes de integração no NestJS que sobem um banco de teste real e conferem se a RLS bloqueia o que deveria. São duas camadas de teste diferentes — vocês vão precisar das duas eventualmente, mas por enquanto nenhuma existe.

> Segunda opinião (27-07-2026) sobre a frase "nada do que já existe é lixo ou redundante hoje": não concordo mais, e a lista é concreta — `link_atualizacao`/`link_recompensa` inalcançáveis, a coluna `suspenso` que ninguém lia, os 21 `GRANT DELETE` que nunca funcionavam, os pesos `volume_denuncias`/`gravidade_denuncias` que nenhuma função consultava, e as permissões órfãs. A maior parte disso já foi corrigida (ver Lista A, mais acima) — mas a frase original estava errada quando foi escrita, não é crítica ao trabalho em si, é sobre o método: ler arquivo por arquivo com cuidado não é a mesma coisa que executar. E a sugestão de pgTAP acabou de se provar sozinha: os 3 erros de execução do item 21 (mais acima) estavam esperando o tempo todo — um teste que só rodasse os 8 arquivos numa base limpa e checasse o código de saída já teria pego os três, sem precisar de nenhuma revisão manual.