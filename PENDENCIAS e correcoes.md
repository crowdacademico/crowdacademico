#### Pendências reais do sistema

*(Atualizado após a reorganização + revisão completa de `01` a `08` com o Claude)*

*(Reorganizado em 26/07/2026: pendências reais no topo, resolvidas/corrigidas no final — pra facilitar achar rápido o que ainda precisa de decisão)*

*(Reorganizado de novo em 28/07/2026: dentro de cada grupo — pendências e resolvidas — os itens continuam agrupados por DATA, mas agora tudo que já foi resolvido foi empurrado bem pro fundo do arquivo, com bastante espaço em branco separando das pendências reais. Única exceção: o que foi resolvido a partir das ideias da Alexia fica logo no topo, antes até das pendências — é a primeira coisa que ela vai ver ao abrir o arquivo.)*

---
---

# ✅ IDEIAS DA ALEXIA JÁ IMPLEMENTADAS

*(Pra ela ver isso primeiro, antes de qualquer pendência. Tudo abaixo já está no `.sql`, testado, sem quebrar nada do que já existia.)*

🟢 **34. Recompensa simbólica — resolve o item 14 da Lista C** — a ideia da Alexia ("nome do doador no projeto") já existia no ENUM `tipo_recompensa` como o valor `reconhecimento`; `acesso_antecipado` é o modelo do próprio Experiment.com, referência declarada do TCC. A objeção original ao domínio inteiro (recompensa física cria obrigação de logística que 2 pessoas não conseguem fiscalizar) morre se `fisica` sair do ENUM — e `outro` era uma porta aberta pra reintroduzir isso pela brecha. **Você decidiu:** remover os dois. **Aplicado:** `tipo_recompensa` (`01`) agora é só `('digital', 'reconhecimento', 'acesso_antecipado')`; feito com a tabela `recompensa` vazia (nenhum dado existente pra migrar) — o momento mais barato possível pra essa mudança, porque o Postgres não tem `ALTER TYPE ... DROP VALUE` (teria que recriar o tipo contra um banco já populado). O `DEFAULT 'outro'` da coluna `tipo` também saiu — nenhum dos 3 valores que sobraram é um "genérico" natural, a aplicação passa a escolher explicitamente. O item 14 da Lista C sai de "remover o domínio inteiro" pra "manter com escopo restrito" — ainda precisa de 2-3 RFs novos na Etapa 3 descrevendo recompensa simbólica, isso fica com vocês dois.

🟢 **35. `area_conhecimento` desce pro 2º nível do CNPq — resolve o pedido da Alexia** — "Ciências da Saúde" cobrindo de odontologia a saúde coletiva era amplo demais pro filtro de busca valer a pena. **Você decidiu:** nível 2 vira obrigatório (campanha não pode mais ficar só na grande área raiz). **Aplicado:** coluna `id_pai` nova em `area_conhecimento` (`01`, mesmo padrão auto-referenciado de `score_config`); ~81 áreas de nível 2 seedadas em `07` (via `SELECT` resolvendo o pai pelo `codigo_cnpq`, não por ID fixo); trigger `trg_campanha_valida_area_nivel2`/`trg_campanha_valida_area_nivel2_update` (`05`, `[05-K-1]`) bloqueando `campanha.id_area_conhecimento` de apontar pra uma grande área raiz. As 10 campanhas do seed foram atualizadas pra apontar pra uma área de nível 2 dentro da mesma grande área que já tinham antes (ex.: campanha 1, antes só "Ciências Exatas", agora "Ciência da Computação"). **Depois disso** (rodada seguinte, mesmo dia): `id_area_conhecimento` virou `NOT NULL` (a trigger bloqueava a grande área raiz mas deixava `NULL` passar, o que era pior — campanha sem área nenhuma some de todo filtro); e o dígito verificador dos 90 `codigo_cnpq` foi removido (`'1.03.00.00'`, não `'1.03.00.00-7'`) depois de provado matematicamente que os dígitos semeados não vinham de nenhum algoritmo real — os nomes e a hierarquia continuam corretos e confiáveis (nomenclatura padrão CNPq), só o dígito (que não protege nada num campo nunca digitado à mão) saiu.

🟢 **42. `tipo_vinculo` — o único ajuste numa ideia da Alexia, sem descartar nada dela** — o `vinculo_institucional NOT NULL` da Alexia implementa exatamente o que ela quis ("perfil não nasce pela metade") — regra certa, mantida. O efeito colateral: impedia a existência de pesquisador **sem** instituição, que é justamente o público que a justificativa da Etapa 1 diz que a plataforma quer alcançar. **Corrigido preservando a regra dela:** ENUM novo `tipo_vinculo` (`'institucional'`, `'independente'`), coluna nova em `perfil_pesquisador` com `DEFAULT 'institucional'`; `vinculo_institucional` voltou a ser nullable, mas amarrado por `CONSTRAINT "CK_PERFIL_VINCULO"`: institucional exige o nome da instituição preenchido (não vazio); independente exige o campo vazio. Nenhum dos dois aceita ambiguidade — continua **proibido** cadastrar sem declarar nada, exatamente a regra da Alexia. Os 11 perfis do seed continuam válidos sem nenhum ajuste (todos ficam `tipo_vinculo = 'institucional'` pelo `DEFAULT`, com instituição preenchida).

> ⚠️ **Ponto de atenção pra Lista C, não pra ignorar:** `calcular_score_perfil_academico` (`05`) dá pontos por `vinculo_institucional` preenchido. Com essa mudança, o pesquisador independente perde esses pontos automaticamente (campo vazio = sem crédito) — isso é decisão de vocês dois e está amarrada ao destino do score (itens 12/13 da Lista C), não deve passar despercebido quando o score for decidido.

*(Ela também sugeriu os motivos de denúncia novos — `CAMP-005` a `CAMP-008` e `PERF-004` — que entraram no catálogo, dado puro sem decisão de negócio nenhuma (ver Tier A, item A5/A6, na seção de resolvidos mais abaixo). Essa mesma adição, por causa de como o seed referenciava o catálogo, acabou expondo um bug real que quebrava o seed inteiro em silêncio — já corrigido, ver item 36 na seção de resolvidos, mais pra baixo.)*

🟢 **43. `denuncia.relato` sem limite de tamanho — a Alexia avisou primeiro, antes até de a coluna existir** — no WhatsApp, ainda discutindo o item 19(b): *"Eu acho que relato como text em denúncia pode dar problema tem que ver depois se dá pra restringir o tamanho"*. Ninguém tinha voltado nisso depois que a coluna foi criada — o Claude Web conferiu de verdade (`char_length` sem limite nenhum) e confirmou que ela estava certa: campo de formulário público, sem limite, é vetor de abuso (o limite de 5 denúncias/24h não impede megabytes de texto POR denúncia). **Corrigido**, junto com os outros campos de texto livre da mesma categoria — ver item 43 completo na seção de resolvidos, mais abaixo.

---
---

# 🔴 PENDÊNCIAS (ainda em aberto — precisam de decisão)


## 🗓️ 30-07-2026

🔴 **59. Score público reabre risco de LGPD (Art. 9) sem mitigação — decisão consciente, mas falta a rede de segurança**

Em 28-07-2026 (item 12/31 da Lista C) o score do pesquisador tinha sido fechado ao público justamente por esse risco: juízo automatizado sobre pessoa identificada, exposto publicamente, sem previsão de contestação. Em 30-07-2026 essa correção foi **revertida por decisão de produto** — o score público vira a base de um segundo app do projeto ("Serasa do Pesquisador"), pensado como sinal de confiança pro doador e pressão social pro pesquisador manter a pontuação em dia (ver `parte 11`, mais abaixo, e `DOCUMENTACAO_BD.md [04-I-3]`). O risco em si **não foi mitigado, só aceito**. Falta, quando vocês tiverem tempo: (a) algum mecanismo de contestação/explicação — nem que seja simples, tipo o pesquisador conseguir ver o detalhamento por dimensão (isso já existe) e abrir uma denúncia/revisão se achar o score injusto; (b) uma linha na política de privacidade/termos de uso documentando a base legal desse tratamento automatizado público, já que hoje `termos_de_uso` não cobre isso. Não é bloqueio pro NestJS — dá pra construir o app de score em cima da policy pública já revertida — mas precisa constar na Etapa 3 como requisito, não só como nota de rodapé no banco.

🔴 **60. `suspender_pesquisador()` não tem função simétrica de reativação**

Ao implementar a cascata do RF-084 (ver `parte 12`, mais abaixo), criei `suspender_pesquisador(p_id_usuario)` (03, `[03-G]`) mas não uma `reativar_pesquisador()`. Ficou de propósito de fora desta rodada — não foi pedido, e reativação levanta uma pergunta própria (campanhas que foram fechadas em `encerrado_moderacao` pela cascata voltam a `ativo` sozinhas, ou o Admin reabre uma por uma?). Sem essa função, hoje uma suspensão é permanente na prática — ninguém tem caminho nenhum pra desfazer, nem o próprio Admin por UPDATE direto (a coluna saiu do GRANT). Decisão de vocês dois: se reativação nunca deve existir (banimento é definitivo, tipo "cartão vermelho" de verdade) tudo bem, mas então vale documentar isso como intencional em vez de deixar parecer esquecido.

## 🗓️ 28-07-2026

🔴 **33. Matriz de rastreabilidade RF × banco — sugerida, não feita**

O CLAUDE identificou esta como "a fala mais importante do WhatsApp inteiro": a Alexia pediu pra "passar as tabelas mais uma vez e ver se cobrem as necessidades, porque vamos ter que iniciar o backend". A Lista C já tem achados soltos disso (colunas faltando do item 19, taxa não carimbada do item 20), mas ninguém fez a varredura completa nos dois sentidos — pegar os 85 RFs da Etapa 3 e marcar, um por um, se o banco sustenta, sustenta parcialmente ou não sustenta.

> Sugestão do *** CLAUDE ***: isso não é uma correção de `.sql`, é um trabalho de auditoria à parte (provavelmente vale um documento próprio, tipo `MATRIZ-RASTREABILIDADE-RF.md`), e sai de lá uma tabela que também serve pra Etapa 3 do TCC. Não fiz agora porque é um esforço de outra natureza (leitura de 85 RFs contra 39 tabelas) e não estava no pedido desta rodada — mas é o que realmente destrava começar o NestJS com confiança de que a base aguenta, ao invés de descobrir no meio do caminho que falta uma coluna.

🔴 **57. Só o `admin` consegue encerrar campanha por moderação (RF-079) — decisão de vocês, não bug**

Achado pelo Claude Web na 6ª auditoria, levantando quem tem as 3 permissões que `trg_campanha_valida_transicao` (`05`) aceita pra qualquer transição de status: `campanha_aprovar`, `campanha_rejeitar` e `solicitacao_encerramento_decidir` — só o papel `'admin'` tem as três. O papel `'moderador'` tem `atualizacao_moderar`, `comentario_moderar` e `denuncia_responder`, nenhuma das três de cima — ou seja, um moderador julga uma denúncia como procedente (a consequência mais séria dela sendo justamente encerrar a campanha denunciada, RF-079) e não consegue agir sobre esse julgamento; precisa pedir pro admin fazer.

> Sugestão do *** CLAUDE WEB ***: pode ser proposital (só admin de fato encerra campanha, moderador só opina/modera conteúdo e denúncia) — nesse caso é só registrar aqui como decisão consciente. Se não for o que vocês querem, o caminho é simples: dar `campanha_rejeitar` ao papel `moderador` (reaproveitando a permissão que já existe), ou criar uma permissão nova e mais específica tipo `campanha_encerrar_moderacao` (mais granular, separa "rejeitar campanha nova" de "encerrar campanha ativa por denúncia procedente" — dois poderes com peso bem diferente). Não mexi em nada — é decisão de vocês dois, não teve nenhuma correção técnica envolvida.

---

## 🗓️ 27-07-2026

🔴 **22. O seed só roda com superusuário ou papel com `BYPASSRLS` — isso nunca foi escrito em lugar nenhum**

`papel`, `permissao` e `papel_permissao` só têm policy de `SELECT` — não existe nenhuma policy de `INSERT`/`UPDATE` pra elas, porque a intenção sempre foi "gestão via seed/migração direta, não pela aplicação" (isso já está documentado no `DOCUMENTACAO_BD.md`, `[06-B]`). *(Correção 27-07-2026: a primeira versão deste item citava `score_config` como mais um exemplo de "tabela só com policy de SELECT" — isso estava errado, e o CLAUDE pegou. `score_config`/`score_rotulo` têm policy de `INSERT` e `UPDATE` de verdade, exigindo a permissão `score_editar` (`04_rls_policies.sql`, `[04-I-1]`/`[04-I-2]`). O motivo pelo qual o seed falha nelas mesmo assim não é "falta de policy" — é o mesmo motivo do parágrafo abaixo: a policy existe, mas é `TO app_nestjs`, e um papel diferente desse simplesmente não casa com ela, tenha ela `INSERT` ou não. Conferido de novo com `grep`: `papel`/`permissao`/`papel_permissao` são os exemplos certos de "só SELECT mesmo".)* O que nunca foi dito explicitamente é que isso torna **obrigatório** rodar `07_seed_dados.sql` como um papel que ignora RLS (superusuário, ou um papel comum com o atributo `BYPASSRLS`) — com as 39 tabelas em `FORCE ROW LEVEL SECURITY`, até o dono de uma tabela fica sujeito às policies dela, e como 89 das 105 policies são `TO app_nestjs` (não `TO public`), um dono qualquer sem `BYPASSRLS` recebe dezenas de erros de `new row violates row-level security policy`.

Isso importa porque o banco vai rodar no Supabase, e lá você executa SQL pelo papel que o próprio Supabase fornece no editor deles — não necessariamente um superusuário local. Se esse papel não tiver `BYPASSRLS`, o seed falha lá do mesmo jeito, mesmo já tendo funcionado na sua máquina. *(Nota 28-07-2026: adicionei uma guarda no início do `01` que detecta isso e aborta com uma mensagem clara — não resolve o item, mas evita as dezenas de erros silenciosos espalhados. Ver item 40 na seção de resolvidos.)*

> Sugestão do *** CLAUDE ***: duas coisas, nenhuma delas é mudar o `.sql`. Primeiro, confirmar no próprio Supabase se o papel usado no SQL Editor deles (geralmente `postgres`) tem `BYPASSRLS` — normalmente tem, mas vale confirmar antes de contar com isso, não depois de um deploy dar errado. Segundo, o `tutorial-rodar-projeto.md` merece uma linha explícita dizendo isso: "o `07` (e qualquer re-execução do seed) precisa rodar como superusuário ou papel com `BYPASSRLS` — nunca como `app_nestjs`".

🔴 **28. O inverso do 27 — `verificacao_email`/`recuperacao_senha`/`sessao` não conseguem `DELETE`, mesmo a policy permitindo** — as 3 têm policy `FOR ALL` (que cobre `DELETE`), mas o `GRANT` (`06`) é só `SELECT, INSERT, UPDATE` — falta `DELETE`. `app_nestjs` nunca consegue apagar sessão expirada ou token já consumido; essas 3 tabelas só crescem. Provavelmente proposital (revogar é só marcar `revogado_em`/`usado_em`, nunca apagar linha) — mas aí a política de retenção de dado precisa estar escrita em algum lugar, porque o RNF-003 fala em guardar dado pessoal só pelo tempo mínimo necessário, e sessão antiga com IP e user-agent é dado pessoal. *(CORRIGIDO em 28-07-2026 — ver item B1 na seção de resolvidos: `DELETE` concedido nas 3, com janela de retenção sugerida.)*

🔴 **32. 15 das 39 tabelas ficam vazias depois do seed** — separando por motivo:
- **Vazias porque o seed quebrava** (já resolvido — ver item 21, na seção de resolvidos): `atualizacao_campanha`, `arquivo_atualizacao`, `auditoria_financeira`.
- **Vazias porque o seed simplesmente não escreve nelas** — *(atualização 28-07-2026: `termos_de_uso`, `usuario_termo`, `aceite_termo_contribuicao` e `notificacao` já foram seedadas, ver itens A5/A6 na seção de resolvidos — deixaram de fazer parte deste problema)*.
- **Vazias por escopo** (Lista C, não mexer): a família `recompensa` e a família `link_atualizacao`/`link_recompensa` *(atualização 28-07-2026: `recompensa` já pode receber dados, ver item 34 no topo do arquivo — falta só a Alexia semear)*, mais as tabelas de runtime de autenticação (normal nascerem vazias).

### Lista C — travado até vocês dois decidirem (nada mexido aqui)

🟠 **12. O motor de score não tem nenhum requisito escrito** *(atualização 28-07-2026: o risco mais sério — exposição pública de LGPD — já foi fechado, ver "🟢 Já corrigido" mais abaixo. O que fica pendente aqui é só escrever os 2-3 RFs novos na Etapa 3 formalizando "score é sinal interno de curadoria, não faz parte do MVP público" — decisão de produto que já foi tomada na prática pela correção técnica, só falta documentar.)*

Procurei "score", "pontuação" e "reputação" nos três `.docx` do TCC (Etapa 1, 2 e 3): zero ocorrências, em nenhum dos três. Não existe RU, RF nem RNF que mencione pontuação ou reputação de pesquisador. Mesmo assim, o banco tem hoje 3 tabelas (`score_config`, `score_rotulo`, `score_pesquisador`), 6 funções de cálculo, 7 triggers de recálculo automático, pesos e 4 rótulos seedados ("Atenção", "Em Construção", "Confiável" e "Referência") e 2 permissões dedicadas. É o maior subsistema do banco sem nenhum requisito por trás — e 5 dos problemas técnicos encontrados na revisão moram exatamente dentro dele. A decisão que precisa ser tomada é anterior a qualquer correção: o score faz parte do MVP ou não?

