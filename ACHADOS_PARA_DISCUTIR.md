# 🗣️ Achados pra discutir - rodada de documentação (01-09-2026)

Achados pelos agentes que escreveram `DOCUMENTACAO_BACKEND.md`/`DOCUMENTACAO_FRONTEND.md` e pela matriz de rastreabilidade, na mesma rodada. Nenhum foi decidido nem corrigido - só registrados aqui pra discutir com calma depois. Ordem não é prioridade, é só a ordem que saíram no relatório.

---

## 1. 🟢 DECIDIDO (04-09-2026) - `GET /dashboard/resumo` continua público, de propósito

`SECURITY DEFINER` sem guard de autenticação na frente - os números agregados (total de usuários, sessões ativas etc.) ficam acessíveis sem login. Chegou a ser corrigido com `@UseGuards(RequireAuthGuard)`, mas o Lucas decidiu reverter: a exigência de login atrapalha mais que ajuda durante o desenvolvimento agora, e a decisão de arquitetura de longo prazo é que o painel admin inteiro vai ficar fora do alcance do usuário comum de outra forma (não é este guard específico que vai sustentar essa fronteira). Não é esquecimento - é decisão consciente de deixar como está.

## 2. 🟢 RESOLVIDO (04-09-2026) - `DevLoginRapido` protegido por `import.meta.env.DEV`

O Campo de Testes já usava esse padrão em 3 lugares (só existe no build de desenvolvimento, some do build de produção). O `DevLoginRapido` não usava - ia pro bundle de produção carregando as 7 contas de seed com a senha `DevTcc123!` literal no código. Decisão do Lucas: proteger, mesma lógica do Campo de Testes (a conveniência em `npm run dev` não muda; só deixa de ir pro build de produção). Corrigido em `header.jsx`.

## 3. 🟢 RESOLVIDO (04-09-2026) - Comentários desatualizados dizendo que upload "ainda não existe"

Em `avatar-usuario.jsx` e `dashboard-identidade-visual.jsx` - os dois ainda justificavam um placeholder dizendo que `25-arquivo`/upload não existia. Já existia e funcionava (é o que `SeletorFotoPerfil` usa) - não era decisão nenhuma, só comentário desatualizado. Corrigidos os dois: `avatar-usuario.jsx` agora descreve o upload como existente; `dashboard-identidade-visual.jsx` deixa claro que o que falta não é mais o upload em si, é construir a tela de gerenciar logo/favicon (ninguém pediu ainda).

## 4. 🟢 RESOLVIDO (04-09-2026) - `27-resources` era sobra do modelo da disciplina, removida

O Lucas perguntou pra Alexia, ela lembrou que vinha do sistema modelo da disciplina (Programação para Web 2). Investigado nos dois repositórios de referência do curso: `resources`, lá, é um catálogo estático de rota (`GET /rest/resources`) que o React consulta pra montar URL sem hardcode - só faz sentido porque aquele sistema segue uma convenção rígida de 5 endpoints por entidade. O CrowdAcadêmico já resolve o mesmo problema de origem de outro jeito (`<modulo>.api.js` por módulo), e as rotas daqui não são uniformes o bastante pra caber nesse molde. Pasta vazia removida - detalhe completo em `DOCUMENTACAO_BACKEND.md`, seção 14 (nota 🗑️).

## 5. Constantes duplicadas à mão entre `nest/` e `react/`

Exemplos concretos: teto de 8MB por imagem, lista de tipos MIME aceitos, os perfis de redução (512px/80 avatar, 1600px/78 campanha). Hoje cada lado tem sua própria cópia, sincronizada só de boa vontade - não existe import cruzado entre os dois repositórios. É consequência direta de uma pendência mais antiga e já conhecida (o item "React em JavaScript ou TypeScript" de `PENDENCIAS e correcoes.md`: nunca foi decidido - TS abriria a porta pra compartilhar tipos/constantes entre as duas pontas).

**Não é uma decisão nova**, só reaparecendo com um exemplo concreto agora que existe mais coisa duplicada (antes era só uma preocupação teórica).

