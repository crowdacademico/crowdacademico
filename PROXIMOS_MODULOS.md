# 🗺️ Próximos Módulos - CrowdAcadêmico

**O que é este arquivo:** lista dos módulos do backend (Nest) que ainda faltam construir, em ordem sugerida, pra qualquer uma das duas pegar uma tarefa e começar sem precisar perguntar "o que falta fazer mesmo?". Cada módulo já tem a pasta criada (`nest/src/<numero>-<nome>/`) e o schema do banco já existe inteiro (tabelas, RLS, triggers) - o trabalho que falta é só o lado Nest (controllers/services/DTOs), seguindo o mesmo padrão dos módulos que já existem (`1-usuario`, `2-papel-permissao`, `3-auth`, `11-configuracoes` são bons exemplos pra copiar o estilo).

Ordem pensada por dependência de produto (o que precisa existir antes de outra coisa fazer sentido) - não é obrigatório seguir à risca, mas evita ficar bloqueada esperando algo que ainda não existe.

---

## Grupo 1 - Catálogos pequenos (bom ponto de partida)

Três módulos pequenos e parecidos entre si - todos seguem o mesmo formato (uma tabela de catálogo, `findall` público + `create`/`update` protegidos por permissão administrativa). Bons pra pegar o ritmo do padrão do projeto antes de encarar algo maior.

- ✅ **`8-area-conhecimento`** - grandes áreas e áreas do CNPq (hierarquia de 2 níveis). Necessário pra criar uma campanha (toda campanha precisa de uma área nível 2).
- ✅ **`9-tipo-link`** - catálogo de tipos de link externo (Lattes, ORCID, LinkedIn, GitHub, site institucional...).
- ✅ **`10-motivo-denuncia`** - catálogo de motivos de denúncia (campanha e perfil).

## Grupo 2 - Perfil do pesquisador

- ✅ **`6-perfil-pesquisador`** - o maior módulo pendente relacionado a usuário. Inclui: criar/editar perfil (vínculo institucional ou independente, título acadêmico), campo de CPF com validação de verdade (algoritmo com dígito verificador, não só formato), consulta do score e das dimensões.

## Grupo 3 - Upload de arquivo

- ✅ **`26-arquivo`** - upload de mídia (imagem de perfil, imagens de campanha, anexos), fluxo em 2 passos (URL pré-assinada + confirmação com verificação de assinatura de bytes). **01-09-2026:** ganhou processamento server-side com `sharp` na confirmação (redimensiona + converte pra WebP + remove EXIF, por `contexto`: avatar 512px/qualidade 80, campanha/atualização 1600px/qualidade 78), cota de 50MB por usuário, e tetos de tamanho por tipo baixados pra 8MB imagem / 5MB PDF (o plano grátis do Supabase Storage, provedor atual, só tem 1GB de espaço total). Front (`seletor-foto-perfil.jsx`) também reduz a imagem no navegador antes de subir (Canvas API), como otimização de UX, não de segurança - o `sharp` no backend continua sendo a autoridade final. Detalhe pra quem for construir o upload de campanha/atualização: **hoje só o avatar chama `contexto: 'avatar'`** - a tela de Criar Campanha ainda não existe no React, então `contexto: 'campanha'`/`'atualizacao'` não tem chamador real ainda, só o perfil implementado no backend.

## Grupo 4 - Núcleo da campanha (o mais importante do projeto)

- ✅ **`12-campanha`** - CRUD completo: criar, listar, consultar, aprovar/rejeitar (fluxo de moderação), editar. É o módulo do qual praticamente tudo mais depende. **21-09-2026, ciclo de vida completo:** a campanha nasce **Rascunho** e só entra na fila por `POST /campanha/:id/enviar`; a rejeitada é corrigida e reenviada no mesmo endpoint (máximo de reenvios e prazo por rejeição, configuráveis; esgotada, vira só leitura); `POST /campanha/:id/deslizar-datas` reagenda mantendo a duração; 4 jobs agendados no sistema (2 são deste módulo: expirar rascunho e expirar rejeitada). Regras no banco, ver `DOCUMENTACAO_BD.md` [05-K-2-B].
- ✅ **`13-orcamento-campanha`** - itens de orçamento estruturado (categoria + valor), obrigatório pra aprovar uma campanha.
- ✅ **`14-marco-cronograma`** - cronograma estruturado (marcos com data prevista), também obrigatório pra aprovar.
- ✅ **`7-link-academico`** - links do pesquisador vinculados ao próprio perfil (Lattes, ORCID etc.), usando o catálogo do Grupo 1.

