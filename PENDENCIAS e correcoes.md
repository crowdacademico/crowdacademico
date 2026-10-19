# Pendências e correções

> Só o que ainda NÃO foi feito, organizado por grupo. O que já está pronto ou fechado mora em `informacoes/HISTORICO/HISTORICO_PENDENCIAS_E_CORRECOES.md` (duas limpezas: 26-09-2026 e 27-09-2026), com o texto original. Citações de outros documentos a um item ou parte deste arquivo ("item 7", "parte 10", "Onda 1 das ideias do sistema Atlas") que não estejam aqui estão lá.

> 📌 **Numeração de RF (29-09-2026):** os requisitos vigentes têm 122 RFs, na numeração da `MATRIZ-RASTREABILIDADE-RF.md`. Citações de RF por número neste documento foram escritas em datas diferentes e podem estar em qualquer numeração anterior (pré-06-09-2026, V6, V7 ou V8). A `MATRIZ-RASTREABILIDADE-RF.md` já está inteira na numeração do V8 e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

**Grupos:** 0. Para a Alexia ler · 1. Levar para a revisão externa (Requisitos) · 2. Dependem de outro módulo · 3. No dia do deploy · 4. Fim do projeto · 5. Decisões do Lucas, sem pressa · 6. Registros que não são pendência.

---

## ⭐ Para discutir (anotado em 18-10-2026, no topo de propósito)

- **Colunas das tabelas, passo seguinte (largura mínima por tipo e respiro maior).** Medido em 18-10-2026 (20 telas, 1400 e 1920 px): a dança entre páginas acabou (coluna id fixa e `textoExibido`, DS-104), mas **6 tabelas rolam de lado a 1400 px** (Campanhas, Parâmetros, Denúncias, Pedidos de Encerramento, T2 e T5) e o respiro entre colunas é de cerca de 27 px. Aumentar o respiro hoje faria mais tabelas rolarem. Opções: um token de largura mínima por tipo de coluna (`--largura-coluna-status`, `-dinheiro`, `-data`...), tirar colunas das listas mais largas (deixar no Consultar) ou aceitar a rolagem. Decidir antes de mexer.
- **Rótulos longos que alargam a coluna da T5:** "perdida (o Nest reiniciou)" (coluna "no provedor") e "Cartão (a liberar)" (coluna "meio"). Como a coluna reserva o maior rótulo da lista inteira (DS-104), um rótulo mais curto deixaria a tabela menos larga. Ex.: "perdida", com a explicação no ⓘ da tabela.
- **Reorganizar o `DESIGN_SYSTEM.md` (Lucas, 18-10-2026, para o futuro, não agora):** as regras principais (core), como linha e coluna das tabelas (DS-100, DS-104, DS-105), passam para os números de destaque, para serem achadas primeiro. Junto da reorganização numérica de pastas e arquivos (seção de Pagamento).
- **Policy sem efeito em `contribuicao`** (`pol_contribuicao_update`, `USING (true)`): sem `GRANT UPDATE`, ela não faz nada. Tirar, como as de `repasse` e `auditoria_financeira` (Grupo BN)? Detalhe na seção de Pagamento.