**Achado um caminho mais barato que virar TypeScript (05-09-2026, discussão com apoio de IA):** boa parte destas constantes já são chaves de `configuracoes` (`arquivo_tamanho_maximo_imagem_bytes` etc.) - e `configuracoes.publica` (nova, ver `PENDENCIAS e correcoes.md`, seção "GET /configuracoes agora distingue pública de interna", 05-09-2026) já marca essas chaves como públicas. Pra quem já é config, a duplicação morre lendo do banco via `useConfiguracoes()` (que já existe), sem precisar de tipo compartilhado nem migrar o React pra TS. Só sobra pra TS o que **não** é config (formato de resposta, tipos MIME estruturais, os perfis de redução 512px/1600px) - decisão maior, continua em aberto.

🟢 **A parte que já era config, feita (05-09-2026):** `seletor-foto-perfil.jsx` (o único componente que faz upload de verdade hoje - avatar) trocou `TAMANHO_MAXIMO_AVATAR_BYTES = 8 * 1024 * 1024` fixo por `obterConfiguracao('arquivo_tamanho_maximo_imagem_bytes', 8 * 1024 * 1024)` - o `8 * 1024 * 1024` que sobra é só o valor padrão exibido por uma fração de segundo antes do `ConfiguracoesProvider` carregar, não mais uma segunda fonte de verdade. A mensagem de erro ("tamanho máximo é X MB") também passou a calcular o número a partir da config, em vez de "8 MB" fixo no texto. `arquivo_tamanho_maximo_documento_bytes`/`arquivo_cota_bytes_por_usuario` não tinham nenhum componente duplicando o valor (busquei em todo `react/src` por quem chama `arquivoApi.iniciarUpload`/`confirmarUpload` - só existe este um componente) - nada a trocar neles. Verificado com `eslint` + `vite build` limpos; não testei o upload de ponta a ponta num navegador (exigiria autenticar e escolher um arquivo de verdade) - a mudança é a troca de uma constante por outra do mesmo tipo/valor padrão, risco baixo.

🟢 **Segunda varredura, confirmando que não sobrou mais nada fácil (06-09-2026):** as outras chaves públicas pensadas pra formulário (`limite_caracteres_*`, `prazo_minimo_campanha_dias`/`prazo_maximo_campanha_dias`, `meta_minima_campanha`, `orcamento_min_itens`/`orcamento_max_itens`, `cronograma_min_marcos`/`cronograma_max_marcos`, `limite_links_academicos_perfil`) não têm NENHUM consumidor duplicando o valor hoje - busquei por `maxLength` em toda tela e não existe formulário de criar campanha/relatar denúncia/etc. no React ainda (essas são telas do site público, que não foi construído). Não há nada mais barato pra fazer aqui agora - o resto realmente depende de TS (formato de resposta, MIME, perfis de redução) ou da página pública existir (os limites de caracteres/prazo).

## 6. `notificacoesPendentes: null` no dashboard não vai se resolver sozinho

Quando `26-notificacao` for construído, não basta o módulo existir - `contar_metricas_dashboard()` (a função SQL que alimenta o card do dashboard) também precisa ganhar essa contagem. Existe um precedente idêntico já comentado no próprio código pra `totalCampanhas` (mesma situação, resolvida do mesmo jeito quando `12-campanha` foi construído) - então o caminho já é conhecido, só não é automático.

## 7. Achados da migração TypeScript (Fase 1 - `constants/`+`util/`, 07-09-2026)

Migração é pura de propósito (regra definida antes de começar) - achados anotados aqui, sem tocar:

- **Três funções mortas em `formatacao.util.ts`:** `formatarMoeda`, `formatarPercentual` e `mascararCpf` são exportadas mas **nenhum componente as importa** (busquei em todo `react/src`). `formatarCpf` (a única realmente usada) segue viva, importada por `alterar-usuario.jsx`/`consultar-usuario.jsx`.
- **`formatarCpf` duplicada em mais dois lugares**, sem importar do util compartilhado: `views/6-perfil-pesquisador/consultar-pesquisador.jsx` e `views/campo-testes/bancada-pesquisador.jsx` cada um define sua PRÓPRIA função local `formatarCpf(cpf)` em vez de reaproveitar `services/constant/utils/formatacao.util.ts`. Três implementações da mesma máscara de CPF no projeto, quando deveria ser uma só.

