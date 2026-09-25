# ⚛️ Documentação Técnica do Frontend React - CrowdAcadêmico

> 📌 **Numeração de RF (21-09-2026):** os requisitos vigentes são o `informacoes/REQUISITOS_V7.md` (120 RFs). Citações de RF por número neste documento foram escritas em datas diferentes e podem estar em qualquer numeração anterior (pré-06-09-2026, V6 ou V7). A `MATRIZ-RASTREABILIDADE-RF.md` já está inteira na numeração do V7 e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

Este documento é o equivalente do `DOCUMENTACAO_BD.md` para o **app React** que vive em `react/`. O objetivo é o mesmo: explicar as decisões de arquitetura e o *porquê* de cada padrão, de forma que os arquivos `.tsx`/`.ts` não precisem carregar toda a explicação inline - e que quem chegar depois entenda a estrutura sem ter que abrir 100 arquivos.

---

### ⚠️ Duas diferenças importantes em relação ao `DOCUMENTACAO_BD.md`

**1. Este documento descreve o ESTADO ATUAL, não é um log histórico.** O `DOCUMENTACAO_BD.md` acumulou semanas de auditorias com data, autoria e "era X, virou Y". Aqui não existe esse histórico consolidado. Onde o próprio código traz um comentário do tipo *"ERA X, virou Y, motivo Z"* (e há muitos - o código React deste projeto é fortemente comentado), a explicação é citada. Onde não há comentário, o comportamento é descrito como está hoje, sem inventar história.

**2. O protótipo de interface visual NÃO faz parte deste documento.** Existe, em `informacoes/Sem-Node-Projeto-de-Interface-CrowdAcademico/`, um protótipo estático em HTML/CSS/JS puro (sem Node, sem React, sem bundler) que mostra como o site público final deveria parecer. Ele é um **artefato separado**, com convenções próprias, fora do escopo deste documento - é citado aqui apenas quando o código do React declara que copiou algo dele (header, footer, paleta de cores, grupos do menu lateral).

### Legenda dos símbolos usados neste documento

| Símbolo | Significado |
|---|---|
| 📌 | Nota explicativa - o porquê de uma decisão |
| ⚠️ | Ponto de atenção / débito técnico - funciona, mas vale revisar |

---

## 📑 Índice

