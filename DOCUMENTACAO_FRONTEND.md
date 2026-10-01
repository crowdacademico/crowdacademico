# ⚛️ Documentação Técnica do Frontend React - CrowdAcadêmico

> 📌 **Numeração de RF (29-09-2026):** os requisitos vigentes são o `informacoes/REQUISITOS_V8.md` (122 RFs). Citações de RF por número neste documento foram escritas em datas diferentes e podem estar em qualquer numeração anterior (pré-06-09-2026, V6, V7 ou V8). A `MATRIZ-RASTREABILIDADE-RF.md` já está inteira na numeração do V8 e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

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

**Decisão do Lucas: TypeScript**, seguindo a recomendação já registrada aqui antes (*"o NestJS já é TypeScript por padrão - manter o front em JavaScript puro cria uma costura inconsistente entre as duas pontas"*) - `PENDENCIAS e correcoes.md`, item 10, marcado 🟢 desde então. Migração feita de uma vez (06/07-09-2026), em 7 fases (das folhas pra raiz - `constants/`/`util/` primeiro, `views/`/raiz do app por último), zero mudança de comportamento de propósito - o que foi achado de errado no caminho ficou registrado, não corrigido na hora (`HISTORICO_ACHADOS_PARA_DISCUTIR.md`, itens 7 a 13).

`any`/`@ts-ignore`/`@ts-expect-error` são proibidos; `as` só é permitido numa única fronteira fechada (`tratarResposta<T>()` em `services/constant/api/http.util.ts` - conversão de bytes crus de rede pra dado tipado, onde é estruturalmente impossível ao compilador deduzir o tipo sozinho). Detalhamento completo da migração, decisões tomadas e achados no caminho: `HISTORICO_ACHADOS_PARA_DISCUTIR.md` (itens 7 a 14) e `DOCUMENTACAO_LINT.md`.

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
├── .env.example        - modelo comentado do .env (27-09-2026)
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
| `services/constant/` | o que é compartilhado por todos os módulos: `constants/api.constants.ts` (a URL base), `api/http.util.ts` (tratamento de resposta), `api/traduzir-erro.util.ts`, `util/formatacao.util.ts` (moeda/percentual/CPF em pt-BR), `type/suspensao.type.ts` (formulário e resposta de suspensão, os mesmos para conta e pesquisador) |
| `services/router/` | `rotas.constants.ts` - a fonte única de "quais páginas existem" |
| `services/campo-testes/` | contexto, hooks e utilitários da bancada de testes (ver seção 12) |
| `views/admin/` | a casca do painel (layout, sidebar, menu) e as telas de Dashboard |
| `views/campo-testes/` | as telas T1/T2/T3/T4 |

### Nomes de arquivo (28-09-2026)

- **Em palavras simples:** o nome de cada arquivo diz o assunto e o papel dele, sempre do mesmo jeito, para achar as coisas sem abrir pasta por pasta. O React já seguia isso quase sempre; uma auditoria acertou o que escapava.
- **Decisão:**
  - Em `services/`: `<assunto>.<papel>.ts`, com o papel sendo `api`, `type`, `constants` ou `util` (ex.: `configuracoes.api.ts`, `papel-ordem-poder.constants.ts`, `gerar-cpf-valido.util.ts`). Hooks começam com `use-`. A pasta é sempre `util`, no singular.
  - A pasta do módulo tem o mesmo número e nome do módulo do Nest (`services/28-dashboard`, `services/11-configuracoes` com arquivos no plural, como a tabela).
  - Os tipos que espelham DTOs do Nest têm o **mesmo nome da classe do Nest** (`ConfiguracoesResponse`, `TermoUsoRequestCreate`, `SuspensaoRequestDto`). A renovação de sessão usa o mesmo `AuthResponseLogin` do login.
  - Toda chamada à API passa por um `<assunto>.api.ts` em `services/`, nunca direto da tela (o `/link-academico` da tela de usuário foi para `services/7-link-academico`). Exceção: o Campo de Testes, que chama direto de propósito, para o registro de chamadas.
  - Em `views/` e `components/`, o arquivo tem o nome do componente, em português (`modal-criar-usuario.tsx` exporta `ModalCriarUsuario`). Um arquivo pode guardar um par que anda junto (`modal-area-conhecimento.tsx` exporta Consultar e Alterar).
- **Motivo:** mesma regra do Nest ("inglês para a estrutura, português para o assunto"): o papel do arquivo segue o padrão do mercado, e o nome da tela é o que a pessoa vê.
- **Caso-limite aceito:** o sufixo `-page` continua só nas telas de `3-auth`, e os hooks ficam em três lugares (`services/*/hook`, `components/crud`, `components/layout/toast`); mexer nisso não trazia ganho que pagasse a troca.

### Listas de valores do banco geradas para o React (29-09-2026)

**Em palavras simples.** O banco tem listas fechadas de valores, os ENUMs. Por exemplo, o status de uma campanha só pode ser `rascunho`, `aguardando_aprovacao`, `ativo`, `sucesso`, `nao_atingido`, `rejeitado`, `encerrado` ou `encerrado_moderacao`. Antes, o React tinha essas listas **copiadas à mão**: se o banco ganhasse um status novo e ninguém lembrasse do React, a tela mostraria o valor cru (`encerrado_novo`) e nenhum teste avisaria. Agora o React **lê as listas de um arquivo gerado a partir do banco**. Os rótulos que a pessoa vê ("Aguardando aprovação") continuam escritos à mão, mas o compilador acusa se faltar o rótulo de algum valor.

**O caminho de um valor, do banco até a tela:**

1. **Banco:** o ENUM é criado no `01_extensoes_enums_tabelas.sql` (ex.: `CREATE TYPE status_campanha AS ENUM (...)`).
2. **Nest:** o kysely-codegen lê o banco e escreve `nest/src/commons/database/db.types.generated.ts`, com `export type StatusCampanha = "aguardando_aprovacao" | "ativo" | ...` (ver `DOCUMENTACAO_BACKEND.md`, seção 2.6).
3. **React:** `react/scripts/gerar-enums-do-banco.mjs` lê esse arquivo e escreve `react/src/services/constant/type/enums-do-banco.gerado.ts`, com a lista e o tipo: `STATUS_CAMPANHA = ['aguardando_aprovacao', ...] as const` e `StatusCampanha`. São 16 listas hoje, em ordem alfabética.
4. **Constantes de cada módulo:** o tipo é importado do arquivo gerado e reexportado com o mesmo nome de antes (por isso nenhuma tela precisou mudar o `import`). Ali ficam o que é só de tela: a **ordem de exibição**, o **rótulo** e a **cor do selo**.

**Onde cada lista é usada hoje:**

| Tipo | Arquivo que reexporta | O que fica escrito à mão ali |
|---|---|---|
| `StatusCampanha` | `services/12-campanha/constants/status-campanha.constants.ts` | ordem do ciclo de vida, rótulo, cor do selo |
| `ModeloCampanha` | `services/12-campanha/type/campanha.type.ts` | nada |
| `StatusPesquisador`, `TituloAcademico`, `TipoVinculo` | `services/6-perfil-pesquisador/constants/status-pesquisador.constants.ts` | rótulos |
| `TipoTermo` (e a lista `TIPOS_TERMO`) | `services/5-termo-uso/type/termo-uso.type.ts` e `constants/termo-uso-tipos.constants.ts` | rótulo e descrição de quando cada termo aparece |
| `TipoMotivoDenuncia` | `services/10-motivo-denuncia/type/motivo-denuncia.type.ts` | nada |
| `TipoConfiguracao` | `services/11-configuracoes/type/configuracoes.type.ts` | nada |

As outras listas geradas (status de contribuição, de denúncia, de notificação, meio de pagamento, fase e tipo de atualização, tipo de recompensa...) já estão no arquivo, prontas para quando os módulos delas ganharem tela.

**As duas travas do compilador:**

- **Rótulo faltando.** Os rótulos são `Record<StatusCampanha, string>` ("para cada valor, um texto"). Se o banco ganhar um valor e o rótulo não, o `npx tsc` dá erro dizendo qual falta (ex.: *Property 'sucesso' is missing*).
- **Valor faltando numa lista de ordem.** A ordem dos status de campanha é escrita à mão, porque segue o ciclo de vida e não a ordem alfabética. Ela passa por `listaCompleta<StatusCampanha>()` (`services/constant/util/lista-completa.util.ts`); se faltar um valor, o erro diz qual (ex.: *faltando: "encerrado_moderacao"*).

**Passo a passo para acrescentar (ou tirar) um valor de um ENUM:**

1. Mudar o ENUM no `01` e preparar o grupo do `ATUALIZAR O SUPABASE.sql` (`ALTER TYPE ... ADD VALUE`).
2. Regerar os tipos do banco no Nest: `npm run db:codegen` dentro de `nest/` (lê o banco do `.env`), ou o script de geração de tipos da pasta local de testes do banco (lê os arquivos 01 a 08).
3. Atualizar a lista escrita à mão do Nest, se houver (ex.: `STATUS_CAMPANHA` em `db.types.ts`); a suíte de teste de conferência de tipos acusa se ficar diferente.
4. Regerar as listas do React: `npm run gerar:enums` dentro de `react/`.
5. Rodar `npx tsc --noEmit` no `react/`: ele aponta cada rótulo e cada lista de ordem que precisa do valor novo. Escrever os rótulos.
6. Conferir que está tudo em dia: `npm run gerar:enums -- --conferir` (não grava nada; sai com erro se o arquivo gerado estiver velho). A mesma suíte de teste de conferência de tipos roda isso a cada rodada.

- **Decisão:** o React não repete mais nenhum valor de ENUM do banco à mão; só a ordem de exibição, o rótulo e a cor. O arquivo gerado vai para o git (quem clona o projeto não precisa gerar nada para compilar).
- **Motivo:** fechar um tipo de erro silencioso (valor novo no banco que a tela não conhece) e usar o compilador como fiscal.
- **Caso-limite aceito:** o arquivo só se atualiza quando alguém roda `npm run gerar:enums`; esquecer não quebra nada na hora, mas a conferência da suíte de testes acusa. Tipos do React que não são ENUM do banco continuam escritos à mão (ex.: `EscopoTipoLink`, `ContextoArquivo`, que são regras do Nest, não do banco). O nome da lista gerada segue o nome do tipo no banco (`TipoTermo` vira `TIPO_TERMO`); onde o React já usava outro nome (`TIPOS_TERMO`), ficou um apelido.

### Subpastas dentro de cada módulo de `services/` - convenção oficial (fechada em 06-09-2026)

**`api/constants/hook/type[/context][/util]`** - esqueleto oficial pra todo módulo novo daqui pra frente, criado com `.gitkeep` mesmo antes de existir código. As 4 primeiras são a base; `context/` e `util/` só entram quando o módulo precisa mesmo delas (critério de cada uma, abaixo). Não existe mais "duas convenções coexistindo" - `11-configuracoes` (que tinha `provider/` separado de `context/`) já foi unificada nesse formato numa rodada anterior; o que restava era só formalizar por escrito que este é o padrão pra módulo NOVO, não migrar nada em módulo antigo.

⚠️ **Não é retroativo:** 4 módulos mais antigos (`10-motivo-denuncia`, `9-tipo-link`, `27-log-auditoria`, `5-termo-uso`) nunca ganharam o esqueleto completo - têm só `api/`, sem os `.gitkeep` de `constants/hook/type`. Não é erro nem pendência - são módulos simples o bastante pra nunca ter precisado das outras pastas; a convenção vale pra módulo novo, não obriga recriar pasta vazia em módulo que já funciona sem ela.

**Duas pastas a mais, ambas opcionais, cada uma resolvendo um problema diferente:**
- **`context/`** - só existe nos módulos que precisam de estado compartilhado entre telas sem parentesco (`11-configuracoes`, `campo-testes`). Critério de quando um módulo ganha ela, e o formato exato, na seção 10.
- **`util/`** - só existe nos módulos que têm lógica pura auxiliar que não é chamada de API (`api/`), nem estado (`hook/`/`context/`), nem constante fixa (`constants/`) - hoje usada por `25-arquivo` e `campo-testes`. Critério é o mesmo espírito das outras: se o módulo tem uma função "cálculo/formatação sem efeito colateral" que várias partes dele reaproveitam, ela mora aqui em vez de duplicada dentro de cada `api.ts`/hook.

🟢 **A pasta `type/` deixou de estar vazia (07-09-2026)** - era resquício do esqueleto pensado para TypeScript, sem uso enquanto a decisão "React em JavaScript ou TypeScript" não tinha sido tomada. Com a migração concluída, `type/` de todo módulo com chamada de API real (13 módulos, ver `HISTORICO_ACHADOS_PARA_DISCUTIR.md` sobre o escopo exato da Fase 2) hoje espelha os DTOs de resposta (e, desde o refinamento pós-migração, também de request) do Nest correspondente - um arquivo `<modulo>.type.ts` por módulo. Os módulos sem chamada de API real ainda mantêm a pasta reservada, só com `.gitkeep`.

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

### Guarda de login do painel (26-09-2026)

📌 **Uma guarda só, no `AdminLayout`.** Sem sessão, qualquer `/admin/*` vai para `/login` levando a página pedida (`state.voltarPara`); depois de entrar pelo formulário, o login devolve a pessoa para lá (só aceita caminho que começa com `/admin/`, nunca um endereço de fora). Enquanto a sessão salva está sendo restaurada (`auth.carregando`, no F5), a guarda espera em vez de mandar para o login por engano. Nenhuma tela tem código de acesso próprio.

📌 **Só confere se HÁ sessão, não o papel.** Qualquer conta logada (usuário, pesquisador, moderador, admin) vê o painel inteiro, o que mantém os testes com cada papel como estavam; o que cada papel pode ler ou alterar continua decidido pelo backend (guards do Nest e RLS), que é a proteção de verdade. **Próximo passo, perto do fim do sistema:** cada rota em `rotas.constants.ts` ganha um campo de permissão, lido pelo menu lateral e por esta mesma guarda (quem não é da gestão vê só o Dashboard); reaproveita esta guarda inteira. O botão `<dev> Entrar como...` sempre leva ao Dashboard (não usa `voltarPara`).