> Sugestão do *** CLAUDE ***: eu congelaria o motor de score fora do MVP e registraria isso como trabalho futuro, que é uma seção que todo TCC tem e que fica mais forte com código já modelado por trás. Três razões: primeiro, nem o Experiment.com nem a Catarse têm score público de reputação de criador — os dois resolvem confiança por curadoria humana, que o CrowdAcadêmico já tem via `aguardando_aprovacao` e os RF-068/RF-069, então o score é uma terceira camada resolvendo um problema que a curadoria já resolve. Segundo, um score público é um juízo automatizado sobre uma pessoa identificada, exibido publicamente (`pol_score_select` é `USING (TRUE)`), sem nenhuma previsão de contestação pelo pesquisador — num trabalho que tem o RNF-003 sobre LGPD, isso é uma pergunta desconfortável de banca. Terceiro, e mais prático: congelar o score resolve de uma vez os problemas 13 desta lista, sem precisar decidir nada sobre cada um deles separadamente. A alternativa, se vocês quiserem manter, é torná-lo interno: visível só no painel do Administrador como sinal de apoio à curadoria manual, nunca na página pública — isso já elimina a exposição de LGPD e exige escrever só 2 ou 3 RFs novos na Etapa 3.

> Segunda opinião (28-07-2026), depois de ver o teste de 4 faixas da Alexia rodando de ponta a ponta: prefiro claramente a segunda opção agora — tornar interno, não congelar. Congelar jogaria fora um subsistema já funcionando e testado (o melhor trabalho dela nessa área). Tornar interno preserva 100% do motor, elimina a exposição de LGPD (a objeção mais séria), e como o item 3 já decide que o score nunca bloqueia nada automaticamente, o Art. 20 da LGPD (revisão de decisão automatizada) nem chega a ser acionado — a decisão continua sendo do Administrador, o score só ordena a fila de revisão. **Implementado** (ver "🟢 Já corrigido" mais abaixo) — o que falta agora é só a formalização em RF.

🟢 **13. Quatro regras do score que precisam de decisão, caso ele fique — TODAS RESOLVIDAS (28-07-2026)**

Se a decisão do item 12 for manter o score, estes quatro pontos precisavam ser resolvidos antes de mexer em qualquer função de cálculo. Nenhum era bug: eram escolhas de regra que estavam implementadas de um jeito que talvez não fosse o que vocês queriam. (a) 🟢 Denúncia improcedente penaliza igual — a função `calcular_score_reputacao` contava todas as denúncias contra o pesquisador, inclusive as que a moderação julgou `improcedente`, o que contradizia o RF-077, que define improcedente como "denúncia descartada após análise". *(Corrigido — conformidade com RF-077, não decisão de negócio, ver resolvidos.)* (b) 🟢 Campanha rejeitada punia duas vezes — a rejeição derrubava a taxa de aprovação e ainda entrava no denominador da taxa de conclusão. *(Corrigido — erro aritmético, ver resolvidos.)* (c) 🟢 Campanha encerrada antecipadamente contava como sucesso — `calcular_score_historico` tratava o status `encerrado` (o encerramento do RF-040, com justificativa) como se fosse meta atingida. **Você deu o OK ("pode ser") — corrigido, ver resolvidos.** (d) 🟢 GitHub não pontuava — a função procurava por Lattes, ORCID, LinkedIn, ResearchGate e mais três padrões que não existiam na allowlist, mas nenhum padrão casava com GitHub. **Alexia respondeu "acho que é só colocar no seed" — corrigido de um jeito mais robusto ainda, ver resolvidos.**

> Sugestão do *** CLAUDE ***: em (a) eu contaria apenas denúncias com status `resolvida`, ignorando `pendente`, `em_analise` e `improcedente` — uma acusação sob análise não é culpa e uma acusação descartada é o contrário disso; isso também fecha uma brecha real, porque hoje cinco contas coordenadas derrubam permanentemente o score de alguém dentro do limite de 5 denúncias por 24 horas do RF-076, mesmo que a moderação dê razão ao pesquisador nas cinco. Em (b) eu tiraria `rejeitado` do denominador da taxa de conclusão, já que a rejeição já é contabilizada uma vez na taxa de aprovação. Em (c) eu contaria o encerramento antecipado como neutro, fora do numerador e fora do denominador — tratar uma campanha interrompida pelo próprio pesquisador igual a uma que bateu a meta é generoso demais e distorce a comparação entre pesquisadores. Em (d) eu daria peso ao GitHub, porque em exatas e computação um repositório público é evidência acadêmica tão legítima quanto ResearchGate — mas seja qual for a escolha de vocês, ela precisa estar escrita, senão parece esquecimento. Existe ainda um quinto ponto puramente técnico ligado a isso: os pesos `volume_denuncias` e `gravidade_denuncias` estão seedados em `score_config` mas nenhuma função os lê (o cálculo usa constantes da tabela `configuracoes`), o que significa que o painel do Admin mostraria duas alavancas que não movem nada; a correção é escolher uma única fonte de verdade para as constantes de score, e eu ficaria com `score_config`, que é a tabela que o painel edita e que já tem trigger de recálculo.

> Confirmação (28-07-2026): (a), (b) e o quinto ponto (consolidar as constantes em `score_config`) não eram escolhas de negócio — eram conformidade com RF já escrito (a), erro aritmético (b) e limpeza técnica (5º ponto). Implementados e testados: simulei a correção de (a) rodando contra o seed inteiro e nenhum dos 4 pesquisadores desenhados pro teste de faixas muda de faixa (Rafael 44→45, Marcos 33→35, Eduardo 46→48, Vinícius 19→19) — ver "🟢 Já corrigido" mais abaixo.
>
> **(c) e (d) — decididos direto por vocês dois, sem precisar voltar aqui (28-07-2026):** (c) Alexia: "pode ser" — virou neutro, fora do numerador e do denominador da taxa de conclusão. (d) Alexia: "acho que é só colocar no seed" — o reconhecimento de link acadêmico foi refatorado pra comparar por `tipo_link.codigo` (chave estável) em vez de `ILIKE` no nome de exibição (hardcoded, e nunca incluía GitHub mesmo o catálogo já tendo o tipo); "outro link acadêmico" virou "qualquer tipo_link que não seja Lattes/ORCID" — reconhece GitHub automaticamente, e qualquer tipo novo que entrar no catálogo no futuro, sem precisar editar a função de novo. Testado: nenhum dos 4 pesquisadores do teste de faixas muda de faixa com nenhuma das duas correções.

🔴 **14. O domínio de recompensa não tem nenhum requisito escrito** *(atualização 28-07-2026: parte disso já foi resolvida — ver item 34 no topo do arquivo. O que fica aqui é só a parte que ainda depende de vocês: escrever os 2-3 RFs novos na Etapa 3 descrevendo recompensa simbólica.)*

Mesma situação do item 12: a palavra "recompensa" aparece zero vezes nos três `.docx`. Não há RU, RF nem RNF sobre oferecer contrapartidas materiais ao doador. O banco, porém, tem 4 tabelas dedicadas (`recompensa`, `contribuicao_recompensa`, `arquivo_recompensa` e `link_recompensa`), o ENUM `tipo_recompensa`, cerca de 12 policies de RLS, grants, índices e uma trigger de validação. Era um subsistema inteiro construído para uma funcionalidade que o projeto nunca especificou.

> Sugestão do *** CLAUDE ***: acho que isso é herança mental da Catarse, que trabalha com recompensas por ser plataforma de projeto cultural e criativo. O Experiment.com, que é a referência que vocês declaram na Etapa 1 e na Etapa 2, deliberadamente não trabalha com recompensas: a contrapartida ao apoiador é a publicação aberta do progresso e dos resultados da pesquisa, que no CrowdAcadêmico já está implementada como `atualizacao_campanha` e coberta pelos RF-030 e RF-031. A objeção de logística (recompensa material) foi resolvida restringindo o ENUM a recompensa simbólica (item 34) — o que falta agora é só formalizar isso em RF na Etapa 3.

🟢 **15. Duas tabelas de link que era impossível usar — RESOLVIDO (decisão da Alexia)**

O seed de `tipo_link` cadastra os 5 tipos (Lattes, ORCID, ResearchGate, LinkedIn e GitHub) informando apenas nome, regex e domínio. Os três campos de escopo caíam no valor padrão: `permite_perfil` ficava `TRUE`, mas `permite_atualizacao` e `permite_recompensa` ficavam `FALSE`. Como a trigger `trg_valida_escopo_tipolink` rejeita qualquer link fora do escopo permitido, toda tentativa de inserir uma linha em `link_atualizacao` ou em `link_recompensa` levantava exceção. As duas tabelas, mais 8 policies de RLS, 4 índices e os grants correspondentes, eram código que existia, rodava no bootstrap e nunca funcionava. A revisão anterior tinha olhado esse assunto, mas verificado só quais tipos foram seedados (concluindo, corretamente, que a lista de 5 é proposital) e não os campos de escopo.

> Sugestão do *** CLAUDE ***: não ligaria os campos sem antes decidir o escopo. `link_recompensa` — agora que a recompensa é simbólica (item 34), pode fazer sentido ligar `permite_recompensa` pra algum tipo, se vocês quiserem anexar link a uma recompensa de reconhecimento. Já `link_atualizacao` é uma pergunta separada: o RF-030 fala de publicar atualizações de progresso, mas nunca menciona anexar links a elas — é funcionalidade que não foi pedida. Se vocês quiserem manter `link_atualizacao` (faz sentido, por exemplo, um pesquisador linkar o artigo publicado numa atualização de resultado final), então é preciso ligar `permite_atualizacao` para os tipos apropriados no seed e escrever o RF correspondente. O que não pode continuar é o estado atual, porque é o pior dos dois mundos: o custo de manter o código sem nenhum benefício.

> **Decisão da Alexia (28-07-2026):** "mantém, eles seriam links pra por exemplo algum vídeo restrito no Youtube tipo isso, pro Github, etc". **Aplicado:** GitHub ganhou `permite_atualizacao`/`permite_recompensa = TRUE` no seed — repositório de código como prova de progresso numa atualização, ou como acesso antecipado (`tipo_recompensa='acesso_antecipado'`) a um repo privado. Os outros 4 tipos (Lattes/ORCID/ResearchGate/LinkedIn) continuam só com `permite_perfil` — são links de identidade profissional, menos naturais numa atualização ou recompensa. Não existe hoje um tipo "YouTube" dedicado no catálogo (a Alexia citou como exemplo, não como especificação fechada) — mas o `tipo_link` reaberto (ver "🟢 Já corrigido" mais abaixo) já resolveu a decisão de escopo geral (5 → 7 tipos, incluindo Site Institucional e Outro); um tipo "vídeo"/"YouTube" dedicado, se um dia fizer sentido, é uma linha nova de seed a partir de agora, não mais uma decisão de arquitetura em aberto.

🟢 **16. Limites de negócio fixos no código em vez de configuráveis — TOTALMENTE RESOLVIDO (28-07-2026)**

Quatro números que os requisitos tratam como regra de negócio estavam fixos dentro do banco, exigindo alteração de estrutura para mudar: o prazo de 15 a 90 dias (fixo na constraint `CK_CAMPANHA_PRAZO`), o limite de 2 campanhas simultâneas do RF-029, o limite de 4 endossos do RF-063 e o limite de 5 denúncias por 24 horas do RF-076. No caso do prazo havia um agravante: existia uma configuração `prazo_maximo_campanha_dias` na tabela `configuracoes` que dava a impressão de controlar isso, mas quem mandava de verdade era a constraint — mudar a configuração não mudava nada. E esse número específico está em discussão aberta: o próprio RF-045 já registra que o arranjo PIX do Banco Central permite devolução em até 90 dias, o que faz uma campanha de 90 dias somada ao tempo de moderação ficar fora da janela de estorno, e propõe reduzir o máximo para 60 dias.

> Sugestão do *** CLAUDE ***: o critério que eu usaria é simples e vale para os quatro: se o número aparece escrito num RF, ele é regra de negócio e mora na tabela `configuracoes`; se ele existe só para impedir dado absurdo entrar no banco, é limite técnico e mora na constraint. Aplicando isso ao prazo, a constraint viraria um limite absoluto largo (por exemplo, 1 a 365 dias, só para barrar erro grosseiro) e a regra comercial real, seja ela 15 a 90 ou 15 a 60, ficaria em `configuracoes` com a validação feita no NestJS. A vantagem prática é grande: mudar a política de prazo vira um `UPDATE` numa linha, não uma migração de estrutura em banco já com dados. E isso destrava a decisão do RF-045 — vocês podem começar com 90, medir, e reduzir para 60 depois sem custo técnico nenhum. Sobre a decisão em si dos 90 versus 60 dias, eu iria de 60: o RF-038 já prevê `reembolso_manual` como plano B, mas depender de tratamento manual de estorno numa plataforma operada por duas pessoas é justamente o cenário que vocês não querem, e 60 dias continua bem acima da média de campanha bem-sucedida na Catarse e no Experiment.

> **Implementado (28-07-2026):** exatamente esse desenho — constraint virou limite técnico largo (1-365 dias, ver `01`), e uma trigger nova lê `configuracoes.prazo_minimo_campanha_dias`/`prazo_maximo_campanha_dias` pra aplicar a regra de negócio real. Os outros 3 limites (campanhas simultâneas, endossos, denúncias/24h) passaram pelo mesmo tratamento, cada um com sua chave nova em `configuracoes`.
>
> **Decisão final sobre 90 vs 60 dias (28-07-2026):** você e a Alexia decidiram direto, sem precisar de mais rodada — **60 dias** (não 90). Prazo agora é 15 a 60 dias, qualquer valor nesse intervalo, e imutável depois que a campanha começa de fato. `configuracoes.prazo_maximo_campanha_dias` foi atualizado de `90` pra `60`. As campanhas do seed com duração maior que 60 dias (dado histórico anterior à decisão de hoje) foram grandfathered — a trigger de validação de prazo fica desligada só durante a carga do seed, mesmo padrão já usado pras outras triggers de dado histórico.
>
> **Bônus da mesma conversa — feature "Em breve" (rascunho agendado):** você decidiu, com a Alexia e o Claude Web, que o pesquisador pode escolher lançar a campanha na hora ou agendar um início futuro — mesma ideia do Catarse, com contador regressivo no front. Isso não precisou de status novo nem de coluna nova: a campanha aprovada já fica pública (a policy libera por status), só passou a não poder receber nenhuma doação antes de `data_inicio` chegar (`fn_valida_contribuicao_campanha_ativa`, `05`) — comparado em tempo real, sem precisar de job/cron pra "virar ativa". E as datas (`data_inicio`/`data_fim`) só congelam quando a campanha **de fato** começa (`data_inicio` no passado), não no momento da aprovação — assim o pesquisador pode reagendar o início livremente enquanto ainda está "Em breve". Ver detalhamento completo na seção de resolvidos.

🟠 **17. Campanha de usuário excluído continua pública** *(atualização 28-07-2026: testado de verdade, e já funciona melhor do que o diagnóstico original supunha — ver abaixo. Muda de 🔴 pra 🟠: falta só formalizar em RF, não escrever código.)*

O RNF-003 promete que o titular pode pedir exclusão dos seus dados. A policy `pol_usuario_select` já esconde usuários marcados como `deletado`, e a policy de campanha (`pol_campanha_select`) libera por **status** (`ativo`/`sucesso`/`nao_atingido`/`encerrado`), não pelo dono — então a campanha em si continua pública mesmo se o dono for deletado, mas o **autor** já não: `usuario_visivel()` (ver item A9, 27-07-2026) já esconde nome/perfil/links de uma conta deletada. Testado o cenário completo (usuário 1 marcado como `deletado`): a campanha dele continua visível (1, preservada); nome, perfil acadêmico e links dele ficam em 0; as contribuições recebidas continuam preservadas (histórico financeiro intacto). Isso já é exatamente o desenho de anonimização recomendado abaixo — ninguém tinha percebido que a correção A9 já entregava isso. Só que apagar de verdade também não é opção: o RNF-007 exige manter logs financeiros por no mínimo 5 anos, e uma campanha que recebeu dinheiro é registro financeiro. Não existe hoje nenhum requisito que descreva o que "excluir conta" significa na prática nesta plataforma.

> Sugestão do *** CLAUDE ***: o caminho que resolve os dois lados é anonimizar o autor, não apagar a campanha. A campanha continua existindo com todo o histórico financeiro intacto (atendendo o RNF-007 e protegendo quem doou, que tem direito de ver para onde foi o dinheiro), mas passa a ser exibida como pesquisador removido, sem nome, sem vínculo institucional e sem links. É exatamente o que plataformas de doação fazem quando alguém encerra a conta, porque a alternativa (fazer a campanha sumir) prejudica justamente o doador, que é a parte mais vulnerável da relação. Isso precisa virar um RF novo na Etapa 3 definindo o que é excluído, o que é anonimizado e o que é retido por obrigação legal — hoje o RNF-003 promete a exclusão de forma genérica sem dizer como, e é o tipo de lacuna que uma banca atenta pergunta.

> **Confirmado por teste (28-07-2026):** o `.sql` já faz exatamente isso, sem nenhuma linha de código nova — a correção A9 (27-07-2026) resolveu isso de lambuja. O que falta não é `.sql`: (1) escrever o RF na Etapa 3 definindo o que é apagado/anonimizado/retido; (2) garantir que o front do NestJS/React exiba algo como "Pesquisador removido" em vez de quebrar quando o `JOIN` com o perfil não retornar nada — isso é trabalho de aplicação, fica pra quando o Nest/React existirem.

🟢 **19. Colunas que faltam para requisitos que já estão escritos — TODAS RESOLVIDAS (28-07-2026)**

Comparando o banco contra a Etapa 3, existiam cinco pontos em que um requisito já aprovado descrevia algo que o banco não conseguia armazenar. (a) 🟢 Rótulo personalizado de link acadêmico — os RF-014, RF-016 e RF-018 e a Etapa 2 falam em até 5 links com rótulo personalizável. *(Corrigido: coluna `rotulo VARCHAR(100)` em `link_academico`, mais trigger de limite configurável — ver resolvidos.)* (b) 🟢 Descrição da denúncia — os RF-019 e RF-072 pedem campo opcional de descrição adicional, que não existia na tabela `denuncia`. *(Corrigido: coluna `relato TEXT`, ver resolvidos.)* (c) 🟢 Vídeo de apresentação — o RF-033 pede campo opcional de URL de vídeo exibido em destaque na página da campanha. *(Corrigido: coluna `video_apresentacao_url VARCHAR(500)` em `campanha`, ver resolvidos.)* (d) 🟢 Justificativa do Administrador ao rejeitar encerramento antecipado — o RF-041 torna obrigatório, mas `solicitacao_encerramento` só tinha campo para a justificativa do pesquisador. *(Corrigido: coluna `justificativa_admin TEXT`, ver resolvidos — esta era a mais urgente das cinco.)* (e) 🟢 Tipos de link — o RF-014 lista sete tipos, incluindo "Site Institucional" e "Outro" com regras próprias. *(Corrigido junto com a reabertura de `tipo_link`, ver "Pendências mais antigas" → agora resolvida, e "🟢 Já corrigido" mais abaixo.)*