## Grupo 5 - Engajamento numa campanha já aprovada

- ✅ **`15-atualizacao-campanha`** - posts de acompanhamento do projeto (andamento, resultado preliminar, resultado final). Junto: `link_atualizacao` e `arquivo_atualizacao` (satélites sem pasta própria, dobrados neste módulo - ver `db.types.ts`). O vínculo de arquivo já funciona (INSERT normal), só não é testável de ponta a ponta até `26-arquivo` existir.
- ✅ **`16-seguir`** - seguir/deixar de seguir uma campanha e, desde 19-10-2026, um pesquisador (RF-028: `/seguir-pesquisador`, contagem pública de seguidores). As duas tabelas, as mesmas regras, um módulo só. O botão de verdade do seguir pesquisador fica na página pública do perfil (ainda não existe); no painel, o coração da T1 e a lista da T4.
- ✅ **`17-comentario`** - comentários e endosso, com moderação.

- ✅ **`18-recompensa`** (19-10-2026) - recompensa **simbólica** (decisão do Lucas: sem estoque, sem entrega): reconhecimento, acesso antecipado ou conteúdo digital, a partir de um valor mínimo, com um link especial opcional que só o dono, o admin e quem ganhou enxergam (`link_recompensa`). O dono cria e desativa na seção Recompensas do Alterar Campanha; quem apoia escolhe em `POST /contribuicao` (`idRecompensa`, só com conta e com o valor mínimo) e vê as ganhas na Minha Conta, aba Contribuições. A escolha na hora de contribuir depende do checkout (área pública).


## Grupo 6 - Moderação e encerramento

- ✅ **`19-denuncia`** - denúncia de campanha ou perfil (03-10-2026): criar, listar, julgar e encerrar campanha por moderação a partir de uma denúncia procedente; tela Denúncias (moderação), seção no Consultar da campanha, "Denunciar autor" nos comentários recebidos. Ver `DOCUMENTACAO_BACKEND.md`.
- ✅ **`20-solicitacao-encerramento`** - encerramento antecipado (03-10-2026): sem contribuição confirmada o dono encerra direto; com contribuição, pede e o admin aprova ou rejeita; cancelar enquanto pendente. Tela Encerramentos (moderação), seção no Alterar do dono e no Consultar da campanha. Ver `DOCUMENTACAO_BACKEND.md`.
- ✅ **`21-historico-rejeicao`** - histórico de rejeições de campanha, consulta pura (14-09-2026; desde 21-09-2026 sobrevive à exclusão da campanha e guarda dono e título, ver `DOCUMENTACAO_BD.md`). `GET /historico-rejeicao?idCampanha=` (nome do admin já resolvido via join, mais recente primeiro) - sem tela própria, virou seção "Histórico de Rejeições" dentro de Consultar Campanha (fila de aprovação e telas de teste), escondida quando a campanha nunca foi rejeitada.

## Grupo 7 - Comunicação

- ✅ **`4-mail`** (19-10-2026) - o "carteiro": a cada minuto pega a fila de `notificacao`, monta o texto (`modelos/`) e entrega pelo provedor de `EMAIL_PROVIDER` (teste, Brevo pela API ou SMTP), com nova tentativa e espera crescente. Os e-mails nascem nos gatilhos do banco (`[05-Q]`) e, para verificar a conta e recuperar a senha, no Nest. Passo a passo e comparação dos serviços: `.Tutorial-email.md`. Sem tela própria: a caixa do provedor de teste é a T6 do Campo de Testes.
- ✅ **`27-notificacao`** (19-10-2026) - o registro dos e-mails (RF-121): aba **Notificações** do Dashboard, com a situação de cada e-mail, reenviar o que falhou e cancelar; números no cartão da Visão Geral.
- ✅ **`5-termo-uso`** - versionamento de termos de uso e aceite pelo usuário. **(esta lista tinha ficado desatualizada aqui - o módulo já existia, 4 arquivos, conferido em 01-09-2026)**

