# Pendências e correções

> Só o que ainda NÃO foi feito, organizado por grupo. O que já está pronto ou fechado mora em `informacoes/HISTORICO/HISTORICO_PENDENCIAS_E_CORRECOES.md` (duas limpezas: 26-09-2026 e 27-09-2026), com o texto original. Citações de outros documentos a um item ou parte deste arquivo ("item 7", "parte 10", "Onda 1 das ideias do sistema Atlas") que não estejam aqui estão lá.

> 📌 **Numeração de RF (29-09-2026):** os requisitos vigentes têm 122 RFs, na numeração da `MATRIZ-RASTREABILIDADE-RF.md`. Citações de RF por número neste documento foram escritas em datas diferentes e podem estar em qualquer numeração anterior (pré-06-09-2026, V6, V7 ou V8). A `MATRIZ-RASTREABILIDADE-RF.md` já está inteira na numeração do V8 e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

**Grupos:** 0. Para a Alexia ler · 1. Levar para a revisão externa (Requisitos) · 2. Dependem de outro módulo · 3. No dia do deploy · 4. Fim do projeto · 5. Decisões do Lucas, sem pressa · 6. Registros que não são pendência.

---

## 0. 📌 Para a Alexia ler (conversar antes de fazer)

Nada aberto (03-10-2026). O "Aguardando" (pagamento que chega depois do fim da campanha) foi decidido e feito; a explicação continua no topo do `ACHADOS_PARA_DISCUTIR.md`.

---

## 1. Levar para a revisão externa

Quem atualiza os requisitos é o Lucas com a revisão externa; aqui fica só o que precisa ir no próximo pedido. A atualização dos requisitos de 29-09-2026 já absorveu o termo único, o 2FA (fica sem RF, como ideia do fim do projeto), o modelo flexível e o Alterar/Excluir do admin. A atualização de 04-10-2026 absorveu os 12 pontos levados naquele dia (validade do Pix, espera do Pix no encerramento, IP do aceite, contestação, re-aceite dos dois termos, exclusão de conta, taxa de conclusão e os parâmetros novos). Os itens abaixo não foram tratados nela e continuam abertos.

- **Tipografia do painel padronizada** (6 classes em `2-tipografia.css`): citar no próximo pedido de revisão de interface, pedindo ideias para enxugar mais sem quebrar.
- **Para o Lucas discutir com a revisão externa (29-09-2026; o Lucas acha que alguns pontos do V8 não batem):**
  - **Aceite pendente no próximo login:** vale para versão nova do Termo (RF-015). O V8 tirou a parte da conta criada pelo admin (nascer com senha provisória e aceite pendente), por ser ferramenta de teste; o Lucas quer rediscutir.
  - **Modelo da campanha pode mudar até a aprovação:** o V8 deixou implícito (congelamento na aprovação); hoje o formulário nem envia o modelo.
  - **Links no upgrade, "Projetos Criados" e validação de domínio dos links:** a resposta da revisão externa à comparação V8 × código tem pontos que o Lucas vai revisar com ela.
