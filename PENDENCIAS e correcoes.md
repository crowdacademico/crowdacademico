# Pendências e correções

> Só o que ainda NÃO foi feito, organizado por grupo. O que já está pronto ou fechado mora em `informacoes/HISTORICO/HISTORICO_PENDENCIAS_E_CORRECOES.md` (duas limpezas: 26-09-2026 e 27-09-2026), com o texto original. Citações de outros documentos a um item ou parte deste arquivo ("item 7", "parte 10", "Onda 1 das ideias do sistema Atlas") que não estejam aqui estão lá.

> 📌 **Numeração de RF (29-09-2026):** os requisitos vigentes são o `informacoes/REQUISITOS_V8.md` (122 RFs). Citações de RF por número neste documento foram escritas em datas diferentes e podem estar em qualquer numeração anterior (pré-06-09-2026, V6, V7 ou V8). A `MATRIZ-RASTREABILIDADE-RF.md` já está inteira na numeração do V8 e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

**Grupos:** 0. Para a Alexia ler · 1. Levar para a revisão externa (Requisitos) · 2. Dependem de outro módulo · 3. No dia do deploy · 4. Fim do projeto · 5. Decisões do Lucas, sem pressa · 6. Registros que não são pendência.

---

## 0. 📌 Para a Alexia ler (conversar antes de fazer)

Nada aberto (03-10-2026).

---

## 1. Levar para a revisão externa

Quem atualiza os requisitos é o Lucas com a revisão externa; aqui fica só o que precisa ir no próximo pedido. O V8 (`informacoes/REQUISITOS_V8.md`, 29-09-2026) já absorveu o termo único, o 2FA (fica sem RF, como ideia do fim do projeto), o modelo flexível e o Alterar/Excluir do admin.

- **Tipografia do painel padronizada** (6 classes em `2-tipografia.css`): citar no próximo pedido de revisão de interface, pedindo ideias para enxugar mais sem quebrar.
- **Para o Lucas discutir com a revisão externa (29-09-2026; o Lucas acha que alguns pontos do V8 não batem):**
  - **Aceite pendente no próximo login:** vale para versão nova do Termo (RF-015). O V8 tirou a parte da conta criada pelo admin (nascer com senha provisória e aceite pendente), por ser ferramenta de teste; o Lucas quer rediscutir.
  - **Modelo da campanha pode mudar até a aprovação:** o V8 deixou implícito (congelamento na aprovação); hoje o formulário nem envia o modelo.
  - **Links no upgrade, "Projetos Criados" e validação de domínio dos links:** a resposta da revisão externa à comparação V8 × código tem pontos que o Lucas vai revisar com ela.
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

**Depende de:** módulo de contribuição/pagamento (Grupo 8) e checkout. Não iniciar antes. Decidido no V8: o modelo pode mudar enquanto a campanha não foi aprovada e congela na aprovação (o banco já congela). **Decisão em aberto, sem pressa:** gravar ou não o IP do contribuinte anônimo no aceite do Termo; volta quando o módulo de contribuição for construído.

- **Gateway:** fica por último. Os testes serão em sandbox, mas sandbox não é desculpa para fazer mal feito: assinatura do webhook, idempotência, reconciliação, máquina de estados de `contribuicao`/`repasse` (`PROXIMOS_MODULOS.md`).
- **Painel do doador** (`views/dash-doador`, pasta vazia) e **checkout** (`views/checkout`, vazia).

### Página pública da campanha (ainda não existe)

- **Botões de compartilhar** (WhatsApp, Facebook, copiar link) e **prévia de link** (Open Graph, um endpoint pequeno no Nest que devolve as meta tags). Ideias do Atlas (P1 e P2 do roteiro).
- Telas públicas de denúncia, recompensa, atualização, comentário e seguir (hoje atualização, comentário e seguir só existem no T3 do Campo de Testes). Painel do pesquisador (`views/dash-pesquisador`, pasta vazia).

### Motor do score (a Parte C foi adiada pelo Lucas)

#### 🟡 DECIDIDO PARA DEPOIS (24-09-2026): motor do score (Parte C) e gateway

Registro do que o Lucas decidiu ao ver a lista das quatro pendências que dependiam dele. Nada disto foi implementado agora, de propósito.