## 8. Migração TypeScript - 2 das 3 fronteiras de `as` pré-autorizadas nunca foram usadas (07-09-2026)

Na Fase 1, foi aberta uma lista fechada de exatamente 3 fronteiras onde `as` seria permitido (achado real: a proibição original de `as` era inexecutável em `tratarResposta()`). Fases 1 a 5 já convertidos e só **1 das 3** foi realmente necessária:

- **Usada:** `tratarResposta<T>()` em `http.util.ts`. **Correção (07-09-2026, achado do Claude Web numa revisão externa):** o registro original citava só 1 `as` nessa função ("o erro-corpo `(await resposta.json().catch(() => null)) as {...} | null`"), mas a função tem **3** expressões `as`, não 1 - as outras duas ficaram sem menção em nenhum relatório até agora:
  - `(await resposta.json().catch(() => null)) as {...} | null` (erro-corpo, já citada).
  - `JSON.parse(texto) as T` (corpo de sucesso).
  - `undefined as T` (corpo vazio de sucesso) - **risco não documentado até agora:** se quem chama declarar `tratarResposta<AlgumTipoNaoVoid>()` e o corpo vier vazio, a função devolve `undefined` com o tipo de `T` mentindo pro compilador (nenhum erro de compilação, nenhum erro em runtime até o valor ser usado como se fosse `AlgumTipoNaoVoid`). Mitigado na prática só pela disciplina de sempre declarar `tratarResposta<void>(...)` no ponto de uso quando o endpoint não devolve corpo útil (ver Fase 1) - não há nada no tipo que IMPEÇA o uso incorreto.
  As 3 continuam sendo a MESMA fronteira pré-autorizada (nenhuma `as` nova apareceu em lugar nenhum do projeto - conferido de novo em 07-09-2026, grep completo em `src/`), então não é uma violação nova, é uma contagem que estava errada.
- **Não usada:** os dois `JSON.parse` de `use-chamada-registrada.ts` (Campo de Testes) - `JSON.parse` já devolve `any` nativamente, aceito sem cast por `unknown`/`Record`; o único ajuste necessário foi `JSON.parse(String(opcoes.body))`, que só torna explícita uma coerção que o JS já fazia.
- **Não usada:** leitura de `sessionStorage`/`localStorage` com desserialização de objeto - nunca ocorre no projeto real (todo uso grep-confirmado guarda só string/number cru: token, tema, escala de fonte, último log visto).

Ao revisar o caso do `ComponentType` na Fase 5 (achado 9, abaixo), ficou claro que autorização não usada deveria ser retirada da lista, não guardada - permissão ampla demais é convite pra uso futuro sem discussão. Registrado aqui, não decidido sozinho - se a Fase 6 quiser encolher a lista pra só a fronteira 1, é uma decisão à parte com o Lucas, não uma limpeza automática.

## 9. Migração TypeScript - `rotas.constants.js` era lacuna real da Fase 1, e o princípio de ordenação das fases foi corrigido (07-09-2026)

`services/router/rotas.constants.js` (tabela única de rotas, ~40 páginas) nunca foi tocado na Fase 1 porque mora numa pasta plana `services/router/` sem `api/` - o escopo original da Fase 1 varreu só módulos com pasta `api/`, então essa pasta escapou. Só foi encontrado na Fase 5 porque `Breadcrumb.tsx` importa dele.

Ao investigar o achado (o campo `elemento` só compilava com `ComponentType<any>`, aparentemente exigindo uma 4ª exceção à regra do `any`), o próprio princípio por trás da ordem das fases foi corrigido: não é "constants primeiro", é "converter um arquivo depois de tudo que ele importa" - `constants/` geralmente não importa nada, por isso foi posto na Fase 1, mas este arquivo específico importa as ~40 páginas de `views/`, então pelo princípio real ele pertence ao FIM da migração, não ao início. Regra daqui pra frente: "quando a heurística da fase e esse princípio discordarem, o princípio ganha" - se aparecer outro arquivo na mesma situação (constants/util/etc que importa muita coisa ainda não migrada), ele vai pro fim sem perguntar, não é pra tratar como uma nova pausa.

