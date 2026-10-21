# Documentação do Financeiro - CrowdAcadêmico

Como o dinheiro anda no sistema: quem paga, quanto, para onde vai, quando volta, e o que protege cada passo. O passo a passo para testar no ambiente de testes do provedor está em `.Tutorial-plataforma-pagamento-sandbox.md`; as regras do banco, em `DOCUMENTACAO_BD.md`; as rotas, em `DOCUMENTACAO_BACKEND.md` (seção 13); os códigos de erro, em `DOCUMENTACAO_ERRCODE.md`.

---

## 1. Em palavras simples

1. Alguém apoia uma campanha com **R$ 100**. O provedor de pagamento (hoje, o Asaas) cobra uma tarifa por receber, por exemplo R$ 0,99 no Pix. Quem apoia paga **R$ 100,99**: o valor da contribuição mais a tarifa.
2. O dinheiro fica na conta da plataforma no provedor, esperando a campanha terminar.
3. A campanha termina e o sistema decide sozinho o destino do dinheiro:
   - **deu certo:** o dinheiro vai para o pesquisador por Pix (o **repasse**), menos a taxa da plataforma;
   - **não deu certo** (tudo-ou-nada que não bateu a meta, projeto cancelado, campanha derrubada pela moderação): cada pessoa recebe **os R$ 100 inteiros** de volta (a **devolução**). A tarifa de R$ 0,99 fica com o provedor, que já a cobrou.
4. Nenhuma dessas saídas de dinheiro precisa de clique: o sistema pede ao provedor, e o provedor, antes de executar, **pergunta ao sistema** se aquela saída é legítima. Uma saída que o sistema não pediu (por exemplo, alguém que roubou a chave de acesso ao provedor) é recusada.

**A regra de ouro: a plataforma nunca fica no prejuízo.** A tarifa de receber é paga por quem apoia; na devolução, quem apoiou recebe o valor da contribuição, e a tarifa não volta. A plataforma ganha a sua taxa só sobre campanhas que repassam.

---

## 2. As peças

| Peça | Onde | O que faz |
|---|---|---|
| Contribuição | `nest/src/22-contribuicao` | Recebe o pedido de apoio, calcula a tarifa, pede a cobrança ao provedor e devolve o Pix "copia e cola" ou o link do cartão |
| Provedor de pagamento | `nest/src/23-pagamento` | Fala com o provedor (adapters), recebe os avisos dele (webhook), responde à validação de saque e roda as tarefas automáticas (repasse, devolução, conferência) |
| Chave Pix do pesquisador | `nest/src/24-conta-recebimento` | O pesquisador cadastra a chave Pix onde recebe; o sistema confere no provedor se a chave é do mesmo CPF |
| Pendências do admin | `nest/src/25-pagamento-revisao` | Avisos que precisam de uma pessoa, reembolsos manuais e repasses com erro |
| Regras do dinheiro | `arquivos_banco_dados/05_regras_negocio.sql` | Máquina de estados, tarifa, destino do dinheiro, filas, auditoria. O banco é quem decide; o Nest executa |
| Telas | `react/src/views/24-conta-recebimento`, `react/src/views/25-pagamento-revisao`, `react/src/views/20-solicitacao-encerramento` | Chave Pix e repasses em Minha Conta, pendências no painel, cancelar ou encerrar a campanha |
| Bancada de pagamento (T5) | `react/src/30-campo-testes`, `nest/src/30-campo-testes` | Faz o papel de quem paga e do provedor para testar o fluxo inteiro pela tela. Só fora de produção |

📌 **Ainda não existe a tela pública de apoiar (checkout).** Hoje uma contribuição nasce pela T5 ou pela API (`POST /contribuicao`). O fluxo do dinheiro inteiro já funciona por trás dela.

### 2.1 Provedor trocável e partes desligáveis

O sistema não conhece o Asaas: conhece três "tomadas" (ports, em `nest/src/23-pagamento/ports`), uma para cobrar, uma para transferir e uma para conferir os avisos. Cada provedor é um "plugue" (adapter, em `nest/src/23-pagamento/adapters`): `asaas`, `fake` (o provedor de teste, que funciona sem internet) e `nao-configurado` (recusa tudo com 503). Trocar de provedor é escrever um adapter novo e mudar `PAYMENT_PROVIDER` no `nest/.env`; o banco não muda, porque cada contribuição e cada repasse guarda de qual provedor é.

