#### Pendências reais do sistema

> 📌 **Numeração de RF (21-09-2026):** os requisitos vigentes são o `informacoes/REQUISITOS_V7.md` (120 RFs). Citações de RF por número neste documento foram escritas em datas diferentes e podem estar em qualquer numeração anterior (pré-06-09-2026, V6 ou V7). A `MATRIZ-RASTREABILIDADE-RF.md` já está inteira na numeração do V7 e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

> 📦 **Histórico movido (26-09-2026).** Tudo o que já foi resolvido antes de 23-09-2026 (as "partes 1 a 20", as pendências antigas com 🟢, as ideias da Alexia já implementadas, a avaliação de IA de 27-07 e as entradas resolvidas de 05 a 22-09) está em `informacoes/HISTORICO/HISTORICO_PENDENCIAS_E_CORRECOES.md`, com o texto original. Citações de outros documentos ou de comentários de código a "PENDENCIAS e correcoes.md, item N", "parte N" ou a uma entrada datada dessas apontam para esse arquivo. Este documento ficou só com o que ainda tem parte aberta e o log dos últimos dias.

*(Atualizado após a reorganização + revisão completa de `01` a `08`, com apoio de ferramentas de IA)*

*(Reorganizado em 26/07/2026: pendências reais no topo, resolvidas/corrigidas no final - pra facilitar achar rápido o que ainda precisa de decisão)*

*(Reorganizado de novo em 28/07/2026: dentro de cada grupo - pendências e resolvidas - os itens continuam agrupados por DATA, mas agora tudo que já foi resolvido foi empurrado bem pro fundo do arquivo, com bastante espaço em branco separando das pendências reais. Única exceção: o que foi resolvido a partir das ideias da Alexia fica logo no topo, antes até das pendências - é a primeira coisa que ela vai ver ao abrir o arquivo.)*

---

## 🗓️ 30-07-2026

🟢 **59. Score público reabre risco de LGPD (Art. 9) - RESOLVIDO no documento (05-09-2026), falta só implementação de uma parte**

Em 28-07-2026 (item 12/31 da Lista C) o score do pesquisador tinha sido fechado ao público justamente por esse risco: juízo automatizado sobre pessoa identificada, exposto publicamente, sem previsão de contestação. Em 30-07-2026 essa correção foi **revertida por decisão de produto** - o score público vira a base de um segundo app do projeto ("Serasa do Pesquisador"), pensado como sinal de confiança pro doador e pressão social pro pesquisador manter a pontuação em dia (ver `parte 11`, mais abaixo, e `DOCUMENTACAO_BD.md [04-I-3]`). Faltava, na época: (a) mecanismo de contestação; (b) base legal documentada.

**Resolvido no documento (05-09-2026, achado numa segunda auditoria de IA ao revisar uma lista de pendências gerada por uma auditoria anterior):** os dois já são requisito, só não tinham sido cruzados contra o texto oficial antes de sugerir "falta escrever". (a) **RF-031** já prevê o pesquisador abrir "uma solicitação de revisão junto ao Administrador caso considere alguma penalidade injusta ou desatualizada... segue o mesmo fluxo de análise das denúncias" - mecanismo de contestação, já escrito. (b) **RNF-015** já exige que os Termos expliquem "que a pontuação... é calculada automaticamente e exibida publicamente... em conformidade com o direito à explicação... (LGPD Art. 20)" - base legal, já escrita. **O que falta agora não é requisito, é implementação:** RF-031 (fluxo de contestação) ainda não tem código no Nest (`MATRIZ-RASTREABILIDADE-RF.md` marca ❌ nos dois lados) e os Termos de Uso (`termos_de_uso`, ainda `[PLACEHOLDER]`) não têm o texto real do RNF-015 escrito ainda - dois itens de trabalho técnico/jurídico, não mais uma lacuna de requisito.

*(Item 60 - reativação de pesquisador - resolvido no mesmo dia. Ver `parte 13`, na seção de resolvidas, mais abaixo.)*

### Só resolve em código Nest/React (ainda não existem)

🟡 **6. Fluxo de autenticação completo - PARCIALMENTE RESOLVIDO (01-08-2026)**

Signup, login, verificação de e-mail, recuperação de senha, refresh token.

> Sugestão da *** IA ***: os prazos que já estão documentados no `01` (token de recuperação de senha com expiração de 15-30 min, ver comentário da tabela) já batem com o padrão que plataformas como Catarse/Experiment usam pra esse tipo de fluxo - não mudaria nada aí. Um reforço que vale considerar: rate-limit de tentativa de login (mesmo simples, tipo "5 tentativas por IP a cada 15 min") é algo que sistemas de referência têm e que ainda não está no escopo - vale colocar na lista quando for implementar.

**O que ficou pronto:** signup (já existia, módulo `1-usuario`), login, refresh (com rotação - token antigo é revogado a cada renovação) e logout (módulo `3-auth`), usando as funções que já existiam em `03_funcoes_seguranca.sql` (`registrar_falha_login`, `registrar_login_sucesso`, `liberar_bloqueio_login` - nenhuma função nova precisou ser criada no banco pra isso). **O que continua faltando:** verificação de e-mail e recuperação de senha (dependem do módulo `4-mail`, ainda não construído).

> 🗑️➡️✅ **Rate-limit de login por IP - RESOLVIDO (07-08-2026), texto desta entrada estava desatualizado até 05-09-2026.** Este parágrafo dizia "por IP, não" - isso ficou pra trás: o throttler foi adicionado numa rodada posterior (achado 07-08-2026 do próprio `<dev> Entrar como`, ver comentário em `auth.module.ts`) e ninguém tinha voltado aqui pra atualizar o registro. **Confirmado direto no código (05-09-2026):** `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 (produção) / 30 (dev) }])` em `auth.module.ts`, aplicado via `@UseGuards(ThrottlerGuard)` só em `POST /auth/login` (`auth.controller.login.ts`) - o rastreamento padrão do `@nestjs/throttler` é por IP. Duas travas complementares, não uma substituindo a outra: `registrar_falha_login` bloqueia a CONTA específica (protege contra alguém adivinhando a senha de uma pessoa); o throttler protege o SERVIDOR (protege contra alguém varrendo várias contas diferentes do mesmo IP, cenário que a trava por conta sozinha não pega). O item passa de 🟡 pra considerar esta parte específica **fechada** - resta só o que depende de `4-mail`.

🟡 **7. Guards/interceptors no NestJS - DECISÃO DIFERENTE DA SUGESTÃO ORIGINAL (01-08-2026)**

Espelhando `tem_permissao()` do banco no lado da aplicação.

> Sugestão da *** IA *** (não seguida à risca): pra não correr o risco de as duas camadas (banco e NestJS) divergirem com o tempo, eu geraria a lista de permissões que o guard do NestJS reconhece - a partir da própria tabela `permissao` - (uma consulta na subida da aplicação, ou um script que gera uma constante/enum automaticamente), em vez de digitar a lista de novo à mão no código do backend.

**O que foi feito em vez disso:** nenhum guard do NestJS verifica permissão nenhuma por nome (nem hardcoded, nem gerada). `JwtAuthGuard` (global) só resolve QUEM está logado; `RequireAuthGuard` (por rota) só bloqueia anônimo. A autorização por permissão (`tem_permissao('configuracao_gerenciar')`, `'papel_atribuir'`, etc.) continua 100% do lado do Postgres via RLS - o service só traduz o erro que a RLS já devolve (`código 42501`/0 linhas afetadas) em `403 ForbiddenException`. Motivo da mudança: espelhar seria criar exatamente a segunda fonte de verdade que a sugestão original tentava evitar - mesmo gerando a lista automaticamente na subida, ainda existiriam DOIS pontos decidindo "pode ou não pode" (o guard E a policy), e o guard rodaria ANTES de saber se a condição extra da policy (dono, status da campanha, etc.) se aplica - a RLS quase nunca é só "tem a permissão X", quase sempre é "tem a permissão X OU é o dono OU outra condição de negócio". Deixar só o banco decidir era o único jeito de garantir que as duas camadas nunca divergem, ao custo de descobrir uma negação só na hora da query (mitigado pelo `RequireAuthGuard` pegando o caso mais comum - nem logado - antes disso).

🔴 **9. Validação de escrevibilidade financeira**

`auditoria_financeira` e `repasse` têm policies de escrita `USING (true)` - a RLS não valida quem grava aí, fica 100% a cargo do serviço do NestJS.

> Sugestão da *** IA ***: seguindo o padrão de qualquer plataforma de pagamento séria (inclusive Catarse/Experiment, que também dependem de gateway externo pra processar pagamento), eu isolaria a escrita em `auditoria_financeira`/`repasse` dentro de um único serviço interno do NestJS, chamado só pelo webhook do gateway de pagamento - nunca exposto como um endpoint CRUD genérico que outra parte do app possa chamar por engano.

> Correção de foco (27-07-2026): o risco real aqui não é "ter que escrever a regra duas vezes" (uma vez em SQL, outra no NestJS) - é que hoje, especificamente no caminho do dinheiro (`repasse`, `auditoria_financeira`, `historico_rejeicao`), a RLS está `USING (true)` e não protege nada, exatamente onde mais importaria proteger. Isso já foi testado de verdade: inserir um `repasse` com `valor_liquido = 0` numa campanha `all-or-nothing` abaixo da meta (permitido, RF-038) e depois fazer `UPDATE` pro valor cheio passava direto, sem revalidar a regra all-or-nothing. **Esse teste específico já não funciona mais** - foi corrigido em 27-07-2026 (ver `A3` na seção de resolvidos: `trg_valida_repasse` agora também dispara em `UPDATE`, não só `INSERT`). O ponto de fundo continua válido: `auditoria_financeira`/`repasse`/`historico_rejeicao` seguem com escrita aberta por decisão consciente, então o serviço isolado do NestJS sugerido acima continua sendo a defesa que falta.

> **Trava de dependência (05-09-2026):** este item só pode ser implementado DEPOIS do gateway de pagamento ser escolhido (`PROXIMOS_MODULOS.md`, Grupo 8) - a lógica real de "quando gravar `auditoria_financeira`/`repasse`" só existe quando o webhook do gateway chamar de volta confirmando uma transação; sem gateway, não há webhook, e sem webhook não há destinatário natural pro serviço isolado sugerido acima. Construir esse isolamento antes protegeria um caminho que nenhum código ainda percorre - trabalho sem efeito. **Decisão de produto do Lucas:** não citar mais este item numa lista geral de pendências até o gateway estar definido - quando isso acontecer, este serviço isolado deve ser a PRIMEIRA peça do módulo de pagamento a ser construída, antes até do endpoint de webhook em si (evita a janela em que a escrita fica exposta por alguns commits).

# PENDÊNCIAS E CORREÇÕES DO NEST E DO REACT

Tudo acima desta linha é sobre o banco (`arquivos_banco_dados/*.sql`) - separado de propósito, a pedido do Lucas (01-08-2026), pra não misturar assunto de banco com assunto de Nest/React no mesmo bloco. Pendências e correções de código (backend NestJS, frontend React) entram aqui embaixo, daqui pra frente.

*(A "parte 16" e a "parte 17" - implementação dos módulos `1-usuario`/`3-auth`/`2-papel-permissao`/`11-configuracoes` no Nest e do painel admin no React - foram realocadas pra cá (01-08-2026), de onde estavam misturadas na numeração de partes do banco. A numeração delas (16, 17) é a mesma de antes, só a posição física mudou - mantém a referência cruzada de quem já leu/linkou pra elas.)*

