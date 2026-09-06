# 📋 Próximos Passos - CrowdAcadêmico

**O que é este arquivo:** decisões que já foram DISCUTIDAS e ACORDADAS, mas ainda não foram implementadas - pra não se perder de vista entre uma rodada e outra. Diferente de `PENDENCIAS e correcoes.md` (achados/bugs concretos do banco) e de `DOCUMENTACAO_BACKEND.md`/`DOCUMENTACAO_FRONTEND.md` (registro técnico do que já foi feito) - este arquivo é só sobre o que vem a seguir.

Criado em 03-08-2026, sugestão da IA numa rodada de consolidação/auditoria.

---

> 🗑️➡️✅ **"Migração gradual de regra de negócio do banco pro Nest" - RECLASSIFICADO (05-09-2026), saiu desta lista.** Não era uma pendência de verdade - o estado atual (regra de integridade/fraude no banco, regra de produto pode ir pro Nest quando a ocasião surgir) já é o correto, e deixar isso numa lista de "próximos passos" dava a impressão errada de dívida acumulando. Virou política de arquitetura registrada, não tarefa esperando: ver `DOCUMENTACAO_BD.md`, Anexo E.

---

## 1. Gateway de pagamento

Destrava três coisas de uma vez: verificação de assinatura HMAC do webhook, idempotência (gateways reenviam webhook "pelo menos uma vez"), e reconciliação financeira (job comparando extrato do gateway com `contribuicao`).

**Decisão comercial, não técnica** (taxa, prazo de repasse, suporte a PIX) - não trava nenhum outro trabalho técnico em paralelo, mas trava esses três especificamente.

**O critério mais importante pro nosso caso específico:** o dinheiro entra de vários doadores, fica guardado até a campanha ser aprovada (ou até o prazo acabar, no all-or-nothing), e só depois é repassado pro pesquisador (ou devolvido a todo mundo, se não bateu a meta). Isso se chama "split de pagamento" ou "marketplace" no mundo dos gateways - nem todo gateway faz isso de forma automática. Sem essa funcionalidade, o repasse vira um processo manual (mais trabalho, mais chance de erro humano, mas não impede o TCC de funcionar).

**Opções levantadas até agora** (valores/taxas mudam com frequência, confirmar no site de cada um antes de decidir):

- **Mercado Pago** - o mais usado no Brasil, documentação em português, PIX nativo, tem "Marketplace" que faz o split automático. Ponto de atenção: pra habilitar split de verdade, costuma pedir CNPJ e um processo de aprovação - vale conferir se dá pra testar em modo sandbox só com CPF primeiro.
- **Asaas** - brasileiro, pensado desde o início pra plataformas (não é um extra) - tem "subcontas" que mapeiam bem no nosso modelo de dinheiro em custódia. PIX nativo, ambiente de teste disponível. Menos conhecido que Mercado Pago, então menos tutorial/comunidade por aí.
- **Pagar.me (Stone)** - split robusto também (Pagar.me Connect), mas o processo de habilitação tende a ser mais burocrático, geralmente pede CNPJ.
- **Stripe** - documentação muito bem feita, Stripe Connect é um produto de split maduro. Ponto de atenção: suporte a PIX no Brasil historicamente veio depois dos gateways brasileiros - vale checar se está bom o suficiente hoje. Documentação toda em inglês.
- **Gerencianet / Efí Bank** - focado em PIX direto, API mais simples e rápida de integrar. Ponto de atenção: não tem split automático - o repasse pro pesquisador teria que ser uma transferência separada, feita à parte (manual ou via outra chamada de API), não automática.

**O que poderia dar errado se a decisão demorar ou for tomada sem pesquisar direito:**
- Escolher um sem split e descobrir depois que o repasse não é automático, tendo que programar isso na mão de qualquer jeito (não quebra o projeto, só dá mais trabalho depois).
- Escolher um que pede CNPJ pra funcionalidade necessária e travar no meio do caminho, tendo que trocar de gateway.
- Decidir com pressa mais pra frente, quando já tiver menos tempo de TCC sobrando.