**Financeiro comparado com o mercado (19-10-2026).** Feitos no mesmo dia: a contestação de cartão vai para revisão manual, e o repasse espera a carência de `repasse_carencia_dias` (15). Fica para decidir:
- **Pix com acréscimo contradiz a decisão de 12-10-2026.** A decisão "quem apoia paga a tarifa" (`PROXIMOS_MODULOS.md`, Grupo 8) diz que **o Pix nunca tem acréscimo**, mas o sistema soma `taxa_pagamento_pix` (R$ 1,99, a tarifa do Asaas) a todo Pix. O motivo legal citado na decisão, a MP 1.288/2025 (cobrança extra no Pix como prática abusiva), **perdeu a validade em junho de 2025** sem virar lei; a Lei 13.455/2017 permite preço diferente por meio de pagamento, se informado antes. Escolher: manter o acréscimo no Pix (e atualizar a decisão e o RF-060 levado à revisão) ou zerar `taxa_pagamento_pix` (e a plataforma paga a tarifa do Pix, inclusive na devolução).
- **Quem ressarce o dinheiro que volta depois do repasse.** Contestação de cartão e devolução por fraude do Pix (MED, até 80 dias) podem chegar depois da carência. O Catarse põe no termo que o criador ressarce, desconta do saldo dele e, se ele já sacou, cobra em 10 dias com multa de 10% (Termos de Uso, itens 7.9 e 7.10). Aqui: escrever a cláusula no Termo do Pesquisador (Lucas e Alexia) e decidir se o sistema registra a dívida e desconta do próximo repasse.
- **Quem apoiou pode desistir?** O Catarse aceita o pedido enquanto faltarem pelo menos 2 dias úteis para a campanha acabar (Central de Ajuda, "Quando e como acontecem reembolsos"). Aqui não existe. Se sim: botão na área de quem apoia, devolução pelo mesmo caminho do estorno.
- **Devolução que ninguém consegue receber** (boleto sem conta cadastrada, contribuição sem conta): fica em reembolso manual para sempre. O Catarse, depois de 120 dias sem dados bancários válidos, transfere o crédito para a plataforma (Termos de Uso, item 7.19). Decidir o prazo e escrever no Termo de Uso.
- **Conciliação de saldo** (conferir o saldo da conta no provedor com o que o sistema diz que deveria estar lá). Opções: (A) mostrar no painel, lado a lado, o saldo do provedor e o "dinheiro de terceiros" que a conta tem de ter (pago e ainda não repassado, a devolver, em reembolso manual), sem alerta; (B) o mesmo, conferido por uma tarefa diária que avisa quando o saldo fica abaixo do dinheiro de terceiros; (C) conciliação completa, linha a linha, do extrato do provedor com os eventos do sistema. Recomendada: (B), que pega dinheiro saindo sem aviso sem precisar contabilizar a receita da plataforma; a (C) é a das empresas grandes e pesada para o TCC.

---

## 0. 📌 Para a Alexia ler (conversar antes de fazer)

Nada aberto (03-10-2026). O "Aguardando" (pagamento que chega depois do fim da campanha) foi decidido e feito; a explicação continua no topo do `ACHADOS_PARA_DISCUTIR.md`.

---

## 1. Levar para a revisão externa

Quem atualiza os requisitos é o Lucas com a revisão externa; aqui fica só o que precisa ir no próximo pedido. A atualização dos requisitos de 29-09-2026 já absorveu o termo único, o 2FA (fica sem RF, como ideia do fim do projeto), o modelo flexível e o Alterar/Excluir do admin. A atualização de 04-10-2026 absorveu os 12 pontos levados naquele dia (validade do Pix, espera do Pix no encerramento, IP do aceite, contestação, re-aceite dos dois termos, exclusão de conta, taxa de conclusão e os parâmetros novos). Os itens abaixo não foram tratados nela e continuam abertos.

- **Tipografia do painel padronizada** (6 classes em `2-tipografia.css`): citar no próximo pedido de revisão de interface, pedindo ideias para enxugar mais sem quebrar.
- **Destino do dinheiro quando a campanha encerra antes do prazo (17-10-2026, já implementado; Grupos BG e BH colados):** antes, o encerramento antecipado aprovado e o encerramento por moderação deixavam o dinheiro pago parado (nem repasse, nem devolução). A decisão do Lucas separou duas ações, cada uma com destino fixo, aplicado sozinho pelo sistema. Muda o texto de três requisitos (numeração da `MATRIZ-RASTREABILIDADE-RF.md`):
  - **RF-064.** Hoje: encerrar direto só sem contribuição confirmada; com contribuição, pedido ao Administrador. Novo: o pesquisador pode **cancelar o projeto** direto, sem o Administrador, **mesmo com contribuição confirmada**, e todo o valor já pago é devolvido a quem apoiou (continua bloqueado com Pix pendente ainda válido). O pedido ao Administrador passa a ser só **"encerrar antes do prazo e receber"**, permitido apenas em campanha flexível ou tudo-ou-nada que já bateu a meta.
  - **RF-066.** Hoje: aprovado o pedido, tudo-ou-nada devolve tudo e flexível repassa. Novo: aprovado o pedido, **repassa** ao pesquisador (flexível, ou tudo-ou-nada com a meta batida). ⚠️ Ponto central para a revisão: pelo texto atual, o pedido do seed da campanha 7 (tudo-ou-nada, meta batida, "objetivos atingidos antes do prazo") devolveria os R$ 45.000; pela decisão nova, repassa. Se a revisão preferir o texto atual, é uma linha em `destino_dinheiro_campanha` (05).
  - **RF-114.** Hoje: a moderação aplica "as regras de devolução correspondentes ao modelo da campanha", sem prejudicar doadores. Novo: a moderação **devolve tudo, em qualquer modelo**. Vale citar que é a exceção à "ausência de reembolso no modelo flexível" do Termo de Uso.
  - Pagamento que chega depois do encerramento segue o mesmo destino (antes ia para revisão manual).
