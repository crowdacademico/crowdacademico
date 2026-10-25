# Pendências e correções

> Só o que ainda NÃO foi feito, organizado por grupo. O que já está pronto ou fechado mora em `informacoes/HISTORICO/HISTORICO_PENDENCIAS_E_CORRECOES.md` (duas limpezas: 26-09-2026 e 27-09-2026), com o texto original. Citações de outros documentos a um item ou parte deste arquivo ("item 7", "parte 10", "Onda 1 das ideias do sistema Atlas") que não estejam aqui estão lá.

> 📌 **Numeração de RF (24-10-2026):** os requisitos vigentes têm 125 RFs, na numeração da `MATRIZ-RASTREABILIDADE-RF.md`. Citações de RF por número neste documento foram escritas em datas diferentes e podem estar em qualquer numeração anterior (a numeração mudou várias vezes, a última em 24-10-2026). A `MATRIZ-RASTREABILIDADE-RF.md` está inteira na numeração vigente e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

**Grupos:** 0. Para a Alexia ler · 1. Levar para a revisão externa (Requisitos) · 2. Dependem de outro módulo · 3. No dia do deploy · 4. Fim do projeto · 5. Decisões em aberto, sem pressa · 6. Registros que não são pendência.

---

## ⭐ Para discutir (anotado em 18-10-2026, no topo de propósito)

- **Colunas das tabelas, passo seguinte (largura mínima por tipo e respiro maior).** Medido em 18-10-2026 (20 telas, 1400 e 1920 px): a dança entre páginas acabou (coluna id fixa e `textoExibido`, DS-104), mas **6 tabelas rolam de lado a 1400 px** (Campanhas, Parâmetros, Denúncias, Pedidos de Encerramento, T2 e T5) e o respiro entre colunas é de cerca de 27 px. Aumentar o respiro hoje faria mais tabelas rolarem. Opções: um token de largura mínima por tipo de coluna (`--largura-coluna-status`, `-dinheiro`, `-data`...), tirar colunas das listas mais largas (deixar no Consultar) ou aceitar a rolagem. Decidir antes de mexer.
  - **Condições (25-10-2026):** não tirar nenhuma coluna por enquanto. O caminho é **apertar** sem valor escrito à mão: por exemplo, o e-mail (`suporte@crowdacademico.com.br`) quebrar no "@" ou ganhar o "ler tudo", para a coluna não ficar tão larga. Fazer olhando as telas com o Playwright, tabela por tabela. Se alguma coluna for muito, muito menos útil e puder ficar só no Consultar, apontar e provar com a tela antes de tirar.
- **Reorganizar o `DESIGN_SYSTEM.md` (18-10-2026, para o futuro, não agora):** as regras principais (core), como linha e coluna das tabelas (DS-100, DS-104, DS-105), passam para os números de destaque, para serem achadas primeiro. Junto da reorganização numérica de pastas e arquivos (seção de Pagamento).