**Perguntas pra decidir rápido:** já existe CNPJ/MEI disponível, ou os testes serão todos com CPF pessoal (modo sandbox)? Vale a complexidade extra de um split automático (Mercado Pago/Asaas/Pagar.me), ou repasse manual (Gerencianet) é simples o bastante pro tamanho deste TCC?

**Status:** gateway ainda não escolhido.

---

## 2. Página pública de campanha + Open Graph

A página pública de campanha (a que um doador visita, compartilha no WhatsApp) ainda não existe no React - só o painel admin existe hoje. Open Graph (meta tags pra link com preview) e contador de visualizações dependem dela existir primeiro.

**Status:** não iniciado.

---

## 3. Exportação de dados (LGPD Art. 18) e Request ID por requisição

- 🟢 **Exportação de dados do usuário - RESOLVIDO (05-09-2026).** `GET /usuario/eu/exportar-dados` (novo, dentro de `1-usuario`, mesmo padrão de `usuario.service.remove.ts`) - sem `:id`, ator sempre o autenticado. CPF sai mascarado (nunca em texto puro); rate limit de 1x/hora por conta (não por IP); rastro em `log_auditoria` a cada chamada (`registrar_exportacao_dados()`, `SECURITY DEFINER`); `Cache-Control: no-store`. Detalhamento completo em `DOCUMENTACAO_BACKEND.md` §7.4 e `DOCUMENTACAO_BD.md` (`[03-O]` + seção `log_auditoria`). Falta rodar manualmente em produção: bloco de migração em `ATUALIZAR O SUPABASE.sql` (05-09-2026, CHECK constraint + função + grants).
- 🟢 **Request ID por requisição - RESOLVIDO (05-09-2026).** `nestjs-cls` ganhou `generateId`/`idGenerator` (`database.module.ts`) e `commons/logging/request-logger.middleware.ts` loga toda requisição no formato `[id] MÉTODO /rota STATUS - Xms`. Detalhamento completo (inclusive por que é middleware, não interceptor) em `DOCUMENTACAO_BACKEND.md`, §2.8.

**Status:** os dois itens concluídos.

---

## 4. Padronizar estrutura de pastas do React (`services/*`)

`services/1-usuario` segue o padrão `api/constants/hook/type`; `services/11-configuracoes` segue `api/context/hook/provider`. Duas convenções diferentes coexistindo - antes de o projeto crescer mais (mais módulos = mais pastas nesse formato), vale escolher uma e migrar a outra.

**Status:** não iniciado, decisão de convenção ainda sem dono (Lucas/Alexia precisam escolher).

---

## 5. ENUM vs. tabela de catálogo - decisão fechada, nada a implementar

**Origem:** ao mapear "o que o admin ainda não edita pelo painel sem SQL", a IA identificou os 15 `ENUM` do banco como o maior teto restante. A pergunta natural era: por que não virar tabela editável, igual `motivo_denuncia`/`tipo_link`/`area_conhecimento` já são?

**Por que a resposta não é "converter tudo":** `ENUM` não é só uma lista de opções - é um contrato que trigger/policy/função assumem. Se o admin pudesse adicionar `status = 'suspenso_temporario'` pelo painel, nenhuma regra do sistema saberia tratar esse valor - a campanha entraria num estado que ninguém previu, em silêncio. Isso tem nome (*inner-platform effect*): o sistema fica tão configurável que vira um segundo banco de dados mal feito dentro do primeiro - o extremo oposto do problema tratado no Anexo E de `DOCUMENTACAO_BD.md` (regra de negócio no banco vs. no Nest).

**Critério usado** (mesmo espírito do Anexo E): se o admin adicionar um valor novo, alguma regra do sistema precisa saber o que fazer com ele? Se sim, fica `ENUM` (mudança vira código, com revisão). Se não, pode virar catálogo.