### O menu lateral é derivado, não duplicado

`views/admin/admin-menu.constants.ts` **não** tem lista própria de itens: ele filtra `ROTAS_ADMIN` por `grupoMenu` via uma função `itensDoGrupo()`. O comentário registra o problema que isso resolveu: *"antes existiam 2 listas (esta e `ROTAS`) descrevendo as mesmas 3 abas, com risco de desalinhar"*.

Os grupos hoje são: um grupo sem título (só o Dashboard, com divisória), `GESTÃO DO USUÁRIO`, `Configurações`, `CAMPANHA`, `MODERAÇÃO` e - só em desenvolvimento - `CAMPO DE TESTES`.

📌 **Chave interna ≠ rótulo visível.** O `grupoMenu` das rotas continua sendo a string `'CADASTROS'` mesmo que o título exibido já tenha mudado duas vezes (para "GESTÃO DE ACESSO E SISTEMA" e depois "GESTÃO DO USUÁRIO"). O comentário justifica: *"é só a CHAVE interna que liga rota↔grupo, não aparece na tela; só o rótulo visível muda"*. O mesmo raciocínio vale para `/admin/configuracoes`, cuja URL não mudou quando o item passou a se chamar "Parâmetros do Sistema".

⚠️ O grupo `MODERAÇÃO` tem **Aprovar Campanhas** como item real (rota `/admin/aprovar-campanhas`, desde 26-09-2026) e 3 itens escritos à mão e marcados `desabilitado: true` (Denúncias, Solicitações, Enc. Antecipados). O comentário é explícito sobre o porquê: *"são só o desenho do painel completo, sem fingir que uma tela que não existe funciona"*.

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

Antes do passo 2, se ainda não há access token mas há refresh token (F5 com sessão salva), o `authFetch` espera a renovação inicial, a mesma promise compartilhada que a página abre ao carregar, e só então chama a API. Sem essa espera, listagens que exigem login (usuários, pesquisadores, termos de uso) disparavam a chamada antes da sessão voltar, levavam 401 no console e faziam uma segunda renovação. O token mais recente fica também em um `useRef` (`accessTokenRef`) porque um `authFetch` capturado antes da renovação enxergaria o estado antigo.

O comentário resume: *"SEMPRE manda Bearer quando tem accessToken. Se a resposta vier 401 (access token expirado - dura só 15min), tenta renovar UMA vez com o refresh token e repete a chamada original. Isso é o que todo o painel admin usa pra falar com a API - nunca `fetch()` cru direto."*

📌 **Barra de carregamento (27-09-2026).** Toda chamada do `authFetch` (e o envio de arquivo ao armazenamento) passa por `acompanharRequisicao` (`components/layout/barra-carregamento/atividade-rede.ts`), um contador de requisições em andamento fora do React. `BarraCarregamento`, montada uma vez em `layout.tsx`, mostra uma faixa fina da cor da marca no topo da tela enquanto o contador for maior que zero. Só aparece depois de 300ms (CSS, `.barra-carregamento` em `4-componentes.css`), então resposta rápida não pisca nada; com "reduzir movimento" ligado no sistema, a faixa fica parada. As poucas chamadas públicas com `fetch` cru (login, listas públicas) não entram na contagem.

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

`react/.env.example` (27-09-2026) é o modelo comentado, como o `nest/.env.example`: explica onde a variável é lida, o valor padrão se faltar e o formato em produção, e avisa que tudo que começa com `VITE_` vai para o navegador (nunca pôr segredo nele).

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

- `configuracoes.api.ts` → `buscarPublicas()`: *"Sem `authFetch` de propósito: `pol_config_select` já libera as configurações globais (`id_usuario IS NULL`) pra qualquer um, logado ou não - é o que sustenta `useConfiguracoes()` em página pública (campanha, home), que roda fora de `<ConfiguracoesProvider>` autenticado."*
- `tipo-link.api.ts` → `listarPublico()`: mesma justificativa, apontando `pol_tipolink_select`.
- `arquivo.api.ts` → `buscar()` e `buscarAvatarPorUsuario()`: *"são públicos no backend (`pol_arquivo_select` é `USING(true)`)"*.

📌 **Paginação desembrulhada num lugar só.** Vários endpoints devolvem `{ dados, total, pagina, tamanho }` desde 03-08-2026, correção de um problema real: um `findall` sem `limit`/`offset` baixaria a tabela inteira conforme ela crescesse. O `.dados` é desembrulhado **dentro do `.api.ts`**, uma vez só, pra `GenericTable` e todo o resto do app continuar recebendo um array puro, sem precisar saber que página/total existem.

📌 **`13-orcamento-campanha` e `14-marco-cronograma` ganharam `type/`+`api/` (23-09-2026).** Antes, `ItemOrcamento`/`MarcoCronograma` viviam como interface local dentro de `views/campo-testes/bancada-campanha.tsx`, com o comentário admitindo shape inferido do próprio uso (só a bancada consumia). Extraídos pro molde padrão (`OrcamentoCampanhaResponse`/`MarcoCronogramaResponse`, espelhando os DTOs reais do Nest, incluindo `descricao`/`ordem`/`criadoEm` que a bancada não usa hoje). `orcamentoCampanhaApi.listar`/`marcoCronogramaApi.listar` substituíram as 2 chamadas `authFetch` cruas de leitura. As 6 chamadas de escrita (criar/alterar/excluir dos 2 recursos) **continuam** via `chamarERegistrar` (o hook do Campo de Testes que também alimenta T4/Registro de Chamadas) - não passaram pra API nova de propósito, porque essa troca perderia o registro em T4.

📌 **Filtro de listagem vira query string num lugar só (27-09-2026).** `paraQueryString(filtro)` (`services/constant/api/query-string.util.ts`) transforma qualquer objeto de filtro em `?chave=valor&...`, pulando o que for `undefined`. Eram cinco cópias da mesma função (motivo de denúncia, campanha, pesquisador, área, tipo de link), cada uma listando os campos à mão; um filtro novo agora é só um campo a mais na interface do filtro.

📌 **A listagem que trunca em 500 avisa (20-09-2026).** O backend limita as listagens em 500 registros (`paginacao.util.ts`, teto de segurança, não paginação de tela). Antes, as 11 chamadas de listagem faziam `.then((resposta) => resposta.dados)` e descartavam o `total`: no registro 501 a tela passava a mentir em silêncio ("500 registros" existindo 3000). Agora todas passam por `desembrulharPaginado(rotulo)` (`services/constant/type/paginacao.type.ts`), que mantém o mesmo retorno (`T[]`) e dá um `console.warn` quando `total` é maior que o devolvido. Não é paginação no servidor (o volume atual não justifica), só o fim do silêncio.

### `tratarResposta` - `services/constant/api/http.util.ts`

Todo `.api.ts` termina em `.then(tratarResposta)`. A função:

- se `!resposta.ok`, lança um **`ErroHttp`** (subclasse de `Error` que carrega `status` além da mensagem e, quando o backend manda, `campos`: `{ <campo>: [mensagens] }` da validação do DTO ou da duplicidade);
- se ok, lê o corpo **como texto primeiro** e só faz `JSON.parse` se houver algo.

📌 O segundo ponto tem origem documentada: *"achado do Lucas: 'Unexpected end of JSON input' ao atribuir permissão. Checar só `status === 204` não bastava. Endpoint que só cria um vínculo ... volta com corpo vazio, mas o Nest manda 201 (padrão de POST), não 204 ... Ler como texto primeiro e só fazer `JSON.parse` se tiver algo cobre QUALQUER status com corpo vazio."*

📌 **Por que `ErroHttp` carrega o `status`:** *"o backend já categoriza erro em 4 faixas de HTTP pelo ERRCODE (`postgres-exception.filter.ts`), mas o React descartava o status e ficava só com o texto - sem status, `traduzir-erro.util.ts` não tem como tratar 429/5xx/etc de forma diferente do resto."*

### `traduzirErro` - `services/constant/api/traduzir-erro.util.ts`

Espelho, do lado do React, do `postgres-exception.filter.ts` do Nest. Trata só o que o backend **não** consegue cobrir sozinho: **falha de rede** (backend fora do ar, sem internet, CORS). O `fetch` rejeita antes de existir qualquer resposta HTTP, e `erro.message` seria o texto do navegador em inglês ("Failed to fetch").

📌 **O 429 não é mais sobrescrito aqui (27-09-2026).** Antes, o React trocava a mensagem do limite de tentativas por um texto fixo sem prazo. Agora o backend já manda "Tente de novo em 40 segundos" em português (`DOCUMENTACAO_BACKEND.md`, seção 3.4), e o texto passa direto.

📌 Todo o resto passa direto: *"400/403/404/409... já vem em PT-BR, específico e correto direto do backend ... não faz sentido sobrescrever o que já está certo."*

O par "texto de erro na tela + toast" está encapsulado em `components/layout/toast/use-erro-toast.ts` (`reportarErro(erro)`), que faz `setErro(traduzirErro(erro))` e dispara o toast numa chamada só - *"qualquer tela nova que adote isto ganha o toast de graça, sem precisar lembrar da 2ª linha"*.

📌 **Erro embaixo do campo certo (27-09-2026).** Quando o erro traz `campos`, `useErroToast` também devolve `errosCampo` (a primeira mensagem de cada campo) e `limparErroCampo(campo)`. Nesse caso o texto vermelho do topo fica vazio (o erro já aparece no campo) e o toast continua avisando. O componente `Campo` (seção 9, `components/input/`) mostra a mensagem embaixo do campo, pinta a borda de vermelho e liga as duas coisas para o leitor de tela; ao digitar de novo no campo, o erro dele some. Usado nos formulários de criar e alterar tipo de link, área do conhecimento e motivo de denúncia e, desde 27-09-2026, em Criar Usuário, Alterar Papel, Criar Termo, Parâmetro do Sistema e no CPF do upgrade de pesquisador. Exemplo: código CNPq repetido volta 409 e aparece embaixo de "Código CNPq", não solto no topo.

---

## 7. Upload de arquivo (`25-arquivo`)

`services/25-arquivo/api/arquivo.api.ts` é o exemplo mais completo do padrão de service, porque é o único que fala com **dois hosts diferentes**.

### O fluxo, na prática: três chamadas de rede

| Passo | Chamada | Vai para |
|---|---|---|
| 1 | `arquivoApi.iniciarUpload(authFetch, { nomeOriginal, tipoMime, tamanhoBytes })` → `POST /arquivo/upload/iniciar` | backend Nest (autenticado) |
| 2 | `arquivoApi.enviarParaBucket(uploadPreAssinado, arquivo, aoProgresso?)` → `PUT` na URL pré-assinada | **direto no provedor de armazenamento** |
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
| `colunas` | array de `{ chave, rotulo, tipo }`, com extras opcionais: `renderizar(linha)` e `quebrarRotulo`. O `tipo` é obrigatório (ver "Tipos de coluna", abaixo) |
| `chavePrimaria` | nome do campo usado como `key` de linha |
| `listar` | função **já pré-amarrada** com `authFetch` pelo componente pai; a tabela só a chama |
| `acoes` | `Partial<Record<'alterar'\|'consultar'\|'excluir', (linha) => void>>` (14-09-2026, ERA `acoes: AcaoPadrao[]` + `aoAlterar`/`aoConsultar`/`aoExcluir` separados) - quais botões aparecem é derivado das CHAVES presentes, não de uma lista à parte. Ausente ⇒ sem coluna de ações |
| `filtrosFacetados` | array de `{ chave, rotulo, ordem? }` - cada um vira um dropdown de múltipla escolha |

Não existe prop de log - `BlocoLogAuditoria` é um componente IRMÃO (ver seção 9), colocado pela tela logo abaixo de `<GenericTable>`, não uma prop daqui (13-09-2026, achado do Lucas: "log de auditoria não é estrutura de tabela").

📌 **Busca sem acento (27-09-2026).** Toda busca por texto do sistema passa por `services/constant/util/busca.util.ts` (`normalizarBusca`, `contemTermo`): ignora acentos, maiúsculas e espaços repetidos, então "sao paulo" acha "São Paulo". Usada no `GenericTable`, na base das tabelas do Campo de Testes (`tabela-bancada.tsx`), na busca global (Ctrl+K) e nas caixas de escolha de pesquisador (T2) e de campanha (T3). Antes, só maiúsculas eram ignoradas. Os campos "digite o nome para confirmar a exclusão" continuam com comparação exata, de propósito.

📌 **CRUD não acontece dentro da tabela.** Criar, Alterar, Consultar e Excluir abrem modal no componente pai, pelos handlers de `acoes` (nunca formulário ou `confirm()` embutido na tabela).

📌 **Estado de filtro/página/ordenação vive na URL**, via `useSearchParams`, não em `useState` local. Motivo documentado: *"ao voltar de 'Consultar' via `navigate(-1)`, o filtro escolhido resetava - a página de listagem é desmontada na troca de rota, e `useState` não sobrevive a isso."* Toda escrita usa `{ replace: true }`, para que o botão Voltar não fique preso no passo-a-passo de cada clique de dropdown. Nomes reservados na query string: `q`, `pagina`, `tamanho`, `ordenar`, `dir`.

### Tipos de coluna (26-09-2026)

📌 **Cada coluna declara um `tipo`, e o tipo decide tudo o que é visual e de comportamento:** largura, alinhamento, formato, ordenação e busca. A tela nunca escreve largura nem alinhamento na mão. Assim, a mesma espécie de coluna fica igual em todas as tabelas, e as colunas não "dançam" ao passar de uma tabela para outra.