| Para desligar | Como | Efeito |
|---|---|---|
| Todo o pagamento | `PAYMENT_PROVIDER` vazio em produção | Contribuir responde 503; nada é cobrado |
| Só o cartão | Parâmetro `cartao_habilitado` = `false` no painel | Contribuição com cartão é recusada (91052); o Pix continua |
| Só o boleto | Parâmetro `boleto_habilitado` (nasce `false`) | Contribuição com boleto é recusada (91053); o Pix continua |

### 2.2 Tarefas automáticas e os interruptores

**Em palavras simples:** quatro trabalhos do dinheiro o sistema faz sozinho, de tempos em tempos. Cada um tem um interruptor (um parâmetro em Parâmetros do Sistema, grupo "Tarefas automáticas"): ligado, ele roda no horário; desligado, fica em pausa. É o "botão de pausa" de todo sistema de pagamento: se o provedor tiver um problema, o admin segura o repasse sem desligar o resto.

| Tarefa | Frequência | Interruptor (parâmetro) | Código |
|---|---|---|---|
| Fechar campanhas vencidas (e vencer os Pix pendentes) | 15 min | `tarefa_encerrar_campanhas_ligada` | `campanha.service.close-expired.ts` |
| Rodar o repasse | 5 min | `tarefa_repasse_ligada` | `pagamento.service.transfer-pending.ts` |
| Rodar a devolução | 5 min | `tarefa_devolucao_ligada` | `pagamento.service.refund-pending.ts` |
| Conferir com o provedor | 10 min | `tarefa_conferencia_ligada` | `pagamento.service.reconcile.ts` |

- Os quatro nascem ligados. A tarefa agendada confere o interruptor antes de rodar (`nest/src/commons/agendamento/tarefa-automatica.ts`); desligada, pula a vez. O intervalo de cada uma também mora ali (`INTERVALO_TAREFA_MINUTOS`): é dele que sai o agendamento e o "A cada N minutos" que o card da T5 mostra. O "Rodar agora" da T5 roda na hora, ligada ou não.
- Enquanto alguma estiver desligada, o **Dashboard mostra um aviso** com o nome dela. Mudar o interruptor fica no log de auditoria (como todo parâmetro).
- **Pagamento automático (só Campo de Testes):** um quinto interruptor, `teste_pagamento_automatico_ligado`, nasce **desligado** e só age no modo rápido. Ligado, a cada minuto o provedor de teste paga as contribuições pendentes, pelo mesmo caminho do botão Pagar. Como mora no Campo de Testes, não existe em produção (e o parâmetro fica na parte de demonstração do seed).

- **Decisão:** os quatro interruptores valem para o sistema inteiro, inclusive em produção, com o aviso no Dashboard.
- **Motivo:** pausar uma tarefa do dinheiro sem desligar o servidor é o padrão de operação de sistemas de pagamento; o aviso evita a pausa esquecida.
- **Caso-limite:** com "Fechar campanhas vencidas" desligado, as campanhas passam do prazo e continuam "ativas" até alguém religar (ou usar o "Rodar agora"); por isso o aviso do Dashboard é obrigatório.

### 2.3 O provedor de teste e o modo rápido (`npm run start:dev:teste`)

**Em palavras simples:** o provedor de teste (`nest/src/23-pagamento/adapters/fake`) é um "Asaas de mentira" que mora dentro do próprio Nest. Ele cumpre as mesmas três tomadas do Asaas (cobrar, transferir, conferir avisos), então o resto do sistema não sabe com qual dos dois está falando: o mesmo código de contribuição, webhook, repasse, devolução e conferência roda nos dois. Nenhum dinheiro existe, não precisa de internet, de conta no Asaas nem de túnel.

**Como ligar:** na pasta `nest`, `npm run start:dev:teste` no lugar do `npm run start:dev` (`nest/scripts/start-dev-teste.mjs`). Ele sobe o Nest de sempre com `PAYMENT_PROVIDER=fake`, sem mexer no `nest/.env` (a variável de ambiente vale mais que o arquivo). A T5 mostra no topo "Modo rápido: provedor de teste" e todas as ações dela funcionam.

**Como ele imita o Asaas, passo a passo:**

