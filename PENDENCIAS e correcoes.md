# Pendências e correções

> Só o que ainda NÃO foi feito, organizado por grupo. O que já está pronto ou fechado mora em `informacoes/HISTORICO/HISTORICO_PENDENCIAS_E_CORRECOES.md` (duas limpezas: 26-09-2026 e 27-09-2026), com o texto original. Citações de outros documentos a um item ou parte deste arquivo ("item 7", "parte 10", "Onda 1 das ideias do sistema Atlas") que não estejam aqui estão lá.

> 📌 **Numeração de RF (21-09-2026):** os requisitos vigentes são o `informacoes/REQUISITOS_V7.md` (120 RFs). Citações de RF por número neste documento foram escritas em datas diferentes e podem estar em qualquer numeração anterior (pré-06-09-2026, V6 ou V7). A `MATRIZ-RASTREABILIDADE-RF.md` já está inteira na numeração do V7 e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

**Grupos:** 0. Para a Alexia ler · 1. Levar para a revisão externa (Requisitos) · 2. Dependem de outro módulo · 3. No dia do deploy · 4. Fim do projeto · 5. Decisões do Lucas, sem pressa · 6. Registros que não são pendência.

---

## 0. 📌 Para a Alexia ler (conversar antes de fazer)

#### 🔴 Pendência aberta (26-09-2026): remover o executor de migrações (`aplicar-migrations.script.ts`)

Ninguém usa: a Alexia recria o banco do zero com os arquivos `01` a `08`, e as mudanças pequenas entram pelo `ATUALIZAR O SUPABASE.sql`. Para remover: `nest/src/commons/database/aplicar-migrations.script.ts`, os dois comandos `db:migrate` e `db:migrate:adotar` em `nest/package.json`, a tabela `schema_migrations` (se existir em algum banco) e as menções no `.Tutorial-rodar-projeto.md`, no `DOCUMENTACAO_BACKEND.md` e no `DOCUMENTACAO_FRONTEND.md`. A revisão externa sugeria o contrário (uma pasta de migrações registradas); a recomendação daqui é remover. Decisão do Lucas (26-09-2026): deixar parado, sem gastar tempo agora. Alternativa considerada: reunir tudo numa pasta numerada por importância para apagar depois; com um script só, o registro aqui já basta.

> Não é prioridade. O Lucas quer conversar com a Alexia antes de remover (27-09-2026).

---

## 1. Levar para a revisão externa (documento de Requisitos, próximo V8)

Quem atualiza os requisitos é o Lucas com a revisão externa; aqui fica só o que precisa ir no próximo pedido.

- **Termo único (27-09-2026), texto do Lucas:**
  - RF-081: hoje fala em checkbox dos "Termos de Pagamento", "adicional ao Termo de Uso Geral ... específico por transação". Passaria a ser: a cada contribuição, o apoiador confirma o Termo de Uso da conta, que já inclui as regras de contribuição. Não existe mais termo de pagamento separado.
  - RF-082: a regra continua a mesma: registrar data, hora, versão aceita e transação, sem poder alterar depois. Só troca o nome: a versão registrada é a do Termo de Uso da conta.
  - RF-011: o aceite no cadastro continua obrigatório. Vale acrescentar que esse termo cobre também as contribuições.
  - Contribuição anônima (V7, linha 447): o aceite registrado passa a ser o do Termo de Uso da conta, não de um termo de contribuição.
- **2FA precisa de RF novo** (ver grupo 4). Não existe nenhum requisito cobrindo.
- **Modelo flexível:** decidir se o modelo da campanha pode mudar depois de criada (ver grupo 2, Pagamento).
- **Alterar e Excluir campanha na tela real "Campanhas" do admin** (hoje só em T2 e em Minhas Campanhas, para as próprias): a pergunta foi levada à revisão externa em 14-09-2026, sem resposta registrada.
- **Tipografia do painel padronizada** (6 classes em `2-tipografia.css`): citar no próximo pedido de revisão de interface, pedindo ideias para enxugar mais sem quebrar.
- **Como o Lucas quer esse pedido escrito:** "pegar no pé" da revisão externa, pedir que olhe sistemas de referência e traga ideias próprias, não só responda a lista.