📌 **Tipo = formato + espaço.** Em `components/crud/colunas/`, o FORMATO (como mostra, busca e ordena: texto, número, Sim/Não, dinheiro, data, data-hora) mora em `formatos.tsx`, e o ESPAÇO que a coluna ocupa mora nos arquivos numerados. Pelo espaço, só existem 5 tipos:

| Arquivo | Espaço | `tipo` usados pela tela | Como se comporta |
|---|---|---|---|
| `1-coluna-id.ts` | id | `id` | 1ª coluna, estreita, centralizada, sem quebra; presa à esquerda na rolagem lateral |
| `2-coluna-nome.tsx` | nome | `nome` | O nome do registro (mesmo quando o campo é título, descrição, chave ou versão). Coluna principal: tem mínimo (`--coluna-nome-min`) e máximo do texto (`--coluna-nome-max`); presa à esquerda, logo depois do id. Uma por tabela |
| `3-coluna-texto.tsx` | texto | `texto` | Texto variável que não é o nome (e-mail, código, papéis); à esquerda, largura pelo conteúdo, quebra antes do nome |
| `4-coluna-curta.ts` | curta | `numero`, `simNao`, `status`, `codigo`, `dinheiro`, `data`, `dataHora` | Centralizada e **nunca quebra**, nem o valor nem o cabeçalho (datas, status como "Upgrade Pesquisador", valores em R$). Largura = a do maior valor da lista inteira; as do **mesmo tipo na mesma tabela ficam iguais** (as 4 Sim/Não de Tipos de Link, meta e arrecadado em Campanhas, ativo e pública em Parâmetros) |
| `5-coluna-acoes.tsx` | Ações | (nenhum) | Não é declarada pela tela: a tabela monta sozinha a partir de `acoes`, sempre por último, só com a largura dos botões |

O catálogo (`tipo` → formato + espaço) e o contrato ficam em `tipos-coluna.ts`. Dinheiro e data chegam crus da API; a data-hora mostra os segundos (decisão do Lucas, 26-09-2026).

📌 **Largura das colunas curtas medida em pixels, não estimada.** `generic-table.tsx` mede, antes de pintar a tela (`useLayoutEffect`), o cabeçalho, as células visíveis (inclui o badge Sim/Não) e o texto de TODAS as linhas da lista na fonte da célula (`canvas.measureText`), e aplica o maior valor do grupo como `min-width`. Uma estimativa por número de letras sobrava uns 20% e empurrava tabelas para a rolagem. Mede o conteúdo, não a célula, então aplicar o resultado não muda a próxima medição; refaz quando a tabela muda de tamanho (inclusive com A-/A+).

📌 **Ordena pelo valor cru, exibe formatado.** Antes, dinheiro e data chegavam à tabela já como texto ("R$ 10.000,00", "dd/mm/aaaa") e a ordenação era alfabética: "R$ 10.000" vinha antes de "R$ 9.000", e "criada em" ordenava pelo dia. Agora a tela entrega o valor original, o tipo compara pelo valor e formata só na célula. A busca procura no que a pessoa vê na célula (ex.: "50.000", "Sim") e também no valor cru.

📌 **Larguras de nome e texto em tokens, em `5-crud.css`.** Nome e texto crescem com o conteúdo, com piso calculado pela lista **inteira** (não só pela página visível), para a coluna não mudar ao virar a página; esse piso é limitado por `--coluna-piso-maximo` (menor para texto que para nome, e menor ainda no celular). Ações ocupa só a largura dos botões (`width: 1%`): antes, a coluna Ações engolia todo o espaço sobrando em tela larga (chegava a 1011 px em Papéis, a 1920 px de janela).

📌 **Ao diminuir a tela:** primeiro some o espaço extra (as colunas se juntam); depois, com a seção abaixo de 1000 px, o texto secundário (tipo `texto`: e-mail, código, chave) desce um tamanho de fonte; depois nome e texto quebram a linha; e só então a tabela rola de lado dentro do cartão. E-mail e chave técnica são uma "palavra" só, então a quebra acontece só em ponto natural: depois do `@` e do `_` (`<wbr>`, `comQuebrasNaturais` em `colunas/formatos.tsx`). Depois do `.` não, para o e-mail ocupar no máximo 2 linhas.

📌 **Distribuição das colunas do meio (`components/crud/colunas/distribuicao.ts`).** Modo único "direita": texto e curta ficam do tamanho do conteúdo, encostadas em Ações, e o NOME fica com a sobra. Parte dessa sobra volta como respiro igual entre as colunas do meio (`--respiro-dados`, medido em `generic-table.tsx`, teto `--respiro-dados-maximo` em `5-crud.css`); o respiro some quando falta espaço ou quando uma coluna de texto está quebrando linha. Abaixo de 1000 px de seção a coluna de texto deixa de ser justa e divide a folga com o nome.

📌 **Tabelas específicas: `components/crud/tabelas/`, uma por arquivo, numeradas.** Toda tabela que não é uma listagem do `GenericTable` mora aqui: 1 links acadêmicos, 2 dimensões do score, 3 itens de orçamento, 4 marcos do cronograma, 5 histórico de alterações, 6 Papel × Permissão, 7 critérios de envio, 8 bancada do pesquisador (T1), 9 bancada da campanha (T2), 10 atualizações (T3), 11 comentários (T3). Regra: a tabela mostra e edita (colunas, formatação, edição na linha, Consultar, busca, faceta, paginação); quem busca e salva é a tela que usa a tabela, por props (`aoAdicionar`, `aoSalvar`, `aoExcluir`...). Duas bases sem número evitam repetição: `tabela-editavel.tsx` (edição na linha, usada por 1, 3 e 4) e `tabela-bancada.tsx` (registros bloqueados riscados, "ocultar bloqueados", busca, faceta e paginação, usada por 8 e 9). Regras que as tabelas usam e que não são componente moram em `services/` (`12-campanha/util/criterios-envio.util.ts`, `2-papel-permissao/util/chave-celula-matriz.util.ts`).

📌 **Título da tabela é o `h1` da página** (`nivelTitulo`, padrão `1`). Numa página com mais de uma seção, as seguintes passam `nivelTitulo={2}` (Permissões, em Papéis; o exemplo do Guia de Estilo). O visual é o mesmo nos dois níveis.

📌 **Rolagem lateral com colunas presas.** Quando a tabela não cabe, id e nome ficam presos à esquerda e Ações à direita (`position: sticky`), com uma linha fina separando a parte presa da que rola, só do lado em que há algo escondido. A largura real da coluna id é medida em `generic-table.tsx` (`--deslocamento-nome`), para o nome grudar logo depois dela. No celular (seção com menos de 640 px) só o nome fica preso, no canto esquerdo: id, nome e Ações presos ao mesmo tempo não deixariam janela para rolar.

📌 **A dica do último botão de Ações abre alinhada pela direita**: centralizada, ela passava da borda da tabela (mesmo invisível, ocupa espaço) e criava uma rolagem lateral de poucos pixels.

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
| `modal-ficha.tsx` | casca larga dos modais de Consultar/Alterar/Criar (backdrop + cartão + rodapé; prop `erro` mostra o erro no topo do corpo). **Três caminhos de fechar**, todos passando por `aoFechar`: o X, o clique no fundo escurecido (desligável com `fecharAoClicarFora={false}`, usado no wizard de Criar Campanha para um clique perdido não descartar várias etapas) e a tecla **Esc** (sempre ligada, é ação deliberada como o X). Limite conhecido: dois `ModalFicha` empilhados fecham juntos no Esc, cada um registra o próprio listener, por isso o Campo de Testes evita modal sobre modal |
| `log-auditoria-painel.tsx` (ver `bloco-log-auditoria.tsx`) | painel "Ver log" - componente IRMÃO colocado pela tela logo abaixo de `<GenericTable>`, não uma prop dela |
| `acao-linha.tsx` | ícone + texto + dica de hover de cada ação de linha (Alterar/Consultar/Excluir) - usado por `GenericTable` E pelas bancadas do Campo de Testes |
| `badge-booleano.tsx` | `<span className="badge ...">Sim/Não</span>` - versão avulsa do que `GenericTable` já faz sozinha pra colunas booleanas |
| `rodape-acoes.tsx` | `RodapeAcoes` (27-09-2026): botão secundário (Cancelar, Voltar, Fechar, Entendi) + ação opcional (ou uma lista de ações, como Salvar e Enviar no Alterar Campanha) (Salvar, Criar, Confirmar exclusão), que fica desabilitada e troca o texto ("Salvando...") enquanto `ocupado`. Sem ação, sobra só o "Fechar" dos Consultar. `perigo` usa o botão vermelho; `formulario` submete um `<form>` pelo id. Substituiu o `RodapeFormulario` (usado numa tela só) e o bloco copiado em 15 modais |
| `botao-criar.tsx` | `BotaoCriar` (27-09-2026): o "Criar" do topo das listas, de Minhas Campanhas e do T2. Abre o modal (`aoClicar`) ou vai para a página de criar (`para`, Termos de Uso). Um lugar só para o dia em que o botão ganhar regra (ex.: só aparecer com permissão) |
| `mensagem-erro.tsx` | `MensagemErro` (27-09-2026): o texto de erro em destaque no topo; vazio, não desenha nada. O `ModalFicha` já o mostra pela prop `erro`, então os modais só passam `erro={erro}`; usado direto só fora de modal (cadastro, Criar Termo) ou quando o erro fica em outro ponto da tela |
| `use-alteracao-nao-salva.ts` | `useAvisoAlteracaoNaoSalva(sujo)` - `beforeunload` nativo |

### `components/pagination/` e `components/search/` - extraídos do `GenericTable` (14-09-2026)

| Componente | Papel |
|---|---|
| `pagination/navegacao-pagina.tsx` | núcleo "Página X de Y (N registros) / Anterior / Próxima" (23-09-2026) - `RodapePaginacao` o compõe passando o seletor de tamanho como `children`; `log-auditoria-painel.tsx` (paginação no servidor, sem seletor) o usa direto; `unidade` troca o sufixo ("registros" / "no total") |
| `pagination/rodape-paginacao.tsx` | rodapé "Página X de Y / Mostrar / Anterior / Próxima" - controlado, sem opinião de onde página/tamanho moram (URL no `GenericTable`, `useState` nas bancadas do Campo de Testes) |
| `search/barra-filtros.tsx` | busca de texto + 1+ dropdowns de faceta - controlado; gerencia por conta própria qual dropdown está aberto (estado de UI, não filtro). Cada filtro ativo vira um chip com X logo abaixo (27-09-2026), e "Limpar filtros" aparece com mais de um |

📌 **Chips de filtro (27-09-2026).** Saem das mesmas props que a barra já recebia (o X da busca chama `aoMudarBusca('')`, o de uma opção chama `aoAlternar(opcao)`), então as três telas que usam a barra (`GenericTable` e as duas bancadas) ganharam os chips sem mudar nada. "Limpar filtros" usa `aoLimparTudo` quando quem chama passa um: a `GenericTable` passa, porque guarda os filtros na URL e o `setSearchParams` do React Router recebe os parâmetros do último render, então várias chamadas seguidas se atropelariam. Sem `aoLimparTudo` (estado local, `useState`), a barra chama as limpezas uma a uma.

📌 **Nasceram do segundo teste de prop** (ver seção 8: "se uma tela que não pode usar `GenericTable` ainda precisa disto, é irmão, não miolo") - as bancadas do Campo de Testes não podem usar a TABELA genérica (risco de linha), mas precisavam do rodapé e da barra de filtros, e reimplementavam os dois à mão em 3 lugares diferentes antes desta extração.

📌 **`ModalExcluirUsuario` (`modal-excluir-usuario.tsx`) exige confirmação por digitação do e-mail, não um `window.confirm()`.** Mostra os dados reais do usuário antes de excluir (mesma casca `ModalFicha`/`SecaoFicha`/`CampoFicha` de Consultar) e só habilita o botão de confirmar quando o texto digitado bate com o e-mail da conta, exatamente (case-insensitive). O comentário do arquivo explica o critério que separa este caso do de Configuração (que hoje nem tem Excluir: parâmetro global não se apaga, e a exclusão de configuração pessoal, sem tela, também seria com confirmação simples): *"exclusão de USUÁRIO exige digitar o e-mail - configuração é um dado técnico, não a conta de uma pessoa."*

📌 **`CartaoFormulario` nasceu de duplicação real:** *"era a MESMA estrutura ... copiada e colada em 7 arquivos ..., já levemente divergente entre eles"*.

📌 **`ModalDetalhe`/`ModalDetalhePermissao` - "Papéis com esta permissão" lido ao vivo, nunca de dicionário estático.** `views/2-papel-permissao/modal-detalhe-permissao.tsx` monta o modal genérico (`modal-detalhe.tsx`) com um detalhe fixo (nome amigável, o que faz, por que existe, badge de impacto - `services/2-papel-permissao/constants/permissao-nomes-amigaveis.constants.ts`, dicionário `nome → rótulo` sem coluna nova no banco) e uma lista que **não** vem desse dicionário: refaz as mesmas duas chamadas de `matriz-papel-permissao.tsx` (`papelApi.listar` + `papelPermissaoApi.listar`) para saber quem tem a permissão agora. O comentário do arquivo explica por quê: *"o dicionário só sabe o que a permissão FAZ, não quem tem ela agora - isso muda toda vez que um admin mexe na matriz."* A listagem de Permissões usa o mesmo dicionário para exibir o nome amigável como "nome" e o código cru (`permissao.nome`) como "chave".

📌 **`CartaoFormulario` e `FichaConsulta` compartilham duas larguras canônicas** - `'media'` (`max-w-2xl`) e `'larga'` (`max-w-5xl`) - decisão registrada de definir larguras canônicas em vez de cada tela escolher a sua. O comentário de `cartao-formulario.tsx` explica a causa raiz do redesenho: a versão anterior tinha medida e comportamento de modal (centralizado na tela, altura travada com *scroll* próprio), mesmo sendo usada como página em todo lugar - daí a queixa de que ficava "um monte de card empilhado, confuso".