| No Asaas | No provedor de teste |
|---|---|
| Cria a cobrança e devolve o QR do Pix, a página do cartão ou o boleto | Cria a cobrança na memória e devolve um código Pix, um link e uma linha digitável de mentira (`fake.local`) |
| Quem apoia paga no banco dele | Ninguém paga sozinho: o botão **Pagar** da T5 faz o papel de quem apoia |
| O Asaas manda o aviso (webhook) pelo túnel | O provedor de teste entrega o aviso direto ao mesmo serviço do webhook, dentro do Nest, com o token dele: registrar o evento, reconsultar a cobrança e aplicar seguem o caminho de um aviso real |
| Pix não pago vence | Botão **Vencer** da T5, ou a tarefa de vencimento depois de `pix_validade_horas` |
| Cartão: o dinheiro é liberado cerca de 30 dias depois | Botão **Liberar** da T5 |
| Aviso repetido (o Asaas reenvia) | Botão **Repetir aviso** da T5 |
| Diretório Pix (conferir o titular da chave do pesquisador) | "Minha chave Pix" da T5 registra a chave com o CPF do próprio perfil |
| Transferência ao pesquisador conclui ou falha no banco | Botões **Concluir** e **Falhar** da T5 |
| Devolução: o banco devolve (Pix e cartão) ou gera link (boleto) | Pix e cartão: devolve na hora; boleto: gera um link de mentira e a contribuição vai para reembolso manual, como no Asaas |

**Cuidados:**
- A memória do provedor de teste fica no arquivo `nest/.fake-gateway.json` (fora do git, `fake-gateway.persistencia.ts`): reiniciar o Nest não perde as cobranças. O arquivo leva um carimbo do banco; com o banco recriado, o carimbo não bate e o provedor começa vazio (as cobranças antigas aparecem como "Perdida" na T5 e só vencem sozinhas).
  - **Decisão:** gravar a memória do provedor de teste num arquivo local a cada mudança e ler de volta quando o Nest sobe.
  - **Motivo:** o Nest reinicia a cada arquivo salvo (`--watch`) e a cada Ctrl+C; sem isso, toda cobrança pendente da T5 virava "perdida" e o teste tinha de recomeçar.
  - **Caso-limite:** banco recriado ou arquivo apagado: o provedor começa vazio e cada memória nova leva uma marca própria nos ids (`fake_pay_<marca>_000001`), então nunca repete um id que o banco já guarda. Arquivo estragado só gera um aviso no log; o Nest sobe do mesmo jeito.
- O banco é o mesmo do modo normal: as contribuições do modo rápido ficam com o provedor `fake` e as tarefas automáticas só tratam as do provedor ligado, então nunca se misturam com as do Asaas.
- Em produção o provedor de teste não sobe: o Nest se recusa a iniciar com `PAYMENT_PROVIDER=fake` e `NODE_ENV=production` (`pagamento.module.ts`).

- **Decisão:** um comando à parte (`start:dev:teste`), em vez de duas bancadas (uma para o provedor de teste, outra para o Asaas).
- **Motivo:** o Nest fala com um provedor por vez; falar com dois ao mesmo tempo seria uma mudança grande no pagamento só para teste.
- **Caso-limite:** no modo rápido, um aviso do Asaas que chegar pelo túnel é recusado (o Nest está falando com o provedor de teste) e o Asaas tenta de novo depois; por isso o tutorial manda fechar o túnel enquanto o modo rápido estiver ligado.

---

## 3. Meios de pagamento

| | Pix | Cartão de crédito | Boleto |
|---|---|---|---|
| Ligado | Sempre | `cartao_habilitado` (nasce ligado) | `boleto_habilitado` (**nasce desligado**) |
| Campanhas | Tudo-ou-nada e flexível | **Só flexível** (no tudo-ou-nada a devolução por cartão é contestável e lenta) | **Só flexível** (a devolução de boleto depende de quem apoiou, ver seção 7) |
| Valor | A partir de `valor_minimo_contribuicao` | De `valor_minimo_contribuicao_cartao` a `valor_maximo_contribuicao_cartao` (R$ 20 a R$ 500), à vista | A partir de `valor_minimo_contribuicao` |
| Tarifa estimada | `taxa_pagamento_pix` (fixa) | `taxa_cartao_percentual` + `taxa_cartao_fixa` (calculada para que, descontada a tarifa, sobre o valor inteiro) | `taxa_pagamento_boleto` (fixa) |
| Onde a pessoa paga | QR Code ou "copia e cola", válido por `pix_validade_horas` | Página segura do provedor (o sistema nunca vê o número do cartão) | Boleto do provedor (link e linha digitável), vence em `boleto_vencimento_dias` |
| Quando o dinheiro fica disponível | Na hora | Cerca de `cartao_dias_liberacao` dias depois. Até lá, a parte do cartão não entra no repasse | Quando o provedor confirma o pagamento (cerca de 1 dia útil) |

