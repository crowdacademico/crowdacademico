#### Pendências reais do sistema

*(Atualizado após a reorganização + revisão completa de `01` a `08` com o Claude)*

*(Reorganizado em 26/07/2026: pendências reais no topo, resolvidas/corrigidas no final — pra facilitar achar rápido o que ainda precisa de decisão)*

---
---

# 🔴 PENDÊNCIAS (ainda em aberto — precisam de decisão)


## 🗓️ 27-07-2026 — Nova rodada (banco comparado com os requisitos do TCC)

*(Itens encontrados e descritos pelo CLAUDE nesta data — separados de propósito das pendências mais antigas abaixo, pra não confundir uma coisa com a outra. 🔴 = ainda pendente. 🟢 = já corrigido nesta mesma data, com prova de que nada quebrou.)*

### Lista A — bugs mecânicos, o próprio `.sql` se contradizendo (não precisavam de decisão de negócio) — **todos 🟢 corrigidos em 27-07-2026**

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

### Lista B — decisão de uma linha (você deu o OK) — **todos 🟢 aplicados em 27-07-2026**

🟢 **B1. FKs de alvo em `denuncia`: `SET NULL` → `RESTRICT`** — mais correto pra um registro de moderação não virar órfão sozinho com o tempo. **Aplicado** — não muda nada na prática hoje, já que nem `campanha` nem `usuario` têm policy de `DELETE`.

🟢 **B2. Congelamento anti-fraude estendido pra `titulo`, `descricao` e `data_fim`** — trocar a descrição de um projeto já financiado era o vetor de fraude mais óbvio, e nada bloqueava. **Aplicado** na mesma `fn_congela_regras_campanha` do A2. Conferido que nada no `05`/`07` escreve em `data_fim` depois da criação — não afeta o seed.

🟢 **B3. Pesquisador suspenso agora é barrado de criar campanha/publicar atualização** — replicado o mesmo padrão que já existia só em `pol_comentario_insert` (`status_pesquisador = 'ativo'`) pras policies de `INSERT` de `campanha` e `atualizacao_campanha`. **Aplicado.** Como o seed roda como superusuário (bypassa RLS) e todos os 7 pesquisadores seedados já são `'ativo'`, o seed continua rodando sem nenhuma mudança.

**Prova mecânica de que nada quebrou (Lista A + B juntas):** 39 tabelas (igual); `PK_`=39, `FK_`=55, `UK_`=18 (iguais); `CK_` foi de 13 pra 14 (a nova `CK_DENUNCIA_ALVO_XOR`); parênteses balanceados em `01`. Policies: 105 `CREATE POLICY` / 105 `DROP POLICY`, continua 100% idempotente. Triggers foram de 24 pra 26 (`trg_denuncia_valida_tipo_motivo`, `trg_valida_transicao_solicitacao`); funções de `05` foram de 28 pra 30, e `03` de 2 pra 3 (`usuario_visivel`) — cabeçalhos de inventário atualizados nos arquivos correspondentes. Reconferi linha a linha o seed inteiro (`denuncia`, `perfil_pesquisador`) contra as constraints/triggers novas — todas as linhas já existentes continuam passando sem precisar mudar nenhum valor do seed.

### 🗓️ 27-07-2026 (parte 2) — o que rodar de verdade encontrou (ainda NÃO corrigido)

*(Diferente de tudo acima: estes dois itens vieram de alguém que instalou um Postgres de teste e executou os 8 arquivos de verdade, não só leu. Eu conferi cada afirmação técnica direto contra o `.sql` atual — as duas são reais. Mas por pedido seu, nada foi corrigido ainda: só documentado, esperando você decidir a forma de consertar.)*

🔴 **21. `07_seed_dados.sql` não roda até o fim do jeito que está — 3 erros em cascata**

