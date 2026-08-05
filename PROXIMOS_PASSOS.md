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

## Já resolvido, registrado aqui só pra fechar o ciclo

- **`papel.codigo`** — resolvido em 03-08-2026 (ver `temp_Nest_React.md`). O achado que motivou (renomear papel quebrava RBAC em silêncio) foi confirmado corrigido pelo Claude Web testando ao vivo (renomeou `'admin'`/`'pesquisador'`, as automações continuaram funcionando).
- **Migrations (tabela de controle + runner)** — proposta da Alexia, endossada pelo Claude Web com um escopo mínimo específico: **não** converter os 8 arquivos `.sql` pro formato de migration nenhuma ferramenta agora. Só criar uma tabela `schema_migrations` (nome do arquivo + hash do conteúdo + quando/quem rodou) e um script (`npm run db:migrate`) que lê os `.sql` na ordem, pula os que já rodaram (comparando hash), aplica os novos e registra — usando uma conexão SEPARADA com credencial de DDL, nunca a do `app_nestjs` (que é propositalmente sem privilégio de DDL), acionado só por comando explícito, nunca automático na subida do servidor. Testar com um arquivo pequeno (`02_indices.sql`) antes de rodar os 8. **Ainda não implementado** — é o próximo item de infraestrutura depois deste round de documentação.