### 🔴 Pendência aberta (lado Nest): falta o endpoint de "encerrar campanha por moderação" - só volta à tona quando `19-denuncia` nascer

A autorização já está pronta no banco (item 57, acima - `campanha_encerrar_moderacao`, concedida a `admin` e `moderador`), mas não existe hoje nenhum controller/service no Nest que execute a transição `ativo → encerrado_moderacao` de verdade - `12-campanha` não tem esse endpoint, e `19-denuncia` (de onde a ação naturalmente parte, depois de uma denúncia julgada procedente) ainda é pasta vazia.

Não é trabalho extra por causa da correção de hoje - é o mesmo trabalho que já estava pendente antes, só que agora, quando alguém escrever esse endpoint (em `12-campanha` ou como parte de `19-denuncia`), a parte de "quem pode fazer isso" já vai estar certa pros dois papéis, sem precisar mexer em RLS/trigger depois.

---

### 🔴 Pendência aberta: refresh token em cookie `HttpOnly`, em vez de `localStorage`

Achado revisando um projeto de referência da disciplina (04-09-2026): hoje o CrowdAcademico guarda o refresh token no `localStorage` do navegador (`use-auth.js`, decisão já documentada - "pra não precisar logar de novo a cada F5"). Um cookie `HttpOnly` com `SameSite=Strict` faz o mesmo papel, mas com uma vantagem real de segurança: o JavaScript da página nunca consegue ler o valor do cookie, então um ataque de XSS (injeção de script malicioso) não consegue roubar o refresh token, mesmo que consiga rodar código na página - com `localStorage`, qualquer script que rode na página consegue ler o token.

**Não é decisão óbvia, nem copy-paste** - trocar exigiria mexer em como o `authFetch`/`use-auth.js` renovam sessão (hoje leem o token direto do `localStorage`; um cookie `HttpOnly` é enviado automaticamente pelo navegador em toda requisição, sem o JavaScript precisar ler nem anexar nada - muda o formato da chamada) e como o backend define/lê esse cookie. Vale uma rodada de análise mais aprofundada de IA antes de decidir - não é pra implementar agora, só registrado pra não esquecer que a opção existe.

---

### 🔴 Pendência aberta: Autenticação em duas etapas (2FA) - vai precisar de RF novo também

Toda banca de TCC de sistema hoje em dia costuma perguntar sobre segurança logo de cara, e 2FA é um dos primeiros itens que costuma vir à tona nessa conversa. Hoje o CrowdAcademico não tem nenhuma camada de 2FA (só e-mail+senha, com bloqueio por tentativas). Quando for implementar, também vai precisar de um RF novo na Etapa 3 descrevendo o requisito (não existe nenhum hoje cobrindo isso).

**Só voltar a levantar este item quando todos os módulos do backend já estiverem prontos** - não é prioridade agora, é o tipo de reforço que faz mais sentido numa reta final, depois que o núcleo (campanha, contribuição, pagamento) já estiver de pé.

---

### 🔴 Pendência aberta: testes automatizados com Playwright no React

O `react/` não tem nenhum teste automatizado hoje (só `build`+`lint`). Um projeto de referência da disciplina (`COCAO_HOTEL_DDL_DML_CRUD_ppw2-main`) tem uma estrutura de testes Playwright organizada em 7 categorias (E2E completo, aceitação/requisito funcional, integração HTTP, API pura, *data-driven*, *snapshot* visual/acessibilidade, interceptação de erro) que pode servir de referência de estrutura, não de conteúdo (os testes deles são específicos do sistema de hotel).

**Vamos usar eventualmente, mas ainda é cedo.** Só voltar a levantar este item quando o sistema estiver completo (todos os módulos prontos) - implementar teste agora, com o backend ainda mudando bastante módulo a módulo, geraria mais retrabalho de manutenção de teste do que benefício.

---

### 🔴 Pendência aberta (15-09-2026, importante, deliberadamente não iniciada): auditoria do painel contra as 10 Heurísticas de Nielsen

O Lucas registrou isto como pendência futura importante, explícito que não é pra começar agora. Exemplo concreto que ele deu: desabilitar silenciosamente um botão ("Próximo"/"Criar"/etc.) quando um campo obrigatório está inválido não é o certo - o certo é deixar clicar e mostrar o problema de verdade (borda do campo em vermelho + mensagem de erro explicando o quê e o porquê). Mapeia direto pras heurísticas #1 (visibilidade do status do sistema) e #9 (ajudar a reconhecer, diagnosticar e corrigir erros) - desabilitar sem feedback é diagnóstico zero.

**Onde esse padrão já existe hoje** (achado no mesmo dia, construindo o wizard de Criar Campanha): `formCriarCampanhaValido` (`bancada-campanha.tsx`) desabilita "Próximo" com base num booleano combinado grande (título, área, meta ≥ mínimo, datas, duração 15-60 dias), só ALGUMAS dessas sub-condições aparecem como aviso inline (meta mínima e duração têm texto vermelho; título/área/pesquisador escolhido não). É o exato antipadrão que ele está descrevendo - provavelmente se repete em outros formulários do painel (Alterar Campanha, Alterar Usuário, etc.) nunca auditados especificamente por isso.

**Como aplicar**: não iniciar varredura proativa. Quando tocar em qualquer formulário com esse padrão de "desabilitar submit se inválido" no futuro, considerar mostrar erro por campo em vez de (ou além de) só desabilitar o botão. Quando o Lucas pedir pra começar essa frente de verdade, o escopo natural é uma auditoria completa em TODOS os formulários de `react/src/views/` contra as 10 heurísticas, não só #1/#9.

---

### 🟡 Especificação registrada (13-09-2026): tela de administração pra `arquivo` (espaço ocupado, órfãos, maiores consumidores) - NÃO construída de propósito

O Lucas pediu detalhamento dessa ideia (citada de passagem pelo Lucas numa rodada anterior, descartada na hora). Resposta completa, registrada aqui pra não se perder - **decisão de não construir agora confirmada pelo próprio Lucas**: poucos arquivos no sistema hoje (todos de teste), a tela mostraria números perto de zero e não responderia pergunta nenhuma de verdade. Momento certo: depois de `18-recompensa`/`15-atualizacao-campanha` estarem em uso real, quando anexos tiverem volume e órfãos aparecerem sozinhos.

**Por que é possível sem nenhum módulo novo**: `arquivo` já guarda `tamanho_bytes` (do arquivo JÁ PROCESSADO, depois da redução - não o que o navegador declarou), `id_usuario_upload`, `tipo_mime`, `criado_em`, `ativo`/`desativado_em`. Com essas 5 colunas dá pra montar o painel inteiro sem consultar o provedor de armazenamento.

**O que a tela mostraria:**
- **Resumo no topo** (4 números): espaço total ocupado (soma de `tamanho_bytes` dos ativos, com % do limite do plano gratuito ao lado); quantidade de arquivos ativos; espaço ocupado por arquivos **desativados** (`ativo = false` - espaço pago sem uso, ninguém saberia que existe sem a tela); quantidade de arquivos **órfãos** (`LEFT JOIN` contra as 3 formas de vínculo que existem - `usuario.id_imagem_perfil`, `arquivo_atualizacao`, `arquivo_recompensa` - filtrando quem não aparece em nenhuma; é o número mais útil, órfão é espaço desperdiçado por definição).
- **Distribuição por tipo** - tabelinha `tipo_mime` × quantidade × espaço somado (responde se o consumo vem de imagem ou PDF).
- **Maiores consumidores** - os 10 usuários com mais espaço ocupado (nome, quantidade, total) - acha abuso antes da cota de 50MB/conta ser atingida.
- **Listagem completa** - `GenericTable` já existente, colunas nome original/tipo/tamanho/quem enviou/data/situação, filtro facetado por tipo e situação.

**As ações, e uma que precisa de cuidado real:** ver arquivo (URL pública, trivial); desativar (soft delete que o esquema já prevê); **excluir órfão de verdade** - esta é delicada porque excluir a LINHA no banco não apaga o OBJETO no armazenamento (uma exclusão pela metade cria um objeto que ninguém mais enxerga). Precisa: remover do armazenamento primeiro, DEPOIS do banco, nessa ordem, registrando em auditoria; se a remoção do armazenamento falhar, a linha do banco não pode ser removida (senão perde o rastro). **Só pra arquivo comprovadamente órfão, nunca vinculado** - arquivo vinculado se remove removendo o vínculo, no módulo dono dele.

**Onde moraria**: backend, `25-arquivo` (módulo já existe, dono natural) - 2 endpoints novos (resumo com agregados, listagem paginada com filtro), ambos protegidos por permissão de administrador. Frontend, uma tela de listagem no padrão já repetido há meses.

---

### 🔴 Pendência aberta (11-09-2026): RF-031 (contestação de score) só faz sentido implementar depois do motor de score estar fechado de vez

RF-031 já tem o texto do requisito escrito (pesquisador abre solicitação de revisão junto ao Administrador se achar uma penalização injusta/desatualizada, mesmo fluxo de análise das denúncias) - mas nunca teve nenhuma implementação (Banco ❌, Nest ❌ na `MATRIZ-RASTREABILIDADE-RF.md`, confirmado no item 59 acima).

**Ponto levantado pelo Lucas (11-09-2026):** construir o fluxo de contestação antes do motor de score estar com as regras de cálculo fechadas de vez não faz sentido - estaria montando um processo de revisão pra contestar um número cuja fórmula ainda pode mudar por baixo. O item 13 (Lista C, acima) já fechou 4 decisões pontuais de regra (denúncia improcedente, dupla penalização, encerramento antecipado, reconhecimento de GitHub), mas o próprio painel (`PainelScore`, Campo de Testes T1/T2, ambos Consultar e o card solto) ainda exibe um aviso explícito dizendo que "a regra de negócio de pontuação (pesos e dimensões) ainda não foi fechada, os números são só uma prévia da estrutura" - ou seja, mesmo com aquelas 4 correções pontuais, o motor como um todo (pesos por dimensão, principalmente) continua sinalizado como provisório na própria interface.

**Não resolvido ainda se esse aviso está desatualizado ou genuinamente reflete o estado atual** - só registrado aqui que RF-031 depende dessa resposta antes de virar trabalho técnico de verdade. Ordem sugerida: (1) decidir se o motor de score está de fato fechado (e, se estiver, tirar o aviso "ainda não está pronto" da interface); (2) só depois disso implementar RF-031 (Banco + Nest).

---

### 🟡 Achados da revisão externa da v23 (19-09-2026, outra IA olhou o zip) - registrados, NADA iniciado, levar pro próximo prompt de revisão

Conferido no repositório antes de anotar: as afirmações abaixo batem com o código.

**1. Multer: aplicar `overrides` no `nest/package.json` (higiene, não urgência).** `@nestjs/platform-express` fixa `multer: "2.2.0"` (confirmado no `package-lock.json`) com 4 falhas de negação de serviço via multipart malformado. Nenhuma ocorrência de `multer`/`FileInterceptor`/`UploadedFile` em `nest/src` (upload é por URL pré-assinada, nunca passa pelo Nest), então o risco prático é zero por inalcançabilidade. Correção é só para o `npm audit` sair limpo (um professor do TCC pode rodar o comando). Opção escolhida como recomendada: `overrides` pro `multer@^2.4.0`, depois testar upload de avatar por rigor. Descartada: `npm audit fix --force` (arrasta o Nest pra v12). O texto de `ACHADOS_PARA_DISCUTIR.md` diz que o módulo 25-arquivo usa multer "por baixo" - isso está errado, corrigir lá. **RESOLVIDO em 20-09-2026** (ver a última entrada deste arquivo): `overrides` aplicado, `npm audit` 6 altas -> 0.