- **Decisão:** o tudo-ou-nada aceita só Pix; cartão e boleto, só no flexível; o boleto nasce desligado.
- **Motivo:** no tudo-ou-nada que não bate a meta, todo o dinheiro volta. O Pix volta sozinho; o cartão pode ser contestado e demora; o boleto só volta se cada pessoa informar uma conta bancária. No flexível o dinheiro quase nunca volta (só se o projeto for cancelado ou derrubado pela moderação).
- **Caso-limite:** campanha flexível cancelada com contribuições por boleto: cada uma vai para reembolso manual com o link do provedor para quem apoiou informar a conta (seção 7).

**Tarifa real, corrigida sozinha.** O valor do parâmetro é só o ponto de partida. Ao criar a cobrança, o provedor informa quanto vai cair de fato na conta; o sistema calcula a tarifa real (cobrado menos líquido), corrige o valor da cobrança antes de mostrar o Pix, o link ou o boleto, e, no Pix e no boleto (tarifas fixas), atualiza o parâmetro `taxa_pagamento_pix` ou `taxa_pagamento_boleto` (a troca fica no log de auditoria). Função: `ajustar_tarifa_pagamento` (05).

O cartão de débito existe no tipo `meio_pagamento` do banco, mas o sistema não o aceita (`MEIOS_PAGAMENTO_ACEITOS` em `nest/src/22-contribuicao`).

---

## 4. A vida de uma contribuição

| Situação | Quer dizer | Pode ir para |
|---|---|---|
| `pendente` | Cobrança criada, esperando o pagamento | `confirmado`, `expirado`, `erro` |
| `confirmado` | Paga | `repassado`, `a_devolver`, `reembolsado`, `reembolso_manual` |
| `expirado` | O Pix venceu sem pagamento | (fim) |
| `erro` | A cobrança não chegou a existir no provedor | (fim) |
| `repassado` | Entrou num repasse ao pesquisador | (fim) |
| `a_devolver` | Na fila da devolução automática | `devolvido`, `reembolso_manual` |
| `devolvido` | O dinheiro voltou para quem apoiou | (fim) |
| `reembolsado` | Devolvida por fora do sistema (pelo provedor) | (fim) |
| `reembolso_manual` | A devolução automática não conseguiu; uma pessoa resolve | `devolvido` |

Qualquer outra mudança é recusada pelo banco (91050, `fn_valida_transicao_status_contribuicao`). Toda mudança grava uma linha em `auditoria_financeira`, que só aceita inclusão: o histórico do dinheiro não se apaga nem se edita.

---

## 5. O fim da campanha: para onde vai o dinheiro

O pesquisador escolhe o modelo ao criar a campanha (campo "Modelo de financiamento", com a explicação num tooltip) e pode trocá-lo até a aprovação; depois o banco o congela (91005). Sem escolha, a campanha é tudo-ou-nada.

Decidido por `destino_dinheiro_campanha()` (05), no mesmo instante em que a campanha termina. Um Pix ainda pendente que for pago depois segue o mesmo destino.

| Como terminou | Destino |
|---|---|
| Prazo acabou e bateu a meta (`sucesso`) | Repasse |
| Prazo acabou sem bater a meta (`nao_atingido`), flexível | Repasse |
| Prazo acabou sem bater a meta (`nao_atingido`), tudo-ou-nada | Devolução |
| "Cancelar o projeto" (o dono desiste; vale com ou sem contribuição) | Devolução |
| "Encerrar antes do prazo" aprovado pelo admin (só flexível, ou tudo-ou-nada que já bateu a meta: 91051) | Repasse |
| Derrubada pela moderação (`encerrado_moderacao`) | Devolução |