> Sugestão do *** CLAUDE ***: todos os cinco são baratos de resolver no banco (quatro são coluna nova e um é linha no seed), mas nenhum deve ser feito por reflexo, porque os `.docx` vão ser revisados e a pergunta correta é a inversa: o requisito continua valendo ou ele é que deve sair? Meu palpite item a item: os rótulos de link (a) eu manteria, porque aparecem em três RFs e na Etapa 2, é claramente decisão consolidada de vocês. A descrição da denúncia (b) eu manteria também, porque denúncia só com motivo pré-definido dá pouca informação para o Administrador julgar, e é o tipo de campo que a moderação sente falta rápido. O vídeo (c) eu manteria, é barato (só armazena URL, nenhum arquivo) e aumenta muito a conversão de campanha. A justificativa do Admin (d) é a mais importante das cinco, porque hoje o RF-041 é impossível de cumprir e negar um pedido de encerramento sem registrar o motivo é frágil se o pesquisador contestar depois. E sobre os sete tipos de link (e), eu voltaria atrás na decisão anterior de fechar em cinco: "Site Institucional" e "Outro" são justamente o que atende pesquisador de instituição pequena, que é exatamente o público que a justificativa da Etapa 1 diz que a plataforma quer alcançar; a objeção original era que esses dois não têm domínio validável, o que se resolve deixando `regex` e `dominio` nulos e validando só o formato de URL.

> Nota (28-07-2026): (b) e (d) não eram decisão — eram conformidade com RF já escrito, implementadas primeiro. (a) e (c) eram "manteria" na minha opinião, mas custo de produto (coluna nova, e no caso de (a) uma trava configurável por usuário) — você confirmou ("sim, mantém") e ambas foram implementadas na mesma rodada que (e) — ver "🟢 Já corrigido" mais abaixo.

---

## Pendências mais antigas (pré-27-07-2026, sem rodada de data específica)

### No `.sql`

🔴 **2. Debate `tipo_link` / `contexto_link`**

Debate sobre criar 2 tabelas novas (`tipo_link` e `contexto_link` reformulados) — **adiado, não mexer sem pedir**. Assunto que você e sua parceira ainda estão discutindo sobre como modelar.

> Sugestão do *** CLAUDE ***: olhando Catarse e Experiment, os dois têm um conjunto de contextos de link bem pequeno e estável (perfil do criador, página do projeto, atualizações) — não é algo que cresce toda hora na prática. Isso favorece o modelo atual (3 flags booleanas: `permite_perfil`, `permite_atualizacao`, `permite_recompensa`), que é mais simples de ler e de mexer no dia a dia. Eu só migraria pra uma tabela `contexto_link` dinâmica (como o `RBAC-pontos-discutidos.md`, seção 6.5, já esboça) se vocês já tiverem um plano concreto de adicionar um 4º ou 5º contexto em breve (ex.: link em denúncia, em perfil de instituição) — sem esse plano concreto, a complexidade extra da tabela nova não se paga ainda. Minha recomendação: manter como está por enquanto, e só revisitar quando um novo contexto for realmente necessário (não antes, por precaução).

🟢 **3. `score_minimo_campanha` — RESOLVIDO (28-07-2026): sinal de revisão manual, nunca trava automática**

Você decidiu seguir direto a sugestão do CLAUDE (mantida abaixo como registro): score nunca bloqueia criação de campanha — quem filtra confiança de verdade é a aprovação manual do Admin. Sem trigger de bloqueio; `public.fn_precisa_revisao_score(p_id_usuario)` foi criada como o sinal que o futuro Painel Admin usa pra destacar, na fila de aprovação, campanhas de pesquisador abaixo do mínimo. Ver "🟢 Já corrigido" mais abaixo para o detalhamento técnico.

> Sugestão do *** CLAUDE *** (aplicada): nem Catarse nem Experiment bloqueiam a criação de campanha por um "score de reputação" acumulado na plataforma — os dois confiam na aprovação manual de um curador/admin (que este projeto já tem, via `status = 'aguardando_aprovacao'`) como o filtro de confiança real, não em histórico de uso do sistema. Faz sentido: um pesquisador cadastrado ontem, com score 0, pode ser totalmente legítimo (é só novo na plataforma) — travar ele automaticamente prejudicaria exatamente quem uma plataforma de crowdfunding científico mais precisa atrair, que são pesquisadores novos por ali. Recomendação seguida: não implementar a trigger de bloqueio automático. Em vez disso, `score_minimo_campanha` vira só um sinal de apoio pra revisão manual — o painel do admin pode destacar/sinalizar campanhas de pesquisadores com score abaixo do mínimo pra receberem uma revisão mais cuidadosa antes de aprovar, sem bloquear ninguém de forma automática e definitiva.

🟢 **`tipo_link` com 5 de 7 tipos seedados — RESOLVIDO (28-07-2026), ligado ao item 19(e) da Lista C**

O comentário do próprio seed (`07_seed_dados.sql`) dizia *"tipo_link ajustado para a allowlist fechada definida pela equipe"* — mas essa decisão tinha sido tomada com evidência incompleta: verificou quais tipos foram seedados, mas nunca olhou as 3 colunas de escopo (`permite_perfil`/`permite_atualizacao`/`permite_recompensa`), que ficavam todas no valor padrão pros 5 tipos seedados e por isso derrubavam duas tabelas inteiras (item 15 da Lista C). A Etapa 3 dos `.docx` (RF-014) lista 7 tipos, incluindo "Site Institucional" e "Outro" com comportamento próprio. **Decisão:** aplicar a sugestão do CLAUDE (não havia sugestão do Claude Web registrada sobre este ponto específico) — voltar aos 7 tipos. `SITE_INSTITUCIONAL` e `OUTRO` entraram no seed com `regex`/`dominio = NULL` (não têm domínio fixo pra validar — a aplicação valida só o formato genérico de URL) e `permite_perfil = TRUE`. Resolve também o item 19(e). Ver "🟢 Já corrigido" mais abaixo.

### Só resolve em código Nest/React (ainda não existem)

🔴 **5. Contexto de sessão por requisição**

`SET LOCAL app.id_usuario_atual` por requisição (dentro de uma transação, usando um `Client` específico da pool).

> Sugestão do *** CLAUDE ***: implementar como um interceptor/middleware global do NestJS (não espalhado controller por controller) — assim fica impossível esquecer o `SET LOCAL` numa rota nova que alguém criar depois. Vale também um teste de integração simples que tenta acessar dado de outro usuário sem esse `SET LOCAL` e confirma que a RLS realmente bloqueia.

🔴 **6. Fluxo de autenticação completo**

Signup, login, verificação de e-mail, recuperação de senha, refresh token.

> Sugestão do *** CLAUDE ***: os prazos que já estão documentados no `01` (token de recuperação de senha com expiração de 15-30 min, ver comentário da tabela) já batem com o padrão que plataformas como Catarse/Experiment usam pra esse tipo de fluxo — não mudaria nada aí. Um reforço que vale considerar: rate-limit de tentativa de login (mesmo simples, tipo "5 tentativas por IP a cada 15 min") é algo que sistemas de referência têm e que ainda não está no escopo — vale colocar na lista quando for implementar.

🔴 **7. Guards/interceptors no NestJS**

Espelhando `tem_permissao()` do banco no lado da aplicação.

> Sugestão do *** CLAUDE ***: pra não correr o risco de as duas camadas (banco e NestJS) divergirem com o tempo, eu geraria a lista de permissões que o guard do NestJS reconhece - a partir da própria tabela `permissao` - (uma consulta na subida da aplicação, ou um script que gera uma constante/enum automaticamente), em vez de digitar a lista de novo à mão no código do backend. Assim, toda permissão nova só precisa ser criada uma vez, no banco.

🔴 **8. Conexão sempre como `app_nestjs`**

Garantir que a conexão do backend use sempre `app_nestjs`, nunca superusuário (senão a RLS é ignorada silenciosamente).

> Sugestão do *** CLAUDE ***: um health-check simples na subida do NestJS (`SELECT current_user`) que impede a aplicação de subir se a conexão não for exatamente `app_nestjs` — evita o erro silencioso de rodar com superusuário sem ninguém perceber, o que faria a RLS inteira parecer que "funciona" em teste mas não proteger nada de verdade.

🔴 **9. Validação de escrevibilidade financeira**

`auditoria_financeira` e `repasse` têm policies de escrita `USING (true)` — a RLS não valida quem grava aí, fica 100% a cargo do serviço do NestJS.

> Sugestão do *** CLAUDE ***: seguindo o padrão de qualquer plataforma de pagamento séria (inclusive Catarse/Experiment, que também dependem de gateway externo pra processar pagamento), eu isolaria a escrita em `auditoria_financeira`/`repasse` dentro de um único serviço interno do NestJS, chamado só pelo webhook do gateway de pagamento — nunca exposto como um endpoint CRUD genérico que outra parte do app possa chamar por engano.

> Correção de foco (27-07-2026): o risco real aqui não é "ter que escrever a regra duas vezes" (uma vez em SQL, outra no NestJS) — é que hoje, especificamente no caminho do dinheiro (`repasse`, `auditoria_financeira`, `historico_rejeicao`), a RLS está `USING (true)` e não protege nada, exatamente onde mais importaria proteger. Isso já foi testado de verdade: inserir um `repasse` com `valor_liquido = 0` numa campanha `all-or-nothing` abaixo da meta (permitido, RF-038) e depois fazer `UPDATE` pro valor cheio passava direto, sem revalidar a regra all-or-nothing. **Esse teste específico já não funciona mais** — foi corrigido em 27-07-2026 (ver `A3` na seção de resolvidos: `trg_valida_repasse` agora também dispara em `UPDATE`, não só `INSERT`). O ponto de fundo continua válido: `auditoria_financeira`/`repasse`/`historico_rejeicao` seguem com escrita aberta por decisão consciente, então o serviço isolado do NestJS sugerido acima continua sendo a defesa que falta.

### Decisões que precisamos tomar, não bugs

🔴 **10. React em JavaScript ou TypeScript**

> Sugestão do *** CLAUDE ***: TypeScript. O NestJS já é TypeScript por padrão — manter o front em JavaScript puro cria uma costura inconsistente entre as duas pontas, e vocês perdem a chance de compartilhar tipos entre back e front (ex.: o formato de uma campanha, de uma contribuição). Pra quem ainda está aprendendo, o TypeScript pega em tempo de compilação exatamente o tipo de erro bobo (nome de campo errado, tipo trocado) que sem ele só aparece rodando o app — é uma rede de segurança a mais, não só "código chato de escrever a mais".

🔴 **11. Pool direto no Service**

Só nota de melhoria futura, não urgente.

> Sugestão do *** CLAUDE ***: usar o padrão de injeção de dependência do próprio NestJS — registrar o `Pool` do `pg` como um provider único do módulo e injetar ele nos services, em vez de cada service criar sua própria instância de `Pool`. É o jeito idiomático do framework e evita vazamento de conexão (vários pools abertos sem necessidade).


---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---


# 🟢 RESOLVIDAS / CORRIGIDAS

*(Tudo abaixo já está aplicado no `.sql` — fica aqui só pra registro e prova de que nada quebrou. Continua agrupado por data, da mais recente pra mais antiga.)*


## 🗓️ 28-07-2026

#### Tier A — bugs mecânicos, zero decisão envolvida — **todos 🟢 corrigidos em 28-07-2026**

🟢 **A1. Cabeçalho do `05` dizia 26 triggers, eram 27** — conferido com `grep`, corrigido pra 27 (e depois pra 29, ver itens mais abaixo). Uma linha.

🟢 **A2. 4 contribuições do seed violavam o RF-048 (PIX obrigatório em all-or-nothing)** — `id_contribuicao` 2, 4, 7 e 9 eram `cartao_credito`/`boleto` em campanha `all-or-nothing` — só entraram porque `trg_contribuicao_all_or_nothing_pix` fica desligada durante a carga do seed (`[07-H-1]`). **Corrigido:** as 4 trocadas pra `pix` (marcadas com `-- (*)` no `.sql`, indicando qual era o valor antigo). Não afeta o cálculo de score (que usa status da campanha, não meio de pagamento).

🟢 **A3. `valor_bruto_arrecadado` era digitado à mão e não batia com a soma real das contribuições** — 9 das 10 campanhas divergiam (3 delas com **zero** contribuições e um total de 5 dígitos mesmo assim). Mesmo tipo de problema que a Alexia já tinha corrigido em `perfil_pesquisador.score_atual` (parar de digitar, deixar a trigger calcular) — só que ninguém tinha reparado que o mesmo valia pra `campanha.valor_bruto_arrecadado`, porque `trg_sincroniza_arrecadado_campanha` ficava desligada durante toda a carga do seed. **Corrigido:** a coluna saiu do `INSERT INTO campanha` (usa o `DEFAULT 0`); `trg_sincroniza_arrecadado_campanha` passou a ficar **ligada** durante a carga de `contribuicao` (as outras 2 triggers de validação continuam desligadas, por bons motivos, ver comentário no `.sql`); 37 novas linhas de contribuição foram distribuídas entre doadores diferentes pra cada campanha somar exatamente o total que tinha antes. **Prova mecânica** (feita com regex/PowerShell, não à mão): somei programaticamente as 48 linhas finais de `contribuicao` por campanha e todas batem exatamente com os totais antigos — 52300 / 28500 / 40000 / 8000 / 22000 / 45000 / 32000 / 21000 / 9000 — e confirmei que **nenhuma** contribuição em campanha `all-or-nothing` usa meio de pagamento diferente de `pix`. Isso também resolveu o item da linha duplicada de `repasse` na campanha 2 (ver mais abaixo, seção "Resolvidos mais antigos") — removida, porque a duplicata só existia pra "empurrar" o total antigo, que agora vem de verdade da soma das contribuições.

🟢 **A4. `pol_aceite_termo_contribuicao_select` esquecia o doador anônimo** — a policy de `INSERT` já aceitava `id_usuario IS NULL`, a de `SELECT` não tinha o ramo correspondente (`token_sessao`) — um doador anônimo registrava o aceite dos termos e nunca mais conseguia relê-lo. **Corrigido:** replicado o mesmo ramo de `token_sessao` que `pol_contribuicao_anon_select` já usa.

🟢 **A5. `termos_de_uso`, `usuario_termo` e `aceite_termo_contribuicao` seedadas** — as três estavam vazias e sustentam o RF-011 (aceite obrigatório no cadastro), RF-054 e RF-055 (aceite por transação, defesa em disputa de chargeback, segundo a Etapa 2). **Corrigido:** 2 versões de termos (v1 histórica, já `ativo = FALSE`; v2 atual, `ativo = TRUE`, ainda sem ninguém re-aceitando — cenário realista de "termo novo publicado, ninguém foi reavisado ainda"); os 17 usuários aceitando a v1 no próprio cadastro; `aceite_termo_contribuicao` gerada por `SELECT` a partir da própria `contribuicao` (não digitada linha por linha), uma linha por contribuição. Documentei também, em comentário no `.sql`, a pegadinha real que testei: publicar uma versão nova de termos sem desativar a anterior na mesma transação quebra com o índice parcial `uq_termos_uso_ativo` (`02`) — o `UPDATE` que desativa a antiga e o `INSERT` da nova precisam estar juntos.

🟢 **A6. `notificacao` seedada** — estava vazia; 7 linhas em `pendente`/`enviado`/`falhou`/`cancelado`, exercitando de verdade a permissão `notificacao_processar` e o índice `idx_notificacao_status` pela primeira vez. *(A mesma rodada também acrescentou 5 motivos de denúncia novos ao catálogo `motivo_denuncia` — `CAMP-005` a `CAMP-008` e `PERF-004` — ideia da Alexia, ver o topo do arquivo.)*

#### Tier B — decisão de uma linha, revisada a fundo antes de aplicar — **B1 e B2 🟢 aplicados**

🟢 **B1. `GRANT DELETE` em `verificacao_email`, `recuperacao_senha` e `sessao`** — as 3 já tinham policy `FOR ALL` (cobre `DELETE`), mas o `GRANT` só ia até `UPDATE` (item 28, antigo). O CLAUDE testou o fluxo real antes de recomendar: pedir recuperação de senha, deixar o token expirar sem usar, e pedir de novo — **quebra** com erro de unicidade (`ux_recuperacao_senha_ativo_por_usuario` só permite 1 token não-usado por vez), e sem `DELETE` o app não tem como limpar o token velho (a alternativa de "marcar como usado à força" faria a coluna `usado_em` mentir sobre o que de fato aconteceu). **Aplicado:** `DELETE` concedido nas 3, com comentário no `.sql` documentando os 2 usos previstos (apagar token velho no ato de pedir um novo; expurgo periódico por retenção — 30 dias pra `verificacao_email`/`recuperacao_senha`, 90 dias pra `sessao`) e o cuidado de que, como as policies são `USING (true)`, o expurgo do NestJS precisa ser sempre uma consulta fixa com `WHERE` explícito em data, nunca um filtro dinâmico.

🟢 **B2. Senha placeholder da role `app_nestjs`** — trocado de `LOGIN PASSWORD 'TROCAR_NO_AMBIENTE_REAL'` pra `NOLOGIN`. Testado (pelo CLAUDE) que `GRANT`/`SET ROLE` continuam funcionando normalmente numa role `NOLOGIN`, e que esquecer o passo de produção agora falha **fechado** (`FATAL: role "app_nestjs" is not permitted to log in`, percebido em minutos) em vez de falhar **aberto** (senha conhecida publicada no GitHub, sistema funcionando "normalmente"). **Aplicado:** `01` cria a role `NOLOGIN`; `tutorial-rodar-projeto.md` ganhou aviso de que o `ALTER ROLE app_nestjs LOGIN PASSWORD '...'` agora é **obrigatório** (sem ele, ninguém — nem você — consegue conectar como `app_nestjs`), tanto na checklist rápida quanto na Parte 3 detalhada.

