# Pendências

Só o que ainda falta **fazer ou decidir**. O que fica pronto sai daqui (atualizado em 17-11-2026).

**Grupos:** 1. Antes da banca · 2. Pagamento · 3. E-mail de verdade · 4. No dia do deploy · 5. Decisões em aberto, sem pressa · 6. Ideias para depois

---

## 1. Antes da banca

- **Teste com pessoas de fora (Quadro 16 do TCC):** 3 a 5 pessoas (não o Lucas nem a Alexia) usando o sistema sozinhas, e alguém anotando quem conseguiu cada tarefa sem ajuda e onde travou. O TCC cita as sessões de usabilidade e de aceitação.
- 🔴 **Dados pessoais do titular na página de pagamento do Asaas (16-11-2026, urgente).** O topo da página de pagamento do Asaas (para onde o modal Apoiar manda quem apoia) mostra o titular da conta: nome, CPF, e-mail, cidade e final do telefone. No sandbox de hoje é a conta pessoal do Lucas, então qualquer pessoa que testar o apoio vê esses dados; a frase do rodapé ("cobrança de responsabilidade única e exclusiva de <titular>, CPF...") também é do Asaas. **Caminhos:** (1) em produção, a conta Asaas no nome da plataforma (CNPJ, ou o responsável oficial definido com o orientador), nunca uma conta pessoal; (2) já no sandbox, ver no painel do Asaas (Minha Conta > Informações / Personalização da fatura) o que dá para esconder ou trocar (nome fantasia, e-mail e telefone de contato da plataforma); (3) se o CPF do titular não puder ser escondido, abrir uma conta sandbox nova em nome da plataforma para os testes com outras pessoas. Até lá: só testar o apoio com quem já conhece esses dados.

---

## 2. Pagamento (visão completa em `DOCUMENTACAO_FINANCEIRO.md`)

### Testes no sandbox que faltam

- **Modal Apoiar (16-11-2026):** apoiar com Pix (o QR aparece no modal) e confirmar pelo botão "Confirmar pagamento" do painel do Asaas, com o túnel ligado: o modal deve virar "Obrigado pelo apoio!". Depois, cartão (campanha flexível, logado), pela página do Asaas.
- **Cartão** numa campanha flexível (cartão de teste 4444 4444 4444 4444 aprova; 5184019740373151 recusa), até o repasse da parte liberada.
- **Boleto:** ligar `boleto_habilitado` em Parâmetros; gerar, pagar ("Confirmar pagamento" no sandbox), repasse, e a devolução por link num cancelamento (vai para reembolso manual com o link).
- **Tela "Registrar a devolução"** (Reembolsos Manuais) com as contribuições 56, 59, 60, 61 e 63 do Supabase, que chegam ao reembolso manual sozinhas depois das 8 tentativas (o banco simulado recusa devolver Pix de pagador fictício). Desde 21-10-2026 o valor é fixo (o inteiro da contribuição, só leitura) e o banco recusa outro (já no Supabase, recriado; conferido em 24-10-2026).
- **Revisão manual da caixa de avisos:** os avisos parados de 17 e 18-10-2026 devem aparecer na tela de revisões do pagamento 24 horas depois de chegar, com o motivo.

### Decisões do financeiro (comparado com o mercado em 19-10-2026)

