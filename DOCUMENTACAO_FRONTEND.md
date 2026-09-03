# ⚛️ Documentação Técnica do Frontend React — CrowdAcadêmico

Este documento é o equivalente do `DOCUMENTACAO_BD.md` para o **app React** que vive em `react/`. O objetivo é o mesmo: explicar as decisões de arquitetura e o *porquê* de cada padrão, de forma que os arquivos `.jsx`/`.js` não precisem carregar toda a explicação inline — e que quem chegar depois entenda a estrutura sem ter que abrir 100 arquivos.

---

### ⚠️ Duas diferenças importantes em relação ao `DOCUMENTACAO_BD.md`

**1. Este documento descreve o ESTADO ATUAL, não é um log histórico.** O `DOCUMENTACAO_BD.md` acumulou semanas de auditorias com data, autoria e "era X, virou Y". Aqui não existe esse histórico consolidado. Onde o próprio código traz um comentário do tipo *"ERA X, virou Y, motivo Z"* (e há muitos — o código React deste projeto é fortemente comentado), a explicação é citada. Onde não há comentário, o comportamento é descrito como está hoje, sem inventar história.

**2. O protótipo de interface visual NÃO faz parte deste documento.** Existe, em `informacoes/Sem-Node-Projeto-de-Interface-CrowdAcademico/`, um protótipo estático em HTML/CSS/JS puro (sem Node, sem React, sem bundler) que mostra como o site público final deveria parecer. Ele é um **artefato separado**, com convenções próprias, fora do escopo deste documento — é citado aqui apenas quando o código do React declara que copiou algo dele (header, footer, paleta de cores, grupos do menu lateral).

### Legenda dos símbolos usados neste documento

| Símbolo | Significado |
|---|---|
| 📌 | Nota explicativa — o porquê de uma decisão |
| ⚠️ | Ponto de atenção / débito técnico — funciona, mas vale revisar |

---

## 📑 Índice