- **Para o Lucas discutir com a revisão externa (29-09-2026; o Lucas acha que alguns pontos do V8 não batem):**
  - **Aceite pendente no próximo login:** vale para versão nova do Termo (RF-015). O V8 tirou a parte da conta criada pelo admin (nascer com senha provisória e aceite pendente), por ser ferramenta de teste; o Lucas quer rediscutir.
  - **Modelo da campanha pode mudar até a aprovação:** o V8 deixou implícito (congelamento na aprovação); hoje o formulário nem envia o modelo.
  - **Links no upgrade, "Projetos Criados" e validação de domínio dos links:** a resposta da revisão externa à comparação V8 × código tem pontos que o Lucas vai revisar com ela.
- **Taxas e página de Transparência (anotado em 05-10-2026, levar na semana de 12-10-2026; não mexer até lá):**
  - **Problema:** nenhum RF fala da página de Transparência, o RF-060 só define a taxa da plataforma (5% do valor bruto) e não está definido quem paga a tarifa do intermediador de pagamento. O Lucas quer que a página mostre as taxas de cartão, boleto, PIX e plataforma. A tela do protótipo mostra hoje uma divisão "88% / 7% / 5%" e taxas extras de cartão e boleto, nada disso vem de RF.
  - **Mercado (consultado em 05-10-2026):** Catarse 13%, com cerca de 4% para o intermediador (Pagar.me), cobrado do criador; Vakinha 6,4% + R$ 0,50 por doação, já incluindo as tarifas de PIX, boleto e cartão, cobrado do beneficiário; Kickante 10%, já incluindo tributos e tarifas; Benfeitoria com comissão livre (sugere 8%) mais 5% do intermediador, separados; Vaquinhas Online 7% + tarifa por transação, cobrados do doador (exceção). Intermediadores: Mercado Pago PIX 0%, cartão de 3,99% a 4,98% conforme o prazo, boleto R$ 3,49; Asaas PIX R$ 1,99, boleto R$ 1,99, cartão 1,99% + R$ 0,49.
  - **Decidido pelo Lucas (12-10-2026): opção (c), quem apoia paga a tarifa do meio, e o Pix não tem acréscimo** (a plataforma não pode correr risco de prejuízo, e a ideia é promover o Pix). A análise completa (as 3 opções com R$ 100, o risco das devoluções, a lei, como a (c) funciona peça por peça) e os textos para levar à revisão externa estão no `PROXIMOS_MODULOS.md`, Grupo 8, "Tarifa do meio de pagamento: quem paga". Os textos antigos, escritos para a opção (a), foram substituídos por esses.
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

**Levar para a revisão externa quando o `4-mail` estiver pronto (pesquisa de mercado de 12-10-2026):** lembretes para quem segue a campanha ("faltam 48 h" e "faltam 8 h" para o fim, como faz o Kickstarter) e o endosso de colegas antes de enviar a campanha para aprovação (como faz o Experiment.com; este só com requisito novo).

### Pagamento (feito em 17 e 18-10-2026; visão completa em `DOCUMENTACAO_FINANCEIRO.md`)

#### 🔴 Pendência aberta (17-10-2026): o túnel (`cloudflared`) nos computadores da escola

- **O problema:** para testar o webhook do Asaas sandbox no computador, é preciso um túnel (ver `.Tutorial-plataforma-pagamento-sandbox.md`, Parte 2). O `cloudflared` é um programa do Windows, não um pacote do projeto: o `npm install` não o traz. Num computador da escola, que apaga tudo todo dia, ele teria de ser instalado de novo a cada vez, e o `winget install --id Cloudflare.cloudflared` pode nem funcionar se o computador bloquear instalação.
- **A pergunta do Lucas:** vai ser preciso rodar o `winget` toda vez na escola, ou dá para o túnel vir junto do `npm install`?
- **Opção 1 (recomendada):** acrescentar o pacote npm `cloudflared` ao `nest/` e um atalho `npm run tunel`. O `npm install` de sempre baixa o túnel junto, sem instalar nada no Windows nem pedir administrador. Risco: a rede da escola bloquear o download do programa (o pacote baixa o executável na instalação); aí vale a opção 2.
- **Opção 2:** o `cloudflared.exe` portátil (um arquivo só, roda sem instalar), baixado uma vez e guardado no Drive ou pendrive, copiado para o computador a cada dia.
- **Atenuante:** para o teste do dia a dia, o túnel não é obrigatório. A "conferência com o provedor" (Parte 2 do tutorial) confirma o Pix sem aviso nenhum. O túnel só é obrigatório para testar o webhook de verdade e a validação de saque.
- **Atualização (18-10-2026): túnel trocado pelo ngrok, com endereço fixo.** `npm run tunel` (em `nest/`) abre o túnel; o ngrok vem pelo `npm install` (pacote `@ngrok/ngrok`), sem instalar nada no Windows, e as URLs no Asaas foram cadastradas uma vez só (tutorial, Parte 6B). **Falta só confirmar na escola** que a rede deixa o ngrok funcionar; se não deixar, o Cloudflare (Parte 6) é o plano B.
- **Como fechar:** o Lucas roda `npm install` e `npm run tunel` (em `nest/`) num computador da escola (semana de 19-10-2026). Funcionando, a pendência fecha; senão, plano B (Cloudflare, opções 1 e 2 acima).