A solução de verdade (não precisou de 4ª exceção nem de `@ts-expect-error`): `PropsPagina { auth: UseAuthReturn }` em `services/router/pagina.type.ts`, confirmado contra o próprio `App.jsx` (toda rota renderiza `<Elemento auth={auth} />`, sempre a mesma prop) - a Fase 6 vai anotar cada view com esse tipo, convergindo tudo.

## 10. Bug real no backend (Nest), achado incidentalmente no teste manual de fechamento da migração TypeScript (07-09-2026)

Não é do `react/` nem desta migração - registrado aqui só porque apareceu durante o teste E2E da Fase 7, não veio de nenhuma investigação proposital no backend.

O cron `CampanhaServiceEncerrarVencidas` (`nest/src/12-campanha/service/campanha.service.encerrar-vencidas.ts`), que chama a função `encerrar_campanhas_vencidas()` no Postgres, falha com `error: column "status" is of type status_campanha but expression is of type text` (código `42804`, `parse_target.c`). A função SQL faz `SET status = CASE WHEN ... THEN 'sucesso' ELSE 'nao_atingido' END` sem cast explícito pro enum `status_campanha` - o Postgres não infere o tipo sozinho num `CASE` dentro de um `UPDATE ... SET`, mesmo as duas opções sendo literais válidos do enum. Precisa de `::status_campanha` em pelo menos um dos dois braços do `CASE` (ou no resultado inteiro).

Efeito prático: toda vez que o cron roda (encerrar campanhas com `data_fim` vencida), ele quebra com esse erro e nenhuma campanha vencida é encerrada de verdade - silencioso, só aparece no log do servidor.

**🟢 CORRIGIDO (07-09-2026, a pedido do Lucas ao ser avisado):** `arquivos_banco_dados/05_regras_negocio.sql`, função `encerrar_campanhas_vencidas()` - `::status_campanha` adicionado no resultado do `CASE`. Não pôde ser reconfirmado rodando contra o banco real nesta sessão (sem acesso de rede ao Postgres a partir daqui), mas o erro `42804` e a correção seguem exatamente a semântica documentada do Postgres pra esse caso (um `CASE` de literais resolve pra `text` antes de chegar na coluna; um literal solto, não). Nota completa da correção e do porquê o comentário antigo ("mesmo padrão de `atualizar_status_repasse`") não se sustentava: no próprio `.sql`, junto da função. Como isso afeta um `@Cron` já em produção (ligado 05-09-2026 pro RF-057), o rastreamento passa a viver em `PENDENCIAS e correcoes.md` (onde bugs reais de produção são acompanhados) - este item fica só como o registro histórico de como foi achado, incidentalmente, durante o teste E2E desta migração.

## 11. Migração TypeScript - fechada a direção que faltava da fronteira Nest/React: corpo de request também tipado (07-09-2026)

A Fase 2 (`type/`) só espelhou os DTOs de **resposta** do Nest, de propósito (registrado na própria Fase 3, ver memória da migração) - os 13 lugares em `api/` que montam corpo de requisição continuaram `dados: unknown` desde então. Achado numa revisão externa (Claude Web, ao auditar o relatório de fechamento): a fronteira Nest/React só estava fechada num sentido, não nos dois - um corpo malformado/incompleto ainda compilava sem avisar nada.

**Corrigido:** os 13 `dados: unknown` (`1-usuario`, `10-motivo-denuncia`, `11-configuracoes`, `2-papel-permissao`, `25-arquivo`, `8-area-conhecimento`, `9-tipo-link`) viraram os tipos de request de verdade, espelhando um a um os DTOs de `dto/request/*.ts` do Nest correspondente - mesmo método já usado na Fase 2, mesma convenção de nome de arquivo. Nenhum `as`/`any` novo - as únicas 3 quebras reais que apareceram (`tsc --noEmit`) eram 3 telas onde o estado de um `<select>` (`TipoMotivoDenuncia | ''`/`TipoConfiguracao | ''`, valor inicial antes de escolher) precisava provar pro compilador que não estava mais vazio na hora de montar o corpo - resolvido com `if (tipo === '') return;` no início do handler de envio, mesma categoria de guarda "nunca dispara na prática, mas o TS não sabe" já usada em `if (!auth.usuario) return` (Fase 6), não com `as`. `tsc --noEmit`, `eslint .` e `npm run build` limpos depois.