**Recomendação de 18-11-2026 (pesquisa nova: Catarse, Kickstarter, iugu, Guia do MED do Banco Central, Adyen).** Os três itens abaixo, na ordem de fazer:
1. **Ressarcimento depois do repasse:** a cláusula no Termo do Pesquisador (o rascunho abaixo, sem multa nem juros: num TCC gratuito eles só afastam pesquisador) e **sem desconto automático** por enquanto. É o que o mercado faz (Catarse 7.9/7.10; no Kickstarter o criador responde pelo que volta depois do repasse; a iugu desconta do saldo e cobra). O MED não obriga o banco do recebedor a cobrir com dinheiro próprio: quem recompõe é o recebedor, então a cláusula é o que dá base para cobrar. A contestação já cai na revisão manual; o admin registra e cobra. O desconto automático no próximo repasse só vale a pena com volume.
2. **Devolução que ninguém recebe:** a opção (C) com prazo de **120 dias** (o do Catarse) num parâmetro (`devolucao_prazo_reclamar_dias`), contado da primeira falha, com um e-mail no começo e outro 30 dias antes do fim. Depois do prazo o admin encerra como "não reclamado", com justificativa no log. O estorno do Pix só funciona até 90 dias, então depois disso o caminho é transferir para a chave que a pessoa informar.
3. **Conciliação de saldo:** a opção (B). Uma tarefa diária lê o saldo do provedor (o Asaas tem consulta de saldo) e compara com o dinheiro de terceiros que o sistema diz que deveria estar lá. Se ficar abaixo, avisa o admin. É a parte "o dinheiro de terceiros bate com o que está guardado" da conciliação das plataformas grandes (Adyen), sem a conciliação linha a linha.

Feitos no mesmo dia: a contestação de cartão vai para revisão manual, e o repasse espera a carência de `repasse_carencia_dias` (15). Fica para decidir:

- **Quem ressarce o dinheiro que volta depois do repasse.** Contestação de cartão e devolução por fraude do Pix (MED, até 80 dias) podem chegar depois da carência. O Catarse põe no termo que o criador ressarce, desconta do saldo dele e, se ele já sacou, cobra em 10 dias com multa de 10% (Termos de Uso, itens 7.9 e 7.10). Aqui: escrever a cláusula no Termo do Pesquisador (Lucas e Alexia) e decidir se o sistema registra a dívida e desconta do próximo repasse.
  - **Rascunho para estudar (25-10-2026, sem pressa; Lucas e Alexia reescrevem).** Base: Termos de Uso do Catarse, itens 7.9 e 7.10 (atualizados em 31-05-2026, https://crowdfunding.catarse.com.br/legal/termos-de-uso). Texto sugerido para o Termo do Pesquisador:
    - *Ressarcimento de valores contestados.* É responsabilidade do Pesquisador ressarcir à plataforma o valor de qualquer contribuição que, depois de repassada, seja contestada por quem pagou (contestação de cartão) ou devolvida pelo Mecanismo Especial de Devolução do Pix (MED), junto com as tarifas que o provedor de pagamento cobrar por essa contestação.
    - A plataforma pode descontar esse valor de um repasse ainda não feito ao Pesquisador, da mesma campanha ou de outra.
    - Sem repasse a descontar, o Pesquisador é avisado por e-mail e tem 10 (dez) dias, contados do aviso, para devolver o valor pela forma que a plataforma indicar.
    - Antes de cobrar, a plataforma informa ao Pesquisador o motivo da contestação e, quando houver, o prazo para apresentar defesa ao provedor de pagamento.
  - **O que decidir no estudo:** (1) multa e juros no atraso (o Catarse cobra 10% de multa, 1% de juros ao mês e correção pelo IPCA; num TCC gratuito talvez não faça sentido); (2) se o sistema registra a dívida e desconta sozinho do próximo repasse ou se fica só a cláusula; (3) a última frase (aviso e defesa) não está no Catarse, é sugestão para não cobrar sem explicar.
- **Devolução que ninguém consegue receber** (boleto sem conta cadastrada, contribuição sem conta): fica em reembolso manual para sempre. O Catarse, depois de 120 dias sem dados bancários válidos, transfere o crédito para a plataforma (Termos de Uso, item 7.19). Decidir o prazo e escrever no Termo de Uso.
  - **Estudo de 25-10-2026 (mais complicado do que parecia, sem pressa).** O Catarse (Termos de Uso, 7.19, atualizados em 31-05-2026) dá a quem apoiou 120 dias para cadastrar os dados de recebimento; depois o valor passa à plataforma (o 7.16 fala em 15 dias para o mesmo caso: o termo deles se contradiz). Aqui faltam quatro peças: (1) o e-mail "precisamos dos seus dados" (só existem "a devolução começou" e "foi concluída"); (2) um lugar para quem apoiou informar uma chave Pix (hoje só o pesquisador cadastra chave); (3) contribuição sem conta (visitante ou conta excluída) não guarda e-mail, então não há como avisar; (4) repetir o estorno depois do prazo do Pix (90 dias) não adianta, o provedor recusa sempre: o que funciona é transferir para a chave nova, como o repasse. O limite precisa existir: sem ele o dinheiro fica para sempre como dinheiro de terceiros.
  - **Opções:** (A) só o prazo, e o admin encerra como "não reclamado"; (B) igual ao Catarse: e-mail, a pessoa informa a chave em Minha Conta, o sistema transfere sozinho com novas tentativas, lembretes e prazo; (C) a (B) sem a transferência automática: o admin devolve pelo painel do provedor e usa o "Registrar a devolução" que já existe. Recomendação: (C) agora e (B) se houver volume, porque transferir sozinho para uma chave recém-informada abre a porta para quem invadiu a conta (a chave do pesquisador passa por verificação de titularidade por esse motivo). O visitante sem conta fica só com o prazo até o apoio da área pública guardar o e-mail. Decidir também o prazo (120 dias, como o Catarse, ou outro) e confirmar o escopo antes.
- **Conciliação de saldo** (conferir o saldo da conta no provedor com o que o sistema diz que deveria estar lá). Opções: (A) mostrar no painel, lado a lado, o saldo do provedor e o "dinheiro de terceiros" que a conta tem de ter (pago e ainda não repassado, a devolver, em reembolso manual), sem alerta; (B) o mesmo, conferido por uma tarefa diária que avisa quando o saldo fica abaixo do dinheiro de terceiros; (C) conciliação completa, linha a linha, do extrato do provedor com os eventos do sistema. Recomendada: (B), que pega dinheiro saindo sem aviso sem precisar contabilizar a receita da plataforma; a (C) é a das empresas grandes e pesada para o TCC.

### Textos dos Termos

Resolvidos no seed em 18-11-2026 (valem quando o banco for recriado): prazo de análise de 5 dias úteis (Termo de Pesquisador, 3.2), chave Pix por conta do pesquisador (3.3, RF-026), desistência do apoio (Termo de Uso, 5.4) e o Termo de Uso sem boleto. Sem recriar o banco, o Supabase continua com os textos antigos: publicar versões novas pelo painel.

---

## 3. E-mail de verdade (o módulo está pronto e testado no modo de teste)

- **Serviço de envio de verdade:** recomendação Brevo pela API, com um domínio `.com.br` (cerca de R$ 40 por ano). Sem domínio, só o Gmail com senha de app. Passo a passo e comparação dos planos em `.Tutorial-email.md`. Fica para o fim, como o gateway.
- **Saber se o e-mail chegou (21-10-2026):** "Enviado" quer dizer que o provedor aceitou, não que chegou na caixa da pessoa. Falta o webhook de entrega do Brevo (entregue, devolvido, marcado como spam), o equivalente ao do Asaas; o Gmail por SMTP nem oferece. Só dá para fazer junto com o serviço de envio de verdade. Explicação em `.Tutorial-email.md`, Parte 0.

---

## 4. No dia do deploy

- **Banco de produção:** rodar o `07_seed_dados.sql` só até o marcador `[07-DEMONSTRACAO]` e promover a primeira conta a admin uma vez (ver `.Tutorial-rodar-projeto.md`).
- **Banco depois do deploy: mudança vira arquivo novo numerado** (começando em 09, depois 10, e assim por diante), nunca edição dos arquivos `01` a `08` nem só o `ATUALIZAR`. O executor de migrações (`npm run db:migrate`) aplica só o que é novo e avisa, sem reaplicar, quando um arquivo já aplicado muda. No primeiro deploy: `npm run db:migrate:adotar` no banco que já tem tudo, e `DATABASE_URL_MIGRATIONS` com a credencial de administrador do banco.
- **Registro de acessos (Marco Civil da Internet, art. 15):** quem opera como empresa precisa guardar IP, data e hora de cada acesso por 6 meses. Hoje o IP fica só nos aceites e no último login. Só vale se o sistema entrar em operação; detalhe em `DOCUMENTACAO_BD.md`, "IP: base legal e anonimato do Pix".
- **Teste de fumaça do pagamento em produção (18-10-2026):** uma contribuição de **R$ 1 de verdade**, paga com o Pix do próprio Lucas, numa campanha de teste tudo-ou-nada, e depois "Cancelar o projeto". Confere o que o sandbox não consegue simular: o dinheiro **voltando** para quem apoiou (no sandbox o pagador é sempre fictício e o banco simulado recusa devolver; ver `.Tutorial-plataforma-pagamento-sandbox.md`, Parte 12). Custo: só a tarifa (R$ 0,99). É o padrão do mercado: todo sistema de pagamento faz um teste com valor mínimo em produção antes de abrir.
- **Apagar a conta de testes "Apoiador" do `nest/.env`** (`ASAAS_API_KEY_APOIADOR`, 18-10-2026): só serve aos testes no sandbox (segunda conta que paga e recebe devolução). Mantida até o deploy, por decisão nossa.
- **`trust proxy` no Nest:** atrás de um proxy (servidor de hospedagem), o Nest precisa confiar nele para ler o IP real de quem contribui (gravado no aceite do Termo, `aceite_termo_contribuicao.ip_aceite`) e de quem faz login. Sem isso, todo IP gravado seria o do proxy.
- **Docker** do Nest e do React (F2 do roteiro do Atlas, com o `docker/` deles como referência).
- **`react/.gitignore` não cobre `.env`:** inofensivo hoje (o `.env` só tem a URL da API); só volta à tona se o conteúdo do `.env` mudar ou no deploy.
- **CORS por lista de endereços:** a API aceita chamadas de qualquer site (`app.enableCors()` sem opções, `nest/src/main.ts`). Correção pequena: aceitar só os endereços de uma lista no `.env`, como o sistema Atlas faz. É pré-requisito do refresh token em cookie (grupo 5).
- **Sessões sem regra de acesso por dono (anotado em 30-09-2026, decidido em 24-10-2026: só no deploy, junto do cookie e do CORS).** `sessao` tem regra de acesso aberta (`USING (true)`) de propósito: login e renovação acontecem antes de haver alguém logado. Quem decide de quem é a sessão é o Nest (confere o segredo do token e o dono). Na simulação, qualquer papel encerra a sessão de qualquer conta direto no banco. Não é brecha pela API hoje; é defesa em profundidade.

---

## 5. Decisões em aberto, sem pressa

### Segurança e conta

#### Conta excluída prende o e-mail (anotado em 01-11-2026; o Lucas quer fazer, mas por último)

**Ideia do Lucas (01-11-2026):** quem excluiu a conta e se arrependeu volta com o mesmo e-mail, e o que estava ligado a ela (contribuições e o resto) volta a aparecer, uma "reativação" por baixo dos panos, sem RF. Alguns sistemas fazem assim. Antes de fazer: estudar o que a exclusão apaga de verdade (a exclusão anonimiza parte dos dados, pela LGPD) e o que dá para devolver.

**Em palavras simples:** quem exclui a conta não consegue criar outra com o mesmo e-mail: o cadastro responde "Já existe uma conta com esse e-mail.". A exclusão é lógica (`usuario.deletado = TRUE`), a linha fica no banco com o e-mail, e `UK_USUARIO_EMAIL` (01) exige e-mail único **entre todas as contas, inclusive as excluídas**.

**Padrão de mercado:** e-mail único só entre contas não excluídas (índice único parcial, `WHERE NOT deletado`); a conta antiga guarda o e-mail para o histórico e o endereço fica livre para uma conta nova.

**Cuidado ao fazer:** o login, o "Esqueci minha senha" e qualquer busca por e-mail passam a poder achar duas linhas com o mesmo endereço (uma excluída), e precisam ignorar a excluída. Mexe no 01/02 e pede grupo no ATUALIZAR. O "Reenviar" das Notificações não é afetado: a conta nova tem outro id, e a recusa (91055) vale só para os e-mails da conta excluída.

#### Login sem e-mail confirmado (anotado em 01-11-2026)

**Em palavras simples:** hoje quem cria conta entra e usa tudo **mesmo sem confirmar o e-mail**. O "E-mail não verificado" é só um selo amarelo em Minha Conta e no Alterar Usuário. O RF-003 pede só que a conta nasça "não verificada" e que o sistema guarde esse estado; não manda bloquear o login.

**Inclinação do Lucas (01-11-2026):** bloquear a entrada de quem não confirmou o e-mail. Com isso, o botão "Reenviar e-mail de confirmação" em Minha Conta (que foi cogitado) fica redundante: quem não confirmou nem chega lá. Não é para fazer agora.

**Antes de decidir, dois cuidados:**
- **Quem perdeu o e-mail fica preso.** Bloqueando o login, a pessoa sem o link só consegue outro pelo Suporte (o "Reenviar verificação" do Alterar Usuário). O padrão de mercado é a tela de login avisar "confirme o seu e-mail" com um link "reenviar" ali mesmo.
- **A conta criada pelo painel nasce sem e-mail confirmado** (`usuario.service.create.ts`) e sem receber o link. Bloqueando o login, essa conta não entraria nunca, a não ser que o painel passe a mandar o link ou a criar a conta já confirmada.

**Já pronto para isso:** o aviso vermelho de Configurações > Mensagens ("Se desativado, quem cria conta não recebe o link para confirmar o e-mail. A conta é criada, mas o e-mail fica sem confirmação.") foi escrito para continuar certo se o login passar a exigir e-mail confirmado. As contas da demonstração já nascem confirmadas ([07-D-8]).

#### Refresh token em cookie `HttpOnly`, em vez de `localStorage`

Hoje o refresh token fica no `localStorage` do navegador (`use-auth.ts`), para não precisar logar de novo a cada F5. Um cookie `HttpOnly` com `SameSite=Strict` faz o mesmo papel com uma vantagem real de segurança: o JavaScript da página nunca lê o cookie, então um ataque de XSS (injeção de script) não consegue roubar o token; com `localStorage`, qualquer script que rode na página consegue. Trocar mexe em como o `authFetch`/`use-auth.ts` renovam a sessão e em como o Nest define e lê o cookie, e depende do CORS por lista (grupo 4); o sistema Atlas usa `SESSION_LIFETIME`, `SESSION_SECURE_COOKIE` e `SESSION_SAME_SITE` no `.env` e serve de referência. **O estudo foi feito em 24-10-2026** (o que muda, o risco e o padrão de mercado); a decisão continua aberta.

### Requisitos

- **RF-053, fase e formato da atualização (anotado em 04-11-2026; assunto para bem mais à frente):** o Lucas não gostou deste requisito, acha estranho. Texto atual: "Cada atualização de progresso deve registrar a fase do projeto a que se refere (andamento, resultado preliminar ou resultado final) e o formato do conteúdo publicado (texto, imagem, PDF ou link externo), podendo ter arquivos e links externos anexados." Como o sistema faz hoje: a fase é escolhida pelo pesquisador; o formato não é mais perguntado, sai dos anexos (PDF, imagem, link ou só texto), porque escolhido à mão dava para marcar "PDF" sem anexar nada.
- **Recompensa com arquivo (07-11-2026, aguardando a Alexia):** o Lucas perguntou à Alexia se a recompensa entrega também por arquivo (imagem ou PDF) ou só por link. Já foi feito e testado, e desfeito no mesmo dia para esperar a resposta; as versões com o recurso estão guardadas fora do repositório, e o Grupo CF do ATUALIZAR ficou comentado, marcado "NÃO COLE".
- **Tipos de link para atualização e recompensa (04-11-2026):** hoje o único tipo liberado para atualização e recompensa é o GitHub, e a regra dele só aceita endereço de perfil (`github.com/nome`), não de repositório. Artigo (DOI), vídeo ou pasta de arquivos precisam de um tipo novo, criado pelo admin na tela Tipos de Link (sem código). Decidir quais tipos entram no seed.

### Visual

- **Modais menores, sem barra de rolagem quando der (01-11-2026, estudar antes).** Alguns modais poderiam ser menores sem perder conteúdo: texto de explicação vira tooltip (regra de 10-10-2026). Exemplo do Lucas, no Julgar Denúncia: o bloco "O que cada decisão faz" ("Aceitar torna esta denúncia improcedente...") caberia num tooltip. A meta é evitar a rolagem só nos modais em que der; o de denúncia é um deles. Estudar modal por modal antes de mexer.
- **Outros lugares que podem ganhar as mudanças do Consultar Campanha (25-10-2026), olhar tela por tela antes:** (1) **linhas alinhadas entre seções vizinhas** (`FichaLadoALado`, DS-115) no Consultar e no Alterar Usuário ("Dados da conta" ao lado de Auditoria e Papéis) e no Revisar Campanha: só vale onde os dois lados são campos pareados; (2) **data com hora sem os segundos** (`formatarDataHora(iso, true)`) onde a data fica em meia coluna e quebra: Julgar Denúncia, Decidir Encerramento, Consultar Contribuição, Consultar Notificação, Resolver Revisão; (3) **linha de números de ponta a ponta** (`SecaoFicha centralizada`, DS-116): a Consultar Contribuição (valor, taxa, total) é candidata.
- **Branch `feat/novas-telas-teste` (02-10-2026):** tem o Dashboard em seções ("Precisa de você") e os links acadêmicos em cartões no celular, feitos antes das regras visuais novas. Decidir se entram no main, refeitos com as regras do `DESIGN_SYSTEM.md`, ou se a branch é descartada. **Contexto (Lucas, 01-11-2026):** o propósito era só deixar a área restrita mais bonita, por isso ficou separada. Para usar, seria preciso atualizar a branch com o main e ver o que dá para aproveitar.
- **Troca do logo e do ícone pelo painel** (aba Identidade Visual do Dashboard, hoje um espaço reservado). Desde 25-10-2026 a marca padrão está no projeto (`DOCUMENTACAO_FRONTEND.md`, seção 12); o envio pelo painel substitui a padrão, e o admin do futuro troca sem mexer no código nem no banco. A análise, os 4 problemas e as duas decisões em aberto estão no `ACHADOS_PARA_DISCUTIR.md`. O envio passa pelo Storage pessoal do Lucas: nos testes, só ele envia.

---

## 6. Ideias para depois

- **Autenticação em duas etapas (2FA), sem RF (decisão do V8: avançado demais para o escopo do TCC agora).** Bancas costumam perguntar sobre segurança, e 2FA é um dos primeiros itens. Hoje o sistema tem só e-mail e senha, com bloqueio por tentativas. Para fazer, precisa de um RF novo.
- **Auditoria de acessibilidade manual (WCAG 2.2, nível AA).** A parte automática foi feita em 16-11-2026: o axe-core zerou nas 22 telas, nos dois temas, no computador e no celular (`testes-e2e/`), e a auditoria Nielsen/WCAG da área pública corrigiu 14 itens (`informacoes/AUDITORIA_AREA_PUBLICA_NIELSEN_WCAG_16-11-2026.md`). Falta a conferência manual, que a ferramenta automática não pega: navegação só pelo teclado, ordem do foco, zoom de 200%. Já anotado: o cabeçalho de coluna que ordena a tabela responde ao clique, mas não ao teclado.
- **Imagens geradas por IA para dar vida ao site (14-11-2026, sugestão do Claude aprovada pelo Lucas).** Mesmo processo dos cards do Como funciona: prompt base com a paleta escura (#041722 a #082e48, degradê até #0a4a3c) e verde (#0f9b58, #5fc796), sem texto na imagem; originais em `informacoes/Imagens`, convertidas para WebP (qualidade 80) em `react/public/imagens/`. Em ordem de impacto: (1) capas padrão das campanhas sem imagem, uma por grande área do CNPq (9 imagens 16:9, 1200x675; hoje o cartão mostra só um ícone de frasco); (2) painel lateral do Login e do Cadastro (retrato 3:4, ~900x1200); (3) confirmação do apoio (`/apoio-confirmado`, quadrada 800x800); (4) estados vazios (2 ou 3 ilustrações reaproveitáveis, 400x400, fundo transparente); (5) página de erro ou não encontrada (16:9).
- **Tela de administração dos arquivos (especificada em 13-09-2026, não construída de propósito).** Espaço ocupado (com % do limite do plano gratuito), arquivos desativados, órfãos (sem vínculo com foto de perfil, atualização ou recompensa), distribuição por tipo, os 10 maiores consumidores e a listagem completa. Tudo sai das colunas que `arquivo` já tem, sem módulo novo (2 rotas no `26-arquivo` e uma tela de listagem). Cuidado na ação "excluir órfão": apagar do armazenamento primeiro, depois do banco, registrando em auditoria; se o armazenamento falhar, a linha fica. Momento certo: quando anexos tiverem volume de verdade.
- **Auditoria de coisas inúteis (04-11-2026).** Procurar campo, coluna, tela ou mecanismo que só existe por existir (gravado ou mostrado, mas que nada usa, ou que repete outra coisa). Exemplo que motivou: o formato da atualização (RF-053), que nada usa; saiu da tela em 04-11-2026, mas continua gravado. Para cada achado: tirar da tela, tirar do banco ou levar à revisão externa.
- **Auditoria do Tailwind que anula o CSS, versão com navegador.** A versão sem navegador foi feita em 01-11-2026 (`informacoes/testes-banco/ferramentas/tailwind-x-css.mjs`) e os achados foram corrigidos. Falta a versão com navegador, que prova quais candidatos quebram de verdade; agora dá para fazer com o Playwright do `testes-e2e/`.
- **Super auditoria de padrões de mercado (29-09-2026).** Comparar o sistema inteiro com os sistemas de referência (login e sessão, termos, moderação, campanha, pagamento, mensagens de erro, telas): para cada diferença, qual é o padrão, o que o projeto faz e se vale mudar.
- **Dispatcher de triggers (29-09-2026).** Hoje `campanha` tem 23 triggers e `comentario` 9; quando várias rodam no mesmo momento, o Postgres segue a ordem alfabética do nome. O dispatcher seria uma trigger só por momento, chamando as regras numa ordem escrita: ordem explícita e erro previsível, mas mexe nas regras mais críticas (as suítes de caracterização, 1.050 casos, são a rede de proteção). Recomendação: não fazer. Estudo completo de 24-10-2026; decisão aberta.
- **Reorganizar o `DESIGN_SYSTEM.md` (18-10-2026).** As regras principais (como linha e coluna das tabelas, DS-100, DS-104 e DS-105) passam para os números de destaque, para serem achadas primeiro.