#### 🟡 Testes no sandbox que faltam (próximos dias, com o Lucas)

- **Cartão** numa campanha flexível (cartão de teste 4444 4444 4444 4444 aprova; 5184019740373151 recusa), até o repasse da parte liberada.
- **Boleto:** ligar `boleto_habilitado` em Parâmetros; gerar, pagar ("Confirmar pagamento" no sandbox), repasse, e a devolução por link num cancelamento (vai para reembolso manual com o link).
- **Tela "Concluir reembolso"** com as contribuições 56, 59, 60, 61 e 63 do Supabase, que chegam ao reembolso manual sozinhas depois das 8 tentativas (o banco simulado recusa devolver Pix de pagador fictício).
- **Revisão manual da caixa de avisos:** os avisos parados de 17 e 18-10-2026 devem aparecer na tela de revisões do pagamento 24 horas depois de chegar, com o motivo.
- **`npm run start:dev:teste`: FEITO (18-10-2026).** Modo rápido (provedor de teste) sem mexer no `.env`; a T5 mostra em qual modo está e todos os botões funcionam nele; tutorial, seção "Modo rápido" no topo. Provado de ponta a ponta no banco local (20 de 20 checagens).

#### 🟡 Ainda aberto no pagamento

- **Checkout e painel de quem apoia** (`views/checkout` e `views/dash-doador`, pastas vazias): a tela pública de apoiar. Hoje uma contribuição nasce pela T5 ou pela API. Junto vem o **aviso ao apoiador** sobre o modelo da campanha (tudo-ou-nada devolve, flexível não) com confirmação de ciência.
- **Pastas vazias `nest/src/23-repasse` e `nest/src/24-auditoria-financeira`: NÃO remover agora** (Lucas, 18-10-2026). Entram na **reorganização de pastas, arquivos e nomes**: tudo com número, assuntos parecidos em sequência numérica, e o mesmo número no código (Nest, React) e na documentação. Projeto próprio, a planejar antes de mexer (escopo enxuto: propor o pequeno e seguro primeiro).
- **Policy sem efeito em `contribuicao`** (`pol_contribuicao_update`, `USING (true)`, 04): o `app_nestjs` não tem `GRANT UPDATE` na tabela, então ela não faz nada e está "mantida só por documentação". Mesma situação das policies de escrita de `repasse` e `auditoria_financeira`, que saíram em 18-10-2026 (Grupo BN). Tirar também? Decisão do Lucas.

### Página pública da campanha (ainda não existe)

- **Botões de compartilhar** (WhatsApp, Facebook, copiar link) e **prévia de link** (Open Graph, um endpoint pequeno no Nest que devolve as meta tags). Ideias do Atlas (P1 e P2 do roteiro).
- **Quantas pessoas seguem a campanha:** hoje cada conta só enxerga o próprio "seguir" (regra de acesso de `seguir_campanha`). Mostrar o número no Consultar e na página pública pede uma contagem que o banco devolve sem expor quem segue.
- Telas públicas de denúncia, recompensa, atualização, comentário e seguir (hoje atualização, comentário e seguir só existem nas telas de teste do painel). Painel do pesquisador (`views/dash-pesquisador`, pasta vazia).

### Motor do score (fechado em 03-10-2026; ficaram estes pontos)

#### 🟡 Gravidade por motivo de denúncia (03-10-2026, para discutir depois)