**Aplicado e CONFIRMADO no código** (não só na teoria - checado direto no `05_regras_negocio.sql`):
- `status_campanha`, `status_contribuicao`, `status_encerramento`, `modelo_campanha` - ficam `ENUM`. Lógica de verdade depende do valor específico (ex.: `meio_pagamento <> 'pix'` trava contribuição all-or-nothing).
- `titulo_academico` - candidato real a virar catálogo. Confirmado: só é checado como "preenchido ou não" (`IS NOT NULL`) pro score, nenhuma trigger olha qual título específico é.
- `meio_pagamento` - candidato real a virar catálogo. Confirmado: só é comparado contra o valor `'pix'` (a regra do all-or-nothing) - não precisa conhecer a lista inteira, só reconhecer esse um. Um método novo (ex.: um Pix Automático) seria tratado igual aos outros não-PIX que já existem, sem quebrar nada.
- Permissões novas (`permissao`) continuam intencionalmente só-leitura pela API - registrado como decisão consciente, não lacuna: uma permissão só existe de verdade quando alguma policy a consulta, criar a linha sem a policy correspondente vira um botão que não faz nada.

**Status:** decisão FECHADA, nada a implementar agora. `titulo_academico`/`meio_pagamento` ficam anotados como candidatos futuros, se algum dia fizer sentido - não é trabalho pendente, é só não esquecer que a opção existe.

---

## Já resolvido, registrado aqui só pra fechar o ciclo

- **Módulo `6-perfil-pesquisador` + validação de CPF** - construído (Grupo 2 de `PROXIMOS_MODULOS.md`). O bloqueio original (Lucas não queria CPF de sequência repetida como atalho de teste, "vou pensar em algo melhor", 03-08-2026) foi resolvido usando CPFs sintaticamente válidos e não sequenciais nos dados de teste - ver `Como testar perfil_pesquisador.md` para o passo a passo com um CPF de exemplo real (`45612398719`). Algoritmo de validação usa dígito verificador de verdade, não só formato.
- **`papel.codigo`** - resolvido em 03-08-2026 (ver `DOCUMENTACAO_BD.md`, seção "05. RBAC"). O achado que motivou (renomear papel quebrava RBAC em silêncio) foi confirmado corrigido testando ao vivo (renomeou `'admin'`/`'pesquisador'`, as automações continuaram funcionando).
- **Migrations (tabela de controle + runner)** - resolvido em 03-08-2026 (ver `DOCUMENTACAO_BACKEND.md`, seção 12). Escopo mínimo, como decidido: os 8 arquivos `.sql` continuam exatamente como estavam - só ganharam uma tabela `schema_migrations` e um script (`npm run db:migrate`/`db:migrate:adotar`) por cima, usando conexão separada da `app_nestjs`. **Lucas já rodou `db:migrate:adotar` no próprio banco (05-09-2026).** Falta só a Alexia rodar no dela - passo a passo em `tutorial-rodar-projeto.md`. Sem prazo (ela só roda quando surgir oportunidade, não é algo pra cobrar) - **migração acumulada esperando esse momento:** a coluna `configuracoes.publica` (ver `PENDENCIAS e correcoes.md`, seção "GET /configuracoes agora distingue pública de interna", 05-09-2026), pra rodar as duas de uma vez.
- **Uma lacuna genuína, identificada pela IA, ainda sem item próprio na lista:** textos de e-mail. Quando o módulo `4-mail` for construído (ainda não existe), o conteúdo dos e-mails (aprovação, reprovação, meta atingida) não deveria nascer hardcoded num `.ts` - muda toda semana por decisão de produto, é candidato natural a virar uma tabela `template_email` editável pelo admin, sem risco nenhum (nenhuma regra do sistema depende do TEXTO de um e-mail). Vale lembrar disso quando o módulo `4-mail` entrar em pauta - não tem prazo definido ainda, por isso não virou item numerado.
