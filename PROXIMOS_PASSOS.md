# 📋 Próximos Passos — CrowdAcadêmico

**O que é este arquivo:** decisões que já foram DISCUTIDAS e ACORDADAS, mas ainda não foram implementadas — pra não se perder de vista entre uma rodada e outra. Diferente de `PENDENCIAS e correcoes.md` (achados/bugs concretos do banco) e de `temp_Nest_React.md` (registro técnico do que já foi feito) — este arquivo é só sobre o que vem a seguir.

Criado em 03-08-2026, sugestão do Claude Web numa rodada de consolidação/auditoria.

---

## 1. Migração gradual de regra de negócio do banco pro Nest

**Origem:** a Alexia recebeu uma mensagem genérica (não sobre o nosso projeto) dizendo que lógica de negócio pesada no banco é anti-padrão. Ela mesma já filtrou o que se aplicava e o que não: RLS/trigger de autorização está OK pro nosso caso (o front nunca fala com o banco direto, só com o Nest — é exatamente o padrão que a mensagem defende); o que ela concorda que exageramos é regra de PRODUTO (que muda com o tempo) misturada com invariante estrutural, dentro das mesmas triggers.

**Critério acordado** (refinado pelo Claude Web em cima da proposta dela — "regra que muda" vs "invariante" virou uma pergunta mais precisa):

> Se um bug no Nest violar essa regra, **alguém perde dinheiro ou dado**? → fica no banco.
> Se a regra é só **escolha de negócio, sem consequência de integridade**? → pode ir pro Nest.

- **Fica no banco:** `all-or-nothing` do repasse, congelamento pós-aprovação de campanha (`fn_congela_regras_campanha`), **transição de status de campanha** (`fn_valida_transicao_campanha`).
- **Pode ir pro Nest, aos poucos:** limite de campanhas simultâneas por pesquisador, rate limit de denúncia (24h).

⚠️ **Nota importante sobre `fn_valida_transicao_campanha`:** a primeira proposta da Alexia classificava "transição de status" como regra de produto que poderia sair do banco. O Claude Web discordou nesse ponto específico, com um contraexemplo empírico, não teórico — testou ao vivo uma cadeia de fraude completa: pesquisador cria campanha, aprova a própria campanha, doa pra si mesmo, marca a doação como paga. Todos os passos passavam pelo Nest normalmente (nenhuma validação de aplicação barrou nada) — quem impediu foi a trigger do banco. Se essa regra estivesse só no backend, essa fraude teria ido pra produção. **Esta função fica no banco, não é candidata a migrar.**

**Status:** critério acordado, nada implementado ainda. Migrar é trabalho de médio prazo, revisando trigger por trigger — não uma rodada só.

---

## 2. Módulo `6-perfil-pesquisador` + validação de CPF

Hoje o módulo não existe no Nest (só a pasta com `.gitkeep`). Necessário pra fechar o ciclo de teste "promover usuário a pesquisador" pela interface — hoje só dá pra fazer inserindo direto no banco.

Quando for construído: usar o algoritmo real de validação de CPF (dígito verificador de verdade), que rejeita sequências repetidas (`111.111.111-11` etc.) por convenção de mercado, mesmo que o dígito bata matematicamente em alguns casos. O Lucas decidiu explicitamente **não** usar CPF de sequência repetida como atalho de teste (03-08-2026: "vou pensar em algo melhor") — decisão dele, em aberto, sem solução escolhida ainda.

**Status:** não iniciado. Bloqueado por decisão do Lucas sobre estratégia de dado de teste.

---

## 3. Gateway de pagamento

Destrava três coisas de uma vez: verificação de assinatura HMAC do webhook, idempotência (gateways reenviam webhook "pelo menos uma vez"), e reconciliação financeira (job comparando extrato do gateway com `contribuicao`).

**Decisão comercial, não técnica** (taxa, prazo de repasse, suporte a PIX) — não trava nenhum outro trabalho técnico em paralelo, mas trava esses três especificamente.

**Status:** gateway ainda não escolhido.

---

## 4. Página pública de campanha + Open Graph

A página pública de campanha (a que um doador visita, compartilha no WhatsApp) ainda não existe no React — só o painel admin existe hoje. Open Graph (meta tags pra link com preview) e contador de visualizações dependem dela existir primeiro.

**Status:** não iniciado.

---

## 5. Exportação de dados (LGPD Art. 18) e Request ID por requisição

Dois itens de baixo risco técnico, só não entraram ainda por tempo/prioridade:
- **Exportação de dados do usuário** (LGPD Art. 18, portabilidade) — a exclusão de conta já existe, faltava o par (exportar antes de excluir, ou por pedido).
- **Request ID por requisição** — `nestjs-cls` já está instalado (usado pra RLS), só falta gerar um ID por requisição e incluir no log, pra virar "achei os 8 logs daquela requisição" em vez de "deu erro às 14:32".