## Grupo 8 - Pagamento (por último, de propósito)

Esta parte só começa depois que o resto do sistema - principalmente o painel administrativo e o núcleo de campanha - estiver funcionando perfeitamente. Também depende de uma decisão de negócio ainda não tomada (qual gateway de pagamento usar).

**Regra do Lucas (24-09-2026):** é a última coisa do sistema, e os testes serão todos em sandbox, **mas sandbox não é desculpa para fazer mal feito**: quando chegar a hora, mesmo em sandbox, tem que funcionar perfeitamente (assinatura do webhook, idempotência, reconciliação, máquina de estados de contribuição e repasse).

**Escolha do gateway (levantamento de 03-08-2026; confirmar valores e regras no site de cada um antes de decidir).** Ela destrava três coisas de uma vez: verificação de assinatura HMAC do webhook, idempotência (gateways reenviam webhook "pelo menos uma vez") e reconciliação financeira (job comparando o extrato do gateway com `contribuicao`). O critério mais importante para este projeto: o dinheiro entra de vários doadores, fica em custódia até a campanha ser aprovada (ou até o prazo acabar, no all-or-nothing) e só depois é repassado ao pesquisador, ou devolvido a todos se a meta não foi batida. No mundo dos gateways isso se chama "split de pagamento" ou "marketplace", e nem todo gateway faz de forma automática; sem split o repasse vira processo manual (mais trabalho e mais chance de erro humano, mas não impede o TCC de funcionar).

- **Mercado Pago:** o mais usado no Brasil, documentação em português, PIX nativo, "Marketplace" com split automático. Atenção: habilitar o split costuma pedir CNPJ e um processo de aprovação; conferir se dá para testar em sandbox só com CPF.
- **Asaas:** brasileiro, pensado desde o início para plataformas, com "subcontas" que mapeiam bem o dinheiro em custódia. PIX nativo e ambiente de teste. Menos conhecido, com menos tutorial e comunidade.
- **Pagar.me (Stone):** split robusto (Pagar.me Connect), habilitação mais burocrática, geralmente pede CNPJ.
- **Stripe:** documentação excelente e Stripe Connect maduro para split. Atenção: o suporte a PIX no Brasil veio depois dos gateways brasileiros (checar se hoje é suficiente) e a documentação é em inglês.
- **Efí Bank (ex-Gerencianet):** focado em PIX direto, API simples. Não tem split automático: o repasse ao pesquisador seria uma transferência separada, manual ou por outra chamada de API.

Riscos de decidir mal ou tarde: escolher um sem split e descobrir depois que o repasse não é automático; escolher um que exige CNPJ para a funcionalidade necessária e ter de trocar no meio do caminho; decidir com pressa quando restar pouco tempo de TCC. Perguntas para decidir: existe CNPJ ou MEI disponível, ou os testes serão só com CPF pessoal (sandbox)? Vale a complexidade de um split automático, ou o repasse manual é simples o bastante para o tamanho deste TCC? **Status:** gateway ainda não escolhido.

### Tarifa do meio de pagamento: quem paga (decidido em 12-10-2026: quem apoia, opção (c))

> **Em palavras simples:** quando alguém apoia uma campanha com R$ 100, dois "pedágios" saem desse dinheiro: a **taxa da plataforma** (os 5% do RF-060, o que o CrowdAcadêmico cobra) e a **tarifa do intermediador de pagamento** (a empresa que processa o Pix, o cartão ou o boleto, como Mercado Pago ou Asaas, que cobra diferente para cada meio). Os requisitos não diziam quem paga o segundo pedágio. Sem essa resposta, a página de Transparência não tem o que mostrar e a conta do repasse fica incompleta. A decisão: **quem apoia paga a tarifa do meio que escolheu, e o Pix não tem tarifa nenhuma**. A plataforma não corre risco de prejuízo, e o Pix vira o caminho natural.

