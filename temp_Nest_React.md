# temp_Nest_React.md

**O que é este arquivo:** registro TEMPORÁRIO e rápido, escrito pra qualquer IA (Claude Code, Claude Web) entender em poucos minutos o que já foi encontrado e corrigido no NestJS e no React, sem precisar reler a sessão inteira. **NÃO é a documentação oficial** — isso continua sendo `DOCUMENTACAO_BD.md` (banco) e `PENDENCIAS e correcoes.md` (banco/produto). Este arquivo é só sobre o código do backend (Nest) e do frontend (React) em si. Objetivo único: evitar que uma IA nova reintroduza um problema que já foi corrigido, ou re-investigue algo que já foi confirmado como não-problema.

Convenção: 🟢 corrigido | 🟡 real mas fora do escopo do Nest/React (é do `.sql`, é decisão de produto, etc.) | 🔴 ainda pendente.

---

## Achados do Claude da Alexia (02-08-2026)

Alexia rodou o código no Claude dela e reportou 3 pontos. Todos foram investigados antes de mexer em qualquer coisa.

🟢 **1. Nenhum DTO tinha validação (`class-validator`) — confirmado real.**
Não existia `ValidationPipe` nenhum: e-mail vazio, senha de 1 caractere, campo a mais no corpo, tudo passava direto pro Postgres. Corrigido:
- `class-validator` + `class-transformer` instalados.
- `main.ts`: `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`.
- Decorators adicionados nos 7 DTOs de request que existiam: `criar-usuario`, `atualizar-usuario` (1-usuario), `login`, `refresh-token` (3-auth), `atribuir-papel` (2-papel-permissao), `criar-configuracao`, `atualizar-configuracao` (11-configuracoes).
- Detalhe importante pra não repetir: `login.request.dto.ts` usa só `@MinLength(1)` na senha, **não** `@MinLength(8)` — login não deve reforçar a política de tamanho de senha de criação de conta (vazaria informação e não protege nada contra um hash que já existe). A política de 8 caracteres vale só na criação/alteração de senha.
- `criar-configuracao.request.dto.ts` usa `@IsIn(TIPOS_CONFIGURACAO)` (não `@IsEnum`, que exige um `enum` de verdade do TS, e aqui é um array). `TIPOS_CONFIGURACAO` é um array `as const` novo em `db.types.ts`, e `TipoConfiguracao` agora é derivado dele (`(typeof TIPOS_CONFIGURACAO)[number]`) — um hardcoded só, não dois.
- Pegadinha de TS encontrada nessa rodada: com `isolatedModules` + `emitDecoratorMetadata` ligados, um tipo usado só como tipo de propriedade decorada (`tipo: TipoConfiguracao`) precisa ser importado com `import type`, senão o build quebra com TS1272. Se aparecer esse erro de novo em outro DTO, é isso.

🟢 **2. Tratamento de erro de Postgres duplicado/inconsistente entre services — confirmado real.**
`usuario.service.create.ts` especificamente não tinha NENHUM try/catch — e-mail duplicado (23505) virava 500 cru em vez de 409. Outros services (`configuracao.service.create.ts`, `usuario-papel.service.create.ts`) já tinham try/catch local certo, com mensagens específicas — esses **não foram tocados**, continuam como estão de propósito.
Corrigido com uma rede de segurança global, não duplicando o que já existia local:
- `commons/database/postgres-exception.filter.ts` — `PostgresExceptionFilter extends BaseExceptionFilter`, `@Catch()`. Se o erro já é um `HttpException` (inclusive os lançados pelos try/catch locais), passa direto pro `super.catch()`. Se não é, olha `erro.code` e traduz: `23505`→409, `23503`/`23502`/`23514`→400, `42501`→403, `P0001`→400 com a mensagem original da função. Qualquer outro código passa sem tradução (vira 500 normal do Nest, não esconde bug de infra).
- Registrado como `{ provide: APP_FILTER, useClass: PostgresExceptionFilter }` dentro de `DatabaseModule` (mesmo módulo do `GlobalDbInterceptor` — tudo que é "conexão com banco" mora junto).
- **Isso resolve o bug concreto do `usuario.service.create.ts`** sem precisar adicionar try/catch lá — o filtro pega no nível global.