**Prova mecânica de que nada quebrou (rodada inteira, 28-07-2026):** 39 tabelas (igual). `PK_`=39, `FK_`=56 (+1: `FK_AREA_CONHECIMENTO_PAI`), `UK_`=18 (igual), `CK_`=14 (igual) — parênteses balanceados em `01`, `05` e `07` (checado programaticamente, saldo zero nos três). Policies: continua 105 `CREATE POLICY` (só editei uma policy existente — `pol_aceite_termo_contribuicao_select` —, nenhuma nova). Funções de `05`: 31 (+1: `fn_valida_area_conhecimento_nivel2`). Triggers de `05`: 29 (+2: as duas de área nível 2). `area_conhecimento`: 90 linhas (9 grandes áreas + 81 áreas de nível 2, contadas programaticamente, sem duplicata de `codigo_cnpq`). `contribuicao`: 48 linhas (11 antigas + 37 novas), soma por campanha conferida linha a linha via script, batendo 100% com os totais antigos. `repasse`: 6 linhas (era 7, a duplicata da campanha 2 saiu). Tabelas seedadas: 30 (+4: `termos_de_uso`, `usuario_termo`, `aceite_termo_contribuicao`, `notificacao`).

### parte 2 — o CLAUDE rodou de verdade num Postgres e achou um bug crítico — **todos 🟢 corrigidos no mesmo dia**

🟢 **36. BUG CRÍTICO — o seed não termina de rodar: `denuncia` falhava inteira, em silêncio — CORRIGIDO**

`id_motivo` em `denuncia` referenciava o **id serial posicional** do catálogo (1-7), não uma chave estável. Quando os 5 motivos novos do item A5 entraram — `CAMP-005` a `CAMP-008` **antes** do bloco `PERF-*` — os ids de `PERF-001`/`002`/`003` mudaram de `5`/`6`/`7` pra `9`/`10`/`11`:

| | antes | depois |
|---|---|---|
| `PERF-001` | 5 | 9 |
| `PERF-002` | 6 | 10 |
| `PERF-003` | 7 | 11 |

As 8 linhas de `denuncia` que apontavam pra alvo de perfil continuavam usando `5`/`6`/`7` — que virou motivo de **campanha**, aplicado num alvo de **perfil**. `trg_valida_tipo_motivo_denuncia` (criada bem pra pegar exatamente isso, no A5) rejeitava — e como o `INSERT` é um único comando com 13 linhas, **as 13 falhavam junto**, sem travar o script (só um erro que passa despercebido rodando os 8 arquivos em sequência). `denuncia` nascia vazia, `calcular_score_reputacao` devolvia os 25 pontos cheios da dimensão Reputação pra todo mundo, e o teste determinístico das 4 faixas de score (Bruno/Renata/Eduardo/Vinícius) se desfazia sem nenhum aviso: Vinícius saía com 35 ("Em Construção") em vez de 19 ("Atenção") — a faixa "Atenção" ficava **sem ninguém**.

**Corrigido:** duas coisas, não só uma —
1. As 13 linhas de `denuncia` remapeadas (as de perfil, que usavam `5`/`6`/`7`, corrigidas pra apontar pro motivo certo).
2. **Causa raiz, não só sintoma:** `id_motivo` passou a ser resolvido por `SELECT ... FROM motivo_denuncia WHERE codigo = '...'` (chave natural, estável), não mais por número de posição. Inserir motivo novo no meio do catálogo nunca mais quebra essas linhas. Mesmo princípio aplicado a `link_academico` (`id_tipolink` também virou subquery por `codigo` — ver item 39, abaixo).

Prova: as 4 faixas de score voltam exatas — 100 (Bruno, Referência) / 60 (Renata, Confiável) / 46 (Eduardo, Em Construção) / 19 (Vinícius, Atenção).

🟢 **37. `campanha.id_area_conhecimento` deixava passar `NULL` — CORRIGIDO**

A trigger de nível 2 (rodada anterior) bloqueava a grande área raiz, mas deixava `NULL` passar — testado pelo CLAUDE, campanha sem nenhuma área era aceita. A regra ficava "não pode ser vago, mas pode ser omisso" — e omisso é pior: campanha sem área nenhuma some de **todos** os filtros, enquanto uma classificada só na grande área pelo menos aparece num filtro amplo. **Corrigido:** `id_area_conhecimento` virou `NOT NULL` — as 10 campanhas do seed já tinham área de nível 2 desde a rodada anterior, então não exigiu nenhum ajuste nelas.

🟢 **38. Dígito verificador do CNPq resolvido — sem precisar da fonte oficial**

Nem eu nem o CLAUDE conseguimos acesso à tabela oficial do CNPq/Lattes (eu por falha de extração do PDF, ele por não ter acesso à web no ambiente dele). Ele atacou por outro ângulo: **provou matematicamente** que os dígitos que eu tinha semeado não vinham de nenhum algoritmo real. Nos códigos de grande área (`N.00.00.00-D`) só o primeiro dígito é diferente de zero — então em qualquer esquema real de dígito verificador por soma ponderada (o mesmo princípio de CPF/CNPJ/PIS, todos mod 11), o dígito seria função só desse primeiro número. O seed tinha `DV(1) = DV(7) = 3`, o que matematicamente só permite 1 ou 2 resultados distintos possíveis pros 9 valores — e o seed tinha 8 valores distintos. Impossível vir de um algoritmo de verdade.

**Corrigido:** removi o dígito verificador dos 90 `codigo_cnpq` — agora é `'1.03.00.00'`, não `'1.03.00.00-7'`. O dígito verificador serve pra pegar erro de digitação quando um humano transcreve um código num formulário de papel; aqui, `codigo_cnpq` é comparado por igualdade, nunca digitado à mão — o dígito não protegia nada e era a única parte do dado que ninguém conseguia conferir. Os nomes das áreas e a hierarquia continuam corretos e confiáveis (nomenclatura padrão do CNPq).

🟢 **39. `tipo_link` ganhou coluna `codigo` — resolvido**

O único consumidor real seria o motor de score (Lista C, ainda sem decisão) ou os 2 tipos de link que faltam — mas o item 36 criou um consumidor de verdade: o próprio seed precisava referenciar `tipo_link` por chave natural pra fechar o mesmo tipo de bug em `link_academico`. **Corrigido:** coluna `codigo VARCHAR(20) UNIQUE` adicionada (`LATTES`, `ORCID`, `RESEARCHGATE`, `LINKEDIN`, `GITHUB`); `link_academico` (`07`) passou a resolver `id_tipolink` por subquery em `codigo`, não mais por número de posição.

🟢 **40. Guarda de `BYPASSRLS` no topo do `01` — não resolve o item 22, mas melhora o sintoma**

O item 22 (papel do Supabase precisa de `BYPASSRLS`) continua em aberto — só quem confirma isso no painel do Supabase é você. Mas hoje, se alguém rodar o seed sem `BYPASSRLS`, o resultado são dezenas de erros de RLS espalhados pelos 8 arquivos, sem nenhuma pista do motivo real. **Adicionado:** um bloco `DO $$` no início do `01` que checa `rolsuper OR rolbypassrls` pro `current_user` e aborta com uma mensagem única e explicativa, em vez de deixar o erro real acontecer 25+ vezes escondido no meio do `07`.

🟢 **41. `cpf_criptografado` sem GRANT de leitura — trava o KYC do RF-015 — CORRIGIDO**

Com o `NOT NULL` da Alexia em `cpf_criptografado`, o `app_nestjs` passou a ser **obrigado** a gravar o CPF, mas continuava impossibilitado de **lê-lo** — a coluna nunca tinha entrado no `GRANT SELECT` de `perfil_pesquisador`. O RF-015 exige mandar esse dado pra API de pagamento configurar o recebimento do pesquisador; sem conseguir nem selecionar a coluna, o backend não tinha como. **Corrigido:** `cpf_criptografado` (e `tipo_vinculo`) entraram no `GRANT SELECT`. A proteção que de fato importa — quem no backend pode ler isso — passa a ser a permissão `perfil_pesquisador_visualizar_sensivel` (já seedada, até então sem nenhum efeito) gateando a leitura no NestJS; isso é trabalho de aplicação, fora do escopo do `.sql`.

**Prova mecânica desta parte 2:** `PK_`=39 (igual), `FK_`=56 (igual), `UK_`=19 (+1: `UK_TIPO_LINK_CODIGO`), `CK_`=15 (+1: `CK_PERFIL_VINCULO`) — parênteses balanceados em `01`, `04`, `05`, `06` e `07` (saldo zero nos cinco, conferido programaticamente). Funções/triggers de `05`: sem mudança nesta parte (31/29, nenhuma função ou trigger nova — só dado e GRANT). Policies: continua 105 (nenhuma tocada nesta parte). `area_conhecimento`: continua 90 linhas, agora sem dígito verificador (conferido: zero ocorrências do padrão `X.YY.00.00-D` no arquivo inteiro). `contribuicao`: recontado, continua 48 linhas com as mesmas 9 somas batendo exatamente. `tipo_link`: 5 linhas, todas com `codigo` único.

### parte 3 — resolvendo o que dava pra resolver da Lista C, sem reunião — **todos 🟢 corrigidos no mesmo dia**

*(Você perguntou ao CLAUDE WEB se concordava com as sugestões item por item da Lista C — ele concordou com quase todas, ajustou 2 (itens 12 e 18) depois de testar, e separou o que dá pra fazer agora do que precisa de decisão. Pediu pra pensar nas soluções de 12 e 18 com cuidado antes, testando contra o banco real — os dois já vinham com o design errado na primeira tentativa dele, e ele mesmo corrigiu antes de eu implementar.)*

🟢 **12 (parcial) + 31. Score deixa de ser público — CORRIGIDO**

`pol_score_select` era `USING (TRUE)` — sem sequer `TO app_nestjs` — deixando o score de qualquer pesquisador visível pra qualquer um. Isso fechava sozinho a objeção mais séria do item 12 (juízo automatizado sobre pessoa identificada, exposto publicamente, sem previsão de contestação — risco de LGPD) e o item 31 inteiro (score de usuário deletado continuando público). **Corrigido:** permissão nova `score_visualizar` (seedada, atribuída a admin/curador/revisor/moderador); `pol_score_select` (`04`) passou a exigir `id_usuario = id_usuario_atual() OR tem_permissao('score_visualizar')` — o próprio pesquisador continua vendo a própria quebra por dimensão (não só o rótulo — esconder dele um juízo automatizado sobre ele mesmo seria pior, na linha do Art. 9 da LGPD), quem tem a permissão nova vê de todo mundo (apoio à curadoria manual), ninguém mais vê nada. Fechada também a porta dos fundos: `score_atual`/`score_atualizado_em` saíram do `GRANT SELECT` de `perfil_pesquisador` (`06`) — antes, dava pra ler o score de qualquer um por ali mesmo com a policy de `score_pesquisador` corrigida, porque GRANT de coluna não tem o conceito de RLS. O valor continua acessível de onde deveria: `score_pesquisador.score_total`, pra quem tem a permissão nova. Testado: usuário 17 marcado como deletado passa a mostrar 0 linhas de score pro público, sem precisar de nenhuma correção extra — o item 31 se resolveu sozinho.

🟢 **13(a). Denúncia improcedente para de penalizar — CORRIGIDO (conformidade com RF-077)**

`calcular_score_reputacao` (`05`) contava qualquer denúncia contra o pesquisador — inclusive `pendente`, `em_analise` e `improcedente` — o que contradiz o RF-077 ("denúncia descartada após análise"). **Corrigido:** só denúncias `resolvida` (= confirmada pela moderação) penalizam agora, tanto no custo base quanto no custo extra de procedência. Testado contra o seed inteiro: nenhum dos 4 pesquisadores do teste de faixas muda de faixa (Rafael 44→45, Marcos 33→35, Eduardo 46→48, Vinícius 19→19 — sem mudança).

🟢 **13(b). Campanha rejeitada parou de punir duas vezes — CORRIGIDO (erro aritmético, não decisão)**

`calcular_score_historico` (`05`) contava `rejeitado` tanto na taxa de aprovação (correto) quanto no denominador da taxa de conclusão (contando a mesma rejeição de novo, sem chance de entrar no numerador). **Corrigido:** `rejeitado` saiu do denominador da taxa de conclusão. Nenhuma campanha do seed está com esse status hoje, então não muda nenhum score atual — é correção pra dado futuro.

🟢 **13, quinto ponto. Constantes de score consolidadas em `score_config` — CORRIGIDO**

`volume_denuncias`/`gravidade_denuncias` estavam seedados em `score_config` (pesos 10/15) mas nenhuma função os lia — o cálculo usava `score_custo_denuncia`/`score_custo_denuncia_procedente` em `configuracoes` (valores 1/3), deixando o Painel Admin com 2 alavancas mortas. **Corrigido:** `calcular_score_reputacao` passou a ler os custos de `score_config` (valores atualizados pra 1/3, os mesmos de sempre — só mudou de onde vêm); as 2 chaves em `configuracoes` saíram do seed. `score_config` agora é a única fonte de verdade — e é a tabela que o painel realmente edita.

🟢 **16. Limites de negócio viraram configuráveis — CORRIGIDO (estrutural)**

Prazo de campanha (15-90 dias), limite de campanhas simultâneas (2), limite de endossos (4) e limite de denúncias/24h (5) estavam todos hardcoded — em constraint, no caso do prazo, e no corpo das triggers, nos outros três. **Corrigido:** `CK_CAMPANHA_PRAZO` (`01`) virou um limite técnico largo (1-365 dias, só barra erro grosseiro); trigger nova `fn_valida_prazo_campanha_negocio`/`trg_campanha_valida_prazo_negocio[_update]` (`05`) aplica a regra de negócio real, lendo `configuracoes.prazo_minimo_campanha_dias`/`prazo_maximo_campanha_dias` (15/90, seedados). As outras 3 triggers (`validar_limite_campanhas_pesquisador`, `validar_comentario_endosso`, `validar_denuncia_frequencia`) passaram a ler `configuracoes.limite_campanhas_simultaneas`/`limite_endossos_campanha`/`limite_denuncias_24h` (2/4/5, seedados) em vez de literal fixo no código. Nenhum valor mudou — só o lugar de onde vem. As 10 campanhas do seed continuam todas dentro do intervalo 15-90, então nada quebrou na carga.

🟢 **18. Contagem agregada de seguidores — CORRIGIDO (contagem pública, identidade privada)**

Ninguém conseguia contar seguidores de pesquisador/campanha — nem o próprio dono — porque RLS filtra linha, e `SELECT count(*)` sempre soma só o que a sessão enxerga (não dá pra fazer isso com policy, só exporia as linhas junto). **Corrigido:** funções novas `contar_seguidores_pesquisador(INT)`/`contar_seguidores_campanha(INT)` (`03`, `SECURITY DEFINER`, mesmo padrão de `usuario_visivel`), com `GRANT EXECUTE` (`06`). Testado: com 4 pessoas seguindo o pesquisador 2, `SELECT count(*) FROM seguir_pesquisador WHERE id_pesquisador=2` (via RLS) devolve só 1 (a própria linha de quem está logado); `contar_seguidores_pesquisador(2)` devolve 4 (o número real). Contagem pública, identidades privadas — igual Catarse e Experiment fazem com contagem de apoiador. Efeito colateral: `idx_seguir_pesquisador_alvo` (`02`), que era índice morto, agora é exatamente o que essas funções usam.

🟢 **19(b). `denuncia.relato` — CORRIGIDO (RF-019/RF-072)**

Coluna `relato TEXT`, nullable, adicionada em `01`. Nome escolhido de propósito pra não colidir com `motivo_denuncia.descricao` (o rótulo do motivo pré-definido) — `relato` é o texto livre do denunciante.

🟢 **19(d). `solicitacao_encerramento.justificativa_admin` — CORRIGIDO (RF-041, a mais urgente das 5)**

Coluna `justificativa_admin TEXT`, nullable, adicionada em `01`. O RF-041 torna obrigatória a justificativa do Administrador ao rejeitar um pedido de encerramento antecipado — antes não existia onde gravar isso.

🟢 **20. Taxa da plataforma carimbada na aprovação — CORRIGIDO (o que o RF-036 pede literalmente)**

`taxa_plataforma` existia mas nada nunca a preenchia — testado direto (criar campanha, aprovar): ela nascia `NULL` e continuava `NULL` depois de aprovada (o seed preenche as 10 campanhas à mão, o que mascarava o problema). **Corrigido:** trigger nova `fn_carimba_taxa_plataforma_aprovacao`/`trg_campanha_carimba_taxa` (`05`) copia `configuracoes.taxa_plataforma_padrao` (5.00) pra `campanha.taxa_plataforma` no momento exato em que `aprovado_em` deixa de ser `NULL` — só se a campanha ainda não tiver uma taxa customizada. Dali em diante, a trigger de congelamento que já existia protege esse valor. Não decide o percentual final (5% segue sendo o valor no seed) — só faz o requisito existir.

🟠 **17. Campanha de usuário excluído — sem código novo, só confirmação por teste**

Não é uma correção nova: a combinação de `pol_campanha_select` (libera por status público) com `usuario_visivel()` (já escondia autor deletado desde o item A9, 27-07-2026) já entrega a anonimização recomendada — campanha preservada, autor anonimizado, histórico financeiro intacto. Ver detalhe no item 17, na seção de pendências (mudou de 🔴 pra 🟠 — falta só formalizar em RF e ajustar o front, não `.sql`).

