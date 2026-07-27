#### Pendências reais do sistema

*(Atualizado após a reorganização + revisão completa de `01` a `08` com o Claude)*

*(Reorganizado em 26/07/2026: pendências reais no topo, resolvidas/corrigidas no final — pra facilitar achar rápido o que ainda precisa de decisão)*

---
---

# 🔴 PENDÊNCIAS (ainda em aberto — precisam de decisão)


## No `.sql`


### 1. Senha placeholder

Senha placeholder `'TROCAR_NO_AMBIENTE_REAL'` na criação da role `app_nestjs` em `01_extensoes_enums_tabelas.sql`. Só é risco fora do ambiente local — lembrar de trocar quando for pra produção.

> Sugestão do *** CLAUDE ***: não mexeria no `.sql` em si — o placeholder faz sentido continuar aí pro ambiente local. O que eu faria é transformar isso num passo obrigatório de checklist de deploy (já existe um rascunho disso no `tutorial-rodar-projeto.md`, na parte de "troque a senha"): a senha de produção não devia nunca ficar em nenhum arquivo versionado, nem provisória — o ideal é gerar ela automaticamente (`openssl rand` ou equivalente) no momento do deploy e guardar só num gerenciador de segredos (variável de ambiente do provedor de hospedagem, nunca num `.env` versionado no Git). Isso se resolve sozinho quando chegar a hora de colocar em produção — não precisa de decisão de equipe agora, só não esquecer depois.


### 2. Debate `tipo_link` / `contexto_link`

Debate sobre criar 2 tabelas novas (`tipo_link` e `contexto_link` reformulados) — **adiado, não mexer sem pedir**. Assunto que você e sua parceira ainda estão discutindo sobre como modelar.

> Sugestão do *** CLAUDE ***: olhando Catarse e Experiment, os dois têm um conjunto de contextos de link bem pequeno e estável (perfil do criador, página do projeto, atualizações) — não é algo que cresce toda hora na prática. Isso favorece o modelo atual (3 flags booleanas: `permite_perfil`, `permite_atualizacao`, `permite_recompensa`), que é mais simples de ler e de mexer no dia a dia. Eu só migraria pra uma tabela `contexto_link` dinâmica (como o `RBAC-pontos-discutidos.md`, seção 6.5, já esboça) se vocês já tiverem um plano concreto de adicionar um 4º ou 5º contexto em breve (ex.: link em denúncia, em perfil de instituição) — sem esse plano concreto, a complexidade extra da tabela nova não se paga ainda. Minha recomendação: manter como está por enquanto, e só revisitar quando um novo contexto for realmente necessário (não antes, por precaução).


### 3. `score_minimo_campanha` seedado mas nunca aplicado

`07_seed_dados.sql` (linha 269-270) cadastra a configuração `score_minimo_campanha = 25.00` ("Score mínimo para criar campanha"), com um comentário explícito no próprio arquivo:

> `-- TODO (pendente decisão da equipe): regra de score mínimo para campanha ainda não confirmada; manter sem trigger por enquanto.`

Conferido em `05_regras_negocio.sql`: não existe nenhuma trigger que leia essa configuração — ou seja, hoje um pesquisador com score 0 pode criar campanha normalmente, a regra existe só "no papel". Não é bug (o próprio comentário já avisa que é proposital, aguardando decisão), mas é uma pendência real de negócio: **vocês querem mesmo essa trava?**

Se sim, é uma trigger pequena em `05` (tipo `trg_campanha_limite_simultaneo`, mas checando score em vez de contagem) que bloqueia `INSERT` em `campanha` se `perfil_pesquisador.score_atual < config_numero('score_minimo_campanha', ...)`.