---

## 2. Dependem de outro módulo ou de outra coisa existir

> **Nota do Lucas (27-09-2026):** 18, 19, 20 e 26 podem ganhar tela na área administrativa (nem que seja no Campo de Testes) antes da página pública existir. Não é para fazer agora, mas o lado Nest desses módulos não depende da página pública.

### Módulo `19-denuncia` (ainda não existe)

#### 🔴 Pendência aberta (lado Nest): falta o endpoint de "encerrar campanha por moderação" - só volta à tona quando `19-denuncia` nascer

A autorização já está pronta no banco (permissão `campanha_encerrar_moderacao`, concedida a `admin` e `moderador`), mas não existe hoje nenhum controller/service no Nest que execute a transição `ativo → encerrado_moderacao` de verdade - `12-campanha` não tem esse endpoint, e `19-denuncia` (de onde a ação naturalmente parte, depois de uma denúncia julgada procedente) ainda é pasta vazia.

Não é trabalho extra por causa da correção de hoje - é o mesmo trabalho que já estava pendente antes, só que agora, quando alguém escrever esse endpoint (em `12-campanha` ou como parte de `19-denuncia`), a parte de "quem pode fazer isso" já vai estar certa pros dois papéis, sem precisar mexer em RLS/trigger depois.

### Módulos `18-recompensa`, `20-solicitacao-encerramento` e `26-notificacao` (ainda não existem)

- **18:** recompensas por faixa de contribuição, com `link_recompensa` e `arquivo_recompensa`. As regras já estão no banco.
- **20:** pedido de encerramento antecipado, com decisão do admin. As regras já estão no banco.
- **26:** expor pelo Nest a tabela `notificacao`. Destrava a prévia de notificações do Dashboard (hoje um aviso honesto de "não implementado") e a segunda aba do sino.

### Módulo `4-mail` (ainda não existe)

#### 🟡 Fluxo de autenticação: falta o que depende de e-mail

Já existe: cadastro, login, renovação de sessão (o token antigo é revogado a cada renovação), logout, bloqueio da conta por tentativas erradas e limite de tentativas por IP.

Falta, e depende do `4-mail`:
- recuperação de senha (o prazo de 15 a 30 minutos do token já está documentado no `01`);
- verificação de e-mail com e-mail de verdade (hoje usa um link de desenvolvimento);
- e-mail de rejeição de campanha com os reenvios restantes e a data limite (os dados já vêm em `GET /campanha/:id`);
- "modo log" no desenvolvimento, em que o e-mail aparece no log em vez de ser enviado (ideia do `.env` do Atlas, grupo 5).

### Pagamento: `22-contribuicao`, `23-repasse`, `24-auditoria-financeira`, gateway e checkout (por último, de propósito)

#### 🔴 9. Validação de escrevibilidade financeira

`auditoria_financeira` e `repasse` têm policies de escrita `USING (true)` - a RLS não valida quem grava aí, fica 100% a cargo do serviço do NestJS.

> Sugestão da *** IA ***: seguindo o padrão de qualquer plataforma de pagamento séria (inclusive Catarse/Experiment, que também dependem de gateway externo pra processar pagamento), eu isolaria a escrita em `auditoria_financeira`/`repasse` dentro de um único serviço interno do NestJS, chamado só pelo webhook do gateway de pagamento - nunca exposto como um endpoint CRUD genérico que outra parte do app possa chamar por engano.

> Correção de foco (27-07-2026): o risco real aqui não é "ter que escrever a regra duas vezes" (uma vez em SQL, outra no NestJS) - é que hoje, especificamente no caminho do dinheiro (`repasse`, `auditoria_financeira`, `historico_rejeicao`), a RLS está `USING (true)` e não protege nada, exatamente onde mais importaria proteger. Isso já foi testado de verdade: inserir um `repasse` com `valor_liquido = 0` numa campanha `all-or-nothing` abaixo da meta (permitido, RF-038) e depois fazer `UPDATE` pro valor cheio passava direto, sem revalidar a regra all-or-nothing. **Esse teste específico já não funciona mais** - foi corrigido em 27-07-2026 (ver `A3` na seção de resolvidos: `trg_valida_repasse` agora também dispara em `UPDATE`, não só `INSERT`). O ponto de fundo continua válido: `auditoria_financeira`/`repasse`/`historico_rejeicao` seguem com escrita aberta por decisão consciente, então o serviço isolado do NestJS sugerido acima continua sendo a defesa que falta.