Conferido linha a linha, os três são reais:
- **`auditoria_financeira`**: a coluna `valor` é `DECIMAL(10,2) NOT NULL`, sem valor padrão, e o `INSERT INTO auditoria_financeira (id_contribuicao, status_novo, status_anterior, evento, timestamp)` do seed nunca informa essa coluna. As 7 linhas falham com `null value in column "valor" violates not-null constraint`.
- **`atualizacao_campanha`**: a campanha 7 do seed tem `status = 'encerrado'`, mas `validar_atualizacao_campanha()` só aceita `'ativo'`, `'sucesso'` ou `'nao_atingido'`. Como o `INSERT` de `atualizacao_campanha` é um único comando com 7 linhas e uma delas mira a campanha 7, o comando inteiro falha — nenhuma das 7 atualizações é criada.
- **`arquivo_atualizacao`**: consequência direta do erro anterior — sem nenhuma linha em `atualizacao_campanha`, o `INSERT` em `arquivo_atualizacao` (que referencia `id_atualizacao`) quebra por `FK_ARQUIVO_ATUALIZACAO_ATUALIZACAO`.

Isso significa que a afirmação anterior de que o banco "roda do zero sem erro" nunca tinha sido testada por execução real — só por leitura estática (contagens, comparação de arquivo, simulação manual). Os arquivos `01` a `06` e o `08` continuam passando sem nenhum erro.

> Sugestão do *** CLAUDE ***: os três têm o mesmo tipo de correção, mecânica e sem decisão de negócio envolvida — não escrevi ainda porque você pediu pra eu só documentar por enquanto. `auditoria_financeira` precisa de um valor em `valor` em cada uma das 7 linhas (dá pra usar o mesmo valor da `contribuicao` correspondente). Já `atualizacao_campanha`/`arquivo_atualizacao` têm duas saídas possíveis: ou o bloco `[07-H-1]` (que já desliga `trg_valida_status_contribuicao`/`trg_contribuicao_all_or_nothing_pix`/`trg_sincroniza_arrecadado_campanha` "porque o seed representa dados históricos já concluídos") ganha `trg_atualizacao_campanha_status` na mesma lista de triggers desligadas temporariamente, ou a atualização da campanha 7 é reordenada pra rodar num momento em que a campanha ainda esteja com status permitido. A primeira é mais simples e seguem exatamente o mesmo raciocínio que o comentário do `[07-H-1]` já usa pras outras três.

🔴 **22. O seed só roda com superusuário ou papel com `BYPASSRLS` — isso nunca foi escrito em lugar nenhum**

`papel`, `permissao` e `score_config` (entre outras) só têm policy de `SELECT` — não existe nenhuma policy de `INSERT` pra elas, porque a intenção sempre foi "gestão via seed/migração direta, não pela aplicação" (isso já está documentado no `DOCUMENTACAO_BD.md`, `[06-B]`). O que nunca foi dito explicitamente é que isso torna **obrigatório** rodar `07_seed_dados.sql` como um papel que ignora RLS (superusuário, ou um papel comum com o atributo `BYPASSRLS`) — com as 39 tabelas em `FORCE ROW LEVEL SECURITY`, até o dono de uma tabela fica sujeito às policies dela, e como 89 das 105 policies são `TO app_nestjs` (não `TO public`), um dono qualquer sem `BYPASSRLS` recebe dezenas de erros de `new row violates row-level security policy`.

Isso importa porque o banco vai rodar no Supabase, e lá você executa SQL pelo papel que o próprio Supabase fornece no editor deles — não necessariamente um superusuário local. Se esse papel não tiver `BYPASSRLS`, o seed falha lá do mesmo jeito, mesmo já tendo funcionado na sua máquina.

> Sugestão do *** CLAUDE ***: duas coisas, nenhuma delas é mudar o `.sql`. Primeiro, confirmar no próprio Supabase se o papel usado no SQL Editor deles (geralmente `postgres`) tem `BYPASSRLS` — normalmente tem, mas vale confirmar antes de contar com isso, não depois de um deploy dar errado. Segundo, o `tutorial-rodar-projeto.md` merece uma linha explícita dizendo isso: "o `07` (e qualquer re-execução do seed) precisa rodar como superusuário ou papel com `BYPASSRLS` — nunca como `app_nestjs`".

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