- **Motor do score (Parte C da revisão externa): ADIADO, "vai dar um trabalhinho".** Não começar sem o Lucas pedir.
  - **Situação.** (1) `volume_denuncias` e `gravidade_denuncias` são a mesma alavanca (as duas multiplicam a mesma contagem). (2) Em `score_config`, a coluna `peso` significa "parte do peso da dimensão" nas 3 primeiras dimensões (8+8+4+5+5=30 no perfil) e "custo por ocorrência" na reputação (1 e 3 pontos por denúncia), duas coisas diferentes na mesma coluna; e as penalidades do histórico moram numa terceira convenção (`configuracoes.score_penalidade_*`). (3) A reputação só conta denúncia procedente contra o **perfil** (`id_pesquisador_alvo`): denúncia procedente contra uma **campanha** do pesquisador não afeta o score e nem dispara o recálculo do dono, embora o requisito V7 diga "denúncias julgadas procedentes" sem restringir a perfil.
  - **Opções que a revisão externa pesou.** Opção 1: remover uma alavanca (resolve só o problema 1). Opção 2: coluna `gravidade SMALLINT` em `motivo_denuncia` (1 a 3) e custo por soma de gravidades (depende do módulo 19 e não resolve o problema 3). **Opção 3, a recomendada:** todo subitem vira proporção do peso da dimensão (`peso do subitem / soma dos subitens ativos`), e a reputação passa a ter dois subitens reais, `denuncias_perfil` e `denuncias_campanha`, cada um perdendo sua parte de forma linear até zerar em N denúncias procedentes (chave nova `score_denuncias_para_zerar`).
  - **Números de partida (sugestão da revisão, decisão do Lucas e da Alexia):** 10 pontos para perfil, 15 para campanhas (fraude de campanha pesa mais para quem doa), N = 3. Com o seed de hoje, perfil, histórico e atualização dão exatamente o mesmo número; o pesquisador 15 cai de 25 para 20 na reputação, o 22 sobe de 9 para 15, os outros 9 não mudam.
  - **O que a Parte C também traz:** `calcular_score_atualizacao` sem laço (uma consulta) e `calcular_score_historico` com uma leitura só de `campanha`; gancho comentado para gravidade por motivo no módulo 19 (`SUM(COALESCE(m.gravidade, 1))`); recálculo mais estreito (denúncia pendente não recalcula; denúncia contra campanha recalcula o dono).
  - **O que falta para fazer (esforço, não risco):** patch pronto em `3_patch_parteC_score_24-09-2026.sql`, na pasta de contra-prompt de 24-09 dentro de `informacoes/` (a pasta é só leitura); incorporar ao `05` e ao `07`, atualizar `DOCUMENTACAO_BD.md`, e **rever o texto dos Termos de Uso** (a explicação da pontuação exigida pela LGPD precisa dizer "denúncias procedentes contra o perfil e contra as campanhas"). Risco baixo no código, médio na percepção (muda números públicos).
  - **Tela própria do admin (o Lucas já entendeu que será necessária):** só edita `peso` e `ativo` dos itens de `score_config` (nunca `nome` nem `id_pai`, que são a estrutura que o código lê) e as faixas de `score_rotulo`. Dois `PATCH` em lote (todos os pesos numa requisição só, para caber na transação que as constraint triggers de soma e de cobertura conferem no `COMMIT`) e uma tela. Não cria nem apaga item. A permissão `score_editar` já existe e já está nas policies. **Ordem certa:** motor, depois tela, e a contestação junto com o módulo 19 (o V7 diz que ela segue o mesmo fluxo de análise das denúncias). Ponto de atenção para quando houver volume: mudar um peso recalcula todos os pesquisadores dentro da requisição do admin.
- **Gateway de pagamento: fica por último, sem mudança.** Regra reforçada pelo Lucas: os testes serão todos em sandbox, **mas sandbox não é desculpa para fazer mal feito**; quando chegar a hora tem que funcionar perfeitamente (assinatura do webhook, idempotência, reconciliação, máquina de estados de `contribuicao`/`repasse`, ver `PROXIMOS_MODULOS.md`).