🟡 **3. `RAISE EXCEPTION` sem `ERRCODE` customizado no `05_regras_negocio.sql` — confirmado real, mas é tarefa da Alexia, não deste lado.**
~40 `RAISE EXCEPTION 'mensagem'` sem código próprio caem todos no `P0001` (código padrão do Postgres pra isso). Isso deixa o `usuario.service.remove.ts` com um catch-all `ForbiddenException((erro as Error).message || ...)` que hoje está correto (a única função que ele chama, `excluir_conta_usuario()`, só lança exceção por causa de permissão) mas seria impreciso se reaproveitado em outra função que lançasse por outro motivo (validação de negócio, por exemplo). Não mexi em `usuario.service.remove.ts` — está certo pro caso de uso dele. O `PostgresExceptionFilter` novo (achado 2, acima) já trata `P0001` genericamente como 400 com a mensagem original, então o comportamento caso-a-caso já está coberto na rede global; só falta, do lado do `.sql`, dar `ERRCODE` próprio pras exceções de negócio (ex.: uma faixa customizada tipo `'CA001'`...`'CA0NN'`) pra poder diferenciar 400 de 403 de 409 sem depender só do texto da mensagem. **Isso é trabalho da Alexia, ela já se comprometeu a fazer.**

> **Nota do Claude Web (02-08-2026), depois de rodar o projeto de verdade (Postgres + Nest no ar):** confirmou as 3 correções acima funcionando com requisições HTTP reais (e-mail inválido → 400 PT-BR; senha curta → 400; campo extra `deletado` → 400 pelo `whitelist`; e-mail duplicado → 409, era 500). Sobre o achado 3, reforçou que hoje as 42 exceções sem `ERRCODE` (confirmado: são 42, 0 têm código próprio) misturam categorias bem diferentes — "campanha não está ativa" (400 faz sentido), "transição de status não autorizada" (deveria ser 403), "limite atingido" (deveria ser 409) — e todas viram 400 igual hoje no filtro. Não quebra nada agora, mas quando o front começar a tratar erro por status HTTP (mostrar alerta de campo vs. mensagem de acesso negado), essa diferença vai importar. Continua sendo trabalho da Alexia no `.sql`; quando ela adicionar `ERRCODE`s próprios, dá pra refinar o `switch` do `PostgresExceptionFilter` pra não jogar tudo em 400.

---

## React — bugs já encontrados e corrigidos (contexto de rodadas anteriores, pra não repetir)

🟢 **Tailwind estava só via CDN `<script>`** — build de produção tinha ZERO CSS Tailwind real (tudo gerado em runtime no navegador, risco sério pra dia de defesa/rede bloqueada). Corrigido: `tailwindcss` + `@tailwindcss/vite` como dependência real de build; `<script>` do CDN removido do `index.html`.

🟢 **CSS Cascade Layers — regressão depois da migração acima.** `1-base.css` (reset) ficava SEM `@layer`, e CSS sem layer sempre vence CSS com layer, não importa a especificidade — por isso o reset (`margin:0`, etc.) estava silenciosamente vencendo classes do Tailwind (`.mx-auto`, `.px-4`...), descentralizando header/footer/breadcrumb. Corrigido envolvendo `1-base.css` em `@layer base` e os componentes (`2-componentes.css`, `3-admin-shell.css`, `4-crud.css`) em `@layer components`. **Se algo "sair do lugar" nesse projeto de novo depois de mexer em CSS, checar primeiro se o arquivo novo está dentro de um `@layer` — é o suspeito nº1.**

🟢 **`@import 'tailwindcss'` não pode ter outro `@import` depois dele no mesmo arquivo** (regra do CSS: imports vêm primeiro). Corrigido isolando em `tailwind-theme.css` próprio, importado separado (antes de `0-style.css`) em `main.jsx`.