**2. Tela de admin pra `score_config`/`score_rotulo` não existe.** RF-027/RF-028 afirmam que o score é configurável pelo admin, mas hoje só dá pra editar pelo Supabase (zero ocorrência no `react/src`; no Nest só há leitura, em `perfil-pesquisador` e `usuario.service.exportar-dados`). Única divergência concreta entre requisito escrito e sistema real que sobrou da lista antiga. Falta verificar se existe CRUD no backend ou se precisa criar também.

**3. Decisão em aberto: a lógica de criar campanha mora em `bancada-campanha.tsx` (1852 linhas, maior arquivo do frontend).** `views/12-campanha` só tem listar e consultar; módulos 13 a 17 do backend (orçamento, marco, atualização, seguir, comentário) não têm tela real; `checkout/`, `dash-doador/`, `dash-pesquisador/` existem vazias. O wizard de 3 etapas (Dados/Orçamento/Cronograma) e o `PainelOrcamentoCronograma` foram construídos dentro da bancada e estão acoplados a ela. Risco: quanto mais amadurece ali, mais caro transplantar. Contra-ponto: Campo de Testes é permanente. Decisão do Lucas: tela real de criar campanha entra antes ou depois da entrega do TCC? Sugestão inicial: extrair `PainelOrcamentoCronograma` e o wizard pra `components/`/`views/12-campanha` reutilizáveis antes do arquivo crescer mais.

**4. Cor: 7 usos de `var(--color-*)` cru em `4-componentes.css` (linhas ~37, 62, 63, 77, 78, 185, 221) + footer.** São `--color-white`, `--color-red-600`, `--color-emerald-600` (paleta utilitária do Tailwind, não a marca; um deles é o `.btn-sucesso` criado em 15-09). Decidir: cores de estado (branco/vermelho/verde) ganham alias em `1-cores.css` ou ficam como exceção documentada. Também sobram ~28 classes de cor crua no JSX, 13 delas no `footer.tsx` (tons de slate) e 2 no `header.tsx` - o rodapé é a última ilha não migrada.

**Pontos positivos apontados (não são pendência):** zero `any`/`@ts-ignore`; `dados: unknown` fechado nos 13 arquivos de request; `undefined as T` corrigido em `papel-permissao.api.ts`; `--opacidade-brilho-marca` parametrizada; `BlocoLogAuditoria` extraído; guarda de alteração não salva em 7 modais; gate `import.meta.env.DEV` no Campo de Testes.

---

### 🟡 Pendência aberta (21-09-2026, auditoria de comentários): os `.sql` voltaram a ser "sujos" de comentário, e boa parte dos porquês já poderia morar na documentação

O `DOCUMENTACAO_BD.md` nasceu justamente porque o banco estava cheio de comentário, e o objetivo dele diz "manter os scripts `.sql` enxutos". Medido em 21-09-2026 (linhas que começam por comentário, sobre as linhas não vazias):

| Área | Arquivos | Linhas de comentário | % das linhas não vazias | Maior bloco único |
|---|---|---|---|---|
| `arquivos_banco_dados/*.sql` | 9 | 4732 | 49% | 67 linhas (`07`) |
| `05_regras_negocio.sql` | 1 | 1959 | 54% | 58 linhas |
| `06_grants.sql` | 1 | 339 | 74% | 37 linhas |
| `03_funcoes_seguranca.sql` | 1 | 575 | 53% | 53 linhas |
| `nest/src` (TypeScript) | 413 | 3016 | 21% | 43 linhas |
| `react/src` (ts/tsx) | 144 | 4046 | 23% | 56 linhas (`generic-table.tsx`) |
| `react/src/assets/css` | 10 | 963 | 50% | 41 linhas |

Só nos `.sql` há 9 arquivos com pelo menos um bloco único de 15 linhas ou mais, 30 arquivos no Nest e 36 no React.

**O que já foi feito nesta rodada:** os comentários que ESTA rodada escreveu nos `.sql` (cerca de 520 linhas, 356 só no `05`) foram reduzidos a 2 a 6 linhas cada, com um ponteiro para `DOCUMENTACAO_BD.md`, seção [05-K-2-B], e os porquês que só viviam neles foram movidos para lá. Testado depois: banco reconstruído do zero e as 79 verificações do PGlite continuam passando.

**O que NÃO foi feito, por ser decisão sua:** migrar o restante (os comentários datados de 28-07 a 15-09, que são histórico de correção de auditorias) para a documentação. Proposta, se quiser seguir: (1) regra única para os `.sql`: cabeçalho de função com no máximo 6 linhas (nome, assinatura, bloco `[NN-Y]`, regra em 1 frase, ponteiro), o resto no `DOCUMENTACAO_BD.md`; (2) começar pelo `06_grants.sql` (74% é comentário) e pelo `05`, que concentram o volume; (3) no Nest e no React, mover os blocos de 15 linhas ou mais para as seções de `DOCUMENTACAO_BACKEND.md`/`DOCUMENTACAO_FRONTEND.md` e deixar um ponteiro de 1 a 2 linhas. Antes de apagar qualquer comentário, conferir que o porquê já está escrito na documentação, senão só mover.

---

### 🟢 CORRIGIDO (23-09-2026): 5 itens pequenos e seguros de uma revisão externa (sidebar, trigger de marcos, aria-describedby, camadas de serviço, EXCLUDE em score_rotulo)

Decisão do Lucas: aprovar item por item, deixando de fora só o que era decisão de negócio (reputação duplicada, congelar recompensa, modelo flexível - continuam pendentes acima) e adiando os testes/gate de produção pra mais adiante ("ainda é cedo").

**Sidebar (item desabilitado).** `admin-sidebar.tsx`: `<button disabled>` saía do fluxo de foco por teclado, então a dica "Ainda não implementado" só chegava a quem passava o mouse. Trocado por `aria-disabled="true"` sem `disabled`, com a classe `dica` movida pro próprio botão (sem wrapper `<span>`) - zero mudança visual, item agora focável por Tab. Conferido: nenhum `onClick` nesses 4 itens, então não há nada a bloquear com o `disabled` real removido.

**Trigger de revalidação dos marcos.** `fn_valida_data_marco_cronograma` (existente) só disparava por escrita em `marco_cronograma`, nunca por escrita em `campanha` - um `PATCH /campanha/:id` comum mudando `data_inicio` pra frente deixava marcos anteriores ao novo início sem erro nenhum. `fn_valida_data_inicio_contra_marcos()`/`trg_campanha_valida_data_inicio_contra_marcos` (nova, `BEFORE UPDATE` só quando `data_inicio` muda) fecha isso, mesmo ERRCODE 90008 da trigger irmã. `deslizar_datas_campanha()` não sofria disso (move os marcos manualmente).

**`aria-describedby` nos 5 campos com validação inline já existente** (`modal-criar-area-conhecimento`, `modal-criar-configuracao`, `modal-criar-tipo-link` ×2, `modal-tipo-link`) - `useId()` liga o `<input>` ao `<p>` de erro/ajuda, sem mudar nada visível. Os ~65 campos sem `htmlFor` continuam de fora, sem lógica de erro pronta esperando por eles.

**Camadas de serviço `13-orcamento-campanha`/`14-marco-cronograma`.** Tipos e API extraídos de dentro de `bancada-campanha.tsx` (onde viviam como interface local com shape inferido do próprio uso) pro molde padrão do projeto. Só as 2 chamadas de LEITURA (`listar`) passaram a usar a API nova - as 6 chamadas de ESCRITA continuam via `chamarERegistrar` de propósito, pra não perder o registro em T4 (Registro de Chamadas).

**`EXCLUDE` em `score_rotulo`.** Nada impedia 2 faixas ATIVAS se sobreporem (um erro de digitação no `score_maximo` de uma faixa, por exemplo), e `recalcular_score_pesquisador` faz `SELECT ... LIMIT 1` sem `ORDER BY` sobre elas - o mesmo score podia cair num rótulo diferente em execuções diferentes. `EX_SCORE_ROTULO_SEM_SOBREPOSICAO`, `EXCLUDE USING gist (int4range(...) WITH &&) WHERE (ativo = TRUE) DEFERRABLE INITIALLY DEFERRED`. O `DEFERRABLE` foi testado especificamente: 2 `UPDATE`s na mesma transação que passam por um estado intermediário sobreposto mas terminam corretos no fim **não** são recusados; uma sobreposição que ainda existe no `COMMIT` é.

**Achado no meio do caminho, e por isso NÃO migrado: `footer.tsx`.** A lista original também pedia migrar as 9 classes `text-slate-*` do rodapé pros tokens de tema. Conferido antes de tocar: o rodapé usa `bg-dark` (`--color-dark`, fixo, só em `:root`, nunca sobrescrito nos blocos de tema) - é uma seção **deliberadamente sempre escura**, diferente das outras 5 ilhas migradas. Trocar pra `--cor-texto`/`--cor-texto-fraco` (que TROCAM de valor com o tema) quebraria o contraste em tema claro, porque o fundo do rodapé continua escuro sempre. Se um dia for migrado, precisa de tokens fixos próprios (mesmo espírito de `--cor-dev-*`), não os tokens de tema normais - registrado aqui, não decidido. `dev-login-rapido.tsx` também ficou de fora, por ser ferramenta de dev e menor prioridade.

**Como foi verificado.** `tsc --noEmit`, `eslint --fix` e `npm run build` limpos no React (nenhuma mudança no Nest nesta rodada). As 2 mudanças de banco testadas com PGlite: 9 verificações da trigger e do `EXCLUDE` (incluindo o comportamento `DEFERRABLE` especificamente), reconstrução do banco inteiro do zero (`01` a `08`) sem erro, e o patch aplicado 2x sobre um banco no estado antigo (idempotência - a 1ª versão do patch falhava na 2ª rodada por faltar `DROP CONSTRAINT IF EXISTS`, corrigido antes de fechar).

**No `ATUALIZAR O SUPABASE.sql`:** bloco único, sem enum novo, pode colar tudo de uma vez.

---

### 🟢 CORRIGIDO (23-09-2026): mais 2 triggers de score (soma de pesos = 100, cobertura sem buraco em score_rotulo)

Continuação da recapitulação de pendências do mesmo dia - itens "checagem de que os 4 pesos somam 100" e "trigger contra buraco entre faixas de score_rotulo" (o `EXCLUDE` do item anterior só resolve sobreposição, não buraco).

**`trg_score_config_soma_pesos`.** Nada impedia os 4 pesos raiz de `score_config` (`id_pai IS NULL`) somarem outra coisa que não 100 - `score_rotulo` assume implicitamente que o score máximo possível é 100 (faixa "Referência" vai até 100). ERRCODE `90017`.

**`trg_score_rotulo_cobertura`.** Exige que as faixas ATIVAS cubram exatamente 0 a 100 sem buraco, via `LEAD() OVER (ORDER BY score_minimo)` comparando cada faixa com a próxima. ERRCODE `90018`.

**Por que `CONSTRAINT TRIGGER`, não trigger comum.** Só `CONSTRAINT TRIGGER` pode ser `DEFERRABLE` - sem isso, editar várias linhas em UPDATEs separados (um por vez, sem transação escrita à mão) reprovaria o 1º UPDATE sozinho mesmo que o conjunto final estivesse certo. Postgres só aceita `CONSTRAINT TRIGGER` como `FOR EACH ROW` (nunca `FOR EACH STATEMENT`) - as 2 funções ignoram `NEW`/`OLD` de propósito e sempre reconferem o agregado da tabela inteira, disparando 1x por linha afetada mas só valendo o resultado no `COMMIT` final.