> O item "gateway" deste bloco está também no grupo 2. O "guia de estilo de cores", que também estava aqui, foi fechado em 02-10-2026 (histórico).

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

- **Banco depois do deploy: mudança vira arquivo novo numerado** (começando em 09, depois 10, e assim por diante), nunca edição do `01` a `08` nem só o `ATUALIZAR`. O executor de migrações (`npm run db:migrate`) aplica só o que é novo e avisa, sem reaplicar, quando um arquivo já aplicado muda. No primeiro deploy: `npm run db:migrate:adotar` no banco que já tem tudo, e `DATABASE_URL_MIGRATIONS` com a credencial de administrador do banco.
- **Docker** do Nest e do React (F2 do roteiro do Atlas, com o `docker/` deles como referência).
- **`react/.gitignore` não cobre `.env`:** inofensivo hoje (o `.env` só tem a URL da API); só volta à tona se o conteúdo do `.env` mudar ou no deploy.
- **CORS por lista de endereços** (ver grupo 5, segurança): se não for feito antes, entra aqui.
- **Roteiros de tela que esperam o modo produção** (hoje toda conta logada lê tudo, pela leitura liberada de desenvolvimento): `g10-permissoes-na-tela.mjs`, caso "Pesquisadora: /admin/usuarios mostra erro de permissão", e `g14-toast-e-busca.mjs`, caso "Conta sem permissão abre o dashboard: UM aviso de erro". Vistos em 28-09-2026.
- **Roteiro de API `gapi-401-403-404.mjs` espera o modo produção:** hoje 2 casos falham porque toda conta logada vê tudo (Grupo O, leitura liberada de desenvolvimento). Rodar de novo depois do bloco "modo produção".

---

## 4. Fim do projeto (só quando todos os módulos estiverem prontos)

#### 🟡 Ideia para o fim do projeto: Autenticação em duas etapas (2FA), sem RF (decisão do V8: avançado demais para o escopo do TCC agora)

Toda banca de TCC de sistema hoje em dia costuma perguntar sobre segurança logo de cara, e 2FA é um dos primeiros itens que costuma vir à tona nessa conversa. Hoje o CrowdAcademico não tem nenhuma camada de 2FA (só e-mail+senha, com bloqueio por tentativas). Quando for implementar, também vai precisar de um RF novo na Etapa 3 descrevendo o requisito (não existe nenhum hoje cobrindo isso).

**Só voltar a levantar este item quando todos os módulos do backend já estiverem prontos** - não é prioridade agora, é o tipo de reforço que faz mais sentido numa reta final, depois que o núcleo (campanha, contribuição, pagamento) já estiver de pé.

#### 🔴 Pendência aberta: testes automatizados com Playwright no React

O `react/` não tem nenhum teste automatizado hoje (só `build`+`lint`). Um projeto de referência da disciplina (`COCAO_HOTEL_DDL_DML_CRUD_ppw2-main`) tem uma estrutura de testes Playwright organizada em 7 categorias (E2E completo, aceitação/requisito funcional, integração HTTP, API pura, *data-driven*, *snapshot* visual/acessibilidade, interceptação de erro) que pode servir de referência de estrutura, não de conteúdo (os testes deles são específicos do sistema de hotel).

**Vamos usar eventualmente, mas ainda é cedo.** Só voltar a levantar este item quando o sistema estiver completo (todos os módulos prontos) - implementar teste agora, com o backend ainda mudando bastante módulo a módulo, geraria mais retrabalho de manutenção de teste do que benefício.

> Até lá existem os roteiros avulsos de navegador em informacoes/testes-banco/resultados/scripts (g1 a g20, mais o `rotas-sem-login.mjs`, que chama todas as rotas sem login, 123 em 02-10-2026, e compara com a gravação anterior).

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

- **Branch `feat/novas-telas-teste` (02-10-2026):** tem o Dashboard em seções ("Precisa de você") e os links acadêmicos em cartões no celular, feitos antes das regras visuais novas. Decidir se entram no main, refeitos com as regras do `DESIGN_SYSTEM.md`, ou se a branch é descartada.

- **Gestão de logo e favicon:** a aba Identidade Visual do Dashboard é só um espaço reservado.

### Telas e formulários

### Estrutura e ferramentas