🟢 **`react-router-dom` tinha CVE alto (CSRF bypass, faixa 7.12–8.2).** Trocado por `react-router` puro (v8.3.0, fora da faixa vulnerável, já inclui os bindings de DOM). `npm audit` → 0 vulnerabilidades.

🟢 **Rotas/breadcrumb/menu do admin eram 2-3 listas mantidas separadas** (abas do painel não eram URLs de verdade). Unificado em `services/router/rotas.constants.js` (`ROTAS` + `ROTAS_ADMIN`), única fonte de verdade consumida por `App.jsx`, `breadcrumb.jsx` e `admin-menu.constants.js`.

🟢 **Sistema de "constantes" pra botão/input/badge** — pedido explícito do Lucas pra tirar hardcoded de estilo repetido. `2-componentes.css`: `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-danger`, `.input-padrao`, `.badge`/`.badge-sucesso`/`.badge-neutro`, todos dentro de `@layer components`.

🟢 **`useConfiguracoes()` — infraestrutura nova pra nenhuma tela futura escrever valor de negócio na mão** (motivado pelo Claude Web analisando o Projeto de Interface: `R$ 5,00`, `5%` de taxa etc. hardcoded no HTML do protótipo, quando `valor_minimo_contribuicao`/`taxa_plataforma_padrao` já existem em `configuracoes`). Trio `services/11-configuracoes/context/provider/hook` (mesmo padrão do `toast-context`/`toast-provider`/`use-toast`, por causa do Fast Refresh); `configuracaoApi.buscarPublicas()` chama o `GET /configuracoes` já existente com `fetch` puro (sem `authFetch`) — a RLS (`pol_config_select`) já libera as configs globais pra anônimo, então não precisou de endpoint novo nem mudança no Nest. `ConfiguracoesProvider` monta em `main.jsx`, acima do `ToastProvider`/`App` — disponível pra qualquer tela futura, autenticada ou pública. Uso: `const { obterConfiguracao, carregando } = useConfiguracoes(); obterConfiguracao('taxa_plataforma_padrao', 5)` (2º argumento é o fallback enquanto carrega ou se a chave não existir/estiver inativa).

🟢 **`formatarMoeda`/`formatarPercentual`** — `services/constant/utils/formatacao.util.js`, pt-BR (`Intl.NumberFormat`). Mesmo motivo do item acima: no protótipo cada tela formatava dinheiro à mão, jeito garantido de gerar inconsistência (vírgula vs. ponto, `R$` em lugares diferentes).

---

## Pendências que ainda restam (deste lado Nest/React, não do banco)

🔴 **`GET /configuracoes` expõe TODAS as configs globais (`id_usuario IS NULL`) pra qualquer um, sem distinguir "pública" de "interna"** — isso já era assim antes desta rodada (decisão original documentada no comentário do `configuracao.service.findall.ts`: "Anônimo só enxerga as globais"), não é uma regressão nova. O Claude Web notou, analisando o Projeto de Interface, que algumas chaves fazem sentido expor amplamente (`taxa_plataforma_padrao`, `valor_minimo_contribuicao`, `prazo_minimo_campanha_dias`) enquanto outras são mais internas (`limite_tentativas_login`, `bloqueio_login_minutos`, `limite_caracteres_relato_denuncia`) e hoje saem juntas no mesmo `GET`. Não mexi nisso agora — é decisão de produto/segurança (criar uma coluna tipo `configuracoes.publica boolean`? separar num endpoint `/configuracoes/publicas` curado por uma lista de chaves? deixar como está?), não uma correção técnica óbvia. Fica registrado pro Lucas e pra Alexia decidirem quando quiserem — o `useConfiguracoes()` novo (item acima) funciona igual não importa qual caminho escolherem depois, só troca a URL que `buscarPublicas()` chama.

🔴 **Item 3 dos achados da Alexia (granularidade do `P0001`)** — ver nota do Claude Web dentro do achado 3, acima. Depende do `.sql` ganhar `ERRCODE`s próprios primeiro.