> Sugestão do *** CLAUDE ***: nem Catarse nem Experiment bloqueiam a criação de campanha por um "score de reputação" acumulado na plataforma — os dois confiam na aprovação manual de um curador/admin (que este projeto já tem, via `status = 'aguardando_aprovacao'`) como o filtro de confiança real, não em histórico de uso do sistema. Faz sentido: um pesquisador cadastrado ontem, com score 0, pode ser totalmente legítimo (é só novo na plataforma) — travar ele automaticamente prejudicaria exatamente quem uma plataforma de crowdfunding científico mais precisa atrair, que são pesquisadores novos por ali. Minha recomendação: - não implementar a trigger de bloqueio automático -. Em vez disso, usar `score_minimo_campanha` só como um - sinal de apoio pra revisão manual - — por exemplo, o painel do admin pode destacar/sinalizar campanhas de pesquisadores com score abaixo do mínimo pra receberem uma revisão mais cuidadosa antes de aprovar, sem bloquear ninguém de forma automática e definitiva.


### 4. Possível linha duplicada em `repasse` (campanha 2)

`07_seed_dados.sql` (`[07-E-4]`, linhas ~403 e ~408) tem duas linhas de repasse para a mesma campanha (`id_campanha = 2`), ambas com o mesmo `valor_bruto` (28.500,00):
- uma `'concluido'` com `valor_liquido = 27.075,00` (28.500 × 0,95, a conta normal de repasse com taxa de 5%);
- outra `'parcial_processando'` com `valor_liquido = 0,00` e `repassado_em = NULL`.

A campanha é `modelo = 'flexivel'` (repasse abaixo da meta é esperado e correto nesse modelo, isso **não** é o problema) — a dúvida é por que existem **duas** linhas de repasse pro mesmo valor bruto, uma já concluída e outra "em processamento" com valor zerado.

Pode ser um resquício de teste/copy-paste no seed, ou pode representar um cenário proposital (ex.: tentativa de repasse que falhou e foi reprocessada). Não mexi em nada, só sinalizando pra nós decidirmos se é lixo de seed pra remover ou um cenário de teste válido pra manter (e, nesse caso, talvez valha um comentário explicando a intenção).

> Sugestão do *** CLAUDE ***: olhando os dois valores, isso não parece um cenário real intencional — se fosse um segundo repasse de verdade (ex.: mais dinheiro arrecadado depois do primeiro repasse), o `valor_bruto` da segunda linha seria diferente (incremental), não idêntico ao da primeira. Minha recomendação: remover a linha `'parcial_processando'` duplicada e manter só a `'concluido'`, que é a que reflete corretamente uma campanha `flexivel` já finalizada. Se no futuro vocês quiserem um exemplo de seed mostrando "uma tentativa de repasse que falhou e foi reprocessada" (um cenário de teste legítimo), eu recriaria isso com valores e datas claramente diferentes entre as duas linhas, mais um comentário explicando a intenção — do jeito que está hoje, sem essa diferença, é fácil confundir com lixo de teste.

---








## Só resolve em código Nest/React (ainda não existem)


- 5. Contexto de sessão por requisição

`SET LOCAL app.id_usuario_atual` por requisição (dentro de uma transação, usando um `Client` específico da pool).

> Sugestão do *** CLAUDE ***: implementar como um interceptor/middleware global do NestJS (não espalhado controller por controller) — assim fica impossível esquecer o `SET LOCAL` numa rota nova que alguém criar depois. Vale também um teste de integração simples que tenta acessar dado de outro usuário sem esse `SET LOCAL` e confirma que a RLS realmente bloqueia.


-  6. Fluxo de autenticação completo

Signup, login, verificação de e-mail, recuperação de senha, refresh token.

> Sugestão do *** CLAUDE ***: os prazos que já estão documentados no `01` (token de recuperação de senha com expiração de 15-30 min, ver comentário da tabela) já batem com o padrão que plataformas como Catarse/Experiment usam pra esse tipo de fluxo — não mudaria nada aí. Um reforço que vale considerar: rate-limit de tentativa de login (mesmo simples, tipo "5 tentativas por IP a cada 15 min") é algo que sistemas de referência têm e que ainda não está no escopo — vale colocar na lista quando for implementar.


- 7. Guards/interceptors no NestJS