**Como foi verificado.** PGlite (`score_triggers.mjs`, 8 verificações): transação com estado inválido no meio mas válido no fim passa; terminar errado falha com o ERRCODE certo; para os 2 triggers. Reconstrução do banco inteiro do zero sem erro. Patch em `ATUALIZAR O SUPABASE.sql` testado 2x sobre um banco simulado já populado (idempotência).

**No `ATUALIZAR O SUPABASE.sql`:** novo bloco, mesma data, logo depois do bloco anterior - sem enum novo, pode colar tudo de uma vez.

---

### 🟢 CORRIGIDO (23-09-2026): 3 lotes mecânicos (NavegacaoPagina, distinguir404ou403, htmlFor)

Aprovados pelo Lucas ("Sim, os dois agora"), zero mudança de comportamento.

**NavegacaoPagina.** Núcleo "Página X de Y / Anterior / Próxima" extraído de `RodapePaginacao`; `LogAuditoriaPainel` deixou de duplicá-lo.

**distinguir404ou403.** Helper em `commons/database/distinguir-404-ou-403.util.ts` substitui o bloco de sondagem 404-vs-403 em 23 services. **4 ficaram de fora de propósito:** `usuario.service.update` (filtro `deletado = false`), `campanha.service.enviar` (lê `status` p/ 2 mensagens), `papel-permissao.service.remove` e `usuario-papel.service.remove` (chave composta). Se quiser cobri-los, o helper precisa aceitar condições extras.

**htmlFor.** `useId()` + `htmlFor`/`id` em todos os campos com rótulo (21 arquivos). Rótulo de grupo de checkboxes virou `<span>`.

**Verificação.** `tsc`, `eslint` e `build` limpos em react/ e nest/. Sem teste de UI ao vivo (clicar no rótulo focar o campo) - fica para o próximo Playwright.

---

### 🟢 TESTADO AO VIVO (24-09-2026, Playwright, outra sessão): backlog de dicas, formulários, Criar Campanha, rascunho e rejeição, endosso, 404/403

Tudo do backlog passou, com achados. Dados de teste (prefixo ZZ-PW) removidos; ficaram só as linhas do log_auditoria.

**Corrigidos no mesmo dia:**
- **Dicas do cabeçalho cortadas** (A-, A+, tema, sino): a bolha abria para cima, fora da tela. Agora `baixo`.
- **F5 em T2/T3 com lista incompleta** (10 em vez de 20): a busca disparava antes de a sessão ser restaurada. Os efeitos agora esperam `auth.carregando`.
- **Texto de Excluir campanha** dizia "aguardando aprovação"; o código só libera rascunho. Texto corrigido.

**Abertos, decisão sua:**
- **Contraste WCAG AA:** `btn-primary` (branco no verde da marca) 3,59:1 nos dois temas; `badge-sucesso` 3,32:1 no claro; botões verdes da matriz 3,77:1 no claro. Consertar exige escurecer o verde ou trocar a cor do texto; mexe na identidade da marca.
- **Endosso por quem não é dono nem autor** devolve 404 "Comentário não encontrado", não 92008. Só o autor tentando endossar o próprio comentário recebe 403 com a mensagem certa. Provavelmente RLS escondendo o comentário, a confirmar.
- **Códigos 9xxxx não vêm no corpo do erro HTTP**, só a mensagem (o cliente não consegue distinguir por código).
- **Campanha ativa em T2 (Alterar):** os campos não ficam travados na tela; o banco recusa ao salvar com mensagem amigável e o modal continua aberto. Só registro, não é erro.

**Ainda sem teste ao vivo:** 91026 (prazo de reenvio vencido) e 92009 (pesquisador suspenso); as funções `expirar_campanhas_rascunho`/`expirar_campanhas_rejeitadas`; as triggers de score; 403 nas rotas de link acadêmico, link de atualização, atualização de campanha, papel e termos de uso; rodapé de paginação do T4; upload de avatar e de `arquivo_atualizacao`; sidebar em tela estreita; F5 em T3 depois do conserto.

---

### 🟡 Pendência aberta (24-09-2026): modelo de campanha `flexivel` existe no banco, no seed e no V7, mas o sistema não o exercita de ponta a ponta

Apontado pela revisão externa (resposta de 20-09) como "metade dos modelos não existe". Conferido: o **REQUISITOS_V7 promete os dois modelos**, então a pergunta "manter ou tirar o valor do enum" não se aplica; o enum fica. O que falta é implementar o lado flexível:

- **Criação:** o wizard (`corpoDadosCampanha()`) não envia `modelo`, então toda campanha nasce `all-or-nothing`. O DTO de `PATCH` também não aceita `modelo`, de propósito (mudar o modelo depois de criada é decisão de produto em aberto, comentário em `campanha.request-update.ts`).
- **Regras do banco:** existem `fn_valida_repasse_all_or_nothing` e `validar_contribuicao_all_or_nothing`, mas nenhuma regra correspondente para o flexível (repasse independente de atingir a meta, com a taxa descontada).
- **Encerramento:** o requisito de encerramento do flexível (repasse registrado com valor bruto, taxa, líquido e indicação de meta atingida ou não) não tem implementação.
- **Aviso ao doador:** o aviso destacado e a confirmação de ciência antes da contribuição dependem da tela de checkout, que não existe.
- **Só existe em dado:** `07_seed_dados.sql` tem uma campanha flexível (a do repasse `parcial_processando`), e o tipo aparece em `db.types.ts` e `campanha.type.ts`.

**Depende de:** módulo de contribuição/pagamento (Grupo 8) e checkout. Não iniciar antes. Quando esses módulos nascerem, decidir também se o modelo pode mudar depois de criada a campanha.

---

### 🟢 CORRIGIDO (24-09-2026): revisão externa (triggers, hardcoded, pendências), lote de baixo risco

A revisão externa respondeu ao prompt de 24-09 com um documento, um patch de banco, um patch do motor de score e um teste PGlite. Conferi contra o código e o banco antes de aplicar: **os números batem** (rodei o teste do patch: 12 de 25 falhavam no estado anterior, 25 de 25 com o patch; contrastes recalculados por conta própria; funções do patch comparadas com a fonte real). A revisão não alucinou, mas **errou em um ponto e deixou outro incompleto** (abaixo).

**Correções ao meu próprio prompt (a revisão estava certa):** `POST /campanha` do pesquisador **já existe** (`campanha.controller.create.ts`, com `RequireAuthGuard`); o que falta é a tela real. O rate limit de login por IP **já existia** (resolvido em 07-08-2026, ver a entrada antiga desta lista). O 404 do endosso por terceiro **está correto** (a `pol_comentario_select` esconde o comentário não endossado de quem não é autor nem dono; um 403 confirmaria que existe um comentário privado). Não "consertar" isso.

**Fechado agora**
- **Dados pessoais expostos sem login (o achado mais sério).** `GET /usuario`, `GET /usuario/:id`, `GET /usuario-papel`, `GET /usuario-papel/:idUsuario` e `GET /dashboard/resumo` não tinham guard: um visitante anônimo obtinha os e-mails de todos, quem é administrador e métricas internas. As 5 rotas agora exigem login (`RequireAuthGuard`). `GET /usuario/:id/logins` e `/termos-aceitos` ficaram como estão (a RLS deles já protege). Todos os chamadores no React são telas de admin com token. **Ainda aberto:** quem está logado (um pesquisador) continua vendo a lista de usuários; ver "decisões" abaixo.
- **Banco, Grupo A e Grupo B** (no fim do `ATUALIZAR O SUPABASE.sql` e já incorporados a `01`, `03`, `05` e `06`; detalhe em `DOCUMENTACAO_BD.md`, `[05-K-2-C]`): limite de texto e de simultâneas só na entrada (baixar o limite travava doação e o job de encerrar), total arrecadado com privilégio próprio (a doação do próprio doador sumia do total em silêncio), peso de subitem desativado vale 0, soma dos pesos também ao desativar/apagar, job de rejeitadas resiliente, score no log, `p.codigo` no dashboard, máquina de estados por permissão, `UPDATE` por coluna em `campanha`, `CHECK` do tipo de configuração, histórico de rejeição obrigatório (91028).
- **Erro encontrado no patch da revisão, corrigido:** o endurecimento da máquina de estados quebrava o "Enviar para aprovação" e o "Corrigir e reenviar" do Campo de Testes (o admin recebia 92001 ao enviar rascunho de outra pessoa). O teste do patch só cobria o envio como dono. Acrescentei a aresta para `campanha_editar` (só o admin), e testei como `app_nestjs`.
- **Nest:** `codigo` (SQLSTATE) no corpo do erro (contrato em `DOCUMENTACAO_ERRCODE.md`); `modelo` da campanha só aceita `'all-or-nothing'` por enquanto; "Hello World" e os dois testes de gerador removidos (`jest` com `passWithNoTests`).
- **React:** `LIMITE_ENDOSSOS` vem de `configuracoes`; contraste WCAG AA (tokens novos, marca inalterada; tabela em `DOCUMENTACAO_FRONTEND.md`).

**Verificação.** Banco: reconstruído do zero a partir das fontes (25/25); banco no estado antigo mais Grupo A e B aplicados **duas vezes** (25/25); aprovar, rejeitar e enviar como `app_nestjs` com sessão de usuário. Nest e React: `tsc`, `eslint` e `build` limpos. **Pendente de você:** colar o Grupo A e depois o Grupo B do `ATUALIZAR O SUPABASE.sql` (rodar antes a consulta de conferência do item da configuração, no comentário do Grupo B). **Sem teste ao vivo** (Playwright): as 5 rotas devolvendo 401 sem login, o visual dos botões e badges verdes nos dois temas, e T2 enviando rascunho como admin depois do patch.

**Decisões suas, do que sobrou (nada feito, tudo em detalhe no documento da revisão)**
- **Lista de usuários para quem está logado:** exigir permissão (`usuario_visualizar_sensivel`) além do login, e checar `relatorio_visualizar` dentro de `contar_metricas_dashboard()`. O guard sozinho só fecha o anônimo.
- **Motor do score (Parte C):** subitem como proporção do peso da dimensão, reputação medindo denúncias contra o perfil **e** contra as campanhas (hoje as de campanha nem contam, apesar do requisito). Números sugeridos pela revisão: 10 pontos para perfil, 15 para campanhas, 3 denúncias zeram cada parte. Os números são seus e da Alexia. Patch pronto, testado, **não aplicado**.
- **Retenção do `log_auditoria`:** a revisão sugeriu 365 dias numa chave de configuração, com job diário. Não implementado.
- **Tom do verde do texto no tema escuro** (`#2fbf71`, sugestão da revisão, já aplicado como valor provisório).
- **Guardar a suíte PGlite no repositório** (`arquivos_banco_dados/testes/`, um arquivo por módulo). A revisão discordou de esperar; você decidiu esperar. Nota: a suíte atual carrega o `ATUALIZAR O SUPABASE.sql`, que é temporário.
- **`SENHA_DEV` e `registros-bloqueados` atrás de `import.meta.env.DEV`:** feito depois, ver a entrada seguinte.