- **Decisão:** dois caminhos de "desistir" com destinos diferentes: "Cancelar o projeto" sempre devolve; "Encerrar antes do prazo" repassa, mas só com aprovação do admin.
- **Motivo:** quem apoiou uma campanha que não vai acontecer recebe o dinheiro de volta sem depender de ninguém; repassar antes do prazo é exceção e precisa de uma pessoa olhando.
- **Caso-limite:** tudo-ou-nada que não bateu a meta não pode pedir "Encerrar antes do prazo" (91051): o caminho é cancelar, e todo o dinheiro volta.

---

## 6. Repasse ao pesquisador

1. O pesquisador cadastra a chave Pix em **Minha Conta > Acadêmico**. O sistema consulta o diretório Pix pelo provedor e só aceita a chave cujo titular tem o **mesmo CPF** do pesquisador. A chave fica guardada cifrada.
2. Quando o destino é repasse, o banco cria **um repasse por campanha** com o valor bruto (soma das contribuições disponíveis), a taxa da plataforma (`taxa_plataforma` da campanha ou `taxa_plataforma_padrao`) e o valor líquido. A taxa nunca é menor que `taxa_minima_repasse` (função `liquido_repasse`, 05).
3. A tarefa de repasse (a cada 5 minutos, `pagamento.service.transfer-pending.ts`) pede a transferência ao provedor, mas só depois da **carência** (`repasse_carencia_dias`, contada de quando o repasse foi criado). Antes de executar, o provedor pergunta ao sistema (validação de saque, seção 8), e o sistema só aprova se o valor e a chave de destino forem os do repasse.
4. O aviso de transferência concluída marca o repasse como `concluido` e as contribuições como `repassado`.
5. Falha (banco recusou, sem saldo, rede): nova tentativa com espera que dobra a cada vez (`repasse_backoff_base_minutos` até `repasse_backoff_max_minutos`), até `repasse_max_tentativas`. Depois disso o repasse fica em `erro` e o admin o reenfileira no painel.

- **Em palavras simples:** o dinheiro de uma campanha espera alguns dias na conta da plataforma antes de ir para o pesquisador, porque ainda pode voltar.
- **Decisão (19-10-2026):** carência de `repasse_carencia_dias` (padrão 15) antes de cada repasse sair, contada de `repasse.criado_em` (o fechamento da campanha, ou a liberação do cartão). Para testar na hora, o parâmetro pode ficar em 0.
- **Motivo:** o dinheiro ainda pode voltar depois de pago: estorno, contestação de cartão e a devolução por fraude do Pix (MED, que a vítima pode pedir em até 80 dias). Se voltar antes do repasse, sai do valor dele (as contribuições são reconferidas na hora de transferir); depois, a plataforma pagaria a conta. É o mesmo princípio do Catarse, que repassa 15 dias depois do fim da campanha (Termos de Uso, item 7.4).
- **Caso-limite:** a carência cobre só o começo da janela do MED (80 dias) e da contestação de cartão; o que voltar depois do repasse cai em revisão manual, e o ressarcimento pelo pesquisador ainda não está no Termo do Pesquisador (ver PENDENCIAS).

- **Decisão:** a tarifa que o provedor cobra pela transferência Pix ao pesquisador (R$ 2,00 no Asaas, com 30 grátis por mês, lida em 18-10-2026 pela API de tarifas da conta) é paga pela plataforma, e a taxa da plataforma num repasse é **a maior** entre a percentual (5%) e `taxa_minima_repasse` (R$ 2,00).
- **Motivo:** quem faz o Pix paga a tarifa dele, como quem apoia paga a de receber; e a plataforma nunca fica no prejuízo: 5% de um repasse pequeno (por exemplo, R$ 10 dão R$ 0,50) não pagaria a transferência.
- **Caso-limite:** num repasse de R$ 10 o pesquisador recebe R$ 8,00, não R$ 9,50. A partir de R$ 40 de repasse, os 5% já cobrem a tarifa e nada muda. Com o cartão, a parte liberada depois vira um segundo repasse, que paga a sua própria transferência.

**Cartão:** a parte paga com cartão só entra no repasse quando o provedor libera o dinheiro (cerca de 30 dias). A mesma tarefa cria um repasse novo, só dessa parte, quando ela fica disponível (`criar_repasses_liberados`). O pesquisador vê o que falta liberar em **Minha Conta**.