- **Gravidade:** cada motivo de denúncia teria um peso de 1 a 3 (ex.: fraude pesa mais que conteúdo impróprio). O Lucas achou interessante, mas talvez um exagero: denúncia grave e verdadeira já encerra a campanha na hora. Detalhes em `ACHADOS_PARA_DISCUTIR.md`. O acúmulo foi resolvido em 12-10-2026 (histórico).


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
- **Teste de fumaça do pagamento em produção (18-10-2026):** uma contribuição de **R$ 1 de verdade**, paga com o Pix do próprio Lucas, numa campanha de teste tudo-ou-nada, e depois "Cancelar o projeto". Confere o que o sandbox não consegue simular: o dinheiro **voltando** para quem apoiou (no sandbox o pagador é sempre fictício e o banco simulado recusa devolver; ver `.Tutorial-plataforma-pagamento-sandbox.md`, Parte 12). Custo: só a tarifa (R$ 0,99). É o padrão do mercado: todo sistema de pagamento faz um teste com valor mínimo em produção antes de abrir.
- **Apagar a conta de testes "Apoiador" do `nest/.env`** (`ASAAS_API_KEY_APOIADOR`, 18-10-2026): só serve aos testes no sandbox (segunda conta que paga e recebe devolução). Mantida até o deploy por decisão do Lucas.
- **`trust proxy` no Nest:** atrás de um proxy (servidor de hospedagem), o Nest precisa confiar nele para ler o IP real de quem contribui (gravado no aceite do Termo, `aceite_termo_contribuicao.ip_aceite`) e de quem faz login. Sem isso, todo IP gravado seria o do proxy.
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

#### 🟡 Ideia para o fim do projeto: auditoria de acessibilidade WCAG

**Em palavras simples:** a WCAG é o guia internacional de acessibilidade para sites (o padrão que órgãos públicos e boas empresas seguem). O sistema já segue partes dela: contraste das cores conferido por teste (`npm run contraste`), nomes acessíveis nos botões, e, desde 13-10-2026, a regra 2.2.1 (tempo ajustável): o aviso que some sozinho pausa com o mouse em cima ou com o foco do teclado dentro.

**A ideia:** com o sistema pronto, fazer uma auditoria inteira pelos critérios da WCAG 2.2 (nível AA), tela por tela: tempo e movimento (2.2.1 e 2.2.2), navegação só pelo teclado, ordem do foco, textos alternativos, mensagens de erro ligadas ao campo, zoom de 200% e tela de celular. Ferramenta: o axe (já usado em rodadas anteriores) mais conferência manual, porque a ferramenta automática pega só parte dos problemas. **Só começar quando todos os módulos estiverem prontos**, como os testes com Playwright abaixo.

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

#### 🟡 Anotado (12-10-2026): reorganizar o seed para a demonstração mostrar todas as situações

Sem criar registro novo: reorganizar os dados que já existem para a demonstração ter pelo menos um pesquisador em cada faixa do score (inclusive "Atenção", que ficou vazia com o acúmulo de denúncias), score alto e baixo, denúncias em cada etapa para a moderação julgar, e assim por diante. Antes não dava (os módulos de denúncia, contestação e encerramento não existiam); agora dá. Provavelmente pede recriar o banco do zero, e o Lucas já conta com isso.

### Protótipo estático (sessão própria)

- Reputação em 4 faixas, seguir campanha e recompensas não têm presença visual no protótipo. Levantar como decisão, não encaixar numa rodada de "embelezar".
- **Cadastro do protótipo simula uma verificação do Lattes que o sistema não faz (anotado em 05-10-2026).** Onde ver: painel "Telas do protótipo" > "10. Cadastro" > escolher "Sou pesquisador" > avançar até o passo 3. O botão "Validar" do ID Lattes mostra "Vínculo encontrado no Lattes" e bloqueia o avanço até essa validação. O RF-022 diz outra coisa: o pesquisador escolhe o tipo de link (Lattes, ORCID, ResearchGate, LinkedIn ou GitHub) e cola o endereço, o sistema só confere se o endereço é do site certo, e os links são opcionais (até 5). Sugestão: trocar o botão por tipo + endereço, conferido enquanto a pessoa digita e sem bloquear o avanço. Diferença anotada, sem mudar agora: pelo RF-022 quem vira pesquisador é um usuário já cadastrado, que pede o upgrade depois; o protótipo faz isso no próprio cadastro.

---

## 6. Registros que não são pendência (para não se perderem)


- **Descartados de propósito do roteiro do Atlas** (escopo enxuto): Next.js, Tailwind no JSX, i18n, gerador de módulo, versão na URL, e a maiúscula automática nos nomes (ficou só a limpeza de espaços).
- **Documentação contra o código:** as suítes PGlite 7 e 10 conferem a cada rodada; ficam verdes a cada módulo novo.
- **Roteiro completo do Atlas:** `informacoes/todas as auditorias/ROTEIRO_INCORPORACAO_ATLAS.md` (Ondas 1 e 2 feitas).