**Achados da revisão que ficaram para depois (sem urgência, sem dependência de módulo)**
- Dispatcher único de triggers em `campanha` (17 triggers, 11 em `BEFORE UPDATE`, ordem alfabética implícita) e em `comentario` (8), com `ordem_endosso` indo para o banco (a corrida de dois endossos simultâneos deixa de existir). Versão pequena: renomear com prefixo numérico.
- `fn_campanha_situacao_reenvio()` (a regra de reenvio hoje está em 3 lugares, um deles em TypeScript), `fn_status_pos_aprovacao()`/`fn_status_terminal()` (listas de status repetidas 5 vezes), função única de campos bloqueados por status (resolve o Alterar campanha ativa que não trava os campos, com aviso visível e `readOnly`).
- Configuração global que não se apaga nem se desativa, e coerência entre mínimo e máximo (`prazo_minimo` maior que `prazo_maximo` trava todo envio sem mensagem clara).
- Log de auditoria só com o diff dos campos que mudaram; índice BRIN em `log_auditoria`; `(SELECT tem_permissao(...))` nas policies (o maior ganho de desempenho disponível); índices (`idx_campanha_status` sobra, `historico_rejeicao(id_usuario_dono)` falta).
- Tipos gerados do banco (`kysely-codegen` sobre o PGlite) no lugar de `db.types.ts` escrito à mão, e enums do React gerados do catálogo.
- Bloco SQL "modo produção" que remove as permissões das ferramentas de teste do admin (a barreira real deve ser o banco, não `NODE_ENV`); CORS com lista e refresh token em cookie `HttpOnly` juntos, no deploy.
- Hook `useErrosFormulario` (versão pequena do `<CampoValidado>`), seguindo a heurística 9 de Nielsen, começando pelo wizard de campanha.
- Sinalização de score baixo na fila de aprovação (`fn_precisa_revisao_score` existe e ninguém chama; é requisito do V7 sem implementação).
- Seed: as campanhas 2 e 5 estão `sucesso` com arrecadado abaixo da meta (estado que o próprio banco proíbe no caminho automático); o seed deixa de desligar trigger pelo nome (`session_replication_role = replica`); renomear `08_trigger_signup_usuario.sql` (não tem trigger).
- Documentação: `DOCUMENTACAO_BD.md` e `DOCUMENTACAO_BACKEND.md` ainda citam contagens de agosto (116/117 policies, 66/72 triggers).
- **O maior risco para a banca, segundo a revisão:** o fluxo principal do produto (pesquisador cria e envia campanha, admin aprova numa fila, visitante vê a página pública) ainda não tem tela real fora do Campo de Testes. Ordem sugerida: "Minhas campanhas" do pesquisador com o wizard extraído da bancada, fila de aprovação do admin, página pública. Os três usam endpoints que já existem.

---

### 🟢 CORRIGIDO (24-09-2026): `SENHA_DEV` fora do pacote de produção (item que tinha ficado adiado)

`SENHA_DEV` (`DevTcc123!`) e o cartão `<dev>` de "Redefinir senha dev" do modal de Alterar Usuário estavam no `dist` de produção. Agora só existem com `import.meta.env.DEV` (constante do Vite, não vem de `.env`). Conferido no build: produção com zero ocorrências, build em modo desenvolvimento com as duas presentes. `tsc`, `eslint` e `build` limpos. **`registros-bloqueados.ts` já estava fora do build de produção** (só telas do Campo de Testes o importam, e as rotas delas são criadas só com `DEV`), então não foi alterado. Nenhum `.env` foi tocado. Sem teste ao vivo: abrir Alterar Usuário em `npm run dev` e conferir que o cartão `<dev>` continua aparecendo.

---

### 🟢 CORRIGIDO (24-09-2026, mesmo dia, 3º lote): mínimo não passa do máximo nas configurações, constante 500, script de contraste, contagens da documentação

Lote de baixo risco, sem decisão sua, escolhido da lista do que faltava.

- **Mínimo maior que o máximo nas configurações (Grupo C do `ATUALIZAR O SUPABASE.sql`, também em `05`).** O painel de Parâmetros edita uma chave por vez e nada impedia `prazo_minimo = 70` com `prazo_maximo = 60`: nenhuma campanha conseguia mais ser enviada, sem mensagem clara (idem orçamento e cronograma). Nova constraint trigger `trg_configuracoes_pares_min_max` (ERRCODE 90019) para 4 famílias de par: prazo, itens de orçamento, marcos de cronograma e tamanho de arquivo (mínimo contra os dois máximos). Mensagem de alerta no banco (diz o par e a ordem certa de editar, com os valores em `dados`) **e** caixa de aviso no modal de Alterar Parâmetro. **Não altera nenhum dado**, só barra a próxima escrita invertida. Testado no PGlite: 5 casos que passavam por engano agora são barrados (12 de 12); suíte anterior 25 de 25, reconstruindo do zero **só com os arquivos 01 a 08** (que é como a Alexia recria o banco em sala, sem o ATUALIZAR) e também aplicando o bloco 2x sobre o estado do seu último commit. **Você precisa colar o Grupo C** (a consulta de conferência opcional está no comentário do bloco).
- **Constante `TAMANHO_PAGINA_MAXIMO_API`** no lugar do `500` escrito à mão em 2 arquivos de API do React.
- **`npm run contraste`**, guarda contra regressão de contraste (40 medições, 0 abaixo de 4,5:1). Testado com falha proposital.
- **Documentação:** contagens antigas (66 e 72 triggers, 42 `RAISE`) trocadas por uma contagem datada de 24-09-2026 e um aviso para não repetir número fixo em outros documentos (78 triggers, 121 policies, 93 funções, 59 códigos de erro); os problemas já conhecidos dos módulos 22 e 23 anotados em `PROXIMOS_MODULOS.md`; código 90019 em `DOCUMENTACAO_ERRCODE.md` (o cabeçalho tinha dito 57 códigos, o certo antes do 90019 era 58, agora são 59).

**Sem teste ao vivo:** o aviso amarelo no modal de Alterar Parâmetro (abrir `prazo_minimo_campanha_dias` e conferir o texto) e a recusa ao salvar um mínimo acima do máximo. **Descartado a seu pedido:** o registro das mudanças de banco (`schema_migrations`), porque a Alexia recria o banco do zero em sala (`DROP SCHEMA public CASCADE` e rodar os 8 arquivos), então não há banco divergente para conferir.

---

### 🟢 CORRIGIDO (24-09-2026, mesmo dia, 4º lote): regra de reenvio numa função só e listas de status com nome (Grupo D)

- **A conta do ciclo de reenvio de campanha rejeitada morava em 3 lugares** (`fn_valida_transicao_campanha`, `expirar_campanhas_rejeitadas` e uma recontagem em TypeScript no `findOne` do Nest), cada um com os padrões 3 (reenvios) e 30 (dias) repetidos. Agora existe `fn_campanha_situacao_reenvio(id)` (devolve `rejeicoes`, `reenvios_restantes`, `somente_leitura`, `prazo_reenvio_ate`), `SECURITY DEFINER`. A transição, o job de expiração, `fn_campanha_reenvios_esgotados` (agora só um embrulho) e o `GET /campanha/:id` usam a mesma função. Efeito prático: os números da tela são exatamente os que o banco vai decidir, inclusive para um admin sem `campanha_rejeitar`.
- **Listas de status com nome:** `fn_status_pos_aprovacao` (5 status) nas 3 funções de congelamento e `fn_status_terminal` (4 status) em `fn_preenche_encerramento_campanha`. As outras listas parecidas (regra pública da policy da campanha, dimensões do score) **ficaram como estão de propósito**, porque significam outra coisa.
- **Não altera dado nem enum**, só `CREATE OR REPLACE` de funções; as triggers continuam apontando para os mesmos nomes. Bloco idempotente no fim do `ATUALIZAR O SUPABASE.sql` (Grupo D), também em `05` e `06`.
- **Testes (PGlite):** 25 de 25 casos de reenvio, congelamento e `encerrado_em` (que já passavam antes da troca e continuam), 12 de 12 do par mínimo/máximo, 4 de 4 como `app_nestjs`, reconstruindo só com os arquivos 01 a 08 e também aplicando o bloco 2x sobre o estado do commit anterior. Nest: `tsc`, `eslint` e `build` limpos.
- **Ordem obrigatória:** colar o Grupo D no Supabase **antes** de subir o Nest novo; sem a função, `GET /campanha/:id` de uma campanha `rejeitado` responde 500. **Sem teste ao vivo** (Nest + Supabase reais): conferir abrindo uma campanha rejeitada e vendo `reenviosRestantes`, `prazoReenvioAte` e `somenteLeitura`.

- **Grupo E (achado ao vivo no mesmo dia).** Ao percorrer o ciclo real (criar, enviar e rejeitar 4 vezes pela API), o 5º envio de uma campanha já **somente leitura** passou (201) quando quem enviava tinha `campanha_editar` (admin). A aresta `campanha_editar` da transição (criada para o admin poder enviar campanha de outro no Campo de Testes) vinha ANTES da checagem de reenvio esgotado, que só existia na aresta do dono; a regra "somente leitura para qualquer perfil, inclusive o Administrador" estava furada. Agora a checagem 91025 é uma só, antes das duas arestas. Reproduzido no PGlite no estado anterior (falhava) e corrigido (27 de 27). **Cole o Grupo E** (fim do `ATUALIZAR O SUPABASE.sql`). O prazo vencido (91026) continua só na aresta do dono de propósito: campanha rejeitada vencida é apagada pelo job, então não vale abrir outra exceção. Números do ciclo conferidos ao vivo: 3, 2, 1 e 0 reenvios restantes, com `somenteLeitura` true na 4ª rejeição, e o `findOne` do Nest lendo `fn_campanha_situacao_reenvio` no Supabase real.

- **Verificação ao vivo (Nest e Vite reais, Supabase real, Playwright) e limpeza (24-09-2026, mesmo dia).** As 5 rotas com guard devolvem 401 sem login; o ciclo de reenvio foi percorrido pela API (3, 2, 1 e 0 restantes, somente leitura na 4ª rejeição); o aviso amarelo do modal de Alterar Parâmetro aparece e a recusa 90019 (mínimo 70 com máximo 60) chega ao modal com a mensagem do banco, sem alterar o valor (continua 15); o card `<dev>` aparece em `npm run dev`; o botão primário está em `#0b7a45` com texto branco. A campanha de teste (id 33) foi apagada. **Ainda sem ver ao vivo:** 91026 (exige 30 dias de espera ou mexer na data no banco), 92009, os 403 de link acadêmico/atualização/papel/termos, paginação do T4, upload de avatar, sidebar estreita. Console do navegador mostrou 400 (a recusa esperada), 2 respostas 401 e 1 404 sem causa investigada (provavelmente a checagem de sessão antes do login).
- **Contagens da documentação refeitas** depois dos Grupos D e E: 97 funções (70 em `05`, com a limpar_log_auditoria do Grupo F, 26 em `03`, 1 em `08`), 59 códigos de ERRCODE (a linha dizia 57), 121 policies, 78 triggers, 42 tabelas, 49 índices em `02`.
- **Caça a valor fixo no SQL:** nada de regra de negócio numérica escrita à mão em `03` e `05` fora do padrão `config_numero(chave, padrão)`; os 24 padrões no código são IGUAIS aos valores do seed (conferido chave a chave), então não há desvio entre fallback e banco. Único achado: `CUSTO_BCRYPT` repetido em 2 services do usuário, agora uma constante só (`CUSTO_BCRYPT_SENHA`, `1-usuario/constants/usuario.constants.ts`); o do refresh token continua separado de propósito.

### 🟢 CORRIGIDO (24-09-2026, mesmo dia, 5º lote): retenção do `log_auditoria` (Grupo F)