#### 🟠 Rodada 1 feita (29-09-2026): SUPER AUDITORIA do sistema inteiro, na prática

**Achados em `informacoes/SUPER_AUDITORIA_2026-09-29.md`:** 26 achados; a tabela "Andamento das correções" no topo do arquivo mostra a situação de cada um.

- **Grupo Z colado no Supabase (29-09-2026, "Success").**
- **Ainda não feito:**
  - o item 13 (limpar o Supabase, precisa de autorização);
  - o envio de arquivo (grava no Storage pessoal).
- **`NOT NULL` feito (30-09-2026); Grupo AD colado no Supabase (30-09-2026).**


**O que é:** não só rodar os testes automáticos. É usar o sistema de verdade, módulo por módulo, como uma pessoa usaria, com cada tipo de conta (admin, pesquisador, conta comum, suspensa), passando por todas as telas e ações, inclusive os caminhos de erro. Cada módulo de hoje: usuário, papéis, auth, termos, pesquisador, links, catálogos, configurações, campanha, orçamento, cronograma, atualização, seguir, comentário, histórico de rejeição, arquivos, log, dashboard e Campo de Testes. Criar, consultar, alterar e excluir pela tela conferindo o que foi gravado; cada papel tentando o que pode e o que não pode; os fluxos que atravessam módulos (conta nova, upgrade, campanha, admin aprova, outro pesquisador comenta, o dono endossa...); anotar tudo, até o que "funciona mas confunde".

**Como:** um roteiro de auditoria módulo por módulo, rodado em partes, e uma lista de achados antes de corrigir; o Lucas decide o que corrigir e em que ordem.

**Alimenta de uma vez:** o `NOT NULL` (abaixo), a auditoria de Nielsen (grupo "Telas e formulários") e os itens abaixo, levantados em 29-09-2026:
1. ~~Validação de domínio dos links acadêmicos.~~ **Feito (29-09-2026, Grupo Z).**
2. ~~Mensagens de erro de validação em inglês.~~ **Feito (29-09-2026, Grupo Y).**
3. ~~Pedidos que dão erro sem necessidade (o 404 do perfil de pesquisador).~~ **Feito (29-09-2026, `ehPesquisador`).**
4. Os RFs marcados 🟡 "não conferido a fundo" na matriz de rastreabilidade: confirmar um por um. **Regra:** o React de hoje é só o painel administrativo; tela do painel nunca prova que um RF do usuário ou do pesquisador está cumprido ou descumprido (ver abaixo). **02-10-2026:** RF-019, 050, 069, 070, 071, 072, 104, 117 e 120 conferidos e saíram da lista (achado: faltava a sugestão de 30 dias do RF-069, feita, Grupo AI). Os que ficam dependem de módulo que ainda não existe (e-mail, contribuição, repasse, denúncia, página pública).
5. ~~Telas nunca vistas funcionando ao vivo.~~ **Feito (02-10-2026, `_aud-v-nunca-vistas-02-10.mjs`, banco local):** links acadêmicos no Alterar Usuário (adicionar e domínio errado recusado), suspensão na Minha Conta, 92009 e 91026 com mensagem na tela, F5 no T3, dica do tema e menu do celular. A paginação do "T4" não existe mais (o Campo de Testes tem T1 a T3 e a Guia).
6. ~~Campo de Testes com o mesmo comportamento das telas reais.~~ **Feito (03-10-2026):** o T2 e a fila real (Aprovar Campanhas) usam as mesmas peças de decisão (`useDecisaoAprovacao` e `decisao-aprovacao.tsx`): Rejeitar sem motivo mostra o erro no campo nos dois. Minhas Campanhas virou o T3 do Campo de Testes (o pesquisador não usa a área restrita); a Vida da Campanha Ativa virou T4.
7. ~~Tema escuro e contraste em todas as telas.~~ **Feito (02-10-2026):** axe nas 26 telas e 8 modais, nos dois temas: zero violações. Borda de campo passou de 1,48:1 para 3,26:1 (`--cor-borda-campo`), com anel no foco; rótulo da caixa de excluir conta corrigido (3,89 para a cor do erro).
8. ~~Celular: todas as telas em tela estreita.~~ **Feito (02-10-2026, `_aud-v-celular-todas-02-10.mjs`):** 390px, todas as telas e 6 modais, nenhuma rolagem lateral nem elemento saindo da tela.
9. ~~Acessibilidade: axe em todas as telas e uso só com teclado.~~ **Feito (02-10-2026, `_aud-v-axe-todas-02-10.mjs`):** zero violações; 100 ícones decorativos ganharam `aria-hidden` (o leitor de tela lia o desenho do ícone, o botão "Menu" era lido com um símbolo antes); campos das tabelas editáveis ganharam nome; foco de teclado visível em todas as telas do painel.
10. ~~Textos.~~ **Feito (30-09-2026): nenhum travessão nem "Termos" no plural na tela; a recusa por permissão mostra o nome, não o código.**
11. ~~Roteiros de teste que dependem de dado que sumiu.~~ **Feito (29-09-2026): `g5` e `g13` usam a pesquisadora Ana.**
12. ~~Simular o "modo produção".~~ **Feito (30-09-2026): suíte PGlite 27 (papel × ação), achou a exclusão de conta sem login (corrigida, Grupo AC). Grupo AC colado no Supabase (30-09-2026).**
13. Limpar os dados de teste dos roteiros no Supabase (contas "Teste G21", "Campanha E2E"...), com autorização do Lucas. **03-10-2026: autorizado; Grupo AJ do ATUALIZAR pronto para colar** (9 contas, 5 campanhas e as rejeições TESTE-PW; testado no banco local, com trava se houver contribuição, repasse, encerramento ou denúncia). Ficam de fora os testes à mão: contas teste@teste.com e teste2@teste2.com, campanhas "Campanha teste01" e "teste33".
14. ~~Padrões que o projeto proíbe e que escaparam (duas consultas simultâneas na mesma conexão).~~ **Feito (29-09-2026, `emSequencia`).**
15. Documentação que não bate com a tela. **02-10-2026:** as suítes 7 e 10 (documentação contra o código) passam; corrigidos o inventário de rotas (2 do "Esqueci a senha"), as contagens de funções e triggers, a tabela de componentes (`CartaoFormulario` e `FichaConsulta` saíram) e o `nest-cli.json` (2 DTOs que o Swagger não documentava).