1. [Escopo: o que este app é (e o que ainda não é)](#1-escopo-o-que-este-app-é-e-o-que-ainda-não-é)
2. [Stack e ferramentas de build](#2-stack-e-ferramentas-de-build)
3. [Estrutura de pastas e a convenção de numeração](#3-estrutura-de-pastas-e-a-convenção-de-numeração)
4. [Roteamento](#4-roteamento)
5. [Autenticação (`use-auth.ts`)](#5-autenticação-use-authts)
6. [Padrão de service / API](#6-padrão-de-service--api)
7. [Upload de arquivo (`25-arquivo`)](#7-upload-de-arquivo-25-arquivo)
8. [`<GenericTable>` - o componente central do painel](#8-generictable--o-componente-central-do-painel)
9. [Componentes reutilizáveis](#9-componentes-reutilizáveis)
10. [Estado global: os três providers](#10-estado-global-os-três-providers)
11. [CSS, Tailwind e temas](#11-css-tailwind-e-temas)
12. [Campo de Testes (`campo-testes/`)](#12-campo-de-testes-campo-testes)
13. [Dependências: o que cada uma faz e por que está aqui](#13-dependências-o-que-cada-uma-faz-e-por-que-está-aqui)
14. [O que não existe ainda / pontos em aberto](#14-o-que-não-existe-ainda--pontos-em-aberto)
15. [Fluxo público: cadastro, termos de uso e verificação de e-mail](#15-fluxo-público-cadastro-termos-de-uso-e-verificação-de-e-mail)
16. [Minha Conta e moderação de conta](#16-minha-conta-e-moderação-de-conta)
17. [Painel Admin: Dashboard e suas 4 abas](#17-painel-admin-dashboard-e-suas-4-abas)

---

## 1. Escopo: o que este app é (e o que ainda não é)

O que existe em `react/` hoje é **um painel administrativo**: listar/criar/alterar/consultar/excluir os registros dos módulos que o backend Nest já expõe, mais um dashboard de métricas, mais uma área de "Minha Conta", mais um Campo de Testes de uso interno.

📌 **Este painel já não é "ferramenta descartável".** O `PENDENCIAS e correcoes.md` registra que a primeira versão (`views/dev/`, sem router, estilo mínimo) foi construída sob a premissa de que era *"ferramenta descartável, não a tela de admin de verdade"*. Essa premissa foi **explicitamente superada em 01-08-2026** (mesmo arquivo, parte 17): *"o Lucas decidiu, logo depois, que este painel NÃO é descartável - vira o admin de verdade. 'Devtools' virou 'crud' em tudo (pasta, CSS, nomes), e a tela ganhou Tailwind, header/footer reais, roteamento e menu lateral de verdade."* É por isso que a pasta hoje se chama `components/crud/` e o CSS `5-crud.css` - o nome antigo (`devtools`) não existe mais em lugar nenhum do código.

**O que NÃO existe:** a interface pública do site. Nenhuma página que um doador visitaria (página de campanha, home pública, checkout) foi construída em React. Ver a seção 14 e a seção *"Fora do backend (Nest)"* de `PROXIMOS_MODULOS.md`.

---

## 2. Stack e ferramentas de build

| Peça | Versão declarada em `react/package.json` | Observação |
|---|---|---|
| React | `^19.2.8` | com `react-dom` na mesma versão |
| Vite | `^8.2.0` | build e dev server |
| `@vitejs/plugin-react` | `^6.0.4` | |
| `react-router` | `^8.3.0` | o pacote é `react-router`, **não** `react-router-dom` |
| Tailwind CSS | `^4.3.3` | via `@tailwindcss/vite`, não via CDN |
| ESLint | `^10.8.0` | flat config em `eslint.config.js` |

**Scripts (`package.json`):** `npm run dev` (Vite), `npm run build`, `npm run lint` (`eslint .`), `npm run preview`.

📌 **Por que `react-router` e não `react-router-dom`.** Registrado em `PENDENCIAS e correcoes.md` (parte 17): `react-router-dom` estava travado numa versão 7.x com vulnerabilidade alta conhecida (*RSC Mode CSRF Bypass*); o projeto foi direto para o pacote `react-router` v8, que já inclui os bindings de DOM e está fora do intervalo vulnerável.

📌 **Tailwind é dependência real do build, não CDN.** `react/vite.config.js` carrega o plugin oficial. A troca (02-08-2026) veio de uma auditoria que achou o problema de raiz: o `dist/` gerado não continha nenhuma classe Tailwind de verdade, porque tudo era gerado em runtime pelo navegador baixando o CDN. Isso quebra sem rede, algo que não deveria ir pra produção de jeito nenhum.

⚠️ **Google Fonts e Font Awesome continuam via CDN**, e isso é deliberado. O comentário em `react/index.html` explica o critério: *"degradam suave se a rede falhar - ícone some, fonte cai pro fallback do sistema - diferente do Tailwind, que quebrava a página inteira sem CDN"*. Ou seja: só o que quebra a página inteira saiu do CDN.

### TypeScript (migração concluída em 07-09-2026)

Todo o `react/src` é **TypeScript** (`.ts` / `.tsx`). Zero arquivo `.js`/`.jsx` restando, `strict: true` no `tsconfig.json`, `allowJs` removido (existiu só durante a migração, como período de transição).

**Decisão do Lucas: TypeScript**, seguindo a recomendação já registrada aqui antes (*"o NestJS já é TypeScript por padrão - manter o front em JavaScript puro cria uma costura inconsistente entre as duas pontas"*) - `PENDENCIAS e correcoes.md`, item 10, marcado 🟢 desde então. Migração feita de uma vez (06/07-09-2026), em 7 fases (das folhas pra raiz - `constants/`/`util/` primeiro, `views/`/raiz do app por último), zero mudança de comportamento de propósito - o que foi achado de errado no caminho ficou registrado, não corrigido na hora (`ACHADOS_PARA_DISCUTIR.md`, itens 7 a 13).

`any`/`@ts-ignore`/`@ts-expect-error` são proibidos; `as` só é permitido numa única fronteira fechada (`tratarResposta<T>()` em `services/constant/api/http.util.ts` - conversão de bytes crus de rede pra dado tipado, onde é estruturalmente impossível ao compilador deduzir o tipo sozinho). Detalhamento completo da migração, decisões tomadas e achados no caminho: `ACHADOS_PARA_DISCUTIR.md` (itens 7 a 14) e `DOCUMENTACAO_LINT.md`.

Efeito colateral que a migração **não** resolveu, e não tentou resolver: como não há import cruzado entre `nest/` e `react/` (são dois projetos com compilação separada), os tipos de `services/*/type/` são espelho **manual** dos DTOs do Nest, e algumas constantes de valor (não só de tipo) também precisam ser mantidas em sincronia manualmente. Dois exemplos que o próprio código admite:

- `services/25-arquivo/util/reduzir-imagem.util.ts`: *"mesmo perfil (largura/qualidade) usado no backend pro mesmo contexto, ver `PERFIL_PROCESSAMENTO_POR_CONTEXTO` em `arquivo.constants.ts` - mantenha os dois em sincronia manualmente, não há import cruzado entre os repositórios `nest/` e `react/`"*.
- `components/input/seletor-foto-perfil.tsx`: a lista de MIME types aceitos *"espelha a lista aceita no backend ... Se um dia o backend mudar essa lista, mudar aqui também"*.

### Lint

Duas camadas - detalhamento completo, incluindo toda regra ligada/testada e o porquê, em `DOCUMENTACAO_LINT.md`. Resumo: `react/eslint.config.js` tem 2 blocos - `**/*.{js,jsx}` (hoje só cobre `eslint.config.js`/`vite.config.js`, os únicos arquivos JS puro que restam no projeto, de propósito) e `**/*.{ts,tsx}` (todo o resto, com `tseslint.configs.recommended` + `parserOptions.projectService` ligado desde 07-09-2026 - lint ciente de tipo, não só de forma).

⚠️ Há `eslint-disable-next-line` pontuais no código, sempre com justificativa escrita ao lado. O padrão mais comum é em `useEffect` que busca dados na montagem - ex.: em `components/crud/generic-table.tsx`, *"padrão comum de 'buscar dado ao montar/quando a query mudar' (mesmo exemplo dos docs do React) - a regra nova `react-hooks/set-state-in-effect` marca a chamada de `setCarregando`/`setErro` como suspeita mesmo assim"*.

⚠️ **Não existe teste automatizado no React.** A verificação é só `npm run build` + `npm run lint` (`PENDENCIAS e correcoes.md`, parte 17: *"Nenhum teste automatizado no React ainda (só `nest/` tem `npm test`)"*). Isso não mudou.

---

## 3. Estrutura de pastas e a convenção de numeração

```
react/
├── index.html          - shell HTML (fontes/ícones via CDN, ver seção 2)
├── vite.config.js
├── eslint.config.js
├── .env                - só VITE_API_URL
└── src/
    ├── main.tsx        - createRoot + os providers globais
    ├── App.tsx         - monta as <Route> a partir de rotas.constants.ts
    ├── assets/css/     - CSS numerado próprio + tema Tailwind
    ├── components/     - o que é reutilizável entre módulos
    ├── services/       - comunicação com a API + estado compartilhado
    └── views/          - as páginas em si
```

### A regra: `views/` e `services/` espelham os números dos módulos Nest

Tanto `services/` quanto `views/` usam pastas nomeadas `<numero>-<nome>`, com **o mesmo número do módulo correspondente no backend** - `services/1-usuario/`, `services/2-papel-permissao/`, `services/11-configuracoes/`, `services/12-campanha/`, `services/25-arquivo/`, `services/27-log-auditoria/`, e assim por diante.

📌 **Por que.** A regra está registrada em `PENDENCIAS e correcoes.md`, na descrição da primeira versão do painel: *"Pastas novas espelhando números que já existiam no Nest (`services/2-papel-permissao/`, `services/11-configuracoes/`), sem inventar número novo - mesma regra da reorganização anterior."* O efeito prático é que o número é uma chave estável entre os dois repositórios: `services/9-tipo-link/api/tipo-link.api.ts` fala com `nest/src/9-tipo-link`, e o comentário no topo de praticamente todo arquivo `.api.ts` diz isso explicitamente (*"Espelha `nest/src/9-tipo-link`"*).

Vários arquivos `.api.ts` vão além e citam o artefato exato do banco que sustenta a rota - ex.: `tipo-link.api.ts` anota que o `GET` é público *"(`pol_tipolink_select` é `USING(true)`, `04_rls_policies.sql` `[04-C-2]`)"*. Ou seja: a numeração amarra React ↔ Nest, e os comentários amarram React ↔ `DOCUMENTACAO_BD.md`.

### Pastas sem número

Nem tudo mapeia para um módulo do Nest. Essas ganham nome próprio, no mesmo nível:

| Pasta | Conteúdo |
|---|---|
| `services/constant/` | o que é compartilhado por todos os módulos: `constants/api.constants.ts` (a URL base), `api/http.util.ts` (tratamento de resposta), `api/traduzir-erro.util.ts`, `utils/formatacao.util.ts` (moeda/percentual/CPF em pt-BR) |
| `services/router/` | `rotas.constants.ts` - a fonte única de "quais páginas existem" |
| `services/admin/` | `api/dashboard.api.ts` (métricas do painel, módulo `28-dashboard` no Nest) |
| `services/campo-testes/` | contexto, hooks e utilitários da bancada de testes (ver seção 12) |
| `views/admin/` | a casca do painel (layout, sidebar, menu) e as telas de Dashboard |
| `views/campo-testes/` | as telas T1/T2/T3/T4 |

### Subpastas dentro de cada módulo de `services/` - convenção oficial (fechada em 06-09-2026)

**`api/constants/hook/type[/context][/util]`** - esqueleto oficial pra todo módulo novo daqui pra frente, criado com `.gitkeep` mesmo antes de existir código. As 4 primeiras são a base; `context/` e `util/` só entram quando o módulo precisa mesmo delas (critério de cada uma, abaixo). Não existe mais "duas convenções coexistindo" - `11-configuracoes` (que tinha `provider/` separado de `context/`) já foi unificada nesse formato numa rodada anterior; o que restava era só formalizar por escrito que este é o padrão pra módulo NOVO, não migrar nada em módulo antigo.

⚠️ **Não é retroativo:** 4 módulos mais antigos (`10-motivo-denuncia`, `9-tipo-link`, `27-log-auditoria`, `5-termo-uso`) nunca ganharam o esqueleto completo - têm só `api/`, sem os `.gitkeep` de `constants/hook/type`. Não é erro nem pendência - são módulos simples o bastante pra nunca ter precisado das outras pastas; a convenção vale pra módulo novo, não obriga recriar pasta vazia em módulo que já funciona sem ela.

**Duas pastas a mais, ambas opcionais, cada uma resolvendo um problema diferente:**
- **`context/`** - só existe nos módulos que precisam de estado compartilhado entre telas sem parentesco (`11-configuracoes`, `campo-testes`). Critério de quando um módulo ganha ela, e o formato exato, na seção 10.
- **`util/`** - só existe nos módulos que têm lógica pura auxiliar que não é chamada de API (`api/`), nem estado (`hook/`/`context/`), nem constante fixa (`constants/`) - hoje usada por `25-arquivo` e `campo-testes`. Critério é o mesmo espírito das outras: se o módulo tem uma função "cálculo/formatação sem efeito colateral" que várias partes dele reaproveitam, ela mora aqui em vez de duplicada dentro de cada `api.ts`/hook.

🟢 **A pasta `type/` deixou de estar vazia (07-09-2026)** - era resquício do esqueleto pensado para TypeScript, sem uso enquanto a decisão "React em JavaScript ou TypeScript" não tinha sido tomada. Com a migração concluída, `type/` de todo módulo com chamada de API real (13 módulos, ver `ACHADOS_PARA_DISCUTIR.md` sobre o escopo exato da Fase 2) hoje espelha os DTOs de resposta (e, desde o refinamento pós-migração, também de request) do Nest correspondente - um arquivo `<modulo>.type.ts` por módulo. Os módulos sem chamada de API real ainda mantêm a pasta reservada, só com `.gitkeep`.

⚠️ Em `views/`, as pastas `checkout/`, `dash-doador/` e `dash-pesquisador/` existem só com `.gitkeep`. São lugares reservados para a interface pública/de usuário final, ainda não construída. O mesmo vale para `components/pagination/` e `components/search/`.

---

## 4. Roteamento

O roteamento usa **React Router** (`react-router` v8), com `<BrowserRouter>` em `main.tsx` e as `<Route>` montadas em `App.tsx`.

### A fonte única: `services/router/rotas.constants.ts`

📌 Este é o arquivo mais importante da navegação. Ele exporta **duas listas** e três consumidores diferentes leem dela - nunca cada um com a sua cópia. O comentário do arquivo explica:

> *"Fonte única de verdade pra 'quais páginas existem' - `App.tsx` monta as `<Route>` a partir daqui, e `breadcrumb.tsx` monta o rótulo a partir daqui."*

- **`ROTAS`** - páginas públicas/pré-login, sem menu lateral: `/login`, `/cadastro`, `/verificar-email`.
- **`ROTAS_ADMIN`** - tudo que precisa do menu lateral, renderizado dentro do `<Outlet/>` de `views/admin/admin-layout.tsx`.

Cada entrada carrega, além de `caminho` e `elemento`, os metadados que os outros consumidores usam:

| Campo | Para que serve |
|---|---|
| `rotuloBreadcrumb` | rótulo no breadcrumb; `null` = não aparece |
| `paiCaminho` | o caminho absoluto da listagem "dona" da rota de detalhe, para o breadcrumb montar a cadeia completa (`Início > Usuários > Alterar Usuário`) |
| `rotuloMenu` / `grupoMenu` / `icone` | o que o menu lateral desenha; ausência de `grupoMenu` = a rota existe mas **não** vira item clicável do menu |

📌 **Por que rotas de verdade e não abas em `useState`.** Registrado em `PENDENCIAS e correcoes.md`, parte 17: a versão anterior usava `useState` para trocar de aba, e a consequência real era *"sem link direto pra uma aba, botão Voltar não navegava entre abas, F5 sempre voltava pra 'Usuários'"*. A decisão de unificar foi tomada pelo Lucas naquele momento; hoje a sidebar usa `NavLink`, e o item ativo é decidido pela própria URL.

📌 **Como uma rota de detalhe mantém a aba "pai" destacada sem código extra.** O comentário do arquivo explica: *"a URL aninhada, ex.: `/admin/usuarios/8/alterar`, já COMEÇA com `/admin/usuarios`, então o próprio `NavLink` de 'Usuários' já marca 'ativo' sem código nenhum extra."*

### Redirecionamentos em `App.tsx`

- `/` → `/admin/dashboard`. Comentário: *"a aba padrão, 08-08-2026 - ERA `/admin/usuarios` até o Dashboard existir"*.
- `/admin/minha-conta` → `/admin/minha-conta/perfil`. Existe porque "Minha Conta" virou uma rota parametrizada (`/admin/minha-conta/:aba`, com abas Perfil/Segurança/Papéis/Acadêmico/Privacidade) e o link antigo precisava continuar funcionando.

### O menu lateral é derivado, não duplicado

`views/admin/admin-menu.constants.ts` **não** tem lista própria de itens: ele filtra `ROTAS_ADMIN` por `grupoMenu` via uma função `itensDoGrupo()`. O comentário registra o problema que isso resolveu: *"antes existiam 2 listas (esta e `ROTAS`) descrevendo as mesmas 3 abas, com risco de desalinhar"*.

Os grupos hoje são: um grupo sem título (só o Dashboard, com divisória), `GESTÃO DO USUÁRIO`, `Configurações`, `CAMPANHA`, `MODERAÇÃO` e - só em desenvolvimento - `CAMPO DE TESTES`.

📌 **Chave interna ≠ rótulo visível.** O `grupoMenu` das rotas continua sendo a string `'CADASTROS'` mesmo que o título exibido já tenha mudado duas vezes (para "GESTÃO DE ACESSO E SISTEMA" e depois "GESTÃO DO USUÁRIO"). O comentário justifica: *"é só a CHAVE interna que liga rota↔grupo, não aparece na tela; só o rótulo visível muda"*. O mesmo raciocínio vale para `/admin/configuracoes`, cuja URL não mudou quando o item passou a se chamar "Parâmetros do Sistema".

⚠️ O grupo `MODERAÇÃO` tem 4 itens escritos à mão e marcados `desabilitado: true` (Aprovar Campanhas, Denúncias, Solicitações, Enc. Antecipados). O comentário é explícito sobre o porquê: *"são só o desenho do painel completo, sem fingir que uma tela que não existe funciona"*.

📌 **Item desabilitado da sidebar usa `aria-disabled`, não `disabled` (23-09-2026).** `views/admin/admin-sidebar.tsx` renderizava esses 4 itens como `<span className="dica"><button disabled>...`, pra a dica "Ainda não implementado" aparecer no hover (um `<button disabled>` de verdade sai do fluxo de eventos de mouse). Só que isso também tira o item do fluxo de **foco por teclado** - Tab nunca alcançava, então quem navega sem mouse nunca recebia a dica. Trocado por `<button aria-disabled="true">` sem `disabled`, com a classe `dica` movida pro próprio botão (sem wrapper): o CSS de `.admin-sidebar__item--desabilitado` já era por classe, não por `:disabled`, então nada muda visualmente, e o item passa a ser focável e a dica aparece também no Tab. Nenhum dos 4 itens tem `onClick`, então não há nada a bloquear na prática.

`components/layout/cabecalho/busca-global.tsx` (o Ctrl+K) também deriva sua seção "Navegação" de `ROTAS_ADMIN`, pelo mesmo motivo.

---

## 5. Autenticação (`use-auth.ts`)

Arquivo: `services/3-auth/hook/use-auth.ts`. É um hook único, **chamado uma vez só, em `App.tsx`**, e o objeto resultante desce por prop para o `Layout` (e daí para o `Header`) e para cada página:

```jsx
const auth = useAuth();
// ...
<Route path={caminho} element={<Elemento auth={auth} />} />
```

📌 O comentário do próprio `App.tsx` justifica: *"`useAuth()` chamado uma vez só, aqui em cima - Header (dentro de Layout) e cada página recebem o mesmo `auth` por prop, nunca cada um com sua própria sessão."* Não há Context de autenticação; é passagem explícita por prop.

### Onde cada token mora

| Token | Onde fica | Por quê |
|---|---|---|
| **access token** | só em memória (`useState`) | *"nunca localStorage - some ao fechar a aba, de propósito"* (comentário do arquivo) |
| **refresh token** | `localStorage`, chave `crowdacademico.refreshToken` | *"pra não precisar logar de novo a cada F5"* |

O hook devolve: `accessToken`, `usuario`, `papeis`, `ehAdmin`, `carregando`, `autenticado`, `login`, `cadastrar`, `logout`, `authFetch` e `atualizarUsuarioLocal`.

⚠️ **`papeis`/`ehAdmin` não são autorização.** O comentário deixa claro: *"não é uma checagem de permissão de verdade, só decide o que aparece na UI; toda ação real continua validada pelo backend/RLS a cada requisição."* Isso é coerente com a arquitetura registrada no `DOCUMENTACAO_BD.md` e em `PENDENCIAS e correcoes.md` (item 7): o Nest não tem guard de permissão por nome - quem decide é a RLS do Postgres.

### `authFetch` - o único caminho para a API

Toda chamada autenticada do painel passa por `authFetch(caminho, opcoes)`. Ele:

1. monta os headers com `Content-Type: application/json` + `Authorization: Bearer <accessToken>` quando há token;
2. dispara o `fetch` contra `${API_BASE_URL}${caminho}`;
3. **se a resposta for 401 e houver refresh token, renova a sessão uma vez e repete a chamada original**;
4. se a renovação falhar, limpa a sessão.

O comentário resume: *"SEMPRE manda Bearer quando tem accessToken. Se a resposta vier 401 (access token expirado - dura só 15min), tenta renovar UMA vez com o refresh token e repete a chamada original. Isso é o que todo o painel admin usa pra falar com a API - nunca `fetch()` cru direto."*

### Duas proteções contra corrida, ambas com bug de origem documentado

📌 **Renovação única em voo (`refreshEmAndamentoRef`).** O refresh token é de **uso único** (o backend revoga a sessão antiga ao emitir a nova). O comentário descreve o sintoma original: *"o Lucas viu 'token de acesso inválido' 3x seguidas ao voltar de um tempo parado ... uma tela que dispara várias requisições de uma vez ... fazia CADA requisição tentar renovar por conta própria, ao mesmo tempo. ... a 1ª chamada a chegar no backend ganha, as outras recebem 'refresh token inválido'"*. A correção: existe no máximo **uma** promise de renovação por vez; quem chegar depois espera o resultado dela.

📌 **O `useEffect` de restauração também usa essa promise compartilhada.** O comentário registra que esse efeito chamava `authApi.refresh()` direto, por fora da proteção acima, e que isso causava um bug real: *"um F5/link direto que deveria continuar logado às vezes voltava pra tela de login sem motivo aparente"* (o efeito tratava qualquer erro com `limparSessao()` incondicional e podia apagar a sessão que a outra chamada vencedora tinha acabado de salvar). Hoje ele chama `renovarSessao()`, a mesma promise compartilhada.

📌 **Deduplicação de `GET` em voo (`requisicoesEmAndamentoRef`).** Duas chamadas simultâneas ao **mesmo caminho** dividem a mesma resposta (com `.clone()`, porque o corpo de um `Response` só pode ser lido uma vez). Motivo documentado: o `<StrictMode>` de `main.tsx` dispara todo `useEffect` duas vezes em desenvolvimento, o que virava duas requisições reais e dois toasts de erro. **Só `GET` é deduplicado** - o comentário é explícito: *"create/update/remove nunca são, de propósito - aqueles são sempre 1 clique = 1 ação, nunca disparados por `useEffect`."*

### Configuração de endereço

`services/constant/constants/api.constants.ts`:

```js
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
```

O comentário registra que `react/.env` contém apenas essa URL, *"sem segredo nenhum - só a URL - por isso commitado normal, sem virar `.env.local`"*.

⚠️ Existe pendência aberta sobre isso: `PENDENCIAS e correcoes.md`, item 744 - `react/.gitignore` **não** cobre `.env` (diferente de `nest/.gitignore`). Hoje é inofensivo pelo conteúdo, mas a rede de segurança não existe. A correção (uma linha no `.gitignore`) foi deliberadamente adiada a pedido do Lucas. Confirmado nesta redação: `react/.gitignore` continua sem a linha.

---

## 6. Padrão de service / API

### Um arquivo `<modulo>.api.ts` por módulo

Cada módulo tem `services/<n>-<nome>/api/<nome>.api.ts` exportando **um objeto único** com as operações. Exemplo real, `services/1-usuario/api/usuario.api.ts`:

```js
export const usuarioApi = {
  listar: (authFetch) => authFetch('/usuario').then(tratarResposta).then((r) => r.dados),
  buscar: (authFetch, id) => authFetch(`/usuario/${id}`).then(tratarResposta),
  criar: (authFetch, dados) => authFetch('/usuario', { method: 'POST', body: JSON.stringify(dados) }).then(tratarResposta),
  // ...
};
```

📌 **`authFetch` é injetado, nunca importado.** O comentário do arquivo diz: *"`authFetch` vem de `use-auth.ts` (`services/3-auth/hook`) - injetado, não importado direto, pra este arquivo não precisar saber nada de token."* Toda função autenticada recebe `authFetch` como **primeiro parâmetro**, sem exceção.

📌 **Rota pública usa `fetch` cru, com o motivo escrito ao lado.** Onde a RLS do banco já libera a leitura para qualquer um, a função chama `fetch(`${API_BASE_URL}...`)` diretamente e o comentário diz por quê. Exemplos:

- `configuracao.api.ts` → `buscarPublicas()`: *"Sem `authFetch` de propósito: `pol_config_select` já libera as configurações globais (`id_usuario IS NULL`) pra qualquer um, logado ou não - é o que sustenta `useConfiguracoes()` em página pública (campanha, home), que roda fora de `<ConfiguracoesProvider>` autenticado."*
- `tipo-link.api.ts` → `listarPublico()`: mesma justificativa, apontando `pol_tipolink_select`.
- `arquivo.api.ts` → `buscar()` e `buscarAvatarPorUsuario()`: *"são públicos no backend (`pol_arquivo_select` é `USING(true)`)"*.

📌 **Paginação desembrulhada num lugar só.** Vários endpoints devolvem `{ dados, total, pagina, tamanho }` desde 03-08-2026, correção de um problema real: um `findall` sem `limit`/`offset` baixaria a tabela inteira conforme ela crescesse. O `.dados` é desembrulhado **dentro do `.api.ts`**, uma vez só, pra `GenericTable` e todo o resto do app continuar recebendo um array puro, sem precisar saber que página/total existem.

📌 **`13-orcamento-campanha` e `14-marco-cronograma` ganharam `type/`+`api/` (23-09-2026).** Antes, `ItemOrcamento`/`MarcoCronograma` viviam como interface local dentro de `views/campo-testes/bancada-campanha.tsx`, com o comentário admitindo shape inferido do próprio uso (só a bancada consumia). Extraídos pro molde padrão (`OrcamentoCampanhaResponse`/`MarcoCronogramaResponse`, espelhando os DTOs reais do Nest, incluindo `descricao`/`ordem`/`criadoEm` que a bancada não usa hoje). `orcamentoCampanhaApi.listar`/`marcoCronogramaApi.listar` substituíram as 2 chamadas `authFetch` cruas de leitura. As 6 chamadas de escrita (criar/alterar/excluir dos 2 recursos) **continuam** via `chamarERegistrar` (o hook do Campo de Testes que também alimenta T4/Registro de Chamadas) - não passaram pra API nova de propósito, porque essa troca perderia o registro em T4.

📌 **A listagem que trunca em 500 avisa (20-09-2026).** O backend limita as listagens em 500 registros (`paginacao.util.ts`, teto de segurança, não paginação de tela). Antes, as 11 chamadas de listagem faziam `.then((resposta) => resposta.dados)` e descartavam o `total`: no registro 501 a tela passava a mentir em silêncio ("500 registros" existindo 3000). Agora todas passam por `desembrulharPaginado(rotulo)` (`services/constant/type/paginacao.type.ts`), que mantém o mesmo retorno (`T[]`) e dá um `console.warn` quando `total` é maior que o devolvido. Não é paginação no servidor (o volume atual não justifica), só o fim do silêncio.

### `tratarResposta` - `services/constant/api/http.util.ts`

Todo `.api.ts` termina em `.then(tratarResposta)`. A função:

- se `!resposta.ok`, lança um **`ErroHttp`** (subclasse de `Error` que carrega `status` além da mensagem);
- se ok, lê o corpo **como texto primeiro** e só faz `JSON.parse` se houver algo.

📌 O segundo ponto tem origem documentada: *"achado do Lucas: 'Unexpected end of JSON input' ao atribuir permissão. Checar só `status === 204` não bastava. Endpoint que só cria um vínculo ... volta com corpo vazio, mas o Nest manda 201 (padrão de POST), não 204 ... Ler como texto primeiro e só fazer `JSON.parse` se tiver algo cobre QUALQUER status com corpo vazio."*

📌 **Por que `ErroHttp` carrega o `status`:** *"o backend já categoriza erro em 4 faixas de HTTP pelo ERRCODE (`postgres-exception.filter.ts`), mas o React descartava o status e ficava só com o texto - sem status, `traduzir-erro.util.ts` não tem como tratar 429/5xx/etc de forma diferente do resto."*

### `traduzirErro` - `services/constant/api/traduzir-erro.util.ts`

Espelho, do lado do React, do `postgres-exception.filter.ts` do Nest. Trata só as duas categorias que o backend **não** consegue cobrir sozinho:

1. **falha de rede** (backend fora do ar, sem internet, CORS) - o `fetch` rejeita antes de existir qualquer resposta HTTP, e `erro.message` seria o texto do navegador em inglês ("Failed to fetch");
2. **429** (rate limit do `@nestjs/throttler`) - a mensagem padrão do Nest não é escrita para o usuário final.

📌 Todo o resto passa direto: *"400/403/404/409... já vem em PT-BR, específico e correto direto do backend ... não faz sentido sobrescrever o que já está certo."*

O par "texto de erro na tela + toast" está encapsulado em `components/layout/toast/use-erro-toast.ts` (`reportarErro(erro)`), que faz `setErro(traduzirErro(erro))` e dispara o toast numa chamada só - *"qualquer tela nova que adote isto ganha o toast de graça, sem precisar lembrar da 2ª linha"*.

---

## 7. Upload de arquivo (`25-arquivo`)

`services/25-arquivo/api/arquivo.api.ts` é o exemplo mais completo do padrão de service, porque é o único que fala com **dois hosts diferentes**.

### O fluxo, na prática: três chamadas de rede

| Passo | Chamada | Vai para |
|---|---|---|
| 1 | `arquivoApi.iniciarUpload(authFetch, { nomeOriginal, tipoMime, tamanhoBytes })` → `POST /arquivo/upload/iniciar` | backend Nest (autenticado) |
| 2 | `arquivoApi.enviarParaBucket(uploadPreAssinado, arquivo)` → `PUT` na URL pré-assinada | **direto no provedor de armazenamento** |
| 3 | `arquivoApi.confirmarUpload(authFetch, { chave, nomeOriginal, tipoMime, tamanhoBytes, contexto })` → `POST /arquivo/upload/confirmar` | backend Nest (autenticado) |

📌 **O passo 2 nunca usa `authFetch`.** O comentário do arquivo é explícito: *"PUT direto no provedor de armazenamento, NUNCA via `authFetch` - é outro host, não deve levar `Authorization` nem `Content-Type: application/json`"*. Os `cabecalhosObrigatorios` devolvidos pelo passo 1 precisam ir **exatamente** como vieram, porque é isso que a assinatura da URL confere. Também não passa por `tratarResposta`: *"a resposta do bucket não é JSON e não segue o formato do nosso backend"*.

⚠️ **Discrepância de nomenclatura, sem impacto funcional.** O comentário de `arquivo.api.ts` chama o fluxo de *"upload em 2 passos"* (contando só as duas chamadas ao Nest, mesma contagem usada por `PROXIMOS_MODULOS.md`), enquanto `seletor-foto-perfil.tsx` fala em *"fluxo de upload de 3 passos"* (contando também o PUT no bucket). São a mesma coisa descrita de dois jeitos; vale uniformizar se alguém for mexer nos dois arquivos.

### `contexto` - quem manda no processamento do backend

O passo 3 envia um campo `contexto` (hoje sempre `'avatar'`), que diz ao backend qual perfil de redimensionamento aplicar.

⚠️ Segundo `PROXIMOS_MODULOS.md` (atualizado em 01-09-2026): *"hoje só o avatar chama `contexto: 'avatar'` - a tela de Criar Campanha ainda não existe no React, então `contexto: 'campanha'`/`'atualizacao'` não tem chamador real ainda, só o perfil implementado no backend."*

---

## 8. `<GenericTable>` - o componente central do painel

Arquivo: `components/crud/generic-table.tsx`. É o componente mais reutilizado do app.

📌 **A ideia, na frase do próprio código:** *"Tabela genérica de LISTAGEM (leitura, filtro, ordenação, paginação) usada pelo painel admin - cada módulo novo do Nest com listagem simples vira só uma entrada de colunas aqui, não uma tela nova escrita do zero."*

### Como é configurado

O componente é dirigido por props, não por herança nem por children:

| Prop | O que faz |
|---|---|
| `titulo`, `acaoTopo` | cabeçalho da seção e o botão da direita (ex.: "Criar") |
| `colunas` | array de `{ chave, rotulo }`, com extras opcionais: `renderizar(linha)`, `centralizar`, `largura`, `quebrarRotulo` |
| `chavePrimaria` | nome do campo usado como `key` de linha |
| `listar` | função **já pré-amarrada** com `authFetch` pelo componente pai; a tabela só a chama |
| `acoes` | `Partial<Record<'alterar'\|'consultar'\|'excluir', (linha) => void>>` (14-09-2026, ERA `acoes: AcaoPadrao[]` + `aoAlterar`/`aoConsultar`/`aoExcluir` separados) - quais botões aparecem é derivado das CHAVES presentes, não de uma lista à parte. Ausente ⇒ sem coluna de ações |
| `colunaExtra` | `{ rotulo, renderizar(linha) }` - coluna que pode renderizar qualquer coisa, independente de `acoes` |
| `filtrosFacetados` | array de `{ chave, rotulo, ordem? }` - cada um vira um dropdown de múltipla escolha |

Não existe prop de log - `BlocoLogAuditoria` é um componente IRMÃO (ver seção 9), colocado pela tela logo abaixo de `<GenericTable>`, não uma prop daqui (13-09-2026, achado do Lucas: "log de auditoria não é estrutura de tabela").

📌 **CRUD não acontece dentro da tabela.** Comentário: *"Criar/Alterar/Excluir NÃO acontecem mais aqui dentro (pedido do Lucas, 02-08-2026: 'tudo que faz parte do CRUD precisa de view própria') ... páginas de verdade, com sua própria URL, não formulário/`confirm()` embutido na tabela."*

📌 **Estado de filtro/página/ordenação vive na URL**, via `useSearchParams`, não em `useState` local. Motivo documentado: *"ao voltar de 'Consultar' via `navigate(-1)`, o filtro escolhido resetava - a página de listagem é desmontada na troca de rota, e `useState` não sobrevive a isso."* Toda escrita usa `{ replace: true }`, para que o botão Voltar não fique preso no passo-a-passo de cada clique de dropdown. Nomes reservados na query string: `q`, `pagina`, `tamanho`, `ordenar`, `dir`.

📌 **Comportamentos inferidos do dado, não configurados por tela.** Três coisas são decididas "sniffando" o tipo do primeiro valor não-nulo de cada coluna, para não exigir configuração nova nas ~10 telas que já usam o componente:
- **ordenação** por `number` / `boolean` / `string` (com `localeCompare` em `pt-BR`);
- **centralização** de colunas numéricas e booleanas (pedido da Alexia, 18-08-2026: *"centralizar o negócio de sim e não"*);
- **largura mínima** de cada coluna, calculada em `ch` a partir da lista **inteira** (não da página visível) - porque *"`table-layout: auto` recalcula a largura de cada coluna com base SÓ nas linhas visíveis; trocar de página muda o conjunto visível, a largura muda junto"* (achado do Lucas: *"as colunas dançam ao trocar de página"*). É `min-width`, não `width`, para não quebrar o responsivo.

📌 **Booleano vira badge Sim/Não**, não o texto cru `true`/`false` - *"'E-MAIL VERIFICADO: false' não é instantâneo de ler, um badge é"*.

📌 **Ordena a lista filtrada inteira, antes de paginar** - nunca só a página atual. O comentário nomeia o bug clássico que isso evita: *"linha some da vista ao virar página, ordem parece errada entre páginas"*.

📌 **Facetas:** entre facetas diferentes o filtro é **E**; dentro da mesma faceta é **OU**; nenhuma opção marcada = "Todos". As opções de cada dropdown são derivadas dos dados já carregados (da lista completa, não da filtrada - *"senão as opções desapareceriam/reapareceriam conforme a pessoa digita"*). Um dropdown só aparece se houver mais de um valor possível.

📌 **Esqueleto de carregamento** (`animate-pulse`, mesmas colunas) em vez de "Carregando..." - *"padrão comum em painel admin (Linear, Stripe, Vercel) ... em vez de um texto solto que faz a tela 'pular' quando os dados aparecem."*

⚠️ **O filtro e a paginação são 100% client-side.** O comentário admite o limite: *"resolve 'achar uma linha no meio de 28' (Configurações já tem esse tanto), mas não resolve buscar num universo de milhares sem baixar tudo primeiro - isso exigiria busca no próprio backend (`LIMIT/OFFSET` + `WHERE`), fora do escopo desta rodada."*

📌 **Segundo teste de prop, complementar ao "uma tela sem tabela viveria sem isto?" (14-09-2026, revisão do Lucas).** O teste original só decide ENTRADA (o que pode virar prop daqui). Ele não decide SAÍDA - se algo que já mora aqui dentro deveria sair. Segundo teste, escrito no próprio `generic-table.tsx`: **"se uma tela que NÃO PODE usar este componente ainda assim precisa disto, então isto é um IRMÃO, não um miolo."** Foi esse critério que já tinha feito o `BlocoLogAuditoria` nascer (13-09-2026); aplicado de novo em 14-09-2026, tirou o rodapé de paginação (`components/pagination/rodape-paginacao.tsx`) e a barra de busca/faceta (`components/search/barra-filtros.tsx`) de dentro do `generic-table.tsx` - as bancadas do Campo de Testes (não podem usar `<GenericTable>`, risco de linha) precisavam dos dois mesmo assim, e reimplementavam à mão.

### Quem usa

Todas as telas `listar-*.tsx`: `views/1-usuario/listar-usuarios.tsx`, `views/2-papel-permissao/listar-papeis.tsx`, `views/6-perfil-pesquisador/listar-pesquisadores.tsx`, `views/8-area-conhecimento/`, `views/9-tipo-link/`, `views/10-motivo-denuncia/`, `views/11-configuracoes/`, `views/12-campanha/`.

⚠️ As telas do Campo de Testes (`views/campo-testes/`) **não** usam `<GenericTable>` - implementam a TABELA por conta própria (risco de linha exige controle manual), mas desde 14-09-2026 reaproveitam `<RodapePaginacao>` e `<BarraFiltros>` (ver acima) em vez de duplicar filtro/faceta/paginação à mão. `TAMANHOS_PAGINA`/`LIMIAR_FILTRO` moraram em 4 lugares até 14-09-2026; hoje só existem em `components/pagination/tamanhos-pagina.constants.ts`/`components/search/limiar-filtro.constants.ts`.

---

## 9. Componentes reutilizáveis

### `components/crud/` - as cascas das páginas de CRUD

| Componente | Papel |
|---|---|
| `generic-table.tsx` | ver seção 8 |
| `cartao-formulario.tsx` | casca de Criar/Alterar/Excluir: ícone circular + título + subtítulo + cartão |
| `ficha-consulta.tsx` | casca das telas "Consultar" (`<FichaConsulta>` + `<SecaoFicha>` + `<CampoFicha>`) |
| `campo-somente-leitura.tsx` | um dado exibido, não editável, com o mesmo visual do `<label>` dos formulários |
| `modal-detalhe.tsx` | modal genérico de "detalhe explicado" (título, chave em fonte mono, badge, seções) |
| `modal-ficha.tsx` | casca larga dos modais de Consultar/Alterar/Criar (backdrop + cartão + rodapé). **Três caminhos de fechar**, todos passando por `aoFechar`: o X, o clique no fundo escurecido (desligável com `fecharAoClicarFora={false}`, usado no wizard de Criar Campanha para um clique perdido não descartar várias etapas) e a tecla **Esc** (sempre ligada, é ação deliberada como o X). Limite conhecido: dois `ModalFicha` empilhados fecham juntos no Esc, cada um registra o próprio listener, por isso o Campo de Testes evita modal sobre modal |
| `log-auditoria-painel.tsx` (ver `bloco-log-auditoria.tsx`) | painel "Ver log" - componente IRMÃO colocado pela tela logo abaixo de `<GenericTable>`, não uma prop dela |
| `acao-linha.tsx` | ícone + texto + dica de hover de cada ação de linha (Alterar/Consultar/Excluir) - usado por `GenericTable` E pelas bancadas do Campo de Testes |
| `badge-booleano.tsx` | `<span className="badge ...">Sim/Não</span>` - versão avulsa do que `GenericTable` já faz sozinha pra colunas booleanas |
| `rodape-formulario.tsx` | par Cancelar/Ação de formulários Criar/Alterar em página (extraído 14-09-2026 de 10 telas) |
| `use-alteracao-nao-salva.ts` | `useAvisoAlteracaoNaoSalva(sujo)` - `beforeunload` nativo |

### `components/pagination/` e `components/search/` - extraídos do `GenericTable` (14-09-2026)

| Componente | Papel |
|---|---|
| `pagination/navegacao-pagina.tsx` | núcleo "Página X de Y (N registros) / Anterior / Próxima" (23-09-2026) - `RodapePaginacao` o compõe passando o seletor de tamanho como `children`; `log-auditoria-painel.tsx` (paginação no servidor, sem seletor) o usa direto; `unidade` troca o sufixo ("registros" / "no total") |
| `pagination/rodape-paginacao.tsx` | rodapé "Página X de Y / Mostrar / Anterior / Próxima" - controlado, sem opinião de onde página/tamanho moram (URL no `GenericTable`, `useState` nas bancadas do Campo de Testes) |
| `search/barra-filtros.tsx` | busca de texto + 1+ dropdowns de faceta - controlado; gerencia por conta própria qual dropdown está aberto (estado de UI, não filtro) |

📌 **Nasceram do segundo teste de prop** (ver seção 8: "se uma tela que não pode usar `GenericTable` ainda precisa disto, é irmão, não miolo") - as bancadas do Campo de Testes não podem usar a TABELA genérica (risco de linha), mas precisavam do rodapé e da barra de filtros, e reimplementavam os dois à mão em 3 lugares diferentes antes desta extração.

📌 **`ModalExcluirUsuario` (`modal-usuario.tsx`) exige confirmação por digitação do e-mail, não um `window.confirm()`.** Mostra os dados reais do usuário antes de excluir (mesma casca `ModalFicha`/`SecaoFicha`/`CampoFicha` de Consultar) e só habilita o botão de confirmar quando o texto digitado bate com o e-mail da conta, exatamente (case-insensitive). O comentário do arquivo explica o critério que separa este caso do de Configuração (que hoje nem tem Excluir: parâmetro global não se apaga, e a exclusão de configuração pessoal, sem tela, também seria com confirmação simples): *"exclusão de USUÁRIO exige digitar o e-mail - configuração é um dado técnico, não a conta de uma pessoa."*

📌 **`CartaoFormulario` nasceu de duplicação real:** *"era a MESMA estrutura ... copiada e colada em 7 arquivos ..., já levemente divergente entre eles"*.

📌 **`ModalDetalhe`/`ModalDetalhePermissao` - "Papéis com esta permissão" lido ao vivo, nunca de dicionário estático.** `views/2-papel-permissao/modal-detalhe-permissao.tsx` monta o modal genérico (`modal-detalhe.tsx`) com um detalhe fixo (nome amigável, o que faz, por que existe, badge de impacto - `services/2-papel-permissao/constants/permissao-nomes-amigaveis.ts`, dicionário `nome → rótulo` sem coluna nova no banco) e uma lista que **não** vem desse dicionário: refaz as mesmas duas chamadas de `matriz-papel-permissao.tsx` (`papelApi.listar` + `papelPermissaoApi.listar`) para saber quem tem a permissão agora. O comentário do arquivo explica por quê: *"o dicionário só sabe o que a permissão FAZ, não quem tem ela agora - isso muda toda vez que um admin mexe na matriz."* A listagem de Permissões usa o mesmo dicionário para exibir o nome amigável como "nome" e o código cru (`permissao.nome`) como "chave".

📌 **`CartaoFormulario` e `FichaConsulta` compartilham duas larguras canônicas** - `'media'` (`max-w-2xl`) e `'larga'` (`max-w-5xl`) - decisão registrada de definir larguras canônicas em vez de cada tela escolher a sua. O comentário de `cartao-formulario.tsx` explica a causa raiz do redesenho: a versão anterior tinha medida e comportamento de modal (centralizado na tela, altura travada com *scroll* próprio), mesmo sendo usada como página em todo lugar - daí a queixa de que ficava "um monte de card empilhado, confuso".

📌 **Telas "Alterar" com conteúdo substancial usam 2 colunas dentro do `CartaoFormulario` largo (`largura="larga"`).** `modal-usuario.tsx` (`ModalAlterarUsuario`) é o exemplo: `grid lg:grid-cols-3`, coluna principal (`lg:col-span-2`) com o que se edita (Dados da conta, Acesso, Perfil de Pesquisador - este último desabilitado de propósito, campos demonstrativos até o módulo `6-perfil-pesquisador` existir), coluna lateral (1/3) com contexto/consulta e ações administrativas (Metadados, Papéis, `SecaoModeracao` - ver seção 16, card `<dev>` isolado). Empilha em 1 coluna abaixo do breakpoint `lg`, mesmo comportamento de sempre no celular. O comentário do arquivo cita o mesmo padrão usado por painéis de referência (Stripe/Linear/Vercel) para tela de edição de registro.

📌 **`FichaConsulta` existe porque campo desabilitado comunica a coisa errada:** *"'campo desabilitado' é o jeito errado de comunicar 'isto nunca foi editável' (o desabilitado promete 'você poderia editar, mas não pode' - aqui nada promete isso)"*.

📌 **`useAvisoAlteracaoNaoSalva` deliberadamente não usa `useBlocker` do react-router:** *"essa API exige montar um diálogo próprio pra cada bloqueio - pro escopo deste pedido (só avisar, não impedir a qualquer custo), os dois mecanismos nativos do browser resolvem sem componente extra"*. Navegação interna (botão Cancelar) é tratada tela a tela, com `window.confirm` antes do `navigate(-1)`.

### `components/layout/` - a moldura do app

`layout.tsx` (Header + Breadcrumb + `<Outlet/>` + Footer), `header.tsx`, `footer.tsx`, `breadcrumb.tsx`, `menu-usuario.tsx`, `avatar-usuario.tsx`, `busca-global.tsx` (+ `busca-global-evento.ts`), `sino-atividade.tsx`, `controle-tema.tsx`, `controle-fonte.tsx`, `tooltip.tsx`, `toast-provider.tsx` (+ `toast-context.ts`, `use-toast.ts`), `use-erro-toast.ts`, `dev-login-rapido.tsx`.

📌 **Header e Footer são cópia declarada do protótipo de interface.** O comentário de `header.tsx`: *"Cópia fiel de `componentes/header.html` do Projeto de Interface real (mesmas classes Tailwind, mesma estrutura)"*. As adaptações estão listadas ali: a marca navega de verdade para `/`; "Explorar Projetos"/"Como Funciona"/"Transparência LGPD"/"Submeter Pesquisa" continuam `window.alert()` de placeholder, *"mesmo espírito do `showAction()` do protótipo original"*.

📌 **`AvatarUsuario`: cor determinística por nome.** Hash simples (soma de código de caractere) sobre uma paleta de 7 tokens CSS - *"a mesma pessoa cai sempre na mesma cor, em qualquer tela/sessão, sem guardar nada no banco. Nada de `Math.random()`."* Escala de tamanhos `sm`/`md`/`lg`/`xl`/`xxl`.

📌 **`ControleTema` / `ControleFonte`: preferência de dispositivo, não de conta.** Os dois guardam em `localStorage` (`crowdacademico.tema`, `crowdacademico.escalaFonte`) e usam inicializador preguiçoso do `useState` para evitar flash. Ambos registram a mesma reversão: *"Preferência POR CONTA - tentada em 10-08-2026 ... REVERTIDA no mesmo dia por decisão do Lucas com a Alexia: preferência pessoal deveria ficar numa tabela própria se um dia existir, não colunas soltas em `usuario` ('estamos com tabelas demais no momento')."* O tema aplica um atributo `data-tema` em `<html>`, e o CSS reage sozinho (ver seção 11); a fonte muda a custom property `--escala-fonte`. O ciclo do tema é claro → escuro → sistema → claro, *"pedido explícito do Lucas"*.

📌 **`SinoAtividade` lê `log_auditoria` de verdade** (`GET /log-auditoria/minha-atividade`), não um cache local de toasts: *"toast é feedback de 'o que EU acabei de clicar', isso aqui é 'o que aconteceu, mesmo enquanto eu não estava olhando'"*. A contagem de "não lidos" é feita **sem coluna `lida` no banco** - guarda só o maior `id_log` já visto em `localStorage`. Está rotulado "Atividade recente", não "Notificações", de propósito: *"quando `26-notificacao` existir de verdade, o dropdown ganha uma 2ª aba"*.

📌 **`BuscaGlobal` (Ctrl+K/Cmd+K)** busca em usuário/papel/permissão/configuração ao mesmo tempo, mais navegação. Carrega os catálogos só na primeira abertura e cacheia pela sessão. Busca 100% no navegador, com o limite anotado: *"Catálogos pequenos hoje (dezenas de linhas) ... Revisar se algum catálogo crescer bem além disso."*

📌 **`ToastProvider`:** duração por tipo (sucesso 4s, erro 5s - *"erro fica 1s a mais que sucesso"*). O redesenho unificou as duas estruturas, que tinham evoluído separadas: *"a cor vira ACENTO (a barra/ícone), não fundo. Texto sempre escuro (nunca branco sobre colorido) resolve de vez o problema de legibilidade em monitor não calibrado"*. A barra colorida é `border-left` do próprio cartão, não uma `<div>` irmã dependendo de `overflow-hidden` para arredondar - *"uma borda SEMPRE acompanha o `border-radius` do elemento dela, sem costura nenhuma"*.

📌 **`DevLoginRapido` é ferramenta de desenvolvimento com senhas de seed em texto no código.** São 7 contas do `07_seed_dados.sql` (uma por papel), com a senha de dev `DevTcc123!` literal no arquivo. O comentário justifica (*"logar como admin toda hora pra testar o painel era chato"*) e afirma que não cria conta nem senha nova. **Protegido por `import.meta.env.DEV` desde 04-09-2026** (`header.tsx`), mesmo tratamento do Campo de Testes - some sozinho em qualquer `npm run build`, continua disponível em `npm run dev`. Antes disso, o componente era renderizado pelo `Header` em qualquer build, inclusive produção; foi corrigido depois de identificado como achado em `ACHADOS_PARA_DISCUTIR.md`.

### `components/input/`

Hoje só tem `seletor-foto-perfil.tsx` (abaixo). `components/3-auth/icone-google.tsx` é um SVG inline do logo do Google, usado no botão "Continuar com Google" da tela de login - que hoje é apenas um `window.alert('Login social com Google simulado no protótipo.')`.

### `SeletorFotoPerfil` - o avatar editável

`components/input/seletor-foto-perfil.tsx` é o avatar com botão de câmera, `<input type="file">` escondido, botão de remover e o fluxo de upload inteiro.

📌 **Separação de responsabilidade:** *"Este componente NUNCA salva nada em `usuario` sozinho - ele só sobe (ou sinaliza a remoção d)o arquivo e devolve o resultado pro pai via `aoAlterar`."* Quem usa (`modal-criar-usuario.tsx`, `modal-usuario.tsx`, `minha-conta-page.tsx`) decide quando mandar isso ao backend.

📌 **Três estados, não dois.** `aoAlterar(idArquivo, novaUrl)` = foto nova; `aoAlterar(null, null)` = remoção pedida; **não ter chamado `aoAlterar`** = nenhuma escolha feita. Por isso o pai guarda o id como `undefined` por padrão, nunca `null` - *"exatamente pra sobrar esse terceiro estado"*.

#### Redução de imagem no navegador (`reduzir-imagem.util.ts`)

`services/25-arquivo/util/reduzir-imagem.util.ts` reduz a imagem **antes** do upload, usando a Canvas API nativa, sem biblioteca: `createImageBitmap(arquivo, { imageOrientation: 'from-image' })` → `<canvas>` redimensionado com `drawImage` → `canvas.toBlob(...)` → um `File` novo.

📌 **É otimização de UX, nunca autoridade de segurança.** O comentário do arquivo é categórico: *"complementa, não substitui, o processamento de verdade que o backend já faz com `sharp` ... O backend continua sendo a autoridade: o navegador pode mentir, alguém pode chamar a API direto sem passar por aqui."* O ganho declarado é duplo: upload mais rápido em conexão ruim (*"foto de celular de 5MB vira umas centenas de KB antes de sair do aparelho"*) e **menos risco de a URL pré-assinada, que vale 5 minutos, expirar no meio de um envio lento**.

📌 **Falha nunca quebra o upload.** Se `createImageBitmap`/canvas não existir, a imagem estiver corrompida, o canvas ficar *tainted*, ou o resultado ficar **maior** que o original, a função devolve o **arquivo original**: *"essa função é só uma otimização de UX, nunca deve ser o motivo de um upload falhar."*

📌 **WebP com fallback verificado, não assumido.** Tenta `toBlob(..., 'image/webp')` e **confere o `.type` do resultado** antes de confiar nele, porque *"`canvas.toBlob` com 'image/webp' nem todo navegador honra (Safari mais antigo cai pra PNG em silêncio, sem erro nenhum)"*. Sem WebP, cai para JPEG - não PNG, *"que sempre sai sem perda e, por isso, muito maior"*. A extensão do nome do arquivo é trocada para bater com o formato de saída.

📌 **A ordem das validações mudou por causa da redução.** `seletor-foto-perfil.tsx` tem hoje **dois** tetos de tamanho, e o comentário explica a razão:
- `TAMANHO_MAXIMO_BRUTO_BYTES` (30 MB, constante fixa), checado **antes** da redução - *"só pra recusar algo absurdo cedo (ex.: vídeo de 300MB renomeado pra .jpg) sem gastar CPU tentando processar no canvas"*;
- `tamanhoMaximoAvatarBytes`, checado **depois** - *"não antes: com a redução automática no cliente, uma foto de celular de 10-15MB vira algumas centenas de KB, então barrar pelo tamanho BRUTO derrubaria o próprio motivo de ter a redução."*

🗑️➡️✅ **O teto de 8 MB deixou de ser constante fixa (06-09-2026, ver `ACHADOS_PARA_DISCUTIR.md`, item "Constantes duplicadas...").** Antes era `TAMANHO_MAXIMO_AVATAR_BYTES = 8 * 1024 * 1024` hardcoded (duplicando o valor do Nest, sincronizado só de boa vontade); virou `obterConfiguracao('arquivo_tamanho_maximo_imagem_bytes', 8 * 1024 * 1024)` - lê a mesma chave de `configuracoes` que o Admin já pode editar pelo painel, o `8 * 1024 * 1024` que sobra é só o valor mostrado por uma fração de segundo antes do `ConfiguracoesProvider` carregar. A mensagem de erro também calcula o "X MB" a partir desse valor, em vez de "8 MB" fixo no texto. O perfil de redução (`{ larguraMaxima: 512, qualidade: 80 }`) **continua** hardcoded, espelhando o perfil `'avatar'` do Nest à mão - ver o ⚠️ de sincronia manual na seção 2; essa parte não é config, é estrutural, e segue dependendo da decisão de TS.

📌 **Tratamento de erro que distingue as origens:** o `catch` só passa por `traduzirErro` o que for `ErroHttp`, porque *"validação local e falha de rede no PUT pro bucket ... já lançam com mensagem própria em português; passar essas por `traduzirErro` as trocaria pela mensagem genérica de 'não foi possível falar com o servidor', que aqui seria enganosa."*

📌 Detalhe pequeno mas necessário: o `onChange` zera `evento.target.value`, *"sem isso, escolher o MESMO arquivo duas vezes seguidas ... não dispara `onChange` na segunda vez"*.

---

## 10. Estado global: os três providers

`main.tsx` monta a árvore assim:

```jsx
<StrictMode>
  <BrowserRouter>
    <ConfiguracoesProvider>
      <ToastProvider>
        <App />
```

e `App.tsx` envolve as rotas num quarto provider **só em desenvolvimento**:

```jsx
return import.meta.env.DEV ? <CampoTestesProvider>{rotas}</CampoTestesProvider> : rotas;
```

| Provider | Onde | Para quê |
|---|---|---|
| `ConfiguracoesProvider` | `services/11-configuracoes/context/` | carrega uma vez todas as configurações globais públicas e expõe `obterConfiguracao(chave)` via `useConfiguracoes()` |
| `ToastProvider` | `components/layout/` | `useToast().mostrar(mensagem, titulo, tipo)` |
| `CampoTestesProvider` | `services/campo-testes/context/` | estado compartilhado entre T1/T2/T3/T4 - só em build de dev |

📌 **`11-configuracoes` mudou de duas pastas (`context/`+`provider/` separadas) pra uma só (05-09-2026)** - era o único módulo divergente do formato acima (ver "Critério" logo abaixo). Contexto e provider continuam em **arquivos separados** dentro da mesma pasta (nunca no mesmo arquivo - Fast Refresh do Vite quebra o hot-reload quando um arquivo mistura componente e hook/contexto, mesmo motivo do `toast-context.ts`), só a pasta que uniu.

📌 **`ConfiguracoesProvider` existe para não hardcodar regra de negócio no JSX.** O comentário: *"Existe pra qualquer tela (admin ou pública, futura) conseguir ler `taxa_plataforma_padrao`, `valor_minimo_contribuicao` etc. direto do banco via `obterConfiguracao(...)`, em vez de escrever esses valores de negócio direto no HTML/JSX."* Ele converte o `valor` (sempre string ou `null` na coluna) para o tipo real usando o `tipo` que a própria linha declara (`decimal`/`inteiro`/`booleano`), e só considera linhas com `ativo = true`. Usa `configuracaoApi.buscarPublicas()` - `fetch` cru, sem token (ver seção 6).

⚠️ **Não existe provider/estado global de autenticação.** `auth` é passado por prop desde `App.tsx` (seção 5). É consistente hoje, mas significa que toda página nova precisa aceitar `auth` como prop explicitamente.

### 📐 Critério: quando um módulo ganha `context/` (decidido 05-09-2026)

Antes desta data, cada módulo que precisou de "dado compartilhado entre telas" resolveu de um jeito diferente, sem critério escrito - `11-configuracoes` separou `context/`/`provider/` em duas pastas, `campo-testes` juntou os dois numa pasta `context/` só, `toast` nem mora dentro de `services/`. Três soluções diferentes pro mesmo problema, cada uma decidida na hora por quem estava construindo naquele momento.

**Critério, em uma frase:** um módulo só ganha `context/` quando o dado é lido por telas **sem relação de parentesco entre si** e é **caro ou errado buscar de novo** a cada tela. `configuracoes` passa nesse teste (lido em qualquer lugar do site, muda quase nunca). A lista de campanhas não passa (cada tela busca a sua, e está certo assim - buscar de novo é barato e sempre atual).

**Formato da pasta, daqui pra frente:** uma `context/` só, com o contexto e o provider juntos (mesmo formato de `campo-testes`, não o de duas pastas separadas que `11-configuracoes` tinha - ver seção 3 pro padrão de pastas por módulo).

📌 **`3-auth` é hoje o caso mais forte de estado global do sistema inteiro, e o único que não usa `context/`.** Funciona bem enquanto a árvore de componentes é rasa (só o painel admin existe) - vai doer quando a página pública de campanha existir, porque aí o usuário logado precisa ser lido em pontos bem distantes da raiz, não só no cabeçalho. **Decisão registrada agora, execução não é agora:** quando `3-auth` migrar pra `context/`, vai pro mesmo formato acima - não um quinto jeito. O momento natural dessa migração é junto da página pública de campanha (é aí que a dor aparece de verdade), não antes - fazer agora seria gastar esforço resolvendo um problema que ainda não incomoda.

---

## 11. CSS, Tailwind e temas

Duas fontes de estilo, importadas nessa ordem em `main.tsx`:

1. **`assets/css/tailwind-theme.css`** - `@import 'tailwindcss'` + o bloco `@theme` com as cores e fontes do projeto: `--color-primary: #0f9b58`, `--color-primary-dark`, `--color-surface`, `--color-dark: #0f172a`, `Inter` e `DM Serif Display`. 📌 Está num arquivo isolado por uma razão técnica concreta: *"`@import 'tailwindcss'` se expande inline ... e depois disso mais nenhum `@import` pode vir no MESMO arquivo (regra de CSS: `@import` só pode vir antes de qualquer outra regra)"*.
2. **`assets/css/0-style.css`** - manifesto que importa os arquivos numerados na ordem: `1-cores.css`, `2-tipografia.css`, `3-base.css`, `4-componentes.css`, `5-crud.css`, `6-admin-shell.css`, `7-responsividade.css`, `8-campo-testes.css`. 📌 A convenção vem declarada: *"mesma ideia do projeto de interface de referência ... um arquivo por responsabilidade, importado aqui em ordem"*. 🔁 **Reorganizado em 2 rodadas (12-09-2026):** 1ª rodada extraiu `2-tipografia.css` de dentro do então `1-base.css`; 2ª rodada (mesma tarde, pedido do Lucas: "vamos criar o 1-cores.css, e renumere tudo de novo") extraiu `1-cores.css` também, e o que sobrou de `1-base.css` (radius/sombra/escala de acessibilidade/reset de tag) virou `3-base.css` - o `base` vem depois de cores/tipografia na numeração porque ele CONSOME as duas (`var(--cor-*)`/`var(--font-*)`), não o contrário. Os demais arquivos só subiram de número pra abrir espaço (`componentes`→4, `crud`→5, `admin-shell`→6, `responsividade`→7, `campo-testes`→8).

📌 **`@theme` do Tailwind v4 emite as cores como variáveis em `:root`**, então `1-cores.css` usa `var(--color-primary)` sem redeclarar nada. O que o `@theme` não cobre e não é cor nem tipografia (raio de borda, sombra, escala de acessibilidade, reset de tag crua) é declarado em `3-base.css`; a paleta/tokens semânticos de cor moram em `1-cores.css`; tamanho de fonte e a escala tipográfica nomeada moram em `2-tipografia.css`.

📌 **Tema escuro por atributo, não por classe utilitária.** `ControleTema` grava `data-tema` (a escolha: claro, escuro ou sistema) e `data-tema-efetivo` (só claro ou escuro) em `<html>`; `1-cores.css` tem **dois** blocos de tokens (`:root` = claro e `:root[data-tema-efetivo='escuro']`) que reagem sozinhos. O tema "sistema" é resolvido no próprio `ControleTema` com `matchMedia`, que acompanha a mudança do sistema operacional; o CSS não conhece "sistema" e não repete os valores num `@media (prefers-color-scheme)`. Nenhum componente além do controle precisa saber que o tema mudou. É por isso que o JSX usa classes semânticas próprias (`fundo-cartao`, `texto-forte`, `borda-padrao`, `texto-fraco`) misturadas com utilitários Tailwind: as semânticas são as que trocam de valor com o tema.

📌 **Classes de componente que valem conhecer** (`4-componentes.css`): `.input-padrao` é o **único** estilo de campo de formulário do sistema (o padrão antigo `border borda-padrao rounded-md px-2 py-1 text-xs` foi extinto em 15-09-2026, zero ocorrências; `.borda-erro` combina com ele para a borda vermelha de campo inválido). `.btn-sucesso` (verde, espelha `.btn-danger`: fundo fraco em repouso, cor forte no hover) e `.badge-aviso` (âmbar, para "aguardando aprovação": o estado que exige ação do administrador ganhou cor própria em vez do cinza dos estados encerrados).

📌 **Os 5 campos com validação inline ganharam `aria-describedby` (23-09-2026).** `modal-criar-area-conhecimento.tsx`, `modal-criar-configuracao.tsx`, `modal-criar-tipo-link.tsx` (2 campos) e `modal-tipo-link.tsx` já tinham `aria-invalid` condicional + um `<p>` alternando entre mensagem de erro e texto de ajuda, mas nada ligava o campo a esse texto: um leitor de tela anunciava "inválido" sem dizer o porquê. Cada um ganhou um `id` estável via `useId()` no `<p>` (o mesmo id nos dois ramos do condicional, já que só um deles renderiza por vez) e `aria-describedby={esseId}` no `<input>`, sempre, não só quando inválido. Zero mudança visual. Os demais campos do painel receberam `htmlFor`/`id` no mesmo dia (parágrafo abaixo).

📌 **`htmlFor`/`id` em todos os campos com rótulo (23-09-2026).** Os ~65 campos que faltavam (21 arquivos, todo `<label className="rotulo-campo">` com controle único) ganharam `useId()` + `htmlFor`/`id`; clicar no rótulo agora foca o campo e o leitor de tela anuncia o nome. `CampoCpf` e `CamposVinculoPerfil` resolvem os consumidores de uma vez; `bancada-campanha.tsx` usa um prefixo único por componente (`idCampo('criar-titulo')`) em vez de 17 `useId()`. Rótulo de grupo de checkboxes é `<span>`, não `<label>`; checkbox com o input dentro do `<label>` já era associado. Nenhuma mudança visual.

📌 **`NavegacaoPagina` (23-09-2026).** O núcleo "Página X de Y (N registros) / Anterior / Próxima" saiu de `RodapePaginacao` para `components/pagination/navegacao-pagina.tsx` (props `total`, `paginaAtual`, `totalPaginas`, `aoMudarPagina`, `unidade`, `children`). `RodapePaginacao` passa o `<select>` de tamanho como `children`; `LogAuditoriaPainel` (paginação no servidor, sem seletor) usa direto, sem as ~25 linhas duplicadas.

📌 **`4-componentes.css` ficou com zero `var(--color-*)` cru (23-09-2026).** Os 7 usos que restavam (texto branco em cima de superfície colorida sólida, e o fundo sólido no hover de `.btn-danger`/`.btn-sucesso`) migraram pra 3 tokens novos em `1-cores.css`: `--cor-texto-sobre-cor` (branco nos **dois** temas, de propósito - o verde da marca e o vermelho de perigo continuam a mesma cor sólida no escuro, então inverter o texto pra preto quebraria o contraste, mesmo raciocínio de `--cor-dev-*`) e `--cor-fundo-erro-forte`/`--cor-fundo-sucesso-forte` (600 no claro, **escurecido** pro 700 no escuro, porque o botão continua carregando texto branco por cima - clarear quebraria o contraste). Reusar `--cor-texto-erro`/`--cor-texto-sucesso` seria errado: no escuro eles valem um tom **claro** (pensado pra texto sobre fundo escuro, não pra ser fundo). Os dois "-forte" ganharam também classes utilitárias (`.fundo-erro-forte`, `.fundo-sucesso-forte`, `.texto-sobre-cor`, `.hover-fundo-sucesso`) em `1-cores.css`, mesmo padrão de `.fundo-erro`/`.texto-erro`, pra JSX compor com Tailwind. Migradas com eles: `header.tsx` (`text-slate-600` → `.texto-padrao`), `sino-atividade.tsx` e `seletor-foto-perfil.tsx` (`bg-red-*`/`text-white` → os tokens novos) e `matriz-papel-permissao.tsx` (`hover:bg-emerald-100` → `.hover-fundo-sucesso`).

📌 **Contraste WCAG AA.** Texto normal pede 4,5:1. Fundo sólido com texto branco (botão principal, cabeçalho, badges fortes) usa `--cor-fundo-marca-forte` (`#0b7a45`, 5,41:1) e não o verde da marca `#0f9b58` (3,59:1 com branco: fica só como identidade visual); texto ou link na cor da marca usa `--cor-texto-marca` (`#0b7a45` no claro, `#2fbf71` no escuro, 6,14:1 sobre o cartão escuro); cada par de texto e fundo de sucesso, aviso, erro e info, os avatares com inicial branca e o placeholder têm par medido. O `npm run contraste` confere os pares nos dois temas e o Guia de Estilo mostra o mesmo resultado na tela.

A **cor de marca não mudou**: `--cor-marca` (`#0f9b58`) continua sendo a identidade (borda, anel de foco, ícone, barra, brilho de 10% por `color-mix()` e texto grande, onde 3:1 basta, e ela dá 3,59). O que mudou foi *qual token* cada uso consome:

| Uso | Antes | Agora | Contraste |
|---|---|---|---|
| Fundo sólido verde com texto (`.btn-primary`, chip selecionado, botão do cabeçalho) | `--cor-marca` | `--cor-fundo-marca-forte` (= `--color-primary-dark`, `#0b7a45`), hover por `color-mix()` mais escuro | 5,41 com branco |
| Texto e link verdes (`.texto-marca`, `.hover-texto-marca`, `.dica--info:hover`) | `--cor-marca` | `--cor-texto-marca` (claro: `#0b7a45`; escuro: `#2fbf71`) | 5,41 sobre branco; 6,14 sobre o cartão escuro |
| `--cor-texto-sucesso` / `-erro` / `-aviso` / `-info` (só tema claro) | 600 do Tailwind | 700 (aviso: 800) | 4,84 / 5,30 / 6,37 / 5,49 sobre o fundo do badge |
| `--cor-fundo-sucesso-forte` (tema claro) | emerald-600 | emerald-700, igual ao tema escuro | 5,48 com branco |
| Avatares 2, 3 e 4 | `#ea580c`, `#16a34a`, `#0d9488` | `#c2410c`, `#15803d`, `#0f766e` | 5,18 / 5,02 / 5,47 |
| `.input-padrao::placeholder` | 50% do texto (padrão do Tailwind) | `--cor-texto-fraco` | 4,76 |

Utilitários novos: `.fundo-marca-forte` e `.hover-fundo-marca-forte-hover`. **Regra daqui em diante:** fundo verde com texto por cima usa `.fundo-marca-forte`; `.fundo-marca` fica para ícone, barra e texto grande. Nada mais reprovou: no tema escuro só a marca como texto falhava, e o vermelho forte já passava (4,83). **Não tratado de propósito:** `--cor-texto-fraco` sobre `--cor-fundo-hover` mede 4,34 (só aparece em linha de tabela com hover), porque subir o `--cor-texto-fraco` inteiro mudaria todo texto auxiliar do sistema por um caso de borda. **Decisão do Lucas pendente:** o `#2fbf71` do texto verde no tema escuro foi sugestão da revisão.

📌 **`LIMITE_ENDOSSOS` vem de `configuracoes`.** `vida-campanha-ativa.tsx` (T3) lê `useConfiguracoes().obterConfiguracao('limite_endossos_campanha', 4)`, o mesmo padrão de `bancada-campanha.tsx`; o `4` é só reserva enquanto a configuração carrega.

📌 **`SENHA_DEV` e o botão "Redefinir senha dev" só existem em desenvolvimento.** `SENHA_DEV = import.meta.env.DEV ? 'DevTcc123!' : ''` e o cartão `<dev>` do modal de Alterar Usuário só renderiza dentro de `{import.meta.env.DEV && ( ... )}`. `import.meta.env.DEV` é uma constante embutida do Vite (verdadeira em `npm run dev`, falsa em `npm run build`), **não é lida de nenhum `.env`**. No `dist` de produção há zero ocorrências de `DevTcc123` e do texto do botão. `registros-bloqueados.ts` só é importado por telas do Campo de Testes, cujas rotas só existem com `import.meta.env.DEV`; o Vite descarta essas telas do build. Efeito prático: quem roda com `npm run dev` não percebe nada; num build de produção o botão de redefinir senha some.

📌 **Alerta de mínimo e máximo no modal de Alterar Parâmetro.** Quando a chave editada faz parte de um par mínimo/máximo que o banco confere (`fn_valida_pares_min_max_configuracoes`, erro 90019: prazo, orçamento, cronograma e tamanho de arquivo), o modal mostra uma caixa de aviso amarela dizendo se aquele valor é o MÍNIMO ou o MÁXIMO, com qual chave ele precisa se manter coerente e em que ordem editar (para subir o mínimo acima do máximo atual, suba o máximo primeiro, e o contrário para baixar). O aviso vem de `services/11-configuracoes/constants/configuracao-pares-min-max.ts`, que **só espelha** os pares para explicar antes de salvar; a regra de verdade é a do banco, que recusa com a mensagem própria (exibida no mesmo modal). Se um par novo entrar no banco, entra nessa lista também.

📌 **`npm run contraste`.** `react/scripts/contraste-tokens.mjs` lê os tokens de `1-cores.css` e confere o contraste WCAG AA (4,5:1) de 20 pares nos dois temas (lista em `views/campo-testes/guia-estilo/6-pares-contraste.json`, a mesma que o Guia de Estilo mostra na tela): texto sobre cartão, texto de estado sobre o fundo do badge, texto branco sobre os fundos sólidos e sobre os 7 avatares. Sai com código 1 se algum par ficar abaixo, então serve de guarda antes de mexer em `1-cores.css`. Limites: só mede cor sólida (hex, `rgba` sobre o cartão, `var()`); `color-mix()` aparece como "não medido"; não enxerga herança, opacidade nem gradiente, então não substitui olhar a tela nem uma auditoria com axe. Não está ligado a nenhum passo automático.

📌 **`TAMANHO_PAGINA_MAXIMO_API`.** O `500` (teto que o backend aplica em qualquer listagem, `paginacao.util.ts`) é uma constante exportada de `services/constant/type/paginacao.type.ts`, ao lado de `desembrulharPaginado`, e usada em `campanha.api.ts` e `perfil-pesquisador.api.ts`.

⚠️ **`footer.tsx` NÃO foi migrado, e não deve ser sem decisão específica.** O rodapé usa `bg-dark` (`--color-dark: #0f172a`, fixo, definido só em `:root`, nunca sobrescrito nos blocos de tema) - é uma seção **deliberadamente sempre escura**, independente do tema claro/escuro do resto do painel. As 9 classes `text-slate-*`/`border-slate-800` do rodapé são texto sobre esse fundo fixo. Migrar pra `--cor-texto`/`--cor-texto-fraco` (que TROCAM de valor com o tema) quebraria o contraste em tema claro: o texto ficaria escuro sobre o fundo do rodapé, que continua escuro sempre. Se um dia isso for migrado, precisa de tokens FIXOS próprios (mesmo espírito de `--cor-dev-*`), não os tokens de tema normais. `dev-login-rapido.tsx:123` (`bg-red-50 border-red-200`) também ficou de fora, por ser ferramenta de desenvolvimento e menor prioridade.

⚠️ O JSX mistura, na mesma linha, utilitários Tailwind e classes semânticas do CSS numerado. Funciona e é consistente, mas exige saber qual vocabulário usar em cada caso - não há regra escrita sobre isso em lugar nenhum do código.

---

## 12. Campo de Testes (`campo-testes/`)

Todo arquivo do Campo de Testes começa com o mesmo cabeçalho, literal:

```
// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================
```

📌 **O que é, segundo o próprio código** (comentário em `admin-menu.constants.ts`): *"Telas administrativas pra testar, pela interface (não só por Thunder Client), módulos que hoje só fariam sentido testar pela área PÚBLICA do site (que ainda não existe em React). O que for criado aqui nunca aparece pro usuário final, é só ferramenta de teste interna."*

### As quatro telas

| Tela | Arquivo | O que faz |
|---|---|---|
| **T1 - Bancada do Pesquisador** | `views/campo-testes/bancada-pesquisador.tsx` | lista pesquisadores reais (`GET /perfil-pesquisador`), promove usuário → pesquisador, gerencia links acadêmicos; a seleção alimenta T2 |
| **T2 - Bancada da Campanha** | `views/campo-testes/bancada-campanha.tsx` | campanhas (filtradas pelo pesquisador selecionado em T1), criar em nome de outro (wizard de 3 etapas), orçamento/cronograma, enviar para aprovação, aprovar/rejeitar, corrigir e reenviar; a "campanha em foco" alimenta T3 |
| **T3 - Vida da Campanha Ativa** | `views/campo-testes/vida-campanha-ativa.tsx` | atualizações, comentários/endosso, seguir - sobre a campanha em foco de T2 |
| **T4 - Registro de Chamadas** | `views/campo-testes/registro-chamadas.tsx` | gaveta recolhível presente em todas as telas acima; lista as requisições feitas, com método/caminho/status/tempo/corpo, e monta um `curl` |

### Guia de Estilo (ferramenta de desenvolvimento)

Página **só de desenvolvimento**, item "Guia de Estilo" no grupo CAMPO DE TESTES do menu (`/admin/campo-testes/guia-estilo`, `views/campo-testes/guia-estilo/`): um lugar sem dependências para **olhar** as cores e os componentes em vez de imaginar. É um *living style guide*; a versão pronta (Storybook) traria dependências, configuração e build próprios.

- **Não tem cópia de valor nenhum.** Lê os tokens e as classes reais: mudou uma cor em `1-cores.css`, a página muda junto (o Vite remede sozinho depois de uma edição de CSS; o botão "Remedir agora" cobre o caso de a edição não ser percebida).
- **Os dois temas lado a lado**, sempre, qualquer que seja o tema do cabeçalho. O atributo `data-tema-local="claro|escuro"` num painel é lido pelos MESMOS blocos de tokens de `1-cores.css` (o seletor `[data-tema-local=...]` está ao lado de `:root` e de `:root[data-tema-efetivo='escuro']`, sem duplicar token). É o único efeito fora do guia, 2 linhas de seletor no CSS de produção.
- **Seções:** (1) comparador do verde do texto no tema escuro (candidatos sobre o cartão e sobre a página, com a razão de contraste e um seletor de cor para testar outra); (2) cores do sistema, com cada par texto/fundo e a razão **medida no navegador** (`views/campo-testes/guia-estilo/5-contraste-cor.util.ts` pinta 1 pixel em canvas para normalizar qualquer cor, inclusive `color-mix()`, e compõe a transparência sobre o fundo), mais amostras de superfícies, marca, bordas e fundos de estado; (3) tipografia (as 9 classes de `2-tipografia.css`); (4) componentes (botões, botão de desenvolvimento, badges, campos de texto, select, textarea, checkbox e radio, avisos, cartões, os 7 avatares e o contraste das bordas contra o cartão, com o mínimo de 3:1 para componente de interface); (5) modal, toast, dica e tabela (`3-guia-estilo-extras.tsx`), que são globais e por isso seguem o tema escolhido no cabeçalho, não os dois painéis. Cada botão "Ver nas amostras" do comparador aplica a cor só nos painéis escuros da página; o seletor de cor mexe só na última linha (um seletor nativo dispara evento a cada movimento, e recarregar a página nesse momento fecha a janelinha do navegador). Os botões de exemplo não fazem nada. Hover e foco não ficam parados na tela: passe o mouse e use Tab.
- **Uma lista só de pares de contraste:** `views/campo-testes/guia-estilo/6-pares-contraste.json`, lida pela página (import do JSON) e pelo `npm run contraste` (`fs`). Se um par entrar, entra nos dois.
- **Some do build de produção.** A rota está dentro do mesmo `import.meta.env.DEV` das telas T1 a T3 (`rotas.constants.ts`); no `dist` não há "Guia de Estilo" nem o JSON, só o seletor `data-tema-local` no CSS.
- **Tudo do guia mora numa pasta só** (`views/campo-testes/guia-estilo/`, arquivos numerados por importância: 1 a página, 2 as cores, 3 os componentes globais, 4 os painéis de tema, 5 o utilitário de contraste e 6 o JSON de pares). Nada do sistema depende dela, com uma exceção: o `npm run contraste` lê o JSON de pares dessa pasta. Para remover o guia, apague a pasta, a rota em `rotas.constants.ts` e mova o JSON (e a linha do script). As 2 linhas de seletor `[data-tema-local]` em `1-cores.css` são inofensivas se sobrarem.
- **Não faz revisão ortográfica** (uma página não faz isso).

### Listagem de campanhas, Dashboard e Parâmetros

- **Listar e consultar campanha** usam `nomePesquisador` e `nomeArea` que o backend manda (sem baixar `GET /usuario` e `GET /area-conhecimento`). A tabela tem a coluna "atenção" ("Score baixo") e o modal um aviso amarelo, só para quem pode aprovar e só na fila de aprovação; é um sinal, nunca bloqueia.
- **Dashboard:** o card "Fila com score baixo" (`campanhasParaRevisaoScore`) fica na faixa de campanhas por status. A busca do resumo espera a sessão ser restaurada (`auth.carregando`).
- **Parâmetros do Sistema:** sem botão Excluir (a chave global não se apaga, ver `DOCUMENTACAO_BD.md` `[05-K-2-C]`), e o "Ativo" fica desabilitado nas globais com o motivo escrito. `configuracaoApi.remover` existe para a configuração pessoal.

### Protegido por `import.meta.env.DEV` em três lugares

1. `rotas.constants.ts` - o bloco de rotas T1/T2/T3 é espalhado condicionalmente (`...(import.meta.env.DEV ? [...] : [])`);
2. `admin-menu.constants.ts` - o **objeto do grupo inteiro**, não só os itens;
3. `App.tsx` - o `CampoTestesProvider`.

📌 O ponto 2 tem origem documentada: *"só os ITENS estavam protegidos por DEV ... o GRUPO em si (título 'CAMPO DE TESTES' + tooltip) continuava aparecendo no build de produção, vazio mas visível, o que já vazava a existência da ferramenta pro usuário final. O `npm run build` de verdade confirmou isso: a string 'CAMPO DE TESTES' aparecia no bundle final antes desta correção."*

### O que ele NÃO faz mais: o "Elenco"

📌 Existiu um motor de login múltiplo (`ElencoProvider`), **removido em 25-08-2026**. O comentário de `campo-testes-provider.tsx`: *"pedido do Lucas: 'remover de vez' o motor de login-múltiplo - nenhum endpoint do backend aceita agir 'em nome de' outro usuário, então simular vários atores ao mesmo tempo não tinha mais sustentação real."*

Consequências, todas registradas no código:
- toda chamada usa a **sessão real do painel** (`auth.authFetch`), via o hook `use-chamada-registrada.ts`, que apenas acrescenta cronometragem e registro para T4;
- "Promover Usuário → Pesquisador" e as ações de link acadêmico *"só têm efeito de verdade quando o usuário selecionado É a própria conta logada - pra qualquer outro, a RLS responde com erro de permissão"*. Isso está explicitado como **limitação aceita**, não bug;
- criar campanha saiu de T2 em 25-08-2026 (a RLS exige `id_usuario = id_usuario_atual()`) e **voltou em 15-09-2026** por `POST /campanha/:idUsuario` (criar em nome de outro, exige a permissão `campanha_criar_para_outro`), ver a subseção abaixo;
- em T3, "Seguidores" virou um único toggle ("Eu sigo");
- T4 perdeu a coluna "Ator".

⚠️ **T3 ainda não foi redesenhado** depois da remoção do Elenco. O comentário: *"T1 e T2 tiveram prioridade, T3 fica só 'destravado' por enquanto - o redesenho de verdade fica pra outra conversa."*

### T2 e o ciclo de vida da campanha (15 a 21-09-2026)

Regras no banco em `DOCUMENTACAO_BD.md` [05-K-2-B]; aqui o que a tela faz. Rótulos e badges vêm de `services/12-campanha/constants/status-campanha.constants.ts` (`rascunho` primeiro na ordem; `aguardando_aprovacao` em `badge-aviso`).

- **Criar Campanha é um wizard de 3 etapas no mesmo modal** (`etapaCriarCampanha`): **Dados**, **Orçamento**, **Cronograma**. A campanha é criada no primeiro "Próximo" (`POST`, nasce `rascunho`); ao voltar e avançar de novo faz `PATCH`, nunca um segundo `POST`. O último botão é **"Enviar para aprovação"** (`POST /campanha/:id/enviar`); fechar pelo X ou Esc deixa o rascunho salvo. As datas respeitam a config (`min` na data de início, duração entre `prazo_minimo_campanha_dias` e `prazo_maximo_campanha_dias`, meta mínima), e cada etapa mostra uma tabelinha de rótulo mais campo somente leitura (Meta e Soma atual em Orçamento, Mínimo de marcos e Marcos cadastrados em Cronograma), com `.borda-erro` quando não bate.
- **`PainelOrcamentoCronograma`** (definido no próprio `bancada-campanha.tsx`) é compartilhado entre o wizard e Alterar Campanha. No wizard recebe `abaFixa` (mostra só uma aba) e `key={etapaCriarCampanha}`: sem o `key` o React reaproveita a instância e o `useState` inicial de `abaAtiva` não roda de novo, e a etapa Cronograma mostrava a tabela de Orçamento. Cada item tem as ações padrão (`AcaoLinha`: Alterar, Consultar, Excluir).
- **Alterar Campanha** por status: **rascunho** e **rejeitada** com reenvios sobrando são editáveis, e o rodapé ganha **"Enviar para aprovação"** ou **"Corrigir e reenviar"** (grava o formulário antes de enviar, para não perder alteração). **Rejeitada** mostra no topo o histórico de rejeições, os reenvios restantes e o prazo (vêm de `GET /campanha/:id`: a listagem não traz esses campos). Rejeitada **esgotada** vira somente leitura, com a data em que será excluída. Nenhuma checagem de completude no cliente: o clique acontece e o erro do banco chega traduzido, em vez de um botão desabilitado sem explicação.
- **Datas vencidas no envio:** aviso amarelo dentro do próprio modal (não um segundo modal) oferecendo "Começar agora, mantendo a duração" (`POST /campanha/:id/deslizar-datas` e depois enviar) ou escolher outras datas. Confirmação sempre explícita.
- ⚠️ **Limite da bancada:** quem opera é o administrador, e `fn_valida_transicao_campanha` libera qualquer transição para quem tem `campanha_aprovar`. As travas de reenvio esgotado, prazo e pesquisador suspenso só valem para o **dono**, então T2 não consegue exercitá-las pela interface. O só leitura (que vale para todos) e a oferta de datas funcionam normalmente.

### Trabalha sobre dados reais, com uma trava explícita

📌 `services/campo-testes/util/registros-bloqueados.ts` marca os pesquisadores de id **12 a 22** e as campanhas de id **1 a 10** como bloqueados dentro do Campo de Testes: eles aparecem nas listas (riscados, com cadeado), mas sem botão de ação. Motivo: *"já nascem com uma 'demo' inteira montada desde `07_seed_dados.sql` ... Mexer neles pra testar quebraria a demonstração que já existe pronta."*

⚠️ Esses limites (12, 22, 10) são constantes fixas no arquivo, casadas com os ids do seed. Se o seed mudar, elas silenciosamente passam a bloquear/liberar os registros errados.

📌 `services/campo-testes/util/gerar-cpf-valido.ts` existe porque o backend valida o dígito verificador de CPF - coerente com `PENDENCIAS e correcoes.md`, item 745 (todos os CPFs de desenvolvimento são inventados; não há verificação de existência real).

⚠️ **T4 não grava o Bearer**, e por isso o `curl` gerado não é autenticado. É decisão consciente: *"gravar token de sessão num log que fica na tela o tempo todo seria pior que não ter o cURL pronto."*

📌 **F5 em telas que carregam dados ao montar.** Os efeitos de `bancada-campanha.tsx`, `vida-campanha-ativa.tsx` e do Dashboard esperam `auth.carregando` ser `false` (`if (auth.carregando) return`, e `auth.carregando` nas dependências). Sem isso, com recarga completa o `authFetch` ainda não tem token: o pedido sai sem sessão (401) ou a lista de campanhas vem só com as públicas.

📌 **Excluir campanha só vale para rascunho.** O modal de Excluir diz isso (a regra é `pol_campanha_delete`, `statusNaoElegivel`), e não "aguardando aprovação".

---

## 13. Dependências: o que cada uma faz e por que está aqui

A tabela da seção 2 já resume versão e um comentário de uma linha por peça de build. Este capítulo aprofunda o **porquê** - a stack de produção aqui é pequena (5 pacotes), então dá pra cobrir cada uma com profundidade real, sem precisar agrupar tanto quanto o `DOCUMENTACAO_BACKEND.md` precisou.

### 13.1 Dependências de produção - as que vão pro `dist/` final

| Pacote | Por que está aqui |
|---|---|
| **`react` + `react-dom`** | O framework em si - sem alternativa cogitada em nenhum comentário encontrado no código. `react-dom` é o renderizador para navegador (contraparte de `react-native`, por exemplo, que este projeto não usa). |
| **`react-router`** | Roteamento client-side. **Não é `react-router-dom`** - decisão registrada em `PENDENCIAS e correcoes.md` (parte 17): `react-router-dom` estava travado numa versão 7.x com vulnerabilidade alta conhecida (*RSC Mode CSRF Bypass*); o pacote `react-router` v8 já inclui os bindings de DOM (não precisa dos dois pacotes juntos) e está fora da faixa vulnerável. Trocar de pacote no meio do projeto foi reação a uma CVE, não preferência de estilo. |
| **`tailwindcss` + `@tailwindcss/vite`** | Utilitários CSS, integrados como **plugin de build**, não `<script>` de CDN. Isto foi uma correção, não a escolha original - ver 13.2. |

### 13.2 A correção do Tailwind: de CDN pra dependência de build

Registrada com comentário direto no código (`react/vite.config.js`): o Tailwind saiu do `<script>` CDN do `index.html` em 02-08-2026, depois de uma auditoria achar que o `dist/` gerado não continha nenhuma classe Tailwind de verdade, porque tudo era gerado em runtime pelo navegador baixando o CDN. Ou seja: o problema não era estético, era funcional - o CSS inteiro do app dependia de uma requisição de rede em runtime pra um CDN de terceiro, toda vez que alguém abria a página, e um build de produção "pronto" não continha nenhuma classe Tailwind de verdade dentro dele.

📌 **O critério que decide o que continua em CDN e o que não continua** (Google Fonts e Font Awesome permanecem, ver seção 2): só o que **quebra a página inteira** sem rede saiu do CDN. Fonte/ícone que falha degrada suave (ícone some, fonte cai pro fallback do sistema); CSS que falha quebra o layout inteiro. É a mesma régua aplicada nos dois casos, com resultado diferente porque o impacto da falha é diferente.

### 13.3 Ferramental de build e tipo - `vite`, `@vitejs/plugin-react`, `@types/react`/`@types/react-dom`

`vite` é o bundler/dev-server; `@vitejs/plugin-react` é o que ensina o Vite a processar JSX/TSX e habilita Fast Refresh (hot reload preservando estado de componente). Os dois pacotes de tipo (`@types/react`, `@types/react-dom`) continuam necessários mesmo com o projeto inteiro em TypeScript real (seção 2) - o próprio React é publicado como JavaScript puro, sem tipo embutido; esses dois pacotes são só as definições de tipo da API do React/ReactDOM, usadas pelo `tsc`/editor pra checar de verdade `.tsx` contra a API real (props de componente, tipos de evento etc.) - sem eles, todo componente do React seria implicitamente `any`.

### 13.4 Lint - `eslint` + `@eslint/js` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `globals`

Config flat (`eslint.config.js`, seção 2). `eslint-plugin-react-hooks` é o que pega uso incorreto de hook (dependência faltando em `useEffect`, hook chamado condicionalmente) - categoria de bug que o React não detecta em tempo de execução até virar um sintoma confuso. `eslint-plugin-react-refresh` garante que um arquivo continua compatível com Fast Refresh (ex.: barra exportar um componente e uma constante não-componente do mesmo arquivo, o que quebra a preservação de estado do hot reload). `globals` só fornece a lista de variáveis globais conhecidas (`window`, `document`, etc.) pro ESLint não acusar "variável não definida" em código de navegador.

---

## 14. O que não existe ainda / pontos em aberto

### A interface pública

⚠️ **Não existe nenhuma página pública de campanha.** O doador nunca vê nada hoje - só existe o painel administrativo. Isso está registrado em `PROXIMOS_MODULOS.md`, seção *"Fora do backend (Nest) - vale registrar também"*, junto com o Open Graph (prévia de link no WhatsApp), que depende da página pública existir primeiro. Este documento não repete a explicação - a lista de lá é a fonte.

Sinais disso espalhados pelo código, todos coerentes entre si:
- `views/checkout/`, `views/dash-doador/`, `views/dash-pesquisador/` existem só com `.gitkeep`;
- os links "Explorar Projetos"/"Como Funciona"/"Transparência LGPD"/"Submeter Pesquisa" do header são `window.alert()`;
- o botão "Continuar com Google" do login é `window.alert('Login social com Google simulado no protótipo.')`;
- `tipoLinkApi.listarPublico` existe e não tem chamador: *"Ainda sem nenhuma tela pública chamando isto ... já deixado pronto pra quando existir"*;
- o Campo de Testes existe justamente para testar *"módulos que hoje só fariam sentido testar pela área PÚBLICA do site (que ainda não existe em React)"*.

### Decisões e débitos em aberto

🟢 **JavaScript vs TypeScript - RESOLVIDO (07-09-2026).** `PENDENCIAS e correcoes.md`, item 10. Ver seção 2.

⚠️ **`react/.gitignore` não cobre `.env`** - item 744, correção deliberadamente adiada. Ver seção 5.

⚠️ **Nenhum teste automatizado no React.** Só `build` + `lint`.

🟢 **Comentários desatualizados sobre o módulo `25-arquivo` - CORRIGIDO (07-09-2026).** O módulo de upload já existe e funciona (é o que `SeletorFotoPerfil` usa) há tempos, mas dois arquivos ainda afirmavam o contrário - corrigido numa auditoria de código morto/comentário desatualizado:
- `components/layout/avatar-usuario.tsx`: não tem mais o comentário antigo dizendo que o upload "ainda não está implementado".
- `views/admin/dashboard-identidade-visual.tsx`: o placeholder da aba "Identidade Visual" segue válido (ninguém implementou o gerenciamento de logo/favicon), mas o texto (visível ao admin) e o comentário foram corrigidos - agora dizem corretamente que `25-arquivo` já existe, e o que falta é só a tela de gerenciar logo/favicon em cima dele.

⚠️ **Outro comentário desatualizado, menor:** `components/layout/breadcrumb.tsx` afirma que *"A aba padrão do admin (`/admin/usuarios`) tem `rotuloBreadcrumb: null` de propósito"*. Isso deixou de valer quando o Dashboard virou a aba padrão (08-08-2026): hoje quem tem `rotuloBreadcrumb: null` é `/admin/dashboard`, e `/admin/usuarios` tem rótulo normal. O comportamento do componente está certo - só o exemplo citado no comentário envelheceu.

⚠️ **Constantes duplicadas manualmente entre `nest/` e `react/`** - perfis de redução de imagem, lista de MIME types, tetos de tamanho, mínimos de orçamento/cronograma exibidos como rótulo em T2. Todos com comentário pedindo sincronia manual. Continua existindo mesmo depois do TypeScript (item 10, resolvido) - os dois projetos têm compilação separada, sem import cruzado, então tipo (TypeScript) e valor (constante) precisam ambos ser espelhados à mão.

⚠️ **Filtro/busca/paginação client-side** na `GenericTable` e na `BuscaGlobal` - os dois lugares admitem por escrito que não escalam além de "dezenas de linhas" e precisariam de suporte do backend.

⚠️ **Telas do Campo de Testes reimplementam a TABELA em vez de usar `<GenericTable>`** (risco de linha exige controle manual) - mas desde 14-09-2026 reaproveitam `<RodapePaginacao>`/`<BarraFiltros>` (ver seção 8) em vez de duplicar filtro/faceta/paginação à mão.

⚠️ **`DevLoginRapido` carrega senhas de seed literais no código** (`DevTcc123!`, as mesmas 7 contas do seed) - agora protegido por `import.meta.env.DEV` (ver seção 9), mas vale lembrar que continua sendo uma ferramenta de conveniência de dev, não algo pra existir num ambiente com dado real.

---

## 15. Fluxo público: cadastro, termos de uso e verificação de e-mail

Três rotas de `ROTAS` (seção 4, sem menu lateral) cobrem o ciclo de entrada de uma conta nova: `/login`, `/cadastro` (`views/3-auth/cadastro-page.tsx`) e `/verificar-email` (`views/3-auth/verificar-email-page.tsx`).

📌 **Cadastro exige aceite de Termos de Uso, lido ao vivo do banco.** O formulário (nome, e-mail, senha, confirmar senha) tem um checkbox obrigatório de aceite; ao lado, um link "Termos de Uso" abre um modal que busca o termo **vigente** via `termoUsoApi.buscarAtivo()` (`services/5-termo-uso/api/termo-uso.api.ts`), carregado só na primeira vez que o modal abre e mantido em cache pelo tempo de vida da página. O botão de cadastrar continua desabilitado até nome (≥2 caracteres), e-mail válido, senha (≥8 caracteres), confirmação batendo e o checkbox marcado.

⚠️ **Verificação de e-mail funciona, mas sem enviar e-mail nenhum - o módulo `4-mail` ainda não existe.** Depois de um cadastro bem-sucedido, a tela mostra um `window.alert()` com o link de verificação completo (incluindo o token), rotulado explicitamente `"[SÓ EM DEV]"`. Em produção, esse link viraria o conteúdo de um e-mail de verdade - hoje é só exibido na tela para permitir testar o fluxo de ponta a ponta sem o módulo de e-mail.

📌 **`verificar-email-page.tsx` não exige sessão nenhuma.** É uma rota pública que lê o `token` da query string (`?token=...`) e chama `verificarEmail(token)` (`services/3-auth/api/auth.api.ts`) assim que monta. O comentário do arquivo justifica: *"o token em si já é a autorização"* - o backend resolve o dono do token, não recebe nenhum id vindo do cliente (mesmo padrão de `confirmar_email_por_token` no banco, ver `DOCUMENTACAO_BD.md`, bloco `[03-O]`). Token ausente na URL já nasce em estado de erro (inicializador preguiçoso do `useState`, sem passar por uma renderização de "carregando" that não corresponde à realidade).

---

## 16. Minha Conta e moderação de conta

### `views/3-auth/minha-conta-page.tsx` - rota `/admin/minha-conta/:aba`

📌 **O layout foi redesenhado duas vezes antes de chegar no formato atual.** O comentário do arquivo documenta as duas versões anteriores: a primeira (09-08-2026) era um formulário único com as seções empilhadas; a segunda (10-08-2026) virou 2 colunas com um `CartaoPerfil` pequeno na lateral tentando ancorar a tela visualmente. A versão atual (11-08-2026, pedido do Lucas: *"portfólio profissional"*, referência ORCID/ResearchGate/Google Acadêmico) substituiu as duas por uma **`FaixaIdentidade`** larga no topo (avatar grande, nome, e-mail, badge de e-mail verificado, badges de papel, "membro desde") seguida de abas de verdade - rota (`/admin/minha-conta/perfil`, `/seguranca`, `/papeis`, `/academico`, `/privacidade`), não `useState`, mesma decisão já tomada quando as abas do painel admin em si viraram rota (seção 4). O `CartaoPerfil` lateral foi eliminado por ficar redundante com a faixa.

📌 **Privacidade é sempre a última aba, de propósito.** O comentário: *"o botão de excluir conta mora aqui dentro, atrás da confirmação por digitação - ação destrutiva nunca na primeira aba que a pessoa vê."*

⚠️ **Não existe mais seção "Preferências" (tema/fonte por conta).** Existiu por um dia (09→10-08-2026) e foi revertida por decisão do Lucas com a Alexia - ver a nota sobre `ControleTema`/`ControleFonte` na seção 9. Tema e tamanho de fonte continuam ajustáveis, só que sempre por dispositivo (`localStorage`, botões do cabeçalho), nunca amarrados à conta logada.

### `views/1-usuario/secao-moderacao.tsx` - suspender/revogar conta

Seção dentro de **Alterar Usuário** (não uma tela própria - é ação sobre a mesma conta que a tela já edita), que bloqueia o login de uma conta por um prazo escolhido, com motivo obrigatório.

- Opções de prazo (`1, 3, 7, 30` dias, por padrão) vêm de `configuracoes.suspensao_usuario_opcoes_dias` - nada fixo no código, mesmo padrão de outras regras configuráveis do projeto - mais um campo livre para qualquer outro número de dias.
- Botão "Suspender usuário" só habilita com dias **e** motivo preenchidos.
- Uma conta já suspensa mostra até quando e o motivo, com um botão "Revogar suspensão" no lugar do formulário.
- Datas de suspensão são buscadas por `usuarioApi.buscarSuspensao()`, numa chamada separada da busca normal do usuário - ver a nota sobre `SAVEPOINT`/`USUARIO_COLUNAS_SELECT` na seção 5, mesma proteção aplicada aqui: uma coluna que só existe depois de uma migração pendente no banco nunca pode quebrar o login/consulta geral de usuário se ainda não tiver sido aplicada.

📌 **As colunas de suspensão (`usuario.suspenso_ate`/`motivo_suspensao`/`suspenso_por`, `usuario_papel.suspenso_ate`) dependiam de uma migração colada manualmente no SQL Editor do Supabase (`ATUALIZAR O SUPABASE.sql`) - já aplicada.** Se algum dia um banco específico ainda não tiver rodado esse arquivo, `buscarSuspensao()` falha isolado (capturado, sem derrubar o resto da tela) e a seção some silenciosamente, em vez de quebrar o resto de Alterar Usuário - mesma proteção `SAVEPOINT` descrita na seção 5.

---

## 17. Painel Admin: Dashboard e suas 4 abas

**Achado numa revisão de sistema completa (05-09-2026): esta tela (`views/admin/dashboard.tsx`, rota `/admin/dashboard`) nunca tinha ganhado seção própria neste documento**, apesar de ser a tela inicial do painel admin desde 08-08-2026. `Tooltip` (`components/layout/tooltip.tsx`) também só aparecia citado de passagem (seção 9) - as variantes novas (`baixo`/`aoClicar`/`badge`) nunca tinham sido documentadas.

### As 4 abas (`ABAS`, dentro do próprio `dashboard.tsx`)

| Aba | Componente | O que mostra |
|---|---|---|
| Visão Geral | (inline, no próprio `dashboard.tsx`) | Faixa de saúde (banco conectado/sessões ativas/notificações pendentes) + 6 cards de métrica (`GET /dashboard/resumo`) + prévia de notificações |
| Regras do Negócio | `dashboard-regras-negocio.tsx` | As 38 chaves de `configuracoes`, agrupadas por assunto |
| Identidade Visual | `dashboard-identidade-visual.tsx` | Placeholder - gerenciar logo/favicon ainda não foi construído |
| Saúde | `dashboard-saude.tsx` | Mesmo estado da faixa de saúde da Visão Geral, sem refazer requisição, mais contagens agregadas |

📌 **Faixa de saúde e cards de métrica vêm de DUAS requisições independentes, de propósito** - não um `Promise.all` combinado. Achado do Lucas testando: se `GET /dashboard/resumo` falhasse (ex.: banco fora do ar), a tela inteira ficava em branco, bem no momento em que mais precisava mostrar "banco sem conexão". Cada uma tem seu próprio estado de carregando/erro agora.

⚠️ **Comentário desatualizado, achado nesta revisão:** `dashboard-saude.tsx` diz que a tabela `schema_migrations` "NÃO EXISTE neste projeto" e por isso a aba não mostra "última migration aplicada"/divergência de hash. Isso deixou de ser verdade em 04/05-09-2026 - `aplicar-migrations.script.ts` (`DOCUMENTACAO_BACKEND.md`, seção 12) criou exatamente essa tabela, e ela já tem linhas de verdade no banco (Lucas rodou `npm run db:migrate:adotar`). O placeholder em si continua correto (ninguém implementou de fato mostrar isso na tela), só a justificativa ("a tabela não existe") ficou errada - mesma classe de achado já registrada nesta seção pro `dashboard-identidade-visual.tsx` (seção 14).

### `dashboard-regras-negocio.tsx` - configuração agrupada por assunto

Segunda forma de olhar pro mesmo dado da aba "Configurações" (CRUD cru, `11-configuracoes`) - aqui as chaves de `configuracoes` aparecem **agrupadas por tema** (Segurança, Financeiro, Campanha, Score / Reputação, Arquivo, Geral, Outras), cada grupo num cartão com título + lista de `chave: valor` + botão "Alterar" indo pra mesma tela de edição de sempre. Não duplica formulário nenhum, só organiza a leitura.

- **`services/11-configuracoes/constants/configuracao-grupos.ts`** - `GRUPO_CONFIGURACAO` é um dicionário `chave → nome do grupo`, mantido à mão (mesmo espírito de `permissao-nomes-amigaveis.ts`). Uma chave nova em `configuracoes` que não ganhar entrada aqui cai automaticamente no grupo "Outras" - nunca quebra a tela, só fica sem organização até alguém lembrar de classificar. `agruparConfiguracoes()` devolve os grupos já na ordem certa de exibição (`ORDEM_GRUPOS`) - "Outras" sempre por último, mesmo tendo o maior número de linhas.
- **Grupo "Arquivo" tem um ícone ⓘ ao lado do título, que abre um modal** (`ModalDetalhe`, mesmo componente da seção 9) com a explicação completa dos 7 limites de upload configuráveis e por que o teto do Supabase Storage (50MB/arquivo, 1GB total) importa. Nasceu de um pedido do Lucas: a explicação era grande demais pra caber num tooltip comum, então o ícone virou clicável (`aoClicar`) em vez de só mostrar texto no hover.

### Dica de hover - dois contratos, um primitivo só (`components/layout/tooltip.tsx`)

**Reescrito em 14-09-2026 (revisão do Lucas).** Existem DOIS contratos diferentes no sistema, não três soluções pro mesmo problema:

1. **Dar nome visível a um controle** ("Alterar", "Encerrar sessão", "Saiba mais") → mecanismo unificado `.dica`/`<Dica>` - qualquer gatilho (botão, link, ícone avulso) que ganhe a classe `dica` no `className` pode soltar um `<Dica texto="..." />` dentro de si. Cobre o que antes eram DOIS mecanismos quase idênticos e duplicados: o `Tooltip` (ⓘ avulso) e o `.crud-tabela__acao-dica` (hover nos ícones de ação do `AcaoLinha`/`GenericTable`) - hoje o mesmo CSS (`.dica__bolha` em `4-componentes.css`), com modificadores `--baixo` (abre pra baixo) e `--curta` (`white-space: nowrap`, rótulo de 1 palavra).
2. **Revelar um valor truncado/traduzido num elemento NÃO interativo** → `title` nativo continua sendo o certo. Sobrevive em exatamente 1 lugar no sistema: `matriz-papel-permissao.tsx`, `<td title={permissao.nome}>` - célula não clicável, não focável, valor cru.

`Tooltip` (o ícone ⓘ avulso, assinatura pública sem mudança - `texto`/`baixo`/`aoClicar`) hoje é implementado POR CIMA do primitivo: só um gatilho `.dica--info` (ou `.dica--info.dica--clicavel` com `aoClicar`) + `<Dica>` dentro. `Dica` é sempre `aria-hidden="true"` - `role="tooltip"` sem `aria-describedby` apontando pra ele é inerte (nenhum leitor de tela faz nada com isso), então a role saiu e não volta sem esse par; o nome acessível mora no GATILHO (`aria-label` explícito ou texto visível), nunca na bolha.

CSS puro (`:hover`/`:focus`/`:focus-visible`), sem estado de React na bolha em si (a lógica de "qual dropdown está aberto" de facetas é outra coisa, ver `BarraFiltros` na seção 8). Três props opcionais do `Tooltip`, todas podem combinar:

- **`baixo`** - abre a dica pra BAIXO em vez de pra cima (padrão). **Todo controle do cabeçalho (A-, A+, tema, sino) usa `baixo`:** o cabeçalho fica colado no topo da janela, e a bolha padrão (pra cima) nascia a y = -20px, fora da tela. Usar quando o ícone fica perto do topo de um cartão com `overflow-hidden` (ex.: cabeçalho de grupo em `dashboard-regras-negocio.tsx`) - a dica padrão nascia cortada pela borda arredondada do cartão.
- **`aoClicar`** - o ícone vira um `<button>` clicável (cursor de ponteiro em vez de "?"); o hover continua mostrando só `texto` (curto, tipo "Saiba mais"), e o clique dispara a função passada - normalmente pra abrir um `ModalDetalhe` com a explicação completa em seções/parágrafos, em vez de um bloco de texto só dentro do balão do tooltip.
- **`badge`** - selo circular escuro sobreposto (não um ícone solto flutuando do lado), mesmo padrão visual de "editar foto" do Instagram/LinkedIn - usado em `modal-usuario.tsx` (`ModalConsultarUsuario`, módulo 1, seção 16) no canto inferior direito do avatar, abrindo a foto de perfil em outra guia.
