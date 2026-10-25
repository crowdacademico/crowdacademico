# Achados para discutir: o que ainda falta (lista de 26-09-2026)

Lista montada a partir da resposta da revisão externa de 24-09-2026 (a pasta da revisão de 24-09 dentro de `informacoes/`), conferida item por item contra o código. Os achados antigos (itens 1 a 20, quase todos resolvidos) estão em `informacoes/HISTORICO/HISTORICO_ACHADOS_PARA_DISCUTIR.md`; qualquer citação "`ACHADOS_PARA_DISCUTIR.md`, item N" em documento ou comentário antigo aponta para lá. Na limpeza de 25-10-2026, o que já estava feito ou repetido no `PENDENCIAS e correcoes.md` também foi para lá, com o texto original.

---

## IMPORTANTE: A tela de troca da marca

**Como seria:** a aba **Identidade Visual** do Dashboard, que hoje é só um espaço reservado, ganha dois cartões.
- **Logo:** a prévia sobre fundo claro e sobre o rodapé escuro, um botão **Enviar novo** e um **Voltar ao padrão**.
- **Ícone do site:** a prévia na aba (16 e 32 px) e no iPhone, com os mesmos dois botões. A pessoa envia um quadrado de no mínimo 512 × 512, e o sistema gera os outros tamanhos.

É o modelo do WordPress, que pede o ícone "quadrado e com pelo menos 512 × 512" e gera sozinho o de 32, o de 180 (iPhone) e outros. "Voltar ao padrão" volta para os arquivos que acabamos de colocar no projeto.

**O que já temos pronto:** o envio de arquivo inteiro (o mesmo da foto de perfil) e o `sharp` no Nest, que é a ferramenta que encolhe imagens. Não precisa instalar nada.

**Os 4 problemas encontrados:**

1. **A faxina de 24 horas apagaria o logo.** Todo dia o sistema apaga arquivo enviado que não virou foto de perfil nem anexo. Hoje ele não sabe que um logo é "uso". Essa regra precisa aprender a reconhecer o logo e o ícone.
2. **Todo envio vira WebP.** Para a foto de perfil é ótimo, porque fica mais leve. Mas o ícone do iPhone precisa ser PNG, com fundo sólido. A marca precisa de um tratamento próprio, que gera os tamanhos em PNG.
3. **O cabeçalho piscaria.** O site abre com o logo padrão, pergunta ao servidor qual é o atual, e só então troca. Por meio segundo, o logo mudaria na frente da pessoa. Resolve guardando no navegador o último logo visto: ele já abre com o certo.
4. **O iPhone e os buscadores não rodam o código do site.** Eles leem o `index.html` direto. Se a troca do ícone for só pelo código da tela, a aba muda, mas o atalho do iPhone continua com o ícone padrão. A saída é o `index.html` apontar para um endereço do Nest que responde com o ícone atual, ou com o padrão se ninguém trocou.

**Duas decisões em aberto, com a recomendação:**

- **A. Onde o sistema guarda "qual é o logo atual".**
  - **Recomendo:** duas chaves em Parâmetros, que era o plano já desenhado. Não cria tabela, e respeita o "escopo enxuto" do orientador. Com uma regra no banco que recusa apontar para um arquivo que não existe.
  - **A alternativa:** uma tabela nova, de uma linha só. É mais "certinha", mas é a tabela 44.
- **B. Quem pode trocar.**
  - **Recomendo:** quem já pode mexer em Parâmetros (`configuracao_gerenciar`, hoje só o admin). A regra do projeto é reaproveitar uma permissão equivalente antes de criar outra.
  - **A alternativa:** uma permissão nova, só para a marca. Serviria se um dia um "designer" puder trocar o logo sem mexer nas regras do negócio.

Precisamos decidir A e B, ou outra ideia se tivermos