Espelhando `tem_permissao()` do banco no lado da aplicação.

> Sugestão do *** CLAUDE ***: pra não correr o risco de as duas camadas (banco e NestJS) divergirem com o tempo, eu geraria a lista de permissões que o guard do NestJS reconhece - a partir da própria tabela `permissao` - (uma consulta na subida da aplicação, ou um script que gera uma constante/enum automaticamente), em vez de digitar a lista de novo à mão no código do backend. Assim, toda permissão nova só precisa ser criada uma vez, no banco.


- 8. Conexão sempre como `app_nestjs`

Garantir que a conexão do backend use sempre `app_nestjs`, nunca superusuário (senão a RLS é ignorada silenciosamente).

> Sugestão do *** CLAUDE ***: um health-check simples na subida do NestJS (`SELECT current_user`) que impede a aplicação de subir se a conexão não for exatamente `app_nestjs` — evita o erro silencioso de rodar com superusuário sem ninguém perceber, o que faria a RLS inteira parecer que "funciona" em teste mas não proteger nada de verdade.


- 9. Validação de escrevibilidade financeira

`auditoria_financeira` e `repasse` têm policies de escrita `USING (true)` — a RLS não valida quem grava aí, fica 100% a cargo do serviço do NestJS.

> Sugestão do *** CLAUDE ***: seguindo o padrão de qualquer plataforma de pagamento séria (inclusive Catarse/Experiment, que também dependem de gateway externo pra processar pagamento), eu isolaria a escrita em `auditoria_financeira`/`repasse` dentro de um único serviço interno do NestJS, chamado só pelo webhook do gateway de pagamento — nunca exposto como um endpoint CRUD genérico que outra parte do app possa chamar por engano.


---


## Decisões que precisamos tomar, não bugs


- 10. React em JavaScript ou TypeScript

> Sugestão do *** CLAUDE ***: TypeScript. O NestJS já é TypeScript por padrão — manter o front em JavaScript puro cria uma costura inconsistente entre as duas pontas, e vocês perdem a chance de compartilhar tipos entre back e front (ex.: o formato de uma campanha, de uma contribuição). Pra quem ainda está aprendendo, o TypeScript pega em tempo de compilação exatamente o tipo de erro bobo (nome de campo errado, tipo trocado) que sem ele só aparece rodando o app — é uma rede de segurança a mais, não só "código chato de escrever a mais".


- 11. Pool direto no Service

Só nota de melhoria futura, não urgente.

> Sugestão do *** CLAUDE ***: usar o padrão de injeção de dependência do próprio NestJS — registrar o `Pool` do `pg` como um provider único do módulo e injetar ele nos services, em vez de cada service criar sua própria instância de `Pool`. É o jeito idiomático do framework e evita vazamento de conexão (vários pools abertos sem necessidade).


---
---
---
---
---


# ✅ RESOLVIDAS / CORRIGIDAS

*(Já aplicado no `.sql` — só ficam aqui pra registro e explicação, não precisa fazer mais nada)*


## Permissão `campanha_encerrar` sem policy de RLS — **[RESOLVIDO]**

Decidido **remover** a permissão (era órfã, nunca usada por nenhuma policy) em vez de implementar um atalho de encerramento direto.

**5 permissões sem policy de RLS que motivaram essa revisão:** `campanha_encerrar`, `perfil_pesquisador_visualizar_sensivel`, `sessao_revogar`, `recuperacao_senha_revogar`, `verificacao_email_reenviar`.

Pergunta original: dava pra mandar a IA do VSCode "consertar" isso de uma vez? Não é tão simples quanto parece — não é "esqueceu de escrever a policy", é que ninguém tinha decidido ainda o que cada permissão deveria liberar. Mandar a IA "consertar" sem isso é arriscado: ela teria que adivinhar a regra, e podia acertar errado.

Separando as 5:

- **`sessao_revogar`, `recuperacao_senha_revogar`, `verificacao_email_reenviar`** — essas 3 tabelas já têm policy `FOR ALL USING (true)` de propósito (o próprio projeto decidiu que a autorização desses fluxos fica no NestJS, não na RLS, porque acontecem antes do login existir). Criar uma policy pra essas permissões seria redundante — não muda nada. Não vale a pena mexer.

- **`perfil_pesquisador_visualizar_sensivel`** — já está resolvida: o `cpf_criptografado` já foi excluído do `GRANT SELECT` geral (`06_grants.sql`, bloco `[06-D-1]` — a coluna não aparece na lista explícita de colunas liberadas para `app_nestjs`). Criar uma policy de RLS pra isso não encaixa bem (é proteção de coluna, não de linha) — mexer aqui de novo é mais risco que benefício.

- **`campanha_encerrar`** — essa era a única em aberto de verdade. Decisão tomada:
  - **Como era:** a permissão existia (`07_seed_dados.sql`, atribuída ao papel `admin`), mas nenhuma policy de RLS a usava — não fazia nada na prática.
  - **As duas opções que estavam na mesa:** (a) ela era redundante com `solicitacao_encerramento_decidir` (que já existe, já funciona, já registra justificativa) — nesse caso, só remover; (b) ela deveria virar um atalho de encerramento direto via `UPDATE`, sem passar pela solicitação formal — nesse caso, precisaria de uma policy nova.
  - **Como decidimos:** olhando como Catarse e Experiment (referências do projeto) tratam encerramento de campanha — nenhuma das duas dá a um admin um botão de "encerrar na marra" sem justificativa, exatamente porque tem dinheiro de apoiador envolvido e isso precisa ser auditável. O projeto já tem o fluxo certo (`solicitacao_encerramento` + `historico_rejeicao`, com justificativa registrada); criar um atalho paralelo enfraqueceria esse rastro sem necessidade real.
  - **O que foi feito:** `campanha_encerrar` foi removida de `07_seed_dados.sql` (do `INSERT INTO permissao` e do `INSERT INTO papel_permissao` que a dava ao admin). Como a permissão nunca era checada em nenhuma policy, essa remoção não muda nenhum comportamento do sistema hoje — só elimina uma permissão morta.
  - **O que isso significa daqui pra frente:** encerrar uma campanha antes do prazo natural só é possível pelo caminho formal (`solicitacao_encerramento_decidir`). Não existe (e nunca existiu de fato) um atalho direto de admin.

📄 Detalhamento técnico completo: `DOCUMENTACAO_BD.md`, seção `[04-E]` (nota "Permissão `campanha_encerrar` removida") e seção `[07-B-2]`.


---


## `tipo_link` com só 5 de 7 tipos seedados — **[RESOLVIDO POR DESIGN]**

Revisando de novo, o comentário do próprio seed (`07_seed_dados.sql`, linha 183: *"tipo_link ajustado para a allowlist fechada definida pela equipe"*) deixa claro que isso não é uma pendência: os 5 tipos atuais (Lattes, ORCID, ResearchGate, LinkedIn, GitHub) são uma lista fechada intencional, todos com `regex`/`dominio` validáveis.

"Site Institucional" e "Outro" não têm domínio fixo pra validar, então não encaixam nesse modelo — não são "2 tipos que faltam seedar", são 2 tipos que foram deliberadamente deixados de fora.

**Não fazer nada aqui**, a não ser que a equipe decida abrir a allowlist.


---


## 3 índices redundantes em `02_indices.sql` — **[CORRIGIDO]**

*(Esta seção é pra quem escreveu a parte de índices entender exatamente o que mudou e por quê — nada foi apagado por "achismo", é uma consequência mecânica de como o Postgres já lida com `UNIQUE`.)*

Removidos: `idx_seguir_pesquisador_usuario`, `idx_score_pesq_usuario`, `idx_aceite_termo_contribuicao_contribuicao`.