📌 **Telas "Alterar" com conteúdo substancial usam 2 colunas dentro do `CartaoFormulario` largo (`largura="larga"`).** `modal-consultar-usuario.tsx` e a aba Conta de `modal-alterar-usuario.tsx` são o exemplo: `grid lg:grid-cols-3`, coluna principal (`lg:col-span-2`) com o conteúdo principal, coluna lateral (1/3) com metadados e o card `<dev>` isolado. Desde 29-09-2026 o Alterar Usuário é dividido em abas (ver a seção 19). Empilha em 1 coluna abaixo do breakpoint `lg`, mesmo comportamento de sempre no celular. O comentário do arquivo cita o mesmo padrão usado por painéis de referência (Stripe/Linear/Vercel) para tela de edição de registro.

📌 **`FichaConsulta` existe porque campo desabilitado comunica a coisa errada:** *"'campo desabilitado' é o jeito errado de comunicar 'isto nunca foi editável' (o desabilitado promete 'você poderia editar, mas não pode' - aqui nada promete isso)"*.

📌 **`useAvisoAlteracaoNaoSalva` deliberadamente não usa `useBlocker` do react-router:** *"essa API exige montar um diálogo próprio pra cada bloqueio - pro escopo deste pedido (só avisar, não impedir a qualquer custo), os dois mecanismos nativos do browser resolvem sem componente extra"*. Navegação interna (botão Cancelar) é tratada tela a tela, com `window.confirm` antes do `navigate(-1)`.

### `components/layout/` - a moldura do app

`layout.tsx` (Header + Breadcrumb + `<main>` com o `<Outlet/>` + Footer), `header.tsx`, `footer.tsx`, `breadcrumb.tsx`, `menu-usuario.tsx`, `avatar-usuario.tsx`, `busca-global.tsx` (+ `busca-global-evento.ts`), `sino-atividade.tsx`, `controle-tema.tsx`, `controle-fonte.tsx`, `tooltip.tsx`, `toast-provider.tsx` (+ `toast-context.ts`, `use-toast.ts`), `use-erro-toast.ts`, `dev-login-rapido.tsx`.

📌 **Header e Footer são cópia declarada do protótipo de interface.** O comentário de `header.tsx`: *"Cópia fiel de `componentes/header.html` do Projeto de Interface real (mesmas classes Tailwind, mesma estrutura)"*. As adaptações estão listadas ali: a marca navega de verdade para `/`; "Submeter Pesquisa" continua `window.alert()` de placeholder, *"mesmo espírito do `showAction()` do protótipo original"*. O menu "Explorar Projetos"/"Como Funciona"/"Transparência LGPD", que estava comentado no código esperando essas telas, saiu (26-09-2026); volta quando as telas existirem.

📌 **Títulos e marcos da página (26-09-2026).** Toda página tem exatamente um `<main>` (em `layout.tsx`; o `AdminLayout` é um `<div>` dentro dele) e exatamente um `h1`: o título grande das páginas públicas (Login, Criar conta, Verificar e-mail), "Dashboard", o nome de Minha Conta, o título da bancada no Campo de Testes, o título do cartão de formulário (`CartaoFormulario`) e, nas listagens, o título da `GenericTable` (ver `nivelTitulo`). As seções abaixo são `h2`, e os blocos dentro de um modal (título `h2`) são `h3`; os títulos do rodapé são `h2`. `SecaoFicha` recebe `nivel` (3 em modal, 2 em página). A troca de nível não muda o visual: as classes continuam as mesmas, e onde a regra base de `h1`-`h3` (serif, em `3-base.css`) mudaria a fonte, a tag leva `font-sans`. Resultado: o axe não acusa nenhuma violação, nem moderada, nas 22 telas (painel, públicas, log aberto e modal de detalhe). Os modais `ModalFicha` e `ModalDetalhe` têm `role="dialog"`, `aria-modal` e o título como nome acessível (`aria-labelledby`): o leitor de tela anuncia a janela ao abrir. O mesmo vale para a busca global (Ctrl+K), o modal de termos do cadastro e a gaveta do menu no celular (só enquanto aberta; fechada nessa largura ela fica `invisible`, para os links fora da tela não receberem o Tab).

📌 **`LimiteErro` (27-09-2026): erro numa tela não apaga o app inteiro.** `components/layout/limite-erro.tsx` é o "ErrorBoundary" do React: um erro de renderização mostra um aviso ("Algo deu errado ao mostrar esta tela", botão de recarregar e, só em desenvolvimento, a mensagem técnica) no lugar do trecho que quebrou. Antes, qualquer erro desmontava a aplicação e deixava a tela em branco. Fica em dois lugares: em volta do `<Outlet/>` de `layout.tsx` (todas as páginas) e do `<Outlet/>` da área de conteúdo do `AdminLayout` (erro numa tela do painel preserva o menu lateral e a busca). Recomeça ao trocar de página (`key` pelo caminho), senão o aviso ficaria preso ao navegar. Precisa ser componente de classe: é a única forma que o React oferece. Ideia vinda da auditoria de outro sistema acadêmico (Atlas).

📌 **Erro embaixo do campo, não botão desabilitado (29-09-2026).**
- **Em palavras simples:** antes, com algo faltando, o botão ("Próximo", "Criar conta", "Suspender", "Alterar senha") ficava cinza e a pessoa não sabia por quê. Agora o botão sempre funciona; clicando com algo errado, cada campo mostra embaixo o que falta, em vermelho, e o cursor vai para o primeiro deles. Corrigiu, o aviso some sozinho.
- **Decisão:** `useErrosFormulario(validar)`: `validar` devolve a mensagem de cada campo com problema; `tentarEnviar()` marca a tentativa e diz se pode seguir; `erroDe(campo)` vai na prop `erro` do `<Campo>` (ou num `<p>` com `aria-invalid`/`aria-describedby` quando o campo não usa `<Campo>`). Aplicado em: criar campanha (etapa Dados), cadastro público (inclusive o aceite dos Termos), seção de suspensão (conta e pesquisador) e "Alterar senha" da Minha Conta.
- **Motivo:** heurísticas de Nielsen 1 (mostrar o que está acontecendo) e 9 (ajudar a reconhecer e corrigir o erro); o exemplo que o Lucas deu na pendência de Nielsen era exatamente este.
- **Caso-limite aceito:** os avisos que já apareciam enquanto a pessoa digita (meta abaixo do mínimo, e-mail inválido ao sair do campo, senhas diferentes, prazo fora do intervalo) continuam aparecendo na hora; o hook só acrescenta os que faltavam, na tentativa. Os outros formulários do painel continuam no padrão antigo até a auditoria de Nielsen passar por eles.

📌 **`useBuscar` (`services/constant/hook/use-buscar.ts`, 27-09-2026): um só "buscar dado quando algo muda".** A `GenericTable` (listagem), o `LogAuditoriaPainel` (página do log) e o Consultar de campanha repetiam o mesmo `useEffect` com estados de carregando e erro. Agora usam o hook, que também descarta resposta atrasada: se a pessoa troca de página duas vezes rápido e a primeira resposta chega por último, ela não sobrescreve a segunda nem mexe em tela já fechada. Substituiu o antigo `useBuscarPorId`, que só servia a busca por id e tinha sobrado com um uso. Também usam: o resumo do Dashboard, as grandes áreas do Criar Área e as áreas de Criar/Alterar Campanha, estas por um hook do módulo, `useAreasDaCampanha` (`services/8-area-conhecimento/hook/`), porque a busca era idêntica nas duas telas. "Carregar para editar" usa o mesmo hook (27-09-2026): `aoChegar` recebe o dado quando ele chega e preenche o formulário da tela, `erros` passa o `useErroToast` da própria tela (o erro de carregar e o de salvar aparecem no mesmo lugar) e `recarregar()` busca de novo. Assim funcionam Alterar Usuário (`useDadosUsuario`), Alterar Termo, Alterar Campanha e a matriz Papel × Permissão.

📌 **Foco do teclado nas janelas (`services/constant/hook/use-foco-preso.ts`).** Ao abrir, o foco entra na janela (ela é anunciada pelo título); Tab e Shift+Tab circulam só lá dentro; ao fechar, o foco volta para quem abriu. Com uma janela sobre outra (ex.: o detalhe de um item dentro do Alterar), só a de cima prende o Tab, e o **Esc fecha só a janela de cima** (cada janela trata o próprio Esc e para a propagação; antes o Esc escutava a página inteira e fechava as duas). Clicar no fundo escurecido não tira o foco da janela, para o Esc continuar funcionando.

📌 **Avisos (toasts) acima dos modais e anunciados.** Ficam numa camada acima dos modais (`z-[300]`; antes `z-[100]`, atrás dos modais, e o erro de "Enviar para aprovação" ficava escondido). Erro é `role="alert"` (o leitor de tela fala na hora); sucesso é `role="status"`.

📌 **`AvatarUsuario`: cor determinística por nome.** Hash simples (soma de código de caractere) sobre uma paleta de 7 tokens CSS - *"a mesma pessoa cai sempre na mesma cor, em qualquer tela/sessão, sem guardar nada no banco. Nada de `Math.random()`."* Escala de tamanhos `sm`/`md`/`lg`/`xl`/`xxl`.

📌 **`ControleTema` / `ControleFonte`: preferência de dispositivo, não de conta.** Os dois guardam em `localStorage` (`crowdacademico.tema`, `crowdacademico.escalaFonte`) e usam inicializador preguiçoso do `useState` para evitar flash. Ambos registram a mesma reversão: *"Preferência POR CONTA - tentada em 10-08-2026 ... REVERTIDA no mesmo dia por decisão do Lucas com a Alexia: preferência pessoal deveria ficar numa tabela própria se um dia existir, não colunas soltas em `usuario` ('estamos com tabelas demais no momento')."* O tema aplica um atributo `data-tema` em `<html>`, e o CSS reage sozinho (ver seção 11); a fonte muda a custom property `--escala-fonte`. O ciclo do tema é claro → escuro → sistema → claro, *"pedido explícito do Lucas"*.

📌 **`SinoAtividade` lê `log_auditoria` de verdade** (`GET /log-auditoria/minha-atividade`), não um cache local de toasts: *"toast é feedback de 'o que EU acabei de clicar', isso aqui é 'o que aconteceu, mesmo enquanto eu não estava olhando'"*. A contagem de "não lidos" é feita **sem coluna `lida` no banco** - guarda só o maior `id_log` já visto em `localStorage`. Está rotulado "Atividade recente", não "Notificações", de propósito: *"quando `26-notificacao` existir de verdade, o dropdown ganha uma 2ª aba"*.

📌 **`BuscaGlobal` (Ctrl+K/Cmd+K)** busca em usuário/papel/permissão/configuração ao mesmo tempo, mais navegação. Carrega os catálogos só na primeira abertura e cacheia pela sessão. Busca 100% no navegador, com o limite anotado: *"Catálogos pequenos hoje (dezenas de linhas) ... Revisar se algum catálogo crescer bem além disso."*

📌 **`ToastProvider`:** duração por tipo (sucesso 4s, erro 5s - *"erro fica 1s a mais que sucesso"*). O redesenho unificou as duas estruturas, que tinham evoluído separadas: *"a cor vira ACENTO (a barra/ícone), não fundo. Texto sempre escuro (nunca branco sobre colorido) resolve de vez o problema de legibilidade em monitor não calibrado"*. A barra colorida é `border-left` do próprio cartão, não uma `<div>` irmã dependendo de `overflow-hidden` para arredondar - *"uma borda SEMPRE acompanha o `border-radius` do elemento dela, sem costura nenhuma"*.

📌 **`DevLoginRapido` é ferramenta de desenvolvimento com senhas de seed em texto no código.** São as 6 contas "Sistema" do `07_seed_dados.sql` (Admin, Moderador, Revisor, Suporte, Curador e Pesquisador, uma por papel e sem nome de gente; o Admin Sistema 2 fica de fora por ser o admin de reserva, e não há atalho para usuário comum). A senha de dev vem de `SENHA_DEV` (`services/constant/constants/senha-dev.constants.ts`), a mesma constante usada pelo "Redefinir senha" de dev do modal de usuário, e some do pacote de produção. O comentário justifica (*"logar como admin toda hora pra testar o painel era chato"*) e afirma que não cria conta nem senha nova. **Protegido por `import.meta.env.DEV` desde 04-09-2026** (`header.tsx`), mesmo tratamento do Campo de Testes - some sozinho em qualquer `npm run build`, continua disponível em `npm run dev`. Antes disso, o componente era renderizado pelo `Header` em qualquer build, inclusive produção; foi corrigido depois de identificado como achado em `HISTORICO_ACHADOS_PARA_DISCUTIR.md`.

### Peças centrais da rodada de otimização (27-09-2026)

Uma varredura procurou trechos iguais repetidos pelo React e trocou cada grupo por uma peça só. Em uma linha cada:

| Peça | Onde mora | O que substituiu |
|---|---|---|
| `Campo` | `components/input/campo.tsx` | rótulo + campo + dica ou erro montados à mão: agora em todo formulário (cadastro, login, Minha Conta, usuário, campanha, termo, configuração, papel, catálogos). Todo campo fica ligado ao rótulo e à mensagem para o leitor de tela; antes, as mensagens de validação do cadastro e o rótulo da confirmação de exclusão de conta não estavam |
| `useEnvio` | `services/constant/hook/use-envio.ts` | o "enviar" (limpa erro, liga "Salvando...", chama a API, reporta erro, desliga), que se repetia 36 vezes em 21 arquivos |
| `useErrosFormulario` | `services/constant/hook/use-erros-formulario.ts` | erro por campo no lugar do botão desabilitado (ver abaixo) |
| `SecaoSuspensao` | `components/crud/secao-suspensao.tsx` | as duas seções de moderação (conta e poder de pesquisador), cerca de 156 linhas cada, que só mudavam textos e API; as duas viraram embrulhos finos |
| `criarApiCatalogo` | `services/constant/api/api-catalogo.ts` | as 6 chamadas iguais de tipo de link, área e motivo (listar, listar público, buscar, criar, atualizar, remover) |
| `ModalExcluirItem` | `components/crud/modal-excluir-item.tsx` | os 3 modais de excluir dos catálogos |
| `ConfirmacaoDigitada` + `confirmacaoConfere` | `components/input/` | "Digite o e-mail para confirmar" em 5 lugares (o texto variava entre "pra" e "para") |
| `CaixaAviso` | `components/crud/caixa-aviso.tsx` | a caixa colorida "O que acontece de verdade" / "Não dá para ...", 15 lugares |
| `CaixaBuscaSugestoes` | `components/input/caixa-busca-sugestoes.tsx` | a caixa de busca com lista "ID: x  Nome" do Campo de Testes (dono da campanha em T2, campanha em T3), que fecha ao clicar fora |
| `CaixaMarcacao` | `components/input/caixa-marcacao.tsx` | caixa de marcação com rótulo, 10 lugares |
| `EscoposTipoLink` | `views/9-tipo-link/escopos-tipo-link.tsx` | o grupo "Onde este tipo pode ser usado", igual em Criar e Alterar tipo de link (agora um `fieldset`, anunciado como grupo) |
| `Carregando` | `components/layout/carregando.tsx` | o "Carregando..." solto em 15 lugares; agora anunciado pelo leitor de tela (`role="status"`) |
| `.cartao-painel` | `4-componentes.css` | a mesma sequência de 5 classes nos cartões do Dashboard |

📌 **Bug achado no caminho: data sem hora aparecia um dia antes.** `new Date('2026-10-01')` é meia-noite em UTC, que no Brasil ainda é 30/09. Afetava a data prevista do cronograma, a revisão de campanha e o prazo vencido no Alterar Campanha. `formatarData`/`formatarDataHora`/`formatarMesAno` (`formatacao.util.ts`) agora leem a data pura como meia-noite local, e as datas que eram formatadas à mão (cronograma, histórico de alterações, sino, suspensão) passaram a usar essas funções.

📌 **Listas de opção saem dos mapas de rótulo.** Tipo de vínculo, título acadêmico e tipo de motivo tinham a lista de opções e a guarda de tipo escritas à mão ao lado do mapa de rótulos; agora as duas saem do mapa (`Object.entries`/`Object.hasOwn`), então um valor novo no ENUM entra num lugar só. Efeito visível: o formulário de vínculo mostra "Institucional", não mais o valor cru "institucional".

### `components/input/`

`campo.tsx` (27-09-2026): o bloco rótulo + campo + dica ou erro que se repetia em todo formulário. Recebe `rotulo`, `dica` e `erro` (local, como "código fora do formato", ou do servidor, `errosCampo.nome`); o erro, quando existe, toma o lugar da dica. O campo em si vem por função (`{({ atributos, classeErro }) => <input {...atributos} className={'input-padrao' + classeErro} />}`), para servir a input, select e textarea: `atributos` traz o `id` e o `aria-invalid`/`aria-describedby`, `classeErro` a borda vermelha. Com isso os formulários de catálogo deixaram de criar `useId()` e `<p>` de erro na mão. `campo-cpf.tsx` é o campo de CPF com máscara. `seletor-foto-perfil.tsx` abaixo. `components/3-auth/icone-google.tsx` é um SVG inline do logo do Google, usado no botão "Continuar com Google" da tela de login - que hoje é apenas um `window.alert('Login social com Google simulado no protótipo.')`.

### `SeletorFotoPerfil` - o avatar editável

`components/input/seletor-foto-perfil.tsx` é o avatar com botão de câmera, `<input type="file">` escondido, botão de remover e o fluxo de upload inteiro.

📌 **Separação de responsabilidade:** *"Este componente NUNCA salva nada em `usuario` sozinho - ele só sobe (ou sinaliza a remoção d)o arquivo e devolve o resultado pro pai via `aoAlterar`."* Quem usa (`modal-criar-usuario.tsx`, `modal-alterar-usuario.tsx`, `minha-conta-page.tsx`) decide quando mandar isso ao backend.

📌 **Três estados, não dois.** `aoAlterar(idArquivo, novaUrl)` = foto nova; `aoAlterar(null, null)` = remoção pedida; **não ter chamado `aoAlterar`** = nenhuma escolha feita. Por isso o pai guarda o id como `undefined` por padrão, nunca `null` - *"exatamente pra sobrar esse terceiro estado"*.

📌 **Progresso do envio (27-09-2026).** Enquanto os bytes sobem para o armazenamento, o círculo sobre o avatar mostra a porcentagem em vez do ícone girando. `enviarParaBucket` usa `XMLHttpRequest` em vez de `fetch` só por isso: é o único jeito do navegador contar o que já subiu. O parâmetro `aoProgresso` é opcional, então qualquer upload futuro ganha o mesmo recurso. Nos outros passos (reduzir, iniciar, confirmar) continua o ícone girando.

#### Redução de imagem no navegador (`reduzir-imagem.util.ts`)

`services/25-arquivo/util/reduzir-imagem.util.ts` reduz a imagem **antes** do upload, usando a Canvas API nativa, sem biblioteca: `createImageBitmap(arquivo, { imageOrientation: 'from-image' })` → `<canvas>` redimensionado com `drawImage` → `canvas.toBlob(...)` → um `File` novo.

📌 **É otimização de UX, nunca autoridade de segurança.** O comentário do arquivo é categórico: *"complementa, não substitui, o processamento de verdade que o backend já faz com `sharp` ... O backend continua sendo a autoridade: o navegador pode mentir, alguém pode chamar a API direto sem passar por aqui."* O ganho declarado é duplo: upload mais rápido em conexão ruim (*"foto de celular de 5MB vira umas centenas de KB antes de sair do aparelho"*) e **menos risco de a URL pré-assinada, que vale 5 minutos, expirar no meio de um envio lento**.

📌 **Falha nunca quebra o upload.** Se `createImageBitmap`/canvas não existir, a imagem estiver corrompida, o canvas ficar *tainted*, ou o resultado ficar **maior** que o original, a função devolve o **arquivo original**: *"essa função é só uma otimização de UX, nunca deve ser o motivo de um upload falhar."*

📌 **WebP com fallback verificado, não assumido.** Tenta `toBlob(..., 'image/webp')` e **confere o `.type` do resultado** antes de confiar nele, porque *"`canvas.toBlob` com 'image/webp' nem todo navegador honra (Safari mais antigo cai pra PNG em silêncio, sem erro nenhum)"*. Sem WebP, cai para JPEG - não PNG, *"que sempre sai sem perda e, por isso, muito maior"*. A extensão do nome do arquivo é trocada para bater com o formato de saída.

📌 **A ordem das validações mudou por causa da redução.** `seletor-foto-perfil.tsx` tem hoje **dois** tetos de tamanho, e o comentário explica a razão:
- `TAMANHO_MAXIMO_BRUTO_BYTES` (30 MB, constante fixa), checado **antes** da redução - *"só pra recusar algo absurdo cedo (ex.: vídeo de 300MB renomeado pra .jpg) sem gastar CPU tentando processar no canvas"*;
- `tamanhoMaximoAvatarBytes`, checado **depois** - *"não antes: com a redução automática no cliente, uma foto de celular de 10-15MB vira algumas centenas de KB, então barrar pelo tamanho BRUTO derrubaria o próprio motivo de ter a redução."*

🗑️➡️✅ **O teto de 8 MB deixou de ser constante fixa (06-09-2026, ver `HISTORICO_ACHADOS_PARA_DISCUTIR.md`, item "Constantes duplicadas...").** Antes era `TAMANHO_MAXIMO_AVATAR_BYTES = 8 * 1024 * 1024` hardcoded (duplicando o valor do Nest, sincronizado só de boa vontade); virou `obterConfiguracao('arquivo_tamanho_maximo_imagem_bytes', 8 * 1024 * 1024)` - lê a mesma chave de `configuracoes` que o Admin já pode editar pelo painel, o `8 * 1024 * 1024` que sobra é só o valor mostrado por uma fração de segundo antes do `ConfiguracoesProvider` carregar. A mensagem de erro também calcula o "X MB" a partir desse valor, em vez de "8 MB" fixo no texto. O perfil de redução (`{ larguraMaxima: 512, qualidade: 80 }`) **continua** hardcoded, espelhando o perfil `'avatar'` do Nest à mão - ver o ⚠️ de sincronia manual na seção 2; essa parte não é config, é estrutural, e segue dependendo da decisão de TS.

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

📌 **`ConfiguracoesProvider` existe para não hardcodar regra de negócio no JSX.** O comentário: *"Existe pra qualquer tela (admin ou pública, futura) conseguir ler `taxa_plataforma_padrao`, `valor_minimo_contribuicao` etc. direto do banco via `obterConfiguracao(...)`, em vez de escrever esses valores de negócio direto no HTML/JSX."* Ele converte o `valor` (sempre string ou `null` na coluna) para o tipo real usando o `tipo` que a própria linha declara (`decimal`/`inteiro`/`booleano`), e só considera linhas com `ativo = true`. Usa `configuracoesApi.buscarPublicas()` - `fetch` cru, sem token (ver seção 6).

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

📌 **Os 5 campos com validação inline ganharam `aria-describedby` (23-09-2026).** `modal-criar-area-conhecimento.tsx`, o de criar parâmetro (removido em 26-09-2026 junto com o botão Criar de Parâmetros do Sistema), `modal-criar-tipo-link.tsx` (2 campos) e `modal-tipo-link.tsx` já tinham `aria-invalid` condicional + um `<p>` alternando entre mensagem de erro e texto de ajuda, mas nada ligava o campo a esse texto: um leitor de tela anunciava "inválido" sem dizer o porquê. Cada um ganhou um `id` estável via `useId()` no `<p>` (o mesmo id nos dois ramos do condicional, já que só um deles renderiza por vez) e `aria-describedby={esseId}` no `<input>`, sempre, não só quando inválido. Zero mudança visual. Os demais campos do painel receberam `htmlFor`/`id` no mesmo dia (parágrafo abaixo).

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

📌 **`SENHA_DEV` e o botão "Redefinir senha dev" só existem em desenvolvimento.** `SENHA_DEV = import.meta.env.DEV ? 'DevTcc123!' : ''` e o cartão `<dev>` do modal de Alterar Usuário só renderiza dentro de `{import.meta.env.DEV && ( ... )}`. `import.meta.env.DEV` é uma constante embutida do Vite (verdadeira em `npm run dev`, falsa em `npm run build`), **não é lida de nenhum `.env`**. No `dist` de produção há zero ocorrências de `DevTcc123` e do texto do botão. `registros-bloqueados.util.ts` só é importado por telas do Campo de Testes, cujas rotas só existem com `import.meta.env.DEV`; o Vite descarta essas telas do build. Efeito prático: quem roda com `npm run dev` não percebe nada; num build de produção o botão de redefinir senha some.

📌 **Alerta de mínimo e máximo no modal de Alterar Parâmetro.** Quando a chave editada faz parte de um par mínimo/máximo que o banco confere (`fn_valida_pares_min_max_configuracoes`, erro 90019: prazo, orçamento, cronograma e tamanho de arquivo), o modal mostra uma caixa de aviso amarela dizendo se aquele valor é o MÍNIMO ou o MÁXIMO, com qual chave ele precisa se manter coerente e em que ordem editar (para subir o mínimo acima do máximo atual, suba o máximo primeiro, e o contrário para baixar). O aviso vem de `services/11-configuracoes/constants/configuracoes-pares-min-max.constants.ts`, que **só espelha** os pares para explicar antes de salvar; a regra de verdade é a do banco, que recusa com a mensagem própria (exibida no mesmo modal). Se um par novo entrar no banco, entra nessa lista também.

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
- **Parâmetros do Sistema:** sem botão Excluir (a chave global não se apaga, ver `DOCUMENTACAO_BD.md` `[05-K-2-C]`), e o "Ativo" fica desabilitado nas globais com o motivo escrito. `configuracoesApi.remover` existe para a configuração pessoal.

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

