# ⚛️ Documentação Técnica do Frontend React - CrowdAcadêmico

> **Em palavras simples:** este documento explica como o app React (`react/`) está organizado hoje e por quê, para quem for criar uma tela nova (os módulos que faltam e a área pública) encontrar o padrão pronto e não reinventar nada. Ele descreve o **estado atual**: a história das decisões antigas foi guardada na pasta de informações, fora do repositório, em 03-10-2026. As regras visuais (cores, tipografia, larguras, componentes de interface) ficam no documento de design system da mesma pasta.

> 📌 **Requisitos:** os vigentes são os do `REQUISITOS_V8.md` (122 RFs). A `MATRIZ-RASTREABILIDADE-RF.md` está na numeração do V8.

| Símbolo | Significado |
|---|---|
| 📌 | Decisão e o porquê |
| ⚠️ | Ponto de atenção ou débito conhecido |

## 📑 Índice

1. [Escopo](#1-escopo)
2. [Stack, scripts e TypeScript](#2-stack-scripts-e-typescript)
3. [Estrutura de pastas e nomes](#3-estrutura-de-pastas-e-nomes)
4. [Roteamento e menu](#4-roteamento-e-menu)
5. [Autenticação (`use-auth.ts`)](#5-autenticação-use-authts)
6. [Padrão de service e API](#6-padrão-de-service-e-api)
7. [Upload de arquivo (`25-arquivo`)](#7-upload-de-arquivo-25-arquivo)
8. [`GenericTable`](#8-generictable)
9. [Componentes e hooks reutilizáveis](#9-componentes-e-hooks-reutilizáveis)
10. [Estado global: os providers](#10-estado-global-os-providers)
11. [CSS, Tailwind e temas](#11-css-tailwind-e-temas)
12. [As telas](#12-as-telas)
13. [Usabilidade e acessibilidade](#13-usabilidade-e-acessibilidade)
14. [Dependências: o que cada uma faz](#14-dependências-o-que-cada-uma-faz)
15. [O que não existe ainda e débitos conhecidos](#15-o-que-não-existe-ainda-e-débitos-conhecidos)

---

## 1. Escopo

O `react/` é hoje **o painel administrativo**: listar, criar, alterar, consultar e excluir os registros dos módulos que o Nest expõe, o Dashboard, a "Minha Conta" e as telas públicas de entrada (login, cadastro, esqueci a senha, criar nova senha, verificar e-mail, aceite de nova versão do Termo de Uso).

**O que NÃO existe:** a área pública do site (página da campanha, home pública, checkout, painel do doador). As pastas `views/checkout/`, `views/dash-doador/` e `views/dash-pesquisador/` estão reservadas, só com `.gitkeep`. O pesquisador também não usa o painel: a área dele nasce junto com a área pública.

📌 **O painel não é descartável.** A primeira versão (`views/dev/`, sem roteador) era ferramenta de desenvolvimento; desde 01-08-2026 ela é o admin de verdade. Por isso a pasta se chama `components/crud/` e o CSS, `5-crud.css`.

---

## 2. Stack, scripts e TypeScript

| Peça | Versão (`react/package.json`) | Observação |
|---|---|---|
| React + `react-dom` | `^19.2.8` | |
| Vite + `@vitejs/plugin-react` | `^8.2.0` / `^6.0.4` | build e servidor de desenvolvimento |
| `react-router` | `^8.3.0` | o pacote é `react-router`, **não** `react-router-dom` |
| Tailwind CSS + `@tailwindcss/vite` | `^4.3.3` | plugin de build, nunca CDN |
| ESLint + `typescript-eslint` | `^10.8.0` | configuração em `eslint.config.js`, ciente de tipos |
| TypeScript | | `strict: true`, todo o `src` em `.ts`/`.tsx` |

**Scripts:** `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`, `npm run contraste` (confere o contraste dos pares de cor, seção 11) e `npm run gerar:enums` (seção 3).

📌 **`react-router` e não `react-router-dom`:** a 7.x do `react-router-dom` tinha vulnerabilidade alta conhecida; a v8 do `react-router` já inclui o que o navegador precisa e está fora da faixa vulnerável. Ela pede Node 22.22 ou mais novo: com Node mais antigo, o `npm install` mostra o aviso `EBADENGINE`, mas instala e funciona.

📌 **Tailwind no build, fontes e ícones em CDN.** O Tailwind saiu do CDN porque o `dist/` não tinha nenhuma classe de verdade e a página quebrava sem rede. Google Fonts e Font Awesome continuam no CDN (`index.html`) de propósito: se falharem, a fonte cai para a do sistema e o ícone some, mas a página continua de pé. A régua é: só sai do CDN o que quebra a página inteira.

📌 **Regras de TypeScript.** Proibidos `any`, `@ts-ignore` e `@ts-expect-error`. `as` só numa fronteira: `tratarResposta<T>()` (`services/constant/api/http.util.ts`), que transforma a resposta da rede em dado tipado. Os tipos de `services/*/type/` espelham os DTOs do Nest **à mão** (não há import entre `nest/` e `react/`); os ENUMs do banco não são copiados à mão, são gerados (seção 3).

📌 **Lint.** Detalhe completo em `DOCUMENTACAO_LINT.md`. Há `eslint-disable-next-line` pontuais, sempre com o motivo ao lado (o mais comum: efeito que busca dado ao montar). Um arquivo que exporta componente não exporta mais nada (regra do recarregamento rápido do Vite); hooks e funções auxiliares moram em arquivos próprios.

⚠️ **Não há teste automatizado no React.** A conferência é `tsc`, `lint` e `build`, mais os roteiros de navegador e de banco que a equipe roda fora do repositório.

---

## 3. Estrutura de pastas e nomes

```
react/
├── index.html          - shell HTML (fontes e ícones via CDN)
├── vite.config.js
├── eslint.config.js
├── .env / .env.example - só VITE_API_URL
├── scripts/            - contraste-tokens.mjs, gerar-enums-do-banco.mjs
└── src/
    ├── main.tsx        - createRoot + providers globais
    ├── App.tsx         - monta as rotas a partir de rotas.constants.ts
    ├── assets/css/     - CSS numerado + tema do Tailwind
    ├── components/     - peças reutilizáveis entre módulos
    ├── services/       - comunicação com a API, tipos, regras de tela, estado compartilhado
    └── views/          - as páginas
```

### `services/` e `views/` usam o número do módulo do Nest

`services/9-tipo-link/api/tipo-link.api.ts` fala com `nest/src/9-tipo-link`: o número é a chave estável entre os dois projetos. Pastas que não são módulo do Nest têm nome próprio: `services/constant/` (o que todo módulo usa), `services/router/` (rotas) e `views/admin/` (a casca do painel e o Dashboard).

**Subpastas de um módulo em `services/`:** `api/`, `constants/`, `hook/`, `type/` são a base; `context/` só quando o dado é lido por telas sem parentesco e é caro buscar de novo (seção 10); `util/` só para cálculo puro, sem chamada de API nem estado. Módulos que ainda não têm tela (`22-contribuicao`, `23-repasse`, `26-notificacao`) já existem com as pastas reservadas.

### Nomes de arquivo

- **Decisão:** em `services/`, `<assunto>.<papel>.ts` (`api`, `type`, `constants`, `util`); hooks começam com `use-`. Em `views/` e `components/`, o arquivo tem o nome do componente em português (`modal-criar-usuario.tsx` exporta `ModalCriarUsuario`). Os tipos que espelham DTOs têm o mesmo nome da classe do Nest (`CampanhaResponse`, `TermoUsoRequestCreate`). Toda chamada à API passa por um `<assunto>.api.ts`, nunca direto da tela.
- **Motivo:** mesma regra do Nest: inglês para o papel do arquivo (padrão de mercado), português para o assunto.
- **Caso-limite aceito:** o sufixo `-page` existe só nas telas de `3-auth`.

### ENUMs do banco gerados para o React

- **Em palavras simples:** listas fechadas do banco (o status de uma campanha, a fase de uma atualização) não são copiadas à mão: o React lê um arquivo gerado a partir do banco. O que fica escrito à mão é só o que é de tela: a ordem de exibição, o rótulo e a cor.
- **Decisão:** o caminho é banco (`01_extensoes_enums_tabelas.sql`) → Nest (`db.types.generated.ts`, kysely-codegen) → React (`npm run gerar:enums` escreve `services/constant/type/enums-do-banco.gerado.ts`, que vai para o Git). Os rótulos são `Record<Tipo, string>` (o compilador acusa rótulo faltando) e as listas de ordem passam por `listaCompleta<Tipo>()` (acusa valor faltando, com o nome dele).
- **Motivo:** fechar o erro silencioso de valor novo no banco que a tela não conhece.
- **Caso-limite aceito:** esquecer de rodar `npm run gerar:enums` não quebra na hora; `npm run gerar:enums -- --conferir` e a suíte de testes de tipos acusam. Tipos que são regra do Nest, e não ENUM do banco (`EscopoTipoLink`, `ContextoArquivo`), continuam escritos à mão.

**Para acrescentar um valor a um ENUM:** mudar o `01` e o grupo do `ATUALIZAR`; regerar os tipos do Nest; `npm run gerar:enums` no React; `npx tsc --noEmit` aponta cada rótulo e lista de ordem que precisa do valor novo.

---

## 4. Roteamento e menu

📌 **Fonte única: `services/router/rotas.constants.ts`.** As rotas, o breadcrumb, o menu lateral e a busca global (Ctrl+K) leem a mesma lista; ninguém tem cópia.

- **`ROTAS`** (públicas, sem menu): `/login`, `/cadastro`, `/verificar-email`, `/esqueci-senha`, `/redefinir-senha`.
- **`ROTAS_ADMIN`** (dentro do `AdminLayout`, com menu lateral). Cada entrada tem `caminho`, `elemento` e os metadados: `rotuloBreadcrumb` (`null` = não aparece), `paiCaminho` (a listagem dona de uma rota de detalhe), `rotuloMenu`, `grupoMenu` e `icone` (sem `grupoMenu`, a rota existe mas não vira item do menu, como Minha Conta).

📌 **Rotas de verdade, nunca abas em `useState`:** link direto, botão Voltar e F5 funcionam. O item ativo do menu sai da própria URL (`NavLink`).

**Redirecionamentos (`App.tsx`):** `/` → `/admin/dashboard`; `/admin/minha-conta` → `/admin/minha-conta/perfil`.

📌 **Guarda de login única, no `AdminLayout`.** Sem sessão, qualquer `/admin/*` vai para `/login` levando a página pedida (`state.voltarPara`, só caminhos que começam com `/admin/`). Durante a restauração da sessão (F5), a guarda espera. Com nova versão do Termo de Uso pendente, mostra a tela de aceite no lugar do painel (seção 12).

📌 **A guarda confere se HÁ sessão, não o papel.** O que cada papel lê ou altera é decidido pelo backend (guards do Nest e RLS), a proteção de verdade. **Próximo passo, perto do fim do sistema:** cada rota ganha um campo de permissão, lido pelo menu e por esta mesma guarda.

📌 **O menu é derivado.** `views/admin/admin-menu.constants.ts` filtra `ROTAS_ADMIN` por `grupoMenu` (`itensDoGrupo()`). Grupos: o Dashboard (sem título), `GESTÃO DO USUÁRIO`, `Configurações`, `CAMPANHA` e `MODERAÇÃO`. A chave interna do grupo (ex.: `'CADASTROS'`) não muda quando o título visível muda. Item de módulo que ainda não existe aparece apagado com `aria-disabled` (não `disabled`): continua focável pelo teclado, e a dica "Ainda não implementado" aparece também no Tab. Desde 03-10-2026 a MODERAÇÃO não tem mais nenhum (Aprovar Campanhas, Denúncias e Encerramentos).

📌 **Acessados recentemente.** O `AdminLayout` registra as páginas do menu que a pessoa abre (`services/router/acessados-recentemente.ts`, `localStorage` com o id do usuário na chave); o Dashboard mostra as últimas 5.

---

## 5. Autenticação (`use-auth.ts`)

`services/3-auth/hook/use-auth.ts` é chamado **uma vez só**, em `App.tsx`; o objeto desce por prop para o `Layout`, o cabeçalho e cada página. Devolve `accessToken`, `usuario`, `papeis`, `ehAdmin`, `aceitePendente`, `carregando`, `autenticado`, `login`, `cadastrar`, `logout`, `renovarSessaoAgora`, `authFetch` e `atualizarUsuarioLocal`.

| Token | Onde fica | Por quê |
|---|---|---|
| access token | só em memória | some ao fechar a aba, de propósito |
| refresh token | `localStorage` (`crowdacademico.refreshToken`) | para não precisar entrar de novo a cada F5 |

⚠️ **`papeis` e `ehAdmin` não são autorização:** só decidem o que aparece na tela. Toda ação é validada pelo backend a cada requisição.

### `authFetch`: o único caminho para a API autenticada

1. manda `Authorization: Bearer` quando há token;
2. se a resposta for 401 e houver refresh token, renova a sessão **uma vez** e repete a chamada;
3. se a renovação falhar, limpa a sessão;
4. no F5 com sessão salva, espera a renovação inicial antes de chamar a API (sem isso, as listagens levavam 401 e renovavam duas vezes).

📌 **Duas proteções contra corrida.** (1) Uma renovação por vez (`refreshEmAndamentoRef`): o refresh token é de uso único, e várias chamadas renovando juntas derrubavam a sessão. A restauração do F5 usa a mesma promise. (2) `GET` igual em andamento é dividido (`requisicoesEmAndamentoRef`, com `.clone()`): o `<StrictMode>` roda cada efeito duas vezes em desenvolvimento. Só `GET`: criar, alterar e excluir são sempre 1 clique = 1 ação.

📌 **Barra de carregamento.** Toda chamada do `authFetch` e o envio de arquivo passam por `acompanharRequisicao` (`components/layout/barra-carregamento/`): uma faixa fina no topo aparece se a espera passar de 300 ms. Com "reduzir movimento", fica parada.

**Endereço da API:** `services/constant/constants/api.constants.ts` lê `VITE_API_URL` (padrão `http://localhost:3000`). O `react/.env` só tem essa URL; tudo que começa com `VITE_` vai para o navegador, então nunca entra segredo ali. `react/.env.example` é o modelo comentado.

---

## 6. Padrão de service e API

Cada módulo tem `services/<n>-<nome>/api/<nome>.api.ts` exportando **um objeto** com as operações, e todo método autenticado recebe `authFetch` como primeiro parâmetro (injetado, nunca importado: o service não sabe nada de token).

📌 **Rota pública usa `fetch` cru, com o motivo ao lado:** configurações públicas (`buscarPublicas`), tipos de link públicos, arquivo e avatar. É onde a RLS do banco já libera a leitura para qualquer um.

📌 **Peças comuns da camada de API:**

| Peça | Arquivo | O que faz |
|---|---|---|
| `tratarResposta` | `services/constant/api/http.util.ts` | lança `ErroHttp` (com `status` e, na validação, `campos`) quando a resposta não é ok; lê o corpo como texto e só faz `JSON.parse` se houver algo (POST que só cria vínculo volta 201 vazio) |
| `traduzirErro` | `services/constant/api/traduzir-erro.util.ts` | falha de rede vira mensagem em português; na recusa por permissão, troca o código (`'papel_gerenciar'`) pelo nome usado em Papéis & Permissões. O resto já vem em português do backend e passa direto |
| `desembrulharPaginado` | `services/constant/type/paginacao.type.ts` | tira o `.dados` da resposta paginada uma vez, no `.api.ts`, e avisa no console se o backend cortou em 500 (`TAMANHO_PAGINA_MAXIMO_API`) |
| `paraQueryString` | `services/constant/api/query-string.util.ts` | qualquer objeto de filtro vira `?chave=valor`, pulando o vazio |
| `criarApiCatalogo` | `services/constant/api/api-catalogo.ts` | as 6 operações iguais dos catálogos (tipo de link, área, motivo de denúncia) |

📌 **Erro na tela: `useErroToast`** (`components/layout/toast/use-erro-toast.ts`). `reportarErro(erro)` traduz e mostra. Com `{ mostraTexto: true }`, o erro aparece só no texto vermelho da tela (e embaixo do campo, quando vem com `campos`, via `errosCampo`), sem repetir no aviso flutuante. Sem lugar visível para o erro, o aviso flutuante volta.

---

## 7. Upload de arquivo (`25-arquivo`)

`services/25-arquivo/api/arquivo.api.ts` fala com dois lugares:

| Passo | Chamada | Vai para |
|---|---|---|
| 1 | `iniciarUpload` → `POST /arquivo/upload/iniciar` | Nest (autenticado) |
| 2 | `enviarParaBucket` → `PUT` na URL pré-assinada | **direto no armazenamento** |
| 3 | `confirmarUpload` → `POST /arquivo/upload/confirmar` (com `contexto`) | Nest (autenticado) |

📌 **O passo 2 nunca usa `authFetch`:** é outro endereço, não leva `Authorization`, e os cabeçalhos devolvidos no passo 1 precisam ir exatamente como vieram (a assinatura da URL confere). Usa `XMLHttpRequest` para mostrar a porcentagem enviada (`aoProgresso`).

📌 **Redução da imagem no navegador** (`services/25-arquivo/util/reduzir-imagem.util.ts`, Canvas sem biblioteca): sobe mais rápido e evita a URL pré-assinada (5 minutos) vencer no meio do envio. É otimização, nunca segurança: o backend (`sharp`) continua a autoridade. Qualquer falha (navegador sem suporte, imagem corrompida, resultado maior) devolve o arquivo original. Tenta WebP e confere o tipo do resultado; sem WebP, cai para JPEG.

📌 **Dois tetos de tamanho no `SeletorFotoPerfil`:** um absurdo (30 MB) antes de reduzir, para não processar vídeo renomeado; e o de Parâmetros (`arquivo_tamanho_maximo_imagem_bytes`) depois de reduzir.

⚠️ **Sincronia manual com o Nest:** o perfil de redução (largura e qualidade do `'avatar'`) e a lista de tipos de imagem aceitos espelham o backend à mão.

---

## 8. `GenericTable`

`components/crud/generic-table.tsx`: a tabela de listagem de todo o painel (leitura, busca, filtro, ordenação, paginação). Cada módulo novo com listagem é só uma entrada de colunas, não uma tela escrita do zero.

| Prop | O que faz |
|---|---|
| `titulo`, `ajuda`, `acaoTopo` | cabeçalho; `ajuda` vira um ⓘ ao lado do título; `acaoTopo` é o botão da direita (`BotaoCriar`) |
| `colunas` | `{ chave, rotulo, tipo }` + opcionais `renderizar(linha)` e `quebrarRotulo`; o `tipo` é obrigatório |
| `chavePrimaria` | o campo usado como `key` da linha |
| `listar` | função já amarrada ao `authFetch` pelo pai |
| `acoes` | `Partial<Record<'alterar' \| 'consultar' \| 'excluir', (linha) => void>>`: os botões saem das chaves presentes (ação sem função é erro de tipo, não link quebrado) |
| `acaoIndisponivel` | `(linha, acao) => motivo`: a ação fica no lugar, apagada, com o motivo na dica (`aria-disabled`, continua focável) |
| `filtrosFacetados` | `{ chave, rotulo, ordem? }`: cada um vira um filtro de múltipla escolha |
| `vazio`, `nivelTitulo` | o estado vazio (`EstadoVazio`) e o nível do título (`h1` por padrão) |

📌 **Tipos de coluna: formato + espaço.** O formato (como mostra, busca e ordena) mora em `components/crud/colunas/formatos.tsx`: texto, número, Sim/Não, dinheiro, data, data e hora, e espera ("há 3 dias"). O espaço mora nos arquivos numerados: `id` (estreita, presa à esquerda), `nome` (a principal, uma por tabela, com mínimo e máximo), `texto` (largura pelo conteúdo) e `curta` (`numero`, `simNao`, `status`, `codigo`, `dinheiro`, `data`, `dataHora`, `espera`: centralizada, nunca quebra, e as do mesmo tipo ficam com a mesma largura). Ações não é tipo: a tabela monta sozinha, por último. A tela nunca escreve largura nem alinhamento.

📌 **Comportamento:**
- **Ordena e busca pelo valor cru, mostra formatado** ("R$ 9.000" não vem depois de "R$ 10.000"). A busca procura no que a pessoa vê e no valor cru, sem acento nem maiúscula (`services/constant/util/busca.util.ts`).
- **Ordena a lista filtrada inteira antes de paginar**, nunca só a página visível.
- **Facetas:** E entre facetas, OU dentro da mesma; as opções saem da lista completa; o filtro só aparece com mais de um valor.
- **Busca, filtro, página e ordem vivem na URL** (`useSearchParams`, sempre com `replace`): voltar de um modal ou dar F5 mantém o filtro. Nomes reservados: `q`, `pagina`, `tamanho`, `ordenar`, `dir`.
- **Larguras medidas, não estimadas:** as colunas curtas medem o texto de toda a lista (`canvas.measureText`) antes de pintar; nome e texto têm piso pela lista inteira, para não mudar ao virar a página.
- **Tela estreita:** primeiro some o espaço extra; depois o texto secundário diminui; depois nome e texto quebram (e-mail quebra só depois do `@` ou do `_`); por fim a tabela rola de lado, com id, nome e Ações presos (no celular, só o nome).
- **Esqueleto de carregamento** com as mesmas colunas, em vez de "Carregando..." que faz a tela pular.

📌 **CRUD não acontece dentro da tabela.** Criar, Alterar, Consultar e Excluir abrem modal no pai (`useCrudModais`, seção 9). O log de auditoria é um componente irmão (`BlocoLogAuditoria`), colocado logo abaixo pela tela, não uma prop.

📌 **Teste para saber se algo é prop ou peça à parte:** "uma tela que não pode usar esta tabela ainda precisa disto?" Se sim, é uma peça irmã. Foi assim que nasceram `RodapePaginacao`, `BarraFiltros` e `BlocoLogAuditoria`.

⚠️ **Busca, filtro e paginação são no navegador.** Resolve listas de dezenas e centenas de linhas; milhares exigiriam busca no backend (`LIMIT/OFFSET` + `WHERE`).

**Quem usa:** todas as listagens (`listar-*.tsx` de usuários, papéis, pesquisadores, áreas, tipos de link, motivos de denúncia, parâmetros, termos, campanhas e a fila de aprovação).

**Tabelas específicas** (`components/crud/tabelas/`, uma por arquivo, numeradas): 1 links acadêmicos, 2 dimensões do score, 3 itens de orçamento, 4 marcos do cronograma, 5 histórico de alterações, 6 Papel × Permissão, 10 atualizações de campanha, 11 comentários, 12 denúncias, 13 pedidos de encerramento; e a base `tabela-editavel.tsx` (edição na linha, usada por 1, 3 e 4). `CaixaTabela` é a caixa que rola a tabela de lado no celular, com nome e foco de teclado: obrigatória em tabela só de leitura, que não tem botão para o teclado chegar (WCAG 2.1.1; usada por 5, 10 e 11). A tabela mostra e edita; quem busca e grava é a tela, por props (`aoAdicionar`, `aoSalvar`, `aoExcluir`...).

---

## 9. Componentes e hooks reutilizáveis

### `components/crud/`

| Componente | Papel |
|---|---|
| `modal-ficha.tsx` | casca de todo modal de Consultar, Alterar e Criar: fundo escurecido, cartão preso no topo, cabeçalho (título, subtítulo, ⓘ `ajuda`, `badges`, `acoesCabecalho`), corpo e rodapé. Só aparece pronto (`carregando` mostra a pílula "Carregando..."); `variasTelas` abre na altura cheia. Fecha pelo X, pelo clique no fundo (desligável) e pelo Esc. Ver "Modal não dança" no design system |
| `modal-detalhe.tsx` | modal de explicação (título, chave técnica, selo, seções) |
| `ficha-consulta.tsx` | `SecaoFicha` e `CampoFicha`: as seções e campos dos modais de Consultar (campo de leitura, não campo desabilitado: desabilitado promete "poderia editar") |
| `rodape-acoes.tsx` | `RodapeAcoes`: secundário à esquerda (Cancelar, Fechar), ações à direita, com "Salvando..." enquanto `ocupado`; `perigo` usa o botão vermelho; `formulario` submete um `<form>` pelo id; `largura` escolhe entre os três tamanhos de rodapé |
| `resumo-alteracoes.tsx` | a frase do rodapé dos Alterar: o que mudou e ainda não foi salvo |
| `use-alteracao-nao-salva.ts` | aviso nativo do navegador (`beforeunload`) com alteração não salva; a confirmação ao fechar o modal é da tela |
| `badge-status-campanha.tsx` | o selo de status de uma campanha, igual em todo lugar, com "Em breve" (seção 12) |
| `badge-status-denuncia.tsx` | o selo da situação de uma denúncia (pendente, em análise, resolvida, improcedente) |
| `filtro-partes.tsx` | `FiltroPartes`: filtro fixo no topo do corpo do modal, com cara de aba. "Geral" mostra tudo; cada outra opção mostra só aquela parte, e as outras ficam escondidas (`hidden`), não desmontadas: troca instantânea, nada do que está sendo editado se perde. Usado no Alterar Usuário e no Consultar Campanha |
| `modal-termo.tsx` | o padrão de todo termo para ler (o do Criar conta): `ModalTermo` (modal largo, título, versão, "Tela cheia" no cabeçalho, texto rolando por dentro), e as peças `TextoTermo` e `BotaoTelaCheia` para o upgrade de pesquisador. Usado no Criar conta, na tela de aceite pendente, no Consultar Termo de Uso e nos aceites do Consultar Usuário. Criar e Alterar Termo continuam com a `CaixaTextoLongo` (é edição) |
| `badge-status-encerramento.tsx` | o selo da situação de um pedido de encerramento antecipado (pendente, aprovado, rejeitado, cancelado) |
| `badge-status-pesquisador.tsx` | o selo Ativo/Suspenso do pesquisador (Consultar Usuário, Minha Conta e, depois, o perfil público) |
| `badge-booleano.tsx` | o selo Sim/Não |
| `acao-linha.tsx` | ícone + texto + dica de cada ação de linha; a dica de ação indisponível é desenhada fora da tabela (portal), para não ser cortada |
| `botao-criar.tsx` | o "Criar" do topo das listas |
| `mensagem-erro.tsx` | o texto de erro em destaque (`role="alert"`, marca `data-mensagem-erro` para a tela rolar até ele) |
| `caixa-aviso.tsx` | a caixa colorida de aviso ("O que acontece de verdade", "Não dá para...") |
| `caixa-texto-longo.tsx` e `tela-cheia.tsx` | texto longo (termo de uso): a caixa estica até o fim do modal, mostra a contagem e tem "Tela cheia" (que fecha com Esc sem fechar o modal) |
| `texto-resumido.tsx` | texto livre dentro de uma tabela (comentário, relato, justificativa): mostra o começo e um "ler tudo" que abre o texto inteiro num `ModalDetalhe`, para a linha não esticar |
| `estado-vazio.tsx` | lista vazia que orienta: ícone, o que apareceria ali e o próximo passo. `compacto` põe o ícone ao lado do texto, para seção pequena dentro de ficha ou modal; toda seção vazia do painel usa ele, nunca um "Nenhum ..." escrito à mão |
| `indicador-etapas.tsx` | o indicador de passo a passo (Criar Campanha) |
| `secao-suspensao.tsx` | a seção de moderação (suspender e revogar) usada pela conta e pelo poder de pesquisador |
| `modal-excluir-item.tsx` e `modal-excluir-comentario.tsx` | exclusões com confirmação |
| `barra-progresso.tsx` | quanto da meta já foi arrecadado |
| `bloco-log-auditoria.tsx` + `log-auditoria-painel.tsx` | o "Ver log" abaixo de uma listagem, com paginação no servidor |

### `components/input/`

| Componente | Papel |
|---|---|
| `campo.tsx` | `Campo`: rótulo + campo + dica ou erro. O campo vem por função (`({ atributos, classeErro }) => <input {...atributos} />`), para servir a input, select e textarea; `atributos` liga rótulo, erro e dica para o leitor de tela |
| `contador-caracteres.tsx` | "120 de 5.000 caracteres", com o limite de Parâmetros; vermelho acima do limite. Conta como o banco (`contarCaracteres`: um emoji vale 1) |
| `confirmacao-digitada.tsx` + `confirmacao-confere.ts` | "Digite o e-mail para confirmar"; `classeRotulo` para rótulo sobre fundo colorido |
| `caixa-busca-sugestoes.tsx` | caixa de busca com lista "ID: x  Nome", que fecha ao clicar fora |
| `caixa-marcacao.tsx`, `campo-cpf.tsx`, `medidor-senha.tsx` | caixa de marcação, CPF com máscara, força da senha |
| `seletor-foto-perfil.tsx` | o avatar editável com o fluxo de upload inteiro. Nunca salva sozinho: devolve ao pai (`aoAlterar`), com três estados (foto nova, remoção pedida, nada escolhido) |

### `components/layout/`

`layout.tsx` (cabeçalho, breadcrumb, `<main>` e rodapé), `header.tsx`, `footer.tsx`, `breadcrumb.tsx`, `avatar-usuario.tsx`, `tooltip.tsx`, `carregando.tsx`, `limite-erro.tsx`, `barra-abas-botoes.tsx`, `barra-carregamento/`, `toast/` e `cabecalho/` (busca global, menu do usuário, sino, controles de tema e de fonte, entrar como).

📌 **Destaques:**
- **`LimiteErro`:** um erro de renderização mostra um aviso no lugar do trecho que quebrou (com botão de recarregar), em vez de tela em branco. Em volta do conteúdo de todas as páginas e da área do painel (o menu continua de pé). Recomeça ao trocar de página.
- **Avisos (toasts, `toast-provider.tsx`):** fila de até 3, sucesso some em 4 s e erro em 8 s, acima dos modais. Aviso igual não empilha: recomeça o tempo com uma pulsada leve. Quem sai encolhe e os de baixo sobem deslizando. Erro é `role="alert"`, sucesso `role="status"`.
- **Dica (`tooltip.tsx`):** `.dica` + `<Dica texto />` dá nome visível a qualquer controle; abre no `:hover` e no foco de teclado (`:focus-visible`), nunca no foco de clique (senão ficava presa depois de fechar um modal). `Tooltip` é o ⓘ avulso (`baixo`, `aoClicar` para abrir um modal com a explicação longa, `badge`). `<Dica>` é `aria-hidden`: o nome acessível mora no gatilho. `title` nativo só onde o elemento não é interativo.
- **`AvatarUsuario`:** cor da inicial pelo nome (sempre a mesma, sem guardar nada); foto que não carrega vira a inicial.
- **Tema e fonte são do dispositivo, não da conta** (`localStorage`): preferência por conta exigiria tabela própria.
- **Sino ("Atividade recente"):** lê `GET /log-auditoria/minha-atividade`; "não lidos" pelo maior id já visto, sem coluna no banco. Quando o módulo de notificação existir, ganha uma segunda aba.
- **Busca global (Ctrl+K):** usuários, papéis, permissões, parâmetros e navegação, carregados na primeira abertura; busca no navegador.
- **Entrar como (`dev-login-rapido.tsx`)** e o "Redefinir senha" de desenvolvimento usam a senha do seed de demonstração (`SENHA_DEV`) e só existem em `npm run dev` (`import.meta.env.DEV`): somem do build de produção.

### Hooks (`services/constant/hook/` e módulos)

| Hook | O que resolve |
|---|---|
| `useEnvio` | o "enviar" de todo formulário: limpa o erro, liga `ocupado`, chama a API, reporta o erro, desliga |
| `useErrosFormulario` | erro embaixo de cada campo na tentativa de enviar, com o cursor no primeiro (seção 13) |
| `useBuscar` | buscar dado quando algo muda, descartando resposta atrasada; serve também ao "carregar para editar" (`aoChegar`) |
| `useCrudModais` | o estado criar/alterar/consultar/excluir/recarregar de toda listagem |
| `useFocoPreso` | foco preso na janela aberta, Esc fecha só a de cima, foco volta para quem abriu |
| `useOpcoesDiasSuspensao` | os prazos de suspensão vindos de Parâmetros |
| `useRegrasCampanha` | as regras de campanha de Parâmetros (meta mínima, prazos, prazo sugerido, mínimos de orçamento e cronograma, limite da descrição) |
| `useDecisaoAprovacao` / `usePronta` | aprovar e rejeitar uma campanha, e se ela está pronta para aprovar (seção 12) |

---

## 10. Estado global: os providers

```jsx
<StrictMode>
  <BrowserRouter>
    <ConfiguracoesProvider>
      <ToastProvider>
        <App />
```

| Provider | Para quê |
|---|---|
| `ConfiguracoesProvider` (`services/11-configuracoes/context/`) | carrega uma vez os parâmetros públicos e expõe `obterConfiguracao(chave, padrao)` e `obterNumero(chave, padrao)` (limites, prazos e valores; o padrão também vale se a linha não for número): nenhuma regra de negócio escrita no JSX. Converte o valor pelo `tipo` da linha e só usa linhas ativas. O `padrao` é só o valor durante o carregamento |
| `ToastProvider` (`components/layout/toast/`) | `useToast().mostrar(titulo, descricao, tipo)` |

📌 **Critério para um módulo ganhar `context/`:** o dado é lido por telas **sem parentesco** e é caro ou errado buscar de novo. Parâmetros passam; a lista de campanhas não (cada tela busca a sua). Formato: uma pasta `context/` só, com contexto e provider em arquivos separados (o recarregamento rápido do Vite quebra quando um arquivo mistura componente e hook).

📌 **A autenticação não usa `context/` hoje** (o `auth` desce por prop desde `App.tsx`). Funciona enquanto só existe o painel; o momento de migrar é junto da área pública, quando o usuário logado for lido longe da raiz, no mesmo formato acima.

---

## 11. CSS, Tailwind e temas

**Arquivos, na ordem:** `tailwind-theme.css` (o `@theme` do Tailwind: as 4 cores-mãe da marca, as fontes e o ponto de quebra `painel:`) e o manifesto `0-style.css`, que importa `1-cores.css` (tokens de cor dos temas), `2-tipografia.css` (as classes de texto), `3-base.css` (raio, sombra, camadas, alturas e larguras por papel, reset de tag), `4-componentes.css` (botões, campos, selos, dicas, avisos, peças), `5-crud.css` (tabelas e modais), `6-admin-shell.css` (menu lateral e área do painel) e `7-responsividade.css` (há ainda um arquivo das ferramentas internas de desenvolvimento, que não vai para o build de produção). O `tailwind-theme.css` fica sozinho porque nenhum `@import` pode vir depois do `@import 'tailwindcss'` no mesmo arquivo.

📌 **Zero valor escrito à mão.** Cor, tamanho de texto, largura e camada são tokens ou classes; nas telas, só a escala do Tailwind (espaço, layout, canto, sombra). Cor crua só nas 4 cores-mãe do `@theme`. As regras completas (DS-xx) estão no documento de design system.

📌 **Tema por atributo.** `ControleTema` grava `data-tema` (claro, escuro ou sistema) e `data-tema-efetivo` (claro ou escuro) no `<html>`; `1-cores.css` tem um bloco de tokens para cada tema, e nenhum componente precisa saber que o tema mudou. O "sistema" é resolvido com `matchMedia`. Por isso o JSX usa classes semânticas (`fundo-cartao`, `texto-forte`, `borda-padrao`), que trocam de valor com o tema. O rodapé é sempre escuro, com tokens próprios (`--cor-rodape-*`), independente do tema.

📌 **Contraste conferido.** Texto normal pede 4,5:1 e borda de campo 3:1. Fundo verde com texto usa `--cor-fundo-marca-forte` (5,41:1), texto verde usa `--cor-texto-marca` (`#0b7a45` no claro, `#2fbf71` no escuro), e a borda dos campos usa `--cor-borda-campo`. `npm run contraste` confere os pares nos dois temas e sai com erro se algum ficar abaixo; ele só mede cor sólida, então não substitui o axe.

---

## 12. As telas

### Entrada e conta

- **Login, Cadastro, Esqueci a senha, Criar nova senha, Verificar e-mail** (`views/3-auth/`): cartão solto no meio da página. O cadastro exige o aceite do Termo de Uso vigente (lido do banco, aberto num modal largo com "Tela cheia"; "Li e concordo" marca a caixa).
- ⚠️ **Sem envio de e-mail ainda** (módulo `4-mail`): a verificação de e-mail mostra o link na tela só em desenvolvimento, e o "Esqueci a senha" responde igual para e-mail existente ou não, sem enviar nada.
- **Aceite de nova versão do Termo de Uso (RF-015):** com aceite pendente (vem do login e da renovação), o `AdminLayout` mostra `TelaAceiteTermoUso` no lugar do painel ("Li e aceito" ou "Sair"); o backend recusa as outras rotas com 403 até o aceite.
- **Minha Conta** (`/admin/minha-conta/:aba`): faixa de identidade no topo e abas que são rotas (Perfil, Segurança, Papéis, Acadêmico, Privacidade). Privacidade é a última (exportar os dados e excluir a conta, com confirmação digitada). O upgrade para pesquisador é feito pela própria pessoa, na aba Acadêmico.

### Gestão do usuário

- **Usuários:** Alterar é uma tela só, que rola (sem abas): em cima, o que espera o Salvar (foto, nome, senha, perfil de pesquisador); embaixo, o que grava na hora (papéis, moderação, CPF, links acadêmicos). Um filtro no topo mostra uma parte só sem desmontar as outras; o cabeçalho mostra pílulas da situação; o rodapé diz o que mudou. Revogar papel pede confirmação; suspender pede motivo e prazo de Parâmetros.
- **Papéis & Permissões:** matriz Papel × Permissão e o significado de cada papel e permissão em dicionários (`papel-descricoes.constants.ts`, `permissao-nomes-amigaveis.constants.ts`); quem tem uma permissão é lido ao vivo.

### Configurações

- **Termo de Uso:** Criar, Consultar, Alterar e Excluir em modal. Versão aceita é só leitura (e não se exclui); "Começar da vigente" no Criar. Selos: Vigente, Substituída, Rascunho.
- **Tela de aceite (`views/5-termo-uso/tela-aceite-termo-uso.tsx`, RF-015):** mostra o termo pendente que `GET /termos-uso/pendente` devolver (o da conta ou o de pesquisador, com o nome certo no título). Com os dois pendentes, aceitar o primeiro mostra o segundo. Desde 04-10-2026 usa o `ModalTermo` (o padrão do termo do Criar conta); antes era um cartão solto próprio, sem "Tela cheia". O X e o Esc encerram a sessão, como "Sair" (RF-015: com termo pendente só dá para ler, aceitar ou sair).
- **Pontuação (Score) (`views/11-configuracoes/pontuacao-score.tsx`, Configurações):** os pesos das 4 dimensões e, dentro de cada uma, os itens com "ligado" e peso, mostrando quantos pontos cada item vale na hora (a parte dele da dimensão); e as faixas de reputação (nome, descrição, de, até). Cada bloco tem Desfazer e Salvar; Salvar só liga sem erro (dimensões somando 100, faixas cobrindo 0 a 100 sem buraco), e o banco confere de novo. Salvar recalcula todo mundo. O aviso de "regra ainda não fechada" saiu do painel de score do Consultar Usuário.
- **Parâmetros do Sistema:** a descrição como nome; o campo de valor segue o tipo (Sim/Não, inteiro, decimal). Chave de um par mínimo/máximo mostra o aviso de qual editar primeiro.
- **Áreas do Conhecimento, Tipos de Link, Motivos de Denúncia:** catálogos com a mesma API (`criarApiCatalogo`) e modais; Tipo de Link tem "Testar com um link".

### Campanha

- **Status e "Em breve".** `BadgeStatusCampanha` mostra o status em todo lugar. "Em breve" (RF-059) não é status do banco: é a campanha aprovada (`ativo`) com início no futuro, com selo azul próprio, e o filtro das listas tem a opção. As regras de status ficam num lugar só (`services/12-campanha/constants/status-campanha.constants.ts`): onde o banco aceita comentário novo, onde aceita atualização nova e quais já foram publicadas.
- **Campanhas:** a lista de todas, para a gestão, com o Consultar completo, só para ler, nesta ordem: dados, datas, financeiro com a barra do arrecadado, histórico de rejeições, orçamento e cronograma, atualizações publicadas, **comentários endossados** (no máximo o limite de endossos, na ordem do endosso: o que a página pública mostra), **denúncias** (só quando há alguma), **pedidos de encerramento** (só quando há algum) e **todos os comentários** (a gestão vê todos pela permissão de moderar). No topo, o `FiltroPartes` (Geral, Dados, Orçamento e cronograma, Atualizações, Comentários e, para a gestão, Moderação, só quando há denúncia ou pedido de encerramento); vale nos quatro lugares que usam o modal. Denúncias e comentários são **paginados pelo servidor** (`usePaginaServidor`): uma campanha pode ter milhares. Endossar e excluir ficam com o dono, em Minhas Campanhas. Contribuições e quantas pessoas seguem entram no Consultar quando os módulos existirem.
- **Denúncias (`views/19-denuncia`, moderação):** a lista de campanhas e perfis denunciados (tipo, alvo, motivo, denunciante, data e situação), com filtro por situação e por tipo. Consultar abre o julgamento: a situação e, ao decidir (resolvida ou improcedente), a justificativa obrigatória. Numa denúncia contra campanha ativa, "Procedente: encerrar a campanha" pede confirmação e a justificativa, e a campanha sai da página pública. `ModalDenunciar` (motivo só dos ativos do tipo certo, relato opcional) é a peça que a página pública vai usar; no painel, o dono da campanha usa para "Denunciar autor" de um comentário recebido (o comentário vai no relato), e o T4 usa para denunciar uma campanha seguida.
- **Contestação do score (RF-033):** na Minha Conta, aba Acadêmico, `SecaoContestacaoScore` (`views/19-denuncia`) lista as denúncias procedentes contra o pesquisador (sem quem denunciou), com "Pedir revisão" (uma por denúncia, uma esperando por vez) e o resultado. Na tela de Denúncias, a coluna e o filtro "contestação"; com uma contestação esperando, o modal de julgamento troca a decisão normal por "Recusar contestação" e "Aceitar: denúncia improcedente", com justificativa.
- **Encerramentos (`views/20-solicitacao-encerramento`, moderação):** os pedidos de encerramento antecipado (campanha, modelo, arrecadado, contribuições confirmadas, quem pediu, data e situação), com filtro por situação. Consultar abre a decisão: Rejeitar pede a justificativa; Aprovar mostra o que acontece com o dinheiro (Tudo ou Nada devolve, Flexível repassa) e pede confirmação. O encerramento direto aparece como aprovado, com "-" em quem decidiu.
- **Encerrar antes do prazo (Alterar do dono, campanha ativa):** `SecaoEncerramentoAntecipado`, no fim do Alterar em Minhas Campanhas. Sem nada arrecadado, "Encerrar campanha agora" com confirmação; com arrecadado, "Enviar pedido ao administrador", e a campanha continua recebendo apoio até a decisão. Com um pedido pendente, mostra o pedido e "Cancelar pedido". Embaixo, a tabela dos pedidos anteriores.
- **Aprovar Campanhas (fila):** "esperando há X dias", contado da última entrada na fila (a mais antiga no topo; um reenvio zera a espera); sinal de score baixo. O modal de revisão mostra tudo o que é preciso ler, a lista "Pronta para aprovar?" e o motivo da rejeição. **Aprovar e rejeitar** vivem em `useDecisaoAprovacao` e nas peças de `views/12-campanha/decisao-aprovacao.tsx`: Rejeitar fica sempre clicável e, sem motivo, mostra o erro embaixo do campo; Aprovar fica apagado enquanto a campanha não está pronta.
- **Criar Campanha:** passo a passo de 4 etapas no mesmo modal (Dados, Orçamento, Cronograma, Revisão), salvando como rascunho a cada etapa. A data de fim é sugerida com a duração de Parâmetros (`prazo_sugerido_campanha_dias`, RF-069); meta e prazo são conferidos antes de enviar; a descrição tem contador (RF-072). O clique fora não descarta as etapas.
- **Alterar Campanha:** os campos protegidos depois da aprovação aparecem só para leitura, com o aviso de por quê (a lista vem do banco). Rascunho e rejeitada têm "Enviar para aprovação" ou "Corrigir e reenviar"; datas vencidas oferecem reagendar mantendo a duração (RF-070). Para o **dono** de uma campanha já publicada: **Atualizações** (`SecaoAtualizacoesCampanha`: publicar com título, conteúdo, fase e formato; ocultar e mostrar, RF-051/052) e **Comentários recebidos** (`SecaoComentariosRecebidos`: endossar até o limite de Parâmetros, excluir ou excluir e bloquear, sem avisar o autor, RF-093/094).
- **Comentar:** no painel só existe o comentário em nome de outro pesquisador (`comentarioApi.comentarParaOutro`, Bancada da Campanha), que é ferramenta de teste e não existe em produção. O comentar da própria conta (`POST /comentario`) entra no serviço junto da página pública, que é quem vai usá-lo.
- **Seguir campanha** tem serviço próprio (`services/16-seguir-campanha`): seguir, deixar de seguir e listar as que a conta segue.

### Dashboard (`views/admin/dashboard.tsx`)

Quatro abas (`BarraAbasBotoes`): **Visão Geral** (faixa de saúde, cartões de métrica que levam à lista já filtrada, acessados recentemente, prévia de notificações), **Regras do Negócio** (os parâmetros agrupados por assunto, `configuracoes-grupos.constants.ts`; chave sem grupo cai em "Outras"), **Identidade Visual** (espaço reservado: a gestão de logo e favicon não foi construída) e **Saúde**. Saúde e métricas vêm de duas requisições independentes, para a falta de banco aparecer mesmo quando o resumo falha.

---

## 13. Usabilidade e acessibilidade

📌 **Botão sempre clicável, erro embaixo do campo.** Com algo faltando, o botão continua funcionando; ao clicar, cada campo mostra o que falta e o cursor vai para o primeiro (`useErrosFormulario`). Ficam desabilitados só: Salvar sem alteração, Aprovar campanha que não está pronta (a lista ao lado diz o que falta), exclusões com confirmação digitada e o que está enviando. Os avisos que já aparecem enquanto se digita (meta abaixo do mínimo, e-mail inválido, senhas diferentes) continuam. Heurísticas de Nielsen 1, 5 e 9.

📌 **Erro aparece uma vez só:** ao lado de onde se corrige (texto vermelho ou embaixo do campo, com a tela rolando até ele), sem repetir no aviso flutuante (`useErroToast({ mostraTexto: true })`). O aviso flutuante é para o que acontece fora de um formulário.

📌 **Criar e Alterar perguntam antes de descartar** (clique fora, Esc ou X com alteração não salva).

📌 **Modal não dança:** preso no topo, nunca encolhe, só aparece pronto.

📌 **Teclado:** "Pular para o conteúdo" é o primeiro Tab da página; o foco fica preso na janela aberta e volta para quem a abriu; Esc fecha só a janela de cima (`useFocoPreso`); o foco de teclado é visível (anel em volta dos campos).

📌 **Leitor de tela:** uma `<main>` e um `h1` por página; modais com `role="dialog"`, `aria-modal` e o título como nome; todo ícone decorativo com `aria-hidden`; ícone que carrega informação com `role="img"` e nome; campo sem rótulo visível com `aria-label`; texto de carregamento com `role="status"`.

📌 **Conferido em 02-10-2026:** axe (WCAG 2.1 AA) com zero violações nas telas e modais, nos dois temas; nenhuma rolagem lateral em 390 px.

📌 **Datas no fuso de quem usa:** a data escolhida vira o começo do dia de início e o fim do dia de fim, no fuso local (`services/12-campanha/util/prazo-campanha.util.ts`); `formatarData` lê a data pura como meia-noite local (sem isso, a data aparecia um dia antes).

---

## 14. Dependências: o que cada uma faz

| Pacote | Por que está aqui |
|---|---|
| `react` + `react-dom` | o framework e o renderizador do navegador |
| `react-router` | rotas no navegador (ver seção 2 sobre `react-router-dom`) |
| `tailwindcss` + `@tailwindcss/vite` | utilitários CSS, gerados no build |
| `vite` + `@vitejs/plugin-react` | build, servidor de desenvolvimento e recarregamento rápido |
| `typescript` + `@types/react` + `@types/react-dom` | os tipos (o React é publicado em JavaScript; os pacotes de tipo descrevem a API dele) |
| `eslint` + `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `globals` | lint: uso errado de hook, compatibilidade com o recarregamento rápido, regras de TypeScript |

---

## 15. O que não existe ainda e débitos conhecidos

- **Área pública** (campanha, home, checkout, painel do doador e do pesquisador). Ver `PROXIMOS_MODULOS.md`. Botões do cabeçalho e do rodapé que levariam a ela ainda não têm destino; "Continuar com Google" é simulado.
- **Telas dos módulos que faltam:** denúncia, recompensa, pedido de encerramento, notificação, contribuição, repasse.
- ⚠️ **Nenhum teste automatizado no React.**
- ⚠️ **`react/.gitignore` não cobre `.env`** (inofensivo hoje: o arquivo só tem a URL da API).
- ⚠️ **Espelhos manuais do Nest:** tipos dos DTOs, perfil de redução de imagem, lista de tipos de imagem aceitos. Sem import entre os dois projetos, cada mudança no Nest precisa ser repetida aqui.
- ⚠️ **Busca, filtro e paginação no navegador** (`GenericTable`, busca global): não escalam para milhares de linhas.
- ⚠️ **Autenticação por prop**, sem `context/`: migrar junto com a área pública (seção 10).
- ⚠️ **Permissão por rota no menu e na guarda:** hoje toda conta logada vê o painel inteiro (seção 4).