- **Em palavras simples:** o cartão (ou o boleto) liberado numa campanha que ainda está no ar espera o fim dela; só depois vira repasse.
- **Decisão (18-10-2026):** `criar_repasses_liberados` olha primeiro para onde vai o dinheiro da campanha e só então cria o repasse, em dois passos separados. Antes, as duas coisas eram uma conta só ("destino é repasse **e** criar o repasse"); com a campanha ainda ativa o destino é vazio, e o banco precisava calcular a segunda parte para saber o resultado, o que criava o repasse.
- **Motivo:** achado ao montar a demonstração nova: o boleto já pago de uma campanha flexível no ar ganhou um repasse antes do fim. No uso real, um cartão liberado 30 dias depois do pagamento, numa campanha de até 60 dias, sairia para o pesquisador antes do fechamento; se depois a moderação encerrasse a campanha, o dinheiro que devia voltar para quem apoiou já teria saído.
- **Caso-limite:** campanha encerrada antes da correção com um repasse indevido criado não é corrigida sozinha (o banco é recriado do zero). Provado no PGlite (suíte 47, "cartão liberado em campanha ainda no ar não gera repasse").

---

## 7. Devolução a quem apoiou

1. As contribuições pagas de uma campanha cujo destino é devolução viram `a_devolver`.
2. A tarefa de devolução (a cada 5 minutos, `pagamento.service.refund-pending.ts`) pede ao provedor a devolução de **cada contribuição separadamente**, no **valor da contribuição** (sem a tarifa).
3. O provedor pergunta ao sistema (validação de saque) e o sistema só aprova a devolução de uma contribuição `a_devolver`, no valor certo.
4. A contribuição só vira `devolvido` quando o provedor confirma que o dinheiro voltou de verdade. Enquanto ele não confirma, ela continua `a_devolver` e a tarefa confere de novo; o histórico financeiro registra essa espera como `estorno_aguardando_provedor (tentativa N)`. `estorno_falhou (tentativa N): <motivo>` fica só para falha de verdade (o banco recusou, a rede caiu). As duas contam como tentativa: uma devolução que nunca termina também chega ao reembolso manual.
5. Sem sucesso depois de `estorno_max_tentativas`, ou passado o prazo em que o provedor ainda aceita devolver um Pix (`estorno_prazo_pix_dias`), a contribuição vai para `reembolso_manual`: alguém devolve por fora e registra no painel como fez (a observação é obrigatória, 90034).

**Boleto.** O provedor não sabe para onde devolver um boleto: gera um link onde quem apoiou informa a conta bancária e manda um documento. O sistema pede esse link e a contribuição vai direto para `reembolso_manual`, com o link no motivo que o admin vê no painel, para enviá-lo a quem apoiou. Quando o provedor concluir a devolução, o aviso de estorno fecha a contribuição como `devolvido` sozinho.

**Nunca devolve duas vezes.** Cada devolução vai ao provedor com uma marca da contribuição (`estorno-<id>`); antes de pedir de novo, o sistema procura uma devolução com essa marca ainda viva.

---

## 8. Os avisos do provedor e a validação de saque

**Webhook (os avisos).** O provedor avisa cada mudança (pago, vencido, transferência concluída, devolvido) em `POST /pagamento/webhook/:provedor`. O sistema:
- confere o token do provedor antes de tocar no banco (sem token certo: 401);
- guarda todo aviso em `evento_pagamento`, uma vez só (o provedor reenvia avisos: o repetido é reconhecido e ignorado);
- aplica a mudança pela máquina de estados (seção 4);
- deixa na caixa, para nova tentativa, o aviso que ainda não dá para aplicar, e manda para **revisão manual** no painel o que precisa de uma pessoa.

**A caixa de avisos se resolve sozinha.** Em palavras simples: o sistema responde "recebi" ao provedor mesmo quando ainda não consegue usar o aviso (responder "erro" faria o provedor insistir e, depois de muitas falhas seguidas, pausar todos os avisos). Por isso o provedor não manda de novo, e quem tenta de novo é o próprio sistema. A tarefa de conferência (a cada 10 minutos):
1. pega os avisos parados há mais de `webhook_reprocessar_espera_minutos` (5) e os processa de novo, pelo mesmo caminho do webhook (`eventos_para_reprocessar`, 05);
2. passado `webhook_reprocessar_horas` (24) sem encontrar a que pertencem, manda para **revisão manual** com o motivo escrito (`mandar_evento_para_revisao`, 05): "dinheiro recebido no provedor sem contribuição correspondente" ou "transferência que o sistema não pediu";
3. o admin resolve no painel (Pagamentos, revisões), escrevendo o que fez (90034).