- **Taxas e página de Transparência (anotado em 05-10-2026, levar na semana de 12-10-2026; não mexer até lá):**
  - **Problema:** nenhum RF fala da página de Transparência, o RF-060 só define a taxa da plataforma (5% do valor bruto) e não está definido quem paga a tarifa do intermediador de pagamento. O Lucas quer que a página mostre as taxas de cartão, boleto, PIX e plataforma. A tela do protótipo mostra hoje uma divisão "88% / 7% / 5%" e taxas extras de cartão e boleto, nada disso vem de RF.
  - **Mercado (consultado em 05-10-2026):** Catarse 13%, com cerca de 4% para o intermediador (Pagar.me), cobrado do criador; Vakinha 6,4% + R$ 0,50 por doação, já incluindo as tarifas de PIX, boleto e cartão, cobrado do beneficiário; Kickante 10%, já incluindo tributos e tarifas; Benfeitoria com comissão livre (sugere 8%) mais 5% do intermediador, separados; Vaquinhas Online 7% + tarifa por transação, cobrados do doador (exceção). Intermediadores: Mercado Pago PIX 0%, cartão de 3,99% a 4,98% conforme o prazo, boleto R$ 3,49; Asaas PIX R$ 1,99, boleto R$ 1,99, cartão 1,99% + R$ 0,49.
  - **Opções levantadas:** (a) taxa única "tudo incluído" (padrão do mercado), com a Transparência mostrando a composição por meio de pagamento; (b) taxa da plataforma mais a tarifa do meio descontada do pesquisador; (c) a tarifa do meio paga por quem apoia, somada no pagamento. A sugestão foi (a).
  - **Textos propostos para os requisitos, se (a) for aprovada:**
    - **RF-060, acrescentar ao fim:** "A taxa da plataforma já inclui os custos do intermediador de pagamento, qualquer que seja o meio de pagamento, e o contribuinte não paga nenhum valor além da contribuição."
    - **RF novo:** "O sistema deve exibir uma página pública de transparência financeira, acessível sem login, contendo: a taxa vigente da plataforma; a composição dessa taxa, separando o custo do intermediador de pagamento por meio de pagamento (PIX, cartão de crédito, cartão de débito e boleto) e a parte que fica com a plataforma; e uma simulação do valor líquido que chega ao pesquisador a partir de um valor informado. Os custos de cada meio de pagamento são parâmetros configuráveis pelo Administrador." Origem sugerida: RU-02 e RU-16, ou um RU novo do visitante ("consultar as taxas antes de contribuir").
    - **RF-090:** acrescentar "custos de cada meio de pagamento" à lista de parâmetros configuráveis.
  - **Ponto de negócio, sem pressa:** com 5% de taxa e o cartão custando de 4% a 5%, a plataforma fica perto de zero em cada contribuição por cartão.
  - **Depois da decisão:** refazer a tela de Transparência do protótipo, tirando o "88/7/5".
  - **Fontes:** Catarse (crowdfunding.catarse.com.br/nossa-taxa e /legal/termos-de-uso), Vakinha (vakinha.com.br/taxas-e-prazos), Kickante (kickante.com.br, "Como funciona o crowdfunding"), Benfeitoria (parcerias.benfeitoria.com/faq), Clube de Apoio (clubedeapoio.com.br/taxas), Mercado Pago (blog "Quanto custa receber pagamentos via Pix" e calculadoradetaxas.com.br/mercado-pago/taxas), Asaas (blog.asaas.com/taxas-asaas).
- **Frases para a próxima versão dos requisitos (anotado em 10-10-2026; já funcionando no sistema, ver `DOCUMENTACAO_BD.md`, [01-B-1] e [07-B-3]):**
  - **Curador aprova e rejeita campanhas:** os RFs que dizem "aprovação pelo Administrador" podem ganhar "ou outro papel com a permissão correspondente (o Curador)", do mesmo jeito que o RF-114 cita o Moderador.
  - **Contestação da pontuação:** além de quem registrou a denúncia, quem julgou a denúncia também não decide a contestação dela.
- **Como o Lucas quer esse pedido escrito:** "pegar no pé" da revisão externa, pedir que olhe sistemas de referência e traga ideias próprias, não só responda a lista.

---

## 2. Dependem de outro módulo ou de outra coisa existir

> **Nota do Lucas (27-09-2026):** 18, 19, 20 e 26 podem ganhar tela na área administrativa (nem que seja na área de testes) antes da página pública existir. Não é para fazer agora, mas o lado Nest desses módulos não depende da página pública.

### Módulos `18-recompensa` e `26-notificacao` (ainda não existem)

- **18:** recompensas por faixa de contribuição, com `link_recompensa` e `arquivo_recompensa`. As regras já estão no banco.
- **26:** expor pelo Nest a tabela `notificacao`. Destrava a prévia de notificações do Dashboard (hoje um aviso honesto de "não implementado") e a segunda aba do sino.

### Módulo `4-mail` (ainda não existe)

#### 🟡 Fluxo de autenticação: falta o que depende de e-mail

Já existe: cadastro, login, renovação de sessão (o token antigo é revogado a cada renovação), logout, bloqueio da conta por tentativas erradas e limite de tentativas por IP.

Falta, e depende do `4-mail`:
- recuperação de senha (o prazo de 15 a 30 minutos do token já está documentado no `01`);
- verificação de e-mail com e-mail de verdade (hoje usa um link de desenvolvimento);
- e-mail de rejeição de campanha com os reenvios restantes e a data limite (os dados já vêm em `GET /campanha/:id`);
- e-mails do encerramento antecipado: pedido aprovado ou rejeitado (com a justificativa) para o pesquisador, e o aviso aos apoiadores quando a campanha é encerrada (RF-065, RF-066);
- e-mail do resultado da contestação do score (aceita ou recusada, com a justificativa) para o pesquisador (RF-033); hoje o resultado aparece na Minha Conta;
- "modo log" no desenvolvimento, em que o e-mail aparece no log em vez de ser enviado (ideia do `.env` do Atlas, grupo 5).

### Pagamento: `22-contribuicao`, `23-repasse`, `24-auditoria-financeira`, gateway e checkout (por último, de propósito)