Fontes:
- [WordPress Core Trac, ticket 47417](https://core.trac.wordpress.org/ticket/47417)
- [How to Add a Favicon to Your WordPress Site](https://favicon.im/blog/add-favicon-to-wordpress-site)

---

## 📌 Decididos e feitos, para a Alexia ler

Saíram daqui na limpeza de 25-10-2026 e estão inteiros em `informacoes/HISTORICO/HISTORICO_ACHADOS_PARA_DISCUTIR.md`, seção "Limpeza de 25-10-2026":
- **Túnel do sandbox:** opção B, endereço fixo do ngrok, em uso (`.Tutorial-plataforma-pagamento-sandbox.md`).
- **Contestação do score (RF-033):** a contestação na própria denúncia (opção B2), feita em 03-10-2026.
- **O pagamento que chega depois do fim da campanha:** validade de 24 horas para o Pix (opção D), feita em 03-10-2026 (`DOCUMENTACAO_BD.md`, [05-K-2-F]).

---

## 📌 Para discutir (03-10-2026): denúncias no score, gravidade e acúmulo

**Em palavras simples:** desde 03-10-2026, a reputação do pesquisador (25 dos 100 pontos) tem duas partes: denúncias procedentes contra o perfil (10 pontos) e contra as campanhas (15). Cada parte zera em 3 denúncias procedentes. Duas perguntas ficaram para depois.

**1. Gravidade por motivo.** Cada motivo de denúncia ganharia um peso de 1 a 3: "fraude" contaria 3, "conteúdo impróprio" 1. Assim, uma fraude confirmada zeraria a parte de uma vez.
- A favor: um caso grave não vale o mesmo que um leve.
- Contra (ponto do Lucas): denúncia grave e verdadeira já encerra a campanha na hora, por moderação; o score pesar mais seria quase redundante. E é mais uma coisa para o administrador calibrar.

**2. Acúmulo:** resolvido em 12-10-2026 (opção B: conta campanhas com denúncia procedente, não denúncias; `DOCUMENTACAO_BD.md`, decisão "Acúmulo"). No perfil continua contando denúncias.

**Efeito colateral já visível:** pesquisador sem nenhuma campanha fica com os 15 da parte "campanhas" inteiros, então nunca cai abaixo de 25 (faixa "Em Construção"), por mais denúncias procedentes que tenha contra o perfil.

---

## 📌 Para discutir (13-10-2026): o título acadêmico no score

**Em palavras simples:** hoje o item "Título acadêmico informado" (4 dos 30 pontos do Perfil Acadêmico) só confere se o campo está preenchido. Doutor, mestre, especialista e graduado ganham os mesmos 4 pontos. A ideia é o título pesar conforme o nível. É interessante, mas precisa ser bem feito para os doutores não dominarem a plataforma.

**O risco:** o score aparece para quem apoia e ajuda a decidir em quem confiar. Se o título pesar muito, quem já tem mais titulação começa sempre na frente, e quem está começando (um graduado com um bom projeto) fica para trás antes de mostrar trabalho. A plataforma passaria a premiar o currículo, não o que a pessoa entrega.

**Como fazer bem feito, se for fazer:**
- **Diferença pequena entre os níveis.** Por exemplo: graduado 2, especialista 3, mestre 3, doutor 4, dentro dos mesmos 4 pontos de hoje. A distância máxima entre um graduado e um doutor fica em 2 pontos de 100.
- **O peso de verdade continua no que a pessoa faz:** campanhas concluídas, atualizações em dia e nenhuma denúncia procedente já valem 70 dos 100 pontos. É por aí que um graduado passa um doutor.
- **Os pontos de cada nível viram configuração** na tela Pontuação, como os outros pesos, para o administrador calibrar sem mexer no código.
- **O título é declarado, não conferido.** Pesar mais aumenta a vontade de declarar um título que a pessoa não tem. O Lattes ajuda a conferir, mas hoje ninguém confere. Se o título pesar mais, a moderação precisa olhar isso, e a denúncia "Perfil com dados acadêmicos falsos" já existe para isso.

**Padrão de mercado:** as plataformas de financiamento de pesquisa (Experiment.com, por exemplo) não ordenam nem destacam projetos pela titulação de quem pede; o que conta é o projeto e o histórico de entregas. O ResearchGate, que tinha uma nota de reputação acadêmica (o RG Score), a retirou em 2022, depois de anos de crítica por medir prestígio mais do que contribuição.

**Decisão em aberto:** manter como está (o título só mostra que o perfil está completo) ou pontuar por nível com uma diferença pequena.

---

## B. Decisões pequenas em aberto

1. **Log de auditoria só com diff (A5).**
   - Revisão externa: sim, é barato.
   - Sugestão: recomendo não mudar. O UPDATE perde o estado completo, e o espaço não pesa (uns 5 MB por ano).
2. **Horário dos jobs agendados (28-09-2026).**
   - Situação: o que cada job faz já é configurável pelo painel (ex.: `arquivo_horas_para_vincular`, `log_auditoria_retencao_dias`). Já o horário em que cada um roda está fixo no código do Nest. Job agendado é uma tarefa que o Nest roda sozinho, como um despertador. São 6: arquivos sem dono às 4h, limpeza do log às 3h, campanhas vencidas e fim de suspensão a cada 15 min, rascunho e rejeitada de hora em hora.
   - Para mudar pelo painel: o Nest lê o horário quando liga, então seria preciso "reprogramar o despertador" com o sistema ligado, nos 6 jobs, e guardar os horários em `configuracoes`.
   - Sugestão: deixar fixo. O horário é de infraestrutura (em que momento a faxina roda), não regra de negócio; mudar na prática é raro, e o custo não é pequeno. Rever se a banca ou o uso real pedirem.

---

## C. Dependem de módulo (não antecipar)

- **18-recompensa:** congelamento de `recompensa`. A recompensa ficou simbólica, sem estoque, mas o comentário da regra de `trg_contrib_recompensa_valida` (`05`) ainda fala em estoque: conferir.
- **22-contribuição:** a regra de `SECURITY DEFINER` com checagem interna (F3.2). O índice único da transação do provedor e a máquina de estados de `status_contribuicao` já existem.
- **Repasse (`23-pagamento`):** checagem em `atualizar_status_repasse()`.
- **4-mail:** o e-mail "avise-me quando começar". O de campanha rejeitada já existe; conferir se cobre os reenvios.

---

## D. Ideias opcionais da revisão externa (F1)

- Selo "Resultado publicado", a partir da fase `resultado_final`.
- "Revisada pela curadoria em (data)", a partir de `aprovado_em`.
- Rota `GET /c/:id` com as tags `og:` para o WhatsApp e o LinkedIn mostrarem o card.
- Todas dependem da página pública (`PENDENCIAS e correcoes.md`, grupo 2).
- Matchfunding, login por função `SECURITY DEFINER` com `pol_usuario_select` fechada, recálculo de score por instrução e throttle distribuído ficam para depois do TCC.

---

## E. A revisão externa recomenda não fazer

Mover regra de trigger para o Nest, recálculo de score sob demanda, trocar o log por pgAudit ou `supa_audit`, endpoint de enums, auditar Nielsen nas telas de teste, dispatcher nas tabelas pequenas, `NODE_ENV` como barreira de segurança. Concordamos com tudo.

---

## F. Registrados de antes, ainda válidos

- **Não remover o `overrides` do `multer` em `nest/package.json`.** Hoje é cosmético (nenhuma rota usa upload multipart pelo Nest). No dia em que qualquer rota usar `FileInterceptor`, vira correção de segurança real. O `package.json` não aceita comentário, por isso o aviso mora aqui.
- **`GET /campanha` (listagem) traz as mesmas colunas pesadas do detalhe** (`CAMPANHA_COLUNAS_SELECT`, inclui `descricao` de até 20 mil caracteres). Inofensivo hoje; rever o contrato quando a página pública existir.
- **Constantes duplicadas entre `nest/` e `react/`:** conferido em 26-09-2026. A duplicação dentro de cada lado foi eliminada; sobram, de propósito, a lista de tipos de imagem e o perfil de redução do avatar (512 px, qualidade 80), sem código compartilhado entre os repositórios (cada lado comenta o outro). Sem mais nada a fazer.

---

## G. Pesquisa de mercado em plataformas de crowdfunding (01-10-2026)

Em palavras simples: olhamos como Kickstarter, Catarse e Experiment.com (o mais parecido com o CrowdAcadêmico, só ciência) organizam o painel de quem cria campanha. Quatro coisas que eles têm e nós não chamaram atenção (itens 1 a 4); o item 5 saiu da revisão do painel feita no mesmo dia, e os itens 6 a 8 de uma segunda olhada, em 02-10-2026. Só o item 5 foi feito: os outros são para pensar a melhor solução antes.

1. **Gráfico da arrecadação ao longo do tempo na campanha.**
   - Como é lá: no Kickstarter, o painel do criador tem um gráfico da arrecadação dia a dia, com uma linha verde marcando a meta; passando o mouse num dia, aparece o total daquele dia.
   - Como é aqui: o V8 já pede gráficos na página pública (RF-046: orçamento por categoria e cronograma como linha do tempo), mas não a arrecadação ao longo do tempo. Hoje mostramos só a barra de progresso.
   - Para pensar: depende do módulo de contribuição (é ele que tem as datas de cada apoio). Daria para mostrar ao pesquisador (Minhas Campanhas) e ao admin (Consultar Campanha). Fica fora do V8: seria requisito novo.
   - Fontes: [Kickstarter, Project Dashboard](https://www.kickstarter.com/blog/project-dashboard); [Kickstarter, The New Creator Dashboard](https://www.kickstarter.com/blog/the-new-creator-dashboard).

2. **Seção "Resultados" ao final da campanha.**
   - Como é lá: no Experiment.com, cada projeto tem seções próprias de Métodos e de Resultados, além das "Lab Notes" (um caderno de laboratório público). Eles fazem questão de dizer que "resultado negativo também é resultado".
   - Como é aqui: o V8 já tem metade disso. Cada atualização de progresso registra a fase (andamento, resultado preliminar ou resultado final, RF-052). Falta só dar destaque: uma seção "Resultados" na página da campanha que mostra a atualização de resultado final em primeiro lugar, em vez de ela ficar misturada na lista.
   - Para pensar: é a ideia que mais combina com um site de ciência e quase não muda requisito (é exibição do que o RF-052 já guarda).
   - Fontes: [Experiment.com, Researcher Guide: Share](https://experiment.com/guide/share); [Experiment.com](https://experiment.com/).

3. **Exportar apoiadores em CSV para o pesquisador.**
   - Como é lá: no Kickstarter, o "backer report" lista os apoiadores com filtros e busca e baixa em CSV. No Catarse, o realizador baixa o histórico de apoios e os dados dos apoiadores em Excel ou CSV.
   - Como é aqui: o V8 só tem a exportação dos PRÓPRIOS dados (LGPD, RF-017). Não existe exportação de apoiadores para o pesquisador.
   - Para pensar: depende do módulo de contribuição. Cuidado de LGPD: decidir quais dados do apoiador o pesquisador pode ver (o Catarse entrega nome, CPF, e-mail e endereço porque entrega recompensa física; aqui talvez só nome, valor e data, e nada do anônimo).
   - Fontes: [Kickstarter, How can I use my project's backer report?](https://help.kickstarter.com/hc/en-us/articles/48619766244251-How-can-I-use-my-project-s-backer-report); [Catarse, Quais informações o realizador recebe dos seus apoiadores?](https://suporte.catarse.me/hc/pt-br/articles/203074427-Quais-informa%C3%A7%C3%B5es-o-a-realizador-a-recebe-dos-seus-apoiadores); [Blog Catarse, funcionalidades do Novo Catarse em 2026](https://blog.catarse.com.br/post/confira-algumas-das-funcionalidades-que-chegam-no-novo-catarse-em-2026).

4. **Atualização só para apoiadores, e não pública.**
   - Como é lá: no Catarse, a novidade tem três destinos: pública (vai por e-mail e aparece na página), só para apoiadores (só e-mail), ou só para apoiadores de uma recompensa.
   - Como é aqui: conferido no V8, não está previsto. O RF-051 diz que as atualizações ficam visíveis na página pública, em ordem cronológica; não há atualização privada.
   - Para pensar: seria mudança de requisito (RF-051), e depende do módulo de e-mail. Para ciência pode fazer sentido (um resultado preliminar que o pesquisador ainda não quer tornar público), mas abre a pergunta de quem é "apoiador" (o anônimo não tem conta).
   - Fonte: [Catarse, Como enviar novidades para seus apoiadores?](https://suporte.catarse.me/hc/pt-br/articles/360024077731-Como-enviar-novidades-para-seus-apoiadores).

6. **Motivos prontos para a rejeição.**
   - Como é lá: as lojas de aplicativo (App Store e Google Play) recusam citando a regra exata que o envio descumpriu, com um texto padrão da própria regra, e o revisor só acrescenta o detalhe do caso.
   - Como é aqui: o admin escreve o motivo inteiro à mão, toda vez (o campo é obrigatório e livre).
   - Para pensar: uma lista curta de motivos comuns (orçamento que não fecha, cronograma vago, área errada, descrição sem método) que preenche o começo do texto, e o admin completa. Os motivos seriam dados editáveis, nunca escritos no código. Não muda requisito: é ajuda para escrever o mesmo campo.

7. **Previsão de repasse para o pesquisador.**
   - Como é lá: o Kickstarter avisa o criador de que o dinheiro é cobrado no fim da campanha e repassado cerca de 14 dias depois; o Catarse mostra o prazo do repasse no painel do realizador.
   - Como é aqui: o repasse existe no banco, mas o pesquisador não vê quando o dinheiro deve chegar.
   - Para pensar: depende do módulo de pagamento (o prazo vem do gateway escolhido). Quando existir, mostrar a data prevista em Minhas Campanhas evita a pergunta "cadê o dinheiro?".

8. **Atividade recente no Dashboard.**
   - Como é lá: painéis administrativos de referência (Stripe, por exemplo) abrem com uma lista dos últimos acontecimentos do sistema: quem fez o quê, e quando.
   - Como é aqui: o `log_auditoria` já guarda as mudanças importantes (status de campanha, papéis, configurações), mas só aparece dentro de cada tela, no "Ver log".
   - Para pensar: um bloco "Atividade recente" no Dashboard com as últimas linhas do log, em texto simples ("Campanha 12 aprovada por Admin Sistema, há 2 horas"). Não precisa de tabela nova. Fica fora do V8 como tela, mas não como dado.