> **Trava de dependência (05-09-2026):** este item só pode ser implementado DEPOIS do gateway de pagamento ser escolhido (`PROXIMOS_MODULOS.md`, Grupo 8) - a lógica real de "quando gravar `auditoria_financeira`/`repasse`" só existe quando o webhook do gateway chamar de volta confirmando uma transação; sem gateway, não há webhook, e sem webhook não há destinatário natural pro serviço isolado sugerido acima. Construir esse isolamento antes protegeria um caminho que nenhum código ainda percorre - trabalho sem efeito. **Decisão de produto do Lucas:** não citar mais este item numa lista geral de pendências até o gateway estar definido - quando isso acontecer, este serviço isolado deve ser a PRIMEIRA peça do módulo de pagamento a ser construída, antes até do endpoint de webhook em si (evita a janela em que a escrita fica exposta por alguns commits).

#### 🟡 Pendência aberta (24-09-2026): modelo de campanha `flexivel` existe no banco, no seed e no V7, mas o sistema não o exercita de ponta a ponta

Apontado pela revisão externa (resposta de 20-09) como "metade dos modelos não existe". Conferido: o **REQUISITOS_V7 promete os dois modelos**, então a pergunta "manter ou tirar o valor do enum" não se aplica; o enum fica. O que falta é implementar o lado flexível:

- **Criação:** o wizard (`corpoDadosCampanha()`) não envia `modelo`, então toda campanha nasce `all-or-nothing`. O DTO de `PATCH` também não aceita `modelo`, de propósito (mudar o modelo depois de criada é decisão de produto em aberto, comentário em `campanha.request-update.ts`).
- **Regras do banco:** existem `fn_valida_repasse_all_or_nothing` e `validar_contribuicao_all_or_nothing`, mas nenhuma regra correspondente para o flexível (repasse independente de atingir a meta, com a taxa descontada).
- **Encerramento:** o requisito de encerramento do flexível (repasse registrado com valor bruto, taxa, líquido e indicação de meta atingida ou não) não tem implementação.
- **Aviso ao doador:** o aviso destacado e a confirmação de ciência antes da contribuição dependem da tela de checkout, que não existe.
- **Só existe em dado:** `07_seed_dados.sql` tem uma campanha flexível (a do repasse `parcial_processando`), e o tipo aparece em `db.types.ts` e `campanha.type.ts`.

**Depende de:** módulo de contribuição/pagamento (Grupo 8) e checkout. Não iniciar antes. Quando esses módulos nascerem, decidir também se o modelo pode mudar depois de criada a campanha.

- **Gateway:** fica por último. Os testes serão em sandbox, mas sandbox não é desculpa para fazer mal feito: assinatura do webhook, idempotência, reconciliação, máquina de estados de `contribuicao`/`repasse` (`PROXIMOS_MODULOS.md`).
- **Painel do doador** (`views/dash-doador`, pasta vazia) e **checkout** (`views/checkout`, vazia).

### Página pública da campanha (ainda não existe)

- **Botões de compartilhar** (WhatsApp, Facebook, copiar link) e **prévia de link** (Open Graph, um endpoint pequeno no Nest que devolve as meta tags). Ideias do Atlas (P1 e P2 do roteiro).
- Telas públicas de denúncia, recompensa, atualização, comentário e seguir (hoje atualização, comentário e seguir só existem no T3 do Campo de Testes). Painel do pesquisador (`views/dash-pesquisador`, pasta vazia).

### Motor do score (a Parte C foi adiada pelo Lucas)

#### 🟡 DECIDIDO PARA DEPOIS (24-09-2026): motor do score (Parte C), guia de estilo de cores e gateway

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