**Preços de referência (levantamento de 05-10-2026; conferir no site de cada um antes de escolher o gateway):** Mercado Pago: Pix 0%, cartão de crédito de 3,99% a 4,98% conforme o prazo de recebimento, boleto R$ 3,49. Asaas: Pix R$ 1,99, boleto R$ 1,99, cartão 1,99% + R$ 0,49.

#### As 3 opções, com R$ 100 de apoio

| | (a) Taxa única "tudo incluído" | (b) Taxa + tarifa descontadas do pesquisador | (c) Quem apoia paga a tarifa |
|---|---|---|---|
| **Quem apoia paga** | R$ 100 | R$ 100 | Pix R$ 100 · cartão ~R$ 105 · boleto R$ 103,49 |
| **O pesquisador recebe** | R$ 95, sempre | Pix R$ 95 · cartão ~R$ 90 · boleto R$ 91,51 | R$ 95, sempre |
| **A plataforma fica com** | Pix R$ 5 · cartão ~R$ 0 · boleto R$ 1,51 | R$ 5, sempre | R$ 5, sempre |
| **Quem faz assim** | Vakinha, Kickante | Experiment.com, Benfeitoria, Catarse (que cobra o intermediador do criador) | Vaquinhas Online (exceção no mercado) |

**(a) Taxa única:**
- 👍 A mais simples de entender e de explicar: o pesquisador sabe exatamente quanto vai receber antes de começar a campanha, e quem apoia nunca vê nenhum valor a mais.
- 👍 A mais simples de construir: um número só (o parâmetro que já existe) e a conta "líquido = bruto − 5%", que o banco já faz.
- 👍 Não depende do intermediador escolhido: trocar de empresa não muda nenhum requisito nem tela.
- 👎 Com 5%, a plataforma não ganha quase nada no cartão, e **paga a tarifa de toda devolução** (ver abaixo).

**(b) Desconto do pesquisador:**
- 👎 O pesquisador não sabe quanto vai receber: depende de como cada apoiador pagou. Para quem pediu R$ 5.000 para comprar um equipamento, isso é ruim.
- 👎 Mais trabalho no módulo de contribuição: guardar a tarifa de cada pagamento e conferir com o extrato do intermediador.
- 👎 A tela e os requisitos passam a depender dos preços de um gateway específico.

**(c) Quem apoia paga:**
- 👎 Cria atrito na hora de apoiar ("por que ficou R$ 105,24?"), e o mercado quase todo faz o contrário.
- 👎 Pede uma regra clara de devolução: devolve também o acréscimo? (respondido abaixo).
- ⚖️ **É permitido:** a Lei 13.455/2017 autoriza preço diferente conforme o instrumento de pagamento, desde que a diferença seja informada de forma visível **antes** da compra. Existe regra federal recente contra cobrar taxa pelo uso do Pix (MP 1.288/2025 e portaria da Senacon); a opção (c) não esbarra nela porque **o Pix nunca tem acréscimo**.

#### Devoluções: o risco que pesou na decisão

Muitos intermediadores **não devolvem a própria tarifa quando o pagamento é estornado** (o Stripe é o exemplo mais conhecido; a regra do Mercado Pago e a do Asaas não foram encontradas e precisam ser conferidas na escolha do gateway). Com R$ 1 milhão no cartão, a tarifa fica por volta de R$ 50 mil, e numa devolução:

| Opção | Quem fica com o prejuízo da tarifa |
|---|---|
| (a) taxa única | a plataforma |
| (b) descontada do pesquisador | também a plataforma: no Tudo ou Nada que falhou, o pesquisador não recebeu nada, então não há de onde descontar |
| (c) quem apoia paga | quem apoia, se o acréscimo não voltar do intermediador (precisa estar dito e aceito antes do pagamento); a plataforma não paga nada |