Decisão do Lucas: ir com a sugestão da revisão externa (era a pendência "Retenção do `log_auditoria`", adiada desde 11-08-2026).

- Chave `log_auditoria_retencao_dias` (365, `configuracoes`, seed em `07`), função `limpar_log_auditoria()` (`05` `[05-L]`, grant em `06`), job `LogAuditoriaServiceLimpar` (`@Cron` diário 3h, módulo `27-log-auditoria`) e o índice de data do log trocado para BRIN (`02`). **Cole o Grupo F** (fim do `ATUALIZAR O SUPABASE.sql`, depois do E) e só então suba o Nest novo: sem a função, o job só registra o erro no log, não derruba nada.
- 0 = guardar para sempre; negativo é barrado pelo `CHECK` da tabela; deixa 1 linha de rastro quando apaga; `DELETE` direto continua barrado para `app_nestjs`. PGlite: 12 de 12, mais as 5 suítes anteriores (27, 12, 4, 25 e 25), reconstruindo só com 01 a 08 e aplicando o Grupo F 2x sobre o estado anterior. `tsc`, `eslint` e `build` do Nest limpos. **Sem teste ao vivo** (o job só roda às 3h; conferir com `SELECT public.limpar_log_auditoria()` no SQL Editor depois de colar o Grupo F: deve devolver 0 num banco com menos de 1 ano).
- **Não feito, de propósito:** arquivar o que é apagado; prazo menor para falhas de login (a revisão externa sugeriu 90 dias como refinamento opcional, sem recomendar fazer agora); tela de retenção (a chave já aparece em Parâmetros do Sistema).

### 🟡 DECIDIDO PARA DEPOIS (24-09-2026): motor do score (Parte C), guia de estilo de cores e gateway

Registro do que o Lucas decidiu ao ver a lista das quatro pendências que dependiam dele. Nada disto foi implementado agora, de propósito.

- **Motor do score (Parte C da revisão externa): ADIADO, "vai dar um trabalhinho".** Não começar sem o Lucas pedir.
  - **Situação.** (1) `volume_denuncias` e `gravidade_denuncias` são a mesma alavanca (as duas multiplicam a mesma contagem). (2) Em `score_config`, a coluna `peso` significa "parte do peso da dimensão" nas 3 primeiras dimensões (8+8+4+5+5=30 no perfil) e "custo por ocorrência" na reputação (1 e 3 pontos por denúncia), duas coisas diferentes na mesma coluna; e as penalidades do histórico moram numa terceira convenção (`configuracoes.score_penalidade_*`). (3) A reputação só conta denúncia procedente contra o **perfil** (`id_pesquisador_alvo`): denúncia procedente contra uma **campanha** do pesquisador não afeta o score e nem dispara o recálculo do dono, embora o requisito V7 diga "denúncias julgadas procedentes" sem restringir a perfil.
  - **Opções que a revisão externa pesou.** Opção 1: remover uma alavanca (resolve só o problema 1). Opção 2: coluna `gravidade SMALLINT` em `motivo_denuncia` (1 a 3) e custo por soma de gravidades (depende do módulo 19 e não resolve o problema 3). **Opção 3, a recomendada:** todo subitem vira proporção do peso da dimensão (`peso do subitem / soma dos subitens ativos`), e a reputação passa a ter dois subitens reais, `denuncias_perfil` e `denuncias_campanha`, cada um perdendo sua parte de forma linear até zerar em N denúncias procedentes (chave nova `score_denuncias_para_zerar`).
  - **Números de partida (sugestão da revisão, decisão do Lucas e da Alexia):** 10 pontos para perfil, 15 para campanhas (fraude de campanha pesa mais para quem doa), N = 3. Com o seed de hoje, perfil, histórico e atualização dão exatamente o mesmo número; o pesquisador 15 cai de 25 para 20 na reputação, o 22 sobe de 9 para 15, os outros 9 não mudam.
  - **O que a Parte C também traz:** `calcular_score_atualizacao` sem laço (uma consulta) e `calcular_score_historico` com uma leitura só de `campanha`; gancho comentado para gravidade por motivo no módulo 19 (`SUM(COALESCE(m.gravidade, 1))`); recálculo mais estreito (denúncia pendente não recalcula; denúncia contra campanha recalcula o dono).
  - **O que falta para fazer (esforço, não risco):** patch pronto em `3_patch_parteC_score_24-09-2026.sql`, na pasta de contra-prompt de 24-09 dentro de `informacoes/` (a pasta é só leitura); incorporar ao `05` e ao `07`, atualizar `DOCUMENTACAO_BD.md`, e **rever o texto dos Termos de Uso** (a explicação da pontuação exigida pela LGPD precisa dizer "denúncias procedentes contra o perfil e contra as campanhas"). Risco baixo no código, médio na percepção (muda números públicos).
  - **Tela própria do admin (o Lucas já entendeu que será necessária):** só edita `peso` e `ativo` dos itens de `score_config` (nunca `nome` nem `id_pai`, que são a estrutura que o código lê) e as faixas de `score_rotulo`. Dois `PATCH` em lote (todos os pesos numa requisição só, para caber na transação que as constraint triggers de soma e de cobertura conferem no `COMMIT`) e uma tela. Não cria nem apaga item. A permissão `score_editar` já existe e já está nas policies. **Ordem certa:** motor, depois tela, e a contestação junto com o módulo 19 (o V7 diz que ela segue o mesmo fluxo de análise das denúncias). Ponto de atenção para quando houver volume: mudar um peso recalcula todos os pesquisadores dentro da requisição do admin.
- **Guia de estilo de cores (verde do texto no tema escuro): PENDENTE, ideia do Lucas.** Uma página de teste sem dependências, só para conferir o visual do site. Proposta detalhada dada ao Lucas na conversa; **aguarda ele confirmar o escopo**. Enquanto isso o `#2fbf71` continua como valor provisório (6,14:1 sobre o cartão escuro).
- **Gateway de pagamento: fica por último, sem mudança.** Regra reforçada pelo Lucas: os testes serão todos em sandbox, **mas sandbox não é desculpa para fazer mal feito**; quando chegar a hora tem que funcionar perfeitamente (assinatura do webhook, idempotência, reconciliação, máquina de estados de `contribuicao`/`repasse`, ver `PROXIMOS_MODULOS.md`).

### 🟢 FEITO (24-09-2026, mesmo dia, 6º lote): Guia de Estilo (só em desenvolvimento)

Ideia do Lucas, aprovada com "só em desenvolvimento". Item "Guia de Estilo" no grupo CAMPO DE TESTES do menu (`/admin/campo-testes/guia-estilo`). Mostra, sem cópia de valor, os dois temas lado a lado com o contraste medido no navegador, um **comparador do verde do texto no tema escuro** (a pendência que originou a ideia), a tipografia e os componentes. Detalhes em `DOCUMENTACAO_FRONTEND.md` (seção 12). Mudanças fora dos arquivos novos: 2 linhas de seletor em `1-cores.css` (`[data-tema-local]`), `npm run contraste` passou a ler a lista de pares de um JSON compartilhado (continua 40 medições, 0 abaixo de 4,5:1), a dica do grupo CAMPO DE TESTES menciona ferramentas de desenvolvimento. `tsc`, `eslint` e `build` limpos; conferido no `dist` que nada do guia vai para produção. **O verde do tema escuro continua `#2fbf71` (6,14:1)** até o Lucas escolher olhando a página: candidatos medidos 5,09:1 (`#1fae66`), 6,14:1, 7,33:1 (`#3ecf8e`) e 8,40:1 (`#4ade80`) sobre o cartão escuro.

### 🟢 FEITO (24-09-2026, mesmo dia, 7º lote): grupo "fáceis, sem decisão" (Grupo G) e verificação ao vivo

Tudo do grupo A da lista, na ordem em que foi feito. **Cole o Grupo G** (fim do `ATUALIZAR O SUPABASE.sql`, depois do E e do F) e só então suba o Nest novo.

- **Índices** (revisão externa): saiu `idx_campanha_status` (prefixo de outro), `idx_campanha_usuario` e `idx_comentario_pesquisador` ganharam a segunda coluna, entrou `idx_historico_rejeicao_dono`.
- **Score baixo na fila** (revisão externa, requisito V7): coluna `campanhas_para_revisao_score` no dashboard, campo `precisaRevisaoScore` em listar/consultar campanha (só para quem aprova, só na fila), card e sinal na tela. A função do dashboard virou plpgsql.
- **Nome resolvido no `findall`** (revisão externa): `nomePesquisador` e `nomeArea` em listar e consultar campanha; o React não baixa mais o catálogo de usuários e de áreas.
- **`distinguir404ou403` com objeto de filtro** (revisão externa): 23 chamadas trocadas de forma mecânica e 3 services novos usando o helper (`usuario.update`, `papel-permissao.remove`, `usuario-papel.remove`).
- **Chave global não se apaga nem se desativa** (revisão externa): `pol_config_delete` só para a configuração pessoal, `CK_CONFIGURACOES_GLOBAL_ATIVA`; painel sem Excluir e com Ativo desabilitado nas globais. **Decisão embutida (avise se discordar):** uma chave global criada por engano pelo botão Criar não se apaga mais pelo painel.
- **Tema escuro sem duplicação** (revisão externa, versão pequena): `data-tema-efetivo` resolvido em JavaScript, um bloco escuro só em `1-cores.css`.
- **Seed coerente:** as campanhas 2 e 5 (flexíveis) estavam `sucesso` abaixo da meta; a **meta** desceu para o arrecadado (28.000 e 22.000). Escolhi ajustar a meta, e não trocar o status para `nao_atingido`, porque a campanha 2 tem repasse concluído e solicitação aprovada, e trocar o status mudaria penalidades de score. O Grupo G ajusta o mesmo nas linhas do seu banco, só se estiverem exatamente como o seed deixou.
- **Recálculo de score mais estreito** (revisão externa): rascunho, texto de atualização e URL/rótulo de link não recalculam mais (a trigger de INSERT/DELETE de campanha tem `WHEN`; as outras duas checam dentro da função).
- **Achado ao vivo, corrigido: `expirar_campanhas_rascunho()` estava falhando toda hora.** A campanha 6 do seed é rascunho com solicitação de encerramento; o `DELETE` em lote dava 23503 e derrubava o job inteiro (os outros rascunhos vencidos nunca expiravam). Agora apaga linha a linha e engole só violação de chave estrangeira. Reproduzido no PGlite antes e corrigido depois.
- **Achado ao vivo, corrigido: `GET /dashboard/resumo` no F5 dava 401** (pedido antes de a sessão ser restaurada). O 404 que apareceu no console do Guia de Estilo antes não se repetiu.
- **Conferido ao vivo (Playwright e API):** nomes na lista e no modal sem chamadas extras; Parâmetros sem Excluir e com Ativo desabilitado; tema "sistema" acompanhando o SO; Guia de Estilo; 403 e 404 de link acadêmico, atualização, papel, termos, usuário e usuario-papel (inclusive os 3 services novos no helper). **Ainda sem ver ao vivo:** 91026 (exige 30 dias), 92009 (exige suspender um pesquisador de verdade), paginação do T4, upload de avatar, e o card "Fila com score baixo" e a coluna "atenção" **com valores** (dependem do Grupo G).
- **Testes:** PGlite 17 casos novos (`t_grupog`) mais as suítes anteriores (27, 12, 4, 12, 25), reconstruindo só com 01 a 08 e aplicando o Grupo G duas vezes sobre o estado anterior. `tsc`, `eslint` e `build` de Nest e React limpos; `npm run contraste` 40 pares, 0 abaixo de 4,5:1; conferido no `dist` que o Guia de Estilo não vai para produção.
- **Erro meu, registrado:** ao testar por API, um `DELETE` de configuração global rodou no Supabase real (onde a regra nova ainda não estava colada) e apagou `limite_endossos_campanha`. Foi recriada na hora com os mesmos valores do seed (`id_config` passou de 10 para 44; ninguém lê por id, o React e o SQL leem pela chave). Lição: não testar por API operação destrutiva contra o banco compartilhado; para regra que ainda não foi colada, o PGlite é o lugar.