**Prova mecânica desta parte 3:** `PK_`=39 (igual), `FK_`=56 (igual), `UK_`=19 (igual), `CK_`=15 (igual) — nenhuma constraint nova nesta parte. Parênteses balanceados em `01`, `03`, `04`, `05`, `06` e `07` (saldo zero nos seis). Policies: continua 105 (só editei `pol_score_select`, nenhuma nova). Funções de `05`: 33 (+2: `fn_carimba_taxa_plataforma_aprovacao`, `fn_valida_prazo_campanha_negocio`). Triggers de `05`: 32 (+3: `trg_campanha_carimba_taxa`, `trg_campanha_valida_prazo_negocio`, `trg_campanha_valida_prazo_negocio_update`). `score_config`: 15 linhas (igual, só 2 valores de peso mudaram). `configuracoes`: +4 chaves novas (`prazo_minimo_campanha_dias`, `limite_campanhas_simultaneas`, `limite_endossos_campanha`, `limite_denuncias_24h`), -2 órfãs removidas (`score_custo_denuncia`, `score_custo_denuncia_procedente`). Simulação de score refeita linha a linha pros 4 pesquisadores do teste de faixas: Bruno 100 (Referência, igual), Renata 60 (Confiável, igual), Eduardo 48 (era 46, ainda "Em Construção"), Vinícius 19 (Atenção, igual) — nenhuma faixa mudou.

### parte 4 — prazo 15-60 dias, feature "Em breve", e o resto da Lista C que já dava pra fechar — **todos 🟢 corrigidos no mesmo dia**

*(Você bateu o martelo direto com a Alexia — sem precisar de mais rodada de revisão — no prazo de campanha (60 dias, não 90) e trouxe uma feature nova: campanha pode ser lançada na hora ou agendada, tipo "Em breve" da Catarse. De quebra, resolveu 13(c)/13(d)/15 com respostas curtas dela no WhatsApp, e apareceu um bug real que o Claude dela achou.)*

🟢 **16 (fechamento). Prazo de campanha: 15 a 60 dias, decidido — e feature "Em breve" (rascunho agendado)**

Decisão: qualquer duração entre 15 e 60 dias serve, sem outro critério. `configuracoes.prazo_maximo_campanha_dias` foi de `90` pra `60`. Como várias campanhas do seed (histórico anterior à decisão de hoje) têm duração maior que 60 dias, a trigger de validação de prazo (`trg_campanha_valida_prazo_negocio`) foi desligada só durante a carga do seed — mesmo padrão já usado nas outras triggers de dado histórico do arquivo.

Junto veio a feature nova: o pesquisador escolhe lançar a campanha imediatamente ou agendar um início futuro ("Em breve" — campanha pública, com contador regressivo no front, mas sem poder receber doação ainda). Implementado sem status novo e sem job/cron nenhum:
- `fn_valida_contribuicao_campanha_ativa()` passou a bloquear contribuição também quando `data_inicio` está no futuro (além dos bloqueios que já existiam: status ≠ 'ativo', `data_fim` já passado).
- `fn_congela_regras_campanha()` foi ajustada: `data_inicio`/`data_fim` só congelam quando a campanha **já começou de fato** (`data_inicio` no passado), não mais no momento da aprovação. Enquanto "Em breve", o pesquisador pode reagendar o início livremente — meta/modelo/taxa/título/descrição continuam congelados desde a aprovação, como já era.
- Campanha "Em breve" já aparece publicamente (a policy libera por status, sem olhar `data_inicio`) — a aba "Próximas campanhas"/"Em breve" que você quer no front é só filtrar por `status='ativo' AND data_inicio > NOW()` client-side, nenhuma mudança de banco adicional necessária.

🟢 **13(c). Campanha encerrada antecipadamente vira neutra no score — decisão da Alexia ("pode ser")**

`calcular_score_historico` (`05`) tratava `encerrado` como sucesso pleno (contava no numerador E no denominador da taxa de conclusão). **Corrigido:** `encerrado` saiu dos dois — não é punido nem premiado, só não entra na conta. Não afeta o teste de 4 faixas (nenhum dos 4 pesquisadores desenhados possui campanha `encerrado`).

🟢 **13(d). GitHub passa a pontuar no score — decisão da Alexia ("acho que é só colocar no seed")**

O mecanismo real era mais frágil do que "faltava no seed": `calcular_score_perfil_academico` reconhecia link acadêmico por `ILIKE` no **nome de exibição** do `tipo_link` (`'%linkedin%'`, `'%researchgate%'`, `'%academia%'`, `'%scholar%'`, `'%site%'`) — hardcoded, e GitHub nunca esteve nessa lista, mesmo já existindo no catálogo. **Corrigido de um jeito mais robusto que só "adicionar GitHub à lista":** o reconhecimento passou a comparar por `tipo_link.codigo` (chave estável), e "outro link acadêmico" virou "qualquer tipo_link que não seja Lattes/ORCID" — reconhece GitHub automaticamente, e qualquer tipo novo que entrar no catálogo no futuro, sem precisar editar a função de novo (menos hardcoded, mais modular — no espírito do que você pediu). Testado: nenhum dos 4 pesquisadores do teste de faixas muda de resultado.

🟢 **15. `link_atualizacao`/`link_recompensa` destravadas pra GitHub — decisão da Alexia ("mantém, e configura")**

`tipo_link` ganhou `permite_atualizacao`/`permite_recompensa = TRUE` pro GitHub (exemplo dela: repositório de código como prova de progresso, ou acesso antecipado a repo privado como recompensa). Os outros 4 tipos continuam só com `permite_perfil`. *(Fechamento 28-07-2026, mesmo dia — ver parte 5 mais abaixo: o `tipo_link` reaberto foi resolvido, voltando a 7 tipos — Site Institucional e Outro entraram no catálogo. Um tipo "vídeo"/"YouTube" dedicado, que ela citou como exemplo solto, continua não existindo — mas vira só uma linha de seed nova se um dia for pedido, não mais uma decisão de arquitetura em aberto.)*

🟢 **BUG — `campanha.encerrado_em` nunca era preenchido — encontrado pelo Claude da Alexia, CORRIGIDO**

A coluna (criada em 27-07-2026 pro RF-042/RF-058) nascia e ficava `NULL` pra sempre — nenhuma trigger, função ou `UPDATE` gravava nela quando o status virava `'encerrado'`/`'encerrado_moderacao'`. **Corrigido:** trigger nova `fn_preenche_encerramento_campanha`/`trg_campanha_preenche_encerramento` (`05`) grava `NOW()` automaticamente na transição de status, sem depender do backend lembrar disso em toda rota que muda status. A campanha 7 do seed (única já `'encerrado'`) recebeu o valor explícito no `INSERT` (a trigger só dispara em `UPDATE`), usando a mesma data da decisão de encerramento já registrada em `solicitacao_encerramento`.

**Prova mecânica desta parte 4:** `PK_`=39 (igual), `FK_`=56 (igual), `UK_`=19 (igual), `CK_`=15 (igual) — nenhuma constraint nova. Parênteses balanceados em `01`, `05` e `07` (saldo zero nos três). Funções de `05`: 34 (+1: `fn_preenche_encerramento_campanha`). Triggers de `05`: 33 (+1: `trg_campanha_preenche_encerramento`). `tipo_link`: continua 5 linhas, agora com as 3 colunas de escopo explícitas (antes usavam só o `DEFAULT`). `campanha`: continua 10 linhas, `contribuicao` continua 48 linhas com as mesmas 9 somas batendo exatamente (nada nesta parte tocou nisso). Simulação de score final pros 4 pesquisadores do teste de faixas: Bruno 100, Renata 60, Eduardo 48, Vinícius 19 — idêntico à parte 3, nenhuma faixa mudou com as correções de 13(c)/13(d).

### parte 5 — score_minimo_campanha, rótulo/limite de link, vídeo de campanha e reabertura do tipo_link — **todos 🟢 corrigidos no mesmo dia**

*(Você aplicou direto a sugestão do CLAUDE no item 3, confirmou "sim, mantém" pro item 19(a)/(c), e pediu pra aplicar minha própria sugestão de 7 tipos no `tipo_link` — não havia sugestão do Claude Web registrada sobre esse ponto específico.)*

🟢 **3 (fechamento). `score_minimo_campanha` vira sinal de revisão manual, sem trigger de bloqueio**

`public.fn_precisa_revisao_score(p_id_usuario)` nova em `05` (`[05-I-1]`, `STABLE SECURITY DEFINER`) — retorna `TRUE` se o score do pesquisador estiver abaixo de `configuracoes.score_minimo_campanha`. Nenhuma trigger bloqueia `INSERT` em `campanha` com base nisso — de propósito, seguindo a sugestão do CLAUDE de que o filtro de confiança real é a aprovação manual do Admin, não um score acumulado. O comentário `TODO` do seed foi trocado por um comentário explicando a decisão e apontando pra função.

🟢 **19(a). Rótulo personalizado de link acadêmico + limite configurável**

`link_academico` ganhou coluna `rotulo VARCHAR(100)` (opcional — RF-014/016/018). Trigger nova `fn_valida_limite_link_academico`/`trg_link_academico_valida_limite` (`BEFORE INSERT`, `[05-K-1]`) bloqueia o link além do limite lido de `configuracoes.limite_links_academicos_perfil` (novo, default 5) — mesmo padrão dos outros limites já resolvidos no item 16 (campanhas simultâneas, endossos, denúncias/24h). Nenhum dos 9 links do seed chega perto do limite (o usuário com mais links, 14/Bruno, tem 3).

🟢 **19(c). Vídeo de apresentação da campanha**

`campanha` ganhou coluna `video_apresentacao_url VARCHAR(500)` (opcional, RF-033). Só a URL — nenhum arquivo de vídeo é armazenado pela plataforma. Não entrou na lista de campos que `fn_congela_regras_campanha` protege — pode ser adicionado/trocado a qualquer momento, mesmo com a campanha já ativa.

🟢 **`tipo_link` reaberto para 7 tipos — resolve também o 19(e)**

`SITE_INSTITUCIONAL` e `OUTRO` voltaram ao catálogo (seed de `07`), com `regex`/`dominio = NULL` de propósito (sem domínio fixo pra validar — a validação de formato de URL genérico fica por conta do NestJS) e `permite_perfil = TRUE` (mesmo escopo inicial dos outros 4 tipos de identidade, antes do GitHub abrir escopo pra atualização/recompensa no item 15). Como `calcular_score_perfil_academico` já reconhece "qualquer tipo_link que não seja Lattes/ORCID" (correção do item 13(d), mesma data), os dois tipos novos já pontuam no score automaticamente, sem precisar editar nenhuma função.

**Prova mecânica desta parte 5:** 39 tabelas (igual). `PK_`=39, `FK_`=56, `UK_`=19, `CK_`=15 — todos iguais (nenhuma constraint nova; `rotulo` e `video_apresentacao_url` são colunas simples, sem `CHECK`/`UNIQUE` dedicado). Parênteses balanceados em `01`, `05`, `06` e `07` (saldo zero nos quatro). Funções de `05`: 36 (+2: `fn_precisa_revisao_score`, `fn_valida_limite_link_academico`). Triggers de `05`: 34 (+1: `trg_link_academico_valida_limite`). `tipo_link`: 7 linhas (+2: `SITE_INSTITUCIONAL`, `OUTRO`). `campanha`: continua 10 linhas. `link_academico`: continua 9 linhas (nenhuma usa os 2 tipos novos). Simulação de score pros 4 pesquisadores do teste de faixas: Bruno 100, Renata 60, Eduardo 48, Vinícius 19 — inalterado (nenhum dos quatro depende de `score_minimo_campanha` ou tem link acadêmico afetado pela reabertura do `tipo_link`).

### parte 6 — auditoria de segurança do Claude Web: GRANT UPDATE aberto, texto sem limite, alavancas fantasma — **os 4 achados 🟢 corrigidos no mesmo dia**

*(O Claude Web rodou os 8 arquivos numa base limpa, conferiu a prova mecânica da parte 5 item por item, e depois testou ataques de verdade contra o banco rodando — não só leu o `.sql`. Achou 1 furo real de segurança (grave) e 2 problemas de qualidade. Os 4 itens abaixo eram "Fechar agora, no `.sql` (nenhuma decisão)" da lista dele.)*

🟢 **44. GRANT UPDATE de tabela inteira em `usuario`/`perfil_pesquisador` — FURO DE SEGURANÇA REAL, CORRIGIDO**

O `GRANT SELECT` nas duas já era por coluna (proteção que o projeto tem desde o início), mas o `GRANT INSERT, UPDATE` era de **tabela inteira** — o app conseguia ler só as colunas liberadas, mas escrever em qualquer uma. O Claude Web testou 4 ataques de verdade, como usuário comum autenticado pela aplicação, todos funcionando antes da correção: forjar o próprio `score_atual` pra 100 (o próximo recálculo desfaz, mas entre a forja e o recálculo o Admin via um número falso na fila de curadoria); auto-marcar `email_verificado = TRUE` sem clicar no link (bypass **permanente** — só precisa de um `PATCH /usuario/me` genérico, que é exatamente o que um scaffold de CRUD produz); limpar o próprio `bloqueado_ate`/`tentativas_login_falhas`; e "ressuscitar" a própria conta excluída (`deletado = FALSE`).

**Corrigido, testado pelo Claude Web antes de eu aplicar:**
- `perfil_pesquisador`: `GRANT UPDATE` virou por coluna, mesma lista do `SELECT` **menos** `score_atual`/`score_atualizado_em` — essas 2 só mudam via `recalcular_score_pesquisador()` (`SECURITY DEFINER`), nunca por `UPDATE` direto.
- `usuario`: restringir só por coluna não bastava aqui — `email_verificado`, `tentativas_login_falhas`, `bloqueado_ate`, `ultimo_login_em`, `ultimo_login_ip` e `deletado` são todas escritas legitimamente pelo MESMO `app_nestjs` que atende o endpoint genérico de perfil, então nenhuma lista de colunas separa os dois papéis. Essas 6 colunas saíram do `GRANT` por completo; o `GRANT UPDATE` direto ficou só com `nome`, `id_imagem_perfil`, `senha_hash` (edição de perfil de verdade). As 6 colunas restantes só mudam via 5 funções novas `SECURITY DEFINER` (`03`, bloco `[03-F]`, mesmo padrão de `atribuir_papel_padrao`/`recalcular_score_pesquisador`): `confirmar_email_usuario`, `registrar_falha_login` (incrementa e bloqueia lendo `configuracoes.limite_tentativas_login`/`bloqueio_login_minutos`, configuráveis, sem hardcoded), `liberar_bloqueio_login`, `registrar_login_sucesso` (grava IP/hora e zera o estado de falha) e `excluir_conta_usuario` (RNF-003 — via de mão única, de propósito: não existe função pra "ressuscitar").

🟢 **43. Campos de texto livre sem limite de tamanho — CORRIGIDO (crédito à Alexia no `relato`, ver item 43 no topo do arquivo)**

`denuncia.relato`, `campanha.descricao`, `atualizacao_campanha.conteudo`, `solicitacao_encerramento.justificativa_pesquisador`/`justificativa_admin` e `recompensa.descricao` eram todos `TEXT` sem limite nenhum — vetor de abuso em campo de formulário público (o limite de 5 denúncias/24h não impede megabytes de texto POR denúncia). *(Checagem à parte: o Claude Web também citou `comentario.texto` como possível caso — na verdade a coluna real é `comentario.conteudo VARCHAR(500)`, já bounded desde sempre; não precisou de correção.)*

**Corrigido no mesmo padrão do prazo de campanha (item 16) — limite técnico largo na constraint, limite de negócio configurável via trigger:**
- `CK_..._TAMANHO` novo em cada uma das 6 colunas (`01`) — barra só absurdo (5.000 a 20.000 caracteres conforme o campo).
- Função genérica `fn_valida_limite_texto_livre()` (`05`, `[05-K-1]`) — uma função só, os 6 triggers passam qual coluna e qual chave de `configuracoes` checar via `TG_ARGV`, em vez de 6 funções quase idênticas.
- 5 chaves novas em `configuracoes`, todas editáveis pelo Painel Admin: `limite_caracteres_descricao_campanha` (5000), `limite_caracteres_conteudo_atualizacao` (5000), `limite_caracteres_relato_denuncia` (1000 — sugestão do próprio Claude Web), `limite_caracteres_justificativa_encerramento` (2000, compartilhada pelas 2 colunas de justificativa), `limite_caracteres_descricao_recompensa` (2000).

🟢 **45. Quatro alavancas fantasma em `configuracoes` — CORRIGIDO**

Varredura inversa do Claude Web: pra cada chave em `configuracoes`, quantas vezes ela é lida em algum dos 8 arquivos. 4 não tinham nenhum consumidor — o Admin muda no painel e nada acontece, pior que um valor fixo no código, porque parece que devia funcionar.

- `email_suporte` e `notificar_novas_campanhas`: ficam (são lidas pelo NestJS/worker de e-mail, não pelo banco) — ganharam comentário explícito no seed dizendo isso, pra não parecerem fantasma de novo numa próxima varredura.
- `permitir_campanha_anonima`: **removida**. Não corresponde a nenhuma funcionalidade real — `campanha.id_usuario` é `NOT NULL` (`01`), toda campanha sempre tem pesquisador identificado (é o que a curadoria do RF-068/069 exige). Contribuição anônima já existe e funciona por outro caminho (`contribuicao.token_sessao`) — nada a ver com esta chave.
- `limite_denuncias_suspensao`: **removida**. Nenhuma trigger suspende perfil automaticamente por denúncias procedentes — e não deveria, pelo mesmo raciocínio já aplicado ao score (itens 3/12): suspensão é decisão do Admin via curadoria manual, não automação por contador. Se um dia isso mudar, a chave volta junto com a trigger que vai usá-la.

**Prova mecânica desta parte 6:** 39 tabelas (igual). `PK_`=39 (igual), `FK_`=56 (igual), `UK_`=19 (igual), `CK_`=21 (+6: as 6 `CK_..._TAMANHO`). Parênteses balanceados em `01`, `03`, `05`, `06` e `07` (saldo zero nos cinco — o desbalanceamento de 1 parêntese encontrado no meio da edição, num comentário, foi pego e corrigido antes de fechar). Funções de `03`: 10 (+5: as funções de autenticação, `[03-F]`). Funções de `05`: 37 (+1: `fn_valida_limite_texto_livre`). Triggers de `05`: 40 (+6: os 6 triggers de limite de texto). Policies: continuam 105 (nada mudou em `04` nesta parte — a correção foi 100% em `GRANT`, não em RLS). `configuracoes`: 4 chaves novas (login) + 5 chaves novas (limite de texto) − 2 removidas (fantasma) = líquido +7 linhas. Testado pelo Claude Web, os 4 ataques do achado 44 (forjar score, auto-verificar e-mail, limpar bloqueio, ressuscitar conta): todos `permission denied` depois da correção; editar título/vínculo em `perfil_pesquisador` e `recalcular_score_pesquisador()`/`recalcular_todos_os_scores()` continuam funcionando normalmente (são `SECURITY DEFINER`). Simulação de score pros 4 pesquisadores do teste de faixas: Bruno 100, Renata 60, Eduardo 48, Vinícius 19 — inalterado (nada nesta parte toca as 4 dimensões do cálculo).