**O que reduz o risco em qualquer opção:**
- **O Pix praticamente zera o problema:** no Mercado Pago custa 0% (no Asaas, R$ 1,99 fixo); devolver R$ 1 milhão por Pix custa quase nada. O risco grande está só no cartão.
- **Limite por contribuição no cartão** (parâmetro novo): "no cartão, até R$ X; acima disso, só Pix". Um apoio de R$ 1 milhão no cartão também é sinal clássico de fraude, e os intermediadores costumam barrar ou exigir verificação muito antes.
- **Política de devolução escrita no requisito:** devolução automática só nos casos do sistema (Tudo ou Nada sem a meta, encerramento antecipado, encerramento pela moderação); arrependimento de quem apoiou só enquanto a campanha está aberta ou no prazo legal (se o direito de arrependimento de 7 dias do Código de Defesa do Consumidor vale para doação sem recompensa é pergunta para a revisão externa); depois do repasse ao pesquisador, a plataforma não devolve, e vira assunto entre quem apoiou e o pesquisador (o padrão dos sites de financiamento coletivo, a confirmar com a revisão externa).
- **Na escolha do gateway**, critério obrigatório: "a tarifa volta no estorno?". No Mercado Pago, o estorno pode ser feito em até 180 dias da aprovação e exige saldo na conta (o dinheiro em custódia até o fim da campanha atende a isso).

#### Decisão

- **Decisão:** opção (c). Cada contribuição tem três valores: o **valor da contribuição** (o que vai para a campanha, conta para a meta e é a base dos 5%), a **tarifa do meio** (o acréscimo do cartão ou do boleto, que vai para o intermediador) e o **total cobrado** (a soma dos dois). No Pix, a tarifa é zero e o total é igual ao valor.
- **Motivo:** a plataforma não pode correr risco de prejuízo, e a proposta do CrowdAcadêmico é promover o Pix, que não tem tarifa. Na (c), a plataforma nunca paga tarifa, nem na cobrança nem na devolução, e o pesquisador sempre recebe 95% do que foi apoiado.
- **Caso-limite aceito:** o atrito do acréscimo no cartão e no boleto é de propósito: empurra para o Pix. O único risco que a (c) não elimina sozinha é o **chargeback** (o titular do cartão contesta a compra com o banco, e o dinheiro sai de volta com uma multa); por isso o cartão entra com limite por contribuição, ou nem entra na primeira versão (ver "Pontos para a revisão externa").

#### Como a (c) funciona, peça por peça

1. **A conta do acréscimo.** O intermediador cobra a tarifa sobre o **total** cobrado, não sobre o valor da contribuição. Para o valor da contribuição chegar inteiro, o total é `(valor + tarifa_fixa) ÷ (1 − tarifa_percentual)`. Exemplo com o cartão a 4,98%: R$ 100 viram **R$ 105,24** (e não R$ 104,98, que deixaria faltar R$ 0,26). Boleto a R$ 3,49 fixo: R$ 103,49.
2. **Parâmetros, nunca valor escrito no código:** tarifa percentual e tarifa fixa de cada meio (`pix`, `cartao_credito`, `cartao_debito`, `boleto`, o mesmo ENUM `meio_pagamento` que já existe), mais o limite por contribuição no cartão. O administrador ajusta quando o intermediador mudar de preço.
3. **A tarifa real é guardada e conferida.** O intermediador informa a tarifa que de fato cobrou (na resposta do pagamento ou no aviso do webhook). Ela é gravada ao lado da tarifa cobrada de quem apoiou, e a reconciliação acusa diferença. Se o parâmetro ficar abaixo do preço real, a diferença sairia da plataforma: por isso a conferência existe, e o ideal é calcular o acréscimo pela cotação do próprio intermediador quando a API dele oferecer.
4. **No banco (módulo `22-contribuicao`):** `contribuicao.valor` continua sendo o valor da contribuição (a meta, `valor_bruto_arrecadado` e os 5% continuam olhando só para ele); entram as colunas da tarifa cobrada de quem apoiou, do total cobrado e da tarifa real informada pelo intermediador. Repasse não muda: líquido = valor − 5%.
5. **Na devolução:** volta sempre o valor da contribuição; a tarifa volta só se, e na medida em que, o intermediador devolver. Isso aparece antes do pagamento e entra no aceite do Termo de contribuição.
6. **No checkout:** o Pix vem primeiro e marcado; cartão e boleto mostram a conta antes de pagar ("Contribuição R$ 100,00 + tarifa do cartão R$ 5,24 = R$ 105,24. No Pix, sem tarifa").
7. **Na página de Transparência:** a taxa da plataforma (5% sobre a contribuição), a tarifa de cada meio paga por quem apoia, e a simulação "quanto você paga e quanto chega ao pesquisador" a partir de um valor.