### 🟢 FEITO (24-09-2026, mesmo dia, 8º lote): enxugar os comentários dos `.sql` (primeira passada)

Pedido do Lucas (sugestão dos dois). **Nada foi apagado:** 86 cabeçalhos longos de `01` a `06` foram condensados (cabeçalho curto com a primeira frase da regra) e o bloco original, palavra por palavra, mora em `HISTORICO_COMENTARIOS_SQL.md` com o identificador `[NN-Cnnn]` citado no ponteiro do `.sql`. Comentário caiu de 44% para 34% do `05`, de 50% para 36% do `03`, e o total dos seis arquivos perdeu cerca de 1.100 linhas. **Prova de que o SQL não mudou:** um programa tira todos os comentários dos 8 arquivos e compara antes e depois (idênticos), mais as 6 suítes do PGlite (27, 12, 4, 12, 17 e 25) verdes. O fim de linha de cada arquivo foi preservado (o `01` tem fim de linha misto).
- **Limite honesto:** é uma passada mecânica. Os cabeçalhos ficaram bons, mas a frase que sobrou às vezes termina em "..." (o texto inteiro está no arquivo de histórico). Reduzir mais (06 e 02 continuam com ~63% de comentário, por causa de muitos comentários curtos, um por GRANT e um por índice) exigiria reescrever à mão e decidir o que ainda vale. **Não tocados:** `07` (o comentário explica dado de teste), `ATUALIZAR O SUPABASE.sql` (temporário), comentários curtos e os de dentro de função.
- **O que falta se você quiser depois:** transformar o arquivo de histórico em documentação de verdade (curar o que ainda vale e mover para as seções `[NN-Y]` de `DOCUMENTACAO_BD.md`). Por enquanto ele é um arquivo morto.

### 🟢 FEITO (24-09-2026, mesmo dia, 9º lote): `(SELECT tem_permissao(...))` nas policies (Grupo H)

Pedido do Lucas (sugestão da revisão externa). **Cole o Grupo H** (fim do `ATUALIZAR O SUPABASE.sql`, depois do G): recria as 121 policies, idempotente.
- **O que muda:** 169 chamadas a `public.tem_permissao('x')` e `public.id_usuario_atual()` dentro de `04_rls_policies.sql` viraram `(SELECT public....)`. O Postgres passa a avaliar uma vez por comando e não uma vez por linha. Convenção registrada no cabeçalho de `04` e em `DOCUMENTACAO_BD.md` (seção 04) para as policies novas.
- **Medido (PGlite, com contador de chamadas):** `log_auditoria` (304 linhas) 304 chamadas de cada função antes, 1 depois; oito listagens do admin somadas: `tem_permissao` 385 para 6 e `id_usuario_atual` 463 para 13.
- **Mesma regra, provado:** 420 comparações de quem vê o quê (42 tabelas x 10 usuários) e 186 escritas (31 comandos x 6 usuários) com 0 diferenças entre antes e depois; as 6 suítes verdes com só 01 a 08 e com o `ATUALIZAR` inteiro; caminho de upgrade (estado anterior mais Grupo H aplicado 2x) com os mesmos números de chamadas.
- **Achado de passagem:** o cabeçalho de `04` dizia 117 policies, o certo é 121; corrigido.
- **Sem teste ao vivo** de propósito: o Grupo H ainda não foi colado e regra nova não se prova por API contra o banco compartilhado (ver o erro do 7º lote). Depois de colar, uma navegada pelo painel (Usuários, Campanhas, Parâmetros, log) é o teste.

### 🟢 FEITO (25-09-2026): suíte PGlite guardada em `informacoes/testes-banco/`

Decisão do Lucas: guardar os testes agora, dentro de `informacoes/` (ignorada pelo git), sem acesso da Alexia até a pasta ficar completa. 10 suítes numeradas (1.158 casos: 6 de regras, 2 de convenções e documentação, 2 de caracterização de `campanha` e `comentario` para o dispatcher), 3 ferramentas de comparação, relatório automático em `resultados/` e um `prompt.md` para o Playwright, com `npm test` (só 01 a 08) e `npm run test:com-atualizar`; as duas formas passam 100%. Serve de rede de segurança para o dispatcher de triggers. **Atenção:** a pasta não entra no git, então precisa estar nos seus backups. Uso e regras para teste novo no `README.md` da pasta.

### 🟢 FEITO (25-09-2026): revisão geral da documentação

Varredura automática (suíte 10 de `informacoes/testes-banco/`: caminhos, identificadores SQL, rotas e scripts citados, mais o inventário de rotas contra os controllers) e leitura dirigida. Corrigido: seção do módulo `5-termo-uso` (dizia 1 endpoint; são 7, com as regras de criar rascunho, ativar, alterar só antes do primeiro aceite e excluir); contagem de rotas (120 para 119) e de arquivos de `27-log-auditoria`; linha do inventário de rotas que faltava (`PATCH /perfil-pesquisador/:id`); nome antigo `PENDENCIAS.md` (agora `PENDENCIAS e correcoes.md`); caminhos de componentes que mudaram de pasta (`busca-global`, `use-erro-toast`); telas antigas de usuário citadas como páginas (hoje modais); menção a `resources` no README; menção a um teste e2e que não existe. Ficaram de propósito, numa lista explicada na suíte: exemplos, nomes históricos em texto que explica uma migração, arquivos de bibliotecas e o tutorial de projeto novo.

### 🟢 FEITO (25-09-2026): consertos dos achados do teste com Playwright

O Playwright rodou (relatório em `informacoes/testes-banco/resultados/`) e apontou 4 achados médios e vários menores. Corrigido:

- **Histórico de login público.** `GET /usuario/:id/logins` respondia sem login com os horários de login de qualquer usuário. Agora exige login e ser o próprio ou ter `usuario_visualizar_sensivel`; `termos-aceitos` também exige login.
- **Permissão, não só login (era a pendência adiada).** Novo `AutorizacaoService` (`nest/src/commons/seguranca`): `GET /usuario` exige `usuario_visualizar_sensivel`; `GET /usuario/:id` exige ser o próprio ou ter a permissão; as duas suspensões (`/usuario/:id/suspensao`, `/perfil-pesquisador/:id/suspensao`) exigem ser o próprio ou `usuario_suspender`. No banco, `pol_usuariopapel_select` deixou de ser `USING (true)` (o provisório de 07-08) e voltou a "o próprio ou `papel_gerenciar`"; `contar_metricas_dashboard()` exige `relatorio_visualizar` (ERRCODE 92011, agora 60 códigos). **Grupo I do `ATUALIZAR O SUPABASE.sql`, a colar depois do H.** Suíte nova `11-permissao-usuarios-e-dashboard.mjs`.
- **Título "Painel Administrativo" ilegível no escuro.** Usava `--cor-escura` (cor fixa); passou a `--cor-texto-forte`.
- **401 no console ao apertar F5** em usuários, pesquisadores, termos de uso e T1: `authFetch` agora espera a renovação inicial da sessão (mais um `accessTokenRef`).
- **Rolagem horizontal** do dashboard em 900px e 390px (cartão com `min-w-0`) e de papéis em 390px (`overflow-x: clip` na área de conteúdo).
- **Acessibilidade (axe), todas as serious:** `role="note"` no gatilho de dica, "(Todos)" dos filtros, divisor do login e texto do rodapé. Zero critical e zero serious nas 7 telas nos dois temas.

**Verificação.** PGlite: 11 suítes, 1.168 casos verdes nos dois modos. Nest: `tsc` e `eslint` limpos; React: `tsc` e `eslint` limpos. Ao vivo (Playwright): lista de usuários, logins e suspensões dão 401 sem login e 403 para a pesquisadora, 200 para o admin, e o admin abre Consultar e Alterar usuário sem erro. **Falta:** você colar o Grupo I (só então `/usuario-papel` e `/dashboard/resumo` passam a dar 403 para a pesquisadora, e o dashboard exige `relatorio_visualizar`).

**Ficou de fora, com motivo.** Painel `/admin/*` abre sem login depois do logout: decisão do Lucas (ver a conversa; é útil, mas mexe no fluxo de desenvolvimento). Axe moderate (sem h1, ordem dos títulos do rodapé, landmark main no login): trocar a tag dos títulos mexe na tipografia fixa.

### 🟢 FEITO (26-09-2026): documentos de histórico e enxugamento deste arquivo

Este arquivo tinha 2.220 linhas (480 KB), a maior parte resolvida. O que já estava resolvido antes de 23-09-2026 foi para `informacoes/HISTORICO/HISTORICO_PENDENCIAS_E_CORRECOES.md` (texto original, ordem original, conferido linha a linha: nenhuma linha perdida), e o arquivo ficou com o que ainda tem parte aberta (itens 6, 7, 9 e 59, e as entradas "Pendência aberta", "Especificação registrada" e "Decidido para depois") mais o log a partir de 23-09-2026. Na mesma rodada, `ACHADOS_PARA_DISCUTIR.md` virou a lista atual do que falta (o conteúdo antigo está em `informacoes/HISTORICO/HISTORICO_ACHADOS_PARA_DISCUTIR.md`), `HISTORICO_COMENTARIOS_SQL.md` passou para `informacoes/HISTORICO/`, `PROXIMOS_PASSOS.md` foi apagado (gateway e `template_email` foram para `PROXIMOS_MODULOS.md`, a decisão ENUM x catálogo para o Anexo G de `DOCUMENTACAO_BD.md`), o `ARQUIVO - Dica de Arquitetura.md` foi para `informacoes/arquivo morto/` e nasceu `nest/.env.example` (com o passo a passo do bucket do Supabase). `informacoes/` não vai para o git: enquanto isso, a Alexia não tem esses arquivos de histórico.

### 🟢 FEITO (26-09-2026): três itens da lista de achados (GRANT por coluna, ordem de endosso no banco, campos bloqueados)

Feitos nesta ordem, cada um com suíte própria no PGlite (14 suítes, 1.213 casos, verdes nos dois modos). **Falta colar no SQL Editor, nesta ordem: Grupos I, J, K e L do `ATUALIZAR O SUPABASE.sql`, antes de subir o Nest novo** (o Nest novo chama `fn_campanha_campos_bloqueados` em `GET /campanha/:id`, que só existe depois do Grupo L). Nenhuma prova ao vivo ainda: depende da colagem.