- **Criar Campanha é um passo a passo de 4 etapas no mesmo modal** (`views/12-campanha/modal-criar-campanha.tsx`, compartilhado com Minhas Campanhas e o T2): **Dados**, **Orçamento**, **Cronograma** e **Revisão**, com o indicador de etapas no topo (`components/crud/indicador-etapas.tsx`: número em círculo, ✓ nas feitas, cada etapa clicável depois que o rascunho existe). A campanha é criada no primeiro "Próximo" (`POST`, nasce `rascunho`); ao voltar e avançar de novo faz `PATCH`, nunca um segundo `POST` (sem mudança nos Dados, só troca de etapa). **O rascunho vive sempre neste passo a passo** (decisão do Lucas, 30-09-2026): o Alterar de um rascunho, em Minhas Campanhas e no T2, reabre o passo a passo (`idRascunho`, título "Continuar rascunho"), sempre na etapa 1; o Alterar comum fica para os outros status. A **Revisão** (`etapa-revisao-campanha.tsx`) mostra o checklist do que o banco cobra no envio (prazo, itens, soma igual à meta, marcos), o resumo dos dados, o orçamento com a barra "soma em relação à meta" e o cronograma em linha do tempo; o botão **"Enviar para aprovação"** (`POST /campanha/:id/enviar`) fica nela e continua clicável mesmo com pendência (quem decide é o banco). Fechar pelo X ou Esc deixa o rascunho salvo; com mudança não gravada nos Dados, pergunta antes. As datas respeitam a config (`min` na data de início, duração entre `prazo_minimo_campanha_dias` e `prazo_maximo_campanha_dias`, meta mínima), e as etapas Orçamento e Cronograma mostram uma tabelinha de rótulo mais campo somente leitura (Meta e Soma atual, Mínimo de marcos e Marcos cadastrados), com `.borda-erro` quando não bate.
- **`PainelOrcamentoCronograma`** (`views/12-campanha/painel-orcamento-cronograma.tsx`) é compartilhado entre o wizard e Alterar Campanha, no T2 e em Minhas Campanhas. Erro do banco (valor, data de marco antes do início, limite de itens) aparece na tela; antes o painel engolia o erro (`.catch(() => {})`) e nada acontecia. No wizard recebe `abaFixa` (mostra só uma aba) e `key={etapaCriarCampanha}`: sem o `key` o React reaproveita a instância e o `useState` inicial de `abaAtiva` não roda de novo, e a etapa Cronograma mostrava a tabela de Orçamento. Cada item tem as ações padrão (`AcaoLinha`: Alterar, Consultar, Excluir).
- **Fila de aprovação (`views/12-campanha/aprovar-campanhas.tsx`, 26-09-2026):** lista só as campanhas `aguardando_aprovacao` (`GET /campanha?status=aguardando_aprovacao`), com o sinal "Score baixo" na coluna atenção (só para quem pode aprovar). A ação "Consultar" da linha abre `ModalRevisarCampanha`: dados, datas, orçamento e cronograma da campanha, histórico de rejeições, checklist "Pronta para aprovar?" (orçamento com soma igual à meta e mínimo de itens, mínimo de marcos, lidos de `configuracoes`), caixa de motivo e os botões **Aprovar** (desabilitado enquanto o checklist não fecha) e **Rejeitar** (desabilitado sem motivo). Depois da decisão a fila recarrega. O checklist só ajuda: quem barra de verdade é o banco (`fn_valida_completude_campanha`, 90009 a 90011). A tela é real (não está no Campo de Testes) e não tem guarda de permissão própria: a API e a RLS decidem, e quem não pode aprovar vê a fila vazia.
- **Campos travados no Alterar Campanha (26-09-2026):** o modal busca `GET /campanha/:id` ao abrir, em qualquer status, e desabilita título, área, descrição, vídeo, datas e meta conforme `camposBloqueados` (a lista do banco, ver `[05-K-2-D]` em `DOCUMENTACAO_BD.md`). Um aviso visível ("Campos travados: depois da aprovação estes campos não mudam, para proteger quem já contribuiu") nomeia os campos e cada campo travado aponta para ele por `aria-describedby`; a campanha rejeitada sem reenvios continua com o aviso próprio e todos os campos desabilitados. É o mesmo modal de Minhas Campanhas (`modal-alterar-campanha.tsx`).
- **Alterar Campanha** por status: **rascunho** e **rejeitada** com reenvios sobrando são editáveis, e o rodapé ganha **"Enviar para aprovação"** ou **"Corrigir e reenviar"** (grava o formulário antes de enviar, para não perder alteração). **Rejeitada** mostra no topo o histórico de rejeições, os reenvios restantes e o prazo (vêm de `GET /campanha/:id`: a listagem não traz esses campos). Rejeitada **esgotada** vira somente leitura, com a data em que será excluída. Nenhuma checagem de completude no cliente: o clique acontece e o erro do banco chega traduzido, em vez de um botão desabilitado sem explicação.
- **Datas vencidas no envio:** aviso amarelo dentro do próprio modal (não um segundo modal) oferecendo "Começar agora, mantendo a duração" (`POST /campanha/:id/deslizar-datas` e depois enviar) ou escolher outras datas. Confirmação sempre explícita.
- ⚠️ **Limite da bancada:** quem opera é o administrador, e `fn_valida_transicao_campanha` libera qualquer transição para quem tem `campanha_aprovar`. As travas de reenvio esgotado, prazo e pesquisador suspenso só valem para o **dono**, então T2 não consegue exercitá-las pela interface. O só leitura (que vale para todos) e a oferta de datas funcionam normalmente.

### Minhas Campanhas e as peças compartilhadas (26-09-2026)

📌 **Minhas Campanhas (`views/12-campanha/minhas-campanhas.tsx`, menu CAMPANHA):** as campanhas do usuário logado, em qualquer status (`GET /campanha?idUsuario=`; a RLS deixa o dono ver as suas). **Criar campanha** só aparece para quem tem perfil de pesquisador **ativo** (a mesma condição de `pol_campanha_insert`); para os outros, um aviso explica e leva a Minha Conta > Acadêmico > **Tornar-me pesquisador**. Ações por linha: Consultar (`ModalConsultarCampanha`), Alterar (completa rascunho, ajusta orçamento/cronograma até a aprovação, corrige e reenvia rejeitada; depois de aprovada mostra os campos travados) e Excluir (só rascunho; nos outros status o modal explica o porquê).

📌 **Um só código para o pesquisador e para o Campo de Testes.** O que antes vivia dentro do T2 saiu para `views/12-campanha/`, e o T2 passou a usar as mesmas peças (de 1.922 para cerca de 800 linhas):
- `modal-criar-campanha.tsx`: o passo a passo. O T2 passa `criar` (endpoint de suporte, `POST /campanha/:idUsuario`) e `camposExtras` (o "Dono da campanha").
- `modal-alterar-campanha.tsx`: Alterar. O T2 passa `motivoBloqueio` (as 10 campanhas de demonstração) e `secaoAdmin` (checklist "Pronta para aprovar?", Aprovar e Rejeitar).
- `painel-orcamento-cronograma.tsx` e `modal-excluir-campanha.tsx` (este só em Minhas Campanhas; o Excluir do T2 continua próprio, por causa do "forçar exclusão").
- `services/12-campanha/hook/use-regras-campanha.ts`: meta mínima, prazo mínimo/máximo, mínimo de itens e de marcos, lidos de `configuracoes` num lugar só (também usado pela fila de aprovação); `util/prazo-campanha.util.ts`: `hojeISO` e `duracaoEmDias`.
- `campanhaApi` ganhou `criar`, `criarParaOutro`, `atualizar`, `enviar` e `deslizarDatas`.

📌 **Comentários recebidos no Consultar do dono (30-09-2026).**
- **Decisão:** o Consultar de Minhas Campanhas (`comoDono`) mostra a seção "Comentários recebidos" (`views/12-campanha/secao-comentarios-recebidos.tsx`): autor, data e texto, Endossar/Remover endosso (contador "N de limite endossados", limite de `configuracoes`), Excluir e Excluir e bloquear (`components/crud/modal-excluir-comentario.tsx`). A API é `services/17-comentario/` (`comentarioApi`, `ComentarioResponse`), a mesma que o T3 usa; `GET /comentario` passou a trazer `nomePesquisador`.
- **Motivo:** o RF-093 põe os comentários no painel privado do criador, e o painel do pesquisador hoje é Minhas Campanhas; a `GenericTable` só tem as três ações fixas, e o Consultar já é onde o dono abre a campanha.
- **Caso-limite aceito:** o Consultar da lista geral (Campanhas) não mostra a seção. Campanha que nunca foi ao ar só mostra a seção se tiver algum comentário (RF-098).

📌 **T4 continua registrando tudo.** `useAuthFetchRegistrado` (`services/campo-testes/hook/use-chamada-registrada.ts`) é um `authFetch` que registra cada chamada no T4. O T2 o entrega às peças compartilhadas, que usam as APIs normais sem saber que o T4 existe.

### Trabalha sobre dados reais, com uma trava explícita

📌 `services/campo-testes/util/registros-bloqueados.util.ts` marca os pesquisadores de id **12 a 22** e as campanhas de id **1 a 10** como bloqueados dentro do Campo de Testes: eles aparecem nas listas (riscados, com cadeado), mas sem botão de ação. Motivo: *"já nascem com uma 'demo' inteira montada desde `07_seed_dados.sql` ... Mexer neles pra testar quebraria a demonstração que já existe pronta."*

⚠️ Esses limites (12, 22, 10) são constantes fixas no arquivo, casadas com os ids do seed. Se o seed mudar, elas silenciosamente passam a bloquear/liberar os registros errados.

📌 `services/campo-testes/util/gerar-cpf-valido.util.ts` existe porque o backend valida o dígito verificador de CPF - coerente com `PENDENCIAS e correcoes.md`, item 745 (todos os CPFs de desenvolvimento são inventados; não há verificação de existência real).

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

⚠️ **`DevLoginRapido` usa a senha de seed** (`SENHA_DEV`, as 6 contas "Sistema" do seed) - agora protegido por `import.meta.env.DEV` (ver seção 9), mas vale lembrar que continua sendo uma ferramenta de conveniência de dev, não algo pra existir num ambiente com dado real.

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
| Visão Geral | (inline, no próprio `dashboard.tsx`) | Faixa de saúde (banco conectado/contas ativas/notificações pendentes) + 6 cards de métrica (`GET /dashboard/resumo`) + acessados recentemente + prévia de notificações |
| Regras do Negócio | `dashboard-regras-negocio.tsx` | As 38 chaves de `configuracoes`, agrupadas por assunto |
| Identidade Visual | `dashboard-identidade-visual.tsx` | Placeholder - gerenciar logo/favicon ainda não foi construído |
| Saúde | `dashboard-saude.tsx` | Mesmo estado da faixa de saúde da Visão Geral, sem refazer requisição, mais contagens agregadas |

📌 **Acessados recentemente (27-09-2026).** Atalhos para as últimas 5 páginas do painel que a pessoa abriu neste navegador, mais recente primeiro (`services/router/acessados-recentemente.ts`). O `AdminLayout` registra cada troca de página; só entram rotas do menu, fora o próprio Dashboard. A lista guarda só o caminho, rótulo e ícone vêm sempre de `ROTAS_ADMIN`. A chave do `localStorage` leva o id do usuário, para quem troca de conta no mesmo navegador não ver o histórico da outra. Sem nada visitado, o bloco não aparece.

📌 **Faixa de saúde e cards de métrica vêm de DUAS requisições independentes, de propósito** - não um `Promise.all` combinado. Achado do Lucas testando: se `GET /dashboard/resumo` falhasse (ex.: banco fora do ar), a tela inteira ficava em branco, bem no momento em que mais precisava mostrar "banco sem conexão". Cada uma tem seu próprio estado de carregando/erro agora.

⚠️ **Comentário desatualizado, achado nesta revisão:** `dashboard-saude.tsx` diz que a tabela `schema_migrations` "NÃO EXISTE neste projeto" e por isso a aba não mostra "última migration aplicada"/divergência de hash. Isso deixou de ser verdade em 04/05-09-2026 - `aplicar-migrations.script.ts` (`DOCUMENTACAO_BACKEND.md`, seção 12) criou exatamente essa tabela, e ela já tem linhas de verdade no banco (Lucas rodou `npm run db:migrate:adotar`). O placeholder em si continua correto (ninguém implementou de fato mostrar isso na tela), só a justificativa ("a tabela não existe") ficou errada - mesma classe de achado já registrada nesta seção pro `dashboard-identidade-visual.tsx` (seção 14).

### `dashboard-regras-negocio.tsx` - configuração agrupada por assunto

Segunda forma de olhar pro mesmo dado da aba "Configurações" (CRUD cru, `11-configuracoes`) - aqui as chaves de `configuracoes` aparecem **agrupadas por tema** (Segurança, Financeiro, Campanha, Score / Reputação, Arquivo, Geral, Outras), cada grupo num cartão com título + lista de `chave: valor` + botão "Alterar" indo pra mesma tela de edição de sempre. Não duplica formulário nenhum, só organiza a leitura.

- **`services/11-configuracoes/constants/configuracoes-grupos.constants.ts`** - `GRUPO_CONFIGURACAO` é um dicionário `chave → nome do grupo`, mantido à mão (mesmo espírito de `permissao-nomes-amigaveis.constants.ts`). Uma chave nova em `configuracoes` que não ganhar entrada aqui cai automaticamente no grupo "Outras" - nunca quebra a tela, só fica sem organização até alguém lembrar de classificar. `agruparConfiguracoes()` devolve os grupos já na ordem certa de exibição (`ORDEM_GRUPOS`) - "Outras" sempre por último, mesmo tendo o maior número de linhas.
- **Grupo "Arquivo" tem um ícone ⓘ ao lado do título, que abre um modal** (`ModalDetalhe`, mesmo componente da seção 9) com a explicação completa dos 7 limites de upload configuráveis e por que o teto do Supabase Storage (50MB/arquivo, 1GB total) importa. Nasceu de um pedido do Lucas: a explicação era grande demais pra caber num tooltip comum, então o ícone virou clicável (`aoClicar`) em vez de só mostrar texto no hover.

### Dica de hover - dois contratos, um primitivo só (`components/layout/tooltip.tsx`)

**Reescrito em 14-09-2026 (revisão do Lucas).** Existem DOIS contratos diferentes no sistema, não três soluções pro mesmo problema:

1. **Dar nome visível a um controle** ("Alterar", "Encerrar sessão", "Saiba mais") → mecanismo unificado `.dica`/`<Dica>` - qualquer gatilho (botão, link, ícone avulso) que ganhe a classe `dica` no `className` pode soltar um `<Dica texto="..." />` dentro de si. Cobre o que antes eram DOIS mecanismos quase idênticos e duplicados: o `Tooltip` (ⓘ avulso) e o `.crud-tabela__acao-dica` (hover nos ícones de ação do `AcaoLinha`/`GenericTable`) - hoje o mesmo CSS (`.dica__bolha` em `4-componentes.css`), com modificadores `--baixo` (abre pra baixo) e `--curta` (`white-space: nowrap`, rótulo de 1 palavra).
2. **Revelar um valor truncado/traduzido num elemento NÃO interativo** → `title` nativo continua sendo o certo. Sobrevive em exatamente 1 lugar no sistema: `matriz-papel-permissao.tsx`, `<td title={permissao.nome}>` - célula não clicável, não focável, valor cru.