> Os itens "guia de estilo de cores" e "gateway" deste bloco estão também nos grupos 5 e 2.

#### 🔴 Pendência aberta (11-09-2026): RF-031 (contestação de score) só faz sentido implementar depois do motor de score estar fechado de vez

RF-031 já tem o texto do requisito escrito (pesquisador abre solicitação de revisão junto ao Administrador se achar uma penalização injusta/desatualizada, mesmo fluxo de análise das denúncias) - mas nunca teve nenhuma implementação (Banco ❌, Nest ❌ na `MATRIZ-RASTREABILIDADE-RF.md`, confirmado no item 59 acima).

**Ponto levantado pelo Lucas (11-09-2026):** construir o fluxo de contestação antes do motor de score estar com as regras de cálculo fechadas de vez não faz sentido - estaria montando um processo de revisão pra contestar um número cuja fórmula ainda pode mudar por baixo. O item 13 (Lista C, acima) já fechou 4 decisões pontuais de regra (denúncia improcedente, dupla penalização, encerramento antecipado, reconhecimento de GitHub), mas o próprio painel (`PainelScore`, Campo de Testes T1/T2, ambos Consultar e o card solto) ainda exibe um aviso explícito dizendo que "a regra de negócio de pontuação (pesos e dimensões) ainda não foi fechada, os números são só uma prévia da estrutura" - ou seja, mesmo com aquelas 4 correções pontuais, o motor como um todo (pesos por dimensão, principalmente) continua sinalizado como provisório na própria interface.

**Não resolvido ainda se esse aviso está desatualizado ou genuinamente reflete o estado atual** - só registrado aqui que RF-031 depende dessa resposta antes de virar trabalho técnico de verdade. Ordem sugerida: (1) decidir se o motor de score está de fato fechado (e, se estiver, tirar o aviso "ainda não está pronto" da interface); (2) só depois disso implementar RF-031 (Banco + Nest).

> Depende do motor do score acima estar fechado.

### Arquivos

#### 🟡 Especificação registrada (13-09-2026): tela de administração pra `arquivo` (espaço ocupado, órfãos, maiores consumidores) - NÃO construída de propósito

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

## 3. No dia do deploy

#### 🔴 Pendência aberta (26-09-2026): bloco SQL "modo produção" das permissões de teste

O admin recebe, por padrão, permissões que só existem para as ferramentas do Campo de Testes: `campanha_criar_para_outro` e `campanha_excluir_forcado` (claramente de teste) e `perfil_pesquisador_criar_para_outro`. Esconder o Campo de Testes do build só esconde a interface; quem tiver um token de admin ainda chama essas rotas direto. A barreira real é o banco: um SQL curto, rodado uma vez no dia do deploy, que apaga essas permissões do `papel_permissao` do admin (a trigger `trg_permissao_auto_admin` só age em permissão nova, então não as devolve). **Decisão a tomar antes:** `perfil_pesquisador_corrigir_cpf` e `perfil_pesquisador_alterar_de_outro` parecem ferramenta de teste, mas são funções reais de suporte previstas nos requisitos; ficam ou saem? O arquivo deve ser preparado e testado no PGlite, sem nunca rodar antes do deploy. Sem urgência até o deploy (decisão do Lucas em 26-09-2026: focar no que está em andamento).

**Acrescentado em 26-09-2026 (Grupo O):** o mesmo bloco tem de tirar a leitura liberada a toda conta durante o desenvolvimento. SQL:

```sql
DELETE FROM papel_permissao
WHERE id_papel = (SELECT id_papel FROM papel WHERE codigo = 'usuario')
  AND id_permissao IN (SELECT id_permissao FROM permissao WHERE nome IN (
    'relatorio_visualizar', 'usuario_visualizar_sensivel', 'perfil_pesquisador_visualizar_sensivel',
    'contribuicao_visualizar_sensivel', 'auditoria_financeira_visualizar', 'score_visualizar', 'log_visualizar'));
```