**O que é um índice, rapidinho:** um índice é uma estrutura auxiliar que o banco mantém pra achar linhas rápido sem varrer a tabela inteira — tipo o índice remissivo de um livro. Toda vez que você cria uma `UNIQUE (coluna_A, coluna_B)`, o Postgres **cria um índice sozinho, automaticamente**, por baixo dos panos, pra conseguir garantir essa unicidade. Esse índice automático já vem ordenado primeiro por `coluna_A`, depois por `coluna_B` — igual uma lista telefônica ordenada por sobrenome e, dentro do mesmo sobrenome, por nome.

**Por que um `CREATE INDEX` extra pode ser inútil:** se alguém cria manualmente um `CREATE INDEX` só em `coluna_A` (a primeira coluna do `UNIQUE`), esse índice novo não ajuda em nada — o automático já cobre essa busca. Só cria dois problemas: espaço em disco desperdiçado, e todo `INSERT`/`UPDATE`/`DELETE` fica um pouco mais lento (o Postgres precisa atualizar TODOS os índices a cada mudança, inclusive o inútil).

Isso só deixa de ser verdade se a busca for pela **segunda coluna sozinha** — aí sim um índice dedicado faz sentido. Esse padrão já era seguido em outros lugares do arquivo (ex.: `seguir_campanha` só tem índice em `id_campanha`, nunca em `id_usuario`) — só ficaram 3 pontos fora dele.

**Os 3 casos:**

1. **`idx_seguir_pesquisador_usuario`** — `seguir_pesquisador` já tem `UNIQUE (id_usuario, id_pesquisador)` (`01`, linha 187). Como `id_usuario` é a 1ª coluna, o índice era 100% duplicado. (O índice na 2ª coluna, `idx_seguir_pesquisador_alvo`, continua normalmente — esse sim é necessário.)

2. **`idx_aceite_termo_contribuicao_contribuicao`** — a tabela tem `UNIQUE (id_contribuicao)` sozinha (`01`, linha 466). O índice automático já era *idêntico* ao manual — clone puro.

3. **`idx_score_pesq_usuario`** — `score_pesquisador` tem `UNIQUE (id_usuario, id_score_config)` (`01`, linha 505-506). Mesmo raciocínio: `id_usuario` é a 1ª coluna, índice redundante.
   - *Detalhe a mais pra esse:* se no futuro o sistema precisar buscar só por `id_score_config`, aí sim valeria um índice novo — mas nessa coluna, não em `id_usuario`. Não foi feito agora porque depende de saber que consulta o motor de score vai realmente fazer — é otimização futura, não correção.

**Prova de que nada quebrou:**
- Nenhuma tabela, coluna, `UNIQUE` ou `PRIMARY KEY` foi tocada — só as 3 linhas de `CREATE INDEX` extras foram apagadas.
- Contagem de índices no arquivo: era 39, agora é 36.
- `git diff` mostra só essas 3 linhas removidas mais o número no cabeçalho.
- Qualquer consulta que antes usava esses 3 índices continua funcionando igual — só passa a usar o índice automático do `UNIQUE`, que já fazia o mesmo trabalho.


---


## Bagunça de nomes de arquivo em 05/06/07/08 — **[CORRIGIDO]**

Comentários internos de `05_regras_negocio.sql`, `06_grants.sql`, `07_seed_dados.sql` e `08_trigger_signup_usuario.sql` citavam nomes de arquivo que não existem no disco (`05_grants.sql`, `06_score_engine_triggers.sql`, `06b_regras_negocio.sql`).

Alguém (provavelmente outra sessão de IA) parece ter cogitado inverter a ordem de execução — rodar os GRANTs antes do motor de score/triggers — e atualizou só os comentários dos 4 arquivos pra refletir essa ideia nova, sem nunca renomear os arquivos de fato nem terminar a mudança. As pistas exatas:

- `05_regras_negocio.sql` (linha 2) se autodenominava "06b: MOTOR DE SCORE...", dizia depender de `05_grants.sql` e que o próximo era `06_grants.sql`.
- `06_grants.sql` (linha 2) se autodenominava "05: GRANTS", dizia que o próximo era `06_score_engine_triggers.sql`.
- `07_seed_dados.sql` citava "06b_regras_negocio.sql".
- `08_trigger_signup_usuario.sql` citava "05_grants.sql".