`Tooltip` (o ícone ⓘ avulso, assinatura pública sem mudança - `texto`/`baixo`/`aoClicar`) hoje é implementado POR CIMA do primitivo: só um gatilho `.dica--info` (ou `.dica--info.dica--clicavel` com `aoClicar`) + `<Dica>` dentro. `Dica` é sempre `aria-hidden="true"` - `role="tooltip"` sem `aria-describedby` apontando pra ele é inerte (nenhum leitor de tela faz nada com isso), então a role saiu e não volta sem esse par; o nome acessível mora no GATILHO (`aria-label` explícito ou texto visível), nunca na bolha.

CSS puro (`:hover`/`:focus`/`:focus-visible`), sem estado de React na bolha em si (a lógica de "qual dropdown está aberto" de facetas é outra coisa, ver `BarraFiltros` na seção 8). Três props opcionais do `Tooltip`, todas podem combinar:

- **`baixo`** - abre a dica pra BAIXO em vez de pra cima (padrão). **Todo controle do cabeçalho (A-, A+, tema, sino) usa `baixo`:** o cabeçalho fica colado no topo da janela, e a bolha padrão (pra cima) nascia a y = -20px, fora da tela. Usar quando o ícone fica perto do topo de um cartão com `overflow-hidden` (ex.: cabeçalho de grupo em `dashboard-regras-negocio.tsx`) - a dica padrão nascia cortada pela borda arredondada do cartão.
- **`aoClicar`** - o ícone vira um `<button>` clicável (cursor de ponteiro em vez de "?"); o hover continua mostrando só `texto` (curto, tipo "Saiba mais"), e o clique dispara a função passada - normalmente pra abrir um `ModalDetalhe` com a explicação completa em seções/parágrafos, em vez de um bloco de texto só dentro do balão do tooltip.
- **`badge`** - selo circular escuro sobreposto (não um ícone solto flutuando do lado), mesmo padrão visual de "editar foto" do Instagram/LinkedIn - usado em `modal-consultar-usuario.tsx` (`ModalConsultarUsuario`, módulo 1, seção 16) no canto inferior direito do avatar, abrindo a foto de perfil em outra guia.

## 18. Correções da super auditoria (29-09-2026)

**Em palavras simples:** mudanças nas telas por causa da super auditoria (o relatório dela fica na pasta de informações, fora do repositório).

📌 **Trocar senha: a nova precisa ser diferente da atual.**
- **Decisão:** em Minha Conta > Segurança, o erro aparece embaixo do campo antes de enviar. O backend confere de novo.
- **Motivo:** pedido do Lucas, junto com a correção do RF-008.
- **Caso-limite aceito:** nenhum.

📌 **Papel suspenso aparece para a própria pessoa.**
- **Decisão:** em Minha Conta > Papéis, o papel suspenso fica amarelo, com "suspenso até DD/MM/AAAA HH:MM".
- **Motivo:** antes, a pessoa só descobria a suspensão tentando algo e sendo barrada.
- **Caso-limite aceito:** nenhum.

📌 **Suspender papel pede motivo, e os prazos vêm dos parâmetros.**
- **Decisão:** no "Alterar usuário", suspender um papel mostra o campo de motivo. Os prazos vêm de `useOpcoesDiasSuspensao()` (`services/constant/hook/use-opcoes-dias-suspensao.ts`), a mesma lista da suspensão de conta (`suspensao_usuario_opcoes_dias`). Antes eram 1, 7 e 30 fixos no código.
- **Motivo:** RF-118, e a regra do projeto de não ter valor fixo no código.
- **Caso-limite aceito:** nenhum.

📌 **Foto que não carrega vira a inicial.**
- **Decisão:** `AvatarUsuario` troca para a inicial colorida quando a imagem falha (`onError`).
- **Motivo:** foto apagada do Storage mostrava o ícone de imagem quebrada com o nome escrito por cima dos botões.
- **Caso-limite aceito:** a troca é lembrada só para aquela URL. Uma foto nova tenta carregar de novo.

📌 **Teclado: "Pular para o conteúdo" e a ordem do login.**
- **Decisão:** `layout.tsx` ganhou o atalho "Pular para o conteúdo" como primeiro Tab da página. Ele fica invisível até receber o foco e leva à área marcada com `data-conteudo-principal` (no painel, a área ao lado do menu). No login, o campo de senha vem logo depois do e-mail na ordem do Tab. O link "Esqueceu a senha?" continua no mesmo lugar visual, por `order`.
- **Motivo:** eram 34 Tabs até o primeiro botão de uma tabela, e no login o Tab passava por "Esqueceu a senha?" antes da senha.
- **Caso-limite aceito:** nenhum.

📌 **"Termo de Uso" no singular.**
- **Decisão:** todos os textos de tela e mensagens do backend usam "Termo de Uso", inclusive o menu e o título "Publicar Termo de Uso". A seção do usuário virou "Aceites do Termo de Uso".
- **Motivo:** o V8 padronizou o nome no singular (está no resumo das mudanças do V8, e todo RF e RNF que cita o termo usa "Termo de Uso").
- **Caso-limite aceito:** nomes técnicos continuam como estão (`termos_de_uso`, `/termos-uso`).

📌 **Editar link acadêmico não apaga mais a ordem.**
- **Decisão:** o "Alterar usuário" manda `url` e `rotulo` (o rótulo apagado vai como `null`), e a ordem fica como estava.
- **Motivo:** antes, o backend gravava a ordem como vazia em toda edição.
- **Caso-limite aceito:** nenhum.

📌 **Exportar meus dados ligado ao backend, mensagens de erro e celular.**
- **Decisão:**
  - Minha Conta > Privacidade > Exportar baixa o pacote de `GET /usuario/eu/exportar-dados` como arquivo JSON (uma vez por hora, limite do backend).
  - Várias mensagens do backend são juntadas com espaço, e não com vírgula colada.
  - O erro "Senha atual incorreta" também aparece embaixo do campo.
  - O rodapé de paginação quebra linha no celular.
- **Motivo:**
  - a tela dizia "ainda não implementado", mas o backend já fazia a exportação;
  - "CPF inválido.,Nome da..." era difícil de ler;
  - o rodapé sem quebra de linha fazia a página passar 5px da largura em 375px.
- **Caso-limite aceito:** nenhum.

📌 **Tela de aceite da versão nova do Termo de Uso (RF-015).**
- **Em palavras simples:** quando sai uma versão nova do Termo de Uso, quem entra vê o texto e dois botões, "Li e aceito" e "Sair". O painel só aparece depois do aceite.
- **Decisão:** `useAuth` guarda `aceitePendente` (vem do login e da renovação) e ganhou `renovarSessaoAgora()`. Com pendência, `AdminLayout` mostra `TelaAceiteTermoUso` (`views/5-termo-uso/tela-aceite-termo-uso.tsx`) no lugar do painel inteiro, e o cabeçalho esconde o sino. "Li e aceito" chama `POST /termos-uso/:id/aceitar` e renova a sessão na hora.
- **Motivo:** o backend já recusa as outras rotas com 403 `TERMO_PENDENTE`. Sem a tela, a pessoa veria um painel cheio de erros sem entender por quê.
- **Caso-limite aceito:** se a versão vigente mudar enquanto a pessoa lê, o aceite responde 409 e a tela carrega o texto novo.

📌 **Conta comum não busca mais perfil de pesquisador.**
- **Decisão:** Minha Conta (Perfil e Acadêmico), Minhas Campanhas e o modal de usuário olham `usuario.ehPesquisador` antes de buscar `/perfil-pesquisador`. Depois do upgrade, a aba Acadêmico marca `ehPesquisador: true` no usuário local.
- **Motivo:** toda abertura da Minha Conta de uma conta comum gerava um 404 no console.
- **Caso-limite aceito:** quando o campo não vem (`undefined`), a tela busca o perfil como antes.

📌 **Excluir Termo de Uso sem modo forçado.**
- **Decisão:** `modal-excluir-termo-uso.tsx` virou uma confirmação simples. Versão vigente ou já aceita volta com a mensagem do backend.
- **Motivo:** a exclusão forçada saiu do backend (RF-091, ver `DOCUMENTACAO_BACKEND.md`).
- **Caso-limite aceito:** nenhum.

## 19. Correções da auditoria de Nielsen (29-09-2026)

**Em palavras simples:** a auditoria das 10 heurísticas de Nielsen (o relatório fica na pasta de informações, fora do repositório) conferiu se as telas são fáceis de usar. Só o comportamento foi corrigido: a aparência vai mudar com o visual novo, e o comportamento continua valendo.

📌 **Datas da campanha no fuso de quem usa.**
- **Decisão:** `inicioDoDia()`, `fimDoDia()` e `dataLocal()` (`services/12-campanha/util/prazo-campanha.util.ts`) montam o instante enviado (00:00 do início, 23:59:59 do fim) e voltam o instante para o dia do formulário. Criar e Alterar campanha e os marcos do cronograma usam as três. As fichas mostram só a data.
- **Motivo:** `new Date('2026-10-04').toISOString()` é meia-noite em UTC, 21:00 do dia 3 em Brasília: a campanha aparecia e terminava um dia antes. `slice(0, 10)` do instante também pegava o dia errado.
- **Caso-limite aceito:** campanha criada antes da correção continua com o horário antigo.

📌 **Botão sempre clicável, erro embaixo do campo.**
- **Decisão:** `useErrosFormulario` em mais 14 botões: Criar usuário, área, tipo de link e motivo; Salvar de área, motivo, papel e tipo de link com o nome apagado; Publicar Termo; o aceite e o formulário do upgrade (CPF e instituição); Atribuir papel; Salvar CPF; Salvar perfil em Minha Conta; Rejeitar na fila. Quem ainda fica desabilitado: Salvar sem alteração nenhuma (padrão de mercado), Aprovar (a lista "Pronta para aprovar?" ao lado diz o que falta), as exclusões que pedem para digitar o nome e o que está enviando.
- **Motivo:** heurísticas 1, 5 e 9. O botão cinza não dizia o que faltava, e foi o exemplo do Lucas em 15-09.
- **Caso-limite aceito:** o formato do código (área e tipo de link), a regex e "pelo menos uma opção" continuam avisando enquanto se digita.

📌 **Criar pergunta antes de descartar, como o Alterar.**
- **Decisão:** os modais de Criar (usuário, área, tipo de link, motivo, campanha) e a página Publicar Termo usam `confirmarSaida` e `useAvisoAlteracaoNaoSalva`. No Criar Campanha, só antes do primeiro "Próximo": depois disso já é rascunho. Publicar Termo volta sempre para a lista de Termos (era `navigate(-1)`).
- **Motivo:** clique fora, Esc ou X jogavam fora o que foi digitado. Aberta direto pelo endereço, a página de Termo saía para a página anterior do navegador.
- **Caso-limite aceito:** nenhum.

📌 **Revogar papel pede confirmação.**
- **Decisão:** o "×" do papel em Alterar Usuário pergunta antes de revogar.
- **Motivo:** o botão é pequeno e fica colado no nome do papel. Um clique sem querer tirava o papel na hora.
- **Caso-limite aceito:** a alternativa do mercado ("Desfazer" no aviso, como o Gmail) ficou para o visual novo, porque o aviso ainda não tem botão de ação.

📌 **Ação que não se aplica aparece apagada, com o motivo.**
- **Decisão:** `GenericTable` ganhou `acaoIndisponivel`: a ação fica no lugar, apagada, não reage ao clique e a dica diz por quê (`aria-disabled`, continua focável). Os Termos usam isso na lixeira da versão vigente. A lixeira de Papéis saiu: ela só abria uma explicação, nunca excluía.
- **Motivo:** heurística 4. Um ícone de excluir que não exclui confunde.
- **Caso-limite aceito:** a lista de Termos não sabe quem aceitou cada versão: a recusa de excluir uma versão aceita continua vindo do backend.

📌 **Um aviso por vez; o de erro fica.**
- **Decisão:** o aviso novo toma o lugar do anterior. O de sucesso some em 4 segundos; o de erro fica até a pessoa fechar ou até o próximo aviso.
- **Motivo:** "Campanha criada" ficava empilhado com o erro seguinte, e o erro sumia em 5 segundos. É o padrão do Material Design e do GOV.BR.
- **Caso-limite aceito:** num formulário, o erro aparece no aviso e no texto vermelho ao mesmo tempo (anotado para o visual novo).

📌 **Parâmetros do Sistema na língua de quem administra.**
- **Decisão:** a lista mostra a descrição como nome (a chave fica ao lado). O campo Valor segue o tipo: Sim/Não para booleano, teclado numérico e conferência para inteiro e decimal (a vírgula dos centavos vira ponto ao salvar). O tipo aparece como "Número inteiro", "Sim ou não"... A ajuda de "Pública" não cita mais rota nem permissão.
- **Motivo:** o admin precisava decorar o que `arquivo_horas_para_vincular` significa, e "abc" num número só era recusado pelo banco.
- **Caso-limite aceito:** nenhum.

📌 **Outros ajustes.**
- **Decisão:**
  - Minha Conta > Segurança tem o medidor de força, mostrar senha e confirmar a nova. O medidor virou componente (`components/input/medidor-senha.tsx`), usado também no Cadastro.
  - Os números do Dashboard levam à lista (as campanhas já filtradas pelo status).
  - "Notificações: em breve" no lugar de um traço.
  - O modelo aparece como "Tudo ou nada".
  - Os Termos mostram "vigente" e a data sem hora.
  - O Tipo de Link tem "Testar com um link", que diz na hora se um link de exemplo passaria pelo domínio e pela regex.
- **Motivo:** heurísticas 2, 4, 7 e 10.
- **Caso-limite aceito:** o teste de link usa a regex do JavaScript. É igual à do banco nos casos comuns, mas não garantidamente em todos.