#### ✅ Feito (30-09-2026), Grupo AE colado: excluir e bloquear comentário recebido

**Em palavras simples:** comentário não é rede social: só o dono da campanha (e o autor e a moderação) vê o comentário, e o público só vê os endossados. O dono agora exclui um comentário recebido num modal com duas saídas: **Excluir** (apaga de vez; o autor pode comentar de novo) e **Excluir e bloquear** (fica guardado e o autor não comenta mais naquela campanha). Ninguém é avisado. Sem mudança de requisito (cabe no RF-093) e sem tabela nova: o bloqueio reaproveita a regra de um comentário por campanha. Feito no banco (Grupo AE), no Nest (`DELETE /comentario/:id`) e na tela (T3 do Campo de Testes, reaproveitável no painel do pesquisador). Testado: suíte PGlite 29, simulação da colagem, ponta a ponta `_aud-g-excluir-comentario.mjs`. Detalhes em `DOCUMENTACAO_BD.md`, "Excluir e bloquear comentário recebido".

- **Comentários recebidos em Minhas Campanhas (30-09-2026, feito):** o Consultar do dono mostra os comentários (autor, data, texto) com Endossar, Excluir e Excluir e bloquear. Só React e Nest (nome do autor na listagem), sem mudança no banco. Testado: `_aud-g-comentarios-minhas-campanhas.mjs` (11 passos). Detalhes em `DOCUMENTACAO_FRONTEND.md`, "Comentários recebidos no Consultar do dono".
- **Falta:** denunciar o comentário à moderação, quando o módulo `19-denuncia` existir (denúncia contra o perfil do autor, já prevista no RF-107; o comentário denunciado fica guardado).

#### 🟡 Anotado (30-09-2026): sessões sem regra de acesso por dono

`sessao` tem regra de acesso aberta (`USING (true)`) de propósito: login e renovação acontecem antes de haver alguém logado. Quem decide de quem é a sessão é o Nest (confere o segredo do token e o dono). Na simulação, qualquer papel encerra a sessão de qualquer conta direto no banco. Não é brecha pela API hoje; fica anotado como defesa em profundidade a pensar no deploy.