#### Pontos para a revisão externa (o requisito ainda não diz isto)

- **RF-060, acrescentar:** "A taxa da plataforma incide sobre o valor da contribuição. A tarifa do intermediador de pagamento, quando houver, é paga por quem contribui, somada ao valor e exibida antes do pagamento. O pagamento por Pix não tem acréscimo."
- **RF novo (Transparência):** página pública, sem login, com a taxa vigente da plataforma, a tarifa de cada meio de pagamento (paga por quem contribui) e a simulação do total pago e do valor que chega ao pesquisador a partir de um valor informado; as tarifas são parâmetros do Administrador.
- **RF-090:** acrescentar as tarifas de cada meio de pagamento e o limite por contribuição no cartão à lista de parâmetros.
- **Política de devolução:** quando há devolução automática; que a tarifa só volta se o intermediador devolver (informado e aceito antes do pagamento); o que acontece com arrependimento e com chargeback.
- **Pergunta jurídica:** o direito de arrependimento de 7 dias (CDC, art. 49) vale para doação sem recompensa?
- **Cartão: recomendação (12-10-2026).** Primeira versão **só com Pix e boleto**: é o único jeito de risco zero de verdade (sem chargeback) e combina com promover o Pix. O cartão entra numa segunda etapa, se fizer falta, como mais um meio de pagamento e um parâmetro, sem refazer nada.
  - **Limite por contribuição no cartão (parâmetro):** valor inicial sugerido de **R$ 500**, sem limite no Pix. Por quê: cobre o apoio comum (um cálculo grosso com números do Catarse, cerca de R$ 293 milhões vindos de mais de 1 milhão de apoiadores, dá uns R$ 290 por pessoa somando todos os apoios dela); é igual à meta mínima de campanha (`meta_minima_campanha`), então um apoio só no cartão nunca financia uma campanha inteira; e põe teto no pior chargeback. **O Lucas acha R$ 500 alto:** o valor final fica para decidir com a revisão externa, e como é parâmetro, muda sem código.
  - **O limite diminui o risco, não zera:** o valor contestado sai da campanha (o dinheiro ainda está em custódia), mas a multa de chargeback do intermediador cai sobre a conta da plataforma (valor não conferido no Mercado Pago nem no Asaas).