### parte 7 — 3ª rodada do Claude Web: SECURITY DEFINER sem checar quem chama, cascata de score nunca contida, 16 FKs sem índice — **os 7 itens da lista dele 🟢 corrigidos no mesmo dia**

*(O Claude Web rodou tudo do zero de novo, confirmou os 4 furos da parte 6 fechados, e foi um passo além: testou as 5 funções novas COMO um atacante testaria — chamando com o id de outra pessoa. Achou que a correção da parte 6 trocou um furo por um pior. Também mediu gravações de banco em vez de só ler código, e achou uma cascata de recálculo de score que ninguém tinha pego em 10 rodadas anteriores.)*

🟢 **46. As 5 funções SECURITY DEFINER de `[03-F]` não checavam quem estava chamando — FURO MAIOR QUE O ORIGINAL, CORRIGIDO**

`SECURITY DEFINER` desliga a RLS — a função vira a ÚNICA guardiã. A 1ª versão (parte 6) aceitava qualquer `p_id_usuario` sem checagem nenhuma. Testado pelo Claude Web como usuário comum (id 9): `confirmar_email_usuario(2)`, `liberar_bloqueio_login(2)` e `excluir_conta_usuario(2)` — todas executavam contra a conta do pesquisador 2. Um usuário comum conseguia excluir a conta de **qualquer outra pessoa**. Pior que o `GRANT UPDATE` de tabela inteira que essas funções vieram substituir (lá pelo menos `pol_usuario_update` restringia a `id_usuario_atual() = id_usuario`).

**Três correções diferentes, testadas pelo Claude Web antes de eu aplicar:**
1. `excluir_conta_usuario`: `IF NOT (p_id_usuario = id_usuario_atual() OR tem_permissao('usuario_excluir'))` — permite a própria conta sempre, conta de outro só com a permissão nova.
2. `liberar_bloqueio_login`: `IF NOT tem_permissao('usuario_desbloquear')` — é sempre ação de suporte/admin sobre outra pessoa, nunca do próprio usuário (quem está bloqueado não consegue logar pra chamar nada).
3. `confirmar_email_usuario(p_id)` virou **`confirmar_email_por_token(p_token_hash)`** — em vez de restringir quem pode chamar com um id, a função para de aceitar um id: recebe o token, resolve o dono sozinha em `verificacao_email` (confere `expira_em`/`confirmado_em`). O segredo vira a autorização — elimina a superfície de ataque em vez de só vigiá-la.
4. `registrar_falha_login`/`registrar_login_sucesso` **não têm como se autorizar** (rodam antes de existir sessão — `id_usuario_atual()` é `NULL` por definição nesse momento). Documentado no `.sql`: são de confiança do backend, e `registrar_falha_login` com id arbitrário é vetor de DoS (bloqueia a conta de qualquer pessoa chamando 5x) — o endpoint de login precisa derivar o id do e-mail do próprio formulário, nunca aceitar um id vindo do cliente.

Duas permissões novas seedadas: `usuario_excluir` e `usuario_desbloquear` — auto-atribuídas ao `admin` (via `trg_admin_recebe_toda_permissao`) e também ao papel `suporte` (que já tinha `sessao_revogar`/`recuperacao_senha_revogar`/`verificacao_email_reenviar` — mesmo escopo de "atendimento de conta"). De quebra: as 5 funções saíram do `EXECUTE`-pra-`PUBLIC` padrão do Postgres (`REVOKE` + `GRANT` só pra `app_nestjs`) — não explorável hoje (só `app_nestjs` conecta ao banco), mas grátis de fechar numa função que apaga conta.

🟢 **47. Cascata de recálculo de score nunca contida — item aberto desde a 1ª análise do Claude Web, CORRIGIDO**

`trg_campanha_recalcula_score` era `AFTER INSERT OR UPDATE OR DELETE` sem `WHEN` — todo `UPDATE` em `campanha` recalculava as 4 dimensões inteiras do score do dono, mesmo quando nada relevante mudou. A cadeia `contribuicao` → `trg_sincroniza_arrecadado_campanha` → `UPDATE campanha` (só `valor_bruto_arrecadado`) → esta trigger disparava um recálculo completo **por doação confirmada**. Medido pelo Claude Web instrumentando as gravações: 5 doações = 20 gravações em `score_pesquisador` (4 por doação) — todas com o mesmo resultado, porque `valor_bruto_arrecadado` não entra em nenhuma das 4 dimensões. Numa campanha com 500 doações seriam 500 recálculos completos, cada um segurando o `FOR UPDATE` da linha da campanha — risco direto pro RNF-006 (confirmação de pagamento em até 30s).

**Corrigido:** Postgres não aceita `TG_OP` dentro de `WHEN`, então não dava pra resolver numa trigger só — split em duas, mesmo padrão já usado em `trg_perfil_update_recalcula_score`: `trg_campanha_recalcula_score` ficou só `AFTER INSERT OR DELETE`; `trg_campanha_recalcula_score_update` é `AFTER UPDATE` com `WHEN (status, data_fim, aprovado_em ou id_usuario mudam)`. Medido depois: 0 gravações de score por doação (era 4); recálculo ao aprovar/encerrar/rejeitar campanha continua disparando normalmente.

🟢 **48. 16 Foreign Keys sem índice — 5 mais importantes corrigidas**

Postgres, diferente de outros bancos, não cria índice automático em coluna de FK. Das 56 FKs do banco, 16 estavam sem. O Claude Web priorizou 5, por impacto real de produto:

- `campanha.id_area_conhecimento` (o mais importante de longe — é a busca pública principal do site, e é justamente a coluna que ganhou 81 valores novos de nível 2 recentemente, item 35 no topo do arquivo).
- `auditoria_financeira.id_contribuicao` (RNF-007, consulta de auditoria).
- `denuncia.id_motivo` e `comentario.id_pesquisador` (painéis de moderação, "meus endossos").
- `area_conhecimento.id_pai` (monta a árvore do seletor — mesmo padrão já usado em `idx_score_config_pai`).

As outras 11 (`campanha.id_admin`, `configuracoes.id_usuario`, `usuario.id_imagem_perfil`, `usuario_papel.id_papel`, `papel_permissao.id_permissao`, `link_academico.id_tipolink`, `historico_rejeicao.id_admin`, `solicitacao_encerramento.id_admin`, `auditoria_financeira.id_usuario_responsavel`, `score_pesquisador.id_rotulo`, `score_pesquisador.id_score_config`) ficam de fora **por decisão, não esquecimento** — são de baixo tráfego ou tabelas pequenas hoje; documentado no `.sql` que a lista existe caso o tráfego mude.

**Prova mecânica desta parte 7:** 39 tabelas (igual). `PK_`=39, `FK_`=56, `UK_`=19, `CK_`=21 — todos iguais (nenhuma constraint nova; índice não é constraint). Parênteses balanceados em `01`, `02`, `03`, `04`, `05`, `06`, `07` e `08` (saldo zero nos oito). Índices: 42 (+5: os 5 de FK, ver item 48). Policies: continuam 105. Permissões: 31 (+2: `usuario_excluir`, `usuario_desbloquear`) — *(correção: o resumo original desta parte 7 tinha dito 29 por engano de contagem manual; o Claude Web conferiu direto no banco rodando e achou 31, meu `awk` de verificação tinha um bug de âncora. 31 é o número certo — ver errata na parte 8, abaixo.)* Funções de `03`: 11 (+1: `config_numero` migrou do `05` pra cá, ver `[03-C]`; a troca de `confirmar_email_usuario` por `confirmar_email_por_token` não muda a contagem, é a mesma função com nome/assinatura novos). Funções de `05`: 36 (−1: `config_numero` saiu). Triggers de `05`: 41 (+1: `trg_campanha_recalcula_score_update`). Testado pelo Claude Web: os 4 testes de ataque do achado 46 (forjar/auto-verificar/desbloquear/excluir conta de outra pessoa) — todos `permission denied` depois da correção; editar o próprio nome e o fluxo de login (5 falhas bloqueia, sucesso zera e grava IP) continuam funcionando. Limite de texto (item 43, parte 6) reconferido: 1500 chars com config 1000 barra, 900 passa, subir a config pra 3000 libera 1500 na hora. Simulação de score pros 4 pesquisadores do teste de faixas: Bruno 100, Renata 60, Eduardo 48, Vinícius 19 — inalterado (a correção da cascata muda QUANDO o score recalcula, não o valor final — `recalcular_score_pesquisador` é idempotente, sempre lê o estado atual da tabela).

### parte 8 — 4ª rodada do Claude Web: exclusão sem rastro (LGPD Art. 37) e 3 funções privilegiadas ainda em PUBLIC — **os 2 achados 🟢 corrigidos no mesmo dia**

*(O Claude Web confirmou os 7 itens da parte 7 com teste real — incluindo `confirmar_email_por_token` sozinho contra reuso de token, token expirado e token inexistente — e depois foi mais fundo em duas frentes que sobraram: quem pode excluir conta e fica sem registro, e quais funções que escrevem ainda estão com `EXECUTE` liberado pra `PUBLIC`. Ele também testou a "cara pública do site" pela primeira vez — visitante anônimo vê exatamente campanha/área/atualização/comentário/perfil/link, e nada de score/contribuição/denúncia/notificação/repasse/auditoria/sessão — confirmando que a fronteira público/privado está limpa.)*

🟢 **49. `excluir_conta_usuario` não deixava rastro de quem excluiu — furo de conformidade LGPD, CORRIGIDO**

A função gravava `deletado = TRUE` e nada mais. Combinado com `usuario_excluir` estar concedida ao papel `suporte` (parte 7), um atendente podia excluir a conta de qualquer pesquisador sem deixar registro de quem fez nem quando — se alguém reclamasse que a conta sumiu, não haveria como saber se foi pedido próprio, engano, ou má-fé. O Art. 37 da LGPD exige registro das operações de tratamento, e exclusão é a mais sensível de todas.

**Corrigido, duas partes:**
1. `usuario` ganhou `deletado_em TIMESTAMP` e `deletado_por INT REFERENCES usuario` (`01`) — preenchidas pela própria `excluir_conta_usuario()` (`deletado_por = id_usuario_atual()`), nunca por `UPDATE` direto do app (mesma proteção das outras colunas de auth). Leitura liberada no `GRANT SELECT` de `usuario` (`06`), pro Admin conseguir ver a trilha.
2. **Decisão de produto, junto:** `usuario_excluir` saiu do papel `suporte` — Catarse e Experiment tratam exclusão de conta como auto-serviço do titular (que já funciona sem nenhuma permissão, é só `p_id_usuario = id_usuario_atual()`); suporte abre chamado, não executa. Só o `admin` mantém a permissão agora (automática via `trg_admin_recebe_toda_permissao`); `suporte` ficou só com `usuario_desbloquear`, que é a ação de atendimento de verdade.

🟢 **50. Três funções privilegiadas que escrevem ainda estavam com `EXECUTE` liberado pra `PUBLIC` — CORRIGIDO**

A rodada anterior (parte 7) fez `REVOKE EXECUTE ... FROM PUBLIC` nas 5 funções de `[03-F]`, mas ficaram de fora 3 que também escrevem no banco: `atribuir_papel_padrao(INT)` (`08`, escreve em `usuario_papel`), `recalcular_score_pesquisador(INT)` e `recalcular_todos_os_scores()` (`05`, escrevem em `score_pesquisador`/`perfil_pesquisador`). A última é a mais séria das três mesmo com risco "baixo" — sem custo de chamada nenhum pra quem chama, é negação de serviço barata deixada aberta (percorre todos os pesquisadores a cada chamada, bastaria um laço). Hoje não é explorável (só `app_nestjs` conecta ao banco), mas o Claude Web notou certo: já que o `REVOKE` foi feito pras 5, deixar essas 3 de fora só cria a pergunta "por que essas sim e essas não" daqui a uns meses. **Corrigido:** `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT` só pra `app_nestjs` nas 3, mesmo padrão das 5 anteriores. As outras 11 funções `SECURITY DEFINER` que continuam em `PUBLIC` são só leitura (`tem_permissao`, `usuario_visivel`, `config_numero`, os 4 calculadores de dimensão de score, os contadores de seguidores, `fn_precisa_revisao_score`) — sem risco de escrita, ficam como estão.

**Errata da parte 7:** a prova mecânica anterior reportou `permissao` com 29 linhas; o número certo, confirmado pelo Claude Web rodando o banco de verdade, é **31** (meu script de verificação tinha um bug de âncora que cortava a contagem cedo demais — corrigido no comando usado nesta parte). Não houve nenhuma linha perdida ou duplicada, foi só erro de relatório, não de dado.

**Prova mecânica desta parte 8:** 39 tabelas (igual). `PK_`=39 (igual), `FK_`=**57** (+1: `FK_USUARIO_DELETADO_POR`), `UK_`=19 (igual), `CK_`=21 (igual — `deletado_em`/`deletado_por` são colunas simples, sem `CHECK` dedicado). Parênteses balanceados nos 8 arquivos (saldo zero, reconferido depois de cada edição). Policies: continuam 105. Índices: continuam 42. Permissões: continuam 31 (nenhuma nova nesta parte, só removida a associação `('suporte', 'usuario_excluir')` de `papel_permissao` — `suporte` ficou com 4 permissões, era 5). Funções de `03`: continuam 11 (nenhuma função nova, só corpo/comentário de `excluir_conta_usuario` mudou). `GRANT EXECUTE` com `REVOKE ... FROM PUBLIC` explícito: 8 funções agora (as 5 da parte 7 + as 3 desta parte). Simulação de score pros 4 pesquisadores do teste de faixas: Bruno 100, Renata 60, Eduardo 48, Vinícius 19 — inalterado (nada nesta parte toca dado de score, só metadado de exclusão de conta e permissão de execução).

### parte 9 — 5ª auditoria do Claude Web: uma cadeia de fraude completa, achada simulando jornadas reais de usuário — **os 5 achados + os 2 reparos de documentação 🟢 corrigidos no mesmo dia**

*(Você pediu pro Claude Web "pensar fora da caixa" e simular jornadas — visitante navegando, mestre virando pesquisador, usuário mal-intencionado, admin no dia a dia — em vez de só ler o `.sql`. Foi exatamente isso que achou os dois furos mais graves de toda a revisão: nenhuma das 4 auditorias anteriores os pegou, porque cada `UPDATE` isolado parecia legítimo — só a sequência completa virava fraude.)*

🟢 **51 (CRÍTICO 1). Auto-aprovação de campanha — cadeia de fraude, parte 1/2, CORRIGIDA**

Reproduzido pelo Claude Web: um pesquisador comum, dono da própria campanha em `aguardando_aprovacao`, executava `UPDATE campanha SET status='ativo', aprovado_em=NOW(), id_admin=<ele mesmo>` — e funcionava. `trg_campanha_carimba_taxa` ainda carimbava `taxa_plataforma=5.00` sozinha, deixando a campanha fraudulenta indistinguível de uma aprovada de verdade. Causa: `pol_campanha_update` (04) libera `UPDATE` pro dono, e `fn_congela_regras_campanha` só protege a partir do momento em que `OLD.status` já está na lista congelada — `'aguardando_aprovacao'` não está. Nenhuma trigger protegia especificamente QUEM pode mudar `status`/`aprovado_em`/`id_admin`.

**Corrigido:** `fn_valida_transicao_campanha()`/`trg_campanha_valida_transicao` (`05`, `[05-K-2]`), mesmo padrão de `fn_valida_transicao_solicitacao` que já existia. Libera, nesta ordem: (1) nenhum dos 3 campos sensíveis mudou — sai cedo; (2) quem tem `campanha_aprovar`/`campanha_rejeitar`/`solicitacao_encerramento_decidir` pode qualquer transição; (3) encerramento por prazo vencido, **autoverificável** (sem depender de permissão nem de um "usuário de sistema" — a condição confere `valor_bruto_arrecadado` vs `meta_financeira` contra o próprio dado, impossível de mentir); (4) dono reenviando campanha rejeitada (RF-070), só a transição `rejeitado → aguardando_aprovacao`. Qualquer outra tentativa: bloqueada. Testado pelo Claude Web: bloqueia auto-aprovação e "sucesso" forjado; libera o job de prazo, o admin e o reenvio.

🟢 **52 (CRÍTICO 2). Qualquer usuário confirma qualquer contribuição — cadeia de fraude, parte 2/2, CORRIGIDA**

Reproduzido: fraudador doa R$ 9.000 pra própria campanha (`status='pendente'`), executa `UPDATE contribuicao SET status='confirmado'`, e `trg_sincroniza_arrecadado_campanha` soma o valor de verdade em `campanha.valor_bruto_arrecadado` — a página pública passa a exibir R$ 9.000 arrecadados sem nenhum pagamento real. Combinada com o achado 51, a cadeia completa: criar campanha → auto-aprovar (51) → doar pra si mesmo → auto-confirmar (52) → prova social falsa pública, pronta pra atrair doações de gente de verdade. Causa: `pol_contribuicao_update` (04) é `USING(true)` com `GRANT UPDATE` de tabela inteira.

**Corrigido, mesmo padrão de `[03-F]`:** `atualizar_status_contribuicao(p_id, p_status, p_id_transacao DEFAULT NULL)` nova (`05`, `SECURITY DEFINER`, `[05-K-2]`) — `status`/`id_transacao_api` saem do `GRANT UPDATE` de `contribuicao` (`06`, `[06-H]`), só mudam por essa função dali em diante. Documentada como pré-autorização (webhook do gateway de pagamento, sem sessão de usuário — mesma categoria de `registrar_falha_login`/`registrar_login_sucesso`). **Estendido também a `repasse`** (`pol_repasse_update` também é `USING(true)`, e é dinheiro saindo): `atualizar_status_repasse()` nova, mesmo padrão. `auditoria_financeira` e `historico_rejeicao` ficam como estão por enquanto (item 9, decisão consciente). Testado: bloqueia o fraudador (mensagem de permissão negada — `GRANT UPDATE` nem existe mais pra tentar), o webhook legítimo continua funcionando.