- **Docker** do Nest e do React (F2 do roteiro do Atlas, com o `docker/` deles como referência).
- **`react/.gitignore` não cobre `.env`:** inofensivo hoje (o `.env` só tem a URL da API); só volta à tona se o conteúdo do `.env` mudar ou no deploy.
- **CORS por lista de endereços** (ver grupo 5, segurança): se não for feito antes, entra aqui.
- **Roteiros de tela que esperam o modo produção** (hoje toda conta logada lê tudo, pela leitura liberada de desenvolvimento): `g10-permissoes-na-tela.mjs`, caso "Pesquisadora: /admin/usuarios mostra erro de permissão", e `g14-toast-e-busca.mjs`, caso "Conta sem permissão abre o dashboard: UM aviso de erro". Vistos em 28-09-2026.
- **Roteiro de API `gapi-401-403-404.mjs` espera o modo produção:** hoje 2 casos falham porque toda conta logada vê tudo (Grupo O, leitura liberada de desenvolvimento). Rodar de novo depois do bloco "modo produção".

---

## 4. Fim do projeto (só quando todos os módulos estiverem prontos)

#### 🔴 Pendência aberta: Autenticação em duas etapas (2FA) - vai precisar de RF novo também

Toda banca de TCC de sistema hoje em dia costuma perguntar sobre segurança logo de cara, e 2FA é um dos primeiros itens que costuma vir à tona nessa conversa. Hoje o CrowdAcademico não tem nenhuma camada de 2FA (só e-mail+senha, com bloqueio por tentativas). Quando for implementar, também vai precisar de um RF novo na Etapa 3 descrevendo o requisito (não existe nenhum hoje cobrindo isso).

**Só voltar a levantar este item quando todos os módulos do backend já estiverem prontos** - não é prioridade agora, é o tipo de reforço que faz mais sentido numa reta final, depois que o núcleo (campanha, contribuição, pagamento) já estiver de pé.

#### 🔴 Pendência aberta: testes automatizados com Playwright no React

O `react/` não tem nenhum teste automatizado hoje (só `build`+`lint`). Um projeto de referência da disciplina (`COCAO_HOTEL_DDL_DML_CRUD_ppw2-main`) tem uma estrutura de testes Playwright organizada em 7 categorias (E2E completo, aceitação/requisito funcional, integração HTTP, API pura, *data-driven*, *snapshot* visual/acessibilidade, interceptação de erro) que pode servir de referência de estrutura, não de conteúdo (os testes deles são específicos do sistema de hotel).

**Vamos usar eventualmente, mas ainda é cedo.** Só voltar a levantar este item quando o sistema estiver completo (todos os módulos prontos) - implementar teste agora, com o backend ainda mudando bastante módulo a módulo, geraria mais retrabalho de manutenção de teste do que benefício.

> Até lá existem os roteiros avulsos de navegador em informacoes/testes-banco/resultados/scripts (g1 a g20, mais o `rotas-sem-login.mjs`, que chama as 119 rotas sem login e compara com a gravação anterior).

---

## 5. Decisões do Lucas, sem pressa

### Segurança

#### 🔴 Pendência aberta: refresh token em cookie `HttpOnly`, em vez de `localStorage`

Achado revisando um projeto de referência da disciplina (04-09-2026): hoje o CrowdAcademico guarda o refresh token no `localStorage` do navegador (`use-auth.js`, decisão já documentada - "pra não precisar logar de novo a cada F5"). Um cookie `HttpOnly` com `SameSite=Strict` faz o mesmo papel, mas com uma vantagem real de segurança: o JavaScript da página nunca consegue ler o valor do cookie, então um ataque de XSS (injeção de script malicioso) não consegue roubar o refresh token, mesmo que consiga rodar código na página - com `localStorage`, qualquer script que rode na página consegue ler o token.

**Não é decisão óbvia, nem copy-paste** - trocar exigiria mexer em como o `authFetch`/`use-auth.js` renovam sessão (hoje leem o token direto do `localStorage`; um cookie `HttpOnly` é enviado automaticamente pelo navegador em toda requisição, sem o JavaScript precisar ler nem anexar nada - muda o formato da chamada) e como o backend define/lê esse cookie. Vale uma rodada de análise mais aprofundada de IA antes de decidir - não é pra implementar agora, só registrado pra não esquecer que a opção existe.