Nenhum desses nomes existe no disco. Testei tecnicamente se a inversão sugerida pelos comentários funcionaria: **não funciona**. `06_grants.sql` faz `GRANT EXECUTE` em funções que só existem depois que `05_regras_negocio.sql` roda e as cria — se os GRANTs rodassem antes, essas linhas dariam erro de "função não existe". Confirmei também que `05_regras_negocio.sql` não tem nenhuma referência a `app_nestjs` ou `GRANT` — não precisa dos grants pra rodar.

**Conclusão: a ordem real no disco (`05_regras_negocio` → `06_grants`) está certa e não deve mudar.** Os comentários dentro dos 4 arquivos já foram higienizados — cada cabeçalho hoje se autoidentifica com o nome de arquivo correto.


---


## Aspas inconsistentes em nomes de policy — **[RESOLVIDO]**

Nomes de policy com aspas inconsistentes em `04_rls_policies.sql`: `"pol_score_config_select"` e `"pol_score_rotulo_select"` usavam aspas duplas, diferente das outras ~103 policies. Já padronizado — confirmado que não sobra nenhuma policy com aspas no arquivo.


---


## Reorganização de comentários (`01` a `08`) — **[CONCLUÍDO]**

Todos os 8 arquivos já foram migrados para o `DOCUMENTACAO_BD.md` (blocos `[NN-Y]`/`[NN-Y-N]`), com prova mecânica de que nenhuma linha de SQL foi alterada no processo em nenhum deles. `05` e `08` também ganharam docstring padronizada (Função/Assinatura/Bloco/Regra) em cada função/trigger.


---


## Autor podia reverter a própria moderação em `comentario` — **[RESOLVIDO]**

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


## Trigger não desligada sobrescrevia `valor_bruto_arrecadado` do seed — **[CORRIGIDO]**

`07_seed_dados.sql` não desligava a trigger `trg_sincroniza_arrecadado_campanha` ao inserir o histórico de `contribuicao` — ela recalculava e sobrescrevia os valores de `valor_bruto_arrecadado` digitados a mão no seed (ex.: campanha 1 caía de 52.300 pra 7.300).

Já corrigido: a trigger agora é desligada/religada junto das outras duas do mesmo bloco `[07-H-1]`.


---


## `ALTER TABLE` morto que nunca executava (`01`, tabela `score_pesquisador`) — **[CORRIGIDO]**

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


## Índice morando no arquivo errado (`ux_recuperacao_senha_ativo_por_usuario`) — **[CORRIGIDO]**

Esse índice parcial ("só 1 token de recuperação de senha ativo por usuário") estava dentro do `01_extensoes_enums_tabelas.sql`, logo depois da `CREATE TABLE recuperacao_senha`. O problema: existem **dois outros índices do mesmo tipo** no projeto (parcial, "só 1 X ativo por vez") — `uq_termos_uso_ativo` e `uq_arquivo_recompensa_principal` — e **os dois moram em `02_indices.sql`**, nunca em `01`. Esse era o único fora desse padrão.

**O que foi feito:** o índice foi movido de `01_extensoes_enums_tabelas.sql` para `02_indices.sql`, ficando junto dos outros índices de `recuperacao_senha` (`idx_recuperacao_senha_token`, `idx_recuperacao_senha_usuario`), no mesmo lugar onde os outros 2 índices "só 1 ativo" já vivem. Contagem de índices em `02` foi de 36 para 37 (o índice não sumiu, só mudou de arquivo). Nenhuma tabela, coluna ou lógica foi alterada — a tabela `recuperacao_senha` já existe desde o `01`, então o índice continua sendo criado exatamente no mesmo estado do banco, só que 1 arquivo depois.


---


## Os 4 `ALTER TABLE` de `01_extensoes_enums_tabelas.sql` foram eliminados — **[CORRIGIDO]**

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