🟢 **53 (MÉDIO 3). `meta_financeira` sem mínimo — CORRIGIDA**

Campanha com meta `0.00` era aceita (existia uma no banco de teste do Claude Web) — sem `CHECK` e sem chave de configuração. Numa `all-or-nothing`, meta zero é sucesso instantâneo (a primeira contribuição confirmada já bate a meta). Mesmo padrão do prazo (item 16): `CK_CAMPANHA_META_FINANCEIRA_POSITIVA` nova (`01`, limite técnico largo, só `> 0`) + `configuracoes.meta_minima_campanha` (500,00) validada por `fn_valida_meta_campanha_negocio()`/2 triggers (`05`, `[05-K-2]`) — mudar o mínimo de negócio vira um `UPDATE` numa linha.

🟢 **54 (MÉDIO 4). O papel `'pesquisador'` nunca era atribuído pelo app — CORRIGIDA**

Achado na jornada "usuário com mestrado vira pesquisador": a Marina (simulada pelo Claude Web) criou o `perfil_pesquisador` e continuou só com o papel `'usuario'`. O seed atribui `'pesquisador'` aos 11 pesquisadores semeados (dado histórico), mas nada no fluxo real do app fazia essa atribuição. Hoje não quebrava nada (o papel nasce com 0 permissões, as policies checam a existência do `perfil_pesquisador`, não o papel) — mas criava duas realidades diferentes no banco, e viraria bug silencioso no dia em que alguém desse a primeira permissão ao papel `'pesquisador'`. **Corrigido:** `fn_atribuir_papel_pesquisador()`/`trg_perfil_atribui_papel_pesquisador` (`05`, `AFTER INSERT` em `perfil_pesquisador`, `SECURITY DEFINER` — mesmo "ovo e galinha" de `atribuir_papel_padrao`, `08`) — mantém o invariante "tem perfil ⇔ tem o papel".

🟢 **55 (MENOR 5). Moderador podia julgar a própria denúncia — CORRIGIDA**

Reproduzido: Diego (moderador) criou uma denúncia contra um pesquisador e a marcou como `'resolvida'` — o que custa 4 pontos de score ao alvo (`calcular_score_reputacao`). `pol_denuncia_update` checa a permissão `denuncia_responder`, mas não checa se quem julga é o próprio denunciante. Mesmo tipo de conflito de interesse que `validar_comentario_autor()` já bloqueia pra auto-endosso. **Corrigido:** `fn_valida_denuncia_sem_autojulgamento()`/`trg_denuncia_sem_autojulgamento` (`05`, `[05-K-3]`, `BEFORE UPDATE` quando `status` muda) — bloqueia qualquer transição de status feita pelo próprio `id_usuario` (denunciante) da linha.

🟢 **56. Documentação — contradição de contagem + 3 blocos do seed sem cobertura, CORRIGIDA**

`DOCUMENTACAO_BD.md` tinha uma contradição interna no capítulo do `05`: a Visão Geral dizia "36 funções e 41 triggers", mas a seção de Idempotência, no mesmo capítulo, ainda dizia "33 triggers" (contagem antiga, nunca atualizada). Corrigido — as duas linhas agora dizem 42/46 (números reais depois desta rodada). Além disso, 3 blocos que existem de verdade no `07_seed_dados.sql` — `[07-D-6]` (`termos_de_uso`/`usuario_termo`), `[07-D-7]` (`notificacao`) e `[07-H-3]` (`aceite_termo_contribuicao`) — não apareciam na tabela de ordem de execução nem no detalhamento do capítulo 07. São justamente a trilha que sustenta o RF-011/054/055. Adicionados na posição física correta. *(O Claude Web também citou um suposto bloco `[07-J]` como não documentado — na verdade não existe nenhum bloco `[07-J]`; era uma referência quebrada dentro de um comentário do próprio `.sql`, corrigida pra apontar pro lugar certo, `05_regras_negocio.sql [05-I-4]`.)* De quebra, dois textos desatualizados foram corrigidos no mesmo capítulo: a nota sobre por que a ordem do seed não é alfabética, e o bullet do `[07-C-5]`, ambos ainda citando a chave `limite_denuncias_suspensao`, removida numa rodada anterior (item 45).

**Prova mecânica desta parte 9:** 39 tabelas (igual). `PK_`=39 (igual), `FK_`=57 (igual), `UK_`=19 (igual), `CK_`=**22** (+1: `CK_CAMPANHA_META_FINANCEIRA_POSITIVA`). Parênteses balanceados nos 8 arquivos (saldo zero). Policies: continuam 105 (nenhuma mudou — as 2 policies de escrita superadas, `pol_contribuicao_update`/`pol_repasse_update`, ganharam só comentário explicando que ficaram sem efeito prático, não foram removidas). Índices: continuam 42. Permissões: continuam 31 (nenhuma nova). `configuracoes`: 32 linhas (+1: `meta_minima_campanha`). Funções de `05`: 42 (+6: `fn_valida_transicao_campanha`, `atualizar_status_repasse`, `atualizar_status_contribuicao`, `fn_valida_meta_campanha_negocio`, `fn_atribuir_papel_pesquisador`, `fn_valida_denuncia_sem_autojulgamento`). Triggers de `05`: 46 (+5: `trg_campanha_valida_transicao`, `trg_campanha_valida_meta_negocio`, `trg_campanha_valida_meta_negocio_update`, `trg_perfil_atribui_papel_pesquisador`, `trg_denuncia_sem_autojulgamento`). Reprodução da cadeia de fraude original, passo a passo, depois da correção: passo 2 (auto-aprovação) → bloqueado com exceção — a cadeia para exatamente aí, nunca chega ao passo 4 (auto-confirmar contribuição), que também está bloqueado independentemente (GRANT revogado). Simulação de score pros 4 pesquisadores do teste de faixas: Bruno 100, Renata 60, Eduardo 48, Vinícius 19 — inalterado (nenhuma correção desta parte toca as 4 dimensões de cálculo).

### parte 10 — 6ª auditoria do Claude Web: as 5 correções da parte 9 confirmadas + o encerramento automático de campanha não tinha caminho — **o único achado 🟢 corrigido no mesmo dia, + 2 registros de documentação**

*(O Claude Web rodou tudo de novo, confirmou as 5 correções da parte 9 uma por uma — inclusive testando os 4 ramos da `trg_campanha_valida_transicao` isoladamente como superusuário — e foi um passo além: simulou o cron do RF-037 (encerramento automático de campanha vencida) rodando de verdade, sem sessão de usuário, como um job de fundo roda na prática.)*

🟢 **58. Encerramento automático de campanha vencida (RF-037) não tinha caminho nenhum — CORRIGIDO**

Reproduzido: um job rodando como `app_nestjs` sem `app.id_usuario_atual` definido (exatamente como um cron roda) executava `UPDATE campanha SET status='sucesso' WHERE <vencida, meta batida>` e `UPDATE campanha SET status='nao_atingido' WHERE <vencida, meta não batida>` — as duas devolviam `UPDATE 0`, **sem erro nenhum**. Causa: não é a `trg_campanha_valida_transicao` (item 51, parte 9) — o Claude Web testou o ramo autoverificável dela isoladamente, rodando como superusuário, nos 4 casos possíveis (prazo vencido + meta batida → `sucesso` ✅; prazo vencido + meta não batida → `nao_atingido` ✅; tentando mentir, sucesso sem meta → bloqueado ✅; admin com sessão → passa ✅) — a trigger está certa. A causa é `pol_campanha_update` (04): exige ser dono OU ter `campanha_editar`/`campanha_aprovar`/`campanha_rejeitar` — um job não é nenhum dos dois, então a RLS filtra **todas** as linhas antes mesmo da trigger avaliar qualquer coisa. Modo de falha mais perigoso que existe: silencioso — um cron reportaria "ok" toda madrugada sem encerrar nenhuma campanha vencida, que ficaria `'ativo'` pra sempre (página pública com contador regressivo negativo, recusando doações novas com "prazo já encerrado" — o doador veria uma campanha aberta rejeitando o próprio dinheiro).

**Corrigido, mesmo padrão de `atualizar_status_contribuicao`/`atualizar_status_repasse` (parte 9):** `encerrar_campanhas_vencidas()` nova (`05`, `SECURITY DEFINER`, `[05-K-2]`) — percorre `campanha` com `status='ativo' AND data_fim <= NOW()`, marca `'sucesso'` ou `'nao_atingido'` conforme `valor_bruto_arrecadado` vs `meta_financeira`, retorna a quantidade de linhas afetadas (`GET DIAGNOSTICS`) pro job poder logar de verdade. `SECURITY DEFINER` bypassa a RLS, não a trigger — `trg_campanha_valida_transicao` continua rodando por baixo, validando cada transição pelo mesmo ramo autoverificável de sempre (nem a trigger nem a policy foram afrouxadas). `REVOKE EXECUTE FROM PUBLIC` + `GRANT` só `app_nestjs`, mesma higiene das outras funções pré-autorizadas.

**Bug relacionado, achado ao implementar a correção acima:** `fn_preenche_encerramento_campanha` (item do dia 28-07, resolvido nas partes anteriores) só preenchia `encerrado_em` quando o status entrava em `'encerrado'`/`'encerrado_moderacao'` — mas o próprio comentário da coluna (`[01-E]`) sempre disse "registra a data real de encerramento (**natural**, antecipado ou por moderação)". Faltava o encerramento "natural" de verdade: `'sucesso'`/`'nao_atingido'`. Ninguém tinha percebido porque, até `encerrar_campanhas_vencidas()` existir, nada no `.sql` fazia essa transição via `UPDATE` (o seed grava o status final direto no `INSERT`, que não dispara a trigger). **Corrigido junto:** a condição da trigger passou a incluir os 4 status de encerramento, não só os 2 de moderação/antecipação.

**Registro 1 (não é bug, é decisão pendente):** item 57, no topo deste arquivo — só o `admin` tem as 3 permissões que a trigger de transição aceita; o `moderador` julga denúncia procedente e não consegue executar o RF-079 (encerrar a campanha denunciada) sozinho. Aguardando decisão de vocês dois.

**Registro 2 (documentação, sem mudança de código):** com a trigger de transição em vigor, qualquer `UPDATE` manual em `campanha` sem `app.id_usuario_atual` definido na sessão — inclusive um superusuário corrigindo dado no SQL Editor — falha silenciosamente (`UPDATE 0`, sem erro). Comportamento correto (toda aprovação precisa ser atribuível a alguém), mas precisa estar escrito: adicionado um aviso no cabeçalho de `05_regras_negocio.sql` e um item novo (8) em `tutorial-rodar-projeto.md`, cobrindo também o worker de notificação (mesmo tema).

**Prova mecânica desta parte 10:** 39 tabelas (igual). `PK_`=39, `FK_`=57, `UK_`=19, `CK_`=22 — todos iguais (nenhuma constraint nova). Parênteses balanceados nos 8 arquivos. Policies: continuam 105. Índices: continuam 42. Permissões: continuam 31. `configuracoes`: continuam 32 linhas. Funções de `05`: **43** (+1: `encerrar_campanhas_vencidas`). Triggers de `05`: continuam 46 (nenhuma trigger nova — só o corpo de `fn_preenche_encerramento_campanha` mudou, mesma trigger `trg_campanha_preenche_encerramento` de antes). Teste novo, conforme pedido: campanha vencida com meta batida → `encerrar_campanhas_vencidas()` → vira `'sucesso'`; campanha vencida sem bater a meta → vira `'nao_atingido'`; tentativa de a função marcar `'sucesso'` numa que não bateu a meta → a própria lógica da função impede (o `CASE` só escolhe `'sucesso'` quando `valor_bruto_arrecadado >= meta_financeira`, não há como a função "mentir" nem que quisesse). Simulação de score pros 4 pesquisadores do teste de faixas: Bruno 100, Renata 60, Eduardo 48, Vinícius 19 — inalterado.

### parte 11 — reversão consciente: score volta a ser público, decisão de produto (não achado de auditoria) — **30-07-2026**

*(Diferente de tudo até aqui, isto não é um bug encontrado nem uma auditoria do Claude Web — é o Lucas revertendo, de propósito, uma correção de segurança anterior (item 12/31 da Lista C, 28-07-2026), porque decidiu que o score do pesquisador vai ser público: base de um segundo app do projeto, "Serasa do Pesquisador", consulta pública de reputação de pesquisadores cadastrados.)*

🟢 **12/31 (reaberto e revertido de propósito) — Score volta a ser público**

`pol_score_select` (`04`) deixa de exigir `id_usuario = id_usuario_atual() OR tem_permissao('score_visualizar')` e passa a usar `public.usuario_visivel(id_usuario)` — a mesma função já usada por `pol_perfil_select`/`pol_link_select` (`[03-D]`), em vez de reintroduzir o `USING (TRUE)` cru original. Efeito: score de qualquer pesquisador fica público (mesmo sem login), exceto de conta deletada (mantém o fechamento do item 31). `perfil_pesquisador.score_atual`/`score_atualizado_em` voltam ao `GRANT SELECT` (`06`, `[06-D-2]`) — a "porta dos fundos" fechada em 28-07 deixou de fazer sentido como restrição, já que a tabela-fonte é pública de novo; volta só por conveniência (evita join). `GRANT UPDATE` dessas 2 colunas continua fora (integridade de escrita, tema à parte, não mudou). Nenhuma tabela, coluna, função ou trigger nova — só policy e grant. Ver item **59** (pendências) para o que fica em aberto: o risco de LGPD que motivou o fechamento original não foi mitigado, só conscientemente aceito.

**Prova mecânica desta parte 11:** 39 tabelas (igual). `PK_`=39, `FK_`=57, `UK_`=19, `CK_`=22 — todos iguais (nenhuma constraint tocada). Parênteses balanceados em `04` e `06` (saldo zero, conferido). Policies: continuam 105 (só o corpo de `pol_score_select` mudou, a policy em si já existia). Índices: continuam 42. Permissões: continuam 31 (`score_visualizar` permanece seedada e atribuída — só deixou de ser o único caminho de leitura; ainda serve pra distinguir quem pode editar score de config/rótulo). `configuracoes`: continuam 32 linhas. Funções/triggers de `05`: sem mudança (43/46). Teste: usuário 17 (marcado deletado no seed) — `SELECT * FROM score_pesquisador WHERE id_usuario = 17` continua devolvendo 0 linhas mesmo sem login; usuário 2 (ativo) — mesma consulta devolve as linhas normalmente sem sessão nenhuma. Simulação de score pros 4 pesquisadores do teste de faixas: Bruno 100, Renata 60, Eduardo 48, Vinícius 19 — inalterado (mudança é só de visibilidade, não de cálculo).

### parte 12 — RF-084 não tinha implementação nenhuma: nem suspensão, nem cascata — **construído do zero, 30-07-2026**

*(Perguntei ao Lucas o que fazer quando o Claude Web sinalizou que RF-084 podia estar sem lastro no banco — ele escolheu "fecha em cascata" (a opção que o próprio RF-084 já descreve) em vez de só corrigir o texto do requisito. Ao investigar pra implementar, achei que o problema era maior do que "falta a cascata": não existia NENHUM caminho no banco pra suspender um pesquisador — só ele mesmo, por auto-serviço.)*

🟢 **RF-084 — suspensão de pesquisador e cascata sobre campanhas, CONSTRUÍDO**

**O que existia antes de hoje:** `status_pesquisador` (`perfil_pesquisador`) só podia mudar via `pol_perfil_update` (04) — `USING (id_usuario = id_usuario_atual())`, ou seja, só o próprio dono do perfil. Não havia função, policy nem gatilho que desse a um Admin/moderador o poder de suspender outra pessoa. `usuario_suspender` já existia como permissão seedada (só pro admin) e já era citada dentro de `pol_usuario_update` (04) — mas nada nunca lia essa permissão pra decidir uma escrita de verdade; era uma alavanca fantasma, mesma classe de achado do item 13 (quinto ponto).

**Construído:** `suspender_pesquisador(p_id_usuario INT) RETURNS BOOLEAN` (`03`, `SECURITY DEFINER`, novo bloco `[03-G]`) — exige `tem_permissao('usuario_suspender')` (reaproveitando a permissão que já existia, agora com uso real), marca `perfil_pesquisador.status_pesquisador = 'suspenso'`, e na mesma transação fecha em cascata: campanhas `'ativo'` do pesquisador viram `'encerrado_moderacao'`, campanhas `'aguardando_aprovacao'` viram `'rejeitado'`. `status_pesquisador` saiu do `GRANT UPDATE` genérico de `perfil_pesquisador` (`06`) — sem isso, o próprio pesquisador conseguiria se auto-reativar (ou se auto-suspender por engano) por fora da função, driblando a cascata inteira. `REVOKE EXECUTE FROM PUBLIC` + `GRANT` só `app_nestjs`, mesma higiene de sempre.

**O detalhe que quase quebrou tudo, achado ANTES de virar bug (mesmo raciocínio do item 58, parte 10):** `SECURITY DEFINER` bypassa RLS, mas não bypassa trigger — `trg_campanha_valida_transicao` (05) continuaria rodando dentro da função e bloquearia as duas transições (`ativo→encerrado_moderacao`, `aguardando_aprovacao→rejeitado`) porque nem toda sessão que pode suspender um pesquisador necessariamente tem `campanha_editar`/`campanha_aprovar`/`campanha_rejeitar`. Corrigido junto, não depois: `fn_valida_transicao_campanha()` ganhou um 5º ramo autoverificável — libera exatamente essas duas transições, sem checar permissão nenhuma de quem está executando, só o fato de `perfil_pesquisador.status_pesquisador` do dono da campanha já estar `'suspenso'` (e isso só existe se passou por `suspender_pesquisador()`, o único caminho que escreve esse valor).