#### 🟡 Anotado para pensar com calma (27-09-2026): 3 ideias vindas do `.env` do sistema Atlas

Lucas decide depois se ajudam o CrowdAcadêmico. Contexto em `informacoes/ROTEIRO_INCORPORACAO_ATLAS.md`.

- **Lista de origens permitidas (CORS):** a API do Atlas só aceita chamadas dos endereços de uma lista no `.env`. A nossa aceita chamadas de qualquer site (`app.enableCors()` sem opções, `nest/src/main.ts`). Correção pequena e pré-requisito da pendência do cookie HttpOnly (cookie com credencial exige origem explícita).
- **Configuração da sessão em cookie:** o Atlas usa cookie HttpOnly com tempo de vida e regras de envio (`SESSION_LIFETIME`, `SESSION_SECURE_COOKIE`, `SESSION_SAME_SITE`) no `.env`. Referência pronta para a pendência "refresh token em cookie HttpOnly".
- **E-mail em "modo log" no desenvolvimento:** `MAIL_MAILER=log` faz o e-mail aparecer no log em vez de ser enviado. Serve para quando o módulo de e-mail (`nest/src/4-mail`, hoje vazio) for construído.

- **Permissão por rota no painel:** a guarda do `/admin/*` só exige login, não confere o papel (quem vê o quê continua decidido pelo backend). "Fica para perto do fim".

### Visual e marca

- **Verde do texto no tema escuro:** `#2fbf71` é provisório (6,14:1 sobre o cartão escuro); aguarda o Lucas confirmar o escopo da página de conferência de cores.
- **Gestão de logo e favicon:** a aba Identidade Visual do Dashboard é só um espaço reservado.

### Telas e formulários

#### 🔴 Pendência aberta (15-09-2026, importante, deliberadamente não iniciada): auditoria do painel contra as 10 Heurísticas de Nielsen

O Lucas registrou isto como pendência futura importante, explícito que não é pra começar agora. Exemplo concreto que ele deu: desabilitar silenciosamente um botão ("Próximo"/"Criar"/etc.) quando um campo obrigatório está inválido não é o certo - o certo é deixar clicar e mostrar o problema de verdade (borda do campo em vermelho + mensagem de erro explicando o quê e o porquê). Mapeia direto pras heurísticas #1 (visibilidade do status do sistema) e #9 (ajudar a reconhecer, diagnosticar e corrigir erros) - desabilitar sem feedback é diagnóstico zero.

**Onde esse padrão já existe hoje** (achado no mesmo dia, construindo o wizard de Criar Campanha): `formCriarCampanhaValido` (`bancada-campanha.tsx`) desabilita "Próximo" com base num booleano combinado grande (título, área, meta ≥ mínimo, datas, duração 15-60 dias), só ALGUMAS dessas sub-condições aparecem como aviso inline (meta mínima e duração têm texto vermelho; título/área/pesquisador escolhido não). É o exato antipadrão que ele está descrevendo - provavelmente se repete em outros formulários do painel (Alterar Campanha, Alterar Usuário, etc.) nunca auditados especificamente por isso.

**Andamento (29-09-2026):** o padrão "erro embaixo do campo" já existe (`useErrosFormulario`) e foi aplicado em 4 formulários: criar campanha, cadastro, suspensão e alterar senha. Falta a auditoria completa contra as 10 heurísticas.

**Como aplicar**: não iniciar varredura proativa. Quando tocar em qualquer formulário com esse padrão de "desabilitar submit se inválido" no futuro, considerar mostrar erro por campo em vez de (ou além de) só desabilitar o botão. Quando o Lucas pedir pra começar essa frente de verdade, o escopo natural é uma auditoria completa em TODOS os formulários de `react/src/views/` contra as 10 heurísticas, não só #1/#9.


#### 🟡 Anotado (26-09-2026): T3, "Ocultar" com fonte maior