## 12. Migração TypeScript - o risco do `undefined as T` (item 8, achado 07-09-2026) verificado ponto a ponto, e 2 casos reais achados (não hipotéticos)

Depois de documentar o risco (item 8, achado do Claude Web: `tratarResposta<T>()` com `T` não-void devolve `undefined` sem avisar se o corpo vier vazio), o próprio Claude Web sugeriu ir além de documentar - conferir cada chamada de `tratarResposta<T>` não-void contra o endpoint Nest correspondente, mesma checagem que a Fase 3 já fazia no sentido contrário (`Promise<void>` só depois de confirmar `@HttpCode(204)`).

Conferidas as 51 chamadas não-void em todo `api/`. Método: todo service do Nest usado por essas 13 pastas declara `Promise<T>` explícito no próprio código (`grep` confirma - nenhum sem anotação) - o próprio TypeScript do lado Nest já garante que todo caminho de um método anotado `Promise<XResponse>` devolve algo daquele tipo, então a checagem real virou "achar todo service anotado `Promise<void>` e confirmar que o controller correspondente não promete um tipo diferente pro front". Achados:

- **2 casos reais, não hipotéticos:** `papelPermissaoApi.atribuir()` e `usuarioPapelApi.atribuir()` (`2-papel-permissao/api/papel-permissao.api.ts`) declaravam `Promise<PapelPermissaoResponse>`/`Promise<UsuarioPapelResponse>`, mas os services correspondentes (`PapelPermissaoServiceCreate`/`UsuarioPapelServiceCreate`) são `Promise<void>` de verdade - só fazem o `INSERT` na tabela de vínculo, sem `SELECT`/`.returning()` de volta - e os controllers não têm `@HttpCode`, então o Nest manda `201` com corpo vazio. `tratarResposta<T>` resolvia `undefined as T` nas duas, silenciosamente, desde que os endpoints existem. **Sem efeito prático até hoje:** os únicos 2 pontos de chamada de cada um (`matriz-papel-permissao.tsx`, `alterar-usuario.tsx`) só fazem `await`, nunca leem o valor resolvido. **Corrigido:** os dois viraram `Promise<void>`, batendo com o que a API realmente devolve - zero mudança de comportamento (ninguém lia o valor mesmo), só o tipo parou de mentir.
- **Verificado e confirmado seguro** (não precisou de mudança): `auth.service.verificar-email.ts` também é `Promise<void>`, mas o controller (`auth.controller.verificar-email.ts`) embrulha o resultado - `await this.service.executar(...); return { verificado: true };` - antes de devolver, batendo com `AuthResponseVerificarEmail` no front. `auth.service.encerrar-sessao.ts.executarUma` é `Promise<void>` mas o controller usa `@HttpCode(204)`, e o front já esperava `Promise<void>` ali (`sessaoApi.encerrarUma`) - correto desde sempre. Todos os 12 services de criar/atualizar tocados no item 11 (acima) devolvem o DTO convertido de verdade via `.returning()`/`.executeTakeFirstOrThrow()`, conferido um a um.

Fora esses 2, nenhuma outra chamada não-void de `tratarResposta<T>` corre o risco documentado no item 8 hoje - verificado, não suposto.

---

## Onde ficam os achados "menores" (não estão aqui de propósito)

Cada documento novo tem sua própria seção final ("o que não consegui confirmar com confiança") com uma lista mais longa e mais técnica de detalhes que os agentes não verificaram linha a linha - esses ficam nos próprios documentos (`DOCUMENTACAO_BACKEND.md` e `DOCUMENTACAO_FRONTEND.md`, seções finais), não duplicados aqui. Este arquivo é só pros achados que pareceram merecer uma conversa, não uma checagem técnica.
