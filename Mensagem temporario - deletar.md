━━━━━━━━━━━━━━━━━━━━━━
📊 O QUE JÁ FOI RESOLVIDO
━━━━━━━━━━━━━━━━━━━━━━

1) *Migrations* (a ideia que você trouxe!) — implementado. Agora existe
um jeito de saber, com certeza, se o meu banco e o seu estão no mesmo
estado, em vez de confiar de memória em quem colou o quê no SQL Editor.
Cada uma de nós vai rodar um comando UMA vez (`npm run db:migrate:adotar`)
pra "carimbar" que os arquivos atuais já estão aplicados, e dali em diante
qualquer mudança nova se aplica sozinha, sem colar SQL na mão.

2) *papel.codigo* — aquele risco que a outra IA achou (renomear um papel
pelo painel podia quebrar o RBAC em silêncio) foi corrigido e testado.

3) *log_auditoria* — o "quem alterou o quê e quando" que a gente queria
já existe, registrando ações administrativas sensíveis.

4) *Documentação* — os números da DOCUMENTACAO_BD.md (quantas tabelas,
policies, triggers) estavam desatualizados há 3 rodadas. Corrigidos, e
agora tem uma seção com queries prontas pra qualquer uma de nós conferir
sozinha, sem depender de ninguém contar na mão.

5) *ENUM vs. tabela editável pelo painel* — a gente discutiu se dava pra
deixar o admin criar valores novos de status/tipo pelo painel (tipo um
"título acadêmico" novo). Decisão: NÃO, na maioria dos casos — converti
2 exemplos técnicos que confirmam por quê:
- `meio_pagamento` (pix/cartão/boleto): uma trigger específica confere
  literalmente "se for diferente de PIX, bloqueia" pra campanha
  all-or-nothing. Se o admin pudesse inventar um status novo tipo
  "suspenso temporário" sem eu/você programar o que fazer com ele, o
  sistema entraria num estado que ninguém programou pra tratar — silencioso,
  sem erro nenhum. Isso tem nome: inner-platform effect (quando o sistema
  fica tão configurável que vira um banco de dados mal feito dentro do
  outro). É o oposto do problema que você trouxe primeiro (lógica demais
  no banco) — não queremos cair no erro contrário.
- Os únicos 2 ENUMs que são candidatos reais a virar tabela editável no
  futuro: `titulo_academico` (só aparece como "preenchido ou não" no
  cálculo de score) e `meio_pagamento` em si (só é comparado contra
  'pix' especificamente, não precisa saber a lista toda). Ficou anotado
  pra um dia, sem pressa.

━━━━━━━━━━━━━━━━━━━━━━
🎯 A DECISÃO QUE PRECISA DE NÓS DUAS AGORA: GATEWAY DE PAGAMENTO
━━━━━━━━━━━━━━━━━━━━━━

Essa é a única peça que trava DE VERDADE outras 3 coisas ao mesmo tempo:

- *Confirmar que o pagamento é real* (verificação de assinatura do
  webhook — sem isso, qualquer pessoa que descobrir a URL consegue
  fingir "paguei" pra qualquer contribuição, sem pagar nada de verdade)
- *Não contar a mesma doação duas vezes* (idempotência — gateways
  reenviam a confirmação "pelo menos uma vez", às vezes duas)
- *Bater o extrato* (reconciliação — conferir que o dinheiro que o
  gateway diz que recebeu bate com o que o nosso banco registrou)

Isso é decisão NOSSA, não é coisa que o Claude escreve sozinho — é
comercial (taxa, prazo de repasse, se pede CNPJ) mais do que técnica.
A boa notícia: pesquisar isso NÃO trava mais nada do código, o Claude
pode seguir trabalhando (módulo de campanha) enquanto a gente decide com
calma.

*O critério mais importante pro NOSSO caso especificamente:* o dinheiro
entra de vários doadores, fica "guardado" até a campanha ser aprovada
(ou até o prazo acabar, no all-or-nothing), e só DEPOIS é repassado pro
pesquisador (ou devolvido a todo mundo, se não bateu a meta). Isso se
chama "split de pagamento" ou "marketplace" no mundo dos gateways — nem
todo gateway faz isso de forma automática. Sem essa funcionalidade, o
repasse vira um processo manual nosso (mais trabalho, mais chance de
erro humano — mas não impede o TCC de funcionar).

*Opções que valem pesquisar juntas* (valores/taxas mudam com frequência,
confirmar no site de cada um antes de decidir):

• *Mercado Pago* — o mais usado no Brasil, documentação excelente em
  português, PIX nativo, tem "Marketplace" que faz o split automático
  (exatamente o que descrevi acima). Ponto de atenção: pra habilitar
  split de verdade, costuma pedir CNPJ e um processo de aprovação —
  vale conferir se dá pra testar em modo sandbox só com CPF primeiro.

• *Asaas* — brasileiro, pensado desde o início pra plataformas (não é
  um extra) — tem "subcontas" que mapeiam bem no nosso modelo de
  dinheiro em custódia. PIX nativo, ambiente de teste disponível. Menos
  conhecido que Mercado Pago, então menos tutorial/comunidade por aí.

• *Pagar.me (Stone)* — split robusto também (Pagar.me Connect), mas o
  processo de habilitação tende a ser mais burocrático, geralmente pede
  CNPJ.

• *Stripe* — a documentação mais bem feita do mercado mundial (webhook e
  idempotência praticamente viraram padrão por causa deles), Stripe
  Connect é o produto de split mais maduro que existe. Ponto de atenção:
  suporte a PIX no Brasil historicamente veio depois dos gateways
  brasileiros — vale checar se está bom o suficiente hoje. Documentação
  toda em inglês.

• *Gerencianet / Efí Bank* — focado em PIX direto, API mais simples e
  rápida de integrar. Ponto de atenção: não tem split automático — o
  repasse pro pesquisador teria que ser uma transferência separada,
  feita por nós (manual ou via outra chamada de API), não automática.

*O que poderia dar errado se a gente demorar ou escolher sem pesquisar
direito:*
- Escolher um sem split → descobrir depois que o repasse não é
  automático, e ter que programar isso na mão de qualquer jeito
  (não quebra o projeto, só dá mais trabalho depois)
- Escolher um que pede CNPJ pra funcionalidade que a gente precisa →
  travar no meio do caminho, ter que trocar de gateway
- Não pesquisarmos com calma agora → decidir com pressa mais pra frente,
  quando já tiver menos tempo de TCC sobrando

━━━━━━━━━━━━━━━━━━━━━━
🗺️ DEPOIS DISSO
━━━━━━━━━━━━━━━━━━━━━━

O Claude vai começar o módulo de campanha no Nest (o núcleo de verdade
do produto — tudo mais depende dele existir). Isso não depende da nossa
decisão do gateway, pode andar em paralelo.

━━━━━━━━━━━━━━━━━━━━━━
📌 PRA GENTE DECIDIR RÁPIDO
━━━━━━━━━━━━━━━━━━━━━━

1. Alguma de nós já tem CNPJ ou MEI, ou vamos testar tudo com CPF pessoal
   mesmo (modo sandbox/teste)?
2. Split automático (Mercado Pago/Asaas/Pagar.me) ou repasse manual
   (Gerencianet) — vale a complexidade a mais pra automatizar, ou é
   simples o bastante fazer na mão pro tamanho do nosso TCC?
3. Quer que eu já abra conta de teste em 1 ou 2 desses pra a gente ver a
   documentação de webhook de cada um na prática antes de decidir?