Na tabela de Atualizações do T3, o botão "Ocultar" (só texto) fica com fonte maior que o resto: a regra que aumenta os ícones de Ações quando a tela aperta também pega esse botão. Não mexer agora (T3 ainda não foi revisada de verdade); entra quando o T3 for trabalhado.

### Estrutura e ferramentas

#### 🟡 Planejado (29-09-2026, "talvez amanhã"): `NOT NULL` nas colunas com valor padrão que aceitam vazio

34 colunas têm `DEFAULT` (ex.: `criado_em DEFAULT NOW()`, `ativo DEFAULT TRUE`), mas o banco aceita gravar vazio nelas; quem garante que nunca ficam vazias é o costume do código, não o banco. A lista sai da suíte de teste de conferência de tipos (aviso "nulidade diferente"). **Nem todas devem mudar**: `contribuicao.token_sessao`, por exemplo, fica vazia de propósito quando a contribuição não é anônima. Plano pedido pelo Lucas:
1. **Auditoria no código inteiro:** coluna por coluna, onde é gravada e lida (SQL, Nest, React), e a lista de quais mudam e quais ficam, com o motivo, para o Lucas aprovar.
2. **Conferir o Supabase** (só leitura): nenhuma linha vazia nas colunas que vão mudar.
3. **Testes no código inteiro:** PGlite nos dois modos, compilador e lint do Nest e do React.
4. **Teste geral de ponta a ponta:** conta nova do zero, upgrade para pesquisador, criar campanha, entrar como admin e aprovar, criar um segundo pesquisador e comentar na campanha, voltar ao primeiro e endossar o comentário, e assim por diante.
5. Grupo do `ATUALIZAR` com aviso de parar o Nest (é `ALTER TABLE`).

#### 🟡 Anotado (29-09-2026): dispatcher de triggers

Hoje `campanha` tem 17 triggers e `comentario` tem 8. Quando várias rodam no mesmo momento, o Postgres escolhe a ordem pela ordem alfabética do nome; o dispatcher seria uma trigger só por momento, chamando as regras numa ordem escrita. Ganho: ordem explícita e mensagem de erro previsível quando duas regras falhariam juntas. Custo: mexer nas regras mais críticas (aprovação, congelamento, prazo), com risco de regressão; as suítes de caracterização (1.050 casos) são a rede de proteção. Recomendação atual: não fazer. **O Lucas quer, mais para frente, uma documentação completa sobre isto para estudar pessoalmente** (como funciona a ordem hoje, o que mudaria, exemplos com as triggers reais), antes de decidir.

### Protótipo estático (sessão própria)

- Reputação em 4 faixas, seguir campanha e recompensas não têm presença visual no protótipo. Levantar como decisão, não encaixar numa rodada de "embelezar".

---

## 6. Registros que não são pendência (para não se perderem)

- **Roteiros de tela que dependem de dado criado à mão (28-09-2026):** `g5-campo-testes-api.mjs`, `g13-fila-aprovacao.mjs` e dois casos do `g10` usam o admin como pesquisador (criam campanha com ele, abrem o perfil de pesquisador dele). O seed não dá perfil de pesquisador ao admin; ele tinha sido criado à mão antes da rodada de 26-09, e o Supabase foi recriado depois. Para rodá-los de novo: dar um perfil de pesquisador ao admin (upgrade em Minha Conta) ou trocar o roteiro para usar uma pesquisadora do seed. O mesmo fluxo foi conferido pela API em 28-09-2026 com uma conta nova.

- **Descartados de propósito do roteiro do Atlas** (escopo enxuto): Next.js, Tailwind no JSX, i18n, gerador de módulo, versão na URL, e a maiúscula automática nos nomes (ficou só a limpeza de espaços).
- **Exceção consciente no T4:** a seção de suspensão (conta e pesquisador) chama a API direto, sem passar pelo registro de chamadas do Campo de Testes; é o mesmo componente da tela real. Ver o histórico (08-09-2026).
- **Roteiro completo do Atlas:** `informacoes/ROTEIRO_INCORPORACAO_ATLAS.md` (Ondas 1 e 2 feitas).