1. [Escopo: o que este app é (e o que ainda não é)](#1-escopo-o-que-este-app-é-e-o-que-ainda-não-é)
2. [Stack e ferramentas de build](#2-stack-e-ferramentas-de-build)
3. [Estrutura de pastas e a convenção de numeração](#3-estrutura-de-pastas-e-a-convenção-de-numeração)
4. [Roteamento](#4-roteamento)
5. [Autenticação (`use-auth.js`)](#5-autenticação-use-authjs)
6. [Padrão de service / API](#6-padrão-de-service--api)
7. [Upload de arquivo (`25-arquivo`)](#7-upload-de-arquivo-25-arquivo)
8. [`<GenericTable>` — o componente central do painel](#8-generictable--o-componente-central-do-painel)
9. [Componentes reutilizáveis](#9-componentes-reutilizáveis)
10. [Estado global: os três providers](#10-estado-global-os-três-providers)
11. [CSS, Tailwind e temas](#11-css-tailwind-e-temas)
12. [Campo de Testes (`campo-testes/`)](#12-campo-de-testes-campo-testes)
13. [Dependências: o que cada uma faz e por que está aqui](#13-dependências-o-que-cada-uma-faz-e-por-que-está-aqui)
14. [O que não existe ainda / pontos em aberto](#14-o-que-não-existe-ainda--pontos-em-aberto)

---

## 1. Escopo: o que este app é (e o que ainda não é)

O que existe em `react/` hoje é **um painel administrativo**: listar/criar/alterar/consultar/excluir os registros dos módulos que o backend Nest já expõe, mais um dashboard de métricas, mais uma área de "Minha Conta", mais um Campo de Testes de uso interno.

📌 **Este painel já não é "ferramenta descartável".** O `PENDENCIAS e correcoes.md` registra que a primeira versão (`views/dev/`, sem router, estilo mínimo) foi construída sob a premissa de que era *"ferramenta descartável, não a tela de admin de verdade"*. Essa premissa foi **explicitamente superada em 01-08-2026** (mesmo arquivo, parte 17): *"o Lucas decidiu, logo depois, que este painel NÃO é descartável — vira o admin de verdade. 'Devtools' virou 'crud' em tudo (pasta, CSS, nomes), e a tela ganhou Tailwind, header/footer reais, roteamento e menu lateral de verdade."* É por isso que a pasta hoje se chama `components/crud/` e o CSS `4-crud.css` — o nome antigo (`devtools`) não existe mais em lugar nenhum do código.

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

📌 **Tailwind é dependência real do build, não CDN.** `react/vite.config.js` carrega o plugin oficial e o comentário do arquivo explica a origem da decisão: *"Tailwind saiu do `<script>` CDN do index.html (achado do Claude Web, 02-08-2026: `dist/` não continha NENHUMA classe Tailwind, tudo era gerado em runtime pelo navegador baixando o CDN — quebra sem rede, não deveria ir pra produção nunca)."*

⚠️ **Google Fonts e Font Awesome continuam via CDN**, e isso é deliberado. O comentário em `react/index.html` explica o critério: *"degradam suave se a rede falhar — ícone some, fonte cai pro fallback do sistema — diferente do Tailwind, que quebrava a página inteira sem CDN"*. Ou seja: só o que quebra a página inteira saiu do CDN.

### JavaScript puro, não TypeScript

Todo o `react/src` é **JavaScript** (`.js` / `.jsx`). Não há nenhum arquivo `.ts`/`.tsx`, nenhuma configuração de `tsconfig`, nenhum `typescript-eslint`.

⚠️ **Isto é uma pendência aberta, não uma decisão fechada.** `PENDENCIAS e correcoes.md`, item 10 (*"Decisões que precisamos tomar, não bugs"*), continua marcado 🔴 e diz literalmente: **"React em JavaScript ou TypeScript"**. A recomendação registrada ali é TypeScript (*"o NestJS já é TypeScript por padrão — manter o front em JavaScript puro cria uma costura inconsistente entre as duas pontas, e vocês perdem a chance de compartilhar tipos entre back e front"*), mas a decisão **nunca foi tomada oficialmente** e o projeto segue em JavaScript puro até hoje.

Efeito colateral concreto e visível no código: como não há import cruzado nem tipo compartilhado entre `nest/` e `react/`, várias constantes precisam ser mantidas em sincronia **manualmente**. Dois exemplos que o próprio código admite:

- `services/25-arquivo/util/reduzir-imagem.util.js`: *"mesmo perfil (largura/qualidade) usado no backend pro mesmo contexto, ver `PERFIL_PROCESSAMENTO_POR_CONTEXTO` em `arquivo.constants.ts` — mantenha os dois em sincronia manualmente, não há import cruzado entre os repositórios `nest/` e `react/`"*.
- `components/input/seletor-foto-perfil.jsx`: a lista de MIME types aceitos *"espelha a lista aceita no backend ... Se um dia o backend mudar essa lista, mudar aqui também"*.

### Lint

`react/eslint.config.js` é um flat config enxuto: `js.configs.recommended` + `eslint-plugin-react-hooks` (preset flat recommended) + `eslint-plugin-react-refresh` (preset `vite`), aplicado a `**/*.{js,jsx}`, ignorando `dist`.

⚠️ Há `eslint-disable-next-line` pontuais no código, sempre com justificativa escrita ao lado. O padrão mais comum é em `useEffect` que busca dados na montagem — ex.: em `components/crud/generic-table.jsx`, *"padrão comum de 'buscar dado ao montar/quando a query mudar' (mesmo exemplo dos docs do React) — a regra nova `react-hooks/set-state-in-effect` marca a chamada de `setCarregando`/`setErro` como suspeita mesmo assim"*.

⚠️ **Não existe teste automatizado no React.** A verificação é só `npm run build` + `npm run lint` (`PENDENCIAS e correcoes.md`, parte 17: *"Nenhum teste automatizado no React ainda (só `nest/` tem `npm test`)"*). Isso não mudou.

---

## 3. Estrutura de pastas e a convenção de numeração

```
react/
├── index.html          — shell HTML (fontes/ícones via CDN, ver seção 2)
├── vite.config.js
├── eslint.config.js
├── .env                — só VITE_API_URL
└── src/
    ├── main.jsx        — createRoot + os providers globais
    ├── App.jsx         — monta as <Route> a partir de rotas.constants.js
    ├── assets/css/     — CSS numerado próprio + tema Tailwind
    ├── components/     — o que é reutilizável entre módulos
    ├── services/       — comunicação com a API + estado compartilhado
    └── views/          — as páginas em si
```

### A regra: `views/` e `services/` espelham os números dos módulos Nest

Tanto `services/` quanto `views/` usam pastas nomeadas `<numero>-<nome>`, com **o mesmo número do módulo correspondente no backend** — `services/1-usuario/`, `services/2-papel-permissao/`, `services/11-configuracoes/`, `services/12-campanha/`, `services/25-arquivo/`, `services/28-log-auditoria/`, e assim por diante.

📌 **Por que.** A regra está registrada em `PENDENCIAS e correcoes.md`, na descrição da primeira versão do painel: *"Pastas novas espelhando números que já existiam no Nest (`services/2-papel-permissao/`, `services/11-configuracoes/`), sem inventar número novo — mesma regra da reorganização anterior."* O efeito prático é que o número é uma chave estável entre os dois repositórios: `services/9-tipo-link/api/tipo-link.api.js` fala com `nest/src/9-tipo-link`, e o comentário no topo de praticamente todo arquivo `.api.js` diz isso explicitamente (*"Espelha `nest/src/9-tipo-link`"*).

Vários arquivos `.api.js` vão além e citam o artefato exato do banco que sustenta a rota — ex.: `tipo-link.api.js` anota que o `GET` é público *"(`pol_tipolink_select` é `USING(true)`, `04_rls_policies.sql` `[04-C-2]`)"*. Ou seja: a numeração amarra React ↔ Nest, e os comentários amarram React ↔ `DOCUMENTACAO_BD.md`.

### Pastas sem número

Nem tudo mapeia para um módulo do Nest. Essas ganham nome próprio, no mesmo nível:

| Pasta | Conteúdo |
|---|---|
| `services/constant/` | o que é compartilhado por todos os módulos: `constants/api.constants.js` (a URL base), `api/http.util.js` (tratamento de resposta), `api/traduzir-erro.util.js`, `utils/formatacao.util.js` (moeda/percentual/CPF em pt-BR) |
| `services/router/` | `rotas.constants.js` — a fonte única de "quais páginas existem" |
| `services/admin/` | `api/dashboard.api.js` (métricas do painel, módulo `29-dashboard` no Nest) |
| `services/campo-testes/` | contexto, hooks e utilitários da bancada de testes (ver seção 12) |
| `views/admin/` | a casca do painel (layout, sidebar, menu) e as telas de Dashboard |
| `views/campo-testes/` | as telas T1/T2/T3/T4 |

### Subpastas dentro de cada módulo de `services/`

O esqueleto padrão é `api/`, `constants/`, `hook/`, `type/` — criado com `.gitkeep` mesmo antes de existir código. Módulos que ainda não têm nenhuma tela consumindo (`7-link-academico`, `17-comentario`, `19-denuncia`, `22-contribuicao`, `23-repasse`, `26-notificacao`) têm só os `.gitkeep`.

⚠️ A pasta `type/` existe em todos os módulos e está **sempre vazia** — é resquício do esqueleto pensado para TypeScript. Enquanto o item 10 das pendências não for decidido, ela não tem uso.

⚠️ Em `views/`, as pastas `checkout/`, `dash-doador/` e `dash-pesquisador/` existem só com `.gitkeep`. São lugares reservados para a interface pública/de usuário final, ainda não construída. O mesmo vale para `components/pagination/` e `components/search/`.

---

## 4. Roteamento

O roteamento usa **React Router** (`react-router` v8), com `<BrowserRouter>` em `main.jsx` e as `<Route>` montadas em `App.jsx`.

### A fonte única: `services/router/rotas.constants.js`

📌 Este é o arquivo mais importante da navegação. Ele exporta **duas listas** e três consumidores diferentes leem dela — nunca cada um com a sua cópia. O comentário do arquivo explica:

> *"Fonte única de verdade pra 'quais páginas existem' — `App.jsx` monta as `<Route>` a partir daqui, e `breadcrumb.jsx` monta o rótulo a partir daqui."*

- **`ROTAS`** — páginas públicas/pré-login, sem menu lateral: `/login`, `/cadastro`, `/verificar-email`.
- **`ROTAS_ADMIN`** — tudo que precisa do menu lateral, renderizado dentro do `<Outlet/>` de `views/admin/admin-layout.jsx`.

Cada entrada carrega, além de `caminho` e `elemento`, os metadados que os outros consumidores usam:

| Campo | Para que serve |
|---|---|
| `rotuloBreadcrumb` | rótulo no breadcrumb; `null` = não aparece |
| `paiCaminho` | o caminho absoluto da listagem "dona" da rota de detalhe, para o breadcrumb montar a cadeia completa (`Início > Usuários > Alterar Usuário`) |
| `rotuloMenu` / `grupoMenu` / `icone` | o que o menu lateral desenha; ausência de `grupoMenu` = a rota existe mas **não** vira item clicável do menu |

📌 **Por que rotas de verdade e não abas em `useState`.** Registrado em `PENDENCIAS e correcoes.md`, parte 17: a versão anterior usava `useState` para trocar de aba, e a consequência real era *"sem link direto pra uma aba, botão Voltar não navegava entre abas, F5 sempre voltava pra 'Usuários'"*. A decisão de unificar foi tomada pelo Lucas naquele momento; hoje a sidebar usa `NavLink`, e o item ativo é decidido pela própria URL.

📌 **Como uma rota de detalhe mantém a aba "pai" destacada sem código extra.** O comentário do arquivo explica: *"a URL aninhada, ex.: `/admin/usuarios/8/alterar`, já COMEÇA com `/admin/usuarios`, então o próprio `NavLink` de 'Usuários' já marca 'ativo' sem código nenhum extra."*

### Redirecionamentos em `App.jsx`

- `/` → `/admin/dashboard`. Comentário: *"a aba padrão, 08-08-2026 — ERA `/admin/usuarios` até o Dashboard existir"*.
- `/admin/minha-conta` → `/admin/minha-conta/perfil`. Existe porque "Minha Conta" virou uma rota parametrizada (`/admin/minha-conta/:aba`, com abas Perfil/Segurança/Papéis/Acadêmico/Privacidade) e o link antigo precisava continuar funcionando.

### O menu lateral é derivado, não duplicado

`views/admin/admin-menu.constants.js` **não** tem lista própria de itens: ele filtra `ROTAS_ADMIN` por `grupoMenu` via uma função `itensDoGrupo()`. O comentário registra o problema que isso resolveu: *"antes existiam 2 listas (esta e `ROTAS`) descrevendo as mesmas 3 abas, com risco de desalinhar"*.

Os grupos hoje são: um grupo sem título (só o Dashboard, com divisória), `GESTÃO DO USUÁRIO`, `Configurações`, `CAMPANHA`, `MODERAÇÃO` e — só em desenvolvimento — `CAMPO DE TESTES`.

📌 **Chave interna ≠ rótulo visível.** O `grupoMenu` das rotas continua sendo a string `'CADASTROS'` mesmo que o título exibido já tenha mudado duas vezes (para "GESTÃO DE ACESSO E SISTEMA" e depois "GESTÃO DO USUÁRIO"). O comentário justifica: *"é só a CHAVE interna que liga rota↔grupo, não aparece na tela; só o rótulo visível muda"*. O mesmo raciocínio vale para `/admin/configuracoes`, cuja URL não mudou quando o item passou a se chamar "Parâmetros do Sistema".

⚠️ O grupo `MODERAÇÃO` tem 4 itens escritos à mão e marcados `desabilitado: true` (Aprovar Campanhas, Denúncias, Solicitações, Enc. Antecipados). O comentário é explícito sobre o porquê: *"são só o desenho do painel completo, sem fingir que uma tela que não existe funciona"*.

`components/layout/busca-global.jsx` (o Ctrl+K) também deriva sua seção "Navegação" de `ROTAS_ADMIN`, pelo mesmo motivo.

---

## 5. Autenticação (`use-auth.js`)

Arquivo: `services/3-auth/hook/use-auth.js`. É um hook único, **chamado uma vez só, em `App.jsx`**, e o objeto resultante desce por prop para o `Layout` (e daí para o `Header`) e para cada página:

```jsx
const auth = useAuth();
// ...
<Route path={caminho} element={<Elemento auth={auth} />} />
```

📌 O comentário do próprio `App.jsx` justifica: *"`useAuth()` chamado uma vez só, aqui em cima — Header (dentro de Layout) e cada página recebem o mesmo `auth` por prop, nunca cada um com sua própria sessão."* Não há Context de autenticação; é passagem explícita por prop.

### Onde cada token mora

| Token | Onde fica | Por quê |
|---|---|---|
| **access token** | só em memória (`useState`) | *"nunca localStorage — some ao fechar a aba, de propósito"* (comentário do arquivo) |
| **refresh token** | `localStorage`, chave `crowdacademico.refreshToken` | *"pra não precisar logar de novo a cada F5"* |

O hook devolve: `accessToken`, `usuario`, `papeis`, `ehAdmin`, `carregando`, `autenticado`, `login`, `cadastrar`, `logout`, `authFetch` e `atualizarUsuarioLocal`.

⚠️ **`papeis`/`ehAdmin` não são autorização.** O comentário deixa claro: *"não é uma checagem de permissão de verdade, só decide o que aparece na UI; toda ação real continua validada pelo backend/RLS a cada requisição."* Isso é coerente com a arquitetura registrada no `DOCUMENTACAO_BD.md` e em `PENDENCIAS e correcoes.md` (item 7): o Nest não tem guard de permissão por nome — quem decide é a RLS do Postgres.

### `authFetch` — o único caminho para a API

Toda chamada autenticada do painel passa por `authFetch(caminho, opcoes)`. Ele:

1. monta os headers com `Content-Type: application/json` + `Authorization: Bearer <accessToken>` quando há token;
2. dispara o `fetch` contra `${API_BASE_URL}${caminho}`;
3. **se a resposta for 401 e houver refresh token, renova a sessão uma vez e repete a chamada original**;
4. se a renovação falhar, limpa a sessão.

O comentário resume: *"SEMPRE manda Bearer quando tem accessToken. Se a resposta vier 401 (access token expirado — dura só 15min), tenta renovar UMA vez com o refresh token e repete a chamada original. Isso é o que todo o painel admin usa pra falar com a API — nunca `fetch()` cru direto."*

### Duas proteções contra corrida, ambas com bug de origem documentado

📌 **Renovação única em voo (`refreshEmAndamentoRef`).** O refresh token é de **uso único** (o backend revoga a sessão antiga ao emitir a nova). O comentário descreve o sintoma original: *"o Lucas viu 'token de acesso inválido' 3x seguidas ao voltar de um tempo parado ... uma tela que dispara várias requisições de uma vez ... fazia CADA requisição tentar renovar por conta própria, ao mesmo tempo. ... a 1ª chamada a chegar no backend ganha, as outras recebem 'refresh token inválido'"*. A correção: existe no máximo **uma** promise de renovação por vez; quem chegar depois espera o resultado dela.

📌 **O `useEffect` de restauração também usa essa promise compartilhada.** O comentário registra que esse efeito chamava `authApi.refresh()` direto, por fora da proteção acima, e que isso causava um bug real: *"um F5/link direto que deveria continuar logado às vezes voltava pra tela de login sem motivo aparente"* (o efeito tratava qualquer erro com `limparSessao()` incondicional e podia apagar a sessão que a outra chamada vencedora tinha acabado de salvar). Hoje ele chama `renovarSessao()`, a mesma promise compartilhada.

📌 **Deduplicação de `GET` em voo (`requisicoesEmAndamentoRef`).** Duas chamadas simultâneas ao **mesmo caminho** dividem a mesma resposta (com `.clone()`, porque o corpo de um `Response` só pode ser lido uma vez). Motivo documentado: o `<StrictMode>` de `main.jsx` dispara todo `useEffect` duas vezes em desenvolvimento, o que virava duas requisições reais e dois toasts de erro. **Só `GET` é deduplicado** — o comentário é explícito: *"create/update/remove nunca são, de propósito — aqueles são sempre 1 clique = 1 ação, nunca disparados por `useEffect`."*

### Configuração de endereço

`services/constant/constants/api.constants.js`:

```js
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
```

O comentário registra que `react/.env` contém apenas essa URL, *"sem segredo nenhum — só a URL — por isso commitado normal, sem virar `.env.local`"*.

⚠️ Existe pendência aberta sobre isso: `PENDENCIAS e correcoes.md`, item 744 — `react/.gitignore` **não** cobre `.env` (diferente de `nest/.gitignore`). Hoje é inofensivo pelo conteúdo, mas a rede de segurança não existe. A correção (uma linha no `.gitignore`) foi deliberadamente adiada a pedido do Lucas. Confirmado nesta redação: `react/.gitignore` continua sem a linha.

---

## 6. Padrão de service / API

### Um arquivo `<modulo>.api.js` por módulo

Cada módulo tem `services/<n>-<nome>/api/<nome>.api.js` exportando **um objeto único** com as operações. Exemplo real, `services/1-usuario/api/usuario.api.js`:

```js
export const usuarioApi = {
  listar: (authFetch) => authFetch('/usuario').then(tratarResposta).then((r) => r.dados),
  buscar: (authFetch, id) => authFetch(`/usuario/${id}`).then(tratarResposta),
  criar: (authFetch, dados) => authFetch('/usuario', { method: 'POST', body: JSON.stringify(dados) }).then(tratarResposta),
  // ...
};
```

📌 **`authFetch` é injetado, nunca importado.** O comentário do arquivo diz: *"`authFetch` vem de `use-auth.js` (`services/3-auth/hook`) — injetado, não importado direto, pra este arquivo não precisar saber nada de token."* Toda função autenticada recebe `authFetch` como **primeiro parâmetro**, sem exceção.

📌 **Rota pública usa `fetch` cru, com o motivo escrito ao lado.** Onde a RLS do banco já libera a leitura para qualquer um, a função chama `fetch(`${API_BASE_URL}...`)` diretamente e o comentário diz por quê. Exemplos:

- `configuracao.api.js` → `buscarPublicas()`: *"Sem `authFetch` de propósito: `pol_config_select` já libera as configurações globais (`id_usuario IS NULL`) pra qualquer um, logado ou não — é o que sustenta `useConfiguracoes()` em página pública (campanha, home), que roda fora de `<ConfiguracoesProvider>` autenticado."*
- `tipo-link.api.js` → `listarPublico()`: mesma justificativa, apontando `pol_tipolink_select`.
- `arquivo.api.js` → `buscar()` e `buscarAvatarPorUsuario()`: *"são públicos no backend (`pol_arquivo_select` é `USING(true)`)"*.

📌 **Paginação desembrulhada num lugar só.** Vários endpoints devolvem `{ dados, total, pagina, tamanho }` desde 03-08-2026 (achado do Claude Web: *"findall sem limit/offset baixaria a tabela inteira quando ela crescer"*). O `.dados` é desembrulhado **dentro do `.api.js`**, uma vez, *"pra `GenericTable` e todo o resto do app continuar recebendo um array puro, sem precisar saber que pagina/total existem"*.

### `tratarResposta` — `services/constant/api/http.util.js`

Todo `.api.js` termina em `.then(tratarResposta)`. A função:

- se `!resposta.ok`, lança um **`ErroHttp`** (subclasse de `Error` que carrega `status` além da mensagem);
- se ok, lê o corpo **como texto primeiro** e só faz `JSON.parse` se houver algo.

📌 O segundo ponto tem origem documentada: *"achado do Lucas: 'Unexpected end of JSON input' ao atribuir permissão. Checar só `status === 204` não bastava. Endpoint que só cria um vínculo ... volta com corpo vazio, mas o Nest manda 201 (padrão de POST), não 204 ... Ler como texto primeiro e só fazer `JSON.parse` se tiver algo cobre QUALQUER status com corpo vazio."*

📌 **Por que `ErroHttp` carrega o `status`:** *"o backend já categoriza erro em 4 faixas de HTTP pelo ERRCODE (`postgres-exception.filter.ts`), mas o React descartava o status e ficava só com o texto — sem status, `traduzir-erro.util.js` não tem como tratar 429/5xx/etc de forma diferente do resto."*

### `traduzirErro` — `services/constant/api/traduzir-erro.util.js`

Espelho, do lado do React, do `postgres-exception.filter.ts` do Nest. Trata só as duas categorias que o backend **não** consegue cobrir sozinho:

1. **falha de rede** (backend fora do ar, sem internet, CORS) — o `fetch` rejeita antes de existir qualquer resposta HTTP, e `erro.message` seria o texto do navegador em inglês ("Failed to fetch");
2. **429** (rate limit do `@nestjs/throttler`) — a mensagem padrão do Nest não é escrita para o usuário final.

📌 Todo o resto passa direto: *"400/403/404/409... já vem em PT-BR, específico e correto direto do backend ... não faz sentido sobrescrever o que já está certo."*

O par "texto de erro na tela + toast" está encapsulado em `components/layout/use-erro-toast.js` (`reportarErro(erro)`), que faz `setErro(traduzirErro(erro))` e dispara o toast numa chamada só — *"qualquer tela nova que adote isto ganha o toast de graça, sem precisar lembrar da 2ª linha"*.

---

## 7. Upload de arquivo (`25-arquivo`)

`services/25-arquivo/api/arquivo.api.js` é o exemplo mais completo do padrão de service, porque é o único que fala com **dois hosts diferentes**.

### O fluxo, na prática: três chamadas de rede

| Passo | Chamada | Vai para |
|---|---|---|
| 1 | `arquivoApi.iniciarUpload(authFetch, { nomeOriginal, tipoMime, tamanhoBytes })` → `POST /arquivo/upload/iniciar` | backend Nest (autenticado) |
| 2 | `arquivoApi.enviarParaBucket(uploadPreAssinado, arquivo)` → `PUT` na URL pré-assinada | **direto no provedor de armazenamento** |
| 3 | `arquivoApi.confirmarUpload(authFetch, { chave, nomeOriginal, tipoMime, tamanhoBytes, contexto })` → `POST /arquivo/upload/confirmar` | backend Nest (autenticado) |

📌 **O passo 2 nunca usa `authFetch`.** O comentário do arquivo é explícito: *"PUT direto no provedor de armazenamento, NUNCA via `authFetch` — é outro host, não deve levar `Authorization` nem `Content-Type: application/json`"*. Os `cabecalhosObrigatorios` devolvidos pelo passo 1 precisam ir **exatamente** como vieram, porque é isso que a assinatura da URL confere. Também não passa por `tratarResposta`: *"a resposta do bucket não é JSON e não segue o formato do nosso backend"*.

⚠️ **Discrepância de nomenclatura, sem impacto funcional.** O comentário de `arquivo.api.js` chama o fluxo de *"upload em 2 passos"* (contando só as duas chamadas ao Nest, mesma contagem usada por `PROXIMOS_MODULOS.md`), enquanto `seletor-foto-perfil.jsx` fala em *"fluxo de upload de 3 passos"* (contando também o PUT no bucket). São a mesma coisa descrita de dois jeitos; vale uniformizar se alguém for mexer nos dois arquivos.

### `contexto` — quem manda no processamento do backend

O passo 3 envia um campo `contexto` (hoje sempre `'avatar'`), que diz ao backend qual perfil de redimensionamento aplicar.

⚠️ Segundo `PROXIMOS_MODULOS.md` (atualizado em 01-09-2026): *"hoje só o avatar chama `contexto: 'avatar'` — a tela de Criar Campanha ainda não existe no React, então `contexto: 'campanha'`/`'atualizacao'` não tem chamador real ainda, só o perfil implementado no backend."*

---

## 8. `<GenericTable>` — o componente central do painel

Arquivo: `components/crud/generic-table.jsx`. É o componente mais reutilizado do app.

📌 **A ideia, na frase do próprio código:** *"Tabela genérica de LISTAGEM (leitura, filtro, ordenação, paginação) usada pelo painel admin — cada módulo novo do Nest com listagem simples vira só uma entrada de colunas aqui, não uma tela nova escrita do zero."*

### Como é configurado

O componente é dirigido por props, não por herança nem por children:

| Prop | O que faz |
|---|---|
| `titulo`, `acaoTopo` | cabeçalho da seção e o botão da direita (ex.: "Criar") |
| `colunas` | array de `{ chave, rotulo }`, com extras opcionais: `renderizar(linha)`, `centralizar`, `largura`, `quebrarRotulo` |
| `chavePrimaria` | nome do campo usado como `key` de linha |
| `listar` | função **já pré-amarrada** com `authFetch` pelo componente pai; a tabela só a chama |
| `rotaBase` | ex.: `/admin/usuarios`. Presente ⇒ cada linha ganha a coluna "Ações" apontando para `${rotaBase}/${id}/alterar\|consultar\|excluir`. Ausente ⇒ sem coluna de ações |
| `acoes` | quais dos três botões aparecem (padrão: os três) |
| `colunaExtra` | `{ rotulo, renderizar(linha) }` — coluna que pode renderizar qualquer coisa, independente de `rotaBase` |
| `filtrosFacetados` | array de `{ chave, rotulo, ordem? }` — cada um vira um dropdown de múltipla escolha |
| `buscarLog`, `campoRenomeioLog` | habilitam o botão "Ver log" no rodapé da tabela |

📌 **CRUD não acontece dentro da tabela.** Comentário: *"Criar/Alterar/Excluir NÃO acontecem mais aqui dentro (pedido do Lucas, 02-08-2026: 'tudo que faz parte do CRUD precisa de view própria') ... páginas de verdade, com sua própria URL, não formulário/`confirm()` embutido na tabela."*

📌 **Estado de filtro/página/ordenação vive na URL**, via `useSearchParams`, não em `useState` local. Motivo documentado: *"ao voltar de 'Consultar' via `navigate(-1)`, o filtro escolhido resetava — a página de listagem é desmontada na troca de rota, e `useState` não sobrevive a isso."* Toda escrita usa `{ replace: true }`, para que o botão Voltar não fique preso no passo-a-passo de cada clique de dropdown. Nomes reservados na query string: `q`, `pagina`, `tamanho`, `ordenar`, `dir`.

📌 **Comportamentos inferidos do dado, não configurados por tela.** Três coisas são decididas "sniffando" o tipo do primeiro valor não-nulo de cada coluna, para não exigir configuração nova nas ~10 telas que já usam o componente:
- **ordenação** por `number` / `boolean` / `string` (com `localeCompare` em `pt-BR`);
- **centralização** de colunas numéricas e booleanas (pedido da Alexia, 18-08-2026: *"centralizar o negócio de sim e não"*);
- **largura mínima** de cada coluna, calculada em `ch` a partir da lista **inteira** (não da página visível) — porque *"`table-layout: auto` recalcula a largura de cada coluna com base SÓ nas linhas visíveis; trocar de página muda o conjunto visível, a largura muda junto"* (achado do Lucas: *"as colunas dançam ao trocar de página"*). É `min-width`, não `width`, para não quebrar o responsivo.

📌 **Booleano vira badge Sim/Não**, não o texto cru `true`/`false` — *"'E-MAIL VERIFICADO: false' não é instantâneo de ler, um badge é"*.

📌 **Ordena a lista filtrada inteira, antes de paginar** — nunca só a página atual. O comentário nomeia o bug clássico que isso evita: *"linha some da vista ao virar página, ordem parece errada entre páginas"*.

📌 **Facetas:** entre facetas diferentes o filtro é **E**; dentro da mesma faceta é **OU**; nenhuma opção marcada = "Todos". As opções de cada dropdown são derivadas dos dados já carregados (da lista completa, não da filtrada — *"senão as opções desapareceriam/reapareceriam conforme a pessoa digita"*). Um dropdown só aparece se houver mais de um valor possível.

📌 **Esqueleto de carregamento** (`animate-pulse`, mesmas colunas) em vez de "Carregando..." — *"padrão comum em painel admin (Linear, Stripe, Vercel) ... em vez de um texto solto que faz a tela 'pular' quando os dados aparecem."*

⚠️ **O filtro e a paginação são 100% client-side.** O comentário admite o limite: *"resolve 'achar uma linha no meio de 28' (Configurações já tem esse tanto), mas não resolve buscar num universo de milhares sem baixar tudo primeiro — isso exigiria busca no próprio backend (`LIMIT/OFFSET` + `WHERE`), fora do escopo desta rodada."*

### Quem usa

Todas as telas `listar-*.jsx`: `views/1-usuario/listar-usuarios.jsx`, `views/2-papel-permissao/listar-papeis.jsx`, `views/6-perfil-pesquisador/listar-pesquisadores.jsx`, `views/8-area-conhecimento/`, `views/9-tipo-link/`, `views/10-motivo-denuncia/`, `views/11-configuracoes/`, `views/12-campanha/`.

⚠️ As telas do Campo de Testes (`views/campo-testes/`) **não** usam `<GenericTable>` — implementam filtro/faceta/paginação por conta própria, com constantes locais duplicadas (`TAMANHOS_PAGINA`, `LIMIAR_FILTRO`). Não é acidente: elas precisam de colunas de seleção/bloqueio que o componente genérico não prevê. Mas é duplicação real de lógica.

---

## 9. Componentes reutilizáveis

### `components/crud/` — as cascas das páginas de CRUD

| Componente | Papel |
|---|---|
| `generic-table.jsx` | ver seção 8 |
| `cartao-formulario.jsx` | casca de Criar/Alterar/Excluir: ícone circular + título + subtítulo + cartão |
| `ficha-consulta.jsx` | casca das telas "Consultar" (`<FichaConsulta>` + `<SecaoFicha>` + `<CampoFicha>`) |
| `campo-somente-leitura.jsx` | um dado exibido, não editável, com o mesmo visual do `<label>` dos formulários |
| `modal-detalhe.jsx` | modal genérico de "detalhe explicado" (título, chave em fonte mono, badge, seções) |
| `log-auditoria-painel.jsx` | painel "Ver log", embutido no rodapé da `GenericTable` |
| `use-alteracao-nao-salva.js` | `useAvisoAlteracaoNaoSalva(sujo)` — `beforeunload` nativo |

📌 **`CartaoFormulario` nasceu de duplicação real:** *"era a MESMA estrutura ... copiada e colada em 7 arquivos ..., já levemente divergente entre eles"*.

📌 **`CartaoFormulario` e `FichaConsulta` compartilham duas larguras canônicas** — `'media'` (`max-w-2xl`) e `'larga'` (`max-w-5xl`) — a pedido registrado do Claude Web: *"definir larguras canônicas em vez de cada tela escolher a sua"*. O comentário de `cartao-formulario.jsx` explica a causa raiz do redesenho: a versão anterior tinha *"MEDIDA E COMPORTAMENTO DE MODAL (centralizado na tela, altura travada com scroll próprio), mesmo sendo usado como PÁGINA em todo lugar"* — daí a queixa de que *"Alterar parece um monte de card empilhado, confuso"*.

📌 **`FichaConsulta` existe porque campo desabilitado comunica a coisa errada:** *"'campo desabilitado' é o jeito errado de comunicar 'isto nunca foi editável' (o desabilitado promete 'você poderia editar, mas não pode' — aqui nada promete isso)"*.

📌 **`useAvisoAlteracaoNaoSalva` deliberadamente não usa `useBlocker` do react-router:** *"essa API exige montar um diálogo próprio pra cada bloqueio — pro escopo deste pedido (só avisar, não impedir a qualquer custo), os dois mecanismos nativos do browser resolvem sem componente extra"*. Navegação interna (botão Cancelar) é tratada tela a tela, com `window.confirm` antes do `navigate(-1)`.

### `components/layout/` — a moldura do app

`layout.jsx` (Header + Breadcrumb + `<Outlet/>` + Footer), `header.jsx`, `footer.jsx`, `breadcrumb.jsx`, `menu-usuario.jsx`, `avatar-usuario.jsx`, `busca-global.jsx` (+ `busca-global-evento.js`), `sino-atividade.jsx`, `controle-tema.jsx`, `controle-fonte.jsx`, `tooltip.jsx`, `toast-provider.jsx` (+ `toast-context.js`, `use-toast.js`), `use-erro-toast.js`, `dev-login-rapido.jsx`.

📌 **Header e Footer são cópia declarada do protótipo de interface.** O comentário de `header.jsx`: *"Cópia fiel de `componentes/header.html` do Projeto de Interface real (mesmas classes Tailwind, mesma estrutura)"*. As adaptações estão listadas ali: a marca navega de verdade para `/`; "Explorar Projetos"/"Como Funciona"/"Transparência LGPD"/"Submeter Pesquisa" continuam `window.alert()` de placeholder, *"mesmo espírito do `showAction()` do protótipo original"*.

📌 **`AvatarUsuario`: cor determinística por nome.** Hash simples (soma de código de caractere) sobre uma paleta de 7 tokens CSS — *"a mesma pessoa cai sempre na mesma cor, em qualquer tela/sessão, sem guardar nada no banco. Nada de `Math.random()`."* Escala de tamanhos `sm`/`md`/`lg`/`xl`/`xxl`.

📌 **`ControleTema` / `ControleFonte`: preferência de dispositivo, não de conta.** Os dois guardam em `localStorage` (`crowdacademico.tema`, `crowdacademico.escalaFonte`) e usam inicializador preguiçoso do `useState` para evitar flash. Ambos registram a mesma reversão: *"Preferência POR CONTA — tentada em 10-08-2026 ... REVERTIDA no mesmo dia por decisão do Lucas com a Alexia: preferência pessoal deveria ficar numa tabela própria se um dia existir, não colunas soltas em `usuario` ('estamos com tabelas demais no momento')."* O tema aplica um atributo `data-tema` em `<html>`, e o CSS reage sozinho (ver seção 11); a fonte muda a custom property `--escala-fonte`. O ciclo do tema é claro → escuro → sistema → claro, *"pedido explícito do Lucas"*.

📌 **`SinoAtividade` lê `log_auditoria` de verdade** (`GET /log-auditoria/minha-atividade`), não um cache local de toasts: *"toast é feedback de 'o que EU acabei de clicar', isso aqui é 'o que aconteceu, mesmo enquanto eu não estava olhando'"*. A contagem de "não lidos" é feita **sem coluna `lida` no banco** — guarda só o maior `id_log` já visto em `localStorage`. Está rotulado "Atividade recente", não "Notificações", de propósito: *"quando `26-notificacao` existir de verdade, o dropdown ganha uma 2ª aba"*.

📌 **`BuscaGlobal` (Ctrl+K/Cmd+K)** busca em usuário/papel/permissão/configuração ao mesmo tempo, mais navegação. Carrega os catálogos só na primeira abertura e cacheia pela sessão. Busca 100% no navegador, com o limite anotado: *"Catálogos pequenos hoje (dezenas de linhas) ... Revisar se algum catálogo crescer bem além disso."*

📌 **`ToastProvider`:** duração por tipo (sucesso 4s, erro 5s — *"erro fica 1s a mais que sucesso"*). O redesenho unificou as duas estruturas, que tinham evoluído separadas: *"a cor vira ACENTO (a barra/ícone), não fundo. Texto sempre escuro (nunca branco sobre colorido) resolve de vez o problema de legibilidade em monitor não calibrado"*. A barra colorida é `border-left` do próprio cartão, não uma `<div>` irmã dependendo de `overflow-hidden` para arredondar — *"uma borda SEMPRE acompanha o `border-radius` do elemento dela, sem costura nenhuma"*.

⚠️ **`DevLoginRapido` é ferramenta de desenvolvimento com senhas de seed em texto no código.** São 7 contas do `07_seed_dados.sql` (uma por papel), com a senha de dev `DevTcc123!` literal no arquivo. O comentário justifica (*"logar como admin toda hora pra testar o painel era chato"*) e afirma que não cria conta nem senha nova. Diferente do Campo de Testes, este componente **não** está protegido por `import.meta.env.DEV` — ele é renderizado pelo `Header` em qualquer build.

### `components/input/`

Hoje só tem `seletor-foto-perfil.jsx` (abaixo). `components/3-auth/icone-google.jsx` é um SVG inline do logo do Google, usado no botão "Continuar com Google" da tela de login — que hoje é apenas um `window.alert('Login social com Google simulado no protótipo.')`.

### `SeletorFotoPerfil` — o avatar editável

`components/input/seletor-foto-perfil.jsx` é o avatar com botão de câmera, `<input type="file">` escondido, botão de remover e o fluxo de upload inteiro.

📌 **Separação de responsabilidade:** *"Este componente NUNCA salva nada em `usuario` sozinho — ele só sobe (ou sinaliza a remoção d)o arquivo e devolve o resultado pro pai via `aoAlterar`."* Quem usa (`criar-usuario.jsx`, `alterar-usuario.jsx`, `minha-conta-page.jsx`) decide quando mandar isso ao backend.

📌 **Três estados, não dois.** `aoAlterar(idArquivo, novaUrl)` = foto nova; `aoAlterar(null, null)` = remoção pedida; **não ter chamado `aoAlterar`** = nenhuma escolha feita. Por isso o pai guarda o id como `undefined` por padrão, nunca `null` — *"exatamente pra sobrar esse terceiro estado"*.

#### Redução de imagem no navegador (`reduzir-imagem.util.js`)

`services/25-arquivo/util/reduzir-imagem.util.js` reduz a imagem **antes** do upload, usando a Canvas API nativa, sem biblioteca: `createImageBitmap(arquivo, { imageOrientation: 'from-image' })` → `<canvas>` redimensionado com `drawImage` → `canvas.toBlob(...)` → um `File` novo.

📌 **É otimização de UX, nunca autoridade de segurança.** O comentário do arquivo é categórico: *"complementa, não substitui, o processamento de verdade que o backend já faz com `sharp` ... O backend continua sendo a autoridade: o navegador pode mentir, alguém pode chamar a API direto sem passar por aqui."* O ganho declarado é duplo: upload mais rápido em conexão ruim (*"foto de celular de 5MB vira umas centenas de KB antes de sair do aparelho"*) e **menos risco de a URL pré-assinada, que vale 5 minutos, expirar no meio de um envio lento**.

📌 **Falha nunca quebra o upload.** Se `createImageBitmap`/canvas não existir, a imagem estiver corrompida, o canvas ficar *tainted*, ou o resultado ficar **maior** que o original, a função devolve o **arquivo original**: *"essa função é só uma otimização de UX, nunca deve ser o motivo de um upload falhar."*

📌 **WebP com fallback verificado, não assumido.** Tenta `toBlob(..., 'image/webp')` e **confere o `.type` do resultado** antes de confiar nele, porque *"`canvas.toBlob` com 'image/webp' nem todo navegador honra (Safari mais antigo cai pra PNG em silêncio, sem erro nenhum)"*. Sem WebP, cai para JPEG — não PNG, *"que sempre sai sem perda e, por isso, muito maior"*. A extensão do nome do arquivo é trocada para bater com o formato de saída.

📌 **A ordem das validações mudou por causa da redução.** `seletor-foto-perfil.jsx` tem hoje **dois** tetos de tamanho, e o comentário explica a razão:
- `TAMANHO_MAXIMO_BRUTO_BYTES` (30 MB), checado **antes** da redução — *"só pra recusar algo absurdo cedo (ex.: vídeo de 300MB renomeado pra .jpg) sem gastar CPU tentando processar no canvas"*;
- `TAMANHO_MAXIMO_AVATAR_BYTES` (8 MB), checado **depois** — *"não antes: com a redução automática no cliente, uma foto de celular de 10-15MB vira algumas centenas de KB, então barrar pelo tamanho BRUTO derrubaria o próprio motivo de ter a redução."*

O teto de 8 MB espelha o backend (*"baixado de 10MB pra 8MB em 01-09-2026 — plano grátis do Supabase Storage só tem 1GB de espaço total"*), e o perfil de redução (`{ larguraMaxima: 512, qualidade: 80 }`) espelha o perfil `'avatar'` do Nest — ver o ⚠️ de sincronia manual na seção 2.

📌 **Tratamento de erro que distingue as origens:** o `catch` só passa por `traduzirErro` o que for `ErroHttp`, porque *"validação local e falha de rede no PUT pro bucket ... já lançam com mensagem própria em português; passar essas por `traduzirErro` as trocaria pela mensagem genérica de 'não foi possível falar com o servidor', que aqui seria enganosa."*

📌 Detalhe pequeno mas necessário: o `onChange` zera `evento.target.value`, *"sem isso, escolher o MESMO arquivo duas vezes seguidas ... não dispara `onChange` na segunda vez"*.

---

## 10. Estado global: os três providers

`main.jsx` monta a árvore assim:

```jsx
<StrictMode>
  <BrowserRouter>
    <ConfiguracoesProvider>
      <ToastProvider>
        <App />
```

e `App.jsx` envolve as rotas num quarto provider **só em desenvolvimento**:

```jsx
return import.meta.env.DEV ? <CampoTestesProvider>{rotas}</CampoTestesProvider> : rotas;
```

| Provider | Onde | Para quê |
|---|---|---|
| `ConfiguracoesProvider` | `services/11-configuracoes/provider/` | carrega uma vez todas as configurações globais públicas e expõe `obterConfiguracao(chave)` via `useConfiguracoes()` |
| `ToastProvider` | `components/layout/` | `useToast().mostrar(mensagem, titulo, tipo)` |
| `CampoTestesProvider` | `services/campo-testes/context/` | estado compartilhado entre T1/T2/T3/T4 — só em build de dev |

📌 **`ConfiguracoesProvider` existe para não hardcodar regra de negócio no JSX.** O comentário: *"Existe pra qualquer tela (admin ou pública, futura) conseguir ler `taxa_plataforma_padrao`, `valor_minimo_contribuicao` etc. direto do banco via `obterConfiguracao(...)`, em vez de escrever esses valores de negócio direto no HTML/JSX."* Ele converte o `valor` (sempre string ou `null` na coluna) para o tipo real usando o `tipo` que a própria linha declara (`decimal`/`inteiro`/`booleano`), e só considera linhas com `ativo = true`. Usa `configuracaoApi.buscarPublicas()` — `fetch` cru, sem token (ver seção 6).

⚠️ **Não existe provider/estado global de autenticação.** `auth` é passado por prop desde `App.jsx` (seção 5). É consistente hoje, mas significa que toda página nova precisa aceitar `auth` como prop explicitamente.

---

## 11. CSS, Tailwind e temas

Duas fontes de estilo, importadas nessa ordem em `main.jsx`:

1. **`assets/css/tailwind-theme.css`** — `@import 'tailwindcss'` + o bloco `@theme` com as cores e fontes do projeto: `--color-primary: #0f9b58`, `--color-primary-dark`, `--color-surface`, `--color-dark: #0f172a`, `Inter` e `DM Serif Display`. 📌 Está num arquivo isolado por uma razão técnica concreta: *"`@import 'tailwindcss'` se expande inline ... e depois disso mais nenhum `@import` pode vir no MESMO arquivo (regra de CSS: `@import` só pode vir antes de qualquer outra regra)"*.
2. **`assets/css/0-style.css`** — manifesto que importa os arquivos numerados na ordem: `1-base.css`, `2-componentes.css`, `3-admin-shell.css`, `4-crud.css`, `5-responsividade.css`, `6-campo-testes.css`. 📌 A convenção vem declarada: *"mesma ideia do projeto de interface de referência ... um arquivo por responsabilidade, importado aqui em ordem"*.

📌 **`@theme` do Tailwind v4 emite as cores como variáveis em `:root`**, então `1-base.css` usa `var(--color-primary)` sem redeclarar nada. O que o `@theme` não cobre (tamanhos de fonte, escala de slate, cores de status, raio de borda, sombra, paleta de avatar) é declarado em `1-base.css`.

📌 **Tema escuro por atributo, não por classe utilitária.** `ControleTema` grava `data-tema` em `<html>`; `1-base.css` tem três blocos de tokens (`:root` = claro, `:root[data-tema='escuro']`, e `@media (prefers-color-scheme: dark)` combinado com `[data-tema='sistema']`) que reagem sozinhos. Consequência prática documentada: *"nenhum componente além deste precisa saber que o tema mudou."* É por isso que o JSX usa classes semânticas próprias (`fundo-cartao`, `texto-forte`, `borda-padrao`, `texto-fraco`) misturadas com utilitários Tailwind — as semânticas são as que trocam de valor com o tema.

⚠️ O JSX mistura, na mesma linha, utilitários Tailwind e classes semânticas do CSS numerado. Funciona e é consistente, mas exige saber qual vocabulário usar em cada caso — não há regra escrita sobre isso em lugar nenhum do código.

---

## 12. Campo de Testes (`campo-testes/`)

Todo arquivo do Campo de Testes começa com o mesmo cabeçalho, literal:

```
// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================
```

📌 **O que é, segundo o próprio código** (comentário em `admin-menu.constants.js`): *"Telas administrativas pra testar, pela interface (não só por Thunder Client), módulos que hoje só fariam sentido testar pela área PÚBLICA do site (que ainda não existe em React). O que for criado aqui nunca aparece pro usuário final, é só ferramenta de teste interna."*

### As quatro telas

| Tela | Arquivo | O que faz |
|---|---|---|
| **T1 — Bancada do Pesquisador** | `views/campo-testes/bancada-pesquisador.jsx` | lista pesquisadores reais (`GET /perfil-pesquisador`), promove usuário → pesquisador, gerencia links acadêmicos; a seleção alimenta T2 |
| **T2 — Bancada da Campanha** | `views/campo-testes/bancada-campanha.jsx` | campanhas (filtradas pelo pesquisador selecionado em T1), orçamento/cronograma, aprovar/rejeitar; a "campanha em foco" alimenta T3 |
| **T3 — Vida da Campanha Ativa** | `views/campo-testes/vida-campanha-ativa.jsx` | atualizações, comentários/endosso, seguir — sobre a campanha em foco de T2 |
| **T4 — Registro de Chamadas** | `views/campo-testes/registro-chamadas.jsx` | gaveta recolhível presente em todas as telas acima; lista as requisições feitas, com método/caminho/status/tempo/corpo, e monta um `curl` |

### Protegido por `import.meta.env.DEV` em três lugares

1. `rotas.constants.js` — o bloco de rotas T1/T2/T3 é espalhado condicionalmente (`...(import.meta.env.DEV ? [...] : [])`);
2. `admin-menu.constants.js` — o **objeto do grupo inteiro**, não só os itens;
3. `App.jsx` — o `CampoTestesProvider`.

📌 O ponto 2 tem origem documentada: *"só os ITENS estavam protegidos por DEV ... o GRUPO em si (título 'CAMPO DE TESTES' + tooltip) continuava aparecendo no build de produção, vazio mas visível, o que já vazava a existência da ferramenta pro usuário final. O `npm run build` de verdade confirmou isso: a string 'CAMPO DE TESTES' aparecia no bundle final antes desta correção."*

### O que ele NÃO faz mais: o "Elenco"

📌 Existiu um motor de login múltiplo (`ElencoProvider`), **removido em 25-08-2026**. O comentário de `campo-testes-provider.jsx`: *"pedido do Lucas: 'remover de vez' o motor de login-múltiplo — nenhum endpoint do backend aceita agir 'em nome de' outro usuário, então simular vários atores ao mesmo tempo não tinha mais sustentação real."*

Consequências, todas registradas no código:
- toda chamada usa a **sessão real do painel** (`auth.authFetch`), via o hook `use-chamada-registrada.js`, que apenas acrescenta cronometragem e registro para T4;
- "Promover Usuário → Pesquisador" e as ações de link acadêmico *"só têm efeito de verdade quando o usuário selecionado É a própria conta logada — pra qualquer outro, a RLS responde com erro de permissão"*. Isso está explicitado como **limitação aceita**, não bug;
- criar campanha **saiu** de T2, porque a RLS exige `id_usuario = id_usuario_atual()`;
- em T3, "Seguidores" virou um único toggle ("Eu sigo");
- T4 perdeu a coluna "Ator".

⚠️ **T3 ainda não foi redesenhado** depois da remoção do Elenco. O comentário: *"T1 e T2 tiveram prioridade, T3 fica só 'destravado' por enquanto — o redesenho de verdade fica pra outra conversa."*

### Trabalha sobre dados reais, com uma trava explícita

📌 `services/campo-testes/util/registros-bloqueados.js` marca os pesquisadores de id **12 a 22** e as campanhas de id **1 a 10** como bloqueados dentro do Campo de Testes: eles aparecem nas listas (riscados, com cadeado), mas sem botão de ação. Motivo: *"já nascem com uma 'demo' inteira montada desde `07_seed_dados.sql` ... Mexer neles pra testar quebraria a demonstração que já existe pronta."*

⚠️ Esses limites (12, 22, 10) são constantes fixas no arquivo, casadas com os ids do seed. Se o seed mudar, elas silenciosamente passam a bloquear/liberar os registros errados.

📌 `services/campo-testes/util/gerar-cpf-valido.js` existe porque o backend valida o dígito verificador de CPF — coerente com `PENDENCIAS e correcoes.md`, item 745 (todos os CPFs de desenvolvimento são inventados; não há verificação de existência real).

⚠️ **T4 não grava o Bearer**, e por isso o `curl` gerado não é autenticado. É decisão consciente: *"gravar token de sessão num log que fica na tela o tempo todo seria pior que não ter o cURL pronto."*

---

## 13. Dependências: o que cada uma faz e por que está aqui

A tabela da seção 2 já resume versão e um comentário de uma linha por peça de build. Este capítulo aprofunda o **porquê** — a stack de produção aqui é pequena (5 pacotes), então dá pra cobrir cada uma com profundidade real, sem precisar agrupar tanto quanto o `DOCUMENTACAO_BACKEND.md` precisou.

### 13.1 Dependências de produção — as que vão pro `dist/` final

| Pacote | Por que está aqui |
|---|---|
| **`react` + `react-dom`** | O framework em si — sem alternativa cogitada em nenhum comentário encontrado no código. `react-dom` é o renderizador para navegador (contraparte de `react-native`, por exemplo, que este projeto não usa). |
| **`react-router`** | Roteamento client-side. **Não é `react-router-dom`** — decisão registrada em `PENDENCIAS e correcoes.md` (parte 17): `react-router-dom` estava travado numa versão 7.x com vulnerabilidade alta conhecida (*RSC Mode CSRF Bypass*); o pacote `react-router` v8 já inclui os bindings de DOM (não precisa dos dois pacotes juntos) e está fora da faixa vulnerável. Trocar de pacote no meio do projeto foi reação a uma CVE, não preferência de estilo. |
| **`tailwindcss` + `@tailwindcss/vite`** | Utilitários CSS, integrados como **plugin de build**, não `<script>` de CDN. Isto foi uma correção, não a escolha original — ver 13.2. |

### 13.2 A correção do Tailwind: de CDN pra dependência de build

Registrada com comentário direto no código (`react/vite.config.js`): *"Tailwind saiu do `<script>` CDN do index.html (achado do Claude Web, 02-08-2026: `dist/` não continha NENHUMA classe Tailwind, tudo era gerado em runtime pelo navegador baixando o CDN — quebra sem rede, não deveria ir pra produção nunca)"*. Ou seja: o problema não era estético, era funcional — o CSS inteiro do app dependia de uma requisição de rede em runtime pra um CDN de terceiro, toda vez que alguém abria a página, e um build de produção "pronto" não continha nenhuma classe Tailwind de verdade dentro dele.

📌 **O critério que decide o que continua em CDN e o que não continua** (Google Fonts e Font Awesome permanecem, ver seção 2): só o que **quebra a página inteira** sem rede saiu do CDN. Fonte/ícone que falha degrada suave (ícone some, fonte cai pro fallback do sistema); CSS que falha quebra o layout inteiro. É a mesma régua aplicada nos dois casos, com resultado diferente porque o impacto da falha é diferente.

### 13.3 Ferramental de build e tipo — `vite`, `@vitejs/plugin-react`, `@types/react`/`@types/react-dom`

`vite` é o bundler/dev-server; `@vitejs/plugin-react` é o que ensina o Vite a processar JSX e habilita Fast Refresh (hot reload preservando estado de componente). Os dois pacotes de tipo (`@types/react`, `@types/react-dom`) chamam atenção **porque o projeto é JavaScript, não TypeScript** (seção 2) — eles não compilam nada; existem só para o editor (autocomplete/checagem leve via `// @ts-check` ou inferência do VSCode) entender a API do React sem exigir migração pra `.tsx`. É um meio-termo real: ganha parte do benefício de tipo sem pagar o custo de converter o projeto inteiro — mas não é o mesmo que a pendência do item 10 (JS vs TS) resolvida de verdade, que exigiria os arquivos serem `.ts`/`.tsx` de fato para o compilador checar, não só o editor sugerir.

### 13.4 Lint — `eslint` + `@eslint/js` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `globals`

Config flat (`eslint.config.js`, seção 2). `eslint-plugin-react-hooks` é o que pega uso incorreto de hook (dependência faltando em `useEffect`, hook chamado condicionalmente) — categoria de bug que o React não detecta em tempo de execução até virar um sintoma confuso. `eslint-plugin-react-refresh` garante que um arquivo continua compatível com Fast Refresh (ex.: barra exportar um componente e uma constante não-componente do mesmo arquivo, o que quebra a preservação de estado do hot reload). `globals` só fornece a lista de variáveis globais conhecidas (`window`, `document`, etc.) pro ESLint não acusar "variável não definida" em código de navegador.

---

## 14. O que não existe ainda / pontos em aberto

### A interface pública

⚠️ **Não existe nenhuma página pública de campanha.** O doador nunca vê nada hoje — só existe o painel administrativo. Isso está registrado em `PROXIMOS_MODULOS.md`, seção *"Fora do backend (Nest) — vale registrar também"*, junto com o Open Graph (prévia de link no WhatsApp), que depende da página pública existir primeiro. Este documento não repete a explicação — a lista de lá é a fonte.

Sinais disso espalhados pelo código, todos coerentes entre si:
- `views/checkout/`, `views/dash-doador/`, `views/dash-pesquisador/` existem só com `.gitkeep`;
- os links "Explorar Projetos"/"Como Funciona"/"Transparência LGPD"/"Submeter Pesquisa" do header são `window.alert()`;
- o botão "Continuar com Google" do login é `window.alert('Login social com Google simulado no protótipo.')`;
- `tipoLinkApi.listarPublico` existe e não tem chamador: *"Ainda sem nenhuma tela pública chamando isto ... já deixado pronto pra quando existir"*;
- o Campo de Testes existe justamente para testar *"módulos que hoje só fariam sentido testar pela área PÚBLICA do site (que ainda não existe em React)"*.

### Decisões e débitos em aberto

⚠️ **JavaScript vs TypeScript** — `PENDENCIAS e correcoes.md`, item 10, ainda 🔴 e sem decisão. Ver seção 2.

⚠️ **`react/.gitignore` não cobre `.env`** — item 744, correção deliberadamente adiada. Ver seção 5.

⚠️ **Nenhum teste automatizado no React.** Só `build` + `lint`.

⚠️ **Comentários desatualizados sobre o módulo `25-arquivo`.** O módulo de upload já existe e funciona (é o que `SeletorFotoPerfil` usa), mas dois arquivos ainda afirmam o contrário:
- `components/layout/avatar-usuario.jsx`: *"o upload de arquivo ainda não está implementado, ver PENDENCIAS.md; quando existir, é só trocar `foto` por uma URL de verdade aqui"* — o parâmetro `foto` já recebe URL real hoje (`minha-conta-page.jsx`, `menu-usuario.jsx`, `consultar-usuario.jsx`);
- `views/admin/dashboard-identidade-visual.jsx`: a aba "Identidade Visual" continua sendo um placeholder que diz *"depende do módulo de UPLOAD de arquivo (25-arquivo) existir de verdade primeiro, e ele ainda não existe (só a pasta reservada)"*. O placeholder em si segue válido (ninguém implementou o gerenciamento de logo/favicon), mas a justificativa não é mais verdadeira.

⚠️ **Outro comentário desatualizado, menor:** `components/layout/breadcrumb.jsx` afirma que *"A aba padrão do admin (`/admin/usuarios`) tem `rotuloBreadcrumb: null` de propósito"*. Isso deixou de valer quando o Dashboard virou a aba padrão (08-08-2026): hoje quem tem `rotuloBreadcrumb: null` é `/admin/dashboard`, e `/admin/usuarios` tem rótulo normal. O comportamento do componente está certo — só o exemplo citado no comentário envelheceu.

⚠️ **Constantes duplicadas manualmente entre `nest/` e `react/`** — perfis de redução de imagem, lista de MIME types, tetos de tamanho, mínimos de orçamento/cronograma exibidos como rótulo em T2. Todos com comentário pedindo sincronia manual. É consequência direta de não haver tipo compartilhado (item 10).

⚠️ **Filtro/busca/paginação client-side** na `GenericTable` e na `BuscaGlobal` — os dois lugares admitem por escrito que não escalam além de "dezenas de linhas" e precisariam de suporte do backend.

⚠️ **Telas do Campo de Testes reimplementam filtro/paginação** em vez de usar `<GenericTable>`.

⚠️ **`DevLoginRapido` não é protegido por `import.meta.env.DEV`**, ao contrário do Campo de Testes, e carrega senhas de seed literais no código.