- **Decisão:** tentar de novo sozinho por um prazo e, depois dele, pôr na frente de uma pessoa; nunca descartar em silêncio.
- **Motivo:** o caso comum é o aviso de "pago" chegar uma fração de segundo antes de a contribuição terminar de ser gravada; na segunda tentativa ela já existe. O que sobra depois de 24 horas não é do sistema, e as duas situações merecem um olhar: dinheiro sem dono na conta, ou uma saída que ninguém pediu (sinal de segurança).
- **Caso-limite:** aviso de uma devolução ou transferência feita por fora e recusada pela validação de saque também cai aqui depois de 24 horas, junto com o registro da recusa no log. Antes desta regra (até 18-10-2026), esses avisos ficavam parados para sempre.

- **Decisão (21-10-2026):** o admin também pode dar baixa num aviso em "tentar de novo", sem esperar as 24 horas; e um repasse em erro ganhou uma segunda saída além de reenfileirar: **Marcar como pago** (`marcar_repasse_pago`), que conclui o repasse sem nova transferência, passa as contribuições para repassadas e dá baixa nos avisos em revisão desse repasse.
- **Motivo:** quando o provedor avisa que pagou um repasse que o sistema já marcou como erro, a única ação era reenfileirar, que pagaria o pesquisador duas vezes; o repasse ficava em erro para sempre. Dar baixa antes do prazo é seguro porque a conferência periódica ainda aplica um pagamento de verdade pela contribuição pendente.
- **Caso-limite:** só uma pessoa faz erro -> concluido; o webhook continua barrado (91039) e manda para revisão manual. Reenfileirar um repasse cuja transferência falhou também o libera do provedor antigo (`provedor` volta a vazio), para sair pelo provedor ligado. Provado no PGlite (suíte 55).

**Contestação de cartão (chargeback).**
- **Em palavras simples:** quando alguém contesta a compra do cartão no banco, o provedor tira o dinheiro da conta da plataforma; o sistema agora põe isso na frente de uma pessoa.
- **Decisão (19-10-2026):** os avisos `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE` e `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` viram `cobranca_contestada` e vão **sempre** para revisão manual (`registrar_contestacao_pagamento`, 05), ligados à contribuição e com o valor, sem mudar o status dela. A contestação aberta aparece como saída em Eventos de Pagamento.
- **Motivo:** antes, esses avisos eram gravados e ignorados, e a conferência periódica lia a contestação como pagamento confirmado: o dinheiro saía da conta e o sistema continuava achando que a contribuição estava paga ou repassada.
- **Caso-limite:** o sistema não decide sozinho o que fazer com a contestação (devolver, disputar, cobrar o pesquisador); quem decide é a pessoa na revisão manual.

**Aviso que se perdeu.** A tarefa de conferência (a cada 10 minutos, `pagamento.service.reconcile.ts`) pergunta ao provedor a situação de cada contribuição pendente há mais de `reconciliacao_limite_minutos`. Um Pix pago cujo aviso nunca chegou é confirmado mesmo assim.

**Validação de saque (a proteção do dinheiro que sai).** O provedor, antes de executar qualquer transferência ou devolução pedida pela API, chama `POST /pagamento/webhook/:provedor/autorizacao-saque` com um token próprio. O sistema aprova só:
- a transferência de um repasse em andamento, no valor líquido dele, para a chave Pix verificada do dono da campanha;
- a devolução de uma contribuição `a_devolver`, no valor dela.

Todo o resto é recusado, com o motivo no log. Se o banco estiver fora do ar, a resposta é 503 e o provedor acaba cancelando a saída (o lado seguro).

- **Decisão:** a validação de saque é obrigatória, inclusive no ambiente de testes.
- **Motivo:** sem ela, o provedor exige autorização manual (código por SMS) para cada saída; e uma chave de acesso vazada tiraria dinheiro da conta sem passar pelo sistema.
- **Caso-limite:** no Asaas, a caixa "Ativar autorização de saque para estornos Pix" precisa estar **marcada**; sem ela, cada devolução fica parada esperando SMS e depois é cancelada (visto em 17-10-2026).

---

## 9. Parâmetros (tabela `configuracoes`, editáveis no painel, grupo "Pagamentos")