#### 🔴 O que o banco do dinheiro ainda deixa passar (sondagem de 03-10-2026)

Provado no PGlite (`informacoes/testes-banco/_aud-contribuicao-sondagem.mjs`); detalhe e comparação com o Catarse no relatório `informacoes/todas as auditorias/SUPER_AUDITORIA_PREPARACAO_03-10-2026.md`, seção 7. Fazer no começo do módulo, antes do gateway:
- **Ordem de status da contribuição:** hoje o status pode voltar para trás (devolvido para confirmado, pendente para repassado). Inclui recusar a confirmação que chega depois de a campanha ser encerrada.
- **Transação do gateway única:** `id_transacao_api` sem `UNIQUE`; o gateway reenvia o mesmo aviso. E o webhook precisa achar a contribuição pela transação, não pelo nosso id.
- **Repasse:** um por campanha, líquido menor ou igual ao bruto, e só de campanha encerrada.
- **Auditoria financeira imutável e automática:** DECIDIDO (03-10-2026), ver `DOCUMENTACAO_BD.md`, [05-K-2-F].
- **Escrita de `repasse` e `auditoria_financeira` sem regra no banco** (regra de acesso `USING (true)`): a escrita fica num serviço único do Nest, chamado só pelo webhook do gateway (com a assinatura conferida), nunca numa rota comum. Por isso só fecha junto do gateway.
- **Gravar o IP no aceite de cada contribuição:** o Termo v5, o prazo de 5 anos (parâmetro) e a limpeza diária já estão feitos (03-10-2026, `DOCUMENTACAO_BD.md`, retenção do log). Falta, no módulo: o Nest pegar o IP da requisição de quem contribui (inclusive anônimo) e gravar em `aceite_termo_contribuicao.ip_aceite`. No deploy, atrás de um proxy, o Nest precisa confiar no proxy para ler o IP real (`trust proxy`).
- **Contribuições no Consultar da campanha:** a consulta da gestão (Campanhas) passa a mostrar as contribuições (quantas, quanto, por meio de pagamento) quando o módulo existir.

#### 🟡 Pendência aberta (24-09-2026): modelo de campanha `flexivel` existe no banco, no seed e no V7, mas o sistema não o exercita de ponta a ponta

Apontado pela revisão externa (resposta de 20-09) como "metade dos modelos não existe". Conferido: o **REQUISITOS_V7 promete os dois modelos**, então a pergunta "manter ou tirar o valor do enum" não se aplica; o enum fica. O que falta é implementar o lado flexível:

- **Criação:** o wizard (`corpoDadosCampanha()`) não envia `modelo`, então toda campanha nasce `all-or-nothing`. O DTO de `PATCH` também não aceita `modelo`, de propósito (mudar o modelo depois de criada é decisão de produto em aberto, comentário em `campanha.request-update.ts`).
- **Regras do banco:** existem `fn_valida_repasse_all_or_nothing` e `validar_contribuicao_all_or_nothing`, mas nenhuma regra correspondente para o flexível (repasse independente de atingir a meta, com a taxa descontada).
- **Encerramento antecipado aprovado (03-10-2026):** a campanha já é encerrada; falta devolver tudo no Tudo ou Nada e registrar o repasse no Flexível (RF-066), igual ao encerramento por moderação.
- **Encerramento:** o requisito de encerramento do flexível (repasse registrado com valor bruto, taxa, líquido e indicação de meta atingida ou não) não tem implementação.
- **Aviso ao doador:** o aviso destacado e a confirmação de ciência antes da contribuição dependem da tela de checkout, que não existe.
- **Só existe em dado:** `07_seed_dados.sql` tem uma campanha flexível (a do repasse `parcial_processando`), e o tipo aparece em `db.types.ts` e `campanha.type.ts`.

**Depende de:** módulo de contribuição/pagamento (Grupo 8) e checkout. Não iniciar antes. Decidido no V8: o modelo pode mudar enquanto a campanha não foi aprovada e congela na aprovação (o banco já congela). O IP do contribuinte anônimo foi decidido nos requisitos em 04-10-2026 (RF-082): guardado no aceite, inclusive no anônimo, pelo prazo configurável.

- **Gateway:** fica por último. Os testes serão em sandbox, mas sandbox não é desculpa para fazer mal feito: assinatura do webhook, idempotência, reconciliação, máquina de estados de `contribuicao`/`repasse` (`PROXIMOS_MODULOS.md`).
- **Painel do doador** (`views/dash-doador`, pasta vazia) e **checkout** (`views/checkout`, vazia).

### Página pública da campanha (ainda não existe)