📌 **Termo aceito na lista e no Alterar.**
- **Decisão:** a lixeira fica apagada em versão com aceite (e na vigente), com o motivo na dica. O lápis continua: o modal de Alterar é também onde se torna vigente uma versão antiga. Lá, a versão aceita mostra o texto só para leitura, com um aviso, e sem o botão Salvar. O Consultar mostra quantos aceites a versão tem.
- **Motivo:** antes, a pessoa abria o modal, editava e só no fim o banco recusava.
- **Caso-limite aceito:** antes de colar o Grupo AB, a lista não tem a contagem e se comporta como antes.

📌 **Para que serve cada papel.**
- **Decisão:** `services/2-papel-permissao/constants/papel-descricoes.constants.ts`, um dicionário pelo `codigo` do papel, no mesmo padrão do de permissões. A descrição aparece na coluna "para que serve" da lista de Papéis, no Consultar Papel e embaixo do "Atribuir papel" (do papel escolhido). As 6 permissões que estavam sem explicação ganharam a delas: 39 de 39.
- **Motivo:** o nome cru ("revisor", "curador") não dizia o que o papel libera, e a pessoa atribuía sem saber.
- **Caso-limite aceito:** o texto descreve a intenção do papel. Se alguém mudar a matriz Papel × Permissão pela tela, a matriz continua sendo a verdade.

📌 **"Submeter Pesquisa" abre o Criar Campanha.**
- **Decisão:** o botão do cabeçalho leva a Minhas Campanhas com `?criar=1`. Quem pode criar vê o modal aberto. Quem não é pesquisador, ou está suspenso, vê o aviso da própria página explicando por quê. Quem não está logado passa pelo login antes. Fechar o modal tira o `?criar=1` do endereço.
- **Motivo:** pedido do Lucas para agilizar os testes. O resto dos botões de enfeite fica como está: os módulos deles vão nascer.
- **Caso-limite aceito:** o visual não é o final (o botão fica no cabeçalho público).

📌 **Erro de formulário aparece uma vez só.**
- **Decisão:** `useErroToast({ mostraTexto: true })` nas 23 telas que mostram o próprio erro (texto vermelho ou embaixo do campo): o aviso flutuante não aparece, e a tela rola até o erro (e põe o cursor no campo, quando o erro é de um campo). As ações sem texto vermelho (enviar campanha, links acadêmicos, Campo de Testes) continuam com o aviso flutuante. Todo texto de erro passou a ser `MensagemErro`, com `role="alert"` e a marca `data-mensagem-erro`. As buscas que mostram o erro na própria tela (tabelas, log, Dashboard, tela de aceite) usam `useBuscar(..., { mostraTexto: true })`.
- **Motivo:** a mesma frase saía no aviso e no texto vermelho. É o padrão do Stripe e do GitHub: o erro fica ao lado de onde se corrige, e o aviso é para o que acontece fora de um formulário. Resolve o caso-limite anotado na entrada "Um aviso por vez; o de erro fica".
- **Caso-limite aceito:** se a tela não tiver nada visível para mostrar (erro de um campo que a tela não desenha), o aviso flutuante volta, para o erro nunca ficar escondido. O leitor de tela passa a anunciar o texto vermelho, porque ele tem o papel de alerta que era do aviso.

📌 **Alterar Usuário em abas, e o arquivo dividido.**
- **Em palavras simples:** a janela de Alterar Usuário misturava coisas que gravavam na hora com um "Salvar" que valia só para parte dela. Agora cada aba tem um jeito só de gravar, e o arquivo gigante virou peças menores.
- **Decisão:**
  - Abas (`BarraAbasBotoes`, `components/layout/barra-abas-botoes.tsx`, também usada pelo Dashboard): **Conta** (foto, nome, senha e metadados, com o próprio Salvar), **Papéis** e **Moderação** (gravam na hora, com o aviso "valem na hora do clique"), **Pesquisador** (só de quem é: o perfil com o próprio Salvar; CPF, links e suspensão do pesquisador gravam na hora). A aba com alteração não salva ganha "•". Salvar uma aba não fecha o modal.
  - O arquivo único antigo do modal de usuário (1.237 linhas, 3 modais e 5 peças) virou `modal-alterar-usuario.tsx`, `modal-consultar-usuario.tsx`, `modal-excluir-usuario.tsx`, `painel-papeis-usuario.tsx`, `painel-links-academicos.tsx`, `painel-score.tsx`, `botao-ver-foto-perfil.tsx` e o hook `services/1-usuario/hook/use-dados-usuario.ts`. Mesmo padrão do módulo de campanha (um arquivo por modal).
  - O painel de papéis tem um estado de "ocupado" e uma recarga da lista, no lugar de 4 de cada.
  - `comRegistro` e a prop `aoRegistrarChamada` saíram: o Campo de Testes (T1) passa uma `auth` com `useAuthFetchRegistrado`, o mesmo mecanismo do T2. Tudo aparece no Registro de Chamadas, inclusive a moderação, com o status HTTP de verdade.
  - As 3 buscas feitas à mão com efeito (catálogos, score, Termos aceitos) passaram para `useBuscar`: zero `eslint-disable` nos arquivos novos (eram 7).
  - Nome com menos de 2 letras e senha nova com menos de 8 dão erro embaixo do campo, e a senha nova tem o `MedidorSenha`.
- **Motivo:** heurísticas 1, 3 e 8 (auditoria de Nielsen). E um defeito: a foto nova só gravava no "Salvar", mas não contava como alteração não salva; fechar o modal descartava a foto sem perguntar.
- **Caso-limite aceito:** salvar uma aba não fecha o modal, diferente de antes, para não perder o que está em edição na outra aba. O "Redefinir senha dev" continua gravando na hora (ferramenta de teste).

📌 **Alterar Usuário volta a ser uma tela só, num arquivo só (01-10-2026, substitui as abas acima).**
- **Decisão:** sem abas. Em cima, o que espera o Salvar (foto, nome, senha e, de quem é pesquisador, o perfil), com os metadados à direita; embaixo, depois do aviso "valem na hora do clique", Papéis, Moderação e, de quem é pesquisador, CPF, links acadêmicos e moderação do pesquisador. Um Salvar só no rodapé, que confere e grava a conta e o perfil juntos (só o que mudou) e não fecha o modal. O painel de papéis e o de links voltaram para dentro de `modal-alterar-usuario.tsx` como funções internas; `painel-papeis-usuario.tsx` e `painel-links-academicos.tsx` saíram. Consultar e Excluir continuam em arquivos próprios, e o hook `use-dados-usuario.ts` continua compartilhado com o Consultar.
- **Motivo:** decisão do Lucas. As abas espalharam o mesmo código em mais arquivos sem diminuir linhas (antes: 4 arquivos e 1.568 linhas; com as abas: 12 e 1.523), trocar de aba fazia a janela "dançar" e apareceram defeitos entre as abas. Uma tela que rola mantém tudo à vista e a janela parada.
- **Caso-limite aceito:** a tela ficou longa (rola dentro do modal); melhorias visuais nela ficam para depois ("upgrades", a combinar).

📌 **Esc ouvido na página inteira, e só a janela de cima fecha.**
- **Decisão:** `useFocoPreso(ref, ativo, aoEsc)`: o hook que já prendia o Tab e já guardava a pilha de janelas abertas passou a tratar o Esc também, ouvindo a página inteira. Só a janela do topo da pilha fecha. `ModalFicha`, `ModalDetalhe`, a janela do Termo no Cadastro e a gaveta do menu lateral passam o próprio "fechar" e não ouvem mais o Esc sozinhos. A busca global continua com o Esc dela (fecha as sugestões primeiro).
- **Motivo:** cada janela só ouvia o Esc com o foco dentro dela. Quando o botão clicado sumia da tela ("Remover foto"), o foco ia para a página e o Esc parava de funcionar. É o padrão de Radix, Headless UI e MUI.
- **Caso-limite aceito:** um Esc que um componente de dentro já tratou (`preventDefault`) não fecha a janela.

📌 **Recusa por permissão com o nome, não o código.**
- **Decisão:** `traduzirErro` troca o código citado na mensagem (`'papel_gerenciar'`) pelo nome que o painel usa em Papéis & Permissões ("Gerenciar Papéis"). Código fora do dicionário fica como veio. Junto: "Não foi possível carregar o Termo de Uso." no Cadastro (era "os termos").
- **Motivo:** as 22 mensagens de "Sem permissão" do backend citam o código interno. O código ajuda quem administra a saber o que conceder; só precisava ser legível. Trocar na tela, num lugar só, evita repetir o dicionário no backend.
- **Caso-limite aceito:** nenhum.

📌 **Ações de texto do T3 viraram `AcaoLinha`.**
- **Decisão:** "Ocultar/Reverter" (atualizações) e "Endossar/Remover endosso" (comentários) usam `AcaoLinha` com ícone, como as outras tabelas. "Endossar" no limite fica apagado, com o motivo na dica (`indisponivel`).
- **Motivo:** eram botões só de texto com a classe das ações de ícone. Quando a tabela apertava, a regra que aumenta os ícones aumentava o texto junto.
- **Caso-limite aceito:** nenhum.

📌 **Alterar Usuário: filtro de partes, pílulas de situação e rodapé que diz o que mudou (01-10-2026).**
- **Decisão:** no topo do corpo, um filtro fixo: "Geral" (padrão) mostra tudo; Conta, Papéis, Pesquisador e Moderação mostram só aquela parte. As outras ficam escondidas, não desmontadas, então nada do que se está editando se perde. O cabeçalho mostra pílulas (conta suspensa, e-mail verificado, situação do pesquisador, papéis). "Trocar senha" e "Corrigir CPF" ficam fechados até o clique. O rodapé diz "N alterações não salvas: ..." (`ResumoAlteracoes`, usado também por Papel, Termo de Uso e Criar Termo). As seções de suspensão continuam com os títulos "Moderação" e "Moderação (Pesquisador)", sem bloco vermelho.
- **Motivo:** a tela única ficou longa; o filtro deixa ver uma parte só sem voltar às abas (que dançavam e espalhavam código). A situação da pessoa aparece sem rolar. O Lucas recusou o rótulo "Zona de risco" e o contorno vermelho.
- **Caso-limite aceito:** uma alteração numa parte escondida continua valendo e aparece no rodapé, mesmo sem estar à vista.

📌 **Termo de Uso: Criar, Consultar, Alterar e Excluir em modal, com caixa de texto longo e tela cheia (01-10-2026).**
- **Decisão:** Criar virou modal (a página `/admin/termos-uso/criar` saiu; o "Publicar primeira versão" de Regras do Negócio abre o mesmo modal com o tipo escolhido). O texto mora em `CaixaTextoLongo`: a caixa estica até o fim do modal de altura cheia (o corpo de `ModalFicha` com `variasTelas` virou coluna flex), rola por dentro só quando o texto não cabe, mostra a contagem de caracteres e tem a pílula "Tela cheia" (`TelaCheia`, que fecha com Esc sem fechar o modal). Consultar Usuário abre o termo aceito em tela cheia ao clicar no aceite (a lista de aceites passou a trazer `idTermo`). As pílulas (versão, Vigente/Substituída/Rascunho, aceites) vêm de `etiquetasTermoUso`. Criar tem "Começar da vigente" e barra versão repetida antes do banco. O subtítulo longo virou ⓘ (prop `ajuda` do `ModalFicha`).
- **Motivo:** esticar a caixa com o mouse dentro de um modal que rola era lento; a tela cheia resolve a leitura longa e a mesma peça serve para editar e para ler. Uma nova versão quase sempre é a anterior corrigida.
- **Caso-limite aceito:** o banco não guarda se uma versão já foi vigente. Não vigente com aceite aparece como "Substituída"; sem aceite, "Rascunho" (a mesma regra que libera o Excluir).

📌 **Dica (tooltip) só abre com foco de teclado.**
- **Decisão:** a bolha `.dica__bolha` abre com `:hover` e `:focus-visible`; `:focus` comum só no ⓘ avulso (`.dica--info`).
- **Motivo:** ao fechar um modal, o foco volta para o botão que o abriu, e com `:focus` a dica dele ficava presa na tela depois de um clique de mouse.
- **Caso-limite aceito:** ao fechar um modal com Esc, a dica do botão aparece (o foco de teclado está ali, de propósito). No celular, o ⓘ continua abrindo ao toque.

📌 **Painel: Dashboard em seções, total no título das listas e faixa do "Menu" só onde serve (01-10-2026).**
- **Decisão:** a Visão Geral do Dashboard passou a ter "Precisa de você" (aguardando aprovação, denúncias, fila com score baixo: amarelo com número, "Tudo em dia" zerado), "Plataforma", "Campanhas por situação", "Sua atividade recente" (a mesma do sino) e "Sistema" (lista compacta). Os cards ganharam ícone e levam à lista filtrada; o bloco "Notificações: em breve" saiu. Toda lista do `GenericTable` mostra o total ao lado do título ("28", ou "7 de 28" com filtro) e uma frase de explicação. Usuários e Pesquisadores mostram a inicial colorida ao lado do nome. Parâmetros do Sistema mostra a chave pequena embaixo da descrição (a coluna "chave" saiu; o filtro continua achando por ela, opção `busca` da coluna). Aprovar Campanhas abre com as mais antigas primeiro (`ordenacaoInicial`). A faixa do botão "Menu" some a partir de 1377px (`min-[1377px]:hidden`). No celular, os links acadêmicos viram cartões.
- **Motivo:** revisão de "ambição visual" com base no painel de Kickstarter, Catarse e Experiment.com (ver `ACHADOS_PARA_DISCUTIR.md`, seção G): o que pede ação vem primeiro, número sozinho não diz nada sem contexto. A faixa do "Menu" aparecia como uma tira branca vazia no computador, e a coluna "tipo" de Parâmetros ficava cortada atrás de "Ações".
- **Caso-limite aceito:** "Sua atividade recente" é só da própria pessoa (o banco ainda não entrega a do sistema inteiro). O avatar da lista é só a inicial: a foto real não vem na listagem. A fila de aprovação ordena pela data de criação, porque a campanha não guarda a data do envio (achado G.5).