| Parâmetro | Padrão | Para que serve |
|---|---|---|
| `taxa_plataforma_padrao` | 5,00 % | Taxa da plataforma descontada do repasse |
| `taxa_minima_repasse` | R$ 2,00 | Menor taxa da plataforma num repasse: cobre a tarifa da transferência Pix |
| `valor_minimo_contribuicao` | R$ 5,00 | Menor contribuição |
| `pix_validade_horas` | 24 | Horas para pagar um Pix gerado |
| `taxa_pagamento_pix` | R$ 1,99 | Tarifa estimada do Pix (corrigida sozinha pela real) |
| `cartao_habilitado` | `true` | Liga ou desliga o cartão |
| `boleto_habilitado`, `taxa_pagamento_boleto`, `boleto_vencimento_dias` | `false`, R$ 1,99, 3 | Liga o boleto, tarifa estimada (corrigida pela real) e vencimento |
| `valor_minimo_contribuicao_cartao` / `valor_maximo_contribuicao_cartao` | R$ 20 / R$ 500 | Faixa do cartão (o máximo limita o prejuízo de uma contestação de compra) |
| `taxa_cartao_percentual` / `taxa_cartao_fixa` | 1,99 % / R$ 0,49 | Tarifa estimada do cartão |
| `cartao_dias_liberacao` | 30 | Previsão de liberação do cartão mostrada ao pesquisador |
| `repasse_carencia_dias` | 15 | Dias que o repasse espera antes de sair (0 para testar na hora) |
| `repasse_max_tentativas`, `repasse_backoff_base_minutos`, `repasse_backoff_max_minutos`, `repasse_lease_minutos` | 8, 15, 1440, 10 | Tentativas e esperas do repasse |
| `estorno_max_tentativas`, `estorno_backoff_base_minutos`, `estorno_backoff_max_minutos`, `estorno_prazo_pix_dias` | 8, 15, 1440, 90 | Tentativas, esperas e prazo da devolução |
| `reconciliacao_limite_minutos`, `reconciliacao_intervalo_minutos`, `reconciliacao_orfa_minutos` | 30, 60, 60 | Quando conferir com o provedor uma contribuição pendente |
| `webhook_reprocessar_espera_minutos`, `webhook_reprocessar_horas` | 5, 24 | Quando tentar de novo um aviso parado na caixa, e até quando antes da revisão manual |

---

## 10. O que foi testado

- **Banco (suítes de teste locais, com o Postgres em WASM):** máquina de estados, tarifa, destino do dinheiro, filas, cartão e encerramento antecipado.
- **Ambiente de testes do Asaas (17 e 18-10-2026):** Pix pago e confirmado pelo aviso; tarifa real corrigida sozinha; chave Pix do pesquisador conferida pelo CPF; repasse autorizado pelo sistema e concluído; falha de transferência e reenfileiramento; aviso perdido recuperado pela conferência; transferência e devolução pedidas **por fora do sistema** recusadas; e a **devolução concluída de verdade**, com o dinheiro voltando a uma segunda conta de testes. A lista completa, com o que não deu para testar e por quê, está na Parte 12 do tutorial.
- **Ainda falta:** o cartão no ambiente de testes (depende de liberar a criação de campanha flexível) e o teste de R$ 1 em produção no dia do deploy (PENDENCIAS, "No dia do deploy").

---

## 11. Limitações conhecidas

- **O ambiente de testes não devolve Pix de pagador inventado.** O Pix pago pelo botão "Confirmar pagamento" vem de um pagador fictício, e o banco simulado recusa a devolução ("O tipo desta transação não permite que ela seja estornada"). O sistema trata como qualquer devolução que não sai: tenta de novo e, esgotadas as tentativas, manda para reembolso manual.
- **Túnel no computador.** Enquanto o Nest roda no computador, o provedor só alcança o webhook por um túnel (`npm run tunel`, com endereço fixo do ngrok). Depois do deploy o sistema tem endereço próprio e o túnel deixa de existir.
- **Tarifas do provedor mudam.** Os valores de hoje (Pix recebido R$ 0,99 em promoção até 17-01-2027, depois R$ 1,99; transferência Pix R$ 2,00) vêm da conta. A tarifa de receber se corrige sozinha; `taxa_minima_repasse` precisa ser revista no painel se a tarifa de transferência mudar.
- O que ainda está em aberto no dinheiro fica no `PENDENCIAS e correcoes.md`, seção de Pagamento.