**Status:** não iniciado, sem bloqueio — é só entrar na fila.

---

## 6. Padronizar estrutura de pastas do React (`services/*`)

`services/1-usuario` segue o padrão `api/constants/hook/type`; `services/11-configuracoes` segue `api/context/hook/provider`. Duas convenções diferentes coexistindo — antes de o projeto crescer mais (mais módulos = mais pastas nesse formato), vale escolher uma e migrar a outra.

**Status:** não iniciado, decisão de convenção ainda sem dono (Lucas/Alexia precisam escolher).

---

## 7. ENUM vs. tabela de catálogo — decisão fechada, nada a implementar

**Origem:** ao mapear "o que o admin ainda não edita pelo painel sem SQL", o Claude Web identificou os 15 `ENUM` do banco como o maior teto restante. A pergunta natural era: por que não virar tabela editável, igual `motivo_denuncia`/`tipo_link`/`area_conhecimento` já são?

**Por que a resposta não é "converter tudo":** `ENUM` não é só uma lista de opções — é um contrato que trigger/policy/função assumem. Se o admin pudesse adicionar `status = 'suspenso_temporario'` pelo painel, nenhuma regra do sistema saberia tratar esse valor — a campanha entraria num estado que ninguém previu, em silêncio. Isso tem nome (*inner-platform effect*): o sistema fica tão configurável que vira um segundo banco de dados mal feito dentro do primeiro — o extremo oposto do problema que motivou o item 1 desta lista.

**Critério usado** (mesmo espírito do item 1): se o admin adicionar um valor novo, alguma regra do sistema precisa saber o que fazer com ele? Se sim, fica `ENUM` (mudança vira código, com revisão). Se não, pode virar catálogo.

**Aplicado e CONFIRMADO no código** (não só na teoria — checado direto no `05_regras_negocio.sql`):
- `status_campanha`, `status_contribuicao`, `status_encerramento`, `modelo_campanha` — ficam `ENUM`. Lógica de verdade depende do valor específico (ex.: `meio_pagamento <> 'pix'` trava contribuição all-or-nothing).
- `titulo_academico` — candidato real a virar catálogo. Confirmado: só é checado como "preenchido ou não" (`IS NOT NULL`) pro score, nenhuma trigger olha qual título específico é.
- `meio_pagamento` — candidato real a virar catálogo. Confirmado: só é comparado contra o valor `'pix'` (a regra do all-or-nothing) — não precisa conhecer a lista inteira, só reconhecer esse um. Um método novo (ex.: um Pix Automático) seria tratado igual aos outros não-PIX que já existem, sem quebrar nada.
- Permissões novas (`permissao`) continuam intencionalmente só-leitura pela API — registrado como decisão consciente, não lacuna: uma permissão só existe de verdade quando alguma policy a consulta, criar a linha sem a policy correspondente vira um botão que não faz nada.

**Status:** decisão FECHADA, nada a implementar agora. `titulo_academico`/`meio_pagamento` ficam anotados como candidatos futuros, se algum dia fizer sentido — não é trabalho pendente, é só não esquecer que a opção existe.

---

## Já resolvido, registrado aqui só pra fechar o ciclo

- **`papel.codigo`** — resolvido em 03-08-2026 (ver `temp_Nest_React.md`). O achado que motivou (renomear papel quebrava RBAC em silêncio) foi confirmado corrigido pelo Claude Web testando ao vivo (renomeou `'admin'`/`'pesquisador'`, as automações continuaram funcionando).
- **Migrations (tabela de controle + runner)** — resolvido em 03-08-2026 (ver `temp_Nest_React.md`, seção "Sistema de migrations"). Escopo mínimo, como decidido: os 8 arquivos `.sql` continuam exatamente como estavam — só ganharam uma tabela `schema_migrations` e um script (`npm run db:migrate`/`db:migrate:adotar`) por cima, usando conexão separada da `app_nestjs`. Falta só Lucas e Alexia rodarem `db:migrate:adotar` cada um no próprio banco (passo a passo em `tutorial-rodar-projeto.md`).
- **Uma lacuna genuína, identificada pelo Claude Web, ainda sem item próprio na lista:** textos de e-mail. Quando o módulo `4-mail` for construído (ainda não existe), o conteúdo dos e-mails (aprovação, reprovação, meta atingida) não deveria nascer hardcoded num `.ts` — muda toda semana por decisão de produto, é candidato natural a virar uma tabela `template_email` editável pelo admin, sem risco nenhum (nenhuma regra do sistema depende do TEXTO de um e-mail). Vale lembrar disso quando o módulo `4-mail` entrar em pauta — não tem prazo definido ainda, por isso não virou item numerado.