- **Botões de compartilhar** (WhatsApp, Facebook, copiar link) e **prévia de link** (Open Graph, um endpoint pequeno no Nest que devolve as meta tags). Ideias do Atlas (P1 e P2 do roteiro).
- **Quantas pessoas seguem a campanha:** hoje cada conta só enxerga o próprio "seguir" (regra de acesso de `seguir_campanha`). Mostrar o número no Consultar e na página pública pede uma contagem que o banco devolve sem expor quem segue.
- Telas públicas de denúncia, recompensa, atualização, comentário e seguir (hoje atualização, comentário e seguir só existem nas telas de teste do painel). Painel do pesquisador (`views/dash-pesquisador`, pasta vazia).

### Motor do score (fechado em 03-10-2026; ficaram estes pontos)

#### 🟡 Gravidade por motivo e acúmulo de denúncias (03-10-2026, para discutir depois)

- **Gravidade:** cada motivo de denúncia teria um peso de 1 a 3 (ex.: fraude pesa mais que conteúdo impróprio). O Lucas achou interessante, mas talvez um exagero: denúncia grave e verdadeira já encerra a campanha na hora. Detalhes em `ACHADOS_PARA_DISCUTIR.md`.
- **Acúmulo:** hoje cada denúncia procedente conta, mesmo quando várias pessoas denunciam o mesmo fato na mesma campanha. Opção a discutir: contar campanhas com denúncia procedente, não denúncias.


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

- **Banco de produção:** rodar o `07_seed_dados.sql` só até o marcador `[07-DEMONSTRACAO]` e promover a primeira conta a admin uma vez (ver `.Tutorial-rodar-projeto.md`).
- **Banco depois do deploy: mudança vira arquivo novo numerado** (começando em 09, depois 10, e assim por diante), nunca edição dos arquivos `01` a `08` nem só o `ATUALIZAR`. O executor de migrações (`npm run db:migrate`) aplica só o que é novo e avisa, sem reaplicar, quando um arquivo já aplicado muda. No primeiro deploy: `npm run db:migrate:adotar` no banco que já tem tudo, e `DATABASE_URL_MIGRATIONS` com a credencial de administrador do banco.
- **Registro de acessos (Marco Civil da Internet, art. 15):** quem opera como empresa precisa guardar IP, data e hora de cada acesso por 6 meses. Hoje o IP fica só nos aceites e no último login. Só vale se o sistema entrar em operação; detalhe em `DOCUMENTACAO_BD.md`, "IP: base legal e anonimato do Pix".
- **Docker** do Nest e do React (F2 do roteiro do Atlas, com o `docker/` deles como referência).
- **`react/.gitignore` não cobre `.env`:** inofensivo hoje (o `.env` só tem a URL da API); só volta à tona se o conteúdo do `.env` mudar ou no deploy.
- **CORS por lista de endereços** (ver grupo 5, segurança): se não for feito antes, entra aqui.
- **Roteiros de tela que esperam o modo produção** (hoje toda conta logada lê tudo, pela leitura liberada de desenvolvimento): `g10-permissoes-na-tela.mjs`, caso "Pesquisadora: /admin/usuarios mostra erro de permissão", e `g14-toast-e-busca.mjs`, caso "Conta sem permissão abre o dashboard: UM aviso de erro". Vistos em 28-09-2026.
- **Roteiro de API `gapi-401-403-404.mjs` espera o modo produção:** hoje 2 casos falham porque toda conta logada vê tudo (Grupo O, leitura liberada de desenvolvimento). Rodar de novo num banco montado sem a parte de demonstração do `07`.

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

Lucas decide depois se ajudam o CrowdAcadêmico. Contexto em `informacoes/todas as auditorias/ROTEIRO_INCORPORACAO_ATLAS.md`.

- **Lista de origens permitidas (CORS):** a API do Atlas só aceita chamadas dos endereços de uma lista no `.env`. A nossa aceita chamadas de qualquer site (`app.enableCors()` sem opções, `nest/src/main.ts`). Correção pequena e pré-requisito da pendência do cookie HttpOnly (cookie com credencial exige origem explícita).
- **Configuração da sessão em cookie:** o Atlas usa cookie HttpOnly com tempo de vida e regras de envio (`SESSION_LIFETIME`, `SESSION_SECURE_COOKIE`, `SESSION_SAME_SITE`) no `.env`. Referência pronta para a pendência "refresh token em cookie HttpOnly".
- **E-mail em "modo log" no desenvolvimento:** `MAIL_MAILER=log` faz o e-mail aparecer no log em vez de ser enviado. Serve para quando o módulo de e-mail (`nest/src/4-mail`, hoje vazio) for construído.