**Prova mecânica desta parte 12:** 39 tabelas (igual, nenhuma nova). `PK_`=39, `FK_`=57, `UK_`=19, `CK_`=22 — todos iguais. Parênteses balanceados em `03`, `05` e `06` (saldo zero, conferido nos três). Policies: continuam 105 (nenhuma nova; `pol_campanha_update`/`pol_perfil_update` não foram tocadas — a cascata passa por cima da RLS via `SECURITY DEFINER`, não por mudar policy). Índices: continuam 42. Permissões: continuam 31 (`usuario_suspender` já existia — passou a ter uso, não é permissão nova). `configuracoes`: continuam 32 linhas. Funções de `03`: +1 (`suspender_pesquisador`). Funções de `05`: continuam 43 (só o corpo de `fn_valida_transicao_campanha` mudou, função já existia). Triggers: sem mudança (46). Teste mental dos 2 ramos: pesquisador com 1 campanha `ativo` (meta não batida, prazo não vencido) e 1 `aguardando_aprovacao` → depois de `suspender_pesquisador(id)`, a `ativo` vira `encerrado_moderacao` e a `aguardando_aprovacao` vira `rejeitado`, sem exigir nenhuma permissão de campanha de quem chamou a função — só `usuario_suspender`. Chamar a função de novo no mesmo pesquisador já suspenso devolve `FALSE` sem tocar em nada (idempotente, não fecha campanhas que já foram reabertas manualmente por engano). Ver item **60** (pendências): falta a função simétrica de reativação — decisão em aberto se suspensão deve ou não ser reversível.


## 🗓️ 27-07-2026

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

🟢 **A10. Comentários/permissões órfãs sem explicação** — **Corrigido:** comentário novo em `07` explicando que `recuperacao_senha_revogar`/`sessao_revogar`/`verificacao_email_reenviar` são propositalmente sem policy (camada NestJS), e que `perfil_pesquisador_visualizar_sensivel` hoje não tem efeito nenhum (`cpf_criptografado` nem está no `GRANT SELECT`) *(nota 28-07-2026: isso mudou — ver item 41, mais acima)*. *(A contagem de 105 policies no cabeçalho do `04` já estava certa — conferido com `grep`, não havia 106 como uma das revisões cogitou; nada foi mudado aí.)*

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


## Resolvidos mais antigos (pré-27-07-2026, sem rodada de data específica)

### 🟢 Permissão `campanha_encerrar` sem policy de RLS — **[RESOLVIDO]**

Decidido **remover** a permissão (era órfã, nunca usada por nenhuma policy) em vez de implementar um atalho de encerramento direto.

**5 permissões sem policy de RLS que motivaram essa revisão:** `campanha_encerrar`, `perfil_pesquisador_visualizar_sensivel`, `sessao_revogar`, `recuperacao_senha_revogar`, `verificacao_email_reenviar`.

Pergunta original: dava pra mandar a IA do VSCode "consertar" isso de uma vez? Não é tão simples quanto parece — não é "esqueceu de escrever a policy", é que ninguém tinha decidido ainda o que cada permissão deveria liberar. Mandar a IA "consertar" sem isso é arriscado: ela teria que adivinhar a regra, e podia acertar errado.

Separando as 5:

- **`sessao_revogar`, `recuperacao_senha_revogar`, `verificacao_email_reenviar`** — essas 3 tabelas já têm policy `FOR ALL USING (true)` de propósito (o próprio projeto decidiu que a autorização desses fluxos fica no NestJS, não na RLS, porque acontecem antes do login existir). Criar uma policy pra essas permissões seria redundante — não muda nada. Não vale a pena mexer.

- 🟢 **`perfil_pesquisador_visualizar_sensivel` — CORRIGIDO em 28-07-2026 (item 41, ver seção "28-07-2026" acima):** texto original dizia "já está resolvida" porque o `cpf_criptografado` foi excluído do `GRANT SELECT` geral, e criar uma policy de RLS pra isso não encaixaria bem (é proteção de coluna, não de linha). Segunda opinião (27-07-2026) apontou o problema real: como `cpf_criptografado` não estava em nenhum `GRANT SELECT`, **ninguém lia essa coluna** — não "só o admin lê", nem o `app_nestjs` conseguia. O RF-015 diz que o CPF é armazenado "para fins de verificação de identidade" (KYC da API de pagamento) — se o backend não conseguisse nem selecionar a coluna, não tinha como mandar esse dado pra API configurar o recebimento do pesquisador. **Resolvido:** `cpf_criptografado` entrou no `GRANT SELECT` de `perfil_pesquisador` — a permissão passa a ter uso real, gateando a leitura dessa coluna no NestJS (trabalho de aplicação, fora do `.sql`).

- **`campanha_encerrar`** — essa era a única em aberto de verdade. Decisão tomada:
  - **Como era:** a permissão existia (`07_seed_dados.sql`, atribuída ao papel `admin`), mas nenhuma policy de RLS a usava — não fazia nada na prática.
  - **As duas opções que estavam na mesa:** (a) ela era redundante com `solicitacao_encerramento_decidir` (que já existe, já funciona, já registra justificativa) — nesse caso, só remover; (b) ela deveria virar um atalho de encerramento direto via `UPDATE`, sem passar pela solicitação formal — nesse caso, precisaria de uma policy nova.
  - **Como decidimos:** olhando como Catarse e Experiment (referências do projeto) tratam encerramento de campanha — nenhuma das duas dá a um admin um botão de "encerrar na marra" sem justificativa, exatamente porque tem dinheiro de apoiador envolvido e isso precisa ser auditável. O projeto já tem o fluxo certo (`solicitacao_encerramento` + `historico_rejeicao`, com justificativa registrada); criar um atalho paralelo enfraqueceria esse rastro sem necessidade real.
  - **O que foi feito:** `campanha_encerrar` foi removida de `07_seed_dados.sql` (do `INSERT INTO permissao` e do `INSERT INTO papel_permissao` que a dava ao admin). Como a permissão nunca era checada em nenhuma policy, essa remoção não muda nenhum comportamento do sistema hoje — só elimina uma permissão morta.
  - **O que isso significa daqui pra frente:** encerrar uma campanha antes do prazo natural só é possível pelo caminho formal (`solicitacao_encerramento_decidir`). Não existe (e nunca existiu de fato) um atalho direto de admin.

📄 Detalhamento técnico completo: `DOCUMENTACAO_BD.md`, seção `[04-E]` (nota "Permissão `campanha_encerrar` removida") e seção `[07-B-2]`.

### 🟢 3 índices redundantes em `02_indices.sql` — **[CORRIGIDO]**

*(Esta seção é pra quem escreveu a parte de índices entender exatamente o que mudou e por quê — nada foi apagado por "achismo", é uma consequência mecânica de como o Postgres já lida com `UNIQUE`.)*

Removidos: `idx_seguir_pesquisador_usuario`, `idx_score_pesq_usuario`, `idx_aceite_termo_contribuicao_contribuicao`.

**O que é um índice, rapidinho:** um índice é uma estrutura auxiliar que o banco mantém pra achar linhas rápido sem varrer a tabela inteira — tipo o índice remissivo de um livro. Toda vez que você cria uma `UNIQUE (coluna_A, coluna_B)`, o Postgres **cria um índice sozinho, automaticamente**, por baixo dos panos, pra conseguir garantir essa unicidade. Esse índice automático já vem ordenado primeiro por `coluna_A`, depois por `coluna_B` — igual uma lista telefônica ordenada por sobrenome e, dentro do mesmo sobrenome, por nome.

**Por que um `CREATE INDEX` extra pode ser inútil:** se alguém cria manualmente um `CREATE INDEX` só em `coluna_A` (a primeira coluna do `UNIQUE`), esse índice novo não ajuda em nada — o automático já cobre essa busca. Só cria dois problemas: espaço em disco desperdiçado, e todo `INSERT`/`UPDATE`/`DELETE` fica um pouco mais lento (o Postgres precisa atualizar TODOS os índices a cada mudança, inclusive o inútil).

Isso só deixa de ser verdade se a busca for pela **segunda coluna sozinha** — aí sim um índice dedicado faz sentido. Esse padrão já era seguido em outros lugares do arquivo (ex.: `seguir_campanha` só tem índice em `id_campanha`, nunca em `id_usuario`) — só ficaram 3 pontos fora dele.

**Os 3 casos:**

1. **`idx_seguir_pesquisador_usuario`** — `seguir_pesquisador` já tem `UNIQUE (id_usuario, id_pesquisador)` (`01`, linha 187). Como `id_usuario` é a 1ª coluna, o índice era 100% duplicado. (O índice na 2ª coluna, `idx_seguir_pesquisador_alvo`, continua existindo — mas ver a atualização abaixo: "necessário" foi otimista demais.)

> Atualização (27-07-2026): a remoção dos 3 continua certa, mas a frase "esse sim é necessário" sobre `idx_seguir_pesquisador_alvo` não é — `pol_seg_pesq_select` (`04`) só libera `SELECT` onde `id_usuario = id_usuario_atual()` (cada um só vê as próprias linhas de "quem eu sigo"). Isso significa que a busca por `id_pesquisador` (quem segue um pesquisador X) que esse índice acelera não pode ser feita por ninguém — nem o próprio pesquisador, nem o Administrador. Ver item 18 da Lista C: o índice só volta a fazer sentido se vocês decidirem liberar contagem de seguidores.

2. **`idx_aceite_termo_contribuicao_contribuicao`** — a tabela tem `UNIQUE (id_contribuicao)` sozinha (`01`, linha 466). O índice automático já era *idêntico* ao manual — clone puro.

3. **`idx_score_pesq_usuario`** — `score_pesquisador` tem `UNIQUE (id_usuario, id_score_config)` (`01`, linha 505-506). Mesmo raciocínio: `id_usuario` é a 1ª coluna, índice redundante.
   - *Detalhe a mais pra esse:* se no futuro o sistema precisar buscar só por `id_score_config`, aí sim valeria um índice novo — mas nessa coluna, não em `id_usuario`. Não foi feito agora porque depende de saber que consulta o motor de score vai realmente fazer — é otimização futura, não correção.

**Prova de que nada quebrou:**
- Nenhuma tabela, coluna, `UNIQUE` ou `PRIMARY KEY` foi tocada — só as 3 linhas de `CREATE INDEX` extras foram apagadas.
- Contagem de índices no arquivo: era 39, agora é 36.
- `git diff` mostra só essas 3 linhas removidas mais o número no cabeçalho.
- Qualquer consulta que antes usava esses 3 índices continua funcionando igual — só passa a usar o índice automático do `UNIQUE`, que já fazia o mesmo trabalho.

### 🟢 Bagunça de nomes de arquivo em 05/06/07/08 — **[CORRIGIDO]**

Comentários internos de `05_regras_negocio.sql`, `06_grants.sql`, `07_seed_dados.sql` e `08_trigger_signup_usuario.sql` citavam nomes de arquivo que não existem no disco (`05_grants.sql`, `06_score_engine_triggers.sql`, `06b_regras_negocio.sql`).

Alguém (provavelmente outra sessão de IA) parece ter cogitado inverter a ordem de execução — rodar os GRANTs antes do motor de score/triggers — e atualizou só os comentários dos 4 arquivos pra refletir essa ideia nova, sem nunca renomear os arquivos de fato nem terminar a mudança. As pistas exatas:

- `05_regras_negocio.sql` (linha 2) se autodenominava "06b: MOTOR DE SCORE...", dizia depender de `05_grants.sql` e que o próximo era `06_grants.sql`.
- `06_grants.sql` (linha 2) se autodenominava "05: GRANTS", dizia que o próximo era `06_score_engine_triggers.sql`.
- `07_seed_dados.sql` citava "06b_regras_negocio.sql".
- `08_trigger_signup_usuario.sql` citava "05_grants.sql".

Nenhum desses nomes existe no disco. Testei tecnicamente se a inversão sugerida pelos comentários funcionaria: **não funciona**. `06_grants.sql` faz `GRANT EXECUTE` em funções que só existem depois que `05_regras_negocio.sql` roda e as cria — se os GRANTs rodassem antes, essas linhas dariam erro de "função não existe". Confirmei também que `05_regras_negocio.sql` não tem nenhuma referência a `app_nestjs` ou `GRANT` — não precisa dos grants pra rodar.

**Conclusão: a ordem real no disco (`05_regras_negocio` → `06_grants`) está certa e não deve mudar.** Os comentários dentro dos 4 arquivos já foram higienizados — cada cabeçalho hoje se autoidentifica com o nome de arquivo correto.

### 🟢 Aspas inconsistentes em nomes de policy — **[RESOLVIDO]**

Nomes de policy com aspas inconsistentes em `04_rls_policies.sql`: `"pol_score_config_select"` e `"pol_score_rotulo_select"` usavam aspas duplas, diferente das outras ~103 policies. Já padronizado — confirmado que não sobra nenhuma policy com aspas no arquivo.

### 🟢 Reorganização de comentários (`01` a `08`) — **[CONCLUÍDO]**

Todos os 8 arquivos já foram migrados para o `DOCUMENTACAO_BD.md` (blocos `[NN-Y]`/`[NN-Y-N]`), com prova mecânica de que nenhuma linha de SQL foi alterada no processo em nenhum deles. `05` e `08` também ganharam docstring padronizada (Função/Assinatura/Bloco/Regra) em cada função/trigger.

### 🟢 Autor podia reverter a própria moderação em `comentario` — **[RESOLVIDO]**

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

### 🟢 `valor_bruto_arrecadado` do seed não batia com a soma real das contribuições — **[CORRIGIDO]**

`07_seed_dados.sql` não desligava a trigger `trg_sincroniza_arrecadado_campanha` ao inserir o histórico de `contribuicao` — ela recalculava e sobrescrevia os valores de `valor_bruto_arrecadado` digitados a mão no seed (ex.: campanha 1 caía de 52.300 pra 7.300). A correção mecânica na hora (desligar a trigger junto das outras 2 do bloco `[07-H-1]`) resolveu o sintoma, mas não a causa: os números que o seed gravava em `valor_bruto_arrecadado` não batiam com a soma real das `contribuicao` seedadas — não era diferença pequena, era ordem de grandeza:

| Campanha | `valor_bruto_arrecadado` gravado (antigo) | Soma real das contribuições seedadas (antiga) |
|---|---|---|
| 1 | 52.300,00 | 7.300,00 |
| 2 | 28.500,00 | 1.500,00 |
| 3 | 40.000,00 | 8.000,00 |
| 4 | 8.000,00 | 0,00 |
| 5 | 22.000,00 | 2.200,00 |
| 7 | 45.000,00 | 500,00 |

O motivo era que o seed cadastrava só um punhado de contribuições de exemplo (pra cumprir o "mínimo 7 registros"), mas os totais das campanhas foram digitados como se fossem valores realistas e completos, sem os dois baterem entre si. Isso não era cosmético: a primeira vez que uma contribuição de verdade fosse confirmada numa dessas campanhas, `trg_sincroniza_arrecadado_campanha` acordaria, recalcularia a partir da soma real e o valor "bonito" do seed desapareceria de uma vez, sem erro, sem aviso.

**CORRIGIDO em 28-07-2026 (item A3, ver seção "28-07-2026" mais acima):** a saída escolhida foi adicionar contribuições reais que somem os totais de verdade, em vez de baixar os totais das campanhas. `valor_bruto_arrecadado` saiu do `INSERT` (usa o `DEFAULT 0`), a trigger ficou ligada durante a carga do seed, e 37 novas linhas de contribuição foram distribuídas entre doadores diferentes pra fechar exatamente os mesmos totais que apareciam na tabela acima — só que agora é a soma real, calculada pelo Postgres, não um número digitado à mão.

### 🟢 Linha duplicada em `repasse` (campanha 2) — **[CORRIGIDO]**

`07_seed_dados.sql` tinha duas linhas de repasse para a mesma campanha (`id_campanha = 2`), ambas com o mesmo `valor_bruto` (28.500,00): uma `'concluido'` com `valor_liquido = 27.075,00` (a conta normal de repasse com taxa de 5%); outra `'parcial_processando'` com `valor_liquido = 0,00` e `repassado_em = NULL`. A campanha era `modelo = 'flexivel'` (repasse abaixo da meta é esperado nesse modelo — isso nunca foi o problema); a dúvida era por que existiam **duas** linhas de repasse pro mesmo valor bruto.

A investigação de 27-07-2026 mostrou que a linha duplicada era sintoma, não causa raiz: todas as 7 linhas de `repasse` tinham `valor_bruto` batendo com o total inventado de cada campanha, não com a soma real das contribuições seedadas (ver entrada de `valor_bruto_arrecadado`, logo acima) — corrigir só a linha duplicada e deixar as outras 6 do jeito que estavam seria resolver a parte errada do problema.

**CORRIGIDO em 28-07-2026 (junto do item A3, mesmo evento):** a linha `'parcial_processando'` foi removida — com as contribuições reais somando o total de verdade agora, essa segunda linha (que só existia pra "empurrar" o total antigo) deixou de fazer sentido.

### 🟢 `ALTER TABLE` morto que nunca executava (`01`, tabela `score_pesquisador`) — **[CORRIGIDO]**

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

### 🟢 Índice morando no arquivo errado (`ux_recuperacao_senha_ativo_por_usuario`) — **[CORRIGIDO]**

Esse índice parcial ("só 1 token de recuperação de senha ativo por usuário") estava dentro do `01_extensoes_enums_tabelas.sql`, logo depois da `CREATE TABLE recuperacao_senha`. O problema: existem **dois outros índices do mesmo tipo** no projeto (parcial, "só 1 X ativo por vez") — `uq_termos_uso_ativo` e `uq_arquivo_recompensa_principal` — e **os dois moram em `02_indices.sql`**, nunca em `01`. Esse era o único fora desse padrão.

**O que foi feito:** o índice foi movido de `01_extensoes_enums_tabelas.sql` para `02_indices.sql`, ficando junto dos outros índices de `recuperacao_senha` (`idx_recuperacao_senha_token`, `idx_recuperacao_senha_usuario`), no mesmo lugar onde os outros 2 índices "só 1 ativo" já vivem. Contagem de índices em `02` foi de 36 para 37 (o índice não sumiu, só mudou de arquivo). Nenhuma tabela, coluna ou lógica foi alterada — a tabela `recuperacao_senha` já existe desde o `01`, então o índice continua sendo criado exatamente no mesmo estado do banco, só que 1 arquivo depois.

### 🟢 Os 4 `ALTER TABLE` de `01_extensoes_enums_tabelas.sql` foram eliminados — **[CORRIGIDO]**

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


---
---


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