#### ✅ Feito (30-09-2026), Grupo AD colado: `NOT NULL` nas colunas com valor padrão que aceitam vazio

**Resultado:** 39 colunas (as 34 da suíte de tipos e mais 6 que o Nest ainda não usa), menos `contribuicao.token_sessao`, que fica. Supabase conferido só lendo: nenhuma linha vazia. Suítes PGlite verdes nos dois modos (mais a suíte 28 nova), simulação da colagem dupla com linhas vazias de propósito, compilador do Nest, e ponta a ponta no banco local (roteiros `_aud-f1` e `_aud-f2`: conta nova, senha, upgrade, campanha com orçamento e cronograma, envio, catálogos, papéis, suspensão, fila aprovar/rejeitar, exclusões; tudo passou). Detalhes em `DOCUMENTACAO_BD.md`, "Colunas com valor padrão não aceitam vazio".

Plano original:

34 colunas têm `DEFAULT` (ex.: `criado_em DEFAULT NOW()`, `ativo DEFAULT TRUE`), mas o banco aceita gravar vazio nelas; quem garante que nunca ficam vazias é o costume do código, não o banco. A lista sai da suíte de teste de conferência de tipos (aviso "nulidade diferente"). **Nem todas devem mudar**: `contribuicao.token_sessao`, por exemplo, fica vazia de propósito quando a contribuição não é anônima. Plano pedido pelo Lucas:
1. **Auditoria no código inteiro:** coluna por coluna, onde é gravada e lida (SQL, Nest, React), e a lista de quais mudam e quais ficam, com o motivo, para o Lucas aprovar.
2. **Conferir o Supabase** (só leitura): nenhuma linha vazia nas colunas que vão mudar.
3. **Testes no código inteiro:** PGlite nos dois modos, compilador e lint do Nest e do React.
4. **Teste geral de ponta a ponta:** conta nova do zero, upgrade para pesquisador, criar campanha, entrar como admin e aprovar, criar um segundo pesquisador e comentar na campanha, voltar ao primeiro e endossar o comentário, e assim por diante.
5. Grupo do `ATUALIZAR` com aviso de parar o Nest (é `ALTER TABLE`).

#### 🟡 Para o futuro (29-09-2026): super auditoria de padrões de mercado

Pedido do Lucas: comparar o sistema inteiro com o que os sistemas de referência fazem (login e sessão, termos, moderação, campanha, pagamento, mensagens de erro, telas), para cada diferença dizer qual é o padrão de mercado, o que o projeto faz e se vale mudar. Motivo: citar o padrão de mercado ajuda muito a decidir. Não começar sem pedido; é "bem no futuro".

#### 🟡 Anotado (29-09-2026): dispatcher de triggers

Hoje `campanha` tem 17 triggers e `comentario` tem 8. Quando várias rodam no mesmo momento, o Postgres escolhe a ordem pela ordem alfabética do nome; o dispatcher seria uma trigger só por momento, chamando as regras numa ordem escrita. Ganho: ordem explícita e mensagem de erro previsível quando duas regras falhariam juntas. Custo: mexer nas regras mais críticas (aprovação, congelamento, prazo), com risco de regressão; as suítes de caracterização (1.050 casos) são a rede de proteção. Recomendação atual: não fazer. **O Lucas quer, mais para frente, uma documentação completa sobre isto para estudar pessoalmente** (como funciona a ordem hoje, o que mudaria, exemplos com as triggers reais), antes de decidir.

### Protótipo estático (sessão própria)

- Reputação em 4 faixas, seguir campanha e recompensas não têm presença visual no protótipo. Levantar como decisão, não encaixar numa rodada de "embelezar".

---

## 6. Registros que não são pendência (para não se perderem)


- **Descartados de propósito do roteiro do Atlas** (escopo enxuto): Next.js, Tailwind no JSX, i18n, gerador de módulo, versão na URL, e a maiúscula automática nos nomes (ficou só a limpeza de espaços).
- **Roteiro completo do Atlas:** `informacoes/ROTEIRO_INCORPORACAO_ATLAS.md` (Ondas 1 e 2 feitas).