- **Permissão por rota no painel:** a guarda do `/admin/*` só exige login, não confere o papel (quem vê o quê continua decidido pelo backend). "Fica para perto do fim".

### Visual e marca

- **Branch `feat/novas-telas-teste` (02-10-2026):** tem o Dashboard em seções ("Precisa de você") e os links acadêmicos em cartões no celular, feitos antes das regras visuais novas. Decidir se entram no main, refeitos com as regras do `DESIGN_SYSTEM.md`, ou se a branch é descartada.

- **Gestão de logo e favicon:** a aba Identidade Visual do Dashboard é só um espaço reservado.

### Estrutura e ferramentas

#### 🟡 Aberto da super auditoria de 29-09-2026

- **RFs 🟡 "não conferido a fundo" na matriz:** os que ficam dependem de módulo que ainda não existe (e-mail, contribuição, repasse, página pública); conferir cada um quando o módulo nascer. **Regra:** o React de hoje é só o painel administrativo; tela do painel nunca prova que um RF do usuário ou do pesquisador está cumprido ou descumprido.

#### 🟡 Anotado (30-09-2026): sessões sem regra de acesso por dono

`sessao` tem regra de acesso aberta (`USING (true)`) de propósito: login e renovação acontecem antes de haver alguém logado. Quem decide de quem é a sessão é o Nest (confere o segredo do token e o dono). Na simulação, qualquer papel encerra a sessão de qualquer conta direto no banco. Não é brecha pela API hoje; fica anotado como defesa em profundidade a pensar no deploy.

#### 🟡 Para o futuro (29-09-2026): super auditoria de padrões de mercado

Pedido do Lucas: comparar o sistema inteiro com o que os sistemas de referência fazem (login e sessão, termos, moderação, campanha, pagamento, mensagens de erro, telas), para cada diferença dizer qual é o padrão de mercado, o que o projeto faz e se vale mudar. Motivo: citar o padrão de mercado ajuda muito a decidir. Não começar sem pedido; é "bem no futuro".

#### 🟡 Anotado (29-09-2026): dispatcher de triggers

Hoje `campanha` tem 17 triggers e `comentario` tem 8. Quando várias rodam no mesmo momento, o Postgres escolhe a ordem pela ordem alfabética do nome; o dispatcher seria uma trigger só por momento, chamando as regras numa ordem escrita. Ganho: ordem explícita e mensagem de erro previsível quando duas regras falhariam juntas. Custo: mexer nas regras mais críticas (aprovação, congelamento, prazo), com risco de regressão; as suítes de caracterização (1.050 casos) são a rede de proteção. Recomendação atual: não fazer. **O Lucas quer, mais para frente, uma documentação completa sobre isto para estudar pessoalmente** (como funciona a ordem hoje, o que mudaria, exemplos com as triggers reais), antes de decidir.

### Protótipo estático (sessão própria)

- Reputação em 4 faixas, seguir campanha e recompensas não têm presença visual no protótipo. Levantar como decisão, não encaixar numa rodada de "embelezar".
- **Cadastro do protótipo simula uma verificação do Lattes que o sistema não faz (anotado em 05-10-2026).** Onde ver: painel "Telas do protótipo" > "10. Cadastro" > escolher "Sou pesquisador" > avançar até o passo 3. O botão "Validar" do ID Lattes mostra "Vínculo encontrado no Lattes" e bloqueia o avanço até essa validação. O RF-022 diz outra coisa: o pesquisador escolhe o tipo de link (Lattes, ORCID, ResearchGate, LinkedIn ou GitHub) e cola o endereço, o sistema só confere se o endereço é do site certo, e os links são opcionais (até 5). Sugestão: trocar o botão por tipo + endereço, conferido enquanto a pessoa digita e sem bloquear o avanço. Diferença anotada, sem mudar agora: pelo RF-022 quem vira pesquisador é um usuário já cadastrado, que pede o upgrade depois; o protótipo faz isso no próprio cadastro.

---

## 6. Registros que não são pendência (para não se perderem)


- **Descartados de propósito do roteiro do Atlas** (escopo enxuto): Next.js, Tailwind no JSX, i18n, gerador de módulo, versão na URL, e a maiúscula automática nos nomes (ficou só a limpeza de espaços).
- **Documentação contra o código:** as suítes PGlite 7 e 10 conferem a cada rodada; ficam verdes a cada módulo novo.
- **Roteiro completo do Atlas:** `informacoes/todas as auditorias/ROTEIRO_INCORPORACAO_ATLAS.md` (Ondas 1 e 2 feitas).