**Financeiro comparado com o mercado (19-10-2026).** Feitos no mesmo dia: a contestação de cartão vai para revisão manual, e o repasse espera a carência de `repasse_carencia_dias` (15). Fica para decidir:
- **Quem ressarce o dinheiro que volta depois do repasse.** Contestação de cartão e devolução por fraude do Pix (MED, até 80 dias) podem chegar depois da carência. O Catarse põe no termo que o criador ressarce, desconta do saldo dele e, se ele já sacou, cobra em 10 dias com multa de 10% (Termos de Uso, itens 7.9 e 7.10). Aqui: escrever a cláusula no Termo do Pesquisador (Lucas e Alexia) e decidir se o sistema registra a dívida e desconta do próximo repasse.
  - **Rascunho para estudar (25-10-2026, sem pressa; Lucas e Alexia reescrevem).** Base: Termos de Uso do Catarse, itens 7.9 e 7.10 (atualizados em 31-05-2026, https://crowdfunding.catarse.com.br/legal/termos-de-uso). Texto sugerido para o Termo do Pesquisador:
    - *Ressarcimento de valores contestados.* É responsabilidade do Pesquisador ressarcir à plataforma o valor de qualquer contribuição que, depois de repassada, seja contestada por quem pagou (contestação de cartão) ou devolvida pelo Mecanismo Especial de Devolução do Pix (MED), junto com as tarifas que o provedor de pagamento cobrar por essa contestação.
    - A plataforma pode descontar esse valor de um repasse ainda não feito ao Pesquisador, da mesma campanha ou de outra.
    - Sem repasse a descontar, o Pesquisador é avisado por e-mail e tem 10 (dez) dias, contados do aviso, para devolver o valor pela forma que a plataforma indicar.
    - Antes de cobrar, a plataforma informa ao Pesquisador o motivo da contestação e, quando houver, o prazo para apresentar defesa ao provedor de pagamento.
  - **O que decidir no estudo:** (1) multa e juros no atraso (o Catarse cobra 10% de multa, 1% de juros ao mês e correção pelo IPCA; num TCC gratuito talvez não faça sentido); (2) se o sistema registra a dívida e desconta sozinho do próximo repasse ou se fica só a cláusula; (3) a última frase (aviso e defesa) não está no Catarse, é sugestão para não cobrar sem explicar.
- **Devolução que ninguém consegue receber** (boleto sem conta cadastrada, contribuição sem conta): fica em reembolso manual para sempre. O Catarse, depois de 120 dias sem dados bancários válidos, transfere o crédito para a plataforma (Termos de Uso, item 7.19). Decidir o prazo e escrever no Termo de Uso.
  - **Estudo de 25-10-2026 (mais complicado do que parecia, sem pressa).** O Catarse (Termos de Uso, 7.19, atualizados em 31-05-2026) dá a quem apoiou 120 dias para cadastrar os dados de recebimento; depois o valor passa à plataforma (o 7.16 fala em 15 dias para o mesmo caso: o termo deles se contradiz). Aqui faltam quatro peças: (1) o e-mail "precisamos dos seus dados" (só existem "a devolução começou" e "foi concluída"); (2) um lugar para quem apoiou informar uma chave Pix (hoje só o pesquisador cadastra chave); (3) contribuição sem conta (visitante ou conta excluída) não guarda e-mail, então não há como avisar; (4) repetir o estorno depois do prazo do Pix (90 dias) não adianta, o provedor recusa sempre: o que funciona é transferir para a chave nova, como o repasse. O limite precisa existir: sem ele o dinheiro fica para sempre como dinheiro de terceiros.
  - **Opções:** (A) só o prazo, e o admin encerra como "não reclamado"; (B) igual ao Catarse: e-mail, a pessoa informa a chave em Minha Conta, o sistema transfere sozinho com novas tentativas, lembretes e prazo; (C) a (B) sem a transferência automática: o admin devolve pelo painel do provedor e usa o "Registrar a devolução" que já existe. Recomendação: (C) agora e (B) se houver volume, porque transferir sozinho para uma chave recém-informada abre a porta para quem invadiu a conta (a chave do pesquisador passa por verificação de titularidade por esse motivo). O visitante sem conta fica só com o prazo até o checkout da área pública guardar o e-mail. Decidir também o prazo (120 dias, como o Catarse, ou outro) e confirmar o escopo antes.
- **Conciliação de saldo** (conferir o saldo da conta no provedor com o que o sistema diz que deveria estar lá). Opções: (A) mostrar no painel, lado a lado, o saldo do provedor e o "dinheiro de terceiros" que a conta tem de ter (pago e ainda não repassado, a devolver, em reembolso manual), sem alerta; (B) o mesmo, conferido por uma tarefa diária que avisa quando o saldo fica abaixo do dinheiro de terceiros; (C) conciliação completa, linha a linha, do extrato do provedor com os eventos do sistema. Recomendada: (B), que pega dinheiro saindo sem aviso sem precisar contabilizar a receita da plataforma; a (C) é a das empresas grandes e pesada para o TCC.

---

## 0. 📌 Para a Alexia ler (conversar antes de fazer)

- **Textos dos e-mails: no código ou em tabela? (aberto em 24-10-2026, ESTUDAR antes de decidir).** Hoje o assunto e o texto de cada e-mail moram no código (`nest/src/4-mail/modelos/modelos-email.ts`), decisão de 19-10-2026 para não aumentar o escopo. A Alexia é a favor de tabelas novas (o admin editaria os textos pelo painel); o Lucas, contra. Não é ajuste leve: mexe no envio, no escopo (o orientador já achou o banco grande) e no que o admin pode quebrar sem querer. Estudar com calma: como os sistemas de referência fazem, o que muda em cada caminho, o custo e o risco de cada um, e só então decidir. Antes, só lembrete: se virar tabela, uma `template_email` entraria sem mexer na fila.

O "Aguardando" (pagamento que chega depois do fim da campanha) foi decidido e feito em 03-10-2026; a explicação está em `informacoes/HISTORICO/HISTORICO_ACHADOS_PARA_DISCUTIR.md`, seção "Limpeza de 25-10-2026", e o `ACHADOS_PARA_DISCUTIR.md` lista os decididos para a Alexia.

---

## 1. Levar para a revisão externa

Os requisitos são atualizados com a revisão externa; aqui fica só o que precisa ir no próximo pedido. A atualização dos requisitos de 29-09-2026 já absorveu o termo único, o 2FA (fica sem RF, como ideia do fim do projeto), o modelo flexível e o Alterar/Excluir do admin. A atualização de 04-10-2026 absorveu os 12 pontos levados naquele dia (validade do Pix, espera do Pix no encerramento, IP do aceite, contestação, re-aceite dos dois termos, exclusão de conta, taxa de conclusão e os parâmetros novos). Os itens abaixo não foram tratados nela e continuam abertos.

- **Tipografia do painel padronizada** (6 classes em `2-tipografia.css`): citar no próximo pedido de revisão de interface, pedindo ideias para enxugar mais sem quebrar.
- **Para discutir com a revisão externa (29-09-2026; achamos que alguns pontos do V8 não batem):**
  - **Aceite pendente no próximo login:** vale para versão nova do Termo (RF-015). O V8 tirou a parte da conta criada pelo admin (nascer com senha provisória e aceite pendente), por ser ferramenta de teste; queremos rediscutir.
  - **Modelo da campanha pode mudar até a aprovação:** o V8 deixou implícito (congelamento na aprovação); hoje o formulário nem envia o modelo.
  - **Links no upgrade, "Projetos Criados" e validação de domínio dos links:** a resposta da revisão externa à comparação V8 × código tem pontos que vamos revisar com ela.
- **E-mail pronto (19-10-2026), ideias do mercado de 12-10-2026:** lembretes para quem segue a campanha ("faltam 48 h" e "faltam 8 h" para o fim, como faz o Kickstarter) e o endosso de colegas antes de enviar a campanha para aprovação (como faz o Experiment.com; este só com requisito novo).
- **Status "repassado" da contribuição (25-10-2026):** o RF-082 (`informacoes/REQUISITOS_V10.md`) lista os status obrigatórios de cada transação: "pendente, confirmado, repassado, a devolver, devolvido...". Queremos tirar o "repassado": a tela Contribuições já mostra a situação do repasse numa coluna própria (que pode estar "Concluído"), então o máximo da contribuição seria "Paga". Apagar o status antes de mudar o requisito deixaria o sistema contra ele. Pedir para tirar do requisito; a mudança no banco (o status é usado nas regras do dinheiro) entra na auditoria dos status (grupo 5).
- **Como queremos esse pedido escrito:** "pegar no pé" da revisão externa, pedir que olhe sistemas de referência e traga ideias próprias, não só responda a lista.

---

## 2. Dependem de outro módulo ou de outra coisa existir

> **Nota (27-09-2026):** 18, 19, 20 e 26 podem ganhar tela na área administrativa (nem que seja na área de testes) antes da página pública existir. Não é para fazer agora, mas o lado Nest desses módulos não depende da página pública.

### Precisam da área pública (anotado em 19-10-2026; o lado Nest e o que cabe no painel já estão prontos)

A área pública não pode ser feita agora (primeiro termina a área restrita). Estes itens ficam esperando por ela:

- **Seguir pesquisador (RF-028):** o botão "Seguir" e a contagem de seguidores na página pública do perfil. A API existe (`/seguir-pesquisador`, `/seguir-pesquisador/:id/seguidores`); hoje se segue pelo coração da T1 e a lista fica na T4.
- **Escolher a recompensa ao contribuir (RF-101):** o checkout mostra as recompensas ativas da campanha e manda `idRecompensa` no `POST /contribuicao` (já aceito: exige conta e o valor mínimo).
- **Checkout:** o aviso do modelo da campanha com a confirmação de ciência (RF-040; a API ainda não registra a ciência), o checkbox do termo de pagamento (RF-082; o aceite com IP já é gravado), a contagem regressiva do Pix (RF-081) e a tela de cada meio (RF-077).
- **Painel "Projetos Criados" do pesquisador (RF-086, RF-087):** a lista com as métricas e o líquido estimado (o `GET /campanha/:id` já devolve `valorLiquidoEstimado`).
- **Painel de quem apoia (RF-085):** o histórico já existe na Minha Conta, aba Contribuições; na área pública vira o painel do doador.
- **Desistir do apoio (decidido em 24-10-2026: regra do Catarse, com o art. 49 do CDC como fundamento):** o botão na área de quem apoia. As condições, as fontes e o ponto a validar com o orientador (o CDC nos 7 dias depois de contribuir) estão no `DOCUMENTACAO_FINANCEIRO.md`. Antes do botão: o texto no Termo de Uso (Administrador) e o parâmetro do prazo.
  - **Sem o orientador (25-10-2026):** não dá para contar com o orientador nesta pergunta (CDC × Catarse), nem na cláusula de ressarcimento e na da chave Pix. A decisão sai do estudo feito aqui, bem documentado, com as fontes.

### E-mail: o que ainda é decisão (19-10-2026; o módulo está pronto e testado no modo de teste)

- **Serviço de envio de verdade:** recomendação Brevo pela API, com um domínio `.com.br` (cerca de R$ 40 por ano). Sem domínio, só o Gmail com senha de app. Passo a passo e comparação dos planos em `.Tutorial-email.md`. Fica para o fim, como o gateway.
- **Saber se o e-mail chegou (21-10-2026):** "Enviado" quer dizer que o provedor aceitou, não que chegou na caixa da pessoa. Falta o webhook de entrega do Brevo (entregue, devolvido, marcado como spam), o equivalente ao do Asaas; o Gmail por SMTP nem oferece. Só dá para fazer junto com o serviço de envio de verdade. Explicação em `.Tutorial-email.md`, Parte 0.

### Pagamento (feito em 17 e 18-10-2026; visão completa em `DOCUMENTACAO_FINANCEIRO.md`)

#### 🟡 Testes no sandbox que faltam (próximos dias)

- **Cartão** numa campanha flexível (cartão de teste 4444 4444 4444 4444 aprova; 5184019740373151 recusa), até o repasse da parte liberada.
- **Boleto:** ligar `boleto_habilitado` em Parâmetros; gerar, pagar ("Confirmar pagamento" no sandbox), repasse, e a devolução por link num cancelamento (vai para reembolso manual com o link).
- **Tela "Registrar a devolução"** (Reembolsos Manuais) com as contribuições 56, 59, 60, 61 e 63 do Supabase, que chegam ao reembolso manual sozinhas depois das 8 tentativas (o banco simulado recusa devolver Pix de pagador fictício). Desde 21-10-2026 o valor é fixo (o inteiro da contribuição, só leitura) e o banco recusa outro (já no Supabase, recriado; conferido em 24-10-2026).
- **Revisão manual da caixa de avisos:** os avisos parados de 17 e 18-10-2026 devem aparecer na tela de revisões do pagamento 24 horas depois de chegar, com o motivo.

#### 🟡 Ainda aberto no pagamento

- **Checkout e painel de quem apoia** (`views/29-dashboard/doador`, pasta vazia; `views/22-contribuicao` hoje só tem a aba Contribuições da Minha Conta): a tela pública de apoiar. Hoje uma contribuição nasce pela T5 ou pela API. Junto vem o **aviso ao apoiador** sobre o modelo da campanha (tudo-ou-nada devolve, flexível não) com confirmação de ciência.

### Página pública da campanha (ainda não existe)

- **Botões de compartilhar** (WhatsApp, Facebook, copiar link) e **prévia de link** (Open Graph, um endpoint pequeno no Nest que devolve as meta tags). Ideias do Atlas (P1 e P2 do roteiro).
- **Quantas pessoas seguem a campanha, na página pública:** a contagem pública (`GET /seguir-campanha/:id/seguidores`, só o número) já aparece no Consultar da campanha desde 24-10-2026; falta mostrar na página pública.
- Telas públicas de denúncia, recompensa, atualização, comentário e seguir (hoje atualização, comentário e seguir só existem nas telas de teste do painel). Painel do pesquisador (`views/29-dashboard/pesquisador`, pasta vazia).



### Arquivos

#### 🟡 Especificação registrada (13-09-2026): tela de administração pra `arquivo` (espaço ocupado, órfãos, maiores consumidores) - NÃO construída de propósito

Ideia detalhada e registrada aqui pra não se perder. **Decisão: não construir agora**: poucos arquivos no sistema hoje (todos de teste), a tela mostraria números perto de zero e não responderia pergunta nenhuma de verdade. Momento certo: depois de `18-recompensa`/`15-atualizacao-campanha` estarem em uso real, quando anexos tiverem volume e órfãos aparecerem sozinhos.

**Por que é possível sem nenhum módulo novo**: `arquivo` já guarda `tamanho_bytes` (do arquivo JÁ PROCESSADO, depois da redução - não o que o navegador declarou), `id_usuario_upload`, `tipo_mime`, `criado_em`, `ativo`/`desativado_em`. Com essas 5 colunas dá pra montar o painel inteiro sem consultar o provedor de armazenamento.

**O que a tela mostraria:**
- **Resumo no topo** (4 números): espaço total ocupado (soma de `tamanho_bytes` dos ativos, com % do limite do plano gratuito ao lado); quantidade de arquivos ativos; espaço ocupado por arquivos **desativados** (`ativo = false` - espaço pago sem uso, ninguém saberia que existe sem a tela); quantidade de arquivos **órfãos** (`LEFT JOIN` contra as 3 formas de vínculo que existem - `usuario.id_imagem_perfil`, `arquivo_atualizacao`, `arquivo_recompensa` - filtrando quem não aparece em nenhuma; é o número mais útil, órfão é espaço desperdiçado por definição).
- **Distribuição por tipo** - tabelinha `tipo_mime` × quantidade × espaço somado (responde se o consumo vem de imagem ou PDF).
- **Maiores consumidores** - os 10 usuários com mais espaço ocupado (nome, quantidade, total) - acha abuso antes da cota de 50MB/conta ser atingida.
- **Listagem completa** - `GenericTable` já existente, colunas nome original/tipo/tamanho/quem enviou/data/situação, filtro facetado por tipo e situação.

**As ações, e uma que precisa de cuidado real:** ver arquivo (URL pública, trivial); desativar (soft delete que o esquema já prevê); **excluir órfão de verdade** - esta é delicada porque excluir a LINHA no banco não apaga o OBJETO no armazenamento (uma exclusão pela metade cria um objeto que ninguém mais enxerga). Precisa: remover do armazenamento primeiro, DEPOIS do banco, nessa ordem, registrando em auditoria; se a remoção do armazenamento falhar, a linha do banco não pode ser removida (senão perde o rastro). **Só pra arquivo comprovadamente órfão, nunca vinculado** - arquivo vinculado se remove removendo o vínculo, no módulo dono dele.

**Onde moraria**: backend, `26-arquivo` (módulo já existe, dono natural) - 2 endpoints novos (resumo com agregados, listagem paginada com filtro), ambos protegidos por permissão de administrador. Frontend, uma tela de listagem no padrão já repetido há meses.



---

## 3. No dia do deploy

- **Banco de produção:** rodar o `07_seed_dados.sql` só até o marcador `[07-DEMONSTRACAO]` e promover a primeira conta a admin uma vez (ver `.Tutorial-rodar-projeto.md`).
- **Banco depois do deploy: mudança vira arquivo novo numerado** (começando em 09, depois 10, e assim por diante), nunca edição dos arquivos `01` a `08` nem só o `ATUALIZAR`. O executor de migrações (`npm run db:migrate`) aplica só o que é novo e avisa, sem reaplicar, quando um arquivo já aplicado muda. No primeiro deploy: `npm run db:migrate:adotar` no banco que já tem tudo, e `DATABASE_URL_MIGRATIONS` com a credencial de administrador do banco.
- **Registro de acessos (Marco Civil da Internet, art. 15):** quem opera como empresa precisa guardar IP, data e hora de cada acesso por 6 meses. Hoje o IP fica só nos aceites e no último login. Só vale se o sistema entrar em operação; detalhe em `DOCUMENTACAO_BD.md`, "IP: base legal e anonimato do Pix".
- **Teste de fumaça do pagamento em produção (18-10-2026):** uma contribuição de **R$ 1 de verdade**, paga com o Pix do próprio Lucas, numa campanha de teste tudo-ou-nada, e depois "Cancelar o projeto". Confere o que o sandbox não consegue simular: o dinheiro **voltando** para quem apoiou (no sandbox o pagador é sempre fictício e o banco simulado recusa devolver; ver `.Tutorial-plataforma-pagamento-sandbox.md`, Parte 12). Custo: só a tarifa (R$ 0,99). É o padrão do mercado: todo sistema de pagamento faz um teste com valor mínimo em produção antes de abrir.
- **Apagar a conta de testes "Apoiador" do `nest/.env`** (`ASAAS_API_KEY_APOIADOR`, 18-10-2026): só serve aos testes no sandbox (segunda conta que paga e recebe devolução). Mantida até o deploy, por decisão nossa.
- **`trust proxy` no Nest:** atrás de um proxy (servidor de hospedagem), o Nest precisa confiar nele para ler o IP real de quem contribui (gravado no aceite do Termo, `aceite_termo_contribuicao.ip_aceite`) e de quem faz login. Sem isso, todo IP gravado seria o do proxy.
- **Docker** do Nest e do React (F2 do roteiro do Atlas, com o `docker/` deles como referência).
- **`react/.gitignore` não cobre `.env`:** inofensivo hoje (o `.env` só tem a URL da API); só volta à tona se o conteúdo do `.env` mudar ou no deploy.
- **CORS por lista de endereços** (ver grupo 5, segurança): se não for feito antes, entra aqui.
- **Sessões sem regra de acesso por dono (anotado em 30-09-2026, decidido em 24-10-2026: só no deploy, junto do cookie e do CORS).** `sessao` tem regra de acesso aberta (`USING (true)`) de propósito: login e renovação acontecem antes de haver alguém logado. Quem decide de quem é a sessão é o Nest (confere o segredo do token e o dono). Na simulação, qualquer papel encerra a sessão de qualquer conta direto no banco. Não é brecha pela API hoje; é defesa em profundidade.

---

## 4. Fim do projeto (só quando todos os módulos estiverem prontos)

#### 🟡 Ideia para o fim do projeto: Autenticação em duas etapas (2FA), sem RF (decisão do V8: avançado demais para o escopo do TCC agora)

Toda banca de TCC de sistema hoje em dia costuma perguntar sobre segurança logo de cara, e 2FA é um dos primeiros itens que costuma vir à tona nessa conversa. Hoje o CrowdAcademico não tem nenhuma camada de 2FA (só e-mail+senha, com bloqueio por tentativas). Quando for implementar, também vai precisar de um RF novo na Etapa 3 descrevendo o requisito (não existe nenhum hoje cobrindo isso).

**Só voltar a levantar este item quando todos os módulos do backend já estiverem prontos** - não é prioridade agora, é o tipo de reforço que faz mais sentido numa reta final, depois que o núcleo (campanha, contribuição, pagamento) já estiver de pé.

#### 🟡 Ideia para o fim do projeto: auditoria de acessibilidade WCAG

**Em palavras simples:** a WCAG é o guia internacional de acessibilidade para sites (o padrão que órgãos públicos e boas empresas seguem). O sistema já segue partes dela: contraste das cores conferido por teste (`npm run contraste`), nomes acessíveis nos botões, e, desde 13-10-2026, a regra 2.2.1 (tempo ajustável): o aviso que some sozinho pausa com o mouse em cima ou com o foco do teclado dentro.

**A ideia:** com o sistema pronto, fazer uma auditoria inteira pelos critérios da WCAG 2.2 (nível AA), tela por tela: tempo e movimento (2.2.1 e 2.2.2), navegação só pelo teclado, ordem do foco, textos alternativos, mensagens de erro ligadas ao campo, zoom de 200% e tela de celular. Ferramenta: o axe (já usado em rodadas anteriores) mais conferência manual, porque a ferramenta automática pega só parte dos problemas. **Só começar quando todos os módulos estiverem prontos**, como os testes com Playwright abaixo. Já anotados para ela (24-10-2026): tabela vazia que rola de lado no celular não recebe foco do teclado (axe, `scrollable-region-focusable`; o padrão da `caixa-tabela`, região com `tabIndex=0`, resolve), e o cabeçalho de coluna que ordena a tabela responde ao clique, mas não ao teclado.

#### 🔴 Pendência aberta: testes automatizados com Playwright no React

O `react/` não tem nenhum teste automatizado hoje (só `build`+`lint`). Um projeto de referência da disciplina (`COCAO_HOTEL_DDL_DML_CRUD_ppw2-main`) tem uma estrutura de testes Playwright organizada em 7 categorias (E2E completo, aceitação/requisito funcional, integração HTTP, API pura, *data-driven*, *snapshot* visual/acessibilidade, interceptação de erro) que pode servir de referência de estrutura, não de conteúdo (os testes deles são específicos do sistema de hotel).

**Vamos usar eventualmente, mas ainda é cedo.** Só voltar a levantar este item quando o sistema estiver completo (todos os módulos prontos) - implementar teste agora, com o backend ainda mudando bastante módulo a módulo, geraria mais retrabalho de manutenção de teste do que benefício.

> Até lá existem os roteiros avulsos de navegador em informacoes/testes-banco/resultados/scripts (g1 a g20, mais o `rotas-sem-login.mjs`, que chama todas as rotas sem login, 185 em 24-10-2026, e compara com a gravação anterior).

---

## 5. Decisões em aberto, sem pressa

### Segurança

#### 🟡 Cláusula da chave Pix no Termo de Pesquisador (RF-026, 24-10-2026)

O requisito pede que o Termo de Pesquisador diga, de forma explícita, que a correção da chave Pix cadastrada é responsabilidade do pesquisador. O termo vigente não fala da chave. Quem escreve é o Administrador, numa versão nova do termo pelo painel (o re-aceite já funciona); antes, queremos estudar e fazer uma pesquisa de mercado, sem pressa. O e-mail do repasse previsto, a outra parte do RF-026, já foi feito.

#### 🔴 Pendência aberta: refresh token em cookie `HttpOnly`, em vez de `localStorage`

Achado revisando um projeto de referência da disciplina (04-09-2026): hoje o CrowdAcademico guarda o refresh token no `localStorage` do navegador (`use-auth.js`, decisão já documentada - "pra não precisar logar de novo a cada F5"). Um cookie `HttpOnly` com `SameSite=Strict` faz o mesmo papel, mas com uma vantagem real de segurança: o JavaScript da página nunca consegue ler o valor do cookie, então um ataque de XSS (injeção de script malicioso) não consegue roubar o refresh token, mesmo que consiga rodar código na página - com `localStorage`, qualquer script que rode na página consegue ler o token.

**Não é decisão óbvia, nem copy-paste** - trocar exigiria mexer em como o `authFetch`/`use-auth.js` renovam sessão (hoje leem o token direto do `localStorage`; um cookie `HttpOnly` é enviado automaticamente pelo navegador em toda requisição, sem o JavaScript precisar ler nem anexar nada - muda o formato da chamada) e como o backend define/lê esse cookie. Vale uma análise mais aprofundada antes de decidir - não é pra implementar agora, só registrado pra não esquecer que a opção existe. **O estudo foi feito em 24-10-2026** (o que muda no `use-auth` e no Nest, o risco, a dependência do CORS e o padrão de mercado); a decisão continua aberta.

#### 🟡 Anotado para pensar com calma (27-09-2026): 3 ideias vindas do `.env` do sistema Atlas

Decidimos depois se ajudam o CrowdAcadêmico. Contexto em `informacoes/todas as auditorias/ROTEIRO_INCORPORACAO_ATLAS.md`.

- **Lista de origens permitidas (CORS):** a API do Atlas só aceita chamadas dos endereços de uma lista no `.env`. A nossa aceita chamadas de qualquer site (`app.enableCors()` sem opções, `nest/src/main.ts`). Correção pequena e pré-requisito da pendência do cookie HttpOnly (cookie com credencial exige origem explícita).
- **Configuração da sessão em cookie:** o Atlas usa cookie HttpOnly com tempo de vida e regras de envio (`SESSION_LIFETIME`, `SESSION_SECURE_COOKIE`, `SESSION_SAME_SITE`) no `.env`. Referência pronta para a pendência "refresh token em cookie HttpOnly".

- **Permissão por rota no painel:** a guarda do `/admin/*` só exige login, não confere o papel (quem vê o quê continua decidido pelo backend). "Fica para perto do fim".

#### 🟡 Achados da super auditoria ao vivo de 24-10-2026 (a decidir)

- **Aviso de erro: estudar antes de mexer (25-10-2026, sem pressa).** Hoje o painel faz de dois jeitos: quase toda tela com formulário mostra só o texto vermelho (o `useErroToast` com `mostraTexto` esconde o aviso flutuante quando o erro já está na tela), e as seções Encerrar a campanha (Alterar do dono) e chave Pix (`secao-recebimento.tsx`) mostram os dois com a mesma frase, porque o texto vermelho delas não tem a marca `data-mensagem-erro`. Gostamos dos dois avisos (retorno claro e imediato) e da ideia do meio-termo: o aviso flutuante só avisa ("Não foi possível..., veja o motivo abaixo") e o texto vermelho traz o motivo. Antes de aplicar, estudar as variáveis, sem valor escrito à mão:
  - **Tipo de erro:** de campo (o backend manda `campos`, o erro aparece embaixo do campo), recusa de regra (409, 422), sem permissão (403), falha de rede ou do servidor (500).
  - **Onde a tela mostra:** modal de Criar/Alterar (38 dos arquivos), página inteira (login, Minha Conta, cadastro), seção dentro de modal, janelinha de confirmação. O login já tem desenho próprio, decidido em 24-10-2026 (frase no topo e os campos em vermelho): o aviso flutuante ali seria repetido.
  - **O texto do aviso flutuante:** uma frase única num lugar só (constante), a frase com o nome da ação passado por quem chama ("Não foi possível salvar a campanha"), ou o próprio motivo, como hoje.
  - **Leitor de tela:** o texto vermelho já é anunciado (`role="alert"`); um aviso flutuante com a mesma frase seria anunciado duas vezes.
  - **Quantas telas:** 46 arquivos usam `mostraTexto`, 16 usam o aviso flutuante sozinho (ações fora de formulário).
  Mercado (24-10-2026): o Primer, do GitHub, desaconselha o aviso flutuante para erro; o GOV.UK usa duas camadas, um resumo no topo mais o erro em cada campo, as duas na própria página.

#### 🟡 Auditoria de todos os status do sistema (25-10-2026)

Conferir cada status de cada tabela (campanha, contribuição, repasse, denúncia, encerramento...) contra os requisitos: todo status precisa estar num RF, e nenhum pode sobrar ou repetir o que outra coluna já diz (o caso do "repassado" da contribuição, grupo 1). Maior do que parece: status mexe em regra do banco, em tela e em teste.

### Visual e marca

- **Outros lugares que podem ganhar as mudanças do Consultar Campanha (25-10-2026), olhar tela por tela antes:** (1) **linhas alinhadas entre seções vizinhas** (`FichaLadoALado`, DS-115) no Consultar e no Alterar Usuário ("Dados da conta" ao lado de Auditoria e Papéis) e no Revisar Campanha: só vale onde os dois lados são campos pareados; (2) **data com hora sem os segundos** (`formatarDataHora(iso, true)`) onde a data fica em meia coluna e quebra: Julgar Denúncia, Decidir Encerramento, Consultar Contribuição, Consultar Notificação, Resolver Revisão; (3) **linha de números de ponta a ponta** (`SecaoFicha centralizada`, DS-116): a Consultar Contribuição (valor, taxa, total) é candidata. Já feitos em 25-10-2026: a barra colada no número no Alterar Campanha e na Consultar Contribuição, e o "Enviar" com cara de indisponível no Alterar Campanha.
- **Branch `feat/novas-telas-teste` (02-10-2026):** tem o Dashboard em seções ("Precisa de você") e os links acadêmicos em cartões no celular, feitos antes das regras visuais novas. Decidir se entram no main, refeitos com as regras do `DESIGN_SYSTEM.md`, ou se a branch é descartada.

- **Troca do logo e do ícone pelo painel** (aba Identidade Visual do Dashboard, hoje um espaço reservado). Desde 25-10-2026 a marca padrão está no projeto (`DOCUMENTACAO_FRONTEND.md`, seção 12); o envio pelo painel substitui a padrão, e o admin do futuro troca sem mexer no código nem no banco. A análise, os 4 problemas e as duas decisões em aberto estão no topo do `ACHADOS_PARA_DISCUTIR.md`. O envio passa pelo Storage pessoal do Lucas: nos testes, só ele envia.

### Estrutura e ferramentas

#### 🟡 Para o futuro (25-10-2026): auditoria de classes do Tailwind que anulam o CSS

**Em palavras simples:** no React, uma classe pronta do Tailwind escrita no componente (`justify-between`, `sm:grid-cols-2`...) sempre vence uma regra do nosso CSS (`4-componentes.css`) que mexa na mesma coisa, e vence em silêncio: a regra existe, mas não faz nada. Aconteceu duas vezes seguidas em 25-10-2026 no Consultar Campanha (o valor do Financeiro não centralizava e a Auditoria caía embaixo de Dados); a regra para não repetir está no DS-115 e no DS-116 do `DESIGN_SYSTEM.md`. A auditoria procuraria outros casos assim no sistema inteiro.

- **Como poderia ser feita (a decidir quando chegar a hora):** (1) **com o Playwright**, tela por tela: para cada elemento que tem uma classe nossa do CSS, comparar o que a regra dela pede com o que o navegador aplicou; diferente = alguma classe do Tailwind está vencendo. (2) **Sem navegador**, mais barata: um script que lê o JSX e o CSS e lista os elementos em que a classe nossa e uma classe do Tailwind mexem na mesma propriedade (colunas, alinhamento, margem, cor), como a ferramenta `valores-escritos-react.mjs` já faz com valores escritos à mão. A (2) acha os candidatos; a (1) prova quais quebram de verdade.
- **A versão sem navegador, desenhada em 25-10-2026 (talvez na semana seguinte):** um script no estilo do `valores-escritos-react.mjs`, em quatro passos: (1) lê o CSS nosso e anota que propriedades cada classe nossa muda, contando a classe que aparece no fim de um seletor composto (`.ficha-centralizada .campo-ficha__valor`, o caso de 25-10); (2) lê o JSX e, em cada elemento, separa as classes nossas das do Tailwind; (3) traduz as do Tailwind para a propriedade que mudam (`justify-between` = alinhamento, `sm:grid-cols-2` = colunas, `p-4` = espaço interno), cobrindo as famílias que o projeto usa (colunas, alinhamento, espaço, largura, altura, texto, cor, borda, exibição); (4) lista os elementos em que as duas mexem na mesma propriedade. Os dois bugs de 25-10 teriam aparecido.
  - **Limites:** acha suspeitos, não prova erro (às vezes o utilitário está ali de propósito); cada suspeito é conferido lendo o código, e só os duvidosos vão para o navegador. Classe montada a partir de variável só é pega quando o texto está escrito no arquivo. Classe do Tailwind que o script não sabe traduzir sai numa lista à parte, "não sei traduzir", nunca escondida.
  - **Custo:** médio. O script é rápido; o tempo vai na conferência dos suspeitos. Muitos suspeitos: trazer a lista organizada antes de mexer em qualquer coisa.
- **Quando:** sem pressa. A versão sem navegador pode vir antes; a com Playwright, junto da auditoria WCAG ou dos testes com Playwright do fim do projeto (grupo 4).

#### 🟡 Para o futuro (29-09-2026): super auditoria de padrões de mercado

Ideia: comparar o sistema inteiro com o que os sistemas de referência fazem (login e sessão, termos, moderação, campanha, pagamento, mensagens de erro, telas), para cada diferença dizer qual é o padrão de mercado, o que o projeto faz e se vale mudar. Motivo: citar o padrão de mercado ajuda muito a decidir. Fica para bem no futuro.

#### 🟡 Anotado (29-09-2026): dispatcher de triggers

Hoje `campanha` tem 23 triggers (17 funções; algumas são pares INSERT e UPDATE) e `comentario` tem 9 (contagem de 24-10-2026). Quando várias rodam no mesmo momento, o Postgres escolhe a ordem pela ordem alfabética do nome; o dispatcher seria uma trigger só por momento, chamando as regras numa ordem escrita. Ganho: ordem explícita e mensagem de erro previsível quando duas regras falhariam juntas. Custo: mexer nas regras mais críticas (aprovação, congelamento, prazo), com risco de regressão; as suítes de caracterização (1.050 casos) são a rede de proteção. Recomendação atual: não fazer. **O estudo completo foi feito em 24-10-2026** (como funciona a ordem hoje, o que mudaria, exemplos com as triggers reais); a decisão continua aberta.


### Protótipo estático (sessão própria)

- Reputação em 4 faixas, seguir campanha e recompensas não têm presença visual no protótipo. Levantar como decisão, não encaixar numa rodada de "embelezar".
- **Tela de Transparência do protótipo:** tirar a divisão "88/7/5", que não vem de requisito nenhum, e mostrar a taxa da plataforma, a tarifa de cada meio e o simulador do RF-063 (requisitos de 24-10-2026).
- **Cadastro do protótipo simula uma verificação do Lattes que o sistema não faz (anotado em 05-10-2026).** Onde ver: painel "Telas do protótipo" > "10. Cadastro" > escolher "Sou pesquisador" > avançar até o passo 3. O botão "Validar" do ID Lattes mostra "Vínculo encontrado no Lattes" e bloqueia o avanço até essa validação. O RF-022 diz outra coisa: o pesquisador escolhe o tipo de link (Lattes, ORCID, ResearchGate, LinkedIn ou GitHub) e cola o endereço, o sistema só confere se o endereço é do site certo, e os links são opcionais (até 5). Sugestão: trocar o botão por tipo + endereço, conferido enquanto a pessoa digita e sem bloquear o avanço. Diferença anotada, sem mudar agora: pelo RF-022 quem vira pesquisador é um usuário já cadastrado, que pede o upgrade depois; o protótipo faz isso no próprio cadastro.

---

## 6. Registros que não são pendência (para não se perderem)


- **Descartados de propósito do roteiro do Atlas** (escopo enxuto): Next.js, Tailwind no JSX, i18n, gerador de módulo, versão na URL, e a maiúscula automática nos nomes (ficou só a limpeza de espaços).
- **Tela do painel não prova RF do usuário:** o React de hoje é só o painel administrativo; tela do painel nunca prova que um RF do usuário ou do pesquisador está cumprido ou descumprido. Os RFs que ficam 🟡 na matriz dependem da área pública (grupo 2) ou da cláusula do Termo de Pesquisador.
- **Documentação contra o código:** as suítes PGlite 7 e 10 conferem a cada rodada; ficam verdes a cada módulo novo.
- **Roteiro completo do Atlas:** `informacoes/todas as auditorias/ROTEIRO_INCORPORACAO_ATLAS.md` (Ondas 1 e 2 feitas).