- **Grupo J: `INSERT` em `usuario` por coluna** (`[06-D-10]`). O `app_nestjs` só insere `nome`, `email`, `senha_hash` e `id_imagem_perfil`; `email_verificado`, `deletado`, bloqueio, suspensão e `id` nascem do `DEFAULT` e tentar preenchê-los dá 42501. Suíte `12-grants-por-coluna-usuario.mjs` (14 casos).
- **Grupo K: `ordem_endosso` calculada no banco.** A trigger `validar_comentario_endosso_autor` calcula `MAX + 1` sob `pg_advisory_xact_lock` por campanha ao endossar e zera ao remover; a trigger de limite confere `NEW.endossado`. O Nest deixou de calcular (e de fazer o `SELECT` prévio: usa `distinguir404ou403`). Na suíte de caracterização de `comentario` as únicas 12 diferenças foram exatamente os casos `futuro|endossar_sem_ordem` (antes 23514, agora endossa ou dá 91021 no limite); os outros 408 casos ficaram idênticos e o snapshot foi regravado. Suíte `13-ordem-endosso-no-banco.mjs` (7 casos).
- **Grupo L: campos bloqueados numa função só** (`[05-K-2-D]`). `fn_campanha_campos_bloqueados` e `fn_campanha_erro_congelamento`; a trigger de congelamento percorre a lista com os mesmos códigos e mensagens de antes (as suítes de caracterização de `campanha`, 630 casos, e de `comentario` passaram idênticas depois da troca). `GET /campanha/:id` devolve `camposBloqueados` e o modal Alterar Campanha da T2 desabilita exatamente esses campos, com aviso visível. Suíte `14-campos-bloqueados-campanha.mjs` (24 casos). `tsc` e `eslint` limpos no Nest e no React.
- **Ficou de fora:** provas ao vivo (Playwright) e a tela real de "Minhas campanhas", que vai reaproveitar `camposBloqueados`.

### 🟢 FEITO (26-09-2026): prova ao vivo dos Grupos I a L, fila de aprovação, 92009 e tarefas agendadas linha a linha

- **Prova ao vivo (Playwright, rodada 3):** com os Grupos I, J, K e L colados, tudo passou ao vivo: papéis só do dono e dashboard 403 (92011) para a pesquisadora; cadastro funcionando com o `INSERT` por colunas; ordem de endosso 1, 2, nula e 3 sem informar a ordem; campos bloqueados por estado; e o modal Alterar Campanha da T2 travando exatamente a lista do banco. Nenhuma regressão nos grupos anteriores (relatório `playwright_2026-09-26_1337.md` em `informacoes/testes-banco/resultados/`). Resíduo no Supabase: um usuário de cadastro de teste, excluído pela exclusão de conta (a linha continua marcada como deletada), e as linhas imutáveis de `historico_rejeicao` das rejeições feitas pelos testes.
- **Fila de aprovação do admin:** menu MODERAÇÃO > Aprovar Campanhas, tela `/admin/aprovar-campanhas` com modal de revisão (checklist, Aprovar, Rejeitar com motivo). Provada ao vivo (menu, lista, aprovar, rejeitar, pesquisadora sem permissão, axe sem violação critical/serious nos dois temas). Ver `DOCUMENTACAO_FRONTEND.md`.
- **92009:** o banco já barrava o pesquisador suspenso; faltava o teste. Suíte `15-pesquisador-suspenso-nao-envia.mjs` (7 casos), incluindo o caminho de suporte (admin com `campanha_editar` continua podendo enviar).
- **Tarefas agendadas linha a linha (Grupo M do `ATUALIZAR`, colar depois do L):** `encerrar_campanhas_vencidas`, `expirar_campanhas_rejeitadas` e `reativar_pesquisadores_vencidos` passaram a tratar uma linha por vez; a linha recusada vira `WARNING` e não derruba as outras (`[05-K-2-E]`). Ganho: robustez (não poupa tempo de desenvolvimento nem token). Custo: um pouco mais de SQL e a necessidade de olhar o log do Postgres se uma linha falhar sempre. Suíte `16-tarefas-agendadas-linha-a-linha.mjs` (7 casos). **Falta colar o Grupo M.**
- **PGlite:** 16 suítes, 1.227 casos, verdes nos dois modos.

### 🔴 Pendência aberta (26-09-2026): bloco SQL "modo produção" das permissões de teste

O admin recebe, por padrão, permissões que só existem para as ferramentas do Campo de Testes: `campanha_criar_para_outro` e `campanha_excluir_forcado` (claramente de teste) e `perfil_pesquisador_criar_para_outro`. Esconder o Campo de Testes do build só esconde a interface; quem tiver um token de admin ainda chama essas rotas direto. A barreira real é o banco: um SQL curto, rodado uma vez no dia do deploy, que apaga essas permissões do `papel_permissao` do admin (a trigger `trg_permissao_auto_admin` só age em permissão nova, então não as devolve). **Decisão a tomar antes:** `perfil_pesquisador_corrigir_cpf` e `perfil_pesquisador_alterar_de_outro` parecem ferramenta de teste, mas são funções reais de suporte previstas nos requisitos; ficam ou saem? O arquivo deve ser preparado e testado no PGlite, sem nunca rodar antes do deploy. Sem urgência até o deploy (decisão do Lucas em 26-09-2026: focar no que está em andamento).

### 🔴 Pendência aberta (26-09-2026): remover o executor de migrações (`aplicar-migrations.script.ts`)

Ninguém usa: a Alexia recria o banco do zero com os arquivos `01` a `08`, e as mudanças pequenas entram pelo `ATUALIZAR O SUPABASE.sql`. Para remover: `nest/src/commons/database/aplicar-migrations.script.ts`, os dois comandos `db:migrate` e `db:migrate:adotar` em `nest/package.json`, a tabela `schema_migrations` (se existir em algum banco) e as menções no `.Tutorial-rodar-projeto.md`, no `DOCUMENTACAO_BACKEND.md` e no `DOCUMENTACAO_FRONTEND.md`. A revisão externa sugeria o contrário (uma pasta de migrações registradas); a recomendação daqui é remover. Decisão do Lucas (26-09-2026): deixar parado, sem gastar tempo agora. Alternativa considerada: reunir tudo numa pasta numerada por importância para apagar depois; com um script só, o registro aqui já basta.

### 🟢 CORRIGIDO (26-09-2026): erro duplicado em toast e busca global (Ctrl+K)

- **Dois toasts iguais.** Sem login, o dashboard mostrava o mesmo erro ("Você precisa estar logado...") em dois toasts. Causa: o `<StrictMode>` do desenvolvimento dispara cada efeito duas vezes; o `authFetch` já juntava as duas chamadas numa só requisição, mas os dois `.catch` rodavam e cada um mostrava um toast. Em produção (sem StrictMode) apareceria um só. Conserto no ponto único: o `ToastProvider` não empilha um aviso idêntico (mesmo título, descrição e tipo) ao que já está na tela. Vale para qualquer tela.
- **Ctrl+K com dois itens só com bolinha.** A lista de navegação era montada com todas as rotas do painel, inclusive as de detalhe sem nome (`/admin/minha-conta/:aba` e `/admin/termos-uso/criar`). Agora só entram as rotas com rótulo de menu. A página Minha Conta continua existindo, pelo menu da conta no cabeçalho.
- **Achado no caminho:** os resultados de usuário, papel e parâmetro da busca apontavam para `/:id/consultar` e `/:id/alterar`, rotas que deixaram de existir quando Consultar e Alterar viraram modal (13 e 14-09-2026); o resultado levava a uma tela vazia. Agora abrem a listagem já filtrada (`?q=`), que mostra a pessoa, o papel ou o parâmetro. Provado ao vivo (G14).
- **Continua pendência decidida:** o painel abrir sem login (por isso o dashboard sem login mostra o aviso e os valores em "-").

### 🟢 ENCERRADO (26-09-2026): três "pequenos" conferidos um a um

- **`avatar_padrao_chave` órfã no Supabase:** já estava resolvida. O `DELETE` foi rodado em 06-09-2026 e a lista de parâmetros ao vivo confirma: nenhuma chave com "avatar" (43 parâmetros). A entrada "Commit da Alexia" saiu deste arquivo (foi para o histórico).
- **`SecaoModeracaoPesquisador` fora do Registro de Chamadas (T4):** não é defeito, é uma exceção consciente e documentada (o card é o mesmo componente que a tela real de Alterar Usuário usa, e a tela real não tem o conceito de registro de chamadas do Campo de Testes); a revisão externa concordou. A entrada saiu deste arquivo (foi para o histórico) e não há nada a fazer.
- **Constantes duplicadas entre `nest/` e `react/`:** o que dava para eliminar foi eliminado dentro de cada lado. No Nest, `confirmar-upload` tinha uma segunda cópia da lista de imagens: agora usa `TIPOS_IMAGEM_PERMITIDOS`, derivada da lista mestra. No React, o seletor de foto e o util de redução tinham a mesma lista: agora uma só (`TIPOS_REDUZIVEIS`). **Continuam iguais nos dois repositórios, de propósito:** a lista de tipos de imagem e o perfil de redução do avatar (512 px, qualidade 80), porque não há código compartilhado entre `nest/` e `react/` e trocar isso por uma chave de configuração ou um endpoint acrescentaria mais peça do que resolve; cada lado tem um comentário apontando para o outro. `tsc` e `eslint` limpos nos dois.

### 🟢 FEITO (26-09-2026): história e narrativa fora dos comentários de todo o código (SQL, Nest, React)

- **Regra nova:** comentário no código diz a regra e explica lógica difícil. Sem data, sem "ADICIONADO/CORRIGIDO/antes era", sem "pedido de fulano", sem "achado numa auditoria" e sem ponteiro para arquivo fora do repositório. Ponteiro para documento versionado (`DOCUMENTACAO_*.md`, os próprios `.sql`, requisitos) continua valendo. O "porquê" segue nas `DOCUMENTACAO_*.md`.
- **O que foi feito:** os 8 `.sql` (01 a 08), cerca de 185 blocos em cerca de 120 arquivos do Nest, e os arquivos de `react/src` (código, CSS e JSX) foram reescritos. Os textos originais ficaram palavra por palavra em três arquivos de histórico fora do repositório (`HISTORICO_LIMPEZA_COMENTARIOS_SQL`, `_NEST` e `_REACT`), sem ponteiro no código.
- **O que foi mantido de propósito:** o cabeçalho curto das funções SQL (Função, Assinatura, Bloco e uma frase da regra) e todo comentário interno que explica lógica difícil. Cabeçalhos que estavam cortados com "..." foram refeitos a partir do arquivo antigo, sem perder regra. Alguns fatos velhos foram corrigidos no caminho (por exemplo, `trg_valida_repasse` é BEFORE INSERT OR UPDATE).
- **Prova:** o código dos `.sql` é idêntico ao de antes (tirando os comentários, a comparação bate); `tsc` limpo no Nest e no React, `eslint` limpo no React; as 16 suítes do banco (1.227 casos) passam, com e sem o `ATUALIZAR O SUPABASE.sql`.
- **Não tocado:** `ATUALIZAR O SUPABASE.sql` (é patch de execução única) e os dados de seed (uma descrição de seed ainda traz "(sugestão de uma IA)", isso é dado, não comentário).
- **Menu temporário removido:** o bloco comentado "TEMPORÁRIO" do cabeçalho (`Explorar Projetos`, `Como Funciona`, `Transparência LGPD`) era código morto e foi para o histórico.

### 🟢 FEITO (26-09-2026): botão "Criar" saiu de Parâmetros do Sistema

Decisão do Lucas. Uma chave criada pela tela não tinha efeito nenhum, porque só as chaves que alguma regra do banco ou do Nest lê (`config_numero('...')`) mudam o comportamento do sistema. Parâmetro novo passa a entrar só por SQL (`07_seed_dados.sql`), junto com a regra que o usa. Saíram o botão, o `modal-criar-configuracao.tsx`, o `configuracaoApi.criar` e o tipo `ConfiguracaoRequestCreate` do React. Alterar e Consultar continuam iguais. O endpoint `POST /configuracoes` do Nest ficou, porque também cria configuração pessoal do próprio usuário. `tsc` e `eslint` limpos.