**Fontes (12-10-2026):** [Lei 13.455/2017](https://www.contabeis.com.br/legislacao/1911257/lei-13455-2017/) · [Preço diferente por meio de pagamento e o Pix](https://consumidormoderno.com.br/preco-diferente-dinheiro-pix-cartao/) · [MP 1.288/2025 e a portaria da Senacon sobre taxa no Pix](https://mercadoeconsumo.com.br/27/01/2025/meios-de-pagamento/fecomerciosp-diz-que-norma-da-senacon-contra-taxas-por-uso-do-pix-e-prejudicial-para-economia/) · [Mercado Pago: reembolsos e cancelamentos](https://www.mercadopago.com.br/developers/es/docs/checkout-api-orders/payment-management/refunds-cancellations) · [Dez anos de financiamento coletivo com Catarse](https://prensali.substack.com/p/dez-anos-de-financiamento-coletivo-com-catarse)

- ✅ **`22-contribuicao`** - registrar contribuição/doação, incluindo o recebimento da confirmação de pagamento do gateway escolhido.
- ✅ **`23-pagamento`** - provedor (Asaas e provedor de teste), webhook, tarefas automáticas de repasse e devolução.
- ✅ **`24-conta-recebimento`** - chave Pix do pesquisador e lista dos repasses dele.
- ✅ **`25-pagamento-revisao`** - telas do admin: revisões de aviso, reembolsos manuais, repasses que pedem atenção.

**Já conhecidos antes de construir o 22 e o 23** (achados da revisão de 24-09-2026, registrados aqui para ninguém depender de lembrar; nada disto foi feito ainda, porque só faz sentido junto com os módulos):

- **`22-contribuicao`:**
  - `UNIQUE` parcial em `contribuicao.id_transacao_api` (`WHERE id_transacao_api IS NOT NULL`). Sem ele, um webhook do gateway entregue duas vezes confirma a mesma contribuição duas vezes.
  - Máquina de estados para `status_contribuicao`. Hoje `atualizar_status_contribuicao()` (`SECURITY DEFINER`) aceita qualquer status a partir de qualquer status, para qualquer linha, sem checar permissão nem origem.
  - Quem chama `atualizar_status_contribuicao()` precisa ser só o webhook, com a assinatura do gateway verificada no Nest; ou a função checa permissão por dentro, ou o `EXECUTE` é revogado de `app_nestjs` e ela só roda por trigger.
  - Fundir as triggers de `contribuicao` (`trg_contribuicao_all_or_nothing_pix` e a de `UPDATE`, mais `trg_valida_status_contribuicao` e `trg_contribuicao_valida_valor_minimo`) numa função por evento.
  - Job para expirar contribuição pendente (`status_contribuicao = 'expirado'` existe no enum e nada o escreve).
  - Lembrar que, desde 24-09-2026, `app_nestjs` **não** atualiza `valor_bruto_arrecadado` (nem `taxa_plataforma` nem `encerrado_em`): o total é mantido pela trigger `trg_sincroniza_arrecadado_campanha`, que é `SECURITY DEFINER`. O service de contribuição só faz `INSERT` em `contribuicao`.
- **Repasse (`23-pagamento`):** `atualizar_status_repasse()` tem o mesmo problema de `atualizar_status_contribuicao()` (qualquer status, sem checagem). O modelo de campanha `flexivel` (repasse independente da meta) também espera este módulo; hoje o DTO só aceita `all-or-nothing`.
  - **Observação:** de acordo com consulta feita no dia 05/10/2026, o mercado repassa no fim da campanha, também no modelo flexível: o Catarse libera o valor 15 dias corridos após o encerramento (Termos de Uso, cláusula 7.4) e o Indiegogo, no flexível, em até 15 dias úteis. Por isso, o repasse do flexível acontece no encerramento, não a cada contribuição.

## Grupo 9 - Painel administrativo (não estavam nesta lista, mas já existem)

Estes dois módulos ficaram de fora da lista original - construídos direto, sem passar por aqui como "próximo módulo" antes. Registrados agora (01-09-2026) só pra este documento não mentir sobre o que falta.

- ✅ **`28-log-auditoria`** - trilha de auditoria administrativa (quem alterou o quê, quando, valor antes/depois - letra `L` no `DOCUMENTACAO_BD.md`). Modo somente-inclusão, ninguém edita/apaga.
- ✅ **`29-dashboard`** - métricas agregadas do painel admin (`GET /dashboard/resumo`), usa `contar_metricas_dashboard()` (`[03-M]`, `DOCUMENTACAO_BD.md`) porque RLS normal não dá número confiável de "total do sistema".

## Já descartado

- 🗑️ **`27-resources`** - removido (04-09-2026). Era sobra do esqueleto de pastas herdado do modelo da disciplina, sem propósito real neste projeto - ver `DOCUMENTACAO_BACKEND.md`, seção 14, pra explicação completa.

---

## Fora do backend (Nest) - vale registrar também

- ❌ **Página pública de campanha (React)** - hoje só existe o painel administrativo; a página que um doador visita e compartilha ainda não foi construída. Faz mais sentido depois que `12-campanha` existir de verdade no backend.
- ❌ **Open Graph** (prévia de link ao compartilhar no WhatsApp) - depende da página pública existir primeiro.
